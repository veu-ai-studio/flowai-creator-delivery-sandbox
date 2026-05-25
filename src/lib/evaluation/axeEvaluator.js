// src/lib/evaluation/axeEvaluator.js — PHASE B1 STEP 4
//
// Run @axe-core/playwright against a Playwright Page and map each
// violation to a normalized finding with provenance. axe-core is
// deterministic (no LLM, no heuristic noise) so we give it a high
// confidence (0.95) and a high source weight in the normalizer.
//
// Public:
//   runAxeEvaluator({ page, url, opts? }) → { ok, findings, error? }
//
// Graceful: any failure (page closed, axe.run throws, timeout) returns
// { ok: false, findings: [], error } — never throws.
//
// CA-18 §2 dimension: accessibility (every axe finding maps here).

import { EVALUATOR_IDS } from './evaluatorIds.js';

const AXE_IMPACT_SEVERITY = Object.freeze({
  critical: 'high',     // axe 'critical' is a real-user blocker; mapped to high (we reserve 'critical' for blocker-blocker)
  serious:  'high',
  moderate: 'medium',
  minor:    'low',
});

/** Map one axe violation (which may target many DOM nodes) into a normalized finding. */
export function normalizeAxeViolation({ url, violation }) {
  const severity = AXE_IMPACT_SEVERITY[violation?.impact] ?? 'low';
  const nodeCount = Array.isArray(violation?.nodes) ? violation.nodes.length : 0;
  const sampleSelector = nodeCount > 0
    ? (violation.nodes[0]?.target?.join?.(' ') || violation.nodes[0]?.html?.slice(0, 80) || '')
    : '';
  const description = (() => {
    const help = violation?.help || violation?.description || violation?.id || 'axe-violation';
    const tags = Array.isArray(violation?.tags) ? violation.tags.slice(0, 3).join(',') : '';
    const tail = nodeCount > 0 ? ` [${nodeCount} node${nodeCount === 1 ? '' : 's'}]` : '';
    return `${help}${tail}${tags ? ` (${tags})` : ''}`;
  })();
  return {
    category: `axe:${violation?.id ?? 'unknown'}`,
    severity,
    location: sampleSelector ? `${url}#${sampleSelector}` : url,
    description,
    source: 'axe-core',
    evaluator_id: EVALUATOR_IDS.AXE_CORE,
    evaluatorVersion: 'axe-4',
    confidence: 0.95,
    evidenceType: `axe-impact:${violation?.impact ?? 'unknown'}`,
    dimension: 'accessibility',
    detail: {
      ruleId: violation?.id,
      impact: violation?.impact ?? null,
      nodeCount,
      helpUrl: violation?.helpUrl ?? null,
    },
  };
}

/**
 * Run axe-core against a Playwright Page. The page should already be
 * navigated to the target URL and have its initial network idle —
 * caller's responsibility (the evaluationPipeline orchestrates this).
 *
 * @param {object} args
 * @param {object} args.page         — Playwright Page
 * @param {string} args.url
 * @param {object} [args.opts]
 * @param {number} [args.opts.timeoutMs=30000]
 * @param {number} [args.opts.maxFindings=80]
 * @param {object} [args.opts.deps]  — { AxeBuilder } override for tests
 */
export async function runAxeEvaluator({ page, url, opts = {} } = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 30_000;
  const maxFindings = Number.isFinite(opts.maxFindings) ? opts.maxFindings : 80;
  if (!page || typeof page.evaluate !== 'function') {
    return { ok: false, findings: [], error: 'page_required' };
  }
  if (typeof url !== 'string' || !url.trim()) {
    return { ok: false, findings: [], error: 'url_required' };
  }

  let AxeBuilder;
  try {
    if (opts.deps?.AxeBuilder) {
      AxeBuilder = opts.deps.AxeBuilder;
    } else {
      const mod = await import('@axe-core/playwright');
      AxeBuilder = mod.default ?? mod.AxeBuilder ?? mod;
    }
  } catch (e) {
    return { ok: false, findings: [], error: `import_failed:${e?.message ?? String(e)}` };
  }

  let result;
  try {
    const runPromise = (async () => {
      const builder = new AxeBuilder({ page });
      return builder.analyze();
    })();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('axe_timeout')), timeoutMs)
    );
    result = await Promise.race([runPromise, timeoutPromise]);
  } catch (e) {
    return { ok: false, findings: [], error: (e?.message ?? String(e)).slice(0, 200) };
  }

  const violations = Array.isArray(result?.violations) ? result.violations : [];
  const findings = [];
  for (const v of violations) {
    if (findings.length >= maxFindings) break;
    findings.push(normalizeAxeViolation({ url, violation: v }));
  }
  return { ok: true, findings };
}

export const __internals = Object.freeze({ AXE_IMPACT_SEVERITY });
