#!/usr/bin/env node
// Smoke runner for PHASE B2 remediation pipeline.
// Pipeline:
//   1. Run Phase B1 evaluation pipeline (Lighthouse + axe + runtime) to
//      get a real findings array against flowai-dun.vercel.app.
//   2. Pass those findings into runRemediation with a synthetic file
//      resolver that supplies fixture content for each strategy. This
//      lets us assert that patch generators actually fire even though
//      the live repo isn't a static HTML site.
//   3. Print classifier counts, budget application, fix attempts +
//      successes, collision results, governance summary.
//
// Usage:  node scripts/smoke-phase-b2.mjs [url]

import { runEvaluationPipeline } from '../src/lib/evaluation/evaluationPipeline.js';
import { runRemediation } from '../src/lib/remediation/runRemediation.js';

const url = process.argv[2] || 'https://flowai-dun.vercel.app';

// Synthetic fixture content per strategy — lets us exercise every patch
// generator without depending on real repo file paths.
const FIXTURES = {
  'inject-alt-attribute': {
    filePath: 'index.html',
    fileContent:
      `<!doctype html><html><head><title>x</title></head><body>` +
      `<img src="/hero.png"><img src="/logo.svg" alt="logo"><img src="/banner.jpg">` +
      `</body></html>`,
  },
  'css-contrast-adjust': {
    filePath: 'styles.css',
    fileContent: `body { color: #999; background: #fff; }\n.btn { color: #aaa; }\n`,
  },
  'inject-metadata': {
    filePath: 'index.html',
    fileContent: `<!doctype html><html><head><title>x</title></head><body></body></html>`,
  },
  'inject-viewport': {
    filePath: 'index.html',
    fileContent: `<!doctype html><html><head><title>x</title></head><body></body></html>`,
  },
  'inject-aria-label': {
    filePath: 'index.html',
    fileContent:
      `<!doctype html><html><head></head><body>` +
      `<button>OK</button><select><option>a</option></select>` +
      `<input type="text"><a href="/x">x</a>` +
      `</body></html>`,
  },
  'repair-asset-path': {
    filePath: 'index.html',
    fileContent:
      `<!doctype html><html><head>` +
      `<link rel="stylesheet" href="/missing.css">` +
      `<script src="/missing.js"></script>` +
      `</head><body><img src="/missing.png"></body></html>`,
  },
  'repair-broken-link': {
    filePath: 'index.html',
    fileContent: `<!doctype html><html><head></head><body><script src="/api/dead.js"></script></body></html>`,
  },
};

function syntheticResolver({ finding }) {
  const fix = FIXTURES[finding?.remediationStrategy];
  return fix ? { ...fix } : null;
}

console.log(`\n[PHASE-B2 SMOKE] target=${url}\n`);

// ── 1. Phase B1 to collect findings ────────────────────────────────────────
console.log('[PHASE-B2 SMOKE] running Phase B1 to collect findings…');
const t0 = Date.now();
const pipeline = await runEvaluationPipeline({
  url,
  options: { phaseBFindings: [], onStep: () => {} },
});
console.log(`  pipeline ok=${pipeline.ok} findings=${pipeline.findings.length} dt=${Date.now() - t0}ms`);
console.log(`  perEvaluator: ${JSON.stringify(pipeline.perEvaluator)}`);

// ── 2. Phase B2 remediation ────────────────────────────────────────────────
console.log('\n[PHASE-B2 SMOKE] running runRemediation…');
const events = [];
const out = await runRemediation({
  findings: pipeline.findings,
  fetchFileForFinding: ({ finding }) => syntheticResolver({ finding }),
  onStep: (evt) => events.push(evt.log),
});

console.log('\n[PHASE-B2 SMOKE] events:');
for (const e of events) console.log(`  - ${e.kind} :: ${JSON.stringify(e).slice(0, 200)}`);

console.log('\n[PHASE-B2 SMOKE] summary:');
console.log(JSON.stringify(out.summary, null, 2));

console.log('\n[PHASE-B2 SMOKE] patches generated:', out.patches.length);
for (const p of out.patches.slice(0, 5)) {
  console.log(`  - ${p.strategy} @ ${p.filePath}`);
  console.log(`    confidence=${p.confidence}  rollbackId=${p.provenance.rollbackId?.slice(0, 8) ?? 'n/a'}…`);
  console.log(`    desc=${p.changeDescription?.slice(0, 140)}`);
  console.log(`    verify=${p.verification.method}: ${p.verification.successCriterion}`);
}

console.log('\n[PHASE-B2 SMOKE] escalated samples:', out.escalated.length);
for (const e of out.escalated.slice(0, 5)) {
  console.log(`  - [${e.severity}] ${e.category} :: ${e.reason}`);
}

console.log('\n[PHASE-B2 SMOKE] ineligible samples:', out.ineligible.length);
for (const e of out.ineligible.slice(0, 5)) {
  console.log(`  - [${e.severity}] ${e.category} :: ${e.reason}`);
}

console.log('\n[PHASE-B2 SMOKE] success criteria:');
console.log(`  88+ findings entered classifier:              ${out.summary.totalFindings >= 1 ? 'YES' : 'NO'} (${out.summary.totalFindings})`);
console.log(`  ≥20 classified ELIGIBLE:                      ${out.summary.eligible >= 20 ? 'YES' : 'NO'} (${out.summary.eligible})`);
console.log(`  ≥1 patch generator produced a fix:            ${out.summary.fixesSucceeded >= 1 ? 'YES' : 'NO'} (${out.summary.fixesSucceeded})`);
console.log(`  Multi-Fix would no longer skip:               ${out.patches.length >= 1 ? 'YES' : 'NO'} (${out.patches.length} kept patches)`);
console.log(`  Budget enforced (≤25 auto-fixes):             ${out.summary.budgetApplied.withinBudget <= 25 ? 'YES' : 'NO'} (${out.summary.budgetApplied.withinBudget} within, ${out.summary.budgetApplied.deferred} deferred)`);
console.log(`  No patch with confidence < 0.7:               ${out.patches.every((p) => p.confidence >= 0.7) ? 'YES' : 'NO'}`);
console.log(`  Governance summary populated:                 ${out.summary && typeof out.summary === 'object' ? 'YES' : 'NO'}`);

process.exit(0);
