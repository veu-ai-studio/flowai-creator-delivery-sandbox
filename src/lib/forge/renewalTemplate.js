export const RENEWAL_TEMPLATE_VERSION = '1.0';
export const RENEWAL_STEP_ID = 'step-6-self-renewal';

export function buildRenewalTemplate(productId, deployOutput = {}) {
  return Object.freeze({
    version: RENEWAL_TEMPLATE_VERSION,
    stepId: RENEWAL_STEP_ID,
    productId,
    deployOutput,
    sections: Object.freeze([
      Object.freeze({
        id: 'renewal-deploy-gate',
        source: 'auto',
        label: 'Deployment evidence gate',
        prompt: 'Confirm Step 5 produced a delivery artifact before Self-Renewal runs.',
      }),
      Object.freeze({
        id: 'renewal-agent-recommendation',
        source: 'auto',
        label: 'Agent #3 recommendation',
        prompt: 'Agent #3 recommends renewal action without mutating the product.',
      }),
      Object.freeze({
        id: 'renewal-proposed-delta',
        source: 'auto',
        label: 'Proposed delta',
        prompt: 'Summarize the issue, proposed fix, and expected before/after impact.',
      }),
      Object.freeze({
        id: 'renewal-operator-approval',
        source: 'manual',
        label: 'Operator approval',
        prompt: 'Authorize or reject applying a safe renewal fix. No production mutation occurs without this gate.',
      }),
      Object.freeze({
        id: 'renewal-application',
        source: 'auto',
        label: 'Applied fix',
        prompt: 'Record whether a fix was applied, blocked, escalated, or unavailable.',
      }),
      Object.freeze({
        id: 'renewal-verification',
        source: 'manual',
        label: 'Verification evidence',
        prompt: 'Capture post-renewal test/browser proof or guidance when no safe fix exists.',
      }),
    ]),
  });
}
