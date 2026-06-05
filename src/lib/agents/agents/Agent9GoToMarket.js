'use strict';

import { StepOwnerAgentBase, charterFromRegistry, hasValue, countItems } from './StepOwnerAgentBase.js';

export class Agent9GoToMarket extends StepOwnerAgentBase {
  static charterId = 9;

  static charter() {
    return charterFromRegistry(9, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 9,
      stepKey: 'gtm',
      inputKind: 'gtm.request',
      summaryVerb: 'asset',
      rules: [
        (input) => rule('audit_clearance', input.auditPassed === true || input.stepInputs?.auditPassed === true, 'blocker', 'GTM requires audit clearance.'),
        (input) => rule('claim_risk_reviewed', countItems(input.unverifiedClaims ?? input.stepInputs?.unverifiedClaims) === 0, 'warning', 'Remove or label unverified GTM claims.'),
        (input) => rule('channel_fit', hasValue(input.channel ?? input.stepInputs?.channel), 'warning', 'Select a GTM channel before asset handoff.'),
      ],
      selectTopic: () => '9.gtm.asset.v1',
      buildPayload: ({ input, runId, productId, ok, confidence, signals }) => ({
        runId,
        productId,
        channel: input.channel ?? input.stepInputs?.channel ?? null,
        asset: input.asset ?? input.stepInputs?.asset ?? {},
        draft: true,
        readyForPublish: false,
        gtmEligible: ok,
        confidence,
        signals,
      }),
    });
  }
}

function rule(name, passed, severity, message) {
  return { rule: name, status: passed ? 'pass' : severity, message };
}
