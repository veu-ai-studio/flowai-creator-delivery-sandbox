import { generateBase44BatchPlan } from './base44BatchPlanGenerator.js';
import { buildBuildTemplate, BUILD_STEP_ID } from './buildTemplate.js';
import { BUILD_BLOCKED, scoreBuildStep, hasMinimumBuildDirectiveFromDesign } from './buildStepScorer.js';
import { selectForgeStepTool } from './toolSelection.js';
import { dispatch as orchestraDispatch } from '../orchestra/index.js';
import { MODES } from '../tools/ToolIntelligenceService.js';
import { DISPATCH_STATES, normalizeToolCandidate } from '../tools/toolDispatchContract.js';

const NO_BUILD_TOOL_REASON = 'No AI build tool configured; manual input required';
const P2_MAX_DISPATCHES_PER_RUN = 12;
const CLAUDE_SONNET_4_6_INPUT_USD_PER_MILLION = 3;
const CLAUDE_SONNET_4_6_OUTPUT_USD_PER_MILLION = 15;
const APPROVED_MUTATION_SANDBOXES = new Set([
  'veu-ai-studio/flowai-build-execution-sandbox',
  'veu-ai-studio/flowai-deploy-execution-sandbox',
]);

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

function isAutomaticToolSelection(toolSelection) {
  return toolSelection?.mode === MODES.AUTOMATIC;
}

function shouldShortCircuitToolSelection(toolSelection) {
  return toolSelection && !isAutomaticToolSelection(toolSelection);
}

function assertSelectedBuildMemberReady(buildTool, env = process.env) {
  const selected = normalizeToolCandidate(buildTool, { env });
  if (!selected?.memberId) {
    throw new Error('P2 live execution STOP: selected Build tool is not an admitted Orchestra member');
  }
  if (selected.dispatchState !== DISPATCH_STATES.CALLABLE) {
    const missing = Object.entries(selected.credentialStatus ?? {})
      .filter(([, status]) => status === 'MISSING')
      .map(([name]) => name);
    const missingSuffix = missing.length > 0 ? ` Missing credentials: ${missing.join(', ')}.` : '';
    throw new Error(`P2 live execution STOP: selected Build member "${selected.memberId}" is not callable. ${selected.dispatchReason}${missingSuffix}`);
  }
  return selected.memberId;
}

function usageCostUsd(data = {}) {
  const usage = data.usage ?? {};
  const inputTokens = Number(usage.input_tokens ?? usage.inputTokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? usage.outputTokens ?? 0);
  return ((inputTokens / 1_000_000) * CLAUDE_SONNET_4_6_INPUT_USD_PER_MILLION) +
    ((outputTokens / 1_000_000) * CLAUDE_SONNET_4_6_OUTPUT_USD_PER_MILLION);
}

function semanticEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0 || value.every(semanticEmpty);
  if (typeof value === 'object') return Object.values(value).every(semanticEmpty);
  return false;
}

function containsPlaceholderText(value) {
  const text = typeof value === 'string'
    ? value
    : value && typeof value === 'object'
      ? JSON.stringify(value)
      : '';
  return /\b(simulated|demo|mock|placeholder)\b/i.test(text);
}

function assertLiveDispatchResult(result, action, expectedMemberId = null) {
  if (!result || result.ok !== true || result.deferred === true) {
    const status = typeof result?.status === 'number' ? ` status=${result.status}` : '';
    if (result?.status === 401 || (typeof result?.status === 'number' && result.status >= 500)) {
      throw new Error(`P2 live execution STOP: ${action} dispatch failed with blocked HTTP${status}`);
    }
    throw new Error(`P2 live execution STOP: ${action} dispatch failed (${result?.error ?? 'unknown error'})`);
  }
  if (semanticEmpty(result.data)) {
    throw new Error(`P2 live execution STOP: ${action} dispatch returned semantically empty output`);
  }
  if (containsPlaceholderText(result.data)) {
    throw new Error(`P2 live execution STOP: ${action} dispatch returned placeholder output`);
  }
  if (expectedMemberId && result.member !== expectedMemberId) {
    throw new Error(`P2 live execution STOP: selected Build member "${expectedMemberId}" but dispatch returned "${result.member ?? 'unknown'}"; fallback is not counted as selected-tool proof`);
  }
  return result;
}

function assertBuildMutationEvidence(evidence, proofRunId) {
  if (!evidence || evidence.ok !== true) {
    throw new Error(`P2 live execution STOP: BuildExecutionWorker mutation failed (${evidence?.error ?? 'missing evidence'})`);
  }
  if (evidence.proofRunId !== proofRunId) {
    throw new Error('P2 live execution STOP: BuildExecutionWorker proofRunId mismatch');
  }
  if (!evidence.sandbox?.approved || !APPROVED_MUTATION_SANDBOXES.has(evidence.sandbox?.fullName)) {
    throw new Error('P2 live execution STOP: BuildExecutionWorker mutation target is not the approved sandbox');
  }
  if (typeof evidence.commitSha !== 'string' || evidence.commitSha.trim().length === 0) {
    throw new Error('P2 live execution STOP: BuildExecutionWorker did not return a sandbox commit SHA');
  }
  if (evidence.kind === 'DEPLOY_CHAIN') {
    if (evidence.mutatedFilePath !== 'src/App.jsx') {
      throw new Error('P2 live execution STOP: DeployChain did not commit the selected app file');
    }
    if (typeof evidence.deployedUrl !== 'string' || !evidence.deployedUrl.startsWith('https://')) {
      throw new Error('P2 live execution STOP: DeployChain did not return a deployed URL');
    }
    if (evidence.browserVerification?.renderedDomTextContainsExpectedText !== true) {
      throw new Error('P2 live execution STOP: DeployChain did not verify rendered DOM output');
    }
    return evidence;
  }
  if (typeof evidence.mutatedFilePath !== 'string' || !evidence.mutatedFilePath.includes(proofRunId)) {
    throw new Error('P2 live execution STOP: BuildExecutionWorker mutated file path does not carry proofRunId');
  }
  return evidence;
}

function ensureBudget(budget) {
  if (budget.dispatchCount > P2_MAX_DISPATCHES_PER_RUN) {
    throw new Error(`P2 live execution STOP: dispatch count exceeded ${P2_MAX_DISPATCHES_PER_RUN}`);
  }
  if (budget.costUsd > 5) {
    throw new Error('P2 live execution STOP: derived cost exceeded $5 P2 soft cap');
  }
}

async function runLiveBuildTasks(tasks, designOutput, budget, dispatchFn, config, selectedMemberId, buildTool, toolSelection, productId) {
  if (!Array.isArray(tasks)) return tasks;
  if (typeof config.sourceContent !== 'string' || config.sourceContent.trim().length === 0 || containsPlaceholderText(config.sourceContent)) {
    throw new Error('P2 live execution STOP: real sourceContent is required for live build code-patch');
  }
  if (typeof config.mutationExecutor === 'function' && (typeof config.proofRunId !== 'string' || config.proofRunId.trim().length === 0)) {
    throw new Error('P2 live execution STOP: proofRunId is required before BuildExecutionWorker mutation');
  }
  const liveTasks = [];
  for (const task of tasks) {
    budget.dispatchCount += 1;
    ensureBudget(budget);
    const result = assertLiveDispatchResult(await dispatchFn('code-patch', {
      filePath: config.targetFilePath ?? 'src/App.jsx',
      sourceContent: config.sourceContent,
      timeoutMs: 30000,
      framework: config.framework ?? 'vite-react',
      issueSpec: {
        category: 'flowai-build-task',
        severity: 'medium',
        evidence: task.description,
        fixSpec: {
          taskId: task.taskId,
          title: task.title,
          designOutput,
        },
      },
    }, { memberId: selectedMemberId }), 'code-patch', selectedMemberId);
    budget.costUsd += usageCostUsd(result.data);
    ensureBudget(budget);
    const selectedToolOutput = result.data.patchedContent;
    const sandboxMutation = typeof config.mutationExecutor === 'function'
      ? assertBuildMutationEvidence(await config.mutationExecutor({
        proofRunId: config.proofRunId,
        buildRequestId: config.buildRequestId ?? config.runId ?? null,
        productId,
        runId: config.runId ?? null,
        task,
        targetFilePath: result.data.filePath ?? config.targetFilePath ?? 'src/App.jsx',
        selectedTool: buildTool,
        selectedMemberId,
        toolSelection,
        dispatchResult: result,
        selectedToolOutput,
      }), config.proofRunId)
      : null;
    liveTasks.push(Object.freeze({
      ...task,
      complete: true,
      verified: true,
      action: result.action,
      member: result.member,
      evidenceRef: result.data.filePath ?? config.targetFilePath ?? 'src/App.jsx',
      rationale: result.data.rationale,
      patchedContentPresent: typeof result.data.patchedContent === 'string' && result.data.patchedContent.trim().length > 0,
      buildToolStatus: sandboxMutation ? 'LIVE_BUILD_TOOL_DISPATCHED_AND_MUTATED' : 'LIVE_BUILD_TOOL_DISPATCHED',
      sandboxMutation: sandboxMutation ? Object.freeze(sandboxMutation) : null,
    }));
  }
  return Object.freeze(liveTasks);
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
  const generatedCodeTaskDispatches = generateCodeTaskDispatches(designOutput, entryPath, buildTool);
  const liveDispatch = toolSelection && isAutomaticToolSelection(toolSelection) && entryPath.path !== 'BUILD_BLOCKED';
  const shortCircuit = shouldShortCircuitToolSelection(toolSelection);
  const dispatchFn = config.dispatch ?? orchestraDispatch;
  const budget = { dispatchCount: 0, costUsd: 0 };
  const selectedMemberId = liveDispatch ? assertSelectedBuildMemberReady(buildTool, config.env ?? process.env) : null;
  const codeTaskDispatches = liveDispatch
    ? await runLiveBuildTasks(generatedCodeTaskDispatches, designOutput, budget, dispatchFn, config, selectedMemberId, buildTool, toolSelection, productId)
    : shortCircuit && Array.isArray(generatedCodeTaskDispatches)
      ? Object.freeze(generatedCodeTaskDispatches.map(task => Object.freeze({
        ...task,
        complete: false,
        verified: false,
        reason: 'tool selection requires operator action before live dispatch',
      })))
      : generatedCodeTaskDispatches;
  const batchPlan = generateBase44BatchPlan(config.auditData, { productId });
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
  const sandboxMutations = Array.isArray(codeTaskDispatches)
    ? codeTaskDispatches.map(task => task?.sandboxMutation).filter(Boolean)
    : [];
  const firstMutation = sandboxMutations[0] ?? null;

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
      liveDispatches: budget.dispatchCount,
      sandboxMutations: sandboxMutations.length,
      sandboxCommitSha: firstMutation?.commitSha ?? null,
      deployChainUrl: firstMutation?.deployedUrl ?? null,
      deploymentId: firstMutation?.deploymentId ?? null,
      deploymentProjectName: firstMutation?.deploymentProjectName ?? null,
      deploymentTarget: firstMutation?.deploymentTarget ?? null,
      mutationKind: firstMutation?.kind ?? null,
      estimatedCostUsd: Math.round(budget.costUsd * 1_000_000) / 1_000_000,
    }),
    matrixArtifactVersion: String(designOutput.matrixArtifactVersion ?? 'unknown'),
  });
}

export const __test = Object.freeze({
  decisionLogInput,
  deriveBuildRisks,
  detectBuildEntryPath,
  generateCodeTaskDispatches,
  assertSelectedBuildMemberReady,
  selectBuildTool,
});
