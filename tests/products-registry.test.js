import { describe, it, expect, vi } from 'vitest';
import {
  listProducts,
  createProduct,
  normalizeScore,
  deriveSlug,
} from '../src/lib/products/registry.js';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

// ─── listProducts ──────────────────────────────────────────────────────────
describe('listProducts — happy path', () => {
  it('returns { ok: true, items } on 200', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ items: [{ id: 'p1', name: 'X' }], total: 1 }));
    const r = await listProducts({ fetcher });
    expect(r).toEqual({ ok: true, items: [{ id: 'p1', name: 'X' }], total: 1 });
  });

  it('falls back to items.length when total missing', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ items: [{ id: 'p1' }] }));
    const r = await listProducts({ fetcher });
    expect(r.total).toBe(1);
  });

  it('passes status / q / sort / limit / offset as query params', async () => {
    let captured = null;
    const fetcher = vi.fn(async (url) => { captured = url; return jsonResponse({ items: [] }); });
    await listProducts({ fetcher, status: 'active', q: 'foo', sort: '-updated_at', limit: 25, offset: 50 });
    const u = new URL(captured, 'http://x');
    expect(u.pathname).toBe('/api/products');
    expect(u.searchParams.get('status')).toBe('active');
    expect(u.searchParams.get('q')).toBe('foo');
    expect(u.searchParams.get('sort')).toBe('-updated_at');
    expect(u.searchParams.get('limit')).toBe('25');
    expect(u.searchParams.get('offset')).toBe('50');
  });

  it('default limit is 100', async () => {
    let captured = null;
    const fetcher = vi.fn(async (url) => { captured = url; return jsonResponse({ items: [] }); });
    await listProducts({ fetcher });
    expect(new URL(captured, 'http://x').searchParams.get('limit')).toBe('100');
  });

  it('forwards explicit offset=0 (regression for falsy-check bug, peer 2026-05-09 nice-to-have #1)', async () => {
    let captured = null;
    const fetcher = vi.fn(async (url) => { captured = url; return jsonResponse({ items: [] }); });
    await listProducts({ fetcher, offset: 0 });
    expect(new URL(captured, 'http://x').searchParams.get('offset')).toBe('0');
  });

  it('handles empty result set as ok:true with items:[]', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ items: [] }));
    const r = await listProducts({ fetcher });
    expect(r).toEqual({ ok: true, items: [], total: 0 });
  });
});

describe('listProducts — failure modes', () => {
  it('returns { ok: false, status: 401 } on 401', async () => {
    const fetcher = vi.fn(async () => jsonResponse({}, { ok: false, status: 401 }));
    const r = await listProducts({ fetcher });
    expect(r).toEqual({ ok: false, error: 'HTTP 401', status: 401 });
  });

  it('returns { ok: false, status: 500 } on 500', async () => {
    const fetcher = vi.fn(async () => jsonResponse({}, { ok: false, status: 500 }));
    const r = await listProducts({ fetcher });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(500);
  });

  it('returns { ok: false } when network rejects', async () => {
    const fetcher = vi.fn(async () => { throw new Error('connection refused'); });
    const r = await listProducts({ fetcher });
    expect(r).toEqual({ ok: false, error: 'connection refused' });
  });

  it('flags AbortError network failures distinctly', async () => {
    const ae = new Error('aborted'); ae.name = 'AbortError';
    const fetcher = vi.fn(async () => { throw ae; });
    const r = await listProducts({ fetcher });
    expect(r).toEqual({ ok: false, error: 'request aborted' });
  });

  it('returns malformed-response error when body has no items[]', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ data: [] }));
    const r = await listProducts({ fetcher });
    expect(r).toMatchObject({ ok: false, status: 200 });
    expect(r.error).toMatch(/malformed/);
  });

  it('returns malformed-response error when body is not JSON', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true, status: 200, json: async () => { throw new Error('bad json'); },
    }));
    const r = await listProducts({ fetcher });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/malformed/);
  });
});

// ─── createProduct ────────────────────────────────────────────────────────
describe('createProduct — happy path', () => {
  it('returns { ok: true, item } on 201', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true, item: { id: 'p9', name: 'X' } }, { ok: true, status: 201 }));
    const r = await createProduct({ name: 'X' }, { fetcher });
    expect(r).toEqual({ ok: true, item: { id: 'p9', name: 'X' } });
  });

  it('POSTs to /api/products with content-type json', async () => {
    let init = null;
    const fetcher = vi.fn(async (_url, i) => { init = i; return jsonResponse({ ok: true, item: { id: 'p1', name: 'X' } }, { ok: true, status: 201 }); });
    await createProduct({ name: 'X', url: 'https://x.com', description: 'd', tags: ['a'] }, { fetcher });
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ name: 'X', url: 'https://x.com', description: 'd', type: 'web', status: 'draft', tags: ['a'] });
  });

  it('trims name and url', async () => {
    let body = null;
    const fetcher = vi.fn(async (_url, i) => { body = JSON.parse(i.body); return jsonResponse({ ok: true, item: { id: 'p1', name: 'X' } }, { ok: true, status: 201 }); });
    await createProduct({ name: '  X  ', url: '  https://x.com  ' }, { fetcher });
    expect(body.name).toBe('X');
    expect(body.url).toBe('https://x.com');
  });

  it('does NOT forward an org / org_id field even if caller passes it', async () => {
    let body = null;
    const fetcher = vi.fn(async (_url, i) => { body = JSON.parse(i.body); return jsonResponse({ ok: true, item: { id: 'p1', name: 'X' } }, { ok: true, status: 201 }); });
    await createProduct({ name: 'X', org: 'VEU AI Studio', org_id: 'should-be-stripped' }, { fetcher });
    expect(body.org).toBeUndefined();
    expect(body.org_id).toBeUndefined();
  });
});

describe('createProduct — failure modes', () => {
  it('rejects empty name without calling fetcher', async () => {
    const fetcher = vi.fn();
    const r = await createProduct({ name: '' }, { fetcher });
    expect(r).toEqual({ ok: false, error: 'name required' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only name', async () => {
    const fetcher = vi.fn();
    const r = await createProduct({ name: '   ' }, { fetcher });
    expect(r.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects missing input', async () => {
    const fetcher = vi.fn();
    const r = await createProduct(null, { fetcher });
    expect(r.ok).toBe(false);
  });

  it('returns { ok: false, status: 400 } and forwards server error message', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: false, error: 'duplicate url' }, { ok: false, status: 400 }));
    const r = await createProduct({ name: 'X' }, { fetcher });
    expect(r).toEqual({ ok: false, error: 'duplicate url', status: 400 });
  });

  it('returns { ok: false } on network error', async () => {
    const fetcher = vi.fn(async () => { throw new Error('net'); });
    const r = await createProduct({ name: 'X' }, { fetcher });
    expect(r).toEqual({ ok: false, error: 'net' });
  });

  it('rejects malformed 201 response (missing item.id)', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true }, { ok: true, status: 201 }));
    const r = await createProduct({ name: 'X' }, { fetcher });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/malformed/);
  });
});

// ─── normalizeScore ───────────────────────────────────────────────────────
describe('normalizeScore — read-boundary contract', () => {
  it('returns null for null / undefined / non-finite', () => {
    expect(normalizeScore(null)).toBeNull();
    expect(normalizeScore(undefined)).toBeNull();
    expect(normalizeScore(NaN)).toBeNull();
    expect(normalizeScore(Infinity)).toBeNull();
    expect(normalizeScore('7')).toBeNull();
  });

  it('clamps >= 100 to 10', () => {
    expect(normalizeScore(100)).toBe(10);
    expect(normalizeScore(999)).toBe(10);
  });

  it('clamps <= 0 to 0', () => {
    expect(normalizeScore(0)).toBe(0);
    expect(normalizeScore(-50)).toBe(0);
  });

  it('rounds raw / 10 to nearest integer', () => {
    expect(normalizeScore(50)).toBe(5);
    expect(normalizeScore(74)).toBe(7);
    expect(normalizeScore(75)).toBe(8); // 7.5 → 8 per Math.round
    expect(normalizeScore(72)).toBe(7);
  });
});

// ─── deriveSlug ───────────────────────────────────────────────────────────
describe('deriveSlug — canonical client-side derivation', () => {
  it('lowercases and replaces non-alphanumerics with -', () => {
    expect(deriveSlug('My Product')).toBe('my-product');
    expect(deriveSlug('SAIGE')).toBe('saige');
    expect(deriveSlug('foo / bar / baz')).toBe('foo-bar-baz');
  });

  it('strips leading/trailing dashes', () => {
    expect(deriveSlug('  hello  ')).toBe('hello');
    expect(deriveSlug('!!!hi!!!')).toBe('hi');
  });

  it('collapses runs of separators', () => {
    expect(deriveSlug('a___b   c')).toBe('a-b-c');
  });

  it('returns "" for non-string input', () => {
    expect(deriveSlug(null)).toBe('');
    expect(deriveSlug(123)).toBe('');
    expect(deriveSlug(undefined)).toBe('');
  });

  it('preserves digits', () => {
    expect(deriveSlug('PressAI v2')).toBe('pressai-v2');
  });
});
