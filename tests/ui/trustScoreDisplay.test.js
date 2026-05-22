// tests/ui/trustScoreDisplay.test.js
//
// DISPATCH U1 ITEM 2 — Trust Score is the headline metric in the
// result card. The vitest config runs in `environment: 'node'` so we
// can't render React; instead we statically verify the component
// reads effectiveTrustScore as the primary value, with rawScore as
// secondary context. A purely static guard, but it catches the
// specific regression the dispatch flagged (UI silently showing the
// old rawScore=99.5 when effectiveTrustScore is available).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENT_PATH = resolve(__dirname, '../../src/components/RunConstructionPanel.jsx');
const HANDLER_PATH   = resolve(__dirname, '../../src/api/run-construction.js');
const DASHBOARD_PATH = resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx');

const componentSrc = readFileSync(COMPONENT_PATH, 'utf8');
const handlerSrc   = readFileSync(HANDLER_PATH, 'utf8');
const dashboardSrc = readFileSync(DASHBOARD_PATH, 'utf8');

describe('UI trust score display (DISPATCH U1 ITEM 2)', () => {
  it('SSE handler forwards effectiveTrustScore on the final event', () => {
    expect(handlerSrc).toMatch(/effectiveTrustScore:\s*typeof result\?\.effectiveTrustScore/);
    expect(handlerSrc).toMatch(/rawScore:\s*typeof result\?\.rawScore/);
    expect(handlerSrc).toMatch(/scoredDimensions:\s*typeof result\?\.scoredDimensions/);
  });

  it('component reads effectiveTrustScore as the trust score with rawScore as fallback', () => {
    // The trustScore expression must read effectiveTrustScore first.
    expect(componentSrc).toMatch(/final\.effectiveTrustScore[\s\S]{0,80}?rawScore/);
  });

  it('result card renders "Trust Score:" as the primary metric label', () => {
    expect(componentSrc).toMatch(/Trust Score:\s*\{?trustScore/);
  });

  it('result card renders raw score + coverage as secondary context', () => {
    expect(componentSrc).toMatch(/raw\s*\{?rawScore\.toFixed/);
    expect(componentSrc).toMatch(/coverage\s*\{?scoredDims\}\s*\/\s*\{?totalDims/);
  });

  it('/flowai dashboard reads effectiveTrustScore as the completion-card headline', () => {
    expect(dashboardSrc).toMatch(/finalResult\?\.effectiveTrustScore/);
    expect(dashboardSrc).toMatch(/finalTrustScore\.toFixed/);
    expect(dashboardSrc).toMatch(/raw\s*\{finalRawScore\.toFixed/);
  });

  it('SSE handler forwards universal-mode fields for the U1 result card', () => {
    expect(handlerSrc).toMatch(/runMode:\s*typeof result\?\.runMode/);
    expect(handlerSrc).toMatch(/universalMode:\s*typeof result\?\.universalMode/);
    expect(handlerSrc).toMatch(/findingsCount:\s*typeof result\?\.findingsCount/);
    expect(handlerSrc).toMatch(/findingsSeverity:/);
  });

  it('component renders UniversalModePanel when result is in UNIVERSAL mode', () => {
    expect(componentSrc).toMatch(/function UniversalModePanel/);
    expect(componentSrc).toMatch(/Register this product for auto-fix and deployment/);
    expect(componentSrc).toMatch(/isUniversalMode/);
  });

  it('UniversalModePanel renders the severity rollup grid', () => {
    expect(componentSrc).toMatch(/critical/);
    expect(componentSrc).toMatch(/high/);
    expect(componentSrc).toMatch(/medium/);
    expect(componentSrc).toMatch(/low/);
  });
});
