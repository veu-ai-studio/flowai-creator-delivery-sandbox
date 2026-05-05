// Lifecycle Engine ↔ Marketplace integration.
//
// At each of the 8 lifecycle steps, the Auto Runner / Guided / Manual flow
// can call into the marketplace to fill its tool slots. This helper
// abstracts the "for this step, what categories and what's the top pick
// per category" into a single function.
//
// Used by:
//   - /api/run-step (and the inline executors in /api/_lib/jobs/runStep.js)
//   - /api/configuration/clone, synthesize, describe — when they need to
//     suggest tools as part of the architecture or improvement plan
//   - The Auto Runner's UI layer (Base44) — to render top-3 picks per slot
//     before the step actually runs

import { categoriesForStep, listToolsForCategory, getProviderPrefs, recordRecommendation, computeBaselineRankings, applyOutcomeAdjustments, DIMENSIONS } from './marketplace.js';

// Step → typical category preference order (when multiple categories
// serve the same step, this is the order the engine considers).
const STEP_CATEGORY_PRIORITY = {
  1: ['ai_llm', 'ai_specialized', 'ai_embeddings'],                     // Research
  2: ['ai_llm', 'ai_specialized'],                                       // Design
  3: ['hosting', 'databases', 'auth', 'storage', 'ai_llm'],             // Build
  4: ['observability', 'ai_llm', 'ai_specialized'],                     // Quality Audit
  5: ['hosting', 'databases', 'storage'],                                // Deploy
  6: ['jobs', 'observability', 'ai_llm'],                                // Self-Renewal
  7: ['email', 'analytics', 'gtm', 'payments'],                          // Go To Market
  8: ['observability', 'analytics', 'jobs'],                             // Monitor
};

// Default weights when called from inside a lifecycle run (no explicit
// provider preferences). The Lifecycle Engine's context is "build a real
// production system" — favours quality + integration ease.
const LIFECYCLE_DEFAULT_WEIGHTS = {
  cost: 0.15,
  quality: 0.25,
  latency: 0.10,
  integration_complexity: 0.20,
  data_residency: 0.10,
  vendor_health: 0.15,
  lock_in_risk: 0.05,
};

function weighted(scores, weights) {
  let s = 0;
  for (const d of DIMENSIONS) s += (scores[d] || 0) * (weights[d] || 0);
  return Math.round(s);
}

// Top pick per category for a step. Used by autonomous runs (no human in
// the loop). Returns { step_number, slots: [{ category, top_pick: {tool, score}, alternatives: [...] }] }
export function recommendSlotsForStep({ stepNumber, orgId, productId, runId, region, scale = 'production', sensitivity = 'medium' }) {
  const cats = categoriesForStep(stepNumber);
  const orgPrefs = getProviderPrefs(orgId || 'veu-ai-studio');
  const blocked = new Set(orgPrefs.blocked_tool_slugs || []);

  const slots = cats.map((cat) => {
    const candidates = listToolsForCategory(cat.id)
      .filter((t) => !blocked.has(t.slug))
      .filter((t) => t.status !== 'archived' && t.status !== 'deprecated');

    const ranked = candidates.map((tool) => {
      const baseline = computeBaselineRankings(tool, { region });
      const adjusted = applyOutcomeAdjustments(tool.slug, baseline);
      const scores = { ...adjusted }; delete scores._evidence_count;
      return { tool, scores, evidence_count: adjusted._evidence_count || 0, score: weighted(scores, LIFECYCLE_DEFAULT_WEIGHTS) };
    }).sort((a, b) => b.score - a.score);

    const top3 = ranked.slice(0, 3);

    // Persist a recommendation record for traceability — even autonomous
    // picks are logged so providers can audit which tool was chosen and why.
    const rec = recordRecommendation({
      org_id: orgId,
      product_id: productId,
      lifecycle_run_id: runId,
      step_number: stepNumber,
      category: cat.id,
      context: { region, scale, sensitivity, source: 'lifecycle_autonomous' },
      weights_applied: LIFECYCLE_DEFAULT_WEIGHTS,
      recommendations: top3.map((r, i) => ({
        rank: i + 1, tool: { slug: r.tool.slug, name: r.tool.name, vendor: r.tool.vendor },
        score: r.score, score_breakdown: r.scores, evidence_count: r.evidence_count,
      })),
      rationale_summary: `Autonomous pick for step ${stepNumber} category ${cat.id}: ${top3[0]?.tool?.name || 'none'}`,
    });

    return {
      category_id: cat.id,
      category_name: cat.name,
      recommendation_id: rec.id,
      top_pick: top3[0] ? {
        tool: { slug: top3[0].tool.slug, name: top3[0].tool.name, vendor: top3[0].tool.vendor },
        score: top3[0].score,
        evidence_count: top3[0].evidence_count,
      } : null,
      alternatives: top3.slice(1).map((r) => ({
        tool: { slug: r.tool.slug, name: r.tool.name, vendor: r.tool.vendor },
        score: r.score,
      })),
    };
  });

  return {
    step_number: stepNumber,
    org_id: orgId,
    product_id: productId,
    lifecycle_run_id: runId,
    slots,
    weights_used: LIFECYCLE_DEFAULT_WEIGHTS,
  };
}

// Resolve a single chosen tool by slug → returns the full tool record so
// downstream prompts (Claude reasoning at each step) can reference it.
export { getTool as getToolBySlug } from './marketplace.js';
