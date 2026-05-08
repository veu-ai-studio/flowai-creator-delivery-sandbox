import { describe, it, expect } from 'vitest';
import {
  CLEARANCE_THRESHOLD,
  TARGET_TYPES,
  GOVERNANCE_RUBRIC_V1,
  READINESS_RUBRIC_V1,
  ScoreEvaluator,
  clearanceDecision,
} from '../src/lib/governance/ScoreEvaluator.js';

function makeStubDeps() {
  const published = [];
  const logged = [];
  return {
    published,
    logged,
    deps: {
      logger: { info: (...a) => logged.push(['info', ...a]), error: (...a) => logged.push(['error', ...a]) },
      clock: { now: () => 1700000000000 },
      messageBus: { publish: async (msg) => { published.push(msg); } },
    },
  };
}

function evaluatorsForRubric(rubric, score) {
  const map = {};
  for (const c of rubric.criteria) {
    map[c.id] = async () => ({
      id: c.id,
      score,
      evidence: [{ kind: 'stub', detail: 'test' }],
      notes: `criterion ${c.id} stubbed at ${score}`,
    });
  }
  return map;
}

describe('ScoreEvaluator construction', () => {
  it('rejects missing rubric', () => {
    const { deps } = makeStubDeps();
    expect(() => new ScoreEvaluator({
      criterionEvaluators: {}, deps,
    })).toThrow(/rubric required/);
  });

  it('rejects when an evaluator is missing for a criterion', () => {
    const { deps } = makeStubDeps();
    const evals = evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100);
    delete evals['gov.authority'];
    expect(() => new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1, criterionEvaluators: evals, deps,
    })).toThrow(/Missing evaluator for criterion "gov.authority"/);
  });

  it('rejects when deps are missing logger/clock/messageBus', () => {
    expect(() => new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps: { logger: console },
    })).toThrow(/deps must include logger, clock, messageBus/);
  });

  it('sets evaluatorId based on auditOfAuditorMode flag', () => {
    const { deps } = makeStubDeps();
    const primary = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
    });
    const auditor = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
      auditOfAuditorMode: true,
    });
    expect(primary.evaluatorId).toBe('auditor');
    expect(auditor.evaluatorId).toBe('auditor_of_auditor');
  });
});

describe('ScoreEvaluator governance scoring', () => {
  it('produces a perfect 100 when all criteria score 100', async () => {
    const { deps, published } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.AGENT, id: '7' });
    expect(evaluation.score).toBe(100);
    expect(evaluation.passes).toBe(true);
    expect(evaluation.failures.length).toBe(0);
    expect(evaluation.rubricVersion).toBe('governance.v1');
    expect(published[0].topic).toBe('system.governance.score.v1');
    expect(published[0].payload.targetId).toBe('7');
    expect(published[0].payload.passes).toBe(true);
  });

  it('weighted average matches a known partial-score scenario', async () => {
    const { deps } = makeStubDeps();
    const evals = evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 50);
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1, criterionEvaluators: evals, deps,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.AGENT, id: '7' });
    expect(evaluation.score).toBe(50);
    expect(evaluation.passes).toBe(false);
  });
});

describe('ScoreEvaluator readiness scoring', () => {
  it('produces a perfect 100 when all readiness criteria score 100', async () => {
    const { deps, published } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: READINESS_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(READINESS_RUBRIC_V1, 100),
      deps,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.PRODUCT, id: 'flowai' });
    expect(evaluation.score).toBe(100);
    expect(evaluation.passes).toBe(true);
    expect(evaluation.rubricVersion).toBe('readiness.v1');
    expect(published[0].topic).toBe('system.readiness.score.v1');
  });

  it('flags every criterion under threshold as a failure', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: READINESS_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(READINESS_RUBRIC_V1, 80),
      deps,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.PRODUCT, id: 'flowai' });
    expect(evaluation.failures.length).toBe(READINESS_RUBRIC_V1.criteria.length);
    expect(evaluation.passes).toBe(false);
  });
});

describe('ScoreEvaluator 95/95 threshold enforcement', () => {
  it('CLEARANCE_THRESHOLD is 95', () => {
    expect(CLEARANCE_THRESHOLD).toBe(95);
  });

  it('passes=true exactly at the threshold (score === 95)', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 95),
      deps,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.AGENT, id: '7' });
    expect(evaluation.score).toBe(95);
    expect(evaluation.passes).toBe(true);
  });

  it('passes=false just below threshold (score === 94.99)', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 94.99),
      deps,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.AGENT, id: '7' });
    expect(evaluation.score).toBeLessThan(95);
    expect(evaluation.passes).toBe(false);
  });

  it('clearanceDecision returns CLEAR only when both governance and readiness pass', () => {
    const passEval = (rubric) => Object.freeze({
      targetType: 'agent', targetId: '7', rubricVersion: rubric,
      score: 99, passes: true, criteriaResults: [], failures: [],
      evaluatedAt: 1, evaluatorId: 'auditor',
    });
    const failEval = (rubric) => Object.freeze({
      targetType: 'agent', targetId: '7', rubricVersion: rubric,
      score: 90, passes: false, criteriaResults: [], failures: [],
      evaluatedAt: 1, evaluatorId: 'auditor',
    });

    expect(clearanceDecision(passEval('governance.v1'), passEval('readiness.v1')).decision)
      .toBe('CLEAR');
    expect(clearanceDecision(failEval('governance.v1'), passEval('readiness.v1')).decision)
      .toBe('DO_NOT_ACCEPT');
    expect(clearanceDecision(passEval('governance.v1'), failEval('readiness.v1')).decision)
      .toBe('DO_NOT_ACCEPT');
    expect(clearanceDecision(failEval('governance.v1'), failEval('readiness.v1')).decision)
      .toBe('DO_NOT_ACCEPT');
  });

  it('clearanceDecision throws on target mismatch', () => {
    const a = Object.freeze({
      targetType: 'agent', targetId: '7', score: 99, passes: true, failures: [], rubricVersion: 'governance.v1',
    });
    const b = Object.freeze({
      targetType: 'agent', targetId: '9', score: 99, passes: true, failures: [], rubricVersion: 'readiness.v1',
    });
    expect(() => clearanceDecision(a, b)).toThrow(/target mismatch/);
  });
});

describe('ScoreEvaluator audit-of-the-auditor mode', () => {
  it('throws when target=Agent #8 without auditOfAuditorMode flag', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
    });
    await expect(sut.evaluate({ type: TARGET_TYPES.AGENT, id: '8' }))
      .rejects.toThrow(/Agent #8 cannot be audited by the primary evaluator/);
  });

  it('throws when target=Agent #8 with id passed as numeric 8', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
    });
    await expect(sut.evaluate({ type: TARGET_TYPES.AGENT, id: 8 }))
      .rejects.toThrow(/Agent #8 cannot be audited/);
  });

  it('allows target=Agent #8 when auditOfAuditorMode flag is set', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
      auditOfAuditorMode: true,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.AGENT, id: '8' });
    expect(evaluation.targetId).toBe('8');
    expect(evaluation.evaluatorId).toBe('auditor_of_auditor');
    expect(evaluation.passes).toBe(true);
  });

  it('still allows other agent IDs without the flag', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.AGENT, id: '7' });
    expect(evaluation.passes).toBe(true);
  });
});

describe('ScoreEvaluator target validation', () => {
  it('rejects target without type or id', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
    });
    await expect(sut.evaluate({})).rejects.toThrow(/target must have type and id/);
    await expect(sut.evaluate({ type: 'agent' })).rejects.toThrow(/target must have type and id/);
  });

  it('rejects target with unknown type', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 100),
      deps,
    });
    await expect(sut.evaluate({ type: 'galaxy', id: '1' }))
      .rejects.toThrow(/Unknown target.type/);
  });
});

describe('ScoreEvaluator.toDefectRegister', () => {
  it('converts failures into defect register rows', async () => {
    const { deps } = makeStubDeps();
    const sut = new ScoreEvaluator({
      rubric: GOVERNANCE_RUBRIC_V1,
      criterionEvaluators: evaluatorsForRubric(GOVERNANCE_RUBRIC_V1, 80),
      deps,
    });
    const evaluation = await sut.evaluate({ type: TARGET_TYPES.AGENT, id: '7' });
    const defects = ScoreEvaluator.toDefectRegister(evaluation);
    expect(defects.length).toBe(GOVERNANCE_RUBRIC_V1.criteria.length);
    expect(defects[0].targetId).toBe('7');
    expect(defects[0].gap).toBe(CLEARANCE_THRESHOLD - 80);
    expect(typeof defects[0].defectId).toBe('string');
  });
});
