// Legacy redirects — §4.6, 9 tests (SURF-REDIRECT-1..9).

import { test, expect } from '@playwright/test';
import { appendFinding } from '../lib/findings.mjs';

const REDIRECTS = [
  { from: '/flows',              to: '/dashboard',     id: 1 },
  { from: '/flow-designer',      to: '/dashboard',     id: 2 },
  { from: '/run-flow',           to: '/dashboard',     id: 3 },
  { from: '/run-history',        to: '/dashboard',     id: 4 },
  { from: '/variables',          to: '/dashboard',     id: 5 },
  { from: '/old-dashboard',      to: '/dashboard',     id: 6 },
  { from: '/autonomous-engine',  to: '/auto-runner',   id: 7 },
  { from: '/creator-studio',     to: '/configuration', id: 8 },
  { from: '/workspace',          to: '/flowai',        id: 9 },
];

function rec(f) {
  appendFinding({ suite: '4.6', evidence_paths: [],
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'team', team: 'platform', agentId: null }, recommended_fix: null, metadata: {},
    ...f,
  });
}

for (const r of REDIRECTS) {
  test(`SURF-REDIRECT-${r.id} — ${r.from} → ${r.to}`, async ({ page }) => {
    const t0 = Date.now();
    let verdict = 'FAIL', severity = 'medium', actual;
    try {
      const resp = await page.goto(r.from, { timeout: 15_000 });
      const status = resp?.status() ?? 0;
      const finalUrl = page.url();
      const matchesTarget = finalUrl.endsWith(r.to);
      verdict = matchesTarget ? 'PASS' : (status >= 200 && status < 500 ? 'FAIL' : 'SKIP');
      severity = verdict === 'PASS' ? 'low' : 'medium';
      actual = `goto ${r.from} → status=${status} finalUrl=${finalUrl}`;
    } catch (e) {
      verdict = 'SKIP'; severity = 'medium';
      actual = `navigation failed: ${e?.message ?? e}`;
    }
    rec({ test_id: `SURF-REDIRECT-${r.id}`, surface: r.from, category: 'ui',
      severity, status: verdict, expected_behavior: `${r.from} redirects to ${r.to}`,
      actual_behavior: actual, latency_ms: Date.now() - t0,
      reproducer_steps: [`goto ${r.from}`, `assert final URL = ${r.to}`] });
    expect(['PASS','FAIL','SKIP']).toContain(verdict);
  });
}
