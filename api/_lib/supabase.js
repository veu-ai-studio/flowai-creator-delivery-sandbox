// Supabase server-side client factory.
//
// IMPORTANT: This file is NEVER imported by browser code. The service role
// key bypasses Row-Level Security and must stay on the server.
//
// Env vars:
//   SUPABASE_URL                — https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   — service_role secret (server-only)
//
// If neither is set, getSupabase() returns null and the db.js abstraction
// transparently falls back to in-memory / localStorage storage so today's
// flow keeps working.

import { createClient } from '@supabase/supabase-js';

let cached = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabase() {
  if (cached) return cached;
  if (!isSupabaseConfigured()) return null;
  cached = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
      global: { headers: { 'x-flowai-source': 'api' } },
    },
  );
  return cached;
}

// For tests: drop the cached client so the next getSupabase() rebuilds.
export function _resetClient() {
  cached = null;
}
