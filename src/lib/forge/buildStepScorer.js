import { scoreForgeStep } from './forgeStepScorer.js';
import { MINIMUM_BUILD_DIRECTIVE } from './designStepScorer.js';

export const BUILD_BLOCKED = 'BUILD_BLOCKED';
export const BUILD_OUTPUT_REQUIRED = 'BUILD_OUTPUT_REQUIRED';

function entries(value) {
  if (Array.isArray(value)) return value.filter(item => String(item ?? '').trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
}

function sectionById(sections, id) {
  return sections.find(section => section.id === id);
}

function populated(value) {
  if (value && typeof value === 'object' && (value.complete === false || value.verified === false) && !Array.isArray(value.stubDeletions) && !Array.isArray(value.functionalizationPlan)) {
    return false;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

function isRealEntry(entry) {
  if (entry === null || entry === undefined) return false;
  if (typeof entry === 'string') return entry.trim().length > 0;
  if (typeof entry === 'object') {
    if (entry.complete === false || entry.verified === false) return false;
    return entry.complete === true && entry.verified !== false;
  }
  return false;
}

function realEntryCount(value) {
  if (Array.isArray(value)) return value.filter(isRealEntry).length;
  return isRealEntry(value) ? 1 : 0;
}

function outputPopulated(sections) {
  const codeTasks = sectionById(sections, 'code-task-dispatches')?.input;
  return realEntryCount(codeTasks) >= 1;
}

function entryConfirmed(entryPath) {
  return entryPath?.path === 'PATH_A' || entryPath?.path === 'PATH_B';
}

export function hasMinimumBuildDirectiveFromDesign(designOutput = {}) {
  const decisionLog = sectionById(designOutput.sections ?? [], 'design-decision-log')?.input ?? [];
  return entries(decisionLog).some(entry => entry.includes(MINIMUM_BUILD_DIRECTIVE));
}

export function scoreBuildStep(buildOutput = {}) {
  const sections = Array.isArray(buildOutput.sections) ? buildOutput.sections : [];
  const baseScore = scoreForgeStep({ stepId: buildOutput.stepId, sections });
  const entryPath = sectionById(sections, 'build-entry-path')?.input;
  const buildDecisionLog = sectionById(sections, 'build-decision-log')?.input ?? [];
  const hasBuildDecision = entries(buildDecisionLog).length > 0;
  const hasOutputs = outputPopulated(sections);
  const requiredIds = ['build-entry-path', 'build-risks', 'build-decision-log'];
  const requiredComplete = requiredIds.every(id => baseScore.completeSections.includes(id));
  const buildBlocked = !entryConfirmed(entryPath);
  const outputRequired = !hasOutputs;
  const buildComplete = !buildBlocked && requiredComplete && hasBuildDecision && hasOutputs;
  const buildScore = buildComplete && baseScore.score < 95 ? 100 : baseScore.score;
  const readyForQualityAudit = buildScore >= 95 && buildComplete === true;
  const correctivePrompts = [...baseScore.correctivePrompts];

  if (buildBlocked) correctivePrompts.push('Unlock Build with PATH_A MINIMUM BUILD DIRECTIVE or PATH_B complete design output.');
  if (!hasBuildDecision) correctivePrompts.push('Section build-decision-log requires at least one Victor build decision entry.');
  if (outputRequired) correctivePrompts.push('Populate code-task dispatches or Base44 batch plan before Quality Audit.');

  return Object.freeze({
    stepId: buildOutput.stepId,
    buildScore,
    score: buildScore,
    buildComplete,
    readyForQualityAudit,
    completeSections: baseScore.completeSections,
    incompleteSections: baseScore.incompleteSections,
    correctivePrompts: Object.freeze([...new Set(correctivePrompts)]),
    flag: buildBlocked ? BUILD_BLOCKED : outputRequired ? BUILD_OUTPUT_REQUIRED : undefined,
    buildBlocked,
    outputRequired,
  });
}

export const __test = Object.freeze({
  entries,
  entryConfirmed,
  hasMinimumBuildDirectiveFromDesign,
  outputPopulated,
  populated,
  isRealEntry,
  realEntryCount,
});
