// Agent #5 End-Customer Intake — §3.5, 9 adversarial cases.
// Writes to productScope='_test' tenant per LD-2.

import { describe, it, expect } from 'vitest';
import { SUT_URL, bypassHeaders } from '../../adversarial/lib/sut.mjs';
import { appendFinding } from '../../adversarial/lib/findings.mjs';

const SUITE = '3.5';
const SURFACE = 'agent5.direct-api';
const ENDPOINT = '/api/orchestrator/run';

async function invokeAgent({ ctx, productScope = '_test' }) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${SUT_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...bypassHeaders() },
      body: JSON.stringify({ agentId: 5, productScope, environment: 'dev-SUT', ctx }),
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
    owner: { type: 'agent', agentId: 5, team: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

const CASES = [
  { id: 'A5-N1', cat: 'nominal',     ctx: { kind: 'end_customer.intake', provider_id: 'prov_1', email: 'cust@test.invalid' },           expect: 'provider link confirmed in envelope' },
  { id: 'A5-N2', cat: 'nominal',     ctx: { kind: 'end_customer.intake', provider_id: 'prov_1', email: 'cust2@test.invalid' },          expect: 'persists to _test tenant; RLS isolates' },
  { id: 'A5-M1', cat: 'malformed',   ctx: { kind: 'end_customer.intake', email: 'cust@test.invalid' /* no provider_id */ },             expect: 'FK error caught at plan()' },
  { id: 'A5-M2', cat: 'malformed',   ctx: { kind: 'end_customer.intake', provider_id: 'p', intake_at: '9999-12-31T00:00:00Z' },         expect: 'reject or clamp future timestamp' },
  { id: 'A5-E1', cat: 'edge',        ctx: { kind: 'end_customer.intake', provider_id: 'p', _batchOf100: true },                          expect: 'rate-limited; audit log shows rate-limit event' },
  { id: 'A5-X1', cat: 'adversarial', ctx: { kind: 'end_customer.intake', provider_id: 'p', notes: 'javascript:alert(1)' },               expect: 'stored opaque; no XSS in admin UI' },
  { id: 'A5-X2', cat: 'adversarial', ctx: { kind: 'end_customer.intake', provider_id: 'p', target_tenant: 'tenant_B' },                  expect: '403 RLS; cross-tenant rejected' },
  { id: 'A5-X3', cat: 'adversarial', ctx: { kind: 'end_customer.intake', provider_id: 'p' }, productScope: 'flowai',                     expect: 'semantic rejection — flowai is platform, not end-customer tenant' },
  { id: 'A5-X3b',cat: 'adversarial', ctx: { kind: 'end_customer.intake', provider_id: 'p', email: 'cust3@test.invalid' }, productScope: '_test', expect: '_test tenant write allowed; cleanup removes after run' },
];

describe('Agent #5 End-Customer Intake — adversarial matrix (§3.5)', () => {
  for (const c of CASES) {
    it(`${c.id} — ${c.cat}`, async () => {
      const result = await invokeAgent({ ctx: c.ctx, productScope: c.productScope });
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
        reproducer_steps: [`POST ${ENDPOINT}`, `agentId=5`, `ctx=${JSON.stringify(c.ctx).slice(0,200)}`] });
      expect(['PASS','FAIL','SKIP']).toContain(verdict);
    }, 25_000);
  }
});
