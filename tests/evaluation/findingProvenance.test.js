// tests/evaluation/findingProvenance.test.js
//
// DISPATCH U1 — Finding provenance rule: every emitted finding must
// include `generated_by` so universal-mode consumers can attribute
// evidence to a specific evaluator. Allowed enum:
//   lighthouse | axe-core | runtime-diagnostics | crawler |
//   phase-b-playwright | unattributed
// Findings with missing / invalid source are NOT dropped and NOT
// heuristically inferred — they are labeled 'unattributed'.

import { describe, it, expect } from 'vitest';
import { normalizeFindings } from '../../src/lib/evaluation/findingNormalizer.js';

const ALLOWED_GENERATED_BY = [
  'lighthouse', 'axe-core', 'runtime-diagnostics',
  'crawler', 'phase-b-playwright', 'unattributed',
];

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
        expect(ALLOWED_GENERATED_BY).toContain(p);
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

describe('finding provenance — unattributed coercion', () => {
  it('flat finding with missing/invalid source → generated_by === "unattributed" (never "unknown")', () => {
    const cases = [
      // Missing source entirely.
      { category: 'orphan-missing-source', severity: 'medium', location: 'https://x',
        description: 'd', dimension: 'functional_completeness' },
      // Source present but not in the allowed enum.
      { category: 'orphan-bad-source', severity: 'medium', location: 'https://y',
        description: 'd', source: 'made-up-evaluator', dimension: 'functional_completeness' },
      // Source is a non-string type — must still coerce, not crash.
      { category: 'orphan-numeric-source', severity: 'low', location: 'https://z',
        description: 'd', source: 42, dimension: 'functional_completeness' },
    ];
    const out = normalizeFindings(cases);
    expect(out.findings.length).toBe(3);
    for (const f of out.findings) {
      expect(f.generated_by).toBe('unattributed');
      expect(f.generated_by).not.toBe('unknown');
      expect(f.source).toBe('unattributed');
    }
  });

  it('generated_by on every finding always belongs to the allowed enum (no values outside the 6 allowed strings)', () => {
    const mixed = normalizeFindings({
      'lighthouse': [
        { category: 'lh:meta', severity: 'medium', location: 'https://x',
          source: 'lighthouse', dimension: 'ui_ux' },
      ],
      'axe-core': [
        { category: 'axe:img', severity: 'high', location: 'https://x',
          source: 'axe-core', dimension: 'accessibility' },
      ],
      'runtime-diagnostics': [
        { category: 'console:error', severity: 'high', location: 'https://x',
          source: 'runtime-diagnostics', dimension: 'bugs_errors_detector' },
      ],
      'something-else': [   // not in allowed enum — must coerce
        { category: 'orphan:1', severity: 'low', location: 'https://x',
          dimension: 'functional_completeness' },
      ],
    });
    expect(mixed.findings.length).toBeGreaterThan(0);
    for (const f of mixed.findings) {
      const provenance = Array.isArray(f.generated_by) ? f.generated_by : [f.generated_by];
      for (const p of provenance) {
        expect(ALLOWED_GENERATED_BY).toContain(p);
        expect(p).not.toBe('unknown');
      }
    }
  });
});
