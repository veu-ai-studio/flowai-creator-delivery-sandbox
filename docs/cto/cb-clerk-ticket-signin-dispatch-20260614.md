# CB Dispatch - Clerk App-Owned Ticket Sign-In

FROM: CTO
TO: CB
ACTION: BUILD - App-owned Clerk one-time ticket landing route
Branch: `fix/clerk-ticket-signin`
Base: current `origin/main`
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

Read these first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/clerk-hosted-redirect-boundary-analysis-20260614.md`
- `docs/cto/ct2-clerk-session-live-proof-rerun-result-20260614.md`

## Problem

Clerk readiness, routes, server bearer verification, frontend bearer propagation, and Clerk redirect allow-list are all in place. CT2 still blocks because Clerk's hosted one-time sign-in-token page does not redirect into FlowAI and does not create a Clerk session on the FlowAI app origin.

CT2 rerun evidence:

- `docs/cto/ct2-clerk-session-live-proof-rerun-result-20260614.md`
- Raw: `docs/cto/ct2-clerk-session-live-proof-rerun-raw-20260614.json`

Installed SDK evidence:

- `@clerk/clerk-sdk-node@4.13.23` `createSignInToken` returns a `token` and `url`, but accepts no redirect parameter.
- `@clerk/clerk-react@5.61.8` exposes `useSignIn()`.
- Local type `node_modules/@clerk/types/dist/signIn.d.ts` supports `signIn.create({ strategy:"ticket", ticket })`.
- Clerk React exposes `useClerk()` / `setActive(...)` through the installed package.

## Scope

Add a FlowAI-owned route that consumes a Clerk one-time sign-in token as a ticket and establishes a Clerk session inside the FlowAI app.

Likely files:

- `src/App.jsx`
- new `src/pages/ClerkTicketSignInPage.jsx`
- `tests/clerk-ticket-signin.test.jsx` or equivalent
- update existing Clerk auth route tests if needed
- `docs/cto/cb-clerk-ticket-signin-evidence-20260614.md`

Do not modify canonical docs or matrixArtifact.

## Required Implementation Shape

1. Add route:

```text
/sign-in-token
```

2. The route reads:

- `ticket` query param, required;
- optional `redirect_url` / `redirectUrl`, default `/flow-hub/production`.

3. The route must be mounted inside the existing `ClerkProvider` when `VITE_CLERK_PUBLISHABLE_KEY` exists.

4. Use Clerk React only:

```js
const { isLoaded, signIn } = useSignIn();
const { setActive } = useClerk();
```

5. On load, if configured and ticket exists:

```js
const result = await signIn.create({ strategy: 'ticket', ticket });
if (result.status === 'complete' && result.createdSessionId) {
  await setActive({ session: result.createdSessionId });
}
```

6. Immediately scrub ticket-bearing URL from browser history using `window.history.replaceState(...)`.

7. After successful `setActive`, navigate to the redirect URL, defaulting to `/flow-hub/production`.

8. If ticket is missing, invalid, or Clerk is not configured, show a clear non-secret failure state. Do not print or serialize the ticket value.

9. Preserve:

- `AUTH_REQUIRED=false`;
- anonymous/no-session `/api/me` behavior;
- existing `/sign-in` and `/sign-up` Clerk component routes;
- existing bearer-token `/api/me` path.

10. Do not add product-specific code or hardcode any product URL other than the FlowAI route path needed for auth.

## Tests Required

Run and report:

- New focused ticket route tests.
- Existing Clerk/auth tests:

```text
npx vitest run tests/clerk-ticket-signin.test.jsx tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
```

- `npm run build:preflight`
- `npm run lint`
- `git diff --check`

Minimum test assertions:

- `/sign-in-token` route is present in `src/App.jsx`.
- Missing `VITE_CLERK_PUBLISHABLE_KEY` renders a non-secret unavailable state.
- Missing `ticket` renders a non-secret failure state and does not call Clerk sign-in.
- Valid ticket calls `signIn.create({ strategy:"ticket", ticket })`.
- Complete sign-in calls `setActive({ session: createdSessionId })`.
- Ticket value is scrubbed from browser history after route load.
- Successful route navigates to `/flow-hub/production` or supplied safe same-origin redirect path.
- Tests and docs do not include real token values, token URLs, cookies, passwords, Clerk secrets, or raw user IDs.

## CT2 Proof Instructions To Produce

CB DoD must instruct CT2 to avoid Clerk's hosted token URL.

CT2 should:

1. Create disposable Clerk user through backend SDK.
2. Create one-time sign-in token.
3. Do not open `signInToken.url`.
4. Open FlowAI-owned route instead:

```text
https://flowai-dun.vercel.app/sign-in-token?ticket=<redacted-token>&redirect_url=/flow-hub/production
```

5. Do not print or commit the URL because it contains the ticket.
6. Confirm the browser lands on `/flow-hub/production`.
7. Confirm Clerk app state has `signedIn:true`, `sessionPresent:true`, and `tokenPresent:true` booleans only.
8. Confirm app-origin `/api/me` returns `authenticated:true`, `authMode:"clerk"`.
9. Confirm fresh no-session `/api/me` remains anonymous/open.
10. Delete disposable Clerk user.

## STOP Conditions

STOP and report if:

- Installed Clerk React does not expose `useSignIn()` or `useClerk().setActive`.
- `signIn.create({ strategy:"ticket", ticket })` is not accepted by installed types/runtime.
- The implementation would require printing, logging, committing, or storing the ticket/token value.
- The implementation requires `AUTH_REQUIRED=true`.
- The implementation requires disabling CAPTCHA or weakening Clerk security globally.
- The implementation requires canonical SSOT or matrixArtifact edits.

## Mandatory DoD Fields

Include these exact fields:

```text
Mocked tests used: yes/no
Unmocked runtime proof: yes/no/N-A with reason
Production URL serving HEAD commit SHA verified: yes/no/N-A with reason
Proof labels used: UNIT / MOCKED_E2E / LIVE_PREVIEW / LIVE_PRODUCTION
Evidence tier claimed: A / B / C / none
Claim impact: no movement / STUBBED->PARTIAL / PARTIAL->WIRED / PARTIAL->VERIFIED
VERIFIED movement: yes/no
```

Expected claim impact:

- `PARTIAL->WIRED` at most if tests pass.
- No VERIFIED movement.

## Review Path

After CB pushes:

1. CTO dispatches CD and CR Step 5 prompts through repo.
2. CD and CR must PASS before merge.
3. CTO merges, deploys, and promotes.
4. CT2 runs live proof against production.
5. W04/CEO handles any VERIFIED promotion separately.
