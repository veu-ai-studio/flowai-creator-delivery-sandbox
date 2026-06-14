# CB Clerk Session Propagation Evidence - 2026-06-14

Branch: `fix/clerk-session-propagation`
Dispatch: `docs/cto/cb-clerk-session-propagation-dispatch-20260614.md`
Canonical authority read at session start: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`
VERIFIED movement: no

## Build Summary

- Added a Clerk-aware frontend auth bridge that calls Clerk React `useAuth().getToken()` only inside a mounted `ClerkProvider`.
- Preserved the no-Clerk/no-key branch by rendering the original FlowAI `AuthProvider` without calling Clerk hooks.
- Attached `Authorization: Bearer <Clerk token>` to `/api/me` when Clerk is loaded and signed in.
- Kept `credentials:"include"` on `/api/me` as a cookie fallback.
- Preserved anonymous `/api/me` behavior and `AUTH_REQUIRED=false`.
- Did not use the internal `/api/auth/session` path as Clerk proof.
- Did not edit canonical SSOT docs, build protocol, implementation plan, matrixArtifact, scoring, ProductSSOT, or Flow Hub path logic.

## Local Verification

Proof labels used: `UNIT`

Commands run:

```text
npx vitest run tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
npm run build:preflight
npm run lint
git diff --check
```

Results:

- Focused tests: PASS, 4 files / 61 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check`: PASS.

## Required BUILD_PROTOCOL Fields

Mocked tests used: yes
Unmocked runtime proof: N-A with reason - CB local build did not deploy or run CT2 browser proof; live Clerk session proof remains a CT2 Step 7 task after review/merge/deploy.
Production URL serving HEAD commit SHA verified: N-A with reason - no production deployment or promotion was authorized in this branch.
Proof labels used: UNIT
Evidence tier claimed: B
Claim impact: PARTIAL->WIRED
VERIFIED movement: no

## Browser Test Instructions For CT2

Automated gate:

```text
npx vitest run tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
```

Expected result: PASS, including bearer-token propagation tests and anonymous fallback tests.

Manual production or preview checks:

1. Confirm the target `/api/health` runtime commit after merge/promotion.
   - Expected: health commit matches the deployed runtime SHA under test.
2. Create a disposable Clerk user and sign-in token through the backend SDK without printing or committing secret values, token URLs, cookies, generated passwords, or raw Clerk user IDs.
3. Open the sign-in token URL in a fresh browser context.
   - Do not commit the token URL or any token value.
4. In the same browser context, navigate to `https://flowai-dun.vercel.app/flow-hub/production`.
   - Expected: the app loads normally.
5. From the app page, confirm Clerk is loaded and signed in.
   - Acceptable proof: app-origin instrumentation or browser evaluation that reports signed-in state without exposing raw IDs or tokens.
6. From the app page, run an app-origin fetch to `/api/me` that uses the app's Clerk token propagation path.
   - Expected: response includes `authenticated:true` and `authMode:"clerk"`.
   - Do not use only direct address-bar navigation to `/api/me`; direct navigation does not attach the bearer header.
   - Redact `userId`, `orgId`, cookies, Authorization header values, and any token material from committed evidence.
7. Open a fresh no-session browser context and request `/api/me`.
   - Expected: `authenticated:false`, `authMode:"anonymous"`, `config.authRequired:false`.
8. Delete the disposable Clerk user.

PASS criteria:

- `/api/me` returns `authMode:"clerk"` from an app-origin authenticated fetch after Clerk sign-in.
- Anonymous `/api/me` still works while `AUTH_REQUIRED=false`.
- No evidence includes Clerk secrets, bearer token values, cookies, passwords, sign-in token URLs, or raw user IDs.

FAIL criteria and action:

- App-origin `/api/me` remains anonymous after Clerk sign-in.
- The proof relies only on address-bar `/api/me` navigation.
- Anonymous mode is broken or `AUTH_REQUIRED` becomes true.
- Any secret/token/cookie/password/raw-user-id material is printed or committed.
- Action: patch the same branch; do not promote VERIFIED.
