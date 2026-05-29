// Tests for api/leads/route.js — Vercel POST handler.
//
// All HubSpot calls are stubbed via DI: pass `createClient` to createHandler().
// globalThis.fetch is replaced with a throwing stub so any accidental real
// network call surfaces as a test failure.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHandler } from '../api/leads/route.js';

// ─── Outbound-network guard ──────────────────────────────────────────────

const _origFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = () => {
    throw new Error('Network call attempted in unit test (fetch is stubbed)');
  };
});
afterAll(() => {
  globalThis.fetch = _origFetch;
});

// ─── Mock req/res helpers ────────────────────────────────────────────────

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; this.ended = true; return this; },
    send(obj) { this.body = obj; this.ended = true; return this; },
    end() { this.ended = true; return this; },
  };
}
function makeReq({ method = 'GET', headers = {}, body, query, host } = {}) {
  return {
    method,
    headers: { 'user-agent': 'vitest', ...(host ? { host } : {}), ...headers },
    body,
    query: query || {},
    socket: { remoteAddress: '127.0.0.1' },
  };
}
function silentLog() {
  return { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
}

const VALID_BODY = Object.freeze({
  email: 'a@b.co',
  product_id: 'saige',
  source_page: '/',
  metadata: { utm_source: 'google' },
});

// ─── Handler shape ───────────────────────────────────────────────────────

describe('api/leads/route — handler shape', () => {
  it('exports createHandler factory returning an async function', async () => {
    const h = createHandler({ env: {}, log: silentLog() });
    expect(typeof h).toBe('function');
    expect(h.constructor.name).toMatch(/Function/i);
  });
});

// ─── Preflight + method gating ───────────────────────────────────────────

describe('api/leads/route — preflight + method gating', () => {
  it('OPTIONS returns 204', async () => {
    const h = createHandler({ env: {}, log: silentLog() });
    const res = makeRes();
    await h(makeReq({ method: 'OPTIONS' }), res);
    expect(res.statusCode).toBe(204);
  });

  it('GET returns 405', async () => {
    const h = createHandler({ env: {}, log: silentLog() });
    const res = makeRes();
    await h(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
    expect(res.body.reason).toBe('method_not_allowed');
  });

  it('PUT returns 405', async () => {
    const h = createHandler({ env: {}, log: silentLog() });
    const res = makeRes();
    await h(makeReq({ method: 'PUT' }), res);
    expect(res.statusCode).toBe(405);
  });
});

// ─── Validation ──────────────────────────────────────────────────────────

describe('api/leads/route — validation_failed (400)', () => {
  it('returns 400 with errors[] on bad payload', async () => {
    const h = createHandler({ env: {}, log: silentLog() });
    const res = makeRes();
    await h(makeReq({ method: 'POST', body: { email: 'nope' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.reason).toBe('validation_failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects missing body entirely', async () => {
    const h = createHandler({ env: {}, log: silentLog() });
    const res = makeRes();
    await h(makeReq({ method: 'POST' }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.reason).toBe('validation_failed');
  });
});

// ─── Demo namespace short-circuit (no HubSpot) ───────────────────────────

describe('api/leads/route — demo namespace short-circuit (202)', () => {
  function expectDemoAck(host) {
    return async () => {
      let upsertCalls = 0;
      let createCalls = 0;
      const fakeClient = { upsertContact: async () => { upsertCalls += 1; return { ok: true, action: 'created', id: 'x' }; } };
      const h = createHandler({
        createClient: () => { createCalls += 1; return fakeClient; },
        env: { HUBSPOT_API_KEY: 'pat-x' }, // intentionally configured — should still be skipped
        log: silentLog(),
      });
      const res = makeRes();
      await h(makeReq({ method: 'POST', headers: { host }, body: VALID_BODY }), res);
      expect(res.statusCode).toBe(202);
      expect(res.body).toMatchObject({ ok: true, action: 'demo_acknowledged', environment: 'demo' });
      expect(upsertCalls).toBe(0);
      expect(createCalls).toBe(0);
    };
  }

  it('host=saigedemo.com → 202; no HubSpot calls', expectDemoAck('saigedemo.com'));
  it('host=www.saigedemo.com → 202', expectDemoAck('www.saigedemo.com'));
  it('host=*.demo.veuaistudio.com → 202', expectDemoAck('saige.demo.veuaistudio.com'));
  it('host=sandbox.* → 202', expectDemoAck('sandbox.example.com'));

  it('honors origin header when host is non-demo', async () => {
    let upsertCalls = 0;
    const fakeClient = { upsertContact: async () => { upsertCalls += 1; return { ok: true, action: 'created', id: 'x' }; } };
    const h = createHandler({
      createClient: () => fakeClient,
      env: { HUBSPOT_API_KEY: 'pat-x' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({
      method: 'POST',
      headers: { host: 'flowai-dun.vercel.app', origin: 'https://saigedemo.com' },
      body: VALID_BODY,
    }), res);
    expect(res.statusCode).toBe(202);
    expect(upsertCalls).toBe(0);
  });
});

// ─── Production: fail-closed on missing key ──────────────────────────────

describe('api/leads/route — fail closed (503) on missing HUBSPOT_API_KEY', () => {
  it('returns 503 hubspot_unconfigured; no client constructed', async () => {
    let createCalls = 0;
    const h = createHandler({
      createClient: () => { createCalls += 1; return { upsertContact: async () => ({ ok: true }) }; },
      env: {}, // explicitly empty
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigeplatform.com' }, body: VALID_BODY }), res);
    expect(res.statusCode).toBe(503);
    expect(res.body.reason).toBe('hubspot_unconfigured');
    expect(createCalls).toBe(0);
  });

  it('treats empty-string HUBSPOT_API_KEY as missing', async () => {
    const h = createHandler({
      createClient: () => { throw new Error('should not be called'); },
      env: { HUBSPOT_API_KEY: '' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigeplatform.com' }, body: VALID_BODY }), res);
    expect(res.statusCode).toBe(503);
  });
});

// ─── Production happy path ───────────────────────────────────────────────

describe('api/leads/route — production happy path (201)', () => {
  it('returns 201 with environment + contact_id; client called with full lead shape', async () => {
    const upsertCalls = [];
    const createCalls = [];
    const fakeClient = {
      upsertContact: async (lead) => {
        upsertCalls.push(lead);
        return { ok: true, action: 'created', id: 'hs-1234', properties: {} };
      },
    };
    const h = createHandler({
      createClient: (opts) => { createCalls.push(opts); return fakeClient; },
      env: { HUBSPOT_API_KEY: 'pat-x' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({
      method: 'POST',
      headers: { host: 'saigeplatform.com' },
      body: { ...VALID_BODY, org_id: 'veu-ai-studio' },
    }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      ok: true,
      action: 'created',
      environment: 'production',
      contact_id: 'hs-1234',
    });
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]).toMatchObject({
      email: 'a@b.co',
      product_id: 'saige',
      source_page: '/',
      org_id: 'veu-ai-studio',
      metadata: { utm_source: 'google' },
    });
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0].apiKey).toBe('pat-x');
  });

  it('action=updated when client reports an existing-contact upsert', async () => {
    const fakeClient = { upsertContact: async () => ({ ok: true, action: 'updated', id: 'hs-9' }) };
    const h = createHandler({
      createClient: () => fakeClient,
      env: { HUBSPOT_API_KEY: 'pat-x' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigeplatform.com' }, body: VALID_BODY }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.action).toBe('updated');
  });
});

// ─── Production failure modes ────────────────────────────────────────────

describe('api/leads/route — production failure modes', () => {
  it('502 when client.upsertContact returns ok:false', async () => {
    const fakeClient = {
      upsertContact: async () => ({ ok: false, action: 'create_failed', status: 500, error: 'boom' }),
    };
    const h = createHandler({
      createClient: () => fakeClient,
      env: { HUBSPOT_API_KEY: 'pat-x' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigeplatform.com' }, body: VALID_BODY }), res);
    expect(res.statusCode).toBe(502);
    expect(res.body.reason).toBe('create_failed');
    expect(res.body.status).toBe(500);
  });

  it('500 when client.upsertContact throws', async () => {
    const fakeClient = {
      upsertContact: async () => { throw new Error('network blip'); },
    };
    const h = createHandler({
      createClient: () => fakeClient,
      env: { HUBSPOT_API_KEY: 'pat-x' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigeplatform.com' }, body: VALID_BODY }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.reason).toBe('upsert_threw');
  });

  it('500 when createClient throws', async () => {
    const h = createHandler({
      createClient: () => { throw new Error('bad config'); },
      env: { HUBSPOT_API_KEY: 'pat-x' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigeplatform.com' }, body: VALID_BODY }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.reason).toBe('client_init_failed');
  });
});

// ─── No-network contracts ────────────────────────────────────────────────

describe('api/leads/route — no-network contracts', () => {
  it('does NOT construct a client when in demo mode (regardless of key presence)', async () => {
    let createCalls = 0;
    const h = createHandler({
      createClient: () => { createCalls += 1; return { upsertContact: async () => ({ ok: true }) }; },
      env: { HUBSPOT_API_KEY: 'pat-x' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigedemo.com' }, body: VALID_BODY }), res);
    expect(createCalls).toBe(0);
  });

  it('does NOT construct a client when key missing in production', async () => {
    let createCalls = 0;
    const h = createHandler({
      createClient: () => { createCalls += 1; return { upsertContact: async () => ({ ok: true }) }; },
      env: {},
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigeplatform.com' }, body: VALID_BODY }), res);
    expect(createCalls).toBe(0);
  });

  it('does NOT construct a client when validation fails (regardless of env)', async () => {
    let createCalls = 0;
    const h = createHandler({
      createClient: () => { createCalls += 1; return { upsertContact: async () => ({ ok: true }) }; },
      env: { HUBSPOT_API_KEY: 'pat-x' },
      log: silentLog(),
    });
    const res = makeRes();
    await h(makeReq({ method: 'POST', headers: { host: 'saigeplatform.com' }, body: { email: 'bad' } }), res);
    expect(res.statusCode).toBe(400);
    expect(createCalls).toBe(0);
  });
});
