# CB Clerk Ticket Sign-In Evidence - 2026-06-14

Branch: `fix/clerk-ticket-signin`
Dispatch: `docs/cto/cb-clerk-ticket-signin-dispatch-20260614.md`
Canonical authority read at session start: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`
Supporting evidence read: `docs/cto/current-directive.md`, `docs/cto/session-brief.md`, `docs/cto/clerk-hosted-redirect-boundary-analysis-20260614.md`, `docs/cto/ct2-clerk-session-live-proof-rerun-result-20260614.md`
VERIFIED movement: no

## Build Summary

- Added app-owned `/sign-in-token` route mounted in `src/App.jsx` beside the existing Clerk `/sign-in` and `/sign-up` routes.
- Added `src/pages/ClerkTicketSignInPage.jsx` to consume a Clerk ticket with `useSignIn().signIn.create({ strategy:"ticket", ticket })` and activate the created session with `useClerk().setActive(...)`.
- Scrubs ticket-bearing URLs from browser history with `window.history.replaceState(...)` and never renders or logs the ticket value.
- Supports optional `redirect_url` / `redirectUrl`, defaults to `/flow-hub/production`, and only accepts same-origin path redirects.
- Renders clear non-secret failure states for missing frontend Clerk configuration, missing ticket, and incomplete/failed Clerk ticket completion.
- Preserved `AUTH_REQUIRED=false`, anonymous `/api/me`, existing Clerk auth routes, and bearer-token `/api/me` behavior.
- Did not edit canonical SSOT docs, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`, matrixArtifact, scoring docs, ProductSSOT, or VERIFIED status.

## Local Verification

Proof labels used: `UNIT`

Commands run:

```text
npx vitest run tests/clerk-ticket-signin.test.js tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
npm run build:preflight
npm run lint
git diff --check
```

Results:

- Focused tests: PASS, 5 files / 68 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check`: PASS.

## Required BUILD_PROTOCOL Fields

Mocked tests used: yes
Unmocked runtime proof: N-A with reason - CB local build did not deploy or run CT2 browser proof; live Clerk ticket proof remains a CT2 Step 7 task after review/merge/deploy.
Production URL serving HEAD commit SHA verified: N-A with reason - no production deployment or promotion was authorized in this branch.
Proof labels used: UNIT
Evidence tier claimed: B
Claim impact: PARTIAL->WIRED
VERIFIED movement: no

## Browser Test Instructions For CT2

Automated gate:

```text
npx vitest run tests/clerk-ticket-signin.test.js tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
```

Expected result: PASS, including the app-owned ticket route assertions, existing Clerk route assertions, bearer-token `/api/me` propagation, anonymous `/api/me`, auth defaults, and health readiness tests.

Manual production or preview checks:

1. Confirm the target `/api/health` or deployment metadata is serving the intended post-merge HEAD SHA before running Clerk proof.
   - Expected: target runtime identity matches the branch commit selected for proof.
2. Create a disposable Clerk user through the backend SDK.
   - Do not print or commit Clerk secrets, generated passwords, cookies, raw user IDs, or token material.
3. Create a one-time sign-in token for the disposable user.
   - Do not open Clerk's hosted `signInToken.url`.
   - Do not print or commit the full FlowAI ticket URL because it contains the ticket.
4. Open the FlowAI-owned route in a fresh browser context using only a redacted evidence template:

```text
https://flowai-dun.vercel.app/sign-in-token?ticket=<redacted-token>&redirect_url=/flow-hub/production
```

5. Confirm the ticket disappears from the browser address bar after page load.
   - Expected: the visible URL no longer contains `ticket=`.
6. Confirm the browser lands on `/flow-hub/production`.
   - Expected: route navigation succeeds without using Clerk's hosted token landing page.
7. Confirm Clerk app state with booleans only.
   - Expected: `signedIn:true`, `sessionPresent:true`, and `tokenPresent:true`.
   - Redact raw IDs, tokens, cookies, Authorization headers, and session values.
8. From the app page, run an app-origin fetch to `/api/me` through the app's Clerk bearer propagation path.
   - Expected: response includes `authenticated:true` and `authMode:"clerk"`.
   - Do not use only direct address-bar navigation to `/api/me`; direct navigation does not prove bearer propagation.
9. Open a fresh no-session browser context and request `/api/me`.
   - Expected: `authenticated:false`, `authMode:"anonymous"`, `config.authRequired:false`.
10. Delete the disposable Clerk user.

PASS criteria:

- `/sign-in-token` consumes the Clerk ticket on the FlowAI app origin and sets an active Clerk session.
- The ticket-bearing URL is scrubbed from browser history/address bar.
- Successful sign-in navigates to `/flow-hub/production` or an approved same-origin redirect path.
- App-origin `/api/me` returns `authMode:"clerk"` after ticket sign-in.
- Anonymous `/api/me` still works while `AUTH_REQUIRED=false`.
- Evidence contains no Clerk secrets, token values, token URLs, cookies, passwords, Authorization headers, or raw user IDs.

FAIL criteria and action:

- Clerk React ticket sign-in does not complete or `setActive` is not called by the app-owned route.
- The proof opens or depends on Clerk's hosted sign-in-token URL.
- The ticket remains visible after page load.
- App-origin `/api/me` remains anonymous after successful Clerk ticket sign-in.
- Anonymous mode is broken or `AUTH_REQUIRED` becomes true.
- Any secret/token/cookie/password/raw-user-id material is printed or committed.
- Action: patch the same branch; do not promote VERIFIED.
