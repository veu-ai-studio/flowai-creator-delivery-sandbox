// src/lib/remediation/domFixProposalGenerator.js
//
// U3 — Honest DOM-level proposal generator. This module never fabricates
// source file paths or repo diffs. It only proposes runtime/DOM-level fixes
// from observed evidence.

const FIX_LEVEL = Object.freeze({
  DOM_LEVEL_PROPOSAL: 'DOM_LEVEL_PROPOSAL',
  CONFIG_RECOMMENDATION: 'CONFIG_RECOMMENDATION',
  SOURCE_REQUIRED: 'SOURCE_REQUIRED',
  MANUAL_INVESTIGATION: 'MANUAL_INVESTIGATION',
});

function risk({ regressionRisk = 'low', architecturalImpact = 'none', sideEffects = [], confidence = 70 } = {}) {
  return {
    regressionRisk,
    architecturalImpact,
    sideEffects,
    requiresReview: confidence < 50,
    confidence,
  };
}

function baseProposal(finding, overrides) {
  const confidence = overrides.riskAssessment?.confidence ?? 60;
  const fixLevel = confidence < 30 ? FIX_LEVEL.MANUAL_INVESTIGATION : overrides.fixLevel;
  return {
    findingId: finding?.id ?? `${finding?.category ?? 'finding'}:${finding?.location ?? ''}`,
    title: overrides.title ?? finding?.description ?? finding?.category ?? 'Finding',
    fixLevel,
    evidenceLevel: overrides.evidenceLevel ?? finding?.evidenceLevel ?? 'INFERRED',
    proposal: overrides.proposal ?? '',
    before: overrides.before ?? '',
    after: overrides.after ?? '',
    selector: overrides.selector ?? finding?.location ?? '',
    rationale: overrides.rationale ?? 'Proposal is based on rendered runtime evidence only.',
    riskAssessment: overrides.riskAssessment ?? risk({ confidence }),
    sourceFile: null,
    patch: null,
  };
}

function categoryOf(finding) {
  return String(finding?.category ?? finding?.evidenceType ?? '').toLowerCase();
}

function missingAltProposal(finding) {
  return baseProposal(finding, {
    title: 'Add missing image alt text',
    fixLevel: FIX_LEVEL.DOM_LEVEL_PROPOSAL,
    evidenceLevel: finding?.evidenceLevel ?? 'DOM_OBSERVED',
    proposal: 'Add an alt attribute that describes the image purpose. Use empty alt text only for decorative images.',
    before: '<img src="..." />',
    after: '<img src="..." alt="Describe the image purpose" />',
    rationale: 'An image without alt text was observed in the rendered DOM. This is an additive accessibility fix.',
    riskAssessment: risk({ regressionRisk: 'low', confidence: 82, sideEffects: ['Screen-reader output changes for this image.'] }),
  });
}

function missingH1Proposal(finding, framework) {
  const reactLike = /react|next/i.test(framework?.framework ?? '');
  return baseProposal(finding, {
    title: 'Add a primary h1 heading',
    fixLevel: FIX_LEVEL.DOM_LEVEL_PROPOSAL,
    evidenceLevel: finding?.evidenceLevel ?? 'DOM_OBSERVED',
    proposal: 'Add one visible h1 near the start of the main content area.',
    before: '<main>...</main>',
    after: reactLike ? '<main>\n  <h1 className="...">Page Title</h1>\n  ...\n</main>' : '<main>\n  <h1 class="...">Page Title</h1>\n  ...\n</main>',
    rationale: 'The rendered DOM did not expose a primary h1. This improves document hierarchy but the exact copy should match product intent.',
    riskAssessment: risk({ regressionRisk: 'low', confidence: 68, sideEffects: ['Visual layout may shift if existing CSS does not account for the heading.'] }),
  });
}

function missingMetaProposal(finding) {
  return baseProposal(finding, {
    title: 'Add a meta description',
    fixLevel: FIX_LEVEL.DOM_LEVEL_PROPOSAL,
    evidenceLevel: finding?.evidenceLevel ?? 'HTML_OBSERVED',
    proposal: 'Add a concise page-specific meta description to the document head.',
    before: '<head>...</head>',
    after: '<head>\n  <meta name="description" content="Concise page description." />\n  ...\n</head>',
    rationale: 'The rendered document head did not expose a meta description. This is additive and low-risk.',
    riskAssessment: risk({ regressionRisk: 'low', confidence: 76 }),
  });
}

function slowResourceProposal(finding) {
  return baseProposal(finding, {
    title: 'Optimize slow or large resource',
    fixLevel: FIX_LEVEL.SOURCE_REQUIRED,
    evidenceLevel: finding?.evidenceLevel ?? 'RUNTIME_OBSERVED',
    proposal: 'Inspect this resource in the source/build pipeline. For images, add width/height, compression, responsive srcset, and loading="lazy" where below the fold.',
    before: finding?.location ?? 'slow resource URL',
    after: 'Optimized asset and loading strategy in source/build configuration',
    rationale: 'The browser observed a slow or large resource, but source access is required to apply the correct production fix.',
    riskAssessment: risk({ regressionRisk: 'medium', architecturalImpact: 'minor', confidence: 45, sideEffects: ['Asset dimensions or lazy-loading can affect layout if applied incorrectly.'] }),
  });
}

function failedNetworkProposal(finding) {
  return baseProposal(finding, {
    title: 'Investigate failed network request',
    fixLevel: FIX_LEVEL.SOURCE_REQUIRED,
    evidenceLevel: finding?.evidenceLevel ?? 'RUNTIME_OBSERVED',
    proposal: 'Check route configuration, environment variables, CORS policy, and caller URL for the failing request. Remove the call if the endpoint is obsolete.',
    before: finding?.detail ?? finding?.location ?? 'failed request',
    after: 'Working endpoint, corrected route/env config, or removed obsolete call',
    rationale: 'The browser observed a failed request. The correct fix depends on backend route ownership and deployment configuration.',
    riskAssessment: risk({ regressionRisk: 'high', architecturalImpact: 'significant', confidence: 30, sideEffects: ['Changing API routes or request URLs may affect dependent features.'] }),
  });
}

function consoleErrorProposal(finding) {
  return baseProposal(finding, {
    title: 'Investigate browser console error',
    fixLevel: FIX_LEVEL.MANUAL_INVESTIGATION,
    evidenceLevel: finding?.evidenceLevel ?? 'RUNTIME_OBSERVED',
    proposal: 'Use the stack trace and registered source repository to locate the real source module. Do not patch minified bundle output directly.',
    before: finding?.detail ?? finding?.description ?? 'console error',
    after: 'Source-level fix after stack trace maps to inspected repository code',
    rationale: 'A runtime error was observed, but browser stack traces alone do not prove source-file ownership.',
    riskAssessment: risk({ regressionRisk: 'medium', architecturalImpact: 'minor', confidence: 25, sideEffects: ['Root cause may be data, environment, or code. Source inspection is required.'] }),
  });
}

export function generateDomFixProposal({ finding, frameworkDetection } = {}) {
  const category = categoryOf(finding);
  if (/image-alt|missing-alt|alt-text/.test(category)) return missingAltProposal(finding);
  if (/missing-h1|heading-one|h1/.test(category)) return missingH1Proposal(finding, frameworkDetection);
  if (/meta-description/.test(category)) return missingMetaProposal(finding);
  if (/slow-resource|large-resource/.test(category)) return slowResourceProposal(finding);
  if (/failed-network-request|network/.test(category)) return failedNetworkProposal(finding);
  if (/console-error|pageerror|runtime-error/.test(category)) return consoleErrorProposal(finding);
  return baseProposal(finding, {
    title: finding?.description ?? 'Manual investigation recommended',
    fixLevel: FIX_LEVEL.MANUAL_INVESTIGATION,
    evidenceLevel: finding?.evidenceLevel ?? 'INFERRED',
    proposal: 'Inspect the registered source repository before generating a patch.',
    before: finding?.detail ?? finding?.location ?? '',
    after: 'Source-level fix requires inspected repository code',
    rationale: 'No safe DOM-level pattern is available for this finding category.',
    riskAssessment: risk({ regressionRisk: 'medium', architecturalImpact: 'minor', confidence: 20 }),
  });
}

export function generateDomFixProposals({ findings = [], deepBrowserAnalysis = null } = {}) {
  const frameworkDetection = deepBrowserAnalysis?.frameworkDetection ?? null;
  return (Array.isArray(findings) ? findings : [])
    .slice(0, 50)
    .map((finding) => generateDomFixProposal({ finding, frameworkDetection }));
}

export const __internals = Object.freeze({ FIX_LEVEL, risk, categoryOf });
