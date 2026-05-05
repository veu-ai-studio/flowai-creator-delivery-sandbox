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

  _functions = fns;
  return _functions;
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
