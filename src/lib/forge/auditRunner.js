import { scoreSurface } from '../audits/tierScoringAdapter.js';
import { scoreBuildStep } from './buildStepScorer.js';
import { scoreDesignStep } from './designStepScorer.js';
import { buildAuditTemplate, AUDIT_STEP_ID } from './auditTemplate.js';
import { AUDIT_QUEUED, scoreAuditStep } from './auditStepScorer.js';
import { selectForgeStepTool } from './toolSelection.js';
import { dispatch as orchestraDispatch } from '../orchestra/index.js';
import { MODES } from '../tools/ToolIntelligenceService.js';

const P2_MAX_DISPATCHES_PER_RUN = 12;
const CLAUDE_SONNET_4_6_INPUT_USD_PER_MILLION = 3;
const CLAUDE_SONNET_4_6_OUTPUT_USD_PER_MILLION = 15;
const QUALITY_AUDIT_DIMENSIONS = Object.freeze([
  'UI/UX',
  'API',
  'Logic',
  'Business Value',
  'Security Posture',
]);

function cloneSection(section, input) {
  return Object.freeze({ ...section, input });
}

function check(id, label, passed, reasonPass, reasonFail) {
  return Object.freeze({
    id,
    label,
    status: passed ? 'PASS' : 'FAIL',
    reason: passed ? reasonPass : reasonFail,
  });
}

function sectionById(output, id) {
  return (output?.sections ?? []).find(section => section.id === id);
}

function entries(value) {
  if (Array.isArray(value)) return value.filter(item => String(item ?? '').trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
}

function decisionLogInput(manualInputs) {
  return entries(manualInputs?.['audit-decision-log']);
}

export function isBuildBlocked(buildOutput = {}) {
  return buildOutput.flag === 'BUILD_BLOCKED' ||
    buildOutput.buildBlocked === true ||
    buildOutput.entryPath?.path === 'BUILD_BLOCKED';
}

function auditQueuedState(buildOutput) {
  const buildBlocked = isBuildBlocked(buildOutput);
  if (buildOutput.buildComplete === false || buildBlocked) {
    return Object.freeze({
      flag: AUDIT_QUEUED,
      buildBlocked,
      reason: 'Build evidence partial. Advisory audit only until PATH_A or PATH_B clears.',
      action: 'Visit /forge/build to unlock',
    });
  }

  return Object.freeze({
    flag: 'AUDIT_ACTIVE',
    buildBlocked,
    reason: 'Build evidence is ready for quality audit.',
  });
}

export function codeCompletenessChecks(buildOutput = {}) {
  return Object.freeze([
    check('build-template-schema', 'buildTemplate schema valid', Array.isArray(buildOutput.sections), 'sections array present', 'sections array missing'),
    check('entry-path-present', 'build-entry-path section present', Boolean(sectionById(buildOutput, 'build-entry-path')), 'build-entry-path present', 'build-entry-path missing'),
    check('build-blocked-documented', 'BUILD_BLOCKED state documented', Boolean(buildOutput.flag || buildOutput.entryPath?.path), 'build state documented', 'build state missing'),
    check('code-dispatches-present', 'code-task-dispatches present (stub or populated)', Boolean(sectionById(buildOutput, 'code-task-dispatches')), 'code-task-dispatches present', 'code-task-dispatches missing'),
    check('stub-deletions-present', 'base44-stub-deletions present', Boolean(sectionById(buildOutput, 'base44-stub-deletions')), 'base44-stub-deletions present', 'base44-stub-deletions missing'),
    check('functionalization-present', 'base44-functionalization present', Boolean(sectionById(buildOutput, 'base44-functionalization')), 'base44-functionalization present', 'base44-functionalization missing'),
  ]);
}

export function evidenceCompletenessChecks(buildOutput = {}) {
  return Object.freeze([
    check('field-productId', 'productId present', Boolean(buildOutput.productId), 'productId present', 'productId missing'),
    check('field-stepId', 'stepId present', Boolean(buildOutput.stepId), 'stepId present', 'stepId missing'),
    check('field-completedAt', 'completedAt present', Boolean(buildOutput.completedAt), 'completedAt present', 'completedAt missing'),
    check('field-matrixArtifactVersion', 'matrixArtifactVersion present', Boolean(buildOutput.matrixArtifactVersion), 'matrixArtifactVersion present', 'matrixArtifactVersion missing'),
    check('field-buildScore', 'buildScore present', typeof buildOutput.buildScore === 'number', 'buildScore present', 'buildScore missing'),
    check('field-buildComplete', 'buildComplete boolean present', typeof buildOutput.buildComplete === 'boolean', 'buildComplete boolean present', 'buildComplete missing or not boolean'),
    check('field-readyForQualityAudit', 'readyForQualityAudit present', typeof buildOutput.readyForQualityAudit === 'boolean', 'readyForQualityAudit present', 'readyForQualityAudit missing'),
    check('field-entryPath', 'entryPath present', Boolean(buildOutput.entryPath), 'entryPath present', 'entryPath missing'),
    check('field-flag', 'flag field present', Object.hasOwn(buildOutput, 'flag'), 'flag field present', 'flag field missing'),
    check('field-evidenceSummary', 'evidenceSummary present', Boolean(buildOutput.evidenceSummary), 'evidenceSummary present', 'evidenceSummary missing'),
    check('field-sections', 'sections array present', Array.isArray(buildOutput.sections), 'sections array present', 'sections array missing'),
  ]);
}

export async function gateValidityChecks(buildOutput = {}, opts = {}) {
  const buildScore = scoreBuildStep(buildOutput);
  const buildGateMatches = buildOutput.readyForQualityAudit === (buildOutput.buildScore >= 95 && buildOutput.buildComplete === true);
  const tierC = await scoreSurface({ id: 'tier-c-control', tier: 'C' }, null, opts);
  const designPartial = scoreDesignStep({
    stepId: 'step-2-design',
    sections: [
      { id: 'design-principles', source: 'auto', evidenceTier: 'B', input: 'principles' },
      { id: 'feature-priorities', source: 'orchestrated', evidenceTier: 'B', input: { complete: false, verified: false } },
      { id: 'design-gaps', source: 'derived', evidenceTier: 'B', input: [{ gap: 'gap' }] },
      { id: 'design-decision-log', source: 'manual', evidenceTier: 'A', input: ['Victor decision'] },
    ],
  });

  return Object.freeze([
    check('gate-readyForQualityAudit', 'readyForQualityAudit = buildScore >= 95 && buildComplete === true', buildGateMatches && buildScore.readyForQualityAudit === buildOutput.readyForQualityAudit, 'build gate matches scorer output', 'build gate mismatch'),
    check('gate-tier-c-excluded', 'Tier-C never contributes to score', tierC.verified === false && tierC.tier === 'C', 'Tier-C rejected by tierScoringAdapter.scoreSurface', 'Tier-C accepted or malformed'),
    check('gate-design-partial-flag', 'DESIGN_PARTIAL_TOOL_REQUIRED emits when design stubs present', designPartial.flag === 'DESIGN_PARTIAL_TOOL_REQUIRED', 'design partial flag emitted', 'design partial flag missing'),
  ]);
}

export function batchPlanAdvisoryItems(buildOutput = {}) {
  const plan = buildOutput.base44BatchPlan;
  if (plan?.status !== 'BATCH_PLAN_APPROXIMATE') return Object.freeze([]);
  const productId = buildOutput.productId ?? 'unknown';
  const entriesToReview = [
    ...(plan.stubDeletions ?? []),
    ...(plan.functionalizationPlan ?? []),
  ];
  return Object.freeze(entriesToReview.map(entry => Object.freeze({
    id: entry.surfaceId,
    label: entry.surfaceId,
    status: 'ADVISORY_ONLY',
    reason: `BATCH_PLAN_APPROXIMATE - precise product matrix data (productId: ${productId}) required to audit`,
  })));
}

function renewalCompatibility(renewalOutput) {
  if (!renewalOutput) {
    return Object.freeze({
      id: 'renewal-output-compatibility',
      label: 'RenewalOutput compatibility',
      status: 'NOT_APPLICABLE',
      reason: 'RenewalOutput not applicable until Self-Renewal / v0.2 loop integration',
    });
  }

  return check('renewal-output-compatibility', 'RenewalOutput compatibility', true, 'RenewalOutput provided for future compatibility review', 'RenewalOutput missing');
}

function withAuditToolMetadata(toolSelection, buildBlocked) {
  if (!toolSelection) return null;
  return Object.freeze({
    ...toolSelection,
    toolSelectionAdvisory: buildBlocked === true,
  });
}

function isAutomaticToolSelection(toolSelection) {
  return toolSelection?.mode === MODES.AUTOMATIC;
}

function assertAnthropicReady() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('P2 live execution STOP: ANTHROPIC_API_KEY is required for live audit scoring dispatch');
  }
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

function ensureBudget(budget) {
  if (budget.dispatchCount > P2_MAX_DISPATCHES_PER_RUN) {
    throw new Error(`P2 live execution STOP: dispatch count exceeded ${P2_MAX_DISPATCHES_PER_RUN}`);
  }
  if (budget.costUsd > 5) {
    throw new Error('P2 live execution STOP: derived cost exceeded $5 P2 soft cap');
  }
}

function promptForDimension(dimension) {
  const base = 'Comparability anchor: 10 = ships per Section 10 governance threshold; deduct per Section 6 detector set.';
  if (dimension === 'Business Value') {
    return `${base} Score Business Value against product goals, Step 1 research output, and Step 2 design output. Do not free-form guess market value.`;
  }
  return `${base} Score ${dimension} against the actual build evidence and audit checks.`;
}

async function runDimensionScores(buildOutput, config, budget, dispatchFn) {
  const scores = [];
  for (const dimension of QUALITY_AUDIT_DIMENSIONS) {
    budget.dispatchCount += 1;
    ensureBudget(budget);
    const result = assertLiveDispatchResult(await dispatchFn('score', {
      dimension,
      prompt: promptForDimension(dimension),
      context: {
        productGoals: config.productGoals ?? null,
        researchOutput: config.researchOutput ?? null,
        designOutput: config.designOutput ?? null,
        buildOutput,
      },
    }), 'score');
    const data = result.data;
    if (typeof data.score !== 'number' || typeof data.justification !== 'string' || typeof data.evidenceRef !== 'string') {
      throw new Error(`P2 live execution STOP: score dispatch returned malformed schema for ${dimension}`);
    }
    budget.costUsd += usageCostUsd(data);
    ensureBudget(budget);
    scores.push(Object.freeze({
      dimension,
      score: data.score,
      justification: data.justification,
      evidenceRef: data.evidenceRef,
      action: result.action,
      member: result.member,
    }));
  }
  return Object.freeze(scores);
}

function findingsFrom(groups) {
  const checks = Object.values(groups).flatMap(value => Array.isArray(value) ? value : [value]);
  const passed = checks.filter(item => item.status === 'PASS').length;
  const failed = checks.filter(item => item.status === 'FAIL').length;
  const advisory = checks.filter(item => item.status === 'ADVISORY_ONLY').length;
  const notApplicable = checks.filter(item => item.status === 'NOT_APPLICABLE').length;
  return Object.freeze({
    passed,
    failed,
    advisory,
    notApplicable,
    summary: `${passed} passed, ${failed} failed, ${advisory} advisory-only, ${notApplicable} not applicable.`,
  });
}

export async function runAudit(productId, buildOutput = {}, manualInputs = {}, config = {}) {
  const template = buildAuditTemplate(productId, buildOutput);
  const entryState = auditQueuedState(buildOutput);
  const toolSelection = withAuditToolMetadata(await selectForgeStepTool({
    service: config.toolService,
    stepKey: 'qa_audit',
    productId,
    mode: config.toolIntelligenceMode,
    runId: config.runId,
    coldStore: config.coldStore,
    undServedFirstEnforce: true,
    pipelineSubSteps: ['static-analysis', 'browser-check', 'evidence-verify'],
  }), entryState.buildBlocked);
  const dispatchFn = config.dispatch ?? orchestraDispatch;
  const budget = { dispatchCount: 0, costUsd: 0 };
  const liveDimensionScoring = toolSelection && isAutomaticToolSelection(toolSelection) && entryState.buildBlocked !== true;
  if (liveDimensionScoring) assertAnthropicReady();
  const dimensionScores = liveDimensionScoring
    ? await runDimensionScores(buildOutput, config, budget, dispatchFn)
    : Object.freeze([]);
  const codeChecks = codeCompletenessChecks(buildOutput);
  const evidenceChecks = evidenceCompletenessChecks(buildOutput);
  const gateChecks = await gateValidityChecks(buildOutput, config);
  const advisoryItems = batchPlanAdvisoryItems(buildOutput);
  const renewalOutputCompatibility = renewalCompatibility(config.renewalOutput);
  const auditFindings = findingsFrom({
    codeChecks,
    evidenceChecks,
    gateChecks,
    advisoryItems,
    renewalOutputCompatibility,
  });
  const decisionLog = decisionLogInput(manualInputs);
  const sections = template.sections.map(section => {
    if (section.id === 'audit-entry-state') return cloneSection(section, entryState);
    if (section.id === 'code-completeness') return cloneSection(section, codeChecks);
    if (section.id === 'evidence-completeness') return cloneSection(section, evidenceChecks);
    if (section.id === 'gate-validity') return cloneSection(section, gateChecks);
    if (section.id === 'batch-plan-advisory') return cloneSection(section, advisoryItems);
    if (section.id === 'renewal-output-compatibility') return cloneSection(section, renewalOutputCompatibility);
    if (section.id === 'audit-findings') return cloneSection(section, auditFindings);
    if (section.id === 'audit-decision-log') return cloneSection(section, decisionLog);
    if (section.id === 'selected-tool') return cloneSection(section, toolSelection);
    return cloneSection(section, section.input ?? null);
  });
  const baseOutput = {
    productId,
    stepId: AUDIT_STEP_ID,
    completedAt: new Date().toISOString(),
    sections,
    toolSelection,
    toolSelectionAdvisory: entryState.buildBlocked === true,
    pipelineNullAt: toolSelection?.pipelineNullAt,
    undServedAccessWarning: toolSelection?.undServedAccessWarning === true,
    undServedAccessWarningReason: toolSelection?.undServedAccessWarningReason,
    buildOutput,
    buildComplete: buildOutput.buildComplete,
    buildBlocked: isBuildBlocked(buildOutput),
    entryPath: buildOutput.entryPath,
    codeCompletenessChecks: codeChecks,
    evidenceCompletenessChecks: evidenceChecks,
    gateValidityChecks: gateChecks,
    batchPlanAdvisoryItems: advisoryItems,
    renewalOutputCompatibility,
    auditFindings,
    dimensionScores,
    auditDecisionLog: decisionLog,
    matrixArtifactVersion: String(buildOutput.matrixArtifactVersion ?? 'unknown'),
    flag: entryState.flag === AUDIT_QUEUED ? AUDIT_QUEUED : undefined,
  };
  const score = scoreAuditStep(baseOutput);

  return Object.freeze({
    ...baseOutput,
    sections: Object.freeze(sections),
    auditScore: score.auditScore,
    auditComplete: score.auditComplete,
    readyForDeploy: score.readyForDeploy,
    correctivePrompts: score.correctivePrompts,
    evidenceSummary: Object.freeze({
      nonAdvisoryChecks: [...codeChecks, ...evidenceChecks, ...gateChecks].length,
      advisoryItems: advisoryItems.length,
      notApplicableItems: renewalOutputCompatibility.status === 'NOT_APPLICABLE' ? 1 : 0,
      failedChecks: score.failedChecks.length,
      liveDispatches: budget.dispatchCount,
      estimatedCostUsd: Math.round(budget.costUsd * 1_000_000) / 1_000_000,
    }),
  });
}

export const __test = Object.freeze({
  auditQueuedState,
  decisionLogInput,
  findingsFrom,
  renewalCompatibility,
});
