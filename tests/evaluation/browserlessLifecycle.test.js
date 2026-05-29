// tests/evaluation/browserlessLifecycle.test.js
//
// DISPATCH (Browserless production runtime) — verifies that the
// Playwright launch sites:
//   1. Use Browserless connectOverCDP when BROWSERLESS_API_KEY is set.
//   2. NEVER attempt chromium.launch() when running under Vercel.
//   3. Surface a degraded envelope (not a crash) when Browserless is
//      unavailable in production.
//   4. Never leak the API key in any emitted error message.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runEvaluationPipeline } from '../../src/lib/evaluation/evaluationPipeline.js';

const TEST_TOKEN = 'tok_test_browserless_super_secret_xyz_12345';

function withEnv(envOverrides, body) {
  const saved = {};
  for (const k of Object.keys(envOverrides)) {
    saved[k] = process.env[k];
    if (envOverrides[k] === undefined) delete process.env[k];
    else process.env[k] = envOverrides[k];
  }
  return Promise.resolve()
    .then(body)
    .finally(() => {
      for (const k of Object.keys(saved)) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    });
}

describe('Browserless lifecycle (DISPATCH production runtime)', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('production (VERCEL set) + no Browserless key → degraded, never throws, no chromium.launch', async () => {
    await withEnv({ VERCEL: '1', BROWSERLESS_API_KEY: undefined }, async () => {
      const launchSpy = vi.fn(() => { throw new Error('SHOULD_NEVER_LAUNCH'); });
      const fakeChromium = { launch: launchSpy };
      const out = await runEvaluationPipeline({
        url: 'https://example.com',
        options: {
          evaluators: ['axe'], // forces a need for a Playwright page
          deps: { playwright: { chromium: fakeChromium } },
          phaseBFindings: [],
        },
      });
      expect(out.ok).toBe(false);
      expect(launchSpy).not.toHaveBeenCalled();
      expect(out.errors?.playwright).toMatch(/browserless_unavailable_in_production/);
    });
  });

  it('dev (no VERCEL) + no Browserless key → falls back to local chromium.launch', async () => {
    await withEnv({ VERCEL: undefined, BROWSERLESS_API_KEY: undefined }, async () => {
      const launchSpy = vi.fn(async () => ({
        newContext: async () => ({
          newPage: async () => ({
            on: () => {}, off: () => {}, goto: async () => {},
            url: () => 'https://example.com',
            setDefaultNavigationTimeout: () => {},
            setDefaultTimeout: () => {},
          }),
          close: async () => {},
        }),
        close: async () => {},
      }));
      const fakeChromium = { launch: launchSpy };
      const out = await runEvaluationPipeline({
        url: 'https://example.com',
        options: {
          evaluators: ['runtime'],
          deps: { playwright: { chromium: fakeChromium } },
          phaseBFindings: [],
        },
      });
      // The launch should have been attempted at least once.
      expect(launchSpy).toHaveBeenCalled();
      expect(out).toBeDefined();
    });
  });

  it('production (VERCEL set) + Browserless failure → degraded, no chromium.launch fallback', async () => {
    // We rely on env var only — the adapter is dynamically imported.
    await withEnv({ VERCEL: '1', BROWSERLESS_API_KEY: TEST_TOKEN }, async () => {
      const launchSpy = vi.fn(() => { throw new Error('SHOULD_NEVER_LAUNCH_IN_PROD'); });
      // We rely on the adapter throwing because connectOverCDP can't reach
      // wss://production-sfo.browserless.io/chromium in this test sandbox.
      const out = await runEvaluationPipeline({
        url: 'https://example.com',
        options: {
          evaluators: ['axe'],
          deps: { playwright: { chromium: { launch: launchSpy } } },
          phaseBFindings: [],
          connectTimeoutMs: 100,
        },
      });
      expect(launchSpy).not.toHaveBeenCalled();
      expect(out.ok).toBe(false);
      const errorBlob = JSON.stringify(out.errors ?? {});
      expect(errorBlob).toMatch(/browserless_(connect_failed|unavailable)/);
    });
  });

  it('token redaction — no emitted error or finding payload contains the BROWSERLESS_API_KEY value', async () => {
    await withEnv({ VERCEL: '1', BROWSERLESS_API_KEY: TEST_TOKEN }, async () => {
      const stepEvents = [];
      const out = await runEvaluationPipeline({
        url: 'https://example.com',
        options: {
          evaluators: ['axe', 'runtime'],
          phaseBFindings: [],
          connectTimeoutMs: 100,
          onStep: (evt) => stepEvents.push(evt),
        },
      });
      // Errors + findings + every emitted step event must NOT include
      // the verbatim token. They MAY include the redaction placeholder.
      const blob = JSON.stringify({
        errors: out.errors,
        findings: out.findings,
        stats: out.stats,
        events: stepEvents,
      });
      expect(blob).not.toContain(TEST_TOKEN);
    });
  });
});
