// GET /api/governance/dashboard?since=&sessionId=&productId=
// Returns aggregated governance KPIs: clearance counts, recent audit-log
// entries, cost rollup. Designed for the Governance Dashboard page to show
// without making a dozen separate calls.

import { setCorsHeaders } from '../_lib/claude.js';
import { readLog } from '../_lib/auditlog.js';
import { stats as productStats } from '../_lib/products.js';
import { readLog as readCostLog, summarise as summariseCost } from '../_lib/cost.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const params = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const { since, sessionId, productId } = params;
  const sinceMs = since ? Number(since) : undefined;

  const auditEntries = readLog({ since: sinceMs, sessionId, productId, limit: 500 });
  const costEntries = readCostLog({ since: sinceMs, sessionId, limit: 500 });

  // Tally clearance decisions
  const clearance = { CLEARED: 0, CONDITIONAL: 0, 'NOT CLEARED': 0, UNKNOWN: 0 };
  for (const e of auditEntries) {
    if (e.actionType === 'clearance_run') {
      const d = e.detail?.decision || 'UNKNOWN';
      clearance[d] = (clearance[d] || 0) + 1;
    }
  }

  // Tally severity distribution
  const severityCounts = auditEntries.reduce((acc, e) => {
    acc[e.severity] = (acc[e.severity] || 0) + 1;
    return acc;
  }, {});

  return res.status(200).json({
    products: productStats(),
    clearance,
    severityCounts,
    cost: summariseCost(costEntries),
    recentEvents: auditEntries.slice(-50).reverse(),
  });
}
