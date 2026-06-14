# CD Step 5 Review Prompt - Clerk App-Owned Ticket Sign-In

FROM: CTO
TO: CD
ACTION: STEP 5 REVIEW - Clerk app-owned ticket sign-in route
Branch: `fix/clerk-ticket-signin`
Commit under review: `c65fa32` (`Add Clerk ticket sign-in route`)
Base: `origin/main` at `fbb50f5`
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

Read first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/cb-clerk-ticket-signin-dispatch-20260614.md`
- `docs/cto/cb-clerk-ticket-signin-evidence-20260614.md` from branch `fix/clerk-ticket-signin`
- `docs/cto/ct2-clerk-session-live-proof-rerun-result-20260614.md`

## Review Scope

Changed files on branch:

- `src/App.jsx`
- `src/pages/ClerkTicketSignInPage.jsx`
- `tests/clerk-ticket-signin.test.js`
- `docs/cto/cb-clerk-ticket-signin-evidence-20260614.md`

CB reported:

- Focused tests: PASS, 5 files / 68 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check`: PASS.
- Claim impact: `PARTIAL->WIRED` at most.
- VERIFIED movement: no.

## Required Checks

1. Confirm CB read the three governing docs and supporting CTO evidence.
2. Confirm implementation matches `docs/cto/cb-clerk-ticket-signin-dispatch-20260614.md`.
3. Confirm `/sign-in-token` is app-owned and does not depend on Clerk's hosted sign-in-token landing page.
4. Confirm it uses Clerk React `useSignIn().signIn.create({ strategy:"ticket", ticket })` and `useClerk().setActive(...)`.
5. Confirm the ticket value is scrubbed from browser history and is not rendered/logged/serialized.
6. Confirm only same-origin path redirects are accepted and the default is `/flow-hub/production`.
7. Confirm anonymous/no-session `/api/me`, `AUTH_REQUIRED=false`, `/sign-in`, `/sign-up`, and bearer-token `/api/me` behavior are preserved.
8. Confirm tests cover the required behavior and do not overclaim live proof.
9. Confirm no canonical docs, matrixArtifact, ProductSSOT, scoring, governance, or VERIFIED movement.
10. Confirm Browser Test Instructions are complete and instruct CT2 to use the FlowAI-owned ticket route, not the hosted Clerk URL.

## Verification To Run

At minimum:

```text
git fetch origin
git checkout fix/clerk-ticket-signin
npx vitest run tests/clerk-ticket-signin.test.js tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
git diff --check
```

Run `npm run build:preflight` and `npm run lint` if feasible. If not feasible, state why and whether CB's evidence is enough for CD.

## Report Format

Return one of:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

Include:

- Findings ordered by severity with file/line references.
- Verification commands and results.
- Claim impact check.
- Whether any finding blocks merge.
- Explicit statement: `VERIFIED movement: no`.

Do not edit runtime code. Do not edit canonical docs. Do not move matrixArtifact.
