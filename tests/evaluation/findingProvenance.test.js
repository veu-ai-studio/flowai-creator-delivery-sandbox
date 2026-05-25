// tests/evaluation/findingProvenance.test.js
//
// Finding provenance rule: every emitted finding must include the legacy
// `generated_by` source alias plus the stable CA18 evaluator_id field.

import { describe, it, expect } from 'vitest';
import { normalizeFindings } from '../../src/lib/evaluation/findingNormalizer.js';
import { EVALUATOR_IDS } from '../../src/lib/evaluation/evaluatorIds.js';

const ALLOWED_GENERATED_BY = [
  'lighthouse', 'axe-core', 'runtime-diagnostics',
  'crawler', 'phase-b-playwright', 'deep-browser-analysis', 'unattributed',
];

const ALLOWED_EVALUATOR_IDS = [
  ...Object.values(EVALUATOR_IDS),
  'unattributed',
];

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

describe('finding provenance - generated_by and evaluator_id', () => {
  it('attaches generated_by and evaluator_id on single-evaluator findings', () => {
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
      expect(f).toHaveProperty('evaluator_id');
      for (const p of asArray(f.generated_by)) {
        expect(ALLOWED_GENERATED_BY).toContain(p);
      }
      for (const evaluatorId of asArray(f.evaluator_id)) {
        expect(ALLOWED_EVALUATOR_IDS).toContain(evaluatorId);
      }
      for (const source of f.sources) {
        expect(source).toHaveProperty('evaluator_id');
        expect(ALLOWED_EVALUATOR_IDS).toContain(source.evaluator_id);
      }
    }
  });

  it('keeps legacy source arrays and adds evaluator_id arrays on merged findings', () => {
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
    expect(Array.isArray(merged.evaluator_id)).toBe(true);
    expect(merged.evaluator_id).toEqual(expect.arrayContaining([
      EVALUATOR_IDS.LIGHTHOUSE,
      EVALUATOR_IDS.AXE_CORE,
    ]));
  });
});

describe('finding provenance - unattributed coercion', () => {
  it('flat finding with missing/invalid source becomes unattributed, never unknown', () => {
    const cases = [
      { category: 'orphan-missing-source', severity: 'medium', location: 'https://x',
        description: 'd', dimension: 'functional_completeness' },
      { category: 'orphan-bad-source', severity: 'medium', location: 'https://y',
        description: 'd', source: 'made-up-evaluator', dimension: 'functional_completeness' },
      { category: 'orphan-numeric-source', severity: 'low', location: 'https://z',
        description: 'd', source: 42, dimension: 'functional_completeness' },
    ];
    const out = normalizeFindings(cases);
    expect(out.findings.length).toBe(3);
    for (const f of out.findings) {
      expect(f.generated_by).toBe('unattributed');
      expect(f.generated_by).not.toBe('unknown');
      expect(f.source).toBe('unattributed');
      expect(f.evaluator_id).toBe('unattributed');
    }
  });

  it('generated_by and evaluator_id on every finding always belong to allowed enums', () => {
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
      'something-else': [
        { category: 'orphan:1', severity: 'low', location: 'https://x',
          dimension: 'functional_completeness' },
      ],
    });
    expect(mixed.findings.length).toBeGreaterThan(0);
    for (const f of mixed.findings) {
      for (const p of asArray(f.generated_by)) {
        expect(ALLOWED_GENERATED_BY).toContain(p);
        expect(p).not.toBe('unknown');
      }
      for (const evaluatorId of asArray(f.evaluator_id)) {
        expect(ALLOWED_EVALUATOR_IDS).toContain(evaluatorId);
        expect(evaluatorId).not.toBe('unknown');
      }
    }
  });

  it('preserves source and evaluatorVersion while adding stable evaluator_id constants', () => {
    const out = normalizeFindings({
      'runtime-diagnostics': [
        {
          category: 'console:error',
          severity: 'high',
          location: 'https://x',
          source: 'runtime-diagnostics',
          evaluatorVersion: 'rt-1',
          dimension: 'bugs_errors_detector',
        },
      ],
    });

    expect(out.findings).toHaveLength(1);
    const finding = out.findings[0];
    expect(finding.source).toBe('runtime-diagnostics');
    expect(finding.generated_by).toBe('runtime-diagnostics');
    expect(finding.evaluator_id).toBe(EVALUATOR_IDS.RUNTIME_DIAGNOSTICS);
    expect(finding.sources[0]).toMatchObject({
      source: 'runtime-diagnostics',
      evaluator_id: EVALUATOR_IDS.RUNTIME_DIAGNOSTICS,
      evaluatorVersion: 'rt-1',
    });
  });
});
