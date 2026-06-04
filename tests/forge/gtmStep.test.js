import { describe, expect, it } from 'vitest';

import { formatGtmEvidence } from '../../src/lib/forge/gtmEvidenceLogger.js';
import { runGtm } from '../../src/lib/forge/gtmRunner.js';
import { GTM_EVIDENCE_INCOMPLETE, GTM_HUMAN_DECISION_REQUIRED, scoreGtmStep } from '../../src/lib/forge/gtmStepScorer.js';
import { buildGtmTemplate } from '../../src/lib/forge/gtmTemplate.js';

const context = {
  productId: 'product-a',
  productName: 'Product A',
  targetClass: 'web',
  deployOutput: { outputUrl: 'https://product-a.example.com' },
  renewalOutput: { renewalComplete: true },
  userObjectives: ['launch demo'],
  issues: [],
};

describe('Forge Step 7 GTM', () => {
  it('gtm template exposes canonical Step 7 sections', () => {
    expect(buildGtmTemplate('product-a', context).sections.map(section => section.id)).toEqual([
      'gtm-evidence-gate',
      'gtm-readiness-score',
      'gtm-positioning',
      'gtm-channel-plan',
      'gtm-launch-checklist',
      'gtm-human-decision-log',
    ]);
  });

  it('blocks GTM claims when product evidence is incomplete', async () => {
    const output = await runGtm('product-a', {}, {}, {});
    expect(output.flag).toBe(GTM_EVIDENCE_INCOMPLETE);
    expect(output.gtmReady).toBe(false);
  });

  it('requires a human decision log before GTM readiness', async () => {
    const output = await runGtm('product-a', context, {}, {});
    expect(output.flag).toBe(GTM_HUMAN_DECISION_REQUIRED);
    expect(output.gtmReady).toBe(false);
  });

  it('produces sourced positioning and channels without fabricated market claims', async () => {
    const output = await runGtm('product-a', context, {
      'gtm-human-decision-log': 'authorized operator approves demo readiness',
    }, {});
    expect(output.gtmReady).toBe(true);
    expect(output.positioning.sourced).toBe(true);
    expect(output.positioning.statement).toContain('observed product evidence');
    expect(output.channels.channels[0].basis).toMatch(/operator|owned-channel/i);
  });

  it('critical findings block readiness even with a decision log', async () => {
    const output = await runGtm('product-a', {
      ...context,
      issues: [{ severity: 'critical', category: 'runtime-error' }],
    }, {
      'gtm-human-decision-log': 'authorized operator approves demo readiness',
    }, {});
    expect(output.gtmReady).toBe(false);
    expect(output.correctivePrompts).toContain('Critical findings block GTM readiness.');
  });

  it('scorer rejects incomplete evidence', () => {
    const score = scoreGtmStep({
      sections: [
        { id: 'gtm-evidence-gate', input: { productEvidenceComplete: false } },
        { id: 'gtm-readiness-score', input: { score: 100, counts: { critical: 0 } } },
        { id: 'gtm-positioning', input: { sourced: true, statement: 'x' } },
        { id: 'gtm-channel-plan', input: { sourced: true, channels: [] } },
        { id: 'gtm-launch-checklist', input: { items: [{ complete: true }] } },
        { id: 'gtm-human-decision-log', input: { recorded: true } },
      ],
    });
    expect(score.gtmReady).toBe(false);
    expect(score.flag).toBe(GTM_EVIDENCE_INCOMPLETE);
  });

  it('formats GTM evidence without inventing VERIFIED language', async () => {
    const output = await runGtm('product-a', context, {}, {});
    const markdown = formatGtmEvidence(output);
    expect(markdown).toContain('ReadinessScore: 100');
    expect(markdown).not.toMatch(/VERIFIED/i);
  });
});
