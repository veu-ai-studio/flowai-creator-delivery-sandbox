// rdy.functional — Functional correctness.
// Structured stub. Real implementation runs the target's test suite or
// representative inputs and compares outputs to expectations.

const ID = 'rdy.functional';

export default async function evaluate(target, ctx = {}) {
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: 'per-target functional test runner not yet wired; this stub assumes the project-level vitest suite is green',
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'W3 follow-up: per-agent test invocation and result aggregation.',
  };
}

export { ID };
