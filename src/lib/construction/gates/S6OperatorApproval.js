// src/lib/construction/gates/S6OperatorApproval.js
//
// S6 — Pre-construction admin approval (NON-OVERRIDABLE per CA-17 §3.6
// v3-final).
//
// Invariants:
//   - admin-required for ALL construction classes
//   - 15-minute freshness window
//   - rationale ≥60 chars + not stop-words
//   - narrow in-flight invalidation on materially-changing kinds ONLY
//     (closed 6-kind list per CA-17 §3.6)
//
// In Phase 1 test mode (no human gate available in CI), an admin flag
// `s6_auto_approve_in_test_mode = true` auto-approves with the same
// audit trail. Production path requires a real admin role.

'use strict';

import { createHash } from 'node:crypto';

export const APPROVAL_KIND = 'construction_pre_approval.v1';
export const APPROVAL_RATIONALE_FAILURE_KIND = 'construction_rationale_quality_failure.v1';
export const APPROVAL_INVALIDATED_KIND = 'construction_approval_invalidated_by_context_change.v1';
export const APPROVAL_INSUFFICIENT_ROLE_KIND = 'construction_insufficient_role.v1';
export const APPROVAL_STALE_KIND = 'construction_approval_stale.v1';
export const FRESH_WINDOW_MS = 15 * 60 * 1000;
export const MIN_RATIONALE_CHARS = 60;

export const MATERIAL_CHANGE_KINDS = Object.freeze([
  'construction_pre_baseline.v1',
  'architecture_snapshot.v1',
  'gtm_bar_admin_override.v1',
  'gtm_bar_admin_override_used.v1',
  'construction_class.v1',
  // purpose_drift_annotation.v1 invalidates only when severity is 'critical'
  'purpose_drift_annotation.v1:critical',
]);

const STOP_WORDS = Object.freeze(new Set([
  'lgtm', 'ok', 'okay', 'fine', 'good', 'go', 'yes', 'sure',
  'approve', 'approved', 'please', 'thanks', 'thx', 'wfm',
  'looks good', 'all good', 'go ahead', 'proceed', 'do it',
]));

function sha256(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function makeS6Error(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  err.gate = 'S6';
  for (const [k, v] of Object.entries(extra)) err[k] = v;
  return err;
}

/**
 * Validate rationale text against the stop-word and length rules.
 */
export function validateRationale(rationale) {
  if (typeof rationale !== 'string') {
    return { ok: false, reason: 'not_a_string' };
  }
  const trimmed = rationale.trim();
  if (trimmed.length < MIN_RATIONALE_CHARS) {
    return { ok: false, reason: `too_short:${trimmed.length}<${MIN_RATIONALE_CHARS}` };
  }
  const lower = trimmed.toLowerCase();
  if (STOP_WORDS.has(lower)) {
    return { ok: false, reason: 'stop_word_only' };
  }
  // Pure stop-word fragment ratio: if more than half the rationale is
  // stop words, reject too.
  const tokens = lower.split(/\s+/).filter(Boolean);
  const stopHits = tokens.filter((t) => STOP_WORDS.has(t)).length;
  if (tokens.length > 0 && (stopHits / tokens.length) > 0.5) {
    return { ok: false, reason: 'majority_stop_words' };
  }
  return { ok: true };
}

/**
 * Check if any entry in `recentEntries` (since approval time) is one of
 * the materially-changing kinds. Returns the first invalidating entry
 * (or null if approval still valid).
 */
export function checkInFlightInvalidation({ approval, recentEntries }) {
  if (!approval || !Array.isArray(recentEntries)) return null;
  const approvalAtMs = new Date(approval.granted_at).getTime();
  if (!Number.isFinite(approvalAtMs)) return null;
  for (const e of recentEntries) {
    if (!e || typeof e.kind !== 'string') continue;
    const entryAt = new Date(e.captured_at ?? e.at ?? 0).getTime();
    if (!Number.isFinite(entryAt) || entryAt <= approvalAtMs) continue;
    let materialKey = e.kind;
    if (e.kind === 'purpose_drift_annotation.v1' && e.severity !== 'critical') continue;
    if (e.kind === 'purpose_drift_annotation.v1' && e.severity === 'critical') {
      materialKey = 'purpose_drift_annotation.v1:critical';
    }
    if (MATERIAL_CHANGE_KINDS.includes(materialKey)) {
      return { invalidating_kind: materialKey, entry: e };
    }
  }
  return null;
}

/**
 * Run S6 end-to-end: validate role, rationale, freshness; if test-mode
 * auto-approval is enabled, synthesise the approval envelope.
 *
 * @param {object} args
 * @param {string} args.productId
 * @param {string} [args.environment]
 * @param {string} args.constructionClass
 * @param {object} args.approval         — { operator, role, rationale, granted_at }
 * @param {string} args.baselineHash     — phase_a_baseline_hash from S1
 * @param {Array}  [args.recentEntries]  — entries since approval (for in-flight check)
 * @param {boolean} [args.testModeAutoApprove]
 * @param {string}  [args.testModeAutoApproveOperator]
 * @returns {Promise<{ ok: true, envelope: object }>}
 */
export async function runS6OperatorApproval({ productId, environment, constructionClass, approval, baselineHash, recentEntries, testModeAutoApprove, testModeAutoApproveOperator, appendGovernanceEntry, supabase, logger, now }) {
  if (typeof productId !== 'string' || productId.length === 0) {
    throw makeS6Error(APPROVAL_INSUFFICIENT_ROLE_KIND, 'S6: productId required');
  }
  const clock = typeof now === 'function' ? now : () => Date.now();

  let resolved = approval ?? null;
  let autoApproved = false;

  if (!resolved && testModeAutoApprove === true) {
    resolved = {
      operator: testModeAutoApproveOperator ?? 'auto-admin-test-mode',
      role: 'admin',
      rationale: `Phase 1 wire_up construction proof-of-concept test mode auto-approval: construction_class=${constructionClass} baseline=${baselineHash} — CA-17 §3.6 v3-final test-path with auto-approve flag set; audit trail preserved for review.`,
      granted_at: new Date(clock()).toISOString(),
    };
    autoApproved = true;
  }

  if (!resolved) {
    throw makeS6Error(APPROVAL_INSUFFICIENT_ROLE_KIND, 'S6: approval object required (or testModeAutoApprove=true for proof-of-concept)');
  }

  if (resolved.role !== 'admin') {
    throw makeS6Error(APPROVAL_INSUFFICIENT_ROLE_KIND,
      `S6: operator role "${resolved.role}" insufficient — admin required for all construction classes per CA-17 §3.6 v3-final`);
  }

  const rationaleValidation = validateRationale(resolved.rationale);
  if (!rationaleValidation.ok) {
    throw makeS6Error(APPROVAL_RATIONALE_FAILURE_KIND,
      `S6: rationale quality failed — ${rationaleValidation.reason}`);
  }

  const grantedMs = new Date(resolved.granted_at).getTime();
  if (!Number.isFinite(grantedMs)) {
    throw makeS6Error(APPROVAL_STALE_KIND, 'S6: approval.granted_at must be a parseable ISO timestamp');
  }
  const ageMs = clock() - grantedMs;
  if (ageMs > FRESH_WINDOW_MS) {
    throw makeS6Error(APPROVAL_STALE_KIND,
      `S6: approval stale — age ${Math.round(ageMs / 1000)}s > freshness window ${FRESH_WINDOW_MS / 1000}s`);
  }
  if (ageMs < 0) {
    throw makeS6Error(APPROVAL_STALE_KIND, `S6: approval.granted_at is in the future (${resolved.granted_at})`);
  }

  // Narrow in-flight invalidation per v3-final §3.6.
  const invalidation = checkInFlightInvalidation({ approval: resolved, recentEntries });
  if (invalidation) {
    const inv = Object.freeze({
      kind: APPROVAL_INVALIDATED_KIND,
      invalidating_kind: invalidation.invalidating_kind,
      invalidating_entry_summary: { captured_at: invalidation.entry.captured_at, kind: invalidation.entry.kind },
      approval_granted_at: resolved.granted_at,
      captured_at: new Date(clock()).toISOString(),
    });
    if (typeof appendGovernanceEntry === 'function') {
      await appendGovernanceEntry({
        productId, environment: environment ?? 'prd', entry: inv, supabase,
      });
    }
    throw makeS6Error(APPROVAL_INVALIDATED_KIND,
      `S6: approval invalidated by in-flight context change — kind=${invalidation.invalidating_kind}`,
      { invalidating_kind: invalidation.invalidating_kind });
  }

  const envelope = Object.freeze({
    kind: APPROVAL_KIND,
    construction_class: constructionClass,
    operator: resolved.operator,
    role: resolved.role,
    rationale_hash: sha256(resolved.rationale),
    rationale_length: resolved.rationale.length,
    granted_at: resolved.granted_at,
    fresh_window_ms: FRESH_WINDOW_MS,
    phase_a_baseline_hash: baselineHash,
    test_mode_auto_approved: autoApproved,
    captured_at: new Date(clock()).toISOString(),
  });

  if (typeof appendGovernanceEntry === 'function') {
    await appendGovernanceEntry({
      productId, environment: environment ?? 'prd', entry: envelope, supabase,
    });
  }

  if (logger?.info) logger.info('S6 operator approval cleared', { productId, constructionClass, autoApproved });
  return Object.freeze({ ok: true, envelope, autoApproved });
}
