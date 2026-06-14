# CT2 Dispatch - Clerk Auth Token Session Proof

FROM: CTO
TO: CT2
ACTION: LIVE_PRODUCTION browser acceptance - Clerk authenticated session via disposable test user
Production URL: `https://flowai-dun.vercel.app`
Expected runtime commit: `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`
Prior CT2 result: `docs/cto/ct2-clerk-auth-live-proof-result-20260613.md`
VERIFIED movement: no

## Purpose

The public sign-up route renders real Clerk UI, but live sign-up is blocked by Cloudflare human verification:

```text
Verify you are human
```

Do not attempt to solve or bypass CAPTCHA.

This follow-up proof uses Clerk's backend API to create a disposable test user and one-time sign-in token, then uses a browser to confirm FlowAI receives a real Clerk session at `/api/me`.

This proves Clerk session plumbing. It does not prove public self-service sign-up completion, which remains blocked until a human completes CAPTCHA or Clerk dashboard/test settings are adjusted.

## Safety Rules

- Do not commit Clerk secret values, sign-in token values, sign-in token URLs, session tokens, cookies, or password values.
- Use a disposable `example.com` identity only.
- Delete the disposable Clerk user after the proof.
- Do not use Victor's personal account.
- Do not move VERIFIED.
- Do not edit runtime code.

## Suggested Test Identity

Use:

```text
flowai.ct2.session.<timestamp>@example.com
```

Generate a random password locally. Do not commit it.

## Machine-Side Setup

Use the Clerk secret from Doppler without printing it:

```powershell
$env:CLERK_SECRET_KEY = doppler secrets get CLERK_SECRET_KEY --project flowai --config prd --plain
```

Use installed SDK APIs visible in the repo:

- `@clerk/clerk-sdk-node`
- `createClerkClient({ secretKey })`
- `client.users.createUser(...)`
- `client.signInTokens.createSignInToken(...)`
- `client.users.deleteUser(...)`

The sign-in token resource has a `url` field. Treat it as secret.

## Browser Proof

1. Confirm production identity:
   - Open `https://flowai-dun.vercel.app/api/health`.
   - Confirm `checks.build.commitFull` equals `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`.
   - Confirm `checks.auth.status:"PASS"`.

2. Create disposable test user through Clerk backend API:
   - email: `flowai.ct2.session.<timestamp>@example.com`
   - first name: `FlowAI`
   - last name: `CT2`
   - password: generated local value
   - metadata: mark as CT2 disposable if the API supports it.

3. Create one-time sign-in token for that user:
   - `expiresInSeconds`: 600 or less.
   - Do not print or commit the token URL.

4. Open the token URL in a fresh browser context.

5. Navigate to `https://flowai-dun.vercel.app/api/me` in the same browser context.

6. Expected:
   - `authenticated:true`
   - `authMode:"clerk"`
   - `userId` present
   - `config.clerkConfigured:true`
   - `config.authRequired:false`

7. Cleanup:
   - Delete the disposable Clerk user.
   - Confirm deletion succeeded or record exact cleanup blocker.

## PASS Criteria

Return PASS if:

- production identity matches expected commit;
- disposable Clerk user creation succeeds;
- token URL creates a real browser session;
- `/api/me` returns authenticated Clerk context;
- disposable user cleanup succeeds;
- no tokens, cookies, passwords, or secret values are committed.

Return PASS-WITH-FINDINGS if:

- browser session proof succeeds but cleanup requires manual Clerk dashboard cleanup;
- or user creation/sign-in token succeeds but Clerk redirects through a dashboard/domain condition that needs documented action.

Return BLOCK if:

- backend Clerk API cannot create disposable user;
- sign-in token URL cannot produce a browser session;
- `/api/me` remains anonymous after token sign-in;
- any secret/token/cookie value is exposed in committed evidence.

## Evidence Output

Write result doc:

- `docs/cto/ct2-clerk-auth-token-session-proof-result-20260613.md`

Include:

- verdict;
- production identity evidence;
- redacted disposable email identifier;
- whether user creation succeeded;
- whether sign-in-token browser session succeeded;
- redacted `/api/me` authenticated excerpt;
- cleanup result;
- exact blocker if any;
- `VERIFIED movement: no`.

Commit and push docs-only evidence to `origin/main`.
