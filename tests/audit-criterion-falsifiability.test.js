// W3 — Universal anti-false-green guard (Slot 1).
//
// For every non-deferred criterion evaluator, asserts:
//   1. Empty/missing-evidence ctx returns null (NOT 100, NOT 0).
//   2. The evaluator is structurally falsifiable — a stub returning a constant
//      100 would FAIL the test in audit-criteria-redgreen.test.js (which is
//      the operational red-fixture coverage). This file asserts the contract
//      shape so any future stub-replacement regresses cleanly.

import { describe, it, expect } from 'vitest';
import { loadRubric, loadEvaluators } from '../src/lib/audits/rubricRunner.js';

const target = { type: 'agent', id: 11 };

function emptyCtx() {
  return {
    auditLog:      { query: async () => [] },
    messageBus:    { query: async () => [], listTopics: async () => [], getTopicHealth: async () => ({ exists: false }) },
    registry:      { getActiveAgents: async () => [], getCharter: async () => null, getSchemaFor: async () => null, validatePayload: () => true },
    auditChain:    { verifyRange: async () => ({ ok: true, breaks: [] }) },
    errorLog:      { query: async () => [] },
    baseAgentRuns: { query: async () => [] },
    clock:         { now: () => 1715000000000 },
    windowMs:      86400000,
    env:           { mode: 'prod' },
  };
}

describe('criterion_must_be_falsifiable — governance.v1', () => {
  it('every governance.v1 evaluator returns null (not 100) on empty ctx', async () => {
    const rubric = loadRubric('governance.v1');
    const evs = await loadEvaluators('governance.v1');
    for (const c of rubric.criteria) {
      const r = await evs[c.id](target, emptyCtx());
      expect(r.id).toBe(c.id);
      expect(r.score, `${c.id} returned numeric score on empty ctx — false-green risk`).toBeNull();
      expect(r.status === 'no_evidence' || r.status === 'deferred',
        `${c.id} returned unexpected status "${r.status}"`).toBe(true);
      expect(typeof r.notes).toBe('string');
      expect(Array.isArray(r.evidence)).toBe(true);
      expect(r.evidence.length).toBeGreaterThan(0);
    }
  });
});

describe('criterion_must_be_falsifiable — readiness.v1', () => {
  it('every readiness.v1 evaluator returns null (not 100) on empty ctx', async () => {
    const rubric = loadRubric('readiness.v1');
    const evs = await loadEvaluators('readiness.v1');
    for (const c of rubric.criteria) {
      const r = await evs[c.id](target, emptyCtx());
      expect(r.id).toBe(c.id);
      expect(r.score, `${c.id} returned numeric score on empty ctx — false-green risk`).toBeNull();
      expect(r.status === 'no_evidence' || r.status === 'deferred',
        `${c.id} returned unexpected status "${r.status}"`).toBe(true);
    }
  });
});

describe('criterion_must_be_falsifiable — never returns 100 without evidence', () => {
  it('no evaluator emits score=100 from empty ctx in either rubric', async () => {
    for (const version of ['governance.v1', 'readiness.v1', 'governance.meta.v1', 'readiness.meta.v1']) {
      const rubric = loadRubric(version);
      const evs = await loadEvaluators(version);
      for (const c of rubric.criteria) {
        const r = await evs[c.id](target, emptyCtx());
        if (r.score === 100) {
          throw new Error(`Evaluator ${c.id} (rubric ${version}) returned score=100 on empty ctx. This is the false-green failure mode the panel was convened to eliminate.`);
        }
      }
    }
  });
});
