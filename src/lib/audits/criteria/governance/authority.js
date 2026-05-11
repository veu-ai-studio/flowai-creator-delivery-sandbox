// gov.authority — Authority boundaries respected.
// Structured stub per W3 Part 3 build (2026-05-11). Real implementation
// replays the audit log and checks every act() against charter.authority.

const ID = 'gov.authority';

export default async function evaluate(target, ctx = {}) {
  const targetRef = { type: target?.type ?? 'unknown', id: String(target?.id ?? '') };
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: 'no audit-log replay yet; authority guard validated statically by BaseAgent.guard()',
      target: targetRef,
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'Authority replay against BaseAgent.guard() is the W3 follow-up. Static guard already enforced in BaseAgent.run().',
  };
}

export { ID };
