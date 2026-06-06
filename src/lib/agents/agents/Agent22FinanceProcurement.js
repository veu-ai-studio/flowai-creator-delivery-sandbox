'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent22FinanceProcurement extends AdvisoryAgentBase {
  static charterId = 22;

  static charter() {
    return advisoryCharterFromRegistry(22);
  }

  constructor(deps) {
    super(deps, {
      id: 22,
      inputKind: 'finance.procurement.request',
      rules: [
        (input) => signal('budget_context_present', !!input.budget || typeof input.estimatedCost === 'number', 'watch', 'Finance review needs budget or estimated cost context.'),
        (input) => signal('vendor_review_present', listCount(input.vendors) > 0 || !!input.vendorRisk, 'watch', 'Procurement recommendation needs vendor or supplier-risk context.'),
        (input) => signal('approval_gate_requested', input.requestedAction === 'approve_spend' || input.autoPurchase === true, 'urgent', 'Spend approval and purchasing remain outside recommend-only authority.'),
      ],
      buildPayload: ({ input, runId, signals, urgent, warnings, confidence }) => ({
        runId,
        advisoryOnly: true,
        financeScope: input.financeScope ?? 'portfolio',
        budgetAvailable: !!input.budget || typeof input.estimatedCost === 'number',
        vendorCount: listCount(input.vendors),
        approvalBlocked: urgent.length > 0,
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
