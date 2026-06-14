# CR Review Prompt - Clerk Session Propagation

FROM: CTO
TO: CR
ACTION: STEP 5 REVIEW - adversarial review for Clerk session propagation
Branch: `fix/clerk-session-propagation`
HEAD: `9264ce3ed08d6adbde6b0ce37c4a84e075c7560b`
Base: `main` at `c0450f260f1a67e98ad8f8d62187178efe5c6bb2`
Commit under review: `wire clerk bearer session propagation`

Read first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/clerk-session-boundary-analysis-20260614.md`
- `docs/cto/cb-clerk-session-propagation-dispatch-20260614.md`
- `docs/cto/cb-clerk-session-propagation-evidence-20260614.md` from the review branch

## Files Changed

- `src/App.jsx`
- `src/lib/AuthContext.jsx`
- `tests/clerk-session-propagation.test.js`
- `docs/cto/cb-clerk-session-propagation-evidence-20260614.md`

## CR Review Focus

CR is the focused adversarial reviewer for evidence, security, dispatch acceptance criteria, production/runtime proof, and governance bypass.

Please verify:

1. Does the branch avoid claiming live Clerk auth proof before CT2?
2. Does it avoid VERIFIED movement and matrixArtifact edits?
3. Does it avoid enabling `AUTH_REQUIRED=true` or breaking anonymous internal-proof mode?
4. Does it avoid using the old internal `/api/auth/session` path as proof of Clerk auth?
5. Does it avoid logging, committing, serializing, or requiring raw Clerk tokens, cookies, sign-in token URLs, passwords, secrets, or raw user IDs?
6. Does the bearer token header only get attached after Clerk is loaded and signed in?
7. Is there any route, hook, or render path where `useClerkAuth` can be called outside `ClerkProvider` when `VITE_CLERK_PUBLISHABLE_KEY` is absent?
8. Does the server-side test actually prove the request's `Authorization` header is verified by Clerk SDK mock, not by an unrelated auth path?
9. Are CT2 proof instructions adversarially correct, especially the warning that direct address-bar `/api/me` is not sufficient?
10. Does any new code introduce product-specific logic, secret leakage risk, or governance bypass?

## CB Reported Verification

```text
npx vitest run tests/clerk-session-propagation.test.js tests/clerk-auth-routes.test.js tests/auth.test.js tests/api-health-handler.test.js
npm run build:preflight
npm run lint
git diff --check
```

Reported result:

- Focused tests PASS, 4 files / 61 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## Required Output

Return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

CR may BLOCK only on evidence-tied failures against dispatch acceptance criteria, security, evidence, governance, or production/runtime proof requirements.

Include:

- Findings first, with file/line references where applicable.
- Claim impact check.
- Verification commands you ran or explicitly did not run.
- Whether mandatory BUILD_PROTOCOL DoD fields are present.
- Whether CR agrees no VERIFIED movement occurred.

If BLOCK, identify the exact patch required on the same branch.
