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

import ClerkAuthPage from '../src/pages/ClerkAuthPage.jsx';

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

  it('wires /sign-up and /sign-in to ClerkAuthPage in the app router', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');
    expect(appSource).toContain('<Route path="/sign-up" element={<ClerkAuthPage mode="sign-up" />} />');
    expect(appSource).toContain('<Route path="/sign-in" element={<ClerkAuthPage mode="sign-in" />} />');
  });

  it('fails visibly when the frontend publishable key is absent', () => {
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = '';
    const html = renderToStaticMarkup(React.createElement(ClerkAuthPage, { mode: 'sign-up' }));
    expect(html).toContain('data-auth-route="sign-up"');
    expect(html).toContain('Clerk auth is not configured');
    expect(html).not.toContain('data-testid="clerk-sign-up"');
  });
});
