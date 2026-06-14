# CT2 Clerk Auth Live Proof Result - 2026-06-13 Local / 2026-06-14 UTC

FROM: CT2
TO: CTO
Scope: LIVE_PRODUCTION browser acceptance - Clerk auth completion
Production URL: `https://flowai-dun.vercel.app`
Expected runtime commit: `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`
VERIFIED movement: no

## Verdict

Verdict: `PASS-WITH-FINDINGS`

Classification:

- Checks 1-5: `PASS`
- Route/readiness rendering: `PASS`
- Full Clerk user sign-up/session proof: `BLOCK` due Clerk/Cloudflare CAPTCHA challenge
- Required dashboard/domain action: Clerk/Cloudflare CAPTCHA challenge must be cleared, disabled for the CT2 test path, or completed by an approved human-controlled test flow before CT2 can prove authenticated Clerk session creation.

This does not justify any matrixArtifact `VERIFIED` movement.

## Method

Pulled `origin/main` before proof: already up to date.

Live browser proof was executed against production with a fresh Chromium context using Playwright because the in-app Browser setup failed in this Windows sandbox with `windows sandbox failed: spawn setup refresh`.

Observed at: `2026-06-14T02:31:00.332Z` UTC.

Raw supporting evidence: `docs/cto/ct2-clerk-auth-live-proof-raw-20260613.json`

## Production Identity

Endpoint: `https://flowai-dun.vercel.app/api/health`

Observed:

```json
{
  "status": "ready",
  "commit": "dabdce72e13e",
  "clerkReady": true,
  "checks": {
    "build": {
      "status": "PASS",
      "commitFull": "dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c",
      "branch": "main",
      "deploymentUrl": "https://flowai-mmprr7n0l-veu-ai-studio.vercel.app"
    }
  }
}
```

Result: `PASS`. Runtime commit and deployment URL match the dispatch.

## Health Auth Readiness

Endpoint: `https://flowai-dun.vercel.app/api/health`

Observed auth excerpt:

```json
{
  "clerkReady": true,
  "checks": {
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

Secret leakage scan: `PASS`. The health response did not include secret key values, publishable key values, JWT-shaped tokens, or bearer token strings.

## Anonymous Mode

Endpoint: `https://flowai-dun.vercel.app/api/me` in a fresh/no-session context.

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

Result: `PASS`.

`https://flowai-dun.vercel.app/flow-hub/production` also loaded with HTTP 200 in the anonymous context. Visible page text included `Flow Hub - Production`, `FlowAI Ready`, and the setup flow for product input/objective/operation mode.

## Sign-Up Route

Endpoint: `https://flowai-dun.vercel.app/sign-up`

Result: `PASS` for route rendering.

Browser-visible text excerpt:

```text
Create your account
Welcome! Please fill in the details to get started.
Continue with Google
First name Optional
Last name Optional
Email address
Password
Continue
Already have an account? Sign in
Secured by Development mode
```

Assessment: Real Clerk sign-up UI rendered. It was not the marketing page, not an SPA fallback, not the internal `/api/auth/sign-up` backend, and not blank.

## Sign-In Route

Endpoint: `https://flowai-dun.vercel.app/sign-in`

Result: `PASS` for route rendering.

Browser-visible text excerpt:

```text
Sign in to your account
Sign in to FlowAI
Welcome back! Please sign in to continue
Continue with Google
Email address
Password
Continue
Don't have an account? Sign up
Secured by Development mode
```

Assessment: Real Clerk sign-in UI rendered. It was not the marketing page, not an SPA fallback, not the internal `/api/auth/sign-in` backend, and not blank.

## Clerk Session Attempt

Test identity used: `flowai.ct2.20260614023052@example.com`

Actions completed:

- filled first name `FlowAI`;
- filled last name `CT2`;
- filled the CT2 `example.com` email test identity;
- filled a generated test password;
- clicked `Continue`.

Visible blocker after submission:

```text
Verify you are human
```

The challenge was shown inside a Cloudflare CAPTCHA widget. Per browser safety rules, CT2 did not attempt to solve the CAPTCHA.

After the CAPTCHA blocker, `/api/me` in the same browser context still returned anonymous context:

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

Classification according to dispatch: `BLOCK` for full user sign-up proof, `PASS` for route/readiness rendering.

## Screenshot Evidence

- `docs/cto/screenshots/ct2-clerk-auth-api-health-2026-06-14T02-30-20-540Z.png`
- `docs/cto/screenshots/ct2-clerk-auth-api-me-anonymous-2026-06-14T02-30-20-540Z.png`
- `docs/cto/screenshots/ct2-clerk-auth-flow-hub-production-2026-06-14T02-30-20-540Z.png`
- `docs/cto/screenshots/ct2-clerk-auth-sign-up-2026-06-14T02-30-20-540Z.png`
- `docs/cto/screenshots/ct2-clerk-auth-sign-in-2026-06-14T02-30-20-540Z.png`
- `docs/cto/screenshots/ct2-clerk-auth-signup-attempt-2026-06-14T02-30-20-540Z.png`
- `docs/cto/screenshots/ct2-clerk-auth-api-me-after-signup-attempt-2026-06-14T02-30-20-540Z.png`

## Final CT2 Notes

The production deployment is serving the expected commit and exposes the expected auth readiness fields without leaking Clerk keys or tokens. Anonymous mode remains open while `AUTH_REQUIRED=false`, and the Flow Hub Production route remains reachable.

The remaining blocker is not route wiring. It is the Clerk/Cloudflare human verification challenge during account creation. A successful authenticated Clerk `/api/me` proof still requires dashboard/test-flow action or approved human completion of the CAPTCHA.

VERIFIED movement: no
