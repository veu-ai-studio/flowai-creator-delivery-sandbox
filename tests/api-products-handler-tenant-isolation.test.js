// Tenant isolation regression test (peer review S2 / R7).
//
// RLS policies on products(org_id) are pending Clerk JWT integration. Until
// they land, multi-tenancy is enforced *in code* via the orgId filter passed
// to db.js. This test simulates two tenants and verifies:
//   1. /api/products GET with orgA's header NEVER returns orgB's products.
//   2. /api/products POST with orgA's header NEVER writes orgB's org_id.
//   3. A request without an org_id must NOT see another tenant's data.
//
// We mock db.js with an in-memory store that respects org_id filtering,
// then verify the handler routes the right scope on every call. If a
// future change breaks the orgId pass-through, this test fails before
// production.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory tenant-scoped store. Each test starts fresh.
const store = { rows: [] };

vi.mock('../api/_lib/db.js', () => ({
  listProducts: vi.fn(async ({ orgId } = {}) => {
    const items = orgId
      ? store.rows.filter((r) => r.org_id === orgId)
      : []; // No orgId → return nothing rather than leaking everything.
    return { items, total: items.length, limit: 1000, offset: 0 };
  }),
  createProduct: vi.fn(async (input, ctx = {}) => {
    if (!ctx.orgId) {
      // Server-side hard guard: no anonymous writes in this test fixture.
      throw new Error('orgId required');
    }
    const row = {
      id: `id-${store.rows.length + 1}`,
      org_id: ctx.orgId,
      name: input.name,
      url: input.url || '',
      description: input.description || '',
      type: input.type || 'web',
      status: input.status || 'draft',
      tags: input.tags || [],
    };
    store.rows.push(row);
    return row;
  }),
}));

vi.mock('../api/_lib/auth.js', () => ({
  requireAuth: vi.fn(async (req, _res) => ({
    authenticated: false,
    authMode: 'none',
    orgId: req.headers?.['x-flowai-org-id'] || null,
    userId: null,
  })),
}));

import handler from '../api/products.js';

const ORG_A = 'org-a-uuid';
const ORG_B = 'org-b-uuid';

function makeRes() {
  let statusCode = 200;
  let body = null;
  const headers = {};
  return {
    setHeader: vi.fn((k, v) => { headers[k] = v; }),
    status: vi.fn(function (code) { statusCode = code; return this; }),
    json: vi.fn(function (data) { body = data; return this; }),
    end: vi.fn(function () { return this; }),
    _get: () => ({ headers, statusCode, body }),
  };
}

async function call({ method, orgId, body, query }) {
  const req = {
    method,
    headers: orgId ? { 'x-flowai-org-id': orgId } : {},
    query: query || {},
    body,
  };
  const res = makeRes();
  await handler(req, res);
  return res._get();
}

beforeEach(() => {
  store.rows = [];
});

// ─── Setup: each test seeds two tenants' data via the handler itself ─────
async function seedBothTenants() {
  await call({ method: 'POST', orgId: ORG_A, body: { name: 'A1' } });
  await call({ method: 'POST', orgId: ORG_A, body: { name: 'A2' } });
  await call({ method: 'POST', orgId: ORG_B, body: { name: 'B1' } });
}

// ─── Reads are org-scoped ────────────────────────────────────────────────
describe('GET /api/products — tenant isolation on reads', () => {
  it("orgA's GET returns only orgA's products (never orgB's)", async () => {
    await seedBothTenants();
    const out = await call({ method: 'GET', orgId: ORG_A });
    expect(out.statusCode).toBe(200);
    const names = out.body.items.map((p) => p.name).sort();
    expect(names).toEqual(['A1', 'A2']);
    expect(names).not.toContain('B1');
    for (const p of out.body.items) expect(p.org_id).toBe(ORG_A);
  });

  it("orgB's GET returns only orgB's products", async () => {
    await seedBothTenants();
    const out = await call({ method: 'GET', orgId: ORG_B });
    expect(out.body.items.map((p) => p.name)).toEqual(['B1']);
    expect(out.body.items[0].org_id).toBe(ORG_B);
  });

  it('a request without org_id never returns another tenant’s data (defense in depth)', async () => {
    await seedBothTenants();
    const out = await call({ method: 'GET' });
    // Server may legitimately return empty (no orgId resolved) — what it
    // MUST NOT do is return rows belonging to a specific org.
    expect(Array.isArray(out.body.items)).toBe(true);
    // Strengthened per impl-diff peer review (2026-05-09 nice-to-have #2):
    // assert items.length === 0 explicitly, not just "for-loop on empty
    // is vacuously fine". This catches accidental cross-tenant leaks.
    expect(out.body.items.length).toBe(0);
    for (const p of out.body.items) {
      expect(p.org_id).toBeNull();
    }
  });

  it('changing the header between calls flips the visible set immediately', async () => {
    await seedBothTenants();
    const a1 = await call({ method: 'GET', orgId: ORG_A });
    const b1 = await call({ method: 'GET', orgId: ORG_B });
    const a2 = await call({ method: 'GET', orgId: ORG_A });
    expect(a1.body.items.length).toBe(2);
    expect(b1.body.items.length).toBe(1);
    expect(a2.body.items.length).toBe(2);
  });
});

// ─── Writes are org-scoped ───────────────────────────────────────────────
describe('POST /api/products — tenant isolation on writes', () => {
  it("orgA's POST writes a row with org_id=orgA, never orgB", async () => {
    const out = await call({ method: 'POST', orgId: ORG_A, body: { name: 'A-new' } });
    expect(out.statusCode).toBe(201);
    expect(out.body.item.org_id).toBe(ORG_A);
    // Cross-check via store.
    expect(store.rows[0].org_id).toBe(ORG_A);
  });

  it("orgA cannot inject orgId=orgB (camelCase) in the body", async () => {
    const out = await call({
      method: 'POST',
      orgId: ORG_A,
      body: { name: 'A-camel-injected', orgId: ORG_B }, // hostile payload
    });
    expect(out.statusCode).toBe(201);
    // The handler resolves orgId from the auth context first; body.orgId is
    // a fallback only when ctx.orgId is null. Since orgA's header is set,
    // the row must land in orgA — NOT orgB.
    expect(out.body.item.org_id).toBe(ORG_A);
    expect(store.rows[store.rows.length - 1].org_id).toBe(ORG_A);
  });

  it("orgA cannot inject org_id=orgB (snake_case) in the body either", async () => {
    // Strengthened per impl-diff peer review (2026-05-09 must-fix #2):
    // hostile payload also tries snake_case `org_id` since that's the column
    // name; the handler must ignore body keys when ctx.orgId is set.
    const out = await call({
      method: 'POST',
      orgId: ORG_A,
      body: { name: 'A-snake-injected', org_id: ORG_B },
    });
    expect(out.statusCode).toBe(201);
    expect(out.body.item.org_id).toBe(ORG_A);
    expect(store.rows[store.rows.length - 1].org_id).toBe(ORG_A);
  });

  it("orgA cannot inject BOTH orgId and org_id keys to flip the tenant", async () => {
    // Belt-and-suspenders: hostile payload sends both forms simultaneously.
    const out = await call({
      method: 'POST',
      orgId: ORG_A,
      body: { name: 'A-both-injected', orgId: ORG_B, org_id: ORG_B },
    });
    expect(out.statusCode).toBe(201);
    expect(out.body.item.org_id).toBe(ORG_A);
  });

  it("a follow-up GET as orgB does not see orgA's freshly-created row", async () => {
    await call({ method: 'POST', orgId: ORG_A, body: { name: 'A-secret' } });
    const out = await call({ method: 'GET', orgId: ORG_B });
    expect(out.body.items).toEqual([]);
  });

  it('a request without org_id is rejected (cannot create anonymous-tenant rows)', async () => {
    const out = await call({ method: 'POST', body: { name: 'orphan' } });
    expect(out.statusCode).toBe(400);
    expect(out.body.ok).toBe(false);
    expect(out.body.error).toMatch(/org_id/i);
    expect(store.rows.length).toBe(0);
  });
});

// ─── Per-row read-after-create stays scoped ──────────────────────────────
describe('round-trip — create then list within same tenant', () => {
  it('created rows show up immediately in the same tenant’s list', async () => {
    await call({ method: 'POST', orgId: ORG_A, body: { name: 'first' } });
    await call({ method: 'POST', orgId: ORG_A, body: { name: 'second' } });
    const out = await call({ method: 'GET', orgId: ORG_A });
    const names = out.body.items.map((p) => p.name).sort();
    expect(names).toEqual(['first', 'second']);
  });
});
