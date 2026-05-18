/**
 * Self-Renewal Phase A — helpers + thin delegate to the orchestrator.
 *
 * As of DISPATCH 22 PART 5, runOptionC delegates to runOrchestration
 * (which adds the repeat-until-GTM-ready loop, mode control, and real
 * scoring via monitorTextProducer). This file keeps the pure utility
 * helpers (parseGithubRepoUrl, resolveVercelProjectId, fetchFileContent,
 * readProductPolicy, appendGovernanceEntry) that the orchestrator imports.
 *
 * Pipeline steps (executed in order, fail-fast on any step):
 *   A — rate-cap + runaway-detector pre-flight
 *   B — mint GitHub App installation token
 *   C — parse owner/repo from githubRepoUrl
 *   D — compute preScore (honest degradation when monitorText unavailable)
 *   E — fetch current file content + generate fix via Claude
 *   F — create branch + commit fix via Contents API
 *   G — trigger Vercel preview deploy of the branch
 *   H — compute postScore against the preview URL
 *   I — evaluate delta policy → decision
 *   J — open PR (only when decision.action === 'open_pr')
 *   K — append decision.auditEntry to product_ssot.governance_record
 *
 * Failure handling: every step is wrapped so a thrown error produces
 * `{ ok: false, runId, productId, failedStep, error, code }` and the
 * orchestrator returns immediately. No partial-state propagation
 * across steps.
 *
 * Credentials never logged. Every dep takes an injectable callable for
 * test mocking — production resolves to the real module exports via
 * default arguments.
 */

'use strict';

import { checkRateCap, checkRunawayDetector } from './rateCap.js';
import { getInstallationToken } from './githubApp.js';
import { computeScore } from './preScoreAdapter.js';
import { generateFix } from './fixGenerator.js';
import { createRenewalBranch } from './githubBranchWriter.js';
import { deployBranchPreview } from './vercelBranchDeploy.js';
import { evaluateDelta } from './deltaPolicy.js';
import { createRenewalPr } from './githubPrWriter.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse owner + repo from a GitHub URL like
 * https://github.com/<owner>/<repo>(.git)?.
 *
 * @param {string} url
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseGithubRepoUrl(url) {
  if (typeof url !== 'string' || !url) return null;
  const m = url.match(/github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

/**
 * Resolve the Vercel project ID for a given product. Phase A maps
 * productId → env-var name via a static lookup table; future phases
 * read this from product_registry.vercel_project_id.
 */
export function resolveVercelProjectId(productId, env = process.env) {
  if (productId === 'mypreglife') return env.VERCEL_PROJECT_ID_MYPREGLIFE ?? null;
  // Lower-case fallback then envelope: also try VERCEL_PROJECT_ID_<PRODUCT_UPPER>
  const upper = String(productId || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return env[`VERCEL_PROJECT_ID_${upper}`] ?? null;
}

/**
 * Fetch a single file's UTF-8 content from a GitHub repo on a given
 * branch. Inline helper rather than touching githubBranchWriter — the
 * pipeline needs READ access to a file before generateFix builds the
 * fix; branchWriter only has read-of-SHA, not read-of-content.
 *
 * @returns {Promise<string>} file content as UTF-8
 */
export async function fetchFileContent({ owner, repo, filePath, ref, token, opts = {} }) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw Object.assign(new Error('fetchFileContent: fetch is not available'), { code: 'GITHUB_API_ERROR' });
  }
  const enc = (s) => encodeURIComponent(s);
  const encodedPath = filePath.split('/').map(enc).join('/');
  const url = `https://api.github.com/repos/${enc(owner)}/${enc(repo)}/contents/${encodedPath}?ref=${enc(ref)}`;
  const res = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 404) {
    throw Object.assign(new Error(`fetchFileContent: file "${filePath}" not found on ${owner}/${repo}@${ref}`),
      { code: 'FILE_NOT_FOUND' });
  }
  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error(`fetchFileContent: ${res.status} ${res.statusText} for ${owner}/${repo}/${filePath}`),
      { code: 'GITHUB_AUTH_FAILED' });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`fetchFileContent: GET contents ${res.status} ${res.statusText}`),
      { code: 'GITHUB_API_ERROR' });
  }
  const body = await res.json();
  if (Array.isArray(body)) {
    throw Object.assign(new Error(`fetchFileContent: "${filePath}" is a directory, not a file`),
      { code: 'FILE_NOT_FOUND' });
  }
  if (typeof body.content !== 'string') {
    throw Object.assign(new Error('fetchFileContent: response lacks content field'),
      { code: 'GITHUB_API_ERROR' });
  }
  return Buffer.from(body.content, 'base64').toString('utf8');
}

/**
 * Pick the file path the orchestrator should attempt to fix. Phase A is
 * single-file scope; the issue object SHOULD carry a `filePath`.
 *
 * Falls back to 'README.md' for sanity-test runs where the caller
 * didn't pre-resolve the impacted file. Documented honest residual:
 * Phase B should add an Agent-#8-driven file-attribution step.
 */
export function pickImpactedFilePath(issue) {
  if (issue && typeof issue.filePath === 'string' && issue.filePath) return issue.filePath;
  if (issue && typeof issue.file_path === 'string' && issue.file_path) return issue.file_path;
  if (issue && typeof issue.path === 'string' && issue.path) return issue.path;
  return 'README.md';
}

/**
 * Read the per-product Self-Renewal policy from product_registry.
 * Falls back to safe defaults when supabase is null (test paths) or
 * when no row exists for the product yet.
 */
export async function readProductPolicy({ productId, supabase }) {
  const DEFAULTS = Object.freeze({
    selfRenewalNegativeDeltaPolicy: 'ALWAYS_OPEN',
    selfRenewalMinimumDelta: 0,
    selfRenewalSubstantialThreshold: 5,
    selfRenewalMaxPerDay: 1,
    selfRenewalRunawayThreshold: 3,
  });
  if (!supabase || typeof supabase.from !== 'function') return DEFAULTS;
  try {
    const { data, error } = await supabase
      .from('product_registry')
      .select('self_renewal_negative_delta_policy, self_renewal_minimum_delta, self_renewal_substantial_threshold, self_renewal_max_per_day, self_renewal_runaway_threshold')
      .eq('product_id', productId)
      .maybeSingle();
    if (error || !data) return DEFAULTS;
    return {
      selfRenewalNegativeDeltaPolicy: data.self_renewal_negative_delta_policy ?? DEFAULTS.selfRenewalNegativeDeltaPolicy,
      selfRenewalMinimumDelta: data.self_renewal_minimum_delta ?? DEFAULTS.selfRenewalMinimumDelta,
      selfRenewalSubstantialThreshold: data.self_renewal_substantial_threshold ?? DEFAULTS.selfRenewalSubstantialThreshold,
      selfRenewalMaxPerDay: data.self_renewal_max_per_day ?? DEFAULTS.selfRenewalMaxPerDay,
      selfRenewalRunawayThreshold: data.self_renewal_runaway_threshold ?? DEFAULTS.selfRenewalRunawayThreshold,
    };
  } catch {
    return DEFAULTS;
  }
}

// ── Atomic ProductSSOT write primitive (DISPATCH 28 / P0-5) ──────────────
//
// Per CANONICAL_REFERENCE §7 Output Contract item #5:
//
//   "The write is atomic with the rest of the output contract: a run
//    that produces a renewed URL but fails to update ProductSSOT is
//    considered INCOMPLETE and rolled back (per §10 Self-Protect
//    snapshot + Self-Heal pattern)."
//
// Supabase doesn't expose true Postgres transactions through the JS
// client. The closest atomic guarantee for a per-row read-modify-write
// is **optimistic concurrency control via compare-and-swap on
// `updated_at`**: we snapshot the row, compute the next array, and
// issue an UPDATE constrained by both `id` AND the original `updated_at`.
// If a concurrent write moved `updated_at`, the constrained update
// affects 0 rows and we retry with a fresh snapshot. After exhausting
// retries, the write is reported as failed AND a `rollback` callable is
// returned so the caller can restore the prior state if it had already
// commenced output side-effects.
//
// "rollback the whole run" at the caller layer means: surface the audit
// failure as a run-incomplete signal so downstream observers
// (orchestrator, governance, /clearance) do not treat the run's
// outputs as durable.

const DEFAULT_CAS_MAX_RETRIES = 3;
const DEFAULT_CAS_BACKOFF_MS = 25;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Atomic ProductSSOT write with snapshot + CAS retry + rollback callable.
 *
 * @param {object} args
 * @param {string}        args.productId
 * @param {string}        args.environment
 * @param {object|null}   args.supabase
 * @param {string[]}      [args.fields]              — additional jsonb columns to capture in the snapshot
 * @param {(prior: object) => object} args.mutate    — pure function: (prior columns) => next columns
 * @param {object}        [args.options]
 * @param {number}        [args.options.maxRetries=3]
 * @param {number}        [args.options.backoffMs=25]
 * @param {() => Promise<void>} [args.options.onCommit] — fired after a successful CAS
 *
 * @returns {Promise<{
 *   written: boolean,
 *   reason?: string,
 *   snapshot: object|null,                  // prior state (always set when row was found)
 *   priorUpdatedAt?: string|null,
 *   nextUpdatedAt?: string|null,
 *   attempts: number,
 *   rollback: () => Promise<{rolled:boolean, reason?:string}>
 * }>}
 */
export async function withAtomicSsotWrite({
  productId, environment, supabase, fields = ['governance_record'],
  mutate, options = {},
}) {
  const maxRetries = Number.isFinite(options.maxRetries) ? options.maxRetries : DEFAULT_CAS_MAX_RETRIES;
  const backoffMs  = Number.isFinite(options.backoffMs)  ? options.backoffMs  : DEFAULT_CAS_BACKOFF_MS;

  const noopRollback = async () => ({ rolled: false, reason: 'no_prior_state' });

  if (!supabase || typeof supabase.from !== 'function') {
    return {
      written: false, reason: 'supabase_unavailable',
      snapshot: null, attempts: 0, rollback: noopRollback,
    };
  }
  if (typeof mutate !== 'function') {
    return {
      written: false, reason: 'bad_mutate_fn',
      snapshot: null, attempts: 0, rollback: noopRollback,
    };
  }

  const selectCols = ['id', 'updated_at', ...fields].join(', ');
  let snapshot = null;
  let priorUpdatedAt = null;
  let attempts = 0;
  let lastReason = 'unknown';

  while (attempts < maxRetries) {
    attempts += 1;
    // 1. SNAPSHOT current row.
    const { data: row, error: selErr } = await supabase
      .from('product_ssot')
      .select(selectCols)
      .eq('product_id', productId)
      .eq('environment', environment)
      .maybeSingle();
    if (selErr) {
      lastReason = `select_failed:${selErr.message}`;
      break;
    }
    if (!row) {
      return {
        written: false, reason: 'no_product_ssot_row',
        snapshot: null, attempts, rollback: noopRollback,
      };
    }
    snapshot = {};
    for (const f of fields) snapshot[f] = row[f] ?? null;
    priorUpdatedAt = row.updated_at ?? null;

    // 2. COMPUTE next state via the caller's pure mutator.
    let next;
    try {
      next = mutate(snapshot);
    } catch (e) {
      return {
        written: false, reason: `mutate_threw:${e?.message ?? String(e)}`,
        snapshot, attempts, rollback: noopRollback,
      };
    }
    if (!next || typeof next !== 'object') {
      return {
        written: false, reason: 'mutate_returned_non_object',
        snapshot, attempts, rollback: noopRollback,
      };
    }

    // 3. CAS UPDATE — id + updated_at form the compare-and-swap key.
    const nextUpdatedAt = new Date().toISOString();
    let casQuery = supabase
      .from('product_ssot')
      .update({ ...next, updated_at: nextUpdatedAt })
      .eq('id', row.id);
    // Apply the updated_at constraint when the column is present.
    if (priorUpdatedAt !== null) {
      casQuery = casQuery.eq('updated_at', priorUpdatedAt);
    }
    // `.select('id')` requests the affected rows so we can detect the
    // CAS conflict (zero rows updated → version moved).
    const { data: updRows, error: updErr } = await casQuery.select('id');
    if (updErr) {
      lastReason = `update_failed:${updErr.message}`;
      break;
    }
    if (Array.isArray(updRows) && updRows.length > 0) {
      // SUCCESS. Build a rollback callable that restores the snapshot
      // state (CAS on the NEW updated_at). Note: this is a best-effort
      // structural restore — it does not undo any side-effects the
      // caller may have done elsewhere.
      const rollback = async () => {
        const { data: r2, error: e2 } = await supabase
          .from('product_ssot')
          .update({ ...snapshot, updated_at: new Date().toISOString() })
          .eq('id', row.id)
          .eq('updated_at', nextUpdatedAt)
          .select('id');
        if (e2) return { rolled: false, reason: e2.message };
        if (!Array.isArray(r2) || r2.length === 0) {
          return { rolled: false, reason: 'cas_conflict_on_rollback' };
        }
        return { rolled: true };
      };
      if (typeof options.onCommit === 'function') {
        try { await options.onCommit({ rowId: row.id, nextUpdatedAt }); }
        catch { /* swallow — commit hook failure must not undo the CAS */ }
      }
      return {
        written: true, snapshot, priorUpdatedAt, nextUpdatedAt,
        attempts, rollback,
      };
    }
    // CAS conflict: zero rows updated. Snapshot is stale — retry.
    lastReason = 'cas_conflict';
    if (attempts < maxRetries) {
      await sleep(backoffMs * attempts); // light linear backoff
    }
  }

  // Exhausted retries (or selErr / updErr broke the loop).
  return {
    written: false, reason: lastReason,
    snapshot, priorUpdatedAt, attempts, rollback: noopRollback,
  };
}

/**
 * Append a governance audit entry to product_ssot.governance_record
 * atomically (snapshot + CAS retry + rollback callable). On CAS
 * conflict beyond `options.maxRetries`, returns
 * `{ written: false, reason: 'cas_conflict', rollback }` — the caller
 * MUST treat the run as INCOMPLETE per §7 Output Contract #5.
 *
 * No-op when supabase is null (test paths) or the row doesn't exist
 * yet — failure shape is `{ written: false, reason }` and the orchestrator
 * surfaces it.
 */
export async function appendGovernanceEntry({ productId, environment, entry, supabase, options }) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { written: false, reason: 'supabase_unavailable', rollback: async () => ({ rolled: false, reason: 'no_prior_state' }) };
  }
  try {
    const result = await withAtomicSsotWrite({
      productId, environment, supabase,
      fields: ['governance_record'],
      mutate: (prior) => {
        const prev = Array.isArray(prior.governance_record) ? prior.governance_record : [];
        return { governance_record: [...prev, entry] };
      },
      options,
    });
    return result;
  } catch (e) {
    return {
      written: false, reason: e?.message ?? String(e),
      rollback: async () => ({ rolled: false, reason: 'no_prior_state' }),
    };
  }
}

/**
 * Append a delta_log entry to product_ssot.delta_log atomically.
 * Same CAS-with-rollback semantics as appendGovernanceEntry. Per
 * §7.5 the delta_log block is the per-run change log; per §7 #5 its
 * write is atomic with the rest of the output contract.
 */
export async function appendDeltaLogEntry({ productId, environment, entry, supabase, options }) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { written: false, reason: 'supabase_unavailable', rollback: async () => ({ rolled: false, reason: 'no_prior_state' }) };
  }
  try {
    const result = await withAtomicSsotWrite({
      productId, environment, supabase,
      fields: ['delta_log'],
      mutate: (prior) => {
        const prev = Array.isArray(prior.delta_log) ? prior.delta_log : [];
        return { delta_log: [...prev, entry] };
      },
      options,
    });
    return result;
  } catch (e) {
    return {
      written: false, reason: e?.message ?? String(e),
      rollback: async () => ({ rolled: false, reason: 'no_prior_state' }),
    };
  }
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Build a failure-shape return object. Centralised so every failed-step
 * surface produces the same shape.
 */
function fail(runId, productId, failedStep, err) {
  return Object.freeze({
    ok: false,
    runId,
    productId,
    failedStep,
    error: err?.message ?? String(err),
    code: err?.code ?? 'UNKNOWN',
  });
}

/**
 * Run the Option C Self-Renewal Phase A pipeline.
 *
 * @param {object} args
 * @param {string} args.productId
 * @param {string} args.githubRepoUrl
 * @param {object} args.issue           — { severity, title, description, evidence, filePath?, ... }
 * @param {string} args.runId
 * @param {object|null} args.supabase   — null for test paths
 * @param {string} args.environment     — 'dev'|'stg'|'prd'
 * @param {object} [args.deps]          — overridable injection point for tests
 *
 * @returns {Promise<object>} success or failure envelope
 */
export async function runOptionC(args) {
  if (!args || typeof args !== 'object') {
    return fail('unknown', 'unknown', 'STEP_INPUT', new Error('args object required'));
  }
  const { productId, githubRepoUrl, issue, supabase, environment } = args;
  const runId = args.runId || 'unknown';
  const deps = args.deps || {};

  // Dep resolution — every external call is overridable for tests.
  const _getInstallationToken = deps.getInstallationToken || getInstallationToken;
  const _computeScore         = deps.computeScore         || computeScore;
  const _generateFix          = deps.generateFix          || generateFix;
  const _createRenewalBranch  = deps.createRenewalBranch  || createRenewalBranch;
  const _deployBranchPreview  = deps.deployBranchPreview  || deployBranchPreview;
  const _evaluateDelta        = deps.evaluateDelta        || evaluateDelta;
  const _createRenewalPr      = deps.createRenewalPr      || createRenewalPr;
  const _checkRateCap         = deps.checkRateCap         || checkRateCap;
  const _checkRunawayDetector = deps.checkRunawayDetector || checkRunawayDetector;
  const _fetchFileContent     = deps.fetchFileContent     || fetchFileContent;
  const _readProductPolicy    = deps.readProductPolicy    || readProductPolicy;
  const _appendGovernanceEntry= deps.appendGovernanceEntry|| appendGovernanceEntry;

  // STEP A — rate cap + runaway detector.
  let policy;
  try {
    policy = await _readProductPolicy({ productId, supabase });
    // Skip rate-cap when supabase is null (test / dry-run paths).
    if (supabase && typeof supabase.from === 'function') {
      await _checkRateCap({ productId, maxPerDay: policy.selfRenewalMaxPerDay, supabase });
      await _checkRunawayDetector({ productId, runawayThreshold: policy.selfRenewalRunawayThreshold, supabase });
    }
  } catch (e) {
    return fail(runId, productId, 'STEP_A', e);
  }

  // STEP B — mint GitHub App installation token.
  let token;
  try {
    const minted = await _getInstallationToken();
    token = minted.token;
  } catch (e) {
    return fail(runId, productId, 'STEP_B', e);
  }

  // STEP C — parse owner/repo.
  let owner, repo;
  try {
    const parsed = parseGithubRepoUrl(githubRepoUrl);
    if (!parsed) throw Object.assign(new Error(`STEP_C: unparseable githubRepoUrl "${githubRepoUrl}"`), { code: 'BAD_REPO_URL' });
    owner = parsed.owner;
    repo = parsed.repo;
  } catch (e) {
    return fail(runId, productId, 'STEP_C', e);
  }
  const branchName = `flowai/renewal-${runId}`;

  // STEP D — compute preScore.
  // Honest degradation: computeScore needs monitorText which would come
  // from a full 8-step pipeline run. Module 10 does NOT re-run the
  // 8-step pipeline — that's a future orchestrator-level dispatch. The
  // pipeline accepts deps.preScore as an injection point; absent that,
  // we call computeScore with monitorText=null and accept the zero-
  // score envelope (error: 'monitor_text_required') as documented
  // degradation. delta will be 0 in the degraded case.
  let preScore;
  try {
    preScore = await _computeScore({
      productId, url: githubRepoUrl, runId, monitorText: deps.preScoreMonitorText ?? null,
    });
  } catch (e) {
    return fail(runId, productId, 'STEP_D', e);
  }

  // STEP E — fetch current file content + generate fix.
  let filePath, fileContent, fix;
  try {
    filePath = pickImpactedFilePath(issue);
    fileContent = await _fetchFileContent({ owner, repo, filePath, ref: 'main', token });
    fix = await _generateFix({
      filePath, fileContent, findings: [issue], productId, runId,
    });
  } catch (e) {
    return fail(runId, productId, 'STEP_E', e);
  }

  // STEP F — create branch + commit fix.
  let commitInfo;
  try {
    commitInfo = await _createRenewalBranch({
      owner, repo, baseBranch: 'main', branchName,
      filePath, fileContent: fix.fixedContent,
      commitMessage: `FlowAI Self-Renewal fix for run ${runId}`,
      token,
    });
  } catch (e) {
    return fail(runId, productId, 'STEP_F', e);
  }

  // STEP G — Vercel preview deploy.
  let previewUrl;
  try {
    const projectId = resolveVercelProjectId(productId);
    if (!projectId) {
      throw Object.assign(
        new Error(`STEP_G: no Vercel project ID resolved for productId="${productId}" (expected env VERCEL_PROJECT_ID_${String(productId).toUpperCase()})`),
        { code: 'VERCEL_PROJECT_ID_MISSING' });
    }
    const orgId = process.env.VERCEL_ORG_ID;
    if (!orgId) {
      throw Object.assign(new Error('STEP_G: VERCEL_ORG_ID is not set'),
        { code: 'VERCEL_ORG_ID_MISSING' });
    }
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      throw Object.assign(new Error('STEP_G: VERCEL_TOKEN is not set'),
        { code: 'VERCEL_TOKEN_MISSING' });
    }
    const deployment = await _deployBranchPreview({
      projectId, orgId, owner, repo, branchName, token: vercelToken,
    });
    previewUrl = deployment.previewUrl;
  } catch (e) {
    return fail(runId, productId, 'STEP_G', e);
  }

  // STEP H — compute postScore against the preview URL.
  let postScore;
  try {
    postScore = await _computeScore({
      productId, url: previewUrl, runId, monitorText: deps.postScoreMonitorText ?? null,
    });
  } catch (e) {
    return fail(runId, productId, 'STEP_H', e);
  }

  // STEP I — evaluate delta.
  let decision;
  try {
    decision = _evaluateDelta({ preScore, postScore, policy, runId, productId });
  } catch (e) {
    return fail(runId, productId, 'STEP_I', e);
  }

  // STEP J — open PR (only when decision says so).
  let pr = null;
  if (decision.action === 'open_pr') {
    try {
      pr = await _createRenewalPr({
        owner, repo, branchName, baseBranch: 'main',
        title: `FlowAI Self-Renewal: ${runId.slice(0, 8)}`,
        body: [
          decision.prBanner,
          '',
          `Preview: ${previewUrl}`,
          '',
          `Pre-score: ${preScore.total} → Post-score: ${postScore.total}`,
          '',
          `Run ID: ${runId}`,
        ].join('\n'),
        token,
      });
    } catch (e) {
      return fail(runId, productId, 'STEP_J', e);
    }
  }

  // STEP K — write audit entry. Failures here are non-fatal at the
  // pipeline-throw level (existing contract) but DISPATCH 28 P0-5
  // surfaces `runIncomplete: true` per §7 Output Contract #5: a run
  // that fails to update ProductSSOT is INCOMPLETE and the caller may
  // invoke `auditWrite.rollback()` to restore the snapshot state.
  let auditWrite = { written: false, reason: 'not_attempted' };
  try {
    auditWrite = await _appendGovernanceEntry({
      productId, environment, entry: decision.auditEntry, supabase,
    });
  } catch (e) {
    auditWrite = { written: false, reason: e?.message ?? String(e) };
  }

  return Object.freeze({
    ok: true,
    runId,
    productId,
    previewUrl,
    prUrl: pr?.prHtmlUrl ?? null,
    prNumber: pr?.prNumber ?? null,
    preScore: preScore.total,
    postScore: postScore.total,
    delta: decision.delta,
    action: decision.action,
    reason: decision.reason ?? null,
    isSubstantial: decision.isSubstantial,
    branchName,
    branchUrl: commitInfo.branchUrl,
    commitSha: commitInfo.commitSha,
    auditEntry: decision.auditEntry,
    auditWrite,
    // DISPATCH 28 P0-5: surface §7 #5 incompleteness signal alongside
    // the existing ok:true (callers can opt in to treating
    // runIncomplete as a hard failure or invoke the rollback callable).
    runIncomplete: !auditWrite.written && auditWrite.reason !== 'not_attempted'
      ? { reason: auditWrite.reason ?? 'unknown', rollback: auditWrite.rollback ?? null }
      : null,
  });
}

export const __internals = Object.freeze({
  parseGithubRepoUrl,
  resolveVercelProjectId,
  fetchFileContent,
  pickImpactedFilePath,
  readProductPolicy,
  appendGovernanceEntry,
  appendDeltaLogEntry,
  withAtomicSsotWrite,
  DEFAULT_CAS_MAX_RETRIES,
  DEFAULT_CAS_BACKOFF_MS,
});

// ── Delegate to the orchestrator (PART 2 of DISPATCH 22) ────────────────────
// runOrchestration is the new canonical entry — it adds the repeat-until-
// GTM-ready loop + auto/guided/manual modes + real scoring via
// monitorTextProducer. runOptionC (above) remains the single-iteration
// Phase A pipeline shape; new callers should use runOrchestration.
export { runOrchestration } from './orchestrator.js';
