export const DEPLOY_TEMPLATE_VERSION = '1.0';
export const DEPLOY_STEP_ID = 'step-5-deploy';

export function buildDeployTemplate(productId, auditOutput = {}) {
  return Object.freeze({
    productId,
    auditStepId: auditOutput.stepId ?? null,
    templateVersion: DEPLOY_TEMPLATE_VERSION,
    sections: Object.freeze([
      Object.freeze({
        id: 'deploy-audit-gate',
        label: 'Audit Gate',
        source: 'auto',
        prompt: 'Deploy can proceed only when Quality Audit says readyForDeploy.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'delivery-artifact',
        label: 'Delivery Artifact',
        source: 'auto',
        prompt: 'Canonical per-target-class delivery artifact. Web/SaaS requires a real hosted URL.',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'distribution-adapter',
        label: 'Distribution Adapter',
        source: 'auto',
        prompt: 'Metadata-driven distribution adapter handoff. Store publish is never autonomous.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'operator-approval',
        label: 'Operator Approval',
        source: 'manual',
        prompt: 'Authorized operator approval before any deployment or store submission action.',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'browser-proof',
        label: 'Browser Proof',
        source: 'manual',
        prompt: 'Browser/API proof that the produced artifact resolves and serves the intended commit.',
        input: null,
        evidenceTier: 'A',
      }),
    ]),
  });
}
