# CT2 Clerk Session Live Proof Rerun Result - 2026-06-14 UTC

FROM: CT2
TO: CTO
Scope: LIVE_PRODUCTION rerun - Clerk session proof after redirect allow-list fix
Production URL: `https://flowai-dun.vercel.app`
Expected runtime commit: `021212d2ebf52511493869e7fea9270a7865db31`
Expected deployment: `https://flowai-799ng2frz-veu-ai-studio.vercel.app`
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
- Hosted Clerk token redirect to FlowAI: `BLOCK`
- Flow Hub Production app load after token URL: `PASS`
- FlowAI app Clerk session establishment: `BLOCK`
- App-origin authenticated `/api/me`: `BLOCK`
- Disposable Clerk user cleanup: `PASS`

The rerun did not meet the key acceptance. After CTO's redirect allow-list fix, the hosted Clerk token page still showed:

```text
Development mode. You are signed in, but Clerk cannot redirect to your application
```

After navigating to FlowAI, the app loaded but had no signed-in Clerk session and no token available for an app-origin `/api/me` authenticated fetch.

No matrixArtifact entry should move. No `VERIFIED` movement.

## Method

Pulled `origin/main` before proof: already up to date.

Live proof used a fresh Playwright Chromium browser context from the repo dependency. The Codex in-app Browser setup was attempted first but failed locally with `windows sandbox failed: spawn setup refresh`, matching the prior CT2 environment behavior.

Doppler was used to read `CLERK_SECRET_KEY` for project `flowai`, config `prd`, without printing the value.

Observed proof window:

- Started: `2026-06-14T03:58:58.654Z`
- Completed: `2026-06-14T03:59:33.771Z`

Redacted raw evidence:

- `docs/cto/ct2-clerk-session-live-proof-rerun-raw-20260614.json`

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

Result: `PASS`.

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
flowai.ct2.rerun.20260614035904.[redacted]@example.com
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

## Hosted Token Landing

The one-time sign-in-token URL opened successfully in a fresh browser context, but Clerk did not redirect to FlowAI.

Observed redacted landing evidence:

```json
{
  "opened": true,
  "redirectedToFlowAi": false,
  "cannotRedirectTextPresent": true,
  "visibleTextExcerpt": "Secured by Development mode. You are signed in, but Clerk cannot redirect to your application Welcome, FlowAI You are signed in. Now, it's time to connect Clerk to your application. START BUILDING My account | FlowAI"
}
```

The page offered `START BUILDING`, not a FlowAI continue/open action. Because the blocker text was still present, CT2 classified this as `BLOCK` per dispatch.

## FlowAI App Session State

CT2 then navigated in the same browser context to:

- `https://flowai-dun.vercel.app/flow-hub/production`

Observed:

```json
{
  "flowHubStatus": 200,
  "flowHubFinalUrl": "https://flowai-dun.vercel.app/flow-hub/production",
  "flowHubLoaded": true
}
```

Visible app text included `Flow Hub - Production` and `FlowAI Ready`.

Redacted Clerk state from the FlowAI app page:

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

Result: Flow Hub app load `PASS`; app-origin Clerk session establishment `BLOCK`.

## App-Origin `/api/me`

CT2 did not use direct address-bar `/api/me` as authenticated proof.

From the FlowAI app page, CT2 attempted the accepted app-origin path: read the Clerk session token if present, then fetch `/api/me` with an Authorization header. The token value was never printed or stored.

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

Observed automatic app `/api/me` network event:

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

Result: `BLOCK`. The required `authenticated:true` / `authMode:"clerk"` app-origin proof did not pass.

## Screenshot Evidence

- `docs/cto/screenshots/ct2-clerk-session-rerun-api-health-2026-06-14T03-58-58-654Z.png`
- `docs/cto/screenshots/ct2-clerk-session-rerun-api-version-2026-06-14T03-58-58-654Z.png`
- `docs/cto/screenshots/ct2-clerk-session-rerun-api-me-anonymous-2026-06-14T03-58-58-654Z.png`
- `docs/cto/screenshots/ct2-clerk-session-rerun-token-landing-redacted-2026-06-14T03-58-58-654Z.png`
- `docs/cto/screenshots/ct2-clerk-session-rerun-flow-hub-production-auth-context-2026-06-14T03-58-58-654Z.png`
- `docs/cto/screenshots/ct2-clerk-session-rerun-app-origin-api-me-after-fetch-2026-06-14T03-58-58-654Z.png`

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

The redirect allow-list correction did not resolve the hosted Clerk token landing blocker in this rerun. The same blocker text remained visible, FlowAI app state remained signed out, and the app-origin `/api/me` authenticated proof could not run because Clerk had no session token available on the FlowAI app origin.

Per the CTO session brief next-step rules, this is the same hosted redirect blocker and should escalate to a Clerk dashboard/domain action packet.

VERIFIED movement: no
