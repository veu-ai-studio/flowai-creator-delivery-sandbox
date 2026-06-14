import React, { useEffect, useState } from 'react';
import { useClerk, useSignIn } from '@clerk/clerk-react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DEFAULT_TICKET_REDIRECT = '/flow-hub/production';

export function sanitizeRedirectPath(candidate, fallback = DEFAULT_TICKET_REDIRECT) {
  if (!candidate || typeof candidate !== 'string') return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return fallback;
  }
  return candidate;
}

export function resolveTicketRedirectUrl(search = '', fallback = DEFAULT_TICKET_REDIRECT) {
  const params = new URLSearchParams(search);
  return sanitizeRedirectPath(
    params.get('redirect_url') || params.get('redirectUrl'),
    fallback,
  );
}

export function readTicketFromSearch(search = '') {
  const params = new URLSearchParams(search);
  return params.get('ticket') || '';
}

export function resolveInitialTicketRequest(search = currentSearch()) {
  return {
    ticket: readTicketFromSearch(search),
    redirectPath: resolveTicketRedirectUrl(search),
  };
}

export function buildScrubbedTicketUrl({ pathname = '/sign-in-token', search = '', hash = '' } = {}) {
  const params = new URLSearchParams(search);
  if (!params.has('ticket')) {
    return `${pathname}${search}${hash}`;
  }
  params.delete('ticket');
  const nextSearch = params.toString() ? `?${params.toString()}` : '';
  return `${pathname}${nextSearch}${hash}`;
}

export function scrubTicketFromCurrentUrl(location = globalThis.window?.location, history = globalThis.window?.history) {
  if (!location || !history?.replaceState) return null;
  const scrubbedUrl = buildScrubbedTicketUrl({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  });
  if (scrubbedUrl !== `${location.pathname}${location.search}${location.hash}`) {
    history.replaceState(null, '', scrubbedUrl);
  }
  return scrubbedUrl;
}

export async function completeTicketSignIn({ signIn, setActive, ticket }) {
  if (!ticket) {
    return { ok: false, reason: 'missing_ticket' };
  }
  const result = await signIn.create({ strategy: 'ticket', ticket });
  if (result?.status === 'complete' && result.createdSessionId) {
    await setActive({ session: result.createdSessionId });
    return { ok: true };
  }
  return { ok: false, reason: 'incomplete' };
}

export function navigateAfterTicketSignIn(navigate, redirectPath) {
  navigate(redirectPath || DEFAULT_TICKET_REDIRECT, { replace: true });
}

function currentSearch() {
  if (typeof window === 'undefined') return '';
  return window.location.search;
}

function TicketStatusPanel({ tone = 'loading', title, children }) {
  const isError = tone === 'error';
  const Icon = isError ? AlertTriangle : tone === 'success' ? ShieldCheck : Loader2;
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6" data-auth-route="sign-in-token">
      <section className={`w-full max-w-md border p-6 ${isError ? 'border-amber-300/40 bg-amber-300/10' : 'border-cyan-300/30 bg-cyan-300/10'}`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${isError ? 'text-amber-200' : 'text-cyan-200'} ${tone === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <p className={`mt-3 text-sm ${isError ? 'text-amber-50/80' : 'text-cyan-50/80'}`}>
          {children}
        </p>
      </section>
    </main>
  );
}

function MissingClerkConfig() {
  return (
    <TicketStatusPanel tone="error" title="Clerk ticket sign-in is not configured">
      VITE_CLERK_PUBLISHABLE_KEY is required before this route can consume a Clerk ticket.
    </TicketStatusPanel>
  );
}

function ClerkTicketSignInWorker() {
  const { isLoaded, signIn } = useSignIn();
  const { setActive } = useClerk();
  const navigate = useNavigate();
  const [{ ticket, redirectPath }] = useState(() => resolveInitialTicketRequest());
  const [status, setStatus] = useState({ tone: 'loading', message: 'Completing secure sign-in.' });

  useEffect(() => {
    if (!ticket) {
      setStatus({ tone: 'error', message: 'This sign-in link is missing its required ticket.' });
      return undefined;
    }
    if (!isLoaded) return undefined;

    let cancelled = false;
    setStatus({ tone: 'loading', message: 'Completing secure sign-in.' });

    completeTicketSignIn({ signIn, setActive, ticket })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          navigateAfterTicketSignIn(navigate, redirectPath);
          return;
        }
        setStatus({
          tone: 'error',
          message: 'This sign-in link could not be completed. Request a fresh sign-in link and try again.',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            tone: 'error',
            message: 'This sign-in link could not be completed. Request a fresh sign-in link and try again.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, navigate, redirectPath, setActive, signIn, ticket]);

  if (!ticket) {
    return (
      <TicketStatusPanel tone="error" title="Sign-in link is incomplete">
        This sign-in link is missing its required ticket.
      </TicketStatusPanel>
    );
  }

  return (
    <TicketStatusPanel tone={status.tone} title={status.tone === 'error' ? 'Sign-in link could not be completed' : 'Completing secure sign-in'}>
      {status.message}
    </TicketStatusPanel>
  );
}

export default function ClerkTicketSignInPage() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    scrubTicketFromCurrentUrl();
  }, []);

  if (!publishableKey) {
    return <MissingClerkConfig />;
  }

  return <ClerkTicketSignInWorker />;
}
