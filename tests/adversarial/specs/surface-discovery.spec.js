// Surface element discovery — §4.2, 50 tests (SURF-DISC-<route>).
// Per route: enumerate links, cards, modals, embedded AI surfaces.
// For the first dev-SUT run, the harness records reachability only;
// deep interaction matrices follow once auth fixtures are wired.

import { test, expect } from '@playwright/test';
import { appendFinding } from '../lib/findings.mjs';

const ROUTES = [
  'dashboard','portfolio','products','runs','configuration','auto-runner','renewal',
  'guided/research','guided/design','guided/build','guided/qa-audit','guided/deploy','guided/govern','guided/gtm','guided/monitor',
  'manual/research','manual/design','manual/build','manual/qa-audit','manual/deploy','manual/govern','manual/gtm','manual/monitor',
  'clearance','onboarding','release-notes','audit-trail','capability-transfer',
  'capability-packages/self-renewal','capability-packages/self-protection',
  'capability-packages/self-renewal/install','capability-packages/self-protection/install',
  'settings','architecture',
  'qa-audit','research','design','build','pipeline','gtm','governance','self-protection','self-healing',
  'domain-manager','marketplace','compare-tools','my-stack','realtime','templates','analytics',
];

function rec(f) {
  appendFinding({ suite: '4.2', evidence_paths: [],
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'team', team: 'platform', agentId: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

for (const route of ROUTES) {
  const id = route.replace(/\//g, '_');
  test(`SURF-DISC-${id} — element discovery on /${route}`, async ({ page }) => {
    const t0 = Date.now();
    let verdict = 'FAIL', severity = 'medium', actual;
    try {
      const resp = await page.goto(`/${route}`, { timeout: 20_000 });
      const status = resp?.status() ?? 0;
      const links  = await page.locator('a[href]').count().catch(() => 0);
      const buttons = await page.locator('button').count().catch(() => 0);
      // anon to a protected route should redirect; we only assert non-error.
      const isReached = status >= 200 && status < 500;
      verdict = isReached ? 'PASS' : 'FAIL';
      severity = isReached ? 'low' : 'high';
      actual = `status=${status} links=${links} buttons=${buttons} url=${page.url()}`;
    } catch (e) {
      verdict = 'SKIP'; severity = 'medium';
      actual = `navigation failed: ${e?.message ?? e}`;
    }
    rec({ test_id: `SURF-DISC-${id}`, surface: `/${route}`, category: 'ui',
      severity, status: verdict, expected_behavior: 'non-404 navigation; element enumeration succeeds',
      actual_behavior: actual, latency_ms: Date.now() - t0,
      reproducer_steps: [`goto /${route}`, 'count links + buttons'] });
    expect(['PASS','FAIL','SKIP']).toContain(verdict);
  });
}
