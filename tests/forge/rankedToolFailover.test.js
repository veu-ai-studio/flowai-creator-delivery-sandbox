import { describe, expect, it } from 'vitest';

import { runRankedToolWithFailover } from '../../src/lib/forge/rankedToolFailover.js';

const env = {
  OPENAI_API_KEY: 'openai-test-key',
  ANTHROPIC_API_KEY: 'anthropic-test-key',
  BROWSERLESS_API_KEY: 'browserless-test-key',
};

describe('ranked tool failover contract', () => {
  it('fails over when the first candidate reports unavailable', async () => {
    const calls = [];
    const output = await runRankedToolWithFailover({
      action: 'code-patch',
      candidates: [
        { rank: 1, platform_name: 'Cursor' },
        { rank: 2, platform_name: 'Claude Code' },
      ],
      dispatchFn: async (action, payload, opts) => {
        calls.push({ action, payload, opts });
        return { ok: true, action, member: opts.memberId, data: { patchedContent: 'export default "ok";' } };
      },
      timeoutMs: 20,
      env,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].opts.memberId).toBe('claude-code');
    expect(output.memberId).toBe('claude-code');
    expect(output.attemptHistory.map(attempt => attempt.state)).toEqual([
      'selected',
      'unavailable',
      'selected',
      'succeeded',
    ]);
  });

  it('times out a hanging candidate and runs the next callable candidate', async () => {
    const calls = [];
    const startedAt = Date.now();
    const output = await runRankedToolWithFailover({
      action: 'code-patch',
      candidates: [
        { rank: 1, platform_name: 'Codex' },
        { rank: 2, platform_name: 'Claude Code' },
      ],
      dispatchFn: async (action, payload, opts) => {
        calls.push({ action, payload, opts });
        if (opts.memberId === 'codex') return new Promise(() => {});
        return { ok: true, action, member: opts.memberId, data: { patchedContent: 'export default "fallback";' } };
      },
      timeoutMs: 5,
      env,
    });

    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(calls.map(call => call.opts.memberId)).toEqual(['codex', 'claude-code']);
    expect(output.memberId).toBe('claude-code');
    expect(output.attemptHistory.map(attempt => attempt.state)).toEqual([
      'selected',
      'timeout',
      'selected',
      'succeeded',
    ]);
  });

  it('fails fast with attempt history when all candidates are exhausted', async () => {
    await expect(runRankedToolWithFailover({
      action: 'crawl',
      candidates: [
        { rank: 1, platform_name: 'Perplexity AI' },
        { rank: 2, platform_name: 'Tavily' },
      ],
      dispatchFn: async () => {
        throw new Error('should not dispatch unavailable candidates');
      },
      timeoutMs: 5,
      env: {},
    })).rejects.toMatchObject({
      name: 'RankedToolFailoverError',
      details: {
        attemptHistory: expect.arrayContaining([
          expect.objectContaining({ state: 'final_failed' }),
        ]),
      },
    });
  });
});
