# CR Step 5 Review Prompt - Clerk App-Owned Ticket Sign-In

FROM: CTO
TO: CR
ACTION: STEP 5 ADVERSARIAL REVIEW - Clerk app-owned ticket sign-in route
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

## Adversarial Focus

Changed files on branch:

- `src/App.jsx`
- `src/pages/ClerkTicketSignInPage.jsx`
- `tests/clerk-ticket-signin.test.js`
- `docs/cto/cb-clerk-ticket-signin-evidence-20260614.md`

Primary question:

Does this patch create a safe, honest app-owned route for consuming a Clerk one-time sign-in token as a ticket, without leaking secrets or overclaiming live proof?

## Required Adversarial Checks

1. Secret leakage:
   - Does any code/test/doc print, persist, render, log, or commit real Clerk tokens, token URLs, cookies, passwords, Authorization headers, secrets, or raw user IDs?

2. Ticket handling:
   - Is the ticket scrubbed from browser history early enough?
   - Could the ticket remain visible after successful or failed route load?
   - Is the ticket ever included in UI text, error text, or evidence docs?

3. Redirect safety:
   - Are external redirects blocked?
   - Are protocol-relative redirects (`//host`) blocked?
   - Are backslash/malformed redirects blocked?
   - Is the default redirect safe?

4. Auth behavior:
   - Does the patch preserve `AUTH_REQUIRED=false` and anonymous `/api/me`?
   - Does it avoid weakening existing Clerk `/sign-in` and `/sign-up` routes?
   - Does it avoid changing server auth/governance behavior?

5. Evidence honesty:
   - Does CB claim only UNIT/Tier B and `PARTIAL->WIRED` at most?
   - Is unmocked runtime proof correctly N-A until CT2?
   - Is there any hidden VERIFIED movement or matrixArtifact change?

6. Dispatch compliance:
   - Does implementation match `docs/cto/cb-clerk-ticket-signin-dispatch-20260614.md`?
   - Are STOP conditions avoided honestly?
   - Are CT2 instructions sufficient to prove live behavior without exposing ticket material?

## Verification To Run

At minimum:

```text
git fetch origin
git checkout fix/clerk-ticket-signin
npx vitest run tests/clerk-ticket-signin.test.js tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
git diff --check
```

Run targeted grep/scan for risky strings if useful, especially around `ticket`, `Authorization`, `CLERK_SECRET_KEY`, and raw token output.

Run `npm run build:preflight` / `npm run lint` if feasible; otherwise state why not.

## Report Format

Return one of:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

Include:

- Evidence-tied findings only, ordered by severity.
- Commands run and results.
- Secret/evidence-honesty check.
- Claim impact check.
- Explicit statement: `VERIFIED movement: no`.

Do not edit runtime code. Do not edit canonical docs. Do not move matrixArtifact.
