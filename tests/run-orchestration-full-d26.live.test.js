// scripts/run-orchestration-full-d26.test.mjs
//
// One-shot AUTHORIZED LIVE integration run for DISPATCH 26. Implemented as
// a vitest test so the TS-from-JS import chain resolves through Vite. Runs
// only when LIVE=1; otherwise skipped (so npm test stays green).

import { describe, it } from 'vitest';
import { runOrchestration } from '../src/lib/agents/renewal/orchestrator.js';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

describe('DISPATCH 26 full live orchestration', () => {
  it('runs full Phase A loop against the registry default product', async () => {
    if (process.env.LIVE !== '1') {
      // npm test gates this out so the normal suite stays fast + green.
      return;
    }
    const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
      : null;
    console.log('FlowAI — Full Loop');
    console.log('Supabase:', supabase ? 'CONNECTED' : 'NULL');
    console.log('Target: 95/100 | Max: 10 iters');

    const result = await runOrchestration({
      url: null,
      mode: 'auto',
      runId: randomUUID(),
      supabase,
      environment: 'prd',
      gtmTarget: 95,
      maxIterations: 10,
      onStep: (log) => {
        console.log(`[I${log.iteration}][S${log.step}] ${log.stepName} — ${log.status}`);
        console.log(`  TOOL: ${log.tool}`);
        console.log(`  WHY: ${log.why}`);
        if (log.scores?.current !== undefined && log.scores?.current !== null) {
          console.log(`  SCORE: ${log.scores.current}/100`);
        }
        if (log.result && (log.status === 'complete' || log.status === 'degraded')) {
          console.log(`  RESULT: ${JSON.stringify(log.result).slice(0, 250)}`);
        }
        if (log.status === 'failed' || log.status === 'degraded') {
          const reason = log.result?.reason || log.result?.detail || log.result?.error || '';
          console.log(`  ISSUE: ${reason}`);
        }
      },
      onIteration: (iter) => {
        console.log('');
        console.log(`=== ITER ${iter.number} DONE: ${iter.preScore}→${iter.postScore} (+${iter.delta}) GTM:${iter.gtmReady ? 'YES' : 'NO'} ===`);
        console.log('');
      },
    }).catch((e) => ({ ok: false, exception: e?.message ?? String(e), stack: e?.stack?.split('\n').slice(0, 5) }));

    console.log('');
    console.log('FLOWAI DONE');
    console.log('GTM Ready:', result.gtmReady);
    console.log('Score:', result.originalScore, '→', result.finalScore);
    console.log('Iterations:', result.iterationsCompleted);
    console.log('Preview:', result.previewUrl);
    console.log('PR:', result.prUrl);
    console.log('Exit reason:', result.exitReason);
    if (result.failedStep) {
      console.log('Failed step:', result.failedStep);
      console.log('Error:', result.error);
    }
    if (result.exception) {
      console.log('Exception:', result.exception);
    }
  }, 600_000); // 10-minute timeout — full loop can take a while
});
