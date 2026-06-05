'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent19TechnologicalEvolution extends AdvisoryAgentBase {
  static charterId = 19;

  static charter() {
    return advisoryCharterFromRegistry(19, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 19,
      inputKind: 'technological.evolution.request',
      rules: [
        (input) => techSignal('tech_signal_present', listCount(input.signals) > 0, 'watch', 'Technology evolution requires observable signals.'),
        (input) => techSignal('no_auto_apply', input.applyNow !== true, 'urgent', 'Agent #19 is signal-only and never auto-applies changes.'),
        (input) => techSignal('impact_scope_present', !!input.impactScope, 'watch', 'Technology signal should include impact scope.'),
      ],
      selectTopic: () => '19.tech.signal.v1',
      buildPayload: ({ input, runId, signals, urgent, confidence }) => ({
        runId,
        technology: input.technology ?? 'unspecified',
        impactScope: input.impactScope ?? 'unknown',
        signals: input.signals ?? [],
        signalOnly: true,
        blocked: urgent.length > 0,
        confidence,
        ruleSignals: signals,
      }),
    });
  }
}

function techSignal(rule, condition, activeStatus, message) {
  return { rule, status: condition ? 'clear' : activeStatus, message };
}
