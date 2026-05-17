// Objectives endpoint — per-product goals, constraints, preferences
//
// GET    /api/configuration/objectives?product_id=<id>
// POST   /api/configuration/objectives    body: { product_id, type, value, weight?, id? }
// PATCH  /api/configuration/objectives    body: { id, ...patch }   (alias for POST upsert)
// DELETE /api/configuration/objectives?id=<id>
//
// Objectives flow into describe / clone / synthesize prompts as system
// context so each product can carry its own audit lens (e.g. SAIGE always
// gets investor_review, MyPregLife always gets compliance constraints).

import { setCorsHeaders } from '../_lib/claude.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { listObjectives, upsertObjective, deleteObjective, getObjective } from '../_lib/configRegistry.js';
import { logger } from '../_lib/logger.js';

const DEFAULT_ORG = 'veu-ai-studio';
const VALID_TYPES = new Set(['goal', 'constraint', 'preference']);

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const orgId = resolveOrgId(req) || DEFAULT_ORG;

  try {
    if (req.method === 'GET') {
      const { product_id: productId } = req.query || {};
      const objectives = listObjectives({ orgId, productId });
      return res.status(200).json({ objectives, orgId, productId: productId || null });
    }

    if (req.method === 'POST' || req.method === 'PATCH') {
      const body = req.body || {};
      if (!body.product_id) return res.status(400).json({ error: 'product_id required' });
      if (!VALID_TYPES.has(body.type)) {
        return res.status(400).json({ error: `type must be one of: ${[...VALID_TYPES].join(', ')}` });
      }
      const objective = upsertObjective(body, { orgId });
      logger.info('configuration.objectives.upsert', { orgId, productId: body.product_id, type: body.type, id: objective.id });
      return res.status(200).json({ ok: true, objective });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const existing = getObjective(id);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const ok = deleteObjective(id, { orgId });
      logger.info('configuration.objectives.delete', { orgId, id, ok });
      return res.status(200).json({ ok });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    logger.error('configuration.objectives.error', { orgId, error: e.message });
    return res.status(400).json({ ok: false, error: e.message || String(e) });
  }
}
