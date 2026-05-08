import { describe, it, expect, vi } from 'vitest';
import { createVercelKvHotStore } from '../src/lib/agents/orchestrator/adapters/vercelKvHotStore.ts';
import { createSupabaseColdStore } from '../src/lib/agents/orchestrator/adapters/supabaseColdStore.ts';

// ─── Vercel KV HotStore adapter ───────────────────────────────────────────────
describe('vercelKvHotStore', () => {
  function makeKv() {
    const map = new Map();
    return {
      get: vi.fn(async (key) => (map.has(key) ? map.get(key) : null)),
      set: vi.fn(async (key, value) => { map.set(key, value); return 'OK'; }),
      del: vi.fn(async (...keys) => {
        let n = 0;
        for (const k of keys) if (map.delete(k)) n++;
        return n;
      }),
      _map: map,
    };
  }

  it('get returns the stored value', async () => {
    const kv = makeKv();
    const store = createVercelKvHotStore({ client: kv });
    await store.set('k', { result: 42 }, 60);
    expect(await store.get('k')).toEqual({ result: 42 });
    expect(kv.set).toHaveBeenCalledWith('k', { result: 42 }, { ex: 60 });
  });

  it('get returns null when key missing', async () => {
    const kv = makeKv();
    const store = createVercelKvHotStore({ client: kv });
    expect(await store.get('missing')).toBeNull();
  });

  it('get coerces undefined to null', async () => {
    const kv = {
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => 'OK'),
      del: vi.fn(async () => 0),
    };
    const store = createVercelKvHotStore({ client: kv });
    expect(await store.get('k')).toBeNull();
  });

  it('set passes ex (TTL in seconds) option', async () => {
    const kv = makeKv();
    const store = createVercelKvHotStore({ client: kv });
    await store.set('k', 'v', 3600);
    expect(kv.set).toHaveBeenCalledWith('k', 'v', { ex: 3600 });
  });

  it('set floors fractional ttlSec', async () => {
    const kv = makeKv();
    const store = createVercelKvHotStore({ client: kv });
    await store.set('k', 'v', 60.7);
    expect(kv.set).toHaveBeenCalledWith('k', 'v', { ex: 60 });
  });

  it('set rejects non-positive or non-finite ttlSec', async () => {
    const kv = makeKv();
    const store = createVercelKvHotStore({ client: kv });
    await expect(store.set('k', 'v', 0)).rejects.toThrow(/positive finite/);
    await expect(store.set('k', 'v', -1)).rejects.toThrow(/positive finite/);
    await expect(store.set('k', 'v', NaN)).rejects.toThrow(/positive finite/);
    await expect(store.set('k', 'v', Infinity)).rejects.toThrow(/positive finite/);
  });

  it('delete maps to del()', async () => {
    const kv = makeKv();
    const store = createVercelKvHotStore({ client: kv });
    await store.set('k', 'v', 60);
    await store.delete('k');
    expect(kv.del).toHaveBeenCalledWith('k');
    expect(await store.get('k')).toBeNull();
  });
});

// ─── Supabase ColdStore adapter ───────────────────────────────────────────────
describe('supabaseColdStore', () => {
  function makeSupabase() {
    const inserts = [];
    return {
      from: vi.fn((table) => ({
        insert: vi.fn(async (row) => {
          inserts.push({ table, row });
          return { error: null };
        }),
      })),
      _inserts: inserts,
    };
  }

  it('append inserts into flowai_audit_log by default', async () => {
    const sb = makeSupabase();
    const store = createSupabaseColdStore({ client: sb });
    await store.append({
      runId: 'run_1',
      stepKey: 'research',
      phase: 'step.success',
      at: 1_700_000_000_000,
      attempt: 1,
      idempotencyKey: 'flowai:run:run_1:step:research',
    });
    expect(sb.from).toHaveBeenCalledWith('flowai_audit_log');
    expect(sb._inserts).toHaveLength(1);
    expect(sb._inserts[0].row).toMatchObject({
      run_id: 'run_1',
      step_key: 'research',
      phase: 'step.success',
      attempt: 1,
      idempotency_key: 'flowai:run:run_1:step:research',
    });
  });

  it('append converts at (Unix ms) to ISO timestamp', async () => {
    const sb = makeSupabase();
    const store = createSupabaseColdStore({ client: sb });
    await store.append({
      runId: 'r', stepKey: 's', phase: 'step.start', at: 1_700_000_000_000,
    });
    expect(sb._inserts[0].row.at).toBe('2023-11-14T22:13:20.000Z');
  });

  it('append maps optional fields to nulls when absent', async () => {
    const sb = makeSupabase();
    const store = createSupabaseColdStore({ client: sb });
    await store.append({
      runId: 'r', stepKey: 's', phase: 'step.start', at: 0,
    });
    expect(sb._inserts[0].row).toMatchObject({
      attempt: null,
      error_message: null,
      agent_id: null,
      authority: null,
      idempotency_key: null,
      meta: null,
    });
  });

  it('append serializes meta as JSON object', async () => {
    const sb = makeSupabase();
    const store = createSupabaseColdStore({ client: sb });
    await store.append({
      runId: 'r', stepKey: 's', phase: 'route.decision', at: 0,
      meta: { reason: 'routed to #6' },
    });
    expect(sb._inserts[0].row.meta).toEqual({ reason: 'routed to #6' });
  });

  it('respects a custom tableName', async () => {
    const sb = makeSupabase();
    const store = createSupabaseColdStore({ client: sb, tableName: 'audit_v2' });
    await store.append({ runId: 'r', stepKey: 's', phase: 'step.start', at: 0 });
    expect(sb.from).toHaveBeenCalledWith('audit_v2');
  });

  it('append throws when Supabase returns an error', async () => {
    const sb = {
      from: () => ({
        insert: async () => ({ error: new Error('relation does not exist') }),
      }),
    };
    const store = createSupabaseColdStore({ client: sb });
    await expect(
      store.append({ runId: 'r', stepKey: 's', phase: 'step.start', at: 0 }),
    ).rejects.toThrow(/relation does not exist/);
  });

  it('throws on append when no client and no env vars are configured', async () => {
    const store = createSupabaseColdStore({ url: undefined, serviceRoleKey: undefined });
    // Force the fallback path: no client + no opts URL + no env (we stub by
    // passing url='' and serviceRoleKey='' explicitly so it doesn't try
    // process.env). Easier: the path that throws is when both are missing.
    // We simulate by NOT passing a client and overriding the env via opts
    // — but createSupabaseColdStore reads process.env at call time. So if
    // process.env happens to have SUPABASE_URL set in CI, this assertion
    // could be surprising. We pass explicit empty strings via opts.
    const store2 = createSupabaseColdStore({ url: '', serviceRoleKey: '' });
    await expect(
      store2.append({ runId: 'r', stepKey: 's', phase: 'step.start', at: 0 }),
    ).rejects.toThrow(/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
  });
});
