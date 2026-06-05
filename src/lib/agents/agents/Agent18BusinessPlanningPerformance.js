'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry } from './AdvisoryAgentBase.js';

export class Agent18BusinessPlanningPerformance extends AdvisoryAgentBase {
  static charterId = 18;

  static charter() {
    return advisoryCharterFromRegistry(18, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 18,
      inputKind: 'business.performance.request',
      rules: [
        (input) => planSignal('health_signal_present', !!input.health || !!input.portfolioHealth, 'watch', 'Business planning needs health context.'),
        (input) => planSignal('baseline_present', typeof input.baseline === 'number', 'watch', 'Plan deviation requires a numeric baseline.'),
        (input) => planSignal('deviation_threshold', Math.abs(Number(input.deviationPct ?? 0)) > 15, 'urgent', 'Plan deviation exceeds 15% threshold.'),
      ],
      selectTopic: () => '18.plan.update.v1',
      buildPayload: ({ input, runId, signals, urgent, confidence }) => ({
        runId,
        planId: input.planId ?? 'portfolio-plan',
        baseline: input.baseline ?? null,
        current: input.current ?? null,
        deviationPct: input.deviationPct ?? null,
        alertW0: urgent.length > 0,
        confidence,
        signals,
      }),
    });
  }
}

function planSignal(rule, condition, activeStatus, message) {
  return { rule, status: condition ? activeStatus : 'clear', message };
}
