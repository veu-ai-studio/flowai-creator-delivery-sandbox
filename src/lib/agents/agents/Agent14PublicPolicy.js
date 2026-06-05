'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, hasText } from './AdvisoryAgentBase.js';

export class Agent14PublicPolicy extends AdvisoryAgentBase {
  static charterId = 14;

  static charter() {
    return advisoryCharterFromRegistry(14, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 14,
      inputKind: 'public.policy.request',
      rules: [
        (input) => policySignal('new_regulation', input.eventType === 'new' || hasText(input.effectiveDate), 'urgent', 'New regulation requires same-day operator brief.'),
        (input) => policySignal('jurisdiction_selected', hasText(input.jurisdiction), 'watch', 'Policy monitoring requires a jurisdiction.'),
        (input) => policySignal('citation_present', hasText(input.citation), 'watch', 'Policy brief needs a citation before circulation.'),
      ],
      selectTopic: (input) => {
        if (input.eventType === 'update') return '14.regulation.update.v1';
        if (input.eventType === 'weekly') return '14.compliance.brief.weekly.v1';
        return '14.regulation.new.v1';
      },
      buildPayload: ({ input, runId, signals, confidence }) => ({
        runId,
        jurisdiction: input.jurisdiction ?? 'unspecified',
        citation: input.citation ?? 'citation-pending',
        summary: input.summary ?? summarize(signals),
        effectiveDate: input.effectiveDate ?? 'unknown',
        confidence,
        signals,
      }),
    });
  }
}

function policySignal(rule, condition, activeStatus, message) {
  return { rule, status: condition ? activeStatus : 'clear', message };
}

function summarize(signals) {
  const active = signals.filter((s) => s.status !== 'clear').map((s) => s.rule);
  return active.length ? `Policy signals: ${active.join(', ')}` : 'No new policy signal.';
}
