// src/lib/remediation/remediationClassifier.js — PHASE B2 STEP 2
//
// Take normalized findings (Phase B1 output shape) and bucket them into:
//   - eligible:    can be auto-remediated within budget
//   - escalated:   must be reviewed by a human (high risk, security,
//                  privacy, legal, payments, auth, etc.)
//   - ineligible:  no mapped strategy → log as KNOWN_GAP, no fix attempted
//
// Each finding is annotated in-place with:
//   { remediationEligible, remediationStrategy, remediationComplexity,
//     remediationRisk, remediationReason }
//
// Pure function — no IO, no exceptions. Safe to call any time.

'use strict';

import { REMEDIATION_REGISTRY, categoryToStrategy, STRATEGY } from './remediationRegistry.js';
import { shouldEscalate } from './escalationRegistry.js';

export const BUCKET = Object.freeze({
  ELIGIBLE:   'ELIGIBLE',
  ESCALATE:   'ESCALATE',
  INELIGIBLE: 'INELIGIBLE',
});

/**
 * Decide the bucket for a single finding without mutating it.
 * Returns { bucket, profile, reason }.
 */
export function classifyOne(finding) {
  if (!finding || typeof finding !== 'object') {
    return { bucket: BUCKET.INELIGIBLE, profile: null, reason: 'not_an_object' };
  }
  // Hard escalation guard FIRST — security/privacy/legal/auth always wins.
  const guard = shouldEscalate(finding);
  if (guard.escalate) {
    return { bucket: BUCKET.ESCALATE, profile: null, reason: guard.reason };
  }
  const strategyKey = categoryToStrategy(finding.category);
  if (!strategyKey) {
    return { bucket: BUCKET.INELIGIBLE, profile: null, reason: 'no_strategy_for_category' };
  }
  const profile = REMEDIATION_REGISTRY[strategyKey];
  if (!profile) {
    return { bucket: BUCKET.INELIGIBLE, profile: null, reason: 'strategy_not_in_registry' };
  }
  if (profile.autoRemediable !== true || profile.strategy === STRATEGY.FLAG_FOR_HUMAN_REVIEW) {
    return { bucket: BUCKET.ESCALATE, profile, reason: 'profile_marked_non_auto_remediable' };
  }
  if (profile.risk === 'high') {
    return { bucket: BUCKET.ESCALATE, profile, reason: 'profile_risk_high' };
  }
  return { bucket: BUCKET.ELIGIBLE, profile, reason: 'eligible' };
}

/**
 * Classify an entire findings array. Does NOT mutate the input; returns
 * NEW finding objects with classifier metadata appended.
 *
 * @param {Array<object>} findings
 * @returns {{
 *   eligible:   Array<object>,
 *   escalated:  Array<object>,
 *   ineligible: Array<object>,
 *   counts:     { eligible: number, escalated: number, ineligible: number, total: number },
 * }}
 */
export function classifyFindings(findings) {
  const eligible = [];
  const escalated = [];
  const ineligible = [];

  const list = Array.isArray(findings) ? findings : [];
  for (const f of list) {
    const { bucket, profile, reason } = classifyOne(f);
    const annotated = Object.freeze({
      ...f,
      remediationBucket: bucket,
      remediationStrategy: profile?.strategy ?? null,
      remediationComplexity: profile?.complexity ?? null,
      remediationRisk: profile?.risk ?? null,
      remediationEligible: bucket === BUCKET.ELIGIBLE,
      remediationReason: reason,
    });
    if (bucket === BUCKET.ELIGIBLE) eligible.push(annotated);
    else if (bucket === BUCKET.ESCALATE) escalated.push(annotated);
    else ineligible.push(annotated);
  }

  // Stable sort eligible by severity desc, then confidence desc (helps the
  // budget take the highest-value fixes first when truncating).
  const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
  eligible.sort((a, b) => {
    const sa = sevRank[a.severity] ?? 9;
    const sb = sevRank[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  return {
    eligible,
    escalated,
    ineligible,
    counts: {
      eligible:   eligible.length,
      escalated:  escalated.length,
      ineligible: ineligible.length,
      total:      list.length,
    },
  };
}
