// src/components/RequireAuth.jsx — TRACK-E PR4
//
// Route guard for Supabase magic-link auth. Wraps protected routes
// (/auto-runner, /governance/*) and redirects to /login when there's
// no active session.
//
// Bypass: VITE_AUTH_BYPASS=1 lets routes render without a session.
// This is required for the FlowAI proof-phase demo where forcing auth
// would block the autonomous runner / governance review flows the
// CEO inspects. The bypass is build-time (inlined by Vite from Doppler),
// so flipping it back to 0 in production deploys re-enables the guard
// without code changes. Per CANONICAL_REFERENCE §1: env-gated reversible
// bypasses are preferred over deleting protections during proof phase.
//
// When auth is fully enforced (bypass off, Supabase configured), magic
// link flow is:
//   /login → enter email → Supabase emails one-time link →
//   user clicks → redirected back to original `from` path with session.
//
// When Supabase is not configured at all (no VITE_SUPABASE_URL), this
// guard silently renders children so the app remains usable in environments
// that haven't been wired up — bypass behavior is identical to
// VITE_AUTH_BYPASS=1. This is intentional for the demo phase.

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabaseBrowserClient';

const BYPASS = import.meta.env.VITE_AUTH_BYPASS === '1';

export default function RequireAuth({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking'); // 'checking' | 'authed' | 'anon'

  useEffect(() => {
    let cancelled = false;

    if (BYPASS || !isSupabaseAuthConfigured()) {
      setStatus('authed');
      return () => { cancelled = true; };
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus('authed'); // degrade open when client construction fails
      return () => { cancelled = true; };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStatus(data?.session ? 'authed' : 'anon');
    }).catch(() => {
      if (!cancelled) setStatus('anon');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setStatus(session ? 'authed' : 'anon');
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
