// src/lib/construction/gates/S8PhaseB.js
//
// S8 — Post-construction Phase B (PANEL-RATIFIABLE per CA-17 §3.8 v3-final).
//
// v3-final rolls back v2 additions: pre-PR Phase B only; no live-preview
// post-merge, no dual-load profile, no backend probes here. For wire_up
// specifically: Phase B exercises the newly-wired controls (click +
// verify behavior + adversarial-input).
//
// This module is a thin adapter that calls the existing D39 Phase B
// suite (probeAdversarialSurface / probeAllPages) against the deployed
// preview URL produced by the candidate construction. PR open is gated
// on the result.
//
// The Agent #21 post-deploy Phase B charter (ENTRY 015) is independent
// of S8 and operates outside this gate.

'use strict';

export const PHASE_B_KIND = 'construction_phase_b.v1';
export const PHASE_B_FAILURE_KIND = 'construction_phase_b_failure.v1';

function makeS8Error(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  err.gate = 'S8';
  for (const [k, v] of Object.entries(extra)) err[k] = v;
  return err;
}

/**
 * Decide whether the Phase B summary indicates a pass.
 *
 * Pass criteria (wire_up class):
 *   - probe.ok !== false
 *   - findings include no NEW high-severity findings whose category is
 *     'engine-error' / 'broken-modal' / 'broken-form' (the wired control
 *     surface). The "new" gate is enforced by the caller passing in the
 *     baseline finding-set; this module compares against it.
 */
export function evaluatePhaseBResult({ probe, baselineFindings, constructionClass }) {
  if (!probe || probe.ok === false) {
    return {
      ok: false,
      reason: probe?.reason ?? 'phase_b_probe_failed',
      newHighFindings: [],
      probeOk: false,
    };
  }
  const baselineDigest = new Set(
    (baselineFindings ?? []).map((f) => `${f.severity}:${f.category}:${f.location ?? ''}`),
  );
  const newHigh = [];
  for (const f of (probe.findings ?? [])) {
    if (!f || f.severity !== 'high') continue;
    const key = `${f.severity}:${f.category}:${f.location ?? ''}`;
    if (!baselineDigest.has(key)) newHigh.push(f);
  }
  if (constructionClass === 'wire_up' && newHigh.length > 0) {
    return {
      ok: false,
      reason: `new_high_severity_findings:${newHigh.length}`,
      newHighFindings: newHigh,
      probeOk: true,
    };
  }
  return { ok: true, newHighFindings: newHigh, probeOk: true };
}

/**
 * Run S8 against the candidate construction's deployed surface.
 *
 * @param {object} args
 * @param {string} args.productId
 * @param {string} args.environment
 * @param {string} args.constructionClass
 * @param {string} args.previewUrl                 — the candidate's preview URL
 * @param {Array}  args.baselineFindings           — pre-construction §7.6 inventory
 * @param {function} args.probeAdversarialSurface  — injected dep (the existing D39 probe)
 * @param {function} [args.probeAllPages]          — multi-page variant
 * @param {object} [args.probeOpts]
 * @param {function} args.appendGovernanceEntry
 * @returns {Promise<{ ok: true, envelope: object, summary: object }>}
 */
export async function runS8PhaseB({ productId, environment, constructionClass, previewUrl, baselineFindings, probeAdversarialSurface, probeAllPages, probeOpts, appendGovernanceEntry, supabase, logger }) {
  if (typeof previewUrl !== 'string' || previewUrl.length === 0) {
    throw makeS8Error(PHASE_B_FAILURE_KIND, 'S8: previewUrl required');
  }
  if (typeof probeAdversarialSurface !== 'function' && typeof probeAllPages !== 'function') {
    throw makeS8Error(PHASE_B_FAILURE_KIND, 'S8: probeAdversarialSurface (or probeAllPages) dep required');
  }

  let probe;
  if (typeof probeAllPages === 'function') {
    probe = await probeAllPages({ urls: [previewUrl], opts: probeOpts });
  } else {
    probe = await probeAdversarialSurface({ url: previewUrl, opts: probeOpts });
  }

  const decision = evaluatePhaseBResult({ probe, baselineFindings, constructionClass });

  const envelope = Object.freeze({
    kind: PHASE_B_KIND,
    construction_class: constructionClass,
    preview_url: previewUrl,
    decision: Object.freeze({
      ok: decision.ok,
      reason: decision.reason ?? null,
      new_high_findings_count: decision.newHighFindings.length,
    }),
    summary: Object.freeze({
      probe_ok: !!probe?.ok,
      findings_total: Array.isArray(probe?.findings) ? probe.findings.length : 0,
      interactives_tested: probe?.summary?.interactivesTested ?? 0,
    }),
    captured_at: new Date().toISOString(),
  });

  if (typeof appendGovernanceEntry === 'function') {
    await appendGovernanceEntry({
      productId,
      environment: environment ?? 'prd',
      entry: envelope,
      supabase,
    });
  }

  if (!decision.ok) {
    throw makeS8Error(PHASE_B_FAILURE_KIND,
      `S8: Phase B failed for ${previewUrl} — ${decision.reason}`,
      { phaseBDecision: decision, envelope });
  }

  if (logger?.info) logger.info('S8 Phase B cleared', { productId, previewUrl, summary: envelope.summary });
  return Object.freeze({ ok: true, envelope, summary: envelope.summary, probe });
}
