// api/agent/3/execute.js
//
// Sync endpoint for Agent #3 Self-Renewal Executor (Path X MVP per
// CEO disposition Q4 = (c) combined). POST-only.
//
// Body schema:
//   {
//     productScope: string,   // e.g. 'flowai' | 'saige' | 'reltwin' ...
//     issue:        object,   // W2.Issue per api/_lib/issueDetector.js
//     mode:         'recommend_only' | 'fork_and_fix',
//     runId?:       string,
//     sourceHints?: object,
//   }
//
// Behavior:
//   - 405 on non-POST
//   - 400 on body validation error
//   - 401 when auth context cannot be established
//   - 403 when caller's productScope claim differs from body productScope (RLS gate
//     per Rev-2.1 §13). Same body+claim matching pattern used by all multi-tenant
//     endpoints.
//   - 200 with executor envelope on synchronous completion
//   - 202 with { jobId, async: true } when:
//       (a) execution exceeds 25s (returns control to client; Inngest job
//           continues in background and emits agent.deploy progress events), OR
//       (b) Inngest is enabled AND body explicitly requested async via
//           ?async=1 query param.
//   - 500 on internal failure (executor threw)
//
// RLS (Rev-2.1 §13): caller's authenticated productScope MUST match the body's
// productScope. The MVP auth model accepts either:
//   - x-flowai-internal: true + Authorization: Bearer ${FLOWAI_INTERNAL_SECRET}
//     for AutoRunner self-calls (trust internal callers)
//   - x-product-scope header matching body productScope for end-user calls
// JWT/Supabase decoding is a Production Hardening track item — out of MVP scope.

import { Agent3SelfRenewalExecutor } from '../../../src/lib/agents/agents/Agent3SelfRenewalExecutor.js';
import * as remediationEngine from '../../_lib/remediationEngine.js';
import verificationAdapters from '../../../src/lib/agents/verificationAdapters.js';
import { getServerMessageBus } from '../../_lib/messageBus.js';

const SYNC_TIMEOUT_MS = 25_000;
const SSE_SOFT_TIMEOUT_MS = 240_000;
const SSE_HEARTBEAT_MS = 15_000;
const SSE_PHASE_B_OVERALL_BUDGET_MS = 45_000;
const SSE_PHASE_B_PER_PAGE_BUDGET_MS = 20_000;
const SSE_PHASE_B_MAX_INTERACTIVES = 20;
const SSE_EVALUATION_TIER = 'TIER_1';
const ALLOWED_MODES = new Set(['recommend_only', 'fork_and_fix']);

export default async function handler(req, res) {
  // Method gate.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'invalid_json', detail: String(e?.message ?? e) });
  }

  // ── SSE branch (DISPATCH 13) ────────────────────────────────────────────────
  // When the request advertises Accept: text/event-stream, route to the
  // dispatch-24 product-agnostic orchestrator and stream step logs +
  // iteration results + final result as Server-Sent Events. This is the
  // interactive entry point used by src/pages/FlowAIDashboard.jsx —
  // bypasses the productScope+issue validation that the JSON path
  // requires, since the orchestrator handles PATH B (unknown URL) end-
  // to-end without an operator-registered product.
  const acceptHeader = String(req.headers?.accept || '').toLowerCase();
  if (acceptHeader.includes('text/event-stream')) {
    return runSseOrchestration(req, res, body);
  }

  // Body validation.
  const productScope = typeof body.productScope === 'string' ? body.productScope : null;
  const issue = body.issue && typeof body.issue === 'object' ? body.issue : null;
  const mode = typeof body.mode === 'string' ? body.mode : 'recommend_only';
  const runId = typeof body.runId === 'string' ? body.runId : null;
  const sourceHints = body.sourceHints && typeof body.sourceHints === 'object' ? body.sourceHints : null;
  // Extension A — Self-Renewal Phase A Option C entry point. When the
  // body carries a githubRepoUrl, the handler routes to executeOptionC()
  // (the Phase A end-to-end pipeline) instead of executeRemediation()
  // (the v3 Mode 2 fork-and-fix path).
  const githubRepoUrl =
    typeof body.githubRepoUrl === 'string' && body.githubRepoUrl
      ? body.githubRepoUrl
      : null;

  if (!productScope) {
    return res.status(400).json({ ok: false, error: 'missing_field', field: 'productScope' });
  }
  if (!issue) {
    return res.status(400).json({ ok: false, error: 'missing_field', field: 'issue' });
  }
  if (!ALLOWED_MODES.has(mode)) {
    return res.status(400).json({ ok: false, error: 'invalid_mode', allowed: [...ALLOWED_MODES] });
  }
  if (typeof issue.severity !== 'string' || !['critical', 'high', 'medium'].includes(issue.severity)) {
    return res.status(400).json({
      ok: false, error: 'invalid_issue_severity',
      allowed: ['critical', 'high', 'medium'],
    });
  }

  // RLS / auth gate.
  const auth = resolveAuthContext(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }
  if (!auth.internal && auth.productScope !== productScope) {
    return res.status(403).json({
      ok: false,
      error: 'productScope_mismatch',
      detail: 'caller authenticated productScope differs from body productScope',
    });
  }

  // Async hand-off requested explicitly?
  const wantAsync = req.query?.async === '1' || req.query?.async === 1;
  if (wantAsync) {
    const enqueued = await tryEnqueueInngest({ productScope, issue, mode, runId, sourceHints, githubRepoUrl });
    if (enqueued.ok) {
      return res.status(202).json({
        ok: true, async: true, jobId: enqueued.jobId, hint: 'poll status via /api/agent/3/status?jobId=<id>',
      });
    }
    // Fall through to sync if Inngest disabled — the caller still wanted async
    // but we can't queue, so we serve sync with a marker.
  }

  // Construct executor with stub deps for the MVP path. Production wiring
  // replaces these stubs with real HotStore / ColdStore / MessageBus
  // instances bound to Supabase + Redis.
  let executor;
  try {
    executor = buildExecutor({ productScope });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'executor_construct_failed', detail: String(e?.message ?? e) });
  }

  // Race execution against the sync timeout. If we exceed 25s, enqueue
  // Inngest to continue in background and return 202.
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ __timeout: true }), SYNC_TIMEOUT_MS);
  });

  // Extension B — route to executeOptionC (Phase A pipeline) when
  // githubRepoUrl is present; otherwise fall through to the existing
  // executeRemediation (v3 Mode 2) path. The two paths return shapes
  // that look the same at the envelope level (`ok` field on top), so
  // downstream timeout / error handling is unchanged.
  const remediationCall = githubRepoUrl
    ? executor.executeOptionC({ githubRepoUrl, issue, productScope, runId, sourceHints })
    : executor.executeRemediation(issue, mode, { productScope, runId, sourceHints });

  let result;
  try {
    result = await Promise.race([
      remediationCall,
      timeout,
    ]);
  } catch (e) {
    clearTimeout(timer);
    return res.status(500).json({ ok: false, error: 'executor_threw', detail: String(e?.message ?? e) });
  }
  clearTimeout(timer);

  if (result?.__timeout) {
    // Hand off to Inngest if available; otherwise tell the client to retry async.
    const enqueued = await tryEnqueueInngest({ productScope, issue, mode, runId, sourceHints, githubRepoUrl });
    if (enqueued.ok) {
      return res.status(202).json({
        ok: true, async: true, timedOutSync: true, jobId: enqueued.jobId,
        hint: 'sync exceeded 25s — job continues via Inngest. Poll /api/agent/3/status?jobId=<id>',
      });
    }
    return res.status(202).json({
      ok: true, async: true, timedOutSync: true, queued: false,
      hint: 'sync exceeded 25s and Inngest is not configured — retry with ?async=1 when Inngest is wired',
    });
  }

  return res.status(200).json({ ok: true, async: false, result });
}

// ── Internals ────────────────────────────────────────────────────────────────

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

function buildExecutor({ productScope }) {
  // Minimal in-memory deps for MVP. Production replaces these with real
  // adapters bound to Supabase + Redis + Orchestra.
  const clock = { now: () => Date.now() };
  const _hotMap = new Map();
  const hot = {
    get: async (k) => _hotMap.get(k),
    set: async (k, v) => { _hotMap.set(k, v); return v; },
    delete: async (k) => { _hotMap.delete(k); },
  };
  const cold = {
    append: async () => {},
    list: async () => [],
  };
  const messageBus = getServerMessageBus();
  const auditLog = {
    write: async () => {},
  };
  const logger = {
    info: (...args) => console.log('[agent3-executor]', ...args),
    warn: (...args) => console.warn('[agent3-executor]', ...args),
    error: (...args) => console.error('[agent3-executor]', ...args),
  };

  return new Agent3SelfRenewalExecutor({
    logger,
    messageBus,
    auditLog,
    clock,
    productScope,
    environment: process.env.NODE_ENV === 'production' ? 'prd' : 'staging',
    hot,
    cold,
    // remediationEngine: production wiring via api/_lib/remediationEngine.js
    // (Orchestra-powered fork-and-fix or generate-from-scratch → Vercel deploy).
    // The Executor calls remediationEngine.remediate({ issues, productScope,
    // sourceHints }); the module's namespace export satisfies that shape
    // because it exports `remediate()` at the top level.
    remediationEngine,
    // verificationAdapters: production wiring via src/lib/agents/
    // verificationAdapters.js. Provides { issueDetector, orchestraDispatch,
    // claudeNormalize } per verification.js#runVerificationRecrawl contract.
    verificationAdapters,
  });
}

async function tryEnqueueInngest({ productScope, issue, mode, runId, sourceHints, githubRepoUrl }) {
  try {
    const { sendEvent, isInngestEnabled } = await import('../../_lib/inngest.js');
    if (!isInngestEnabled()) {
      return { ok: false, reason: 'inngest_disabled' };
    }
    const jobId = `agent3_${productScope}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await sendEvent('flowai/agent3.renewal.requested', {
      jobId, productScope, issue, mode, runId, sourceHints, githubRepoUrl,
    });
    if (!result?.ok) {
      return { ok: false, reason: result?.reason ?? 'send_failed' };
    }
    return { ok: true, jobId };
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) };
  }
}

// ── SSE handler (DISPATCH 13) ──────────────────────────────────────────────
//
// Streams every step log, every completed iteration, and the final result
// as SSE events with `data: <JSON>\n\n` framing, terminating with
// `data: [DONE]\n\n`. Body fields:
//
//   url:           string|null     — any URL (PATH A registry hit OR PATH B
//                                    universal mode); null → pick from
//                                    product_registry (PATH A only)
//   mode:          'auto'|'guided'|'manual'   (default 'auto')
//   maxIterations: number          (default 10)
//   gtmTarget:     number          (default 95)
//   runId:         string?         — UUID; orchestrator generates one if absent
//
// Auth: any resolved auth context (internal or x-product-scope) is accepted;
// the productScope-matching check is intentionally skipped here because
// PATH B URLs have no registered product to match against. The dashboard
// is the intended caller.
async function runSseOrchestration(req, res, body) {
  // Set SSE headers BEFORE any writes so they're sent on first flush.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    try { res.flushHeaders(); } catch { /* swallow */ }
  }

  const sendEvent = (payload) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch { /* socket closed; orchestrator will detect on next write */ }
  };
  const sendDone = () => {
    try { res.write('data: [DONE]\n\n'); res.end(); } catch { /* ignored */ }
  };

  // Auth (relaxed for SSE — productScope-match check skipped).
  const auth = resolveAuthContext(req);
  if (!auth.ok) {
    sendEvent({ type: 'error', error: auth.error, status: auth.status });
    sendDone();
    return;
  }

  // Parse body fields with defaults per dispatch spec.
  const url = typeof body.url === 'string' && body.url.length > 0 ? body.url : null;
  const mode = ['auto', 'guided', 'manual'].includes(body.mode) ? body.mode : 'auto';
  const maxIterations = Number.isFinite(body.maxIterations) && body.maxIterations > 0
    ? Math.min(body.maxIterations, 50) : 10;
  const gtmTarget = Number.isFinite(body.gtmTarget) && body.gtmTarget >= 0 && body.gtmTarget <= 100
    ? body.gtmTarget : 95;
  const runId = typeof body.runId === 'string' && body.runId.length > 0
    ? body.runId
    : `sse_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  sendEvent({
    type: 'start',
    runId, url, mode, maxIterations, gtmTarget,
    at: new Date().toISOString(),
  });

  // ── Control bridge (DISPATCH 13 follow-up) ───────────────────────────────
  // The orchestrator exposes its OrchestrationState via deps.__exposeState;
  // we capture the reference here and start a small interval poller that
  // reads /api/agent/3/control commands from runControlBus and applies them
  // to the local state. KV-backed with in-memory fallback; commands are
  // applied at the next poll boundary (default 500ms cadence).
  let exposedState = null;
  let controlPoller = null;
  let heartbeat = null;
  let runFinished = false;
  const stepLogs = [];
  const iterations = [];
  heartbeat = setInterval(() => {
    if (!runFinished) {
      sendEvent({ type: 'heartbeat', at: new Date().toISOString() });
    }
  }, SSE_HEARTBEAT_MS);
  heartbeat.unref?.();
  try {
    const { readAndClearCommand } = await import('../../_lib/runControlBus.js');
    // Only poll when we have a runId to poll on. The orchestrator generates
    // one when null is passed; we don't have visibility into that pre-call,
    // so the no-runId case skips the poller and the dashboard's control
    // buttons will be no-ops (which is correct — there's nothing to address).
    const pollRunId = runId;
    if (pollRunId) {
      controlPoller = setInterval(async () => {
        if (runFinished || !exposedState) return;
        let cmd;
        try { cmd = await readAndClearCommand(pollRunId); } catch { return; }
        if (!cmd) return;
        try {
          if (cmd.command === 'pause') {
            // Pause = flip to guided so the orchestrator stops at next checkpoint.
            exposedState.switchMode('guided');
            sendEvent({ type: 'control_applied', command: 'pause', envelopeId: cmd.id, at: new Date().toISOString() });
          } else if (cmd.command === 'resume') {
            exposedState.resume();
            sendEvent({ type: 'control_applied', command: 'resume', envelopeId: cmd.id, at: new Date().toISOString() });
          } else if (cmd.command === 'switchMode' && cmd.mode) {
            exposedState.switchMode(cmd.mode);
            sendEvent({ type: 'control_applied', command: 'switchMode', mode: cmd.mode, envelopeId: cmd.id, at: new Date().toISOString() });
          } else if (cmd.command === 'stop') {
            exposedState.stop();
            sendEvent({ type: 'control_applied', command: 'stop', envelopeId: cmd.id, at: new Date().toISOString() });
          }
        } catch { /* state method missing or already-disposed; ignore */ }
      }, 500);
      // Best-effort timer cleanup if the Node process is shutting down.
      controlPoller.unref?.();
    }
  } catch { /* runControlBus unavailable — controls become no-ops */ }

  let result;
  let softTimeout = null;
  try {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    // Best-effort Supabase client — orchestrator gracefully handles null.
    let supabase = null;
    try {
      const { getSupabase } = await import('../../_lib/supabase.js');
      supabase = getSupabase();
    } catch { /* run without DB → PATH B fast path */ }

    const orchestrationPromise = runOrchestration({
      url, mode, runId, supabase,
      environment: process.env.NODE_ENV === 'production' ? 'prd' : 'staging',
      gtmTarget, maxIterations,
      phaseBOverallBudgetMs: SSE_PHASE_B_OVERALL_BUDGET_MS,
      phaseBPerPageBudgetMs: SSE_PHASE_B_PER_PAGE_BUDGET_MS,
      phaseBMaxInteractives: SSE_PHASE_B_MAX_INTERACTIVES,
      evaluationTier: SSE_EVALUATION_TIER,
      evaluationGotoTimeoutMs: 15_000,
      evaluationPostNavWaitMs: 500,
      onStep: (log) => {
        stepLogs.push(log);
        sendEvent({ type: 'step', log });
      },
      onIteration: (iteration) => {
        iterations.push(iteration);
        sendEvent({ type: 'iteration', iteration });
      },
      deps: { __exposeState: (state) => { exposedState = state; } },
    });
    const timeoutPromise = new Promise((resolve) => {
      softTimeout = setTimeout(() => resolve({ __sseSoftTimeout: true }), SSE_SOFT_TIMEOUT_MS);
    });
    const raced = await Promise.race([orchestrationPromise, timeoutPromise]);
    if (raced?.__sseSoftTimeout) {
      try { exposedState?.stop?.(); } catch { /* best-effort stop */ }
      sendEvent({
        type: 'timeout',
        kind: 'sse_soft_timeout',
        timeoutMs: SSE_SOFT_TIMEOUT_MS,
        at: new Date().toISOString(),
      });
      result = buildSseSoftTimeoutResult({
        runId, url, mode, maxIterations, gtmTarget, stepLogs, iterations,
      });
    } else {
      result = raced;
    }
  } catch (e) {
    runFinished = true;
    if (controlPoller) clearInterval(controlPoller);
    if (heartbeat) clearInterval(heartbeat);
    if (softTimeout) clearTimeout(softTimeout);
    sendEvent({ type: 'error', error: e?.message ?? String(e), code: e?.code ?? 'ORCHESTRATION_FAILED' });
    sendDone();
    return;
  }

  runFinished = true;
  if (controlPoller) clearInterval(controlPoller);
  if (heartbeat) clearInterval(heartbeat);
  if (softTimeout) clearTimeout(softTimeout);
  sendEvent({ type: 'final', result });
  sendDone();
}

// Exported for tests — the handler closure isn't easily testable otherwise.
function scoreFromStepLogs(stepLogs = []) {
  for (let i = stepLogs.length - 1; i >= 0; i -= 1) {
    const log = stepLogs[i];
    const stepResult = log?.result;
    if (!stepResult || typeof stepResult !== 'object') continue;
    const score = stepResult.gtmScore
      ?? stepResult.postScore
      ?? stepResult.preScore
      ?? stepResult.fiveLayerInternal;
    if (typeof score === 'number' && Number.isFinite(score)) {
      return {
        score,
        layers: stepResult.layers && typeof stepResult.layers === 'object'
          ? stepResult.layers
          : null,
      };
    }
  }
  return { score: 0, layers: null };
}

function buildSseSoftTimeoutResult({
  runId,
  url,
  mode,
  maxIterations,
  gtmTarget,
  stepLogs = [],
  iterations = [],
} = {}) {
  const { score, layers } = scoreFromStepLogs(stepLogs);
  return {
    ok: false,
    partial: true,
    timedOut: true,
    timeoutMs: SSE_SOFT_TIMEOUT_MS,
    exitReason: 'SOFT_TIMEOUT_PARTIAL_RESULTS',
    runId,
    url,
    mode,
    maxIterations,
    gtmTarget,
    originalScore: score,
    finalScore: score,
    rawScore: score,
    effectiveTrustScore: score,
    totalDelta: 0,
    gtmReady: false,
    iterationsCompleted: iterations.length,
    iterations,
    orchestrationLog: stepLogs,
    latestLayers: layers,
    skippedSteps: [{
      step: 'remaining_orchestration',
      reason: 'sse_soft_timeout',
      detail: `Agent #3 execute reached ${SSE_SOFT_TIMEOUT_MS / 1000}s soft timeout and returned partial streamed results before Vercel hard timeout.`,
    }],
  };
}

export const __test = Object.freeze({
  resolveAuthContext,
  buildExecutor,
  runSseOrchestration,
  buildSseSoftTimeoutResult,
  scoreFromStepLogs,
  SYNC_TIMEOUT_MS,
  SSE_SOFT_TIMEOUT_MS,
  SSE_HEARTBEAT_MS,
  SSE_PHASE_B_OVERALL_BUDGET_MS,
  SSE_PHASE_B_PER_PAGE_BUDGET_MS,
  SSE_PHASE_B_MAX_INTERACTIVES,
  SSE_EVALUATION_TIER,
  ALLOWED_MODES,
});
