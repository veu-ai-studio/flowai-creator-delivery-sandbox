# CT2 Clerk Ticket Sign-In Live Proof Result - 2026-06-14 UTC

FROM: CT2
TO: CTO
ACTION: LIVE_PRODUCTION browser acceptance proof for FlowAI-owned Clerk ticket sign-in route
Production URL: `https://flowai-dun.vercel.app`
Expected production deployment: `https://flowai-7ufisvpk3-veu-ai-studio.vercel.app`
Expected runtime commitFull: `34268c9d76399e10ec6c25cd485cf8fae1afd0a1`
VERIFIED movement: no

## Verdict

Verdict: `BLOCK`

Classification:

- Production identity: `PASS`
- Clerk readiness: `PASS`
- `/sign-in-token` app shell check: `PASS`
- Fresh anonymous `/api/me` before proof: `PASS`
- Disposable Clerk user creation: `PASS`
- Raw ticket creation: `PASS`
- Hosted Clerk `signInToken.url` not opened: `PASS`
- FlowAI-owned ticket route consumed/scrubbed ticket: `PASS`
- Ticket hidden from visible page text and committed evidence: `PASS`
- Signed-in Clerk app session: `PASS`
- App-origin authenticated `/api/me`: `PASS`
- Fresh anonymous `/api/me` after proof: `PASS`
- Disposable user cleanup: `PASS`
- Final route landing on `/flow-hub/production`: `BLOCK`
- Flow Hub Production load after ticket consumption: `BLOCK`

The key Clerk session and app-origin API acceptance passed, but the dispatch also requires the browser to land on `/flow-hub/production` after ticket consumption. The route scrubbed the ticket and established a Clerk session, but remained on `/sign-in-token` showing the missing-ticket state instead of redirecting/loading Flow Hub.

No matrixArtifact change. No VERIFIED movement.

## Method

Pulled `origin/main` before proof: already up to date.

Live proof used a fresh Playwright Chromium browser context from the repo dependency. The Codex in-app Browser setup was attempted first but failed locally with `windows sandbox failed: spawn setup refresh`.

Doppler was used to read `CLERK_SECRET_KEY` for project `flowai`, config `prd`, without printing the value.

The proof used the FlowAI-owned route only:

```text
https://flowai-dun.vercel.app/sign-in-token?ticket=<REDACTED_TOKEN>&redirect_url=/flow-hub/production
```

CT2 did not open Clerk's hosted `signInToken.url`.

Observed proof window:

- Started: `2026-06-14T04:57:24.095Z`
- Completed: `2026-06-14T04:57:52.684Z`

Redacted raw evidence:

- `docs/cto/ct2-clerk-ticket-signin-live-proof-raw-20260614.json`

## Production Identity

Endpoint: `https://flowai-dun.vercel.app/api/health`

Observed redacted excerpt:

```json
{
  "ok": true,
  "status": "ready",
  "commit": "34268c9d7639",
  "clerkReady": true,
  "checks": {
    "build": {
      "status": "PASS",
      "commitFull": "34268c9d76399e10ec6c25cd485cf8fae1afd0a1",
      "branch": "main",
      "deploymentUrl": "https://flowai-7ufisvpk3-veu-ai-studio.vercel.app"
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
  "commitFull": "34268c9d76399e10ec6c25cd485cf8fae1afd0a1",
  "commit": "34268c9d7639",
  "featureFlags": {
    "clerkReady": true,
    "authRequired": false
  }
}
```

Result: `PASS`.

## `/sign-in-token` Shell

Endpoint checked without a ticket:

- `https://flowai-dun.vercel.app/sign-in-token`

Observed:

```json
{
  "status": 200,
  "finalUrl": "https://flowai-dun.vercel.app/sign-in-token",
  "servedFlowAiShell": true,
  "visibleTextExcerpt": "Sign-in link is incomplete This sign-in link is missing its required ticket."
}
```

Result: `PASS`. The route served the FlowAI app shell and a non-secret missing-ticket state.

## Anonymous `/api/me`

Fresh no-session context before ticket proof:

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

Fresh no-session context after ticket proof:

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
flowai.ct2.ticket.20260614045735.[redacted]@example.com
```

Actions:

- created disposable Clerk user with first name `FlowAI` and last name `CT2`;
- generated a local password and did not print or commit it;
- created one-time Clerk sign-in token;
- used only `signInToken.token` as a FlowAI route ticket;
- did not open Clerk's hosted `signInToken.url`;
- deleted the disposable Clerk user during cleanup.

Observed redacted status:

```json
{
  "created": true,
  "rawUserIdPresent": true,
  "signInTokenCreated": true,
  "rawTicketPresent": true,
  "hostedUrlPresentButNotOpened": true,
  "cleanupAttempted": true,
  "userDeleted": true
}
```

Result: `PASS`.

## Ticket Route Behavior

FlowAI-owned ticket route was opened in a fresh browser context with a redacted ticket and redirect URL:

```text
/sign-in-token?ticket=<REDACTED_TOKEN>&redirect_url=/flow-hub/production
```

Observed redacted route state:

```json
{
  "status": 200,
  "finalUrl": "https://flowai-dun.vercel.app/sign-in-token",
  "sameOriginFinal": true,
  "finalPathIsFlowHub": false,
  "finalUrlHasTicket": false,
  "visibleTextContainsTicket": false,
  "pageDoesNotExposeTicket": true,
  "addressBarScrubbed": true,
  "visibleTextExcerpt": "Sign-in link is incomplete This sign-in link is missing its required ticket."
}
```

Result:

- Ticket scrubbing: `PASS`
- Ticket not visible: `PASS`
- Same-origin final URL: `PASS`
- Final path `/flow-hub/production`: `BLOCK`
- Flow Hub Production loaded after ticket consumption: `BLOCK`

The route consumed the ticket well enough to establish a Clerk app session, but it did not complete the redirect/load requirement.

## Clerk App Session

Redacted Clerk frontend state after ticket consumption:

```json
{
  "clerkLoaded": true,
  "signedIn": true,
  "sessionPresent": true,
  "userPresent": true,
  "tokenPresent": true,
  "tokenError": null
}
```

Result: `PASS`.

## App-Origin `/api/me`

CT2 did not use direct address-bar `/api/me` as authenticated proof.

From the FlowAI app origin, CT2 obtained a Clerk session token in browser-page JavaScript and called `/api/me` with an Authorization header. The token value was never printed or stored.

Observed redacted app-origin `/api/me` result:

```json
{
  "ok": true,
  "status": 200,
  "tokenPresent": true,
  "redactedJson": {
    "authenticated": true,
    "authMode": "clerk",
    "userId": "[redacted-present]",
    "orgId": null,
    "productId": null,
    "config": {
      "authRequired": false,
      "clerkConfigured": true
    }
  }
}
```

Observed app `/api/me` network evidence included bearer-authenticated calls:

```json
{
  "request": {
    "url": "/api/me",
    "authorizationHeaderPresent": true
  },
  "response": {
    "status": 200,
    "redactedJson": {
      "authenticated": true,
      "authMode": "clerk",
      "userId": "[redacted-present]",
      "config": {
        "authRequired": false,
        "clerkConfigured": true
      }
    }
  }
}
```

Result: `PASS`.

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

## Screenshot Evidence

- `docs/cto/screenshots/ct2-clerk-ticket-signin-api-health-2026-06-14T04-57-24-095Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-signin-api-version-2026-06-14T04-57-24-095Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-signin-sign-in-token-shell-no-ticket-2026-06-14T04-57-24-095Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-signin-api-me-anonymous-before-2026-06-14T04-57-24-095Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-signin-post-ticket-route-2026-06-14T04-57-24-095Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-signin-app-origin-api-me-after-fetch-2026-06-14T04-57-24-095Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-signin-api-me-anonymous-after-2026-06-14T04-57-24-095Z.png`

Screenshots were captured only after checking visible page text for the raw ticket. The raw ticket did not appear in visible page text.

## Secret Handling Confirmation

Not printed or committed:

- `CLERK_SECRET_KEY`
- raw ticket/token value
- Clerk hosted sign-in token URL
- bearer token value
- Authorization header value
- browser cookies
- generated password
- raw Clerk user ID

Committed evidence is redacted docs-only evidence.

## Final CT2 Finding

The FlowAI-owned ticket route resolves the core Clerk session boundary: it establishes a signed-in Clerk app session and app-origin `/api/me` returns `authenticated:true`, `authMode:"clerk"`.

The remaining blocker is route completion: after ticket consumption, the browser stays on `/sign-in-token` with the missing-ticket state instead of landing on `/flow-hub/production`. Because the dispatch requires `/flow-hub/production` to load after ticket consumption, CT2 returns `BLOCK`.

VERIFIED movement: no
