# CB Clerk Auth Completion Evidence - 2026-06-13

Branch: `fix/clerk-auth-completion`
Dispatch: `docs/cto/cb-clerk-auth-completion-dispatch-20260613.md`
Canonical authority read at session start: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`
VERIFIED movement: no

## Build Summary

- Added `/api/health` Clerk/auth readiness fields with boolean-only public output:
  - top-level `clerkReady`
  - `checks.auth.status`
  - `checks.auth.clerkConfigured`
  - `checks.auth.frontendPublishableKeyPresent`
  - `checks.auth.authRequired`
- Added Clerk React frontend dependency and explicit `/sign-up` and `/sign-in` routes.
- Replaced the old Base44-style frontend auth context with `/api/me` request-context loading so a Clerk session cookie can surface as authenticated context while anonymous mode remains open when `AUTH_REQUIRED=false`.
- Kept `AUTH_REQUIRED` unchanged.
- Did not edit canonical SSOT docs, implementation plan, build protocol, matrixArtifact, scoring, ProductSSOT, or Flow Hub path logic.

## Local Verification

Proof labels used: `UNIT`

Commands run:

```text
npx vitest run tests/api-health-handler.test.js tests/auth.test.js tests/clerk-auth-routes.test.js
npm run build:preflight
npm run lint
git diff --check
```

Results:

- Focused tests: PASS, 3 files / 53 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check`: PASS with line-ending warnings only.

## Required BUILD_PROTOCOL Fields

Mocked tests used: yes
Unmocked runtime proof: N-A with reason - CB local build did not deploy or run CT2 browser proof; live sign-up/sign-in remains a CT2 Step 7 task after review/merge.
Production URL serving HEAD commit SHA verified: N-A with reason - no production deployment or promotion was authorized in this branch.
Proof labels used: UNIT
Evidence tier claimed: B
Claim impact: PARTIAL->WIRED
VERIFIED movement: no

## Browser Test Instructions For CT2

1. Open production or preview `/api/health`.
   - Expected: response includes `clerkReady:true` only when backend Clerk and frontend Clerk readiness are both present: `checks.auth.status:"PASS"`, `clerkConfigured:true`, and `frontendPublishableKeyPresent:true`.
   - Expected: if `CLERK_SECRET_KEY` is present but `VITE_CLERK_PUBLISHABLE_KEY` is missing, `clerkReady:false` and `checks.auth.status:"DEGRADED"`.
   - Expected: `checks.auth` includes `status`, `clerkConfigured`, `frontendPublishableKeyPresent`, and `authRequired:false`.
   - Expected: no secret or publishable key values appear in the response, only booleans.
2. Open `/sign-up`.
   - Expected: a real Clerk sign-up UI renders, not the SPA fallback, not marketing content, and not the internal `/api/auth/sign-up` form.
3. Use an approved Clerk test identity to create or attempt a test user.
   - Expected: Clerk handles the sign-up attempt. If Clerk dashboard/domain policy blocks the attempt, record the exact Clerk-visible blocker.
4. After sign-up or sign-in, open `/api/me` in the same browser session.
   - Expected: authenticated Clerk-backed context, with `authenticated:true`, `authMode:"clerk"`, and a user id when Clerk session cookies are present.
5. Confirm anonymous internal proof workflows remain available while `AUTH_REQUIRED=false`.
   - Expected: `/api/me` without a Clerk session still returns `authenticated:false`, `authMode:"anonymous"`, `config.authRequired:false`; Flow Hub pages remain reachable.

PASS criteria:

- `/api/health` exposes the auth readiness fields with no secret leakage.
- `/sign-up` and `/sign-in` render Clerk UI.
- Clerk session produces authenticated `/api/me` context, or CT2 reports an external Clerk dashboard/domain blocker exactly.
- Anonymous proof workflows remain available because `AUTH_REQUIRED=false`.

FAIL criteria and action:

- Any secret value appears in `/api/health`.
- `/sign-up` or `/sign-in` falls through to fallback/marketing/internal auth.
- `/api/me` cannot observe Clerk session context after a successful Clerk sign-up/sign-in.
- `AUTH_REQUIRED` is true or anonymous proof workflows are blocked.
- Action: patch the same branch; do not promote VERIFIED.
