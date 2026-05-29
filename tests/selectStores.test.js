import { describe, it, expect, vi } from 'vitest';
import { selectStores, describeStoreSelection } from '../src/lib/agents/orchestrator/selectStores.ts';

// Fake adapter factories the test injects to verify selection logic without
// instantiating real Vercel KV / Supabase clients.
function makeFactories() {
  const memHotInstance = { _kind: 'memHot', get: async () => null, set: async () => {}, delete: async () => {} };
  const memColdInstance = { _kind: 'memCold', append: async () => {} };
  const kvHotInstance = { _kind: 'kvHot', get: async () => null, set: async () => {}, delete: async () => {} };
  const supabaseColdInstance = { _kind: 'supabaseCold', append: async () => {} };
  return {
    memoryHot: vi.fn(() => memHotInstance),
    memoryCold: vi.fn(() => memColdInstance),
    kvHot: vi.fn(() => kvHotInstance),
    supabaseCold: vi.fn(() => supabaseColdInstance),
    instances: { memHotInstance, memColdInstance, kvHotInstance, supabaseColdInstance },
  };
}

describe('selectStores — selection logic', () => {
  it('returns in-memory adapters when no relevant env vars are set', () => {
    const f = makeFactories();
    const sel = selectStores({ env: {}, factories: f });
    expect(sel.hotKind).toBe('memory');
    expect(sel.coldKind).toBe('memory');
    expect(sel.hot).toBe(f.instances.memHotInstance);
    expect(sel.cold).toBe(f.instances.memColdInstance);
    expect(f.memoryHot).toHaveBeenCalledTimes(1);
    expect(f.memoryCold).toHaveBeenCalledTimes(1);
    expect(f.kvHot).not.toHaveBeenCalled();
    expect(f.supabaseCold).not.toHaveBeenCalled();
  });

  it('returns Vercel KV HotStore when KV_REST_API_URL is set', () => {
    const f = makeFactories();
    const sel = selectStores({
      env: { KV_REST_API_URL: 'https://kv.example.com' },
      factories: f,
    });
    expect(sel.hotKind).toBe('kv');
    expect(sel.hot).toBe(f.instances.kvHotInstance);
    expect(sel.coldKind).toBe('memory');
    expect(f.kvHot).toHaveBeenCalledTimes(1);
    expect(f.memoryHot).not.toHaveBeenCalled();
  });

  it('returns Supabase ColdStore when SUPABASE_URL is set', () => {
    const f = makeFactories();
    const sel = selectStores({
      env: { SUPABASE_URL: 'https://x.supabase.co' },
      factories: f,
    });
    expect(sel.coldKind).toBe('supabase');
    expect(sel.cold).toBe(f.instances.supabaseColdInstance);
    expect(sel.hotKind).toBe('memory');
    expect(f.supabaseCold).toHaveBeenCalledTimes(1);
    expect(f.memoryCold).not.toHaveBeenCalled();
  });

  it('returns both production adapters when both env vars are set', () => {
    const f = makeFactories();
    const sel = selectStores({
      env: {
        KV_REST_API_URL: 'https://kv.example.com',
        SUPABASE_URL: 'https://x.supabase.co',
      },
      factories: f,
    });
    expect(sel.hotKind).toBe('kv');
    expect(sel.coldKind).toBe('supabase');
    expect(f.kvHot).toHaveBeenCalledTimes(1);
    expect(f.supabaseCold).toHaveBeenCalledTimes(1);
    expect(f.memoryHot).not.toHaveBeenCalled();
    expect(f.memoryCold).not.toHaveBeenCalled();
  });

  it('treats empty-string KV_REST_API_URL as unset (memory)', () => {
    const f = makeFactories();
    const sel = selectStores({
      env: { KV_REST_API_URL: '', SUPABASE_URL: 'x' },
      factories: f,
    });
    expect(sel.hotKind).toBe('memory');
    expect(sel.coldKind).toBe('supabase');
  });

  it('treats empty-string SUPABASE_URL as unset (memory)', () => {
    const f = makeFactories();
    const sel = selectStores({
      env: { SUPABASE_URL: '', KV_REST_API_URL: 'k' },
      factories: f,
    });
    expect(sel.coldKind).toBe('memory');
    expect(sel.hotKind).toBe('kv');
  });

  it('returns a frozen StoreSelection result', () => {
    const sel = selectStores({ env: {}, factories: makeFactories() });
    expect(Object.isFrozen(sel)).toBe(true);
  });

  it('hot and cold are independent — KV present + Supabase absent yields kv+memory', () => {
    const f = makeFactories();
    const sel = selectStores({
      env: { KV_REST_API_URL: 'k' },
      factories: f,
    });
    expect(sel.hotKind).toBe('kv');
    expect(sel.coldKind).toBe('memory');
  });
});

describe('describeStoreSelection — observability without instantiation', () => {
  it('returns kinds without invoking any factory', () => {
    const f = makeFactories();
    const desc = describeStoreSelection({
      env: { KV_REST_API_URL: 'k', SUPABASE_URL: 's' },
      factories: f,
    });
    expect(desc.hotKind).toBe('kv');
    expect(desc.coldKind).toBe('supabase');
    // None of the factories should have been called.
    expect(f.memoryHot).not.toHaveBeenCalled();
    expect(f.memoryCold).not.toHaveBeenCalled();
    expect(f.kvHot).not.toHaveBeenCalled();
    expect(f.supabaseCold).not.toHaveBeenCalled();
  });

  it('returns "memory" for both when env is empty', () => {
    const desc = describeStoreSelection({ env: {} });
    expect(desc).toEqual({ hotKind: 'memory', coldKind: 'memory' });
  });
});

describe('selectStores — env defaulting', () => {
  it('uses provided env exactly (does not bleed in process.env)', () => {
    // Even if process.env happens to define KV_REST_API_URL in the test
    // runner, an explicit empty env bag must still resolve to memory.
    const sel = selectStores({ env: {}, factories: makeFactories() });
    expect(sel.hotKind).toBe('memory');
    expect(sel.coldKind).toBe('memory');
  });
});
