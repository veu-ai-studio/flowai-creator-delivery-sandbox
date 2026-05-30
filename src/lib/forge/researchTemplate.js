export const RESEARCH_TEMPLATE_VERSION = '1.0';
export const RESEARCH_STEP_ID = 'step-1-research';
export const TARGET_CUSTOMER_PROFILE = 'All ESG, EHS, CSR, SDGs and Sustainability practitioners in school districts, colleges and universities, local and national government, businesses and NGOs';

function normalizeProduct(productOrId) {
  if (typeof productOrId === 'string') {
    return { id: productOrId, name: productOrId, description: '', platform: 'unknown' };
  }
  return productOrId ?? { id: 'unknown', name: 'unknown', description: '', platform: 'unknown' };
}

export function buildResearchTemplate(productOrId, researchOutput) {
  const product = normalizeProduct(productOrId);
  return Object.freeze({
    productId: product.id,
    researchStepId: researchOutput?.stepId ?? null,
    templateVersion: RESEARCH_TEMPLATE_VERSION,
    sections: Object.freeze([
      Object.freeze({
        id: 'current-state',
        label: 'Current Product State',
        source: 'auto',
        prompt: 'What surfaces are VERIFIED vs PARTIAL vs UNVERIFIED in the current matrix?',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'research-tool-selection',
        label: 'AI Research Platform Selection',
        source: 'auto',
        prompt: 'Select highest-ranked AI research platform by cost and performance for this research task. Rank available options and select top performer.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'target-customer',
        label: 'Target Customer Profile',
        source: 'manual',
        prompt: `Who is the primary buyer or user profile for ${product.name} (${product.description})?`,
        input: TARGET_CUSTOMER_PROFILE,
        status: 'complete',
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'market-gaps',
        label: 'Market and User Gaps',
        source: 'orchestrated',
        prompt: 'What problems does this product solve that are not yet fully addressed?',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'regulatory-requirements',
        label: 'Regulatory and Compliance Requirements',
        source: 'orchestrated',
        prompt: 'What regulatory frameworks apply? (ESG: GRI, CDP, TCFD, SEC climate rule, CSRD)',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'regulatory-jurisdiction',
        label: 'Jurisdiction-Specific Requirements',
        source: 'orchestrated',
        prompt: 'Research national and local ESG requirements for the jurisdiction the user is targeting. All major frameworks apply as baseline: GRI, CDP, TCFD, SEC climate rule, CSRD.',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'competitive-landscape',
        label: 'Competitive Landscape',
        source: 'orchestrated',
        prompt: `Who are the primary competitors? What gaps does ${product.name} fill?`,
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'next-priorities',
        label: 'Research Conclusions and Next Priorities',
        source: 'orchestrated',
        prompt: 'Based on current state, gaps, and requirements: what should be built or improved next?',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'selected-tool',
        label: 'Selected Research Tool',
        source: 'auto',
        prompt: 'Research tool selected by FlowAI Tool Intelligence. Underserved-first weighting applied. Null if no service configured or mode is MANUAL.',
        input: null,
        evidenceTier: 'B',
        undServedFirstEnforced: true,
      }),
    ]),
  });
}

export function manualResearchSections(template) {
  return (template?.sections ?? []).filter(section => section.source === 'manual');
}
