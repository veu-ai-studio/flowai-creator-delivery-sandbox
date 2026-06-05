import { describe, expect, it } from 'vitest';

import {
  runReferenceVerticalSlice,
  runReferenceVerticalSlices,
} from '../../src/lib/forge/verticalSliceRunner.js';

const referenceFixtures = Object.freeze([
  Object.freeze({
    productId: 'reference-fixture-a',
    productName: 'SAIGE',
    url: 'https://example.com/reference-a',
    deliveryUrl: 'https://example.com/reference-a-delivery',
    targetClass: 'saas',
    targetCustomer: 'operators validating sustainability workflows',
    objective: 'complete the eight-step FlowAI loop through reusable SaaS contracts',
    frameworks: ['general compliance'],
  }),
  Object.freeze({
    productId: 'reference-fixture-b',
    productName: 'MyPregLife',
    url: 'https://example.com/reference-b',
    deliveryUrl: 'https://example.com/reference-b-delivery',
    targetClass: 'mobile_app',
    targetCustomer: 'families validating pregnancy support workflows',
    objective: 'complete the eight-step FlowAI loop through reusable mobile-app contracts',
    frameworks: ['privacy', 'accessibility'],
  }),
]);

describe('P9 reference-product vertical slice', () => {
  it('runs one fixture through all eight forge steps without product-specific runtime paths', async () => {
    const result = await runReferenceVerticalSlice(referenceFixtures[0], { runId: 'p9-one' });

    expect(result.allStepsComplete).toBe(true);
    expect(result.completedSteps).toEqual([
      'research',
      'design',
      'build',
      'qa_audit',
      'deploy',
      'self_renewal',
      'gtm',
      'monitor',
    ]);
    expect(result.outputs.deploy.outputUrl).toBe('https://example.com/reference-a-delivery');
    expect(result.outputs.monitor.loopClosed).toBe(true);
    expect(result.proof).toMatchObject({
      label: 'UNIT',
      evidenceTier: 'B',
      verifiedMovement: false,
      productAgnosticContracts: true,
    });
  });

  it('runs current reference fixtures through the same product-agnostic contracts', async () => {
    const result = await runReferenceVerticalSlices(referenceFixtures, { runId: 'p9-two-fixtures' });

    expect(result.fixtureCount).toBe(2);
    expect(result.allComplete).toBe(true);
    expect(result.results.map((item) => item.productId)).toEqual([
      'reference-fixture-a',
      'reference-fixture-b',
    ]);
    for (const item of result.results) {
      expect(item.allStepsComplete).toBe(true);
      expect(item.outputs.research.productId).toBe(item.productId);
      expect(item.outputs.deploy.distribution.deliveryClass).toMatch(/hosted_url|signed_package/);
      expect(item.outputs.gtm.readyForMonitor).toBe(true);
      expect(item.outputs.monitor.loopClosed).toBe(true);
    }
  });

  it('keeps fixture names outside the core vertical-slice runtime module', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('src/lib/forge/verticalSliceRunner.js', 'utf8');
    expect(source).not.toMatch(/SAIGE|MyPregLife/);
  });
});
