'use strict';

import { StepOwnerAgentBase, charterFromRegistry, hasValue, countItems } from './StepOwnerAgentBase.js';

export class Agent6Research extends StepOwnerAgentBase {
  static charterId = 6;

  static charter() {
    return charterFromRegistry(6, { marketplaceTools: ['browserless', 'anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 6,
      stepKey: 'research',
      inputKind: 'research.request',
      summaryVerb: 'brief',
      rules: [
        (input) => rule('input_sufficiency', hasValue(input.url) || hasValue(input.description) || hasValue(input.stepInputs?.url), 'blocker', 'Provide a URL or description before research can proceed.'),
        (input) => rule('source_coverage', countItems(input.sources ?? input.stepInputs?.sources) > 0 || hasValue(input.url ?? input.stepInputs?.url), 'warning', 'Add sources or crawlable URL evidence.'),
        (input) => rule('evidence_gaps', countItems(input.knownGaps ?? input.stepInputs?.knownGaps) === 0, 'warning', 'Resolve known research evidence gaps before handoff.'),
      ],
      selectTopic: () => '6.research.brief.v1',
      buildPayload: ({ input, runId, productId, ok, confidence, signals }) => ({
        runId,
        productId,
        url: input.url ?? input.stepInputs?.url ?? null,
        brief: input.brief ?? input.description ?? input.stepInputs?.description ?? '',
        readyForDesign: ok,
        confidence,
        signals,
      }),
    });
  }
}

function rule(name, passed, severity, message) {
  return { rule: name, status: passed ? 'pass' : severity, message };
}
