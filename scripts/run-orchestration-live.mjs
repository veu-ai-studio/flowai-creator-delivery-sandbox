// scripts/run-orchestration-live.mjs
//
// AUTHORIZED LIVE INTEGRATION TEST — CEO Victor Udo authorization, DISPATCH 22.
// Runs the FlowAI orchestrator in AUTO mode against the live mypreglife repo.
// Will mint real GitHub App tokens, push a real branch, deploy a real Vercel
// preview, open a real PR — repeating iterations until score >= 95/100 or
// max iterations reached.
//
// Invoke via:
//   doppler run --project flowai --config prd -- node scripts/run-orchestration-live.mjs

import { runOrchestration } from '../src/lib/agents/renewal/orchestrator.js';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Build a real Supabase client (service-role) so the orchestrator can
// resolve the product from product_registry + write the governance audit.
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;
console.log('Supabase client:', supabase ? 'INITIALIZED' : 'NULL (falling back to defaults)');

console.log('');
console.log('██████████████████████████████');
console.log('  FlowAI Orchestration Engine');
console.log('  Mode: AUTO');
console.log('  Target: 95/100 GTM-Ready');
console.log('  Max Iterations: 10');
console.log('██████████████████████████████');
console.log('');

const result = await runOrchestration({
  url: null, // FlowAI picks from product_registry (mypreglife is the only enabled product)
  mode: 'auto',
  runId: randomUUID(),
  supabase,
  environment: 'prd',
  gtmTarget: 95,
  maxIterations: 10,
  onStep: (log) => {
    const prefix = `[Iter ${log.iteration}][Step ${log.step}]`;
    console.log('');
    console.log(`${prefix} ${log.stepName}`);
    console.log(`  TOOL: ${log.tool}`);
    console.log(`  WHY: ${log.why}`);
    console.log(`  STATUS: ${log.status}`);
    if (log.scores) {
      console.log(`  SCORE: ${log.scores.current}/100 → target ${log.scores.target}/100 (${log.scores.progressPct}% there)`);
    }
    if (log.result && (log.status === 'complete' || log.status === 'failed')) {
      console.log(`  RESULT: ${JSON.stringify(log.result).slice(0, 250)}`);
    }
  },
  onIteration: (iter) => {
    console.log('');
    console.log('══════════════════════════');
    console.log(`ITERATION ${iter.number} COMPLETE`);
    console.log(`Score: ${iter.preScore} → ${iter.postScore} (${iter.delta >= 0 ? '+' : ''}${iter.delta})`);
    console.log(`GTM Ready: ${iter.gtmReady ? 'YES ✅' : 'NOT YET'}`);
    if (!iter.gtmReady) {
      console.log(`Continuing to iteration ${iter.number + 1}...`);
    }
    console.log('══════════════════════════');
  },
  onCheckpoint: (state) => {
    console.log(`[AUTO MODE] Checkpoint at step ${state.lastStep} — continuing automatically`);
  },
}).catch((e) => ({
  ok: false,
  exception: e?.message ?? String(e),
  stack: e?.stack?.split('\n').slice(0, 5),
}));

console.log('');
console.log('██████████████████████████████');
console.log('  FLOWAI ORCHESTRATION COMPLETE');
console.log('██████████████████████████████');
console.log('');
console.log(`GTM Ready: ${result.gtmReady ? 'YES ✅' : 'NOT YET ⚠️'}`);
console.log(`Exit Reason: ${result.exitReason}`);
console.log(`Original Score: ${result.originalScore}/100`);
console.log(`Final Score: ${result.finalScore}/100`);
console.log(`Total Improvement: ${result.totalDelta >= 0 ? '+' : ''}${result.totalDelta} points`);
console.log(`Iterations: ${result.iterationsCompleted}`);
console.log(`Preview URL: ${result.previewUrl || '(none)'}`);
console.log(`PR URL: ${result.prUrl || '(none)'}`);
if (result.failedStep) {
  console.log(`FAILED STEP: ${result.failedStep}`);
  console.log(`ERROR: ${result.error}`);
  console.log(`CODE: ${result.code}`);
}
console.log('');
