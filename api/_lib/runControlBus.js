/**
 * Run-control bus — cross-request command channel for live orchestrations.
 *
 * The SSE handler in api/agent/3/execute.js holds the OrchestrationState
 * for a running pipeline in-memory, and exposes its stop()/resume()/
 * switchMode() methods via deps.__exposeState. Those controls are
 * inaccessible from a SEPARATE HTTP request — Vercel serverless functions
 * are isolated per-invocation. This bus is the seam that lets the
 * dashboard (or any other client) POST to /api/agent/3/control with a
 * runId + command, and have the running SSE handler observe + apply it
 * at the next poll boundary.
 *
 * Storage:
 *   - Primary: Vercel KV when KV_REST_API_URL + KV_REST_API_TOKEN env
 *              vars are set. Keys are `run-control:<runId>` with a 60s TTL.
 *              The lazy-import pattern matches src/lib/agents/orchestrator/
 *              adapters/vercelKvHotStore.ts so test/dev environments
 *              without KV envs don't crash at module-load.
 *   - Fallback: module-level Map. Within a single Node process, this is
 *              sufficient for local dev + the (rare) case where Vercel
 *              colocates multiple invocations on one warm instance.
 *              Across colder invocations on serverless, only KV is
 *              reliable — the in-memory fallback's contract is "best
 *              effort, single-process only" and is documented as such.
 *
 * Contract:
 *   writeCommand(runId, command, options?): Promise<{ ok, transport }>
 *     - Writes a control envelope keyed by runId.
 *     - Envelope: { command, mode?, writtenAt, id }
 *     - Returns the transport that handled the write ('kv' or 'memory').
 *
 *   readAndClearCommand(runId): Promise<envelope | null>
 *     - Atomic read-then-delete so each command is delivered exactly
 *       once. Returns null when no command is pending.
 *
 *   resetForTests(): void
 *     - Clears the in-memory Map. KV is untouched.
 *
 * The bus does NOT validate commands itself — that's the caller's job
 * (control.js validates the body, execute.js validates the runtime
 * dispatch). The bus just persists and delivers envelopes.
 */

'use strict';

const CONTROL_TTL_SEC = 60;
const KEY_PREFIX = 'run-control:';

// In-memory fallback. Module-level so it survives across calls within
// the same Node process (warm Vercel function or local dev server).
const memoryStore = new Map();

let _kvClient = null;          // cached after first successful load
let _kvUnavailable = false;    // set true if @vercel/kv import fails

async function getKvClient() {
  if (_kvClient) return _kvClient;
  if (_kvUnavailable) return null;
  // KV needs both env vars to be functional. Even if @vercel/kv loads,
  // its calls will throw at runtime without these — short-circuit here
  // so we don't waste an import + throw cycle on every poll.
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    _kvUnavailable = true;
    return null;
  }
  try {
    const mod = await import('@vercel/kv');
    _kvClient = mod.kv;
    return _kvClient;
  } catch {
    _kvUnavailable = true;
    return null;
  }
}

function keyFor(runId) {
  if (typeof runId !== 'string' || runId.length === 0) {
    throw new TypeError('runControlBus: runId must be a non-empty string');
  }
  return `${KEY_PREFIX}${runId}`;
}

function envelope(command, options = {}) {
  return {
    command,
    mode: typeof options.mode === 'string' ? options.mode : null,
    writtenAt: new Date().toISOString(),
    // Lightweight unique-ish id so two concurrent writers can be told
    // apart in the rare same-millisecond case. Not cryptographically
    // strong — just disambiguation.
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

/**
 * Write a control command for a given runId. Caller is responsible for
 * validating `command` is one of the allowed values.
 *
 * @param {string} runId
 * @param {string} command       — 'pause' | 'resume' | 'switchMode' | 'stop'
 * @param {object} [options]
 * @param {string} [options.mode] — required when command === 'switchMode'
 * @returns {Promise<{ ok: true, transport: 'kv'|'memory', envelope: object }>}
 */
export async function writeCommand(runId, command, options = {}) {
  const env = envelope(command, options);
  const k = keyFor(runId);
  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.set(k, env, { ex: CONTROL_TTL_SEC });
      return { ok: true, transport: 'kv', envelope: env };
    } catch {
      // KV available but write failed — fall through to memory so the
      // command isn't dropped. Same-process callers (SSE handler in this
      // function instance) will still see it.
    }
  }
  memoryStore.set(k, env);
  // Best-effort TTL for the memory map so stale commands don't pile up.
  setTimeout(() => {
    const current = memoryStore.get(k);
    if (current && current.id === env.id) memoryStore.delete(k);
  }, CONTROL_TTL_SEC * 1000).unref?.();
  return { ok: true, transport: 'memory', envelope: env };
}

/**
 * Read the pending command for a runId AND clear it atomically. Returns
 * null when no command is pending. The "atomic" is best-effort over KV
 * (read + del are two ops; a race could double-deliver) — sufficient
 * for the control surface where double-delivering 'pause' is harmless
 * (idempotent) and 'switchMode' to the same mode is a no-op.
 *
 * @param {string} runId
 * @returns {Promise<{ command, mode, writtenAt, id } | null>}
 */
export async function readAndClearCommand(runId) {
  const k = keyFor(runId);
  const kv = await getKvClient();
  if (kv) {
    try {
      const value = await kv.get(k);
      if (value) {
        try { await kv.del(k); } catch { /* swallow — second read returns null */ }
        return value;
      }
    } catch {
      // KV down mid-poll — fall through to memory.
    }
  }
  const mem = memoryStore.get(k);
  if (mem) {
    memoryStore.delete(k);
    return mem;
  }
  return null;
}

/** Test-only — clears the in-memory fallback. Does not touch KV. */
export function resetForTests() {
  memoryStore.clear();
  _kvClient = null;
  _kvUnavailable = false;
}

export const __internals = Object.freeze({
  CONTROL_TTL_SEC,
  KEY_PREFIX,
  keyFor,
  envelope,
  getKvClient,
  memoryStore,
});
