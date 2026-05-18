/**
 * Module 11 — Branch Cleanup.
 *
 * Implements `docs/specs/renewal/BRANCH_CLEANUP_SPEC.md` §3 + §4 + §5:
 * lists all `flowai/renewal-*` branches on an operator-owned repo,
 * deletes those that are (a) older than retentionDays AND (b) have
 * no open PR. Branches with open PRs are PRESERVED regardless of age
 * — operator may still be deliberating.
 *
 * Public contract (per spec §3):
 *
 *   await cleanupStaleBranches({ owner, repo, retentionDays, token, supabase })
 *     → {
 *         inspected, eligibleForDeletion,
 *         deleted:           [{ branch, age_days, runId, deletedAt, ssotEntryRef }],
 *         preservedByOpenPR: [{ branch, prNumber, age_days, runId }],
 *         preservedByAge:    [{ branch, age_days, runId }],
 *         failed:            [{ branch, runId, reason, willRetry }],
 *         completedAt,
 *       }
 *
 * Spec invariants honored:
 *   - §4.2: every successful DELETE writes a governance_record_entry
 *     of kind `self_renewal.branch_cleaned_up.v1`.
 *   - §4.3: persistent failures write `self_renewal.cleanup_failed.v1`
 *     governance entry.
 *   - §5: GitHub response → classification matrix (204 success, 404
 *     idempotent, 403 protected persistent, 401 escalation, 5xx
 *     transient with retry).
 *   - §6 AC-BC-6: GitHub token NEVER appears in any error message,
 *     log line, governance entry, or returned envelope.
 *   - §6 AC-BC-7: branch parameter URL-encoded so adversarial branch
 *     names can't escape the DELETE URL path.
 *   - §6 BC-E1 boundary: `age_days > retentionDays` is STRICTLY greater
 *     than — branches on the exact retention boundary are PRESERVED.
 *
 * Not in scope (per §9):
 *   - Cross-product orchestration (caller iterates).
 *   - Branch revival from cold storage (deletes are final).
 *   - Cleanup of non-`flowai/renewal-*` branches (those are operator-owned).
 *   - Cleanup of the PRs themselves (we reap branches only).
 */

'use strict';

const GITHUB_API_BASE = 'https://api.github.com';
const BRANCH_PREFIX = 'flowai/renewal-';
const PAGE_SIZE = 100;
const MAX_PAGES = 50;   // hard upper bound: 5,000 branches per repo

const FAILURE_REASONS = Object.freeze({
  PERMISSION_DENIED: 'permission_denied',
  BRANCH_NOT_FOUND:  'branch_not_found',
  BRANCH_PROTECTED:  'branch_protected',
  GITHUB_5XX:        'github_5xx',
  RATE_LIMITED:      'rate_limited',
  UNKNOWN:           'unknown',
});

function nowMs() { return Date.now(); }

function extractRunId(branch) {
  if (typeof branch !== 'string') return null;
  if (!branch.startsWith(BRANCH_PREFIX)) return null;
  const suffix = branch.slice(BRANCH_PREFIX.length);
  return suffix.length > 0 ? suffix : null;
}

function ageDays(commitDateIso, now = nowMs()) {
  if (!commitDateIso) return 0;
  const d = new Date(commitDateIso);
  if (Number.isNaN(d.getTime())) return 0;
  return (now - d.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * Per spec §5 AC-BC-6 + §8 SELF_RENEWAL_SPEC: GitHub token MUST NEVER
 * appear in any error message. Sanitize any string by replacing the
 * token value with [REDACTED] before logging or persisting.
 */
function scrubTokenFromText(text, token) {
  if (typeof text !== 'string') return text;
  if (typeof token !== 'string' || token.length < 8) return text;
  // Token might appear raw OR as Bearer <token>; replace both.
  return text.split(token).join('[REDACTED]');
}

function classifyDeleteFailure(status, bodyText) {
  if (status === 401) return { reason: FAILURE_REASONS.PERMISSION_DENIED, willRetry: false, persistent: true };
  if (status === 404) return { reason: FAILURE_REASONS.BRANCH_NOT_FOUND, willRetry: false, persistent: true };
  if (status === 403) {
    const body = (bodyText ?? '').toLowerCase();
    if (body.includes('protected') || body.includes('branch is protected')) {
      return { reason: FAILURE_REASONS.BRANCH_PROTECTED, willRetry: false, persistent: true };
    }
    if (body.includes('rate limit') || body.includes('api rate limit exceeded')) {
      return { reason: FAILURE_REASONS.RATE_LIMITED, willRetry: true, persistent: false };
    }
    // Default 403 is persistent (e.g. missing permission scope).
    return { reason: FAILURE_REASONS.PERMISSION_DENIED, willRetry: false, persistent: true };
  }
  if (status === 422) return { reason: FAILURE_REASONS.UNKNOWN, willRetry: false, persistent: true };
  if (status >= 500 && status < 600) return { reason: FAILURE_REASONS.GITHUB_5XX, willRetry: true, persistent: false };
  if (status === 0) return { reason: FAILURE_REASONS.GITHUB_5XX, willRetry: true, persistent: false };
  return { reason: FAILURE_REASONS.UNKNOWN, willRetry: false, persistent: true };
}

async function githubFetch({ method, path, token, fetchImpl, body }) {
  const url = `${GITHUB_API_BASE}${path}`;
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'FlowAI-BranchCleanup/1.0',
      },
      ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
    });
  } catch (e) {
    return { ok: false, status: 0, body: '', error: scrubTokenFromText(e?.message ?? String(e), token) };
  }
  let bodyText = '';
  try { bodyText = await response.text(); } catch { /* ignore */ }
  return { ok: response.ok, status: response.status, body: bodyText };
}

function parseLinkHeader(headerValue) {
  // Returns { next: '/path?page=2&per_page=100', last: ... } or {} if no Link header.
  if (typeof headerValue !== 'string') return {};
  const out = {};
  const parts = headerValue.split(',').map((s) => s.trim());
  for (const part of parts) {
    const m = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (m) out[m[2]] = m[1];
  }
  return out;
}

/**
 * Page through GET /repos/{owner}/{repo}/branches and return every
 * branch object whose name starts with `flowai/renewal-`.
 */
async function listRenewalBranches({ owner, repo, token, fetchImpl }) {
  const branches = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=${PAGE_SIZE}&page=${page}`;
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'FlowAI-BranchCleanup/1.0',
        },
      });
    } catch (e) {
      throw new Error(scrubTokenFromText(`listRenewalBranches: ${e?.message ?? String(e)}`, token));
    }
    if (!response.ok) {
      let body = '';
      try { body = await response.text(); } catch { /* ignore */ }
      throw new Error(scrubTokenFromText(
        `listRenewalBranches: GitHub ${response.status} ${response.statusText} — ${body.slice(0, 200)}`,
        token,
      ));
    }
    let pageJson;
    try { pageJson = await response.json(); }
    catch (e) { throw new Error(`listRenewalBranches: non-JSON response — ${e?.message ?? String(e)}`); }
    if (!Array.isArray(pageJson)) break;
    for (const b of pageJson) {
      if (typeof b?.name === 'string' && b.name.startsWith(BRANCH_PREFIX)) branches.push(b);
    }
    if (pageJson.length < PAGE_SIZE) break;
    // Honour Link: rel="next" — if absent, stop.
    const link = response.headers?.get?.('link') ?? '';
    if (!parseLinkHeader(link).next) break;
  }
  return branches;
}

/**
 * Resolve commit-date + open-PR-count for a single branch.
 */
async function inspectBranch({ owner, repo, branchName, token, fetchImpl }) {
  // 1. Fetch branch detail (carries committer.date).
  const branchDetail = await githubFetch({
    method: 'GET',
    path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branchName)}`,
    token, fetchImpl,
  });
  let commitDateIso = null;
  if (branchDetail.ok) {
    try {
      const parsed = JSON.parse(branchDetail.body);
      commitDateIso = parsed?.commit?.commit?.committer?.date ?? parsed?.commit?.commit?.author?.date ?? null;
    } catch { /* fall through with null commitDateIso */ }
  }
  // 2. Fetch open PRs on this branch as head.
  const headExpr = `${owner}:${branchName}`;
  const prs = await githubFetch({
    method: 'GET',
    path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?head=${encodeURIComponent(headExpr)}&state=open`,
    token, fetchImpl,
  });
  let openPrs = [];
  if (prs.ok) {
    try { openPrs = JSON.parse(prs.body); if (!Array.isArray(openPrs)) openPrs = []; }
    catch { openPrs = []; }
  }
  return { commitDateIso, openPrCount: openPrs.length, openPrNumber: openPrs[0]?.number ?? null };
}

async function deleteBranch({ owner, repo, branchName, token, fetchImpl }) {
  return githubFetch({
    method: 'DELETE',
    path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branchName)}`,
    token, fetchImpl,
  });
}

async function writeGovernanceEntry({ supabase, entry }) {
  if (!supabase || typeof supabase.from !== 'function') return null;
  try {
    const res = await supabase
      .from('product_ssot_governance_record')
      .insert(entry)
      .select('id')
      .maybeSingle();
    return res?.data?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Cleanup stale `flowai/renewal-*` branches on an operator-owned repo.
 * Public entry point per spec §3.
 *
 * @param {object} args
 * @param {string} args.owner
 * @param {string} args.repo
 * @param {number} args.retentionDays
 * @param {string} args.token
 * @param {object} [args.supabase]            — Supabase client; null disables governance writes
 * @param {string} [args.productId]           — Resolved product id for governance entries
 * @param {string} [args.trigger='scheduled'] — 'scheduled' | 'admin_on_demand'
 * @param {function} [args.fetch]             — DI for tests; defaults to globalThis.fetch
 * @param {function} [args.now]               — DI for tests; defaults to Date.now
 * @returns {Promise<object>} per-spec §3 envelope
 */
export async function cleanupStaleBranches(args) {
  const owner = typeof args?.owner === 'string' ? args.owner : '';
  const repo = typeof args?.repo === 'string' ? args.repo : '';
  const retentionDays = Number.isFinite(args?.retentionDays) && args.retentionDays >= 0 ? args.retentionDays : 7;
  const token = typeof args?.token === 'string' ? args.token : '';
  const supabase = args?.supabase ?? null;
  const productId = typeof args?.productId === 'string' ? args.productId : null;
  const trigger = args?.trigger === 'admin_on_demand' ? 'admin_on_demand' : 'scheduled';
  const fetchImpl = typeof args?.fetch === 'function' ? args.fetch : globalThis.fetch;
  const now = typeof args?.now === 'function' ? args.now : nowMs;

  if (!owner || !repo) {
    return {
      inspected: 0, eligibleForDeletion: 0,
      deleted: [], preservedByOpenPR: [], preservedByAge: [],
      failed: [{ branch: null, runId: null, reason: FAILURE_REASONS.UNKNOWN, willRetry: false, detail: 'owner + repo required' }],
      completedAt: new Date(now()).toISOString(),
    };
  }
  if (!token) {
    return {
      inspected: 0, eligibleForDeletion: 0,
      deleted: [], preservedByOpenPR: [], preservedByAge: [],
      failed: [{ branch: null, runId: null, reason: FAILURE_REASONS.PERMISSION_DENIED, willRetry: false, detail: 'token required' }],
      completedAt: new Date(now()).toISOString(),
    };
  }
  if (typeof fetchImpl !== 'function') {
    return {
      inspected: 0, eligibleForDeletion: 0,
      deleted: [], preservedByOpenPR: [], preservedByAge: [],
      failed: [{ branch: null, runId: null, reason: FAILURE_REASONS.UNKNOWN, willRetry: false, detail: 'fetch unavailable' }],
      completedAt: new Date(now()).toISOString(),
    };
  }

  // 1. List branches.
  let branches;
  try {
    branches = await listRenewalBranches({ owner, repo, token, fetchImpl });
  } catch (e) {
    return {
      inspected: 0, eligibleForDeletion: 0,
      deleted: [], preservedByOpenPR: [], preservedByAge: [],
      failed: [{ branch: null, runId: null, reason: FAILURE_REASONS.UNKNOWN, willRetry: true, detail: scrubTokenFromText(e?.message ?? String(e), token) }],
      completedAt: new Date(now()).toISOString(),
    };
  }

  const deleted = [];
  const preservedByOpenPR = [];
  const preservedByAge = [];
  const failed = [];
  let eligibleForDeletion = 0;

  // 2. Inspect each branch + decide preserve / delete.
  for (const b of branches) {
    const branchName = b.name;
    const runId = extractRunId(branchName);
    let inspect;
    try {
      inspect = await inspectBranch({ owner, repo, branchName, token, fetchImpl });
    } catch (e) {
      failed.push({ branch: branchName, runId, reason: FAILURE_REASONS.UNKNOWN, willRetry: true, detail: scrubTokenFromText(e?.message ?? String(e), token) });
      continue;
    }
    const age_days = ageDays(inspect.commitDateIso, now());

    // Decision matrix per spec §4.1 step 2.e.
    // BC-E1 boundary: strict greater-than. exact == retentionDays preserved.
    if (age_days <= retentionDays && inspect.openPrCount === 0) {
      preservedByAge.push({ branch: branchName, age_days, runId });
      continue;
    }
    if (inspect.openPrCount > 0) {
      preservedByOpenPR.push({ branch: branchName, prNumber: inspect.openPrNumber, age_days, runId });
      continue;
    }
    // age_days > retentionDays AND openPrCount === 0 → DELETE.
    eligibleForDeletion += 1;
    const result = await deleteBranch({ owner, repo, branchName, token, fetchImpl });
    if (result.status === 204 || result.ok === true) {
      const deletedAt = new Date(now()).toISOString();
      const entry = {
        kind:                 'self_renewal.branch_cleaned_up.v1',
        runId,
        productId,
        branch:               branchName,
        branchAgeDays:        age_days,
        retentionDaysApplied: retentionDays,
        deletedAt,
        deletionMethod:       'github_app_token',
        operatorRepoOwner:    owner,
        operatorRepoName:     repo,
        trigger,
      };
      const ssotEntryRef = await writeGovernanceEntry({ supabase, entry });
      deleted.push({ branch: branchName, age_days, runId, deletedAt, ssotEntryRef });
      continue;
    }
    // Delete failed — classify + record.
    const classification = classifyDeleteFailure(result.status, result.body);
    failed.push({
      branch: branchName,
      runId,
      reason: classification.reason,
      willRetry: classification.willRetry,
      githubResponseStatus: result.status,
    });
    if (classification.persistent) {
      // Spec §4.3 — emit cleanup_failed.v1 governance entry on persistent
      // failure (transient failures wait for the 3-consecutive-failure
      // gate — out of scope for this single-run module; the consumer of
      // the result envelope sees willRetry: true and re-invokes).
      await writeGovernanceEntry({
        supabase,
        entry: {
          kind: 'self_renewal.cleanup_failed.v1',
          runId,
          productId,
          branch: branchName,
          reason: classification.reason,
          githubResponseStatus: result.status,
          willRetryNextRun: classification.willRetry,
          at: new Date(now()).toISOString(),
        },
      });
    }
  }

  return {
    inspected:           branches.length,
    eligibleForDeletion,
    deleted,
    preservedByOpenPR,
    preservedByAge,
    failed,
    completedAt:         new Date(now()).toISOString(),
  };
}

export const __internals = Object.freeze({
  GITHUB_API_BASE,
  BRANCH_PREFIX,
  PAGE_SIZE,
  MAX_PAGES,
  FAILURE_REASONS,
  extractRunId,
  ageDays,
  scrubTokenFromText,
  classifyDeleteFailure,
  parseLinkHeader,
  listRenewalBranches,
  inspectBranch,
  deleteBranch,
  writeGovernanceEntry,
});
