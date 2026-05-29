import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { researchViaApi } from '../src/lib/operationsEngine.js';

const realFetch = global.fetch;

function mockFetch(impl) {
  global.fetch = vi.fn(impl);
}

describe('researchViaApi — happy path', () => {
  afterEach(() => { global.fetch = realFetch; });

  it('returns { analysis, page, ... } when /api/research-url returns ok:true with analysis', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        reachable: true,
        url: 'https://example.com',
        method: 'browserless',
        jsRendered: true,
        warnings: [],
        page: { title: 'T', metaDescription: 'M', headings: [], bodyTextSnippet: '' },
        analysis: 'PRODUCT OVERVIEW\n- ...',
        model: 'claude_sonnet_4_6',
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
    }));
    const r = await researchViaApi('https://example.com', 'audit_demo', 'sess_1');
    expect(r).not.toBeNull();
    expect(r.analysis).toBe('PRODUCT OVERVIEW\n- ...');
    expect(r.page).toEqual({ title: 'T', metaDescription: 'M', headings: [], bodyTextSnippet: '' });
    expect(r.method).toBe('browserless');
    expect(r.jsRendered).toBe(true);
    expect(r.usage.input_tokens).toBe(100);
  });

  it('passes URL, objective, sessionId in request body', async () => {
    let captured = null;
    mockFetch(async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, analysis: 'brief' }),
      };
    });
    await researchViaApi('https://example.com  ', 'investor_review', 'sess_42');
    expect(captured.url).toBe('/api/research-url');
    expect(captured.init.method).toBe('POST');
    const body = JSON.parse(captured.init.body);
    expect(body.url).toBe('https://example.com'); // trimmed
    expect(body.objective).toBe('investor_review');
    expect(body.sessionId).toBe('sess_42');
  });
});

describe('researchViaApi — non-success returns null', () => {
  afterEach(() => { global.fetch = realFetch; });

  it('returns null when input URL is empty/whitespace/non-string', async () => {
    expect(await researchViaApi('')).toBeNull();
    expect(await researchViaApi('   ')).toBeNull();
    expect(await researchViaApi(null)).toBeNull();
    expect(await researchViaApi(undefined)).toBeNull();
    expect(await researchViaApi(123)).toBeNull();
  });

  it('returns null on HTTP non-ok (5xx)', async () => {
    mockFetch(async () => ({ ok: false, status: 500, json: async () => ({ ok: false, error: 'x' }) }));
    expect(await researchViaApi('https://example.com')).toBeNull();
  });

  it('returns null when the 200 body has ok:false (page unreachable)', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, reachable: false, reason: 'timeout' }),
    }));
    expect(await researchViaApi('https://example.com')).toBeNull();
  });

  it('returns null when analysis is missing or empty', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
    expect(await researchViaApi('https://example.com')).toBeNull();

    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, analysis: '' }) }));
    expect(await researchViaApi('https://example.com')).toBeNull();

    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, analysis: null }) }));
    expect(await researchViaApi('https://example.com')).toBeNull();
  });

  it('returns null when fetch rejects (network error)', async () => {
    mockFetch(async () => { throw new Error('network down'); });
    expect(await researchViaApi('https://example.com')).toBeNull();
  });

  it('returns null when JSON parsing fails', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } }));
    expect(await researchViaApi('https://example.com')).toBeNull();
  });
});
