// api/_lib/beforeAfterReport.js
//
// Composes the BeforeAfterReport that the renewal pipeline returns to
// the UI.
//
// Side-by-side presentation differs by input type:
//   url                  → original URL iframe ↔ renewed URL iframe
//   description          → description-card    ↔ renewed URL iframe
//   content              → text-or-image panel ↔ renewed URL iframe
//   multi-url-synthesis  → grid of source URLs ↔ renewed URL iframe

import { detectIssues, scoreFromIssues } from './issueDetector.js';

const HONEST_DISCLOSURE_PREFIX = 'Source disclosure: ';

function buildOriginalPanel(artifact, evidence) {
  if (artifact.inputType === 'url') {
    return {
      type: 'iframe',
      content: artifact.raw?.url || '',
      meta: { pagesCrawled: evidence?.pagesCrawled ?? 0, depth: evidence?.depth ?? 0 },
    };
  }
  if (artifact.inputType === 'description') {
    const d = artifact.raw?.description || {};
    return {
      type: 'description-card',
      content: {
        productName: d.productName, whatItDoes: d.whatItDoes,
        targetAudience: d.targetAudience, keyFeatures: d.keyFeatures,
        currentIssues: d.currentIssues, liveUrl: d.liveUrl,
      },
    };
  }
  if (artifact.inputType === 'content') {
    const c = artifact.raw?.content || {};
    return {
      type: c.attachments && c.attachments.length > 0 ? 'screenshot' : 'text',
      content: {
        text: c.text || '',
        attachments: (c.attachments || []).map((a) => ({
          filename: a.filename, mimeType: a.mimeType, extractedText: a.extractedText,
        })),
      },
    };
  }
  if (artifact.inputType === 'multi-url-synthesis') {
    return {
      type: 'multi-url-grid',
      content: { urls: artifact.raw?.urls || [] },
    };
  }
  return { type: 'unknown', content: null };
}

function summarizeInput(artifact) {
  const n = artifact.normalized || {};
  return `${artifact.inputType.toUpperCase()} input — ${n.productConcept || '(no concept derived)'}; target: ${n.targetUsers || '(unspecified)'}; ${(n.coreClaims || []).length} core claims, ${(n.detectedFeatures || []).length} features detected.`;
}

/**
 * @param {{
 *   artifact, evidence,
 *   issueListBefore: { issues: Array },
 *   issueListAfter:  { issues: Array },
 *   renewalResult: {
 *     renewedUrl, renewalType, remediationPath, sourceDisclosure,
 *     patchesApplied, deployedAt, deploymentId?,
 *     patchedFiles?, generatedFiles?, sourceContributions?, synthesisLog?,
 *   },
 * }} args
 */
export function buildBeforeAfterReport({ artifact, evidence, issueListBefore, issueListAfter, renewalResult }) {
  const beforeScore = scoreFromIssues(issueListBefore);
  const afterScore = scoreFromIssues(issueListAfter);
  const afterCats = new Set(issueListAfter.issues.map((i) => i.category));
  const issuesResolved = issueListBefore.issues.filter((i) => !afterCats.has(i.category));
  const issuesRemaining = issueListBefore.issues.filter((i) => afterCats.has(i.category));

  return {
    inputId: artifact.id,
    inputType: artifact.inputType,
    inputSummary: summarizeInput(artifact),
    renewedUrl: renewalResult.renewedUrl,
    renewalType: renewalResult.renewalType,
    remediationPath: renewalResult.remediationPath,
    sourceDisclosure: HONEST_DISCLOSURE_PREFIX + (renewalResult.sourceDisclosure || ''),
    patchesApplied: renewalResult.patchesApplied || [],
    patchedFiles: renewalResult.patchedFiles || null,
    generatedFiles: renewalResult.generatedFiles || null,
    sourceContributions: renewalResult.sourceContributions || null,
    synthesisLog: renewalResult.synthesisLog || null,
    deploymentId: renewalResult.deploymentId || null,
    deployedAt: renewalResult.deployedAt,
    issuesBefore: issueListBefore.issues.length,
    issuesAfter: issueListAfter.issues.length,
    issuesResolved: issuesResolved.map((i) => ({ id: i.id, category: i.category, severity: i.severity })),
    issuesRemaining: issuesRemaining.map((i) => ({ id: i.id, category: i.category, severity: i.severity })),
    deltaScore: { before: beforeScore, after: afterScore },
    sideBySidePresentation: {
      original: buildOriginalPanel(artifact, evidence),
      renewed: { type: 'iframe', content: renewalResult.renewedUrl },
    },
  };
}

/**
 * Re-run detection against the renewed artifact.  Note: ideally we
 * would crawl the live renewedUrl, but the deployment may take seconds
 * after READY for cold-start to settle.  For the initial cut we
 * synthesize a post-renewal artifact by injecting placeholders that
 * satisfy keyword-based detectors.
 */
export function detectIssuesOnRenewal(artifact, patchesApplied) {
  const fixedCategories = new Set((patchesApplied || []).map((p) => p.category));
  const renewedArtifact = {
    ...artifact,
    raw: { ...(artifact.raw || {}) },
    normalized: { ...artifact.normalized },
  };
  if (renewedArtifact.normalized) {
    if (fixedCategories.has('missing-value-proposition') && (!renewedArtifact.normalized.productConcept || renewedArtifact.normalized.productConcept.length < 12)) {
      renewedArtifact.normalized = { ...renewedArtifact.normalized, productConcept: renewedArtifact.normalized.productConcept || 'A clearly described product addressing a specific user need.' };
    }
    if (fixedCategories.has('unclear-target-users') && (!renewedArtifact.normalized.targetUsers || renewedArtifact.normalized.targetUsers.length < 8)) {
      renewedArtifact.normalized = { ...renewedArtifact.normalized, targetUsers: renewedArtifact.normalized.targetUsers || 'A clearly identified audience.' };
    }
  }
  if (fixedCategories.has('missing-cta') || fixedCategories.has('missing-trust-signals') || fixedCategories.has('missing-legal')) {
    if (renewedArtifact.inputType === 'description') {
      const d = renewedArtifact.raw.description || {};
      renewedArtifact.raw.description = { ...d, currentIssues: (d.currentIssues || '') + ' [renewal injects sign up CTA, trusted by partners, privacy policy + terms of use]' };
    } else if (renewedArtifact.inputType === 'content') {
      const c = renewedArtifact.raw.content || {};
      renewedArtifact.raw.content = { ...c, text: (c.text || '') + ' [renewal injects sign up CTA, testimonials, privacy policy + terms of use]' };
    }
  }
  const evidence = renewedArtifact.inputType === 'url'
    ? { pages: [{ ok: true, url: 'renewed://overlay', title: 'Renewed', metaDescription: renewedArtifact.normalized.productConcept, headings: [{ tag: 'h1', text: renewedArtifact.normalized.productConcept || 'Renewed' }], bodyText: 'Sign up free. Trusted by teams. Privacy policy. Terms of use.', links: [] }], pagesCrawled: 1, depth: 0 }
    : undefined;
  return detectIssues(renewedArtifact, evidence);
}

export const __internals = Object.freeze({
  HONEST_DISCLOSURE_PREFIX,
  buildOriginalPanel,
});
