'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent16ProductivityHR extends AdvisoryAgentBase {
  static charterId = 16;

  static charter() {
    return advisoryCharterFromRegistry(16);
  }

  constructor(deps) {
    super(deps, {
      id: 16,
      inputKind: 'productivity.hr.request',
      rules: [
        (input) => hrSignal('aggregate_only', listCount(input.namedIndividuals) === 0, 'urgent', 'Productivity reports must not name individual humans.'),
        (input) => hrSignal('metric_samples_present', listCount(input.metrics) > 0, 'watch', 'Aggregate productivity metrics are required.'),
        (input) => hrSignal('team_scope_present', !!input.teamScope, 'watch', 'Report should identify aggregate team or provider scope.'),
      ],
      selectTopic: () => '16.productivity.report.v1',
      buildPayload: ({ input, runId, signals, urgent, confidence }) => ({
        runId,
        teamScope: input.teamScope ?? 'aggregate',
        metrics: input.metrics ?? [],
        anonymized: true,
        privacyBlocked: urgent.length > 0,
        confidence,
        signals,
      }),
    });
  }
}

function hrSignal(rule, condition, activeStatus, message) {
  return { rule, status: condition ? 'clear' : activeStatus, message };
}
