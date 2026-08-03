import { createHash } from 'node:crypto';

const RETENTION_SECONDS = 30 * 24 * 60 * 60;
const HEARTBEAT_TIMEOUT_MS = 120_000;
const CONTROL_RESERVATION_TIMEOUT_MS = 120_000;
const memory = new Map();
let kvClient;

const TERMINAL = new Set(['cancelled', 'completed', 'failed']);
const TRANSITIONS = {
  queued: new Set(['running', 'cancelling', 'failed']),
  running: new Set(['paused', 'cancelling', 'completed', 'failed']),
  paused: new Set(['running', 'cancelling', 'failed']),
  cancelling: new Set(['cancelled', 'control_failed', 'failed']),
  control_failed: new Set(['running', 'paused', 'cancelling', 'completed', 'failed']),
  cancelled: new Set(), completed: new Set(), failed: new Set(),
};

const CREATE_LUA = `
local existing = redis.call('GET', KEYS[1])
if existing then
  local row = redis.call('GET', ARGV[1] .. existing)
  if row then
    redis.call('ZADD', KEYS[3], ARGV[5], existing)
    redis.call('EXPIRE', KEYS[3], ARGV[4])
    return {0, existing, row}
  end
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[4])
redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
redis.call('ZADD', KEYS[3], ARGV[5], ARGV[2])
redis.call('EXPIRE', KEYS[3], ARGV[4])
return {1, ARGV[2], ARGV[3]}`;

const UPDATE_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {0, 'NOT_FOUND'} end
local row = cjson.decode(raw)
if row.orgId ~= ARGV[1] or row.userId ~= ARGV[2] then return {0, 'NOT_FOUND'} end
if row.status ~= ARGV[3] then return {0, 'STATE_CONFLICT'} end
if tonumber(row.version or 0) ~= tonumber(ARGV[4]) then return {0, 'VERSION_CONFLICT'} end
redis.call('SET', KEYS[1], ARGV[5], 'EX', ARGV[6])
return {1, ARGV[5]}`;

async function store() {
  if (kvClient !== undefined) return kvClient;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    kvClient = kv;
    return kv;
  }
  if (process.env.NODE_ENV === 'test') return (kvClient = null);
  throw Object.assign(new Error('Run store unavailable'), { code: 'RUN_STORE_NOT_LIVE' });
}

const runKey = id => `operational-run:${id}`;
const indexKey = orgId => `operational-runs:${orgId}`;
const idemKey = (orgId, userId, key) => `operational-idempotency:${orgId}:${userId}:${key}`;
const decode = value => typeof value === 'string' ? JSON.parse(value) : value;
const stableId = (orgId, userId, key) => `run_${createHash('sha256').update(`${orgId}:${userId}:${key}`).digest('hex').slice(0, 24)}`;

export function publicRunError(code = 'ORCHESTRATION_FAILED') {
  const messages = {
    RUN_STORE_NOT_LIVE: 'Run persistence is unavailable.',
    CONTROL_FAILED: 'The control request was not durably accepted.',
    ORCHESTRATION_FAILED: 'Run execution failed.',
  };
  const safe = /^[A-Z0-9_]{2,64}$/.test(code) ? code : 'ORCHESTRATION_FAILED';
  return { code: safe, message: messages[safe] || 'Run execution failed.' };
}

export async function createOperationalRun({ orgId, userId, idempotency, input = {} }) {
  if (!orgId || !userId) throw Object.assign(new Error('Owner required'), { code: 'TENANT_REQUIRED' });
  if (typeof idempotency !== 'string' || idempotency.trim().length < 8) throw Object.assign(new Error('Idempotency required'), { code: 'IDEMPOTENCY_KEY_REQUIRED' });
  const id = stableId(orgId, userId, idempotency.trim());
  const now = new Date().toISOString();
  const run = { id, orgId, userId, version: 1, status: 'queued', mode: input.mode || 'auto', flowHubPath: input.flowHubPath || null, url: input.url || null, product: input.product || 'FlowAI run', progressLabel: 'Accepted and queued', createdAt: now, updatedAt: now, lastHeartbeatAt: now, completedAt: null, error: null };
  const kv = await store();
  if (kv) {
    const result = await kv.eval(CREATE_LUA, [idemKey(orgId, userId, idempotency.trim()), runKey(id), indexKey(orgId)], ['operational-run:', id, JSON.stringify(run), String(RETENTION_SECONDS), String(Date.now())]);
    return { run: decode(result[2]), replayed: Number(result[0]) === 0 };
  }
  const existing = memory.get(runKey(id));
  if (existing) return { run: existing, replayed: true };
  memory.set(runKey(id), run);
  return { run, replayed: false };
}

export async function getOperationalRun(id, owner) {
  const kv = await store();
  const run = decode(kv ? await kv.get(runKey(id)) : memory.get(runKey(id)));
  if (!run || run.orgId !== owner.orgId || run.userId !== owner.userId) return null;
  return reconcileStaleCancellation(run, owner);
}

async function reconcileStaleCancellation(run, owner, nowMs = Date.now()) {
  const reservedAt = Date.parse(run?.stopCommand?.reservedAt || '');
  if (run?.status !== 'cancelling' || run.stopCommand?.acknowledged !== false || !Number.isFinite(reservedAt) || nowMs - reservedAt < CONTROL_RESERVATION_TIMEOUT_MS) return run;
  return updateOperationalRun(run.id, owner, {
    status: 'control_failed',
    expectedStatus: 'cancelling',
    expectedControlCommandId: run.stopCommand.id,
    error: publicRunError('CONTROL_FAILED'),
    progressLabel: 'Cancellation acknowledgement timed out',
    stopCommand: { ...run.stopCommand, dispatchState: 'expired', expiredAt: new Date(nowMs).toISOString() },
  }, { skipReconcile: true });
}

export async function getPendingStopCommand(id, owner) {
  const run = await getOperationalRun(id, owner);
  if (run?.status !== 'cancelling' || run.stopCommand?.acknowledged !== false || run.stopCommand?.dispatchState !== 'pending') return null;
  return { command: 'stop', id: run.stopCommand.id, writtenAt: run.stopCommand.reservedAt };
}

export async function updateOperationalRun(id, owner, patch, options = {}) {
  const kv = await store();
  const raw = decode(kv ? await kv.get(runKey(id)) : memory.get(runKey(id)));
  let current = raw && raw.orgId === owner.orgId && raw.userId === owner.userId ? raw : null;
  if (current && !options.skipReconcile) current = await reconcileStaleCancellation(current, owner);
  if (!current) return null;
  const { transitionReason, expectedStatus, expectedControlCommandId, ...persisted } = patch;
  if (expectedStatus && current.status !== expectedStatus) return { ...current, transitionRejected: true };
  const nextStatus = persisted.status || current.status;
  if (nextStatus !== current.status && !TRANSITIONS[current.status]?.has(nextStatus)) return { ...current, transitionRejected: true };
  if (nextStatus === 'running' && ['paused', 'control_failed'].includes(current.status) && transitionReason !== 'authorized_resume') return { ...current, transitionRejected: true };
  if (expectedControlCommandId && current.stopCommand?.id !== expectedControlCommandId) return { ...current, transitionRejected: true };
  if (current.status === 'cancelling' && nextStatus === 'cancelled' && !persisted.stopAcknowledgedAt) return { ...current, transitionRejected: true };
  if (TERMINAL.has(current.status)) return { ...current, transitionRejected: true };
  const next = { ...current, ...persisted, version: Number(current.version || 0) + 1, updatedAt: new Date().toISOString() };
  if (kv) {
    const result = await kv.eval(UPDATE_LUA, [runKey(id)], [owner.orgId, owner.userId, current.status, String(current.version || 0), JSON.stringify(next), String(RETENTION_SECONDS)]);
    if (Number(result[0]) !== 1) return { ...(await getOperationalRun(id, owner)), transitionRejected: true };
  } else {
    const latest = memory.get(runKey(id));
    if (!latest || latest.version !== current.version) return { ...latest, transitionRejected: true };
    memory.set(runKey(id), next);
  }
  return next;
}

export async function listOperationalRuns(owner, limit = 100) {
  const kv = await store();
  let rows;
  if (kv) {
    const ids = await kv.zrange(indexKey(owner.orgId), 0, limit - 1, { rev: true });
    rows = (await Promise.all(ids.map(id => getOperationalRun(String(id), owner)))).filter(Boolean);
  } else rows = [...memory.values()].filter(r => r.orgId === owner.orgId && r.userId === owner.userId).slice(0, limit);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function resetOperationalRunsForTests() { memory.clear(); kvClient = undefined; }
export function setOperationalRunStoreForTests(client) { kvClient = client; }
export const __test = { CREATE_LUA, UPDATE_LUA, TRANSITIONS, HEARTBEAT_TIMEOUT_MS, CONTROL_RESERVATION_TIMEOUT_MS, reconcileStaleCancellation };
