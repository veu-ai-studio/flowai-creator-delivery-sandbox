// GET /api/marketplace/tools
//
// Lists tools with their current outcome-adjusted rankings. This is the
// "browse the marketplace" endpoint — providers see every tool with a
// 7-dimension score breakdown and can compare without committing to a
// recommendation context.
//
// Query params:
//   ?category=hosting        → filter to a single category
//   ?region=africa           → score tools for that region (default: no regional weighting)
//   ?include_archived=true   → include archived/deprecated entries (default: false)
//   ?slug=vercel             → return a single tool record
//
// Returns scores + the static facts a provider needs to make an informed
// pick: pricing, region strengths, compliance certs, integration complexity,
// and whether outcome data has accumulated yet.

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import {
  TOOLS, TOOLS_BY_SLUG, TOOLS_BY_CATEGORY,
  computeBaselineRankings, applyOutcomeAdjustments, summariseOutcomes,
} from '../_lib/marketplace.js';

function buildEntry(tool, region) {
  const baseline = computeBaselineRankings(tool, { region });
  const adjusted = applyOutcomeAdjustments(tool.slug, baseline);
  const evidenceCount = adjusted._evidence_count || 0;
  const scores = { ...adjusted };
  delete scores._evidence_count;

  return {
    slug: tool.slug,
    name: tool.name,
    vendor: tool.vendor,
    category_id: tool.category_id,
    description: tool.description,
    homepage_url: tool.homepage_url,
    pricing: {
      model: tool.pricing_model,
      has_free_tier: tool.has_free_tier,
      free_tier_summary: tool.free_tier_summary || null,
      starting_paid_tier_usd: tool.starting_paid_tier_usd || null,
      pricing_unit: tool.pricing_unit || null,
    },
    region_strengths: tool.region_strengths,
    data_residency_options: tool.data_residency_options || [],
    compliance_certs: tool.compliance_certs || [],
    integration_complexity: tool.integration_complexity,
    setup_time_estimate_minutes: tool.setup_time_estimate_minutes || null,
    primary_languages: tool.primary_languages || [],
    open_source: tool.open_source || false,
    self_hostable: tool.self_hostable || false,
    data_export_ease: tool.data_export_ease || 'unknown',
    last_funding_round: tool.last_funding_round || 'unknown',
    public_incident_frequency: tool.public_incident_frequency || 'unknown',
    status: tool.status || 'active',
    rankings: {
      scores,
      evidence_count: evidenceCount,
      has_outcome_data: evidenceCount >= 3,
      region_applied: region || null,
    },
    outcome_summary: evidenceCount > 0 ? summariseOutcomes(tool.slug) : null,
  };
}

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const { category, region, include_archived, slug } = req.query || {};
  const includeArchived = include_archived === 'true' || include_archived === '1';

  if (slug) {
    const tool = TOOLS_BY_SLUG[slug];
    if (!tool) return res.status(404).json({ error: `Unknown tool slug: ${slug}` });
    return res.status(200).json({ tool: buildEntry(tool, region) });
  }

  let pool = category ? (TOOLS_BY_CATEGORY[category] || []) : TOOLS;
  if (!includeArchived) {
    pool = pool.filter((t) => t.status !== 'archived' && t.status !== 'deprecated');
  }

  const tools = pool
    .map((t) => buildEntry(t, region))
    .sort((a, b) => {
      const aSum = Object.values(a.rankings.scores).reduce((s, v) => s + (v || 0), 0);
      const bSum = Object.values(b.rankings.scores).reduce((s, v) => s + (v || 0), 0);
      return bSum - aSum;
    });

  return res.status(200).json({
    tools,
    total: tools.length,
    filter: { category: category || null, region: region || null, include_archived: includeArchived },
  });
}

export default withRequestLog(handler, { endpoint: '/api/marketplace/tools' });
