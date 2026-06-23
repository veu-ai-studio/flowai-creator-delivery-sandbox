# M2 Deploy Chain Proof Evidence - 2026-06-23

## Verdict

STATUS: BLOCK

FlowAI M2 progressed beyond M1:

```text
deployed POST /api/forge/build
-> runBuild
-> Tool Intelligence selection
-> Codex selected
-> live selected-tool output
-> approved deploy sandbox repo
-> sandbox commit
-> Vercel deployment
```

It still does not satisfy M2 because the generated deployment URL is not publicly readable. It returns `401` Vercel Authentication, so independent public browser verification cannot pass.

No deploy-chain claim moves.

## Origin Implementation

- Branch: `feature/m2-deploy-chain-proof`
- Implementation commits:
  - `064142e8327088a3d9e855a32c7ddfa62f382a84` - add M2 deploy-chain worker
  - `68f979f1b397861e57d3b222736d6c5f40823040` - prefer operator GitHub credential for deploy-chain repo creation
  - `0d635decab6d9b35edf607cfe8e6eb8cf71c69eb` - allow proof-specific public Vercel target
- Evidence commit: this file on the same branch

Implementation files:

- `api/_lib/deployChainWorker.js`
- `api/forge/build.js`
- `src/lib/forge/buildRunner.js`
- `src/lib/orchestra/vercel.js`
- `tests/deployChainWorker.test.js`
- `tests/renewal/orchestra.test.js`

## Verification

PASS:

```text
node --check api/_lib/deployChainWorker.js
node --check api/forge/build.js
node --check src/lib/orchestra/vercel.js
npx vitest run tests/deployChainWorker.test.js tests/buildExecutionWorker.test.js tests/forge/buildStep.test.js tests/renewal/orchestra.test.js
npm run lint
npm run lint:evidence
npm run build:preflight
```

Focused tests:

```text
Test Files  4 passed (4)
Tests       55 passed (55)
```

`npm run lint` passed with existing flat-config migration warnings only.

`npm run build:preflight` passed on the implementation base.

## Live Runtime Attempts

### Attempt 1 - Workflow Token

- Runtime commit: `064142e8327088a3d9e855a32c7ddfa62f382a84`
- FlowAI preview: `https://flowai-n8sy6yru4-veu-ai-studio.vercel.app`
- Result: BLOCK

```json
{
  "error": "GITHUB_API_FAILED",
  "message": "GitHub API request failed: POST /orgs/veu-ai-studio/repos",
  "details": {
    "status": 403,
    "response": {
      "message": "Resource not accessible by personal access token"
    }
  }
}
```

Repo existence check at that time:

```text
GET https://api.github.com/repos/veu-ai-studio/flowai-deploy-execution-sandbox
repo_get_status=404
```

Interpretation: the approved deploy sandbox did not exist, and `GITHUB_WORKFLOW_TOKEN` could not create an org repo.

### Attempt 2 - Operator PAT

- Runtime commit: `68f979f1b397861e57d3b222736d6c5f40823040`
- FlowAI preview: `https://flowai-517gce5s2-veu-ai-studio.vercel.app`
- Result: BLOCK

```json
{
  "error": "GITHUB_API_FAILED",
  "message": "GitHub API request failed: POST /orgs/veu-ai-studio/repos",
  "details": {
    "status": 403,
    "response": {
      "message": "You need admin access to the organization before adding a repository to it."
    }
  }
}
```

Interpretation: the PAT also lacked org repo creation authority.

### GitHub App Authority Check

The existing GitHub App installation was checked before asking Victor to do anything.

Result:

```json
{
  "status": 201,
  "ok": true,
  "permissions": {
    "administration": "write",
    "contents": "write",
    "metadata": "read",
    "pull_requests": "write",
    "workflows": "write"
  },
  "repository_selection": "all"
}
```

Interpretation: GitHub App installation authority is sufficient for the approved deploy sandbox.

### Attempt 3 - GitHub App Token, Preview Target

- Runtime commit: `68f979f1b397861e57d3b222736d6c5f40823040`
- FlowAI preview: `https://flowai-3dh82cr3y-veu-ai-studio.vercel.app`
- Generated deploy URL: `https://flowai-m2-flowai-build-20260623t200149-8a247092-r2lu-1v89zsijh.vercel.app`
- Result: BLOCK

```json
{
  "error": "DEPLOY_CHAIN_BROWSER_CHECK_FAILED",
  "message": "Deployed URL did not serve the generated component text.",
  "details": {
    "url": "https://flowai-m2-flowai-build-20260623t200149-8a247092-r2lu-1v89zsijh.vercel.app",
    "last": {
      "status": 401,
      "containsExpectedText": false
    }
  }
}
```

Interpretation: repo creation/commit/deploy progressed, but the generated preview URL was protected.

### Attempt 4 - GitHub App Token, Production Target

- Runtime commit: `0d635decab6d9b35edf607cfe8e6eb8cf71c69eb`
- FlowAI preview: `https://flowai-dv2tnolbq-veu-ai-studio.vercel.app`
- Generated deploy URL: `https://flowai-m2-flowai-build-20260623t202430-3cef1f1e-r3ez-5fukk1wb4.vercel.app`
- Result: BLOCK

```json
{
  "error": "DEPLOY_CHAIN_BROWSER_CHECK_FAILED",
  "message": "Deployed URL did not serve the generated component text.",
  "details": {
    "url": "https://flowai-m2-flowai-build-20260623t202430-3cef1f1e-r3ez-5fukk1wb4.vercel.app",
    "last": {
      "status": 401,
      "containsExpectedText": false
    }
  }
}
```

Public URL status:

```text
GET https://flowai-m2-flowai-build-20260623t202430-3cef1f1e-r3ez-5fukk1wb4.vercel.app
http_code=401
```

Interpretation: even the proof-specific production target is not public under the current Vercel protection configuration.

## Deploy Sandbox Read-Back

GitHub App read-back from the approved deploy sandbox:

```json
{
  "repoStatus": 200,
  "repoFullName": "veu-ai-studio/flowai-deploy-execution-sandbox",
  "repoPrivate": true,
  "defaultBranch": "main",
  "latestStatus": 200,
  "latestSha": "d56c45a9346b0e691121424f0a1def8923e41568",
  "latestMessage": "FlowAI M2 Deploy Chain flowai-build-20260623T202430-3cef1f1e",
  "proofStatus": 200,
  "proofJson": {
    "proofRunId": "flowai-build-20260623T202430-3cef1f1e",
    "buildRequestId": "flowai-build-request-20260623T202430-9ea5b6d9",
    "flowaiCommit": "0d635decab6d9b35edf607cfe8e6eb8cf71c69eb",
    "selectedToolId": "Codex",
    "selectedMemberId": "codex",
    "selectedToolOutputSha256": "097679b80f87800abb8e71edcad64f6bf11c364f9fc55db8919ab4d6a99ed16f",
    "browserMarker": "FlowAI M2 deployed software verified 0d635de"
  },
  "appStatus": 200,
  "appExcerpt": "export default function App() { return <main>FlowAI M2 deployed software verified 0d635de</main>; }"
}
```

This proves the chain reached commit of selected-tool output into the approved deploy sandbox. It does not prove M2 because the deployed URL is not public.

## Claim Boundary

Does NOT move:

- `DEPLOY CHAIN DEMONSTRATED`
- `BUILD_EXECUTION_VERIFIED`
- `CREATOR_VERIFIED`
- `UPGRADER_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- persistence
- behavioral product improvement

M2 acceptance requires:

```text
public URL returns 200
AND serves selected-tool output
AND independent browser verification passes
```

Current result:

```text
selected-tool output committed: YES
Vercel deployment created: YES
public URL readable: NO, 401 Vercel Authentication
independent CT2 verification: NOT RUN, because public URL gate failed
```

## Next Required Action

Resolve Vercel public access for generated deploy-chain sandbox deployments.

Acceptable next fixes:

1. Configure generated proof deployments/projects so their output URLs are public, then rerun M2.
2. Use a FlowAI-owned deployment target whose generated app URL is public by default.
3. If Vercel team policy intentionally protects all generated deployments, record that as a platform policy BLOCK and choose a different public deployment substrate for M2.

Do not claim M2 until a generated URL is publicly readable and independently browser-verified.
