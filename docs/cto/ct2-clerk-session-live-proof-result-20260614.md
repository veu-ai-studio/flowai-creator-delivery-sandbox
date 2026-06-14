# CT2 Clerk Session Live Proof Result - 2026-06-14 UTC

FROM: CT2
TO: CTO
Scope: LIVE_PRODUCTION browser acceptance - Clerk app-origin session proof
Production URL: `https://flowai-dun.vercel.app`
Expected runtime commit: `021212d2ebf52511493869e7fea9270a7865db31`
Deployment URL: `https://flowai-799ng2frz-veu-ai-studio.vercel.app`
VERIFIED movement: no

## Verdict

Verdict: `BLOCK`

Classification:

- Production identity: `PASS`
- `/api/health` auth readiness: `PASS`
- `/api/version` runtime identity: `PASS`
- Fresh anonymous `/api/me`: `PASS`
- Disposable Clerk user creation: `PASS`
- One-time sign-in token creation: `PASS`
- Flow Hub Production app load after token URL: `PASS`
- App-origin Clerk authenticated `/api/me`: `BLOCK`
- Disposable Clerk user cleanup: `PASS`

The key acceptance was not met. From the FlowAI app origin, Clerk loaded but did not expose an active signed-in session, so no Clerk token was available for the app-origin `/api/me` fetch. The app-origin `/api/me` proof therefore did not return `authenticated:true` / `authMode:"clerk"`.

This result does not justify any matrixArtifact `VERIFIED` movement.

## Method

Pulled `origin/main` before proof: already up to date.

Live proof was executed against production using a fresh Playwright Chromium browser context. The Codex in-app Browser setup failed locally with `windows sandbox failed: spawn setup refresh`, so CT2 used the repo-installed Playwright dependency for the browser proof.

Doppler was used to read `CLERK_SECRET_KEY` for project `flowai`, config `prd`, without printing the value.

Observed proof window:

- Started: `2026-06-14T03:36:15.832Z`
- Completed: `2026-06-14T03:36:43.979Z`

Redacted raw evidence:

- `docs/cto/ct2-clerk-session-live-proof-raw-20260614.json`

## Production Identity

Endpoint: `https://flowai-dun.vercel.app/api/health`

Observed redacted excerpt:

```json
{
  "ok": true,
  "status": "ready",
  "commit": "021212d2ebf5",
  "clerkReady": true,
  "checks": {
    "build": {
      "status": "PASS",
      "commitFull": "021212d2ebf52511493869e7fea9270a7865db31",
      "branch": "main",
      "deploymentUrl": "https://flowai-799ng2frz-veu-ai-studio.vercel.app"
    },
    "auth": {
      "status": "PASS",
      "clerkConfigured": true,
      "frontendPublishableKeyPresent": true,
      "authRequired": false,
      "reason": null
    }
  }
}
```

Result: `PASS`. Runtime commit and deployment URL matched the dispatch.

Endpoint: `https://flowai-dun.vercel.app/api/version`

Observed redacted excerpt:

```json
{
  "commitFull": "021212d2ebf52511493869e7fea9270a7865db31",
  "commit": "021212d2ebf5",
  "featureFlags": {
    "clerkReady": true,
    "authRequired": false
  }
}
```

Result: `PASS`.

## Anonymous `/api/me`

Fresh no-session context endpoint: `https://flowai-dun.vercel.app/api/me`

Observed:

```json
{
  "authenticated": false,
  "authMode": "anonymous",
  "userId": null,
  "orgId": null,
  "productId": null,
  "config": {
    "authRequired": false,
    "clerkConfigured": true
  }
}
```

Result: `PASS`. Anonymous mode remains open while `AUTH_REQUIRED=false`.

## Disposable Clerk User

Disposable email identifier:

```text
flowai.ct2.session.20260614033622.[redacted]@example.com
```

Actions:

- created disposable Clerk user with first name `FlowAI` and last name `CT2`;
- generated a local password and did not print or commit it;
- created a one-time sign-in token with `expiresInSeconds: 600`;
- did not print or commit the sign-in token URL;
- deleted the disposable Clerk user during cleanup.

Observed redacted status:

```json
{
  "created": true,
  "rawUserIdPresent": true,
  "signInTokenCreated": true,
  "cleanupAttempted": true,
  "userDeleted": true
}
```

Result: `PASS`.

## Browser Session And App Load

The one-time sign-in token URL opened in a fresh browser context. The hosted Clerk landing page showed this visible blocker text:

```text
Development mode. You are signed in, but Clerk cannot redirect to your application
```

CT2 then navigated in the same browser context to `https://flowai-dun.vercel.app/flow-hub/production`.

Observed:

```json
{
  "flowHubStatus": 200,
  "flowHubFinalUrl": "https://flowai-dun.vercel.app/flow-hub/production",
  "flowHubLoaded": true
}
```

Visible app text included `Flow Hub - Production` and `FlowAI Ready`.

Result: Flow Hub app load `PASS`, Clerk app session establishment `BLOCK`.

## App-Origin `/api/me`

Required acceptance:

```json
{
  "authenticated": true,
  "authMode": "clerk"
}
```

CT2 did not use direct address-bar `/api/me` as authenticated proof. From the FlowAI app page, CT2 attempted browser-page JavaScript in the app origin to obtain a Clerk token and fetch `/api/me` with an Authorization header. The token value was never printed or stored.

Observed redacted Clerk state from the FlowAI app page:

```json
{
  "clerkLoaded": true,
  "signedIn": false,
  "sessionPresent": false,
  "userPresent": false,
  "tokenPresent": false,
  "tokenError": null
}
```

Observed app-origin fetch result:

```json
{
  "ok": false,
  "status": null,
  "error": "Clerk session getToken unavailable",
  "tokenPresent": false,
  "redactedJson": null
}
```

Observed automatic `/api/me` network event during app load:

```json
{
  "request": {
    "url": "/api/me",
    "authorizationHeaderPresent": false
  },
  "response": {
    "status": 200,
    "redactedJson": {
      "authenticated": false,
      "authMode": "anonymous",
      "userId": null,
      "orgId": null,
      "productId": null,
      "config": {
        "authRequired": false,
        "clerkConfigured": true
      }
    }
  }
}
```

Result: `BLOCK`. The app-origin authenticated Clerk `/api/me` proof did not pass.

## Screenshot Evidence

- `docs/cto/screenshots/ct2-clerk-session-api-health-2026-06-14T03-36-15-832Z.png`
- `docs/cto/screenshots/ct2-clerk-session-api-version-2026-06-14T03-36-15-832Z.png`
- `docs/cto/screenshots/ct2-clerk-session-api-me-anonymous-2026-06-14T03-36-15-832Z.png`
- `docs/cto/screenshots/ct2-clerk-session-token-landing-redacted-2026-06-14T03-36-15-832Z.png`
- `docs/cto/screenshots/ct2-clerk-session-flow-hub-production-authenticated-context-2026-06-14T03-36-15-832Z.png`
- `docs/cto/screenshots/ct2-clerk-session-app-origin-api-me-after-fetch-2026-06-14T03-36-15-832Z.png`

## Cleanup Result

Cleanup result: `PASS`

```json
{
  "attempted": true,
  "userDeleted": true,
  "error": null
}
```

The disposable Clerk user was deleted successfully. Raw Clerk user ID was not committed.

## Secret Handling Confirmation

Not printed or committed:

- `CLERK_SECRET_KEY`
- sign-in token URL
- sign-in token value
- bearer token value
- Authorization header value
- browser cookies
- generated password
- raw Clerk user ID

Committed evidence is redacted docs-only evidence.

## Final CT2 Finding

The deployed runtime identity and readiness checks are correct, anonymous mode remains open, and backend Clerk disposable user/token setup works. The remaining live blocker is that the one-time token sign-in lands on a hosted Clerk development page with `Development mode. You are signed in, but Clerk cannot redirect to your application`; after navigating to FlowAI, the app has `clerkLoaded:true` but `signedIn:false`, `sessionPresent:false`, and no available token for app-origin `/api/me`.

VERIFIED movement: no
