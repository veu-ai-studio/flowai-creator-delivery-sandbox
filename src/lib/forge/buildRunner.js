import { generateSAIGEBatchPlan } from './base44BatchPlanGenerator.js';
import { buildBuildTemplate, BUILD_STEP_ID } from './buildTemplate.js';
import { BUILD_BLOCKED, scoreBuildStep, hasMinimumBuildDirectiveFromDesign } from './buildStepScorer.js';
import { selectForgeStepTool } from './toolSelection.js';

const NO_BUILD_TOOL_REASON = 'No AI build tool configured; manual input required';

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

function decisionLogInput(manualInputs) {
  const value = manualInputs?.['build-decision-log'];
  if (Array.isArray(value)) return value.filter(item => stringifyInput(item).trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
}

export function detectBuildEntryPath(designOutput = {}) {
  if (hasMinimumBuildDirectiveFromDesign(designOutput)) {
    return Object.freeze({
      path: 'PATH_A',
      label: 'Build authorized via Victor directive',
      reason: 'MINIMUM BUILD DIRECTIVE found in design decision-log.',
    });
  }

  if (designOutput.readyForBuild === true) {
    return Object.freeze({
      path: 'PATH_B',
      label: 'Build authorized via complete design',
      reason: 'Design output reports readyForBuild true.',
    });
  }

  return Object.freeze({
    path: 'BUILD_BLOCKED',
    flag: BUILD_BLOCKED,
    reason: 'Neither PATH_A nor PATH_B conditions met. Add MINIMUM BUILD DIRECTIVE to design decision-log or configure AI design tool.',
    action: 'Visit /forge/design to unlock',
  });
}

function toolRankScore(tool) {
  const performanceScore = Number(tool?.performanceScore ?? tool?.performance ?? 0);
  const costPerQuery = Number(tool?.costPerQuery ?? Number.POSITIVE_INFINITY);
  const availability = tool?.available === false ? 0 : 1;
  if (!availability || !Number.isFinite(costPerQuery)) return Number.NEGATIVE_INFINITY;
  return (performanceScore * 100) - costPerQuery;
}

export function selectBuildTool(availableTools = []) {
  const tools = Array.isArray(availableTools) ? availableTools : [];
  const ranked = tools
    .map(tool => ({ tool, rankScore: toolRankScore(tool) }))
    .filter(item => item.rankScore > Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.rankScore - a.rankScore);

  if (ranked.length === 0) {
    return Object.freeze({
      verified: false,
      reason: NO_BUILD_TOOL_REASON,
    });
  }

  const selected = ranked[0].tool;
  const toolName = selected.toolName ?? selected.name ?? selected.toolId ?? selected.id;
  return Object.freeze({
    toolId: selected.toolId ?? selected.id,
    toolName,
    rankScore: ranked[0].rankScore,
    costPerQuery: Number(selected.costPerQuery ?? 0),
    selectionReason: `${toolName} selected for highest available performance/cost rank.`,
  });
}

function designDecisionText(designOutput) {
  return (sectionById(designOutput, 'design-decision-log')?.input ?? []).join('\n');
}

function designSectionInput(designOutput, id) {
  return sectionById(designOutput, id)?.input;
}

export function generateCodeTaskDispatches(designOutput = {}, entryPath = detectBuildEntryPath(designOutput), buildTool = selectBuildTool()) {
  if (entryPath.path === 'BUILD_BLOCKED') {
    return Object.freeze({
      complete: false,
      verified: false,
      reason: 'Build blocked; code task dispatches not generated',
    });
  }

  const sourceText = entryPath.path === 'PATH_A'
    ? designDecisionText(designOutput)
    : `${stringifyInput(designSectionInput(designOutput, 'feature-priorities'))}\n${stringifyInput(designSectionInput(designOutput, 'technical-requirements'))}`;

  const task = Object.freeze({
    taskId: `${entryPath.path.toLowerCase()}-build-task-001`,
    title: entryPath.path === 'PATH_A' ? 'Implement Victor minimum build directive' : 'Implement complete design output',
    description: sourceText || entryPath.reason,
    priority: 'P0',
    estimatedComplexity: 'medium',
    targetFiles: Object.freeze([]),
    acceptanceCriteria: Object.freeze([
      'Implement only after branch/audit authorization',
      'Do not touch platform client boundary or runtime files',
      'Produce browser-verifiable evidence before marking complete',
    ]),
    buildToolStatus: buildTool.verified === false ? 'HONEST_STUB_NO_BUILD_TOOL' : 'BUILD_TOOL_SELECTED',
    buildTool,
  });

  return Object.freeze([task]);
}

function normalizeToolSelection(toolSelection) {
  if (!toolSelection) return null;
  return Object.freeze({
    ...toolSelection,
    underservedFirstApplied: toolSelection.underservedFirstApplied ?? toolSelection.undServedFirstApplied,
  });
}

function firstPipelineTool(toolSelection) {
  const selection = toolSelection?.selection;
  if (Array.isArray(selection)) return selection.find(Boolean) ?? null;
  return selection ?? null;
}

function deriveBuildRisks(designOutput) {
  const designGaps = sectionById(designOutput, 'design-gaps')?.input ?? [];
  const gaps = Array.isArray(designGaps) ? designGaps : [];
  if (gaps.length === 0) {
    return Object.freeze([Object.freeze({
      riskId: 'no-design-gaps-recorded',
      risk: 'No design gaps were recorded; verify this is expected before implementation.',
      severity: 'medium',
    })]);
  }

  return Object.freeze(gaps.map((gap, index) => Object.freeze({
    riskId: `design-gap-${index + 1}`,
    sourceSectionId: gap.sectionId,
    risk: gap.downstreamRisk ?? gap.gap ?? stringifyInput(gap),
    severity: gap.sectionId === 'technical-requirements' ? 'high' : 'medium',
  })));
}

export async function runBuild(productId, designOutput = {}, manualInputs = {}, config = {}) {
  const template = buildBuildTemplate(productId, designOutput);
  const entryPath = detectBuildEntryPath(designOutput);
  const toolSelection = normalizeToolSelection(await selectForgeStepTool({
    service: config.toolService,
    stepKey: 'build',
    productId,
    mode: config.toolIntelligenceMode,
    runId: config.runId,
    coldStore: config.coldStore,
    undServedFirstEnforce: true,
    pipelineSubSteps: ['plan', 'scaffold', 'install', 'test'],
  }));
  const buildTool = firstPipelineTool(toolSelection) ?? selectBuildTool(config.availableTools ?? []);
  const codeTaskDispatches = generateCodeTaskDispatches(designOutput, entryPath, buildTool);
  const batchPlan = generateSAIGEBatchPlan(config.saigeAuditData);
  const buildRisks = deriveBuildRisks(designOutput);
  const sections = template.sections.map(section => {
    if (section.id === 'build-entry-path') return cloneSection(section, entryPath);
    if (section.id === 'code-task-dispatches') return cloneSection(section, codeTaskDispatches);
    if (section.id === 'base44-stub-deletions') return cloneSection(section, batchPlan.stubDeletions ?? batchPlan);
    if (section.id === 'base44-functionalization') return cloneSection(section, batchPlan.functionalizationPlan ?? batchPlan);
    if (section.id === 'build-risks') return cloneSection(section, buildRisks);
    if (section.id === 'build-decision-log') return cloneSection(section, decisionLogInput(manualInputs));
    if (section.id === 'selected-tool') return cloneSection(section, toolSelection);
    return cloneSection(section, section.input ?? null);
  });
  const scorableSections = sections.filter(section => section.id !== 'selected-tool');
  const score = scoreBuildStep({ stepId: BUILD_STEP_ID, sections: scorableSections });

  return Object.freeze({
    productId,
    stepId: BUILD_STEP_ID,
    completedAt: new Date().toISOString(),
    sections: Object.freeze(sections),
    toolSelection,
    pipelineNullAt: toolSelection?.pipelineNullAt,
    undServedAccessWarning: toolSelection?.undServedAccessWarning === true,
    undServedAccessWarningReason: toolSelection?.undServedAccessWarningReason,
    entryPath,
    codeTaskDispatches,
    base44BatchPlan: batchPlan,
    buildScore: score.buildScore,
    buildComplete: score.buildComplete,
    readyForQualityAudit: score.readyForQualityAudit,
    flag: score.flag,
    evidenceSummary: Object.freeze({
      codeTaskDispatchesStatus: Array.isArray(codeTaskDispatches) ? 'POPULATED' : 'STUB',
      base44BatchPlanStatus: batchPlan.status,
      buildRisks: buildRisks.length,
      stubDeletions: batchPlan.stubDeletions?.length ?? 0,
      functionalizationTargets: batchPlan.functionalizationPlan?.length ?? 0,
    }),
    matrixArtifactVersion: String(designOutput.matrixArtifactVersion ?? 'unknown'),
  });
}

export const __test = Object.freeze({
  decisionLogInput,
  deriveBuildRisks,
  detectBuildEntryPath,
  generateCodeTaskDispatches,
  selectBuildTool,
});
