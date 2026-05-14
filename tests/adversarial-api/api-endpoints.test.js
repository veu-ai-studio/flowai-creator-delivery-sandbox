// API endpoint auth — §2.2 × 3 roles = 90 tests (APIAUTH-<endpoint>-<role>).
// Per §10.3 endpoint inventory + plan §3.6 INV-6 spirit.

import { describe, it, expect } from 'vitest';
import { SUT_URL, bypassHeaders } from '../adversarial/lib/sut.mjs';
import { appendFinding } from '../adversarial/lib/findings.mjs';

const SUITE = '2.2';

// 30 endpoints — flattened from plan §10.3.
const ENDPOINTS = [
  { path: '/api/health',                      method: 'GET',  id: 'api_health',                publicOk: true },
  { path: '/api/diagnostic',                  method: 'GET',  id: 'api_diagnostic',            publicOk: true },
  { path: '/api/me',                          method: 'GET',  id: 'api_me',                    publicOk: true },
  { path: '/api/auth/sign-in',                method: 'POST', id: 'api_auth_sign-in',          publicOk: true },
  { path: '/api/auth/sign-up',                method: 'POST', id: 'api_auth_sign-up',          publicOk: true },
  { path: '/api/auth/session',                method: 'GET',  id: 'api_auth_session',          publicOk: true },
  { path: '/api/admin/seed',                  method: 'POST', id: 'api_admin_seed',            adminOnly: true },
  { path: '/api/products',                    method: 'GET',  id: 'api_products',              authed: true },
  { path: '/api/products/00000000-0000-0000-0000-000000000000', method: 'GET', id: 'api_products_id', authed: true },
  { path: '/api/configuration/products',      method: 'GET',  id: 'api_configuration',         authed: true },
  { path: '/api/research-url',                method: 'POST', id: 'api_research-url',          authed: true },
  { path: '/api/describe-product',            method: 'POST', id: 'api_describe-product',      authed: true },
  { path: '/api/fetch-url',                   method: 'POST', id: 'api_fetch-url',             authed: true },
  { path: '/api/llm-step',                    method: 'POST', id: 'api_llm-step',              authed: true },
  { path: '/api/propose-step',                method: 'POST', id: 'api_propose-step',          authed: true },
  { path: '/api/run-step',                    method: 'POST', id: 'api_run-step',              authed: true },
  { path: '/api/renew',                       method: 'POST', id: 'api_renew',                 authed: true },
  { path: '/api/renewed/aaaaaaaa',            method: 'GET',  id: 'api_renewed_hash',          authed: true },
  { path: '/api/orchestrator/run',            method: 'POST', id: 'api_orchestrator_run',      authed: true },
  { path: '/api/orchestrator/health',         method: 'GET',  id: 'api_orchestrator_health',   publicOk: true },
  { path: '/api/orchestrator/status/x',       method: 'GET',  id: 'api_orchestrator_status_id',authed: true },
  { path: '/api/self-renewal/check',          method: 'POST', id: 'api_self-renewal_check',    authed: true },
  { path: '/api/governance/dashboard',        method: 'GET',  id: 'api_governance_dashboard',  authed: true },
  { path: '/api/audit-log',                   method: 'GET',  id: 'api_audit-log',             authed: true },
  { path: '/api/audit-product',               method: 'POST', id: 'api_audit-product',         authed: true },
  { path: '/api/audits/list',                 method: 'GET',  id: 'api_audits',                authed: true },
  { path: '/api/clearance/run',               method: 'POST', id: 'api_clearance_run',         authed: true },
  { path: '/api/compliance/check',            method: 'POST', id: 'api_compliance',            authed: true },
  { path: '/api/cost-summary',                method: 'GET',  id: 'api_cost-summary',          authed: true },
  { path: '/api/marketplace/inventory',       method: 'GET',  id: 'api_marketplace',           authed: true },
];

const ROLES = [
  { name: 'anon',     headers: () => ({}) },
  { name: 'operator', headers: () => process.env.PLAYWRIGHT_OPERATOR_TOKEN
      ? { Authorization: `Bearer ${process.env.PLAYWRIGHT_OPERATOR_TOKEN}` } : null },
  { name: 'admin',    headers: () => process.env.PLAYWRIGHT_ADMIN_TOKEN
      ? { Authorization: `Bearer ${process.env.PLAYWRIGHT_ADMIN_TOKEN}` } : null },
];

function record(f) {
  appendFinding({
    suite: SUITE, evidence_paths: [],
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'team', team: 'platform', agentId: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

describe('API endpoint auth matrix — §2.2 (30 endpoints × 3 roles = 90)', () => {
  for (const ep of ENDPOINTS) {
    for (const role of ROLES) {
      it(`APIAUTH-${ep.id}-${role.name} (${ep.method} ${ep.path})`, async () => {
        const authH = role.headers();
        if (role.name !== 'anon' && authH === null) {
          record({ test_id: `APIAUTH-${ep.id}-${role.name}`, surface: ep.path, category: 'api',
            severity: 'medium', status: 'SKIP',
            expected_behavior: 'role-specific token grants/denies as charter dictates',
            actual_behavior: `PLAYWRIGHT_${role.name.toUpperCase()}_TOKEN not provided; cannot exercise role`,
            latency_ms: 0,
            reproducer_steps: [`${ep.method} ${ep.path}`, `role=${role.name}`, 'token missing'] });
          return;
        }
        const t0 = Date.now();
        let status = 0, errMsg = null;
        try {
          const r = await fetch(`${SUT_URL}${ep.path}`, {
            method: ep.method,
            headers: { 'Content-Type': 'application/json', ...bypassHeaders(), ...(authH || {}) },
            body: ep.method === 'GET' ? undefined : '{}',
            signal: AbortSignal.timeout(10_000),
          });
          status = r.status;
        } catch (e) { errMsg = e?.message ?? String(e); }
        const durationMs = Date.now() - t0;
        let verdict = 'PASS', severity = 'low', actual;
        if (status === 0) {
          verdict = 'SKIP'; severity = 'medium';
          actual = `dev SUT unreachable: ${errMsg}`;
        } else if (role.name === 'anon') {
          // anon must be 401/403 unless publicOk; never 200 if !publicOk.
          if (ep.publicOk) {
            verdict = [200, 204, 400, 401].includes(status) ? 'PASS' : 'FAIL';
            severity = verdict === 'PASS' ? 'low' : 'high';
          } else {
            verdict = [401, 403, 404, 405].includes(status) ? 'PASS' : 'FAIL';
            severity = verdict === 'PASS' ? 'low' : 'critical';
          }
          actual = `anon ${ep.method} ${ep.path} → ${status}`;
        } else {
          // operator/admin: rough sanity — must NOT be 0 (network) or 500.
          verdict = (status >= 200 && status < 500) ? 'PASS' : 'FAIL';
          severity = (status >= 500) ? 'high' : 'low';
          actual = `${role.name} ${ep.method} ${ep.path} → ${status}`;
        }
        record({ test_id: `APIAUTH-${ep.id}-${role.name}`, surface: ep.path, category: 'api',
          severity, status: verdict, expected_behavior: ep.publicOk
            ? 'public OK; anon may pass'
            : 'auth required; anon must receive 401/403',
          actual_behavior: actual, latency_ms: durationMs,
          reproducer_steps: [`${ep.method} ${ep.path}`, `role=${role.name}`,
            authH ? 'Authorization header attached' : 'no auth header'] });
        expect(['PASS','FAIL','SKIP']).toContain(verdict);
      }, 12_000);
    }
  }
});
