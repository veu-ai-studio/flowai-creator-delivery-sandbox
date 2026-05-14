// Inngest client + function definitions.
//
// Env:
//   INNGEST_EVENT_KEY     — used by client to publish events
//   INNGEST_SIGNING_KEY   — used by /api/inngest endpoint to verify Inngest's signed requests
//   INNGEST_BACKEND       — 'inngest' | 'inline' (default: 'inline' until both keys are set)
//
// Behaviour:
//   * isInngestEnabled() returns true only when both keys are set AND
//     INNGEST_BACKEND !== 'inline'. Today: false → caller runs jobs inline,
//     same as before. Tomorrow: flip env, restart, jobs go async.
//   * sendEvent() is a thin wrapper around inngest.send() that no-ops when
//     disabled. Auto Runner can call it unconditionally.
//   * Function definitions and the serve adapter are LAZY — they're only
//     constructed when /api/inngest is actually hit, so the orchestrator
//     health endpoint can import this file without forcing inngest's HTTP
//     serve adapter to load (which would otherwise crash if the SDK's
//     Express helper isn't compatible with Vercel's runtime at cold start).

let _Inngest = null;
let _client = null;
let _functions = null;

async function loadInngestClass() {
  if (_Inngest) return _Inngest;
  const mod = await import('inngest');
  _Inngest = mod.Inngest;
  return _Inngest;
}

export function isInngestEnabled() {
  if (process.env.INNGEST_BACKEND === 'inline') return false;
  return Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
}

async function getClient() {
  if (_client) return _client;
  const Inngest = await loadInngestClass();
  _client = new Inngest({
    id: 'flowai',
    name: 'FlowAI / VEUaaS',
    eventKey: process.env.INNGEST_EVENT_KEY,
  });
  return _client;
}

export async function sendEvent(name, data = {}, { user, ts } = {}) {
  if (!isInngestEnabled()) {
    return { ok: false, reason: 'inngest disabled', enabled: false };
  }
  try {
    const client = await getClient();
    const result = await client.send({
      name, data,
      user: user || undefined,
      ts: ts || Date.now(),
    });
    return { ok: true, ids: result?.ids || [], enabled: true };
  } catch (e) {
    return { ok: false, reason: e.message || String(e), enabled: true };
  }
}

// Lazy function registry — built on first /api/inngest invocation.
export async function getInngestFunctions() {
  if (_functions) return _functions;
  const client = await getClient();
  const fns = [];

  // Inngest v4.x signature: createFunction({ id, trigger, ... }, handler)
  fns.push(client.createFunction(
    {
      id: 'auto-runner-step-executor',
      name: 'Auto Runner step executor',
      retries: 2,
      trigger: { event: 'flowai/run-step.requested' },
    },
    async ({ event, step }) => {
      const { runStepInline } = await import('./jobs/runStep.js');
      return await step.run('execute', () => runStepInline(event.data));
    },
  ));

  fns.push(client.createFunction(
    {
      id: 'scheduled-clearance-check',
      name: 'Scheduled clearance check',
      retries: 1,
      trigger: { event: 'flowai/clearance.scheduled' },
    },
    async ({ event, step }) => {
      const { runScheduledClearance } = await import('./jobs/scheduledClearance.js');
      return await step.run('clearance', () => runScheduledClearance(event.data));
    },
  ));

  fns.push(client.createFunction(
    {
      id: 'cost-rollup-daily',
      name: 'Daily cost rollup',
      trigger: { cron: '0 2 * * *' }, // 02:00 UTC daily
    },
    async ({ step }) => {
      const { rollupYesterdayCosts } = await import('./jobs/costRollup.js');
      return await step.run('rollup', () => rollupYesterdayCosts());
    },
  ));

  fns.push(client.createFunction(
    {
      id: 'marketplace-rerank-weekly',
      name: 'Weekly marketplace re-rank',
      trigger: { cron: '0 3 * * 1' }, // 03:00 UTC every Monday
    },
    async ({ step }) => {
      const { rerankAllTools } = await import('./jobs/marketplaceRerank.js');
      return await step.run('rerank', () => rerankAllTools({ trigger: 'cron-weekly' }));
    },
  ));

  fns.push(client.createFunction(
    {
      id: 'orchestrator-run-executor',
      name: 'Orchestrator run executor',
      retries: 2,
      trigger: { event: 'flowai/orchestrator.run.requested' },
    },
    async ({ event, step }) => {
      const { runOrchestratorEvent } = await import('./jobs/orchestratorRun.js');
      return await step.run('execute', () => runOrchestratorEvent(event.data));
    },
  ));

  // Agent #3 Self-Renewal async path (Phase 1.3, CEO Q4 = (c) combined).
  // Job logic is inlined below in runAgent3RenewalJob() rather than
  // delegated to ./jobs/* — the W5a dispatch step 7 stages api/_lib/
  // inngest.js but not a separate job file, so the executor lives inline.
  // Step events (`step.run('phase', ...)`) surface progress to the
  // AutoRunner UI subscribing to `agent.execution` audit-log topic.
  fns.push(client.createFunction(
    {
      id: 'agent3-renewal-executor',
      name: 'Agent #3 Self-Renewal executor',
      retries: 1,
      trigger: { event: 'flowai/agent3.renewal.requested' },
    },
    async ({ event, step }) => {
      return await step.run('execute', () => runAgent3RenewalJob(event.data));
    },
  ));

  _functions = fns;
  return _functions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent #3 Self-Renewal async job (Phase 1.3 graduation).
//
// Invoked by:
//   - Inngest function `agent3-renewal-executor` on
//     `flowai/agent3.renewal.requested` event
//   - api/agent/3/execute.js after sync timeout (>25s) hand-off
//
// Event payload:
//   { jobId, productScope, issue, mode, runId?, sourceHints? }
//
// Constructs an Agent3SelfRenewalExecutor and calls executeRemediation().
// Returns the executor envelope or an error marker.
//
// Exported for direct invocation by the sync endpoint's timeout hand-off
// path AND for unit tests.
// ─────────────────────────────────────────────────────────────────────────────

export async function runAgent3RenewalJob(data) {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'invalid_event_payload' };
  }
  const { jobId, productScope, issue, mode, runId, sourceHints } = data;
  if (typeof productScope !== 'string' || !productScope) {
    return { ok: false, error: 'missing_productScope', jobId };
  }
  if (!issue || typeof issue !== 'object') {
    return { ok: false, error: 'missing_issue', jobId };
  }
  if (mode !== 'recommend_only' && mode !== 'fork_and_fix') {
    return { ok: false, error: 'invalid_mode', jobId };
  }

  let Agent3SelfRenewalExecutor;
  try {
    ({ Agent3SelfRenewalExecutor } = await import(
      '../../src/lib/agents/agents/Agent3SelfRenewalExecutor.js'
    ));
  } catch (e) {
    return { ok: false, error: 'executor_import_failed', detail: String(e?.message ?? e), jobId };
  }

  // Minimal deps — mirrors the sync endpoint's buildExecutor() pattern.
  const clock = { now: () => Date.now() };
  const _hotMap = new Map();
  const hot = {
    get: async (k) => _hotMap.get(k),
    set: async (k, v) => { _hotMap.set(k, v); return v; },
    delete: async (k) => { _hotMap.delete(k); },
  };
  const cold = { append: async () => {}, list: async () => [] };
  const messageBus = { publish: async () => {}, subscribe: () => () => {} };
  const auditLog = { write: async () => {} };
  const logger = {
    info: (...args) => console.log('[agent3-renewal-job]', jobId, ...args),
    warn: (...args) => console.warn('[agent3-renewal-job]', jobId, ...args),
    error: (...args) => console.error('[agent3-renewal-job]', jobId, ...args),
  };

  let executor;
  try {
    executor = new Agent3SelfRenewalExecutor({
      logger, messageBus, auditLog, clock,
      productScope,
      environment: process.env.NODE_ENV === 'production' ? 'prd' : 'staging',
      hot, cold,
    });
  } catch (e) {
    return { ok: false, error: 'executor_construct_failed', detail: String(e?.message ?? e), jobId };
  }

  try {
    const result = await executor.executeRemediation(issue, mode, {
      productScope, runId, sourceHints,
    });
    return { ok: true, jobId, result };
  } catch (e) {
    return { ok: false, error: 'executor_threw', detail: String(e?.message ?? e), jobId };
  }
}

// Lazy serve handler — used by /api/inngest. Tries the lambda adapter first
// (best fit for Vercel's serverless runtime), falls back to express adapter
// if needed.
export async function getServeHandler() {
  const client = await getClient();
  const functions = await getInngestFunctions();
  let serve;
  try {
    ({ serve } = await import('inngest/lambda'));
  } catch {
    ({ serve } = await import('inngest/express'));
  }
  return serve({
    client, functions,
    signingKey: process.env.INNGEST_SIGNING_KEY,
  });
}

// Public client accessor (sync) for orchestrator agent. Returns null when
// Inngest is disabled — agent will short-circuit gracefully.
export function getInngestSync() {
  return _client;
}
