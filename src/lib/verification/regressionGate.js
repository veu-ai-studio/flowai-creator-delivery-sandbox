// src/lib/verification/regressionGate.js

'use strict';

export const DEFAULT_REGRESSION_THRESHOLD = 2;

export function runRegressionGate({ deltaResult, threshold = DEFAULT_REGRESSION_THRESHOLD, onStep } = {}) {
  const regressions = Array.isArray(deltaResult?.regressions) ? deltaResult.regressions : [];
  const netDelta = deltaResult?.aggregate?.netDelta ?? 0;
  const passed = regressions.length <= threshold;
  const payload = Object.freeze({
    kind: 'regression_gate',
    passed,
    regressions,
    netDelta,
    threshold,
  });
  if (typeof onStep === 'function') {
    try { onStep({ type: 'step', log: payload }); } catch { /* swallow */ }
  }
  return payload;
}
