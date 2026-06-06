'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent24InformationSecurity extends AdvisoryAgentBase {
  static charterId = 24;

  static charter() {
    return advisoryCharterFromRegistry(24);
  }

  constructor(deps) {
    super(deps, {
      id: 24,
      inputKind: 'information.security.request',
      rules: [
        (input) => signal('asset_scope_present', !!input.assetScope || listCount(input.assets) > 0, 'watch', 'Security advice needs asset or system scope.'),
        (input) => signal('risk_evidence_present', listCount(input.findings) > 0 || !!input.riskSummary, 'watch', 'Security recommendation needs findings or risk summary evidence.'),
        (input) => signal('mutation_or_active_scan_requested', input.activeScan === true || input.rotateSecrets === true || input.changeAccessControls === true, 'urgent', 'Active scans and control mutations require separate gated authority.'),
      ],
      buildPayload: ({ input, runId, signals, urgent, warnings, confidence }) => ({
        runId,
        advisoryOnly: true,
        assetScope: input.assetScope ?? null,
        assetCount: listCount(input.assets),
        findingCount: listCount(input.findings),
        gatedSecurityActionBlocked: urgent.length > 0,
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
