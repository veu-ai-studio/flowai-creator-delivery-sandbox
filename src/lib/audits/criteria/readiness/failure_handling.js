/**
 * rdy.failure_handling — Failure mode handling.
 *
 * For each failure observed via errors.js:
 *   - Structured envelope: code, severity, retryable, run_id, correlationId.
 *   - Terminal failed or recovered state.
 *   - Configured failure routing (DLQ / error-topic publish).
 *
 * score = round(100 · handled_failures / total_failures).
 * Partial credit capped at 50 per incident with recovery latency > 60s.
 * Raw stack trace without errors.js fields ⇒ counted failed.
 * total_failures === 0 ⇒ null + NO_FAILURE_INJECTION_EVIDENCE (Slot 2).
 */

'use strict';

import { measuredResult, noEvidenceResult, missingCtx, ctxWindow } from '../_helpers.js';

const ID = 'rdy.failure_handling';

const KNOWN_TAXONOMY = Object.freeze(new Set([
  'ConfigError', 'ValidationError', 'PayloadError', 'CharterError',
  'AuthorityError', 'DependencyError', 'NotImplementedError',
  'ChainError', 'EvaluatorError',
]));

const RECOVERY_SLA_MS = 60 * 1000;

function _hasStructuredEnvelope(err) {
  if (!err) return false;
  return (
    typeof err.code === 'string' &&
    typeof err.severity === 'string' &&
    typeof err.retryable === 'boolean' &&
    err.run_id != null
  );
}

export default async function evaluate(target, ctx = {}) {
  if (!ctx?.errorLog?.query) return missingCtx(ID, 'errorLog');
  if (!ctx?.auditLog?.query) return missingCtx(ID, 'auditLog');

  const { fromTs, toTs } = ctxWindow(ctx);
  const agentId = target?.id;
  const errors = await ctx.errorLog.query({ agentId, fromTs, toTs });
  const totalFailures = errors.length;
  if (totalFailures === 0) {
    return noEvidenceResult({
      id: ID,
      reasonCode: 'NO_FAILURE_INJECTION_EVIDENCE',
      notes: 'No failures observed. Synthetic injection is Phase 2 work (Flag 4 spillover).',
    });
  }

  const recoveries = await ctx.auditLog.query({ agentId, fromTs, toTs, eventType: 'RECOVERY' });
  const byCorrelation = new Map();
  for (const r of recoveries) {
    const cid = r.correlationId ?? r.payload?.correlationId;
    if (cid) byCorrelation.set(cid, r);
  }
  const dlqMessages = ctx?.messageBus?.query
    ? await ctx.messageBus.query({ producerAgentId: agentId, fromTs, toTs, topicPattern: /\.(dlq|errors)$/ })
    : [];

  let handledFull = 0;
  let handledPartial = 0;
  const findings = [];

  for (const e of errors) {
    if (!_hasStructuredEnvelope(e) || !KNOWN_TAXONOMY.has(e.code)) {
      findings.push({ code: 'UNSTRUCTURED_ERROR', correlationId: e.correlationId, raw: e.message?.slice?.(0, 120) ?? null });
      continue;
    }
    const recovery = byCorrelation.get(e.correlationId);
    const hasRoute = dlqMessages.some(m => m.correlationId === e.correlationId);
    const latency = recovery ? (recovery.ts ?? recovery.created_at) - (e.ts ?? e.created_at) : null;
    const terminallyRecovered = Boolean(recovery) || e.handled === true || e.escalated === true;
    if (!terminallyRecovered) {
      findings.push({ code: 'MISSING_FAILURE_ROUTE', correlationId: e.correlationId });
      continue;
    }
    if (!hasRoute && recovery == null) {
      findings.push({ code: 'MISSING_FAILURE_ROUTE', correlationId: e.correlationId, detail: 'no DLQ or recovery row' });
      continue;
    }
    if (latency != null && latency > RECOVERY_SLA_MS) {
      handledPartial++;
      findings.push({ code: 'SLOW_RECOVERY', correlationId: e.correlationId, latencyMs: latency, slaMs: RECOVERY_SLA_MS });
    } else {
      handledFull++;
    }
  }

  const numerator = handledFull * 100 + handledPartial * 50;
  const score = numerator / totalFailures;

  return measuredResult({
    id: ID,
    score,
    evidence: [{ kind: 'measured', criterion: ID, window: { fromTs, toTs }, totalFailures, handledFull, handledPartial }],
    notes: `${handledFull} full + ${handledPartial} partial (latency > 60s) of ${totalFailures} failure(s).`,
    findings,
  });
}

export { ID, KNOWN_TAXONOMY, RECOVERY_SLA_MS };
