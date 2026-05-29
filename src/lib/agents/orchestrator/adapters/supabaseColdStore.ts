/**
 * Supabase ColdStore adapter — Pre-Agent Foundation
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/orchestrator/adapters/supabaseColdStore.ts (W5)
 * Status:   Production adapter for OrchestratorHub.ColdStore.
 *
 * Inserts each AuditEntry as a row in `flowai_audit_log`. The audit trail is
 * the permanent lineage record for every step transition (start, attempt,
 * success, failure, idempotent_hit, route.decision).
 *
 * Env vars (matches existing convention from api/_lib/supabase.js):
 *   SUPABASE_URL                — https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   — service_role secret (server-only; bypasses
 *                                 row-level security, never expose to client)
 *
 * Required Supabase migration (apply manually before first agent runs):
 *
 *   CREATE TABLE IF NOT EXISTS flowai_audit_log (
 *     id              BIGSERIAL PRIMARY KEY,
 *     run_id          TEXT NOT NULL,
 *     step_key        TEXT NOT NULL,
 *     phase           TEXT NOT NULL,
 *     at              TIMESTAMPTZ NOT NULL,
 *     attempt         INTEGER,
 *     error_message   TEXT,
 *     agent_id        INTEGER,
 *     authority       TEXT,
 *     idempotency_key TEXT,
 *     meta            JSONB,
 *     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_flowai_audit_log_run_id
 *     ON flowai_audit_log(run_id, at DESC);
 *   CREATE INDEX IF NOT EXISTS idx_flowai_audit_log_phase
 *     ON flowai_audit_log(phase, at DESC);
 *
 * Migration is NOT applied here — schema changes are W1's domain.
 * ---------------------------------------------------------------------------
 */

import type { ColdStore, AuditEntry } from '../OrchestratorHub.js';

const DEFAULT_TABLE = 'flowai_audit_log';

// Minimum surface the adapter consumes from a Supabase-like client. Both the
// real `@supabase/supabase-js` client and any test stub must satisfy this.
export interface SupabaseClientLike {
  from(table: string): SupabaseTableLike;
}
export interface SupabaseTableLike {
  insert(row: Record<string, unknown> | Record<string, unknown>[]): Promise<{ error: unknown }>;
}

export interface SupabaseColdStoreOpts {
  client?: SupabaseClientLike;
  url?: string;
  serviceRoleKey?: string;
  tableName?: string;
}

/**
 * Build a ColdStore backed by Supabase. If no client is provided, one is
 * lazily constructed from the SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env
 * vars on first append.
 */
export function createSupabaseColdStore(opts: SupabaseColdStoreOpts = {}): ColdStore {
  const tableName = opts.tableName ?? DEFAULT_TABLE;
  let client: SupabaseClientLike | null = opts.client ?? null;

  async function getClient(): Promise<SupabaseClientLike> {
    if (client) return client;
    const url = opts.url ?? (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
    const key =
      opts.serviceRoleKey ??
      (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined);
    if (!url || !key) {
      throw new Error(
        'supabaseColdStore: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required when no client is injected',
      );
    }
    const mod = await import('@supabase/supabase-js');
    client = mod.createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
    }) as unknown as SupabaseClientLike;
    return client;
  }

  return {
    async append(entry: AuditEntry): Promise<void> {
      const c = await getClient();
      const row = {
        run_id: entry.runId,
        step_key: entry.stepKey,
        phase: entry.phase,
        at: new Date(entry.at).toISOString(),
        attempt: entry.attempt ?? null,
        error_message: entry.error ?? null,
        agent_id: entry.agentId ?? null,
        authority: entry.authority ?? null,
        idempotency_key: entry.idempotencyKey ?? null,
        meta: entry.meta ? { ...entry.meta } : null,
      };
      const { error } = await c.from(tableName).insert(row);
      if (error) {
        const msg = error instanceof Error ? error.message : JSON.stringify(error);
        throw new Error(`supabaseColdStore.append failed: ${msg}`);
      }
    },
  };
}
