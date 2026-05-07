// W3 — scoringEngine unit tests.

import { describe, it, expect } from 'vitest';
import {
  run,
  runGovernance,
  runReadiness,
  GOVERNANCE_RUBRIC_V1,
  READINESS_RUBRIC_V1,
} from '../src/lib/audits/scoringEngine.js';

const fakeTarget = { type: 'agent', id: 11 };

describe('scoringEngine — exports', () => {
  it('exports run, runGovernance, runReadiness', () => {
    expect(typeof run).toBe('function');
    expect(typeof runGovernance).toBe('function');
    expect(typeof runReadiness).toBe('function');
  });

  it('re-exports both rubrics from W2', () => {
    expect(GOVERNANCE_RUBRIC_V1.version).toBe('governance.v1');
    expect(READINESS_RUBRIC_V1.version).toBe('readiness.v1');
  });
});

describe('scoringEngine — run() with stub evaluators', () => {
  it('rejects calls missing rubric', async () => {
    await expect(run({ target: fakeTarget })).rejects.toThrow(/rubric required/);
  });

  it('rejects calls missing target', async () => {
    await expect(run({ rubric: GOVERNANCE_RUBRIC_V1 })).rejects.toThrow(/target required/);
  });

  it('returns a frozen evaluation with score 100 when default stub evaluators are used', async () => {
    const evalRes = await run({ rubric: GOVERNANCE_RUBRIC_V1, target: fakeTarget });
    expect(Object.isFrozen(evalRes)).toBe(true);
    expect(evalRes.score).toBe(100);
    expect(evalRes.passes).toBe(true);
    expect(evalRes.rubricVersion).toBe('governance.v1');
    expect(evalRes.targetType).toBe('agent');
    expect(evalRes.targetId).toBe('11');
    expect(evalRes.evaluatorId).toBe('auditor');
  });

  it('emits to messageBus on the system.governance.score.v1 topic', async () => {
    const events = [];
    const messageBus = { publish: async (env) => { events.push(env); } };
    await run({ rubric: GOVERNANCE_RUBRIC_V1, target: fakeTarget, deps: { messageBus } });
    expect(events).toHaveLength(1);
    expect(events[0].topic).toBe('system.governance.score.v1');
    expect(events[0].payload.targetType).toBe('agent');
    expect(events[0].payload.score).toBe(100);
  });

  it('honors auditOfAuditorMode by setting evaluatorId to "auditor_of_auditor"', async () => {
    const evalRes = await run({
      rubric: GOVERNANCE_RUBRIC_V1,
      target: { type: 'agent', id: 8 },
      auditOfAuditorMode: true,
    });
    expect(evalRes.evaluatorId).toBe('auditor_of_auditor');
  });
});

describe('scoringEngine — runGovernance / runReadiness shorthands', () => {
  it('runGovernance applies GOVERNANCE_RUBRIC_V1', async () => {
    const evalRes = await runGovernance(fakeTarget);
    expect(evalRes.rubricVersion).toBe('governance.v1');
  });

  it('runReadiness applies READINESS_RUBRIC_V1 and emits readiness topic', async () => {
    const events = [];
    const messageBus = { publish: async (env) => { events.push(env); } };
    const evalRes = await runReadiness(fakeTarget, { messageBus });
    expect(evalRes.rubricVersion).toBe('readiness.v1');
    expect(events[0].topic).toBe('system.readiness.score.v1');
  });

  it('accepts custom criterionEvaluators that override the defaults', async () => {
    const customEvaluators = {};
    for (const c of READINESS_RUBRIC_V1.criteria) {
      customEvaluators[c.id] = async () => ({
        id: c.id,
        score: 80,
        evidence: [{ kind: 'custom', for: c.id }],
        notes: 'custom',
      });
    }
    const evalRes = await runReadiness(fakeTarget, {}, customEvaluators);
    expect(evalRes.score).toBe(80);
    expect(evalRes.passes).toBe(false); // 80 < 95
  });
});
