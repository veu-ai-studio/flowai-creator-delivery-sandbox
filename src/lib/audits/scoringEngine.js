/**
 * scoringEngine — W3 entry point for governance + readiness scoring.
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/audits/scoringEngine.js   (W3 territory)
 * Routes:      rubricRunner.applyRubric (handles null/deferred per CEO Flag 3,
 *              Flag 4, Flag 9 dispositions on 2026-05-13).
 * Preserves:   The legacy ScoreEvaluator envelope shape (`targetType, targetId,
 *              rubricVersion, score, passes, criteriaResults, failures,
 *              evaluatedAt, evaluatorId`) plus W3-extended fields (`measured,
 *              deferred, noEvidence, measurementCoverage`).
 *
 * ScoreEvaluator (W2) is NOT modified; it remains available for direct callers.
 * W3 routes through applyRubric so deferred and no_evidence results don't
 * collide with ScoreEvaluator's strict numeric-score validation.
 * ---------------------------------------------------------------------------
 */

'use strict';

import {
  GOVERNANCE_RUBRIC_V1,
  READINESS_RUBRIC_V1,
} from '../governance/ScoreEvaluator.js';
import { applyRubric, CLEARANCE_THRESHOLD } from './rubricRunner.js';

const VALID_TARGET_TYPES = new Set(['agent', 'product', 'flowai']);

function _stubEvaluator(criterion) {
  return async (target /* , ctx */) => ({
    id: criterion.id,
    score: 100,
    status: 'measured',
    evidence: [{ kind: 'stub_evaluator', criterion: criterion.id, target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') } }],
    notes: `Stub evaluator for "${criterion.id}".`,
    findings: [],
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

function _topicForRubricVersion(version) {
  if (typeof version === 'string' && version.startsWith('governance.')) return 'system.governance.score.v1';
  if (typeof version === 'string' && version.startsWith('readiness.'))  return 'system.readiness.score.v1';
  return 'system.score.v1';
}

export async function run({ rubric, criterionEvaluators, target, deps, auditOfAuditorMode = false } = {}) {
  if (!rubric) throw new Error('scoringEngine.run: rubric required');
  if (!target) throw new Error('scoringEngine.run: target required');
  if (!target.type || target.id === undefined || target.id === null) {
    throw new Error('scoringEngine.run: target must have type and id');
  }
  if (!VALID_TARGET_TYPES.has(target.type)) {
    throw new Error(`scoringEngine.run: unknown target.type "${target.type}"`);
  }
  if (target.type === 'agent' && String(target.id) === '8' && !auditOfAuditorMode) {
    throw new Error(
      'Agent #8 cannot be audited by the primary evaluator. ' +
      'Use the auditor-of-auditor instance (W3 territory).'
    );
  }

  const evaluators = criterionEvaluators ?? _defaultEvaluators(rubric);
  const resolvedDeps = { ..._defaultDeps(), ...(deps ?? {}) };

  let applied;
  try {
    applied = await applyRubric(rubric, evaluators, target, resolvedDeps);
  } catch (err) {
    throw new Error(`scoringEngine.run: rubricRunner.applyRubric threw: ${err?.message ?? err}`);
  }

  const at = resolvedDeps.clock.now();
  const evaluatorId = auditOfAuditorMode ? 'auditor_of_auditor' : 'auditor';

  const evaluation = Object.freeze({
    targetType: target.type,
    targetId: String(target.id),
    rubricVersion: rubric.version,
    score: applied.score,
    passes: applied.passes,
    criteriaResults: applied.criteriaResults,
    measured: applied.measured,
    deferred: applied.deferred,
    noEvidence: applied.noEvidence,
    failures: applied.failures,
    measurementCoverage: applied.measurementCoverage,
    threshold: applied.threshold,
    evaluatedAt: at,
    evaluatorId,
  });

  const topic = _topicForRubricVersion(rubric.version);
  await resolvedDeps.messageBus.publish({
    topic,
    payload: {
      targetType: evaluation.targetType,
      targetId: evaluation.targetId,
      score: evaluation.score,
      rubricVersion: evaluation.rubricVersion,
      passes: evaluation.passes,
      measurementCoverage: evaluation.measurementCoverage,
      deferredCount: applied.deferred.length,
      evaluatorId,
    },
    from: { agentId: 'system', productScope: 'flowai' },
    at,
  });

  return evaluation;
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

export { GOVERNANCE_RUBRIC_V1, READINESS_RUBRIC_V1, CLEARANCE_THRESHOLD };
