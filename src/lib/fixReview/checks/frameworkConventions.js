// src/lib/fixReview/checks/frameworkConventions.js
//
// Q3: Does this match framework conventions? (integration correctness)
//
// Signal: pattern-match the added lines against React + Vite + Vercel
// conventions used in this repo:
//   - React components default-export from a PascalCase file
//   - Hooks named useX
//   - api/*.js handler shape: `export default async function handler(req, res)`
//   - process.env access in browser bundle uses VITE_ prefix
//   - direct CommonJS require() in ESM modules
//
// This check is conservative — it only fires when a clear violation
// pattern appears in the added lines.

'use strict';

const VITE_ENV_RE = /\bprocess\.env\.([A-Z][A-Z0-9_]+)/g;
const REQUIRE_RE = /\brequire\s*\(\s*['"]/;
const DEFAULT_EXPORT_FUNCTION_RE = /export\s+default\s+(?:async\s+)?function\s+/;

function isFrontendFile(path) {
  return typeof path === 'string'
    && /^src\/(pages|components|hooks)\//.test(path)
    && /\.(jsx?|tsx?)$/.test(path);
}

function isApiHandler(path) {
  return typeof path === 'string'
    && /^api\/[^_].*\.(js|mjs|ts)$/.test(path)
    && !/_lib|\/cron\//.test(path);
}

function isEsmFile(path) {
  return typeof path === 'string' && /\.(mjs|jsx?|tsx?)$/.test(path);
}

export function checkFrameworkConventions({ diff }) {
  const files = Array.isArray(diff?.files) ? diff.files : [];
  if (files.length === 0) return { verdict: 'pass', evidence: ['no_files_changed'] };

  const evidence = [];
  let worst = 'pass';
  const bump = (v) => {
    if (v === 'fail') worst = 'fail';
    else if (v === 'warn' && worst !== 'fail') worst = 'warn';
  };

  for (const f of files) {
    const added = Array.isArray(f.addedLines) ? f.addedLines.join('\n') : '';

    // 3.1 — browser env-var convention: process.env.X without VITE_ prefix
    //        in a frontend file is almost always dead code at runtime.
    if (isFrontendFile(f.path)) {
      for (const m of added.matchAll(VITE_ENV_RE)) {
        const name = m[1];
        if (!name.startsWith('VITE_')) {
          evidence.push(`${f.path}: process.env.${name} in frontend file (needs VITE_ prefix to reach the browser bundle)`);
          bump('fail');
        }
      }
    }

    // 3.2 — CommonJS require() inside an ESM module.
    if (isEsmFile(f.path) && REQUIRE_RE.test(added)) {
      evidence.push(`${f.path}: CommonJS require() inside ESM module — use import statements`);
      bump('warn');
    }

    // 3.3 — api/*.js handlers should export a default function with the
    //        (req, res) signature. Flag a default-export NON-function.
    if (isApiHandler(f.path) && f.status === 'added' && added.length > 0) {
      if (!DEFAULT_EXPORT_FUNCTION_RE.test(added) && !/export\s+default\s+(handler|async\s+\(?req)/.test(added)) {
        evidence.push(`${f.path}: api handler — confirm it default-exports an (req,res) function (Vercel discovers handlers by this shape)`);
        bump('warn');
      }
    }
  }

  if (evidence.length === 0) {
    return { verdict: 'pass', evidence: ['no_convention_violations_in_added_lines'] };
  }
  return {
    verdict: worst,
    evidence,
    suggestion: 'Convention drift is silent and lethal at runtime. Each line above will silently fail in the browser / serverless bundle even if tests pass.',
  };
}

export const __internals = Object.freeze({ isFrontendFile, isApiHandler, isEsmFile });
