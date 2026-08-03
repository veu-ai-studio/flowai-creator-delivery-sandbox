import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runOrchestration: vi.fn(),
  assertPublicHttpUrl: vi.fn(),
  readProductSsotRunContext: vi.fn(),
  persistSymbioticRunSummary: vi.fn(),
  createClient: vi.fn(),
  stop: vi.fn(),
  isInngestEnabled: vi.fn(),
  syncInngestRegistration: vi.fn(),
  sendEvent: vi.fn(),
  runFreshBuild: vi.fn(),
  requireAuthHard: vi.fn(),
}));

vi.mock('../../api/_lib/auth.js', () => ({
  requireAuthHard: mocks.requireAuthHard,
}));

vi.mock('../../api/_lib/crawler.js', () => ({
  assertPublicHttpUrl: mocks.assertPublicHttpUrl,
}));

vi.mock('../../src/lib/agents/renewal/orchestrator.js', () => ({
  runOrchestration: mocks.runOrchestration,
}));

vi.mock('../../src/lib/forge/productSsotContinuity.js', () => ({
  readProductSsotRunContext: mocks.readProductSsotRunContext,
  persistSymbioticRunSummary: mocks.persistSymbioticRunSummary,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

vi.mock('../../api/_lib/inngest.js', () => ({
  isInngestEnabled: mocks.isInngestEnabled,
  syncInngestRegistration: mocks.syncInngestRegistration,
  sendEvent: mocks.sendEvent,
}));

vi.mock('../../src/lib/freshBuild/freshBuildOrchestrator.js', () => ({
  runFreshBuild: mocks.runFreshBuild,
}));

const { default: handler, runConstructionToStatus } = await import('../../src/api/run-construction.js');
const { readForgeRunStatus, resetForgeRunStatusForTests } = await import('../../api/_lib/forgeRunStatusBus.js');

function createResponse() {
  const chunks = [];
  const listeners = new Map();
  return {
    chunks,
    headers: {},
    ended: false,
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    flushHeaders() {},
    write(chunk) {
      chunks.push(String(chunk));
    },
    end(chunk = '') {
      if (chunk) chunks.push(String(chunk));
      this.ended = true;
    },
    on(event, listener) {
      listeners.set(event, listener);
    },
    emitClose() {
      listeners.get('close')?.();
    },
  };
}

function createRequest(body = {}, headers = {}) {
  return {
    method: 'POST',
    headers,
    body,
  };
}

function parseSse(chunks) {
  return chunks
    .join('')
    .split('\n\n')
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame) => {
      const data = frame.replace(/^data:\s*/, '');
      return data === '[DONE]' ? '[DONE]' : JSON.parse(data);
    });
}

function createSupabaseWithRegistry(row) {
  return {
    from(table) {
      if (table !== 'product_registry') {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          return { data: row, error: null };
        },
        insert() {
          throw new Error('insert should not run for existing registered fixture');
        },
      };
    },
  };
}

describe('run-construction handler SSE terminal framing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.FLOWAI_RUN_CONSTRUCTION_SSE_SOFT_TIMEOUT_MS;
    delete process.env.FLOWAI_RUN_CONSTRUCTION_BACKGROUND_TIMEOUT_MS;
    mocks.assertPublicHttpUrl.mockResolvedValue({ ok: true });
    mocks.readProductSsotRunContext.mockResolvedValue({ ok: false, reason: 'no_row', context: null });
    mocks.persistSymbioticRunSummary.mockResolvedValue({
      ok: true,
      persisted: true,
      state: 'written',
      version: 1,
      reason: null,
    });
    mocks.isInngestEnabled.mockReturnValue(false);
    mocks.syncInngestRegistration.mockResolvedValue({ ok: true, status: 200 });
    mocks.sendEvent.mockResolvedValue({ ok: true, ids: ['evt_test'] });
    mocks.requireAuthHard.mockResolvedValue({ authenticated: true, orgId: 'org_test', userId: 'user_test' });
    resetForgeRunStatusForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  it('returns async_not_configured for BACKGROUND mode when Inngest is unavailable', async () => {
    mocks.isInngestEnabled.mockReturnValue(false);

    const res = createResponse();
    await handler(createRequest({ url: 'https://example.com', mode: 'BACKGROUND' }), res);

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.chunks.join(''));
    expect(body).toMatchObject({
      ok: false,
      error: 'async_not_configured',
      inngestReady: false,
    });
    expect(mocks.syncInngestRegistration).not.toHaveBeenCalled();
    expect(mocks.runOrchestration).not.toHaveBeenCalled();
  });

  it('syncs Inngest before queueing BACKGROUND mode and creates a status record', async () => {
    mocks.isInngestEnabled.mockReturnValue(true);
    mocks.syncInngestRegistration.mockResolvedValue({ ok: true, status: 200 });
    mocks.sendEvent.mockResolvedValue({ ok: true, ids: ['evt_queued'] });

    const res = createResponse();
    await handler(createRequest({
      url: 'https://example.com',
      mode: 'BACKGROUND',
      description: 'Async product run',
      runId: '11111111-1111-4111-8111-111111111111',
    }), res);

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.chunks.join(''));
    expect(body).toMatchObject({
      ok: true,
      async: true,
      runId: '11111111-1111-4111-8111-111111111111',
      status: 'queued',
      inngestReady: true,
      eventIds: ['evt_queued'],
    });
    expect(body.statusUrl).toContain('/api/run-construction-status?runId=');
    expect(mocks.syncInngestRegistration).toHaveBeenCalledTimes(1);
    expect(mocks.syncInngestRegistration.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.sendEvent.mock.invocationCallOrder[0]);
    expect(mocks.sendEvent).toHaveBeenCalledWith('flowai/forge.run.requested', expect.objectContaining({
      runId: '11111111-1111-4111-8111-111111111111',
      body: expect.objectContaining({
        url: 'https://example.com',
        description: 'Async product run',
        mode: 'FOREGROUND',
      }),
    }));
    const { record } = await readForgeRunStatus('11111111-1111-4111-8111-111111111111');
    expect(record).toMatchObject({
      runId: '11111111-1111-4111-8111-111111111111',
      status: 'queued',
      url: 'https://example.com',
      mode: 'BACKGROUND',
    });
  });

  it('continues BACKGROUND queueing when best-effort Inngest registration sync fails', async () => {
    mocks.isInngestEnabled.mockReturnValue(true);
    mocks.syncInngestRegistration.mockResolvedValue({
      ok: false,
      reason: 'inngest sync returned HTTP 500',
      status: 500,
      method: 'inngest_api',
    });
    mocks.sendEvent.mockResolvedValue({ ok: true, ids: ['evt_after_sync_failure'] });

    const res = createResponse();
    await handler(createRequest({
      url: 'https://example.com',
      mode: 'BACKGROUND',
      runId: '33333333-3333-4333-8333-333333333333',
    }), res);

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.chunks.join(''));
    expect(body).toMatchObject({
      ok: true,
      status: 'queued',
      runId: '33333333-3333-4333-8333-333333333333',
      inngestReady: true,
      eventIds: ['evt_after_sync_failure'],
    });
    expect(mocks.syncInngestRegistration).toHaveBeenCalledTimes(1);
    expect(mocks.sendEvent).toHaveBeenCalledWith('flowai/forge.run.requested', expect.objectContaining({
      runId: '33333333-3333-4333-8333-333333333333',
    }));
    const { record } = await readForgeRunStatus('33333333-3333-4333-8333-333333333333');
    expect(record).toMatchObject({
      runId: '33333333-3333-4333-8333-333333333333',
      status: 'queued',
      mode: 'BACKGROUND',
    });
  });

  it('background worker writes streamed events and final state to the status bus', async () => {
    mocks.runOrchestration.mockImplementation(async ({ onStep }) => {
      onStep({ step: 1, status: 'complete', tool: 'Research', result: { kind: 'research' } });
      return {
        ok: true,
        originalUrl: 'https://example.com',
        finalScore: 77,
        gtmReady: false,
        exitReason: 'ASYNC_COMPLETE',
        iterationsCompleted: 1,
      };
    });

    const result = await runConstructionToStatus({
      runId: '22222222-2222-4222-8222-222222222222',
      body: { url: 'https://example.com', mode: 'FOREGROUND' },
    });

    expect(result).toEqual({ ok: true, runId: '22222222-2222-4222-8222-222222222222' });
    const { record } = await readForgeRunStatus('22222222-2222-4222-8222-222222222222');
    expect(record.status).toBe('completed');
    expect(record.final).toMatchObject({
      type: 'final',
      final: true,
      ok: true,
      finalScore: 77,
      exitReason: 'ASYNC_COMPLETE',
    });
    expect(record.events.some((entry) => entry.payload?.type === 'step')).toBe(true);
  });

  it('background worker timeout writes a terminal failed status instead of staying running', async () => {
    vi.useFakeTimers();
    process.env.FLOWAI_RUN_CONSTRUCTION_BACKGROUND_TIMEOUT_MS = '5';
    mocks.runOrchestration.mockImplementation(({ onStep }) => {
      onStep({ step: 1, status: 'complete', tool: 'Research', result: { kind: 'research' } });
      return new Promise(() => {});
    });

    const pending = runConstructionToStatus({
      runId: '55555555-5555-4555-8555-555555555555',
      body: { url: 'https://example.com', mode: 'FOREGROUND' },
    });
    await vi.advanceTimersByTimeAsync(1_000);
    const result = await pending;

    expect(result).toEqual({ ok: true, runId: '55555555-5555-4555-8555-555555555555' });
    const { record } = await readForgeRunStatus('55555555-5555-4555-8555-555555555555');
    expect(record.status).toBe('failed');
    expect(record.final).toMatchObject({
      type: 'final',
      final: true,
      ok: false,
      partial: true,
      timedOut: true,
      exitReason: 'SSE_SOFT_TIMEOUT',
      timeoutMs: 1_000,
    });
  });

  it('background worker converts error-only streams into failed final status', async () => {
    mocks.runOrchestration.mockImplementation(async () => {
      throw Object.assign(new Error('missing githubRepoUrl'), {
        code: 'BAD_REPO_URL',
        failedStep: 'STEP_7',
      });
    });

    const result = await runConstructionToStatus({
      runId: '66666666-6666-4666-8666-666666666666',
      body: { url: 'https://safe-path.base44.app', mode: 'FOREGROUND' },
    });

    expect(result).toMatchObject({
      ok: false,
      runId: '66666666-6666-4666-8666-666666666666',
      error: 'missing githubRepoUrl',
    });
    const { record } = await readForgeRunStatus('66666666-6666-4666-8666-666666666666');
    expect(record.status).toBe('failed');
    expect(record.final).toMatchObject({
      type: 'final',
      final: true,
      ok: false,
      exitReason: 'STEP_FAILED',
      failedStep: 'STEP_7',
      code: 'BAD_REPO_URL',
    });
  });

  it('checkpoints each user-facing forge step while persisting background status', async () => {
    const checkpointStep = vi.fn(async (_name, fn) => fn());
    mocks.runOrchestration.mockImplementation(async ({ onStep }) => {
      onStep({ step: 1, status: 'complete', tool: 'Product Discovery', result: { kind: 'product_discovery' } });
      onStep({ step: 4, status: 'complete', tool: 'Adversarial Surface Testing', result: { kind: 'adversarial_surface' } });
      onStep({ step: 5.1, status: 'complete', tool: 'Five-Layer Scoring handoff', result: { kind: 'forge_step_handoff.v1' } });
      onStep({ step: 6, status: 'complete', tool: 'Issue Prioritization', result: { kind: 'issue_prioritization' } });
      onStep({
        step: 10.5,
        status: 'degraded',
        tool: 'Forge User Step 5 - Deploy',
        result: { kind: 'forge.user_step.v1', userStep: 5, key: 'deploy' },
      });
      onStep({
        step: 11.6,
        status: 'scaffold',
        tool: 'Forge User Step 6 - Self-Renewal',
        result: { kind: 'forge.user_step.v1', userStep: 6, key: 'self_renewal' },
      });
      onStep({
        step: 12.7,
        status: 'degraded',
        tool: 'Forge User Step 7 - GTM',
        result: { kind: 'forge.user_step.v1', userStep: 7, key: 'gtm' },
      });
      onStep({
        step: 14.8,
        status: 'degraded',
        tool: 'Forge User Step 8 - Monitor',
        result: { kind: 'forge.user_step.v1', userStep: 8, key: 'monitor' },
      });
      return {
        ok: true,
        originalUrl: 'https://example.com',
        finalScore: 81,
        gtmReady: false,
        exitReason: 'ASYNC_COMPLETE',
        iterationsCompleted: 1,
      };
    });

    const result = await runConstructionToStatus({
      runId: '44444444-4444-4444-8444-444444444444',
      body: { url: 'https://example.com', mode: 'FOREGROUND' },
      checkpointStep,
    });

    expect(result).toEqual({ ok: true, runId: '44444444-4444-4444-8444-444444444444' });
    expect(checkpointStep.mock.calls.map(([name]) => name)).toEqual([
      'forge-user-step-1-research-analysis',
      'forge-user-step-2-quality-adversarial-surface',
      'forge-user-step-3-design-scoring-handoff',
      'forge-user-step-4-build-planning-prioritization',
      'forge-user-step-5-deploy',
      'forge-user-step-6-self-renewal',
      'forge-user-step-7-gtm',
      'forge-user-step-8-monitor',
    ]);
    const { record } = await readForgeRunStatus('44444444-4444-4444-8444-444444444444');
    expect(record.status).toBe('completed');
    expect(record.final).toMatchObject({ type: 'final', final: true, exitReason: 'ASYNC_COMPLETE' });
  });

  it('emits final then DONE when orchestration resolves for a generic URL', async () => {
    mocks.runOrchestration.mockImplementation(async ({ onStep, onIteration }) => {
      onStep({ step: 1, status: 'complete', tool: 'Research', result: { kind: 'research' } });
      onIteration({ number: 1, delta: 0 });
      return {
        ok: true,
        previewUrl: 'https://example.com/preview',
        originalUrl: 'https://example.com',
        finalScore: 72,
        gtmReady: false,
        exitReason: 'MAX_ITERATIONS',
        iterationsCompleted: 1,
      };
    });

    const res = createResponse();
    await handler(createRequest({ url: 'https://example.com', mode: 'FOREGROUND' }), res);

    const events = parseSse(res.chunks);
    expect(events.at(-2)).toMatchObject({
      type: 'final',
      final: true,
      ok: true,
      originalProductUrl: 'https://example.com',
      finalScore: 72,
      exitReason: 'MAX_ITERATIONS',
    });
    expect(events.at(-1)).toBe('[DONE]');
    expect(res.ended).toBe(true);
  });

  it('routes description-only Fresh Build through the handler without requiring a URL', async () => {
    mocks.runFreshBuild.mockImplementation(async (_input, { onStep }) => {
      await onStep({
        mode: 'FRESH_BUILD',
        stage: 'description_build_brief',
        status: 'completed',
      });
      return {
        ok: true,
        status: 'READY',
        reason: null,
        previewUrl: 'https://description-build.vercel.app',
        previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
        scoreStatus: 'SCORE_NOT_CONFIGURED',
        baselineScore: null,
        finalScore: null,
        scoreDelta: null,
        writeResult: {
          deploymentId: 'dep_description',
          previewUrl: 'https://description-build.vercel.app',
        },
        evidence: {
          generatedFileCount: 2,
          previewUrl: 'https://description-build.vercel.app',
        },
      };
    });

    const res = createResponse();
    await handler(createRequest({
      mode: 'FRESH_BUILD',
      description: 'Build a scheduling workspace for local service providers',
      productName: 'Provider Scheduler',
      runId: '77777777-7777-4777-8777-777777777777',
    }), res);

    const events = parseSse(res.chunks);
    expect(res.statusCode).toBe(200);
    expect(mocks.assertPublicHttpUrl).not.toHaveBeenCalled();
    expect(mocks.runFreshBuild).toHaveBeenCalledWith(expect.objectContaining({
      url: '',
      description: 'Build a scheduling workspace for local service providers',
      runId: '77777777-7777-4777-8777-777777777777',
      productName: 'Provider Scheduler',
      productConfig: null,
    }), expect.objectContaining({
      runId: '77777777-7777-4777-8777-777777777777',
      onStep: expect.any(Function),
    }));
    expect(events.find((event) => event.type === 'start')).toMatchObject({
      runId: '77777777-7777-4777-8777-777777777777',
      url: '',
      mode: 'FRESH_BUILD',
    });
    expect(events.find((event) => event.type === 'registry')).toMatchObject({
      action: 'skipped',
      reason: 'description_only_fresh_build',
    });
    expect(events.find((event) => event.type === 'symbiotic_context')).toMatchObject({
      productId: null,
      ok: false,
      reason: 'supabase_unavailable',
    });
    expect(events.find((event) => event.type === 'step')).toMatchObject({
      log: {
        mode: 'FRESH_BUILD',
        stage: 'description_build_brief',
        status: 'completed',
      },
    });
    expect(events.at(-2)).toMatchObject({
      type: 'final',
      final: true,
      ok: true,
      status: 'succeeded',
      previewUrl: 'https://description-build.vercel.app',
      previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
      scoreStatus: 'SCORE_NOT_CONFIGURED',
      baselineScore: null,
      finalScore: null,
      scoreDelta: null,
      runMode: 'FRESH_BUILD',
      freshBuild: {
        status: 'READY',
        previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
        scoreStatus: 'SCORE_NOT_CONFIGURED',
      },
    });
    expect(events.at(-1)).toBe('[DONE]');
    expect(res.ended).toBe(true);
  });

  it('passes an env-configured Fresh Build delivery repo into the SSOT Creator path', async () => {
    process.env.FLOWAI_FRESH_BUILD_DELIVERY_REPO = 'https://github.com/veu-ai-studio/flowai-creator-delivery-sandbox';
    process.env.FLOWAI_FRESH_BUILD_DELIVERY_BASE_BRANCH = 'main';
    process.env.FLOWAI_FRESH_BUILD_DELIVERY_VERCEL_PROJECT_ID = 'prj_creator_delivery';
    process.env.FLOWAI_FRESH_BUILD_DELIVERY_VERCEL_ORG_ID = 'team_flowai';

    mocks.runFreshBuild.mockImplementation(async (_input, { onStep }) => {
      await onStep({
        mode: 'FRESH_BUILD',
        stage: 'description_build_brief',
        status: 'completed',
      });
      return {
        ok: true,
        status: 'READY',
        reason: null,
        previewUrl: 'https://creator-delivery.vercel.app',
        previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
        scoreStatus: 'SCORE_NOT_CONFIGURED',
        baselineScore: null,
        finalScore: null,
        scoreDelta: null,
        platformDependencies: [],
        writeResult: {
          deploymentId: 'dep_creator_delivery',
          previewUrl: 'https://creator-delivery.vercel.app',
        },
        evidence: {
          generatedFileCount: 4,
          previewUrl: 'https://creator-delivery.vercel.app',
        },
      };
    });

    const res = createResponse();
    await handler(createRequest({
      mode: 'FRESH_BUILD',
      description: 'Build a community resource navigator that saves requests',
      productName: 'Community Resource Navigator',
      runId: '88888888-8888-4888-8888-888888888888',
    }), res);

    expect(res.statusCode).toBe(200);
    expect(mocks.runFreshBuild).toHaveBeenCalledWith(expect.objectContaining({
      url: '',
      description: 'Build a community resource navigator that saves requests',
      runId: '88888888-8888-4888-8888-888888888888',
      productName: 'Community Resource Navigator',
      productConfig: expect.objectContaining({
        name: 'Community Resource Navigator',
        product_id: 'flowai-creator-delivery-sandbox',
        upgrade_repo: 'https://github.com/veu-ai-studio/flowai-creator-delivery-sandbox',
        github_repo_url: 'https://github.com/veu-ai-studio/flowai-creator-delivery-sandbox',
        upgrade_base_branch: 'main',
        vercel_project_id: 'prj_creator_delivery',
        vercel_org_id: 'team_flowai',
        inputMode: 'fresh_build',
      }),
    }), expect.objectContaining({
      runId: '88888888-8888-4888-8888-888888888888',
      onStep: expect.any(Function),
    }));
  });

  it('emits error then DONE when orchestration throws', async () => {
    mocks.runOrchestration.mockRejectedValue(Object.assign(new Error('orchestration failed'), {
      code: 'TEST_ORCHESTRATION_FAILED',
    }));

    const res = createResponse();
    await handler(createRequest({ url: 'https://example.com' }), res);

    const events = parseSse(res.chunks);
    expect(events.at(-2)).toMatchObject({
      type: 'error',
      error: 'orchestration failed',
      code: 'TEST_ORCHESTRATION_FAILED',
    });
    expect(events.at(-1)).toBe('[DONE]');
  });

  it('emits partial final then DONE when orchestration exceeds the soft timeout', async () => {
    vi.useFakeTimers();
    process.env.FLOWAI_RUN_CONSTRUCTION_SSE_SOFT_TIMEOUT_MS = '5';
    mocks.runOrchestration.mockImplementation(({ deps, onStep }) => {
      deps.__exposeState({ stop: mocks.stop });
      onStep({ step: 1, status: 'complete', tool: 'Research', result: { kind: 'research' } });
      return new Promise(() => {});
    });

    const res = createResponse();
    const pending = handler(createRequest({ url: 'https://example.com' }), res);
    await vi.advanceTimersByTimeAsync(1_000);
    await pending;

    const events = parseSse(res.chunks);
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(events.at(-2)).toMatchObject({
      type: 'final',
      final: true,
      ok: false,
      complete: false,
      partial: true,
      timedOut: true,
      exitReason: 'SSE_SOFT_TIMEOUT',
      timeoutMs: 1_000,
      symbioticLoop: {
        persisted: null,
        state: 'in_progress_timeout',
      },
    });
    expect(events.at(-2).previewUrl).toBeNull();
    expect(events.at(-2).gtmReady).toBe(false);
    expect(events.at(-1)).toBe('[DONE]');
  });

  it('keeps registered-product fixture context and still terminally frames', async () => {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    const registryRow = {
      product_id: 'ct-registered-example',
      product_url: 'https://example.com',
      environment: 'prd',
    };
    mocks.createClient.mockReturnValue(createSupabaseWithRegistry(registryRow));
    mocks.readProductSsotRunContext.mockResolvedValue({
      ok: true,
      reason: null,
      context: {
        hasPriorRun: true,
        priorRunCount: 1,
        sourceVersion: 2,
        sourceHash: 'hash-2',
        latestDeliveryArtifactUrl: 'https://example.com/app',
      },
    });
    mocks.runOrchestration.mockImplementation(async ({ deps }) => {
      const discovered = await deps.discoverProduct();
      return {
        ok: true,
        originalUrl: discovered.product_url,
        finalScore: 80,
        gtmReady: false,
        exitReason: 'REGISTERED_FIXTURE_COMPLETE',
        iterationsCompleted: 1,
      };
    });

    const res = createResponse();
    await handler(createRequest({ url: 'https://example.com' }), res);

    const events = parseSse(res.chunks);
    expect(events.find((event) => event.type === 'registry')).toMatchObject({
      action: 'reused',
      productId: 'ct-registered-example',
    });
    expect(events.find((event) => event.type === 'symbiotic_context')).toMatchObject({
      productId: 'ct-registered-example',
      ok: true,
    });
    expect(events.at(-3)).toMatchObject({
      type: 'symbiotic_write',
      productId: 'ct-registered-example',
      ok: true,
      persisted: true,
      state: 'written',
      idempotent: false,
      version: 1,
    });
    expect(events.at(-2)).toMatchObject({
      type: 'final',
      final: true,
      ok: true,
      originalProductUrl: 'https://example.com',
      exitReason: 'REGISTERED_FIXTURE_COMPLETE',
      productSsotContext: {
        hasPriorRun: true,
        priorRunCount: 1,
      },
    });
    expect(events.at(-1)).toBe('[DONE]');
    expect(mocks.persistSymbioticRunSummary).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'ct-registered-example',
      environment: 'staging',
      runId: expect.any(String),
      url: 'https://example.com',
      priorContext: expect.objectContaining({
        hasPriorRun: true,
        sourceVersion: 2,
      }),
      proofLabel: 'LIVE_PREVIEW',
    }));
  });

  it('stops exposed orchestration state on client disconnect without terminal frame', async () => {
    let resolveRun;
    mocks.runOrchestration.mockImplementation(({ deps }) => {
      deps.__exposeState({ stop: mocks.stop });
      return new Promise((resolve) => {
        resolveRun = resolve;
      });
    });

    const res = createResponse();
    const pending = handler(createRequest({ url: 'https://example.com' }), res);
    await vi.waitFor(() => expect(resolveRun).toBeTypeOf('function'));
    res.emitClose();

    expect(mocks.stop).toHaveBeenCalledTimes(1);
    resolveRun({
      ok: false,
      finalScore: 0,
      gtmReady: false,
      exitReason: 'USER_STOPPED',
      iterationsCompleted: 0,
    });
    await pending;
  });
});
