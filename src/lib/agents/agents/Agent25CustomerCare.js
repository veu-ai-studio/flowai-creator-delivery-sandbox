'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent25CustomerCare extends AdvisoryAgentBase {
  static charterId = 25;

  static charter() {
    return advisoryCharterFromRegistry(25);
  }

  constructor(deps) {
    super(deps, {
      id: 25,
      inputKind: 'customer.care.request',
      rules: [
        (input) => signal('support_scope_present', !!input.supportScope || !!input.channel, 'watch', 'Customer-care advice needs support scope or channel context.'),
        (input) => signal('customer_signal_present', listCount(input.issues) > 0 || listCount(input.feedback) > 0, 'watch', 'Care recommendations need issue or feedback evidence.'),
        (input) => signal('direct_resolution_requested', input.contactCustomer === true || input.closeTicket === true || input.issueRefund === true, 'urgent', 'Direct customer contact, ticket closure, and refunds need separate authority.'),
      ],
      buildPayload: ({ input, runId, signals, urgent, warnings, confidence }) => ({
        runId,
        advisoryOnly: true,
        supportScope: input.supportScope ?? null,
        channel: input.channel ?? null,
        issueCount: listCount(input.issues),
        feedbackCount: listCount(input.feedback),
        directActionBlocked: urgent.length > 0,
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
