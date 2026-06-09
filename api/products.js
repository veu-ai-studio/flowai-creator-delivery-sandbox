// Products collection endpoint
//   GET    /api/products?status=&q=&sort=&limit=&offset=
//   POST   /api/products      → create one     body: {name,url,description,type,status,tags}
//   POST   /api/products?bulk=1   → upsert many  body: { items: [...] }
//
// Multi-tenant: org_id is read from request context (auth middleware) when
// available; falls back to body.org_id/body.orgId for server-side write
// adapters. The db.js abstraction handles backend
// selection (memory vs Supabase).

import { setCorsHeaders } from './_lib/claude.js';
import { listProducts, createProduct } from './_lib/db.js';
import { stats } from './_lib/products.js';
import { requireAuth } from './_lib/auth.js';

function normalizeOrgId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveWriteOrgId(ctx = {}, body = {}) {
  return normalizeOrgId(ctx.orgId) || normalizeOrgId(body.org_id) || normalizeOrgId(body.orgId);
}

function missingOrgResponse(res, extra = {}) {
  return res.status(400).json({
    ok: false,
    error: 'org_id is required for product writes',
    ...extra,
  });
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ctx = await requireAuth(req, res);
  if (!ctx) return; // 401 already written
  const orgId = ctx.orgId;

  if (req.method === 'GET') {
    const { status, q, sort, limit, offset } = req.query || {};
    try {
      const data = await listProducts({
        orgId,
        status,
        q,
        sort,
        limit: limit ? parseInt(limit, 10) : 1000,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      return res.status(200).json({ ...data, stats: stats() });
    } catch (e) {
      return res.status(500).json({ error: e.message || String(e) });
    }
  }

  if (req.method === 'POST') {
    const isBulk = req.query?.bulk === '1' || Array.isArray(req.body?.items);
    try {
      if (isBulk) {
        const items = [];
        const inputItems = req.body?.items || [];
        for (const [index, item] of inputItems.entries()) {
          const writeOrgId = resolveWriteOrgId(ctx, item);
          if (!writeOrgId) return missingOrgResponse(res, { index });
          items.push(await createProduct(item, { orgId: writeOrgId }));
        }
        return res.status(200).json({ ok: true, items, stats: stats() });
      }
      const writeOrgId = resolveWriteOrgId(ctx, req.body || {});
      if (!writeOrgId) return missingOrgResponse(res);
      const item = await createProduct(req.body || {}, { orgId: writeOrgId });
      return res.status(201).json({ ok: true, item, stats: stats() });
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message || String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
