'use strict';

import {
  AdvisoryAgentBase,
  advisoryCharterFromRegistry,
  hasText,
  listCount,
} from './AdvisoryAgentBase.js';

export class Agent13SelfProtection extends AdvisoryAgentBase {
  static charterId = 13;

  static charter() {
    return advisoryCharterFromRegistry(13, { marketplaceTools: ['cloudflare'] });
  }

  constructor(deps) {
    super(deps, {
      id: 13,
      inputKind: 'self.protection.request',
      rules: [
        (input) => protectionSignal(
          'clone_detection',
          listCount(input.cloneMatches) > 0 || hasText(input.suspectedCloneUrl),
          'urgent',
          'Potential clone or unauthorized mirror requires threat review.',
        ),
        (input) => protectionSignal(
          'signature_strategy',
          hasText(input.signatureId) && hasText(input.pattern),
          'watch',
          'Bot/scraper signature update is ready for broadcast.',
        ),
        (input) => protectionSignal(
          'dmca_threshold',
          input.dmcaReady === true || listCount(input.infringementEvidence) >= 2,
          'urgent',
          'DMCA package has enough evidence for operator review.',
        ),
      ],
      selectTopic: (input, signals) => {
        if (input.action === 'dmca' || signals.some((s) => s.rule === 'dmca_threshold' && s.status === 'urgent')) {
          return '13.dmca.filed.v1';
        }
        if (input.action === 'signature_update' || signals.some((s) => s.rule === 'signature_strategy' && s.status === 'watch')) {
          return '13.signature.update.v1';
        }
        return '13.threat.detected.v1';
      },
      buildPayload: ({ input, runId, signals, urgent, warnings, confidence }) => {
        const signatureId = input.signatureId ?? deriveSignatureId(input);
        const surface = input.surface ?? input.productSurface ?? input.suspectedCloneUrl ?? 'portfolio';
        const evidence = collectEvidence(input, signals);
        const topic = this.advisoryConfig.selectTopic(input, signals);
        if (topic === '13.signature.update.v1') {
          return {
            runId,
            signatureId,
            pattern: input.pattern ?? derivePattern(input),
            severity: normalizeSeverity(input.severity ?? (urgent.length > 0 ? 'high' : 'medium')),
            confidence,
            signals,
          };
        }
        if (topic === '13.dmca.filed.v1') {
          return {
            runId,
            signatureId,
            surface,
            targetUrl: input.suspectedCloneUrl ?? input.targetUrl ?? null,
            draft: true,
            evidence,
            confidence,
            signals,
          };
        }
        return {
          runId,
          signatureId,
          surface,
          evidence,
          severity: normalizeSeverity(input.severity ?? (warnings.length > 0 ? 'medium' : 'low')),
          confidence,
          signals,
        };
      },
    });
  }
}

function protectionSignal(rule, condition, activeStatus, message) {
  return {
    rule,
    status: condition ? activeStatus : 'clear',
    message,
  };
}

function deriveSignatureId(input) {
  if (hasText(input.signatureId)) return input.signatureId;
  if (hasText(input.suspectedCloneUrl)) return 'clone-signal';
  if (hasText(input.pattern)) return 'pattern-signal';
  return 'baseline-self-protection';
}

function derivePattern(input) {
  if (hasText(input.pattern)) return input.pattern;
  if (hasText(input.suspectedCloneUrl)) return input.suspectedCloneUrl;
  return 'portfolio-protection-baseline';
}

function collectEvidence(input, signals) {
  if (Array.isArray(input.infringementEvidence) && input.infringementEvidence.length > 0) {
    return input.infringementEvidence;
  }
  if (Array.isArray(input.evidence) && input.evidence.length > 0) return input.evidence;
  const active = signals.filter((s) => s.status !== 'clear').map((s) => s.rule);
  return active.length > 0 ? active : ['baseline_review'];
}

function normalizeSeverity(value) {
  const severity = String(value ?? '').toLowerCase();
  if (['low', 'medium', 'high'].includes(severity)) return severity;
  if (severity === 'critical') return 'high';
  return 'medium';
}
