import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { ShieldCheck } from 'lucide-react';

export const DEFAULT_AUTH_REDIRECT = '/flow-hub/production';

export function sanitizeAuthRedirectPath(candidate, fallback = DEFAULT_AUTH_REDIRECT) {
  if (!candidate || typeof candidate !== 'string') return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return fallback;
  }
  return candidate;
}

export function resolveRedirectUrl(search = globalThis.window?.location?.search || '') {
  const params = new URLSearchParams(search);
  return sanitizeAuthRedirectPath(params.get('redirect_url') || params.get('redirectUrl'));
}

function MissingClerkConfig({ mode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6" data-auth-route={mode}>
      <section className="w-full max-w-md border border-amber-300/40 bg-amber-300/10 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-200" aria-hidden="true" />
          <h1 className="text-lg font-semibold">Clerk auth is not configured</h1>
        </div>
        <p className="mt-3 text-sm text-amber-50/80">
          VITE_CLERK_PUBLISHABLE_KEY is required before this route can render Clerk.
        </p>
      </section>
    </main>
  );
}

export default function ClerkAuthPage({ mode }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const isSignUp = mode === 'sign-up';
  const AuthComponent = isSignUp ? SignUp : SignIn;
  const redirectUrl = resolveRedirectUrl();

  if (!publishableKey) {
    return <MissingClerkConfig mode={mode} />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8" data-auth-route={mode}>
      <section className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3 text-slate-100">
          <ShieldCheck className="h-6 w-6 text-cyan-300" aria-hidden="true" />
          <h1 className="text-xl font-semibold">{isSignUp ? 'Create your account' : 'Sign in to your account'}</h1>
        </div>
        <div className="flex justify-center">
          <AuthComponent
            routing="path"
            path={isSignUp ? '/sign-up' : '/sign-in'}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl={redirectUrl}
            forceRedirectUrl={redirectUrl}
            appearance={{
              variables: {
                colorPrimary: '#0891b2',
                borderRadius: '6px',
              },
            }}
          />
        </div>
      </section>
    </main>
  );
}
