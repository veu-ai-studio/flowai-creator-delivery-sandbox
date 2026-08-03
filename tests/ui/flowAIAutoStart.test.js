import { describe, expect, it, vi } from 'vitest';
import { consumeFlowAIAutoStart } from '../../src/lib/flowaiAutoStart.js';

function fixture() {
  const payload = {
    launchNonce: 'launch-stable-123',
    inputs: [{ type: 'description', value: 'Build a release evidence workspace' }],
  };
  const values = new Map([['flowai_session_config', JSON.stringify(payload)]]);
  const storage = {
    getItem: vi.fn((key) => values.get(key) || null),
    removeItem: vi.fn((key) => values.delete(key)),
  };
  const location = {
    pathname: '/flowai',
    search: '?mode=auto&flowHubPath=fresh_build&autoStart=1&sessionConfig=1',
    hash: '',
  };
  const history = {
    state: { keep: true },
    replaceState: vi.fn((_state, _title, next) => {
      const parsed = new URL(next, 'https://flowai.example');
      location.pathname = parsed.pathname;
      location.search = parsed.search;
      location.hash = parsed.hash;
    }),
  };
  return { payload, storage, location, history };
}

describe('FlowAI one-shot auto-start claim', () => {
  it('returns one stable launch nonce and consumes trigger plus payload before dispatch', () => {
    const ctx = fixture();
    const first = consumeFlowAIAutoStart(ctx);
    const second = consumeFlowAIAutoStart(ctx);

    expect(first).toEqual({ config: ctx.payload, launchNonce: 'launch-stable-123' });
    expect(second).toBeNull();
    expect(ctx.storage.removeItem).toHaveBeenCalledOnce();
    expect(ctx.history.replaceState).toHaveBeenCalledOnce();
    expect(ctx.location.search).toBe('?mode=auto&flowHubPath=fresh_build');
  });

  it('fails closed without a durable nonce and leaves the payload untouched', () => {
    const ctx = fixture();
    ctx.storage.getItem = vi.fn(() => JSON.stringify({ inputs: ctx.payload.inputs }));
    expect(consumeFlowAIAutoStart(ctx)).toBeNull();
    expect(ctx.storage.removeItem).not.toHaveBeenCalled();
    expect(ctx.history.replaceState).not.toHaveBeenCalled();
  });
});
