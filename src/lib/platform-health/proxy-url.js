// PA #2.5b — Proxy URL resolution for PlatformHealthWidget.
//
// Extracted into its own file (no React, no Base44 client imports) so
// vitest can verify resolution logic without dragging in the full UI
// dependency graph.
//
// Resolution order:
//   1. VITE_FLOWAI_FETCH_PROXY_URL env var (set in Vercel env vars panel)
//      → use it verbatim, strip trailing slash
//   2. otherwise → DEFAULT_PROXY_FALLBACK (legacy Replit proxy, preserved
//      for backward compat while infra migrates)
//
// To flip the dashboard's "Fetch Proxy" reading to Online via the
// Vercel-internal /api/health endpoint, set:
//
//   VITE_FLOWAI_FETCH_PROXY_URL=/api
//
// in the Vercel project's Preview + Production env-var panels.

export const DEFAULT_PROXY_FALLBACK = 'https://attached-assets-victor2081new.replit.app';

export function resolveProxyBaseUrl(metaEnv) {
  const env = metaEnv ?? (typeof import.meta !== 'undefined' ? import.meta.env : undefined) ?? {};
  const configured = env.VITE_FLOWAI_FETCH_PROXY_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim().replace(/\/$/, '');
  }
  return DEFAULT_PROXY_FALLBACK;
}
