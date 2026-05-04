// Products collection endpoint
//   GET    /api/products?status=&q=&sort=&limit=&offset=
//   POST   /api/products      → create one     body: {name,url,description,type,status,tags}
//   POST   /api/products?bulk=1   → upsert many  body: { items: [...] }
//
// Returns { items, total, limit, offset } for GET, { item } for POST single,
// { items } for POST bulk.

import { setCorsHeaders } from './_lib/claude.js';
import { listProducts, createProduct, bulkUpsert, stats } from './_lib/products.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const { status, q, sort, limit, offset } = req.query || {};
    const data = listProducts({
      status,
      q,
      sort,
      limit: limit ? parseInt(limit, 10) : 1000,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return res.status(200).json({ ...data, stats: stats() });
  }

  if (req.method === 'POST') {
    const isBulk = req.query?.bulk === '1' || Array.isArray(req.body?.items);
    if (isBulk) {
      try {
        const items = bulkUpsert(req.body?.items || []);
        return res.status(200).json({ ok: true, items, stats: stats() });
      } catch (e) {
        return res.status(400).json({ ok: false, error: e.message || String(e) });
      }
    }
    try {
      const item = createProduct(req.body || {});
      return res.status(201).json({ ok: true, item, stats: stats() });
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message || String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
