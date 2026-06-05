import { describe, expect, it, vi } from 'vitest';

import { formatMonitorEvidence } from '../../src/lib/forge/monitorEvidenceLogger.js';
import { runMonitor } from '../../src/lib/forge/monitorRunner.js';
import { MONITOR_BLOCKED, MONITOR_CHECK_REQUIRED, MONITOR_RENEWAL_RECOMMENDED, scoreMonitorStep } from '../../src/lib/forge/monitorStepScorer.js';
import { buildMonitorTemplate } from '../../src/lib/forge/monitorTemplate.js';

const context = {
  productId: 'product-a',
  outputUrl: 'https://product-a.example.com',
  storeReviewStatus: 'not_applicable',
};

describe('Forge Step 8 Monitor', () => {
  it('monitor template exposes canonical Step 8 sections', () => {
    expect(buildMonitorTemplate('product-a', context).sections.map(section => section.id)).toEqual([
      'monitor-target',
      'monitor-live-check',
      'monitor-regression-signal',
      'monitor-store-review-status',
      'monitor-renewal-trigger',
    ]);
  });

  it('blocks when no deployed URL exists', async () => {
    const output = await runMonitor('product-a', {}, {}, {});
    expect(output.flag).toBe(MONITOR_BLOCKED);
    expect(output.monitorComplete).toBe(false);
  });

  it('does not mark healthy without a real live check', async () => {
    const output = await runMonitor('product-a', context, {}, {});
    expect(output.flag).toBe(MONITOR_CHECK_REQUIRED);
    expect(output.liveCheck.checked).toBe(false);
  });

  it('completes monitor with a healthy adapter result', async () => {
    const output = await runMonitor('product-a', context, {}, {
      monitorAdapter: vi.fn(async () => ({ ok: true, status: 'healthy', statusCode: 200, latencyMs: 42 })),
    });
    expect(output.monitorComplete).toBe(true);
    expect(output.loopClosed).toBe(true);
    expect(output.renewalTrigger.recommendation).toBe('none');
  });

  it('recommends Self-Renewal on unhealthy live signal', async () => {
    const output = await runMonitor('product-a', context, {}, {
      monitorAdapter: vi.fn(async () => ({ ok: false, status: 'unhealthy', statusCode: 500 })),
    });
    expect(output.flag).toBe(MONITOR_RENEWAL_RECOMMENDED);
    expect(output.renewalTrigger.recommendation).toBe('self-renewal');
  });

  it('tracks store-review status without treating store acceptance as assumed', async () => {
    const output = await runMonitor('product-a', { ...context, storeReviewStatus: 'storeRejected' }, {}, {
      monitorAdapter: vi.fn(async () => ({ ok: true, status: 'healthy' })),
    });
    expect(output.storeReviewStatus.status).toBe('storeRejected');
    expect(output.storeReviewStatus.tracked).toBe(true);
  });

  it('scorer rejects healthy status without checked=true', () => {
    const score = scoreMonitorStep({
      sections: [
        { id: 'monitor-target', input: { outputUrl: 'https://example.com' } },
        { id: 'monitor-live-check', input: { checked: false, status: 'healthy' } },
        { id: 'monitor-regression-signal', input: { assessed: false } },
        { id: 'monitor-store-review-status', input: { tracked: true } },
        { id: 'monitor-renewal-trigger', input: { recommendation: 'none' } },
      ],
    });
    expect(score.monitorComplete).toBe(false);
    expect(score.flag).toBe(MONITOR_CHECK_REQUIRED);
  });

  it('formats monitor evidence without inventing VERIFIED language', async () => {
    const output = await runMonitor('product-a', context, {}, {});
    const markdown = formatMonitorEvidence(output);
    expect(markdown).toContain('LiveChecked: false');
    expect(markdown).not.toMatch(/VERIFIED/i);
  });
});
