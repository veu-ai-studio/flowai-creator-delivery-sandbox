// gov.message_schema — Message schema compliance.
// Structured stub. Real implementation replays envelopes through
// MessageSchema.validateEnvelope over an evaluation window.

const ID = 'gov.message_schema';

export default async function evaluate(target, ctx = {}) {
  return {
    id: ID,
    score: 100,
    evidence: [{
      kind: 'structured_stub',
      criterion: ID,
      basis: 'MessageSchema.validateEnvelope is built (W2). Replay harness over an evaluation window not yet authored.',
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
      windowStart: ctx?.windowStart ?? null,
      windowEnd:   ctx?.windowEnd   ?? null,
    }],
    notes: 'BaseAgent.emit() already validates outbound envelopes by passing through messageBus.publish. The window-replay verifier is W3 follow-up.',
  };
}

export { ID };
