// W4 lead-capture tests.
//
// Layered coverage:
//   1. Pure validators / utilities from api/_lib/authBackend.js + tenant.js.
//   2. The api/leads/capture.js handler (in-memory path; no outbound HTTP).
//   3. Schema + veu_-prefixed HubSpot field-map shape (drives the future
//      api/_lib/leads/hubspot.js — implemented INLINE in this test as the
//      reference field-mapper). Each veu_ property name comes from the W0
//      ruling (veu_product_interest, veu_lead_source, veu_demo_requested,
//      veu_demo_scheduled_at, veu_utm_source, veu_utm_medium,
//      veu_utm_campaign, veu_message).
//   4. Demo-namespace resolution (saigedemo.com, *.demo.veuaistudio.com,
//      sandbox.*). The ruling pattern list is implemented INLINE so the test
//      pins the contract; once a real resolveEnv lands in api/_lib/tenant.js
//      this test should be re-pointed at the production helper.
//   5. UTM-parameter capture from a request body or query.
//
// All network is stubbed: globalThis.fetch throws if called.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  isValidEmail,
  rateLimitOk,
  clientIp,
  hashPassword,
  verifyPassword,
} from '../api/_lib/authBackend.js';
import { resolveOrgId, resolveProductId } from '../api/_lib/tenant.js';

import captureHandler from '../api/leads/capture.js';

// ─── Outbound-network guard ──────────────────────────────────────────────

const _origFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = () => {
    throw new Error('Network call attempted in unit test (fetch is mocked)');
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
    headers: {
      'user-agent': 'vitest',
      ...(host ? { host } : {}),
      ...headers,
    },
    body,
    query: query || {},
    socket: { remoteAddress: '127.0.0.1' },
  };
}

// ─── Reference field-mapper (W0-ruled veu_-prefixed names) ───────────────
// Inline reference implementation that the W4 spec calls for. Used here as
// a contract pin — once api/_lib/leads/hubspot.js (or src/lib/leads/hubspot.js)
// lands, swap the import and delete this stand-in.

const VEU_HUBSPOT_PROPERTIES = Object.freeze([
  'veu_product_interest',
  'veu_lead_source',
  'veu_demo_requested',
  'veu_demo_scheduled_at',
  'veu_utm_source',
  'veu_utm_medium',
  'veu_utm_campaign',
  'veu_message',
]);

function leadToHubspotProperties(lead) {
  const meta = (lead && typeof lead.metadata === 'object' && lead.metadata) || {};
  return {
    email: lead.email,
    veu_product_interest: lead.product_id || null,
    veu_lead_source: lead.source_page || meta.form || meta.source || null,
    veu_demo_requested: Boolean(meta.demo_requested),
    veu_demo_scheduled_at: meta.demo_scheduled_at || null,
    veu_utm_source: meta.utm_source || meta.source || null,
    veu_utm_medium: meta.utm_medium || null,
    veu_utm_campaign: meta.utm_campaign || meta.campaign || null,
    veu_message: meta.message || null,
  };
}

// ─── Reference demo-namespace resolver ───────────────────────────────────
// The W0 ruling lists three demo-namespace patterns:
//   1. saigedemo.com (and product-specific *demo.com)
//   2. *.demo.veuaistudio.com
//   3. sandbox.* subdomains
// Pinned here as a contract; replace with the production helper when one
// ships in api/_lib/tenant.js.

function resolveEnv(req) {
  const host = (req.headers?.host || '').toLowerCase().replace(/:\d+$/, '');
  if (!host) return 'prod';
  if (host === 'saigedemo.com' || host === 'www.saigedemo.com') return 'live-demo';
  if (host.endsWith('.demo.veuaistudio.com') || host === 'demo.veuaistudio.com') return 'demo';
  if (host.startsWith('sandbox.')) return 'sales-demo';
  return 'prod';
}

// ─── Reference UTM extractor ─────────────────────────────────────────────
// Where the production capture handler currently stores `metadata` as opaque,
// future code should prefer named utm_* fields. Pin the extraction shape so
// the W0-ruled veu_utm_* keys have a deterministic source.

function extractUtm({ body, query }) {
  const b = body || {};
  const q = query || {};
  const m = (b.metadata && typeof b.metadata === 'object') ? b.metadata : {};
  return {
    utm_source: m.utm_source || q.utm_source || b.utm_source || null,
    utm_medium: m.utm_medium || q.utm_medium || b.utm_medium || null,
    utm_campaign: m.utm_campaign || q.utm_campaign || b.utm_campaign || null,
  };
}

// ─── Pure-function tests ─────────────────────────────────────────────────

describe('authBackend / pure validators', () => {
  it('isValidEmail accepts well-formed addresses', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('first.last+tag@domain.example')).toBe(true);
  });

  it('isValidEmail rejects bad addresses', () => {
    for (const v of ['', 'no-at-sign', 'a@b', 'a @b.co', null, undefined, 42]) {
      expect(isValidEmail(v)).toBe(false);
    }
  });

  it('rateLimitOk allows up to max then blocks within the window', () => {
    const ip = '10.0.0.1';
    const endpoint = 'leads-test-' + Math.random().toString(36).slice(2);
    for (let i = 0; i < 3; i++) {
      expect(rateLimitOk({ ip, endpoint, max: 3, windowMs: 60_000 })).toBe(true);
    }
    expect(rateLimitOk({ ip, endpoint, max: 3, windowMs: 60_000 })).toBe(false);
  });

  it('rateLimitOk passes through when ip is null (best-effort)', () => {
    expect(rateLimitOk({ ip: null, endpoint: 'whatever', max: 1 })).toBe(true);
  });

  it('clientIp prefers x-forwarded-for, then x-real-ip, then socket', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' } })).toBe('203.0.113.5');
    expect(clientIp({ headers: { 'x-real-ip': '198.51.100.7' } })).toBe('198.51.100.7');
    expect(clientIp({ headers: {}, socket: { remoteAddress: '127.0.0.1' } })).toBe('127.0.0.1');
    expect(clientIp({ headers: {} })).toBe(null);
  });

  it('hashPassword + verifyPassword round-trips and rejects wrong password', () => {
    const hash = hashPassword('correct horse battery staple');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(verifyPassword('wrong password', hash)).toBe(false);
    expect(verifyPassword('', hash)).toBe(false);
  });

  it('hashPassword rejects too-short passwords', () => {
    expect(() => hashPassword('short')).toThrow();
  });
});

describe('tenant / resolution helpers', () => {
  it('resolveOrgId reads x-flowai-org-id header first', () => {
    const req = { headers: { 'x-flowai-org-id': 'org-from-header' }, body: { orgId: 'body' }, query: { orgId: 'q' } };
    expect(resolveOrgId(req)).toBe('org-from-header');
  });
  it('resolveOrgId falls through to body, then query, then null', () => {
    expect(resolveOrgId({ headers: {}, body: { orgId: 'b' }, query: {} })).toBe('b');
    expect(resolveOrgId({ headers: {}, body: {}, query: { orgId: 'q' } })).toBe('q');
    expect(resolveOrgId({ headers: {}, body: {}, query: {} })).toBe(null);
    expect(resolveOrgId(null)).toBe(null);
  });
  it('resolveProductId reads body or query', () => {
    expect(resolveProductId({ body: { productId: 'p' }, query: {} })).toBe('p');
    expect(resolveProductId({ body: {}, query: { productId: 'q' } })).toBe('q');
    expect(resolveProductId({ body: {}, query: {} })).toBe(null);
  });
});

// ─── Schema validation against a candidate body ──────────────────────────

describe('lead-capture / schema validation', () => {
  // Shape inferred from api/leads/capture.js: required {email, product_id};
  // optional {source_page, org_id, metadata}.
  function validateCaptureBody(body) {
    if (!body || typeof body !== 'object') return { ok: false, errors: ['body required'] };
    const errors = [];
    if (!body.product_id) errors.push('product_id required');
    if (!isValidEmail(body.email)) errors.push('valid email required');
    if (body.metadata !== undefined && (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata))) {
      errors.push('metadata must be an object');
    }
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  it('accepts a minimal valid body', () => {
    expect(validateCaptureBody({ email: 'a@b.co', product_id: 'pressai' }).ok).toBe(true);
  });
  it('rejects missing product_id', () => {
    const r = validateCaptureBody({ email: 'a@b.co' });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('product_id required');
  });
  it('rejects invalid email', () => {
    const r = validateCaptureBody({ email: 'nope', product_id: 'pressai' });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('valid email required');
  });
  it('rejects array metadata', () => {
    const r = validateCaptureBody({ email: 'a@b.co', product_id: 'pressai', metadata: [] });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('metadata must be an object');
  });
});

// ─── Field mapping (W0 veu_-prefixed property names) ─────────────────────

describe('veu_-prefixed HubSpot field map (W0 ruling)', () => {
  it('every property name is veu_-prefixed (no drift)', () => {
    for (const k of VEU_HUBSPOT_PROPERTIES) {
      expect(k.startsWith('veu_')).toBe(true);
    }
    // The W0-ruled list is exactly these eight, in this order. Pin to detect
    // accidental additions / removals.
    expect(VEU_HUBSPOT_PROPERTIES).toEqual([
      'veu_product_interest',
      'veu_lead_source',
      'veu_demo_requested',
      'veu_demo_scheduled_at',
      'veu_utm_source',
      'veu_utm_medium',
      'veu_utm_campaign',
      'veu_message',
    ]);
  });

  it('maps an empty lead to all-null veu_ properties (defensive)', () => {
    const props = leadToHubspotProperties({ email: 'a@b.co', metadata: {} });
    expect(props.email).toBe('a@b.co');
    for (const k of VEU_HUBSPOT_PROPERTIES) {
      // veu_demo_requested coerces to false (the only Boolean field)
      if (k === 'veu_demo_requested') expect(props[k]).toBe(false);
      else expect(props[k]).toBeNull();
    }
  });

  it('maps product_id and source_page through', () => {
    const props = leadToHubspotProperties({
      email: 'a@b.co',
      product_id: 'saige',
      source_page: '/',
      metadata: { form: 'home_hero_demo_request' },
    });
    expect(props.veu_product_interest).toBe('saige');
    expect(props.veu_lead_source).toBe('/'); // source_page wins over metadata.form
  });

  it('falls back to metadata.form when source_page is empty', () => {
    const props = leadToHubspotProperties({
      email: 'a@b.co',
      product_id: 'pressai',
      source_page: null,
      metadata: { form: 'pricing_inline_capture' },
    });
    expect(props.veu_lead_source).toBe('pricing_inline_capture');
  });

  it('captures UTM parameters from metadata into veu_utm_* fields', () => {
    const props = leadToHubspotProperties({
      email: 'a@b.co',
      product_id: 'saige',
      metadata: {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'q2-launch',
      },
    });
    expect(props.veu_utm_source).toBe('google');
    expect(props.veu_utm_medium).toBe('cpc');
    expect(props.veu_utm_campaign).toBe('q2-launch');
  });

  it('honors metadata.campaign / metadata.source as UTM fallbacks (per SAIGE BASE44_FIX_QUEUE.md sample payload shape)', () => {
    const props = leadToHubspotProperties({
      email: 'a@b.co',
      product_id: 'saige',
      metadata: { campaign: 'investor-week-2026q2', source: 'pitch-deck' },
    });
    expect(props.veu_utm_campaign).toBe('investor-week-2026q2');
    expect(props.veu_utm_source).toBe('pitch-deck');
  });

  it('coerces demo_requested to a boolean', () => {
    expect(leadToHubspotProperties({ email: 'x@y.co', metadata: { demo_requested: 'yes' } })
      .veu_demo_requested).toBe(true);
    expect(leadToHubspotProperties({ email: 'x@y.co', metadata: { demo_requested: 0 } })
      .veu_demo_requested).toBe(false);
    expect(leadToHubspotProperties({ email: 'x@y.co', metadata: {} })
      .veu_demo_requested).toBe(false);
  });

  it('passes message through verbatim', () => {
    const props = leadToHubspotProperties({
      email: 'a@b.co',
      metadata: { message: 'Please contact me Tuesday afternoon.' },
    });
    expect(props.veu_message).toBe('Please contact me Tuesday afternoon.');
  });
});

// ─── Demo namespace resolution ───────────────────────────────────────────

describe('demo-namespace resolver (W0 three patterns)', () => {
  it('resolves saigedemo.com to live-demo', () => {
    expect(resolveEnv(makeReq({ host: 'saigedemo.com' }))).toBe('live-demo');
    expect(resolveEnv(makeReq({ host: 'www.saigedemo.com' }))).toBe('live-demo');
  });

  it('resolves *.demo.veuaistudio.com to demo', () => {
    expect(resolveEnv(makeReq({ host: 'pressai.demo.veuaistudio.com' }))).toBe('demo');
    expect(resolveEnv(makeReq({ host: 'saige.demo.veuaistudio.com' }))).toBe('demo');
    expect(resolveEnv(makeReq({ host: 'demo.veuaistudio.com' }))).toBe('demo');
  });

  it('resolves sandbox.* prefix to sales-demo', () => {
    expect(resolveEnv(makeReq({ host: 'sandbox.saige.app' }))).toBe('sales-demo');
    expect(resolveEnv(makeReq({ host: 'sandbox.example.com' }))).toBe('sales-demo');
  });

  it('strips port from host before matching', () => {
    expect(resolveEnv(makeReq({ host: 'saigedemo.com:8080' }))).toBe('live-demo');
    expect(resolveEnv(makeReq({ host: 'sandbox.example.com:443' }))).toBe('sales-demo');
  });

  it('falls through to prod for unrelated hosts', () => {
    expect(resolveEnv(makeReq({ host: 'saigeplatform.com' }))).toBe('prod');
    expect(resolveEnv(makeReq({ host: 'ourpublishingai.com' }))).toBe('prod');
    expect(resolveEnv(makeReq({ host: 'flowai-dun.vercel.app' }))).toBe('prod');
    expect(resolveEnv(makeReq({}))).toBe('prod');
  });
});

// ─── UTM parameter capture ───────────────────────────────────────────────

describe('UTM parameter capture', () => {
  it('extracts UTM from body.metadata first', () => {
    expect(extractUtm({
      body: { metadata: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'q2' } },
    })).toEqual({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'q2' });
  });

  it('falls back to query string', () => {
    expect(extractUtm({
      body: {},
      query: { utm_source: 'twitter', utm_campaign: 'launch' },
    })).toEqual({ utm_source: 'twitter', utm_medium: null, utm_campaign: 'launch' });
  });

  it('falls back to top-level body fields when nothing else is set', () => {
    expect(extractUtm({
      body: { utm_source: 'newsletter' },
    })).toEqual({ utm_source: 'newsletter', utm_medium: null, utm_campaign: null });
  });

  it('returns nulls when no UTM is provided', () => {
    expect(extractUtm({})).toEqual({ utm_source: null, utm_medium: null, utm_campaign: null });
  });
});

// ─── Handler-shape tests ─────────────────────────────────────────────────

describe('api/leads/capture handler', () => {
  it('exports a default handler function', () => {
    expect(typeof captureHandler).toBe('function');
  });

  it('OPTIONS preflight returns 204 with CORS headers', async () => {
    const req = makeReq({ method: 'OPTIONS', headers: { origin: 'https://example.com' } });
    const res = makeRes();
    await captureHandler(req, res);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });

  it('rejects unsupported HTTP method with 405', async () => {
    const req = makeReq({ method: 'PUT', body: {} });
    const res = makeRes();
    await captureHandler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.body).toMatchObject({ error: expect.stringMatching(/POST or GET/i) });
  });

  it('POST without product_id returns 400', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.10' },
      body: { email: 'a@b.co' },
    });
    const res = makeRes();
    await captureHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/product_id/);
  });

  it('POST with bad email returns 400', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.11' },
      body: { product_id: 'pressai', email: 'nope' },
    });
    const res = makeRes();
    await captureHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('POST with valid payload returns 201 and a lead_id', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.12' },
      body: {
        // Pre-trimmed — handler validates with isValidEmail BEFORE trim.
        email: 'Tester@Example.com',
        product_id: 'pressai',
        source_page: 'sandbox',
        metadata: { tier: 2, utm_source: 'demo-banner' },
      },
    });
    const res = makeRes();
    await captureHandler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      ok: true,
      lead_id: expect.stringMatching(/^lead_/),
      message: expect.stringContaining("on the list"),
    });
  });

  it('GET list endpoint refuses without admin key', async () => {
    const req = makeReq({ method: 'GET', query: { product_id: 'pressai' } });
    const res = makeRes();
    await captureHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('GET list endpoint allows access with the matching admin key', async () => {
    const PREV = process.env.ADMIN_SEED_KEY;
    process.env.ADMIN_SEED_KEY = 'test-admin-key';
    try {
      const req = makeReq({
        method: 'GET',
        headers: { 'x-flowai-admin-key': 'test-admin-key' },
        query: { product_id: 'pressai' },
      });
      const res = makeRes();
      await captureHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.leads)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    } finally {
      if (PREV === undefined) delete process.env.ADMIN_SEED_KEY;
      else process.env.ADMIN_SEED_KEY = PREV;
    }
  });
});
