/* eslint-env node */
/* global process */

// src/api/run-construction.js — W5b TRACK B
//
// Canonical Construction-Engine route. Replaces the legacy src/api/run.js
// stub (which fabricated fake vercel.app URLs at line 33) with a real
// invocation of the FlowAI Self-Renewal orchestrator. Closes the J2
// (UI-CONSTRUCT) gap surfaced by the 2026-05-20 emergency Panel:
// the UI can now drive a full PATH A construction cycle end-to-end
// without operator pre-registration.
//
// Contract:
//   POST /api/run-construction
//   Body: { url: string, mode: 'FOREGROUND'|'BACKGROUND'|'GUIDED'|'MANUAL'|'MIGRATION'|'FRESH_BUILD', structuralLayer?, operationalMode?, analysisDepth?, flowHubPath? }
//
//   Always responds as Server-Sent Events. Stream events:
//     - { type: 'start',  runId, url, mode, gtmTarget, at }
//     - { type: 'step',   log }            // orchestrator onStep envelope
//     - { type: 'iteration', iteration }   // orchestrator onIteration envelope
//     - { type: 'final',  previewUrl, finalScore, governanceRecordId,
//                         gtmReady, exitReason, iterationsCompleted, runId }
//     - { type: 'error',  error, code }    // terminal; followed by [DONE]
//   Terminator: `data: [DONE]\n\n`
//
// Mode semantics:
//   FOREGROUND — orchestrator runs in 'auto' (no checkpoints); client
//                keeps the SSE socket open until 'final'.
//   BACKGROUND — orchestrator runs in 'auto'; behaves identically over
//                the wire today (the BG hint is reserved for a follow-on
//                that detaches the run from the request lifecycle and
//                rejoins via /api/agent/3/control). The early 'start'
//                event carries the runId so BG callers can correlate.
//   GUIDED     — orchestrator runs in 'guided'; pauses at every
//                checkpoint. Resume is via /api/agent/3/control (already
//                wired in api/agent/3/execute.js's runSseOrchestration).
//
// product_registry behavior:
//   For arbitrary URLs the caller hasn't pre-registered, this route
//   upserts a stable product_registry row keyed by sha256(url). That
//   gives the orchestrator a PATH A target — same shape as operator-
//   registered products — so the run participates in audit-trail and
//   governance writes (product_ssot.governance_record). When Supabase
//   is not configured the upsert is skipped and the orchestrator falls
//   through to PATH B (universal mode) — the run still executes, but
//   without a persisted governance record (governanceRecordId still
//   returned as runId for SSE-consumer correlation).

import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { rateLimit } from './_lib/rateLimit.js';
import { getMigrationModeFlag } from '../lib/runtimeFeatureFlags.js';
import { findRegisteredProductConfigForUrl } from '../lib/products/registeredProductConfig.js';
import { createGithubMigrationHooks } from '../lib/migration/githubMigrationHooks.js';
import { pickSafeErrorFields } from '../lib/migration/safeErrorFields.js';
import {
  effortOverridesForAnalysisDepth,
  normalizeFlowHubAxes,
  orchestratorModeForAxes,
} from '../lib/flowHubAxes.js';
import {
  persistSymbioticRunSummary,
  readProductSsotRunContext,
} from '../lib/forge/productSsotContinuity.js';
import { assertPublicHttpUrl } from '../../api/_lib/crawler.js';
import { isInngestEnabled, sendEvent, syncInngestRegistration } from '../../api/_lib/inngest.js';
import {
  appendForgeRunEvent,
  initializeForgeRunStatus,
  markForgeRunFailed,
  markForgeRunStarted,
} from '../../api/_lib/forgeRunStatusBus.js';

const ALLOWED_MODES = new Set(['FOREGROUND', 'BACKGROUND', 'GUIDED', 'MANUAL', 'MIGRATION', 'FRESH_BUILD']);
const GTM_TARGET = 95;
const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const VERCEL_RUN_CONSTRUCTION_HARD_TIMEOUT_MS = 800_000;
const VERCEL_RUN_CONSTRUCTION_STREAM_LIMIT_MS = 450_000;
const RUN_CONSTRUCTION_TIMEOUT_BUFFER_MS = 30_000;
const DEFAULT_RUN_CONSTRUCTION_SSE_SOFT_TIMEOUT_MS = 420_000;
const DEFAULT_RUN_CONSTRUCTION_BACKGROUND_TIMEOUT_MS = 720_000;
const execFileAsync = promisify(execFile);

function freshBuildFinalStatus(result) {
  if (result?.ok === true) return 'succeeded';
  if (result?.status === 'failed' || result?.status === 'BLOCKED') return 'failed';
  return 'partial';
}

function freshBuildFailureFromError(error, stage = 'fresh_build') {
  return {
    stage,
    code: error?.code ?? 'FRESH_BUILD_THREW',
    message: String(error?.message ?? error ?? 'Fresh Build failed').slice(0, 400),
    deploymentId: error?.deploymentId || null,
    readyState: error?.readyState || null,
    attempts: Number.isFinite(error?.attempts) ? error.attempts : null,
  };
}

function configuredRunConstructionSoftTimeoutMs(env = process.env) {
  const configured = Number(env?.FLOWAI_RUN_CONSTRUCTION_SSE_SOFT_TIMEOUT_MS);
  const requested = Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_RUN_CONSTRUCTION_SSE_SOFT_TIMEOUT_MS;
  const maximum = Math.min(
    VERCEL_RUN_CONSTRUCTION_HARD_TIMEOUT_MS - RUN_CONSTRUCTION_TIMEOUT_BUFFER_MS,
    VERCEL_RUN_CONSTRUCTION_STREAM_LIMIT_MS - RUN_CONSTRUCTION_TIMEOUT_BUFFER_MS,
  );
  return Math.max(1_000, Math.min(requested, maximum));
}

function configuredRunConstructionBackgroundTimeoutMs(env = process.env) {
  const configured = Number(env?.FLOWAI_RUN_CONSTRUCTION_BACKGROUND_TIMEOUT_MS);
  const requested = Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_RUN_CONSTRUCTION_BACKGROUND_TIMEOUT_MS;
  const maximum = VERCEL_RUN_CONSTRUCTION_HARD_TIMEOUT_MS - RUN_CONSTRUCTION_TIMEOUT_BUFFER_MS;
  return Math.max(1_000, Math.min(requested, maximum));
}

function latestRunConstructionStep(stepLogs = []) {
  if (!Array.isArray(stepLogs) || stepLogs.length === 0) return null;
  const last = stepLogs[stepLogs.length - 1];
  return {
    step: last?.step ?? null,
    status: last?.status ?? null,
    tool: last?.tool ?? null,
    kind: last?.result?.kind ?? last?.kind ?? null,
    why: last?.why ?? null,
  };
}

function sanitizeCheckpointKey(value) {
  return String(value ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unknown';
}

function userFacingForgeStepFromLog(log = {}) {
  const status = typeof log.status === 'string' ? log.status : null;
  const result = log.result && typeof log.result === 'object' ? log.result : {};
  if (result.kind === 'forge.user_step.v1') {
    const userStep = Number(result.userStep);
    if (!Number.isFinite(userStep) || userStep < 1 || userStep > 8) return null;
    return {
      userStep,
      key: typeof result.key === 'string' ? result.key : `user_step_${userStep}`,
      status,
    };
  }
  if (status !== 'complete') return null;

  const numericStep = Math.floor(Number(log.step));
  if (!Number.isFinite(numericStep)) return null;
  if (numericStep >= 1 && numericStep <= 3) {
    return { userStep: 1, key: 'research_analysis', status };
  }
  if (numericStep === 4) {
    return { userStep: 2, key: 'quality_adversarial_surface', status };
  }
  if (numericStep === 5) {
    return { userStep: 3, key: 'design_scoring_handoff', status };
  }
  if (numericStep >= 6 && numericStep <= 9) {
    return { userStep: 4, key: 'build_planning_prioritization', status };
  }
  if (numericStep === 10) {
    return { userStep: 5, key: 'deploy', status };
  }
  if (numericStep === 11) {
    return { userStep: 6, key: 'self_renewal', status };
  }
  if (numericStep >= 12 && numericStep <= 13) {
    return { userStep: 7, key: 'gtm', status };
  }
  if (numericStep >= 14) {
    return { userStep: 8, key: 'monitor', status };
  }
  return null;
}

function statusEventCheckpointName(event) {
  if (event?.type !== 'step') return null;
  const mapped = userFacingForgeStepFromLog(event.log);
  if (!mapped) return null;
  if (!['complete', 'degraded', 'scaffold'].includes(mapped.status)) return null;
  return `forge-user-step-${mapped.userStep}-${sanitizeCheckpointKey(mapped.key)}`;
}

function buildRunConstructionSoftTimeoutFinal({
  runId,
  url,
  mode,
  orchestratorMode,
  gtmTarget,
  timeoutMs,
  stepLogs = [],
  iterations = [],
  productSsotContext = null,
  registryRow = null,
} = {}) {
  const completedSteps = Array.isArray(stepLogs)
    ? stepLogs.filter((log) => log?.status === 'complete').length
    : 0;
  const lastStep = latestRunConstructionStep(stepLogs);
  return {
    type: 'final',
    final: true,
    ok: false,
    complete: false,
    partial: true,
    timedOut: true,
    timeoutMs,
    exitReason: 'SSE_SOFT_TIMEOUT',
    code: 'SSE_SOFT_TIMEOUT',
    previewUrl: null,
    originalProductUrl: url ?? null,
    finalScore: null,
    governanceRecordId: runId ?? null,
    productId: registryRow?.product_id ?? null,
    productSsotContext: productSsotContext ? {
      hasPriorRun: productSsotContext.hasPriorRun,
      priorRunCount: productSsotContext.priorRunCount,
      sourceVersion: productSsotContext.sourceVersion,
      sourceHash: productSsotContext.sourceHash,
      latestDeliveryArtifactUrl: productSsotContext.latestDeliveryArtifactUrl,
    } : null,
    symbioticLoop: {
      persisted: null,
      state: 'in_progress_timeout',
      version: null,
      reason: 'sse_soft_timeout_before_summary_write',
    },
    gtmReady: false,
    iterationsCompleted: Array.isArray(iterations) ? iterations.length : 0,
    stepsCompleted: completedSteps,
    lastStep,
    lastKnownState: {
      stepLogs: Array.isArray(stepLogs) ? stepLogs.length : 0,
      iterations: Array.isArray(iterations) ? iterations.length : 0,
      productId: registryRow?.product_id ?? null,
      mode: orchestratorMode ?? mode ?? null,
    },
    prUrl: null,
    dimensions_contributing: null,
    rawScore: null,
    effectiveTrustScore: null,
    coverageConfidence: null,
    scoredDimensions: null,
    totalDimensions: null,
    meetsMinimumCoverage: null,
    minimumScoredDimensionsForGTM: 7,
    coverageDisclosure: 'Run returned a partial terminal result before the serverless hard timeout; remaining scoring evidence was not fabricated.',
    runMode: null,
    universalMode: false,
    autoFixAvailable: false,
    registerCTA: false,
    operatorMode: null,
    operatorRepoAccess: null,
    findingsCount: null,
    findingsSeverity: null,
    deepBrowserAnalysis: null,
    fixProposals: [],
    sourceMapping: null,
    sourceMappedFixProposals: [],
    transformationDelta: null,
    skippedSteps: [{
      step: 'remaining_orchestration',
      reason: 'sse_soft_timeout',
      detail: `run-construction reached ${Math.round(timeoutMs / 1000)}s soft timeout and returned partial streamed results before the platform hard timeout.`,
    }],
    migration: null,
    migrationModeDisabled: false,
    migrationMessage: null,
    runId,
    gtmTarget,
  };
}

function emitRunConstructionSoftTimeoutFinal({ send, done, payload }) {
  send(payload);
  done();
  return payload;
}

export async function runConstructionHandler(req, res, { internalBackgroundJob = false } = {}) {
  // CORS / preflight.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  // Anonymous public submit stays anonymous — we throttle by IP, never by
  // session cookie. Internal callers bearing a valid CRON_SECRET bypass
  // (Vercel Cron and operator-triggered re-runs).
  const verdict = await rateLimit(req, {
    capacity: RATE_LIMIT_CAPACITY,
    windowMs: RATE_LIMIT_WINDOW_MS,
    bucket: 'run-construction',
  });
  res.setHeader('X-RateLimit-Limit', String(verdict.limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, verdict.remaining)));
  res.setHeader('X-RateLimit-Backend', verdict.backend);
  if (!verdict.allowed) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Retry-After', String(verdict.retryAfterSec));
    res.statusCode = 429;
    return res.end(JSON.stringify({
      ok: false,
      error: 'rate_limited',
      detail: `Limit ${verdict.limit} req/hr per IP. Retry in ${verdict.retryAfterSec}s.`,
      retryAfterSec: verdict.retryAfterSec,
    }));
  }

  // Body parse.
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'invalid_json', detail: String(e?.message ?? e) }));
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const rawMode = typeof body.mode === 'string' ? body.mode.toUpperCase() : 'FOREGROUND';
  let mode = ALLOWED_MODES.has(rawMode) ? rawMode : 'FOREGROUND';
  let flowHubAxes = normalizeFlowHubAxes({
    structuralLayer: body.structuralLayer ?? body.systemOperationLevel,
    operationalMode: body.operationalMode ?? body.opsMode,
    analysisDepth: body.analysisDepth ?? body.depth,
    flowHubPath: body.flowHubPath,
    mode,
  });
  if (flowHubAxes.flowHubPath === 'migration') {
    mode = 'MIGRATION';
  } else if (flowHubAxes.flowHubPath === 'fresh_build') {
    mode = 'FRESH_BUILD';
  } else if (mode === 'MANUAL') {
    flowHubAxes = normalizeFlowHubAxes({ ...flowHubAxes, operationalMode: 'manual' });
  } else if (mode === 'GUIDED') {
    flowHubAxes = normalizeFlowHubAxes({ ...flowHubAxes, operationalMode: 'guided' });
  } else if (flowHubAxes.structuralLayer === 'controlled' || flowHubAxes.operationalMode === 'manual') {
    mode = 'MANUAL';
  } else if (flowHubAxes.structuralLayer === 'supervised' || flowHubAxes.operationalMode === 'guided') {
    mode = 'GUIDED';
  }

  const hasFreshBuildDescription = mode === 'FRESH_BUILD' && description.length > 0;
  if ((!url || !/^https?:\/\//i.test(url)) && !hasFreshBuildDescription) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'invalid_input', detail: 'body.url must be an http(s) URL, or Fresh Build must include a description' }));
  }

  if (url) {
    const publicUrlVerdict = await assertPublicHttpUrl(url).catch((error) => ({
      ok: false,
      reason: error?.message ?? String(error),
    }));
    if (!publicUrlVerdict.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      return res.end(JSON.stringify({
        ok: false,
        error: 'ssrf_blocked_url',
        detail: publicUrlVerdict.reason,
      }));
    }
  }

  // ── SSE preamble ─────────────────────────────────────────────────────────
  if (!internalBackgroundJob && mode === 'BACKGROUND') {
    if (!isInngestEnabled()) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 503;
      return res.end(JSON.stringify({
        ok: false,
        error: 'async_not_configured',
        detail: 'Background Forge requires INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY, and INNGEST_BACKEND=inngest.',
        inngestReady: false,
      }));
    }

    void syncInngestRegistration()
      .then((sync) => {
        if (!sync?.ok) {
          console.warn('[flowai] Inngest registration sync at-risk before background queue', {
            atRisk: true,
            reason: sync?.reason || 'unknown',
            status: sync?.status || null,
            method: sync?.method || null,
          });
        }
      })
      .catch((error) => {
        console.warn('[flowai] Inngest registration sync failed before background queue', {
          atRisk: true,
          message: error?.message || String(error),
        });
      });

    const queuedRunId = typeof body.runId === 'string' && body.runId.trim()
      ? body.runId.trim()
      : randomUUID();
    const statusWrite = await initializeForgeRunStatus({
      runId: queuedRunId,
      url,
      mode: 'BACKGROUND',
    });
    const queued = await sendEvent('flowai/forge.run.requested', {
      runId: queuedRunId,
      body: {
        ...body,
        url,
        description,
        mode: 'FOREGROUND',
        structuralLayer: flowHubAxes.structuralLayer,
        operationalMode: flowHubAxes.operationalMode,
        analysisDepth: flowHubAxes.analysisDepth,
        flowHubPath: flowHubAxes.flowHubPath,
      },
    });
    if (!queued.ok) {
      await markForgeRunFailed(queuedRunId, Object.assign(new Error(queued.reason || 'Inngest send failed'), {
        code: 'INNGEST_SEND_FAILED',
      }));
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 502;
      return res.end(JSON.stringify({
        ok: false,
        error: 'background_queue_failed',
        detail: queued.reason || 'Inngest send failed',
        runId: queuedRunId,
        transport: statusWrite.transport,
      }));
    }

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 202;
    return res.end(JSON.stringify({
      ok: true,
      async: true,
      runId: queuedRunId,
      status: 'queued',
      statusUrl: `/api/run-construction-status?runId=${encodeURIComponent(queuedRunId)}`,
      transport: statusWrite.transport,
      inngestReady: true,
      flowHubAxes,
      eventIds: queued.ids || [],
    }));
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    try { res.flushHeaders(); } catch { /* ignore */ }
  }

  let terminalSent = false;
  let exposedState = null;
  let clientClosed = false;
  const send = (payload) => {
    try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch { /* socket closed */ }
  };
  const done = () => {
    terminalSent = true;
    try { res.write('data: [DONE]\n\n'); res.end(); } catch { /* ignore */ }
  };
  const stopExposedState = () => {
    try { exposedState?.stop?.(); } catch { /* best-effort stop */ }
  };
  if (typeof res.on === 'function') {
    res.on('close', () => {
      clientClosed = true;
      if (!terminalSent) stopExposedState();
    });
  }

  // Best-effort Supabase. When unavailable, the orchestrator falls through
  // to PATH B; we skip the registry upsert and report governanceRecordId
  // as the runId so the SSE consumer still has a correlation handle.
  const runId = typeof body.runId === 'string' && body.runId.trim()
    ? body.runId.trim()
    : randomUUID();
  const migrationFlag = mode === 'MIGRATION'
    ? await getMigrationModeFlag()
    : { enabled: false, source: 'not_checked' };

  if (mode === 'MIGRATION' && !migrationFlag.enabled) {
    send({
      type: 'start',
      runId, url, mode, flowHubAxes, gtmTarget: GTM_TARGET,
      supabase: 'not_used',
      at: new Date().toISOString(),
    });
    send({
      type: 'final',
      final: true,
      previewUrl: null,
      finalScore: 0,
      governanceRecordId: runId,
      gtmReady: false,
      exitReason: 'MIGRATION_MODE_DISABLED',
      iterationsCompleted: 0,
      prUrl: null,
      runMode: 'MIGRATION_DISABLED',
      migrationModeDisabled: true,
      migrationMessage: 'Migration Mode is currently disabled.',
      migrationFlagSource: migrationFlag.source,
      runId,
    });
    return done();
  }

  const supabase = await loadSupabaseClient();

  send({
    type: 'start',
    runId, url, mode, flowHubAxes, gtmTarget: GTM_TARGET,
    supabase: supabase ? 'connected' : 'unavailable',
    at: new Date().toISOString(),
  });

  // ── ensureProductRegistryRow (upsert keyed by sha256(url)) ───────────────
  let registryRow = null;
  try {
    registryRow = url ? await ensureProductRegistryRow({ url, supabase }) : null;
    if (registryRow) {
      send({
        type: 'registry',
        action: registryRow.__created ? 'created' : 'reused',
        productId: registryRow.product_id,
      });
    } else if (!url) {
      send({ type: 'registry', action: 'skipped', reason: 'description_only_fresh_build' });
    }
  } catch (e) {
    // Upsert failures are non-fatal — the orchestrator can still run via
    // PATH B. Surface the reason on the wire for operator visibility.
    send({ type: 'registry', action: 'skipped', reason: (e?.message ?? String(e)).slice(0, 200) });
  }

  const environment = process.env.NODE_ENV === 'production' ? 'prd' : 'staging';
  let productSsotContext = null;
  if (registryRow?.product_id) {
    const continuityRead = await readProductSsotRunContext({
      productId: registryRow.product_id,
      environment,
      supabase,
    });
    productSsotContext = continuityRead.context;
    send({
      type: 'symbiotic_context',
      productId: registryRow.product_id,
      ok: continuityRead.ok,
      reason: continuityRead.reason,
      context: productSsotContext,
    });
  } else {
    send({
      type: 'symbiotic_context',
      productId: null,
      ok: false,
      reason: supabase ? 'no_product_registry_row' : 'supabase_unavailable',
      context: null,
    });
  }

  // ── Orchestrator invocation ──────────────────────────────────────────────
  if (mode === 'FRESH_BUILD') {
    let runFreshBuild;
    try {
      ({ runFreshBuild } = await import('../lib/freshBuild/freshBuildOrchestrator.js'));
    } catch (e) {
      send({
        type: 'error',
        error: (e?.message ?? String(e)).slice(0, 200),
        code: 'FRESH_BUILD_IMPORT_FAILED',
        ...pickSafeErrorFields(e),
      });
      return done();
    }

    try {
      const productConfig = url ? findRegisteredProductConfigForUrl(url) : null;
      const freshBuildResult = await runFreshBuild({
        url,
        description,
        runId,
        productName: productConfig?.name || registryRow?.product_name || registryRow?.product_id || body.productName || null,
        productConfig: productConfig || registryRow || null,
      }, {
        env: process.env,
        runId,
        onStep: (log) => send({ type: 'step', log }),
      });

      send({
        type: 'final',
        final: true,
        ok: freshBuildResult?.ok === true,
        status: freshBuildFinalStatus(freshBuildResult),
        previewUrl: freshBuildResult?.previewUrl ?? null,
        previewAccessStatus: freshBuildResult?.previewAccessStatus ?? null,
        scoreStatus: freshBuildResult?.scoreStatus ?? null,
        baselineScore: typeof freshBuildResult?.baselineScore === 'number' ? freshBuildResult.baselineScore : null,
        finalScore: typeof freshBuildResult?.finalScore === 'number' ? freshBuildResult.finalScore : null,
        scoreDelta: typeof freshBuildResult?.scoreDelta === 'number' ? freshBuildResult.scoreDelta : null,
        governanceRecordId: runId,
        gtmReady: false,
        exitReason: freshBuildResult?.reason || freshBuildResult?.status || 'FRESH_BUILD_COMPLETE',
        failureStage: freshBuildResult?.failureStage || freshBuildResult?.failure?.stage || null,
        failure: freshBuildResult?.failure || null,
        code: freshBuildResult?.failure?.code || freshBuildResult?.reason || null,
        error: freshBuildResult?.failure?.message || null,
        deploymentId: freshBuildResult?.writeResult?.deploymentId || freshBuildResult?.failure?.deploymentId || null,
        iterationsCompleted: 0,
        prUrl: freshBuildResult?.writeResult?.prUrl ?? null,
        runMode: 'FRESH_BUILD',
        freshBuild: {
          status: freshBuildResult?.status || null,
          reason: freshBuildResult?.reason || null,
          featureFlag: freshBuildResult?.featureFlag || 'FLOWAI_ENABLE_FRESH_BUILD',
          evidence: freshBuildResult?.evidence || null,
          designEvidence: freshBuildResult?.evidence?.designEvidence || null,
          previewAccessStatus: freshBuildResult?.previewAccessStatus ?? null,
          previewAccess: freshBuildResult?.previewAccess ?? null,
          scoreStatus: freshBuildResult?.scoreStatus ?? null,
          baselineScore: typeof freshBuildResult?.baselineScore === 'number' ? freshBuildResult.baselineScore : null,
          finalScore: typeof freshBuildResult?.finalScore === 'number' ? freshBuildResult.finalScore : null,
          scoreDelta: typeof freshBuildResult?.scoreDelta === 'number' ? freshBuildResult.scoreDelta : null,
          platformDependencies: freshBuildResult?.platformDependencies || [],
          writeResult: freshBuildResult?.writeResult || null,
          failure: freshBuildResult?.failure || null,
        },
        runId,
      });
      return done();
    } catch (e) {
      send({
        type: 'final',
        final: true,
        ok: false,
        status: 'failed',
        previewUrl: null,
        previewAccessStatus: null,
        scoreStatus: 'SCORE_NOT_ATTEMPTED',
        baselineScore: null,
        finalScore: null,
        scoreDelta: null,
        governanceRecordId: runId,
        gtmReady: false,
        exitReason: e?.code ?? 'FRESH_BUILD_THREW',
        failureStage: e?.failureStage || 'fresh_build',
        failure: freshBuildFailureFromError(e, e?.failureStage || 'fresh_build'),
        code: e?.code ?? 'FRESH_BUILD_THREW',
        error: (e?.message ?? String(e)).slice(0, 400),
        deploymentId: e?.deploymentId || null,
        iterationsCompleted: 0,
        prUrl: null,
        runMode: 'FRESH_BUILD',
        freshBuild: {
          status: 'failed',
          reason: e?.code ?? 'FRESH_BUILD_THREW',
          featureFlag: 'FLOWAI_ENABLE_FRESH_BUILD',
          evidence: null,
          designEvidence: null,
          previewAccessStatus: null,
          previewAccess: null,
          scoreStatus: 'SCORE_NOT_ATTEMPTED',
          baselineScore: null,
          finalScore: null,
          scoreDelta: null,
          platformDependencies: [],
          writeResult: null,
          failure: freshBuildFailureFromError(e, e?.failureStage || 'fresh_build'),
        },
        runId,
      });
      send({
        type: 'error',
        error: (e?.message ?? String(e)).slice(0, 400),
        code: e?.code ?? 'FRESH_BUILD_THREW',
        ...pickSafeErrorFields(e),
      });
      return done();
    }
  }

  let runOrchestration;
  let runConstruction;
  let createOriginPageResolver;
  try {
    ({ runOrchestration } = await import('../lib/agents/renewal/orchestrator.js'));
    ({ runConstruction } = await import('../lib/construction/index.js').catch(() => ({ runConstruction: null })));
    ({ createOriginPageResolver } = await import('../lib/construction/resolvers/originPageResolver.js').catch(() => ({ createOriginPageResolver: null })));
  } catch (e) {
    send({
      type: 'error',
      error: (e?.message ?? String(e)).slice(0, 200),
      code: 'ORCHESTRATOR_IMPORT_FAILED',
      ...pickSafeErrorFields(e),
    });
    return done();
  }

  const orchestratorMode = orchestratorModeForAxes({
    transportMode: mode,
    structuralLayer: flowHubAxes.structuralLayer,
    operationalMode: flowHubAxes.operationalMode,
    flowHubPath: flowHubAxes.flowHubPath,
  });
  const analysisDepthOverrides = effortOverridesForAnalysisDepth(flowHubAxes.analysisDepth);

  // If we have a registry row keyed by URL hash, hand the orchestrator a
  // discoverProduct override so it uses our row directly (no second
  // registry lookup, no PATH B detour). Without a row, omit the override
  // and let discoverProduct take its normal path.
  const deps = {
    __exposeState: (state) => {
      exposedState = state;
      if (clientClosed && !terminalSent) stopExposedState();
    },
  };
  if (registryRow) {
    deps.discoverProduct = async () => registryRow;
  }
  if (typeof runConstruction === 'function') {
    deps.runConstruction = runConstruction;
  }
  if (typeof createOriginPageResolver === 'function') {
    deps.createOriginPageResolver = createOriginPageResolver;
  }
  if (orchestratorMode === 'migration') {
    const migrationHooks = await createMigrationRuntimeHooks({
      url,
      product: registryRow,
      env: process.env,
      runId,
    });
    if (!migrationHooks.ok) {
      send({
        type: 'final',
        final: true,
        previewUrl: null,
        finalScore: 0,
        governanceRecordId: runId,
        gtmReady: false,
        exitReason: 'MIGRATION_CONFIGURATION_REQUIRED',
        iterationsCompleted: 0,
        prUrl: null,
        runMode: 'MIGRATION',
        migration: {
          status: 'MIGRATION_CONFIGURATION_REQUIRED',
          filesMigrated: 0,
          dependenciesRemoved: [],
          blockers: migrationHooks.blockers,
        },
        migrationMessage: migrationHooks.message || 'Migration Mode requires source/target repo paths and verification hooks before writes are allowed.',
        runId,
      });
      return done();
    }
    Object.assign(deps, migrationHooks.deps);
  }

  const stepLogs = [];
  const iterations = [];
  let result;
  let softTimeout = null;
  try {
    const orchestrationPromise = runOrchestration({
      url,
      mode: orchestratorMode,
      ...analysisDepthOverrides,
      structuralLayer: flowHubAxes.structuralLayer,
      systemOperationLevel: flowHubAxes.structuralLayer,
      operationalMode: flowHubAxes.operationalMode,
      analysisDepth: flowHubAxes.analysisDepth,
      flowHubPath: flowHubAxes.flowHubPath,
      input: {
        url,
        description,
        productSsotContext,
        flowHubAxes,
      },
      runId,
      supabase,
      environment,
      gtmTarget: GTM_TARGET,
      onStep: (log) => {
        stepLogs.push(log);
        send({ type: 'step', log });
      },
      onIteration: (iteration) => {
        iterations.push(iteration);
        send({ type: 'iteration', iteration });
      },
      deps,
    });
    const softTimeoutMs = internalBackgroundJob
      ? configuredRunConstructionBackgroundTimeoutMs()
      : configuredRunConstructionSoftTimeoutMs();
    const timeoutPromise = new Promise((resolve) => {
      softTimeout = setTimeout(() => resolve({ __runConstructionSoftTimeout: true }), softTimeoutMs);
    });
    const raced = await Promise.race([orchestrationPromise, timeoutPromise]);
    if (raced?.__runConstructionSoftTimeout) {
      stopExposedState();
      send({
        type: 'step',
        log: {
          step: 'run-construction',
          status: 'partial',
          tool: 'SSE soft-timeout guard',
          why: 'Registered-product orchestration exceeded the request soft timeout; returning an honest partial final before the platform closes the stream.',
          result: {
            kind: 'sse_soft_timeout',
            timeoutMs: softTimeoutMs,
            stepsCompleted: stepLogs.filter((log) => log?.status === 'complete').length,
            lastStep: latestRunConstructionStep(stepLogs),
          },
        },
      });
      return emitRunConstructionSoftTimeoutFinal({
        send,
        done,
        payload: buildRunConstructionSoftTimeoutFinal({
          runId,
          url,
          mode,
          orchestratorMode,
          gtmTarget: GTM_TARGET,
          timeoutMs: softTimeoutMs,
          stepLogs,
          iterations,
          productSsotContext,
          registryRow,
        }),
      });
    }
    result = raced;
  } catch (e) {
    send({
      type: 'error',
      error: (e?.message ?? String(e)).slice(0, 400),
      code: e?.code ?? 'ORCHESTRATION_THREW',
      failedStep: typeof e?.failedStep === 'string' ? e.failedStep : null,
      exitReason: typeof e?.exitReason === 'string' ? e.exitReason : 'STEP_FAILED',
      ...pickSafeErrorFields(e),
    });
    return done();
  } finally {
    if (softTimeout) clearTimeout(softTimeout);
  }

  // governanceRecordId: per orchestrator STEP 14, appendGovernanceEntry
  // writes a single entry per run, correlatable by runId. We surface
  // runId (governance_record entries don't carry their own id field).
  const stepFailedDiagnostics = result?.exitReason === 'STEP_FAILED'
    ? {
        failedStep: typeof result?.failedStep === 'string' ? result.failedStep : null,
        error: typeof result?.error === 'string' ? result.error : null,
        code: typeof result?.code === 'string' ? result.code : null,
        ...pickSafeErrorFields(result),
        failureArtifact: result?.failureArtifact && typeof result.failureArtifact === 'object'
          ? result.failureArtifact : null,
      }
    : {};
  const symbioticWrite = registryRow?.product_id
    ? await persistSymbioticRunSummary({
        productId: registryRow.product_id,
        environment,
        runId,
        url,
        priorContext: productSsotContext,
        result,
        supabase,
        proofLabel: environment === 'prd' ? 'LIVE_PRODUCTION' : 'LIVE_PREVIEW',
      })
    : { ok: false, persisted: false, state: 'skipped_no_product_registry_row', reason: 'no_product_registry_row' };
  send({
    type: 'symbiotic_write',
    productId: registryRow?.product_id ?? null,
    ok: symbioticWrite.ok === true,
    persisted: symbioticWrite.persisted === true,
    state: symbioticWrite.state ?? 'failed',
    reason: symbioticWrite.reason ?? null,
    idempotent: symbioticWrite.idempotent === true,
    version: symbioticWrite.version ?? null,
  });
  send({
    type: 'final',
    final: true,
    ok: result?.ok === true,
    previewUrl: result?.previewUrl ?? null,
    originalProductUrl: result?.originalUrl ?? url,
    finalScore: result?.runMode === 'MIGRATION' && result?.finalScore == null
      ? null
      : result?.finalScore ?? 0,
    governanceRecordId: runId,
    productSsotContext: productSsotContext ? {
      hasPriorRun: productSsotContext.hasPriorRun,
      priorRunCount: productSsotContext.priorRunCount,
      sourceVersion: productSsotContext.sourceVersion,
      sourceHash: productSsotContext.sourceHash,
      latestDeliveryArtifactUrl: productSsotContext.latestDeliveryArtifactUrl,
    } : null,
    symbioticLoop: {
      persisted: symbioticWrite.persisted === true,
      state: symbioticWrite.state ?? 'failed',
      version: symbioticWrite.version ?? null,
      reason: symbioticWrite.reason ?? null,
    },
    gtmReady: !!result?.gtmReady,
    exitReason: result?.exitReason ?? 'UNKNOWN',
    ...stepFailedDiagnostics,
    iterationsCompleted: result?.iterationsCompleted ?? 0,
    prUrl: result?.prUrl ?? null,
    // W6 INTEGRATION — STEP 4: CA-18 §2 honest disclosure forwarded
    // to the SSE consumer. The UI's KNOWN-GAP banner reads this array.
    dimensions_contributing: Array.isArray(result?.dimensions_contributing)
      ? result.dimensions_contributing : null,
    // CAPABILITY-WEIGHTED SCORING — forwarded so the UI can render the
    // trust score (primary) + raw score + coverage (secondary) and
    // gate the GTM badge on meetsMinimumCoverage.
    rawScore: typeof result?.rawScore === 'number' ? result.rawScore : null,
    effectiveTrustScore: typeof result?.effectiveTrustScore === 'number'
      ? result.effectiveTrustScore : null,
    coverageConfidence: typeof result?.coverageConfidence === 'number'
      ? result.coverageConfidence : null,
    scoredDimensions: typeof result?.scoredDimensions === 'number'
      ? result.scoredDimensions : null,
    totalDimensions: typeof result?.totalDimensions === 'number'
      ? result.totalDimensions : null,
    meetsMinimumCoverage: typeof result?.meetsMinimumCoverage === 'boolean'
      ? result.meetsMinimumCoverage : null,
    minimumScoredDimensionsForGTM: typeof result?.minimumScoredDimensionsForGTM === 'number'
      ? result.minimumScoredDimensionsForGTM : 7,
    coverageDisclosure: typeof result?.coverageDisclosure === 'string'
      ? result.coverageDisclosure : null,
    // DISPATCH U1 ITEM 3 — universal-mode fields forwarded so the UI
    // can suppress noisy deployment-step entries, render the findings
    // rollup, and show the "Register this product" CTA.
    runMode: typeof result?.runMode === 'string' ? result.runMode : null,
    universalMode: typeof result?.universalMode === 'boolean' ? result.universalMode : false,
    autoFixAvailable: typeof result?.autoFixAvailable === 'boolean' ? result.autoFixAvailable : true,
    registerCTA: typeof result?.registerCTA === 'boolean' ? result.registerCTA : false,
    operatorMode: typeof result?.operatorMode === 'string' ? result.operatorMode : null,
    operatorRepoAccess: result?.operatorRepoAccess && typeof result.operatorRepoAccess === 'object'
      ? result.operatorRepoAccess : null,
    findingsCount: typeof result?.findingsCount === 'number' ? result.findingsCount : null,
    findingsSeverity: result?.findingsSeverity && typeof result.findingsSeverity === 'object'
      ? result.findingsSeverity : null,
    deepBrowserAnalysis: result?.deepBrowserAnalysis && typeof result.deepBrowserAnalysis === 'object'
      ? result.deepBrowserAnalysis : null,
    fixProposals: Array.isArray(result?.fixProposals) ? result.fixProposals : [],
    sourceMapping: result?.sourceMapping && typeof result.sourceMapping === 'object'
      ? result.sourceMapping : null,
    sourceMappedFixProposals: Array.isArray(result?.sourceMappedFixProposals)
      ? result.sourceMappedFixProposals : [],
    transformationDelta: result?.transformationDelta && typeof result.transformationDelta === 'object'
      ? result.transformationDelta : null,
    skippedSteps: Array.isArray(result?.skippedSteps) ? result.skippedSteps : [],
    migration: result?.migration && typeof result.migration === 'object'
      ? result.migration : null,
    migrationModeDisabled: result?.migrationModeDisabled === true,
    migrationMessage: typeof result?.migrationMessage === 'string'
      ? result.migrationMessage : null,
    runId,
  });
  return done();
}

// ── Helpers ────────────────────────────────────────────────────────────────

export default runConstructionHandler;

export async function runConstructionToStatus({ runId, body, checkpointStep } = {}) {
  if (typeof runId !== 'string' || runId.trim().length === 0) {
    return { ok: false, error: 'missing_runId' };
  }
  const resolvedRunId = runId.trim();
  await markForgeRunStarted(resolvedRunId);

  let buffer = '';
  let terminalSeen = false;
  let finalSeen = false;
  let lastErrorEvent = null;
  const writes = [];
  let writeChain = Promise.resolve();
  const checkpointsSeen = new Set();
  const appendStatusEvent = (event) => {
    const checkpointName = statusEventCheckpointName(event);
    if (
      checkpointName
      && !checkpointsSeen.has(checkpointName)
      && typeof checkpointStep === 'function'
    ) {
      checkpointsSeen.add(checkpointName);
      return checkpointStep(checkpointName, () => appendForgeRunEvent(resolvedRunId, event));
    }
    return appendForgeRunEvent(resolvedRunId, event);
  };
  const appendParsedFrames = (chunk) => {
    buffer += String(chunk);
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.split('\n').find((item) => item.startsWith('data:'));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') {
        terminalSeen = true;
        continue;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed?.type === 'final' || parsed?.final === true) {
          finalSeen = true;
        }
        if (parsed?.type === 'error') {
          lastErrorEvent = parsed;
        }
        writeChain = writeChain.then(() => appendStatusEvent(parsed));
        writes.push(writeChain);
      } catch {
        // Keep the background run alive even if a frame cannot be parsed.
      }
    }
  };

  const fakeReq = {
    method: 'POST',
    headers: { 'x-forwarded-for': `background:${resolvedRunId}` },
    body: {
      ...(body && typeof body === 'object' ? body : {}),
      runId: resolvedRunId,
      mode: 'FOREGROUND',
    },
  };
  const fakeRes = {
    statusCode: 200,
    headers: {},
    ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    flushHeaders() {},
    write(chunk) { appendParsedFrames(chunk); },
    end(chunk = '') {
      if (chunk) appendParsedFrames(chunk);
      this.ended = true;
    },
    on() {},
  };

  try {
    await runConstructionHandler(fakeReq, fakeRes, { internalBackgroundJob: true });
    await Promise.allSettled(writes);
    if (!terminalSeen && !finalSeen) {
      await markForgeRunFailed(resolvedRunId, Object.assign(new Error('background run ended without [DONE]'), {
        code: 'ASYNC_STREAM_ENDED_WITHOUT_DONE',
      }));
      return { ok: false, runId: resolvedRunId, error: 'ASYNC_STREAM_ENDED_WITHOUT_DONE' };
    }
    if (!finalSeen && lastErrorEvent) {
      await markForgeRunFailed(resolvedRunId, Object.assign(new Error(lastErrorEvent.error || 'background run failed'), {
        code: lastErrorEvent.code ?? 'ASYNC_RUN_FAILED',
        failedStep: lastErrorEvent.failedStep ?? null,
        exitReason: lastErrorEvent.exitReason ?? 'STEP_FAILED',
      }));
      return { ok: false, runId: resolvedRunId, error: lastErrorEvent.error ?? 'ASYNC_RUN_FAILED' };
    }
    return { ok: true, runId: resolvedRunId };
  } catch (error) {
    await Promise.allSettled(writes);
    await markForgeRunFailed(resolvedRunId, error);
    return { ok: false, runId: resolvedRunId, error: error?.message ?? String(error) };
  }
}

/**
 * Lazy-load the @supabase/supabase-js client. Returns null on any failure
 * so the caller can degrade to PATH B without throwing.
 */
async function loadSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

/**
 * Upsert a stable product_registry row keyed by sha256(url). Lets any URL
 * the caller hands us participate in PATH A — operator-registered products
 * stay untouched (this never collides with their product_id because the
 * synthetic ID is prefixed `url-`).
 *
 * Returns the registry row (with __created marker), or null when Supabase
 * is unavailable.
 */
export async function ensureProductRegistryRow({ url, supabase }) {
  if (!supabase || typeof supabase.from !== 'function') return null;
  if (typeof url !== 'string' || !url) return null;

  const urlHash = createHash('sha256').update(url).digest('hex').slice(0, 16);
  const productId = `url-${urlHash}`;
  const orgId = 'flowai-self-hosted';

  // Read first — preserves operator-set columns (vercel_project_id,
  // self_renewal_branch, market_definition) across re-runs.
  const existing = await supabase
    .from('product_registry')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();

  if (existing?.data) {
    // Touch product_url in case the URL has been normalized differently
    // since the row was first written; ignore failures (read-only env).
    if (existing.data.product_url !== url) {
      await supabase
        .from('product_registry')
        .update({ product_url: url })
        .eq('product_id', productId);
    }
    return { ...existing.data, product_url: url, __created: false };
  }

  const insertRow = {
    product_id: productId,
    org_id: orgId,
    product_url: url,
    environment: 'prd',
    self_renewal_enabled: true,
  };
  const { data, error } = await supabase
    .from('product_registry')
    .insert(insertRow)
    .select('*')
    .single();
  if (error) {
    // Insert race (another concurrent request created it) — re-read and
    // return that row. Anything else propagates as a registry skip.
    if (error.code === '23505') {
      const reread = await supabase
        .from('product_registry')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();
      if (reread?.data) return { ...reread.data, __created: false };
    }
    throw new Error(`product_registry upsert failed: ${error.message ?? error.code ?? 'unknown'}`);
  }
  return { ...data, __created: true };
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function envKeyPart(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^HTTPS?:\/\//, '')
    .replace(/^WWW\./, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function hostFromUrl(value) {
  try {
    return new URL(String(value || '').startsWith('http') ? value : `https://${value}`).hostname;
  } catch {
    return '';
  }
}

function migrationEnvValue(env, baseName, product, url) {
  const keys = new Set([
    envKeyPart(product?.product_id),
    envKeyPart(product?.name),
    envKeyPart(product?.domain),
    envKeyPart(hostFromUrl(product?.product_url || product?.original_url || url)),
  ]);
  for (const key of keys) {
    if (!key) continue;
    const value = env?.[`${baseName}_${key}`];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return firstNonEmpty(env?.[baseName]);
}

function isPathInside(parentPath, candidatePath) {
  const parent = path.resolve(parentPath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function directoryExists(directoryPath) {
  try {
    return (await fs.stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

function commandName(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function redactedOutput(value) {
  return String(value || '')
    .replace(/(ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|vercel_[A-Za-z0-9_]*|sk-[A-Za-z0-9_-]+)/g, '[REDACTED]')
    .replace(/x-access-token:[^@/\s]+@/g, 'x-access-token:[REDACTED]@')
    .slice(-8000);
}

async function runRepoCommand({ cwd, command, args, timeoutMs }) {
  try {
    const { stdout, stderr } = await execFileAsync(commandName(command), args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return { ok: true, output: redactedOutput(`${stdout || ''}${stderr || ''}`) };
  } catch (error) {
    return {
      ok: false,
      output: redactedOutput(`${error?.stdout || ''}${error?.stderr || ''}${error?.message || ''}`),
    };
  }
}

function looksLikeUpgradeRepo(value) {
  return /(?:^|[-_/])v2(?:\.git)?$/i.test(String(value || '').trim());
}

async function createMigrationRuntimeHooks({
  url,
  product,
  env = process.env,
  runId,
  githubHooks = createGithubMigrationHooks,
} = {}) {
  const registeredProduct = findRegisteredProductConfigForUrl(url);
  const productConfig = { ...(registeredProduct || {}), ...(product || {}) };

  if (!registeredProduct) {
    return {
      ok: false,
      message: 'Product not found in registry - register product before migrating',
      blockers: [{
        field: 'productRegistry',
        reason: 'product_not_found',
        message: 'Product not found in registry - register product before migrating',
      }],
    };
  }

  const sourceRepoUrl = firstNonEmpty(
    productConfig.original_repo,
    productConfig.source_repo,
    productConfig.repo,
  );
  const targetRepoUrl = firstNonEmpty(
    productConfig.upgrade_repo,
    productConfig.target_repo,
    looksLikeUpgradeRepo(productConfig.repo) ? productConfig.repo : null,
  );

  if (!targetRepoUrl) {
    return {
      ok: false,
      message: 'No upgrade repo configured for this product',
      blockers: [{
        field: 'targetRepoPath',
        reason: 'missing_upgrade_repo',
        message: 'No upgrade repo configured for this product',
      }],
    };
  }

  const configuredSourceRepoPath = firstNonEmpty(
    productConfig.migration_source_repo_path,
    productConfig.source_repo_path,
    productConfig.original_repo_path,
    migrationEnvValue(env, 'FLOWAI_MIGRATION_SOURCE_REPO_PATH', productConfig, url),
  );
  const configuredTargetRepoPath = firstNonEmpty(
    productConfig.migration_target_repo_path,
    productConfig.target_repo_path,
    productConfig.upgrade_repo_path,
    migrationEnvValue(env, 'FLOWAI_MIGRATION_TARGET_REPO_PATH', productConfig, url),
  );
  const blockers = [];

  if (!configuredSourceRepoPath || !configuredTargetRepoPath) {
    const token = firstNonEmpty(env?.GITHUB_OPERATOR_TOKEN, env?.GITHUB_PAT, env?.GITHUB_TOKEN);
    const githubResult = await githubHooks({
      sourceRepoUrl,
      targetRepoUrl,
      productName: productConfig.name || productConfig.product_id || hostFromUrl(url),
      runId,
      token,
      fetchImpl: globalThis.fetch,
    });
    if (!githubResult.ok) {
      return {
        ok: false,
        blockers: githubResult.blockers,
        message: githubResult.message || githubResult.blockers?.find((blocker) => blocker.message)?.message,
      };
    }
    return githubResult;
  }

  const sourceRepoPath = configuredSourceRepoPath;
  const targetRepoPath = configuredTargetRepoPath;

  if (!sourceRepoPath) blockers.push({ field: 'sourceRepoPath', reason: 'missing_migration_hook' });
  if (!targetRepoPath) blockers.push({ field: 'targetRepoPath', reason: 'missing_migration_hook' });
  if (sourceRepoPath && targetRepoPath && path.resolve(sourceRepoPath) === path.resolve(targetRepoPath)) {
    blockers.push({ field: 'targetRepoPath', reason: 'target_repo_must_differ_from_source_repo' });
  }
  if (sourceRepoPath && targetRepoPath && isPathInside(sourceRepoPath, targetRepoPath)) {
    blockers.push({ field: 'targetRepoPath', reason: 'target_repo_must_not_be_inside_source_repo' });
  }
  if (sourceRepoPath && !(await directoryExists(sourceRepoPath))) {
    blockers.push({ field: 'sourceRepoPath', reason: 'repo_path_not_found' });
  }
  if (targetRepoPath && !(await directoryExists(targetRepoPath))) {
    blockers.push({ field: 'targetRepoPath', reason: 'repo_path_not_found' });
  }

  if (blockers.length > 0) {
    return { ok: false, blockers, message: blockers.find((blocker) => blocker.message)?.message };
  }

  const resolvedSource = path.resolve(sourceRepoPath);
  const resolvedTarget = path.resolve(targetRepoPath);
  const restoreSnapshots = new Map();
  const verifyTimeoutMs = Number(env.FLOWAI_MIGRATION_VERIFY_TIMEOUT_MS || 120000);

  const resolveTargetPath = (filePath) => {
    const resolved = path.resolve(filePath);
    if (isPathInside(resolvedSource, resolved)) {
      throw new Error('MIGRATION_BLOCKED: attempted source repo write');
    }
    if (!isPathInside(resolvedTarget, resolved)) {
      throw new Error('MIGRATION_BLOCKED: target path escapes targetRepoPath');
    }
    return resolved;
  };

  const deps = {
    sourceRepoPath: resolvedSource,
    targetRepoPath: resolvedTarget,
    sourceRepoUrl,
    targetRepoUrl,
    readFile: async (filePath, encoding = 'utf8') => {
      const resolved = resolveTargetPath(filePath);
      return fs.readFile(resolved, encoding);
    },
    writeFile: async (filePath, content) => {
      const resolved = resolveTargetPath(filePath);
      if (!restoreSnapshots.has(resolved)) {
        restoreSnapshots.set(resolved, await fs.readFile(resolved, 'utf8').catch(() => null));
      }
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, content, 'utf8');
    },
    restoreFile: async (filePath) => {
      const resolved = resolveTargetPath(filePath);
      if (!restoreSnapshots.has(resolved)) {
        throw new Error('MIGRATION_BLOCKED: no last known good snapshot for restore');
      }
      const previous = restoreSnapshots.get(resolved);
      if (previous === null) {
        await fs.rm(resolved, { force: true });
        return;
      }
      await fs.writeFile(resolved, previous, 'utf8');
    },
    verifyBuild: async () => runRepoCommand({
      cwd: resolvedTarget,
      command: 'npm',
      args: ['run', 'build'],
      timeoutMs: verifyTimeoutMs,
    }),
    verifyLint: async () => runRepoCommand({
      cwd: resolvedTarget,
      command: 'npm',
      args: ['run', 'lint'],
      timeoutMs: verifyTimeoutMs,
    }),
    runFocusedTests: async () => {
      const result = await runRepoCommand({
        cwd: resolvedTarget,
        command: 'npx',
        args: ['vitest', 'run'],
        timeoutMs: verifyTimeoutMs,
      });
      const passed = Number(result.output.match(/(\d+)\s+passed/)?.[1] || 0);
      return { ...result, passed };
    },
  };

  return { ok: true, deps };
}

// Test seam.
export const __test = Object.freeze({
  ALLOWED_MODES,
  GTM_TARGET,
  ensureProductRegistryRow,
  createMigrationRuntimeHooks,
  readProductSsotRunContext,
  persistSymbioticRunSummary,
  isPathInside,
  freshBuildFinalStatus,
  freshBuildFailureFromError,
  configuredRunConstructionSoftTimeoutMs,
  configuredRunConstructionBackgroundTimeoutMs,
  buildRunConstructionSoftTimeoutFinal,
  emitRunConstructionSoftTimeoutFinal,
  latestRunConstructionStep,
  userFacingForgeStepFromLog,
  statusEventCheckpointName,
  VERCEL_RUN_CONSTRUCTION_HARD_TIMEOUT_MS,
  VERCEL_RUN_CONSTRUCTION_STREAM_LIMIT_MS,
  RUN_CONSTRUCTION_TIMEOUT_BUFFER_MS,
  DEFAULT_RUN_CONSTRUCTION_SSE_SOFT_TIMEOUT_MS,
  DEFAULT_RUN_CONSTRUCTION_BACKGROUND_TIMEOUT_MS,
});
