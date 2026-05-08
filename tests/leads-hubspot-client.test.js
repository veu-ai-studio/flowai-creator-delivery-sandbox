// Tests for src/lib/leads/hubspot-client.js
//
// All HubSpot calls are stubbed via a fake fetcher. globalThis.fetch is
// replaced with a throwing stub so any accidental real network call fails
// the suite.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  VEU_HUBSPOT_PROPERTIES,
  FIELD_MAP,
  leadToHubspotProperties,
  createHubspotClient,
} from '../src/lib/leads/hubspot-client.js';

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

// ─── VEU property contract pin ───────────────────────────────────────────

describe('VEU_HUBSPOT_PROPERTIES (W0-ruled property names)', () => {
  it('has exactly 8 entries, in the canonical order, each veu_-prefixed', () => {
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
    for (const k of VEU_HUBSPOT_PROPERTIES) expect(k.startsWith('veu_')).toBe(true);
  });

  it('FIELD_MAP values match VEU_HUBSPOT_PROPERTIES', () => {
    const values = Object.values(FIELD_MAP).sort();
    const expected = [...VEU_HUBSPOT_PROPERTIES].sort();
    expect(values).toEqual(expected);
  });

  it('FIELD_MAP and VEU_HUBSPOT_PROPERTIES are frozen', () => {
    expect(Object.isFrozen(FIELD_MAP)).toBe(true);
    expect(Object.isFrozen(VEU_HUBSPOT_PROPERTIES)).toBe(true);
  });
});

// ─── leadToHubspotProperties — pure mapper ───────────────────────────────

describe('leadToHubspotProperties', () => {
  it('throws on non-object input', () => {
    expect(() => leadToHubspotProperties(null)).toThrow(/must be an object/);
    expect(() => leadToHubspotProperties('s')).toThrow(/must be an object/);
  });

  it('maps a complete lead through all 8 veu_ properties', () => {
    const lead = {
      email: 'a@b.co',
      product_id: 'saige',
      source_page: '/',
      metadata: {
        demo_requested: true,
        demo_scheduled_at: '2026-06-01T15:00:00.000Z',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'q2-launch',
        message: 'please call',
      },
    };
    const props = leadToHubspotProperties(lead);
    expect(props).toEqual({
      email: 'a@b.co',
      veu_product_interest:  'saige',
      veu_lead_source:       '/',
      veu_demo_requested:    true,
      veu_demo_scheduled_at: '2026-06-01T15:00:00.000Z',
      veu_utm_source:        'google',
      veu_utm_medium:        'cpc',
      veu_utm_campaign:      'q2-launch',
      veu_message:           'please call',
    });
  });

  it('emits null for absent optional fields and false for absent demo_requested', () => {
    const props = leadToHubspotProperties({ email: 'a@b.co' });
    expect(props.email).toBe('a@b.co');
    expect(props.veu_product_interest).toBeNull();
    expect(props.veu_lead_source).toBeNull();
    expect(props.veu_demo_requested).toBe(false);
    expect(props.veu_demo_scheduled_at).toBeNull();
    expect(props.veu_utm_source).toBeNull();
    expect(props.veu_utm_medium).toBeNull();
    expect(props.veu_utm_campaign).toBeNull();
    expect(props.veu_message).toBeNull();
  });

  it('falls back source_page → metadata.form → metadata.source', () => {
    expect(leadToHubspotProperties({ email: 'a@b.co', source_page: '/' }).veu_lead_source).toBe('/');
    expect(leadToHubspotProperties({ email: 'a@b.co', metadata: { form: 'home_hero' } }).veu_lead_source).toBe('home_hero');
    expect(leadToHubspotProperties({ email: 'a@b.co', metadata: { source: 'newsletter' } }).veu_lead_source).toBe('newsletter');
    // source_page wins over metadata.form
    expect(leadToHubspotProperties({ email: 'a@b.co', source_page: '/', metadata: { form: 'h' } }).veu_lead_source).toBe('/');
  });

  it('honors metadata.campaign and metadata.source as utm fallbacks', () => {
    const props = leadToHubspotProperties({
      email: 'a@b.co',
      metadata: { campaign: 'investor-week', source: 'pitch-deck' },
    });
    expect(props.veu_utm_campaign).toBe('investor-week');
    expect(props.veu_utm_source).toBe('pitch-deck');
  });

  it('coerces demo_requested to a Boolean', () => {
    expect(leadToHubspotProperties({ email: 'a@b.co', metadata: { demo_requested: 'yes' } }).veu_demo_requested).toBe(true);
    expect(leadToHubspotProperties({ email: 'a@b.co', metadata: { demo_requested: 0 } }).veu_demo_requested).toBe(false);
    expect(leadToHubspotProperties({ email: 'a@b.co', metadata: { demo_requested: null } }).veu_demo_requested).toBe(false);
  });

  it('ignores array metadata (treats as empty)', () => {
    const props = leadToHubspotProperties({ email: 'a@b.co', metadata: [] });
    expect(props.veu_message).toBeNull();
    expect(props.veu_demo_requested).toBe(false);
  });
});

// ─── createHubspotClient — factory + behaviour ───────────────────────────

function makeFetchStub(...responses) {
  // Each response is { status, json?, text? }. The stub returns a Response-like
  // object with .json() and .text() methods.
  const calls = [];
  let i = 0;
  const fetcher = async (url, init = {}) => {
    calls.push({ url, ...init, body: init.body });
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return {
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      json: async () => (typeof r.json === 'function' ? r.json() : r.json) ?? {},
      text: async () => (r.text ?? (r.json ? JSON.stringify(r.json) : '')),
    };
  };
  fetcher.calls = calls;
  return fetcher;
}

describe('createHubspotClient — config + DI', () => {
  it('throws when apiKey is missing', () => {
    expect(() => createHubspotClient({ fetcher: () => {} })).toThrow(/apiKey is required/);
  });

  it('throws when fetcher is missing AND globalThis.fetch is not available', () => {
    // We've stubbed globalThis.fetch to throw. The factory only checks that
    // it's a function. Pass a non-function explicitly to force the error path.
    expect(() => createHubspotClient({ apiKey: 'k', fetcher: null })).toThrow(/fetcher.*required/);
  });

  it('returns an object with upsertContact when configured', () => {
    const c = createHubspotClient({ apiKey: 'pat-x', fetcher: () => {} });
    expect(typeof c.upsertContact).toBe('function');
    expect(c._baseUrl).toBe('https://api.hubapi.com');
    expect(c._hasFetcher).toBe(true);
  });

  it('honors a custom baseUrl', () => {
    const c = createHubspotClient({ apiKey: 'pat-x', fetcher: () => {}, baseUrl: 'https://eu.example.test' });
    expect(c._baseUrl).toBe('https://eu.example.test');
  });
});

describe('createHubspotClient.upsertContact', () => {
  const lead = {
    email: 'a@b.co',
    product_id: 'saige',
    source_page: '/',
    metadata: { utm_campaign: 'q2', message: 'hi' },
  };

  it('creates a new contact (HTTP 201) — POST /crm/v3/objects/contacts with veu_ properties', async () => {
    const fetcher = makeFetchStub({ status: 201, json: { id: '12345' } });
    const c = createHubspotClient({ apiKey: 'pat-x', fetcher });
    const r = await c.upsertContact(lead);
    expect(r).toEqual({ ok: true, action: 'created', id: '12345', properties: leadToHubspotProperties(lead) });

    expect(fetcher.calls).toHaveLength(1);
    const [call] = fetcher.calls;
    expect(call.url).toBe('https://api.hubapi.com/crm/v3/objects/contacts');
    expect(call.method).toBe('POST');
    expect(call.headers.authorization).toBe('Bearer pat-x');
    expect(call.headers['content-type']).toBe('application/json');
    const body = JSON.parse(call.body);
    expect(body.properties.email).toBe('a@b.co');
    expect(body.properties.veu_product_interest).toBe('saige');
    expect(body.properties.veu_lead_source).toBe('/');
    expect(body.properties.veu_utm_campaign).toBe('q2');
    expect(body.properties.veu_message).toBe('hi');
    // Every veu_ name is present
    for (const k of VEU_HUBSPOT_PROPERTIES) expect(k in body.properties).toBe(true);
  });

  it('on 409 (existing), falls through to PATCH .../<email>?idProperty=email', async () => {
    const fetcher = makeFetchStub(
      { status: 409, text: '{"category":"CONFLICT"}' },
      { status: 200, json: { id: 'updated-1' } },
    );
    const c = createHubspotClient({ apiKey: 'pat-x', fetcher });
    const r = await c.upsertContact(lead);
    expect(r).toEqual({ ok: true, action: 'updated', id: 'updated-1', properties: leadToHubspotProperties(lead) });

    expect(fetcher.calls).toHaveLength(2);
    const [post, patch] = fetcher.calls;
    expect(post.method).toBe('POST');
    expect(patch.method).toBe('PATCH');
    expect(patch.url).toBe('https://api.hubapi.com/crm/v3/objects/contacts/a%40b.co?idProperty=email');
    expect(patch.headers.authorization).toBe('Bearer pat-x');
  });

  it('returns ok:false with status when create fails non-409', async () => {
    const fetcher = makeFetchStub({ status: 500, text: 'server boom' });
    const c = createHubspotClient({ apiKey: 'pat-x', fetcher });
    const r = await c.upsertContact(lead);
    expect(r.ok).toBe(false);
    expect(r.action).toBe('create_failed');
    expect(r.status).toBe(500);
    expect(r.error).toContain('server boom');
  });

  it('returns ok:false when 409 then update fails', async () => {
    const fetcher = makeFetchStub(
      { status: 409, text: 'conflict' },
      { status: 400, text: '{"message":"PROPERTY_VALIDATION_FAILED: veu_demo_scheduled_at"}' },
    );
    const c = createHubspotClient({ apiKey: 'pat-x', fetcher });
    const r = await c.upsertContact(lead);
    expect(r.ok).toBe(false);
    expect(r.action).toBe('update_failed');
    expect(r.status).toBe(400);
    expect(r.error).toContain('PROPERTY_VALIDATION_FAILED');
  });

  it('does not call fetch a second time on 200 create', async () => {
    const fetcher = makeFetchStub({ status: 200, json: { id: 'x' } });
    const c = createHubspotClient({ apiKey: 'pat-x', fetcher });
    await c.upsertContact(lead);
    expect(fetcher.calls).toHaveLength(1);
  });
});

describe('createHubspotClient — body shape carries every veu_ property even when null', () => {
  it('all 8 veu_ keys are present in the create POST body, even when source data is empty', async () => {
    const fetcher = makeFetchStub({ status: 201, json: { id: 'a' } });
    const c = createHubspotClient({ apiKey: 'k', fetcher });
    await c.upsertContact({ email: 'minimal@example.com' });
    const body = JSON.parse(fetcher.calls[0].body);
    for (const k of VEU_HUBSPOT_PROPERTIES) {
      expect(k in body.properties).toBe(true);
    }
    expect(body.properties.veu_demo_requested).toBe(false);
  });
});
