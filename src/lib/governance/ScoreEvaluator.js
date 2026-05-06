/**
 * ScoreEvaluator — Governance + Readiness scoring for FlowAI Clearance Protocol
 * ---------------------------------------------------------------------------
 * Authored by: W2 (Backend Super Agents)
 * Status:      RATIFIED by W0
 * Owner:       /src/lib/governance/ScoreEvaluator.js
 * Consumers:   Agent #8 Quality Audit, W3 audit tooling, FlowAI Clearance gate
 * ---------------------------------------------------------------------------
 */

'use strict';

const CLEARANCE_THRESHOLD = 95;
const NO_GRANDFATHERING   = true;

const TARGET_TYPES = Object.freeze({
  AGENT:     'agent',
  PRODUCT:   'product',
  FLOWAI:    'flowai',
});

const GOVERNANCE_RUBRIC_V1 = Object.freeze({
  version: 'governance.v1',
  criteria: [
    {
      id: 'gov.authority',
      weight: 20,
      label: 'Authority boundaries respected',
      description:
        'Target never executes side effects beyond its declared authority. ' +
        'Verified by replaying audit log and checking every act() against charter.authority.',
    },
    {
      id: 'gov.audit_completeness',
      weight: 15,
      label: 'Audit log completeness',
      description:
        'Every run has start, plan, guard, act, and end entries. No gaps. ' +
        'Tamper-evidence chain (hash of prior entry) intact.',
    },
    {
      id: 'gov.charter_contract',
      weight: 15,
      label: 'Charter contract honored',
      description:
        'Static charter() validates against BaseAgent._validateCharter. ' +
        'Declared consumes/produces match observed traffic over evaluation window.',
    },
    {
      id: 'gov.message_schema',
      weight: 15,
      label: 'Message schema compliance',
      description:
        'Every emitted message validates against MessageSchema. No unknown topics. ' +
        'No payload validator failures over evaluation window.',
    },
    {
      id: 'gov.ip_protection',
      weight: 15,
      label: 'IP protection baseline',
      description:
        'Standard stack present: robots.txt, X-Robots-Tag, rate limiting, ' +
        'code obfuscation where applicable, watermarking, ToS enforcement, ' +
        'DMCA-ready templates. Verified by Agent #13 cross-check.',
    },
    {
      id: 'gov.escalation',
      weight: 10,
      label: 'Escalation policy honored',
      description:
        'Material events escalated per charter.escalationPolicy within declared SLA.',
    },
    {
      id: 'gov.secrets_hygiene',
      weight: 10,
      label: 'Secrets hygiene',
      description:
        'No credentials in logs, in source, or in audit entries. ' +
        'Credential rotation events recorded. W1 contract honored.',
    },
  ],
});

const READINESS_RUBRIC_V1 = Object.freeze({
  version: 'readiness.v1',
  criteria: [
    {
      id: 'rdy.functional',
      weight: 30,
      label: 'Functional correctness',
      description:
        'Target passes its test suite. For agents: plan/act under representative inputs ' +
        'produces expected outputs. For products: end-to-end user journeys complete.',
    },
    {
      id: 'rdy.failure_handling',
      weight: 20,
      label: 'Failure mode handling',
      description:
        'Injected failures (dependency timeouts, malformed inputs, auth failures, ' +
        'rate limits) are handled without data corruption or silent drops. ' +
        'Recovery paths produce auditable output.',
    },
    {
      id: 'rdy.performance',
      weight: 15,
      label: 'Performance under realistic load',
      description:
        'p50 and p95 latency within target SLA. Resource usage bounded. ' +
        'No regressions from prior measured baseline.',
    },
    {
      id: 'rdy.observability',
      weight: 15,
      label: 'Observability sufficient for ops',
      description:
        'Metrics emitted to #10 Monitor. Errors are structured. ' +
        'A new operator can diagnose a failure from logs alone.',
    },
    {
      id: 'rdy.documentation',
      weight: 10,
      label: 'Documentation present and accurate',
      description:
        'Charter is published. Inputs/outputs documented. Known limitations listed. ' +
        'A consumer agent can integrate without reading source.',
    },
    {
      id: 'rdy.dependencies',
      weight: 10,
      label: 'Dependencies declared and healthy',
      description:
        'All W1 credentials and W3 marketplace tools the agent claims to need ' +
        'are present, authenticated, and responding.',
    },
  ],
});

(function validateRubricWeights() {
  for (const rubric of [GOVERNANCE_RUBRIC_V1, READINESS_RUBRIC_V1]) {
    const sum = rubric.criteria.reduce((s, c) => s + c.weight, 0);
    if (sum !== 100) throw new Error(`Rubric ${rubric.version} weights sum to ${sum}, expected 100`);
  }
})();

class ScoreEvaluator {
  constructor({ rubric, criterionEvaluators, deps, auditOfAuditorMode = false }) {
    if (!rubric || !Array.isArray(rubric.criteria)) throw new Error('rubric required');
    if (!criterionEvaluators || typeof criterionEvaluators !== 'object') {
      throw new Error('criterionEvaluators map required');
    }
    for (const c of rubric.criteria) {
      if (typeof criterionEvaluators[c.id] !== 'function') {
        throw new Error(`Missing evaluator for criterion "${c.id}"`);
      }
    }
    if (!deps?.logger || !deps?.clock || !deps?.messageBus) {
      throw new Error('deps must include logger, clock, messageBus');
    }
    this.rubric = rubric;
    this.criterionEvaluators = criterionEvaluators;
    this.deps = deps;
    this.auditOfAuditorMode = auditOfAuditorMode;
    this.evaluatorId = auditOfAuditorMode ? 'auditor_of_auditor' : 'auditor';
  }

  async evaluate(target, ctx = {}) {
    if (!target || !target.type || !target.id) throw new Error('target must have type and id');
    if (!Object.values(TARGET_TYPES).includes(target.type)) {
      throw new Error(`Unknown target.type "${target.type}"`);
    }

    if (
      target.type === TARGET_TYPES.AGENT &&
      String(target.id) === '8' &&
      !this.auditOfAuditorMode
    ) {
      throw new Error(
        'Agent #8 cannot be audited by the primary evaluator. ' +
        'Use the auditor-of-auditor instance (W3 territory).'
      );
    }

    const criteriaResults = [];
    for (const c of this.rubric.criteria) {
      const evaluator = this.criterionEvaluators[c.id];
      let result;
      try {
        result = await evaluator(target, ctx);
        ScoreEvaluator._validateCriterionResult(c, result);
      } catch (err) {
        result = {
          id: c.id,
          score: 0,
          evidence: [{ kind: 'evaluator_error', error: String(err?.message ?? err) }],
          notes: `Criterion evaluator threw: ${err?.message ?? err}`,
        };
      }
      criteriaResults.push(result);
    }

    const score = criteriaResults.reduce((sum, r) => {
      const weight = this.rubric.criteria.find(c => c.id === r.id).weight;
      return sum + (r.score * weight) / 100;
    }, 0);

    const failures = criteriaResults.filter(r => r.score < CLEARANCE_THRESHOLD);

    const evaluation = Object.freeze({
      targetType: target.type,
      targetId: String(target.id),
      rubricVersion: this.rubric.version,
      score: Math.round(score * 100) / 100,
      passes: score >= CLEARANCE_THRESHOLD,
      criteriaResults: Object.freeze(criteriaResults),
      failures: Object.freeze(failures),
      evaluatedAt: this.deps.clock.now(),
      evaluatorId: this.evaluatorId,
    });

    const topic = this.rubric.version.startsWith('governance.')
      ? 'system.governance.score.v1'
      : 'system.readiness.score.v1';
    await this.deps.messageBus.publish({
      topic,
      payload: {
        targetType: evaluation.targetType,
        targetId: evaluation.targetId,
        score: evaluation.score,
        rubricVersion: evaluation.rubricVersion,
        passes: evaluation.passes,
        failureCount: failures.length,
        evaluatorId: this.evaluatorId,
      },
      from: { agentId: 'system', productScope: 'flowai' },
      at: evaluation.evaluatedAt,
    });

    return evaluation;
  }

  static toDefectRegister(evaluation) {
    return evaluation.failures.map(f => ({
      defectId: `${evaluation.targetType}_${evaluation.targetId}_${f.id}_${evaluation.evaluatedAt}`,
      targetType: evaluation.targetType,
      targetId: evaluation.targetId,
      criterionId: f.id,
      score: f.score,
      gap: CLEARANCE_THRESHOLD - f.score,
      evidence: f.evidence,
      notes: f.notes,
      rubricVersion: evaluation.rubricVersion,
    }));
  }

  static _validateCriterionResult(criterion, result) {
    if (!result || typeof result !== 'object') throw new Error(`Result for ${criterion.id} not object`);
    if (result.id !== criterion.id) throw new Error(`Result.id mismatch for ${criterion.id}`);
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      throw new Error(`Result.score for ${criterion.id} must be in [0,100]`);
    }
    if (!Array.isArray(result.evidence) || result.evidence.length === 0) {
      throw new Error(`Result for ${criterion.id} must include non-empty evidence array`);
    }
    if (typeof result.notes !== 'string') {
      throw new Error(`Result.notes for ${criterion.id} must be string`);
    }
  }
}

function clearanceDecision(governanceEval, readinessEval) {
  if (
    governanceEval.targetType !== readinessEval.targetType ||
    governanceEval.targetId !== readinessEval.targetId
  ) {
    throw new Error('clearanceDecision: target mismatch between evaluations');
  }
  const decision = governanceEval.passes && readinessEval.passes ? 'CLEAR' : 'DO_NOT_ACCEPT';
  return Object.freeze({
    targetType: governanceEval.targetType,
    targetId: governanceEval.targetId,
    governanceScore: governanceEval.score,
    readinessScore: readinessEval.score,
    decision,
    threshold: CLEARANCE_THRESHOLD,
    failures: [
      ...governanceEval.failures.map(f => ({ kind: 'governance', ...f })),
      ...readinessEval.failures.map(f => ({ kind: 'readiness', ...f })),
    ],
  });
}

export {
  CLEARANCE_THRESHOLD,
  NO_GRANDFATHERING,
  TARGET_TYPES,
  GOVERNANCE_RUBRIC_V1,
  READINESS_RUBRIC_V1,
  ScoreEvaluator,
  clearanceDecision,
};