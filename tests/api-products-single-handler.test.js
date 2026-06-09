import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  getProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  recordProductAudit: vi.fn(),
}));

vi.mock('../api/_lib/db.js', () => ({
  getProduct: dbMocks.getProduct,
  updateProduct: dbMocks.updateProduct,
  deleteProduct: dbMocks.deleteProduct,
  recordProductAudit: dbMocks.recordProductAudit,
}));

vi.mock('../api/_lib/tenant.js', () => ({
  resolveOrgId: vi.fn(() => 'org-test'),
}));

import handler from '../api/products/[id].js';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';
const VALID_SLUG = 'saige-platform';
const VALID_PROD_ID = 'prod_saige_platform';
const VALID_P_ID = 'p_12345';

function makeRes() {
  const headers = {};
  let statusCode = 200;
  let body = null;
  return {
    setHeader: vi.fn((k, v) => { headers[k] = v; }),
    status: vi.fn(function status(code) { statusCode = code; return this; }),
    json: vi.fn(function json(data) { body = data; return this; }),
    end: vi.fn(function end() { return this; }),
    _get: () => ({ headers, statusCode, body }),
  };
}

async function call({ method, id = VALID_UUID, body = {} } = {}) {
  const req = { method, headers: {}, query: { id }, body };
  const res = makeRes();
  await handler(req, res);
  return res._get();
}

beforeEach(() => {
  dbMocks.getProduct.mockReset();
  dbMocks.updateProduct.mockReset();
  dbMocks.deleteProduct.mockReset();
  dbMocks.recordProductAudit.mockReset();
});

describe('/api/products/:id single-product write validation', () => {
  it.each([
    ['PATCH', '../products'],
    ['PATCH', 'saige platform'],
    ['PATCH', "saige';drop"],
    ['DELETE', '../products'],
    ['DELETE', 'saige platform'],
    ['DELETE', "saige';drop"],
  ])('returns clean 400 for %s with unsafe id %j before DB access', async (method, id) => {
    const out = await call({ method, id, body: { name: 'X' } });

    expect(out.statusCode).toBe(400);
    expect(out.body).toMatchObject({
      ok: false,
      error: 'invalid_product_id',
    });
    expect(dbMocks.updateProduct).not.toHaveBeenCalled();
    expect(dbMocks.deleteProduct).not.toHaveBeenCalled();
  });

  it.each([
    ['PATCH', ''],
    ['PATCH', '  '],
    ['DELETE', ''],
    ['DELETE', '  '],
  ])('returns clean 400 for %s with empty id %j before DB access', async (method, id) => {
    const out = await call({ method, id, body: { name: 'X' } });

    expect(out.statusCode).toBe(400);
    expect(out.body.error).toMatch(/Missing id|invalid_product_id/);
    expect(dbMocks.updateProduct).not.toHaveBeenCalled();
    expect(dbMocks.deleteProduct).not.toHaveBeenCalled();
  });

  it('still allows valid UUID PATCH writes through to the DB adapter', async () => {
    dbMocks.updateProduct.mockResolvedValueOnce({ id: VALID_UUID, name: 'Updated' });

    const out = await call({ method: 'PATCH', body: { name: 'Updated' } });

    expect(out.statusCode).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(dbMocks.updateProduct).toHaveBeenCalledWith(VALID_UUID, { name: 'Updated' }, { orgId: 'org-test' });
  });

  it('allows slug PATCH writes through to the DB adapter', async () => {
    dbMocks.updateProduct.mockResolvedValueOnce({ id: VALID_SLUG, name: 'Updated' });

    const out = await call({ method: 'PATCH', id: VALID_SLUG, body: { name: 'Updated' } });

    expect(out.statusCode).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(dbMocks.updateProduct).toHaveBeenCalledWith(VALID_SLUG, { name: 'Updated' }, { orgId: 'org-test' });
  });

  it.each([VALID_PROD_ID, VALID_P_ID])('allows internal memory adapter id %s through to the DB adapter', async (id) => {
    dbMocks.updateProduct.mockResolvedValueOnce({ id, name: 'Updated' });

    const out = await call({ method: 'PATCH', id, body: { name: 'Updated' } });

    expect(out.statusCode).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(dbMocks.updateProduct).toHaveBeenCalledWith(id, { name: 'Updated' }, { orgId: 'org-test' });
  });

  it('allows slug DELETE writes through to the DB adapter', async () => {
    dbMocks.deleteProduct.mockResolvedValueOnce(true);

    const out = await call({ method: 'DELETE', id: VALID_SLUG });

    expect(out.statusCode).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(dbMocks.deleteProduct).toHaveBeenCalledWith(VALID_SLUG, { orgId: 'org-test' });
  });
});
