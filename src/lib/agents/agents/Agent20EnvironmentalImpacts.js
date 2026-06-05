'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent20EnvironmentalImpacts extends AdvisoryAgentBase {
  static charterId = 20;

  static charter() {
    return advisoryCharterFromRegistry(20);
  }

  constructor(deps) {
    super(deps, {
      id: 20,
      inputKind: 'environmental.impact.request',
      rules: [
        (input) => envSignal('impact_metrics_present', listCount(input.metrics) > 0, 'watch', 'Environmental assessment needs impact metrics.'),
        (input) => envSignal('threshold_check', thresholdApproached(input), 'urgent', 'Environmental or regulatory threshold is approached.'),
        (input) => envSignal('policy_escalation_ready', !!input.policyEscalation || thresholdApproached(input), 'watch', 'Escalate to Agent #14 when thresholds approach.'),
      ],
      selectTopic: () => '20.impact.assessment.v1',
      buildPayload: ({ input, runId, signals, urgent, confidence }) => ({
        runId,
        assessmentScope: input.assessmentScope ?? 'product',
        metrics: input.metrics ?? [],
        thresholdApproached: thresholdApproached(input),
        escalateToPublicPolicy: urgent.length > 0,
        confidence,
        signals,
      }),
    });
  }
}

function thresholdApproached(input) {
  if (input.thresholdApproached === true) return true;
  return (input.metrics ?? []).some((metric) => Number(metric?.value ?? 0) >= Number(metric?.threshold ?? Infinity));
}

function envSignal(rule, condition, activeStatus, message) {
  return { rule, status: condition ? activeStatus : 'clear', message };
}
