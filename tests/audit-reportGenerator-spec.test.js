// W3 — reportGenerator unit tests (TDD scaffold turned green).

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateClearanceReport } from '../src/lib/audits/reportGenerator.js';

const MODULE_PATH = 'src/lib/audits/reportGenerator.js';

function makeEval({ rubricVersion, score, failures = [] }) {
  return Object.freeze({
    targetType: 'agent',
    targetId: '11',
    rubricVersion,
    score,
    passes: score >= 95,
    criteriaResults: Object.freeze([]),
    failures: Object.freeze(failures),
    evaluatedAt: 1715000000000,
    evaluatorId: 'auditor',
  });
}

describe('W3 spec — reportGenerator', () => {
  it('module file exists at src/lib/audits/reportGenerator.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('exports generateClearanceReport(governanceEval, readinessEval, deps)', async () => {
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.generateClearanceReport).toBe('function');
  });

  it('publishes system.clearance.decision.v1 envelope with decision in {CLEAR, DO_NOT_ACCEPT}', async () => {
    const events = [];
    const messageBus = { publish: async (env) => { events.push(env); } };
    const gov = makeEval({ rubricVersion: 'governance.v1', score: 100 });
    const rdy = makeEval({ rubricVersion: 'readiness.v1', score: 100 });
    const result = await generateClearanceReport(gov, rdy, { messageBus });
    expect(events).toHaveLength(1);
    expect(events[0].topic).toBe('system.clearance.decision.v1');
    expect(['CLEAR', 'DO_NOT_ACCEPT']).toContain(events[0].payload.decision);
    expect(events[0].payload.decision).toBe('CLEAR');
    expect(result.decision).toBe('CLEAR');
  });

  it('returns a markdown report containing per-criterion failure breakdown', async () => {
    const gov = makeEval({
      rubricVersion: 'governance.v1',
      score: 90,
      failures: [
        { id: 'gov.authority', score: 80, evidence: [{ kind: 'low' }], notes: 'auth boundary breach' },
        { id: 'gov.escalation', score: 70, evidence: [{ kind: 'late' }], notes: 'escalation delayed' },
      ],
    });
    const rdy = makeEval({ rubricVersion: 'readiness.v1', score: 100 });
    const { markdown, decision } = await generateClearanceReport(gov, rdy);
    expect(decision).toBe('DO_NOT_ACCEPT');
    expect(markdown).toContain('gov.authority');
    expect(markdown).toContain('auth boundary breach');
    expect(markdown).toContain('gov.escalation');
    expect(markdown).toContain('escalation delayed');
  });

  it('includes the literal threshold (95) in the report so downstream readers detect drift', async () => {
    const gov = makeEval({ rubricVersion: 'governance.v1', score: 100 });
    const rdy = makeEval({ rubricVersion: 'readiness.v1', score: 100 });
    const { markdown } = await generateClearanceReport(gov, rdy);
    expect(markdown).toMatch(/Clearance threshold:[^\n]*\b95\b/);
  });
});
