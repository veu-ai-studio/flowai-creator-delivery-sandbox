export const MONITOR_BLOCKED = 'MONITOR_BLOCKED';
export const MONITOR_CHECK_REQUIRED = 'MONITOR_CHECK_REQUIRED';
export const MONITOR_RENEWAL_RECOMMENDED = 'MONITOR_RENEWAL_RECOMMENDED';

function sectionInput(output, id) {
  return output?.sections?.find(section => section.id === id)?.input ?? null;
}

export function scoreMonitorStep(monitorOutput = {}) {
  const target = sectionInput(monitorOutput, 'monitor-target') ?? {};
  const liveCheck = sectionInput(monitorOutput, 'monitor-live-check') ?? {};
  const regression = sectionInput(monitorOutput, 'monitor-regression-signal') ?? {};
  const store = sectionInput(monitorOutput, 'monitor-store-review-status') ?? {};
  const renewal = sectionInput(monitorOutput, 'monitor-renewal-trigger') ?? {};

  const targetPresent = typeof target.outputUrl === 'string' && target.outputUrl.length > 0;
  const liveChecked = liveCheck.checked === true;
  const healthKnown = liveChecked && typeof liveCheck.status === 'string';
  const regressionAssessed = regression.assessed === true;
  const storeTracked = store.tracked === true;
  const renewalDecision = renewal.recommendation === 'none' || renewal.recommendation === 'self-renewal';
  const monitorComplete = targetPresent && liveChecked && healthKnown && regressionAssessed && storeTracked && renewalDecision;

  let flag = null;
  if (!targetPresent) flag = MONITOR_BLOCKED;
  else if (!liveChecked) flag = MONITOR_CHECK_REQUIRED;
  else if (renewal.recommendation === 'self-renewal') flag = MONITOR_RENEWAL_RECOMMENDED;

  const monitorScore = Math.round(([
    targetPresent,
    liveChecked,
    healthKnown,
    regressionAssessed,
    storeTracked,
    renewalDecision,
  ].filter(Boolean).length / 6) * 10000) / 100;

  const correctivePrompts = [];
  if (!targetPresent) correctivePrompts.push('Monitor requires a deployed URL or delivery artifact target.');
  if (!liveChecked) correctivePrompts.push('Monitor cannot report healthy without a real live check.');
  if (!regressionAssessed) correctivePrompts.push('Regression and drift signal must be assessed.');
  if (!storeTracked) correctivePrompts.push('Store-review status must be tracked or marked unavailable.');
  if (renewal.recommendation === 'self-renewal') correctivePrompts.push('Monitor recommends Self-Renewal based on live signal.');

  return Object.freeze({
    stepId: monitorOutput.stepId,
    monitorScore,
    score: monitorScore,
    monitorComplete,
    loopClosed: monitorComplete,
    flag,
    correctivePrompts: Object.freeze(correctivePrompts),
  });
}
