// src/lib/fixReview/checks/runtimeIntegrity.js
//
// Q4: Will this compile/build? (runtime integrity)
//
// Signal: scan the added lines for syntactic markers that frequently
// produce build-time or load-time failures even when local tests pass:
//   - case-collision file names within the same directory (e.g.
//     Tooltip.jsx + tooltip.jsx — Vercel Linux build breaks)
//   - imports from paths that another removed file used to provide
//   - unbalanced brace / paren / template counts in the added block
//   - direct `import ... from 'fs'` or other Node built-ins in
//     frontend code
//
// This check is intentionally lightweight — it does NOT run the build.
// It surfaces shapes that have historically caused failures.

'use strict';

const NODE_BUILTINS = new Set([
  'fs', 'fs/promises', 'path', 'os', 'child_process', 'crypto',
  'http', 'https', 'net', 'tls', 'dns', 'cluster', 'process',
  'stream', 'buffer', 'util', 'worker_threads',
]);

function isFrontendFile(path) {
  return typeof path === 'string'
    && /^src\/(pages|components|hooks)\//.test(path)
    && /\.(jsx?|tsx?)$/.test(path);
}

function detectCaseCollision(files) {
  const byLowerDir = new Map();
  for (const f of files) {
    if (!f.path) continue;
    const idx = f.path.lastIndexOf('/');
    const dir = idx >= 0 ? f.path.slice(0, idx + 1).toLowerCase() : '';
    const base = (idx >= 0 ? f.path.slice(idx + 1) : f.path).toLowerCase();
    const key = `${dir}${base}`;
    if (!byLowerDir.has(key)) byLowerDir.set(key, []);
    byLowerDir.get(key).push(f.path);
  }
  const collisions = [];
  for (const [, paths] of byLowerDir) {
    if (paths.length > 1) {
      const distinct = Array.from(new Set(paths));
      if (distinct.length > 1) collisions.push(distinct);
    }
  }
  return collisions;
}

function detectFrontendNodeBuiltin(file) {
  if (!isFrontendFile(file.path)) return null;
  const added = Array.isArray(file.addedLines) ? file.addedLines.join('\n') : '';
  const m = added.match(/from\s+['"]node:([a-z][a-z_/]+)['"]|from\s+['"]([a-z][a-z_/]+)['"]/);
  if (!m) return null;
  const mod = m[1] ?? m[2];
  if (mod && NODE_BUILTINS.has(mod)) return mod;
  return null;
}

function countMatches(s, re) {
  if (typeof s !== 'string') return 0;
  return (s.match(re) ?? []).length;
}

export function checkRuntimeIntegrity({ diff }) {
  const files = Array.isArray(diff?.files) ? diff.files : [];
  if (files.length === 0) return { verdict: 'pass', evidence: ['no_files_changed'] };

  const evidence = [];
  let worst = 'pass';
  const bump = (v) => {
    if (v === 'fail') worst = 'fail';
    else if (v === 'warn' && worst !== 'fail') worst = 'warn';
  };

  // 4.1 — case-collision detection
  const collisions = detectCaseCollision(files);
  for (const c of collisions) {
    evidence.push(`case_collision: ${c.join(' + ')} — Vercel Linux build will fail (NTFS hides this locally)`);
    bump('fail');
  }

  // 4.2 — Node built-in imported in a frontend bundle
  for (const f of files) {
    const builtin = detectFrontendNodeBuiltin(f);
    if (builtin) {
      evidence.push(`${f.path}: imports node-builtin '${builtin}' — will fail vite bundling for the browser`);
      bump('fail');
    }
  }

  // 4.3 — unbalanced braces / parens / template literals in the
  //        added block (rough signal; per-file)
  for (const f of files) {
    const added = Array.isArray(f.addedLines) ? f.addedLines.join('\n') : '';
    if (added.length === 0) continue;
    const opens = countMatches(added, /\{/g);
    const closes = countMatches(added, /\}/g);
    if (Math.abs(opens - closes) >= 5) {
      evidence.push(`${f.path}: ±${Math.abs(opens - closes)} brace imbalance in added lines — likely truncation or malformed diff`);
      bump('warn');
    }
  }

  if (evidence.length === 0) {
    return { verdict: 'pass', evidence: ['no_runtime_integrity_signals'] };
  }
  return {
    verdict: worst,
    evidence,
    suggestion: 'These shapes historically cause Vercel build failures even when `npm test` is green locally. Re-run `npm run build` against the patched tree.',
  };
}

export const __internals = Object.freeze({
  detectCaseCollision, detectFrontendNodeBuiltin, isFrontendFile, NODE_BUILTINS,
});
