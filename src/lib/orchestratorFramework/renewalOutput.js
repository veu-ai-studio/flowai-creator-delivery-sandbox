import { createOrchestratorLogger } from './logger.js';

export const GTM_FLAGS = Object.freeze({
  BLOCKED: 'GTM-BLOCKED',
  ELIGIBLE: 'GTM-ELIGIBLE',
});

export const ITERATION_ZERO_LABEL = 'ITERATION 0 — CORRECTIVE DISPATCH QUEUED';
export const GTM_THRESHOLD = 95;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeSelfScore(value) {
  if (value && typeof value === 'object') {
    return Object.freeze({
      verified: value.verified === true,
      reason: value.reason,
      tier: ['A', 'B', 'C'].includes(value.tier) ? value.tier : 'B',
      verified_pct: value.verified_pct ?? null,
    });
  }

  return Object.freeze({
    verified: false,
    reason: 'FlowAI self-score not yet instrumented',
    tier: 'B',
    verified_pct: null,
  });
}

export function buildRenewalOutput(params = {}, opts = {}) {
  const logger = opts.logger ?? createOrchestratorLogger('renewalOutput');
  const iterationCount = Math.max(0, Math.trunc(finiteNumber(params.iterationCount, 0)));
  const scoreAfter = finiteNumber(params.scoreAfter, 0);
  const output = Object.freeze({
    productId: String(params.productId ?? ''),
    runId: String(params.runId ?? ''),
    iterationCount,
    iterationZeroFlag: iterationCount === 0,
    iterationLabel: iterationCount === 0
      ? ITERATION_ZERO_LABEL
      : `ITERATION ${iterationCount}`,
    scoreBefore: finiteNumber(params.scoreBefore, 0),
    scoreAfter,
    surfacesTested: Math.max(0, Math.trunc(finiteNumber(params.surfacesTested, 0))),
    surfacesVerified: Math.max(0, Math.trunc(finiteNumber(params.surfacesVerified, 0))),
    surfacesFailed: Math.max(0, Math.trunc(finiteNumber(params.surfacesFailed, 0))),
    evidenceCoverage: finiteNumber(params.evidenceCoverage, 0),
    matrixArtifactVersion: String(params.matrixArtifactVersion ?? 'unknown'),
    correctiveDispatches: Object.freeze(Array.isArray(params.correctiveDispatches)
      ? params.correctiveDispatches.map(String)
      : []),
    timestamp: params.timestamp ? String(params.timestamp) : new Date().toISOString(),
    gtmFlag: scoreAfter >= GTM_THRESHOLD ? GTM_FLAGS.ELIGIBLE : GTM_FLAGS.BLOCKED,
    flowaiSelfScore: normalizeSelfScore(params.flowaiSelfScore),
  });

  logger.info('renewal_output.built', {
    productId: output.productId,
    runId: output.runId,
    iterationCount: output.iterationCount,
    gtmFlag: output.gtmFlag,
    scoreAfter: output.scoreAfter,
  });

  return output;
}
