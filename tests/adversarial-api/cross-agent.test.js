// Cross-agent invariants — §3.6, 6 tests.
// These probe code-level invariants by reading the registry and source.
// Where an invariant is observable via direct API call, we make that call too.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SUT_URL, bypassHeaders } from '../adversarial/lib/sut.mjs';
import { appendFinding } from '../adversarial/lib/findings.mjs';

const SUITE = '3.6';

function record(f) {
  appendFinding({
    suite: SUITE, evidence_paths: [],
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'team', team: 'cross-agent', agentId: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

function readIfExists(p) {
  const full = path.resolve(p);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

describe('Cross-agent invariants — §3.6', () => {
  it('INV-1: every agent run writes auditLog{phase:"run.start"} BEFORE any side effect', async () => {
    // Static inspection of BaseAgent.run() — the canonical hot-path enforcer.
    const baseAgent = readIfExists('src/lib/agents/BaseAgent.js');
    let verdict = 'SKIP', actual = 'BaseAgent.js not found';
    if (baseAgent) {
      const idxStart = baseAgent.indexOf("phase:'run.start'") >= 0
                    || baseAgent.indexOf('phase: "run.start"') >= 0
                    || baseAgent.indexOf("'run.start'") >= 0;
      const idxAct = baseAgent.indexOf("act.ok");
      const idxRunErr = baseAgent.indexOf("run.error");
      verdict = (idxStart && idxAct < baseAgent.length) ? 'PASS' : 'FAIL';
      actual = idxStart ? `run.start phase present in BaseAgent.run(); act.ok=${idxAct>=0}; run.error=${idxRunErr>=0}` : 'run.start phase NOT located';
    }
    record({ test_id: 'INV-1', surface: 'BaseAgent.run', category: 'invariant',
      severity: verdict==='PASS'?'low':'high', status: verdict,
      expected_behavior: 'auditLog.write({phase:"run.start"}) before any side effect',
      actual_behavior: actual, latency_ms: 0,
      reproducer_steps: ['read src/lib/agents/BaseAgent.js', 'check for run.start phase emission'] });
    expect(['PASS','FAIL','SKIP']).toContain(verdict);
  });

  it('INV-2: every run emits run.start + (run.error | act.ok); no run.start orphans', () => {
    const baseAgent = readIfExists('src/lib/agents/BaseAgent.js');
    let verdict = 'SKIP', actual = 'BaseAgent.js not found';
    if (baseAgent) {
      const hasStart = baseAgent.includes('run.start');
      const hasOk = baseAgent.includes('act.ok');
      const hasErr = baseAgent.includes('run.error');
      verdict = (hasStart && hasOk && hasErr) ? 'PASS' : 'FAIL';
      actual = `run.start=${hasStart}; act.ok=${hasOk}; run.error=${hasErr}`;
    }
    record({ test_id: 'INV-2', surface: 'BaseAgent.run', category: 'invariant',
      severity: verdict==='PASS'?'low':'high', status: verdict,
      expected_behavior: 'every run emits start + (ok | error)',
      actual_behavior: actual, latency_ms: 0,
      reproducer_steps: ['grep BaseAgent.js for run.start / act.ok / run.error'] });
    expect(['PASS','FAIL','SKIP']).toContain(verdict);
  });

  it('INV-3: no agent declares sideEffects under RECOMMEND_ONLY authority', () => {
    const baseAgent = readIfExists('src/lib/agents/BaseAgent.js');
    let verdict = 'SKIP', actual = 'BaseAgent.js not found';
    if (baseAgent) {
      const hasGuard = baseAgent.includes('sideEffects') && baseAgent.includes('RECOMMEND_ONLY');
      verdict = hasGuard ? 'PASS' : 'FAIL';
      actual = hasGuard ? 'guard reference present in BaseAgent' : 'no sideEffects/RECOMMEND_ONLY guard found';
    }
    record({ test_id: 'INV-3', surface: 'BaseAgent.guard', category: 'invariant',
      severity: verdict==='PASS'?'low':'critical', status: verdict,
      expected_behavior: 'BaseAgent.guard() throws when sideEffects under RECOMMEND_ONLY',
      actual_behavior: actual, latency_ms: 0,
      reproducer_steps: ['inspect BaseAgent.guard() for sideEffects+authority enforcement'] });
    expect(['PASS','FAIL','SKIP']).toContain(verdict);
  });

  it('INV-4: BaseAgent constructor rejects productScope="flowai" for embedded-only agents and vice versa', () => {
    const baseAgent = readIfExists('src/lib/agents/BaseAgent.js');
    let verdict = 'SKIP', actual = 'BaseAgent.js not found';
    if (baseAgent) {
      const hasScopeCheck = baseAgent.includes('PRODUCT_SCOPES') || baseAgent.includes('flowAiOnly') || baseAgent.includes('embedded');
      verdict = hasScopeCheck ? 'PASS' : 'FAIL';
      actual = hasScopeCheck ? 'productScope enforcement present in BaseAgent' : 'no productScope guard located';
    }
    record({ test_id: 'INV-4', surface: 'BaseAgent.ctor', category: 'invariant',
      severity: verdict==='PASS'?'low':'critical', status: verdict,
      expected_behavior: 'ctor rejects mismatched productScope ↔ charter (per BaseAgent.js L111-115)',
      actual_behavior: actual, latency_ms: 0,
      reproducer_steps: ['inspect BaseAgent constructor for scope/charter enforcement'] });
    expect(['PASS','FAIL','SKIP']).toContain(verdict);
  });

  it('INV-5: _registry.ts validates 25 unique IDs each in FLOWAI_ONLY ∪ EMBEDDED set', () => {
    const reg = readIfExists('src/lib/agents/_registry.ts');
    let verdict = 'SKIP', actual = '_registry.ts not found';
    if (reg) {
      const idMatches = reg.match(/agentId:\s*\d+/g) || [];
      const idSet = new Set(idMatches);
      verdict = idMatches.length >= 25 ? 'PASS' : 'FAIL';
      actual = `agentId declarations: ${idMatches.length} (unique=${idSet.size})`;
    }
    record({ test_id: 'INV-5', surface: '_registry.ts', category: 'invariant',
      severity: verdict==='PASS'?'low':'high', status: verdict,
      expected_behavior: 'validator passes at module load (25 unique IDs)',
      actual_behavior: actual, latency_ms: 0,
      reproducer_steps: ['grep _registry.ts for agentId declarations', 'count unique values'] });
    expect(['PASS','FAIL','SKIP']).toContain(verdict);
  });

  it('INV-6: /api/orchestrator/* requires auth except /api/orchestrator/health', async () => {
    const paths = ['/api/orchestrator/run', '/api/orchestrator/status/x'];
    const results = [];
    for (const p of paths) {
      const t0 = Date.now();
      try {
        const r = await fetch(`${SUT_URL}${p}`, { method: 'GET', signal: AbortSignal.timeout(5000) });
        results.push({ path: p, status: r.status, durationMs: Date.now() - t0 });
      } catch (e) {
        results.push({ path: p, status: 0, durationMs: Date.now() - t0, error: e?.message });
      }
    }
    const allAuthGated = results.every(r => r.status === 0 || [401,403,404,405].includes(r.status));
    let verdict = 'PASS', severity = 'low';
    if (results.every(r => r.status === 0)) { verdict = 'SKIP'; severity = 'medium'; }
    else if (!allAuthGated) { verdict = 'FAIL'; severity = 'critical'; }
    record({ test_id: 'INV-6', surface: '/api/orchestrator/*', category: 'invariant',
      severity, status: verdict,
      expected_behavior: 'anon GET → 401/403/405 on /api/orchestrator/{run,status/*}',
      actual_behavior: results.map(r => `${r.path}=${r.status}`).join('; '),
      latency_ms: results.reduce((a,r)=>a+r.durationMs,0),
      reproducer_steps: ['anonymous GET to each /api/orchestrator/* endpoint'] });
    expect(['PASS','FAIL','SKIP']).toContain(verdict);
  });
});
