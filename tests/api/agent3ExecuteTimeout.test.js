import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { __test } from '../../api/agent/3/execute.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const executeSrc = readFileSync(resolve(__dirname, '../../api/agent/3/execute.js'), 'utf8');
const vercelConfig = JSON.parse(readFileSync(resolve(__dirname, '../../vercel.json'), 'utf8'));

describe('Agent 3 execute timeout handling', () => {
  it('configures Vercel maxDuration at the platform maximum for execute', () => {
    expect(vercelConfig.functions['api/agent/3/execute.js'].maxDuration).toBe(300);
  });

  it('keeps the SSE soft timeout below the Vercel hard timeout with buffer', () => {
    expect(__test.SSE_SOFT_TIMEOUT_MS).toBe(240_000);
    expect(__test.SSE_SOFT_TIMEOUT_MS).toBeLessThan(250_000);
    expect(executeSrc).toContain("type: 'heartbeat'");
    expect(executeSrc).toContain("type: 'timeout'");
    expect(executeSrc).toContain('buildSseSoftTimeoutResult');
  });

  it('uses a bounded production fast lane for SSE analysis stages', () => {
    expect(__test.SSE_PHASE_B_OVERALL_BUDGET_MS).toBe(45_000);
    expect(__test.SSE_PHASE_B_PER_PAGE_BUDGET_MS).toBe(20_000);
    expect(__test.SSE_PHASE_B_MAX_INTERACTIVES).toBe(20);
    expect(__test.SSE_EVALUATION_TIER).toBe('TIER_1');
    expect(executeSrc).toContain('phaseBOverallBudgetMs: SSE_PHASE_B_OVERALL_BUDGET_MS');
    expect(executeSrc).toContain('evaluationTier: SSE_EVALUATION_TIER');
  });

  it('builds a partial final result from the latest streamed score', () => {
    const partial = __test.buildSseSoftTimeoutResult({
      runId: 'run-1',
      url: 'https://saigeplatform.com',
      mode: 'auto',
      maxIterations: 10,
      gtmTarget: 95,
      iterations: [{ iteration: 1 }],
      stepLogs: [
        { step: 5, result: { gtmScore: 48, layers: { l1: 10, l2: 8, l3: 8, l4: 12, l5: 10 } } },
      ],
    });

    expect(partial).toMatchObject({
      ok: false,
      partial: true,
      timedOut: true,
      exitReason: 'SOFT_TIMEOUT_PARTIAL_RESULTS',
      runId: 'run-1',
      originalScore: 48,
      finalScore: 48,
      effectiveTrustScore: 48,
      iterationsCompleted: 1,
      gtmReady: false,
    });
    expect(partial.latestLayers).toEqual({ l1: 10, l2: 8, l3: 8, l4: 12, l5: 10 });
    expect(partial.skippedSteps[0].reason).toBe('sse_soft_timeout');
  });
});
