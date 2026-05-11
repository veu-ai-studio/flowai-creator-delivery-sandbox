// W3 — auditOfAuditor unit tests (TDD scaffold turned green).

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_PATH = 'src/lib/audits/auditOfAuditor.js';
const META_RUBRIC_DIR = 'src/lib/audits/rubrics/meta';
const PRIMARY_RUBRIC_DIR = 'src/lib/audits/rubrics/primary';
const PROTOCOL_PATH = 'src/lib/audits/disagreementProtocol.js';

describe('W3 spec — auditOfAuditor', () => {
  it('module file exists at src/lib/audits/auditOfAuditor.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('rubric directory split exists: rubrics/primary/ and rubrics/meta/', () => {
    expect(existsSync(resolve(process.cwd(), META_RUBRIC_DIR))).toBe(true);
    expect(existsSync(resolve(process.cwd(), PRIMARY_RUBRIC_DIR))).toBe(true);
  });

  it('disagreement-protocol module exists', () => {
    expect(existsSync(resolve(process.cwd(), PROTOCOL_PATH))).toBe(true);
  });

  it('exports auditAgent8(deps) — only call site that targets Agent #8', async () => {
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.auditAgent8).toBe('function');
  });

  it('disagreement protocol exports DISAGREEMENT_T = 5 and DISAGREEMENT_T2 = 10', async () => {
    const mod = await import('../' + PROTOCOL_PATH);
    expect(mod.DISAGREEMENT_T).toBe(5);
    expect(mod.DISAGREEMENT_T2).toBe(10);
  });

  it('disagreement protocol exports decideEscalation({t1Score, t2Score, t3Score?}) returning one of NO_ESCALATION | THIRD_RUN | W0_ESCALATION', async () => {
    const mod = await import('../' + PROTOCOL_PATH);
    expect(typeof mod.decideEscalation).toBe('function');
    const r1 = mod.decideEscalation({ t1Score: 95, t2Score: 96 });
    const r2 = mod.decideEscalation({ t1Score: 95, t2Score: 88 });
    const r3 = mod.decideEscalation({ t1Score: 95, t2Score: 80 });
    expect(['NO_ESCALATION', 'THIRD_RUN', 'W0_ESCALATION']).toContain(r1);
    expect(['NO_ESCALATION', 'THIRD_RUN', 'W0_ESCALATION']).toContain(r2);
    expect(['NO_ESCALATION', 'THIRD_RUN', 'W0_ESCALATION']).toContain(r3);
    expect(r1).toBe('NO_ESCALATION');
    expect(r2).toBe('THIRD_RUN');
    expect(r3).toBe('W0_ESCALATION');
  });

  it('auditOfAuditor instantiates ScoreEvaluator with auditOfAuditorMode: true', async () => {
    // The proof is operational: if auditOfAuditorMode were not set true,
    // ScoreEvaluator.evaluate() throws on Agent #8 ("cannot be audited by the
    // primary evaluator"). A successful run is the assertion.
    const mod = await import('../' + MODULE_PATH);
    const events = [];
    const deps = {
      messageBus: { publish: async (env) => { events.push(env); } },
    };
    const result = await mod.auditAgent8(deps);
    expect(result.governance.targetType).toBe('agent');
    expect(result.governance.targetId).toBe('8');
    expect(result.governance.evaluatorId).toBe('auditor_of_auditor');
    expect(result.readiness.evaluatorId).toBe('auditor_of_auditor');
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.map(e => e.topic)).toContain('system.governance.score.v1');
    expect(events.map(e => e.topic)).toContain('system.readiness.score.v1');
  });

  it('auditOfAuditor refuses to evaluate any agent except Agent #8', async () => {
    const mod = await import('../' + MODULE_PATH);
    await expect(mod.auditAnyAgentInMetaMode({}, 11)).rejects.toThrow(/only targets Agent #8/);
    await expect(mod.auditAnyAgentInMetaMode({}, 8)).resolves.toBeTruthy();
  });
});
