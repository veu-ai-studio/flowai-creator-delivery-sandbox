// POST /api/marketplace/outcomes
// Body: {
//   tool_slug, lifecycle_run_id, step_number, step_key,
//   success, cost_usd, latency_ms, quality_score,
//   provider_satisfaction (1-5), error_type, metadata
// }
// Records an outcome for a tool that was used in a lifecycle step.
// Outcomes accumulate; the weekly Inngest job re-ranks tools based on them.
//
// GET /api/marketplace/outcomes?tool_slug=&org_id=&lifecycle_run_id=
// Lists outcomes (admin-gated for cross-org reads).

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { logger } from '../_lib/logger.js';
import { recordOutcome, listOutcomes, summariseOutcomes, getTool } from '../_lib/marketplace.js';
import { appendAuditEntry } from '../_lib/db.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const orgId = resolveOrgId(req) || 'veu-ai-studio';

  if (req.method === 'POST') {
    const {
      tool_slug, lifecycle_run_id, step_number, step_key,
      success, cost_usd, latency_ms, quality_score,
      provider_satisfaction, error_type, metadata,
      product_id: productId,
    } = req.body || {};

    if (!tool_slug) return res.status(400).json({ error: 'tool_slug required' });
    if (!getTool(tool_slug)) return res.status(400).json({ error: `Unknown tool slug: ${tool_slug}` });

    try {
      const entry = recordOutcome({
        tool_slug, org_id: orgId, product_id: productId,
        lifecycle_run_id, step_number, step_key,
        success, cost_usd, latency_ms, quality_score,
        provider_satisfaction, error_type, metadata,
      });

      await appendAuditEntry({
        actionType: 'marketplace.outcome.recorded',
        severity: 'info',
        orgId, productId,
        sessionId: lifecycle_run_id,
        detail: {
          tool_slug, step_number, success: entry.success,
          cost_usd: entry.cost_usd, quality_score: entry.quality_score,
        },
      }).catch(() => {});

      logger.info('marketplace.outcome.recorded', {
        orgId, productId, runId: lifecycle_run_id,
        toolSlug: tool_slug, stepNumber: step_number,
        success: entry.success, costUSD: entry.cost_usd,
      });

      return res.status(201).json({ ok: true, outcome: entry });
    } catch (e) {
      return res.status(400).json({ error: e.message || String(e) });
    }
  }

  if (req.method === 'GET') {
    const { tool_slug, lifecycle_run_id, since } = req.query || {};
    const arr = listOutcomes({ tool_slug, org_id: orgId, lifecycle_run_id, since });
    const summary = tool_slug ? summariseOutcomes(tool_slug) : null;
    return res.status(200).json({ outcomes: arr, total: arr.length, summary });
  }

  return res.status(405).json({ error: 'Use POST or GET' });
}

export default withRequestLog(handler, { endpoint: '/api/marketplace/outcomes' });
