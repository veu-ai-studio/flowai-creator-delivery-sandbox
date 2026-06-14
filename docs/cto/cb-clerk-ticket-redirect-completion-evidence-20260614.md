# CB Clerk Ticket Redirect Completion Evidence - 2026-06-14

Branch: `fix/clerk-ticket-redirect-completion`
HEAD: `7db09f3ff64034cea37b960c26eec5332e61fddd`
Dispatch: `docs/cto/cb-clerk-ticket-redirect-completion-dispatch-20260614.md`
Canonical authority read at session start: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`
Supporting evidence read: `docs/cto/current-directive.md`, `docs/cto/session-brief.md`, `docs/cto/ct2-clerk-ticket-signin-live-proof-result-20260614.md`, `docs/cto/ct2-clerk-ticket-signin-live-proof-raw-20260614.json`
VERIFIED movement: no

## Build Summary

- Patched `src/pages/ClerkTicketSignInPage.jsx` so the ticket and redirect intent are captured once from the initial URL search before the route scrub can affect later renders.
- Added `resolveInitialTicketRequest(...)` and initialized `ClerkTicketSignInWorker` with `useState(() => resolveInitialTicketRequest())`.
- Preserved early `window.history.replaceState(...)` ticket scrubbing.
- Preserved same-origin redirect safety: no external URL, no protocol-relative URL, and no backslash path.
- Preserved existing Clerk session activation behavior: `signIn.create({ strategy:"ticket", ticket })`, then `setActive({ session: createdSessionId })`, then navigation to the captured redirect.
- Preserved `AUTH_REQUIRED=false`, anonymous `/api/me`, existing `/sign-in` and `/sign-up` routes, and bearer-token `/api/me`.
- Did not edit canonical docs, matrixArtifact, ProductSSOT, or VERIFIED state.

## CT2 Blocker Addressed

CT2 proved the prior route established a Clerk app session and authenticated app-origin `/api/me`, but the browser stayed on `/sign-in-token` with the missing-ticket state.

The failure chain was that the worker derived `ticket` and `redirectPath` from `window.location.search` on each render. The parent effect scrubbed `ticket` from the address bar promptly, and a later Clerk state rerender made the worker see an empty ticket. This patch captures the initial `{ ticket, redirectPath }` once in component state, so later renders keep the in-flight ticket/redirect intent while the visible URL remains scrubbed.

## Files Changed

- `src/pages/ClerkTicketSignInPage.jsx`
- `tests/clerk-ticket-signin.test.js`
- `docs/cto/cb-clerk-ticket-redirect-completion-evidence-20260614.md`

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

- Focused tests: PASS, 5 files / 69 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check`: PASS.

Regression coverage added:

- `tests/clerk-ticket-signin.test.js` now proves the initial ticket and redirect are captured from the pre-scrub URL.
- The same test proves the scrubbed URL no longer contains a ticket while the captured request still has the redirect intent.
- The same test asserts the worker uses `useState(() => resolveInitialTicketRequest())` and does not reintroduce the old per-render `currentSearch()` pattern.

## Required BUILD_PROTOCOL Fields

Mocked tests used: yes
Unmocked runtime proof: N-A with reason - CB local build did not deploy or run CT2 browser proof; live redirect completion proof remains a CT2 Step 7 task after review/merge/deploy.
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

Expected result: PASS, including the redirect-completion regression test and existing Clerk ticket/session/auth/health tests.

Manual production checks:

1. Confirm the deployed production runtime identity before proof.
   - Target: `https://flowai-dun.vercel.app/api/health`
   - Expected: `checks.build.commitFull` matches the promoted post-merge runtime commit under test.
   - Expected: `clerkReady:true`, `checks.auth.status:"PASS"`, `checks.auth.authRequired:false`.
2. Open `/sign-in-token` without a ticket.
   - Expected: FlowAI app shell renders the non-secret missing-ticket state.
3. Create a disposable Clerk user through the backend SDK and create one one-time sign-in token.
   - Do not print or commit `CLERK_SECRET_KEY`, raw ticket, hosted sign-in token URL, cookies, password, Authorization header value, bearer token, or raw Clerk user ID.
4. Do not open Clerk's hosted `signInToken.url`.
5. Open the FlowAI-owned route in a fresh browser context using only this redacted evidence template:

```text
https://flowai-dun.vercel.app/sign-in-token?ticket=<redacted-token>&redirect_url=/flow-hub/production
```

6. Confirm the visible address bar no longer contains `ticket=`.
7. Confirm the browser lands on `/flow-hub/production`.
8. Confirm the Flow Hub Production UI loads.
9. Confirm Clerk frontend state with booleans only.
   - Expected: `clerkLoaded:true`, `signedIn:true`, `sessionPresent:true`, `tokenPresent:true`.
10. From the app page, run app-origin `/api/me` using the app Clerk bearer propagation path.
    - Expected: `authenticated:true`, `authMode:"clerk"`.
    - Do not use only direct address-bar `/api/me` navigation as authenticated proof.
11. Open a fresh no-session browser context and request `/api/me`.
    - Expected: `authenticated:false`, `authMode:"anonymous"`, `config.authRequired:false`.
12. Delete the disposable Clerk user.

PASS criteria:

- Ticket route consumes and scrubs the ticket.
- Clerk app session is established.
- Browser lands on `/flow-hub/production`.
- Flow Hub Production UI loads.
- App-origin `/api/me` authenticates with Clerk bearer token.
- Fresh no-session `/api/me` remains anonymous/open.
- Disposable user cleanup succeeds.
- Evidence contains no raw secret, token, ticket URL, cookie, password, Authorization header value, or raw Clerk user ID.

FAIL criteria and action:

- The browser stays on `/sign-in-token` after successful Clerk ticket consumption.
- The ticket remains in the visible URL after page load.
- Clerk app session or app-origin `/api/me` authentication regresses.
- Anonymous `/api/me` or `AUTH_REQUIRED=false` behavior regresses.
- Any raw secret/token/cookie/password/user-id material is printed or committed.
- Action: patch the same branch; do not merge and do not move VERIFIED.
