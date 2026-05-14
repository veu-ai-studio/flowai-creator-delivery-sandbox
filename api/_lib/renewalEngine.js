// api/_lib/renewalEngine.js
//
// Orchestra-powered renewal engine.  Replaces the prior static-HTML
// engine.  Routes each input mode through either the remediation
// engine (single-input modes) or the synthesis engine (multi-URL
// mode).  All renewals now produce REAL working preview URLs via the
// Vercel REST deployments API.
//
// ─── ROUTING ─────────────────────────────────────────────────────────
//   url                 → remediate (with sourceHints; patch-existing
//                          if hints resolve, else generate-from-scratch)
//   description         → remediate (generate-from-scratch path)
//   content             → remediate (generate-from-scratch path)
//   multi-url-synthesis → synthesize → remediate (generate-from-scratch)
//
// ─── OUTPUT ──────────────────────────────────────────────────────────
//   {
//     ok:              boolean,
//     renewedUrl?:     string,
//     renewalType:     'fork-static-html' | 'generated-from-description'
//                      | 'renewed-content' | 'multi-url-synthesis'
//                      | 'patch-existing-source',
//     patchesApplied:  Array  (when ok)
//     deployedAt:      ISO,
//     remediationPath: 'patch-existing-source' | 'generate-from-scratch'
//                      | 'multi-url-synthesis',
//     sourceDisclosure: string,
//     sourceContributions?: Array,
//     reason?:         string  (when ok:false)
//     buildLog?:       string  (when build failed)
//   }

import { remediate } from './remediationEngine.js';
import { synthesize } from './synthesisEngine.js';

/**
 * @param {{
 *   artifact:      { inputType, raw, normalized },
 *   issues:        Array,
 *   sourceHints?:  { gitUrl?, vercelProject?, base44Project? },
 *   urls?:         string[],
 *   requestOrigin?: string,
 *   renewalType?:  string,
 * }} args
 */
export async function renew(args) {
  const { artifact, issues = [], sourceHints, urls, requestOrigin } = args;
  if (!artifact || typeof artifact !== 'object') throw new TypeError('renew: artifact required');

  // Multi-URL synthesis path.
  if (artifact.inputType === 'multi-url-synthesis' || (Array.isArray(urls) && urls.length >= 2)) {
    const r = await synthesize({ urls: urls || artifact.raw?.urls || [], requestOrigin });
    return {
      ok: !!r.ok,
      renewedUrl: r.renewedUrl,
      renewalType: 'multi-url-synthesis',
      remediationPath: 'multi-url-synthesis',
      sourceDisclosure: `Synthesized from ${(urls || []).length} source URLs.`,
      patchesApplied: collectPatches(issues),
      sourceContributions: r.sourceContributions,
      synthesisLog: r.synthesisLog,
      reason: r.ok ? undefined : r.reason,
      buildLog: r.remediation?.buildLog,
      deploymentId: r.remediation?.deploymentId,
      deployedAt: r.remediation?.deployedAt || new Date().toISOString(),
    };
  }

  // Single-input modes (url / description / content) → remediation.
  const remediation = await remediate({ artifact, issues, sourceHints, requestOrigin });
  return {
    ok: !!remediation.ok,
    renewedUrl: remediation.renewedUrl,
    renewalType: resolveRenewalType(artifact.inputType),
    remediationPath: remediation.path,
    sourceDisclosure: remediation.sourceDisclosure,
    patchesApplied: collectPatches(issues),
    patchedFiles: remediation.patchedFiles,
    generatedFiles: remediation.generatedFiles,
    reason: remediation.ok ? undefined : remediation.reason,
    buildLog: remediation.buildLog,
    deploymentId: remediation.deploymentId,
    deployedAt: remediation.deployedAt,
  };
}

export function resolveRenewalType(inputType) {
  if (inputType === 'url') return 'fork-static-html';
  if (inputType === 'description') return 'generated-from-description';
  if (inputType === 'content') return 'renewed-content';
  if (inputType === 'multi-url-synthesis') return 'multi-url-synthesis';
  return 'generated-from-description';
}

function collectPatches(issues) {
  return issues
    .filter((i) => i && i.autoFixable && i.fixSpec)
    .map((i) => ({
      issueId: i.id, category: i.category,
      kind: i.fixSpec.kind, target: i.fixSpec.target,
      placement: i.fixSpec.placement || null,
      value: i.fixSpec.value || null,
      tone: i.fixSpec.tone || null,
      limitChars: i.fixSpec.limitChars || null,
    }));
}
