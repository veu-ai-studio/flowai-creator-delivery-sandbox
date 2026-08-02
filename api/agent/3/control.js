/**
 * /api/agent/3/control — back-channel for the running SSE orchestration.
 *
 * POST { runId, command, mode? }
 *
 * The SSE handler in /api/agent/3/execute.js owns an OrchestrationState
 * with stop()/resume()/switchMode() instance methods. From a separate
 * HTTP request we can't reach into that closure, so this endpoint
 * writes the command to the runControlBus (Vercel KV with in-memory
 * fallback). The SSE handler polls the bus between steps and applies
 * the command to its local state.
 *
 * Auth: same resolveAuthContext relaxation as the SSE path — any
 * internal or x-product-scope claim is accepted; the productScope
 * match-check is skipped because PATH B URLs (DISPATCH 24) have no
 * registered product.
 *
 * Commands:
 *   'pause'      — flips the orchestration to guided mode so it pauses
 *                  at the next checkpoint. No mode field needed.
 *   'resume'     — releases the orchestrator from a checkpoint pause.
 *                  No mode field needed.
 *   'switchMode' — changes the orchestrator's mode to a new value. mode
 *                  must be 'auto' | 'guided' | 'manual'.
 *   'stop'       — sets _stopRequested so the orchestrator exits the
 *                  outer loop after the current step. No mode field.
 *
 * Response:
 *   200 { ok: true, runId, command, mode?, transport, envelopeId }
 *   400 on validation errors
 *   401 on auth failure
 *   405 on non-POST
 *   500 on internal failure
 *
 * Note on `applied`: this endpoint writes the COMMAND. The SSE handler
 * APPLIES it on its next poll boundary. There is no synchronous proof
 * of application here — the dashboard observes the application via the
 * SSE stream (a subsequent `step` event whose log reflects the new mode
 * or whose status is 'skipped' due to stop). The response includes
 * `transport` ('kv' or 'memory') so the dashboard can warn if only the
 * in-memory path was used (which is best-effort across cold serverless
 * invocations).
 */

'use strict';

import { randomUUID } from 'node:crypto';
import { writeCommand } from '../../_lib/runControlBus.js';
import { requireAuthHard } from '../../_lib/auth.js';
import { getOperationalRun, publicRunError, updateOperationalRun } from '../../_lib/operationalRuns.js';

const ALLOWED_COMMANDS = new Set(['pause', 'resume', 'switchMode', 'stop']);
const ALLOWED_MODES = new Set(['auto', 'guided', 'manual']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const auth = await requireAuthHard(req, res);
  if (!auth) return;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'invalid_json', detail: String(e?.message ?? e) });
  }

  const runId = typeof body.runId === 'string' ? body.runId.trim() : '';
  const command = typeof body.command === 'string' ? body.command.trim() : '';
  const mode = typeof body.mode === 'string' ? body.mode.trim() : null;

  if (!runId) {
    return res.status(400).json({ ok: false, error: 'missing_field', field: 'runId' });
  }
  if (!ALLOWED_COMMANDS.has(command)) {
    return res.status(400).json({
      ok: false, error: 'invalid_command', allowed: [...ALLOWED_COMMANDS],
    });
  }
  if (command === 'switchMode') {
    if (!mode || !ALLOWED_MODES.has(mode)) {
      return res.status(400).json({
        ok: false, error: 'invalid_mode', allowed: [...ALLOWED_MODES],
        detail: 'switchMode requires a `mode` field with one of the allowed values',
      });
    }
  }

  // Auth (relaxed — productScope-match check intentionally skipped for the
  // dashboard's universal-mode use case, matching the SSE path).
  const ownedRun = await getOperationalRun(runId, auth);
  if (!ownedRun) return res.status(404).json({ ok: false, error: 'run_not_found' });
  if (['completed', 'failed', 'cancelled'].includes(ownedRun.status)) return res.status(409).json({ ok: false, error: 'run_not_active', status: ownedRun.status });

  let writeResult;
  const commandId = command === 'stop' ? randomUUID() : null;
  let reservation = null;
  try {
    if (command === 'stop') {
      reservation = await updateOperationalRun(runId, auth, {
        status: 'cancelling', expectedStatus: ownedRun.status,
        stopCommand: { id: commandId, acknowledged: false, reservedAt: new Date().toISOString() },
        progressLabel: 'Cancellation reserved',
      });
      if (!reservation || reservation.transitionRejected) return res.status(409).json({ ok: false, error: 'run_state_conflict', status: reservation?.status });
    }
    writeResult = await writeCommand(runId, command, { mode, envelopeId: commandId, requireDurable: process.env.NODE_ENV === 'production' });
  } catch (e) {
    if (reservation) await updateOperationalRun(runId, auth, { status: 'control_failed', expectedControlCommandId: commandId, error: publicRunError('CONTROL_FAILED'), progressLabel: 'Control enqueue failed' });
    return res.status(500).json({
      ok: false, error: 'CONTROL_WRITE_FAILED',
    });
  }

  return res.status(200).json({
    ok: true,
    runId,
    command,
    mode: command === 'switchMode' ? mode : null,
    transport: writeResult.transport,    // 'kv' | 'memory'
    envelopeId: writeResult.envelope.id,
    // The dashboard sees this and can show "queued" → then watch the SSE
    // stream for evidence the command landed.
    applied: 'queued',
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────────
// Mirrors the resolver in api/agent/3/execute.js (the SSE handler uses the
// same shape). Kept inline rather than imported to avoid coupling the two
// endpoints' module boundaries — they share the same auth model but each
// stands on its own.
function resolveAuthContext(req) {
  const internalMarker = req.headers?.['x-flowai-internal'];
  const authzHeader = req.headers?.authorization ?? '';
  if (internalMarker === 'true' || internalMarker === '1') {
    const expected = process.env.FLOWAI_INTERNAL_SECRET ?? '';
    const presented = authzHeader.replace(/^Bearer\s+/i, '');
    if (expected && presented === expected) {
      return { ok: true, internal: true, productScope: '*' };
    }
    return { ok: false, status: 401, error: 'internal_auth_failed' };
  }
  const scopeHeader = req.headers?.['x-product-scope'];
  if (typeof scopeHeader === 'string' && scopeHeader.length > 0) {
    return { ok: true, internal: false, productScope: scopeHeader };
  }
  return { ok: false, status: 401, error: 'no_auth_context' };
}

export const __test = Object.freeze({
  resolveAuthContext,
  ALLOWED_COMMANDS,
  ALLOWED_MODES,
});
