import { describe, expect, it } from 'vitest';
import { __test } from '../../src/api/run-construction.js';

describe('run-construction SSE terminal framing', () => {
  it('defaults to a soft timeout with platform hard-timeout buffer', () => {
    expect(__test.VERCEL_RUN_CONSTRUCTION_HARD_TIMEOUT_MS).toBe(800_000);
    expect(__test.VERCEL_RUN_CONSTRUCTION_STREAM_LIMIT_MS).toBe(450_000);
    expect(__test.RUN_CONSTRUCTION_TIMEOUT_BUFFER_MS).toBe(30_000);
    expect(__test.DEFAULT_RUN_CONSTRUCTION_SSE_SOFT_TIMEOUT_MS).toBe(420_000);
    expect(__test.configuredRunConstructionSoftTimeoutMs({})).toBe(420_000);
    expect(__test.configuredRunConstructionSoftTimeoutMs({
      FLOWAI_RUN_CONSTRUCTION_SSE_SOFT_TIMEOUT_MS: '900000',
    })).toBe(420_000);
  });

  it('builds an honest partial final payload for SSE soft timeout', () => {
    const payload = __test.buildRunConstructionSoftTimeoutFinal({
      runId: 'run-timeout-1',
      url: 'https://example.com',
      mode: 'FOREGROUND',
      orchestratorMode: 'auto',
      gtmTarget: 95,
      timeoutMs: 270_000,
      registryRow: { product_id: 'registered-product-fixture' },
      productSsotContext: {
        hasPriorRun: true,
        priorRunCount: 2,
        sourceVersion: 3,
        sourceHash: 'abc123',
        latestDeliveryArtifactUrl: 'https://example.com/app',
      },
      iterations: [{ number: 1 }],
      stepLogs: [
        { step: 1, status: 'complete', tool: 'Research', result: { kind: 'research' } },
        { step: 2, status: 'running', tool: 'Design', result: { kind: 'design' } },
      ],
    });

    expect(payload).toMatchObject({
      type: 'final',
      final: true,
      ok: false,
      complete: false,
      partial: true,
      timedOut: true,
      timeoutMs: 270_000,
      exitReason: 'SSE_SOFT_TIMEOUT',
      code: 'SSE_SOFT_TIMEOUT',
      previewUrl: null,
      originalProductUrl: 'https://example.com',
      finalScore: null,
      governanceRecordId: 'run-timeout-1',
      productId: 'registered-product-fixture',
      gtmReady: false,
      iterationsCompleted: 1,
      stepsCompleted: 1,
      runId: 'run-timeout-1',
    });
    expect(payload.symbioticLoop).toEqual({
      persisted: null,
      state: 'in_progress_timeout',
      version: null,
      reason: 'sse_soft_timeout_before_summary_write',
    });
    expect(payload.lastStep).toMatchObject({
      step: 2,
      status: 'running',
      tool: 'Design',
      kind: 'design',
    });
  });

  it('does not fabricate downstream deployment, GTM, monitor, or renewal success on timeout', () => {
    const payload = __test.buildRunConstructionSoftTimeoutFinal({
      runId: 'run-timeout-2',
      url: 'https://example.com',
      timeoutMs: 270_000,
      stepLogs: [{ step: 1, status: 'complete' }],
    });

    expect(payload.ok).toBe(false);
    expect(payload.complete).toBe(false);
    expect(payload.previewUrl).toBeNull();
    expect(payload.prUrl).toBeNull();
    expect(payload.gtmReady).toBe(false);
    expect(payload.fixProposals).toEqual([]);
    expect(payload.transformationDelta).toBeNull();
    expect(payload.migration).toBeNull();
    expect(payload.skippedSteps[0]).toMatchObject({
      step: 'remaining_orchestration',
      reason: 'sse_soft_timeout',
    });
  });

  it('emits timeout as terminal final then DONE in order', () => {
    const events = [];
    const payload = __test.buildRunConstructionSoftTimeoutFinal({
      runId: 'run-timeout-3',
      url: 'https://example.com',
      timeoutMs: 270_000,
    });

    const returned = __test.emitRunConstructionSoftTimeoutFinal({
      payload,
      send: (event) => events.push(event),
      done: () => events.push('[DONE]'),
    });

    expect(returned).toBe(payload);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: 'final',
      final: true,
      ok: false,
      complete: false,
      partial: true,
      exitReason: 'SSE_SOFT_TIMEOUT',
    });
    expect(events[1]).toBe('[DONE]');
  });
});
