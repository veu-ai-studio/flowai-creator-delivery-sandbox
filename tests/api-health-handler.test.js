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
