// src/lib/agents/verification.js
//
// Sampled verification re-crawl helper for Agent #3 Self-Renewal
// Executor. Per CEO disposition Q5 = (c): every Nth renewal verified,
// monthly minimum per Locked Rule 16.
//
// The sampling decision is a pure function of (renewalCount,
// lastVerifiedAt, productScope, options); the actual re-crawl is a
// side-effectful adapter invocation that callers wire to their
// Orchestra / IssueDetector instances.
//
// ESM only. Sampling logic is deterministic given counter + clock.

'use strict';

const DEFAULT_SAMPLE_RATE = 5;            // every Nth renewal
const MONTHLY_MINIMUM_DAYS = 30;          // Locked Rule 16
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pure decision: should this renewal trigger a verification re-crawl?
 *
 * Logic:
 *   1. If `renewalCount` is a positive multiple of `sampleRate`, sample.
 *   2. Else if `lastVerifiedAt` is null OR older than 30 days, force-verify
 *      (Locked Rule 16 monthly minimum — never skip a monthly heartbeat).
 *   3. Else skip.
 *
 * @param {object} params
 * @param {number} params.renewalCount      — 1-indexed total renewals for productScope
 * @param {number|null} params.lastVerifiedAt — epoch ms of last verification, or null if never
 * @param {string}  params.productScope     — for audit trail
 * @param {object}  [params.options]
 * @param {number}  [params.options.sampleRate=5]
 * @param {number}  [params.options.monthlyMinimumDays=30]
 * @param {() => number} [params.options.now=Date.now]
 * @returns {{ sampled: boolean, reason: string }}
 */
export function shouldVerify({
  renewalCount,
  lastVerifiedAt,
  productScope,
  options = {},
}) {
  const sampleRate =
    Number.isInteger(options.sampleRate) && options.sampleRate > 0
      ? options.sampleRate
      : DEFAULT_SAMPLE_RATE;
  const monthlyMinimumDays =
    Number.isFinite(options.monthlyMinimumDays) && options.monthlyMinimumDays > 0
      ? options.monthlyMinimumDays
      : MONTHLY_MINIMUM_DAYS;
  const now = typeof options.now === 'function' ? options.now : () => Date.now();

  if (!Number.isInteger(renewalCount) || renewalCount < 1) {
    return { sampled: false, reason: 'invalid renewalCount; not sampled' };
  }

  // Rule 1: every Nth renewal samples.
  if (renewalCount % sampleRate === 0) {
    return {
      sampled: true,
      reason: `every-${sampleRate}th sample (renewalCount=${renewalCount}, productScope=${productScope})`,
    };
  }

  // Rule 2: monthly minimum override.
  const t = now();
  const ageMs =
    typeof lastVerifiedAt === 'number' && lastVerifiedAt > 0 ? t - lastVerifiedAt : Infinity;
  const ageDays = ageMs / DAY_MS;
  if (ageDays >= monthlyMinimumDays) {
    return {
      sampled: true,
      reason: `monthly-minimum heartbeat (Locked Rule 16; last verified ${
        Number.isFinite(ageDays) ? Math.round(ageDays) : '∞'
      } days ago, productScope=${productScope})`,
    };
  }

  return {
    sampled: false,
    reason: `skipped (renewalCount=${renewalCount} not multiple of ${sampleRate}; last verified ${
      Number.isFinite(ageDays) ? Math.round(ageDays) : '∞'
    } days ago)`,
  };
}

/**
 * Execute a verification re-crawl. Returns the before/after delta the
 * caller emits as `3.renewal.delta.v1`.
 *
 * This is a side-effectful adapter. The caller injects:
 *   - issueDetector: { detect(artifact, evidence) => Issue[] }
 *   - orchestraDispatch: async ({capability, ...args}) => MemberResult
 *   - claudeNormalize: async (rawArtifact) => normalizedArtifact (optional)
 *
 * The before/after delta semantics match spec §2.5:
 *   - resolved: issues in `before.autoFixable` whose category does not
 *     appear in the re-crawled findings
 *   - unresolved: issues in `before.autoFixable` whose category still
 *     appears
 *   - regressions: re-crawled findings whose category does not appear
 *     in `before` at all (genuinely new issues created by the patch)
 *
 * @param {object} params
 * @param {string} params.productScope
 * @param {string} params.renewedUrl
 * @param {Array<object>} params.before  — original IssueList (W2 schema)
 * @param {object} params.adapters
 * @param {object} params.adapters.issueDetector       — required
 * @param {Function} params.adapters.orchestraDispatch  — required
 * @param {Function} [params.adapters.claudeNormalize]
 * @returns {Promise<{ after, resolved, unresolved, regressions, sampledAt }>}
 */
export async function runVerificationRecrawl({
  productScope,
  renewedUrl,
  before,
  adapters,
}) {
  if (!adapters?.issueDetector || typeof adapters.issueDetector.detect !== 'function') {
    throw new TypeError('runVerificationRecrawl: adapters.issueDetector.detect required');
  }
  if (typeof adapters?.orchestraDispatch !== 'function') {
    throw new TypeError('runVerificationRecrawl: adapters.orchestraDispatch required');
  }
  if (typeof renewedUrl !== 'string' || renewedUrl.length === 0) {
    throw new Error('runVerificationRecrawl: renewedUrl required');
  }
  const beforeList = Array.isArray(before) ? before : [];

  // 1. Crawl the renewed URL.
  const crawl = await adapters.orchestraDispatch({
    capability: 'crawl',
    url: renewedUrl,
    productScope,
  });
  if (!crawl || crawl.ok !== true) {
    return Object.freeze({
      after: [],
      resolved: [],
      unresolved: beforeList.filter((i) => i.autoFixable).map((i) => i.id),
      regressions: [],
      sampledAt: Date.now(),
      crawlFailure: true,
      crawlError: crawl?.error ?? 'unknown',
    });
  }

  // 2. Optionally normalize via Claude (input-adapter parity with W2's url.js).
  let artifact = crawl.artifact ?? crawl.body ?? crawl.text ?? null;
  if (typeof adapters.claudeNormalize === 'function' && artifact) {
    try {
      artifact = await adapters.claudeNormalize(artifact);
    } catch {
      // Normalization is best-effort; raw artifact still scored.
    }
  }

  // 3. Re-detect issues.
  const after = adapters.issueDetector.detect(artifact, crawl.evidence ?? null) ?? [];
  const afterCategories = new Set(after.map((i) => i.category));
  const beforeCategoriesAutoFixable = new Set(
    beforeList.filter((i) => i.autoFixable).map((i) => i.category),
  );

  const resolved = beforeList
    .filter((i) => i.autoFixable && !afterCategories.has(i.category))
    .map((i) => i.id);
  const unresolved = beforeList
    .filter((i) => i.autoFixable && afterCategories.has(i.category))
    .map((i) => i.id);
  const regressions = after
    .filter((n) => !beforeCategoriesAutoFixable.has(n.category))
    .map((n) => n.id);

  return Object.freeze({
    after: Object.freeze(after),
    resolved: Object.freeze(resolved),
    unresolved: Object.freeze(unresolved),
    regressions: Object.freeze(regressions),
    sampledAt: Date.now(),
    crawlFailure: false,
  });
}

// Exported for unit tests.
export const __test = Object.freeze({
  DEFAULT_SAMPLE_RATE,
  MONTHLY_MINIMUM_DAYS,
});
