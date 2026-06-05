'use strict';

import { StepOwnerAgentBase, charterFromRegistry, hasValue, countItems } from './StepOwnerAgentBase.js';

export class Agent8QualityAudit extends StepOwnerAgentBase {
  static charterId = 8;

  static charter() {
    return charterFromRegistry(8, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 8,
      stepKey: 'qa_audit',
      inputKind: 'audit.request',
      summaryVerb: 'audit',
      rules: [
        (input) => rule('artifact_present', hasValue(input.artifactRef ?? input.stepInputs?.artifactRef) || hasValue(input.build), 'blocker', 'Build artifact is required for quality audit.'),
        (input) => rule('evidence_tier_labeled', hasValue(input.evidenceTier ?? input.stepInputs?.evidenceTier), 'warning', 'Evidence tier should be labeled.'),
        (input) => rule('blocker_severity_checked', countItems(input.criticalFindings ?? input.stepInputs?.criticalFindings) === 0, 'blocker', 'Critical findings block audit completion.'),
      ],
      selectTopic: (input) => input.requestOnly === true ? '8.audit.requested.v1' : '8.audit.completed.v1',
      buildPayload: ({ input, runId, productId, ok, confidence, signals, blockers }) => ({
        runId,
        productId,
        artifactRef: input.artifactRef ?? input.stepInputs?.artifactRef ?? null,
        score: typeof input.score === 'number' ? input.score : (ok ? 85 : 0),
        readyForDeploy: ok,
        blockers: blockers.map((b) => b.rule),
        confidence,
        signals,
      }),
    });
  }
}

function rule(name, passed, severity, message) {
  return { rule: name, status: passed ? 'pass' : severity, message };
}
