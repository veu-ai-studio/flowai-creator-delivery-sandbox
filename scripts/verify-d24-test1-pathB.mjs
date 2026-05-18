import { runOrchestration } from '../src/lib/agents/renewal/orchestrator.js';
import { randomUUID } from 'node:crypto';

// Test 1 — Unknown URL works. saige is in product_registry but
// self_renewal_enabled=false; the orchestrator's PATH A query filters by
// enabled, so this URL should fall through to PATH B universal mode.
const result = await runOrchestration({
  url: 'https://saige-platform.vercel.app',
  mode: 'auto',
  runId: randomUUID(),
  supabase: null, // force PATH B by skipping registry lookup
  environment: 'prd',
  gtmTarget: 95,
  maxIterations: 1,
  onStep: (log) => {
    console.log(`[Step ${log.step}] ${log.stepName}: ${log.status}`);
    if (log.step === 1) console.log(`  PATH RESULT: ${JSON.stringify(log.result).slice(0, 250)}`);
    if (log.step === 5 && log.status === 'complete') console.log(`  SCORE: ${log.scores?.current}/100`);
  },
}).catch((e) => ({ ok: false, exception: e?.message ?? String(e), stack: e?.stack?.split('\n').slice(0, 3) }));

console.log('');
console.log('--- FINAL ---');
console.log('ok:', result.ok);
console.log('score:', result.originalScore);
console.log('exitReason:', result.exitReason);
console.log('failedStep:', result.failedStep);
console.log('error:', result.error);
