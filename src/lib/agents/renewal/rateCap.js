/**
 * Self-Renewal Module 9 — rate cap + runaway detector.
 *
 * Two guards every renewal cycle must pass before execution:
 *
 *   checkRateCap({ productId, maxPerDay, supabase })
 *     - Counts `self_renewal.*` events in product_ssot.governance_record
 *       for this product within the last 24 hours.
 *     - If count ≥ maxPerDay → throws SELF_RENEWAL_RATE_LIMIT.
 *     - Otherwise returns { allowed: true, runsInWindow, cap }.
 *
 *   checkRunawayDetector({ productId, runawayThreshold, supabase })
 *     - Reads product_registry.self_renewal_disabled. If true → throws
 *       SELF_RENEWAL_DISABLED (operator has already stopped Self-Renewal
 *       for this product; no further runs).
 *     - Counts the most recent `self_renewal.*` events for this product
 *       in product_ssot.governance_record. If the latest N entries
 *       (where N = runawayThreshold) are ALL `self_renewal.gate_failed.v1`,
 *       sets product_registry.self_renewal_disabled = true, appends a
 *       `self_renewal.runaway_disabled.v1` entry to governance_record,
 *       and throws SELF_RENEWAL_RUNAWAY_DISABLED.
 *     - Otherwise returns { safe: true }.
 *
 * The Supabase client is ALWAYS injected — this module never instantiates
 * one. That keeps the tests reasonable (mock client) and keeps the
 * production caller (the Self-Renewal orchestrator) in charge of which
 * client/role context the queries run in.
 *
 * ESM only. Node 18+.
 *
 * Spec: docs/specs/SELF_RENEWAL_SPEC.md §4.7 R5
 *   - max_per_day: hard rate cap, renewal cycles per rolling 24-hour window
 *   - runaway_threshold: N consecutive runs failing the same gate auto-
 *     disables Self-Renewal for the product
 *
 * Data model:
 *   product_ssot.governance_record  jsonb[] (append-only event log)
 *     each entry: { kind: 'self_renewal.<event>.v1', at: '<ISO 8601>', ... }
 *   product_registry.self_renewal_disabled  boolean
 *   product_registry.self_renewal_max_per_day  integer
 *   product_registry.self_renewal_runaway_threshold  integer
 */

'use strict';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SELF_RENEWAL_KIND_PREFIX = 'self_renewal.';
const GATE_FAILED_KIND = 'self_renewal.gate_failed.v1';
const RUNAWAY_DISABLED_KIND = 'self_renewal.runaway_disabled.v1';

/**
 * Build a code-tagged Error with optional extra fields. Used so the
 * Self-Renewal orchestrator can switch on `err.code` instead of parsing
 * messages.
 *
 * @param {string} code
 * @param {string} message
 * @param {object} [extra]
 * @returns {Error}
 */
function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  for (const [k, v] of Object.entries(extra)) {
    err[k] = v;
  }
  return err;
}

/**
 * Parse an ISO 8601 timestamp into a Date. Returns null on any failure
 * so a malformed record can't bring down the whole rate-cap check.
 */
function parseAt(at) {
  if (typeof at !== 'string' || at.length === 0) return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Compute the earliest moment the next renewal can run if the cap is
 * currently met: 24 hours after the OLDEST run in the current window
 * expires. Returns null if no in-window runs exist (shouldn't happen
 * when this is called, but defensive).
 */
function computeNextEligibleAt(inWindow) {
  let oldest = null;
  for (const r of inWindow) {
    const t = parseAt(r.at);
    if (t && (oldest === null || t < oldest)) oldest = t;
  }
  if (oldest === null) return null;
  return new Date(oldest.getTime() + ONE_DAY_MS);
}

/**
 * Defensive shape check on an injected Supabase client. We only need
 * .from() to exist; any further chaining will throw if the mock /
 * misconfigured client is shaped wrong.
 */
function requireSupabase(supabase, fn) {
  if (!supabase || typeof supabase.from !== 'function') {
    throw makeError(
      'RATE_CAP_BAD_CLIENT',
      `${fn}: supabase client missing .from() — must inject a Supabase v2 client`,
    );
  }
}

/**
 * Count renewal runs in the last 24 hours and enforce the daily cap.
 *
 * @param {object} args
 * @param {string} args.productId        — e.g. 'mypreglife'
 * @param {number} args.maxPerDay        — integer cap from product_registry.self_renewal_max_per_day
 * @param {object} args.supabase         — Supabase v2 client (always injected; never instantiated here)
 * @param {Date}   [args.now]            — clock override for tests (defaults to new Date())
 * @returns {Promise<{ allowed: true, runsInWindow: number, cap: number }>}
 * @throws  {Error}  with code === 'SELF_RENEWAL_RATE_LIMIT' when runsInWindow >= cap.
 *                   The thrown error carries { cap, windowStart, nextEligibleAt }.
 */
export async function checkRateCap({ productId, maxPerDay, supabase, now } = {}) {
  if (typeof productId !== 'string' || productId.length === 0) {
    throw makeError('RATE_CAP_BAD_ARGS', 'checkRateCap: productId must be a non-empty string');
  }
  if (typeof maxPerDay !== 'number' || !Number.isInteger(maxPerDay) || maxPerDay < 1) {
    throw makeError('RATE_CAP_BAD_ARGS', 'checkRateCap: maxPerDay must be a positive integer');
  }
  requireSupabase(supabase, 'checkRateCap');

  const nowDate = now instanceof Date ? now : new Date();
  const windowStart = new Date(nowDate.getTime() - ONE_DAY_MS);

  const { data, error } = await supabase
    .from('product_ssot')
    .select('governance_record')
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    throw makeError(
      'RATE_CAP_QUERY_FAILED',
      `checkRateCap: product_ssot select failed for ${productId} — ${error.message ?? String(error)}`,
      { cause: error },
    );
  }

  const records = Array.isArray(data?.governance_record) ? data.governance_record : [];
  const inWindow = records.filter((r) => {
    if (!r || typeof r !== 'object') return false;
    if (typeof r.kind !== 'string' || !r.kind.startsWith(SELF_RENEWAL_KIND_PREFIX)) return false;
    const at = parseAt(r.at);
    return at !== null && at >= windowStart && at <= nowDate;
  });

  if (inWindow.length >= maxPerDay) {
    const nextEligibleAt = computeNextEligibleAt(inWindow);
    throw makeError(
      'SELF_RENEWAL_RATE_LIMIT',
      `checkRateCap: product ${productId} hit daily cap — ${inWindow.length} runs in last 24h, cap=${maxPerDay}`,
      {
        cap: maxPerDay,
        windowStart,
        runsInWindow: inWindow.length,
        nextEligibleAt,
        productId,
      },
    );
  }

  return { allowed: true, runsInWindow: inWindow.length, cap: maxPerDay };
}

/**
 * Inspect recent gate-failure history and auto-disable Self-Renewal for
 * this product if N consecutive gate failures have occurred.
 *
 * @param {object} args
 * @param {string} args.productId          — e.g. 'mypreglife'
 * @param {number} args.runawayThreshold   — integer N from product_registry.self_renewal_runaway_threshold
 * @param {object} args.supabase           — Supabase v2 client (always injected)
 * @param {Date}   [args.now]              — clock override for tests
 * @returns {Promise<{ safe: true }>}
 * @throws  {Error}  with code === 'SELF_RENEWAL_DISABLED' when the operator-set flag is true.
 * @throws  {Error}  with code === 'SELF_RENEWAL_RUNAWAY_DISABLED' when N consecutive failures
 *                   trigger the auto-disable (the disable + governance_record append are
 *                   performed BEFORE the throw — operator must intervene).
 */
export async function checkRunawayDetector({ productId, runawayThreshold, supabase, now } = {}) {
  if (typeof productId !== 'string' || productId.length === 0) {
    throw makeError('RATE_CAP_BAD_ARGS', 'checkRunawayDetector: productId must be a non-empty string');
  }
  if (typeof runawayThreshold !== 'number' || !Number.isInteger(runawayThreshold) || runawayThreshold < 1) {
    throw makeError(
      'RATE_CAP_BAD_ARGS',
      'checkRunawayDetector: runawayThreshold must be a positive integer',
    );
  }
  requireSupabase(supabase, 'checkRunawayDetector');

  // 1. Operator-set disable flag — short-circuit before any further work.
  const { data: reg, error: regErr } = await supabase
    .from('product_registry')
    .select('self_renewal_disabled')
    .eq('product_id', productId)
    .maybeSingle();

  if (regErr) {
    throw makeError(
      'RATE_CAP_QUERY_FAILED',
      `checkRunawayDetector: product_registry select failed for ${productId} — ${regErr.message ?? String(regErr)}`,
      { cause: regErr },
    );
  }

  if (reg?.self_renewal_disabled === true) {
    throw makeError(
      'SELF_RENEWAL_DISABLED',
      `checkRunawayDetector: Self-Renewal is disabled for product ${productId} (operator action)`,
      { productId },
    );
  }

  // 2. Pull recent governance_record and inspect the latest N self_renewal events.
  const { data: ssot, error: ssotErr } = await supabase
    .from('product_ssot')
    .select('governance_record')
    .eq('product_id', productId)
    .maybeSingle();

  if (ssotErr) {
    throw makeError(
      'RATE_CAP_QUERY_FAILED',
      `checkRunawayDetector: product_ssot select failed for ${productId} — ${ssotErr.message ?? String(ssotErr)}`,
      { cause: ssotErr },
    );
  }

  const records = Array.isArray(ssot?.governance_record) ? ssot.governance_record : [];

  // Filter to self_renewal events that ALSO have a valid timestamp so the
  // sort below is stable. A malformed (kind ok, at missing) entry breaks
  // consecutivity ordering, so skip it — defensive against historical
  // junk rows.
  const renewalEvents = records
    .filter(
      (r) =>
        r &&
        typeof r === 'object' &&
        typeof r.kind === 'string' &&
        r.kind.startsWith(SELF_RENEWAL_KIND_PREFIX) &&
        parseAt(r.at) !== null,
    )
    .sort((a, b) => parseAt(b.at).getTime() - parseAt(a.at).getTime()); // newest-first

  const latestN = renewalEvents.slice(0, runawayThreshold);
  const allFailed =
    latestN.length === runawayThreshold &&
    latestN.every((r) => r.kind === GATE_FAILED_KIND);

  if (!allFailed) {
    return { safe: true };
  }

  // 3. RUNAWAY: disable the product, append a runaway-disabled event,
  //    then throw. Disable + append happen BEFORE the throw so the
  //    operator state is durable regardless of how the caller handles
  //    the error (don't trust the caller to retry the writes).
  const nowDate = now instanceof Date ? now : new Date();
  const runawayEvent = {
    kind: RUNAWAY_DISABLED_KIND,
    at: nowDate.toISOString(),
    productId,
    consecutiveFailures: runawayThreshold,
    failedEventIds: latestN.map((r) => r.runId ?? r.id ?? null).filter((x) => x !== null),
  };

  const { error: disableErr } = await supabase
    .from('product_registry')
    .update({ self_renewal_disabled: true })
    .eq('product_id', productId);

  if (disableErr) {
    // The disable write failed — surface as RATE_CAP_QUERY_FAILED so the
    // caller doesn't silently succeed under the assumption the product
    // is now disabled. Do NOT proceed to the append step.
    throw makeError(
      'RATE_CAP_QUERY_FAILED',
      `checkRunawayDetector: failed to set self_renewal_disabled for ${productId} — ${disableErr.message ?? String(disableErr)}`,
      { cause: disableErr, runawayDetected: true, consecutiveFailures: runawayThreshold },
    );
  }

  // Append the runaway event to product_ssot.governance_record. We write
  // back the full array (records + new event) because Supabase-JS v2 does
  // not directly expose Postgres' array_append; the orchestrator pattern
  // here matches the existing append-to-array writes elsewhere in the
  // Self-Renewal pipeline.
  const updatedRecord = [...records, runawayEvent];
  const { error: appendErr } = await supabase
    .from('product_ssot')
    .update({ governance_record: updatedRecord })
    .eq('product_id', productId);

  if (appendErr) {
    // The disable already succeeded — the product IS now disabled. Surface
    // the append failure but include the runawayDetected flag so the
    // caller knows the disable landed; this lets the orchestrator avoid
    // double-disabling on retry while still alerting on the audit-log
    // gap.
    throw makeError(
      'RATE_CAP_QUERY_FAILED',
      `checkRunawayDetector: disabled product ${productId} but failed to append runaway event — ${appendErr.message ?? String(appendErr)}`,
      { cause: appendErr, runawayDetected: true, productDisabled: true },
    );
  }

  throw makeError(
    'SELF_RENEWAL_RUNAWAY_DISABLED',
    `checkRunawayDetector: ${runawayThreshold} consecutive gate failures for ${productId} — Self-Renewal auto-disabled`,
    {
      productId,
      consecutiveFailures: runawayThreshold,
      disabledAt: nowDate.toISOString(),
    },
  );
}

export const __internals = Object.freeze({
  ONE_DAY_MS,
  SELF_RENEWAL_KIND_PREFIX,
  GATE_FAILED_KIND,
  RUNAWAY_DISABLED_KIND,
  makeError,
  parseAt,
  computeNextEligibleAt,
});
