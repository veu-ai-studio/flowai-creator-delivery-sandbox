import matrixArtifact from '../orchestratorFramework/matrixArtifact.json';
import { buildResearchTemplate, RESEARCH_STEP_ID } from './researchTemplate.js';
import { scoreForgeStep } from './forgeStepScorer.js';

const NO_RESEARCH_TOOL_REASON = 'No AI research tools configured; manual input required for orchestrated sections';

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
    entries: layer1,
    productFilter: 'none-applied',
    note: 'All Layer 1 surfaces treated as SAIGE context. productId filtering available in future matrix versions.',
  };
}

function summarizeCurrentState(productId, artifact) {
  const { entries, productFilter, note } = relevantMatrixEntries(productId, artifact);
  const verified = entries.filter(entry => entry.status === 'VERIFIED');
  const partial = entries.filter(entry => entry.status === 'PARTIAL');
  const unverified = entries.filter(entry => !['VERIFIED', 'PARTIAL'].includes(entry.status));

  return Object.freeze({
    productFilter,
    note,
    strengths: verified.map(entry => entry.surfaceId),
    gapCandidates: partial.map(entry => entry.surfaceId),
    unknownOrUnverified: unverified.map(entry => entry.surfaceId),
    summary: `${verified.length} verified surfaces, ${partial.length} partial gap candidates, ${unverified.length} unknown/unverified surfaces.`,
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

export function runResearch(productId, manualInputs = {}, config = {}) {
  const artifact = config.matrixArtifact ?? matrixArtifact;
  if (!artifact || !Array.isArray(artifact.layer1)) {
    return Object.freeze({
      complete: false,
      reason: 'matrix artifact unavailable',
      productId,
    });
  }

  const template = buildResearchTemplate(productId);
  const populated = [];
  const availableTools = config.availableTools ?? [];
  let selectedTool = null;

  for (const section of template.sections) {
    if (section.id === 'current-state') {
      populated.push(cloneSection(section, summarizeCurrentState(productId, artifact)));
    } else if (section.id === 'research-tool-selection') {
      selectedTool = researchToolInput(availableTools);
      populated.push(cloneSection(section, selectedTool));
    } else if (section.source === 'manual') {
      populated.push(cloneSection(section, manualInputFor(section, manualInputs)));
    } else if (section.source === 'orchestrated') {
      populated.push(cloneSection(section, orchestratedInputFor(section, manualInputs, selectedTool)));
    }
  }

  const scorer = scoreForgeStep({ stepId: RESEARCH_STEP_ID, sections: populated });
  const manualSections = populated.filter(section => section.source === 'manual');
  const manualComplete = manualSections.every(section => !(section.input && section.input.complete === false));
  const completionPct = scorer.score;

  return Object.freeze({
    productId,
    stepId: RESEARCH_STEP_ID,
    completedAt: new Date().toISOString(),
    sections: Object.freeze(populated),
    completionPct,
    evidenceSummary: Object.freeze({
      autoSections: populated.filter(section => section.source === 'auto').length,
      manualSections: manualSections.length,
      orchestratedSections: populated.filter(section => section.source === 'orchestrated').length,
      derivedSections: populated.filter(section => section.source === 'derived').length,
      allComplete: manualComplete && completionPct === 100,
    }),
    matrixArtifactVersion: String(artifact.version ?? 'unknown'),
    readyForDesign: manualComplete && completionPct >= 95,
  });
}

export const __test = Object.freeze({
  manualInputFor,
  orchestratedInputFor,
  relevantMatrixEntries,
  selectResearchTool,
  summarizeCurrentState,
});
