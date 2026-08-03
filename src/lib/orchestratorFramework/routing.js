import {
  FLOWAI_STEPS,
  PLATFORM_CATEGORIES,
  PLATFORM_REGISTRY,
  STATUS_LADDER,
  normalizeRank,
} from './platformRegistry.js';

export const ORCHESTRATION_MODES = Object.freeze({
  AUTO: 'auto',
  GUIDED: 'guided',
  MANUAL: 'manual',
});

export const ORCHESTRATION_MODE_MATURITY = Object.freeze({
  [ORCHESTRATION_MODES.AUTO]: STATUS_LADDER.ENVISIONED,
  [ORCHESTRATION_MODES.GUIDED]: STATUS_LADDER.BUILT,
  [ORCHESTRATION_MODES.MANUAL]: STATUS_LADDER.BUILT,
});

export const STEP_CATEGORY_RULES = Object.freeze({
  Research: Object.freeze([PLATFORM_CATEGORIES.MODEL_PROVIDER]),
  Design: Object.freeze([PLATFORM_CATEGORIES.MODEL_PROVIDER, PLATFORM_CATEGORIES.BUILDER_RUNTIME]),
  Build: Object.freeze([PLATFORM_CATEGORIES.BUILDER_RUNTIME, PLATFORM_CATEGORIES.MODEL_PROVIDER]),
  QualityAudit: Object.freeze([
    PLATFORM_CATEGORIES.MODEL_PROVIDER,
    PLATFORM_CATEGORIES.BUILDER_RUNTIME,
    PLATFORM_CATEGORIES.BACKEND,
  ]),
  Deploy: Object.freeze([PLATFORM_CATEGORIES.INFRASTRUCTURE, PLATFORM_CATEGORIES.BACKEND]),
  SelfRenewal: Object.freeze([PLATFORM_CATEGORIES.MODEL_PROVIDER, PLATFORM_CATEGORIES.BUILDER_RUNTIME]),
  GoToMarket: Object.freeze([PLATFORM_CATEGORIES.MODEL_PROVIDER, PLATFORM_CATEGORIES.INFRASTRUCTURE]),
  Monitor: Object.freeze([
    PLATFORM_CATEGORIES.MODEL_PROVIDER,
    PLATFORM_CATEGORIES.BUILDER_RUNTIME,
    PLATFORM_CATEGORIES.INFRASTRUCTURE,
    PLATFORM_CATEGORIES.BACKEND,
  ]),
});

const DEFAULT_RANKING_CONFIG = Object.freeze({
  costWeight: 0.45,
  performanceWeight: 0.55,
  stepOverrides: Object.freeze({}),
});

function assertStep(step) {
  if (!FLOWAI_STEPS.includes(step)) throw new Error(`Unknown FlowAI step "${step}"`);
}

function rankScore(platform, step, rankingConfig = {}) {
  const config = { ...DEFAULT_RANKING_CONFIG, ...rankingConfig };
  const override = config.stepOverrides?.[step]?.[platform.id] ?? {};
  const costRank = normalizeRank(override.costRank ?? platform.costRank).value ?? 99;
  const performanceRank = normalizeRank(override.performanceRank ?? platform.performanceRank).value ?? 99;
  return (costRank * config.costWeight) + (performanceRank * config.performanceWeight);
}

export function eligiblePlatformsForStep(step, registry = PLATFORM_REGISTRY) {
  assertStep(step);
  const allowedCategories = STEP_CATEGORY_RULES[step] ?? [];
  return registry.filter(platform =>
    platform.stepsServed.includes(step) &&
    allowedCategories.includes(platform.category)
  );
}

export function rankPlatformsForStep(step, registry = PLATFORM_REGISTRY, rankingConfig = {}) {
  return eligiblePlatformsForStep(step, registry)
    .map(platform => ({
      ...platform,
      routingScore: Math.round(rankScore(platform, step, rankingConfig) * 100) / 100,
      why: buildSelectionReason(platform, step, rankingConfig),
    }))
    .sort((a, b) => a.routingScore - b.routingScore || a.label.localeCompare(b.label));
}

export function buildSelectionReason(platform, step, rankingConfig = {}) {
  const config = { ...DEFAULT_RANKING_CONFIG, ...rankingConfig };
  const override = config.stepOverrides?.[step]?.[platform.id] ?? {};
  const costRank = normalizeRank(override.costRank ?? platform.costRank);
  const performanceRank = normalizeRank(override.performanceRank ?? platform.performanceRank);
  const costLabel = costRank.value === null ? 'unknown' : `${costRank.value} (${costRank.certainty})`;
  const performanceLabel = performanceRank.value === null ? 'unknown' : `${performanceRank.value} (${performanceRank.certainty})`;
  return `${platform.label} serves ${step}; cost rank ${costLabel}, performance rank ${performanceLabel}, status ${platform.status}, live calls ${platform.liveEnabled ? 'enabled' : 'stubbed'}.`;
}

/** @param {any} input */
export function selectPlatformForStep({
  step,
  mode,
  registry = PLATFORM_REGISTRY,
  rankingConfig = {},
  userSelection = null,
} = {}) {
  assertStep(step);
  const ranked = rankPlatformsForStep(step, registry, rankingConfig);

  if (mode === ORCHESTRATION_MODES.AUTO) {
    return Object.freeze({
      step,
      mode,
      modeMaturity: ORCHESTRATION_MODE_MATURITY[mode],
      status: ranked[0] ? 'selected' : 'no_eligible_platform',
      selected: ranked[0] ?? null,
      recommendations: Object.freeze(ranked),
      awaitingUserSelection: false,
    });
  }

  if (mode === ORCHESTRATION_MODES.GUIDED) {
    const selected = userSelection ? ranked.find(platform => platform.id === userSelection) ?? null : null;
    return Object.freeze({
      step,
      mode,
      modeMaturity: ORCHESTRATION_MODE_MATURITY[mode],
      status: selected ? 'selected' : 'awaiting_selection',
      selected,
      recommendations: Object.freeze(ranked),
      awaitingUserSelection: !selected,
    });
  }

  if (mode === ORCHESTRATION_MODES.MANUAL) {
    const allForStep = registry.filter(platform => platform.stepsServed.includes(step));
    const selected = userSelection ? allForStep.find(platform => platform.id === userSelection) ?? null : null;
    return Object.freeze({
      step,
      mode,
      modeMaturity: ORCHESTRATION_MODE_MATURITY[mode],
      status: selected ? 'selected' : 'awaiting_selection',
      selected,
      recommendations: Object.freeze(allForStep),
      awaitingUserSelection: !selected,
    });
  }

  throw new Error(`Unknown orchestration mode "${mode}"`);
}

/** @param {any} input */
export function buildOrchestrationPlan({
  mode = ORCHESTRATION_MODES.AUTO,
  registry = PLATFORM_REGISTRY,
  rankingConfig = {},
  selections = {},
  steps = FLOWAI_STEPS,
} = {}) {
  return Object.freeze(steps.map(step => selectPlatformForStep({
    step,
    mode,
    registry,
    rankingConfig,
    userSelection: selections[step] ?? null,
  })));
}

export { DEFAULT_RANKING_CONFIG };
