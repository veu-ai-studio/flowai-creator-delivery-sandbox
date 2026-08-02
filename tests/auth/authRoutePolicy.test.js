import { describe, expect, it } from 'vitest';

import { isPublicAuthPath, shouldRedirectToLogin } from '../../src/lib/authRoutePolicy.js';

describe('auth route policy', () => {
  it.each([
    '/sign-in',
    '/sign-in/',
    '/sign-in/factor-one',
    '/sign-up',
    '/sign-up/verify-email-address',
    '/sign-in-token',
    '/login',
    '/landing',
    '/about',
    '/veuaas',
    '/demo',
    '/live-demo',
    '/enterprise-demo',
    '/terms-of-use',
    '/privacy-policy',
  ])('keeps the public route %s renderable when authentication is required', (pathname) => {
    expect(isPublicAuthPath(pathname)).toBe(true);
    expect(shouldRedirectToLogin({ authError: { type: 'auth_required' }, pathname })).toBe(false);
  });

  it.each(['/runs', '/dashboard', '/workspace', '/clearance', '/guided/research'])(
    'redirects protected route %s to sign-in',
    (pathname) => {
      expect(shouldRedirectToLogin({ authError: { type: 'auth_required' }, pathname })).toBe(true);
    },
  );

  it.each(['/sign-in-evil', '/sign-upstream'])(
    'does not allow a lookalike auth path %s',
    (pathname) => {
      expect(isPublicAuthPath(pathname)).toBe(false);
      expect(shouldRedirectToLogin({ authError: { type: 'auth_required' }, pathname })).toBe(true);
    },
  );

  it('does not redirect unrelated authentication errors', () => {
    expect(shouldRedirectToLogin({ authError: { type: 'unknown' }, pathname: '/runs' })).toBe(false);
  });
});
