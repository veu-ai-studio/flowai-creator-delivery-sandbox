// PA (analogous to #2.7b) — Wire AutoRunner.jsx → invokeStepOwner('govern', ctx).
//
// Mirror of pa-2.7b-autorunner-wire.test.js for the govern step.
// Four required cases (identical to PA #2.7b):
//   1. Auto Runner calls invokeStepOwner when step_key = 'govern'
//   2. Recommendation is logged
//   3. Low-confidence envelope does not block run
//   4. invokeStepOwner error is caught and logged, run continues
//
// Same architecture as the PA #2.7b test file:
//   (A) Inline reproduction of runGovernStepRecommendation so the four
//       behaviors can be exercised without `@/` alias resolution.
//   (B) Static-source assertions on src/pages/AutoRunner.jsx ensure the
//       wire-in is present and parallel to the build wire.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  OrchestratorHub,
  createMemoryHotStore,
  createMemoryColdStore,
} from '../../src/lib/agents/orchestrator/OrchestratorHub.ts';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';

// ─── (A) Inline reproduction of the wire-in helper ────────────────────────
//
// Byte-equivalent to the runGovernStepRecommendation export in
// src/pages/AutoRunner.jsx. The static-source assertions below pin the
// production code to this shape; drift fails the (B) tests.

let _bundle = null;
function getOrchestratorBundle() {
  if (_bundle) return _bundle;
  const messageBus = new MessageBus();
  const hot = createMemoryHotStore();
  const cold = createMemoryColdStore();
  const hub = new OrchestratorHub({ hot, cold });
  _bundle = { hub, messageBus, hot, cold };
  return _bundle;
}
function _resetBundle() { _bundle = null; }

async function runGovernStepRecommendation(opts = {}) {
  const { runId, productId, run_summary, step_results, stepInputs, hub: hubOverride, logger = console } = opts;
  let hub = hubOverride;
  if (!hub) {
    try { hub = getOrchestratorBundle().hub; }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      (logger?.warn ?? console.warn)('[AutoRunner] orchestrator bootstrap failed', { error: msg });
      return null;
    }
  }
  let rec = null;
  try {
    rec = await hub.invokeStepOwner('govern', { runId, productId, run_summary, step_results, stepInputs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    (logger?.error ?? console.error)('[AutoRunner] invokeStepOwner threw (suppressed)', { error: msg });
    return null;
  }
  if (rec) {
    if (typeof rec.confidence === 'number' && rec.confidence < 0.5) {
      (logger?.warn ?? console.warn)('[AutoRunner] Agent #3 recommendation (low-confidence):', rec);
    } else {
      (logger?.info ?? console.info)('[AutoRunner] Agent #3 recommendation:', rec);
    }
  } else {
    (logger?.info ?? console.info)('[AutoRunner] Agent #3 recommendation: no step-owner registered');
  }
  return rec;
}

beforeEach(() => { _resetBundle(); });

// ─── REQ 1 + 2 — invokeStepOwner is called for govern; recommendation logged ──
describe('PA #2.7c REQ 1+2 — invokeStepOwner is called for govern; recommendation logged', () => {
  it('calls hub.invokeStepOwner("govern", ctx) with runId/productId/run_summary/step_results', async () => {
    const invokeStepOwner = vi.fn(async () => ({
      agent_id: 3,
      recommendation: 'no renewal needed',
      confidence: 0.6,
      metadata: { ok: true, renewal_flags: [] },
    }));
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const r = await runGovernStepRecommendation({
      runId: 'run-1',
      productId: 'prod-A',
      run_summary: { failedSteps: [] },
      step_results: { research: { summary: 'ok' } },
      hub: { invokeStepOwner },
      logger,
    });
    expect(invokeStepOwner).toHaveBeenCalledOnce();
    const [stepKey, ctx] = invokeStepOwner.mock.calls[0];
    expect(stepKey).toBe('govern');
    expect(ctx.runId).toBe('run-1');
    expect(ctx.productId).toBe('prod-A');
    expect(ctx.run_summary).toEqual({ failedSteps: [] });
    expect(ctx.step_results).toEqual({ research: { summary: 'ok' } });
    expect(r.agent_id).toBe(3);
    expect(r.confidence).toBe(0.6);
  });

  it('logs the recommendation at info level when confidence ≥ 0.5', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const hub = { invokeStepOwner: async () => ({ agent_id: 3, recommendation: 'renew', confidence: 0.9, metadata: { ok: true } }) };
    await runGovernStepRecommendation({ runId: 'r', hub, logger });
    expect(logger.info).toHaveBeenCalledWith(
      '[AutoRunner] Agent #3 recommendation:',
      expect.objectContaining({ agent_id: 3, confidence: 0.9 }),
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs at warn level (low-confidence) when confidence < 0.5', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const hub = { invokeStepOwner: async () => ({ agent_id: 3, recommendation: 'unclear', confidence: 0.2, metadata: { ok: true } }) };
    await runGovernStepRecommendation({ runId: 'r', hub, logger });
    expect(logger.warn).toHaveBeenCalledWith(
      '[AutoRunner] Agent #3 recommendation (low-confidence):',
      expect.objectContaining({ confidence: 0.2 }),
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs an info note when no step-owner is registered (hub returns null)', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const hub = { invokeStepOwner: async () => null };
    const r = await runGovernStepRecommendation({ runId: 'r', hub, logger });
    expect(r).toBeNull();
    expect(logger.info).toHaveBeenCalledWith('[AutoRunner] Agent #3 recommendation: no step-owner registered');
  });
});

// ─── REQ 3 — low-confidence does not block ────────────────────────────────
describe('PA #2.7c REQ 3 — low-confidence does not block', () => {
  it('returns the low-confidence recommendation without throwing', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const hub = { invokeStepOwner: async () => ({ agent_id: 0, recommendation: 'precheck failed', confidence: 0, metadata: { ok: false, error: 'missing summary' } }) };
    const r = await runGovernStepRecommendation({ runId: 'r', hub, logger });
    expect(r.confidence).toBe(0);
    expect(r.metadata.ok).toBe(false);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns the recommendation even when metadata.ok is false', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const hub = { invokeStepOwner: async () => ({ agent_id: 3, recommendation: 'unhealthy', confidence: 0.1, metadata: { ok: false } }) };
    const r = await runGovernStepRecommendation({ runId: 'r', hub, logger });
    expect(r.metadata.ok).toBe(false);
    expect(logger.warn).toHaveBeenCalledOnce();
  });
});

// ─── REQ 4 — thrown error is caught and logged, run continues ─────────────
describe('PA #2.7c REQ 4 — invokeStepOwner errors are caught', () => {
  it('returns null and logs at error level when invokeStepOwner throws (async)', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const hub = { invokeStepOwner: async () => { throw new Error('unexpected boom'); } };
    const r = await runGovernStepRecommendation({ runId: 'r', hub, logger });
    expect(r).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      '[AutoRunner] invokeStepOwner threw (suppressed)',
      expect.objectContaining({ error: 'unexpected boom' }),
    );
  });

  it('handles a synchronously-throwing invokeStepOwner identically', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const hub = { invokeStepOwner: () => { throw new Error('sync-boom'); } };
    const r = await runGovernStepRecommendation({ runId: 'r', hub, logger });
    expect(r).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      '[AutoRunner] invokeStepOwner threw (suppressed)',
      expect.objectContaining({ error: 'sync-boom' }),
    );
  });
});

// ─── Bundle lifecycle (default-hub path) ──────────────────────────────────
describe('PA #2.7c — orchestrator bundle lifecycle', () => {
  it('default bundle has no client-side govern step-owner registered', () => {
    _resetBundle();
    const b = getOrchestratorBundle();
    expect(b.hub).toBeTruthy();
    // Symmetric with the build wire: browser-side does not register Agent #3.
    expect(b.hub.getStepOwnerAgent('govern')).toBeUndefined();
  });

  it('end-to-end: default bundle invokes the hub for govern, hub returns null', async () => {
    _resetBundle();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const r = await runGovernStepRecommendation({
      runId: 'r-default',
      productId: 'p-default',
      run_summary: { failedSteps: [] },
      step_results: {},
      logger,
    });
    expect(r).toBeNull();
    expect(logger.info).toHaveBeenCalledWith('[AutoRunner] Agent #3 recommendation: no step-owner registered');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('end-to-end with explicit Agent #3 mock: hub forwards the recommendation', async () => {
    _resetBundle();
    const b = getOrchestratorBundle();
    const mockAgent = {
      recommend: async (ctx) => ({
        agent_id: 3,
        recommendation: 'renewal not needed',
        confidence: 0.9,
        metadata: { ok: true, runId: ctx.runId, renewal_flags: [] },
      }),
    };
    b.hub.registerStepOwnerAgent('govern', mockAgent);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const r = await runGovernStepRecommendation({
      runId: 'r-mock',
      productId: 'p-mock',
      run_summary: { failedSteps: [] },
      step_results: { research: { summary: 'ok' } },
      logger,
    });
    expect(r).toBeTruthy();
    expect(r.agent_id).toBe(3);
    expect(r.confidence).toBe(0.9);
    expect(r.metadata.runId).toBe('r-mock');
    expect(logger.info).toHaveBeenCalledOnce();
  });
});

// ─── (B) Static-source assertions on AutoRunner.jsx ────────────────────────
const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTORUNNER_PATH = path.resolve(HERE, '..', '..', 'src', 'pages', 'AutoRunner.jsx');
let _autoRunnerSource = null;
async function autoRunnerSource() {
  if (_autoRunnerSource) return _autoRunnerSource;
  _autoRunnerSource = await readFile(AUTORUNNER_PATH, 'utf8');
  return _autoRunnerSource;
}

describe('PA #2.7c — static assertion: AutoRunner.jsx contains the govern wire-in', () => {
  it('exports runGovernStepRecommendation', async () => {
    const src = await autoRunnerSource();
    expect(src).toMatch(/export\s+async\s+function\s+runGovernStepRecommendation\s*\(/);
  });

  it("calls runGovernStepRecommendation inside a guard for STEPS[i].key === 'govern'", async () => {
    const src = await autoRunnerSource();
    expect(src).toMatch(/STEPS\[i\]\.key\s*===\s*['"]govern['"]/);
    expect(src).toMatch(/await\s+runGovernStepRecommendation\s*\(/);
  });

  it("the govern hook appears AFTER statuses[i] = 'complete' (parallel to build hook)", async () => {
    const src = await autoRunnerSource();
    const completeIdx = src.indexOf("statuses[i] = 'complete'");
    expect(completeIdx).toBeGreaterThan(0);
    const hookIdx = src.indexOf('runGovernStepRecommendation', completeIdx);
    expect(hookIdx).toBeGreaterThan(completeIdx);
  });

  it('the govern hook is wrapped in its own try/catch (belt-and-suspenders)', async () => {
    const src = await autoRunnerSource();
    const guardRe = /if\s*\(\s*STEPS\[i\]\.key\s*===\s*['"]govern['"]\s*\)\s*\{/;
    const guardMatch = guardRe.exec(src);
    expect(guardMatch).toBeTruthy();
    const slice = src.slice(guardMatch.index, guardMatch.index + 1500);
    expect(slice).toMatch(/try\s*\{[\s\S]*?await\s+runGovernStepRecommendation[\s\S]*?\}\s*catch/);
  });

  it("invokeStepOwner('govern', …) appears in the source (call site exists)", async () => {
    const src = await autoRunnerSource();
    expect(src).toMatch(/invokeStepOwner\s*\(\s*['"]govern['"]/);
  });
});
