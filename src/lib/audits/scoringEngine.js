/**
 * scoringEngine — W3 thin wrapper around the W2 ScoreEvaluator.
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/audits/scoringEngine.js   (W3 territory)
 * Wraps:       /src/lib/governance/ScoreEvaluator.js (W2; not modified)
 * Purpose:     Stable W3-side entry point so consumers don't import W2 directly.
 *              Stub implementation: takes an explicit rubric + criterionEvaluators
 *              + target + deps, returns the frozen evaluation object the
 *              ScoreEvaluator produces. Default neutral evaluators are provided
 *              for runGovernance / runReadiness so the wrapper is callable
 *              before the per-criterion evaluators (Wave 2 work) are authored.
 * ---------------------------------------------------------------------------
 */

'use strict';

import {
  ScoreEvaluator,
  GOVERNANCE_RUBRIC_V1,
  READINESS_RUBRIC_V1,
} from '../governance/ScoreEvaluator.js';

function _stubEvaluator(criterion) {
  return async (target /* , ctx */) => ({
    id: criterion.id,
    score: 100,
    evidence: [{ kind: 'stub_evaluator', criterion: criterion.id, target: { type: target.type, id: String(target.id) } }],
    notes: `Stub evaluator for "${criterion.id}". Replace with W3 implementation.`,
  });
}

function _defaultEvaluators(rubric) {
  const map = {};
  for (const c of rubric.criteria) map[c.id] = _stubEvaluator(c);
  return map;
}

function _defaultDeps() {
  return {
    logger: typeof console !== 'undefined' ? console : { info() {}, warn() {}, error() {} },
    clock: { now: () => Date.now() },
    messageBus: { publish: async () => {} },
  };
}

export async function run({ rubric, criterionEvaluators, target, deps, auditOfAuditorMode = false } = {}) {
  if (!rubric) throw new Error('scoringEngine.run: rubric required');
  if (!target) throw new Error('scoringEngine.run: target required');
  const evaluators = criterionEvaluators ?? _defaultEvaluators(rubric);
  const resolvedDeps = { ..._defaultDeps(), ...(deps ?? {}) };
  const evaluator = new ScoreEvaluator({
    rubric,
    criterionEvaluators: evaluators,
    deps: resolvedDeps,
    auditOfAuditorMode,
  });
  return evaluator.evaluate(target);
}

export async function runGovernance(target, deps = {}, criterionEvaluators = null) {
  return run({
    rubric: GOVERNANCE_RUBRIC_V1,
    criterionEvaluators,
    target,
    deps,
  });
}

export async function runReadiness(target, deps = {}, criterionEvaluators = null) {
  return run({
    rubric: READINESS_RUBRIC_V1,
    criterionEvaluators,
    target,
    deps,
  });
}

export { GOVERNANCE_RUBRIC_V1, READINESS_RUBRIC_V1 };
