# CT2 Clerk Auth Token Session Proof Result - 2026-06-13 Local / 2026-06-14 UTC

FROM: CT2
TO: CTO
Scope: LIVE_PRODUCTION browser acceptance - Clerk authenticated session via disposable test user
Production URL: `https://flowai-dun.vercel.app`
Expected runtime commit: `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`
VERIFIED movement: no

## Verdict

Verdict: `BLOCK`

Classification:

- Production identity: `PASS`
- Clerk backend disposable user creation: `PASS`
- Clerk backend sign-in token creation: `PASS`
- Browser token URL open: `PASS`
- Authenticated `/api/me` Clerk context: `BLOCK`
- Disposable user cleanup: `PASS`

This does not justify any matrixArtifact `VERIFIED` movement.

## Method

Pulled `origin/main` before proof: already up to date.

Doppler was used to read `CLERK_SECRET_KEY` for project `flowai`, config `prd`, without printing the value.

The installed repo SDKs were used:

- `@clerk/clerk-sdk-node` with `createClerkClient({ secretKey })`
- `client.users.createUser(...)`
- `client.signInTokens.createSignInToken(...)`
- `client.users.deleteUser(...)`
- Playwright Chromium fresh browser context for the token URL and `/api/me` navigation

Note: the Codex in-app Browser setup failed before the proof with local tooling error `windows sandbox failed: spawn setup refresh`, so CT2 used a fresh Playwright Chromium browser context from the repo dependency. No token URL, cookie, password, or Clerk secret value was printed or committed.

Observed proof window: `2026-06-14T02:43:59.360Z` to `2026-06-14T02:44:08.157Z` UTC.

## Production Identity

Endpoint: `https://flowai-dun.vercel.app/api/health`

Observed redacted excerpt:

```json
{
  "status": "ready",
  "commit": "dabdce72e13e",
  "checks": {
    "build": {
      "status": "PASS",
      "commitFull": "dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c",
      "branch": "main"
    },
    "auth": {
      "status": "PASS",
      "clerkConfigured": true,
      "authRequired": false
    }
  }
}
```

Result: `PASS`. Runtime commit matched the dispatch and auth health was `PASS`.

## Disposable Identity

Disposable email identifier: `flowai.ct2.session.20260614024359.[redacted]@example.com`

Actions:

- created disposable Clerk user with first name `FlowAI` and last name `CT2`;
- generated password locally and did not print or commit it;
- added CT2 disposable metadata;
- created a one-time sign-in token with `expiresInSeconds: 600`;
- did not print or commit the sign-in token URL.

Observed:

```json
{
  "userCreated": true,
  "userIdPresent": true,
  "tokenCreated": true,
  "tokenUrlOpened": true,
  "browserSessionSucceeded": false
}
```

## Browser Session Check

The one-time token URL was opened in a fresh browser context. CT2 then navigated to `https://flowai-dun.vercel.app/api/me` in the same context.

Observed `/api/me` redacted excerpt:

```json
{
  "authenticated": false,
  "authMode": "anonymous",
  "userId": null,
  "config": {
    "clerkConfigured": true,
    "authRequired": false
  }
}
```

HTTP status: `200`.

Expected according to dispatch:

```json
{
  "authenticated": true,
  "authMode": "clerk",
  "userId": "[present-redacted]",
  "config": {
    "clerkConfigured": true,
    "authRequired": false
  }
}
```

Result: `BLOCK`. The token URL opened, but the production `/api/me` endpoint still returned anonymous context in the same browser context.

## Cleanup

Cleanup was attempted after the browser check.

Observed:

```json
{
  "attempted": true,
  "userDeleted": true,
  "blocker": null
}
```

Result: `PASS`. The disposable Clerk user was deleted successfully.

## Exact Blocker

`/api/me` authenticated Clerk context check failed after token URL browser open:

```json
{
  "authenticated": false,
  "authMode": "anonymous",
  "userId": null,
  "config": {
    "clerkConfigured": true,
    "authRequired": false
  }
}
```

This is a session/domain propagation blocker, not a backend Clerk API creation blocker. Clerk user creation and sign-in token creation both succeeded; cleanup also succeeded.

## Secret Handling

Not committed:

- `CLERK_SECRET_KEY`
- sign-in token URL or token value
- browser cookies
- generated password
- raw Clerk user ID

Committed evidence is redacted docs-only evidence.

VERIFIED movement: no
