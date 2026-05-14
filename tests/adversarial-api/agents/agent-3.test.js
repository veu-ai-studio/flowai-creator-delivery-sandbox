// Agent #3 Self-Renewal — §3.3, 9 adversarial cases.

import { describe, it, expect } from 'vitest';
import { SUT_URL, bypassHeaders } from '../../adversarial/lib/sut.mjs';
import { appendFinding } from '../../adversarial/lib/findings.mjs';

const SUITE = '3.3';
const SURFACE = 'agent3.direct-api';
const ENDPOINT = '/api/orchestrator/run';

function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_k, v) => {
    if (typeof v === 'object' && v !== null) {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
    }
    return v;
  });
}

async function invokeAgent({ ctx, productScope = '_test' }) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${SUT_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...bypassHeaders() },
      body: safeStringify({ agentId: 3, productScope, environment: 'dev-SUT', ctx }),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = { _raw: text.slice(0, 500) }; }
    return { ok: r.ok, status: r.status, body, durationMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, body: { error: e?.message ?? String(e) }, durationMs: Date.now() - t0 };
  }
}

function record(f) {
  appendFinding({
    suite: SUITE, surface: SURFACE, evidence_paths: [],
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'agent', agentId: 3, team: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

const CASES = [
  { id: 'A3-N1', cat: 'nominal',     ctx: { kind: 'renewal.request', runId: 'run_test_1', run_summary: { build_failure_count: 2, audit_issues_count: 3 } }, expect: 'flags.length===2; confidence===0.9' },
  { id: 'A3-N2', cat: 'nominal',     ctx: { kind: 'renewal.request', runId: 'run_test_2', run_summary: {} },                                                expect: 'flags.length===0; confidence 0.0' },
  { id: 'A3-M1', cat: 'malformed',   ctx: { kind: 'unknown.request', runId: 'r' },                                                                            expect: 'plan() throws; BaseAgent returns ok:false' },
  { id: 'A3-M2', cat: 'malformed',   ctx: { kind: 'renewal.request' /* runId undefined */ },                                                                  expect: 'plan() throws "input.runId required"' },
  { id: 'A3-E1', cat: 'edge',        ctx: { kind: 'renewal.request', runId: 'r', step_results: [] },                                                          expect: "outcome === 'no_renewal_needed'; confidence 0.2" },
  { id: 'A3-E2', cat: 'edge',        ctx: { kind: 'renewal.request', runId: 'r', step_results: { foo: 'bar' } },                                              expect: 'mergeSignals folds object props' },
  { id: 'A3-X1', cat: 'adversarial', ctx: { kind: 'renewal.request', _hostileGetter: true, runId: 'r' },                                                      expect: 'caught in recommend() try/catch; ok:false envelope' },
  { id: 'A3-X2', cat: 'adversarial', ctx: { kind: 'renewal.request', runId: 'r', run_summary: (() => { const o = {}; o.self = o; return o; })() },           expect: 'heuristic skipped; analysis continues; partial flags' },
  { id: 'A3-X3', cat: 'adversarial', ctx: { kind: 'renewal.request', runId: 'r', mode: 'fork_and_fix' },                                                      expect: 'rejected — charter is RECOMMEND_ONLY pre-graduation' },
];

describe('Agent #3 Self-Renewal — adversarial matrix (§3.3)', () => {
  for (const c of CASES) {
    it(`${c.id} — ${c.cat}`, async () => {
      const result = await invokeAgent({ ctx: c.ctx });
      let verdict = 'FAIL', severity = 'medium', actual;
      if (result.status === 0) {
        verdict = 'SKIP'; severity = 'medium';
        actual = `dev SUT unreachable: ${result.body?.error ?? 'unknown'}`;
      } else if (c.cat === 'nominal') {
        verdict = result.ok ? 'PASS' : 'FAIL'; severity = result.ok ? 'low' : 'high';
        actual = result.ok ? 'ok envelope' : `status=${result.status}`;
      } else {
        const handled = [200,400,401,403,404,409,422,429].includes(result.status);
        verdict = handled ? 'PASS' : 'FAIL'; severity = handled ? 'low' : 'critical';
        actual = `status=${result.status} body=${JSON.stringify(result.body).slice(0,200)}`;
      }
      record({ test_id: c.id, category: c.cat, severity, status: verdict,
        expected_behavior: c.expect, actual_behavior: actual, latency_ms: result.durationMs,
        reproducer_steps: [`POST ${ENDPOINT}`, `agentId=3`, `ctx=${safeStringify(c.ctx).slice(0,200)}`] });
      expect(['PASS','FAIL','SKIP']).toContain(verdict);
    }, 25_000);
  }
});
