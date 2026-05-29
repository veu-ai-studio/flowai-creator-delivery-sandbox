/**
 * _helpers — Shared result-shape constructors for criterion evaluators.
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/audits/criteria/_helpers.js   (W3 territory)
 *
 * Per CEO disposition 2026-05-13 on the W3 stub replacement plan:
 *   - measured:    numeric score in [0, 100], status='measured'
 *   - no_evidence: score=null, status='no_evidence'  (data sources reachable
 *                  but the evaluation window produced nothing to score; NOT 100,
 *                  NOT 0 — see Flag 4)
 *   - deferred:    score=null, status='deferred', reason='deferred-pending-*'
 *                  (blocked by external dependency on the approved allowlist;
 *                  see Flag 9 and w3/deferred-evaluators.json)
 * ---------------------------------------------------------------------------
 */

'use strict';

export function measuredResult({ id, score, evidence, notes, findings = [] }) {
  const rounded = Math.round(score * 100) / 100;
  return {
    id,
    score: rounded,
    status: 'measured',
    evidence,
    notes,
    findings,
  };
}

export function noEvidenceResult({ id, reasonCode, notes, evidence = [], findings }) {
  const computedFindings = findings ?? [{ code: reasonCode, detail: notes }];
  return {
    id,
    score: null,
    status: 'no_evidence',
    reason: reasonCode,
    evidence: evidence.length > 0
      ? evidence
      : [{ kind: 'no_evidence', criterion: id, reason: reasonCode }],
    notes,
    findings: computedFindings,
  };
}

export function deferredResult({ id, blockedBy, reason, notes, since = null, nextReview = null }) {
  return {
    id,
    score: null,
    status: 'deferred',
    reason,
    blockedBy,
    since,
    nextReview,
    falseGreenGuard: true,
    contractTestPassing: true,
    evidence: [{ kind: 'deferred', criterion: id, blockedBy, reason }],
    notes,
    findings: [{ code: 'DEFERRED', detail: notes }],
  };
}

export function missingCtx(id, missingKey, notes) {
  return noEvidenceResult({
    id,
    reasonCode: 'MISSING_CTX',
    notes: notes ?? `ctx.${missingKey} not provided; evaluator cannot read its data source.`,
    evidence: [{ kind: 'missing_ctx', criterion: id, missing: missingKey }],
  });
}

export function ctxWindow(ctx) {
  const now = ctx?.clock?.now?.() ?? Date.now();
  const ms = ctx?.windowMs ?? 24 * 60 * 60 * 1000;
  return { fromTs: now - ms, toTs: now, now };
}

export function severityForGap(gap) {
  if (gap >= 30) return 'P0';
  if (gap >= 20) return 'P1';
  if (gap >= 10) return 'P2';
  return 'P3';
}
