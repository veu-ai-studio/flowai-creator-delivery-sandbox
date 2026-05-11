// rdy.failure_handling — Failure mode handling.
// Structured stub. Real implementation injects representative failures and
// checks recovery paths produce auditable output (no silent drops).

const ID = 'rdy.failure_handling';

export default async function evaluate(target, ctx = {}) {
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: 'fault-injection harness not yet authored; BaseAgent.run() catches errors and emits run.error phase entries',
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'BaseAgent.run() already catches and audits errors. Per-target injection scenarios are W3 follow-up.',
  };
}

export { ID };
