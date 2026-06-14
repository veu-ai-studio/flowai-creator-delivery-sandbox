# CB Dispatch - Clerk Ticket Redirect Completion Patch

FROM: CTO
TO: CB
ACTION: BUILD - patch `/sign-in-token` post-ticket redirect completion
DATE: 2026-06-14 UTC

Read first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/session-brief.md`
- `docs/cto/ct2-clerk-ticket-signin-live-proof-result-20260614.md`
- `docs/cto/ct2-clerk-ticket-signin-live-proof-raw-20260614.json`

## Background

The prior Clerk ticket-route patch solved the core authenticated-session boundary:

- Production identity: PASS
- `clerkReady:true`: PASS
- Ticket hidden/scrubbed: PASS
- Clerk app session established: PASS
- App-origin `/api/me` authenticated with Clerk bearer token: PASS
- Anonymous no-session `/api/me` preserved: PASS
- Disposable Clerk user cleanup: PASS

CT2 returned `BLOCK` only because the browser remained on `/sign-in-token` with the missing-ticket state instead of landing on `/flow-hub/production`.

Evidence:

- CT2 result: `docs/cto/ct2-clerk-ticket-signin-live-proof-result-20260614.md`
- CT2 raw: `docs/cto/ct2-clerk-ticket-signin-live-proof-raw-20260614.json`
- Evidence commit: `67e4b54`

## Boundary Chain

Current code path:

- `src/pages/ClerkTicketSignInPage.jsx:103` reads `currentSearch()` during render.
- `src/pages/ClerkTicketSignInPage.jsx:104` derives `ticket` from current URL search during render.
- `src/pages/ClerkTicketSignInPage.jsx:105` derives `redirectPath` from current URL search during render.
- `src/pages/ClerkTicketSignInPage.jsx:162-164` parent effect calls `scrubTicketFromCurrentUrl()` immediately after mount.
- After `setActive(...)` changes Clerk state, React re-renders.
- On re-render, `currentSearch()` no longer contains `ticket`, so the worker sees `ticket === ''`, enters missing-ticket state, and its effect cleanup can cancel the in-flight navigation before `navigateAfterTicketSignIn(...)` completes.

Observed CT2 state:

- `clerkLoaded:true`
- `signedIn:true`
- `sessionPresent:true`
- `userPresent:true`
- `tokenPresent:true`
- `appOriginApiMeAuthenticated:true`
- `finalPathFlowHub:false`
- `flowHubLoaded:false`

## Required Fix

Patch the route so the initial ticket and redirect intent are captured once before URL scrubbing can affect subsequent renders.

Recommended implementation:

1. Add a small helper in `src/pages/ClerkTicketSignInPage.jsx`, for example:

   ```js
   export function resolveInitialTicketRequest(search = currentSearch()) {
     return {
       ticket: readTicketFromSearch(search),
       redirectPath: resolveTicketRedirectUrl(search),
     };
   }
   ```

2. In `ClerkTicketSignInWorker`, replace per-render `currentSearch()` derivation with stable initial state/ref:

   ```js
   const [{ ticket, redirectPath }] = useState(() => resolveInitialTicketRequest());
   ```

3. Keep early URL scrubbing so the raw ticket is removed from the address bar promptly.

4. Do not log, expose, persist, or commit the raw ticket.

5. Preserve all redirect safety checks:
   - same-origin path only;
   - no external URL;
   - no protocol-relative URL;
   - no backslash path.

6. Preserve anonymous/open `/api/me` while `AUTH_REQUIRED=false`.

7. Preserve existing Clerk session activation behavior.

Alternative implementations are acceptable if they satisfy the same behavior and keep the patch surgical.

## Files In Scope

Expected:

- `src/pages/ClerkTicketSignInPage.jsx`
- `tests/clerk-ticket-signin.test.js`
- `docs/cto/cb-clerk-ticket-redirect-completion-evidence-20260614.md`

Do not touch unrelated auth, forge, matrixArtifact, ProductSSOT, or canonical docs.

## Tests Required

Run at minimum:

```text
npx vitest run tests/clerk-ticket-signin.test.js tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
npm run build:preflight
npm run lint
git diff --check
```

Add a regression test for the CT2 block. The test must prove that the ticket/redirect values are captured before the scrubbed URL can make later renders look ticketless. If the current Node-only Vitest setup cannot mount effects, add a pure helper test plus a focused source/behavior assertion that would fail if `ClerkTicketSignInWorker` derives `ticket` from `currentSearch()` on every render.

## DoD Required

Produce `docs/cto/cb-clerk-ticket-redirect-completion-evidence-20260614.md` with:

- branch name;
- HEAD;
- files changed;
- exact tests run and results;
- confirmation canonical docs were read;
- explanation of how the patch addresses the CT2 blocker;
- Browser Test Instructions for CT2 rerun;
- mandatory DoD proof fields from `docs/BUILD_PROTOCOL.md`;
- claim impact: no VERIFIED movement.

## Acceptance Criteria

Code/test acceptance:

- Focused tests pass.
- Build preflight passes.
- Lint passes or only existing accepted warnings are documented.
- `git diff --check` passes.
- No raw ticket/token/secret is introduced in code, docs, tests, or logs.

Live acceptance after CD/CR:

- CT2 rerun on production must confirm:
  - production identity;
  - `clerkReady:true`;
  - ticket route consumes and scrubs ticket;
  - Clerk app session established;
  - final path `/flow-hub/production`;
  - Flow Hub Production UI loaded;
  - app-origin `/api/me` authenticated with Clerk token;
  - fresh no-session `/api/me` remains anonymous/open;
  - disposable Clerk user cleaned up.

## STOP Conditions

STOP and report if:

- The route cannot preserve the ticket after scrubbing without keeping raw token in visible URL.
- Fix requires changing Clerk provider configuration, env names, or canonical docs.
- Tests reveal a broader auth/session regression.
- You need to touch matrixArtifact or VERIFIED state.

No VERIFIED movement.
