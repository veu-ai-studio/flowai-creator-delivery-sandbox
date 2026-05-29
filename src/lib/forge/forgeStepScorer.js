function hasDescriptiveInput(value) {
  if (value && typeof value === 'object' && value.complete === false) return false;
  if (value && typeof value === 'object' && value.verified === false) return false;
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

function hasConcreteInput(value) {
  if (value && typeof value === 'object' && value.complete === false) return false;
  if (value && typeof value === 'object' && value.verified === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return hasDescriptiveInput(value);
}

function isSectionComplete(section) {
  if (section.evidenceTier === 'C') return false;
  if (section.evidenceTier === 'A') return hasConcreteInput(section.input);
  if (section.evidenceTier === 'B') return hasDescriptiveInput(section.input);
  return false;
}

function correctivePrompt(section) {
  return `Section ${section.id} requires ${section.source === 'manual' ? 'manual' : 'valid'} input: ${section.prompt}`;
}

export function scoreForgeStep(stepOutput = {}) {
  const sections = Array.isArray(stepOutput.sections) ? stepOutput.sections : [];
  const completeSections = sections.filter(isSectionComplete);
  const incompleteSections = sections.filter(section => !isSectionComplete(section));
  const score = sections.length === 0 ? 0 : Math.round((completeSections.length / sections.length) * 10000) / 100;

  return Object.freeze({
    stepId: stepOutput.stepId,
    score,
    readyForNextStep: score >= 95,
    completeSections: Object.freeze(completeSections.map(section => section.id)),
    incompleteSections: Object.freeze(incompleteSections.map(section => section.id)),
    correctivePrompts: Object.freeze(incompleteSections.map(correctivePrompt)),
  });
}

export const __test = Object.freeze({
  hasConcreteInput,
  hasDescriptiveInput,
  isSectionComplete,
});
