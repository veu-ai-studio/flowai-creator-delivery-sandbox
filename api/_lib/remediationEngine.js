// api/_lib/remediationEngine.js
//
// Orchestra-powered remediation engine.  Replaces the static-HTML
// renewal engine.  Produces a real Vercel preview URL per renewal.
//
// Two paths:
//   PATCH-EXISTING-SOURCE  — when sourceAcquisition returns a sourceRoot.
//                            Each autoFixable issue is sent to the
//                            claudeCode adapter to produce a patched
//                            file; the patched file tree is deployed
//                            via the Vercel adapter.
//
//   GENERATE-FROM-SCRATCH  — when no source is reachable.  The
//                            claudeCode adapter produces a complete
//                            Vite-React project tree from the spec;
//                            the tree is deployed via Vercel adapter.
//
// Both paths return the SAME shape:
//   {
//     ok:           boolean,
//     renewedUrl?:  string,
//     path:         'patch-existing-source' | 'generate-from-scratch',
//     deploymentId?: string,
//     patchedFiles?: string[],
//     generatedFiles?: string[],
//     buildLog?:    string,
//     reason?:      string,
//     deployedAt:   ISO timestamp,
//   }
//
// On build failure, ok:false + buildLog populated, NO deployment URL
// is returned (per dispatch: don't deploy a broken build).

import { dispatch } from '../../src/lib/orchestra/index.js';
import { acquireSource } from './sourceAcquisition.js';

const MAX_PATCH_ISSUES = 5; // cap to keep Claude latency / cost bounded.

/**
 * @param {{
 *   artifact: { inputType, raw, normalized },
 *   issues:   Array,
 *   sourceHints?: { gitUrl?, vercelProject?, base44Project? },
 *   requestOrigin?: string,
 * }} args
 */
export async function remediate(args) {
  const { artifact, issues = [], sourceHints, requestOrigin } = args;
  if (!artifact || typeof artifact !== 'object') throw new TypeError('remediate: artifact required');

  const fixable = issues.filter((i) => i.autoFixable);

  // Attempt source acquisition only when hints are present.  description
  // and content inputs have no source to fetch, so they always take the
  // generate path.
  const hints = sourceHints || {};
  const hasHints = !!(hints.gitUrl || hints.vercelProject || hints.base44Project);
  let acq = { sourceRoot: null, framework: null, retrievalMethod: 'none', notes: ['No source hints supplied.'] };
  if (hasHints) {
    try { acq = await acquireSource(hints); }
    catch (e) {
      acq = { sourceRoot: null, framework: null, retrievalMethod: 'none', notes: [`Source acquisition threw: ${e.message || String(e)}`] };
    }
  }

  if (acq.sourceRoot) {
    return patchExistingSource({ artifact, fixable, acq, requestOrigin });
  }
  return generateFromScratch({ artifact, fixable, acq, requestOrigin });
}

// ─── PATCH-EXISTING-SOURCE ───────────────────────────────────────────

async function patchExistingSource({ artifact, fixable, acq, requestOrigin }) {
  const sourceFiles = acq.sourceRoot.files.slice();
  const fileMap = new Map(sourceFiles.map((f) => [f.path, f.content]));
  const patchedPaths = [];
  const patchErrors = [];

  // Cap how many issues we feed Claude to keep latency / cost bounded.
  for (const issue of fixable.slice(0, MAX_PATCH_ISSUES)) {
    const target = pickPatchTarget(issue, fileMap);
    if (!target) {
      patchErrors.push({ issueId: issue.id, reason: 'no patch target identified' });
      continue;
    }
    const current = fileMap.get(target);
    const r = await dispatch('code-patch', {
      filePath: target,
      sourceContent: current,
      issueSpec: issue,
      framework: acq.framework,
    });
    if (!r.ok) {
      patchErrors.push({ issueId: issue.id, reason: r.error || 'patch failed' });
      continue;
    }
    if (typeof r.data?.patchedContent === 'string' && r.data.patchedContent !== current) {
      fileMap.set(target, r.data.patchedContent);
      patchedPaths.push(target);
    }
  }

  // Deploy the patched file tree via Vercel REST API.
  const filesToDeploy = Array.from(fileMap.entries()).map(([path, content]) => ({ path, content }));
  const deploy = await dispatch('deploy', {
    files: filesToDeploy,
    projectName: nameFromArtifact(artifact, 'patched'),
    target: 'preview',
    framework: acq.framework === 'vite' ? 'vite' : null,
  });

  const sourceDisclosure = `Source acquired via ${acq.retrievalMethod}${acq.gitRepoUrl ? ` (${acq.gitRepoUrl})` : ''}.  ${acq.notes.join(' ')}`;

  if (!deploy.ok) {
    return {
      ok: false,
      path: 'patch-existing-source',
      reason: deploy.error,
      buildLog: deploy.buildLog || null,
      deploymentId: deploy.deploymentId || null,
      patchedFiles: patchedPaths,
      patchErrors,
      sourceDisclosure,
      deployedAt: new Date().toISOString(),
    };
  }

  return {
    ok: true,
    path: 'patch-existing-source',
    renewedUrl: deploy.data.url,
    deploymentId: deploy.data.deploymentId,
    patchedFiles: patchedPaths,
    patchErrors,
    sourceDisclosure,
    deployedAt: new Date().toISOString(),
  };
}

/**
 * Pick a single file to patch for a given issue.  Heuristic:
 *   - missing-h1 / missing-meta-description → first index.html OR root
 *     HTML file
 *   - missing-cta / missing-trust-signals / missing-legal → the App.jsx /
 *     App.tsx OR the first src/*.jsx file
 *   - everything else → App.jsx if present, otherwise the first source
 *     file
 * Returns the chosen file path or null.
 */
function pickPatchTarget(issue, fileMap) {
  const paths = Array.from(fileMap.keys());
  const findExt = (exts) => paths.find((p) => exts.some((e) => p.endsWith(e)));
  const findEnding = (suffix) => paths.find((p) => p.endsWith(suffix));

  if (issue.category === 'missing-h1' || issue.category === 'seo-gap' || issue.category === 'missing-meta-description') {
    return findEnding('/index.html') || findEnding('index.html') || findExt(['.html']);
  }
  // For most layout/UX issues, App.jsx is the right target.
  return (
    findEnding('/App.jsx') || findEnding('/App.tsx') ||
    findEnding('src/App.jsx') || findEnding('src/App.tsx') ||
    findExt(['.jsx', '.tsx']) ||
    null
  );
}

// ─── GENERATE-FROM-SCRATCH ───────────────────────────────────────────

async function generateFromScratch({ artifact, fixable, acq, requestOrigin }) {
  const spec = composeSpec(artifact, fixable);
  const generated = await dispatch('generate-from-scratch', { spec, framework: 'vite-react' });
  if (!generated.ok || !Array.isArray(generated.data?.files)) {
    return {
      ok: false,
      path: 'generate-from-scratch',
      reason: generated.error || 'generator returned no files',
      sourceDisclosure: `Source unreachable; generate-from-scratch attempted.  ${acq.notes.join(' ')}`,
      deployedAt: new Date().toISOString(),
    };
  }

  const filesToDeploy = generated.data.files;
  const deploy = await dispatch('deploy', {
    files: filesToDeploy,
    projectName: nameFromArtifact(artifact, 'generated'),
    target: 'preview',
    framework: 'vite',
  });
  const sourceDisclosure = `Source unreachable; new product generated from spec.  ${acq.notes.join(' ')}`;

  if (!deploy.ok) {
    return {
      ok: false,
      path: 'generate-from-scratch',
      reason: deploy.error,
      buildLog: deploy.buildLog || null,
      deploymentId: deploy.deploymentId || null,
      generatedFiles: filesToDeploy.map((f) => f.path),
      sourceDisclosure,
      deployedAt: new Date().toISOString(),
    };
  }
  return {
    ok: true,
    path: 'generate-from-scratch',
    renewedUrl: deploy.data.url,
    deploymentId: deploy.data.deploymentId,
    generatedFiles: filesToDeploy.map((f) => f.path),
    sourceDisclosure,
    deployedAt: new Date().toISOString(),
  };
}

function composeSpec(artifact, fixable) {
  const n = artifact.normalized || {};
  return {
    productName: n.productConcept ? n.productConcept.slice(0, 60) : 'Renewed product',
    productConcept: n.productConcept || '',
    targetUsers: n.targetUsers || '',
    coreClaims: Array.isArray(n.coreClaims) ? n.coreClaims : [],
    detectedFeatures: Array.isArray(n.detectedFeatures) ? n.detectedFeatures : [],
    issuesToResolve: fixable.map((i) => ({ category: i.category, severity: i.severity, fixSpec: i.fixSpec })),
    sourceContributions: Array.isArray(artifact.sourceContributions) ? artifact.sourceContributions : [],
  };
}

function nameFromArtifact(artifact, suffix) {
  const stub = String(artifact?.normalized?.productConcept || artifact?.inputType || 'renewal')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'flowai-renewed';
  return `flowai-renewed-${stub}-${suffix}`;
}

export const __internals = Object.freeze({
  pickPatchTarget,
  composeSpec,
  nameFromArtifact,
});
