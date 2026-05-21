#!/usr/bin/env node
// Smoke runner for PHASE B1 multi-engine evaluation pipeline.
// Calls runEvaluationPipeline against a target URL and prints per-evaluator
// findings counts + post-normalization stats. Does NOT involve the full
// orchestrator — exercises the new pipeline in isolation.
//
// Usage:
//   node scripts/smoke-phase-b1.mjs [url]
//   default url: https://flowai-dun.vercel.app

import { runEvaluationPipeline } from '../src/lib/evaluation/evaluationPipeline.js';

const url = process.argv[2] || 'https://flowai-dun.vercel.app';

console.log(`\n[PHASE-B1 SMOKE] target=${url}\n`);

const t0 = Date.now();
const out = await runEvaluationPipeline({
  url,
  options: {
    phaseBFindings: [],  // smoke test runs the new evaluators only
    onStep: (evt) => {
      const log = evt?.log || {};
      console.log(
        `  [evt] ${log.kind ?? 'step'} :: ${log.evaluator ?? '?'} :: ` +
        `findings=${log.findingsCount ?? '?'} ok=${log.ok ?? '?'}` +
        (log.error ? ` error=${String(log.error).slice(0, 100)}` : ''),
      );
    },
  },
});
const dt = Date.now() - t0;

console.log('\n[PHASE-B1 SMOKE] result envelope:');
console.log(JSON.stringify({
  ok: out.ok,
  totalFindings: out.findings.length,
  perEvaluator: out.perEvaluator,
  stats: out.stats,
  errors: out.errors,
  durationMs: dt,
}, null, 2));

console.log('\n[PHASE-B1 SMOKE] top-5 findings by severity:');
for (const f of out.findings.slice(0, 5)) {
  console.log(`  [${f.severity}] ${f.dimension} :: ${f.category}`);
  console.log(`    src=${Array.isArray(f.source) ? f.source.join('+') : f.source}  conf=${f.confidence?.toFixed?.(2)}  count=${f.count}`);
  console.log(`    desc=${String(f.description).slice(0, 140)}`);
}

console.log('\n[PHASE-B1 SMOKE] success criteria:');
console.log(`  combined findings > 0:                   ${out.findings.length > 0 ? 'YES' : 'NO'}`);
console.log(`  Lighthouse produced findings:            ${out.perEvaluator?.lighthouse > 0 ? 'YES' : 'NO'} (count=${out.perEvaluator?.lighthouse ?? 'n/a'})`);
console.log(`  axe-core produced findings:              ${out.perEvaluator?.['axe-core'] > 0 ? 'YES' : 'NO'} (count=${out.perEvaluator?.['axe-core'] ?? 'n/a'})`);
console.log(`  Console capture produced findings:       ${out.perEvaluator?.['runtime-diagnostics'] > 0 ? 'YES' : 'NO'} (count=${out.perEvaluator?.['runtime-diagnostics'] ?? 'n/a'})`);
console.log(`  Normalized + deduplicated:               ${out.stats?.totalBeforeDedupe >= out.stats?.totalAfterDedupe ? 'YES' : 'NO'} (before=${out.stats?.totalBeforeDedupe}, after-dedupe=${out.stats?.totalAfterDedupe}, after-cluster=${out.stats?.totalAfterCluster})`);
console.log(`  Construction engine would receive >0:    ${out.findings.length > 0 ? 'YES' : 'NO'}`);

process.exit(0);
