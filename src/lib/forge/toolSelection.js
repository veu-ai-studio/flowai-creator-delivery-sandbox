import { TOOL_REGISTRY } from '../toolRegistry.js';
import { MODES, selectToolForStep } from '../tools/ToolIntelligenceService.js';

const SERVICE_TARGET_CLASS = 'generic_url';
const UNDERSERVED_METADATA_TARGET = 'underserved_market';
const PIPELINE_STEPS = new Set(['build', 'qa_audit']);
const BASE44_TIE_BREAK_STEPS = new Set(['build', 'qa_audit']);
const LOW_RESOURCE_PATTERN = /low[-\s]?bandwidth|lightweight|low[-\s]?resource/i;

function selectionModeFor(stepKey) {
  return PIPELINE_STEPS.has(stepKey) ? 'pipeline' : 'single';
}

function registryFor(candidate) {
  const name = candidate?.platform_name ?? candidate?.name;
  return TOOL_REGISTRY.find(tool => tool.name === name) ?? null;
}

function accessibilityScore(tool, warnings, name) {
  if (!tool || tool.africa_available == null) {
    warnings.push(name);
    return 0;
  }
  if (tool.africa_available === 'yes') return 1;
  if (tool.africa_available === 'limited') return 0.5;
  return 0;
}

function costScore(tool, warnings, name) {
  if (!tool || tool.cost_tier == null) {
    warnings.push(name);
    return 0;
  }
  if (tool.cost_tier === 'free') return 1;
  if (tool.cost_tier === 'freemium') return 0.5;
  return 0;
}

function resourceScore(tool) {
  if (!tool) return 0;
  const tags = Array.isArray(tool.tags) ? tool.tags.join(' ') : '';
  return LOW_RESOURCE_PATTERN.test(`${tags} ${tool.description ?? ''}`) ? 1 : 0;
}

function base44TieBreak(tool) {
  if (tool?.base44_compatible === 'native') return 0.5;
  if (tool?.base44_compatible === 'api') return 0.25;
  return 0;
}

function normalizedCandidates(selection) {
  if (Array.isArray(selection)) return selection;
  if (selection == null) return [];
  return [selection];
}

function compareWeighted(stepKey) {
  return (a, b) => {
    if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
    if (BASE44_TIE_BREAK_STEPS.has(stepKey)) return b.base44TieBreakScore - a.base44TieBreakScore;
    return (a.rank ?? 999) - (b.rank ?? 999);
  };
}

export function applyUndServedFirstWeighting(tools = [], opts = {}) {
  const stepKey = opts.stepKey ?? null;
  const dataGapWarnings = [];
  const weighted = (Array.isArray(tools) ? tools : []).map(candidate => {
    if (candidate == null) return null;
    const registryEntry = candidate.registryEntry ?? registryFor(candidate);
    const name = candidate.platform_name ?? candidate.name ?? 'UNKNOWN_TOOL';
    const toolWarnings = [];
    const underservedAccessibilityScore = accessibilityScore(registryEntry, toolWarnings, name);
    const affordabilityScore = costScore(registryEntry, toolWarnings, name);
    const lowResourceScore = resourceScore(registryEntry);
    const performanceScore = Number(candidate.performance_score ?? registryEntry?.performance_score ?? 0);
    const compositeScore = Math.round((
      (performanceScore * 0.50) +
      (underservedAccessibilityScore * 10 * 0.25) +
      (affordabilityScore * 10 * 0.15) +
      (lowResourceScore * 10 * 0.10)
    ) * 100) / 100;
    const uniqueWarnings = [...new Set(toolWarnings)];
    dataGapWarnings.push(...uniqueWarnings);

    return Object.freeze({
      ...candidate,
      registryEntry: registryEntry ? Object.freeze({ ...registryEntry }) : null,
      metadataStatus: registryEntry ? 'REGISTRY_METADATA_FOUND' : 'MISSING_REGISTRY_METADATA',
      dataGapWarning: uniqueWarnings.length > 0,
      underservedAccessibilityScore,
      costScore: affordabilityScore,
      resourceScore: lowResourceScore,
      compositeScore,
      base44TieBreakScore: base44TieBreak(registryEntry),
      underservedMetadataTarget: UNDERSERVED_METADATA_TARGET,
    });
  });

  const ranked = weighted
    .filter(Boolean)
    .sort(compareWeighted(stepKey));

  Object.defineProperty(ranked, 'dataGapWarnings', {
    value: Object.freeze([...new Set(dataGapWarnings)]),
    enumerable: false,
  });
  return Object.freeze(ranked);
}

function warningFor(ranked) {
  const hasAccessible = ranked.some(tool => tool.underservedAccessibilityScore > 0);
  if (hasAccessible) {
    return {
      tool: ranked.find(candidate => candidate.underservedAccessibilityScore > 0),
      underservedConstraintSatisfied: true,
      undServedAccessWarning: false,
      undServedAccessWarningReason: undefined,
    };
  }

  return {
    tool: ranked[0] ?? null,
    underservedConstraintSatisfied: false,
    undServedAccessWarning: ranked.length > 0,
    undServedAccessWarningReason: ranked.length > 0
      ? 'No underserved-accessible tool in top 5 for this step. Defaulting to best available globally.'
      : undefined,
  };
}

export async function selectForgeStepTool(opts = {}) {
  const {
    service,
    stepKey,
    productId,
    mode = MODES.AUTOMATIC,
    runId,
    coldStore,
    undServedFirstEnforce = true,
  } = opts;

  if (!service || typeof service.getTopTool !== 'function') return null;

  const selectionMode = selectionModeFor(stepKey);
  const requestedMode = mode ?? MODES.AUTOMATIC;
  const serviceMode = requestedMode === MODES.AUTOMATIC ? MODES.GUIDED : requestedMode;
  let raw = null;

  try {
    raw = await selectToolForStep({
      service,
      coldStore,
      runId: runId ?? `${productId ?? 'forge'}-${stepKey ?? 'tool-selection'}`,
      productId,
      stepKey,
      targetClass: SERVICE_TARGET_CLASS,
      modeOverride: serviceMode,
    });
  } catch {
    return null;
  }

  if (!undServedFirstEnforce) {
    return Object.freeze({
      mode: requestedMode,
      selection: raw?.selection ?? null,
      recorded: raw?.recorded === true,
      stepKey,
      selectionMode,
      undServedFirstApplied: false,
      undServedAccessWarning: false,
      underservedConstraintSatisfied: undefined,
      dataGapWarnings: Object.freeze([]),
      targetClass: SERVICE_TARGET_CLASS,
      underservedMetadataTarget: UNDERSERVED_METADATA_TARGET,
    });
  }

  if (requestedMode === MODES.MANUAL) {
    return Object.freeze({
      mode: requestedMode,
      selection: null,
      recorded: raw?.recorded === true,
      stepKey,
      selectionMode,
      undServedFirstApplied: true,
      undServedAccessWarning: false,
      underservedConstraintSatisfied: undefined,
      dataGapWarnings: Object.freeze([]),
      targetClass: SERVICE_TARGET_CLASS,
      underservedMetadataTarget: UNDERSERVED_METADATA_TARGET,
    });
  }

  const rawCandidates = normalizedCandidates(raw?.selection);
  const pipelineNullAt = rawCandidates
    .map((candidate, index) => candidate == null ? index : null)
    .filter(index => index !== null);
  const ranked = applyUndServedFirstWeighting(rawCandidates, { stepKey });
  const warning = warningFor(ranked);
  const selection = selectionMode === 'pipeline'
    ? ranked
    : warning.tool;

  return Object.freeze({
    mode: requestedMode,
    selection,
    recorded: raw?.recorded === true,
    stepKey,
    selectionMode,
    undServedFirstApplied: true,
    undServedAccessWarning: warning.undServedAccessWarning,
    undServedAccessWarningReason: warning.undServedAccessWarningReason,
    underservedConstraintSatisfied: warning.underservedConstraintSatisfied,
    dataGapWarnings: Object.freeze([...(ranked.dataGapWarnings ?? [])]),
    pipelineNullAt: pipelineNullAt.length > 0 ? Object.freeze(pipelineNullAt) : undefined,
    targetClass: SERVICE_TARGET_CLASS,
    underservedMetadataTarget: UNDERSERVED_METADATA_TARGET,
  });
}
