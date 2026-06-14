# Clerk Hosted Redirect Boundary Analysis - 2026-06-14 UTC

FROM: CTO
TO: W04 / CB / CT2
Scope: Diagnose CT2 Clerk session BLOCK after bearer-token propagation patch
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

## Verdict

The remaining Clerk blocker was not in FlowAI `/api/me` bearer-token propagation.

CT2 blocked because the hosted Clerk sign-in-token flow could not redirect into the FlowAI application and therefore never established a signed-in Clerk session on the FlowAI app origin.

The first machine-fixable Clerk-side boundary was corrected through Clerk's Backend API:

- Added redirect URL: `https://flowai-dun.vercel.app/`
- Added redirect URL: `https://flowai-dun.vercel.app/flow-hub/production`

No Clerk secret values, sign-in token URLs, token values, cookies, passwords, or raw Clerk user IDs were printed or committed.

## Evidence Reviewed

CT2 BLOCK evidence:

- `docs/cto/ct2-clerk-session-live-proof-result-20260614.md`
- Runtime under proof: `021212d2ebf52511493869e7fea9270a7865db31`
- Production deployment: `https://flowai-799ng2frz-veu-ai-studio.vercel.app`
- Public production URL: `https://flowai-dun.vercel.app`

Observed CT2 blocker:

- Hosted Clerk token landing text: `Development mode. You are signed in, but Clerk cannot redirect to your application`
- FlowAI app state after manual navigation: `clerkLoaded:true`, `signedIn:false`, `sessionPresent:false`, `userPresent:false`, `tokenPresent:false`
- App-origin `/api/me` authenticated fetch could not run because `Clerk session getToken unavailable`.

Code evidence:

- `src/lib/AuthContext.jsx` now calls Clerk React `getToken()` when Clerk is loaded and signed in, and sends `Authorization: Bearer <token>` to `/api/me`.
- `api/_lib/auth.js` accepts `Authorization: Bearer <token>` and verifies it through Clerk SDK.
- `tests/clerk-session-propagation.test.js` covers the frontend bearer header and mocked server Clerk auth path.

SDK evidence:

- Installed backend SDK: `@clerk/clerk-sdk-node@4.13.23`.
- Installed React SDK: `@clerk/clerk-react@5.61.8`.
- Local backend type `node_modules/@clerk/backend/dist/types/api/endpoints/SignInTokenApi.d.ts` shows `createSignInToken(params)` accepts only `userId` and `expiresInSeconds`; no redirect parameter exists in the installed server API.
- Local backend type `node_modules/@clerk/backend/dist/types/api/endpoints/RedirectUrlApi.d.ts` exposes `createRedirectUrl({ url })` and `getRedirectUrlList()`.
- Local React types expose redirect configuration on the mounted auth components and provider, but CT2's failure happened on Clerk's hosted token landing before FlowAI's `SignIn` component could complete a session.

Official Clerk docs checked:

- `https://clerk.com/docs/reference/backend/sign-in-tokens/create-sign-in-token` documents only `userId` and `expiresInSeconds` for sign-in-token creation.
- `https://clerk.com/docs/reference/backend/redirect-urls/create-redirect-url` documents adding full redirect URL values through `clerkClient.redirectUrls.createRedirectUrl({ url })`.
- `https://clerk.com/docs/reference/backend/redirect-urls/get-redirect-url-list` documents retrieval of allow-listed redirect URLs.

## Diagnostic Result

Read-only diagnostic before fix:

```json
{
  "secretShape": "sk_test",
  "publishableShape": "pk_test",
  "redirectUrlCount": 0,
  "redirectUrls": [],
  "hasFlowAiProductionRedirect": false
}
```

Configuration action performed by CTO through Clerk Backend API:

```text
createRedirectUrl({ url: "https://flowai-dun.vercel.app" })
createRedirectUrl({ url: "https://flowai-dun.vercel.app/flow-hub/production" })
```

Read-only diagnostic after fix:

```json
{
  "secretShape": "sk_test",
  "publishableShape": "pk_test",
  "redirectUrlCount": 2,
  "redirectUrls": [
    "https://flowai-dun.vercel.app/",
    "https://flowai-dun.vercel.app/flow-hub/production"
  ],
  "hasFlowAiProductionRedirect": true,
  "hasFlowAiProductionPathRedirect": true
}
```

## Interpretation

This was an external Clerk application configuration gap that could be corrected by machine using the Clerk Backend API. It did not require Victor dashboard work.

The current production runtime has not changed, so this is not a runtime branch, not a code patch, and not a matrixArtifact movement.

The correct next proof is a CT2 rerun of the app-origin Clerk session test against the same production runtime commit.

## Next Action

Dispatch CT2 with:

- `docs/cto/ct2-clerk-session-live-proof-rerun-dispatch-20260614.md`

CT2 must rerun the disposable-user/sign-in-token browser proof and report PASS/BLOCK through repo evidence.

No VERIFIED movement is allowed from this configuration fix alone.
