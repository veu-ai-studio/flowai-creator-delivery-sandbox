# CB Dispatch - Clerk Auth Completion

FROM: CTO
TO: CB
ACTION: BUILD - Clerk auth readiness visibility and real sign-up flow
Branch: `fix/clerk-auth-completion`
Base: current `main` at or after `a38c865ed9fbadfc9dde23e7a41cc6c528018533`
Authorization: CTO dispatch prepared under `docs/cto/current-directive.md`; no canonical SSOT edit and no VERIFIED movement authorized.

Read first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/clerk-auth-diagnostic-20260613.md`

## Context

Clerk env activation is complete in Vercel Production:

- `CLERK_SECRET_KEY`: Vercel Production encrypted env is present.
- `VITE_CLERK_PUBLISHABLE_KEY`: Vercel Production encrypted env is present, sourced from Doppler `CLERK_PUBLISHABLE_KEY`.
- Production deployment `https://flowai-4134cifwb-veu-ai-studio.vercel.app` is promoted.
- Public `/api/version` reports `featureFlags.clerkReady:true`.
- Public `/api/me` reports `config.clerkConfigured:true`.

Still incomplete:

- `/api/health` does not expose Clerk/auth readiness.
- `AUTH_REQUIRED` remains false. Do not change it in this branch.
- `src/lib/AuthContext.jsx` still uses the old Base44-style frontend auth flow.
- There is no CT2 evidence that a real user can sign up or sign in through Clerk.

## Scope

Implement a product-agnostic Clerk auth completion slice without canonical or matrix promotion.

Allowed files:

- `api/health.js`
- `src/lib/observability/health.js`
- `src/lib/AuthContext.jsx`
- frontend auth routes/components required for sign-up/sign-in
- route/navigation files required to expose auth UX
- package files if a Clerk frontend package is necessary
- focused tests under `tests/`
- docs evidence under `docs/cto/`

Do not touch:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `src/lib/orchestratorFramework/matrixArtifact.json`
- scoring, forge governance, ProductSSOT, or Flow Hub path logic

## Build Requirements

1. Health readiness

Add a dedicated auth/Clerk readiness check to production health output.

Required public evidence shape:

```json
{
  "clerkReady": true,
  "checks": {
    "auth": {
      "status": "PASS",
      "clerkConfigured": true,
      "frontendPublishableKeyPresent": true,
      "authRequired": false
    }
  }
}
```

Exact nesting can vary if justified, but `/api/health` must expose enough non-secret fields for CT2/W04 to verify Clerk readiness without consulting `/api/version`.

Never expose secret values. Boolean presence only.

2. Frontend sign-up/sign-in

Wire a real user-facing auth flow. Preferred implementation is Clerk frontend integration using `VITE_CLERK_PUBLISHABLE_KEY`.

Acceptance requirements:

- `/sign-up` displays a real sign-up experience, not just SPA fallback or marketing content.
- `/sign-in` displays a real sign-in experience, not just SPA fallback or marketing content.
- Auth UI is product-agnostic and does not hardcode SAIGE or other VEU products into core auth logic.
- Existing internal proof workflows remain usable because `AUTH_REQUIRED` stays false.

If a real Clerk frontend cannot be implemented safely in this branch, STOP and report the exact missing dependency or dashboard setting. Do not substitute the existing internal auth backend and call it Clerk.

3. API/user context

After sign-up/sign-in, the UI should be able to call `/api/me` and receive an authenticated Clerk-backed context when a Clerk session is present.

Keep anonymous `/api/me` behavior unchanged when no session exists and `AUTH_REQUIRED=false`.

4. Tests

Add or update focused tests proving:

- `/api/health` includes auth readiness fields and never leaks secret values.
- `AUTH_REQUIRED=false` remains unchanged by default.
- Sign-up/sign-in routes render intentional auth UI rather than accidental fallback.
- Existing auth backend tests still pass.

Minimum local verification:

- focused auth/health/UI tests
- `npm run build:preflight`
- `npm run lint`
- `git diff --check`

If dependency install is needed, update `package-lock.json` normally and include it in the branch.

## STOP Conditions

STOP and report if:

- Clerk dashboard configuration is required but not inferable from env/code.
- Clerk frontend package installation fails due to network or registry access.
- Clerk sign-up requires domain settings unavailable from the repo/Vercel/Doppler context.
- Any implementation would require setting `AUTH_REQUIRED=true` before CT2 proof.
- Any implementation would require matrixArtifact or canonical SSOT movement.

## DoD Required Fields

Include the mandatory BUILD_PROTOCOL fields:

```text
Mocked tests used: yes/no
Unmocked runtime proof: yes/no/N-A with reason
Production URL serving HEAD commit SHA verified: yes/no/N-A with reason
Proof labels used: UNIT / MOCKED_E2E / LIVE_PREVIEW / LIVE_PRODUCTION
Evidence tier claimed: A / B / C / none
Claim impact: no movement / STUBBED->PARTIAL / PARTIAL->WIRED / PARTIAL->VERIFIED
VERIFIED movement: yes/no
```

## Browser Test Instructions Required

Provide CT2-ready instructions for:

1. Open production or preview `/api/health`; confirm Clerk readiness fields.
2. Open `/sign-up`; confirm a real sign-up UI.
3. Create or attempt a test user using an approved test identity.
4. Confirm `/api/me` returns authenticated Clerk context after sign-up/sign-in.
5. Confirm anonymous internal proof workflows remain available while `AUTH_REQUIRED=false`.

No VERIFIED promotion is authorized by this build. CT2 proof and W04/CEO clearance are required first.
