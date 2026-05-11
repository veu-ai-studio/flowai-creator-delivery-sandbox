// rdy.performance — Performance under realistic load.
// Structured stub. Real implementation samples p50/p95 latency from
// Agent #10 Monitor telemetry over an evaluation window.

const ID = 'rdy.performance';

export default async function evaluate(target, ctx = {}) {
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: 'Agent #10 Monitor metric reader not yet built; baseline latency expectations declared in charter (when present)',
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'Latency sampling depends on Agent #10. W3 follow-up consumes 10.metric.v1 envelopes.',
  };
}

export { ID };
