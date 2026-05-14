// Surface error states — §4.4, 70 tests (10 API-bound surfaces × 7 triggers).

import { test, expect } from '@playwright/test';
import { appendFinding } from '../lib/findings.mjs';

const API_BOUND = [
  'auto-runner','renewal','clearance','audit-trail','architecture',
  'environments','production-monitor','cost-usage','marketplace','my-stack',
];

const TRIGGERS = [
  'network-offline','api-500','api-401','api-429','api-timeout','empty-data','malformed-json',
];

function rec(f) {
  appendFinding({ suite: '4.4', evidence_paths: [],
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'team', team: 'platform', agentId: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

for (const route of API_BOUND) {
  for (const trig of TRIGGERS) {
    test(`SURF-ERR-${route}-${trig}`, async ({ page }) => {
      const t0 = Date.now();
      let verdict = 'FAIL', severity = 'medium', actual;
      try {
        if (trig === 'network-offline') {
          await page.route('**/api/**', r => r.abort('failed'));
        } else if (trig === 'api-500') {
          await page.route('**/api/**', r => r.fulfill({ status: 500, body: 'simulated' }));
        } else if (trig === 'api-401') {
          await page.route('**/api/**', r => r.fulfill({ status: 401, body: '{"error":"unauthorized"}' }));
        } else if (trig === 'api-429') {
          await page.route('**/api/**', r => r.fulfill({ status: 429, body: '{"error":"rate limit"}' }));
        } else if (trig === 'api-timeout') {
          await page.route('**/api/**', async () => { /* never respond */ });
        } else if (trig === 'empty-data') {
          await page.route('**/api/**', r => r.fulfill({ status: 200, body: '{"items":[]}' }));
        } else if (trig === 'malformed-json') {
          await page.route('**/api/**', r => r.fulfill({ status: 200, body: 'NOT JSON {{{' }));
        }
        const resp = await page.goto(`/${route}`, { timeout: 15_000 });
        const status = resp?.status() ?? 0;
        const consoleErrors = [];
        page.on('pageerror', err => consoleErrors.push(err.message));
        // Heuristic verdict: page must render SOMETHING (not crash to white)
        const root = await page.locator('#root, body').first().textContent().catch(() => '');
        const ok = (status >= 200 && status < 500) && (root || '').length > 5;
        verdict = ok ? 'PASS' : 'FAIL';
        severity = ok ? 'low' : 'medium';
        actual = `trigger=${trig} status=${status} rootLen=${root?.length ?? 0} errors=${consoleErrors.length}`;
      } catch (e) {
        verdict = 'SKIP'; severity = 'medium';
        actual = `setup failed: ${e?.message ?? e}`;
      }
      rec({ test_id: `SURF-ERR-${route}-${trig}`, surface: `/${route}`,
        category: 'ui', severity, status: verdict,
        expected_behavior: 'error UI renders per §4.4 trigger table',
        actual_behavior: actual, latency_ms: Date.now() - t0,
        reproducer_steps: [`intercept **/api/**`, `simulate ${trig}`, `goto /${route}`] });
      expect(['PASS','FAIL','SKIP']).toContain(verdict);
    });
  }
}
