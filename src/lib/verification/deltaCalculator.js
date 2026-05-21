// src/lib/verification/deltaCalculator.js
//
// PART A — Delta noise suppression. Each metric carries an explicit
// NOISE_THRESHOLD; an absolute raw delta within that envelope is
// classified 'neutral' (NOT 'improved' or 'regressed') and the gate
// downstream ignores it. Prevents single-page evaluator flicker from
// triggering false-positive regression halts.

'use strict';

/**
 * Per-metric noise thresholds. Lighthouse scores carry a ±3 envelope
 * (their own run-to-run variance is ~2-3 points). Axe + runtime metrics
 * have zero noise (they're deterministic). totalFindings carries a ±2
 * envelope to absorb single Phase B retry flips.
 */
export const NOISE_THRESHOLDS = Object.freeze({
  'lighthouse.performance':  3,
  'lighthouse.accessibility': 3,
  'lighthouse.bestPractices': 3,
  'lighthouse.seo':          3,
  axeViolations:             0,
  axeImageAltViolations:     0,
  axeContrastViolations:     0,
  axeAriaViolations:         0,
  runtimeErrors:             0,
  runtime404s:               0,
  consoleErrors:             0,
  totalFindings:             2,
});

const METRICS = Object.freeze([
  { key: 'lighthouse.performance', label: 'performance', higherIsBetter: true, get: (s) => s?.lighthouseScores?.performance },
  { key: 'lighthouse.accessibility', label: 'accessibility', higherIsBetter: true, get: (s) => s?.lighthouseScores?.accessibility },
  { key: 'lighthouse.bestPractices', label: 'best-practices', higherIsBetter: true, get: (s) => s?.lighthouseScores?.bestPractices },
  { key: 'lighthouse.seo', label: 'seo', higherIsBetter: true, get: (s) => s?.lighthouseScores?.seo },
  { key: 'axeViolations', label: 'axe violations', higherIsBetter: false, get: (s) => s?.axeViolations },
  { key: 'axeImageAltViolations', label: 'image alt issues', higherIsBetter: false, get: (s) => s?.axeImageAltViolations },
  { key: 'axeContrastViolations', label: 'contrast issues', higherIsBetter: false, get: (s) => s?.axeContrastViolations },
  { key: 'axeAriaViolations', label: 'aria label issues', higherIsBetter: false, get: (s) => s?.axeAriaViolations },
  { key: 'runtimeErrors', label: 'runtime errors', higherIsBetter: false, get: (s) => s?.runtimeErrors },
  { key: 'runtime404s', label: 'runtime 404s', higherIsBetter: false, get: (s) => s?.runtime404s },
  { key: 'consoleErrors', label: 'console errors', higherIsBetter: false, get: (s) => s?.consoleErrors },
  { key: 'totalFindings', label: 'total findings', higherIsBetter: false, get: (s) => s?.totalFindings },
]);

function numeric(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function directionFor({ rawDelta, higherIsBetter, noiseThreshold = 0 }) {
  if (Math.abs(rawDelta) <= noiseThreshold) return 'neutral';
  const qualityDelta = higherIsBetter ? rawDelta : -rawDelta;
  if (qualityDelta > 0) return 'improved';
  if (qualityDelta < 0) return 'regressed';
  return 'neutral';
}

export function calculateTransformationDelta({ baseline, postFix } = {}) {
  const deltas = [];
  for (const metric of METRICS) {
    const before = numeric(metric.get(baseline));
    const after = numeric(metric.get(postFix));
    if (before === null || after === null) continue;
    const rawDelta = after - before;
    const noiseThreshold = NOISE_THRESHOLDS[metric.key] ?? 0;
    const aboveNoise = Math.abs(rawDelta) > noiseThreshold;
    deltas.push(Object.freeze({
      metric: metric.key,
      label: metric.label,
      before,
      after,
      delta: rawDelta,
      qualityDelta: metric.higherIsBetter ? rawDelta : -rawDelta,
      direction: directionFor({ rawDelta, higherIsBetter: metric.higherIsBetter, noiseThreshold }),
      noiseThreshold,
      aboveNoise,
    }));
  }
  const regressions = deltas.filter((d) => d.direction === 'regressed');
  const aggregate = Object.freeze({
    totalImproved: deltas.filter((d) => d.direction === 'improved').length,
    totalNeutral: deltas.filter((d) => d.direction === 'neutral').length,
    totalRegressed: regressions.length,
    netDelta: deltas.reduce((sum, d) => sum + d.qualityDelta, 0),
    overallDirection: regressions.length > 0
      ? 'regressed'
      : (deltas.some((d) => d.direction === 'improved') ? 'improved' : 'neutral'),
  });
  return Object.freeze({ deltas, aggregate, regressions });
}

export const __internals = Object.freeze({ METRICS, NOISE_THRESHOLDS });
