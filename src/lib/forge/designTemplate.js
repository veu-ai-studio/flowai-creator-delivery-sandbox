export const DESIGN_TEMPLATE_VERSION = '1.0';
export const DESIGN_STEP_ID = 'step-2-design';

export function buildDesignTemplate(productId, researchOutput = {}) {
  return Object.freeze({
    productId,
    researchStepId: researchOutput.stepId ?? null,
    templateVersion: DESIGN_TEMPLATE_VERSION,
    sections: Object.freeze([
      Object.freeze({
        id: 'design-principles',
        label: 'Design Principles',
        source: 'auto',
        prompt: 'Core principles guiding this design cycle derived from research output.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'feature-priorities',
        label: 'Feature Priorities',
        source: 'orchestrated',
        prompt: 'Ranked list of features to build or improve based on research findings. Orchestrated by AI design tool when configured.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'user-flows',
        label: 'User Flows',
        source: 'orchestrated',
        prompt: 'Primary user journeys for target customer segments. Orchestrated by AI design tool when configured.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'technical-requirements',
        label: 'Technical Requirements',
        source: 'orchestrated',
        prompt: 'Technical specifications derived from feature priorities and user flows. Orchestrated by AI design tool when configured.',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'design-gaps',
        label: 'Design Gaps from Research',
        source: 'derived',
        prompt: 'Gaps identified where research output was incomplete. These become Step 3 Build risks.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'design-decision-log',
        label: 'Design Decision Log',
        source: 'manual',
        prompt: 'Key design decisions made by Victor that override or supplement orchestrated outputs. To unlock readyForBuild without full tool configuration, Victor must add an explicit MINIMUM BUILD DIRECTIVE entry here.',
        input: [],
        evidenceTier: 'A',
      }),
    ]),
  });
}

export function manualDesignSections(template) {
  return (template?.sections ?? []).filter(section => section.source === 'manual');
}
