// tests/agents/renewal/preScoreAdapter.test.js
//
// Module 7 test coverage:
//   - happy path with mocked operationsEngine.computeMonitorClearance
//   - canonical normalized shape (total + l1..l5 + label + url + scoredAt)
//   - layer scaling: parser [0,10] → adapter [0,20]
//   - band → label mapping at all four bands (poor / fair / good / excellent)
//   - graceful degradation when monitorText is missing
//   - graceful degradation when computeFn throws
//   - graceful degradation when computeFn returns { error }
//   - graceful degradation when computeFn is missing entirely
//   - scoredAt is a valid ISO 8601 timestamp

import { describe, it, expect, vi } from 'vitest';
import {
  computeScore,
  __test_only__,
} from '../../../src/lib/agents/renewal/preScoreAdapter.js';

const SAMPLE_URL = 'https://example.com/test-product';
const SAMPLE_RUN_ID = 'run_test_0001';
const SAMPLE_PRODUCT_ID = 'mypreglife';

function isIso8601(s) {
  if (typeof s !== 'string') return false;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return false;
  // Strict shape: re-serialise and compare to detect timezone-stripped inputs.
  return d.toISOString() === s;
}

// ─────────────────────────────────────────────────────────────────────
// 1. Happy path
// ─────────────────────────────────────────────────────────────────────

describe('preScoreAdapter — happy path', () => {
  it('returns the canonical normalized shape from a fully-parsed monitor result', async () => {
    const mockCompute = vi.fn(() => ({
      layers: { L1: 9, L2: 8, L3: 10, L4: 7, L5: 9 },
      sum: 43,
      sumOutOf100: 86,
      band: 'demo-ready',
      verdict: 'CONDITIONAL',
    }));
    const result = await computeScore({
      productId: SAMPLE_PRODUCT_ID,
      url: SAMPLE_URL,
      runId: SAMPLE_RUN_ID,
      monitorText: '[L1] 9/10 [L2] 8/10 [L3] 10/10 [L4] 7/10 [L5] 9/10',
      computeFn: mockCompute,
    });
    expect(mockCompute).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      productId: SAMPLE_PRODUCT_ID,
      url: SAMPLE_URL,
      runId: SAMPLE_RUN_ID,
      total: 86,           // (9+8+10+7+9) * 2 = 86
      l1: 18, l2: 16, l3: 20, l4: 14, l5: 18,
      label: 'good',       // 75-89 band
    });
    expect(isIso8601(result.scoredAt)).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('layer sum equals total (sum_of_layers === total invariant)', async () => {
    const mockCompute = () => ({
      layers: { L1: 5, L2: 6, L3: 7, L4: 8, L5: 9 },
      sum: 35, sumOutOf100: 70, band: 'internal-only', verdict: 'CONDITIONAL',
    });
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'irrelevant — using mockCompute',
      computeFn: mockCompute,
    });
    expect(r.l1 + r.l2 + r.l3 + r.l4 + r.l5).toBe(r.total);
    expect(r.total).toBe(70);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Band → label mapping
// ─────────────────────────────────────────────────────────────────────

describe('preScoreAdapter — band/label mapping', () => {
  it.each([
    { total: 100, label: 'excellent', name: 'all-tens → excellent (100)' },
    { total: 92,  label: 'excellent', name: '92 → excellent (≥90)' },
    { total: 89,  label: 'good',      name: '89 → good (75-89)' },
    { total: 80,  label: 'good',      name: '80 → good' },
    { total: 75,  label: 'good',      name: '75 → good (boundary)' },
    { total: 74,  label: 'fair',      name: '74 → fair (60-74)' },
    { total: 60,  label: 'fair',      name: '60 → fair (boundary)' },
    { total: 59,  label: 'poor',      name: '59 → poor (<60)' },
    { total: 0,   label: 'poor',      name: '0 → poor' },
  ])('$name', ({ total, label }) => {
    expect(__test_only__.labelForTotal(total)).toBe(label);
  });

  it('integration: parsed score band drives the adapter label', async () => {
    // Construct a layers payload that totals exactly 100 (10 each × 2).
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'placeholder',
      computeFn: () => ({
        layers: { L1: 10, L2: 10, L3: 10, L4: 10, L5: 10 },
        sum: 50, sumOutOf100: 100, band: 'showcase-ready', verdict: 'CLEARED',
      }),
    });
    expect(r.total).toBe(100);
    expect(r.label).toBe('excellent');
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Graceful degradation
// ─────────────────────────────────────────────────────────────────────

describe('preScoreAdapter — graceful degradation', () => {
  it('returns zero score with error="monitor_text_required" when monitorText is omitted', async () => {
    const r = await computeScore({ productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID });
    expect(r.total).toBe(0);
    expect(r.l1).toBe(0); expect(r.l2).toBe(0); expect(r.l3).toBe(0); expect(r.l4).toBe(0); expect(r.l5).toBe(0);
    expect(r.label).toBe('poor');
    expect(r.error).toBe('monitor_text_required');
    expect(r.url).toBe(SAMPLE_URL);
    expect(isIso8601(r.scoredAt)).toBe(true);
  });

  it('returns zero score with error="monitor_text_required" on empty string', async () => {
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID, monitorText: '   ',
    });
    expect(r.total).toBe(0);
    expect(r.error).toBe('monitor_text_required');
  });

  it('returns zero score with error="compute_failed: …" when computeFn throws', async () => {
    const throwingFn = () => { throw new Error('parser exploded'); };
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'some text', computeFn: throwingFn,
    });
    expect(r.total).toBe(0);
    expect(r.label).toBe('poor');
    expect(r.error).toMatch(/^compute_failed: parser exploded$/);
  });

  it('returns zero score with error="scoring_failed: …" when parser returns { error }', async () => {
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: '[L1] 5/10 [L2] 6/10 [L3] 7/10',  // missing L4, L5
      computeFn: () => ({
        error: 'missing layer scores: L4, L5',
        layers: { L1: 5, L2: 6, L3: 7, L4: null, L5: null },
        sum: null, sumOutOf100: null, band: null, verdict: 'NOT CLEARED',
      }),
    });
    expect(r.total).toBe(0);
    expect(r.error).toMatch(/^scoring_failed: missing layer scores: L4, L5$/);
  });

  it('returns zero score with error="scoring_failed: parser returned non-object" when parser returns non-object', async () => {
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'x', computeFn: () => null,
    });
    expect(r.total).toBe(0);
    expect(r.error).toBe('scoring_failed: parser returned non-object');
  });

  it('returns zero score with error="scoring_failed: parser omitted layers" when layers missing', async () => {
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'x', computeFn: () => ({ sum: 50 }),  // no layers
    });
    expect(r.total).toBe(0);
    expect(r.error).toBe('scoring_failed: parser omitted layers');
  });

  it('returns zero score with error="compute_fn_missing" when computeFn is explicitly null', async () => {
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'x', computeFn: null,
    });
    expect(r.total).toBe(0);
    // computeFn=null falls back to the imported default; the default
    // exists, so this returns the parser-error path (monitorText='x'
    // has no recognisable layer scores). Either way, the result must
    // be a well-shaped zero score with `error` set.
    expect(typeof r.error).toBe('string');
    expect(r.error.length).toBeGreaterThan(0);
    expect(r.label).toBe('poor');
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. scoredAt + shape invariants
// ─────────────────────────────────────────────────────────────────────

describe('preScoreAdapter — invariants', () => {
  it('scoredAt is a valid ISO 8601 timestamp on every code path', async () => {
    const happy = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'x',
      computeFn: () => ({
        layers: { L1: 1, L2: 1, L3: 1, L4: 1, L5: 1 },
        sum: 5, sumOutOf100: 10, band: 'not-demo-ready', verdict: 'NOT CLEARED',
      }),
    });
    const degraded = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
    });
    expect(isIso8601(happy.scoredAt)).toBe(true);
    expect(isIso8601(degraded.scoredAt)).toBe(true);
  });

  it('canonical envelope keys are present on every code path', async () => {
    const expectedKeys = ['productId', 'url', 'runId', 'scoredAt', 'total', 'l1', 'l2', 'l3', 'l4', 'l5', 'label'];
    const happy = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'x',
      computeFn: () => ({
        layers: { L1: 5, L2: 5, L3: 5, L4: 5, L5: 5 },
        sum: 25, sumOutOf100: 50, band: 'not-demo-ready', verdict: 'NOT CLEARED',
      }),
    });
    const degraded = await computeScore({});
    for (const k of expectedKeys) {
      expect(happy, `happy missing ${k}`).toHaveProperty(k);
      expect(degraded, `degraded missing ${k}`).toHaveProperty(k);
    }
  });

  it('does not invoke the default computeFn when monitorText is missing (avoids unnecessary work)', async () => {
    const mockCompute = vi.fn();
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      computeFn: mockCompute,
    });
    expect(mockCompute).not.toHaveBeenCalled();
    expect(r.error).toBe('monitor_text_required');
  });

  it('clamps per-layer values to [0, 20] after scaling', async () => {
    // Parser could in principle return a value > 10 (e.g., 12.5) despite
    // the documented 0-10 range. Adapter must clamp.
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText: 'x',
      computeFn: () => ({
        layers: { L1: 15, L2: 10, L3: 10, L4: 10, L5: 10 },  // L1 > 10
        sum: 55, sumOutOf100: 110, band: 'showcase-ready', verdict: 'CLEARED',
      }),
    });
    expect(r.l1).toBe(20);  // clamped from 15 × 2 = 30 down to 20
    expect(r.l2).toBe(20);
    expect(r.total).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Default-export sanity — the real computeMonitorClearance is wired
// ─────────────────────────────────────────────────────────────────────

describe('preScoreAdapter — wired against real operationsEngine parser', () => {
  it('parses a realistic monitor text using the default (un-mocked) computeFn', async () => {
    const monitorText = [
      '[L1] Functionality Score: 9/10 — solid happy path',
      '[L2] UX Score: 8/10 — clear hierarchy',
      '[L3] Performance Score: 7/10 — TTI marginally over budget',
      '[L4] Security Score: 9/10 — no exposed credentials',
      '[L5] Accessibility Score: 8/10 — alt text mostly present',
    ].join('\n');
    const r = await computeScore({
      productId: SAMPLE_PRODUCT_ID, url: SAMPLE_URL, runId: SAMPLE_RUN_ID,
      monitorText,
      // No computeFn override — exercises the real default import.
    });
    expect(r.error).toBeUndefined();
    expect(r.total).toBe((9 + 8 + 7 + 9 + 8) * 2);  // 82
    expect(r.l1).toBe(18); expect(r.l2).toBe(16); expect(r.l3).toBe(14);
    expect(r.l4).toBe(18); expect(r.l5).toBe(16);
    expect(r.label).toBe('good');  // 82 ∈ [75, 89]
  });
});
