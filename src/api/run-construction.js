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
//   Body: { url: string, mode: 'FOREGROUND'|'BACKGROUND'|'GUIDED'|'MIGRATION'|'FRESH_BUILD' }
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

const ALLOWED_MODES = new Set(['FOREGROUND', 'BACKGROUND', 'GUIDED', 'MIGRATION', 'FRESH_BUILD']);
const GTM_TARGET = 95;
const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
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

export default async function handler(req, res) {
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
  const rawMode = typeof body.mode === 'string' ? body.mode.toUpperCase() : 'FOREGROUND';
  const mode = ALLOWED_MODES.has(rawMode) ? rawMode : 'FOREGROUND';

  if (!url || !/^https?:\/\//i.test(url)) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'invalid_url', detail: 'body.url must be an http(s) URL' }));
  }

  // ── SSE preamble ─────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    try { res.flushHeaders(); } catch { /* ignore */ }
  }

  const send = (payload) => {
    try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch { /* socket closed */ }
  };
  const done = () => {
    try { res.write('data: [DONE]\n\n'); res.end(); } catch { /* ignore */ }
  };

  // Best-effort Supabase. When unavailable, the orchestrator falls through
  // to PATH B; we skip the registry upsert and report governanceRecordId
  // as the runId so the SSE consumer still has a correlation handle.
  const runId = randomUUID();
  const migrationFlag = mode === 'MIGRATION'
    ? await getMigrationModeFlag()
    : { enabled: false, source: 'not_checked' };

  if (mode === 'MIGRATION' && !migrationFlag.enabled) {
    send({
      type: 'start',
      runId, url, mode, gtmTarget: GTM_TARGET,
      supabase: 'not_used',
      at: new Date().toISOString(),
    });
    send({
      type: 'final',
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
    runId, url, mode, gtmTarget: GTM_TARGET,
    supabase: supabase ? 'connected' : 'unavailable',
    at: new Date().toISOString(),
  });

  // ── ensureProductRegistryRow (upsert keyed by sha256(url)) ───────────────
  let registryRow = null;
  try {
    registryRow = await ensureProductRegistryRow({ url, supabase });
    if (registryRow) {
      send({
        type: 'registry',
        action: registryRow.__created ? 'created' : 'reused',
        productId: registryRow.product_id,
      });
    }
  } catch (e) {
    // Upsert failures are non-fatal — the orchestrator can still run via
    // PATH B. Surface the reason on the wire for operator visibility.
    send({ type: 'registry', action: 'skipped', reason: (e?.message ?? String(e)).slice(0, 200) });
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
      const productConfig = findRegisteredProductConfigForUrl(url);
      const freshBuildResult = await runFreshBuild({
        url,
        runId,
        productName: productConfig?.name || registryRow?.product_name || registryRow?.product_id || null,
        productConfig: productConfig || registryRow || null,
      }, {
        env: process.env,
        runId,
        onStep: (log) => send({ type: 'step', log }),
      });

      send({
        type: 'final',
        ok: freshBuildResult?.ok === true,
        status: freshBuildFinalStatus(freshBuildResult),
        previewUrl: freshBuildResult?.previewUrl ?? null,
        finalScore: null,
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
        ok: false,
        status: 'failed',
        previewUrl: null,
        finalScore: null,
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

  const orchestratorMode = mode === 'GUIDED' ? 'guided'
    : mode === 'MIGRATION' ? 'migration'
    : 'auto';

  // If we have a registry row keyed by URL hash, hand the orchestrator a
  // discoverProduct override so it uses our row directly (no second
  // registry lookup, no PATH B detour). Without a row, omit the override
  // and let discoverProduct take its normal path.
  const deps = {};
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

  let result;
  try {
    result = await runOrchestration({
      url,
      mode: orchestratorMode,
      runId,
      supabase,
      environment: process.env.NODE_ENV === 'production' ? 'prd' : 'staging',
      gtmTarget: GTM_TARGET,
      onStep: (log) => send({ type: 'step', log }),
      onIteration: (iteration) => send({ type: 'iteration', iteration }),
      deps,
    });
  } catch (e) {
    send({
      type: 'error',
      error: (e?.message ?? String(e)).slice(0, 400),
      code: e?.code ?? 'ORCHESTRATION_THREW',
      ...pickSafeErrorFields(e),
    });
    return done();
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
  send({
    type: 'final',
    ok: result?.ok === true,
    previewUrl: result?.previewUrl ?? null,
    finalScore: result?.runMode === 'MIGRATION' && result?.finalScore == null
      ? null
      : result?.finalScore ?? 0,
    governanceRecordId: runId,
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
  isPathInside,
  freshBuildFinalStatus,
  freshBuildFailureFromError,
});
