// rdy.dependencies — Dependencies declared and healthy.
// Structured stub per CEO answer on 2026-05-11.
//
// Per X-004 (W1 credentials not yet procured): this evaluator returns 70
// when the target's charter declares requiredCredentials. The score
// auto-rises to 100 when W1 wires the keys and a future probe sweep
// converts the stub to a real CredentialAdapter.probe() call.
//
// When the charter declares no credentials (or no charter is attached),
// the stub returns 100 because there is nothing to probe.

const ID = 'rdy.dependencies';

export default async function evaluate(target, ctx = {}) {
  const requiredCredentials = Array.isArray(target?.charter?.requiredCredentials)
    ? target.charter.requiredCredentials.slice()
    : [];
  const marketplaceTools = Array.isArray(target?.charter?.marketplaceTools)
    ? target.charter.marketplaceTools.slice()
    : [];
  const hasDependencies = requiredCredentials.length > 0 || marketplaceTools.length > 0;

  const score = hasDependencies ? 70 : 100;

  const evidenceEntry = hasDependencies
    ? {
        kind: 'awaiting_w1',
        criterion: ID,
        credentials: requiredCredentials,
        tools: marketplaceTools,
        basis: 'CredentialAdapter.probe() sweep not yet executed; score auto-rises to 100 when W1 keys land',
      }
    : {
        kind: 'structured_stub',
        criterion: ID,
        basis: 'target declares no required credentials or marketplace tools',
      };

  return {
    id: ID,
    score,
    evidence: [{
      ...evidenceEntry,
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: hasDependencies
      ? `Score is 70 pending W1 credential rollout. Will auto-rise to 100 when adapter.probe() returns "present" for all declared credentials. requiredCredentials=${requiredCredentials.length}, marketplaceTools=${marketplaceTools.length}.`
      : 'No declared dependencies — nothing to probe.',
  };
}

export { ID };
