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

  it('fails honestly when Inngest registration sync fails before BACKGROUND queueing', async () => {
    mocks.isInngestEnabled.mockReturnValue(true);
    mocks.syncInngestRegistration.mockResolvedValue({
      ok: false,
      reason: 'inngest sync returned HTTP 500',
    });

    const res = createResponse();
    await handler(createRequest({
      url: 'https://example.com',
      mode: 'BACKGROUND',
      runId: '33333333-3333-4333-8333-333333333333',
    }), res);

    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.chunks.join(''));
    expect(body).toMatchObject({
      ok: false,
      error: 'inngest_sync_failed',
      inngestReady: true,
    });
    expect(body.detail).toContain('HTTP 500');
    expect(mocks.sendEvent).not.toHaveBeenCalled();
    const { record } = await readForgeRunStatus('33333333-3333-4333-8333-333333333333');
    expect(record).toBeNull();
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
      ok: true,
      finalScore: 77,
      exitReason: 'ASYNC_COMPLETE',
    });
    expect(record.events.some((entry) => entry.payload?.type === 'step')).toBe(true);
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
      ok: true,
      originalProductUrl: 'https://example.com',
      finalScore: 72,
      exitReason: 'MAX_ITERATIONS',
    });
    expect(events.at(-1)).toBe('[DONE]');
    expect(res.ended).toBe(true);
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
    expect(events.at(-2)).toMatchObject({
      type: 'final',
      ok: true,
      originalProductUrl: 'https://example.com',
      exitReason: 'REGISTERED_FIXTURE_COMPLETE',
      productSsotContext: {
        hasPriorRun: true,
        priorRunCount: 1,
      },
    });
    expect(events.at(-1)).toBe('[DONE]');
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
    await new Promise((resolve) => setTimeout(resolve, 0));
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
