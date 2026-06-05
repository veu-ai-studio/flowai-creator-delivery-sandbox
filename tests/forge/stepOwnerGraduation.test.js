import { describe, expect, it } from 'vitest';

import {
  createForgeStepOwnerHub,
  invokeForgeStepOwner,
} from '../../src/lib/forge/stepOwnerRecommendations.js';
import { runReferenceVerticalSlice } from '../../src/lib/forge/verticalSliceRunner.js';

describe('P11 forge step-owner graduation', () => {
  it('registers agents #6-#10 as recommend-only forge step owners', async () => {
    const hub = createForgeStepOwnerHub();
    const expected = {
      research: 6,
      design: 7,
      qa_audit: 8,
      gtm: 9,
      monitor: 10,
    };

    for (const [stepKey, agentId] of Object.entries(expected)) {
      const recommendation = await invokeForgeStepOwner({ orchestratorHub: hub, runId: 'p11-run' }, stepKey, {
        productId: 'neutral-product',
        stepInputs: { stepKey, complete: true },
      });
      expect(recommendation.agent_id).toBe(agentId);
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.metadata).toMatchObject({
        ok: true,
        authority: 'recommend_only',
        stepKey,
        productId: 'neutral-product',
        runtimeActive: true,
      });
    }
  });

  it('keeps step-owner failures non-blocking', async () => {
    const recommendation = await invokeForgeStepOwner({
      runId: 'p11-failure',
      orchestratorHub: {
        async invokeStepOwner() {
          throw new Error('step-owner boom');
        },
      },
    }, 'research', { productId: 'neutral-product', stepInputs: {} });

    expect(recommendation).toBeNull();
  });

  it('vertical slice emits recommendations for P11 target agents', async () => {
    const result = await runReferenceVerticalSlice({
      productId: 'neutral-reference',
      productName: 'Neutral Reference',
      url: 'https://example.com',
      deliveryUrl: 'https://example.com/reference',
      targetClass: 'web',
    }, { runId: 'p11-vertical' });

    expect(result.allStepsComplete).toBe(true);
    expect(result.outputs.research.stepOwnerRecommendation.agent_id).toBe(6);
    expect(result.outputs.design.stepOwnerRecommendation.agent_id).toBe(7);
    expect(result.outputs.audit.stepOwnerRecommendation.agent_id).toBe(8);
    expect(result.outputs.gtm.stepOwnerRecommendation.agent_id).toBe(9);
    expect(result.outputs.monitor.stepOwnerRecommendation.agent_id).toBe(10);
  });
});
