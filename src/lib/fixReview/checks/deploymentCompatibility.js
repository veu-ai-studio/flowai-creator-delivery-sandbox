// src/lib/fixReview/checks/deploymentCompatibility.js
//
// Q7: Will this deploy correctly? (infrastructure compatibility)
//
// Signal: the diff touches deploy-critical surface (vercel.json,
// package.json dependencies, scripts/, api/ entry points, env-var
// references) without an accompanying change that the deploy needs.
// Common failure modes flagged:
//   - new dependency added but no package-lock change in the diff
//   - api/<name>.js added without matching vercel.json route
//   - new process.env.X read without a documented Doppler / Vercel
//     env-var declaration
//   - vercel.json edit that removes a route still imported elsewhere

'use strict';

function findFile(files, predicate) {
  return files.find((f) => predicate(f.path));
}

function extractNewDeps(packageJsonAdded) {
  const matches = packageJsonAdded.match(/"[a-z@][\w./-]+":\s*"\^?[\d.]+"/g) ?? [];
  return matches.map((m) => m.split(':')[0].trim().replace(/"/g, ''));
}

const NEW_ENV_RE = /process\.env\.([A-Z][A-Z0-9_]+)/g;

export function checkDeploymentCompatibility({ diff, repoContext }) {
  const files = Array.isArray(diff?.files) ? diff.files : [];
  if (files.length === 0) return { verdict: 'pass', evidence: ['no_files_changed'] };

  const evidence = [];
  let worst = 'pass';
  const bump = (v) => {
    if (v === 'fail') worst = 'fail';
    else if (v === 'warn' && worst !== 'fail') worst = 'warn';
  };

  // 7.1 — package.json change without package-lock.json companion
  const pkgChange = findFile(files, (p) => p === 'package.json');
  const lockChange = findFile(files, (p) => p === 'package-lock.json' || p === 'pnpm-lock.yaml' || p === 'yarn.lock');
  if (pkgChange && !lockChange) {
    const added = pkgChange.addedLines.join('\n');
    const newDeps = extractNewDeps(added);
    if (newDeps.length > 0) {
      evidence.push(`package.json adds deps [${newDeps.slice(0, 5).join(', ')}${newDeps.length > 5 ? ', …' : ''}] but no lockfile change in the same diff`);
      bump('warn');
    }
  }

  // 7.2 — new api/ entry without matching vercel.json (rough — we
  //        warn whenever a NEW api file lands without a vercel.json
  //        edit in the same diff)
  const newApiHandler = files.find((f) => f.status === 'added' && /^api\/[^_].*\.(js|mjs|ts)$/.test(f.path));
  const vercelEdit = findFile(files, (p) => p === 'vercel.json');
  if (newApiHandler && !vercelEdit) {
    evidence.push(`new api handler ${newApiHandler.path} — Vercel discovers top-level api/ by convention, but confirm vercel.json rewrites still cover it`);
    bump('warn');
  }

  // 7.3 — new process.env.X reads — every new env read needs to be
  //        SET in production (Doppler/Vercel) or the deploy will
  //        silently degrade. Flag every NEW env-var read.
  const knownEnvVars = new Set(Array.isArray(repoContext?.knownEnvVars) ? repoContext.knownEnvVars : []);
  const newlyReferenced = new Set();
  for (const f of files) {
    const added = Array.isArray(f.addedLines) ? f.addedLines.join('\n') : '';
    for (const m of added.matchAll(NEW_ENV_RE)) {
      const name = m[1];
      if (!knownEnvVars.has(name)) newlyReferenced.add(name);
    }
  }
  if (newlyReferenced.size > 0 && knownEnvVars.size > 0) {
    const list = Array.from(newlyReferenced).slice(0, 8);
    evidence.push(`new process.env reads not in repoContext.knownEnvVars: ${list.join(', ')}`);
    bump('warn');
  } else if (newlyReferenced.size > 0) {
    evidence.push(`new process.env reads (verify these are set in production): ${Array.from(newlyReferenced).slice(0, 8).join(', ')}`);
    bump('warn');
  }

  if (evidence.length === 0) {
    return { verdict: 'pass', evidence: ['no_deployment_signals_detected'] };
  }
  return {
    verdict: worst,
    evidence,
    suggestion: 'Run `npm run build` locally AND confirm every new env-var is set in Doppler + Vercel before promoting.',
  };
}

export const __internals = Object.freeze({ extractNewDeps });
