import { createHash } from 'node:crypto';

const RETENTION_SECONDS = 30 * 24 * 60 * 60;
const HEARTBEAT_TIMEOUT_MS = 120_000;
const CONTROL_RESERVATION_TIMEOUT_MS = 120_000;
const memory = new Map();
let kvClient;

const TERMINAL = new Set(['cancelled', 'completed', 'failed']);
const TRANSITIONS = {
  queued: new Set(['running', 'cancelling', 'failed']),
  running: new Set(['paused', 'cancelling', 'control_failed', 'completed', 'failed']),
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
    kvClient = { kind: 'kv', client: kv };
    return kvClient;
  }
  if (process.env.NODE_ENV === 'test') return (kvClient = null);
  const { getSupabase } = await import('./supabase.js');
  const supabase = getSupabase();
  if (supabase) {
    kvClient = { kind: 'supabase', client: supabase };
    return kvClient;
  }
  throw Object.assign(new Error('Run store unavailable'), { code: 'RUN_STORE_NOT_LIVE' });
}

const runKey = id => `operational-run:${id}`;
const indexKey = orgId => `operational-runs:${orgId}`;
const idemKey = (orgId, userId, key) => `operational-idempotency:${orgId}:${userId}:${key}`;
const decode = value => typeof value === 'string' ? JSON.parse(value) : value;
const stableId = (orgId, userId, key) => `run_${createHash('sha256').update(`${orgId}:${userId}:${key}`).digest('hex').slice(0, 24)}`;

const OPERATIONAL_STEP_KEY = 'operational_run';
const OPERATIONAL_PHASE = 'operational.snapshot';

async function getSupabaseRun(client, id) {
  const { data, error } = await client
    .from('flowai_audit_log')
    .select('meta,at')
    .eq('run_id', id)
    .eq('step_key', OPERATIONAL_STEP_KEY)
    .eq('phase', OPERATIONAL_PHASE)
    .order('at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Object.assign(new Error(error.message), { code: 'RUN_STORE_READ_FAILED' });
  return data?.meta?.run || null;
}

async function appendSupabaseRun(client, run, idempotencyKey = null) {
  const { error } = await client.from('flowai_audit_log').insert({
    run_id: run.id,
    step_key: OPERATIONAL_STEP_KEY,
    phase: OPERATIONAL_PHASE,
    at: run.updatedAt || new Date().toISOString(),
    idempotency_key: idempotencyKey,
    authority: 'auto_write_internal',
    meta: { run },
  });
  if (error) throw Object.assign(new Error(error.message), { code: 'RUN_STORE_WRITE_FAILED' });
  return run;
}

export function publicRunError(code = 'ORCHESTRATION_FAILED') {
  const messages = {
    RUN_STORE_NOT_LIVE: 'Run persistence is unavailable.',
    CONTROL_FAILED: 'The control request was not durably accepted.',
    ORCHESTRATION_FAILED: 'Run execution failed.',
  };
  const safe = /^[A-Z0-9_]{2,64}$/.test(code) ? code : 'ORCHESTRATION_FAILED';
  return { code: safe, message: messages[safe] || 'Run execution failed.' };
}

export function buildActionableStageFailurePatch({
  stage,
  tool,
  code = 'ORCHESTRATION_FAILED',
  error,
  executionMayStillBeActive = false,
} = {}) {
  const safeStage = typeof stage === 'string' && stage.trim() ? stage.trim().slice(0, 80) : 'UNKNOWN_STAGE';
  const safeTool = typeof tool === 'string' && tool.trim() ? tool.trim().slice(0, 120) : 'unknown';
  const safeCode = /^[A-Z0-9_]{2,64}$/.test(code) ? code : 'ORCHESTRATION_FAILED';
  const safeDetail = typeof error === 'string' && error.trim()
    ? error.trim().slice(0, 500)
    : 'The stage ended without a usable error detail.';
  const mayStillBeActive = executionMayStillBeActive === true;
  return {
    status: 'control_failed',
    verdict: 'CONTROL_FAILED',
    progressLabel: `${safeStage} failed in ${safeTool}`,
    error: {
      ...publicRunError(safeCode),
      stage: safeStage,
      tool: safeTool,
      detail: safeDetail,
      executionMayStillBeActive: mayStillBeActive,
      requiredOperatorAction: mayStillBeActive
        ? 'Verify worker activity before retrying this stage.'
        : `Correct ${safeTool} for ${safeStage}, then start one authorized retry.`,
      retrySafe: !mayStillBeActive,
      retryInstruction: mayStillBeActive
        ? 'Retry only after confirming the prior worker is no longer active.'
        : 'Start a new authorized run; do not relabel or resume this failed execution.',
      clearanceAllowed: false,
    },
  };
}

export async function createOperationalRun({ orgId, userId, idempotency, input = {} }) {
  if (!orgId || !userId) throw Object.assign(new Error('Owner required'), { code: 'TENANT_REQUIRED' });
  if (typeof idempotency !== 'string' || idempotency.trim().length < 8) throw Object.assign(new Error('Idempotency required'), { code: 'IDEMPOTENCY_KEY_REQUIRED' });
  const id = stableId(orgId, userId, idempotency.trim());
  const now = new Date().toISOString();
  const run = { id, orgId, userId, version: 1, status: 'queued', mode: input.mode || 'auto', requestedStage: input.requestedStage || null, provenance: input.provenance || null, flowHubPath: input.flowHubPath || null, url: input.url || null, product: input.product || 'FlowAI run', progressLabel: 'Accepted and queued', createdAt: now, updatedAt: now, lastHeartbeatAt: now, completedAt: null, error: null };
  const backend = await store();
  if (backend?.kind === 'kv') {
    const result = await backend.client.eval(CREATE_LUA, [idemKey(orgId, userId, idempotency.trim()), runKey(id), indexKey(orgId)], ['operational-run:', id, JSON.stringify(run), String(RETENTION_SECONDS), String(Date.now())]);
    return { run: decode(result[2]), replayed: Number(result[0]) === 0 };
  }
  if (backend?.kind === 'supabase') {
    const existing = await getSupabaseRun(backend.client, id);
    if (existing) return { run: existing, replayed: true };
    await appendSupabaseRun(backend.client, run, idempotency.trim());
    return { run, replayed: false };
  }
  const existing = memory.get(runKey(id));
  if (existing) return { run: existing, replayed: true };
  memory.set(runKey(id), run);
  return { run, replayed: false };
}

export async function getOperationalRun(id, owner) {
  const backend = await store();
  const run = decode(backend?.kind === 'kv'
    ? await backend.client.get(runKey(id))
    : backend?.kind === 'supabase'
      ? await getSupabaseRun(backend.client, id)
      : memory.get(runKey(id)));
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
    error: {
      ...publicRunError('CONTROL_FAILED'),
      cancellationConfirmed: false,
      executionMayStillBeActive: true,
      requiredOperatorAction: 'Verify worker activity and retry Stop if execution is still active.',
      retrySafe: true,
      retryInstruction: 'Retry Stop; the durable ledger will reserve a new idempotent control command.',
    },
    progressLabel: 'Cancellation acknowledgement timed out',
    stopCommand: { ...run.stopCommand, dispatchState: 'expired', expiredAt: new Date(nowMs).toISOString() },
  }, { skipReconcile: true });
}

export async function getPendingStopCommand(id, owner) {
  const run = await getOperationalRun(id, owner);
  if (run?.status !== 'cancelling' || run.stopCommand?.acknowledged !== false || run.stopCommand?.dispatchState !== 'pending') return null;
  return { command: 'stop', id: run.stopCommand.id, writtenAt: run.stopCommand.reservedAt };
}

function mergeStepResults(currentResults, incomingResults) {
  const current = currentResults && typeof currentResults === 'object' ? currentResults : {};
  const incoming = incomingResults && typeof incomingResults === 'object' ? incomingResults : {};
  const merged = { ...current };
  for (const [stage, evidence] of Object.entries(incoming)) {
    const previous = current[stage];
    if (!previous) {
      merged[stage] = evidence;
      continue;
    }
    const previousComparable = { ...previous, history: undefined };
    const incomingComparable = { ...evidence, history: undefined };
    if (JSON.stringify(previousComparable) === JSON.stringify(incomingComparable)) {
      merged[stage] = previous;
      continue;
    }
    const history = Array.isArray(previous.history)
      ? previous.history
      : [{ ...previous, history: undefined }];
    merged[stage] = {
      ...evidence,
      history: [...history, { ...evidence, history: undefined }],
    };
  }
  return merged;
}

export async function updateOperationalRun(id, owner, patch, options = {}) {
  const backend = await store();
  const raw = decode(backend?.kind === 'kv'
    ? await backend.client.get(runKey(id))
    : backend?.kind === 'supabase'
      ? await getSupabaseRun(backend.client, id)
      : memory.get(runKey(id)));
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
  const durablePatch = persisted.stepResults
    ? { ...persisted, stepResults: mergeStepResults(current.stepResults, persisted.stepResults) }
    : persisted;
  const next = { ...current, ...durablePatch, version: Number(current.version || 0) + 1, updatedAt: new Date().toISOString() };
  if (backend?.kind === 'kv') {
    const result = await backend.client.eval(UPDATE_LUA, [runKey(id)], [owner.orgId, owner.userId, current.status, String(current.version || 0), JSON.stringify(next), String(RETENTION_SECONDS)]);
    if (Number(result[0]) !== 1) return { ...(await getOperationalRun(id, owner)), transitionRejected: true };
  } else if (backend?.kind === 'supabase') {
    const latest = await getSupabaseRun(backend.client, id);
    if (!latest || latest.version !== current.version || latest.status !== current.status) return { ...latest, transitionRejected: true };
    await appendSupabaseRun(backend.client, next);
  } else {
    const latest = memory.get(runKey(id));
    if (!latest || latest.version !== current.version) return { ...latest, transitionRejected: true };
    memory.set(runKey(id), next);
  }
  return next;
}

export async function listOperationalRuns(owner, limit = 100) {
  const backend = await store();
  let rows;
  if (backend?.kind === 'kv') {
    const ids = await backend.client.zrange(indexKey(owner.orgId), 0, limit - 1, { rev: true });
    rows = (await Promise.all(ids.map(id => getOperationalRun(String(id), owner)))).filter(Boolean);
  } else if (backend?.kind === 'supabase') {
    const { data, error } = await backend.client
      .from('flowai_audit_log')
      .select('run_id,meta,at')
      .eq('step_key', OPERATIONAL_STEP_KEY)
      .eq('phase', OPERATIONAL_PHASE)
      .filter('meta->run->>orgId', 'eq', owner.orgId)
      .filter('meta->run->>userId', 'eq', owner.userId)
      .order('at', { ascending: false })
      .limit(Math.max(limit * 20, 200));
    if (error) throw Object.assign(new Error(error.message), { code: 'RUN_STORE_READ_FAILED' });
    const latest = new Map();
    for (const row of data || []) if (!latest.has(row.run_id) && row.meta?.run) latest.set(row.run_id, row.meta.run);
    rows = [...latest.values()].slice(0, limit);
  } else rows = [...memory.values()].filter(r => r.orgId === owner.orgId && r.userId === owner.userId).slice(0, limit);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function resetOperationalRunsForTests() { memory.clear(); kvClient = undefined; }
export function setOperationalRunStoreForTests(client) { kvClient = client ? { kind: 'kv', client } : client; }
export const __test = { CREATE_LUA, UPDATE_LUA, TRANSITIONS, HEARTBEAT_TIMEOUT_MS, CONTROL_RESERVATION_TIMEOUT_MS, reconcileStaleCancellation, mergeStepResults };
