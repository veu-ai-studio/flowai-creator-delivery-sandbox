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

/**
 * Append a governance audit entry to product_ssot.governance_record.
 * No-op when supabase is null (test paths) or the row doesn't exist
 * yet (pre-Self-Renewal product). Failures are SWALLOWED into a warning
 * return shape — audit-log degradation must not crash the pipeline.
 */
export async function appendGovernanceEntry({ productId, environment, entry, supabase }) {
  if (!supabase || typeof supabase.rpc !== 'function') {
    return { written: false, reason: 'supabase_unavailable' };
  }
  try {
    // The product_ssot row carries governance_record jsonb[]. We need
    // to append the entry idempotently. Supabase doesn't expose array_
    // append directly via the JS client; the cleanest pattern is an
    // RPC. Phase A wires a generic update-with-array-append shape; if
    // the RPC doesn't exist, fall back to a select+update read-modify-
    // write (NOT atomic — flagged as a future hardening item).
    const { data: row, error: selErr } = await supabase
      .from('product_ssot')
      .select('id, governance_record')
      .eq('product_id', productId)
      .eq('environment', environment)
      .maybeSingle();
    if (selErr || !row) {
      return { written: false, reason: `no_product_ssot_row:${selErr?.message ?? 'missing'}` };
    }
    const next = Array.isArray(row.governance_record) ? [...row.governance_record, entry] : [entry];
    const { error: updErr } = await supabase
      .from('product_ssot')
      .update({ governance_record: next, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updErr) return { written: false, reason: updErr.message };
    return { written: true };
  } catch (e) {
    return { written: false, reason: e?.message ?? String(e) };
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

  // STEP K — write audit entry. Failures here are non-fatal (warning).
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
  });
}

export const __internals = Object.freeze({
  parseGithubRepoUrl,
  resolveVercelProjectId,
  fetchFileContent,
  pickImpactedFilePath,
  readProductPolicy,
  appendGovernanceEntry,
});

// ── Delegate to the orchestrator (PART 2 of DISPATCH 22) ────────────────────
// runOrchestration is the new canonical entry — it adds the repeat-until-
// GTM-ready loop + auto/guided/manual modes + real scoring via
// monitorTextProducer. runOptionC (above) remains the single-iteration
// Phase A pipeline shape; new callers should use runOrchestration.
export { runOrchestration } from './orchestrator.js';
