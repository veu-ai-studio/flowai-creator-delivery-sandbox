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

import { Inngest } from 'inngest';

let cached = null;

export function isInngestEnabled() {
  if (process.env.INNGEST_BACKEND === 'inline') return false;
  return Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
}

export function getInngest() {
  if (cached) return cached;
  // Inngest's client doesn't blow up without keys — it falls back to dev mode.
  cached = new Inngest({
    id: 'flowai',
    name: 'FlowAI / VEUaaS',
    eventKey: process.env.INNGEST_EVENT_KEY,
  });
  return cached;
}

export async function sendEvent(name, data = {}, { user, ts } = {}) {
  if (!isInngestEnabled()) {
    // No-op in inline mode — caller runs the work directly.
    return { ok: false, reason: 'inngest disabled', enabled: false };
  }
  try {
    const result = await getInngest().send({
      name,
      data,
      user: user || undefined,
      ts: ts || Date.now(),
    });
    return { ok: true, ids: result?.ids || [], enabled: true };
  } catch (e) {
    return { ok: false, reason: e.message || String(e), enabled: true };
  }
}

// ─── Function definitions ────────────────────────────────────────────────

const inngest = getInngest();

// Auto Runner step executor: triggered by `flowai/run-step.requested`.
// Payload: { step, input, objective, priorResults?, sessionId, orgId, productId, mode }
export const autoRunnerStepExecutor = inngest.createFunction(
  { id: 'auto-runner-step-executor', name: 'Auto Runner step executor', retries: 2 },
  { event: 'flowai/run-step.requested' },
  async ({ event, step }) => {
    const { runStepInline } = await import('./jobs/runStep.js');
    return await step.run('execute', () => runStepInline(event.data));
  },
);

// Scheduled clearance check: cron-driven, runs the clearance protocol on a
// product and persists the result. Payload: { productId, orgId, url? }
export const scheduledClearanceCheck = inngest.createFunction(
  { id: 'scheduled-clearance-check', name: 'Scheduled clearance check', retries: 1 },
  { event: 'flowai/clearance.scheduled' },
  async ({ event, step }) => {
    const { runScheduledClearance } = await import('./jobs/scheduledClearance.js');
    return await step.run('clearance', () => runScheduledClearance(event.data));
  },
);

// Daily cost rollup: aggregates the previous 24h of cost events per org.
// Triggered by Inngest's cron expression.
export const costRollupDaily = inngest.createFunction(
  { id: 'cost-rollup-daily', name: 'Daily cost rollup' },
  { cron: '0 2 * * *' }, // 02:00 UTC daily
  async ({ step }) => {
    const { rollupYesterdayCosts } = await import('./jobs/costRollup.js');
    return await step.run('rollup', () => rollupYesterdayCosts());
  },
);

export const inngestFunctions = [
  autoRunnerStepExecutor,
  scheduledClearanceCheck,
  costRollupDaily,
];
