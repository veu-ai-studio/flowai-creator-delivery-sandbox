import { buildMonitorTemplate, MONITOR_STEP_ID } from './monitorTemplate.js';
import { scoreMonitorStep } from './monitorStepScorer.js';
import { invokeForgeStepOwner } from './stepOwnerRecommendations.js';

function cloneSection(section, input) {
  return Object.freeze({ ...section, input });
}

function normalizeTarget(context = {}) {
  const outputUrl = context.outputUrl ?? context.deployOutput?.outputUrl ?? context.gtmOutput?.context?.deployOutput?.outputUrl ?? null;
  return {
    outputUrl,
    deploymentId: context.deploymentId ?? context.deployOutput?.deploymentId ?? null,
    targetClass: context.targetClass ?? 'web',
    ready: typeof outputUrl === 'string' && outputUrl.length > 0,
    reason: outputUrl ? 'deployed URL available for monitoring' : 'no deployed URL available',
  };
}

async function runLiveCheck(target, config = {}) {
  if (!target.ready) return { checked: false, status: 'unavailable', reason: 'no monitor target' };
  if (typeof config.monitorAdapter !== 'function') {
    return { checked: false, status: 'unavailable', reason: 'monitorAdapter not configured' };
  }
  const result = await config.monitorAdapter({ outputUrl: target.outputUrl, target, config });
  return {
    checked: true,
    status: result?.status ?? (result?.ok === true ? 'healthy' : 'unhealthy'),
    statusCode: result?.statusCode ?? null,
    latencyMs: result?.latencyMs ?? null,
    evidence: result?.evidence ?? null,
    checkedAt: result?.checkedAt ?? new Date().toISOString(),
  };
}

function regressionSignal(liveCheck = {}, context = {}) {
  const failed = liveCheck.checked === true && liveCheck.status !== 'healthy';
  const driftSignals = Array.isArray(context.driftSignals) ? context.driftSignals : [];
  return {
    assessed: liveCheck.checked === true,
    regressionDetected: failed || driftSignals.length > 0,
    driftSignals,
    reason: failed ? 'live health check not healthy' : driftSignals.length ? 'behavior drift signals present' : 'no regression signal observed',
  };
}

function storeReviewStatus(context = {}) {
  const status = context.storeReviewStatus ?? context.distribution?.postReviewStatus ?? 'not_applicable';
  return {
    tracked: true,
    status,
    source: context.storeReviewStatus ? 'distribution-adapter' : 'monitor-default',
  };
}

function renewalTrigger(regression = {}, liveCheck = {}) {
  const shouldRenew = regression.regressionDetected === true || liveCheck.status === 'unhealthy';
  return {
    recommendation: shouldRenew ? 'self-renewal' : 'none',
    reason: shouldRenew ? regression.reason : 'monitor evidence does not require renewal',
  };
}

export async function runMonitor(productId, context = {}, manualInputs = {}, config = {}) {
  const template = buildMonitorTemplate(productId, context);
  const target = normalizeTarget(context);
  const liveCheck = await runLiveCheck(target, config);
  const regression = regressionSignal(liveCheck, context);
  const store = storeReviewStatus(context);
  const renewal = renewalTrigger(regression, liveCheck);

  const sections = template.sections.map(section => {
    if (section.id === 'monitor-target') return cloneSection(section, target);
    if (section.id === 'monitor-live-check') return cloneSection(section, liveCheck);
    if (section.id === 'monitor-regression-signal') return cloneSection(section, regression);
    if (section.id === 'monitor-store-review-status') return cloneSection(section, store);
    if (section.id === 'monitor-renewal-trigger') return cloneSection(section, renewal);
    return cloneSection(section, section.input ?? null);
  });

  const baseOutput = {
    productId,
    stepId: MONITOR_STEP_ID,
    completedAt: new Date().toISOString(),
    context,
    sections,
    target,
    liveCheck,
    regression,
    storeReviewStatus: store,
    renewalTrigger: renewal,
  };
  const score = scoreMonitorStep(baseOutput);
  const stepOwnerRecommendation = await invokeForgeStepOwner(config, 'monitor', {
    productId,
    stepInputs: baseOutput,
  });
  return Object.freeze({
    ...baseOutput,
    sections: Object.freeze(sections),
    monitorScore: score.monitorScore,
    monitorComplete: score.monitorComplete,
    loopClosed: score.loopClosed,
    flag: score.flag,
    correctivePrompts: score.correctivePrompts,
    stepOwnerRecommendation,
  });
}

export const __test = Object.freeze({
  normalizeTarget,
  regressionSignal,
  storeReviewStatus,
  renewalTrigger,
});
