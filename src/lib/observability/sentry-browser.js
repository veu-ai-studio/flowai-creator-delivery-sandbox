// src/lib/observability/sentry-browser.js
//
// Browser-side Sentry init. Mirrors lib/observability/logger.js (server
// side @sentry/node) so frontend errors land in the same Sentry project,
// tagged by VERCEL_ENV. DSN is read from import.meta.env.VITE_SENTRY_DSN
// — Vite inlines VITE_* env vars at build time; Doppler must inject them
// into Vercel's build environment.
//
// Constraints:
//   - No-op when DSN is missing (dev without Doppler, local builds).
//   - Never throws into React render. Init failures swallow to console.warn.
//   - Source-map upload happens at build time via @sentry/vite-plugin
//     (see vite.config.js), keyed on SENTRY_AUTH_TOKEN / SENTRY_ORG /
//     SENTRY_PROJECT — none of which are exposed to the browser.

import * as Sentry from '@sentry/react';

let initState = 'pending'; // 'pending' | 'ready' | 'disabled'

export function initSentryBrowser() {
  if (initState !== 'pending') return initState === 'ready';

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof dsn !== 'string' || dsn.length < 10) {
    initState = 'disabled';
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_VERCEL_ENV || import.meta.env.MODE || 'development',
      release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || undefined,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0') || 0,
      sendDefaultPii: false,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
    });
    initState = 'ready';
    return true;
  } catch (e) {
    console.warn('[sentry-browser] init failed:', e?.message ?? e);
    initState = 'disabled';
    return false;
  }
}

export function isSentryBrowserReady() {
  return initState === 'ready';
}

export { Sentry };
