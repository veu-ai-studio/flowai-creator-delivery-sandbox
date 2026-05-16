import { describe, it, expect } from 'vitest';
import { computeMonitorClearance, formatMonitorClearanceFooter } from '../src/lib/operationsEngine.js';

// Defect B regression suite — deterministic clearance computation.
// Locks in:
//   - stated_total === sum(layers)  (no LLM aggregate authority)
//   - verdict === pure threshold function of sum vs SSOT bands
//   - 25/50 → NOT CLEARED, never CONDITIONAL (the exact self-inflation
//     scenario observed on the FlowAI-on-FlowAI self-test)

describe('computeMonitorClearance — deterministic sum + verdict', () => {
  it('sums the parsed per-layer scores exactly — total === sum(layers)', () => {
    const text = `
2. FIVE-LAYER SCORES SUMMARY:
   [L1] Functionality Score: 5/10
   [L2] Operational Score: 5/10
   [L3] Financial Score: 5/10
   [L4] Business Score: 5/10
   [L5] GTM Score: 5/10
`;
    const r = computeMonitorClearance(text);
    expect(r.layers).toEqual({ L1: 5, L2: 5, L3: 5, L4: 5, L5: 5 });
    expect(r.sum).toBe(25);
    expect(r.sum).toBe(r.layers.L1 + r.layers.L2 + r.layers.L3 + r.layers.L4 + r.layers.L5);
    expect(r.sumOutOf100).toBe(50);
  });

  it('25/50 → NOT CLEARED (the self-inflation case must never resolve to CONDITIONAL)', () => {
    const text = `
   [L1] Functionality Score: 5/10
   [L2] Operational Score: 5/10
   [L3] Financial Score: 5/10
   [L4] Business Score: 5/10
   [L5] GTM Score: 5/10
`;
    const r = computeMonitorClearance(text);
    expect(r.sum).toBe(25);
    expect(r.verdict).toBe('NOT CLEARED');
    expect(r.verdict).not.toBe('CONDITIONAL');
    expect(r.verdict).not.toBe('CLEARED');
  });

  it('ignores any "scoring note" in the LLM output — verdict still NOT CLEARED at 25/50', () => {
    const text = `
   [L1] Functionality Score: 5/10
   [L2] Operational Score: 5/10
   [L3] Financial Score: 5/10
   [L4] Business Score: 5/10
   [L5] GTM Score: 5/10

   Scoring note: After consideration of cross-layer synergies, the adjusted total is 31/50 (CONDITIONAL).
   TOTAL (adjusted): 31/50
   CLEARANCE DECISION: CONDITIONAL — meets the 30+ threshold with allowances.
`;
    const r = computeMonitorClearance(text);
    expect(r.sum).toBe(25);             // ignores the "adjusted total"
    expect(r.verdict).toBe('NOT CLEARED');  // ignores the LLM's CONDITIONAL claim
  });

  it('45/50 → CLEARED (top band, /100 = 90)', () => {
    const text = `
   [L1] Functionality Score: 9/10
   [L2] Operational Score: 9/10
   [L3] Financial Score: 9/10
   [L4] Business Score: 9/10
   [L5] GTM Score: 9/10
`;
    const r = computeMonitorClearance(text);
    expect(r.sum).toBe(45);
    expect(r.sumOutOf100).toBe(90);
    expect(r.verdict).toBe('CLEARED');
  });

  it('30/50 → CONDITIONAL (lower-conditional boundary)', () => {
    const text = `
   [L1] Functionality Score: 6/10
   [L2] Operational Score: 6/10
   [L3] Financial Score: 6/10
   [L4] Business Score: 6/10
   [L5] GTM Score: 6/10
`;
    const r = computeMonitorClearance(text);
    expect(r.sum).toBe(30);
    expect(r.verdict).toBe('CONDITIONAL');
  });

  it('29/50 → NOT CLEARED (just below the 30 threshold)', () => {
    const text = `
   [L1] Functionality Score: 6/10
   [L2] Operational Score: 6/10
   [L3] Financial Score: 6/10
   [L4] Business Score: 6/10
   [L5] GTM Score: 5/10
`;
    const r = computeMonitorClearance(text);
    expect(r.sum).toBe(29);
    expect(r.verdict).toBe('NOT CLEARED');
  });

  it('44/50 → CONDITIONAL (just below CLEARED threshold)', () => {
    const text = `
   [L1] Functionality Score: 9/10
   [L2] Operational Score: 9/10
   [L3] Financial Score: 9/10
   [L4] Business Score: 9/10
   [L5] GTM Score: 8/10
`;
    const r = computeMonitorClearance(text);
    expect(r.sum).toBe(44);
    expect(r.verdict).toBe('CONDITIONAL');
  });

  it('missing a layer → defaults to NOT CLEARED (incomplete report blocks per SSOT §11)', () => {
    const text = `
   [L1] Functionality Score: 8/10
   [L2] Operational Score: 8/10
   [L3] Financial Score: 8/10
   (L4 missing entirely)
   [L5] GTM Score: 8/10
`;
    const r = computeMonitorClearance(text);
    expect(r.error).toMatch(/missing layer scores: L4/);
    expect(r.verdict).toBe('NOT CLEARED');
  });

  it('empty or non-string input → error + NOT CLEARED default', () => {
    expect(computeMonitorClearance('').error).toBe('empty monitor output');
    expect(computeMonitorClearance(null).error).toBe('empty monitor output');
    expect(computeMonitorClearance(undefined).error).toBe('empty monitor output');
  });

  it('formatMonitorClearanceFooter — emits the same number the verdict uses', () => {
    const text = `
   [L1] Functionality Score: 5/10
   [L2] Operational Score: 5/10
   [L3] Financial Score: 5/10
   [L4] Business Score: 5/10
   [L5] GTM Score: 5/10
`;
    const r = computeMonitorClearance(text);
    const footer = formatMonitorClearanceFooter(r);
    expect(footer).toContain('SUM:     25 / 50');
    expect(footer).toContain('VERDICT: NOT CLEARED');
    expect(footer).not.toContain('CONDITIONAL');
    expect(footer).not.toMatch(/VERDICT: CLEARED\b/);  // no top-band verdict at sum=25
  });

  it('verdict is a pure function — same input always produces same verdict', () => {
    const text = `
   [L1] Functionality Score: 6/10
   [L2] Operational Score: 6/10
   [L3] Financial Score: 6/10
   [L4] Business Score: 6/10
   [L5] GTM Score: 6/10
`;
    const a = computeMonitorClearance(text);
    const b = computeMonitorClearance(text);
    const c = computeMonitorClearance(text);
    expect(a.verdict).toBe(b.verdict);
    expect(b.verdict).toBe(c.verdict);
    expect(a.sum).toBe(b.sum);
    expect(b.sum).toBe(c.sum);
  });
});
