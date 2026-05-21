// src/lib/verification/regressionGate.js
//
// PART B — Severity-weighted regression gate with non-linear escalation.
//
// Replaces the count-based "N regressions = fail" rule with a weighted
// score that respects how DAMAGING each regression is, escalating
// non-linearly as a single metric blows past its noise envelope. A
// short-circuit hard-failure check fires BEFORE the weighted-score
// math, so runtime errors and 404 storms halt instantly regardless of
// what the rest of the scoreboard looks like.
//
// Back-compat: the legacy `threshold` argument (count-based gate) is
// preserved. If supplied, both gates must pass — count <= threshold AND
// (no hard-failure AND weightedScore <= 10). That keeps the original
// phaseCVerification.test.js scenario (3 regressions, threshold=2 →
// fail) green while the new behavior runs underneath.

'use strict';

export const DEFAULT_REGRESSION_THRESHOLD = 2;

/** Base weight per metric. Higher = more damaging to user-facing quality. */
export const REGRESSION_WEIGHTS = Object.freeze({
  'lighthouse.performance':   1,
  'lighthouse.accessibility': 2,
  'lighthouse.bestPractices': 1,
  'lighthouse.seo':           1,
  axeViolations:              3,
  axeImageAltViolations:      2,
  axeContrastViolations:      2,
  axeAriaViolations:          2,
  runtimeErrors:              4,
  runtime404s:                3,
  consoleErrors:              4,
  totalFindings:              1,
});

/** Non-linear escalation multiplier as a regression grows past its
 *  noise envelope. normalizedMagnitude = abs(delta) / max(noise, 1).
 *  The brackets reflect the GPT-reviewed shape:
 *    <=1×  : 1.0 (minor — within or just above noise)
 *    <=3×  : 1.5 (moderate)
 *    <=5×  : 2.5 (severe)
 *    >5×   : 4.0 (critical) */
export const ESCALATION_CURVE = Object.freeze({
  minor:    1.0,
  moderate: 1.5,
  severe:   2.5,
  critical: 4.0,
});

/** Metrics that HALT the pipeline instantly when they regress by the
 *  associated minimum delta. Catches incidents (e.g. one new runtime
 *  exception) that a weighted average could otherwise hide. */
export const HARD_FAILURE_METRICS = Object.freeze({
  runtimeErrors: 1,   // ANY runtime-error increase = halt
  runtime404s:   3,   // 1-2 may be transient; 3+ = halt
});

/** Score → severity band. Catastrophic short-circuits via hard-failure. */
const SEVERITY_BANDS = Object.freeze([
  { ceiling: 2,        level: 'low' },
  { ceiling: 6,        level: 'medium' },
  { ceiling: Infinity, level: 'high' },
]);

function escalationFor(normalizedMagnitude) {
  if (normalizedMagnitude <= 1) return ESCALATION_CURVE.minor;
  if (normalizedMagnitude <= 3) return ESCALATION_CURVE.moderate;
  if (normalizedMagnitude <= 5) return ESCALATION_CURVE.severe;
  return ESCALATION_CURVE.critical;
}

function severityFor(score) {
  for (const band of SEVERITY_BANDS) {
    if (score <= band.ceiling) return band.level;
  }
  return 'high';
}

/**
 * Run the regression gate.
 *
 * @param {object} args
 * @param {object} args.deltaResult     — output of calculateTransformationDelta()
 * @param {number} [args.threshold]     — legacy count-based threshold (back-compat)
 * @param {number} [args.weightedHaltAt=10] — halt when weightedScore exceeds this
 * @param {function} [args.onStep]      — SSE step emitter
 *
 * @returns {{
 *   kind: 'regression_gate',
 *   passed: boolean,
 *   regressions: Array,
 *   netDelta: number,
 *   threshold?: number,
 *   weightedScore: number,
 *   severityLevel: 'low'|'medium'|'high'|'catastrophic',
 *   hardFailureTriggered: boolean,
 *   hardFailureDetails: Array<{ metric, delta, minimumDelta }>,
 *   escalationDetails: Array<{ metric, delta, noiseThreshold,
 *                              normalizedMagnitude, escalation,
 *                              baseWeight, weightedRegression }>,
 *   exitReason: string|null,
 * }}
 */
export function runRegressionGate({
  deltaResult,
  threshold,
  weightedHaltAt = 10,
  onStep,
} = {}) {
  const regressions = Array.isArray(deltaResult?.regressions) ? deltaResult.regressions : [];
  const netDelta = deltaResult?.aggregate?.netDelta ?? 0;

  // ── Hard-failure check (highest precedence) ──────────────────────────────
  const hardFailureDetails = [];
  for (const r of regressions) {
    const minimumDelta = HARD_FAILURE_METRICS[r?.metric];
    if (minimumDelta === undefined) continue;
    // For "lower is better" metrics (every hard-failure metric in v1),
    // a positive raw delta = WORSE. Treat missing delta as 1 so a
    // legacy-shaped regression entry still triggers (defensive).
    const rawDelta = typeof r?.delta === 'number' ? r.delta : 1;
    if (rawDelta >= minimumDelta) {
      hardFailureDetails.push(Object.freeze({
        metric: r.metric,
        delta: rawDelta,
        minimumDelta,
      }));
    }
  }
  const hardFailureTriggered = hardFailureDetails.length > 0;

  // ── Weighted-score computation (non-linear escalation) ───────────────────
  const escalationDetails = [];
  let weightedScore = 0;
  for (const r of regressions) {
    const baseWeight = REGRESSION_WEIGHTS[r?.metric] ?? 1;
    const noiseThreshold = typeof r?.noiseThreshold === 'number' ? r.noiseThreshold : 0;
    const rawDelta = typeof r?.delta === 'number' ? Math.abs(r.delta) : 1;
    const normalizedMagnitude = rawDelta / Math.max(noiseThreshold, 1);
    const escalation = escalationFor(normalizedMagnitude);
    const weightedRegression = baseWeight * normalizedMagnitude * escalation;
    weightedScore += weightedRegression;
    escalationDetails.push(Object.freeze({
      metric: r?.metric ?? 'unknown',
      delta: typeof r?.delta === 'number' ? r.delta : null,
      noiseThreshold,
      normalizedMagnitude,
      escalation,
      baseWeight,
      weightedRegression,
    }));
  }
  // Round to one decimal for stable serialization.
  weightedScore = Math.round(weightedScore * 10) / 10;

  // ── Severity classification ──────────────────────────────────────────────
  const severityLevel = hardFailureTriggered ? 'catastrophic' : severityFor(weightedScore);

  // ── Gate verdict (all conditions must pass) ──────────────────────────────
  let exitReason = null;
  let passed = true;
  if (hardFailureTriggered) {
    passed = false;
    exitReason = 'CATASTROPHIC_REGRESSION';
  } else if (weightedScore > weightedHaltAt) {
    passed = false;
    exitReason = 'WEIGHTED_REGRESSION_EXCEEDED';
  }
  // Legacy count-based gate (back-compat for callers that still pass a
  // threshold). Only narrows the verdict — never widens it.
  if (typeof threshold === 'number' && regressions.length > threshold) {
    passed = false;
    if (exitReason === null) exitReason = 'COUNT_THRESHOLD_EXCEEDED';
  }

  const payload = Object.freeze({
    kind: 'regression_gate',
    passed,
    regressions,
    netDelta,
    threshold: typeof threshold === 'number' ? threshold : undefined,
    weightedScore,
    weightedHaltAt,
    severityLevel,
    hardFailureTriggered,
    hardFailureDetails,
    escalationDetails,
    exitReason,
  });
  if (typeof onStep === 'function') {
    try { onStep({ type: 'step', log: payload }); } catch { /* swallow */ }
  }
  return payload;
}

export const __internals = Object.freeze({
  escalationFor, severityFor, SEVERITY_BANDS,
});
