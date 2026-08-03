// GET /api/governance/dashboard?since=&sessionId=&productId=
// Returns aggregated governance KPIs scoped by org_id.
// Backend: db.js abstraction (memory today, Supabase tomorrow).

import { setCorsHeaders } from '../_lib/claude.js';
import { listAuditEntries, costSummary } from '../_lib/db.js';
import { stats as productStats } from '../_lib/products.js';
import { requireAuthHard } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const ctx = await requireAuthHard(req, res);
  if (!ctx) return;

  const params = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const { since, sessionId, productId } = params;
  const sinceMs = since ? Number(since) : undefined;
  const orgId = ctx.orgId;

  try {
    const auditEntries = await listAuditEntries({
      orgId, since: sinceMs, sessionId, productId, limit: 500,
    });

    const cost = await costSummary({
      orgId, sessionId, since: sinceMs,
    });

    const clearance = { CLEARED: 0, CONDITIONAL: 0, 'NOT CLEARED': 0, UNKNOWN: 0 };
    for (const e of auditEntries) {
      if (e.action_type === 'clearance_run' || e.actionType === 'clearance_run') {
        const d = e.detail?.decision || 'UNKNOWN';
        clearance[d] = (clearance[d] || 0) + 1;
      }
    }

    const severityCounts = auditEntries.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      products: productStats(),
      clearance,
      severityCounts,
      cost,
      recentEvents: auditEntries.slice(0, 50),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
