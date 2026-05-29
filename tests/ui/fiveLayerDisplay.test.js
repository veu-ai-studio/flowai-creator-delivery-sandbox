// tests/ui/fiveLayerDisplay.test.js
//
// DISPATCH (production runtime fixes) ITEM 2 — Five-Layer radar in
// src/pages/FlowAIDashboard.jsx was reading legacy `preScore` /
// `postScore` field names but the orchestrator emits `gtmScore` +
// `layers` per STEP 5 / STEP 11 result envelopes. Static guard:
// assert the component reads the field names the orchestrator
// actually emits — no fabrication.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_PATH = resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx');
const ORCHESTRATOR_PATH = resolve(__dirname, '../../src/lib/agents/renewal/orchestrator.js');

const dashboardSrc = readFileSync(DASHBOARD_PATH, 'utf8');
const orchestratorSrc = readFileSync(ORCHESTRATOR_PATH, 'utf8');

describe('Five-Layer display reads orchestrator-emitted fields', () => {
  it('dashboard reads gtmScore as the headline metric', () => {
    expect(dashboardSrc).toMatch(/r\.gtmScore/);
  });

  it('dashboard reads layers object for L1..L5', () => {
    expect(dashboardSrc).toMatch(/r\.layers\s*&&\s*typeof r\.layers === 'object'/);
  });

  it('orchestrator emits gtmScore + layers on STEP 5 result', () => {
    expect(orchestratorSrc).toMatch(/step:\s*5[\s\S]*?gtmScore:\s*preGtm\.score/);
    expect(orchestratorSrc).toMatch(/step:\s*5[\s\S]*?layers:\s*\{[\s\S]*?l1:[\s\S]*?l5:/);
  });

  it('component is not consuming fabricated layer scores — only real fields', () => {
    // Negative assertion: no hardcoded numeric layer values in the
    // FiveLayerRadar component (would indicate fabrication).
    const radar = dashboardSrc.match(/function FiveLayerRadar[\s\S]*?\n\}\n/);
    expect(radar).not.toBeNull();
    expect(radar[0]).toMatch(/scores\?\.l1[\s\S]*scores\?\.l5/);
    expect(radar[0]).not.toMatch(/l1:\s*[1-9]/);
  });
});
