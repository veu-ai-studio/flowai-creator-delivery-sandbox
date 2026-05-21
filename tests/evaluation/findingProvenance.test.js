// tests/evaluation/findingProvenance.test.js
//
// DISPATCH U1 — Finding provenance rule: every emitted finding must
// include `generated_by` so universal-mode consumers can attribute
// evidence to a specific evaluator (lighthouse | axe-core |
// runtime-diagnostics | crawler | phase-b-playwright).

import { describe, it, expect } from 'vitest';
import { normalizeFindings } from '../../src/lib/evaluation/findingNormalizer.js';

describe('finding provenance — generated_by (DISPATCH U1)', () => {
  it('attaches generated_by mirroring source on single-evaluator findings', () => {
    const out = normalizeFindings({
      'lighthouse': [
        { category: 'lighthouse:meta', severity: 'medium', location: 'https://x', description: 'd',
          source: 'lighthouse', evaluatorVersion: 'lh-13', dimension: 'ui_ux' },
      ],
      'axe-core': [
        { category: 'color-contrast', severity: 'high', location: 'https://x/y', description: 'd',
          source: 'axe-core', evaluatorVersion: 'axe-4', dimension: 'accessibility' },
      ],
    });
    expect(out.findings.length).toBeGreaterThan(0);
    for (const f of out.findings) {
      expect(f).toHaveProperty('generated_by');
      // Single-evaluator findings → string; merged → array.
      const provenance = Array.isArray(f.generated_by) ? f.generated_by : [f.generated_by];
      for (const p of provenance) {
        expect(['lighthouse', 'axe-core', 'runtime-diagnostics', 'crawler', 'phase-b-playwright'])
          .toContain(p);
      }
    }
  });

  it('mirrors source as array on merged findings from multiple evaluators', () => {
    const out = normalizeFindings({
      'lighthouse': [
        { category: 'color-contrast', severity: 'medium', location: 'https://x',
          source: 'lighthouse', dimension: 'accessibility' },
      ],
      'axe-core': [
        { category: 'color-contrast', severity: 'high', location: 'https://x',
          source: 'axe-core', dimension: 'accessibility' },
      ],
    });
    expect(out.findings.length).toBe(1);
    const merged = out.findings[0];
    expect(merged.generated_by).toEqual(merged.source);
    expect(Array.isArray(merged.generated_by)).toBe(true);
    expect(merged.generated_by).toEqual(expect.arrayContaining(['lighthouse', 'axe-core']));
  });
});
