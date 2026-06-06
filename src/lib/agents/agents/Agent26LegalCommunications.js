'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent26LegalCommunications extends AdvisoryAgentBase {
  static charterId = 26;

  static charter() {
    return advisoryCharterFromRegistry(26);
  }

  constructor(deps) {
    super(deps, {
      id: 26,
      inputKind: 'legal.communications.request',
      rules: [
        (input) => signal('jurisdiction_or_audience_present', !!input.jurisdiction || !!input.audience, 'watch', 'Legal and communications advice needs jurisdiction or audience context.'),
        (input) => signal('claim_evidence_present', listCount(input.claims) > 0 || !!input.communicationDraft, 'watch', 'Legal communications need draft or claim evidence.'),
        (input) => signal('binding_action_requested', input.sendCommunication === true || input.fileLegalNotice === true || input.approvePublicStatement === true, 'urgent', 'Sending communications, filing notices, and approvals require human-gated authority.'),
      ],
      buildPayload: ({ input, runId, signals, urgent, warnings, confidence }) => ({
        runId,
        advisoryOnly: true,
        jurisdiction: input.jurisdiction ?? null,
        audience: input.audience ?? null,
        claimCount: listCount(input.claims),
        bindingActionBlocked: urgent.length > 0,
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
