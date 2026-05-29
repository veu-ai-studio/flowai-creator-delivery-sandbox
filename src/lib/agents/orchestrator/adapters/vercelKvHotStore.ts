/**
 * Vercel KV HotStore adapter — Pre-Agent Foundation
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/orchestrator/adapters/vercelKvHotStore.ts (W5)
 * Status:   Production adapter for OrchestratorHub.HotStore.
 *
 * Wraps `@vercel/kv` (Upstash Redis under the hood). Every write goes
 * through `set(key, value, { ex: ttlSec })` so the hot state is bounded
 * to the dispatched 1-hour pipeline-scoped TTL.
 *
 * Env vars Vercel auto-injects when you add Vercel KV to a project:
 *   KV_URL
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 *   KV_REST_API_READ_ONLY_TOKEN
 * The default `kv` export reads these directly — no explicit config needed.
 *
 * The adapter accepts an injected client so tests can verify behavior
 * without a real KV instance.
 * ---------------------------------------------------------------------------
 */

import type { HotStore } from '../OrchestratorHub.js';

// Minimum surface the adapter consumes. Both `@vercel/kv` and any test stub
// must satisfy this.
export interface KvLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
}

export interface VercelKvHotStoreOpts {
  client?: KvLike;
}

/**
 * Build a HotStore backed by Vercel KV. If no client is provided, the
 * default `kv` export from `@vercel/kv` is loaded synchronously — that
 * export reads its config from the KV_REST_API_* env vars.
 *
 * NOTE: this is a lazy-import pattern to keep test environments that
 * don't define KV env vars from blowing up at module-load time. The
 * import is resolved on first call.
 */
export function createVercelKvHotStore(opts: VercelKvHotStoreOpts = {}): HotStore {
  let client: KvLike | null = opts.client ?? null;

  async function getClient(): Promise<KvLike> {
    if (client) return client;
    // Lazy load — only when actually used. `@vercel/kv`'s default export
    // throws on construction if env vars are missing, so importing it lazily
    // means tests that don't set those vars don't crash.
    const mod = await import('@vercel/kv');
    client = mod.kv as unknown as KvLike;
    return client;
  }

  return {
    async get(key: string): Promise<unknown | null> {
      const c = await getClient();
      const v = await c.get(key);
      return v === undefined ? null : v;
    },
    async set(key: string, value: unknown, ttlSec: number): Promise<void> {
      const c = await getClient();
      if (!Number.isFinite(ttlSec) || ttlSec <= 0) {
        throw new RangeError('vercelKvHotStore.set: ttlSec must be a positive finite number');
      }
      await c.set(key, value, { ex: Math.floor(ttlSec) });
    },
    async delete(key: string): Promise<void> {
      const c = await getClient();
      await c.del(key);
    },
  };
}
