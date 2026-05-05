// POST /api/marketplace/recommend
//
// Body: {
//   step_number: 1-8,
//   category: required (e.g. 'hosting','databases','auth','payments',...),
//   context: {
//     end_customer_region: 'africa' | 'europe' | 'us' | 'asia' | 'latam',
//     end_customer_size: 'individual' | 'small_business' | 'enterprise',
//     end_customer_industry?: string,
//     provider_preferences?: { prefer_low_cost?: boolean, prefer_high_quality?: boolean,
//                              prefer_no_lock_in?: boolean, prefer_data_sovereignty?: boolean },
//     sensitivity_level: 'low' | 'medium' | 'high',
//     expected_scale: 'prototype' | 'production' | 'enterprise'
//   },
//   org_id?: string,
//   product_id?: string,
//   lifecycle_run_id?: string,
//   top_n?: number  (default 3)
// }
//
// Returns: {
//   ok, recommendation_id,
//   recommendations: [
//     { rank, tool, score, score_breakdown, rationale, tradeoffs }
//   ],
//   context_applied: { weights used, region applied, blocked tools, ... },
//   model
// }
//
// Engine logic:
//   1. Filter the category's tools by org's blocked_tool_slugs and any
//      hard data-sovereignty requirements.
//   2. Compute baseline rankings + apply outcome adjustments per tool.
//   3. Compute weights from context (low_cost preference → cost weight 0.30,
//      high_quality → quality 0.30, etc.). Provider's saved weight_overrides
//      take precedence.
//   4. Compute weighted score per tool. Take top N.
//   5. Hand top N to Claude Sonnet to produce contextual rationale +
//      tradeoffs (one ~2-sentence rationale per tool, not a generic
//      restatement of the spec).
//   6. Persist the recommendation; return.

import { setCorsHeaders, callClaude } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { recordCost } from '../_lib/cost.js';
import { logger } from '../_lib/logger.js';
import {
  listToolsForCategory, computeBaselineRankings, applyOutcomeAdjustments,
  getProviderPrefs, recordRecommendation, DIMENSIONS,
} from '../_lib/marketplace.js';

// Default weights — sum to 1. Adjusted per context below.
const DEFAULT_WEIGHTS = {
  cost: 0.15,
  quality: 0.20,
  latency: 0.10,
  integration_complexity: 0.15,
  data_residency: 0.15,
  vendor_health: 0.15,
  lock_in_risk: 0.10,
};

function deriveWeights(context = {}, orgPrefs = {}) {
  const w = { ...DEFAULT_WEIGHTS };
  const prefs = context.provider_preferences || {};

  if (prefs.prefer_low_cost) { w.cost += 0.15; w.quality -= 0.05; w.vendor_health -= 0.05; w.integration_complexity -= 0.05; }
  if (prefs.prefer_high_quality) { w.quality += 0.15; w.cost -= 0.05; w.lock_in_risk -= 0.05; w.integration_complexity -= 0.05; }
  if (prefs.prefer_no_lock_in) { w.lock_in_risk += 0.20; w.vendor_health -= 0.05; w.cost -= 0.05; w.integration_complexity -= 0.10; }
  if (prefs.prefer_data_sovereignty) { w.data_residency += 0.20; w.cost -= 0.10; w.latency -= 0.05; w.integration_complexity -= 0.05; }

  // Sensitivity level pulls weight toward residency + vendor health
  if (context.sensitivity_level === 'high') {
    w.data_residency += 0.10; w.vendor_health += 0.05;
    w.cost -= 0.05; w.integration_complexity -= 0.10;
  } else if (context.sensitivity_level === 'low') {
    w.cost += 0.05; w.integration_complexity += 0.05; w.data_residency -= 0.05; w.vendor_health -= 0.05;
  }

  // Scale: prototype prioritises integration ease; enterprise prioritises vendor health + compliance
  if (context.expected_scale === 'prototype') {
    w.integration_complexity += 0.10; w.cost += 0.05; w.vendor_health -= 0.10; w.lock_in_risk -= 0.05;
  } else if (context.expected_scale === 'enterprise') {
    w.vendor_health += 0.10; w.quality += 0.05; w.cost -= 0.05; w.integration_complexity -= 0.10;
  }

  // Customer size mirrors scale somewhat
  if (context.end_customer_size === 'enterprise') {
    w.vendor_health += 0.05; w.data_residency += 0.05; w.cost -= 0.05; w.integration_complexity -= 0.05;
  }

  // Provider's saved per-org overrides take precedence over derived weights
  const overrides = orgPrefs.weight_overrides || {};
  for (const dim of DIMENSIONS) {
    if (typeof overrides[dim] === 'number') w[dim] = overrides[dim];
  }

  // Re-normalise to sum 1
  const total = DIMENSIONS.reduce((s, d) => s + Math.max(0, w[d] || 0), 0) || 1;
  for (const d of DIMENSIONS) w[d] = Math.max(0, w[d] || 0) / total;

  return w;
}

function applyHardFilters(tools, context, orgPrefs) {
  let filtered = tools.slice();
  // Block list
  const blocked = new Set(orgPrefs.blocked_tool_slugs || []);
  filtered = filtered.filter((t) => !blocked.has(t.slug));
  // Status: only active tools
  filtered = filtered.filter((t) => t.status !== 'archived' && t.status !== 'deprecated');
  // Hard data sovereignty requirements (e.g. 'eu' required → only tools with eu in residency_options)
  const sovereigntyReq = orgPrefs.data_sovereignty_required || [];
  if (sovereigntyReq.length) {
    filtered = filtered.filter((t) => {
      const opts = (t.data_residency_options || []).map((s) => String(s).toLowerCase());
      return sovereigntyReq.some((req) => opts.some((o) => o.includes(req)));
    });
  }
  return filtered;
}

function weightedScore(scores, weights) {
  let s = 0;
  for (const d of DIMENSIONS) {
    s += (scores[d] || 0) * (weights[d] || 0);
  }
  return Math.round(s);
}

async function generateRationaleViaClaude(rankedShortlist, context, weights, sessionId) {
  const toolsBlock = rankedShortlist.map((r, i) => {
    return `Tool ${i + 1} (rank ${r.rank}): ${r.tool.name} by ${r.tool.vendor}
  Score: ${r.score} weighted across dimensions
  Per-dimension: ${DIMENSIONS.map((d) => `${d}=${r.scores[d]}`).join(', ')}
  Pricing: ${r.tool.pricing_model}, free tier: ${r.tool.has_free_tier ? 'yes' : 'no'}, starting paid: $${r.tool.starting_paid_tier_usd ?? 'n/a'}
  Region strengths: ${JSON.stringify(r.tool.region_strengths)}
  Description: ${r.tool.description}`;
  }).join('\n\n');

  const prompt = `You are FlowAI's Tool Intelligence Marketplace recommendation engine. Given a ranked shortlist of tools and a build context, produce a one-sentence rationale per tool explaining WHY it's the right fit for this specific context, plus a one-sentence tradeoff vs the next-ranked tool.

Build context:
  end_customer_region: ${context.end_customer_region || 'unspecified'}
  end_customer_size: ${context.end_customer_size || 'unspecified'}
  industry: ${context.end_customer_industry || 'unspecified'}
  sensitivity_level: ${context.sensitivity_level || 'unspecified'}
  expected_scale: ${context.expected_scale || 'unspecified'}
  provider_preferences: ${JSON.stringify(context.provider_preferences || {})}

Active dimension weights (sum 1):
${DIMENSIONS.map((d) => `  ${d}: ${(weights[d] * 100).toFixed(0)}%`).join('\n')}

Shortlist (ordered by weighted score):
${toolsBlock}

Return a fenced JSON block with this exact shape:

\`\`\`json
{
  "rationales": [
    { "rank": 1, "rationale": "1-2 sentences explaining why this is the top pick FOR THIS context (don't restate the description)", "tradeoffs": "1 sentence on what you give up vs the next-ranked option (or vs a hypothetical perfect fit if rank 1)" },
    { "rank": 2, "rationale": "...", "tradeoffs": "..." },
    { "rank": 3, "rationale": "...", "tradeoffs": "..." }
  ]
}
\`\`\`

Be specific to the context — call out region fit, scale fit, lock-in posture, integration difficulty when they matter. Don't be generic.`;

  try {
    const claude = await callClaude({
      prompt,
      maxTokens: 1500,
      complexity: 'routine',
      timeoutMs: 60000,
    });
    recordCost({ endpoint: '/api/marketplace/recommend', sessionId, ...claude });
    const m = claude.text.match(/```json\s*([\s\S]*?)```/i);
    if (!m) return { rationales: [], model: claude.model, raw: claude.text };
    try {
      const parsed = JSON.parse(m[1].trim());
      return { rationales: parsed.rationales || [], model: claude.model };
    } catch {
      return { rationales: [], model: claude.model, raw: claude.text };
    }
  } catch (e) {
    logger.error('marketplace.recommend.rationale_failed', { error: e.message });
    return { rationales: [], error: e.message };
  }
}

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const {
    step_number: stepNumber, category,
    context = {}, top_n: topN = 3,
    product_id: productId, lifecycle_run_id: runId,
  } = req.body || {};

  const orgId = resolveOrgId(req) || 'veu-ai-studio';

  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'category required (e.g. "hosting", "databases")' });
  }

  // Discover tools in the category
  const candidates = listToolsForCategory(category);
  if (!candidates.length) {
    return res.status(400).json({ error: `Unknown category "${category}". List categories at /api/marketplace/categories.` });
  }

  // Apply hard filters (blocked tools, data sovereignty)
  const orgPrefs = getProviderPrefs(orgId);
  const filtered = applyHardFilters(candidates, context, orgPrefs);
  if (!filtered.length) {
    return res.status(200).json({
      ok: true, recommendations: [], reason: 'no_tools_match_hard_filters',
      context_applied: { blocked: orgPrefs.blocked_tool_slugs, sovereignty: orgPrefs.data_sovereignty_required },
    });
  }

  // Compute weights from context + org overrides
  const weights = deriveWeights(context, orgPrefs);

  // Score each candidate
  const region = context.end_customer_region;
  const ranked = filtered.map((tool) => {
    const baseline = computeBaselineRankings(tool, { region });
    const adjusted = applyOutcomeAdjustments(tool.slug, baseline);
    const scores = { ...adjusted };
    delete scores._evidence_count;
    const score = weightedScore(scores, weights);
    return {
      tool,
      scores,
      evidence_count: adjusted._evidence_count || 0,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  // Boost preferred tools (one-time bonus to surface explicit favourites)
  const preferred = new Set(orgPrefs.preferred_tool_slugs || []);
  if (preferred.size) {
    for (const r of ranked) {
      if (preferred.has(r.tool.slug)) r.score = Math.min(100, r.score + 5);
    }
    ranked.sort((a, b) => b.score - a.score);
  }

  // Take top N
  const cap = Math.min(Math.max(parseInt(topN, 10) || 3, 1), 10);
  const shortlist = ranked.slice(0, cap).map((r, i) => ({ rank: i + 1, ...r }));

  // Generate Claude rationale
  const recId = 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const rationaleResult = await generateRationaleViaClaude(shortlist, context, weights, recId);
  const rationaleByRank = Object.fromEntries((rationaleResult.rationales || []).map((r) => [r.rank, r]));

  const recommendations = shortlist.map((r) => ({
    rank: r.rank,
    tool: {
      slug: r.tool.slug,
      name: r.tool.name,
      vendor: r.tool.vendor,
      description: r.tool.description,
      homepage_url: r.tool.homepage_url,
      pricing_url: r.tool.pricing_url,
      pricing_model: r.tool.pricing_model,
      has_free_tier: r.tool.has_free_tier,
      starting_paid_tier_usd: r.tool.starting_paid_tier_usd,
      open_source: r.tool.open_source,
      self_hostable: r.tool.self_hostable,
      compliance_certs: r.tool.compliance_certs,
      data_residency_options: r.tool.data_residency_options,
      integration_complexity: r.tool.integration_complexity,
    },
    score: r.score,
    score_breakdown: r.scores,
    evidence_count: r.evidence_count,
    rationale: rationaleByRank[r.rank]?.rationale || `${r.tool.name} ranked top by weighted score (${r.score}) given the active context.`,
    tradeoffs: rationaleByRank[r.rank]?.tradeoffs || null,
  }));

  // Persist + audit
  const persisted = recordRecommendation({
    id: recId,
    org_id: orgId,
    product_id: productId || null,
    lifecycle_run_id: runId || null,
    step_number: stepNumber || null,
    category,
    context,
    weights_applied: weights,
    recommendations,
    rationale_summary: recommendations[0]?.rationale || null,
  });

  logger.info('marketplace.recommend', {
    orgId, productId, runId, stepNumber, category,
    top_pick: recommendations[0]?.tool?.slug,
    candidates: candidates.length, after_filter: filtered.length,
    recommendation_id: recId,
  });

  return res.status(200).json({
    ok: true,
    recommendation_id: recId,
    recommendations,
    context_applied: {
      weights,
      region_applied: region || null,
      blocked_tools: orgPrefs.blocked_tool_slugs || [],
      preferred_tools: orgPrefs.preferred_tool_slugs || [],
      sovereignty_required: orgPrefs.data_sovereignty_required || [],
      candidates_count: candidates.length,
      after_filter_count: filtered.length,
    },
    model: rationaleResult.model || null,
  });
}

export default withRequestLog(handler, { endpoint: '/api/marketplace/recommend' });

export const config = { maxDuration: 60 };
