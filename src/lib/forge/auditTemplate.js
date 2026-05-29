export const AUDIT_TEMPLATE_VERSION = '1.0';
export const AUDIT_STEP_ID = 'step-4-quality-audit';

export function buildAuditTemplate(productId, buildOutput = {}) {
  return Object.freeze({
    productId,
    buildStepId: buildOutput.stepId ?? null,
    templateVersion: AUDIT_TEMPLATE_VERSION,
    sections: Object.freeze([
      Object.freeze({
        id: 'audit-entry-state',
        label: 'Audit Entry State',
        source: 'auto',
        prompt: 'Is build evidence sufficient to audit? Derives from buildComplete and buildBlocked detection.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'code-completeness',
        label: 'Code Completeness',
        source: 'auto',
        prompt: 'Do build outputs exist and are they correctly structured?',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'evidence-completeness',
        label: 'Forge Evidence Completeness',
        source: 'auto',
        prompt: 'Are all required forge evidence fields populated in buildOutput?',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'gate-validity',
        label: 'Gate Validity',
        source: 'auto',
        prompt: 'Are scoring gates enforced correctly per existing scorers?',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'batch-plan-advisory',
        label: 'Base44 Batch Plan Advisory Review',
        source: 'auto',
        prompt: 'Advisory review of approximate batch plan entries.',
        input: null,
        evidenceTier: 'B',
        auditMode: 'ADVISORY_ONLY',
      }),
      Object.freeze({
        id: 'renewal-output-compatibility',
        label: 'RenewalOutput Compatibility',
        source: 'auto',
        prompt: 'Not applicable until Self-Renewal / v0.2 loop integration.',
        input: null,
        evidenceTier: 'B',
        auditMode: 'ADVISORY_ONLY',
        status: 'NOT_APPLICABLE',
      }),
      Object.freeze({
        id: 'audit-findings',
        label: 'Audit Findings',
        source: 'derived',
        prompt: 'Summary: passed checks, failed checks, advisory items.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'audit-decision-log',
        label: 'Audit Decision Log',
        source: 'manual',
        prompt: 'Victor audit decisions - accept findings, override advisory items, or flag for remediation.',
        input: [],
        evidenceTier: 'A',
      }),
    ]),
  });
}
