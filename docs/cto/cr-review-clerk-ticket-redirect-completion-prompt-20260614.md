# CR Review Prompt - Clerk Ticket Redirect Completion

FROM: CTO
TO: CR
ACTION: STEP 5 REVIEW - adversarial evidence/security review
DATE: 2026-06-14 UTC

Read first:

- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/cb-clerk-ticket-redirect-completion-dispatch-20260614.md`
- `docs/cto/ct2-clerk-ticket-signin-live-proof-result-20260614.md`
- `docs/cto/cb-clerk-ticket-redirect-completion-evidence-20260614.md` from the branch

## Branch Under Review

- Branch: `fix/clerk-ticket-redirect-completion`
- HEAD: `dbeeb454c129cd47be982b02820adcd1064040d7`
- Base: `2e6b5c97472865a6d4ae3bf4886a6410deede402`

Files changed:

- `src/pages/ClerkTicketSignInPage.jsx`
- `tests/clerk-ticket-signin.test.js`
- `docs/cto/cb-clerk-ticket-redirect-completion-evidence-20260614.md`

## Security/Evidence Context

The route now deals with a one-time Clerk ticket. The previous CT2 proof confirmed no raw ticket/token/secret was committed and proved Clerk session establishment, but blocked on final redirect/load.

This patch must not trade redirect completion for a token exposure or open redirect.

## Review Focus

Please adversarially check:

1. Does any raw ticket/token/secret/cookie/user ID get logged, rendered, committed, or retained in evidence?
2. Does the patch maintain prompt URL scrubbing?
3. Can `redirect_url` or `redirectUrl` be abused for external, protocol-relative, or backslash redirects?
4. Does the stable ticket capture keep the token in visible URL longer than before?
5. Does the patch regress Clerk `setActive(...)`, bearer `/api/me`, or anonymous fallback behavior?
6. Are CB's proof labels and evidence tier honest?
7. Is the claimed `PARTIAL->WIRED` movement acceptable, or should it be `no movement` until CT2 live rerun?
8. Is there any fabricated URL/deployment/VERIFIED claim?

## CB Reported Verification

- Focused tests: PASS, 5 files / 69 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check`: PASS.

## Required Output

Return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

CR may BLOCK only on concrete evidence/security/governance/proof failure against dispatch or protocol.

No VERIFIED movement.
