export const GTM_TEMPLATE_VERSION = '1.0';
export const GTM_STEP_ID = 'step-7-gtm';

export function buildGtmTemplate(productId, context = {}) {
  return Object.freeze({
    version: GTM_TEMPLATE_VERSION,
    stepId: GTM_STEP_ID,
    productId,
    context,
    sections: Object.freeze([
      Object.freeze({
        id: 'gtm-evidence-gate',
        source: 'auto',
        label: 'Product evidence gate',
        prompt: 'Confirm GTM is grounded in actual product, deploy, and renewal state.',
      }),
      Object.freeze({
        id: 'gtm-readiness-score',
        source: 'auto',
        label: 'GTM readiness score',
        prompt: 'Compute canonical readiness from sourced issue severity counts.',
      }),
      Object.freeze({
        id: 'gtm-positioning',
        source: 'auto',
        label: 'Positioning',
        prompt: 'Produce only sourced positioning, never fabricated market claims.',
      }),
      Object.freeze({
        id: 'gtm-channel-plan',
        source: 'auto',
        label: 'Channel plan',
        prompt: 'List channels only when linked to product evidence and operator goals.',
      }),
      Object.freeze({
        id: 'gtm-launch-checklist',
        source: 'auto',
        label: 'Launch checklist',
        prompt: 'Summarize launch readiness and blockers.',
      }),
      Object.freeze({
        id: 'gtm-human-decision-log',
        source: 'manual',
        label: 'Human decision log',
        prompt: 'Authorized operator records the GTM readiness decision before any public-facing claim.',
      }),
    ]),
  });
}
