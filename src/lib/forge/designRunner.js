import { buildDesignTemplate, DESIGN_STEP_ID } from './designTemplate.js';
import { scoreDesignStep } from './designStepScorer.js';
import { selectForgeStepTool } from './toolSelection.js';

const NO_DESIGN_TOOL_REASON = 'No AI design tool configured; manual input required';

function cloneSection(section, input) {
  return Object.freeze({ ...section, input });
}

function sectionById(output, id) {
  return (output?.sections ?? []).find(section => section.id === id);
}

function stringifyInput(value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value ?? null);
}

function currentStateFrom(researchOutput) {
  return sectionById(researchOutput, 'current-state')?.input ?? {};
}

function targetCustomerFrom(researchOutput) {
  return sectionById(researchOutput, 'target-customer')?.input ?? 'target customers';
}

function deriveDesignPrinciples(researchOutput) {
  const currentState = currentStateFrom(researchOutput);
  const targetCustomer = targetCustomerFrom(researchOutput);
  const strengths = currentState.strengths ?? [];
  const gaps = currentState.gapCandidates ?? [];
  return Object.freeze({
    summary: `Design for ${targetCustomer} addressing ${gaps.length} verified gaps with ${strengths.length} current strengths as foundation.`,
    targetCustomer,
    currentStrengths: strengths,
    verifiedGaps: gaps,
  });
}

function researchStubSections(researchOutput) {
  return (researchOutput?.sections ?? []).filter(section =>
    section.source === 'orchestrated' &&
    section.input &&
    typeof section.input === 'object' &&
    section.input.verified === false
  );
}

function deriveDesignGaps(researchOutput) {
  const gaps = researchStubSections(researchOutput).map(section => Object.freeze({
    sectionId: section.id,
    gap: `Gap: ${section.id} research incomplete - downstream design may be incomplete.`,
    downstreamRisk: `${section.label} remains unresolved for Step 3 Build.`,
  }));

  if (gaps.length === 0) {
    return Object.freeze([Object.freeze({
      sectionId: 'none',
      gap: 'No incomplete orchestrated research sections detected.',
      downstreamRisk: 'No research-stub risk carried into design.',
    })]);
  }

  return Object.freeze(gaps);
}

function toolRankScore(tool) {
  const performanceScore = Number(tool?.performanceScore ?? tool?.performance ?? 0);
  const costPerQuery = Number(tool?.costPerQuery ?? Number.POSITIVE_INFINITY);
  const availability = tool?.available === false ? 0 : 1;
  if (!availability || !Number.isFinite(costPerQuery)) return Number.NEGATIVE_INFINITY;
  return (performanceScore * 100) - costPerQuery;
}

export function selectDesignTool(availableTools = []) {
  const tools = Array.isArray(availableTools) ? availableTools : [];
  const ranked = tools
    .map(tool => ({ tool, rankScore: toolRankScore(tool) }))
    .filter(item => item.rankScore > Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.rankScore - a.rankScore);

  if (ranked.length === 0) {
    return Object.freeze({
      verified: false,
      reason: NO_DESIGN_TOOL_REASON,
    });
  }

  const selected = ranked[0].tool;
  const costPerQuery = Number(selected.costPerQuery ?? 0);
  const performanceScore = Number(selected.performanceScore ?? selected.performance ?? 0);
  const toolName = selected.toolName ?? selected.name ?? selected.toolId ?? selected.id;

  return Object.freeze({
    toolId: selected.toolId ?? selected.id,
    toolName,
    rankScore: ranked[0].rankScore,
    costPerQuery,
    selectionReason: `${toolName} selected for highest available performance/cost rank (performance ${performanceScore}, cost per query ${costPerQuery}).`,
  });
}

function orchestratedInputFor(section, manualInputs, selectedTool) {
  const value = manualInputs?.[section.id];
  if (value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')) return value;

  if (!selectedTool || selectedTool.verified === false) {
    return Object.freeze({
      complete: false,
      verified: false,
      reason: NO_DESIGN_TOOL_REASON,
      sectionId: section.id,
    });
  }

  return Object.freeze({
    complete: false,
    reason: 'orchestrated design output required',
    sectionId: section.id,
    selectedTool: selectedTool.toolId,
  });
}

function decisionLogInput(manualInputs) {
  const value = manualInputs?.['design-decision-log'];
  if (Array.isArray(value)) return value.filter(item => stringifyInput(item).trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
}

export async function runDesign(productId, researchOutput = {}, manualInputs = {}, config = {}) {
  const template = buildDesignTemplate(productId, researchOutput);
  const toolSelection = await selectForgeStepTool({
    service: config.toolService,
    stepKey: 'design',
    productId,
    mode: config.toolIntelligenceMode,
    runId: config.runId,
    coldStore: config.coldStore,
    undServedFirstEnforce: true,
  });
  const selectedTool = toolSelection?.selection ?? selectDesignTool(config.availableTools ?? []);
  const sections = template.sections.map(section => {
    if (section.id === 'design-principles') return cloneSection(section, deriveDesignPrinciples(researchOutput));
    if (section.id === 'design-gaps') return cloneSection(section, deriveDesignGaps(researchOutput));
    if (section.id === 'design-decision-log') return cloneSection(section, decisionLogInput(manualInputs));
    if (section.id === 'selected-tool') return cloneSection(section, toolSelection);
    if (section.source === 'orchestrated') return cloneSection(section, orchestratedInputFor(section, manualInputs, selectedTool));
    return cloneSection(section, section.input ?? null);
  });
  const scorableSections = sections.filter(section => section.id !== 'selected-tool');
  const score = scoreDesignStep({ stepId: DESIGN_STEP_ID, sections: scorableSections });

  return Object.freeze({
    productId,
    stepId: DESIGN_STEP_ID,
    completedAt: new Date().toISOString(),
    sections: Object.freeze(sections),
    toolSelection,
    undServedAccessWarning: toolSelection?.undServedAccessWarning === true,
    undServedAccessWarningReason: toolSelection?.undServedAccessWarningReason,
    designScore: score.designScore,
    designComplete: score.designComplete,
    readyForBuild: score.readyForBuild,
    flag: score.flag,
    partialFlag: score.partialFlag,
    minimumBuildDirectivePresent: score.minimumBuildDirectivePresent,
    evidenceSummary: Object.freeze({
      autoSections: sections.filter(section => section.source === 'auto').length,
      orchestratedSections: sections.filter(section => section.source === 'orchestrated').length,
      derivedSections: sections.filter(section => section.source === 'derived').length,
      manualSections: sections.filter(section => section.source === 'manual').length,
      researchGaps: deriveDesignGaps(researchOutput).length,
    }),
    matrixArtifactVersion: String(researchOutput.matrixArtifactVersion ?? 'unknown'),
  });
}

export const __test = Object.freeze({
  decisionLogInput,
  deriveDesignGaps,
  deriveDesignPrinciples,
  orchestratedInputFor,
  researchStubSections,
  selectDesignTool,
});
