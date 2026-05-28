export const SELF_RENEWAL_THRESHOLD = 95;
export const REQUIRED_MARKET_STATUS = 'VERIFIED';

export const SCORER_STATUS = Object.freeze({
  REAL_SCORER_AVAILABLE: 'REAL_SCORER_AVAILABLE',
  STUB_NO_SCORER: 'STUB_NO_SCORER',
  SCORE_CAPTURED: 'SCORE_CAPTURED',
  SCORE_BLOCKED_STUB: 'SCORE_BLOCKED_STUB',
});

export function detectReadinessScorer(candidate) {
  if (typeof candidate === 'function') {
    return Object.freeze({
      status: SCORER_STATUS.REAL_SCORER_AVAILABLE,
      scorer: candidate,
      note: 'A callable readiness scorer was supplied to the orchestration adapter.',
    });
  }

  return Object.freeze({
    status: SCORER_STATUS.STUB_NO_SCORER,
    scorer: null,
    note: 'No callable readiness scorer supplied. Adapter is stubbed and will not fabricate scores.',
  });
}

export function buildCorrectiveDispatch({
  target,
  builderPlatform,
  score,
  threshold = SELF_RENEWAL_THRESHOLD,
  reason,
} = {}) {
  return Object.freeze({
    type: 'CORRECTIVE_DISPATCH',
    target: target ?? null,
    builderPlatformId: builderPlatform?.id ?? null,
    threshold,
    score: typeof score === 'number' ? score : null,
    reason: reason ?? (typeof score === 'number' ? `score_below_threshold:${score}<${threshold}` : 'score_unavailable'),
    liveCall: false,
    gate: 'market_exposure_hard_gate',
    requiredStatus: REQUIRED_MARKET_STATUS,
  });
}

export async function evaluateSelfRenewalGate({
  target,
  scorer,
  builderPlatform,
  threshold = SELF_RENEWAL_THRESHOLD,
  context = {},
} = {}) {
  const detection = detectReadinessScorer(scorer);

  if (!detection.scorer) {
    return Object.freeze({
      status: SCORER_STATUS.SCORE_BLOCKED_STUB,
      score: null,
      evidenceStatus: null,
      threshold,
      goToMarketAllowed: false,
      marketExposureAllowed: false,
      gateType: 'HARD',
      requiredStatus: REQUIRED_MARKET_STATUS,
      correctiveDispatch: buildCorrectiveDispatch({
        target,
        builderPlatform,
        threshold,
        reason: 'readiness_scorer_not_configured',
      }),
      scorerDetection: detection,
    });
  }

  const result = await detection.scorer(target, context);
  const score = typeof result?.score === 'number' && Number.isFinite(result.score) ? result.score : null;
  const evidenceStatus = result?.status ?? result?.evidenceStatus ?? null;
  const verified = evidenceStatus === REQUIRED_MARKET_STATUS;
  const goToMarketAllowed = typeof score === 'number' && score >= threshold && verified;

  return Object.freeze({
    status: SCORER_STATUS.SCORE_CAPTURED,
    score,
    evidenceStatus,
    threshold,
    goToMarketAllowed,
    marketExposureAllowed: goToMarketAllowed,
    gateType: 'HARD',
    requiredStatus: REQUIRED_MARKET_STATUS,
    correctiveDispatch: goToMarketAllowed
      ? null
      : buildCorrectiveDispatch({
          target,
          builderPlatform,
          score,
          threshold,
          reason: !verified
            ? `verification_status_required:${evidenceStatus ?? 'missing'}!=${REQUIRED_MARKET_STATUS}`
            : undefined,
        }),
    scorerDetection: detection,
    rawResult: result ?? null,
  });
}
