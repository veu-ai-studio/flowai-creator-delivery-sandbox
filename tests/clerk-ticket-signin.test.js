import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clerkMocks = vi.hoisted(() => ({
  isLoaded: true,
  navigate: vi.fn(),
  setActive: vi.fn(),
  signInCreate: vi.fn(),
  useClerk: vi.fn(),
  useSignIn: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useClerk: () => {
    clerkMocks.useClerk();
    return { setActive: clerkMocks.setActive };
  },
  useSignIn: () => {
    clerkMocks.useSignIn();
    return {
      isLoaded: clerkMocks.isLoaded,
      signIn: { create: clerkMocks.signInCreate },
    };
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => clerkMocks.navigate,
}));

import ClerkTicketSignInPage, {
  DEFAULT_TICKET_REDIRECT,
  buildScrubbedTicketUrl,
  completeTicketSignIn,
  navigateAfterTicketSignIn,
  readTicketFromSearch,
  resolveInitialTicketRequest,
  resolveTicketRedirectUrl,
  scrubTicketFromCurrentUrl,
} from '../src/pages/ClerkTicketSignInPage.jsx';

function installWindow(search = '') {
  const replaceState = vi.fn();
  vi.stubGlobal('window', {
    location: {
      pathname: '/sign-in-token',
      search,
      hash: '',
    },
    history: { replaceState },
  });
  return replaceState;
}

describe('Clerk ticket sign-in route', () => {
  let originalKey;

  beforeEach(() => {
    originalKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_ticket_route';
    clerkMocks.isLoaded = true;
    clerkMocks.navigate.mockClear();
    clerkMocks.setActive.mockClear();
    clerkMocks.signInCreate.mockClear();
    clerkMocks.useClerk.mockClear();
    clerkMocks.useSignIn.mockClear();
  });

  afterEach(() => {
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('wires /sign-in-token to the app-owned Clerk ticket route', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');
    expect(appSource).toContain("import ClerkTicketSignInPage from './pages/ClerkTicketSignInPage';");
    expect(appSource).toContain('<Route path="/sign-in-token" element={<ClerkTicketSignInPage />} />');
  });

  it('renders a non-secret unavailable state when the frontend publishable key is absent', () => {
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = '';
    installWindow('?ticket=%3Credacted-ticket%3E');

    const html = renderToStaticMarkup(React.createElement(ClerkTicketSignInPage));

    expect(html).toContain('data-auth-route="sign-in-token"');
    expect(html).toContain('Clerk ticket sign-in is not configured');
    expect(html).not.toContain('<redacted-ticket>');
    expect(clerkMocks.useSignIn).not.toHaveBeenCalled();
    expect(clerkMocks.signInCreate).not.toHaveBeenCalled();
  });

  it('renders a non-secret failure state when the ticket query param is missing', () => {
    installWindow('');

    const html = renderToStaticMarkup(React.createElement(ClerkTicketSignInPage));

    expect(html).toContain('data-auth-route="sign-in-token"');
    expect(html).toContain('Sign-in link is incomplete');
    expect(html).toContain('missing its required ticket');
    expect(clerkMocks.useSignIn).toHaveBeenCalledOnce();
    expect(clerkMocks.signInCreate).not.toHaveBeenCalled();
  });

  it('uses Clerk ticket sign-in and activates the created session', async () => {
    const signIn = {
      create: vi.fn(async () => ({
        status: 'complete',
        createdSessionId: '<redacted-session-id>',
      })),
    };
    const setActive = vi.fn(async () => undefined);

    await expect(completeTicketSignIn({
      signIn,
      setActive,
      ticket: '<redacted-ticket>',
    })).resolves.toEqual({ ok: true });

    expect(signIn.create).toHaveBeenCalledWith({
      strategy: 'ticket',
      ticket: '<redacted-ticket>',
    });
    expect(setActive).toHaveBeenCalledWith({ session: '<redacted-session-id>' });
  });

  it('does not call Clerk when the ticket is absent', async () => {
    const signIn = { create: vi.fn() };
    const setActive = vi.fn();

    await expect(completeTicketSignIn({ signIn, setActive, ticket: '' })).resolves.toEqual({
      ok: false,
      reason: 'missing_ticket',
    });

    expect(signIn.create).not.toHaveBeenCalled();
    expect(setActive).not.toHaveBeenCalled();
  });

  it('scrubs ticket-bearing URLs from browser history while preserving safe redirect intent', () => {
    const replaceState = installWindow('?ticket=%3Credacted-ticket%3E&redirect_url=%2Fflow-hub%2Fproduction');

    expect(scrubTicketFromCurrentUrl()).toBe('/sign-in-token?redirect_url=%2Fflow-hub%2Fproduction');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/sign-in-token?redirect_url=%2Fflow-hub%2Fproduction');
    expect(buildScrubbedTicketUrl({
      pathname: '/sign-in-token',
      search: '?ticket=%3Credacted-ticket%3E&redirectUrl=%2Fdashboard',
      hash: '',
    })).toBe('/sign-in-token?redirectUrl=%2Fdashboard');
  });

  it('captures the initial ticket and redirect before scrubbed rerenders can look ticketless', () => {
    const initialSearch = '?ticket=%3Credacted-ticket%3E&redirect_url=%2Fflow-hub%2Fproduction';
    const initialRequest = resolveInitialTicketRequest(initialSearch);
    const scrubbedUrl = buildScrubbedTicketUrl({
      pathname: '/sign-in-token',
      search: initialSearch,
      hash: '',
    });
    const scrubbedSearch = scrubbedUrl.slice(scrubbedUrl.indexOf('?'));
    const pageSource = readFileSync(resolve(process.cwd(), 'src/pages/ClerkTicketSignInPage.jsx'), 'utf8');

    expect(initialRequest).toEqual({
      ticket: '<redacted-ticket>',
      redirectPath: '/flow-hub/production',
    });
    expect(readTicketFromSearch(scrubbedSearch)).toBe('');
    expect(pageSource).toContain('const [{ ticket, redirectPath }] = useState(() => resolveInitialTicketRequest());');
    expect(pageSource).not.toContain('const search = currentSearch();');
    expect(pageSource).not.toContain('useMemo');
  });

  it('navigates to the default or supplied same-origin redirect after successful activation', () => {
    expect(resolveTicketRedirectUrl('?redirect_url=%2Fflow-hub%2Fproduction')).toBe('/flow-hub/production');
    expect(resolveTicketRedirectUrl('?redirectUrl=%2Fdashboard')).toBe('/dashboard');
    expect(resolveTicketRedirectUrl('?redirect_url=https%3A%2F%2Fexample.test')).toBe(DEFAULT_TICKET_REDIRECT);
    expect(resolveTicketRedirectUrl('?redirect_url=%2F%2Fevil.test')).toBe(DEFAULT_TICKET_REDIRECT);

    navigateAfterTicketSignIn(clerkMocks.navigate, '/dashboard');
    expect(clerkMocks.navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});
