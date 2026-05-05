// Single-product endpoint
//   GET    /api/products/:id
//   PATCH  /api/products/:id   body: any partial fields
//   DELETE /api/products/:id
//   POST   /api/products/:id?action=audit   body: { score, costUSD }

import { setCorsHeaders } from '../_lib/claude.js';
import { getProduct, updateProduct, deleteProduct, recordProductAudit } from '../_lib/db.js';
import { resolveOrgId } from '../_lib/tenant.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = req.query?.id;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });

  const orgId = resolveOrgId(req);

  try {
    if (req.method === 'GET') {
      const item = await getProduct(id, { orgId });
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ item });
    }

    if (req.method === 'PATCH') {
      const item = await updateProduct(id, req.body || {}, { orgId });
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true, item });
    }

    if (req.method === 'DELETE') {
      const ok = await deleteProduct(id, { orgId });
      return res.status(200).json({ ok });
    }

    if (req.method === 'POST') {
      if (req.query?.action === 'audit') {
        const item = await recordProductAudit(id, req.body || {}, { orgId });
        if (!item) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json({ ok: true, item });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
