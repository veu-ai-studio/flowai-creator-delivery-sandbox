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
export function scoreCrawlOutput(crawlOutput, extraFindings = null) {
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
  return { ...verdict, issues, phaseACount: phaseAIssues.length, phaseBCount: phaseBIssues.length };
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
});
