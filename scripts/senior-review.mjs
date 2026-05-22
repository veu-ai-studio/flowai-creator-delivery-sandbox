#!/usr/bin/env node
// scripts/senior-review.mjs — CLI wrapper for src/lib/fixReview/seniorReview.js
//
// Runs the 8-question senior-engineer fix review against a diff and
// prints the verdict envelope.
//
// Usage:
//   node scripts/senior-review.mjs                       # staged + unstaged vs HEAD
//   node scripts/senior-review.mjs --staged              # staged only
//   node scripts/senior-review.mjs --base main           # vs main
//   node scripts/senior-review.mjs --commit <sha>        # vs <sha>^
//   node scripts/senior-review.mjs --json                # JSON output
//
// Exit code:
//   0  → overall = green
//   1  → overall = amber
//   2  → overall = red
// (CI can gate on the exit code; humans should still read the report.)

import { execFileSync } from 'node:child_process';
import { parseUnifiedDiff, runSeniorReview } from '../src/lib/fixReview/seniorReview.js';

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function git(args) {
  return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
}

const wantsJson  = !!arg('--json', false);
const stagedOnly = !!arg('--staged', false);
const base       = arg('--base', null);
const commit     = arg('--commit', null);

let diffText;
if (commit) {
  diffText = git(['diff', `${commit}^`, commit]);
} else if (base) {
  diffText = git(['diff', base, '--']);
} else if (stagedOnly) {
  diffText = git(['diff', '--staged']);
} else {
  diffText = git(['diff', 'HEAD']);
}

const diff = parseUnifiedDiff(diffText);
// Build a minimal repoContext from what we can derive without running tests:
//   - known env vars from .env example files (best-effort)
//   - importGraph is NOT supplied (regression_risk returns 'unknown')
let knownEnvVars = [];
try {
  const sampleEnv = git(['ls-files', '.env.example']).trim();
  if (sampleEnv) {
    const text = git(['show', `HEAD:${sampleEnv}`]);
    knownEnvVars = (text.match(/^([A-Z][A-Z0-9_]+)=/gm) ?? []).map((s) => s.replace('=', ''));
  }
} catch { /* best-effort */ }

const report = runSeniorReview({ diff, repoContext: { knownEnvVars } });

if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const COLOR = process.stdout.isTTY ? {
    pass: '\x1b[32m', warn: '\x1b[33m', fail: '\x1b[31m', unknown: '\x1b[90m',
    reset: '\x1b[0m', bold: '\x1b[1m',
  } : { pass: '', warn: '', fail: '', unknown: '', reset: '', bold: '' };
  console.log(`${COLOR.bold}━━━ Senior Engineer Fix Review ━━━${COLOR.reset}`);
  console.log(`reviewed: ${report.reviewedAt}`);
  console.log(`diff:     ${report.diffSummary.files} files, +${report.diffSummary.additions}/-${report.diffSummary.deletions}`);
  console.log(`overall:  ${report.overall.toUpperCase()}\n`);
  for (const q of report.questions) {
    const c = COLOR[q.verdict] || '';
    console.log(`${c}${q.verdict.toUpperCase().padEnd(7)}${COLOR.reset} ${q.question}`);
    console.log(`        why: ${q.why}`);
    for (const e of q.evidence.slice(0, 6)) console.log(`        • ${e}`);
    if (q.suggestion) console.log(`        ↳ ${q.suggestion}`);
    console.log('');
  }
}

process.exit(report.overall === 'red' ? 2 : report.overall === 'amber' ? 1 : 0);
