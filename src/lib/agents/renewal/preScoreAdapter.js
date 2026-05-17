// src/lib/agents/renewal/preScoreAdapter.js
//
// Module 7 — PreScore adapter. Thin read-only wrapper around the
// existing Five-Layer scoring (src/lib/operationsEngine.js
// computeMonitorClearance). Used by Self-Renewal to obtain a
// normalized pre-renewal score for a target URL.
//
// NEVER modifies operationsEngine.js (W2-owned). NEVER computes the
// monitor pass itself — the adapter consumes already-produced monitor
// text and translates the parser's output into the canonical score
// shape this module promises.
//
// Public contract:
//
//   await computeScore({ productId, url, runId, monitorText?, computeFn? })
//   → {
//       total,    // 0-100 numeric score (sum of l1..l5)
//       l1,       // Layer 1 score 0-20
//       l2,       // Layer 2 score 0-20
//       l3,       // Layer 3 score 0-20
//       l4,       // Layer 4 score 0-20
//       l5,       // Layer 5 score 0-20
//       label,    // 'poor' | 'fair' | 'good' | 'excellent'
//       url,      // URL that was scored
//       scoredAt, // ISO 8601 timestamp
//       productId,
//       runId,
//       error?,   // present when scoring degraded; total = 0 in that case
//     }
//
// Layer scaling note:
//   operationsEngine.computeMonitorClearance() returns each layer in
//   [0, 10]. The Self-Renewal pre-score contract is [0, 20] per layer
//   with total = sum of all layers ∈ [0, 100]. We multiply each layer
//   by 2 so sum_of_layers === total holds end-to-end.
//
// Band → label mapping (per SSOT §7.6 GTM Readiness bands):
//   90-100 (showcase-ready)  → 'excellent'
//   75-89  (demo-ready)      → 'good'
//   60-74  (internal-only)   → 'fair'
//    0-59  (not-demo-ready)  → 'poor'
//
// Graceful degradation:
//   - missing monitorText           → zero score, error='monitor_text_required'
//   - computeFn throws              → zero score, error='compute_failed: <message>'
//   - computeFn returns { error }   → zero score, error='scoring_failed: <reason>'
//   - missing computeFn (broken ref)→ zero score, error='compute_fn_missing'
// In every degraded path the pipeline gets a well-shaped object back
// rather than an exception, and the `error` field tells the caller
// why the score is zero.

import { computeMonitorClearance as defaultComputeFn } from '../../operationsEngine.js';

const LAYER_KEYS = ['L1', 'L2', 'L3', 'L4', 'L5'];

const ZERO_LAYERS = Object.freeze({ l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 });

function labelForTotal(total) {
  if (typeof total !== 'number' || !Number.isFinite(total)) return 'poor';
  if (total >= 90) return 'excellent';
  if (total >= 75) return 'good';
  if (total >= 60) return 'fair';
  return 'poor';
}

function makeBaseEnvelope({ productId, url, runId }) {
  return {
    productId: typeof productId === 'string' ? productId : null,
    url:       typeof url === 'string' ? url : null,
    runId:     typeof runId === 'string' ? runId : null,
    scoredAt:  new Date().toISOString(),
  };
}

function makeZeroScore({ productId, url, runId, error }) {
  return {
    ...makeBaseEnvelope({ productId, url, runId }),
    total: 0,
    ...ZERO_LAYERS,
    label: 'poor',
    error,
  };
}

/**
 * Compute a normalized pre-renewal score for a target URL.
 *
 * @param {object} args
 * @param {string} args.productId          — product identifier (e.g. 'mypreglife').
 * @param {string} args.url                — URL being scored.
 * @param {string} args.runId              — renewal run identifier.
 * @param {string} [args.monitorText]      — monitor-step output text to parse.
 *                                            If absent, returns a zero score with
 *                                            error='monitor_text_required'.
 * @param {function} [args.computeFn]      — override the parser (testing).
 *                                            Defaults to operationsEngine
 *                                            computeMonitorClearance.
 * @returns {Promise<object>} canonical score envelope.
 */
export async function computeScore({ productId, url, runId, monitorText = null, computeFn } = {}) {
  // Defensive default — caller may pass `computeFn: undefined` explicitly.
  const fn = typeof computeFn === 'function' ? computeFn : defaultComputeFn;

  if (typeof fn !== 'function') {
    return makeZeroScore({ productId, url, runId, error: 'compute_fn_missing' });
  }

  if (typeof monitorText !== 'string' || monitorText.trim().length === 0) {
    return makeZeroScore({ productId, url, runId, error: 'monitor_text_required' });
  }

  let parsed;
  try {
    parsed = fn(monitorText);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return makeZeroScore({ productId, url, runId, error: `compute_failed: ${msg}` });
  }

  if (!parsed || typeof parsed !== 'object') {
    return makeZeroScore({ productId, url, runId, error: 'scoring_failed: parser returned non-object' });
  }

  // The parser surfaces a partial-data error (missing layer scores) by
  // setting `error` alongside the (incomplete) layers payload. Treat
  // any error string as a degradation — never silently coerce to a
  // confident score.
  if (typeof parsed.error === 'string' && parsed.error.length > 0) {
    return makeZeroScore({ productId, url, runId, error: `scoring_failed: ${parsed.error}` });
  }

  const layers = parsed.layers && typeof parsed.layers === 'object' ? parsed.layers : null;
  if (!layers) {
    return makeZeroScore({ productId, url, runId, error: 'scoring_failed: parser omitted layers' });
  }

  // Scale each layer from [0,10] → [0,20]. Any non-numeric / null
  // entry collapses to 0 — same degradation policy as the parser's
  // own incomplete-data path.
  const scaled = {};
  for (let i = 0; i < LAYER_KEYS.length; i++) {
    const k = LAYER_KEYS[i];
    const v = layers[k];
    const num = (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
    scaled[`l${i + 1}`] = Math.max(0, Math.min(20, num * 2));
  }
  const total = scaled.l1 + scaled.l2 + scaled.l3 + scaled.l4 + scaled.l5;
  const label = labelForTotal(total);

  return {
    ...makeBaseEnvelope({ productId, url, runId }),
    total,
    ...scaled,
    label,
  };
}

// Exported for tests so they don't have to re-derive the band thresholds.
export const __test_only__ = Object.freeze({
  LAYER_KEYS,
  labelForTotal,
  ZERO_LAYERS,
});
