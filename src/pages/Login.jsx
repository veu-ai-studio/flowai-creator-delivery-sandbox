// src/pages/Login.jsx — TRACK-E PR4
//
// Minimal Supabase magic-link login page. The whole user flow:
//   1. User lands here from RequireAuth redirect (or directly)
//   2. Enters email, clicks "Send magic link"
//   3. Supabase emails them a one-time login link
//   4. They click the link → redirected back to the `from` path
//      (carried via location.state by RequireAuth) with an active session
//
// This is the intentionally minimal MVP — no password, no signup,
// no MFA. Full RBAC and password fallback are post-MVP per the
// TRACK-E spec.

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabaseBrowserClient';

export default function Login() {
  const location = useLocation();
  const fromPath = location.state?.from || '/dashboard';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const configured = isSupabaseAuthConfigured();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !/.+@.+\..+/.test(email)) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    setStatus('sending');
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error('Supabase client unavailable.');
      const redirectTo = `${window.location.origin}${fromPath}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e?.message ?? 'Failed to send magic link.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            We'll email you a one-time login link.
          </p>
        </div>

        {!configured && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Supabase auth is not configured in this environment. Set
            <code className="mx-1">VITE_SUPABASE_URL</code> and
            <code className="mx-1">VITE_SUPABASE_ANON_KEY</code> (via Doppler) to enable.
          </div>
        )}

        {status === 'sent' ? (
          <div className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            Check <strong>{email}</strong> — we sent a sign-in link. You can close this tab.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                disabled={!configured || status === 'sending'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </label>

            {errorMsg && (
              <p className="text-sm text-destructive" role="alert">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={!configured || status === 'sending'}
              className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        <p className="text-xs text-muted-foreground">
          Redirects back to <code>{fromPath}</code> after sign-in.
        </p>
      </div>
    </div>
  );
}
