// W3 — rubricRunner unit tests.

import { describe, it, expect } from 'vitest';
import {
  loadRubric,
  loadEvaluators,
  applyRubric,
  CLEARANCE_THRESHOLD,
} from '../src/lib/audits/rubricRunner.js';

const fakeTarget = { type: 'agent', id: 11 };

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

  it('loads governance.meta.v1 (alias to governance.v1 until meta JSON ships)', () => {
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
      const result = await evs[c.id](fakeTarget);
      expect(result.id).toBe(c.id);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.evidence)).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(typeof result.notes).toBe('string');
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

  it('produces a frozen { score, passes, threshold } shape', async () => {
    const r = loadRubric('governance.v1');
    const evs = await loadEvaluators('governance.v1');
    const out = await applyRubric(r, evs, fakeTarget);
    expect(Object.isFrozen(out)).toBe(true);
    expect(out.score).toBe(100);
    expect(out.passes).toBe(true);
    expect(out.threshold).toBe(CLEARANCE_THRESHOLD);
    expect(out.threshold).toBe(95);
  });

  it('marks passes=false when weighted score < 95', async () => {
    const r = loadRubric('governance.v1');
    const evs = {};
    for (const c of r.criteria) {
      evs[c.id] = async () => ({ id: c.id, score: 90, evidence: [{ kind: 'stub' }], notes: 'low' });
    }
    const out = await applyRubric(r, evs, fakeTarget);
    expect(out.score).toBe(90);
    expect(out.passes).toBe(false);
  });
});
