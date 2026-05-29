// src/lib/runner/blockGate.js
//
// Auto Runner — pipeline block gate.
//
// W2 Phase 1 engineering (dispatch 4-of-4, 2026-05-14) — addresses
// SSOT_PARKING_LOT ENTRY 003 gap (a): "Auto Runner proceeds through all
// 8 steps even when Step 1 finds critical content insufficient."
//
// ── EXTENDED STEP-RESULT CONTRACT ────────────────────────────────────
//
// Each Auto Runner step stores a result object of shape:
//
//   {
//     full_output: string,        // verbatim step output
//     summary:     string,        // short label for the step card
//     // existing optional decorations:
//     _researchSource?: string,
//     _screenshots?:   array,
//     compareResults?: array,
//     // NEW (Phase 1, this dispatch):
//     block?:         boolean,                       // default false
//     blockReason?:   string,                        // human-readable
//     blockSeverity?: 'critical' | 'high',           // default 'critical'
//   }
//
// `block` is OPTIONAL.  Agents that don't return it continue to work
// unchanged — `block` falls back to false → no gate fires → existing
// behavior is byte-equivalent.  An agent opts into the gate by setting
// `block: true` along with a human-readable `blockReason`.
//
// ── GATE SEMANTICS ───────────────────────────────────────────────────
//
//   shouldHaltOnBlock(result)
//       → true iff result.block === true AND (severity 'critical' or
//         severity unset — default is critical).  'high' severity will
//         exist for future agents that want a softer signal; today the
//         Auto Runner only halts on 'critical'.
//
//   buildSkippedResult(blockedAtIdx)
//       → returns the StepResult shape Auto Runner persists for steps
//         downstream of a critical block.  Carries
//         `_skipped: true` and `_skippedReason: 'upstream-blocked-by-step-N'`
//         so the UI and the run record can distinguish skipped from
//         failed.
//
//   applyBlockGate({ statuses, results, blockedAtIdx })
//       → mutates and returns the statuses/results arrays so that every
//         step AFTER blockedAtIdx is marked status 'skipped' and carries
//         a buildSkippedResult().  Idempotent: re-applying with the same
//         index produces the same arrays.
//
// ── CONSTRAINTS ──────────────────────────────────────────────────────
//   - ESM only.
//   - Pure functions.  No I/O, no React, no logging.  Pure utility
//     module so the gate logic can be tested without a DOM or the
//     orchestrator bundle.
//   - The 'skipped' status name is part of the public contract — the
//     UI (StepCard) keys off this string.  Don't rename without
//     updating AutoRunner.jsx + tests in lockstep.
//

/**
 * Severity values an agent may set when returning block:true.
 * @typedef {'critical' | 'high'} BlockSeverity
 */

/**
 * StepResult — the shape Auto Runner stores in stepResults[i].
 *
 * @typedef  {Object} StepResult
 * @property {string} full_output
 * @property {string} summary
 * @property {boolean}        [block]            true iff the agent is
 *                                                signalling that downstream
 *                                                execution should halt.
 * @property {string}         [blockReason]       human-readable reason.
 * @property {BlockSeverity}  [blockSeverity]     'critical' (default) or
 *                                                'high'.  Today only
 *                                                'critical' halts the
 *                                                pipeline.
 * @property {string}         [_researchSource]
 * @property {Array}          [_screenshots]
 * @property {Array}          [compareResults]
 * @property {boolean}        [_skipped]          true iff buildSkippedResult
 *                                                produced this entry.
 * @property {string}         [_skippedReason]    'upstream-blocked-by-step-N'
 */

/**
 * Return true iff this result signals the pipeline should halt right
 * here. Today only `blockSeverity === 'critical'` halts (or unset, which
 * defaults to 'critical').  'high' will be a soft signal for future
 * agents.
 *
 * @param {StepResult | null | undefined} result
 * @returns {boolean}
 */
export function shouldHaltOnBlock(result) {
  if (!result || result.block !== true) return false;
  const sev = result.blockSeverity;
  // Default severity is 'critical' when unset.
  if (sev === undefined || sev === null || sev === 'critical') return true;
  return false;
}

/**
 * Build the StepResult that Auto Runner stores for a step that was
 * skipped because an upstream step returned block:true.
 *
 * The 1-based human step number is embedded so the UI / run record
 * can render "SKIPPED — upstream blocked at step N" without re-deriving
 * the index.
 *
 * @param {number} blockedAtIdx   zero-based index of the BLOCKING step.
 * @returns {StepResult}
 */
export function buildSkippedResult(blockedAtIdx) {
  const oneBased = Number.isInteger(blockedAtIdx) ? blockedAtIdx + 1 : '?';
  const reason = `upstream-blocked-by-step-${oneBased}`;
  return {
    full_output: `SKIPPED — upstream blocked at step ${oneBased}.`,
    summary: `Skipped (upstream blocked at step ${oneBased})`,
    _skipped: true,
    _skippedReason: reason,
  };
}

/**
 * Apply the block gate to the in-flight statuses/results arrays.
 *
 * Steps at index > blockedAtIdx are marked 'skipped' with a
 * buildSkippedResult().  Steps at or before blockedAtIdx are left
 * untouched.  Mutates the input arrays in place AND returns them for
 * chaining / clarity.
 *
 * @param {{
 *   statuses: string[],
 *   results: Array<StepResult | null>,
 *   blockedAtIdx: number,
 * }} args
 * @returns {{ statuses: string[], results: Array<StepResult | null> }}
 */
export function applyBlockGate({ statuses, results, blockedAtIdx }) {
  if (!Array.isArray(statuses) || !Array.isArray(results)) {
    throw new TypeError('applyBlockGate: statuses and results must be arrays');
  }
  if (!Number.isInteger(blockedAtIdx) || blockedAtIdx < 0) {
    throw new TypeError('applyBlockGate: blockedAtIdx must be a non-negative integer');
  }
  for (let j = blockedAtIdx + 1; j < statuses.length; j++) {
    statuses[j] = 'skipped';
    results[j] = buildSkippedResult(blockedAtIdx);
  }
  return { statuses, results };
}

/**
 * Convenience: produce the persisted "step_results" payload that
 * AutoSession stores in the DB for a run that hit a block.  Carries
 * the block fields on the blocking step and `_skipped` on the rest.
 * Pure function — caller decides whether/where to persist.
 *
 * @param {Array<StepResult | null>} results
 * @param {Array<{key: string}>}     steps
 * @returns {Record<string, {summary: string, full_output: string, block?: boolean, blockReason?: string, blockSeverity?: BlockSeverity, _skipped?: boolean, _skippedReason?: string} | null>}
 */
export function serializeResultsForPersist(results, steps) {
  const out = {};
  for (let i = 0; i < steps.length; i++) {
    const r = results[i];
    if (!r) { out[steps[i].key] = null; continue; }
    const entry = {
      summary: r.summary,
      full_output: (r.full_output || '').slice(0, 2000),
    };
    if (r.block === true) {
      entry.block = true;
      if (typeof r.blockReason === 'string') entry.blockReason = r.blockReason;
      if (r.blockSeverity) entry.blockSeverity = r.blockSeverity;
    }
    if (r._skipped) {
      entry._skipped = true;
      if (typeof r._skippedReason === 'string') entry._skippedReason = r._skippedReason;
    }
    out[steps[i].key] = entry;
  }
  return out;
}
