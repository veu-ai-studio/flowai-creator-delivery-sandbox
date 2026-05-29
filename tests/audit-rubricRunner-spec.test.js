// W3 — rubricRunner unit tests (TDD scaffold turned green).
//
// Post-2026-05-13 CEO disposition update: each evaluator now returns one of:
//   - { id, score: number 0..100, status: 'measured', ... }   (measured)
//   - { id, score: null, status: 'no_evidence', reason: ... } (data sources
//     reachable but empty window)
//   - { id, score: null, status: 'deferred', reason: ... }    (blocked by
//     external dep; on w3/deferred-evaluators.json allowlist)
//
// The shape contract below accepts any of those.

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

function assertContractShape(result, id) {
  expect(result.id).toBe(id);
  const scoreOk = (typeof result.score === 'number' && result.score >= 0 && result.score <= 100)
                  || result.score === null;
  expect(scoreOk, `${id} returned malformed score: ${result.score}`).toBe(true);
  if (result.score === null) {
    expect(['no_evidence', 'deferred']).toContain(result.status);
  } else {
    expect(result.status === undefined || result.status === 'measured').toBe(true);
  }
  expect(Array.isArray(result.evidence)).toBe(true);
  expect(result.evidence.length).toBeGreaterThan(0);
  expect(typeof result.notes).toBe('string');
}

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
    const result = await evs[id](fakeTarget, {});
    assertContractShape(result, id);
  });

  it.each(REQUIRED_READINESS_IDS)('readiness.v1 evaluator exists for criterion %s', async (id) => {
    const mod = await import('../' + MODULE_PATH);
    const evs = await mod.loadEvaluators('readiness.v1');
    expect(typeof evs[id]).toBe('function');
    const result = await evs[id](fakeTarget, {});
    assertContractShape(result, id);
  });

  it('every evaluator returns the canonical shape { id, score|null, evidence:non-empty[], notes:string }', async () => {
    const mod = await import('../' + MODULE_PATH);
    for (const version of ['governance.v1', 'readiness.v1', 'governance.meta.v1', 'readiness.meta.v1']) {
      const evs = await mod.loadEvaluators(version);
      for (const [id, fn] of Object.entries(evs)) {
        const result = await fn(fakeTarget, {});
        assertContractShape(result, id);
      }
    }
  });
});
