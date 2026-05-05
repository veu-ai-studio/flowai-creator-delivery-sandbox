// Tool Intelligence Marketplace — in-memory store + ranking + recommendation
// helper. Wraps the canonical seed data in marketplaceSeed.js with the
// state needed for ranking and outcome tracking.
//
// V1 storage: in-process Maps. V2: routes through db.js to Postgres tables
// defined in /supabase/migrations/0004_tool_marketplace.sql.

import { TOOL_CATEGORIES, TOOLS, TOOLS_BY_SLUG, TOOLS_BY_CATEGORY, listCategories, getTool, categoriesForStep, listToolsForCategory } from './marketplaceSeed.js';

// Ranking dimensions in canonical order — mirrors the migration's check.
export const DIMENSIONS = ['cost', 'quality', 'latency', 'integration_complexity', 'data_residency', 'vendor_health', 'lock_in_risk'];

// ─── Baseline ranking computation ──────────────────────────────────────
//
// When no outcome data exists yet, score each dimension from the static
// (vendor-claimed) facts. As outcomes accumulate, dynamic_scores layer on
// top via outcome aggregation.

function scoreCostBaseline(t) {
  // 0 = expensive, 100 = cheap. Use starting_paid_tier_usd + free tier.
  let s = 50;
  if (t.has_free_tier) s += 20;
  if (t.pricing_model === 'open_source_self_host') s += 25;
  if (t.starting_paid_tier_usd != null) {
    if (t.starting_paid_tier_usd === 0) s += 15;
    else if (t.starting_paid_tier_usd < 10) s += 10;
    else if (t.starting_paid_tier_usd < 30) s += 5;
    else if (t.starting_paid_tier_usd > 100) s -= 15;
    else if (t.starting_paid_tier_usd > 50) s -= 5;
  }
  if (t.pricing_model === 'enterprise_quote') s -= 15;
  return Math.max(0, Math.min(100, s));
}

function scoreQualityBaseline(t) {
  // No outcome data yet — proxy via vendor health + funding stage + cert breadth.
  let s = 50;
  const round = t.last_funding_round || 'unknown';
  if (round === 'public' || round === 'profitable_bootstrapped') s += 20;
  else if (round === 'acquired' || round === 'acquired_by_stripe' || round === 'acquired_by_mongodb') s += 15;
  else if (round.startsWith('series-')) {
    const stage = round.split('-')[1];
    if (stage >= 'd') s += 18;
    else if (stage === 'c') s += 14;
    else if (stage === 'b') s += 10;
    else if (stage === 'a') s += 6;
  } else if (round === 'seed' || round === 'pre-seed') s += 2;
  if (t.public_incident_frequency === 'low') s += 10;
  else if (t.public_incident_frequency === 'medium') s += 0;
  else if (t.public_incident_frequency === 'high') s -= 10;
  // Cert breadth signals enterprise-readiness
  s += Math.min(12, (t.compliance_certs || []).length * 3);
  return Math.max(0, Math.min(100, s));
}

function scoreLatencyBaseline(t) {
  // No measured latency yet — proxy via region breadth + edge architecture.
  let s = 60;
  const regions = (t.data_residency_options || []).length;
  if (regions >= 10) s += 20;
  else if (regions >= 5) s += 12;
  else if (regions >= 3) s += 6;
  else if (regions === 1) s -= 5;
  // Tools that explicitly mention 'edge' or 'global' get a bump
  const desc = (t.description || '').toLowerCase();
  if (desc.includes('edge') || desc.includes('global')) s += 10;
  return Math.max(0, Math.min(100, s));
}

function scoreIntegrationComplexity(t) {
  // The spec field IS 1-5 where 1=trivial. Convert to 0-100 where 100=easiest.
  const c = t.integration_complexity || 3;
  return Math.max(0, Math.min(100, 120 - c * 20)); // 1→100, 2→80, 3→60, 4→40, 5→20
}

function scoreDataResidency(t, requestedRegion) {
  // Default: average of region_strengths. With a requested region, return that score.
  const r = t.region_strengths || {};
  if (requestedRegion && r[requestedRegion] != null) return r[requestedRegion];
  const vals = Object.values(r).filter((v) => typeof v === 'number');
  if (!vals.length) return 50;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function scoreVendorHealth(t) {
  let s = 50;
  const round = t.last_funding_round || 'unknown';
  if (round === 'public' || round === 'profitable_bootstrapped') s = 90;
  else if (round.startsWith('series-')) {
    const stage = round.split('-')[1];
    s = stage === 'a' ? 65 : stage === 'b' ? 75 : stage === 'c' ? 80 : stage === 'd' ? 85 : stage >= 'e' ? 88 : 60;
  } else if (round === 'seed') s = 45;
  else if (round === 'pre-seed') s = 35;
  else if (round.startsWith('acquired')) s = 80;
  if (t.public_incident_frequency === 'high') s -= 15;
  if (t.public_incident_frequency === 'medium') s -= 5;
  if (t.last_funding_year && (new Date().getFullYear() - t.last_funding_year) > 4) s -= 5; // stale signal
  return Math.max(0, Math.min(100, s));
}

function scoreLockInRisk(t) {
  // 100 = lowest risk (easy to leave). 0 = high lock-in.
  let s = 50;
  if (t.open_source) s += 25;
  if (t.self_hostable) s += 15;
  switch (t.data_export_ease) {
    case 'trivial': s += 15; break;
    case 'moderate': s += 5; break;
    case 'difficult': s -= 10; break;
    case 'impossible': s -= 25; break;
    default: break;
  }
  return Math.max(0, Math.min(100, s));
}

export function computeBaselineRankings(tool, { region } = {}) {
  return {
    cost: scoreCostBaseline(tool),
    quality: scoreQualityBaseline(tool),
    latency: scoreLatencyBaseline(tool),
    integration_complexity: scoreIntegrationComplexity(tool),
    data_residency: scoreDataResidency(tool, region),
    vendor_health: scoreVendorHealth(tool),
    lock_in_risk: scoreLockInRisk(tool),
  };
}

// ─── Outcome ledger (in-memory) ────────────────────────────────────────

const OUTCOMES = [];                  // chronological log
const RECOMMENDATIONS = new Map();    // recId → record

export function recordOutcome({
  tool_slug, org_id, product_id, lifecycle_run_id, step_number, step_key,
  success, cost_usd, latency_ms, quality_score, provider_satisfaction, error_type, metadata,
}) {
  const tool = TOOLS_BY_SLUG[tool_slug];
  if (!tool) throw new Error(`Unknown tool slug: ${tool_slug}`);
  const entry = {
    id: 'outcome_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    tool_slug, tool_id: tool.slug,           // alias since we use slug as id in V1
    org_id: org_id || null,
    product_id: product_id || null,
    lifecycle_run_id: lifecycle_run_id || null,
    step_number: step_number || null,
    step_key: step_key || null,
    success: success !== false,
    cost_usd: Number(cost_usd) || 0,
    latency_ms: latency_ms != null ? Number(latency_ms) : null,
    quality_score: quality_score != null ? Number(quality_score) : null,
    provider_satisfaction: provider_satisfaction || null,
    error_type: error_type || null,
    metadata: metadata || {},
    recorded_at: new Date().toISOString(),
  };
  OUTCOMES.push(entry);
  return entry;
}

export function listOutcomes({ tool_slug, org_id, lifecycle_run_id, since } = {}) {
  let arr = OUTCOMES.slice();
  if (tool_slug) arr = arr.filter((o) => o.tool_slug === tool_slug);
  if (org_id) arr = arr.filter((o) => o.org_id === org_id);
  if (lifecycle_run_id) arr = arr.filter((o) => o.lifecycle_run_id === lifecycle_run_id);
  if (since) arr = arr.filter((o) => o.recorded_at >= since);
  return arr;
}

// Aggregate outcome stats per tool for the dynamic ranking pass.
export function summariseOutcomes(toolSlug) {
  const arr = OUTCOMES.filter((o) => o.tool_slug === toolSlug);
  if (!arr.length) return null;
  const successCount = arr.filter((o) => o.success).length;
  const costs = arr.map((o) => o.cost_usd).filter((v) => v > 0);
  const latencies = arr.map((o) => o.latency_ms).filter((v) => v != null);
  const qualities = arr.map((o) => o.quality_score).filter((v) => v != null);
  const satisfactions = arr.map((o) => o.provider_satisfaction).filter((v) => v != null);
  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const p95 = (a) => {
    if (!a.length) return null;
    const sorted = a.slice().sort((x, y) => x - y);
    return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
  };
  return {
    runs: arr.length,
    success_rate: successCount / arr.length,
    avg_cost_usd: avg(costs),
    avg_latency_ms: avg(latencies),
    p95_latency_ms: p95(latencies),
    avg_quality_score: avg(qualities),
    avg_provider_satisfaction: avg(satisfactions),
  };
}

// Adjust baseline rankings using observed outcomes.
// Returns the dimension scores blended with the dynamic signal.
export function applyOutcomeAdjustments(toolSlug, baselineScores) {
  const summary = summariseOutcomes(toolSlug);
  if (!summary || summary.runs < 3) {
    // Not enough evidence — use baseline as-is.
    return { ...baselineScores, _evidence_count: summary?.runs || 0 };
  }
  const adjusted = { ...baselineScores };

  // Quality blends with success rate + provider satisfaction
  const qualitySignal = summary.success_rate * 100;
  adjusted.quality = Math.round(adjusted.quality * 0.5 + qualitySignal * 0.5);
  if (summary.avg_provider_satisfaction != null) {
    const satScaled = (summary.avg_provider_satisfaction - 1) / 4 * 100;
    adjusted.quality = Math.round(adjusted.quality * 0.7 + satScaled * 0.3);
  }
  if (summary.avg_quality_score != null) {
    adjusted.quality = Math.round(adjusted.quality * 0.6 + summary.avg_quality_score * 0.4);
  }

  // Latency: invert observed P95 — under 1s = 100, 5s = 60, 30s = 10
  if (summary.p95_latency_ms != null) {
    const lat = summary.p95_latency_ms;
    let latencyObserved = 100;
    if (lat > 1000) latencyObserved = Math.max(10, 100 - Math.log10(lat / 1000) * 30);
    adjusted.latency = Math.round(adjusted.latency * 0.4 + latencyObserved * 0.6);
  }

  // Cost: if observed average is lower than expected for the pricing tier, bump.
  // If it's much higher than the starting tier suggests, ding.
  // Simple heuristic: observed-vs-starting ratio.
  const tool = TOOLS_BY_SLUG[toolSlug];
  if (summary.avg_cost_usd != null && tool?.starting_paid_tier_usd != null) {
    const expected = Math.max(1, tool.starting_paid_tier_usd / 30);  // rough $/run baseline
    const ratio = summary.avg_cost_usd / expected;
    let costAdj = 0;
    if (ratio < 0.5) costAdj = +10;
    else if (ratio < 1) costAdj = +5;
    else if (ratio > 3) costAdj = -10;
    else if (ratio > 1.5) costAdj = -5;
    adjusted.cost = Math.max(0, Math.min(100, adjusted.cost + costAdj));
  }

  adjusted._evidence_count = summary.runs;
  return adjusted;
}

// ─── Recommendations record ────────────────────────────────────────────

export function recordRecommendation(rec) {
  const id = rec.id || ('rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
  const entry = { ...rec, id, created_at: rec.created_at || new Date().toISOString() };
  RECOMMENDATIONS.set(id, entry);
  return entry;
}

export function getRecommendation(id) {
  return RECOMMENDATIONS.get(id) || null;
}

export function markRecommendationPicked(id, { picked_tool_slug, override_tool_slug } = {}) {
  const rec = RECOMMENDATIONS.get(id);
  if (!rec) return null;
  rec.picked_tool_slug = picked_tool_slug;
  rec.override_tool_slug = override_tool_slug || null;
  rec.picked_at = new Date().toISOString();
  return rec;
}

// ─── Provider preferences (per-org weight overrides) ──────────────────

const PROVIDER_PREFS = new Map();      // org_id → preferences

export function getProviderPrefs(orgId) {
  return PROVIDER_PREFS.get(orgId) || {
    org_id: orgId,
    weight_overrides: {},
    preferred_tool_slugs: [],
    blocked_tool_slugs: [],
    data_sovereignty_required: [],
  };
}

export function setProviderPrefs(orgId, patch) {
  const existing = getProviderPrefs(orgId);
  const next = { ...existing, ...patch, org_id: orgId, updated_at: new Date().toISOString() };
  PROVIDER_PREFS.set(orgId, next);
  return next;
}

// ─── Public iterators ──────────────────────────────────────────────────

export {
  TOOL_CATEGORIES, TOOLS, TOOLS_BY_SLUG, TOOLS_BY_CATEGORY,
  listCategories, listToolsForCategory, getTool, categoriesForStep,
};
