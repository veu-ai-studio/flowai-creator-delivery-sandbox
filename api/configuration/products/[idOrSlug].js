// Single-product endpoint — Configuration migration
//   GET    /api/configuration/products/:idOrSlug
//   PUT    /api/configuration/products/:idOrSlug   body: partial fields
//   PATCH  /api/configuration/products/:idOrSlug   (alias for PUT)
//   DELETE /api/configuration/products/:idOrSlug   (sets status to 'archived')
//
// `idOrSlug` matches either the UUID (`prod_xxx`) or the slug.

import { setCorsHeaders } from '../../_lib/claude.js';
import {
  getProduct, updateProduct, deleteProduct, recordProductAudit, listRuns,
} from '../../_lib/configRegistry.js';
import { requireAuthHard } from '../../_lib/auth.js';
import { logger } from '../../_lib/logger.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const authCtx = await requireAuthHard(req, res);
  if (!authCtx) return;
  const idOrSlug = req.query?.idOrSlug;
  if (!idOrSlug) return res.status(400).json({ error: 'Missing idOrSlug' });
  const orgId = authCtx.orgId;

  try {
    if (req.method === 'GET') {
      const item = getProduct(idOrSlug, { orgId });
      if (!item) return res.status(404).json({ error: 'Not found' });
      // Bundle in recent runs for the UI.
      const recentRuns = listRuns({ orgId, productId: item.id, limit: 10 });
      return res.status(200).json({ item, recentRuns });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const item = updateProduct(idOrSlug, req.body || {}, { orgId });
      if (!item) return res.status(404).json({ error: 'Not found' });
      logger.info('configuration.products.updated', { orgId, productId: item.id, slug: item.slug });
      return res.status(200).json({ ok: true, item });
    }

    if (req.method === 'DELETE') {
      // Soft-delete via status=archived (the spec says "archive", not destroy).
      const archive = req.query?.hard !== '1';
      if (archive) {
        const item = updateProduct(idOrSlug, { status: 'archived' }, { orgId });
        if (!item) return res.status(404).json({ error: 'Not found' });
        logger.info('configuration.products.archived', { orgId, productId: item.id });
        return res.status(200).json({ ok: true, archived: true, item });
      }
      const ok = deleteProduct(idOrSlug, { orgId });
      logger.info('configuration.products.deleted', { orgId, idOrSlug, ok });
      return res.status(200).json({ ok });
    }

    if (req.method === 'POST' && req.query?.action === 'audit') {
      const item = recordProductAudit(idOrSlug, req.body || {}, { orgId });
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true, item });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    logger.error('configuration.products.error', { orgId, error: e.message, idOrSlug });
    return res.status(400).json({ ok: false, error: e.message || String(e) });
  }
}
