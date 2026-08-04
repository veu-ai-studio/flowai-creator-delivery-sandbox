// src/lib/observability/health.js
//
// Health-check probe set for FlowAI. Production Hardening Phase 1.4.
//
// Returns a JSON-serializable report with per-check status (PASS /
// DEGRADED / FAIL / NOT_WIRED) and a top-line aggregate.
//
// Checks:
//   - build:       commit + env metadata
//   - supabase:    reachable + service-role key present
//   - vercel_kv:   reachable (uses @vercel/kv if configured)
//   - auth:        Clerk backend/frontend readiness booleans
//   - orchestra:   per-member adapter status (11 members per parking-lot
//                  ENTRY 004; reports adapter-code-present + credentials-
//                  present per member; does NOT exercise the member at
//                  runtime — that's a deeper smoke probe)
//   - observability: pino + Sentry + Axiom-bridge state
//
// Constraints:
//   - Never throws. Each probe has its own try/catch; failures become
//     `FAIL` rows with an `error` field, not exceptions.
//   - Each probe has its own short timeout (≤5s) so the aggregate
//     completes promptly even when a dependency is unreachable.
//   - NEVER returns credential VALUES. Field whitelisting: status,
//     reason, and configured-boolean only.

import { resolveBuildIdentity } from './buildIdentity.js';
import { observabilityInventory } from './logger.js';

const DEFAULT_PROBE_TIMEOUT_MS = 5_000;

const STATUSES = Object.freeze({
  PASS:       'PASS',
  DEGRADED:   'DEGRADED',
  FAIL:       'FAIL',
  NOT_WIRED:  'NOT_WIRED',
});

// ─── Orchestra registry (per parking-lot ENTRY 004) ─────────────────────
//
// 11-member AI Orchestra. NOT yet canonical — pending SSOT amendment
// cycle disposition (see docs/SSOT_PARKING_LOT.md ENTRY 004 + 005).
// Each entry declares the credential env vars the member needs and a
// short adapter probe (presence check only, not a live call).

const ORCHESTRA = Object.freeze([
  {
    id: 'codex',
    label: 'Codex',
    envs: ['OPENAI_API_KEY'],
    adapterHint: 'src/lib/orchestra/codex.js code-patch/generate-from-scratch runtime adapter',
    runtimeAdapter: true,
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    envs: ['ANTHROPIC_API_KEY'],
    adapterHint: 'src/lib/orchestra/claudeCode.js analyze/design/score/code-patch runtime adapter',
    runtimeAdapter: true,
  },
  {
    id: 'base44',
    label: 'Base44',
    envs: ['BASE44_API_BASE_URL', 'BASE44_API_TOKEN'],
    adapterHint: 'api/_lib/orchestrator/agents/base44.js + src/api/base44Client.js',
    runtimeAdapter: true,
  },
  {
    id: 'lovable',
    label: 'Lovable',
    envs: [],
    adapterHint: 'archived (scripts/lib/headless/archive/lovable-chat.mjs.archived-2026-05-13)',
    runtimeAdapter: false,
  },
  {
    id: 'v0',
    label: 'Vercel v0',
    envs: ['VERCEL_V0_TOKEN'],
    adapterHint: 'scripts/lib/peer-review.mjs callVercelV0Adapter (Panel reviewer only — no /api/* runtime adapter)',
    runtimeAdapter: false,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    envs: [],
    adapterHint: 'developer-IDE only; no runtime adapter expected in /api/*',
    runtimeAdapter: false,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    envs: ['OPENROUTER_API_KEY'],
    adapterHint: 'scripts/lib/peer-review.mjs (Panel reviewer; no /api/* runtime adapter)',
    runtimeAdapter: false,
  },
  {
    id: 'browserless',
    label: 'Browserless',
    envs: ['BROWSERLESS_API_KEY'],
    adapterHint: 'api/_lib/crawler.js viaBrowserless + richCapture',
    runtimeAdapter: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic API (direct)',
    envs: ['ANTHROPIC_API_KEY'],
    adapterHint: 'api/_lib/claude.js callClaude',
    runtimeAdapter: true,
  },
  {
    id: 'replit',
    label: 'Replit',
    envs: [],
    adapterHint: 'archived (scripts/lib/headless/archive/replit-agent.mjs.archived-2026-05-13)',
    runtimeAdapter: false,
  },
  {
    id: 'playwright',
    label: 'Playwright',
    envs: ['PLAYWRIGHT_ENDPOINT'],
    adapterHint: 'api/_lib/orchestrator/agents/playwright.js + api/_lib/crawler.js viaPlaywright',
    runtimeAdapter: true,
  },
]);

// ─── Build / env probe ──────────────────────────────────────────────────

function buildProbe() {
  const buildIdentity = resolveBuildIdentity(process.env);
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  const region = process.env.VERCEL_REGION || null;
  const url = process.env.VERCEL_URL || null;
  return {
    status: buildIdentity.commitFull ? STATUSES.PASS : STATUSES.DEGRADED,
    commit: buildIdentity.commit,
    commitFull: buildIdentity.commitFull,
    branch: buildIdentity.branch,
    buildIdentitySource: buildIdentity.source,
    buildIdentityGeneratedAt: buildIdentity.generatedAt,
    env,
    region,
    deploymentUrl: url ? `https://${url}` : null,
    nodeVersion: process.versions?.node ?? null,
    reason: buildIdentity.commitFull
      ? null
      : 'No commit metadata surfaced by Vercel env or generated build info',
  };
}

// ─── Supabase probe ─────────────────────────────────────────────────────

async function supabaseProbe(signal) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { status: STATUSES.NOT_WIRED, reason: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' };
  }
  try {
    // Cheapest reachable check: GET /rest/v1/ with apikey header.
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: key, accept: 'application/json' },
      signal,
    });
    if (res.status === 200 || res.status === 404) {
      // 404 is "no resource" but the API itself is reachable + authenticated.
      return { status: STATUSES.PASS, httpStatus: res.status };
    }
    if (res.status === 401 || res.status === 403) {
      return { status: STATUSES.DEGRADED, httpStatus: res.status, reason: 'auth rejected — service role key invalid?' };
    }
    return { status: STATUSES.DEGRADED, httpStatus: res.status, reason: `unexpected status ${res.status}` };
  } catch (e) {
    return { status: STATUSES.FAIL, reason: e?.message ?? String(e) };
  }
}

// ─── Vercel KV probe ────────────────────────────────────────────────────

async function vercelKvProbe(signal) {
  const url = process.env.KV_REST_API_URL || process.env.KV_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN;
  if (!url || !token) {
    return { status: STATUSES.NOT_WIRED, reason: 'KV_REST_API_URL / KV_REST_API_TOKEN missing' };
  }
  try {
    // Vercel KV exposes a REST API. PING is the cheapest reachability call.
    const res = await fetch(`${url.replace(/\/$/, '')}/ping`, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
      signal,
    });
    if (res.ok) return { status: STATUSES.PASS, httpStatus: res.status };
    if (res.status === 401 || res.status === 403) {
      return { status: STATUSES.DEGRADED, httpStatus: res.status, reason: 'auth rejected' };
    }
    return { status: STATUSES.DEGRADED, httpStatus: res.status, reason: `unexpected status ${res.status}` };
  } catch (e) {
    return { status: STATUSES.FAIL, reason: e?.message ?? String(e) };
  }
}

// ─── Orchestra-member probes (presence only) ────────────────────────────

function orchestraProbe() {
  const members = ORCHESTRA.map((m) => {
    const credentialsPresent = m.envs.length === 0
      ? null // some members (Claude Code, Cursor, Lovable, Replit) need no runtime creds
      : m.envs.every((e) => Boolean(process.env[e] && process.env[e].length > 0));
    let status;
    if (!m.runtimeAdapter) {
      // Member exists in concept but has no /api/* runtime adapter — that
      // includes IDE-only tools (Claude Code, Cursor), archived adapters
      // (Lovable, Replit), and Panel-script-only adapters (v0, OpenRouter).
      status = STATUSES.NOT_WIRED;
    } else if (m.envs.length === 0) {
      status = STATUSES.PASS;
    } else if (credentialsPresent) {
      status = STATUSES.PASS;
    } else {
      status = STATUSES.DEGRADED;
    }
    return {
      id: m.id,
      label: m.label,
      status,
      runtimeAdapter: m.runtimeAdapter,
      credentialsRequired: m.envs,
      credentialsPresent,
      adapterHint: m.adapterHint,
    };
  });
  const liveCount = members.filter((m) => m.status === STATUSES.PASS).length;
  const adapterCount = members.filter((m) => m.runtimeAdapter).length;
  return {
    members,
    summary: {
      total: members.length,
      runtimeAdapters: adapterCount,
      live: liveCount,
      degraded: members.filter((m) => m.status === STATUSES.DEGRADED).length,
      notWired: members.filter((m) => m.status === STATUSES.NOT_WIRED).length,
    },
  };
}

// ─── Observability self-check ───────────────────────────────────────────

function observabilityProbe() {
  const inv = observabilityInventory();
  let status;
  if (inv.sentry.configured && !inv.sentry.initialized) status = STATUSES.DEGRADED;
  else if (inv.sentry.configured && inv.sentry.initialized) status = STATUSES.PASS;
  else status = STATUSES.NOT_WIRED;
  return {
    status,
    pino: inv.pino,
    sentry: inv.sentry,
    axiomBridge: { configured: inv.axiomBridgeConfigured },
  };
}

function githubAppProbe() {
  const hasPatFallback = Boolean(process.env.GITHUB_PAT);
  const configured = Boolean(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY &&
    (process.env.GITHUB_APP_INSTALLATION_ID || process.env.GITHUB_INSTALLATION_ID),
  );
  if (configured) {
    return {
      status: STATUSES.PASS,
      configured: true,
      patFallback: hasPatFallback,
      installationIdAlias: process.env.GITHUB_APP_INSTALLATION_ID
        ? 'GITHUB_APP_INSTALLATION_ID'
        : 'GITHUB_INSTALLATION_ID',
    };
  }
  if (hasPatFallback) {
    return {
      status: STATUSES.DEGRADED,
      configured: false,
      patFallback: true,
      reason: 'GITHUB_PAT fallback present but GitHub App env trio incomplete',
    };
  }
  return {
    status: STATUSES.NOT_WIRED,
    configured: false,
    patFallback: false,
    reason: 'GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and installation id env are required',
  };
}

function authProbe() {
  const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);
  const frontendPublishableKeyPresent = Boolean(process.env.VITE_CLERK_PUBLISHABLE_KEY);
  const authRequired = process.env.AUTH_REQUIRED === 'true';
  let status = STATUSES.NOT_WIRED;
  let reason = 'CLERK_SECRET_KEY not set';

  if (clerkConfigured && frontendPublishableKeyPresent) {
    status = STATUSES.PASS;
    reason = null;
  } else if (clerkConfigured) {
    status = STATUSES.DEGRADED;
    reason = 'VITE_CLERK_PUBLISHABLE_KEY not set';
  }

  return {
    status,
    clerkConfigured,
    frontendPublishableKeyPresent,
    authRequired,
    reason,
  };
}

// ─── Aggregate ──────────────────────────────────────────────────────────

function aggregateStatus(checks) {
  // Top-level readiness must not contradict the detailed checks. Any
  // configured core integration that is degraded, failed, or not wired makes
  // the service reachable-but-degraded rather than "all systems operational".
  const coreChecks = [
    checks.build,
    checks.supabase,
    checks.vercelKv,
    checks.observability,
    checks.githubApp,
    checks.auth,
  ];
  if (coreChecks.some((check) => check?.status !== STATUSES.PASS)) {
    return STATUSES.DEGRADED;
  }
  if (
    checks.orchestra.summary.live === 0
    || checks.orchestra.summary.degraded > 0
    || checks.orchestra.summary.notWired > 0
  ) return STATUSES.DEGRADED;
  return STATUSES.PASS;
}

// ─── Public API ─────────────────────────────────────────────────────────

export async function runHealthChecks({ timeoutMs = DEFAULT_PROBE_TIMEOUT_MS } = {}) {
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const [supabase, vercelKv] = await Promise.all([
      supabaseProbe(ac.signal),
      vercelKvProbe(ac.signal),
    ]);
    const build = buildProbe();
    const orchestra = orchestraProbe();
    const observability = observabilityProbe();
    const githubApp = githubAppProbe();
    const auth = authProbe();
    const checks = { build, supabase, vercelKv, orchestra, observability, githubApp, auth };
    const status = aggregateStatus(checks);
    return {
      status,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t0,
      checks,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Re-exported for callers that want introspection without running probes.
export { ORCHESTRA, STATUSES };
export const __test = { aggregateStatus };
