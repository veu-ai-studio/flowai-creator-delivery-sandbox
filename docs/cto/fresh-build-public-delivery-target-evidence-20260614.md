# Fresh Build Public Delivery Target Evidence - 2026-06-14

FROM: CTO
TO: CD / CR / W04
BRANCH: `fix/fresh-build-public-delivery-target`
RUNTIME CODE COMMIT: `c2991ed1235dc84d9b891fda1adc089bf9e6f524`
VERIFIED movement: no
matrixArtifact edited: no
canonical docs edited: no

## Why This Patch Exists

CT2 live sweep on 2026-06-14 found:

- Axis wiring current production: `PASS`.
- Clerk ticket redirect/session proof: `PASS`.
- Fresh Build public URL candidate: `BLOCK`.

The blocked Fresh Build candidate `https://flowai-fresh-veusite.vercel.app/` was publicly reachable, but browser-rendered the FlowAI operator shell instead of the generated VEU AI Studio / Victor / FlowAI-positioning site.

Vercel inspect confirmed the alias currently points at a production deployment of the FlowAI operator app with API functions, so it cannot be claimed as a generated public URL.

## Patch Summary

`src/lib/agents/renewal/vercelBranchDeploy.js`

- Adds optional Vercel `target` support.
- Keeps legacy preview behavior unchanged by omitting `target` unless supplied.
- For `target:"production"`, captures Vercel aliases and prefers a stable non-`-git-` production alias as the returned `previewUrl`.
- Preserves the raw Vercel deployment URL separately as `deploymentUrl`.

`src/lib/freshBuild/freshBuildDeploymentAdapter.js`

- Adds explicit public delivery env handling:
  - `FLOWAI_FRESH_BUILD_PUBLIC_DELIVERY=true`
  - `FLOWAI_FRESH_BUILD_PUBLIC_VERCEL_PROJECT_ID=<public-generated-project-id>`
  - optional `FLOWAI_FRESH_BUILD_PUBLIC_VERCEL_PROJECT_NAME=<label>`
  - optional `FLOWAI_FRESH_BUILD_PUBLIC_VERCEL_ORG_ID=<team-id>`
- When public delivery is enabled, Fresh Build deploys to the explicit public project with Vercel `target:"production"`.
- Public delivery probes are made without the Vercel protection bypass header, so `PREVIEW_BROWSER_CLEAR` means public browser access rather than protected-preview bypass access.
- Result metadata now separates:
  - `previewUrl` / delivery URL,
  - `deploymentUrl` raw Vercel deployment URL,
  - `aliases`,
  - `publicDelivery`,
  - `deliveryMode`,
  - `vercelTarget`.

## Verification

Commands run by CTO:

```text
npx vitest run tests/agents/renewal/vercelBranchDeploy.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js
npx vitest run tests/freshBuild tests/agents/renewal/vercelBranchDeploy.test.js
npm run build:preflight
npm run lint
git diff --check
```

Results:

- Focused deploy/adapter tests: PASS, 2 files / 51 tests.
- Fresh Build suite + Vercel deploy helper: PASS, 6 files / 90 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check`: PASS.

## Important Boundary

This branch is a runtime capability patch. It is not itself a live Fresh Build public URL proof.

After merge and production env configuration, CTO must:

1. Set `FLOWAI_FRESH_BUILD_PUBLIC_DELIVERY=true` in Vercel Production.
2. Set `FLOWAI_FRESH_BUILD_PUBLIC_VERCEL_PROJECT_ID` to a public generated-site Vercel project that will not be overwritten by FlowAI operator-app `main` deployments.
3. Run a new Path 3 Fresh Build proof.
4. Dispatch CT2 to confirm the returned public URL opens anonymously and renders generated content.

No Fresh Build VERIFIED movement is allowed from this branch alone.
