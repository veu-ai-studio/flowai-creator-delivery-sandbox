# Clerk Session Boundary Analysis

Date: 2026-06-14 UTC
Owner: CTO
Scope: Map full Clerk session propagation blocker before dispatching CB
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

## Verdict

The remaining Clerk blocker is not environment activation, route rendering, or backend user creation.

The blocker is session propagation from Clerk React to FlowAI API requests. The server already has a bearer-token path, but the frontend does not request a Clerk session token or attach it to `/api/me`.

## Current Evidence

Production runtime commit under Clerk proof:

- `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`

CT2 route/readiness proof:

- `docs/cto/ct2-clerk-auth-live-proof-result-20260613.md`
- `/api/health` reported `clerkReady:true` and auth readiness `PASS`.
- `/sign-up` rendered real Clerk UI.
- `/sign-in` rendered real Clerk UI.
- Public sign-up was blocked by Cloudflare human verification.

CT2 token-session proof:

- `docs/cto/ct2-clerk-auth-token-session-proof-result-20260613.md`
- Clerk backend disposable user creation: PASS.
- Clerk backend sign-in token creation: PASS.
- Token URL open in fresh browser context: PASS.
- Direct navigation to `/api/me` in that browser context returned anonymous: BLOCK.

Important proof nuance:

- Direct address-bar navigation to `/api/me` cannot attach an `Authorization` header.
- If FlowAI uses Clerk session tokens correctly, the proof must verify an app-origin fetch that attaches `Authorization: Bearer <Clerk token>`, or verify app UI state that is driven by such a fetch.

## Code Boundary Map

Server token intake:

- `api/_lib/auth.js:97` defines `extractToken(req)`.
- `api/_lib/auth.js:98-99` accepts `Authorization: Bearer <token>`.
- `api/_lib/auth.js:100-102` falls back to `__session` cookie.
- `api/_lib/auth.js:108` defines `verifySession(req)`.
- `api/_lib/auth.js:114-116` verifies the token through Clerk SDK.
- `api/_lib/auth.js:132` defines `getRequestContext(req)`.
- `api/me.js:14` calls `getRequestContext(req)`.

Frontend Clerk provider:

- `src/App.jsx:128-139` wraps the app in `ClerkProvider` only when `VITE_CLERK_PUBLISHABLE_KEY` exists.
- `src/App.jsx:298-299` currently nests `<AuthProvider>` inside `<ClerkRuntimeProvider>`.
- `src/pages/ClerkAuthPage.jsx:2` imports Clerk `SignIn` and `SignUp`.
- `src/pages/ClerkAuthPage.jsx:47-51` renders Clerk path-based auth components with redirects back into FlowAI.

Frontend session fetch:

- `src/lib/AuthContext.jsx:5` defines `fetchRequestContext`.
- `src/lib/AuthContext.jsx:6-10` calls `/api/me` with `credentials:'include'` and `accept: application/json`.
- `src/lib/AuthContext.jsx` does not import Clerk React.
- `src/lib/AuthContext.jsx` does not call Clerk `useAuth().getToken()`.
- `src/lib/AuthContext.jsx` does not attach `Authorization: Bearer <token>`.

Installed Clerk package evidence:

- `package.json` depends on `@clerk/clerk-react` and `@clerk/clerk-sdk-node`.
- `node_modules/@clerk/clerk-react/dist/chunk-3EQWAEPK.mjs` includes `useAuth`.
- That package's local source map documents `getToken()` usage with `Authorization: Bearer ${token}` for external fetches.
- `node_modules/@clerk/clerk-sdk-node/dist/cjs/index.js` exposes `createClerkClient` and `verifyToken`.

## Boundary Chain

All conditions needed for full Clerk-authenticated `/api/me` proof:

1. Vercel Production has `CLERK_SECRET_KEY`.
   - Current evidence: PASS.

2. Vercel Production has `VITE_CLERK_PUBLISHABLE_KEY`.
   - Current evidence: PASS.

3. `/api/health` exposes auth readiness without leaking secret values.
   - Current evidence: PASS.

4. FlowAI routes render Clerk SignUp/SignIn.
   - Current evidence: PASS.

5. A test user obtains an active Clerk browser session.
   - Current evidence: BLOCK for public sign-up due Cloudflare human verification.
   - Current evidence: UNKNOWN for token URL after app-page load; prior proof checked direct `/api/me` navigation, not app-origin token fetch.

6. The FlowAI frontend reads the active Clerk session token.
   - Current evidence: FAIL by code inspection. No `getToken()` call exists in `AuthContext`.

7. FlowAI frontend attaches the token to `/api/me`.
   - Current evidence: FAIL by code inspection. `/api/me` fetch sends cookies only.

8. Server verifies the bearer token and returns `authMode:"clerk"`.
   - Current evidence: CODE PATH EXISTS. Needs focused tests with a mocked Clerk SDK and live CT2 proof.

9. CT2 confirms authenticated app state without printing or committing secrets, raw tokens, cookies, passwords, or raw Clerk user IDs.
   - Current evidence: NOT YET PROVEN.

## Recommended Build Direction

Dispatch CB to implement one full session-propagation fix:

1. Keep `AUTH_REQUIRED=false`.
2. Keep anonymous mode open for internal proof.
3. Do not remove or alter the existing internal bypass in `requireAuthHard`.
4. Do not modify canonical docs or matrixArtifact.
5. Add a Clerk-aware bridge around `AuthProvider` that only calls Clerk React hooks when `ClerkProvider` is active.
6. Have `AuthContext` call Clerk `getToken()` when Clerk is loaded and signed in.
7. Attach `Authorization: Bearer <token>` to `/api/me`.
8. Preserve cookie fallback as secondary behavior.
9. Add tests proving the bearer path and no-token fallback.
10. Update CT2 proof instructions to validate app-origin authenticated fetch, not only direct URL navigation.

## STOP Conditions For CB

CB must stop and report instead of patching if:

- `@clerk/clerk-react` no longer exposes `useAuth().getToken()` in the installed package.
- `@clerk/clerk-sdk-node` cannot verify a bearer token through the current server SDK path.
- Any proposed fix requires enabling `AUTH_REQUIRED=true`.
- Any proposed fix requires disabling Clerk/Cloudflare human verification globally.
- Any proposed fix would commit or log Clerk secret values, tokens, cookies, passwords, or raw user IDs.
- Any proposed fix requires changes to `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`, or matrixArtifact.
