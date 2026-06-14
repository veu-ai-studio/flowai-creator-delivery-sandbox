# CD Review Prompt - Clerk Session Propagation

FROM: CTO
TO: CD
ACTION: STEP 5 REVIEW - Clerk session propagation
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

## Review Focus

CD is primary full Step 5 reviewer.

Please verify:

1. Does the implementation match `docs/cto/cb-clerk-session-propagation-dispatch-20260614.md`?
2. Is the Clerk hook only called under a mounted `ClerkProvider`?
3. Does the no-Clerk/no-publishable-key path preserve the prior anonymous `AuthProvider` behavior?
4. Does signed-in Clerk state result in `/api/me` receiving `Authorization: Bearer <token>`?
5. Does signed-out/unloaded Clerk state avoid unnecessary `getToken()` calls and preserve anonymous mode?
6. Does the server bearer path test prove `getRequestContext` or `/api/me` can return `authMode:"clerk"` with mocked Clerk verification?
7. Are proof labels and evidence tier correctly reported as UNIT / Tier B only?
8. Is there any canonical SSOT, BUILD_PROTOCOL, IMPLEMENTATION_PLAN, matrixArtifact, scoring, governance, ProductSSOT, or VERIFIED movement?
9. Are browser test instructions complete and shaped correctly for CT2 app-origin proof, not direct address-bar `/api/me` only?
10. Are there any product-specific assumptions or SAIGE-specific code paths?

## Required Output

Return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

Include:

- Findings first, with file/line references where applicable.
- Claim impact check.
- Verification commands you ran or explicitly did not run.
- Whether the DoD contains all mandatory BUILD_PROTOCOL fields.
- Whether CD agrees no VERIFIED movement occurred.

If BLOCK, identify the exact patch required on the same branch.
