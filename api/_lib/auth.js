// Auth + multi-tenant context. Tenant data and operational capabilities use
// hard authentication gates; there is no environment-driven auth bypass.
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
import { timingSafeEqual } from 'node:crypto';

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

export function extractActiveOrganization(session = {}) {
  const compactOrg = session?.o && typeof session.o === 'object' ? session.o : {};
  return {
    id: session.org_id || session.orgId || compactOrg.id || null,
    role: session.org_role || session.orgRole || compactOrg.rol || null,
  };
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
  const configured = process.env.FLOWAI_SERVICE_KEY;
  if (typeof supplied !== 'string' || typeof configured !== 'string') return false;
  const suppliedBuffer = Buffer.from(supplied);
  const configuredBuffer = Buffer.from(configured);
  return suppliedBuffer.length === configuredBuffer.length
    && timingSafeEqual(suppliedBuffer, configuredBuffer);
}

function attachVerifiedRequestContext(req, ctx) {
  if (!ctx?.authenticated) return ctx;
  if (!Object.prototype.hasOwnProperty.call(req, 'flowaiAuthContext')) {
    Object.defineProperty(req, 'flowaiAuthContext', {
      value: Object.freeze({
        authenticated: true,
        authMode: ctx.authMode,
        orgId: ctx.orgId || null,
        productId: ctx.productId || null,
        userId: ctx.userId || null,
      }),
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }
  return ctx;
}

// Main entry point: returns a request context object with everything
// downstream needs to scope reads/writes correctly.
export async function getRequestContext(req) {
  // 1. Service-to-service path — trusted, supply org/user via headers.
  if (isServiceCall(req)) {
    return attachVerifiedRequestContext(req, {
      authenticated: true,
      authMode: 'service',
      orgId: resolveOrgId(req),
      productId: resolveProductId(req),
      userId: req.headers?.['x-flowai-user-id'] || null,
      clerkSession: null,
    });
  }

  // 2. Verified Clerk session.
  const session = await verifySession(req);
  if (session) {
    const { id: activeOrgId, role: activeOrgRole } = extractActiveOrganization(session);
    return attachVerifiedRequestContext(req, {
      authenticated: true,
      authMode: 'clerk',
      // Tenant identity must come only from verified active-organization
      // claims. Never fall back to caller-controlled headers/body/query.
      orgId: activeOrgId && activeOrgRole ? activeOrgId : null,
      productId: resolveProductId(req),
      userId: session.sub || session.userId || null,
      clerkSession: session,
    });
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
  const ctx = await getRequestContext(req);
  if (!ctx.authenticated || !ctx.orgId || !ctx.userId) {
    res.status(ctx.authenticated ? 403 : 401).json({
      error: ctx.authenticated ? 'Active tenant membership required' : 'Authentication required',
      authMode: ctx.authMode,
    });
    return null;
  }
  return ctx;
}

export function isOperatorContext(ctx) {
  if (!ctx?.authenticated) return false;
  if (ctx.authMode === 'service') return true;
  const session = ctx.clerkSession || {};
  // Organization roles are tenant-local and must never grant authority over
  // platform-global controls. Only an explicit platform role may do so.
  const candidates = [
    session.flowai_platform_role,
    session.publicMetadata?.flowaiPlatformRole,
    session.privateMetadata?.flowaiPlatformRole,
    session.metadata?.flowaiPlatformRole,
    session.claims?.flowai_platform_role,
  ].filter(Boolean);
  return candidates.some((role) => {
    const normalized = String(role).toLowerCase();
    return ['platform_admin', 'platform_operator'].includes(normalized);
  });
}

function getHeader(req, name) {
  const value = req.headers?.[name] || req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function hasValidOperatorSecret(req) {
  const configuredValues = [
    process.env.FLOWAI_OPERATOR_SECRET,
  ].filter(value => typeof value === 'string' && value.length > 0);
  if (configuredValues.length === 0) return false;
  const supplied = getHeader(req, 'x-flowai-operator-secret');
  if (typeof supplied !== 'string' || supplied.length === 0) return false;
  const suppliedBuffer = Buffer.from(supplied);
  return configuredValues.some((configured) => {
    const configuredBuffer = Buffer.from(configured);
    return suppliedBuffer.length === configuredBuffer.length
      && timingSafeEqual(suppliedBuffer, configuredBuffer);
  });
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
