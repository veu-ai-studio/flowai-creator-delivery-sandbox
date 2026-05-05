// Products collection endpoint
//   GET    /api/products?status=&q=&sort=&limit=&offset=
//   POST   /api/products      → create one     body: {name,url,description,type,status,tags}
//   POST   /api/products?bulk=1   → upsert many  body: { items: [...] }
//
// Multi-tenant: org_id is read from request context (auth middleware) when
// available; falls back to body.orgId. The db.js abstraction handles backend
// selection (memory vs Supabase).

import { setCorsHeaders } from './_lib/claude.js';
import { listProducts, createProduct } from './_lib/db.js';
import { stats } from './_lib/products.js';
import { requireAuth } from './_lib/auth.js';

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
        for (const item of (req.body?.items || [])) {
          items.push(await createProduct(item, { orgId: orgId || item.orgId }));
        }
        return res.status(200).json({ ok: true, items, stats: stats() });
      }
      const item = await createProduct(req.body || {}, { orgId: orgId || req.body?.orgId });
      return res.status(201).json({ ok: true, item, stats: stats() });
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message || String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
