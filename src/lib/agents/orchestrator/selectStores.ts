/**
 * selectStores — env-var-driven HotStore + ColdStore selection.
 * ---------------------------------------------------------------------------
 * Owner:   /src/lib/agents/orchestrator/selectStores.ts (W5)
 *
 * Selection rules (per dispatch):
 *   - hot store
 *       KV_REST_API_URL present → Vercel KV adapter
 *       else                    → in-memory
 *   - cold store
 *       SUPABASE_URL present    → Supabase adapter
 *       else                    → in-memory
 *
 * Returns the chosen stores plus their kind labels so callers (health
 * checks, dashboards) can introspect which backend is active without
 * re-reading env vars.
 *
 * The factories for each adapter are injectable so unit tests can verify
 * the selection logic without instantiating real Vercel KV or Supabase
 * clients.
 * ---------------------------------------------------------------------------
 */

import type { HotStore, ColdStore } from './OrchestratorHub.js';
import {
  createMemoryHotStore as defaultCreateMemoryHotStore,
  createMemoryColdStore as defaultCreateMemoryColdStore,
} from './OrchestratorHub.js';
import { createVercelKvHotStore } from './adapters/vercelKvHotStore.js';
import { createSupabaseColdStore } from './adapters/supabaseColdStore.js';

export type HotStoreKind = 'kv' | 'memory';
export type ColdStoreKind = 'supabase' | 'memory';

export interface StoreSelection {
  readonly hot: HotStore;
  readonly cold: ColdStore;
  readonly hotKind: HotStoreKind;
  readonly coldKind: ColdStoreKind;
}

export interface SelectStoresOpts {
  /**
   * Env-var bag. Defaults to `process.env` when present, else `{}`.
   * Tests pass a stub bag so they don't depend on the real environment.
   */
  readonly env?: Record<string, string | undefined>;

  /**
   * Optional factory overrides for unit-testing the selection logic
   * without instantiating real clients.
   */
  readonly factories?: {
    readonly kvHot?: () => HotStore;
    readonly supabaseCold?: () => ColdStore;
    readonly memoryHot?: () => HotStore;
    readonly memoryCold?: () => ColdStore;
  };
}

function resolveEnv(opts: SelectStoresOpts): Record<string, string | undefined> {
  if (opts.env) return opts.env;
  if (typeof process !== 'undefined' && process.env) return process.env;
  return {};
}

export function selectStores(opts: SelectStoresOpts = {}): StoreSelection {
  const env = resolveEnv(opts);
  const factories = opts.factories ?? {};

  const memoryHotFactory = factories.memoryHot ?? (() => defaultCreateMemoryHotStore());
  const memoryColdFactory = factories.memoryCold ?? (() => defaultCreateMemoryColdStore());
  const kvHotFactory = factories.kvHot ?? (() => createVercelKvHotStore());
  const supabaseColdFactory = factories.supabaseCold ?? (() => createSupabaseColdStore());

  let hot: HotStore;
  let hotKind: HotStoreKind;
  if (env.KV_REST_API_URL && env.KV_REST_API_URL.length > 0) {
    hot = kvHotFactory();
    hotKind = 'kv';
  } else {
    hot = memoryHotFactory();
    hotKind = 'memory';
  }

  let cold: ColdStore;
  let coldKind: ColdStoreKind;
  if (env.SUPABASE_URL && env.SUPABASE_URL.length > 0) {
    cold = supabaseColdFactory();
    coldKind = 'supabase';
  } else {
    cold = memoryColdFactory();
    coldKind = 'memory';
  }

  return Object.freeze({ hot, cold, hotKind, coldKind });
}

/**
 * Describe the active store selection without constructing the stores. Used
 * by health endpoints and config dashboards.
 */
export function describeStoreSelection(opts: SelectStoresOpts = {}): {
  hotKind: HotStoreKind;
  coldKind: ColdStoreKind;
} {
  const env = resolveEnv(opts);
  return {
    hotKind: env.KV_REST_API_URL && env.KV_REST_API_URL.length > 0 ? 'kv' : 'memory',
    coldKind: env.SUPABASE_URL && env.SUPABASE_URL.length > 0 ? 'supabase' : 'memory',
  };
}
