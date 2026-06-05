'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent17ProductEvolution extends AdvisoryAgentBase {
  static charterId = 17;

  static charter() {
    return advisoryCharterFromRegistry(17, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 17,
      inputKind: 'product.evolution.request',
      rules: [
        (input) => evoSignal('audit_signal_present', !!input.audit || listCount(input.auditFindings) > 0, 'watch', 'Evolution proposals should cite audit signals.'),
        (input) => evoSignal('benchmark_signal_present', !!input.benchmark || listCount(input.benchmarkDeltas) > 0, 'watch', 'Evolution proposals should cite benchmark deltas.'),
        (input) => evoSignal('proposal_is_advisory', input.applyNow !== true, 'urgent', 'Agent #17 proposals are advisory; Agent #3 owns enactment.'),
      ],
      selectTopic: () => '17.evolution.proposal.v1',
      buildPayload: ({ input, runId, signals, urgent, confidence }) => ({
        runId,
        proposal: input.proposal ?? 'product evolution review',
        rationale: input.rationale ?? signals.map((s) => s.rule).join(', '),
        draft: true,
        advisoryOnly: true,
        blocked: urgent.length > 0,
        confidence,
        signals,
      }),
    });
  }
}

function evoSignal(rule, condition, activeStatus, message) {
  return { rule, status: condition ? 'clear' : activeStatus, message };
}
