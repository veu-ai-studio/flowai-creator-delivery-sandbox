# Clerk Auth Diagnostic - 2026-06-13 Local / 2026-06-14 UTC

Owner: CTO
Status: Environment activation complete; runtime/UI completion still required
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`
VERIFIED movement: no

## Summary

Clerk credentials exist in Doppler and have now been added to Vercel Production. A fresh production-target deployment was created and promoted.

Production is now serving:

- Public URL: `https://flowai-dun.vercel.app`
- Deployment URL: `https://flowai-4134cifwb-veu-ai-studio.vercel.app`
- Deployment id: `dpl_HLmCWAJ3npyN8guVVJEJs4Xxji76`
- Runtime commit: `a38c865ed9fbadfc9dde23e7a41cc6c528018533`

Backend Clerk configuration is now visible through production `/api/version` and `/api/me`.

This does not complete the Clerk auth milestone. The health endpoint still does not expose Clerk readiness, `AUTH_REQUIRED` remains false by design, and the frontend sign-up/sign-in experience has not been CT2-proven as a real Clerk user flow.

## Doppler Evidence

Checked without printing secret values:

- `CLERK_SECRET_KEY`: present in Doppler `flowai/prd`, shape `sk_*`.
- `VITE_CLERK_PUBLISHABLE_KEY`: missing in Doppler `flowai/prd`.
- `CLERK_PUBLISHABLE_KEY`: present in Doppler `flowai/prd`, shape `pk_*`.

Action taken:

- Added `CLERK_SECRET_KEY` to Vercel Production as encrypted sensitive env.
- Added `VITE_CLERK_PUBLISHABLE_KEY` to Vercel Production using Doppler `CLERK_PUBLISHABLE_KEY`.
- Did not set `AUTH_REQUIRED=true`.
- Did not remove `FLOWAI_AUTH_BYPASS`.

Reason for not setting `AUTH_REQUIRED=true`: the repo runbook says hard auth should wait until the UI side has Clerk frontend wiring. Turning it on now could block internal proof workflows before CT2 verifies a real sign-up path.

## Vercel Evidence

Vercel env listing after update showed:

- `VITE_CLERK_PUBLISHABLE_KEY`: Encrypted, Production.
- `CLERK_SECRET_KEY`: Encrypted, Production.

New production-target deployment:

- `https://flowai-4134cifwb-veu-ai-studio.vercel.app`
- status: Ready
- target: Production
- promoted successfully to production domain

## Production Endpoint Evidence

`https://flowai-dun.vercel.app/api/version` after promotion:

- `commitFull`: `a38c865ed9fbadfc9dde23e7a41cc6c528018533`
- `featureFlags.clerkReady`: `true`
- `featureFlags.authRequired`: `false`

`https://flowai-dun.vercel.app/api/me` after promotion:

- `authenticated`: `false`
- `authMode`: `anonymous`
- `config.clerkConfigured`: `true`
- `config.authRequired`: `false`

`https://flowai-dun.vercel.app/api/health` after promotion:

- `commitFull`: `a38c865ed9fbadfc9dde23e7a41cc6c528018533`
- does not currently include `clerkReady` or a dedicated auth check.

`https://flowai-dun.vercel.app/sign-up`:

- HTTP `200`
- This is not sufficient proof of a working sign-up form because the SPA fallback can return 200 for routes that are not wired as real auth UX.

## Code Map

Backend Clerk support:

- `api/_lib/auth.js` imports `@clerk/clerk-sdk-node` dynamically when `CLERK_SECRET_KEY` exists.
- `api/me.js` reports `clerkConfigured` from `isClerkConfigured()`.
- `api/version.js` reports `featureFlags.clerkReady`.
- `api/_lib/orchestrator/agents/clerk.js` exposes a Clerk integration agent.

Existing non-Clerk auth backend:

- `api/auth/sign-up.js`
- `api/auth/sign-in.js`
- `api/auth/session.js`
- `api/_lib/authBackend.js`

Frontend gap:

- `src/lib/AuthContext.jsx` still uses the Base44-style auth flow.
- No `@clerk/clerk-react` package is present in `package.json`.
- No CT2 evidence proves a real Clerk sign-up/sign-in flow.

Health visibility gap:

- `api/health.js` delegates to `src/lib/observability/health.js`.
- `src/lib/observability/health.js` currently probes build, Supabase, Vercel KV, Orchestra, observability, and GitHub App.
- It does not probe Clerk/auth readiness.

## CTO Assessment

Clerk environment activation is complete. Clerk auth completion is not complete.

The next build must handle the full boundary chain:

1. Expose auth readiness in `/api/health` so the standing directive can use the health endpoint as evidence.
2. Wire real user-facing sign-up/sign-in UX to Clerk or explicitly document and clear a product-agnostic alternative.
3. Keep `AUTH_REQUIRED=false` until CT2 proves sign-up/sign-in and W04/CEO clear auth enforcement.
4. Dispatch CT2 for live browser proof before any claim movement.

No matrixArtifact or canonical SSOT edits are justified by this diagnostic.
