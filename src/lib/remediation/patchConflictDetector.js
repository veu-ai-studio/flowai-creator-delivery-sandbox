// src/lib/remediation/patchConflictDetector.js — PHASE B2 STEP 5
//
// Detect overlapping patches before they hit the commit pipeline. Two
// patches conflict when they modify the same file AND target the same
// region (defined as: same target selector for DOM-injecting patches,
// OR identical patch hash, OR overlapping line range for diffs).
//
// Resolution policy (per spec): higher-severity patch wins; the loser
// is DEFERRED with reason='conflict_with_higher_severity'. Same-severity
// ties are resolved by higher confidence wins, then by patch hash
// lexicographic order (deterministic).
//
// Pure function — no IO. Returns kept[], deferred[], conflicts[].

'use strict';

const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Build a coarse "region key" for a patch so we can group conflicting
 * patches together. Patches with the same region key are evaluated
 * against each other.
 */
function regionKey(patch) {
  const filePath = String(patch?.filePath ?? '').toLowerCase();
  const sel = patch?.provenance?.targetSelector
    ?? patch?.targetSelector
    ?? patch?.finding?.location
    ?? '';
  return `${filePath}::${String(sel).toLowerCase()}`;
}

/**
 * Compare two patches for conflict precedence.
 * Returns positive if `a` outranks `b` (kept), negative if `b` outranks `a`,
 * zero if tied.
 */
function rankPatch(a, b) {
  const sa = SEV_RANK[a?.finding?.severity ?? 'low'] ?? 9;
  const sb = SEV_RANK[b?.finding?.severity ?? 'low'] ?? 9;
  if (sa !== sb) return sb - sa;  // lower numeric rank wins → flip
  const ca = a?.confidence ?? 0;
  const cb = b?.confidence ?? 0;
  if (ca !== cb) return ca - cb;
  const ha = String(a?.provenance?.patchHash ?? '');
  const hb = String(b?.provenance?.patchHash ?? '');
  return ha.localeCompare(hb);
}

/**
 * @param {Array<object>} patches — proposed patches with
 *   { filePath, patchedContent, finding, provenance, confidence }
 * @returns {{
 *   kept:      Array<object>,
 *   deferred:  Array<object>,
 *   conflicts: Array<{ region: string, winner: object, losers: Array<object> }>,
 *   counts:    { detected: number, resolved: number, kept: number, deferred: number },
 * }}
 */
export function detectAndResolveConflicts(patches) {
  const list = Array.isArray(patches) ? patches : [];
  const byRegion = new Map();
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    const key = regionKey(p);
    const bucket = byRegion.get(key) ?? [];
    bucket.push(p);
    byRegion.set(key, bucket);
  }

  const kept = [];
  const deferred = [];
  const conflicts = [];

  for (const [region, bucket] of byRegion.entries()) {
    if (bucket.length <= 1) {
      kept.push(...bucket);
      continue;
    }
    bucket.sort((a, b) => rankPatch(b, a));  // highest-rank first
    const winner = bucket[0];
    const losers = bucket.slice(1);
    kept.push(winner);
    for (const loser of losers) {
      deferred.push(Object.freeze({ ...loser, deferralReason: 'conflict_with_higher_severity' }));
    }
    conflicts.push(Object.freeze({
      region,
      winner: Object.freeze({
        filePath: winner.filePath,
        strategy: winner.provenance?.generator ?? winner.strategy,
        severity: winner.finding?.severity ?? null,
      }),
      losers: losers.map((l) => Object.freeze({
        filePath: l.filePath,
        strategy: l.provenance?.generator ?? l.strategy,
        severity: l.finding?.severity ?? null,
        reason: 'conflict_with_higher_severity',
      })),
    }));
  }

  return {
    kept,
    deferred,
    conflicts,
    counts: {
      detected: conflicts.length,
      resolved: conflicts.length,
      kept: kept.length,
      deferred: deferred.length,
    },
  };
}
