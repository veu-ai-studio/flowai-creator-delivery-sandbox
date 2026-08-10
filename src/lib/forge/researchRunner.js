import matrixArtifact from '../orchestratorFramework/matrixArtifact.json' with { type: 'json' };
import { buildResearchTemplate, RESEARCH_STEP_ID } from './researchTemplate.js';
import { scoreForgeStep } from './forgeStepScorer.js';
import { selectForgeStepTool } from './toolSelection.js';
import { dispatch as orchestraDispatch } from '../orchestra/index.js';
import { MODES } from '../tools/ToolIntelligenceService.js';
import { invokeForgeStepOwner } from './stepOwnerRecommendations.js';
import { attachAttemptHistory, runRankedToolWithFailover } from './rankedToolFailover.js';
import { normalizeResearchRecoveryToCrawlerReport } from './researchRecoveryAdapters.js';

const NO_RESEARCH_TOOL_REASON = 'No AI research tools configured; manual input required for orchestrated sections';
const P2_MAX_DISPATCHES_PER_RUN = 12;
const CLAUDE_SONNET_4_6_INPUT_USD_PER_MILLION = 3;
const CLAUDE_SONNET_4_6_OUTPUT_USD_PER_MILLION = 15;
const DEFAULT_RESEARCH_TOOL_TIMEOUT_MS = 30_000;
const CANONICAL_ANALYSIS_FALLBACK = Object.freeze({
  rank: 999,
  platform_name: 'Claude Code',
  platform_type: 'analysis',
  performance_score: 9.8,
  target_classes: Object.freeze(['generic_url']),
  fallbackReason: 'canonical-analysis-fallback',
});
const CANONICAL_CRAWL_FALLBACK = Object.freeze({
  rank: 998,
  platform_name: 'Browserless',
  platform_type: 'crawl',
  performance_score: 8.5,
  target_classes: Object.freeze(['generic_url']),
  fallbackReason: 'canonical-crawl-fallback',
});

function cloneSection(section, input) {
  return Object.freeze({ ...section, input });
}

function relevantMatrixEntries(productId, artifact) {
  const layer1 = Array.isArray(artifact?.layer1) ? artifact.layer1 : [];
  const productScoped = layer1.filter(entry =>
    entry.productId === productId ||
    (Array.isArray(entry.productIds) && entry.productIds.includes(productId))
  );

  if (productScoped.length > 0) {
    return {
      entries: productScoped,
      productFilter: 'productId',
      note: `Filtered Layer 1 surfaces for productId ${productId}.`,
    };
  }

  return {
    entries: [],
    productFilter: 'none-applied',
    note: 'productId not in artifact.layer1',
  };
}

function summarizeCurrentState(productId, artifact) {
  const { entries, productFilter, note } = relevantMatrixEntries(productId, artifact);
  const verified = entries.filter(entry => entry.status === 'VERIFIED');
  const partial = entries.filter(entry => entry.status === 'PARTIAL');
  const unverified = entries.filter(entry => !['VERIFIED', 'PARTIAL'].includes(entry.status));

  return Object.freeze({
    entries,
    productFilter,
    note,
    strengths: verified.map(entry => entry.surfaceId),
    gapCandidates: partial.map(entry => entry.surfaceId),
    unknownOrUnverified: unverified.map(entry => entry.surfaceId),
    summary: entries.length === 0 && note === 'productId not in artifact.layer1'
      ? '0 verified, 0 partial, 0 unknown — productId not in artifact.layer1'
      : `${verified.length} verified surfaces, ${partial.length} partial gap candidates, ${unverified.length} unknown/unverified surfaces.`,
  });
}

function manualInputFor(section, manualInputs) {
  if (section.status === 'complete' && section.input !== null && section.input !== undefined) {
    return section.input;
  }

  const value = manualInputs?.[section.id];
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return Object.freeze({
      complete: false,
      reason: 'manual input required',
      sectionId: section.id,
    });
  }
  return value;
}

function researchToolInput(availableTools) {
  return selectResearchTool(availableTools);
}

function productContextForTemplate(productId, config = {}) {
  const productContext = config.productContext ?? {};
  return Object.freeze({
    id: productContext.id ?? config.productId ?? productId,
    name: productContext.name ?? config.productName ?? productId,
    description: productContext.description ?? config.productDescription ?? '',
    platform: productContext.platform ?? config.productPlatform ?? 'unknown',
  });
}

function orchestratedInputFor(section, manualInputs, selectedTool) {
  const value = manualInputs?.[section.id];
  if (value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')) {
    return value;
  }

  if (!selectedTool || selectedTool.verified === false) {
    return Object.freeze({
      complete: false,
      verified: false,
      reason: NO_RESEARCH_TOOL_REASON,
      sectionId: section.id,
    });
  }

  return Object.freeze({
    complete: false,
    reason: 'orchestrated research output required',
    sectionId: section.id,
    selectedTool: selectedTool.toolId,
  });
}

function isAutomaticToolSelection(toolSelection) {
  return toolSelection?.mode === MODES.AUTOMATIC;
}

function shouldShortCircuitToolSelection(toolSelection) {
  return toolSelection && !isAutomaticToolSelection(toolSelection);
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

function assertLiveDispatchResult(result, action) {
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
  return result;
}

function researchUrlFromConfig(config = {}) {
  return config.url ?? config.productUrl ?? config.productContext?.url ?? config.normalizedInput?.url ?? null;
}

function ensureBudget(budget) {
  if (budget.dispatchCount > P2_MAX_DISPATCHES_PER_RUN) {
    throw new Error(`P2 live execution STOP: dispatch count exceeded ${P2_MAX_DISPATCHES_PER_RUN}`);
  }
  if (budget.costUsd > 5) {
    throw new Error('P2 live execution STOP: derived cost exceeded $5 P2 soft cap');
  }
}

function candidateName(candidate) {
  return candidate?.platform_name ?? candidate?.toolName ?? candidate?.name ?? candidate?.memberId ?? null;
}

function candidateExists(candidates, name) {
  return candidates.some(candidate => candidateName(candidate) === name);
}

function appendFallbackCandidate(candidates, fallback) {
  const list = Array.isArray(candidates) ? [...candidates].filter(Boolean) : [];
  return candidateExists(list, fallback.platform_name)
    ? Object.freeze(list)
    : Object.freeze([...list, fallback]);
}

function researchDispatchCandidates(toolSelection, fallback) {
  const base = Array.isArray(toolSelection?.candidates)
    ? toolSelection.candidates
    : toolSelection?.selection
      ? [toolSelection.selection]
      : [];
  return appendFallbackCandidate(base, fallback);
}

function dispatchedAttemptCount(failover) {
  return (failover?.attemptHistory ?? []).filter(attempt =>
    ['timeout', 'failed', 'succeeded'].includes(attempt.state)
  ).length;
}

async function runLiveResearchSection(section, context, budget, dispatchFn, config, failoverEvents) {
  ensureBudget(budget);
  const failover = await runRankedToolWithFailover({
    action: 'analyze',
    payload: {
      prompt: section.prompt,
      context,
    },
    candidates: researchDispatchCandidates(context.toolSelection, CANONICAL_ANALYSIS_FALLBACK),
    dispatchFn,
    timeoutMs: config.toolDispatchTimeoutMs ?? DEFAULT_RESEARCH_TOOL_TIMEOUT_MS,
    env: config.env ?? process.env,
    validateResult: result => assertLiveDispatchResult(result, 'analyze'),
  });
  budget.dispatchCount += dispatchedAttemptCount(failover);
  ensureBudget(budget);
  failoverEvents.push(...failover.attemptHistory);
  const result = failover.result;
  budget.costUsd += usageCostUsd(result.data);
  ensureBudget(budget);
  return Object.freeze({
    complete: true,
    verified: true,
    summary: result.data.summary,
    findings: result.data.findings,
    evidenceRef: result.data.evidenceRef,
    selectedTool: failover.candidate?.platform_name ?? failover.candidate?.toolName ?? context.selectedTool?.platform_name ?? null,
    action: result.action,
    member: result.member,
    attemptHistory: failover.attemptHistory,
  });
}

async function runLiveCrawl(url, budget, dispatchFn, config, toolSelection, failoverEvents) {
  ensureBudget(budget);
  const failover = await runRankedToolWithFailover({
    action: 'crawl',
    payload: { url },
    candidates: researchDispatchCandidates(toolSelection, CANONICAL_CRAWL_FALLBACK),
    dispatchFn,
    timeoutMs: config.toolDispatchTimeoutMs ?? DEFAULT_RESEARCH_TOOL_TIMEOUT_MS,
    env: config.env ?? process.env,
    validateResult: result => assertLiveDispatchResult(result, 'crawl'),
  });
  budget.dispatchCount += dispatchedAttemptCount(failover);
  ensureBudget(budget);
  failoverEvents.push(...failover.attemptHistory);
  const result = failover.result;
  budget.costUsd += usageCostUsd(result.data);
  ensureBudget(budget);
  return Object.freeze({
    complete: true,
    verified: true,
    url,
    action: result.action,
    member: result.member,
    content: result.data,
    selectedTool: failover.candidate?.platform_name ?? null,
    attemptHistory: failover.attemptHistory,
  });
}

function failoverEnvelope(toolSelection, failoverEvents) {
  if (!toolSelection || failoverEvents.length === 0) return toolSelection;
  return attachAttemptHistory(toolSelection, {
    attemptHistory: failoverEvents,
    candidates: researchDispatchCandidates(toolSelection, CANONICAL_ANALYSIS_FALLBACK),
  });
}

function toolRankScore(tool) {
  const performanceScore = Number(tool?.performanceScore ?? tool?.performance ?? 0);
  const costPerQuery = Number(tool?.costPerQuery ?? Number.POSITIVE_INFINITY);
  const availability = tool?.available === false ? 0 : 1;
  if (!availability || !Number.isFinite(costPerQuery)) return Number.NEGATIVE_INFINITY;
  return (performanceScore * 100) - costPerQuery;
}

export function selectResearchTool(availableTools = []) {
  const tools = Array.isArray(availableTools) ? availableTools : [];
  const ranked = tools
    .map(tool => ({ tool, rankScore: toolRankScore(tool) }))
    .filter(item => item.rankScore > Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.rankScore - a.rankScore);

  if (ranked.length === 0) {
    return Object.freeze({
      verified: false,
      reason: NO_RESEARCH_TOOL_REASON,
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

export async function runResearch(productId, manualInputs = {}, config = {}) {
  const artifact = config.matrixArtifact ?? matrixArtifact;
  if (!artifact || !Array.isArray(artifact.layer1)) {
    return Object.freeze({
      complete: false,
      reason: 'matrix artifact unavailable',
      productId,
    });
  }

  const template = buildResearchTemplate(productContextForTemplate(productId, config));
  const populated = [];
  const availableTools = config.availableTools ?? [];
  const toolSelection = await selectForgeStepTool({
    service: config.toolService,
    stepKey: 'research',
    productId,
    mode: config.toolIntelligenceMode,
    runId: config.runId,
    coldStore: config.coldStore,
    undServedFirstEnforce: true,
  });
  let selectedTool = null;
  const liveDispatch = toolSelection && isAutomaticToolSelection(toolSelection);
  const shortCircuit = shouldShortCircuitToolSelection(toolSelection);
  const dispatchFn = config.dispatch ?? orchestraDispatch;
  const budget = { dispatchCount: 0, costUsd: 0 };
  const researchUrl = researchUrlFromConfig(config);
  let crawlResult = null;
  let publicDiscovery = null;
  const failoverEvents = [];

  if (typeof config.publicResearchDiscovery === 'function' && researchUrl) {
    publicDiscovery = await config.publicResearchDiscovery({
      url: researchUrl,
      topic: [config.productName, config.productDescription, productId].filter(Boolean).join(' '),
      minimumSources: 3,
    });
    if (!publicDiscovery?.ok) {
      throw new Error(`RESEARCH_SOURCES_INSUFFICIENT: ${publicDiscovery?.sourceCount ?? 0}/3 attributable public sources`);
    }
    crawlResult = normalizeResearchRecoveryToCrawlerReport(publicDiscovery, { url: researchUrl }, {
      member: 'credential-free-public-discovery',
      evidenceRef: publicDiscovery.kind,
    });
    selectedTool = Object.freeze({
      toolId: 'credential-free-public-discovery',
      toolName: 'Public web multi-source discovery',
      selectionReason: `${publicDiscovery.sourceCount} independently attributed public sources retained.`,
    });
  } else if (liveDispatch && researchUrl) {
    crawlResult = await runLiveCrawl(researchUrl, budget, dispatchFn, config, toolSelection, failoverEvents);
  }

  for (const section of template.sections) {
    if (section.id === 'current-state') {
      populated.push(cloneSection(section, summarizeCurrentState(productId, artifact)));
    } else if (section.id === 'research-tool-selection') {
      selectedTool = selectedTool ?? toolSelection?.selection ?? researchToolInput(availableTools);
      populated.push(cloneSection(section, selectedTool));
    } else if (section.id === 'crawl-result') {
      populated.push(cloneSection(section, crawlResult));
    } else if (section.id === 'selected-tool') {
      populated.push(cloneSection(section, failoverEnvelope(toolSelection, failoverEvents)));
    } else if (section.source === 'manual') {
      populated.push(cloneSection(section, manualInputFor(section, manualInputs)));
    } else if (section.source === 'orchestrated') {
      const manualValue = manualInputs?.[section.id];
      if (manualValue !== undefined && manualValue !== null && !(typeof manualValue === 'string' && manualValue.trim() === '')) {
        populated.push(cloneSection(section, manualValue));
      } else if (publicDiscovery?.ok) {
        populated.push(cloneSection(section, await runLiveResearchSection(section, {
          productId,
          currentState: populated.find(item => item.id === 'current-state')?.input ?? null,
          crawlResult,
          targetCustomer: populated.find(item => item.id === 'target-customer')?.input ?? null,
          selectedTool,
          toolSelection,
          publicDiscovery,
        }, budget, dispatchFn, config, failoverEvents)));
      } else if (shortCircuit) {
        populated.push(cloneSection(section, Object.freeze({
          complete: false,
          verified: false,
          reason: 'tool selection requires operator action before live dispatch',
          toolSelection,
          sectionId: section.id,
        })));
      } else if (liveDispatch) {
        populated.push(cloneSection(section, await runLiveResearchSection(section, {
          productId,
          currentState: populated.find(item => item.id === 'current-state')?.input ?? null,
          crawlResult,
          targetCustomer: populated.find(item => item.id === 'target-customer')?.input ?? null,
          selectedTool,
          toolSelection,
        }, budget, dispatchFn, config, failoverEvents)));
      } else {
        populated.push(cloneSection(section, orchestratedInputFor(section, manualInputs, selectedTool)));
      }
    }
  }

  const scorableSections = populated.filter(section =>
    section.id !== 'selected-tool' &&
    !(section.id === 'crawl-result' && section.input == null)
  );
  const scorer = scoreForgeStep({ stepId: RESEARCH_STEP_ID, sections: scorableSections });
  const manualSections = populated.filter(section => section.source === 'manual');
  const manualComplete = manualSections.every(section => !(section.input && section.input.complete === false));
  const completionPct = scorer.score;
  const baseOutput = {
    productId,
    stepId: RESEARCH_STEP_ID,
    completedAt: new Date().toISOString(),
    sections: Object.freeze(populated),
    toolSelection: failoverEnvelope(toolSelection, failoverEvents),
    undServedAccessWarning: toolSelection?.undServedAccessWarning === true,
    undServedAccessWarningReason: /** @type {any} */ (toolSelection)?.undServedAccessWarningReason,
    completionPct,
    evidenceSummary: Object.freeze({
      autoSections: populated.filter(section => section.source === 'auto').length,
      manualSections: manualSections.length,
      orchestratedSections: populated.filter(section => section.source === 'orchestrated').length,
      derivedSections: populated.filter(section => section.source === 'derived').length,
      allComplete: manualComplete && completionPct === 100,
      liveDispatches: budget.dispatchCount,
      toolAttemptHistory: failoverEvents.length,
      timeoutAttempts: failoverEvents.filter(attempt => attempt.state === 'timeout').length,
      estimatedCostUsd: Math.round(budget.costUsd * 1_000_000) / 1_000_000,
    }),
    matrixArtifactVersion: String(artifact.version ?? 'unknown'),
    readyForDesign: manualComplete && completionPct >= 95,
  };
  const stepOwnerRecommendation = await invokeForgeStepOwner(config, 'research', {
    productId,
    stepInputs: baseOutput,
  });

  return Object.freeze({
    ...baseOutput,
    stepOwnerRecommendation,
  });
}

export const __test = Object.freeze({
  manualInputFor,
  orchestratedInputFor,
  relevantMatrixEntries,
  selectResearchTool,
  summarizeCurrentState,
  productContextForTemplate,
});
