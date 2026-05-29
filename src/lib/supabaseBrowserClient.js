// src/lib/supabaseBrowserClient.js — TRACK-E PR4
//
// Browser-side Supabase client for end-user auth (magic-link). Distinct
// from the server-side service-role client used by /api/*; this one only
// holds the anon key + session, never the service-role secret.
//
// Reads from Vite env (build-time inlined):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY    — RLS-restricted public key
//
// Returns null when either env var is missing so callers can degrade
// gracefully in environments without Supabase auth (e.g., the demo
// landing page).

import { createClient } from '@supabase/supabase-js';

let cached = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles ?access_token=... after magic-link redirect
    },
  });
  return cached;
}

export function isSupabaseAuthConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
