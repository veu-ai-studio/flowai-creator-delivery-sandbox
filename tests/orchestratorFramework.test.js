import { describe, expect, it } from 'vitest';

import {
  ACCESS_MODES,
  FLOWAI_STEPS,
  LIVE_CALL_STATUS,
  ORCHESTRATION_MODE_MATURITY,
  ORCHESTRATION_MODES,
  PLATFORM_CATEGORIES,
  PLATFORM_REGISTRY,
  REQUIRED_MARKET_STATUS,
  SCORER_STATUS,
  STATUS_LADDER,
  applyRegistryUpdate,
  buildOrchestrationPlan,
  createLiveCallEnvelope,
  detectReadinessScorer,
  evaluateSelfRenewalGate,
  rankPlatformsForStep,
  selectPlatformForStep,
  validatePlatform,
} from '../src/lib/orchestratorFramework/index.js';

describe('orchestrator framework registry', () => {
  it('defines every initial platform without live calls or secret values', () => {
    expect(PLATFORM_REGISTRY.map(platform => platform.id)).toEqual([
      'claude-anthropic',
      'openai-codex',
      'google-gemini',
      'base44',
      'replit',
      'vercel',
      'supabase',
    ]);

    for (const platform of PLATFORM_REGISTRY) {
      expect(validatePlatform(platform).ok).toBe(true);
      expect(platform.liveEnabled).toBe(false);
      expect(platform.credentialRef).not.toMatch(/sk-|secret-value/i);
      expect(platform.costRank.certainty).toMatch(/known|unknown/);
      expect(platform.performanceRank.certainty).toMatch(/known|unknown/);
      expect(platform.evidence.length).toBeGreaterThan(0);
      expect(['api', 'github', 'browser', 'human-relayed']).toContain(platform.accessMode);
    }

    expect(PLATFORM_REGISTRY.find(platform => platform.id === 'base44')).toMatchObject({
      category: PLATFORM_CATEGORIES.BUILDER_RUNTIME,
      accessMode: ACCESS_MODES.HUMAN_RELAYED,
      status: STATUS_LADDER.ENVISIONED,
    });
    expect(PLATFORM_REGISTRY.find(platform => platform.id === 'openai-codex')).toMatchObject({
      accessMode: ACCESS_MODES.GITHUB,
    });
  });

  it('accepts structured platform discovery updates', () => {
    const updated = applyRegistryUpdate(PLATFORM_REGISTRY, {
      platforms: [{
        id: 'new-research-model',
        label: 'New Research Model',
        category: PLATFORM_CATEGORIES.MODEL_PROVIDER,
        capabilities: ['research'],
        stepsServed: ['Research'],
        costRank: 1,
        performanceRank: 2,
        liveEnabled: false,
        credentialRef: 'NEW_RESEARCH_MODEL_KEY',
      }],
    });

    expect(updated.find(platform => platform.id === 'new-research-model')).toBeTruthy();
  });
});

describe('orchestrator framework routing and modes', () => {
  it('routes the eight canonical FlowAI steps to eligible ranked platforms', () => {
    const plan = buildOrchestrationPlan({ mode: ORCHESTRATION_MODES.AUTO });

    expect(plan).toHaveLength(FLOWAI_STEPS.length);
    expect(plan.every(stepPlan => stepPlan.status === 'selected')).toBe(true);
    expect(plan.find(stepPlan => stepPlan.step === 'Deploy').selected.category).toBe(PLATFORM_CATEGORIES.INFRASTRUCTURE);
  });

  it('ranks Build across builder-runtime and model-provider only', () => {
    const ranked = rankPlatformsForStep('Build');
    const categories = new Set(ranked.map(platform => platform.category));

    expect(categories.has(PLATFORM_CATEGORIES.BUILDER_RUNTIME)).toBe(true);
    expect(categories.has(PLATFORM_CATEGORIES.MODEL_PROVIDER)).toBe(true);
    expect(categories.has(PLATFORM_CATEGORIES.INFRASTRUCTURE)).toBe(false);
  });

  it('selects automatically, recommends in guided mode, and exposes full manual options', () => {
    const auto = selectPlatformForStep({ step: 'Research', mode: ORCHESTRATION_MODES.AUTO });
    expect(ORCHESTRATION_MODE_MATURITY[ORCHESTRATION_MODES.AUTO]).toBe(STATUS_LADDER.ENVISIONED);
    expect(auto.modeMaturity).toBe(STATUS_LADDER.ENVISIONED);
    expect(auto.selected.category).toBe(PLATFORM_CATEGORIES.MODEL_PROVIDER);
    expect(auto.selected.routingScore).toBeLessThanOrEqual(auto.recommendations[1].routingScore);
    expect(auto.awaitingUserSelection).toBe(false);

    const guided = selectPlatformForStep({ step: 'Build', mode: ORCHESTRATION_MODES.GUIDED });
    expect(guided.selected).toBeNull();
    expect(guided.awaitingUserSelection).toBe(true);
    expect(guided.recommendations[0].routingScore).toBeLessThanOrEqual(guided.recommendations[1].routingScore);

    const manual = selectPlatformForStep({
      step: 'Build',
      mode: ORCHESTRATION_MODES.MANUAL,
      userSelection: 'supabase',
    });
    expect(manual.selected.id).toBe('supabase');
  });
});

describe('orchestrator framework scoring and live-call hooks', () => {
  it('stubs self-renewal scoring honestly when no scorer is supplied', async () => {
    const result = await evaluateSelfRenewalGate({
      target: { type: 'product', id: 'saige' },
      builderPlatform: PLATFORM_REGISTRY.find(platform => platform.id === 'base44'),
    });

    expect(detectReadinessScorer(null).status).toBe(SCORER_STATUS.STUB_NO_SCORER);
    expect(result.status).toBe(SCORER_STATUS.SCORE_BLOCKED_STUB);
    expect(result.score).toBeNull();
    expect(result.goToMarketAllowed).toBe(false);
    expect(result.correctiveDispatch.reason).toBe('readiness_scorer_not_configured');
  });

  it('gates GoToMarket from a supplied real scorer result', async () => {
    const low = await evaluateSelfRenewalGate({
      target: { type: 'product', id: 'saige' },
      scorer: async () => ({ score: 94, status: REQUIRED_MARKET_STATUS }),
      builderPlatform: PLATFORM_REGISTRY.find(platform => platform.id === 'base44'),
    });
    const unverified = await evaluateSelfRenewalGate({
      target: { type: 'product', id: 'saige' },
      scorer: async () => ({ score: 96, status: STATUS_LADDER.BUILT }),
      builderPlatform: PLATFORM_REGISTRY.find(platform => platform.id === 'base44'),
    });
    const high = await evaluateSelfRenewalGate({
      target: { type: 'product', id: 'saige' },
      scorer: async () => ({ score: 96, status: REQUIRED_MARKET_STATUS }),
      builderPlatform: PLATFORM_REGISTRY.find(platform => platform.id === 'base44'),
    });

    expect(low.goToMarketAllowed).toBe(false);
    expect(low.correctiveDispatch.type).toBe('CORRECTIVE_DISPATCH');
    expect(unverified.marketExposureAllowed).toBe(false);
    expect(unverified.correctiveDispatch.reason).toBe('verification_status_required:BUILT!=VERIFIED');
    expect(high.goToMarketAllowed).toBe(true);
    expect(high.marketExposureAllowed).toBe(true);
    expect(high.requiredStatus).toBe(REQUIRED_MARKET_STATUS);
    expect(high.correctiveDispatch).toBeNull();
  });

  it('returns disabled live-call envelopes without resolving secret values', () => {
    const envelope = createLiveCallEnvelope({
      platformId: 'openai-codex',
      action: 'run-step',
      payload: { step: 'Build' },
      credentialResolver: credentialRef => credentialRef === 'OPENAI_API_KEY',
    });

    expect(envelope.status).toBe(LIVE_CALL_STATUS.DISABLED);
    expect(envelope.credentialRef).toBe('OPENAI_API_KEY');
    expect(envelope.credentialPresent).toBe(true);
    expect(envelope.liveCall).toBe(false);
  });
});
