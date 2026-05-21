// src/lib/evaluation/evaluationBudget.js
//
// PART B — Evaluation Budget Tiering. Phase C verification doubled the
// evaluator runtime; at 250 pages a naive fan-out blew past 90 minutes.
// This module assigns each crawled page to a tier, prioritising the
// pages that carry the most signal:
//
//   TIER 1  (all pages)         runtime diagnostics + DOM checks   ~5s/page
//   TIER 2  (top-5 by importance)  + lighthouse + axe-core        ~30s/page
//   TIER 3  (homepage only)        + full evaluator stack          ≤60s
//
// Page importance heuristic (descending):
//   homepage (root /) > /login > /pricing > /dashboard > rest
//
// Total budget cap per iteration: 10 minutes (configurable).
//
// Pure module — no IO, no exceptions. The pipeline reads the tier
// assignment per page and skips heavy evaluators for TIER 1 pages.

'use strict';

export const TIER = Object.freeze({
  TIER_1: 'TIER_1',
  TIER_2: 'TIER_2',
  TIER_3: 'TIER_3',
});

export const DEFAULT_BUDGET = Object.freeze({
  totalBudgetMs: 10 * 60 * 1000,          // 10 minutes per iteration
  tier1PerPageMs: 5_000,                  // ~5s
  tier2PerPageMs: 30_000,                 // ~30s
  tier3PerPageMs: 60_000,                 // ≤60s
  tier2SamplePages: 5,                    // top-5 by importance
  tier3SamplePages: 1,                    // homepage only
});

/**
 * Per-tier evaluator allowlist. The pipeline filters its evaluator set
 * by this when invoked with an `evaluationTier` option.
 */
export const TIER_EVALUATORS = Object.freeze({
  [TIER.TIER_1]: Object.freeze(['phase-b', 'runtime']),
  [TIER.TIER_2]: Object.freeze(['phase-b', 'runtime', 'axe', 'lighthouse']),
  [TIER.TIER_3]: Object.freeze(['phase-b', 'runtime', 'axe', 'lighthouse']),
});

/**
 * Importance ranking for a page URL. Lower number = higher importance.
 * Heuristic only — not a security boundary.
 */
export function pageImportance(url) {
  if (typeof url !== 'string' || url.length === 0) return 999;
  let path;
  try {
    const u = new URL(url);
    path = u.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return 998;
  }
  if (path === '/' || path === '') return 0;
  if (/^\/login\b/i.test(path)) return 10;
  if (/^\/signup\b/i.test(path) || /^\/register\b/i.test(path)) return 11;
  if (/^\/pricing\b/i.test(path)) return 20;
  if (/^\/dashboard\b/i.test(path)) return 30;
  if (/^\/account\b/i.test(path) || /^\/settings\b/i.test(path)) return 40;
  if (/^\/(home|about|contact|features|docs|product)\b/i.test(path)) return 50;
  // Deeper paths rank by depth (more segments = less important).
  const depth = path.split('/').filter(Boolean).length;
  return 100 + depth;
}

/**
 * Decide whether a URL is the "homepage" — the root path on the same
 * origin. Used to limit TIER_3 to exactly one page per iteration.
 */
export function isHomepage(url) {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return path === '/';
  } catch {
    return false;
  }
}

/**
 * Assign tiers to a list of crawled page URLs.
 *
 * @param {Array<string>} urls
 * @param {object} [opts]
 * @param {object} [opts.budget]            — override DEFAULT_BUDGET
 * @returns {{
 *   assignments: Array<{ url: string, tier: string, importance: number }>,
 *   counts: { tier1: number, tier2: number, tier3: number, total: number },
 *   estimatedDurationMs: number,
 *   budget: object,
 * }}
 */
export function assignTiers(urls, opts = {}) {
  const budget = { ...DEFAULT_BUDGET, ...(opts.budget ?? {}) };
  const list = Array.isArray(urls) ? urls.filter((u) => typeof u === 'string' && u.length > 0) : [];

  // Rank by importance ascending (lower = higher).
  const ranked = list
    .map((url) => ({ url, importance: pageImportance(url) }))
    .sort((a, b) => a.importance - b.importance);

  const homepage = ranked.find((r) => isHomepage(r.url)) ?? ranked[0] ?? null;
  const tier3Urls = new Set(homepage ? [homepage.url] : []);
  // TIER_2 is the next N highest-importance pages excluding the
  // TIER_3 homepage (so we don't double-count).
  const tier2Urls = new Set();
  for (const r of ranked) {
    if (tier3Urls.has(r.url)) continue;
    if (tier2Urls.size >= budget.tier2SamplePages) break;
    tier2Urls.add(r.url);
  }

  const assignments = ranked.map(({ url, importance }) => ({
    url,
    importance,
    tier: tier3Urls.has(url) ? TIER.TIER_3
        : tier2Urls.has(url) ? TIER.TIER_2
        : TIER.TIER_1,
  }));

  const counts = assignments.reduce(
    (acc, a) => {
      if (a.tier === TIER.TIER_1) acc.tier1 += 1;
      else if (a.tier === TIER.TIER_2) acc.tier2 += 1;
      else if (a.tier === TIER.TIER_3) acc.tier3 += 1;
      return acc;
    },
    { tier1: 0, tier2: 0, tier3: 0, total: assignments.length },
  );

  const estimatedDurationMs =
      counts.tier1 * budget.tier1PerPageMs
    + counts.tier2 * budget.tier2PerPageMs
    + counts.tier3 * budget.tier3PerPageMs;

  return { assignments, counts, estimatedDurationMs, budget };
}

/**
 * Trim the assignments to fit within the total budget cap. Drops TIER_1
 * pages first (lowest signal density), then TIER_2 (preserving the
 * highest-importance ones), and ALWAYS preserves the TIER_3 homepage.
 *
 * @param {ReturnType<typeof assignTiers>} planned
 * @returns {ReturnType<typeof assignTiers>}
 */
export function fitWithinBudget(planned) {
  if (!planned || !Array.isArray(planned.assignments)) return planned;
  const budget = planned.budget ?? DEFAULT_BUDGET;
  if (planned.estimatedDurationMs <= budget.totalBudgetMs) return planned;

  // Walk the rank: keep TIER_3 + TIER_2 + as many TIER_1 as the budget allows.
  let remaining = budget.totalBudgetMs;
  const kept = [];
  // Cost lookup for tier
  const cost = (tier) => tier === TIER.TIER_3 ? budget.tier3PerPageMs
                     : tier === TIER.TIER_2 ? budget.tier2PerPageMs
                     : budget.tier1PerPageMs;

  // Always include TIER_3 first.
  for (const a of planned.assignments) {
    if (a.tier === TIER.TIER_3) { kept.push(a); remaining -= cost(a.tier); }
  }
  // Then TIER_2.
  for (const a of planned.assignments) {
    if (a.tier !== TIER.TIER_2) continue;
    if (remaining < cost(a.tier)) break;
    kept.push(a); remaining -= cost(a.tier);
  }
  // Then TIER_1 in importance order.
  for (const a of planned.assignments) {
    if (a.tier !== TIER.TIER_1) continue;
    if (remaining < cost(a.tier)) break;
    kept.push(a); remaining -= cost(a.tier);
  }
  const counts = kept.reduce(
    (acc, a) => {
      if (a.tier === TIER.TIER_1) acc.tier1 += 1;
      else if (a.tier === TIER.TIER_2) acc.tier2 += 1;
      else if (a.tier === TIER.TIER_3) acc.tier3 += 1;
      return acc;
    },
    { tier1: 0, tier2: 0, tier3: 0, total: kept.length },
  );
  const estimatedDurationMs = budget.totalBudgetMs - remaining;
  return { assignments: kept, counts, estimatedDurationMs, budget, droppedCount: planned.assignments.length - kept.length };
}

/**
 * Convenience helper used by Phase C verification: returns the TIER_3
 * homepage URL for the supplied page list. Snapshots compare fairly only
 * when baseline + post-fix run the same evaluator stack on the same URL.
 */
export function homepageForSnapshot(urls) {
  if (!Array.isArray(urls)) return null;
  const hp = urls.find((u) => isHomepage(u));
  return hp ?? urls[0] ?? null;
}

/**
 * Translate a TIER assignment into an `evaluators` array consumable by
 * evaluationPipeline.runEvaluationPipeline({ options: { evaluators } }).
 */
export function evaluatorsForTier(tier) {
  return TIER_EVALUATORS[tier] ?? TIER_EVALUATORS[TIER.TIER_1];
}
