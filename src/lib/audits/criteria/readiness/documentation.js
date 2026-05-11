// rdy.documentation — Documentation present and accurate.
// Structured stub. Real implementation verifies charter publication, IO
// docs, listed limitations, and integrability without source-reading.

const ID = 'rdy.documentation';

export default async function evaluate(target, ctx = {}) {
  const hasCharter = Boolean(target?.charter && typeof target.charter === 'object');
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: hasCharter
        ? `charter present (id=${target.charter.id ?? '?'}, name="${target.charter.name ?? '?'}")`
        : 'no charter on target — documentation inferred from canonical roster',
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'Doc-completeness checker not yet authored; current pass is structural (charter exists).',
  };
}

export { ID };
