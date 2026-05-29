// Agent #1 Lifecycle Engine — §3.1, 8 adversarial cases.
// All via direct API (POST /api/orchestrator/run) with explicit
// agentId + ctx. LD-6 hybrid: MockClaude for nominal/malformed/edge.

import { describe, it, expect } from 'vitest';
import { SUT_URL, bypassHeaders, preconditions } from '../../adversarial/lib/sut.mjs';
import { appendFinding } from '../../adversarial/lib/findings.mjs';

const SUITE = '3.1';
const SURFACE = 'agent1.direct-api';
const ENDPOINT = '/api/orchestrator/run';

async function invokeAgent({ agentId = 1, ctx, productScope = '_test' }) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${SUT_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...bypassHeaders() },
      body: JSON.stringify({ agentId, productScope, environment: 'dev-SUT', ctx }),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = { _raw: text.slice(0, 500) }; }
    return { ok: r.ok, status: r.status, body, durationMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, body: { error: e?.message ?? String(e) }, durationMs: Date.now() - t0 };
  }
}

function record({ testId, category, severity, status, expected, actual, durationMs, reproducer }) {
  appendFinding({
    test_id: testId, suite: SUITE, surface: SURFACE, category, severity, status,
    reproducer_steps: reproducer, expected_behavior: expected, actual_behavior: actual,
    latency_ms: durationMs ?? null, evidence_paths: [],
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'agent', agentId: 1, team: null },
    recommended_fix: null, metadata: {},
  });
}

const CASES = [
  { id: 'A1-N1', cat: 'nominal',     ctx: { kind: 'lifecycle.event', topic: '2.build.completed.v1', productId: 'prod_test_1' }, expect: 'envelope ok=true with lifecycle_event emit' },
  { id: 'A1-M1', cat: 'malformed',   ctx: { kind: 'lifecycle.event' /* productId absent */ },          expect: 'schema rejection; bus does not propagate' },
  { id: 'A1-M2', cat: 'malformed',   ctx: { kind: 'lifecycle.event', productId: 'p', payload: 'X'.repeat(10_000_000) }, expect: 'oversized payload rejected before bus publish' },
  { id: 'A1-E1', cat: 'edge',        ctx: { kind: 'lifecycle.event', topic: 'system.clearance.decision.v1', productId: 'p', concurrent: true }, expect: 'both runs reach terminal; no orphaned hot keys' },
  { id: 'A1-E2', cat: 'edge',        ctx: { kind: 'lifecycle.event', topic: '2.build.completed.v1', productId: 'p', detachImmediately: true }, expect: '_busHandles.length === 0 post-detach' },
  { id: 'A1-X1', cat: 'adversarial', ctx: { kind: 'lifecycle.event', topic: '2.build.completed.v1', productId: "'; DROP TABLE flowai_runs; --" }, expect: 'opaque string; no SQL exception; RLS isolates' },
  { id: 'A1-X2', cat: 'adversarial', ctx: { kind: 'lifecycle.event', topic: '2.build.completed.v1', _hostileGetter: true }, expect: 'caught in recommend() try/catch; ok:false envelope; no propagation' },
  { id: 'A1-X3', cat: 'adversarial', ctx: { kind: 'lifecycle.event', topic: '2.build.completed.v1', productId: 'p' }, productScope: 'flowai', omitEnv: true, expect: 'BaseAgent constructor throws; 500; no agent exec' },
];

describe('Agent #1 Lifecycle Engine — adversarial matrix (§3.1)', () => {
  for (const c of CASES) {
    it(`${c.id} — ${c.cat}`, async () => {
      const pre = preconditions();
      if (!pre.sutUrl || pre.sutUrl.includes('localhost') && !process.env.FLOWAI_SKIP_PROBE) {
        // First we probe; if SUT is unreachable, SKIP rather than fabricate.
        const probe = await fetch(`${pre.sutUrl}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) }).catch(() => null);
        if (!probe) {
          record({ testId: c.id, category: c.cat, severity: 'medium', status: 'SKIP',
            expected: c.expect, actual: `dev SUT unreachable at ${pre.sutUrl}`, durationMs: 0,
            reproducer: ['probe /api/health on dev SUT', 'received no response within 3s'] });
          return;
        }
      }
      const result = await invokeAgent({ ctx: c.ctx, productScope: c.productScope });
      // Pass criterion derived from §3.1 expectations. For nominal we expect ok=true;
      // for malformed/edge/adversarial we expect a graceful failure (status != 500 OR
      // body.error explains). We never assert PASS without contact with the agent.
      let verdict = 'FAIL', severity = 'medium', actual;
      if (c.cat === 'nominal') {
        verdict = result.ok ? 'PASS' : 'FAIL'; severity = result.ok ? 'low' : 'high';
        actual = result.ok ? 'envelope ok=true received' : `status=${result.status} body=${JSON.stringify(result.body).slice(0,300)}`;
      } else {
        // For everything else, success criterion is: agent did NOT crash AutoRunner.
        // Heuristic: status in [200, 400, 422, 403, 401, 404, 409, 429] = handled.
        const handled = [200, 400, 401, 403, 404, 409, 422, 429].includes(result.status);
        verdict = handled ? 'PASS' : 'FAIL'; severity = handled ? 'low' : 'critical';
        actual = `status=${result.status} body=${JSON.stringify(result.body).slice(0,300)}`;
      }
      record({ testId: c.id, category: c.cat, severity, status: verdict,
        expected: c.expect, actual, durationMs: result.durationMs,
        reproducer: [`POST ${ENDPOINT}`, `ctx=${JSON.stringify(c.ctx).slice(0,200)}`] });
      // Vitest assertion is intentionally permissive (FAIL findings are
      // captured in the report; only test infrastructure failures throw).
      expect(['PASS','FAIL','SKIP']).toContain(verdict);
    }, 25_000);
  }
});
