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

describe('Phase C noise suppression (deltaCalculator)', () => {
  it('classifies a lighthouse score change within the ±3 noise envelope as neutral', () => {
    const baseline = buildSnapshotFromEvaluation({
      url: 'https://before.example',
      evaluationResult: {
        findings: [],
        stats: { evaluatorMetrics: { lighthouse: { scores: { performance: 70 } } } },
      },
    });
    const postFix = buildSnapshotFromEvaluation({
      url: 'https://after.example',
      evaluationResult: {
        findings: [],
        stats: { evaluatorMetrics: { lighthouse: { scores: { performance: 67 } } } },
      },
    });
    const delta = calculateTransformationDelta({ baseline, postFix });
    const perf = delta.deltas.find((d) => d.metric === 'lighthouse.performance');
    expect(perf).toBeDefined();
    expect(perf.delta).toBe(-3);
    expect(perf.noiseThreshold).toBe(3);
    expect(perf.aboveNoise).toBe(false);
    expect(perf.direction).toBe('neutral');
    expect(delta.regressions).toEqual([]);
  });

  it('reports aboveNoise=true and direction=regressed when delta crosses the threshold', () => {
    const baseline = buildSnapshotFromEvaluation({
      url: 'https://before.example',
      evaluationResult: {
        findings: [],
        stats: { evaluatorMetrics: { lighthouse: { scores: { performance: 80 } } } },
      },
    });
    const postFix = buildSnapshotFromEvaluation({
      url: 'https://after.example',
      evaluationResult: {
        findings: [],
        stats: { evaluatorMetrics: { lighthouse: { scores: { performance: 70 } } } },
      },
    });
    const delta = calculateTransformationDelta({ baseline, postFix });
    const perf = delta.deltas.find((d) => d.metric === 'lighthouse.performance');
    expect(perf.delta).toBe(-10);
    expect(perf.aboveNoise).toBe(true);
    expect(perf.direction).toBe('regressed');
  });
});

describe('Phase C severity-weighted regression gate', () => {
  it('passes a single in-noise lighthouse regression (weightedScore stays low)', () => {
    const result = runRegressionGate({
      deltaResult: {
        regressions: [{ metric: 'lighthouse.performance', delta: -4, noiseThreshold: 3 }],
        aggregate: { netDelta: -4 },
      },
    });
    expect(result.passed).toBe(true);
    expect(result.severityLevel).toBe('low');
    expect(result.hardFailureTriggered).toBe(false);
    // base=1, magnitude=4/3≈1.33, escalation=1.5 → weighted ≈ 2.0
    expect(result.weightedScore).toBeCloseTo(2.0, 1);
  });

  it('weights high-severity metrics heavier than low-severity ones', () => {
    const a = runRegressionGate({
      deltaResult: {
        regressions: [{ metric: 'lighthouse.seo', delta: -5, noiseThreshold: 3 }],
        aggregate: { netDelta: -5 },
      },
    });
    const b = runRegressionGate({
      deltaResult: {
        regressions: [{ metric: 'consoleErrors', delta: 5, noiseThreshold: 0 }],
        aggregate: { netDelta: -5 },
      },
    });
    // SEO base=1; consoleErrors base=4 → b must outweigh a by a wide margin.
    expect(b.weightedScore).toBeGreaterThan(a.weightedScore * 3);
  });

  it('applies the 4.0 critical multiplier when normalizedMagnitude > 5', () => {
    const result = runRegressionGate({
      deltaResult: {
        regressions: [{ metric: 'lighthouse.performance', delta: -19, noiseThreshold: 3 }],
        aggregate: { netDelta: -19 },
      },
    });
    // 19/3 ≈ 6.33 → critical (>5) → 4.0 multiplier
    const detail = result.escalationDetails[0];
    expect(detail.normalizedMagnitude).toBeGreaterThan(5);
    expect(detail.escalation).toBe(4.0);
    // weighted = 1 * 6.33 * 4.0 ≈ 25.3 → halts via weightedHaltAt
    expect(result.passed).toBe(false);
    expect(result.exitReason).toBe('WEIGHTED_REGRESSION_EXCEEDED');
  });

  it('halts immediately with CATASTROPHIC_REGRESSION when runtimeErrors increases by 1', () => {
    const result = runRegressionGate({
      deltaResult: {
        regressions: [{ metric: 'runtimeErrors', delta: 1, noiseThreshold: 0 }],
        aggregate: { netDelta: -1 },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.hardFailureTriggered).toBe(true);
    expect(result.severityLevel).toBe('catastrophic');
    expect(result.exitReason).toBe('CATASTROPHIC_REGRESSION');
    expect(result.hardFailureDetails).toEqual([
      expect.objectContaining({ metric: 'runtimeErrors', delta: 1, minimumDelta: 1 }),
    ]);
  });

  it('continues when runtime404s increases by only 2 (below the 3-delta minimum)', () => {
    const result = runRegressionGate({
      deltaResult: {
        regressions: [{ metric: 'runtime404s', delta: 2, noiseThreshold: 0 }],
        aggregate: { netDelta: -2 },
      },
    });
    expect(result.hardFailureTriggered).toBe(false);
    expect(result.severityLevel).not.toBe('catastrophic');
    // baseWeight=3, magnitude=2/1=2, escalation=1.5 (2<=3) → weighted=9 → still passes
    expect(result.weightedScore).toBeCloseTo(9.0, 1);
    expect(result.passed).toBe(true);
  });

  it('halts with CATASTROPHIC_REGRESSION when runtime404s increases by 3', () => {
    const result = runRegressionGate({
      deltaResult: {
        regressions: [{ metric: 'runtime404s', delta: 3, noiseThreshold: 0 }],
        aggregate: { netDelta: -3 },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.hardFailureTriggered).toBe(true);
    expect(result.exitReason).toBe('CATASTROPHIC_REGRESSION');
  });
});
