/**
 * Delta policy evaluator — Self-Renewal §6.4 (R1, R2, R8).
 *
 * Pure function. Takes pre/post Five-Layer scores + the per-product
 * policy from ProductRegistry, decides whether to open a PR or silent-
 * close, and ALWAYS returns an audit-log entry — including on silent-
 * close paths (spec §6.4 R8: operator must be able to see what happened
 * even when no PR was opened).
 *
 * Decision sequence (per dispatch + spec §6.4):
 *   1. delta = postScore.total - preScore.total
 *   2. isSubstantial = delta >= policy.selfRenewalSubstantialThreshold
 *      (C1 fix at commit cd07328: `>=` not `>`)
 *   3. If delta < 0 AND policy.selfRenewalNegativeDeltaPolicy ===
 *      'DISCARD_ON_NEGATIVE' → silent_close('discarded_negative_delta')
 *   4. If delta < policy.selfRenewalMinimumDelta →
 *      silent_close('below_threshold')
 *   5. Otherwise → open_pr
 *
 * HARD INVARIANT (spec §6.4 R8): the returned object ALWAYS contains
 * `auditEntry` regardless of action. Every branch builds the entry from
 * the same shape so the audit trail is uniform.
 *
 * No external calls. No console output. No I/O. Pure function suitable
 * for the orchestrator to call inline.
 */

'use strict';

// Audit-event topics per spec §6.4 R8. Versioned `.v1` so future
// schema changes are additive (publish .v2 alongside .v1).
const AUDIT_KIND_OPEN_PR = 'self_renewal.delta_evaluated.v1';
const AUDIT_KIND_DISCARD_NEGATIVE = 'self_renewal.discarded_negative_delta.v1';
const AUDIT_KIND_BELOW_THRESHOLD = 'self_renewal.below_threshold.v1';

const VALID_NEGATIVE_DELTA_POLICIES = Object.freeze(new Set([
  'ALWAYS_OPEN',
  'DISCARD_ON_NEGATIVE',
]));

/**
 * Build the audit-entry payload. Shared across all 3 decision branches
 * so the audit trail has a consistent shape.
 *
 * @param {object} args
 * @param {string} args.kind
 * @param {string} args.runId
 * @param {string} args.productId
 * @param {object} args.preScore
 * @param {object} args.postScore
 * @param {number} args.delta
 * @param {object} args.policy
 * @returns {object}
 */
function buildAuditEntry({ kind, runId, productId, preScore, postScore, delta, policy }) {
  return Object.freeze({
    kind,
    runId,
    productId,
    preScore,
    postScore,
    delta,
    policy,
    at: new Date().toISOString(),
  });
}

/**
 * Validate that the inputs have the minimum shape required for
 * evaluation. Throws TypeError with a descriptive message for missing
 * or malformed inputs.
 *
 * @param {object} args
 */
function validateInputs(args) {
  if (!args || typeof args !== 'object') {
    throw new TypeError('evaluateDelta: args object required');
  }
  if (!args.preScore || typeof args.preScore !== 'object' || typeof args.preScore.total !== 'number') {
    throw new TypeError('evaluateDelta: preScore.total must be a number');
  }
  if (!args.postScore || typeof args.postScore !== 'object' || typeof args.postScore.total !== 'number') {
    throw new TypeError('evaluateDelta: postScore.total must be a number');
  }
  if (!args.policy || typeof args.policy !== 'object') {
    throw new TypeError('evaluateDelta: policy object required');
  }
  if (typeof args.policy.selfRenewalNegativeDeltaPolicy !== 'string'
      || !VALID_NEGATIVE_DELTA_POLICIES.has(args.policy.selfRenewalNegativeDeltaPolicy)) {
    throw new TypeError(
      "evaluateDelta: policy.selfRenewalNegativeDeltaPolicy must be 'ALWAYS_OPEN' or 'DISCARD_ON_NEGATIVE'");
  }
  if (typeof args.policy.selfRenewalMinimumDelta !== 'number') {
    throw new TypeError('evaluateDelta: policy.selfRenewalMinimumDelta must be a number');
  }
  if (typeof args.policy.selfRenewalSubstantialThreshold !== 'number') {
    throw new TypeError('evaluateDelta: policy.selfRenewalSubstantialThreshold must be a number');
  }
  if (typeof args.runId !== 'string' || !args.runId) {
    throw new TypeError('evaluateDelta: runId must be a non-empty string');
  }
  if (typeof args.productId !== 'string' || !args.productId) {
    throw new TypeError('evaluateDelta: productId must be a non-empty string');
  }
}

/**
 * Evaluate the delta and return an action decision + audit entry.
 *
 * @param {object} args
 * @param {object} args.preScore   — score object with `total` numeric field
 * @param {object} args.postScore  — score object with `total` numeric field
 * @param {object} args.policy     — ProductRegistry config:
 *   { selfRenewalNegativeDeltaPolicy: 'ALWAYS_OPEN' | 'DISCARD_ON_NEGATIVE',
 *     selfRenewalMinimumDelta: number,
 *     selfRenewalSubstantialThreshold: number }
 * @param {string} args.runId
 * @param {string} args.productId
 *
 * @returns {{
 *   action: 'open_pr' | 'silent_close',
 *   reason?: 'discarded_negative_delta' | 'below_threshold',
 *   delta: number,
 *   preScore: number,
 *   postScore: number,
 *   isSubstantial: boolean,
 *   prBanner?: string,
 *   auditEntry: object
 * }}
 */
export function evaluateDelta(args) {
  validateInputs(args);

  const { preScore, postScore, policy, runId, productId } = args;
  const delta = postScore.total - preScore.total;
  // C1 fix at spec commit cd07328: `>=` not `>`. delta exactly equal to
  // the substantial threshold IS substantial.
  const isSubstantial = delta >= policy.selfRenewalSubstantialThreshold;

  const auditPayload = {
    runId,
    productId,
    preScore,
    postScore,
    delta,
    policy,
  };

  // Branch 1: negative delta + DISCARD_ON_NEGATIVE → silent close.
  // Per spec §6.4 R2 + R8, this MUST emit the audit entry.
  if (delta < 0 && policy.selfRenewalNegativeDeltaPolicy === 'DISCARD_ON_NEGATIVE') {
    return Object.freeze({
      action: 'silent_close',
      reason: 'discarded_negative_delta',
      delta,
      preScore: preScore.total,
      postScore: postScore.total,
      isSubstantial,
      auditEntry: buildAuditEntry({ kind: AUDIT_KIND_DISCARD_NEGATIVE, ...auditPayload }),
    });
  }

  // Branch 2: delta < minimumDelta → silent close.
  // Per spec §6.4 R2 + R8, this MUST emit the audit entry.
  if (delta < policy.selfRenewalMinimumDelta) {
    return Object.freeze({
      action: 'silent_close',
      reason: 'below_threshold',
      delta,
      preScore: preScore.total,
      postScore: postScore.total,
      isSubstantial,
      auditEntry: buildAuditEntry({ kind: AUDIT_KIND_BELOW_THRESHOLD, ...auditPayload }),
    });
  }

  // Branch 3: open PR.
  return Object.freeze({
    action: 'open_pr',
    delta,
    preScore: preScore.total,
    postScore: postScore.total,
    isSubstantial,
    prBanner: isSubstantial
      ? `✅ Substantial improvement (+${delta})`
      : `⚠️ Minor improvement (+${delta})`,
    auditEntry: buildAuditEntry({ kind: AUDIT_KIND_OPEN_PR, ...auditPayload }),
  });
}

export const __internals = Object.freeze({
  AUDIT_KIND_OPEN_PR,
  AUDIT_KIND_DISCARD_NEGATIVE,
  AUDIT_KIND_BELOW_THRESHOLD,
  VALID_NEGATIVE_DELTA_POLICIES,
  buildAuditEntry,
  validateInputs,
});
