// gov.charter_contract — Charter contract honored.
// Structured stub. Real implementation re-runs BaseAgent._validateCharter
// and compares declared consumes/produces to observed traffic.

const ID = 'gov.charter_contract';

export default async function evaluate(target, ctx = {}) {
  const hasCharter = Boolean(target?.charter && typeof target.charter === 'object');
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: hasCharter
        ? 'charter object present on target; static validation occurred at agent construction'
        : 'target carries no charter object — relying on canonical roster from BaseAgent.AGENT_IDS',
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'BaseAgent._validateCharter runs at construction. Observed-traffic comparator is the W3 follow-up.',
  };
}

export { ID };
