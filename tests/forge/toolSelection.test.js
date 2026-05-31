import { describe, expect, it } from 'vitest';

import { applyUndServedFirstWeighting, selectForgeStepTool } from '../../src/lib/forge/toolSelection.js';

function serviceReturning(selection, calls = []) {
  return {
    async getTopTool(step, targetClass, mode) {
      calls.push({ step, targetClass, mode });
      return selection;
    },
  };
}

const perplexity = { rank: 1, platform_name: 'Perplexity AI', performance_score: 9, target_classes: ['generic_url'] };
const tavily = { rank: 2, platform_name: 'Tavily', performance_score: 8, target_classes: ['generic_url'] };
const serper = { rank: 3, platform_name: 'Unknown Tool', performance_score: 10, target_classes: ['generic_url'] };
const base44 = { rank: 1, platform_name: 'Base44', performance_score: 9, target_classes: ['generic_url'] };
const cursor = { rank: 2, platform_name: 'Cursor', performance_score: 9, target_classes: ['generic_url'] };

describe('forge toolSelection adapter', () => {
  it('returns null when service not provided', async () => {
    await expect(selectForgeStepTool({ stepKey: 'research', productId: 'saige' })).resolves.toBeNull();
  });

  it('does not pass underserved_market to service', async () => {
    const calls = [];
    await selectForgeStepTool({ service: serviceReturning([perplexity], calls), stepKey: 'research', productId: 'saige' });
    expect(calls[0].targetClass).not.toBe('underserved_market');
  });

  it('uses generic_url as TARGET_CLASS internally', async () => {
    const calls = [];
    await selectForgeStepTool({ service: serviceReturning([perplexity], calls), stepKey: 'research', productId: 'saige' });
    expect(calls[0].targetClass).toBe('generic_url');
  });

  it('fetches top-5 candidates in AUTOMATIC mode by requesting GUIDED output', async () => {
    const calls = [];
    await selectForgeStepTool({ service: serviceReturning([perplexity, tavily], calls), stepKey: 'research', productId: 'saige', mode: 'AUTOMATIC' });
    expect(calls[0].mode).toBe('GUIDED');
  });

  it('joins registry by platform_name === name', () => {
    const [weighted] = applyUndServedFirstWeighting([perplexity]);
    expect(weighted.registryEntry.name).toBe('Perplexity AI');
  });

  it('missing registry entry sets metadataStatus MISSING_REGISTRY_METADATA', () => {
    const [weighted] = applyUndServedFirstWeighting([serper]);
    expect(weighted.metadataStatus).toBe('MISSING_REGISTRY_METADATA');
  });

  it('missing underserved_accessible scores 0.0 and dataGapWarning on that tool', () => {
    const [weighted] = applyUndServedFirstWeighting([{ ...perplexity, registryEntry: { name: 'partial', cost_tier: 'free' } }]);
    expect(weighted.underservedAccessibilityScore).toBe(0);
    expect(weighted.dataGapWarning).toBe(true);
  });

  it('missing cost_tier scores 0.0 and dataGapWarning on that tool', () => {
    const [weighted] = applyUndServedFirstWeighting([{ ...perplexity, registryEntry: { name: 'partial', underserved_accessible: 'yes' } }]);
    expect(weighted.costScore).toBe(0);
    expect(weighted.dataGapWarning).toBe(true);
  });

  it('underserved_accessible yes scores higher than no at equal performance', () => {
    const ranked = applyUndServedFirstWeighting([
      { platform_name: 'yes', performance_score: 5, registryEntry: { name: 'yes', underserved_accessible: 'yes', cost_tier: 'paid', tags: [] } },
      { platform_name: 'no', performance_score: 5, registryEntry: { name: 'no', underserved_accessible: 'no', cost_tier: 'paid', tags: [] } },
    ]);
    expect(ranked[0].platform_name).toBe('yes');
  });

  it('free scores higher than paid at equal performance and equal accessibility', () => {
    const ranked = applyUndServedFirstWeighting([
      { platform_name: 'paid', performance_score: 5, registryEntry: { name: 'paid', underserved_accessible: 'yes', cost_tier: 'paid', tags: [] } },
      { platform_name: 'free', performance_score: 5, registryEntry: { name: 'free', underserved_accessible: 'yes', cost_tier: 'free', tags: [] } },
    ]);
    expect(ranked[0].platform_name).toBe('free');
  });

  it('weighted composite uses 0.50/0.25/0.15/0.10', () => {
    const [weighted] = applyUndServedFirstWeighting([
      { platform_name: 'x', performance_score: 8, registryEntry: { name: 'x', underserved_accessible: 'yes', cost_tier: 'free', tags: ['lightweight'] } },
    ]);
    expect(weighted.compositeScore).toBe(9);
  });

  it('AUTOMATIC selects best accessible from top-5 when accessible option exists', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning([
        { platform_name: 'inaccessible', performance_score: 10, registryEntry: { name: 'inaccessible', underserved_accessible: 'no', cost_tier: 'paid', tags: [] } },
        perplexity,
      ]),
      stepKey: 'research',
      productId: 'saige',
    });
    expect(output.selection.platform_name).toBe('Perplexity AI');
    expect(output.underservedConstraintSatisfied).toBe(true);
  });

  it('AUTOMATIC emits undServedAccessWarning when no accessible tool in top-5', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning([
        { platform_name: 'only-no', performance_score: 10, registryEntry: { name: 'only-no', underserved_accessible: 'no', cost_tier: 'paid', tags: [] } },
      ]),
      stepKey: 'research',
      productId: 'saige',
    });
    expect(output.undServedAccessWarning).toBe(true);
  });

  it('underservedConstraintSatisfied false when warning emitted', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning([
        { platform_name: 'only-no', performance_score: 10, registryEntry: { name: 'only-no', underserved_accessible: 'no', cost_tier: 'paid', tags: [] } },
      ]),
      stepKey: 'research',
      productId: 'saige',
    });
    expect(output.underservedConstraintSatisfied).toBe(false);
  });

  it('undServedFirstEnforce false returns raw output with undServedFirstApplied false', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning(perplexity),
      stepKey: 'research',
      productId: 'saige',
      undServedFirstEnforce: false,
    });
    expect(output.selection).toEqual(perplexity);
    expect(output.undServedFirstApplied).toBe(false);
  });

  it('pipeline mode returns array', async () => {
    const output = await selectForgeStepTool({ service: serviceReturning([base44, cursor]), stepKey: 'build', productId: 'saige' });
    expect(Array.isArray(output.selection)).toBe(true);
  });

  it('single mode returns object', async () => {
    const output = await selectForgeStepTool({ service: serviceReturning([perplexity, tavily]), stepKey: 'research', productId: 'saige' });
    expect(Array.isArray(output.selection)).toBe(false);
    expect(output.selection.platform_name).toBeTruthy();
  });

  it('pipelineNullAt emitted when null mid-sequence', async () => {
    const output = await selectForgeStepTool({ service: serviceReturning([base44, null, cursor]), stepKey: 'build', productId: 'saige' });
    expect(output.pipelineNullAt).toEqual([1]);
  });

  it('base44_compatible tie-breaker applied for build step only', () => {
    const tiedCursor = { ...cursor, rank: 1 };
    const tiedBase44 = { ...base44, rank: 1 };
    const buildRanked = applyUndServedFirstWeighting([tiedCursor, tiedBase44], { stepKey: 'build' });
    const researchRanked = applyUndServedFirstWeighting([tiedCursor, tiedBase44], { stepKey: 'research' });
    expect(buildRanked[0].platform_name).toBe('Base44');
    expect(researchRanked[0].platform_name).toBe('Cursor');
  });

  it('manual mode returns null selection with envelope', async () => {
    const output = await selectForgeStepTool({ service: serviceReturning([perplexity]), stepKey: 'research', productId: 'saige', mode: 'MANUAL' });
    expect(output.selection).toBeNull();
    expect(output.mode).toBe('MANUAL');
  });

  it('end-to-end envelope contains undServedFirstApplied true when service provided', async () => {
    const output = await selectForgeStepTool({ service: serviceReturning([perplexity]), stepKey: 'research', productId: 'saige' });
    expect(output).toMatchObject({
      stepKey: 'research',
      selectionMode: 'single',
      undServedFirstApplied: true,
    });
  });

  it('main envelope includes candidates array with full ranked pool in single mode', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning([perplexity, tavily]),
      stepKey: 'research',
      productId: 'saige',
    });
    expect(Array.isArray(output.candidates)).toBe(true);
    expect(output.candidates).toHaveLength(2);
    expect(output.candidates.map(candidate => candidate.platform_name)).toEqual(['Perplexity AI', 'Tavily']);
  });

  it('selection equals ranked winner and candidates preserves full pool', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning([tavily, perplexity]),
      stepKey: 'research',
      productId: 'saige',
    });
    expect(output.selection).toBe(output.candidates[0]);
    expect(output.selection.platform_name).toBe('Perplexity AI');
    expect(output.candidates.map(candidate => candidate.platform_name)).toEqual(['Perplexity AI', 'Tavily']);
  });

  it('MANUAL mode returns empty frozen candidates array', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning([perplexity, tavily]),
      stepKey: 'research',
      productId: 'saige',
      mode: 'MANUAL',
    });
    expect(output.selection).toBeNull();
    expect(output.candidates).toEqual([]);
    expect(Object.isFrozen(output.candidates)).toBe(true);
  });

  it('candidates array is frozen', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning([perplexity, tavily]),
      stepKey: 'research',
      productId: 'saige',
    });
    expect(Object.isFrozen(output.candidates)).toBe(true);
  });

  it('pipeline mode includes candidates while preserving array selection behavior', async () => {
    const output = await selectForgeStepTool({
      service: serviceReturning([base44, cursor]),
      stepKey: 'build',
      productId: 'saige',
    });
    expect(Array.isArray(output.selection)).toBe(true);
    expect(output.selection).toEqual(output.candidates);
    expect(output.selection.map(candidate => candidate.platform_name)).toEqual(['Base44', 'Cursor']);
  });
});
