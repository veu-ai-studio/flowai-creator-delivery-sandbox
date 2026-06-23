# M2 Deploy Chain Proof Evidence - 2026-06-23

## Verdict

STATUS: BLOCK

M2 implementation reached the deployed FlowAI runtime and entered the deployed `POST /api/forge/build` path, but stopped at the approved deploy-sandbox creation boundary.

No deploy-chain claim moves.

## Origin Implementation

- Branch: `feature/m2-deploy-chain-proof`
- Implementation commit: `064142e8327088a3d9e855a32c7ddfa62f382a84`
- Files:
  - `api/_lib/deployChainWorker.js`
  - `api/forge/build.js`
  - `src/lib/forge/buildRunner.js`
  - `src/lib/orchestra/vercel.js`
  - `tests/deployChainWorker.test.js`
  - `tests/renewal/orchestra.test.js`

## Local Verification

PASS:

```text
node --check api/_lib/deployChainWorker.js
node --check api/forge/build.js
node --check src/lib/orchestra/vercel.js
npx vitest run tests/deployChainWorker.test.js tests/buildExecutionWorker.test.js tests/forge/buildStep.test.js tests/renewal/orchestra.test.js
npm run lint
npm run build:preflight
```

Focused tests:

```text
Test Files  4 passed (4)
Tests       55 passed (55)
```

`npm run lint` passed with existing flat-config migration warnings only.

`npm run build:preflight` passed.

## Live Runtime Proof Attempt

- FlowAI preview URL: `https://flowai-n8sy6yru4-veu-ai-studio.vercel.app`
- Runtime commit from deployed `/api/version`: `064142e8327088a3d9e855a32c7ddfa62f382a84`
- Runtime branch: empty, because this was a local-source Vercel CLI preview with explicit build/runtime `FLOWAI_EXPECTED_HEAD`
- Deployment protection: accessed using approved `VERCEL_AUTOMATION_BYPASS_SECRET`
- Runtime auth: preview-scoped `FLOWAI_SERVICE_KEY`

Request target:

```text
POST https://flowai-n8sy6yru4-veu-ai-studio.vercel.app/api/forge/build
deliveryMode=deploy-chain-sandbox
deployTarget=flowai-deploy-execution-sandbox
```

Expected visible marker:

```text
FlowAI M2 deployed software verified 064142e
```

## STOP/BLOCK Evidence

The deployed endpoint returned:

```json
{
  "ok": false,
  "status": "BLOCK",
  "error": "GITHUB_API_FAILED",
  "message": "GitHub API request failed: POST /orgs/veu-ai-studio/repos",
  "details": {
    "status": 403,
    "path": "/orgs/veu-ai-studio/repos",
    "method": "POST",
    "response": {
      "message": "Resource not accessible by personal access token",
      "documentation_url": "https://docs.github.com/rest/repos/repos#create-an-organization-repository",
      "status": "403"
    }
  }
}
```

Independent repo existence check with the same workflow credential:

```text
GET https://api.github.com/repos/veu-ai-studio/flowai-deploy-execution-sandbox
repo_get_status=404
```

Interpretation:

- The approved deploy sandbox repo does not exist.
- The current `GITHUB_WORKFLOW_TOKEN` can read/check the repo path but cannot create an organization repository.
- This exactly matches W04 finding F1: approved sandbox creation is a credential/authority action.
- The correct outcome is BLOCK until the GitHub credential has org repository creation authority or the approved sandbox repo is created by an authorized org owner/admin.

## Claim Boundary

Does NOT move:

- `DEPLOY CHAIN DEMONSTRATED`
- `BUILD_EXECUTION_VERIFIED`
- `CREATOR_VERIFIED`
- `UPGRADER_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- persistence
- behavioral product improvement

M2 cannot be adjudicated as a pass because no selected-tool output reached a deployed URL.

## Next Required Action

Resolve the authority gap for the approved deploy sandbox only:

```text
veu-ai-studio/flowai-deploy-execution-sandbox
```

Acceptable resolutions:

1. Grant the machine credential org-level authority to create the approved sandbox repo, then rerun the same M2 proof.
2. Have an authorized org owner/admin create the approved sandbox repo once, then rerun the same M2 proof.

Do not switch to another repo. The implementation hard-stops on any target other than the approved deploy sandbox.
