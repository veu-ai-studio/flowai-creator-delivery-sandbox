// src/lib/agents/renewal/gtmReadinessScorer.js
//
// §7.6 GTM Readiness Report scorer — canonical scoring formula per
// CANONICAL_REFERENCE.md §7.6 (ENTRY 006 Aggressive Crawl Engine).
//
// score = 100
//       − (10  × count_critical)
//       − (5   × count_high)
//       − (2   × count_medium)
//       − (0.5 × count_low)
//     clamped to [0, 100]
//
// This is the canonical /100 GTM Readiness score that gates §11 Step 5
// clearance and the Self-Renewal repeat-until-GTM-ready loop. The
// Five-Layer score (preScoreAdapter) remains an internal scoring signal
// only; the GTM verdict uses the §7.6 formula exclusively.
//
// Score bands (per §7.6):
//   90–100  showcase-ready
//   75– 89  demo-ready
//   60– 74  internal-only
//    0– 59  not-demo-ready

'use strict';

const WEIGHTS = Object.freeze({ critical: 10, high: 5, medium: 2, low: 0.5 });

const ZERO_COUNTS = Object.freeze({ critical: 0, high: 0, medium: 0, low: 0 });
const CEO95_INFERRED_CONFIDENCE = 0.6;

const CEO95_LAYER_CATALOG = Object.freeze({
  l1: Object.freeze({
    label: 'Functional',
    criteria: Object.freeze([
      Object.freeze({ id: 'zero_runtime_console_errors', bucket: 'measured', label: 'Zero runtime/console errors', issueCategories: Object.freeze(['runtime-error', 'console-error']) }),
      Object.freeze({ id: 'interactive_elements_respond', bucket: 'measured', label: 'All interactive elements respond', issueCategories: Object.freeze(['non-responsive-interactive', 'tap-target-too-small']) }),
      Object.freeze({ id: 'no_unhandled_exceptions', bucket: 'measured', label: 'No unhandled exceptions', issueCategories: Object.freeze(['unhandled-exception', 'engine-error']) }),
      Object.freeze({ id: 'no_dead_cards_or_broken_modals', bucket: 'measured', label: 'No dead cards or broken modals', issueCategories: Object.freeze(['dead-card', 'broken-modal']) }),
      Object.freeze({ id: 'features_functional_dom_traversal', bucket: 'inferred', label: 'All features functional based on DOM traversal' }),
      Object.freeze({ id: 'feature_completeness_vs_spec', bucket: 'requires_human', label: 'Feature completeness vs product spec' }),
    ]),
  }),
  l2: Object.freeze({
    label: 'Operational',
    criteria: Object.freeze([
      Object.freeze({ id: 'no_401_or_failed_network', bucket: 'measured', label: 'No 401s or failed network requests', issueCategories: Object.freeze(['auth-gate-leak', 'network-failure', 'network.http_401']) }),
      Object.freeze({ id: 'assets_load_correctly', bucket: 'measured', label: 'Assets load correctly', issueCategories: Object.freeze(['console-error-404', 'missing-asset', 'asset-load-failure']) }),
      Object.freeze({ id: 'api_endpoints_respond', bucket: 'measured', label: 'API endpoints respond', issueCategories: Object.freeze(['api-failure', 'network-failure']) }),
      Object.freeze({ id: 'load_time_under_3s_lcp', bucket: 'inferred', label: 'Load time < 3s LCP when Lighthouse/load timing is available', issueCategories: Object.freeze(['slow-route']) }),
      Object.freeze({ id: 'edge_case_crash_behavior', bucket: 'requires_human', label: 'Crash behavior under edge-case use' }),
    ]),
  }),
  l3: Object.freeze({
    label: 'Financial',
    criteria: Object.freeze([
      Object.freeze({ id: 'pricing_page_exists', bucket: 'measured', label: 'Pricing page exists and renders' }),
      Object.freeze({ id: 'lead_capture_functional', bucket: 'measured', label: 'Lead capture form functional', issueCategories: Object.freeze(['broken-form', 'form-submit-failure']) }),
      Object.freeze({ id: 'no_dead_end_funnels', bucket: 'measured', label: 'No dead-end funnels; CTAs resolve', issueCategories: Object.freeze(['broken-link', 'network-failure']) }),
      Object.freeze({ id: 'checkout_flow_exists', bucket: 'inferred', label: 'Checkout flow exists by DOM path detection' }),
      Object.freeze({ id: 'pricing_accuracy', bucket: 'requires_human', label: 'Pricing accuracy' }),
      Object.freeze({ id: 'stripe_payment_processes', bucket: 'requires_human', label: 'Stripe/payment actually processes' }),
      Object.freeze({ id: 'revenue_path_completeness', bucket: 'requires_human', label: 'Revenue path completeness vs business model' }),
    ]),
  }),
  l4: Object.freeze({
    label: 'Business',
    criteria: Object.freeze([
      Object.freeze({ id: 'no_orphaned_pages', bucket: 'measured', label: 'No orphaned pages; nav links resolve', issueCategories: Object.freeze(['broken-link', 'network-failure']) }),
      Object.freeze({ id: 'mobile_viewport_renders', bucket: 'measured', label: 'Mobile viewport renders and responsive meta exists', issueCategories: Object.freeze(['missing-viewport-meta']) }),
      Object.freeze({ id: 'accessibility_basics', bucket: 'measured', label: 'Accessibility basics met', issueCategories: Object.freeze(['accessibility-headings', 'missing-aria-label', 'image-missing-alt', 'color-contrast-violation']) }),
      Object.freeze({ id: 'cta_clarity', bucket: 'inferred', label: 'CTA clarity by button/link text heuristics' }),
      Object.freeze({ id: 'information_hierarchy', bucket: 'inferred', label: 'Information hierarchy by heading structure' }),
      Object.freeze({ id: 'ux_effectiveness', bucket: 'requires_human', label: 'UX effectiveness judgment' }),
      Object.freeze({ id: 'conversion_optimization', bucket: 'requires_human', label: 'Conversion optimization' }),
    ]),
  }),
  l5: Object.freeze({
    label: 'GTM',
    criteria: Object.freeze([
      Object.freeze({ id: 'seo_basics', bucket: 'measured', label: 'SEO basics: meta tags, OG, sitemap exists', issueCategories: Object.freeze(['missing-meta-description', 'missing-title', 'missing-og', 'missing-sitemap']) }),
      Object.freeze({ id: 'demo_path_navigable', bucket: 'measured', label: 'Demo path navigable end to end', issueCategories: Object.freeze(['broken-modal', 'dead-card', 'network-failure']) }),
      Object.freeze({ id: 'marketing_site_renders', bucket: 'measured', label: 'Marketing site renders' }),
      Object.freeze({ id: 'typo_detection', bucket: 'inferred', label: 'Typo detection confidence-scored', issueCategories: Object.freeze(['typo', 'copy-typo']) }),
      Object.freeze({ id: 'grammar_check', bucket: 'inferred', label: 'Grammar check heuristic', issueCategories: Object.freeze(['grammar-issue']) }),
      Object.freeze({ id: 'copy_quality_tone', bucket: 'requires_human', label: 'Copy quality and tone' }),
      Object.freeze({ id: 'brand_consistency', bucket: 'requires_human', label: 'Brand consistency' }),
      Object.freeze({ id: 'ai_synthetic_typo_detection', bucket: 'requires_human', label: 'AI-synthetic typo detection needs LLM review' }),
    ]),
  }),
});

function isPlainSeverity(s) {
  return s === 'critical' || s === 'high' || s === 'medium' || s === 'low';
}

function clamp(n, lo, hi) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function bandFor(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'not-demo-ready';
  if (score >= 90) return 'showcase-ready';
  if (score >= 75) return 'demo-ready';
  if (score >= 60) return 'internal-only';
  return 'not-demo-ready';
}

function labelFor(band) {
  switch (band) {
    case 'showcase-ready': return 'Showcase-ready';
    case 'demo-ready':     return 'Demo-ready';
    case 'internal-only':  return 'Internal-only';
    case 'low-confidence': return 'Low confidence';
    default:               return 'Not demo-ready';
  }
}

/**
 * Count severities across an issues array. Issues without a recognised
 * `severity` (`critical|high|medium|low`) are ignored — never silently
 * coerced. xss-in-form-echo is hard-classified critical per CA-10-Q3;
 * callers must tag it `severity: 'critical'` (not promotable via
 * override).
 *
 * @param {Array<{severity?:string}>} issues
 * @returns {{critical:number, high:number, medium:number, low:number}}
 */
export function countSeverities(issues) {
  const counts = { ...ZERO_COUNTS };
  if (!Array.isArray(issues)) return counts;
  for (const i of issues) {
    if (!i || typeof i !== 'object') continue;
    const sev = i.severity;
    if (isPlainSeverity(sev)) counts[sev] += 1;
  }
  return counts;
}

/**
 * Compute the canonical §7.6 GTM Readiness score from a severity-tagged
 * issues array. Pure function — no IO, no exceptions.
 *
 * @param {object} args
 * @param {Array<{severity:string}>} [args.issues]
 * @returns {{
 *   score: number,                                  // [0,100], the §7.6 verdict
 *   penalty: number,                                // total deduction (informational)
 *   counts: {critical:number,high:number,medium:number,low:number},
 *   band: 'showcase-ready'|'demo-ready'|'internal-only'|'not-demo-ready',
 *   label: string,                                  // human-readable band label
 *   formula: string,                                // canonical formula echoed for auditability
 * }}
 */
export function computeGtmReadiness({ issues = [] } = {}) {
  const counts = countSeverities(issues);
  const penalty =
    WEIGHTS.critical * counts.critical +
    WEIGHTS.high     * counts.high +
    WEIGHTS.medium   * counts.medium +
    WEIGHTS.low      * counts.low;
  const score = clamp(100 - penalty, 0, 100);
  const band = bandFor(score);
  return {
    score,
    penalty,
    counts,
    band,
    label: labelFor(band),
    formula: 'score = 100 − 10·critical − 5·high − 2·medium − 0.5·low; clamped [0,100]',
  };
}

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasCoverageSignal(options, key) {
  return Object.prototype.hasOwnProperty.call(options ?? {}, key);
}

function degradedCoverageReason({ options = {}, crawlOutput = null } = {}) {
  if (options.coverageDegraded === true || options.evidenceDegraded === true) {
    return 'SCORE_ON_DEGRADED_EVIDENCE';
  }
  if (options.coverage === 'crawl_only_early_baseline') {
    return 'SCORE_ON_DEGRADED_EVIDENCE';
  }
  const phaseBContribution = finiteOrNull(options.phaseBContribution);
  if (hasCoverageSignal(options, 'phaseBContribution') && phaseBContribution === 0) {
    return 'SCORE_ON_DEGRADED_EVIDENCE';
  }
  const aggregatedFindings = finiteOrNull(options.aggregatedFindings);
  const pagesActuallyCrawled = finiteOrNull(options.pagesActuallyCrawled)
    ?? finiteOrNull(crawlOutput?.pagesCrawled)
    ?? (Array.isArray(crawlOutput?.pages) ? crawlOutput.pages.length : null);
  if (
    hasCoverageSignal(options, 'aggregatedFindings')
    && aggregatedFindings === 0
    && Number.isFinite(pagesActuallyCrawled)
    && pagesActuallyCrawled > 0
  ) {
    return 'SCORE_ON_DEGRADED_EVIDENCE';
  }
  return null;
}

// ── Crawl → issues mapping ────────────────────────────────────────────
//
// Phase A heuristic: derive severity-tagged issues from the structured
// crawlOutput (crawlOutputAdapter.conductStructuredCrawl envelope) using
// the subset of the §6 detector set that is observable from a Phase 1
// BFS crawl (no interactive probing, no auth traversal). The §6
// detectors that require Phase 2-3 active probing
// (`ai-agent-unreachable`, `broken-modal`, `dead-card`, etc.) are not
// emitted from this mapping — they'll arrive with the Phase 2 Conductor
// wiring per CANONICAL_REFERENCE §6.
//
// Severity mapping rationale (per §7.6 detector-set guidance):
//   - HTTP 5xx              → critical  (engine-error)
//   - crawl-level errors    → critical  (engine-error)
//   - HTTP 4xx (≠404)       → high      (auth-gate-leak / network-failure)
//   - HTTP 404              → high      (network-failure)
//   - per-page networkError → high      (network-failure)
//   - brokenLink            → high      (network-failure)
//   - per-page consoleError → medium    (console-error; one per page if any)
//   - slow-route load>3000  → medium    (slow-route)
//   - missing h1            → low       (accessibility-headings)
//   - missing headings      → low       (accessibility-headings)
//
// The mapping is intentionally CONSERVATIVE: one issue per observable
// failure mode, not one per occurrence. A page emitting 100 console
// errors counts as one `console-error` issue, not 100 — otherwise a
// noisy SPA gets buried in low-value medium hits. The cap keeps the
// scoring legible.

const SLOW_ROUTE_THRESHOLD_MS = 3000;

function pageStatusIssue(page) {
  const sc = typeof page?.statusCode === 'number' ? page.statusCode : null;
  if (sc === null) return null;
  if (sc >= 500) {
    return makeIssue('critical', 'engine-error', page.url ?? '',
      `HTTP ${sc} response`);
  }
  if (sc === 404) {
    return makeIssue('high', 'network-failure', page.url ?? '',
      'HTTP 404 — broken page');
  }
  if (sc === 401 || sc === 403) {
    return makeIssue('high', 'auth-gate-leak', page.url ?? '',
      `HTTP ${sc} — content gated`);
  }
  if (sc >= 400 && sc < 500) {
    return makeIssue('high', 'network-failure', page.url ?? '',
      `HTTP ${sc} client error`);
  }
  return null;
}

function makeIssue(severity, category, location, evidence) {
  return Object.freeze({ severity, category, location, evidence });
}

function normalizeText(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function allPageText(crawlOutput) {
  const pages = Array.isArray(crawlOutput?.pages) ? crawlOutput.pages : [];
  return pages.map((p) => `${p?.url ?? ''} ${p?.title ?? ''} ${p?.text ?? ''}`).join('\n').toLowerCase();
}

function issueMatches(issue, categories = []) {
  if (!issue || typeof issue !== 'object') return false;
  const category = normalizeText(issue.category);
  const evidence = normalizeText(issue.evidence);
  const location = normalizeText(issue.location);
  return categories.some((c) => {
    const needle = normalizeText(c);
    return category === needle || category.includes(needle) || evidence.includes(needle) || location.includes(needle);
  });
}

function hasIssue(issues, categories = []) {
  if (!Array.isArray(issues) || categories.length === 0) return false;
  return issues.some((issue) => issueMatches(issue, categories));
}

function hasSuccessfulPage(crawlOutput) {
  const pages = Array.isArray(crawlOutput?.pages) ? crawlOutput.pages : [];
  return pages.some((p) => {
    const statusOk = typeof p?.statusCode !== 'number' || (p.statusCode >= 200 && p.statusCode < 400);
    const hasText = typeof p?.text === 'string' && p.text.trim().length > 0;
    return statusOk && hasText;
  });
}

function pageHasKeyword(crawlOutput, re) {
  return re.test(allPageText(crawlOutput));
}

function hasLeadCaptureSignal(crawlOutput) {
  const text = allPageText(crawlOutput);
  if (/\b(contact|book a demo|get started|join waitlist|sign up|subscribe|request demo)\b/i.test(text)) return true;
  const pages = Array.isArray(crawlOutput?.pages) ? crawlOutput.pages : [];
  return pages.some((p) => {
    const interactives = Array.isArray(p?.interactives) ? p.interactives : [];
    return interactives.some((item) => /\b(form|email|submit|demo|contact)\b/i.test(JSON.stringify(item ?? '')));
  });
}

function hasCtaSignal(crawlOutput) {
  return pageHasKeyword(crawlOutput, /\b(get started|start|try|demo|book|contact|sign up|subscribe|buy|pricing|learn more)\b/i);
}

function hasHeadingHierarchy(crawlOutput) {
  const pages = Array.isArray(crawlOutput?.pages) ? crawlOutput.pages : [];
  return pages.some((p) => {
    const headings = Array.isArray(p?.headings) ? p.headings : [];
    return headings.some((h) => (
      (typeof h === 'string' && /^h1\b/i.test(h)) ||
      (h && typeof h === 'object' && (h.tag === 'h1' || h.level === 1))
    ));
  });
}

function hasSeoSignal(crawlOutput, issues) {
  if (hasIssue(issues, ['missing-meta-description', 'missing-title', 'missing-og', 'missing-sitemap'])) return false;
  const text = allPageText(crawlOutput);
  const pages = Array.isArray(crawlOutput?.pages) ? crawlOutput.pages : [];
  const hasSitemapReference = /sitemap\.xml/i.test(JSON.stringify(crawlOutput ?? {}));
  return pages.length > 0 && (text.length > 0 || hasSitemapReference);
}

function evaluateCriterion({ criterion, crawlOutput, issues }) {
  const issueFailed = Array.isArray(criterion.issueCategories)
    ? hasIssue(issues, criterion.issueCategories)
    : false;
  let passed = !issueFailed;
  let evidence = issueFailed ? 'matching finding present' : 'no matching finding observed';

  switch (criterion.id) {
    case 'features_functional_dom_traversal':
      passed = hasSuccessfulPage(crawlOutput) && !hasIssue(issues, ['dead-card', 'broken-modal', 'engine-error']);
      evidence = passed ? 'DOM traversal completed without mapped feature blockers' : 'DOM traversal lacks enough clean feature signal';
      break;
    case 'load_time_under_3s_lcp':
      passed = !hasIssue(issues, ['slow-route']);
      evidence = passed ? 'no slow-route finding observed' : 'slow-route finding observed';
      break;
    case 'pricing_page_exists':
      passed = pageHasKeyword(crawlOutput, /\b(pricing|price|plan|plans|\$|per month|subscription)\b/i);
      evidence = passed ? 'pricing signal found in crawled pages' : 'pricing signal not found in crawled pages';
      break;
    case 'lead_capture_functional':
      passed = hasLeadCaptureSignal(crawlOutput) && !issueFailed;
      evidence = passed ? 'lead-capture CTA/form signal found and no form failure observed' : 'lead-capture signal missing or broken';
      break;
    case 'checkout_flow_exists':
      passed = pageHasKeyword(crawlOutput, /\b(checkout|stripe|buy now|subscribe|payment|cart)\b/i);
      evidence = passed ? 'checkout/payment path signal found' : 'checkout/payment path signal not found';
      break;
    case 'mobile_viewport_renders':
      evidence = passed ? 'no missing viewport finding observed' : 'missing viewport finding observed';
      break;
    case 'cta_clarity':
      passed = hasCtaSignal(crawlOutput);
      evidence = passed ? 'clear CTA text found' : 'clear CTA text not found';
      break;
    case 'information_hierarchy':
      passed = hasHeadingHierarchy(crawlOutput);
      evidence = passed ? 'heading hierarchy signal found' : 'heading hierarchy signal missing';
      break;
    case 'seo_basics':
      passed = hasSeoSignal(crawlOutput, issues);
      evidence = passed ? 'no SEO basics finding observed and crawl rendered content' : 'SEO basics signal missing or finding present';
      break;
    case 'marketing_site_renders':
      passed = hasSuccessfulPage(crawlOutput);
      evidence = passed ? 'at least one rendered page with text content' : 'no rendered marketing page with text content';
      break;
    case 'typo_detection':
    case 'grammar_check':
      evidence = issueFailed ? 'copy finding present' : 'no heuristic copy finding observed';
      break;
    default:
      if (criterion.bucket === 'requires_human') {
        passed = false;
        evidence = 'requires human, credentialed, or registered-repo verification';
      }
      break;
  }

  return { passed, evidence, confidence: criterion.bucket === 'inferred' ? CEO95_INFERRED_CONFIDENCE : 1 };
}

export function computeCeo95Criteria({ crawlOutput = null, issues = [] } = {}) {
  const layers = {};
  const layerScores = {};
  const potentialLayerScores = {};
  const blockedLayerScores = {};
  const summary = {
    measurableNow: { passed: 0, total: 0 },
    inferredWithConfidence: { passed: 0, total: 0 },
    notYetMeasurable: { total: 0 },
  };

  for (const [layerKey, layer] of Object.entries(CEO95_LAYER_CATALOG)) {
    const criteria = [];
    const weight = 20 / layer.criteria.length;
    let verifiedPoints = 0;
    let inferredPoints = 0;
    let blockedPoints = 0;

    for (const criterion of layer.criteria) {
      const result = evaluateCriterion({ criterion, crawlOutput, issues });
      let pointsAwarded = 0;
      let potentialPoints = 0;
      let blocked = 0;

      if (criterion.bucket === 'measured') {
        summary.measurableNow.total += 1;
        if (result.passed) {
          summary.measurableNow.passed += 1;
          pointsAwarded = weight;
          verifiedPoints += weight;
        }
      } else if (criterion.bucket === 'inferred') {
        summary.inferredWithConfidence.total += 1;
        if (result.passed) {
          summary.inferredWithConfidence.passed += 1;
          potentialPoints = weight * CEO95_INFERRED_CONFIDENCE;
          inferredPoints += potentialPoints;
        }
      } else {
        summary.notYetMeasurable.total += 1;
        blocked = weight;
        blockedPoints += weight;
      }

      criteria.push(Object.freeze({
        id: criterion.id,
        label: criterion.label,
        bucket: criterion.bucket,
        passed: result.passed,
        confidence: result.confidence,
        pointsAwarded: Number(pointsAwarded.toFixed(2)),
        potentialPoints: Number(potentialPoints.toFixed(2)),
        blockedPoints: Number(blocked.toFixed(2)),
        evidence: result.evidence,
      }));
    }

    const verified = Number(verifiedPoints.toFixed(2));
    const inferred = Number(inferredPoints.toFixed(2));
    const blocked = Number(blockedPoints.toFixed(2));
    layers[layerKey] = Object.freeze({
      label: layer.label,
      maxPoints: 20,
      verifiedPoints: verified,
      inferredPoints: inferred,
      blockedPoints: blocked,
      criteria: Object.freeze(criteria),
    });
    layerScores[layerKey] = verified;
    potentialLayerScores[layerKey] = Number((verified + inferred).toFixed(2));
    blockedLayerScores[layerKey] = blocked;
  }

  const verifiedScore = Number(Object.values(layerScores).reduce((sum, v) => sum + v, 0).toFixed(2));
  const potentialScore = Number(Object.values(potentialLayerScores).reduce((sum, v) => sum + v, 0).toFixed(2));
  const blockedScore = Number(Object.values(blockedLayerScores).reduce((sum, v) => sum + v, 0).toFixed(2));

  return Object.freeze({
    version: 'ceo-95-criteria.v1',
    verifiedScore,
    potentialScore,
    blockedScore,
    layerScores: Object.freeze(layerScores),
    potentialLayerScores: Object.freeze(potentialLayerScores),
    blockedLayerScores: Object.freeze(blockedLayerScores),
    layers: Object.freeze(layers),
    summary: Object.freeze(summary),
    scoringRule: 'Measured criteria count toward verifiedScore; inferred criteria count only toward potentialScore with confidence; requires_human criteria are blocked until verified.',
    true95Requirement: 'A true 95/100 requires measured, inferred, and human-required criteria to be verified.',
  });
}

function deriveErrorIssues(crawlOutput) {
  const issues = [];
  const errs = Array.isArray(crawlOutput?.errors) ? crawlOutput.errors : [];
  // Crawl-level + per-page errors are emitted as a string list by the
  // adapter. We bucket them: `console (url): ...` and `network (url): ...`
  // are page-scoped; anything else is crawl-level engine-error.
  const consoleByPage = new Map();
  const networkByPage = new Map();
  let crawlLevel = 0;
  for (const e of errs) {
    if (typeof e !== 'string') continue;
    const m1 = e.match(/^console \(([^)]+)\):/);
    if (m1) {
      consoleByPage.set(m1[1], (consoleByPage.get(m1[1]) || 0) + 1);
      continue;
    }
    const m2 = e.match(/^network \(([^)]+)\):/);
    if (m2) {
      networkByPage.set(m2[1], (networkByPage.get(m2[1]) || 0) + 1);
      continue;
    }
    crawlLevel += 1;
  }
  if (crawlLevel > 0) {
    issues.push(makeIssue('critical', 'engine-error', '',
      `${crawlLevel} crawl-level error(s)`));
  }
  for (const [url, n] of consoleByPage) {
    issues.push(makeIssue('medium', 'console-error', url,
      `${n} console error(s)`));
  }
  for (const [url, n] of networkByPage) {
    issues.push(makeIssue('high', 'network-failure', url,
      `${n} network failure(s)`));
  }
  return issues;
}

function derivePageIssues(crawlOutput) {
  const issues = [];
  const pages = Array.isArray(crawlOutput?.pages) ? crawlOutput.pages : [];
  for (const p of pages) {
    const statusIssue = pageStatusIssue(p);
    if (statusIssue) issues.push(statusIssue);

    if (typeof p?.loadTimeMs === 'number' && p.loadTimeMs > SLOW_ROUTE_THRESHOLD_MS) {
      issues.push(makeIssue('medium', 'slow-route', p.url ?? '',
        `${p.loadTimeMs}ms load time exceeds ${SLOW_ROUTE_THRESHOLD_MS}ms threshold`));
    }

    // Accessibility-headings: no headings at all, or no h1, on a page
    // that did load content. Pages with empty bodies are skipped (the
    // status issue already covered the failure).
    const headings = Array.isArray(p?.headings) ? p.headings : [];
    const hasText = typeof p?.text === 'string' && p.text.length > 0;
    if (hasText) {
      if (headings.length === 0) {
        issues.push(makeIssue('low', 'accessibility-headings', p.url ?? '',
          'page has no heading elements'));
      } else {
        const hasH1 = headings.some((h) =>
          (typeof h === 'string' && /^h1\b/i.test(h)) ||
          (h && typeof h === 'object' && (h.tag === 'h1' || h.level === 1)),
        );
        if (!hasH1) {
          issues.push(makeIssue('low', 'accessibility-headings', p.url ?? '',
            'page has headings but no h1'));
        }
      }
    }
  }
  return issues;
}

function deriveBrokenLinkIssues(crawlOutput) {
  const issues = [];
  const links = Array.isArray(crawlOutput?.brokenLinks) ? crawlOutput.brokenLinks : [];
  // Already deduped by the adapter. One issue per broken link, severity
  // high (network-failure). The cap on errors[] derivation already
  // includes per-page network failures; a brokenLinks entry without a
  // matching networkErrors entry is the cross-page link-rot signal.
  for (const url of links) {
    if (typeof url !== 'string' || url.length === 0) continue;
    issues.push(makeIssue('high', 'network-failure', url, 'broken link'));
  }
  return issues;
}

/**
 * Map a structured crawl output (crawlOutputAdapter envelope) to a
 * severity-tagged issues array suitable for `computeGtmReadiness`.
 *
 * The mapping is deterministic and Phase-1-honest: it never claims to
 * have detected an interactive failure mode (modal/AI-agent) it can't
 * actually probe. As Phase 2-3 detectors come online they will append
 * additional issues to this list; the formula consumes the union.
 *
 * @param {object} crawlOutput  — crawlOutputAdapter.conductStructuredCrawl envelope
 * @returns {Array<{severity:string, category:string, location:string, evidence:string}>}
 */
export function deriveIssuesFromCrawl(crawlOutput) {
  if (!crawlOutput || typeof crawlOutput !== 'object') return [];
  return [
    ...deriveErrorIssues(crawlOutput),
    ...derivePageIssues(crawlOutput),
    ...deriveBrokenLinkIssues(crawlOutput),
  ];
}

/**
 * One-shot convenience: derive issues from a crawl output and compute
 * the §7.6 score in a single call.
 *
 * @param {object} crawlOutput
 * @returns {{score:number, counts:object, band:string, label:string, penalty:number, formula:string, issues:Array}}
 */
export function scoreCrawlOutput(crawlOutput, extraFindings = null, options = {}) {
  const phaseAIssues = deriveIssuesFromCrawl(crawlOutput);
  // D39 — Phase B adversarial-surface findings union with Phase A.
  // Both are §7.6-shaped { severity, category, location, evidence }.
  // The formula is signature-blind: it counts severities regardless
  // of provenance.
  const phaseBIssues = Array.isArray(extraFindings) ? extraFindings.filter((f) =>
    f && typeof f === 'object' && typeof f.severity === 'string',
  ) : [];
  const issues = [...phaseAIssues, ...phaseBIssues];
  const verdict = computeGtmReadiness({ issues });
  const ceo95Criteria = computeCeo95Criteria({ crawlOutput, issues });
  const degradedReason = degradedCoverageReason({ options, crawlOutput });
  const score = degradedReason ? ceo95Criteria.verifiedScore : verdict.score;
  const band = degradedReason ? 'low-confidence' : verdict.band;
  return {
    ...verdict,
    score,
    rawScore: verdict.score,
    band,
    label: labelFor(band),
    confidence: degradedReason ? 'LOW' : 'HIGH',
    coverage: options.coverage ?? null,
    coverageDegraded: !!degradedReason,
    reason: degradedReason,
    issues,
    phaseACount: phaseAIssues.length,
    phaseBCount: phaseBIssues.length,
    ceo95Criteria,
    verifiedScore: ceo95Criteria.verifiedScore,
    potentialScore: ceo95Criteria.potentialScore,
    blockedScore: ceo95Criteria.blockedScore,
  };
}

export const __internals = Object.freeze({
  WEIGHTS,
  ZERO_COUNTS,
  SLOW_ROUTE_THRESHOLD_MS,
  bandFor,
  labelFor,
  clamp,
  makeIssue,
  pageStatusIssue,
  deriveErrorIssues,
  derivePageIssues,
  deriveBrokenLinkIssues,
  CEO95_LAYER_CATALOG,
  evaluateCriterion,
});
