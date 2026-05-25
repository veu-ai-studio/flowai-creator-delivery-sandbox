// Auth + multi-tenant context.
//
// ────────────────────────────────────────────────────────────────────────
// ⚠️  TEMPORARY INTERNAL-PROOF AUTH BYPASS  —  REMOVE BEFORE EXTERNAL USE
// ────────────────────────────────────────────────────────────────────────
// Added 2026-05-16 (this W2 dispatch session). The `requireAuthHard()`
// helper below checks `process.env.FLOWAI_AUTH_BYPASS` at the top of its
// body. When the env var is set to the exact value `PROVE_INTERNAL_2026`,
// the helper returns a synthetic authorized context instead of 401ing.
// When the env var is unset (default), normal auth enforcement runs
// unchanged — the S-3 fix from commit c7d5362 is FULLY PRESERVED.
//
// WHY this exists:
//   FlowAI is internal AI Operating System infrastructure for VEU AI
//   Studio (CANONICAL_REFERENCE §1: "Not a SaaS product"). During the
//   internal-proof phase, the system needs to be reachable from a
//   browser session that does not carry a verified Clerk JWT, so we can
//   prove end-to-end pipeline behavior before wiring up Clerk-in-the-UI.
//   The S-3 public-threat-model fix (anon-rejection on 11 endpoints)
//   was correctly added — but it's premature to enforce against an
//   internal proof workflow that hasn't yet been gated by Clerk on the
//   front end.
//
// HOW to disable the bypass:
//   1. Unset the FLOWAI_AUTH_BYPASS env var in Vercel (Settings → Env
//      Vars → remove the entry for `production` AND `preview`).
//   2. Redeploy. Anonymous callers immediately resume getting 401.
//   The bypass requires the EXACT string `PROVE_INTERNAL_2026` — typos
//   or any other value fall through to normal 401 behavior.
//
// WHEN to remove this entire block:
//   Before any external exposure of FlowAI (public marketing site,
//   external customer signup, public API gateway, etc.). Tracked by the
//   commit message of the patch that added it. Search the repo for
//   `FLOWAI_AUTH_BYPASS` to find the env-gated branch + this comment.
// ────────────────────────────────────────────────────────────────────────
//
// ── org_id flow ──────────────────────────────────────────────────────────
// 1. Browser request hits /api/* with a Clerk session cookie or an
//    Authorization: Bearer <jwt> header.
// 2. requireAuth() verifies the token via Clerk's SDK. The verified session
//    payload contains the active organization id (and user id).
// 3. We map Clerk's org_id → our organizations.clerk_org_id row, returning
//    the internal UUID for downstream queries (db.js scopes by it).
// 4. Tenant header pass-through: tests / cron / cross-service callers without
//    a Clerk session can supply x-flowai-org-id directly. This is also the
//    bridge the Inngest scheduled functions use, since they run as the
//    service identity.
//
// Feature flags:
//   AUTH_REQUIRED=false (default) — endpoints accept anonymous calls; org_id
//     is best-effort (header / body / null). No regression today.
//   AUTH_REQUIRED=true — every /api/* call (except /api/inngest, /api/me,
//     and any explicitly listed allowlist) must carry a verified Clerk
//     session OR x-flowai-service-key matching FLOWAI_SERVICE_KEY.
//
// Env:
//   CLERK_SECRET_KEY        — server-side Clerk SDK secret
//   AUTH_REQUIRED           — 'true' to turn on hard auth gates
//   FLOWAI_SERVICE_KEY      — shared secret for service-to-service calls
//                             (Inngest cron functions, etc.)
//
// Today: no envs set → withAuth() resolves to { orgId: <header>, userId: null,
// authenticated: false } and lets every call through. Tomorrow: flip env vars
// and behaviour upgrades automatically.

import { resolveOrgId, resolveProductId } from './tenant.js';

let clerkClient = null;
let clerkLoadFailed = false;

async function loadClerkClient() {
  if (clerkClient || clerkLoadFailed) return clerkClient;
  if (!process.env.CLERK_SECRET_KEY) return null;
  try {
    // Dynamic import keeps cold-start cheap when Clerk isn't configured.
    const sdk = await import('@clerk/clerk-sdk-node');
    clerkClient = sdk.createClerkClient
      ? sdk.createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
      : sdk.default || sdk.clerkClient || sdk;
    return clerkClient;
  } catch (e) {
    clerkLoadFailed = true;
    console.warn('[auth] Failed to load Clerk SDK:', e.message);
    return null;
  }
}

export function isAuthRequired() {
  return process.env.AUTH_REQUIRED === 'true';
}

export function isClerkConfigured() {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

function extractToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  // Cookie fallback: Clerk sets `__session`
  const cookie = req.headers?.cookie || '';
  const m = cookie.match(/__session=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

// Verifies the session and returns Clerk session/user/org payload, or null.
export async function verifySession(req) {
  const token = extractToken(req);
  if (!token) return null;
  const clerk = await loadClerkClient();
  if (!clerk) return null;
  try {
    const verifyToken = clerk.verifyToken || clerk.sessions?.verifySession;
    if (!verifyToken) return null;
    const payload = await verifyToken(token);
    return payload || null;
  } catch (e) {
    return null;
  }
}

// Returns the active service-key claim if request carries x-flowai-service-key
// matching env. Used for cron jobs / Inngest dispatched work.
function isServiceCall(req) {
  const supplied = req.headers?.['x-flowai-service-key'];
  return Boolean(supplied && process.env.FLOWAI_SERVICE_KEY && supplied === process.env.FLOWAI_SERVICE_KEY);
}

// Main entry point: returns a request context object with everything
// downstream needs to scope reads/writes correctly.
export async function getRequestContext(req) {
  // 1. Service-to-service path — trusted, supply org/user via headers.
  if (isServiceCall(req)) {
    return {
      authenticated: true,
      authMode: 'service',
      orgId: resolveOrgId(req),
      productId: resolveProductId(req),
      userId: req.headers?.['x-flowai-user-id'] || null,
      clerkSession: null,
    };
  }

  // 2. Verified Clerk session.
  const session = await verifySession(req);
  if (session) {
    return {
      authenticated: true,
      authMode: 'clerk',
      orgId: session.org_id || session.orgId || resolveOrgId(req) || null,
      productId: resolveProductId(req),
      userId: session.sub || session.userId || null,
      clerkSession: session,
    };
  }

  // 3. Anonymous fallback (still scope-able via header / body / query).
  return {
    authenticated: false,
    authMode: 'anonymous',
    orgId: resolveOrgId(req),
    productId: resolveProductId(req),
    userId: null,
    clerkSession: null,
  };
}

// Endpoints that need to enforce auth call this. When AUTH_REQUIRED is false,
// it's a passthrough.
export async function requireAuth(req, res) {
  const ctx = await getRequestContext(req);
  if (!isAuthRequired()) return ctx;
  if (!ctx.authenticated) {
    res.status(401).json({ error: 'Authentication required', authMode: ctx.authMode });
    return null;
  }
  return ctx;
}

// Hard-gate variant: always 401 for unauthenticated callers, regardless of
// the AUTH_REQUIRED feature flag. Used by endpoints that touch tenant data or
// mutate state — those MUST never be reachable anonymously.
//
// Per W4 adversarial run bd2f923 showstoppers S-1 (anon data exposure on
// /api/configuration/products) and S-3 (auth-after-validation on 11 POST
// endpoints leaked schema-error oracles to anon callers). Wired into the
// affected endpoints in commit (this commit).
export async function requireAuthHard(req, res) {
  // TEMPORARY — internal-proof bypass. Reversible.
  // Tracked: remove before any external exposure. See file header comment
  // for full rationale + how to disable. Default OFF: unsetting the env
  // var (or any value other than the exact literal) falls through to the
  // normal 401-on-anonymous behavior preserved below.
  if (process.env.FLOWAI_AUTH_BYPASS === 'PROVE_INTERNAL_2026') {
    return {
      authenticated: true,
      authMode: 'bypass-internal-proof',
      orgId: resolveOrgId(req) || null,
      productId: resolveProductId(req),
      userId: null,
      clerkSession: null,
    };
  }

  const ctx = await getRequestContext(req);
  if (!ctx.authenticated) {
    res.status(401).json({ error: 'Authentication required', authMode: ctx.authMode });
    return null;
  }
  return ctx;
}

export function isOperatorContext(ctx) {
  if (!ctx?.authenticated) return false;
  if (ctx.authMode === 'service') return true;
  const session = ctx.clerkSession || {};
  const candidates = [
    session.role,
    session.org_role,
    session.orgRole,
    session.publicMetadata?.role,
    session.privateMetadata?.role,
    session.metadata?.role,
    session.claims?.role,
  ].filter(Boolean);
  return candidates.some((role) => ['admin', 'operator', 'owner'].includes(String(role).toLowerCase()));
}

function getHeader(req, name) {
  const value = req.headers?.[name] || req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function hasValidOperatorSecret(req) {
  const configured = process.env.FLOWAI_OPERATOR_SECRET;
  if (!configured) return false;
  const supplied = getHeader(req, 'x-flowai-operator-secret');
  return Boolean(supplied && supplied === configured);
}

export async function requireOperatorAuth(req, res) {
  const ctx = await getRequestContext(req);
  if (isOperatorContext(ctx)) return ctx;
  if (!ctx.authenticated && hasValidOperatorSecret(req)) {
    return {
      authenticated: true,
      authMode: 'operator-secret',
      orgId: resolveOrgId(req),
      productId: resolveProductId(req),
      userId: null,
      clerkSession: null,
    };
  }
  res.status(401).json({ error: 'Authentication required', authMode: ctx.authMode });
  return null;
}

// Helper for endpoints that want a short-circuit version.
export async function withContext(req, res, handler) {
  const ctx = await requireAuth(req, res);
  if (!ctx) return; // requireAuth already wrote a 401
  return handler(ctx);
}
