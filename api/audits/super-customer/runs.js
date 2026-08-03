// GET /api/audits/super-customer/runs?org_id=&product_id=&status=&limit=
// Lists past audit runs for an org/product. Returns lightweight metadata
// (no per-surface output) so the UI can render a history list without
// pulling full bundles.

import { setCorsHeaders } from '../../_lib/claude.js';
import { listRuns } from '../../_lib/configRegistry.js';
import { withRequestLog } from '../../_lib/requestLog.js';
import { requireAuthHard } from '../../_lib/auth.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const ctx = await requireAuthHard(req, res);
  if (!ctx) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const orgId = ctx.orgId;
  const { product_id: productId, status, limit } = req.query || {};

  // Filter only super-customer runs
  const allRuns = listRuns({ orgId, productId, mode: 'super-customer', status, limit: limit ? parseInt(limit, 10) : 100 });

  // Lightweight summary per run — drop the heavy output bundle from the list view.
  const summary = allRuns.map((r) => ({
    run_id: r.id,
    org_id: r.org_id,
    product_id: r.product_id,
    target_url: r.input?.url || (r.output?.target_url) || null,
    status: r.status,
    started_at: r.started_at,
    completed_at: r.completed_at,
    duration_ms: r.duration_ms,
    surfaces_count: (r.output?.surfaces || []).length,
    counts: r.output?.counts || null,
    health_score: r.quality_score,
    cost_usd: r.cost_usd || 0,
    error: r.error,
  }));

  return res.status(200).json({
    runs: summary,
    total: summary.length,
    org_id: orgId,
    product_id: productId || null,
  });
}

export default withRequestLog(handler, { endpoint: '/api/audits/super-customer/runs' });
