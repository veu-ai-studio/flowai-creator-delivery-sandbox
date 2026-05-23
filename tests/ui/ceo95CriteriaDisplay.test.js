import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashboardSource = readFileSync(resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx'), 'utf8');

describe('CEO-95 scoring display', () => {
  it('prefers verified CEO-95 layer scores in the radar when available', () => {
    expect(dashboardSource).toContain('ceo95Criteria?.verifiedScore');
    expect(dashboardSource).toContain('ceo95Criteria?.layerScores');
  });

  it('surfaces verified, potential, and blocked score provenance in the result card', () => {
    expect(dashboardSource).toContain('Verified CEO-95 score');
    expect(dashboardSource).toContain('Potential score');
    expect(dashboardSource).toContain('Blocked verification');
    expect(dashboardSource).toContain('human/repo/payment proof required');
  });
});
