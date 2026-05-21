// src/lib/verification/patchEffectClassifier.js

'use strict';

const STRATEGY_METRICS = Object.freeze({
  'inject-alt-attribute': ['axeImageAltViolations', 'axeViolations', 'lighthouse.accessibility'],
  'css-contrast-adjust': ['axeContrastViolations', 'axeViolations', 'lighthouse.accessibility'],
  'inject-aria-label': ['axeAriaViolations', 'axeViolations', 'lighthouse.accessibility'],
  'repair-asset-path': ['runtime404s', 'runtimeErrors', 'consoleErrors'],
  'repair-broken-link': ['runtime404s', 'runtimeErrors'],
  'inject-metadata': ['lighthouse.seo', 'totalFindings'],
  'inject-viewport': ['lighthouse.seo', 'totalFindings'],
  'inject-html-lang': ['axeViolations', 'lighthouse.accessibility'],
  'css-size-adjustment': ['lighthouse.accessibility', 'totalFindings'],
});

function patchId(patch) {
  return patch?.provenance?.rollbackId
    ?? patch?.provenance?.patchHash
    ?? patch?.finding?.id
    ?? null;
}

export function classifyPatchEffects({ patches, deltas } = {}) {
  const list = Array.isArray(patches) ? patches : [];
  const deltaList = Array.isArray(deltas) ? deltas : [];
  return list.map((patch) => {
    const strategy = patch?.strategy ?? patch?.provenance?.generator ?? null;
    const relatedMetrics = STRATEGY_METRICS[strategy] ?? [];
    const relatedDeltas = deltaList.filter((d) => relatedMetrics.includes(d.metric));
    const hasRegression = relatedDeltas.some((d) => d.direction === 'regressed');
    const hasImprovement = relatedDeltas.some((d) => d.direction === 'improved');
    const effect = hasRegression ? 'regressed' : (hasImprovement ? 'improved' : 'neutral');
    return Object.freeze({
      patchId: patchId(patch),
      strategy,
      effect,
      relatedMetrics,
      verificationConfidence: relatedDeltas.length === 0
        ? 0.35
        : (effect === 'neutral' ? 0.6 : 0.8),
    });
  });
}
