// PA #2.5b - Proxy URL resolution for PlatformHealthWidget.
//
// Extracted into its own file (no React, no Base44 client imports) so
// vitest can verify resolution logic without dragging in the full UI
// dependency graph.
//
// Resolution order:
//   1. VITE_FLOWAI_FETCH_PROXY_URL env var (set in Vercel env vars panel)
//      use it verbatim, strip trailing slash.
//   2. otherwise use DEFAULT_PROXY_FALLBACK, which points at same-origin
//      Vercel API routes in production.

export const DEFAULT_PROXY_FALLBACK = '/api';

export function resolveProxyBaseUrl(metaEnv) {
  const env = metaEnv ?? (typeof import.meta !== 'undefined' ? import.meta.env : undefined) ?? {};
  const configured = env.VITE_FLOWAI_FETCH_PROXY_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim().replace(/\/$/, '');
  }
  return DEFAULT_PROXY_FALLBACK;
}
