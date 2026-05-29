/**
 * disagreementProtocol — W3 escalation thresholds for auditor-of-auditor runs.
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/audits/disagreementProtocol.js   (W3 territory)
 *
 * Per W0 ruling:
 *   T  = 5  — delta in rounded score between two auditors that triggers a
 *             third independent run.
 *   T2 = 10 — delta that escalates directly to W0 (gap too wide to resolve
 *             via a third run).
 *
 * decideEscalation({ t1Score, t2Score, t3Score })
 *   - Returns one of: 'NO_ESCALATION' | 'THIRD_RUN' | 'W0_ESCALATION'.
 *   - Two-run mode (t3Score omitted/undefined): the primary auditor and the
 *     auditor-of-auditor. delta12 = |t1 - t2|.
 *       delta12 >= T2   -> W0_ESCALATION (immediate)
 *       T <= delta12<T2 -> THIRD_RUN
 *       delta12 < T     -> NO_ESCALATION
 *   - Three-run mode (t3Score provided): the third auditor has weighed in.
 *       any pairwise delta >= T2 -> W0_ESCALATION
 *       all pairwise deltas < T  -> NO_ESCALATION
 *       otherwise                -> W0_ESCALATION (the third run did not
 *                                                  resolve the dispute)
 * ---------------------------------------------------------------------------
 */

'use strict';

export const DISAGREEMENT_T = 5;
export const DISAGREEMENT_T2 = 10;

export const ESCALATION = Object.freeze({
  NO_ESCALATION: 'NO_ESCALATION',
  THIRD_RUN: 'THIRD_RUN',
  W0_ESCALATION: 'W0_ESCALATION',
});

function _assertScore(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`disagreementProtocol: ${label} must be a finite number, got ${value}`);
  }
  if (value < 0 || value > 100) {
    throw new Error(`disagreementProtocol: ${label} must be in [0, 100], got ${value}`);
  }
}

export function decideEscalation({ t1Score, t2Score, t3Score } = {}) {
  _assertScore(t1Score, 't1Score');
  _assertScore(t2Score, 't2Score');

  const delta12 = Math.abs(t1Score - t2Score);

  if (t3Score === undefined || t3Score === null) {
    if (delta12 >= DISAGREEMENT_T2) return ESCALATION.W0_ESCALATION;
    if (delta12 >= DISAGREEMENT_T)  return ESCALATION.THIRD_RUN;
    return ESCALATION.NO_ESCALATION;
  }

  _assertScore(t3Score, 't3Score');
  const delta13 = Math.abs(t1Score - t3Score);
  const delta23 = Math.abs(t2Score - t3Score);
  const maxDelta = Math.max(delta12, delta13, delta23);

  if (maxDelta >= DISAGREEMENT_T2) return ESCALATION.W0_ESCALATION;
  if (maxDelta < DISAGREEMENT_T)   return ESCALATION.NO_ESCALATION;
  return ESCALATION.W0_ESCALATION;
}

export function deltaOf(t1Score, t2Score, t3Score) {
  _assertScore(t1Score, 't1Score');
  _assertScore(t2Score, 't2Score');
  const delta12 = Math.abs(t1Score - t2Score);
  if (t3Score === undefined || t3Score === null) return delta12;
  _assertScore(t3Score, 't3Score');
  return Math.max(delta12, Math.abs(t1Score - t3Score), Math.abs(t2Score - t3Score));
}
