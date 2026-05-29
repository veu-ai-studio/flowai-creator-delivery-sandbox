// src/lib/verification/snapshotShared.js

'use strict';

function countBy(findings, predicate) {
  if (!Array.isArray(findings)) return 0;
  return findings.filter(predicate).length;
}

export function buildSnapshotFromEvaluation({ url, evaluationResult, timestamp = new Date().toISOString() }) {
  const result = evaluationResult ?? {};
  const findings = Array.isArray(result.findings) ? result.findings : [];
  const metrics = result.stats?.evaluatorMetrics ?? {};
  const lighthouseScores = metrics.lighthouse?.scores ?? {};

  const axeViolations = typeof metrics['axe-core']?.violations === 'number'
    ? metrics['axe-core'].violations
    : countBy(findings, (f) => f?.source === 'axe-core');

  const runtimeFindings = findings.filter((f) => f?.source === 'runtime-diagnostics');
  const consoleErrors = countBy(runtimeFindings, (f) =>
    String(f?.category ?? '').startsWith('console:error'));
  const runtimeErrors = runtimeFindings.length;

  return Object.freeze({
    timestamp,
    url,
    lighthouseScores: Object.freeze({
      performance: lighthouseScores.performance ?? null,
      accessibility: lighthouseScores.accessibility ?? null,
      bestPractices: lighthouseScores['best-practices'] ?? lighthouseScores.bestPractices ?? null,
      seo: lighthouseScores.seo ?? null,
    }),
    axeViolations,
    axeImageAltViolations: countBy(findings, (f) => f?.category === 'axe:image-alt'),
    axeContrastViolations: countBy(findings, (f) => f?.category === 'axe:color-contrast'),
    axeAriaViolations: countBy(findings, (f) => /^axe:(aria-|button-name|link-name|input-button-name|label|select-name)/.test(String(f?.category ?? ''))),
    runtimeErrors,
    runtime404s: countBy(findings, (f) => /^network:http_404$/.test(String(f?.category ?? ''))),
    consoleErrors,
    totalFindings: findings.length,
    perEvaluator: result.perEvaluator ?? {},
    errors: result.errors ?? {},
  });
}

export async function captureSnapshot({ url, runEvaluationPipeline, evaluationResult, options = {} } = {}) {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('captureSnapshot: url required');
  }
  const result = evaluationResult ?? await runEvaluationPipeline({
    url,
    options: {
      ...options,
      phaseBFindings: options.phaseBFindings ?? [],
    },
  });
  return buildSnapshotFromEvaluation({ url, evaluationResult: result });
}
