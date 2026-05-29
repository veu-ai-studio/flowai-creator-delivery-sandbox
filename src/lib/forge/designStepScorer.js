import { scoreForgeStep } from './forgeStepScorer.js';

export const DESIGN_PARTIAL_TOOL_REQUIRED = 'DESIGN_PARTIAL_TOOL_REQUIRED';
export const MINIMUM_BUILD_DIRECTIVE = 'MINIMUM BUILD DIRECTIVE';

function isStub(value) {
  return Boolean(value && typeof value === 'object' && (value.complete === false || value.verified === false));
}

function entries(value) {
  if (Array.isArray(value)) return value.filter(item => String(item ?? '').trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
}

export function hasMinimumBuildDirective(decisionLog) {
  return entries(decisionLog).some(entry => entry.includes(MINIMUM_BUILD_DIRECTIVE));
}

function hasDecisionEntry(decisionLog) {
  return entries(decisionLog).length > 0;
}

function sectionById(sections, id) {
  return sections.find(section => section.id === id);
}

function orchestratedStubSections(sections) {
  return sections.filter(section => section.source === 'orchestrated' && isStub(section.input));
}

function buildPartialFlag(stubSections) {
  if (stubSections.length === 0) return null;
  return Object.freeze({
    flag: DESIGN_PARTIAL_TOOL_REQUIRED,
    reason: 'Orchestrated sections incomplete; AI design tool not configured. readyForBuild blocked until sections populated or Victor supplies explicit minimum build directive.',
    incompleteSections: Object.freeze(stubSections.map(section => section.id)),
  });
}

export function scoreDesignStep(designOutput = {}) {
  const sections = Array.isArray(designOutput.sections) ? designOutput.sections : [];
  const baseScore = scoreForgeStep({ stepId: designOutput.stepId, sections });
  const decisionLog = sectionById(sections, 'design-decision-log')?.input ?? [];
  const minimumBuildDirectivePresent = hasMinimumBuildDirective(decisionLog);
  const stubSections = orchestratedStubSections(sections);
  const partialFlag = minimumBuildDirectivePresent ? null : buildPartialFlag(stubSections);
  const requiredIds = ['design-principles', 'design-gaps', 'design-decision-log'];
  const requiredComplete = requiredIds.every(id => baseScore.completeSections.includes(id));
  const realInputComplete = requiredComplete && stubSections.length === 0;
  const designComplete = realInputComplete || (requiredComplete && minimumBuildDirectivePresent);
  const designScore = designComplete && minimumBuildDirectivePresent && baseScore.score < 95 ? 100 : baseScore.score;
  const readyForBuild = designScore >= 95 && designComplete === true;
  const correctivePrompts = [...baseScore.correctivePrompts];

  if (!hasDecisionEntry(decisionLog)) {
    correctivePrompts.push('Section design-decision-log requires at least one Victor decision entry.');
  }
  if (partialFlag) {
    correctivePrompts.push('Add design tool outputs for orchestrated sections or add MINIMUM BUILD DIRECTIVE: [description] to the decision log.');
  }

  return Object.freeze({
    stepId: designOutput.stepId,
    designScore,
    score: designScore,
    designComplete,
    readyForBuild,
    minimumBuildDirectivePresent,
    completeSections: baseScore.completeSections,
    incompleteSections: baseScore.incompleteSections,
    correctivePrompts: Object.freeze([...new Set(correctivePrompts)]),
    flag: partialFlag?.flag,
    partialFlag,
  });
}

export const __test = Object.freeze({
  entries,
  hasMinimumBuildDirective,
  isStub,
  orchestratedStubSections,
});
