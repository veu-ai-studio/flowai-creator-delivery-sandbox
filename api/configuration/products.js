// Products collection — Configuration migration
//
// GET    /api/configuration/products?status=&q=&limit=&offset=
// POST   /api/configuration/products      → create one
// POST   /api/configuration/products?bulk=1   → upsert many { items: [...] }
//
// Multi-tenant: org_id resolved via auth (Clerk session) or
// x-flowai-org-id header / body.org_id / query.orgId. Defaults to
// 'veu-ai-studio' for the FlowAI internal portfolio when no auth is on.

import { setCorsHeaders } from '../_lib/claude.js';
import {
  listProducts, createProduct, productsStats,
} from '../_lib/configRegistry.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { logger } from '../_lib/logger.js';

const DEFAULT_ORG = 'veu-ai-studio';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const orgId = resolveOrgId(req) || DEFAULT_ORG;

  try {
    if (req.method === 'GET') {
      const { status, q, limit, offset, format } = req.query || {};
      const data = listProducts({
        orgId,
        status,
        q,
        limit: limit ? parseInt(limit, 10) : 1000,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      const stats = productsStats({ orgId });
      logger.debug('configuration.products.list', { orgId, count: data.items.length });
      // Two formats: 'array' (Base44 UI expects) and 'envelope' (default).
      if (format === 'array') return res.status(200).json(data.items);
      return res.status(200).json({ ...data, stats, orgId });
    }

    if (req.method === 'POST') {
      const isBulk = req.query?.bulk === '1' || Array.isArray(req.body?.items);
      if (isBulk) {
        const items = [];
        for (const it of (req.body?.items || [])) {
          try {
            items.push(createProduct(it, { orgId: orgId || it.org_id }));
          } catch (e) {
            items.push({ error: e.message, input: it });
          }
        }
        logger.info('configuration.products.bulk_upsert', { orgId, count: items.length });
        return res.status(200).json({ ok: true, items, stats: productsStats({ orgId }) });
      }
      const item = createProduct(req.body || {}, { orgId });
      logger.info('configuration.products.created', { orgId, productId: item.id, slug: item.slug });
      return res.status(201).json({ ok: true, item, stats: productsStats({ orgId }) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    logger.error('configuration.products.error', { orgId, error: e.message });
    return res.status(400).json({ ok: false, error: e.message || String(e) });
  }
}
