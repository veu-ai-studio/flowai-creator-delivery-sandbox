// W3 — rubricRunner unit tests (TDD scaffold turned green).

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_PATH = 'src/lib/audits/rubricRunner.js';

const REQUIRED_GOVERNANCE_IDS = [
  'gov.authority',
  'gov.audit_completeness',
  'gov.charter_contract',
  'gov.message_schema',
  'gov.ip_protection',
  'gov.escalation',
  'gov.secrets_hygiene',
];

const REQUIRED_READINESS_IDS = [
  'rdy.functional',
  'rdy.failure_handling',
  'rdy.performance',
  'rdy.observability',
  'rdy.documentation',
  'rdy.dependencies',
];

const fakeTarget = { type: 'agent', id: 11 };

describe('W3 spec — rubricRunner', () => {
  it('module file exists at src/lib/audits/rubricRunner.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('exports loadRubric(version) returning the rubric object', async () => {
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.loadRubric).toBe('function');
    const r = mod.loadRubric('governance.v1');
    expect(r.version).toBe('governance.v1');
  });

  it('exports loadEvaluators(version) returning a map keyed by criterion id', async () => {
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.loadEvaluators).toBe('function');
    const evs = await mod.loadEvaluators('governance.v1');
    expect(typeof evs).toBe('object');
    expect(Object.keys(evs).length).toBeGreaterThan(0);
  });

  it.each(REQUIRED_GOVERNANCE_IDS)('governance.v1 evaluator exists for criterion %s', async (id) => {
    const mod = await import('../' + MODULE_PATH);
    const evs = await mod.loadEvaluators('governance.v1');
    expect(typeof evs[id]).toBe('function');
    const result = await evs[id](fakeTarget);
    expect(result.id).toBe(id);
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(typeof result.notes).toBe('string');
  });

  it.each(REQUIRED_READINESS_IDS)('readiness.v1 evaluator exists for criterion %s', async (id) => {
    const mod = await import('../' + MODULE_PATH);
    const evs = await mod.loadEvaluators('readiness.v1');
    expect(typeof evs[id]).toBe('function');
    const result = await evs[id](fakeTarget);
    expect(result.id).toBe(id);
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(typeof result.notes).toBe('string');
  });

  it('every evaluator returns { id, score:0..100, evidence:non-empty[], notes:string }', async () => {
    const mod = await import('../' + MODULE_PATH);
    for (const version of ['governance.v1', 'readiness.v1', 'governance.meta.v1', 'readiness.meta.v1']) {
      const evs = await mod.loadEvaluators(version);
      for (const [id, fn] of Object.entries(evs)) {
        const result = await fn(fakeTarget);
        expect(result.id).toBe(id);
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(Array.isArray(result.evidence)).toBe(true);
        expect(result.evidence.length).toBeGreaterThan(0);
        expect(typeof result.notes).toBe('string');
      }
    }
  });
});
