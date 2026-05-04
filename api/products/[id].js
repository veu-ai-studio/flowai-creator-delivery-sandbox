// Single-product endpoint
//   GET    /api/products/:id
//   PATCH  /api/products/:id   body: any partial fields
//   DELETE /api/products/:id
//   POST   /api/products/:id?action=audit   body: { score, costUSD }

import { setCorsHeaders } from '../_lib/claude.js';
import { getProduct, updateProduct, deleteProduct, recordAudit } from '../_lib/products.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = req.query?.id;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'GET') {
    const item = getProduct(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ item });
  }

  if (req.method === 'PATCH') {
    const item = updateProduct(id, req.body || {});
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ ok: true, item });
  }

  if (req.method === 'DELETE') {
    const ok = deleteProduct(id);
    return res.status(200).json({ ok });
  }

  if (req.method === 'POST') {
    if (req.query?.action === 'audit') {
      const item = recordAudit(id, req.body || {});
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true, item });
    }
    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
