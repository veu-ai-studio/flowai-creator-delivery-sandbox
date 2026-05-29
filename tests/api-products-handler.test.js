// In-process contract test for /api/products. Verifies the response shape
// the client-side helper (src/lib/products/registry.js) consumes, and the
// 405/OPTIONS edge cases. No network — handler is called directly with
// mock req/res. db.js is mocked so the test never touches Supabase.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db.js BEFORE importing the handler.
vi.mock('../api/_lib/db.js', () => ({
  listProducts: vi.fn(async () => ({ items: [], total: 0, limit: 1000, offset: 0 })),
  createProduct: vi.fn(async (input, ctx) => ({
    id: 'mock-id-1', org_id: ctx?.orgId ?? null, ...input,
  })),
}));

// Mock the auth layer so requireAuth doesn't actually contact Clerk.
vi.mock('../api/_lib/auth.js', () => ({
  requireAuth: vi.fn(async (req, _res) => ({
    authenticated: false,
    authMode: 'none',
    orgId: req.headers?.['x-flowai-org-id'] || null,
    userId: null,
  })),
}));

import handler from '../api/products.js';
import { listProducts as mockListProducts, createProduct as mockCreateProduct } from '../api/_lib/db.js';

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

beforeEach(() => {
  mockListProducts.mockClear();
  mockCreateProduct.mockClear();
});

// ─── GET /api/products — response shape contract ───────────────────────────
describe('GET /api/products — shape', () => {
  it('returns 200 with { items: [...] } shape (matches listProducts helper)', async () => {
    mockListProducts.mockResolvedValueOnce({
      items: [{ id: 'p1', org_id: 'org-a', name: 'X', url: '', description: '', type: 'web', status: 'draft', tags: [] }],
      total: 1, limit: 100, offset: 0,
    });
    const req = { method: 'GET', headers: { 'x-flowai-org-id': 'org-a' }, query: {} };
    const res = makeRes();
    await handler(req, res);
    const out = res._get();
    expect(out.statusCode).toBe(200);
    expect(Array.isArray(out.body.items)).toBe(true);
    expect(out.body.items[0].id).toBe('p1');
    expect(typeof out.body.total).toBe('number');
  });

  it('returns 200 with empty items[] when none registered', async () => {
    const req = { method: 'GET', headers: {}, query: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().body.items).toEqual([]);
    expect(res._get().body.total).toBe(0);
  });

  it('forwards query params (status, q, sort, limit, offset) to listProducts', async () => {
    const req = {
      method: 'GET',
      headers: { 'x-flowai-org-id': 'org-x' },
      query: { status: 'active', q: 'foo', sort: '-updated_at', limit: '25', offset: '50' },
    };
    const res = makeRes();
    await handler(req, res);
    expect(mockListProducts).toHaveBeenCalledOnce();
    const args = mockListProducts.mock.calls[0][0];
    expect(args).toMatchObject({
      orgId: 'org-x',
      status: 'active',
      q: 'foo',
      sort: '-updated_at',
      limit: 25,
      offset: 50,
    });
  });
});

// ─── POST /api/products — create + shape ───────────────────────────────────
describe('POST /api/products — shape', () => {
  it('returns 201 with { ok: true, item } (matches createProduct helper)', async () => {
    const req = {
      method: 'POST',
      headers: { 'x-flowai-org-id': 'org-a', 'content-type': 'application/json' },
      query: {},
      body: { name: 'My Product', url: 'https://x.com', description: 'd' },
    };
    const res = makeRes();
    await handler(req, res);
    const out = res._get();
    expect(out.statusCode).toBe(201);
    expect(out.body.ok).toBe(true);
    expect(out.body.item.id).toBe('mock-id-1');
    expect(out.body.item.name).toBe('My Product');
    expect(out.body.item.org_id).toBe('org-a');
  });

  it('returns 400 with { ok: false, error } when createProduct rejects', async () => {
    mockCreateProduct.mockRejectedValueOnce(new Error('name required'));
    const req = { method: 'POST', headers: {}, query: {}, body: {} };
    const res = makeRes();
    await handler(req, res);
    const out = res._get();
    expect(out.statusCode).toBe(400);
    expect(out.body.ok).toBe(false);
    expect(out.body.error).toMatch(/name required/);
  });

  it('passes orgId from header into createProduct context', async () => {
    const req = {
      method: 'POST',
      headers: { 'x-flowai-org-id': 'org-q' },
      query: {},
      body: { name: 'Y' },
    };
    const res = makeRes();
    await handler(req, res);
    expect(mockCreateProduct).toHaveBeenCalledOnce();
    const [, ctx] = mockCreateProduct.mock.calls[0];
    expect(ctx.orgId).toBe('org-q');
  });
});

// ─── Method handling ──────────────────────────────────────────────────────
describe('method handling', () => {
  it('returns 204 on OPTIONS', async () => {
    const req = { method: 'OPTIONS', headers: {}, query: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().statusCode).toBe(204);
  });

  it('returns 405 on PUT', async () => {
    const req = { method: 'PUT', headers: {}, query: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().statusCode).toBe(405);
  });

  it('returns 405 on DELETE', async () => {
    const req = { method: 'DELETE', headers: {}, query: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._get().statusCode).toBe(405);
  });
});
