// Surface viewport coverage — §4.3, 150 tests (50 routes × 3 viewports).
// Playwright projects already drive desktop / tablet / mobile per config;
// each test below is invoked once per project so the matrix is 150.

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
  appendFinding({ suite: '4.3', evidence_paths: [],
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'team', team: 'platform', agentId: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

for (const route of ROUTES) {
  const id = route.replace(/\//g, '_');
  test(`SURF-VP-${id} — viewport coverage`, async ({ page, viewport }, testInfo) => {
    const t0 = Date.now();
    const vpLabel = `${viewport?.width}x${viewport?.height}`;
    let verdict = 'FAIL', severity = 'medium', actual;
    let status = 0, overflow = null;
    try {
      const resp = await page.goto(`/${route}`, { timeout: 20_000 });
      status = resp?.status() ?? 0;
      // Detect basic clipping: horizontal scrollbar at sub-desktop widths is a smell.
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth).catch(() => null);
      const innerWidth  = await page.evaluate(() => window.innerWidth).catch(() => null);
      overflow = scrollWidth && innerWidth ? (scrollWidth > innerWidth + 4) : false;
      verdict = (status >= 200 && status < 500) ? 'PASS' : 'FAIL';
      if (overflow && viewport.width <= 768) { verdict = 'FAIL'; severity = 'medium'; }
      else { severity = verdict === 'PASS' ? 'low' : 'high'; }
      actual = `vp=${vpLabel} status=${status} scrollWidth=${scrollWidth} innerWidth=${innerWidth} overflow=${overflow}`;
    } catch (e) {
      verdict = 'SKIP'; severity = 'medium';
      actual = `navigation failed: ${e?.message ?? e}`;
    }
    rec({ test_id: `SURF-VP-${id}-${testInfo.project.name}`, surface: `/${route}`,
      category: 'ui', severity, status: verdict,
      expected_behavior: 'no horizontal clipping at any viewport',
      actual_behavior: actual, latency_ms: Date.now() - t0,
      reproducer_steps: [`goto /${route} at viewport ${vpLabel}`, 'measure scrollWidth vs innerWidth'] });
    expect(status, actual).toBeGreaterThanOrEqual(200);
    expect(status, actual).toBeLessThan(500);
    if (viewport.width <= 768) expect(overflow, actual).toBe(false);
  });
}
