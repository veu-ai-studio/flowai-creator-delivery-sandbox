'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent23HrCompensation extends AdvisoryAgentBase {
  static charterId = 23;

  static charter() {
    return advisoryCharterFromRegistry(23);
  }

  constructor(deps) {
    super(deps, {
      id: 23,
      inputKind: 'hr.compensation.request',
      rules: [
        (input) => signal('aggregate_scope_present', !!input.teamScope || !!input.roleFamily, 'watch', 'HR recommendations need aggregate team or role-family scope.'),
        (input) => signal('compensation_context_present', listCount(input.compensationBands) > 0 || !!input.benchmarkContext, 'watch', 'Compensation advice needs band or benchmark context.'),
        (input) => signal('individual_decision_requested', listCount(input.namedIndividuals) > 0 || input.autoAdjustPay === true, 'urgent', 'Named-individual compensation decisions remain outside recommend-only authority.'),
      ],
      buildPayload: ({ input, runId, signals, urgent, warnings, confidence }) => ({
        runId,
        advisoryOnly: true,
        teamScope: input.teamScope ?? null,
        roleFamily: input.roleFamily ?? null,
        bandCount: listCount(input.compensationBands),
        aggregateOnly: listCount(input.namedIndividuals) === 0,
        compensationDecisionBlocked: urgent.length > 0,
        watchCount: warnings.length,
        confidence,
        signals,
      }),
    });
  }
}

function signal(rule, condition, activeStatus, message) {
  return { rule, status: condition ? activeStatus : 'clear', message };
}
