// src/lib/scoring/capabilityWeightedScore.js
//
// Capability-Weighted GTM Readiness Score (CA-18 §2 honest disclosure
// enforcement). Combats the misleading "99.5/100 with only 4/10
// dimensions scored" outcome by deflating the headline score by the
// coverage ratio, then applying a hard minimum-coverage floor.
//
// Formula:
//   coverageConfidence = scoredDimensions / totalDimensions
//   effectiveTrustScore = rawScore * coverageConfidence
//   meetsMinimumCoverage = scoredDimensions >= MINIMUM_SCORED_DIMENSIONS_FOR_GTM
//
// Example (the motivating case):
//   raw=99.5, scored=4, total=10 → coverage=0.4 → trust=39.8
//   meetsMinimumCoverage=false (4 < 7) → GTM gate refuses regardless of
//   how high effectiveTrustScore goes.
//
// Pure function — no IO, no exceptions. Safe to call any time.

'use strict';

/** Minimum number of CA-18 §2 dimensions that must be scored before
 *  a run can claim GTM readiness, irrespective of the score itself. */
export const MINIMUM_SCORED_DIMENSIONS_FOR_GTM = 7;

/** Total CA-18 §2 dimensions (canonical list, used as denominator when
 *  caller doesn't supply dimensions_contributing). */
export const TOTAL_DIMENSIONS = 10;

function clampScore(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Count scored dimensions from a CA-18 §2 dimensions_contributing[]
 * array. A dimension counts as scored only when `scored === true`.
 */
export function countScoredDimensions(dimensionsContributing) {
  if (!Array.isArray(dimensionsContributing)) return 0;
  let n = 0;
  for (const d of dimensionsContributing) {
    if (d && d.scored === true) n += 1;
  }
  return n;
}

/**
 * @typedef {object} CapabilityWeightedScore
 * @property {number} rawScore                — original §7.6 GTM score, [0,100]
 * @property {number} effectiveTrustScore     — rawScore × coverageConfidence, [0,100]
 * @property {number} coverageConfidence      — scored/total, [0,1]
 * @property {number} scoredDimensions
 * @property {number} totalDimensions
 * @property {boolean} meetsMinimumCoverage   — scoredDimensions >= MINIMUM_SCORED_DIMENSIONS_FOR_GTM
 * @property {number} minimumScoredDimensionsForGTM
 * @property {string} coverageDisclosure      — human-readable banner string for UI / governance record
 */

/**
 * Format the canonical CA-18 §2 honest-disclosure string. Used by UI banners
 * and governance_record entries so the deflation is never hidden behind a
 * single number. Stable wording lets downstream tools/tests pattern-match.
 */
export function formatCoverageDisclosure({ rawScore, effectiveTrustScore, scoredDimensions, totalDimensions }) {
  const raw = Number.isFinite(rawScore) ? rawScore : 0;
  const eff = Number.isFinite(effectiveTrustScore) ? effectiveTrustScore : 0;
  const pct = totalDimensions > 0 ? Math.round((scoredDimensions / totalDimensions) * 100) : 0;
  return `${scoredDimensions} of ${totalDimensions} dimensions scored (${pct}% coverage); raw ${raw.toFixed(1)} → effective ${eff.toFixed(1)}/100`;
}

/**
 * Compute the capability-weighted trust score.
 *
 * @param {object} args
 * @param {number} args.rawScore                  — canonical §7.6 GTM Readiness score
 * @param {Array} [args.dimensionsContributing]   — CA-18 §2 array; if omitted, caller may pass scoredDimensions directly
 * @param {number} [args.scoredDimensions]        — explicit override (used when dimensionsContributing absent)
 * @param {number} [args.totalDimensions]         — default TOTAL_DIMENSIONS
 * @returns {CapabilityWeightedScore}
 */
export function computeCapabilityWeightedScore({
  rawScore,
  dimensionsContributing,
  scoredDimensions,
  totalDimensions,
} = {}) {
  const raw = clampScore(typeof rawScore === 'number' ? rawScore : 0);

  let scored;
  let total;
  if (Array.isArray(dimensionsContributing)) {
    scored = countScoredDimensions(dimensionsContributing);
    total = Math.max(dimensionsContributing.length, 1);
  } else {
    scored = Number.isFinite(scoredDimensions) ? Math.max(0, Math.floor(scoredDimensions)) : 0;
    total = Number.isFinite(totalDimensions) && totalDimensions > 0
      ? Math.floor(totalDimensions)
      : TOTAL_DIMENSIONS;
  }
  if (scored > total) scored = total;

  const coverageConfidence = clamp01(scored / total);
  const effectiveTrustScore = clampScore(raw * coverageConfidence);
  const coverageDisclosure = formatCoverageDisclosure({
    rawScore: raw,
    effectiveTrustScore,
    scoredDimensions: scored,
    totalDimensions: total,
  });

  return Object.freeze({
    rawScore: raw,
    effectiveTrustScore,
    coverageConfidence,
    scoredDimensions: scored,
    totalDimensions: total,
    meetsMinimumCoverage: scored >= MINIMUM_SCORED_DIMENSIONS_FOR_GTM,
    minimumScoredDimensionsForGTM: MINIMUM_SCORED_DIMENSIONS_FOR_GTM,
    coverageDisclosure,
  });
}

/**
 * Decide GTM readiness using the capability-weighted gate. Both
 * conditions must hold:
 *   1. effectiveTrustScore >= gtmTarget
 *   2. scoredDimensions >= MINIMUM_SCORED_DIMENSIONS_FOR_GTM
 *
 * @param {object} args
 * @param {CapabilityWeightedScore} args.weighted
 * @param {number} args.gtmTarget
 * @returns {{ gtmReady: boolean, gateFailureReason: string|null }}
 */
export function decideGtmGate({ weighted, gtmTarget }) {
  if (!weighted) return { gtmReady: false, gateFailureReason: 'no_weighted_score' };
  if (!weighted.meetsMinimumCoverage) {
    return { gtmReady: false, gateFailureReason: 'INSUFFICIENT_DIMENSION_COVERAGE' };
  }
  if (weighted.effectiveTrustScore < gtmTarget) {
    return { gtmReady: false, gateFailureReason: 'TRUST_SCORE_BELOW_TARGET' };
  }
  return { gtmReady: true, gateFailureReason: null };
}
