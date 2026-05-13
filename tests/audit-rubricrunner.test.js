// W3 — rubricRunner unit tests.
//
// Post-2026-05-13 CEO disposition update: evaluators may return numeric
// score, null+no_evidence, or null+deferred. applyRubric normalises over
// measured weight only and reports measurementCoverage.

import { describe, it, expect } from 'vitest';
import {
  loadRubric,
  loadEvaluators,
  applyRubric,
  CLEARANCE_THRESHOLD,
} from '../src/lib/audits/rubricRunner.js';

const fakeTarget = { type: 'agent', id: 11 };

function assertResultShape(result, id) {
  expect(result.id).toBe(id);
  const scoreOk = (typeof result.score === 'number' && result.score >= 0 && result.score <= 100)
                  || result.score === null;
  expect(scoreOk).toBe(true);
  expect(Array.isArray(result.evidence)).toBe(true);
  expect(result.evidence.length).toBeGreaterThan(0);
  expect(typeof result.notes).toBe('string');
}

describe('rubricRunner — loadRubric', () => {
  it('rejects missing version', () => {
    expect(() => loadRubric()).toThrow(/version/);
  });

  it('rejects unknown version', () => {
    expect(() => loadRubric('does.not.exist.v1')).toThrow(/unknown rubric version/);
  });

  it('loads governance.v1 (falls back to W2 canonical when JSON missing)', () => {
    const r = loadRubric('governance.v1');
    expect(r.version).toBe('governance.v1');
    expect(r.criteria.length).toBeGreaterThan(0);
    const total = r.criteria.reduce((s, c) => s + c.weight, 0);
    expect(total).toBe(100);
  });

  it('loads readiness.v1 (falls back to W2 canonical)', () => {
    const r = loadRubric('readiness.v1');
    expect(r.version).toBe('readiness.v1');
  });

  it('loads governance.meta.v1 (meta JSON file)', () => {
    const r = loadRubric('governance.meta.v1');
    expect(r.criteria.length).toBeGreaterThan(0);
  });
});

describe('rubricRunner — loadEvaluators', () => {
  it('returns a map keyed by criterion id', async () => {
    const evs = await loadEvaluators('governance.v1');
    const r = loadRubric('governance.v1');
    for (const c of r.criteria) {
      expect(typeof evs[c.id]).toBe('function');
    }
  });

  it('each evaluator returns the canonical result shape', async () => {
    const evs = await loadEvaluators('readiness.v1');
    const r = loadRubric('readiness.v1');
    for (const c of r.criteria) {
      const result = await evs[c.id](fakeTarget, {});
      assertResultShape(result, c.id);
    }
  });
});

describe('rubricRunner — applyRubric', () => {
  it('rejects missing evaluators map', async () => {
    const r = loadRubric('governance.v1');
    await expect(applyRubric(r)).rejects.toThrow(/evaluators map required/);
  });

  it('rejects when an evaluator is missing for a criterion', async () => {
    const r = loadRubric('governance.v1');
    const evs = {};
    await expect(applyRubric(r, evs, fakeTarget)).rejects.toThrow(/missing evaluator/);
  });

  it('on empty ctx — every measurement evaluator yields no_evidence; score=0; passes=false; measurementCoverage=0', async () => {
    const r = loadRubric('governance.v1');
    const evs = await loadEvaluators('governance.v1');
    const out = await applyRubric(r, evs, fakeTarget, {});
    expect(Object.isFrozen(out)).toBe(true);
    expect(out.score).toBe(0);
    expect(out.passes).toBe(false);
    expect(out.measurementCoverage).toBe(0);
    expect(out.threshold).toBe(CLEARANCE_THRESHOLD);
    expect(out.threshold).toBe(95);
    // gov.ip_protection is on the deferred allowlist; one entry in deferred[]
    const deferredIds = out.deferred.map(d => d.id);
    expect(deferredIds).toContain('gov.ip_protection');
  });

  it('with custom evaluators all scoring 100 — score=100, passes=true, coverage=1.0', async () => {
    const r = loadRubric('governance.v1');
    const evs = {};
    for (const c of r.criteria) {
      evs[c.id] = async () => ({ id: c.id, score: 100, status: 'measured', evidence: [{ kind: 'stub' }], notes: 'green' });
    }
    const out = await applyRubric(r, evs, fakeTarget, {});
    expect(out.score).toBe(100);
    expect(out.passes).toBe(true);
    expect(out.measurementCoverage).toBe(1);
  });

  it('marks passes=false when weighted score < 95 (all measured returning 90)', async () => {
    const r = loadRubric('governance.v1');
    const evs = {};
    for (const c of r.criteria) {
      evs[c.id] = async () => ({ id: c.id, score: 90, status: 'measured', evidence: [{ kind: 'stub' }], notes: 'low' });
    }
    const out = await applyRubric(r, evs, fakeTarget, {});
    expect(out.score).toBe(90);
    expect(out.passes).toBe(false);
    expect(out.measurementCoverage).toBe(1);
  });

  it('deferred evaluators excluded from measured average; measurementCoverage reflects fraction', async () => {
    const r = loadRubric('governance.v1');
    const evs = {};
    for (const c of r.criteria) {
      if (c.id === 'gov.ip_protection') {
        evs[c.id] = async () => ({ id: c.id, score: null, status: 'deferred', reason: 'deferred-pending-X', evidence: [{ kind: 'deferred' }], notes: 'deferred' });
      } else {
        evs[c.id] = async () => ({ id: c.id, score: 100, status: 'measured', evidence: [{ kind: 'stub' }], notes: 'green' });
      }
    }
    const out = await applyRubric(r, evs, fakeTarget, {});
    expect(out.score).toBe(100); // weighted avg over measured only
    expect(out.deferred.length).toBe(1);
    expect(out.measured.length).toBe(6);
    // gov.ip_protection has weight 15 → coverage = 85/100
    expect(out.measurementCoverage).toBe(0.85);
  });
});
