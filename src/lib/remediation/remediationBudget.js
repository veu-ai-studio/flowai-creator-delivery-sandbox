// src/lib/remediation/remediationBudget.js — PHASE B2 STEP 3
//
// Enforce caps on auto-remediation per run. Excess eligible findings are
// DEFERRED (returned in a separate bucket so the orchestrator can queue
// them for the next iteration) — never silently dropped.
//
// Caps (defaults; overridable via opts):
//   maxAutoFixesPerRun      = 25
//   maxMediumRiskFixes      =  5  (subset of maxAutoFixesPerRun)
//   maxCSSMutationsPerFile  =  3  (per individual file path)
//
// Pure function — no IO. Caller emits the budget_applied SSE.

'use strict';

export const DEFAULT_BUDGETS = Object.freeze({
  maxAutoFixesPerRun: 25,
  maxMediumRiskFixes: 5,
  maxCSSMutationsPerFile: 3,
});

const CSS_STRATEGIES = Object.freeze(new Set([
  'css-contrast-adjust',
  'css-size-adjustment',
]));

/**
 * Apply budget rules to a classifier's eligible[] output.
 *
 * @param {Array<object>} eligibleFindings  — classifier eligible bucket
 * @param {object} [budgets]                — override DEFAULT_BUDGETS
 * @returns {{
 *   withinBudget: Array<object>,
 *   deferred:     Array<object>,
 *   appliedCaps:  object,
 *   counts:       { withinBudget: number, deferred: number },
 * }}
 */
export function applyBudget(eligibleFindings, budgets = {}) {
  const caps = { ...DEFAULT_BUDGETS, ...budgets };
  const list = Array.isArray(eligibleFindings) ? eligibleFindings : [];

  const withinBudget = [];
  const deferred = [];
  const cssMutationsByFile = new Map();
  let mediumRiskUsed = 0;

  for (const f of list) {
    if (withinBudget.length >= caps.maxAutoFixesPerRun) {
      deferred.push(annotate(f, 'deferred_max_auto_fixes'));
      continue;
    }
    if (f.remediationRisk === 'medium' && mediumRiskUsed >= caps.maxMediumRiskFixes) {
      deferred.push(annotate(f, 'deferred_max_medium_risk'));
      continue;
    }
    if (CSS_STRATEGIES.has(f.remediationStrategy)) {
      // Bucket by the LOCATION's file-ish key. For DOM-based findings the
      // location is a URL+selector; we coarsen to the URL so cross-page
      // CSS edits each get their own bucket but multiple selectors on
      // the SAME page share one bucket. Conservative.
      const fileKey = String(f.location ?? '').split('#')[0] || 'unknown';
      const used = cssMutationsByFile.get(fileKey) ?? 0;
      if (used >= caps.maxCSSMutationsPerFile) {
        deferred.push(annotate(f, 'deferred_max_css_per_file'));
        continue;
      }
      cssMutationsByFile.set(fileKey, used + 1);
    }
    if (f.remediationRisk === 'medium') mediumRiskUsed += 1;
    withinBudget.push(f);
  }

  return {
    withinBudget,
    deferred,
    appliedCaps: caps,
    counts: { withinBudget: withinBudget.length, deferred: deferred.length },
  };
}

function annotate(finding, reason) {
  return Object.freeze({ ...finding, deferralReason: reason });
}
