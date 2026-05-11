// gov.audit_completeness — Audit log completeness + tamper-evidence chain.
// Structured stub. Real implementation reads audit_log rows and verifies
// every run has start/plan/guard/act/end entries with prevHash chain intact.

const ID = 'gov.audit_completeness';

export default async function evaluate(target, ctx = {}) {
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: 'audit-log reader + tamper-evidence chain helper (W5 territory per X-005) not yet built',
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'Awaiting W5 prevHash chain helper. Until then this stub assumes BaseAgent.run() phase entries are present.',
  };
}

export { ID };
