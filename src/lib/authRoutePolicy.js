const PUBLIC_AUTH_PATHS = new Set([
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
]);

const CLERK_PATH_BASES = ['/sign-in', '/sign-up'];

export function isPublicAuthPath(pathname) {
  if (PUBLIC_AUTH_PATHS.has(pathname)) return true;
  return CLERK_PATH_BASES.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

export function shouldRedirectToLogin({ authError, pathname }) {
  return authError?.type === 'auth_required' && !isPublicAuthPath(pathname);
}
