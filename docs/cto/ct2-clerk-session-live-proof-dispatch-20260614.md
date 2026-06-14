# CT2 Dispatch - Clerk Session Live Proof

FROM: CTO
TO: CT2
ACTION: LIVE_PRODUCTION browser acceptance - Clerk app-origin session proof
Production URL: `https://flowai-dun.vercel.app`
Expected runtime commit: `021212d2ebf52511493869e7fea9270a7865db31`
Deployment URL: `https://flowai-799ng2frz-veu-ai-studio.vercel.app`
Runtime branch: `main`
Runtime merge: `merge clerk session propagation`
VERIFIED movement: no

Read first:

- `docs/cto/current-directive.md`
- `docs/cto/clerk-session-boundary-analysis-20260614.md`
- `docs/cto/cb-clerk-session-propagation-evidence-20260614.md`
- `docs/cto/clerk-session-propagation-step5-result-20260614.md`

## Purpose

Prove or block the live production Clerk session propagation fix.

The exact behavior under test:

- a Clerk-authenticated browser session can reach FlowAI app code;
- FlowAI app code obtains a Clerk session token;
- FlowAI app-origin fetch to `/api/me` returns `authenticated:true` and `authMode:"clerk"`;
- anonymous `/api/me` still works in a fresh no-session context while `AUTH_REQUIRED=false`.

Do not move VERIFIED.

## Preconditions

Production public alias should report:

```text
GET https://flowai-dun.vercel.app/api/health
commitFull: 021212d2ebf52511493869e7fea9270a7865db31
checks.auth.status: PASS
clerkReady: true
checks.auth.authRequired: false
```

If production does not report that commit, STOP and report identity mismatch.

## Required Proof Steps

1. Pull current `origin/main`.

2. Confirm production identity:
   - `https://flowai-dun.vercel.app/api/health`
   - `https://flowai-dun.vercel.app/api/version`

3. Fresh anonymous check:
   - In a fresh no-session browser context or direct API check, call `https://flowai-dun.vercel.app/api/me`.
   - Expected: `authenticated:false`, `authMode:"anonymous"`, `config.authRequired:false`, `config.clerkConfigured:true`.

4. Create disposable Clerk user:
   - Use Doppler to read `CLERK_SECRET_KEY` without printing it.
   - Use installed repo SDKs to create a disposable Clerk user.
   - Create a one-time sign-in token.
   - Do not print or commit the secret, token URL, token value, password, cookies, or raw Clerk user ID.

5. Open sign-in token URL:
   - Use a fresh browser context.
   - Open the one-time sign-in token URL.
   - Then navigate in the same browser context to `https://flowai-dun.vercel.app/flow-hub/production`.

6. Confirm app loaded:
   - Expected page: Flow Hub Production loads normally.
   - Confirm Clerk is loaded and the browser context is signed in without exposing raw IDs or tokens.

7. Confirm app-origin `/api/me` authenticated context:
   - From the app page, run an app-origin fetch that uses the app's Clerk token propagation path.
   - Acceptable approaches:
     - inspect app state driven by `AuthContext`; or
     - execute browser-page JavaScript that obtains a token through Clerk in the page context and fetches `/api/me` with `Authorization: Bearer <token>`, while redacting the token from all logs/evidence.
   - Expected response:
     - `authenticated:true`
     - `authMode:"clerk"`
     - `config.authRequired:false`
     - `config.clerkConfigured:true`
   - Redact `userId`, `orgId`, token, cookie, password, and raw Clerk user ID from committed evidence.

8. Do not use direct address-bar `/api/me` as the only authenticated proof.
   - Direct address-bar navigation does not attach a bearer header and is not sufficient for this proof.

9. Cleanup:
   - Delete the disposable Clerk user.
   - Confirm cleanup success without committing raw user ID.

## PASS Criteria

Return `PASS` only if all are true:

- production identity matches expected commit;
- auth health remains PASS and no secret values are exposed;
- anonymous `/api/me` remains anonymous/open;
- app-origin authenticated `/api/me` returns `authenticated:true` and `authMode:"clerk"`;
- disposable user cleanup succeeds;
- committed evidence contains no Clerk secret, bearer token value, sign-in token URL, browser cookies, password, Authorization header value, or raw Clerk user ID.

## BLOCK Criteria

Return `BLOCK` if any are true:

- production identity mismatch;
- Clerk route/session cannot be established;
- app-origin `/api/me` remains anonymous after authenticated Clerk context;
- proof depends only on direct address-bar `/api/me`;
- anonymous `/api/me` breaks or `AUTH_REQUIRED` becomes true;
- any secret/token/cookie/password/raw-user-id material would need to be committed.

## Evidence To Commit

Commit a result doc to:

- `docs/cto/ct2-clerk-session-live-proof-result-20260614.md`

Optional redacted raw evidence:

- `docs/cto/ct2-clerk-session-live-proof-raw-20260614.json`

Optional screenshots:

- `docs/cto/screenshots/ct2-clerk-session-*`

Required result fields:

- Verdict: `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`
- Production URL
- Expected runtime commit
- Observed runtime commit
- Anonymous `/api/me` result
- Authenticated app-origin `/api/me` result, redacted
- Cleanup result
- Secret-handling confirmation
- VERIFIED movement: no
