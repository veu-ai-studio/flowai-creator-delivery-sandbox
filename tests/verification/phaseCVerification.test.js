import { describe, it, expect, vi } from 'vitest';
import { buildSnapshotFromEvaluation } from '../../src/lib/verification/snapshotShared.js';
import { calculateTransformationDelta } from '../../src/lib/verification/deltaCalculator.js';
import { classifyPatchEffects } from '../../src/lib/verification/patchEffectClassifier.js';
import { runRegressionGate } from '../../src/lib/verification/regressionGate.js';

describe('Phase C transformation delta verification', () => {
  it('builds before/after snapshots and calculates improvement deltas', () => {
    const baseline = buildSnapshotFromEvaluation({
      url: 'https://before.example',
      evaluationResult: {
        findings: [
          { source: 'axe-core', category: 'axe:image-alt' },
          { source: 'axe-core', category: 'axe:color-contrast' },
          { source: 'runtime-diagnostics', category: 'console:error' },
          { source: 'runtime-diagnostics', category: 'network:http_404' },
        ],
        stats: { evaluatorMetrics: { lighthouse: { scores: { accessibility: 61, performance: 70, seo: 80 } } } },
        perEvaluator: { 'axe-core': 2, 'runtime-diagnostics': 2 },
      },
    });
    const postFix = buildSnapshotFromEvaluation({
      url: 'https://after.example',
      evaluationResult: {
        findings: [
          { source: 'axe-core', category: 'axe:color-contrast' },
        ],
        stats: { evaluatorMetrics: { lighthouse: { scores: { accessibility: 74, performance: 72, seo: 82 } } } },
        perEvaluator: { 'axe-core': 1, 'runtime-diagnostics': 0 },
      },
    });

    const delta = calculateTransformationDelta({ baseline, postFix });

    expect(delta.deltas.find((d) => d.metric === 'lighthouse.accessibility')).toMatchObject({
      before: 61, after: 74, delta: 13, direction: 'improved',
    });
    expect(delta.deltas.find((d) => d.metric === 'runtime404s')).toMatchObject({
      before: 1, after: 0, delta: -1, direction: 'improved',
    });
    expect(delta.aggregate.totalImproved).toBeGreaterThan(0);
    expect(delta.regressions).toEqual([]);
  });

  it('classifies patch effects against related metric movement', () => {
    const deltas = [
      { metric: 'axeImageAltViolations', direction: 'improved' },
      { metric: 'runtime404s', direction: 'neutral' },
      { metric: 'axeContrastViolations', direction: 'regressed' },
    ];
    const effects = classifyPatchEffects({
      deltas,
      patches: [
        { strategy: 'inject-alt-attribute', provenance: { rollbackId: 'p1' } },
        { strategy: 'repair-asset-path', provenance: { rollbackId: 'p2' } },
        { strategy: 'css-contrast-adjust', provenance: { rollbackId: 'p3' } },
      ],
    });

    expect(effects.map((e) => [e.patchId, e.effect])).toEqual([
      ['p1', 'improved'],
      ['p2', 'neutral'],
      ['p3', 'regressed'],
    ]);
  });

  it('fails the regression gate when regressions exceed the threshold', () => {
    const onStep = vi.fn();
    const result = runRegressionGate({
      deltaResult: {
        regressions: [{ metric: 'consoleErrors' }, { metric: 'axeViolations' }, { metric: 'seo' }],
        aggregate: { netDelta: 6 },
      },
      threshold: 2,
      onStep,
    });

    expect(result.passed).toBe(false);
    expect(result.kind).toBe('regression_gate');
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({
      log: expect.objectContaining({ passed: false }),
    }));
  });
});
