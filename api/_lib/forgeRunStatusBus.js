/**
 * Durable-ish status channel for async /api/run-construction jobs.
 *
 * Production uses Vercel KV when configured. Local tests/dev fall back to
 * an in-process Map, which is intentionally marked as memory transport so
 * callers do not mistake it for cross-function durability.
 */

'use strict';

const KEY_PREFIX = 'forge-run-status:';
const STATUS_TTL_SEC = 60 * 60 * 24;
const MAX_EVENTS = 500;

const memoryStore = new Map();
let _kvClient = null;
let _kvUnavailable = false;

async function getKvClient() {
  if (_kvClient) return _kvClient;
  if (_kvUnavailable) return null;
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
  if (typeof runId !== 'string' || runId.trim().length === 0) {
    throw new TypeError('forgeRunStatusBus: runId must be a non-empty string');
  }
  return `${KEY_PREFIX}${runId.trim()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeRecord(record = {}) {
  const events = Array.isArray(record.events) ? record.events.slice(-MAX_EVENTS) : [];
  return {
    runId: typeof record.runId === 'string' ? record.runId : null,
    status: typeof record.status === 'string' ? record.status : 'queued',
    url: typeof record.url === 'string' ? record.url : null,
    mode: typeof record.mode === 'string' ? record.mode : 'BACKGROUND',
    queuedAt: record.queuedAt ?? nowIso(),
    startedAt: record.startedAt ?? null,
    updatedAt: record.updatedAt ?? nowIso(),
    completedAt: record.completedAt ?? null,
    events,
    final: record.final ?? null,
    error: record.error ?? null,
    transport: record.transport ?? null,
  };
}

async function readRaw(runId) {
  const key = keyFor(runId);
  const kv = await getKvClient();
  if (kv) {
    try {
      const value = await kv.get(key);
      if (value) return { record: normalizeRecord(value), transport: 'kv' };
    } catch {
      // fall through to memory
    }
  }
  const value = memoryStore.get(key);
  return value
    ? { record: normalizeRecord(value), transport: 'memory' }
    : { record: null, transport: kv ? 'kv' : 'memory' };
}

async function writeRaw(runId, record) {
  const key = keyFor(runId);
  const normalized = normalizeRecord(record);
  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.set(key, normalized, { ex: STATUS_TTL_SEC });
      return { ok: true, transport: 'kv', record: { ...normalized, transport: 'kv' } };
    } catch {
      // fall through to memory
    }
  }
  memoryStore.set(key, normalized);
  setTimeout(() => {
    memoryStore.delete(key);
  }, STATUS_TTL_SEC * 1000).unref?.();
  return { ok: true, transport: 'memory', record: { ...normalized, transport: 'memory' } };
}

export async function initializeForgeRunStatus({ runId, url, mode = 'BACKGROUND' }) {
  return writeRaw(runId, normalizeRecord({
    runId,
    url,
    mode,
    status: 'queued',
    queuedAt: nowIso(),
    updatedAt: nowIso(),
    events: [],
  }));
}

export async function markForgeRunStarted(runId) {
  const { record } = await readRaw(runId);
  const next = normalizeRecord({
    ...(record ?? { runId }),
    status: 'running',
    startedAt: record?.startedAt ?? nowIso(),
    updatedAt: nowIso(),
  });
  return writeRaw(runId, next);
}

export async function appendForgeRunEvent(runId, event) {
  const { record } = await readRaw(runId);
  const current = normalizeRecord(record ?? { runId, status: 'running' });
  const nextEvent = {
    at: nowIso(),
    payload: event,
  };
  const status = event?.type === 'error'
    ? 'failed'
    : event?.type === 'final'
      ? (event?.ok === false ? 'failed' : 'completed')
      : current.status === 'queued'
        ? 'running'
        : current.status;
  return writeRaw(runId, {
    ...current,
    status,
    updatedAt: nowIso(),
    completedAt: event?.type === 'error' || event?.type === 'final' ? nowIso() : current.completedAt,
    events: [...current.events, nextEvent].slice(-MAX_EVENTS),
    final: event?.type === 'final' ? event : current.final,
    error: event?.type === 'error' ? event : current.error,
  });
}

export async function markForgeRunFailed(runId, error) {
  const { record } = await readRaw(runId);
  const payload = {
    type: 'error',
    error: String(error?.message ?? error ?? 'async_run_failed').slice(0, 500),
    code: error?.code ?? 'ASYNC_RUN_FAILED',
    failedStep: error?.failedStep ?? null,
  };
  const final = {
    type: 'final',
    final: true,
    ok: false,
    exitReason: error?.exitReason ?? 'STEP_FAILED',
    failedStep: error?.failedStep ?? null,
    error: payload.error,
    code: payload.code,
  };
  const completedAt = nowIso();
  return writeRaw(runId, {
    ...normalizeRecord(record ?? { runId }),
    status: 'failed',
    updatedAt: completedAt,
    completedAt,
    error: payload,
    final,
    events: [
      ...(record?.events ?? []),
      { at: completedAt, payload },
      { at: completedAt, payload: final },
    ].slice(-MAX_EVENTS),
  });
}

export async function readForgeRunStatus(runId) {
  return readRaw(runId);
}

export function resetForgeRunStatusForTests() {
  memoryStore.clear();
  _kvClient = null;
  _kvUnavailable = false;
}

export const __internals = Object.freeze({
  KEY_PREFIX,
  STATUS_TTL_SEC,
  MAX_EVENTS,
  keyFor,
  memoryStore,
  getKvClient,
  normalizeRecord,
});
