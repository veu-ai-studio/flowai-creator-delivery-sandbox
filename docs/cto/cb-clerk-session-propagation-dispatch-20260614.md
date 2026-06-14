# CB Dispatch - Clerk Session Propagation

FROM: CTO
TO: CB
ACTION: BUILD - Clerk authenticated session propagation
Branch: `fix/clerk-session-propagation`
Base: current `origin/main` at dispatch time
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

Read these first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/clerk-session-boundary-analysis-20260614.md`

## Problem

Clerk envs and routes are live, but FlowAI has not proven a real authenticated Clerk session.

Evidence:

- CT2 live route proof: `docs/cto/ct2-clerk-auth-live-proof-result-20260613.md`
- CT2 token-session proof: `docs/cto/ct2-clerk-auth-token-session-proof-result-20260613.md`

Current failure:

- Public sign-up hits Cloudflare human verification.
- Backend-created Clerk user and sign-in token succeeded.
- Direct `/api/me` navigation still returned anonymous.
- Code inspection shows `/api/me` accepts bearer tokens, but frontend `AuthContext` never asks Clerk React for a token and never sends `Authorization: Bearer`.

## Scope

Implement a focused fix so a Clerk-authenticated browser session can propagate to FlowAI `/api/me` and return:

```json
{
  "authenticated": true,
  "authMode": "clerk",
  "userId": "[present]",
  "config": {
    "clerkConfigured": true,
    "authRequired": false
  }
}
```

Expected files likely affected:

- `src/App.jsx`
- `src/lib/AuthContext.jsx`
- tests for Clerk auth context/session propagation
- tests for server auth bearer verification if coverage is missing
- `docs/cto/cb-clerk-session-propagation-evidence-20260614.md`

Do not broaden into unrelated auth enforcement or product work.

## Required Implementation Shape

1. Preserve `AUTH_REQUIRED=false`.

2. Preserve anonymous access when no Clerk session is present.

3. Preserve the server-side intake contract:
   - `Authorization: Bearer <token>`
   - `__session` cookie fallback

4. Add a Clerk-aware frontend bridge that only calls Clerk React hooks when `ClerkProvider` is active.
   - Avoid calling Clerk hooks outside a Clerk provider when `VITE_CLERK_PUBLISHABLE_KEY` is absent.
   - Import Clerk React auth hook as an alias, for example `useAuth as useClerkAuth`, so it does not collide with FlowAI's own `useAuth` export.

5. Have FlowAI `AuthContext` request a Clerk token when Clerk is loaded and signed in.
   - Use the installed Clerk React API: `useAuth().getToken()`.
   - Attach `Authorization: Bearer <token>` to `/api/me`.
   - Keep `credentials:'include'` as a fallback, not the only mechanism.

6. Treat Clerk-loading state correctly.
   - Do not permanently mark the user anonymous before Clerk has loaded.
   - If Clerk is not configured, current anonymous behavior must continue.

7. Do not rely on the old internal `/api/auth/session` path.
   - That path is separate from Clerk and does not prove Clerk sign-up/sign-in.

8. Do not change:
   - `docs/CANONICAL_REFERENCE.md`
   - `docs/BUILD_PROTOCOL.md`
   - `docs/IMPLEMENTATION_PLAN.md`
   - matrixArtifact
   - VERIFIED status

## Tests Required

Run and report:

- Focused Clerk/auth tests you add or update.
- Existing Clerk route tests.
- Server auth tests covering bearer-token verification into `getRequestContext` or `/api/me`.
- `npm run build:preflight`
- `npm run lint`
- `git diff --check`

If full `npm run preflight` is feasible, run it. If it is not feasible, document why and run the strongest accepted subset.

Minimum test assertions:

- No Clerk provider/key: `AuthContext` does not call Clerk hooks and preserves anonymous behavior.
- Clerk loaded but signed out: `/api/me` is called without bearer token and anonymous mode remains valid.
- Clerk loaded and signed in: `getToken()` is called and `/api/me` receives `Authorization: Bearer <token>`.
- Server bearer path: mocked Clerk SDK verification returns a payload and `/api/me` or `getRequestContext` returns `authMode:"clerk"`.
- Secret hygiene: no test output or docs include token values, cookies, passwords, Clerk secrets, or raw user IDs.

## Browser Test Instructions To Produce

Your DoD must include CT2 instructions for the correct proof shape.

CT2 should not use only direct address-bar navigation to `/api/me`, because that does not attach a bearer header.

CT2 proof should:

1. Confirm production `/api/health` runtime commit after merge/promotion.
2. Create a disposable Clerk user and sign-in token through the backend SDK without printing secrets/tokens.
3. Open the sign-in token URL in a fresh browser context.
4. Navigate to `https://flowai-dun.vercel.app/flow-hub/production` in the same context.
5. From the app page, confirm Clerk is loaded and signed in.
6. Confirm FlowAI app state or an app-origin fetch to `/api/me` returns `authenticated:true` and `authMode:"clerk"`.
7. Confirm `/api/me` still returns anonymous in a fresh no-session context while `AUTH_REQUIRED=false`.
8. Delete the disposable Clerk user.

Committed CT2 evidence must redact:

- `CLERK_SECRET_KEY`
- sign-in token URL or token value
- browser cookies
- generated password
- raw Clerk user ID
- Authorization header value

## STOP Conditions

STOP and report if:

- `@clerk/clerk-react` does not expose `useAuth().getToken()` in the installed package.
- Server Clerk verification cannot validate bearer tokens through the current SDK path.
- Fixing this requires enabling `AUTH_REQUIRED=true`.
- Fixing this requires disabling Clerk/Cloudflare human verification globally.
- Fixing this requires adding a product-specific auth rule.
- Any evidence would require committing or printing secrets, raw tokens, cookies, passwords, or raw user IDs.
- The branch would need canonical SSOT or matrixArtifact changes.

## Mandatory DoD Fields

Include these exact fields:

```text
Mocked tests used: yes/no
Unmocked runtime proof: yes/no/N-A with reason
Production URL serving HEAD commit SHA verified: yes/no/N-A with reason
Proof labels used: UNIT / MOCKED_E2E / LIVE_PREVIEW / LIVE_PRODUCTION
Evidence tier claimed: A / B / C / none
Claim impact: no movement / STUBBED->PARTIAL / PARTIAL->WIRED / PARTIAL->VERIFIED
VERIFIED movement: yes/no
```

Expected claim impact:

- `PARTIAL->WIRED` at most for Clerk authenticated session propagation if tests pass.
- No VERIFIED movement.

## Review Path

After CB pushes the branch:

1. CTO dispatches CD and CR Step 5 review through repo prompts.
2. CD and CR must both PASS before merge.
3. CTO merges, deploys, and promotes.
4. CT2 runs live proof.
5. W04/CEO handles any VERIFIED promotion separately.
