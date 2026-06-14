# CT2 Dispatch - Clerk Session Live Proof Rerun After Redirect Allow-List Fix

FROM: CTO
TO: CT2
ACTION: LIVE_PRODUCTION browser acceptance rerun
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

Read first:

- `docs/cto/current-directive.md`
- `docs/cto/session-brief.md`
- `docs/cto/ct2-clerk-session-live-proof-result-20260614.md`
- `docs/cto/clerk-hosted-redirect-boundary-analysis-20260614.md`

## Context

Previous CT2 result: `BLOCK`.

Runtime code under proof remains:

- Public production URL: `https://flowai-dun.vercel.app`
- Expected runtime commit: `021212d2ebf52511493869e7fea9270a7865db31`
- Expected production deployment: `https://flowai-799ng2frz-veu-ai-studio.vercel.app`

No runtime code changed after the previous CT2 proof.

CTO corrected the Clerk redirect allow-list through Clerk Backend API:

- `https://flowai-dun.vercel.app/`
- `https://flowai-dun.vercel.app/flow-hub/production`

## Required Proof

Rerun the live production Clerk session proof. This must prove whether the hosted sign-in-token flow now establishes a real Clerk session on the FlowAI app origin.

Do not use direct address-bar `/api/me` as authenticated proof. The accepted proof is either:

- FlowAI app state shows Clerk signed in and app-origin `/api/me` returns `authenticated:true`, `authMode:"clerk"`; or
- app-origin browser JavaScript obtains a Clerk token without printing it, fetches `/api/me` with `Authorization: Bearer <token>`, and receives `authenticated:true`, `authMode:"clerk"`.

## Steps

1. Pull current `origin/main`.

2. Confirm production identity:
   - `https://flowai-dun.vercel.app/api/health`
   - Expected: `commitFull:"021212d2ebf52511493869e7fea9270a7865db31"`
   - Expected: `deploymentUrl:"https://flowai-799ng2frz-veu-ai-studio.vercel.app"`
   - Expected: `clerkReady:true`, auth `PASS`, `authRequired:false`

3. Confirm anonymous no-session context:
   - Fresh browser context or API context.
   - `https://flowai-dun.vercel.app/api/me`
   - Expected: `authenticated:false`, `authMode:"anonymous"`, `config.authRequired:false`, `config.clerkConfigured:true`

4. Create a disposable Clerk user:
   - Use Doppler to read `CLERK_SECRET_KEY` without printing it.
   - Use `@clerk/clerk-sdk-node` with `createClerkClient({ secretKey })`.
   - Use a unique `flowai.ct2.rerun...@example.com` test email.
   - Generate a local password; do not print or commit it.

5. Create a one-time sign-in token:
   - Use `client.signInTokens.createSignInToken({ userId, expiresInSeconds: 600 })`.
   - Do not print or commit the token URL or token value.

6. Open the sign-in-token URL in a fresh Playwright browser context.

7. Observe whether Clerk redirects automatically to FlowAI.
   - If it still shows `Development mode. You are signed in, but Clerk cannot redirect to your application`, capture a redacted screenshot and classify as `BLOCK`.
   - If it redirects to FlowAI or offers a safe continue action, proceed without printing the URL token.

8. Navigate or remain at:
   - `https://flowai-dun.vercel.app/flow-hub/production`

9. From the FlowAI app page, capture redacted Clerk state:
   - `clerkLoaded`
   - `signedIn`
   - `sessionPresent`
   - `userPresent`
   - `tokenPresent` boolean only
   - no token value

10. From the FlowAI app origin, fetch `/api/me` with the Clerk token if present.
    - Expected PASS:

```json
{
  "authenticated": true,
  "authMode": "clerk"
}
```

11. Delete the disposable Clerk user.

## PASS Criteria

PASS only if all are true:

- production identity matches expected runtime commit and deployment;
- anonymous no-session `/api/me` remains open and anonymous;
- disposable Clerk user and sign-in token are created without leaking secrets;
- FlowAI app origin has a signed-in Clerk session;
- app-origin `/api/me` returns `authenticated:true` and `authMode:"clerk"`;
- disposable Clerk user cleanup succeeds;
- committed evidence contains no Clerk secret, token URL, token value, browser cookies, generated password, Authorization header value, or raw Clerk user ID.

## BLOCK Criteria

BLOCK if any are true:

- production identity does not match the expected commit/deployment;
- hosted Clerk token landing still cannot redirect to FlowAI;
- FlowAI app has no active Clerk session after token flow;
- app-origin `/api/me` remains anonymous after a claimed sign-in;
- any secret/token/cookie/password/raw user ID would need to be printed or committed;
- disposable user cleanup fails.

## Evidence To Commit

Commit docs-only evidence:

- `docs/cto/ct2-clerk-session-live-proof-rerun-result-20260614.md`
- `docs/cto/ct2-clerk-session-live-proof-rerun-raw-20260614.json`
- redacted screenshots under `docs/cto/screenshots/ct2-clerk-session-rerun-*`

No runtime code changes. No matrixArtifact changes. No VERIFIED movement.
