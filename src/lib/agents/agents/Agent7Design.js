'use strict';

import { StepOwnerAgentBase, charterFromRegistry, hasValue, countItems } from './StepOwnerAgentBase.js';

export class Agent7Design extends StepOwnerAgentBase {
  static charterId = 7;

  static charter() {
    return charterFromRegistry(7, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 7,
      stepKey: 'design',
      inputKind: 'design.request',
      summaryVerb: 'spec',
      rules: [
        (input) => rule('research_brief_complete', hasValue(input.researchBrief ?? input.stepInputs?.researchBrief), 'blocker', 'Research brief is required before design.'),
        (input) => rule('target_class_fit', hasValue(input.targetClass ?? input.stepInputs?.targetClass), 'warning', 'Target class should be explicit for design constraints.'),
        (input) => rule('handoff_completeness', countItems(input.requirements ?? input.stepInputs?.requirements) > 0 || hasValue(input.spec), 'warning', 'Design handoff needs requirements or a seed spec.'),
      ],
      selectTopic: () => '7.design.spec.v1',
      buildPayload: ({ input, runId, productId, ok, confidence, signals }) => ({
        runId,
        productId,
        targetClass: input.targetClass ?? input.stepInputs?.targetClass ?? null,
        spec: input.spec ?? input.stepInputs?.spec ?? {},
        readyForBuild: ok,
        confidence,
        signals,
      }),
    });
  }
}

function rule(name, passed, severity, message) {
  return { rule: name, status: passed ? 'pass' : severity, message };
}
