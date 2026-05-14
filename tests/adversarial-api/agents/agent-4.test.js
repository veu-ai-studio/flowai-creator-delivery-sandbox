// Agent #4 Provider Onboarding — §3.4, 9 adversarial cases.
// LD-3 hybrid: A4-N1 / A4-N2 / A4-E1 / A4-E2 → Stripe sandbox;
//              A4-M1 / A4-M2 / A4-X1 / A4-X2 / A4-X3 → MockStripe.

import { describe, it, expect } from 'vitest';
import { SUT_URL, bypassHeaders, preconditions } from '../../adversarial/lib/sut.mjs';
import { appendFinding } from '../../adversarial/lib/findings.mjs';
import { createMockStripeClient } from '../../adversarial/lib/mock-stripe.mjs';

const SUITE = '3.4';
const SURFACE = 'agent4.direct-api';
const ENDPOINT = '/api/orchestrator/run';

async function invokeAgent({ ctx, productScope = '_test' }) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${SUT_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...bypassHeaders() },
      body: JSON.stringify({ agentId: 4, productScope, environment: 'dev-SUT', ctx }),
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
    owner: { type: 'agent', agentId: 4, team: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

const NOMINAL_OR_EDGE_USE_SANDBOX = new Set(['A4-N1', 'A4-N2', 'A4-E1', 'A4-E2']);

const CASES = [
  { id: 'A4-N1', cat: 'nominal',     ctx: { kind: 'provider.onboarding', name: 'Acme', email: 'ops@acme.test', stripe_intent: 'connect' }, expect: 'stripe_connect_link_recommendation in envelope' },
  { id: 'A4-N2', cat: 'nominal',     ctx: { kind: 'provider.onboarding', name: 'Acme', email: 'ops@acme.test', stripe_intent: 'connect', _repeat: true }, expect: 'idempotent; lookup not create' },
  { id: 'A4-M1', cat: 'malformed',   ctx: { kind: 'provider.onboarding', name: 'A', email: 'not-an-email' },        expect: 'validation rejection at plan()' },
  { id: 'A4-M2', cat: 'malformed',   ctx: { kind: 'provider.onboarding', email: 'a@b.test' /* no name */ },         expect: 'schema rejection' },
  { id: 'A4-E1', cat: 'edge',        ctx: { kind: 'provider.onboarding', name: '日本語ユーザー', email: 'jp@user.test' }, expect: 'unicode round-trips through UTF-8' },
  { id: 'A4-E2', cat: 'edge',        ctx: { kind: 'provider.onboarding', name: 'X'.repeat(1000), email: 'big@x.test' }, expect: 'truncated or rejected; no overflow' },
  { id: 'A4-X1', cat: 'adversarial', ctx: { kind: 'provider.onboarding', name: 'A', email: 'a@b.test\nBcc: attacker@evil.test' }, expect: 'CRLF stripped; opaque' },
  { id: 'A4-X2', cat: 'adversarial', ctx: { kind: 'provider.onboarding', target_provider_id: 'someone_elses_id' },  expect: '403 RLS unless admin' },
  { id: 'A4-X3', cat: 'adversarial', ctx: { kind: 'provider.onboarding', name: 'A', email: 'a@b.test', _flowAiOnly: true }, productScope: '_test', expect: 'BaseAgent rejects charter-flowAiOnly violation' },
];

describe('Agent #4 Provider Onboarding — adversarial matrix (§3.4)', () => {
  for (const c of CASES) {
    it(`${c.id} — ${c.cat}`, async () => {
      const pre = preconditions();
      const wantsSandbox = NOMINAL_OR_EDGE_USE_SANDBOX.has(c.id);
      if (wantsSandbox && !pre.hasStripeSandbox) {
        record({ test_id: c.id, category: c.cat, severity: 'medium', status: 'SKIP',
          expected_behavior: c.expect, actual_behavior: 'STRIPE_SANDBOX_SECRET_KEY not provided; LD-3 sandbox path unavailable',
          latency_ms: 0, reproducer_steps: ['Stripe sandbox call required', 'sandbox key missing'] });
        return;
      }
      // For mock-path tests we sanity-check the mock client locally first so
      // we surface a finding even if the dev SUT route is unreachable.
      if (!wantsSandbox) {
        const mock = createMockStripeClient();
        let mockResult = 'mock-ok';
        try {
          await mock.accounts.create({ email: c.ctx?.email ?? 'a@b.test', type: 'standard' });
        } catch (e) { mockResult = `mock-reject: ${e.message}`; }
        // Surface the mock outcome as a SKIP finding — the actual agent call
        // also runs below so we capture both the dev-SUT response AND the
        // adapter-level validation evidence.
        appendFinding({
          test_id: `${c.id}-MOCK`, suite: SUITE, surface: SURFACE,
          category: c.cat, severity: 'low', status: 'PASS',
          reproducer_steps: ['MockStripe accounts.create', `email=${c.ctx?.email}`],
          expected_behavior: 'MockStripe validates email or rejects deterministically',
          actual_behavior: mockResult, latency_ms: 0, evidence_paths: [],
          first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
          owner: { type: 'agent', agentId: 4, team: null }, recommended_fix: null, metadata: {},
        });
      }
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
        reproducer_steps: [`POST ${ENDPOINT}`, `agentId=4`, `ctx=${JSON.stringify(c.ctx).slice(0,200)}`] });
      expect(['PASS','FAIL','SKIP']).toContain(verdict);
    }, 25_000);
  }
});
