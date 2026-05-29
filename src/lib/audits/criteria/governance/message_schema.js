/**
 * gov.message_schema — Message schema compliance.
 *
 * For every message in window, require:
 *   1. Envelope fields: message_id, run_id, topic, producer_agent_id,
 *      schema_version, published_at, payload.
 *   2. run_id non-null.
 *   3. Topic ∈ producer charter's produces_topics.
 *   4. Schema version known.
 *   5. AJV (or supplied validator) validates the payload.
 *
 * score = round(100 · valid_messages / total_messages). Unknown schema in
 * use → cap at 80 (Slot 1).
 */

'use strict';

import { measuredResult, noEvidenceResult, missingCtx, ctxWindow } from '../_helpers.js';

const ID = 'gov.message_schema';

const REQUIRED_ENVELOPE_FIELDS = Object.freeze([
  'message_id', 'run_id', 'topic', 'producer_agent_id',
  'schema_version', 'published_at', 'payload',
]);

export default async function evaluate(target, ctx = {}) {
  if (!ctx?.messageBus?.query) return missingCtx(ID, 'messageBus');
  if (!ctx?.registry?.getCharter) return missingCtx(ID, 'registry');

  const { fromTs, toTs } = ctxWindow(ctx);
  const agentId = target?.id;
  const messages = await ctx.messageBus.query({ producerAgentId: agentId, fromTs, toTs });
  const totalMessages = messages.length;
  if (totalMessages === 0) {
    return noEvidenceResult({
      id: ID,
      reasonCode: 'NO_MESSAGE_EVIDENCE',
      notes: `Agent ${agentId} produced no messages in window.`,
    });
  }

  const validate = ctx?.registry?.validatePayload ?? ((/* schema, payload */) => true);
  const charter = await ctx.registry.getCharter(agentId);
  const declared = new Set(charter?.produces_topics ?? charter?.produces ?? []);
  let valid = 0;
  let unknownSchemaInUse = false;
  const findings = [];
  for (const msg of messages) {
    const missingEnv = REQUIRED_ENVELOPE_FIELDS.filter(f => msg[f] === undefined || (f !== 'payload' && msg[f] === null));
    if (missingEnv.length > 0) {
      findings.push({ code: 'ENVELOPE_INCOMPLETE', topic: msg.topic, missing: missingEnv });
      continue;
    }
    if (msg.run_id == null) {
      findings.push({ code: 'MISSING_RUN_ID', topic: msg.topic });
      continue;
    }
    if (declared.size > 0 && !declared.has(msg.topic)) {
      findings.push({ code: 'TOPIC_NOT_IN_CHARTER_PRODUCES', topic: msg.topic });
      continue;
    }
    const schema = ctx?.registry?.getSchemaFor
      ? await ctx.registry.getSchemaFor(msg.topic, msg.schema_version)
      : null;
    if (!schema) {
      unknownSchemaInUse = true;
      findings.push({ code: 'UNKNOWN_SCHEMA', topic: msg.topic, schema_version: msg.schema_version });
      continue;
    }
    if (!validate(schema, msg.payload)) {
      findings.push({ code: 'PAYLOAD_INVALID', topic: msg.topic });
      continue;
    }
    valid++;
  }

  let score = (valid / totalMessages) * 100;
  if (unknownSchemaInUse && score > 80) score = 80;

  return measuredResult({
    id: ID,
    score,
    evidence: [{ kind: 'measured', criterion: ID, window: { fromTs, toTs }, totalMessages, valid, unknownSchemaInUse }],
    notes: `${valid}/${totalMessages} messages valid. ${unknownSchemaInUse ? 'Score capped at 80 — unknown schema in use.' : ''}`.trim(),
    findings,
  });
}

export { ID, REQUIRED_ENVELOPE_FIELDS };
