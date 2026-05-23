import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { normalizeIterationHistoryRow } from '../../src/lib/ui/iterationHistory.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashboardSource = readFileSync(resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx'), 'utf8');

describe('iteration history no-preview normalization', () => {
  it('reuses the baseline as post score when no preview exists', () => {
    const row = normalizeIterationHistoryRow({
      number: 1,
      preScore: 59,
      postScore: 0,
      delta: -59,
      decision: 'open_pr',
      previewUrl: null,
      steps: [
        {
          step: 11,
          result: { reusedPreFixScore: true },
        },
      ],
    });

    expect(row).toMatchObject({
      preScore: 59,
      postScore: 59,
      delta: 0,
      decision: 'open_pr',
      noPreviewScoreReuse: true,
      scoreReuseNote: 'No preview available; post score reused from baseline.',
    });
  });

  it('leaves measured preview rows unchanged', () => {
    const row = {
      number: 1,
      preScore: 59,
      postScore: 64,
      delta: 5,
      previewUrl: 'https://preview.example',
      steps: [
        {
          step: 11,
          result: { reusedPreFixScore: false },
        },
      ],
    };

    expect(normalizeIterationHistoryRow(row)).toBe(row);
  });

  it('normalizes iteration SSE events before rendering history rows', () => {
    expect(dashboardSource).toContain('normalizeIterationHistoryRow(payload.iteration)');
    expect(dashboardSource).toContain('No preview available; post score reused from baseline.');
    expect(dashboardSource).toContain('noPreviewScoreReuse');
    expect(dashboardSource).toContain('scoreReuseNote');
  });
});
