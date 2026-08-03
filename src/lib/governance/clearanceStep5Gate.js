// src/lib/governance/clearanceStep5Gate.js
//
// §11 Clearance Step 5 four-prerequisite gate (per CANONICAL_REFERENCE
// §7.6 + ENTRY 006). Pure JS — no IO, no exceptions, deterministic on
// the input. The Step 5 UI in ClearanceWizard consumes the verdict to
// block the "Approve Demo" action when any prerequisite is missing.
//
// Per §7.6:
//
//   "Failure of any of the four prerequisites blocks §11 Clearance
//    Step 5 with explicit error."
//
// The four prerequisites:
//   (a) GTM Readiness Report exists for the product in the current env.
//   (b) Report score ≥ MIN_SCORE AND zero `critical` findings open.
//       MIN_SCORE = 95 per CEO directive / CA-13 pending (the §7.6
//       SSOT text reads "≥75"; CA-13 raises the bar to 95 for live
//       demo readiness — keep configurable via options.minScore).
//   (c) Self-Renewal cycle on all findings ≥ `high` has reached a
//       terminal decision (Resolved / Human-gated / Documented per §6).
//   (d) LIMITATIONS section published verbatim in delivery.

'use strict';

const DEFAULT_MIN_SCORE = 95;

const TERMINAL_DECISIONS = Object.freeze(new Set([
  'resolved',
  'human-gated',
  'human_gated',
  'documented',
  'documented-limitation',
  'documented_limitation',
]));

const HIGH_OR_CRITICAL = Object.freeze(new Set(['critical', 'high']));

function isPlainObj(o) {
  return !!(o && typeof o === 'object' && !Array.isArray(o));
}

function lowerOrEmpty(s) {
  return typeof s === 'string' ? s.toLowerCase() : '';
}

/**
 * Check whether a finding has a terminal decision per §6 resolution
 * contract. Accepts the raw `terminalDecision` string OR a
 * `decision`/`status` field for backwards-compat with adapters that
 * use the older naming.
 */
export function hasTerminalDecision(finding) {
  if (!isPlainObj(finding)) return false;
  const candidates = [finding.terminalDecision, finding.decision, finding.status, finding.resolution];
  for (const c of candidates) {
    if (TERMINAL_DECISIONS.has(lowerOrEmpty(c))) return true;
  }
  return false;
}

/**
 * Pure verdict computation for §11 Step 5.
 *
 * @param {object} args
 * @param {object|null}            args.gtmReadinessReport — { score, counts:{critical,high,medium,low}, ... } | null
 * @param {Array<object>}          [args.findings]         - issue list with .severity + .terminalDecision (or .decision/.status)
 * @param {boolean}                [args.limitationsPublished]
 * @param {object}                 [args.options]
 * @param {number}                 [args.options.minScore=95]
 * @returns {{
 *   allowed: boolean,
 *   blockedBy: string[],
 *   details: {
 *     a_report_exists: boolean,
 *     b_score_pass: boolean,
 *     b_zero_critical: boolean,
 *     c_terminal_decisions: boolean,
 *     d_limitations_published: boolean,
 *     score: number|null,
 *     minScore: number,
 *     criticalCount: number|null,
 *     unresolvedHighOrCritical: number,
 *   }
 * }}
 */
export function checkClearanceStep5({
  gtmReadinessReport = null,
  findings = [],
  limitationsPublished = false,
  options = {},
} = /** @type {any} */ ({})) {
  const minScore = Number.isFinite(options.minScore) ? options.minScore : DEFAULT_MIN_SCORE;
  const blockedBy = [];

  // (a) GTM Readiness Report exists.
  const a_report_exists = isPlainObj(gtmReadinessReport)
    && typeof gtmReadinessReport.score === 'number'
    && Number.isFinite(gtmReadinessReport.score);
  if (!a_report_exists) {
    blockedBy.push('a_no_gtm_readiness_report');
  }

  // (b) score ≥ minScore AND zero critical findings.
  const score = a_report_exists ? gtmReadinessReport.score : null;
  const criticalCount = a_report_exists && gtmReadinessReport.counts
    ? (typeof gtmReadinessReport.counts.critical === 'number' ? gtmReadinessReport.counts.critical : null)
    : null;
  const b_score_pass = a_report_exists ? score >= minScore : false;
  const b_zero_critical = a_report_exists ? (criticalCount === 0) : false;
  if (a_report_exists) {
    if (!b_score_pass) blockedBy.push(`b_score_below_min:${score}<${minScore}`);
    if (!b_zero_critical) blockedBy.push(`b_critical_open:${criticalCount}`);
  } else {
    blockedBy.push('b_no_score_to_evaluate');
  }

  // (c) Self-Renewal terminal decisions on all findings ≥ high.
  const arr = Array.isArray(findings) ? findings : [];
  const highOrCriticalFindings = arr.filter((f) =>
    isPlainObj(f) && HIGH_OR_CRITICAL.has(lowerOrEmpty(f.severity)),
  );
  const unresolved = highOrCriticalFindings.filter((f) => !hasTerminalDecision(f));
  const c_terminal_decisions = unresolved.length === 0;
  if (!c_terminal_decisions) {
    blockedBy.push(`c_unresolved_findings:${unresolved.length}`);
  }

  // (d) LIMITATIONS section published.
  const d_limitations_published = limitationsPublished === true;
  if (!d_limitations_published) {
    blockedBy.push('d_limitations_not_published');
  }

  const allowed = blockedBy.length === 0;

  return {
    allowed,
    blockedBy,
    details: {
      a_report_exists,
      b_score_pass,
      b_zero_critical,
      c_terminal_decisions,
      d_limitations_published,
      score,
      minScore,
      criticalCount,
      unresolvedHighOrCritical: unresolved.length,
    },
  };
}

/**
 * Extract the four prerequisite inputs from a ProductSSOT row and feed
 * them through `checkClearanceStep5`.
 *
 * Inputs we read from the row:
 *   - governance_record[]    — most-recent entry with kind === 'gtm_readiness_score'
 *                              supplies the score + counts; entries with
 *                              kind === 'limitations_published' satisfy (d).
 *   - delta_log[]            — findings live here under .issue or .findings;
 *                              each finding's terminalDecision/decision/status
 *                              feeds (c).
 *
 * Adapter is permissive — missing/malformed fields produce an explicit
 * "blocked" verdict rather than throwing.
 *
 * @param {object} ssotRow                          — product_ssot row
 * @param {{minScore?: number}} [options]
 */
export function checkClearanceStep5FromSsot(ssotRow, options = {}) {
  const empty = checkClearanceStep5({
    gtmReadinessReport: null, findings: [], limitationsPublished: false, options,
  });
  if (!isPlainObj(ssotRow)) return empty;

  const governance = Array.isArray(ssotRow.governance_record) ? ssotRow.governance_record : [];
  const deltaLog = Array.isArray(ssotRow.delta_log) ? ssotRow.delta_log : [];

  // (a)/(b): most-recent GTM Readiness Report. governance_record is
  // append-only per §7.5, so the LAST entry of kind 'gtm_readiness_score'
  // is the canonical current verdict.
  let gtmReport = null;
  for (let i = governance.length - 1; i >= 0; i -= 1) {
    const e = governance[i];
    if (isPlainObj(e) && e.kind === 'gtm_readiness_score') {
      // Accept either `e.score` directly or `e.payload.score`.
      const score = typeof e.score === 'number'
        ? e.score
        : (isPlainObj(e.payload) && typeof e.payload.score === 'number' ? e.payload.score : null);
      const counts = (isPlainObj(e.counts) ? e.counts : null)
        ?? (isPlainObj(e.payload) && isPlainObj(e.payload.counts) ? e.payload.counts : null);
      if (typeof score === 'number') {
        gtmReport = { score, counts: counts ?? { critical: null, high: null, medium: null, low: null }, at: e.at ?? null };
        break;
      }
    }
  }

  // (c): findings with severity ≥ high. Pull from delta_log entries
  // (.issue or .findings[]) — each finding's terminalDecision is
  // checked by hasTerminalDecision().
  const findings = [];
  for (const entry of deltaLog) {
    if (!isPlainObj(entry)) continue;
    if (isPlainObj(entry.issue)) findings.push(entry.issue);
    if (Array.isArray(entry.findings)) {
      for (const f of entry.findings) if (isPlainObj(f)) findings.push(f);
    }
  }

  // (d): LIMITATIONS published — a governance_record entry of kind
  // 'limitations_published' satisfies it. Also accept a top-level
  // boolean column `limitations_published` for adapters that store it
  // outside governance_record.
  const limitationsPublished =
    ssotRow.limitations_published === true ||
    governance.some((e) => isPlainObj(e) && e.kind === 'limitations_published');

  return checkClearanceStep5({
    gtmReadinessReport: gtmReport, findings, limitationsPublished, options,
  });
}

/**
 * Human-readable summary of why clearance is blocked. Used by the UI
 * to render explicit per-prerequisite reasons in §11 Step 5.
 */
export function blockedByToHumanReasons(verdict) {
  if (!isPlainObj(verdict) || !Array.isArray(verdict.blockedBy)) return [];
  return verdict.blockedBy.map((code) => {
    if (code === 'a_no_gtm_readiness_report')
      return 'No GTM Readiness Report exists for this product in the current environment. Run the Aggressive Crawl Engine to generate one.';
    if (code === 'b_no_score_to_evaluate')
      return 'No GTM Readiness score available to evaluate against the minimum.';
    if (code.startsWith('b_score_below_min:')) {
      const [, vs] = code.split(':');
      const [actual, min] = vs.split('<');
      return `GTM Readiness score is ${actual}/100; the minimum is ${min}. Run Self-Renewal to raise the score.`;
    }
    if (code.startsWith('b_critical_open:')) {
      const [, n] = code.split(':');
      return `${n} critical finding(s) are still open. Critical findings must be resolved before clearance.`;
    }
    if (code.startsWith('c_unresolved_findings:')) {
      const [, n] = code.split(':');
      return `${n} high/critical finding(s) have no terminal decision (Resolved / Human-gated / Documented).`;
    }
    if (code === 'd_limitations_not_published')
      return 'LIMITATIONS section has not been published. Publish it before clearance.';
    return code;
  });
}

export const __internals = Object.freeze({
  DEFAULT_MIN_SCORE,
  TERMINAL_DECISIONS,
  HIGH_OR_CRITICAL,
  isPlainObj,
  lowerOrEmpty,
});
