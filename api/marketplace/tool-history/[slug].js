// GET /api/marketplace/tool-history/[slug]
//
// Shows how a single tool has performed across past lifecycle runs:
//   - Outcome history (every recorded outcome the org can see)
//   - Aggregate summary (success rate, avg cost, avg latency, satisfaction)
//   - Most recent ranking snapshot (with previous, if a re-rank has run)
//   - Audit trail of ranking shifts
//
// This is the "should I trust this tool?" view a provider opens when
// deciding between two recommendations. It de-mystifies the score by
// showing the evidence behind it.
//
// Query params:
//   ?since=2026-01-01    → only outcomes from that date forward
//   ?org_scope=mine|all  → 'mine' (default) restricts to caller's org;
//                          'all' is admin-only and returns cross-org data

import { setCorsHeaders } from '../../_lib/claude.js';
import { withRequestLog } from '../../_lib/requestLog.js';
import { resolveOrgId } from '../../_lib/tenant.js';
import {
  getTool, listOutcomes, summariseOutcomes,
  computeBaselineRankings, applyOutcomeAdjustments, DIMENSIONS,
} from '../../_lib/marketplace.js';
import { getRankingHistory } from '../../_lib/jobs/marketplaceRerank.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const slug = req.query.slug || (req.url.split('/').pop() || '').split('?')[0];
  if (!slug) return res.status(400).json({ error: 'tool slug required in path' });

  const tool = getTool(slug);
  if (!tool) return res.status(404).json({ error: `Unknown tool slug: ${slug}` });

  const orgId = resolveOrgId(req) || 'veu-ai-studio';
  const orgScope = req.query.org_scope === 'all' ? 'all' : 'mine';
  const adminKey = req.headers['x-flowai-admin-key'];
  const isAdmin = process.env.ADMIN_SEED_KEY && adminKey === process.env.ADMIN_SEED_KEY;

  if (orgScope === 'all' && !isAdmin) {
    return res.status(403).json({ error: 'Cross-org history requires admin key' });
  }

  const since = req.query.since;
  const outcomes = listOutcomes({
    tool_slug: slug,
    org_id: orgScope === 'all' ? undefined : orgId,
    since,
  });

  const summary = summariseOutcomes(slug);

  const baseline = computeBaselineRankings(tool);
  const adjusted = applyOutcomeAdjustments(slug, baseline);
  const evidenceCount = adjusted._evidence_count || 0;
  const currentScores = {};
  for (const d of DIMENSIONS) currentScores[d] = adjusted[d];

  const history = getRankingHistory(slug);
  const previousScores = history?.previous || null;

  const movement = previousScores
    ? DIMENSIONS.map((d) => ({
        dimension: d,
        previous: previousScores[d],
        current: currentScores[d],
        delta: currentScores[d] - previousScores[d],
      })).filter((m) => Math.abs(m.delta) >= 1)
    : [];

  return res.status(200).json({
    tool: {
      slug: tool.slug,
      name: tool.name,
      vendor: tool.vendor,
      category_id: tool.category_id,
      status: tool.status || 'active',
    },
    rankings: {
      baseline_scores: baseline,
      current_scores: currentScores,
      previous_scores: previousScores,
      evidence_count: evidenceCount,
      has_outcome_data: evidenceCount >= 3,
      last_reranked_at: history?.computed_at || null,
      movement,
    },
    outcome_summary: summary,
    outcomes: outcomes.map((o) => ({
      lifecycle_run_id: o.lifecycle_run_id,
      step_number: o.step_number,
      step_key: o.step_key,
      success: o.success,
      cost_usd: o.cost_usd,
      latency_ms: o.latency_ms,
      quality_score: o.quality_score,
      provider_satisfaction: o.provider_satisfaction,
      error_type: o.error_type,
      recorded_at: o.recorded_at,
    })),
    total_outcomes: outcomes.length,
    scope: { org_id: orgScope === 'all' ? 'all' : orgId, since: since || null },
  });
}

export default withRequestLog(handler, { endpoint: '/api/marketplace/tool-history' });
