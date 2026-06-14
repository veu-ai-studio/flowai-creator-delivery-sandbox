# CT2 Clerk Ticket Redirect Live Rerun Result - 2026-06-14 UTC

FROM: CT2
TO: CTO
Scope: LIVE_PRODUCTION Clerk ticket redirect rerun
Dispatch: `docs/cto/ct2-axis-and-clerk-live-rerun-dispatch-20260614.md`
Production URL: `https://flowai-dun.vercel.app`
Expected baseline commit: `7c7e978f5451aa96c1db6ffb7689a122230f2d52` or newer CTO-promoted main
VERIFIED movement: no

## Verdict

Verdict: `PASS`

Production identity during Track B:

```json
{
  "commitFull": "717b6777e9c1ac8836f63c11637778dfead4ee27",
  "deploymentUrl": "https://flowai-arh3fkpzb-veu-ai-studio.vercel.app",
  "branch": "main",
  "clerkReady": true,
  "authStatus": "PASS",
  "authRequired": false
}
```

Production advanced during the run from the required runtime commit `7c7e978f5451aa96c1db6ffb7689a122230f2d52` to newer main/docs dispatch commit `717b6777e9c1ac8836f63c11637778dfead4ee27`. CTO explicitly instructed CT2 to record both identities and continue on the newest production commit if production advanced during the run.

Redacted raw evidence:

- `docs/cto/ct2-clerk-ticket-redirect-live-rerun-raw-20260614.json`

## Anonymous Mode

Fresh no-session `/api/me` before ticket proof:

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

Fresh no-session `/api/me` after ticket proof:

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

Result: `PASS`.

## Disposable User And Ticket

Disposable email identifier:

```text
flowai.ct2.redirect.20260614061707.[redacted]@example.com
```

Observed redacted setup:

```json
{
  "created": true,
  "rawUserIdPresent": true,
  "rawUserId": "[redacted]",
  "rawTicketPresent": true,
  "hostedUrlPresentButNotOpened": true
}
```

CT2 used the FlowAI-owned route only:

```text
/sign-in-token?ticket=<redacted>&redirect_url=/flow-hub/production
```

Clerk hosted `signInToken.url` was not opened.

Result: `PASS`.

## Redirect And Scrubbing

Observed route result:

```json
{
  "status": 200,
  "finalUrlClass": "https://flowai-dun.vercel.app/flow-hub/production",
  "sameOriginFinal": true,
  "finalPathIsFlowHub": true,
  "finalUrlHasTicket": false,
  "visibleTextContainsTicket": false,
  "pageDoesNotExposeTicket": true,
  "addressBarScrubbed": true,
  "flowHubLoaded": true
}
```

Browser-visible page text included:

```text
Flow Hub - Production
FlowAI Ready
```

Result: `PASS`. The previous final-route blocker is resolved.

## Clerk Session

Observed redacted Clerk frontend state:

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

CT2 did not use direct address-bar `/api/me` as authenticated proof. From the FlowAI app origin, CT2 obtained a Clerk session token and fetched `/api/me` with an Authorization header; token value and header value were not printed or stored.

Observed redacted result:

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

Observed app-origin network evidence included authenticated `/api/me` calls:

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

## Cleanup

Cleanup result:

```json
{
  "attempted": true,
  "userDeleted": true,
  "error": null
}
```

Result: `PASS`.

## Secret Handling

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

## Screenshot Evidence

- `docs/cto/screenshots/ct2-clerk-ticket-redirect-rerun-api-me-anonymous-before-2026-06-14T06-17-04-495Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-redirect-rerun-post-ticket-final-2026-06-14T06-17-04-495Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-redirect-rerun-after-app-origin-api-me-2026-06-14T06-17-04-495Z.png`
- `docs/cto/screenshots/ct2-clerk-ticket-redirect-rerun-api-me-anonymous-after-2026-06-14T06-17-04-495Z.png`

Screenshots were captured only after checking visible text for the raw ticket. The raw ticket did not appear in visible text or committed evidence.

## Final CT2 Finding

The Clerk ticket redirect blocker is resolved on the newest production commit observed during the run. The FlowAI-owned ticket route scrubbed the ticket, landed on `/flow-hub/production`, loaded Flow Hub Production, established a signed-in Clerk app session, produced authenticated app-origin `/api/me`, preserved anonymous no-session `/api/me`, and cleaned up the disposable Clerk user.

VERIFIED movement: no
