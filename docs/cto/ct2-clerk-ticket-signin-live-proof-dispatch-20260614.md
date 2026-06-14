# CT2 Dispatch - Clerk Ticket Sign-In Live Production Proof

FROM: CTO
TO: CT2
ACTION: LIVE_PRODUCTION browser acceptance proof for FlowAI-owned Clerk ticket sign-in route
DATE: 2026-06-14 UTC

Read first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/session-brief.md`
- `docs/cto/clerk-ticket-signin-step5-result-20260614.md`

## Target

- Public production URL: `https://flowai-dun.vercel.app`
- Active deployment: `https://flowai-7ufisvpk3-veu-ai-studio.vercel.app`
- Expected commitFull: `34268c9d76399e10ec6c25cd485cf8fae1afd0a1`
- Expected branch: `main`
- Expected proof label: `LIVE_PRODUCTION`

## Scope

Prove that the FlowAI-owned `/sign-in-token` route establishes a real Clerk app session from a backend-created disposable user and one-time Clerk sign-in token.

This rerun must not use Clerk's hosted `signInToken.url`. Use `signInToken.token` only.

No VERIFIED movement is authorized.

## Pre-Check

1. Pull current `main`.
2. Verify production identity:
   - `https://flowai-dun.vercel.app/api/health`
   - PASS only if `checks.build.commitFull` equals `34268c9d76399e10ec6c25cd485cf8fae1afd0a1`.
   - PASS only if `checks.build.deploymentUrl` equals `https://flowai-7ufisvpk3-veu-ai-studio.vercel.app`.
   - PASS only if `clerkReady:true`.
3. Verify `https://flowai-dun.vercel.app/sign-in-token` serves the FlowAI app shell.
4. Verify a fresh no-session browser context still gets anonymous/open `/api/me` behavior while `AUTH_REQUIRED=false`.

## Proof Steps

1. Create a disposable Clerk user through the Clerk Backend API/SDK using secure local secret access.
   - Do not print or commit any secret.
   - Use a unique disposable email.

2. Create a Clerk sign-in token for that disposable user.
   - Do not open the hosted Clerk token URL.
   - Do not commit the token.
   - Use only the raw `signInToken.token` value in the browser navigation.

3. In a fresh browser context, navigate to:

   `https://flowai-dun.vercel.app/sign-in-token?ticket=<REDACTED_TOKEN>&redirect_url=/flow-hub/production`

4. Confirm route behavior:
   - Page does not expose the ticket in visible text.
   - Address bar is scrubbed so `ticket=` is not present after processing.
   - Final app path is `/flow-hub/production`.
   - Redirect remains same-origin; no external/protocol-relative redirect occurs.
   - No raw token appears in screenshots, logs, committed JSON, or result docs.

5. Confirm Clerk app session:
   - Clerk frontend is loaded.
   - `signedIn:true`.
   - `sessionPresent:true`.
   - `userPresent:true`.
   - Token availability is true, but the token value is never printed.

6. Confirm app-origin authenticated API behavior:
   - From the FlowAI app origin, call `/api/me` with the Clerk session token acquired through Clerk React `getToken()`.
   - PASS only if `/api/me` reports authenticated Clerk mode for the disposable user.
   - Redact user IDs/emails if included in committed evidence.

7. Confirm anonymous fallback preservation:
   - In a separate fresh no-session context, call `/api/me`.
   - PASS only if anonymous/open behavior remains intact while `AUTH_REQUIRED=false`.

8. Clean up the disposable Clerk user.
   - Confirm cleanup in the result doc.

## PASS Criteria

PASS only if all are true:

- Production identity matches expected `commitFull`.
- Production deployment URL matches expected deployment.
- `clerkReady:true`.
- `/sign-in-token` establishes a real signed-in Clerk app session.
- Ticket is scrubbed from URL and never appears in committed evidence.
- `/flow-hub/production` loads after ticket consumption.
- App-origin authenticated `/api/me` succeeds for the disposable user.
- Fresh no-session `/api/me` remains anonymous/open.
- Disposable user is cleaned up.

## BLOCK Criteria

BLOCK on any of these:

- Production identity mismatch or missing commit identity.
- Clerk route does not process `strategy:"ticket"`.
- Ticket remains in URL, UI, logs, screenshots, or committed evidence.
- Clerk frontend state remains unsigned after ticket consumption.
- App-origin `/api/me` cannot authenticate with Clerk session token.
- Cleanup fails.

## Evidence To Commit

Commit redacted evidence to `docs/cto/`:

- `docs/cto/ct2-clerk-ticket-signin-live-proof-result-20260614.md`
- `docs/cto/ct2-clerk-ticket-signin-live-proof-raw-20260614.json`
- Screenshots under `docs/cto/screenshots/` only if they contain no raw ticket/token.

Report `PASS` or `BLOCK` to CTO through the repo.

No VERIFIED movement.
