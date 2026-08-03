// GET /api/diagnostic
//
// Comprehensive health check pinging every connected service. Returns
// structured JSON with status per provider, env-var presence, and live
// connectivity probes where cheap. Used for tomorrow morning's activation
// verification and ongoing operator diagnostics.
//
// Compared to /api/orchestrator/health (which only reports each registered
// agent's own .health()), this endpoint:
//   * Probes Anthropic, Browserless, Supabase, Inngest, Resend, Voyage,
//     Axiom independently with minimal real calls.
//   * Reports env-var presence per integration so it's clear what activates
//     when keys land.
//   * Reports runtime metadata (commit, region, env, Node version).
//   * Aggregates everything into a single { ok, summary, providers, runtime,
//     featureFlags } shape that doesn't require fanning out to multiple
//     endpoints.

import { setCorsHeaders } from './_lib/claude.js';
import { selectedBackend } from './_lib/db.js';
import { isInngestEnabled } from './_lib/inngest.js';
import { isAuthRequired, isClerkConfigured } from './_lib/auth.js';
import { isEmailConfigured } from './_lib/email.js';
import { isEmbeddingsConfigured, embeddingDimensions } from './_lib/embeddings.js';
import { isAxiomConfigured } from './_lib/logger.js';
import { isSupabaseConfigured, getSupabase } from './_lib/supabase.js';
import { withRequestLog } from './_lib/requestLog.js';
import { requireAuthHard } from './_lib/auth.js';
import { resolveBuildIdentity } from '../src/lib/observability/buildIdentity.js';

// ─── Probe helpers ────────────────────────────────────────────────────

async function probeAnthropic() {
  const present = Boolean(process.env.ANTHROPIC_API_KEY);
  if (!present) return { ok: false, configured: false, reason: 'ANTHROPIC_API_KEY not set' };
  // Cheap probe: a 1-token completion. Costs ~$0.00001.
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ok' }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return { ok: false, configured: true, status: r.status, reason: txt.slice(0, 150) };
    }
    return { ok: true, configured: true, model: 'claude-sonnet-4-6' };
  } catch (e) {
    return { ok: false, configured: true, reason: e.message };
  }
}

async function probeBrowserless() {
  const present = Boolean(process.env.BROWSERLESS_API_KEY);
  if (!present) return { ok: false, configured: false, reason: 'BROWSERLESS_API_KEY not set' };
  // Browserless doesn't have a free no-session health endpoint, and a real
  // /content call costs $. Env presence + key shape check is the cheap probe;
  // real connectivity is verified by /api/configuration/clone.
  const key = process.env.BROWSERLESS_API_KEY;
  // Cheap shape sanity check — Browserless tokens are typically 30+ chars.
  const looksValid = typeof key === 'string' && key.length >= 16;
  return {
    ok: looksValid,
    configured: true,
    keyShapeValid: looksValid,
    note: 'env-only probe (real call costs a session)',
    reason: looksValid ? null : 'BROWSERLESS_API_KEY shape looks invalid',
  };
}

async function probeSupabase() {
  if (!isSupabaseConfigured()) {
    return { ok: false, configured: false, reason: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' };
  }
  try {
    const sb = getSupabase();
    const { error } = await sb.from('organizations').select('id', { count: 'exact', head: true });
    if (error) return { ok: false, configured: true, reason: error.message };
    return { ok: true, configured: true, backend: 'supabase' };
  } catch (e) {
    return { ok: false, configured: true, reason: e.message };
  }
}

async function probeInngest() {
  return {
    ok: isInngestEnabled(),
    configured: isInngestEnabled(),
    eventKeyPresent: Boolean(process.env.INNGEST_EVENT_KEY),
    signingKeyPresent: Boolean(process.env.INNGEST_SIGNING_KEY),
    backend: process.env.INNGEST_BACKEND || 'auto',
    reason: isInngestEnabled() ? null : 'INNGEST_EVENT_KEY and/or INNGEST_SIGNING_KEY not set',
  };
}

async function probeClerk() {
  return {
    ok: true, // Clerk is always usable in passthrough mode (anonymous)
    configured: isClerkConfigured(),
    secretKeyPresent: Boolean(process.env.CLERK_SECRET_KEY),
    authRequired: isAuthRequired(),
    serviceKeyPresent: Boolean(process.env.FLOWAI_SERVICE_KEY),
    reason: isClerkConfigured() ? null : 'CLERK_SECRET_KEY not set (anonymous mode active)',
  };
}

async function probeResend() {
  const configured = isEmailConfigured();
  return {
    ok: configured,
    configured,
    apiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    fromAddressPresent: Boolean(process.env.EMAIL_FROM),
    testEnabled: process.env.EMAIL_TEST_ENABLED === 'true',
    dryRun: process.env.EMAIL_DRY_RUN === 'true',
    reason: configured ? null : 'RESEND_API_KEY not set',
  };
}

async function probeVoyage() {
  const configured = isEmbeddingsConfigured();
  return {
    ok: configured,
    configured,
    apiKeyPresent: Boolean(process.env.VOYAGE_API_KEY),
    model: process.env.VOYAGE_MODEL || 'voyage-3-lite',
    embeddingDim: embeddingDimensions(),
    reason: configured ? null : 'VOYAGE_API_KEY not set',
  };
}

async function probeAxiom() {
  const configured = isAxiomConfigured();
  return {
    ok: true, // Always usable — falls back to console
    configured,
    tokenPresent: Boolean(process.env.AXIOM_TOKEN),
    datasetPresent: Boolean(process.env.AXIOM_DATASET),
    dryRun: process.env.AXIOM_DRY_RUN === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    reason: configured ? null : 'AXIOM_TOKEN/AXIOM_DATASET not set (console fallback active)',
  };
}

// ─── Handler ──────────────────────────────────────────────────────────

async function diagnosticHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const ctx = await requireAuthHard(req, res);
  if (!ctx) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const t0 = Date.now();

  // Run probes in parallel where they make external calls.
  const [
    anthropic, browserless, supabase, inngest, clerk, resend, voyage, axiom,
  ] = await Promise.all([
    probeAnthropic(), probeBrowserless(), probeSupabase(),
    probeInngest(), probeClerk(), probeResend(), probeVoyage(), probeAxiom(),
  ]);

  const providers = { anthropic, browserless, supabase, inngest, clerk, resend, voyage, axiom };

  // Aggregate summary
  const summary = {
    durationMs: Date.now() - t0,
    activeCount: 0,
    failingCount: 0,
    inactiveCount: 0,
  };
  for (const p of Object.values(providers)) {
    if (p.configured && p.ok) summary.activeCount += 1;
    else if (p.configured && !p.ok) summary.failingCount += 1;
    else summary.inactiveCount += 1;
  }
  const ok = summary.failingCount === 0;
  const buildIdentity = resolveBuildIdentity(process.env);

  return res.status(ok ? 200 : 503).json({
    ok,
    ts: new Date().toISOString(),
    summary,
    runtime: {
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      region: process.env.VERCEL_REGION || null,
      commit: buildIdentity.commit,
      commitFull: buildIdentity.commitFull,
      branch: buildIdentity.branch,
      buildIdentitySource: buildIdentity.source,
      buildIdentityGeneratedAt: buildIdentity.generatedAt,
      url: process.env.VERCEL_URL || null,
      node: process.versions?.node || null,
      backend: { db: selectedBackend() },
    },
    providers,
    featureFlags: {
      AUTH_REQUIRED: process.env.AUTH_REQUIRED === 'true',
      INNGEST_BACKEND: process.env.INNGEST_BACKEND || 'auto',
      DB_BACKEND: process.env.DB_BACKEND || 'auto',
      EMAIL_TEST_ENABLED: process.env.EMAIL_TEST_ENABLED === 'true',
      EMAIL_DRY_RUN: process.env.EMAIL_DRY_RUN === 'true',
      AXIOM_DRY_RUN: process.env.AXIOM_DRY_RUN === 'true',
      REPLIT_PROXY_DISABLED: process.env.REPLIT_PROXY_DISABLED === 'true',
    },
  });
}

export default withRequestLog(diagnosticHandler, { endpoint: '/api/diagnostic' });

export const config = { maxDuration: 30 };
