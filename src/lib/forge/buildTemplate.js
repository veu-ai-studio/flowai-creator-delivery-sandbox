export const BUILD_TEMPLATE_VERSION = '1.0';
export const BUILD_STEP_ID = 'step-3-build';

function normalizeProduct(productOrId) {
  if (typeof productOrId === 'string') {
    return { id: productOrId, name: productOrId, description: '', platform: 'unknown' };
  }
  return productOrId ?? { id: 'unknown', name: 'unknown', description: '', platform: 'unknown' };
}

export function buildBuildTemplate(productOrId, designOutput = {}) {
  const product = normalizeProduct(productOrId);
  return Object.freeze({
    productId: product.id,
    designStepId: designOutput.stepId ?? null,
    templateVersion: BUILD_TEMPLATE_VERSION,
    sections: Object.freeze([
      Object.freeze({
        id: 'build-entry-path',
        label: 'Build Entry Path',
        source: 'auto',
        prompt: 'Which entry path authorized this build? PATH_A (Victor directive) or PATH_B (complete design)',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'code-task-dispatches',
        label: 'Code Task Dispatches',
        source: 'orchestrated',
        prompt: 'Specific code tasks to implement derived from design output or Victor directive. Orchestrated by AI build tool when configured.',
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'base44-stub-deletions',
        label: 'Base44 Dead Stub Deletions',
        source: 'auto',
        prompt: `List of dead stubs identified in ${product.name} codebase (platform: ${product.platform ?? 'unknown'}) for deletion. Auto-populated from known product surface audit.`,
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'base44-functionalization',
        label: 'Base44 Surface Functionalization',
        source: 'auto',
        prompt: `List of surfaces to functionalize in ${product.name} codebase (platform: ${product.platform ?? 'unknown'}). Auto-populated from known product surface audit.`,
        input: null,
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'build-risks',
        label: 'Build Risks',
        source: 'derived',
        prompt: 'Risks derived from design gaps carried forward from Step 2.',
        input: null,
        evidenceTier: 'B',
      }),
      Object.freeze({
        id: 'build-decision-log',
        label: 'Build Decision Log',
        source: 'manual',
        prompt: 'Victor build decisions that override or supplement orchestrated outputs.',
        input: [],
        evidenceTier: 'A',
      }),
      Object.freeze({
        id: 'selected-tool',
        label: 'Selected Build Tools',
        source: 'auto',
        prompt: 'Ordered build tool sequence. One tool per sub-step: plan, scaffold, install, test.',
        input: null,
        evidenceTier: 'B',
        undServedFirstEnforced: true,
        selectionMode: 'pipeline',
      }),
    ]),
  });
}
