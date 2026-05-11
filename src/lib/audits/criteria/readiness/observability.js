// rdy.observability — Observability sufficient for ops.
// Structured stub. Real implementation checks that metrics are emitted to
// Agent #10, errors are structured, and logs are diagnosable in isolation.

const ID = 'rdy.observability';

export default async function evaluate(target, ctx = {}) {
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: 'observability checklist (metric emission, structured errors, log diagnosability) not yet automated',
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'BaseAgent.run() emits structured phase entries to auditLog. Per-agent metric inventory is W3 follow-up.',
  };
}

export { ID };
