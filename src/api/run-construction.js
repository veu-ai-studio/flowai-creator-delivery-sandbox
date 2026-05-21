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
//   Body: { url: string, mode: 'FOREGROUND'|'BACKGROUND'|'GUIDED' }
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
import { rateLimit } from './_lib/rateLimit.js';

const ALLOWED_MODES = new Set(['FOREGROUND', 'BACKGROUND', 'GUIDED']);
const GTM_TARGET = 95;
const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
  let runOrchestration;
  let runConstruction;
  let createOriginPageResolver;
  try {
    ({ runOrchestration } = await import('../lib/agents/renewal/orchestrator.js'));
    ({ runConstruction } = await import('../lib/construction/index.js').catch(() => ({ runConstruction: null })));
    ({ createOriginPageResolver } = await import('../lib/construction/resolvers/originPageResolver.js').catch(() => ({ createOriginPageResolver: null })));
  } catch (e) {
    send({ type: 'error', error: (e?.message ?? String(e)).slice(0, 200), code: 'ORCHESTRATOR_IMPORT_FAILED' });
    return done();
  }

  const orchestratorMode = mode === 'GUIDED' ? 'guided' : 'auto';

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
    send({ type: 'error', error: (e?.message ?? String(e)).slice(0, 400), code: e?.code ?? 'ORCHESTRATION_THREW' });
    return done();
  }

  // governanceRecordId: per orchestrator STEP 14, appendGovernanceEntry
  // writes a single entry per run, correlatable by runId. We surface
  // runId (governance_record entries don't carry their own id field).
  send({
    type: 'final',
    previewUrl: result?.previewUrl ?? null,
    finalScore: result?.finalScore ?? 0,
    governanceRecordId: runId,
    gtmReady: !!result?.gtmReady,
    exitReason: result?.exitReason ?? 'UNKNOWN',
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

// Test seam.
export const __test = Object.freeze({
  ALLOWED_MODES,
  GTM_TARGET,
  ensureProductRegistryRow,
});
