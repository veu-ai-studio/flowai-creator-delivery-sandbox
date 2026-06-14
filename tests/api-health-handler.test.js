// In-process smoke test for /api/health (PA #2.5b).
// Calls the handler directly — no network. Verifies the FlowAIHealthBadge
// will see a 200 OK with the expected shape.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../api/health.js';

function makeRes() {
  const headers = {};
  let statusCode = 200;
  let body = null;
  return {
    setHeader: vi.fn((k, v) => { headers[k] = v; }),
    status: vi.fn(function (code) { statusCode = code; return this; }),
    json: vi.fn(function (data) { body = data; return this; }),
    end: vi.fn(function () { return this; }),
    _get: () => ({ headers, statusCode, body }),
  };
}

describe('GET /api/health', () => {
  let savedEnv;
  beforeEach(() => {
    savedEnv = { ...process.env };
  });
  afterEach(() => {
    process.env = savedEnv;
  });

  it('returns 200 with ok:true for a GET', async () => {
    const req = { method: 'GET', headers: { origin: 'https://x.example' } };
    const res = makeRes();
    await handler(req, res);
    const out = res._get();
    expect(out.statusCode).toBe(200);
    expect(out.body).toMatchObject({
      ok: true,
      service: 'flowai',
    });
    expect(typeof out.body.githubAppReady).toBe('boolean');
    expect(typeof out.body.inngestReady).toBe('boolean');
    expect(out.body.checks.githubApp).toBeTruthy();
    expect(out.body.checks.orchestra.members.some(member => member.id === 'codex')).toBe(true);
    // status is 'ready' on PASS and 'degraded' on DEGRADED — both
    // map to ok:true per the handler's PASS|DEGRADED gate. The exact
    // string depends on which downstream credentials are wired in
    // the test env; assert membership in the valid set rather than
    // pinning a specific value.
    expect(['ready', 'degraded']).toContain(out.body.status);
    expect(typeof out.body.timestamp).toBe('string');
    expect(typeof out.body.version).toBe('string');
  });

  it('echoes VERCEL_ENV in the env field', async () => {
    process.env.VERCEL_ENV = 'preview';
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.env).toBe('preview');
  });

  it('falls back to NODE_ENV when VERCEL_ENV unset', async () => {
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'production';
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.env).toBe('production');
  });

  it('reports VERCEL_REGION when present', async () => {
    process.env.VERCEL_REGION = 'iad1';
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.region).toBe('iad1');
  });

  it('reports VERCEL_GIT_COMMIT_SHA when present', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123';
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.commit).toBe('abc123');
  });

  it('reports GitHub App readiness when canonical env vars are present', async () => {
    process.env.GITHUB_APP_ID = '3748219';
    process.env.GITHUB_APP_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----';
    process.env.GITHUB_APP_INSTALLATION_ID = '133220298';
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.githubAppReady).toBe(true);
    expect(res._get().body.checks.githubApp).toMatchObject({
      status: 'PASS',
      configured: true,
      installationIdAlias: 'GITHUB_APP_INSTALLATION_ID',
    });
  });

  it('reports Inngest readiness when canonical env vars are present', async () => {
    process.env.INNGEST_EVENT_KEY = 'inngest-event-key';
    process.env.INNGEST_SIGNING_KEY = 'inngest-signing-key';
    delete process.env.INNGEST_BACKEND;
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.inngestReady).toBe(true);
  });

  it('reports Inngest unavailable when backend is forced inline', async () => {
    process.env.INNGEST_EVENT_KEY = 'inngest-event-key';
    process.env.INNGEST_SIGNING_KEY = 'inngest-signing-key';
    process.env.INNGEST_BACKEND = 'inline';
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.inngestReady).toBe(false);
  });

  it('reports Clerk auth readiness fields without leaking env values', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_health_secret_should_not_leak';
    process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_health_public_should_not_echo';
    delete process.env.AUTH_REQUIRED;
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    const body = res._get().body;
    expect(body.clerkReady).toBe(true);
    expect(body.checks.auth).toMatchObject({
      status: 'PASS',
      clerkConfigured: true,
      frontendPublishableKeyPresent: true,
      authRequired: false,
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(process.env.CLERK_SECRET_KEY);
    expect(serialized).not.toContain(process.env.VITE_CLERK_PUBLISHABLE_KEY);
  });

  it('does not report clerkReady when the frontend publishable key is missing', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_backend_present';
    delete process.env.VITE_CLERK_PUBLISHABLE_KEY;
    delete process.env.AUTH_REQUIRED;
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    const body = res._get().body;
    expect(body.clerkReady).toBe(false);
    expect(body.checks.auth).toMatchObject({
      status: 'DEGRADED',
      clerkConfigured: true,
      frontendPublishableKeyPresent: false,
      authRequired: false,
    });
  });

  it('keeps AUTH_REQUIRED false by default in health auth readiness', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_configured';
    process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_configured';
    delete process.env.AUTH_REQUIRED;
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.checks.auth.authRequired).toBe(false);
  });

  it('handles OPTIONS preflight with 204', () => {
    const req = { method: 'OPTIONS', headers: { origin: 'https://x.example' } };
    const res = makeRes();
    handler(req, res);
    expect(res._get().statusCode).toBe(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('rejects POST with 405', () => {
    const req = { method: 'POST', headers: {} };
    const res = makeRes();
    handler(req, res);
    expect(res._get().statusCode).toBe(405);
    expect(res._get().body).toMatchObject({ ok: false });
  });

  it('sets CORS headers (echoes origin, allows GET+OPTIONS)', () => {
    const req = { method: 'GET', headers: { origin: 'https://x.example' } };
    const res = makeRes();
    handler(req, res);
    const { headers } = res._get();
    expect(headers['Access-Control-Allow-Origin']).toBe('https://x.example');
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
    expect(headers['Cache-Control']).toBe('no-store');
  });

  it('falls back to * when no origin header is present', () => {
    const req = { method: 'GET', headers: {} };
    const res = makeRes();
    handler(req, res);
    expect(res._get().headers['Access-Control-Allow-Origin']).toBe('*');
  });
});
