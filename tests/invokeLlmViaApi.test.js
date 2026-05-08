import { describe, it, expect, afterEach, vi } from 'vitest';
import { invokeLlmViaApi } from '../src/lib/operationsEngine.js';

const realFetch = global.fetch;

function mockFetch(impl) {
  global.fetch = vi.fn(impl);
}

describe('invokeLlmViaApi — happy path', () => {
  afterEach(() => { global.fetch = realFetch; });

  it('returns the .text field on a 200 with non-empty text', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        text: 'STEP OUTPUT — sections, etc.',
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 50, output_tokens: 200 },
        stop_reason: 'end_turn',
        cost: 0.003,
      }),
    }));
    const out = await invokeLlmViaApi('do the thing');
    expect(out).toBe('STEP OUTPUT — sections, etc.');
  });

  it('passes prompt + complexity + maxTokens + sessionId + endpoint', async () => {
    let captured = null;
    mockFetch(async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 200, json: async () => ({ text: 'x' }) };
    });
    await invokeLlmViaApi('hi', {
      complexity: 'complex',
      maxTokens: 1500,
      sessionId: 'sess_123',
      endpoint: '/api/llm-step:design',
    });
    expect(captured.url).toBe('/api/llm-step');
    expect(captured.init.method).toBe('POST');
    const body = JSON.parse(captured.init.body);
    expect(body.prompt).toBe('hi');
    expect(body.complexity).toBe('complex');
    expect(body.maxTokens).toBe(1500);
    expect(body.sessionId).toBe('sess_123');
    expect(body.endpoint).toBe('/api/llm-step:design');
  });

  it('defaults complexity=routine, maxTokens=2000, endpoint=/api/llm-step', async () => {
    let body = null;
    mockFetch(async (url, init) => {
      body = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ text: 'x' }) };
    });
    await invokeLlmViaApi('hi');
    expect(body.complexity).toBe('routine');
    expect(body.maxTokens).toBe(2000);
    expect(body.endpoint).toBe('/api/llm-step');
    expect(body.sessionId).toBeUndefined();
  });
});

describe('invokeLlmViaApi — non-success returns null', () => {
  afterEach(() => { global.fetch = realFetch; });

  it('returns null for empty / non-string prompt', async () => {
    expect(await invokeLlmViaApi('')).toBeNull();
    expect(await invokeLlmViaApi('   ')).toBeNull();
    expect(await invokeLlmViaApi(null)).toBeNull();
    expect(await invokeLlmViaApi(undefined)).toBeNull();
    expect(await invokeLlmViaApi(123)).toBeNull();
  });

  it('returns null on HTTP non-ok (5xx)', async () => {
    mockFetch(async () => ({
      ok: false, status: 500,
      json: async () => ({ error: 'Claude call failed', details: 'timeout' }),
    }));
    expect(await invokeLlmViaApi('hi')).toBeNull();
  });

  it('returns null on HTTP 4xx', async () => {
    mockFetch(async () => ({
      ok: false, status: 400,
      json: async () => ({ error: 'bad input' }),
    }));
    expect(await invokeLlmViaApi('hi')).toBeNull();
  });

  it('returns null when text field is missing', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ model: 'x' }) }));
    expect(await invokeLlmViaApi('hi')).toBeNull();
  });

  it('returns null when text is empty string', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ text: '' }) }));
    expect(await invokeLlmViaApi('hi')).toBeNull();
  });

  it('returns null when text is non-string', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ text: null }) }));
    expect(await invokeLlmViaApi('hi')).toBeNull();
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ text: 123 }) }));
    expect(await invokeLlmViaApi('hi')).toBeNull();
  });

  it('returns null on JSON parse failure', async () => {
    mockFetch(async () => ({
      ok: true, status: 200,
      json: async () => { throw new Error('bad json'); },
    }));
    expect(await invokeLlmViaApi('hi')).toBeNull();
  });

  it('returns null on network rejection', async () => {
    mockFetch(async () => { throw new Error('network down'); });
    expect(await invokeLlmViaApi('hi')).toBeNull();
  });
});
