import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/clerk-react', () => ({
  SignIn: (props) => React.createElement(
    'section',
    { 'data-testid': 'clerk-sign-in', 'data-routing': props.routing, 'data-path': props.path },
    'Clerk SignIn',
  ),
  SignUp: (props) => React.createElement(
    'section',
    { 'data-testid': 'clerk-sign-up', 'data-routing': props.routing, 'data-path': props.path },
    'Clerk SignUp',
  ),
}));

import ClerkAuthPage, {
  DEFAULT_AUTH_REDIRECT,
  resolveRedirectUrl,
} from '../src/pages/ClerkAuthPage.jsx';

describe('Clerk auth routes', () => {
  let originalKey;

  beforeEach(() => {
    originalKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_route_rendering';
  });

  afterEach(() => {
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = originalKey;
  });

  it('renders intentional Clerk sign-up UI', () => {
    const html = renderToStaticMarkup(React.createElement(ClerkAuthPage, { mode: 'sign-up' }));
    expect(html).toContain('data-auth-route="sign-up"');
    expect(html).toContain('data-testid="clerk-sign-up"');
    expect(html).toContain('data-routing="path"');
    expect(html).toContain('data-path="/sign-up"');
    expect(html).not.toMatch(/page not found|landing/i);
  });

  it('renders intentional Clerk sign-in UI', () => {
    const html = renderToStaticMarkup(React.createElement(ClerkAuthPage, { mode: 'sign-in' }));
    expect(html).toContain('data-auth-route="sign-in"');
    expect(html).toContain('data-testid="clerk-sign-in"');
    expect(html).toContain('data-routing="path"');
    expect(html).toContain('data-path="/sign-in"');
    expect(html).not.toMatch(/page not found|landing/i);
  });

  it('wires Clerk base and nested auth paths to ClerkAuthPage in the app router', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');
    expect(appSource).toContain('<Route path="/sign-up/*" element={<ClerkAuthPage mode="sign-up" />} />');
    expect(appSource).toContain('<Route path="/sign-in/*" element={<ClerkAuthPage mode="sign-in" />} />');
  });

  it('fails visibly when the frontend publishable key is absent', () => {
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = '';
    const html = renderToStaticMarkup(React.createElement(ClerkAuthPage, { mode: 'sign-up' }));
    expect(html).toContain('data-auth-route="sign-up"');
    expect(html).toContain('Clerk auth is not configured');
    expect(html).not.toContain('data-testid="clerk-sign-up"');
  });

  it.each([
    ['?redirect_url=%2Fruns', '/runs'],
    ['?redirectUrl=%2Fdashboard%3Ftab%3Druns', '/dashboard?tab=runs'],
  ])('accepts same-origin path redirects from %s', (search, expected) => {
    expect(resolveRedirectUrl(search)).toBe(expected);
  });

  it.each([
    '?redirect_url=https%3A%2F%2Fevil.example',
    '?redirect_url=%2F%2Fevil.example',
    '?redirect_url=%2Fsafe%5C..%5Cevil',
  ])('rejects unsafe redirect target from %s', (search) => {
    expect(resolveRedirectUrl(search)).toBe(DEFAULT_AUTH_REDIRECT);
  });
});
