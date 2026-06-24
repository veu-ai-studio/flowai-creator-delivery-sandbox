# BuildExecutionWorker M1 Deployed Entrypoint Evidence

Date: 2026-06-23

Owner: CTO (Codex)

Branch: `fix/build-execution-worker-m1-deployed-entrypoint`

Implementation commit: `9ea00cb82e28acf9670ab0399eaf306b54077c66`

Status: EVIDENCE PACKET FOR W04 ADJUDICATION

## Finding Under Closure

W04 ruling on M1:

- `BUILD-PATH DISPATCH DEMONSTRATED`
- `BuildExecutionWorker Stage 1` remains open until deployed `POST /api/forge/build` runs the same chain.
- Finding to close: `DEPLOYED_ENTRYPOINT_POST_BLOCK`.

This packet addresses only the deployed endpoint finding.

## Implementation Delta

Implemented:

- `api/forge-build.js`
- `vercel.json`
- `tests/buildExecutionWorkerEntrypoint.test.js`

The public endpoint remains:

```text
POST /api/forge/build
```

`vercel.json` now rewrites that public path to the top-level Vercel function:

```text
/api/forge/build -> /api/forge-build
```

`api/forge-build.js` delegates to the existing handler:

```text
api/forge/build.js
```

No new proof-only route was added. The deployed endpoint still enters:

```text
api/forge/build.js
-> runBuild
-> Tool Intelligence selection
-> selected tool dispatch
-> BuildExecutionWorker sandbox mutation
```

The top-level Vercel function has `maxDuration: 800` to allow live Codex dispatch plus GitHub Actions mutation polling.

## Final Deployed Proof

Preview URL:

```text
https://flowai-900tr79dq-veu-ai-studio.vercel.app
```

Runtime identity from `GET /api/version`:

```json
{
  "status": 200,
  "commit": "9ea00cb82e28",
  "commitFull": "9ea00cb82e28acf9670ab0399eaf306b54077c66",
  "buildIdentitySource": "env:FLOWAI_EXPECTED_HEAD",
  "env": "preview",
  "deployUrl": "flowai-900tr79dq-veu-ai-studio.vercel.app",
  "startedAt": "2026-06-23T18:17:15.669Z"
}
```

Route probe:

```json
{
  "method": "GET",
  "path": "/api/forge/build",
  "status": 405,
  "body": { "ok": false, "error": "Use POST" }
}
```

Deployed POST result:

```json
{
  "method": "POST",
  "path": "/api/forge/build",
  "status": 200,
  "postStatus": "SUCCESS",
  "buildRequestId": "flowai-build-request-20260623T181720-08d81571",
  "proofRunId": "flowai-build-20260623T181720-a3e71edb",
  "sandboxCommitSha": "4f258d0be36c212add8606962dfff9c4c2b9d77b"
}
```

The proofRunId is new and is not the previous harness proofRunId `flowai-build-20260623T145704-88975db9`.

## Independent Sandbox Read-Back

Sandbox repository:

```text
veu-ai-studio/flowai-build-execution-sandbox
```

Commit:

```text
4f258d0be36c212add8606962dfff9c4c2b9d77b
```

Commit URL:

```text
https://github.com/veu-ai-studio/flowai-build-execution-sandbox/commit/4f258d0be36c212add8606962dfff9c4c2b9d77b
```

Independent GitHub API read-back confirmed:

```json
{
  "commitReadStatus": 200,
  "commitMessage": "FlowAI BuildExecutionWorker Stage 1 flowai-build-20260623T181720-a3e71edb",
  "commitMessageIncludesProofRunId": true,
  "proofFileFound": true,
  "proofFilePath": "proof/build-execution/flowai-build-20260623T181720-a3e71edb.json",
  "proofFileBlobSha": "892394e719eb18e230214cd95bf123c72f2504a5"
}
```

Proof blob read-back confirmed:

```json
{
  "proofRunId": "flowai-build-20260623T181720-a3e71edb",
  "buildRequestId": "flowai-build-request-20260623T181720-08d81571",
  "productId": "m1-deployed-entrypoint",
  "flowaiCommit": "9ea00cb82e28acf9670ab0399eaf306b54077c66",
  "selectedToolId": "Codex",
  "selectedToolName": "Codex",
  "selectedToolRank": 1,
  "selectedToolCompositeScore": 9.25,
  "selectedMemberId": "codex",
  "dispatchAction": "code-patch",
  "dispatchMember": "codex",
  "dispatchModel": "gpt-4o-2024-08-06",
  "dispatchUsage": {
    "prompt_tokens": 391,
    "completion_tokens": 71,
    "total_tokens": 462
  },
  "selectedToolOutputSha256": "ed03a2a8b8191ac360f44bd67ef2bde5d1bd91b90714a10776b21e849c3d5995",
  "sandboxFullName": "veu-ai-studio/flowai-build-execution-sandbox",
  "sandboxApproved": true,
  "outputContainsRuntimeMarker": true
}
```

Selected-tool output committed to sandbox:

```jsx
export default function App() { return <main>FlowAI M1 runtime endpoint verified</main>; }
```

## Credential Notes

The final preview proof was deployed with preview-scoped:

- `FLOWAI_OPERATOR_SECRET`
- `GITHUB_WORKFLOW_TOKEN`
- `FLOWAI_EXPECTED_HEAD`

No secret values are recorded in this packet.

The preview-scoped `GITHUB_WORKFLOW_TOKEN` was required because the Vercel project fallback token could not read the private sandbox repository and returned:

```json
{
  "error": "GITHUB_API_FAILED",
  "message": "GitHub API request failed: GET /repos/veu-ai-studio/flowai-build-execution-sandbox",
  "details": { "status": 404 }
}
```

## Intermediate Guard STOP

Before the final proof, one deployed POST reached live Codex but STOPped before mutation because the generated output tripped the existing placeholder-family guard:

```text
P2 live execution STOP: code-patch dispatch returned placeholder output
```

The final proof used a narrower directive and passed without weakening that guard.

## Verification

Commands run:

```text
node --check api/forge-build.js
node --check api/forge/build.js
npx vitest run tests/buildExecutionWorkerEntrypoint.test.js tests/buildExecutionWorker.test.js tests/forge/buildStep.test.js
npm run lint
npm run build:preflight
```

Results:

```text
node --check PASS
33 targeted tests PASS
lint PASS
build:preflight PASS
```

Lint note: the repo still emits pre-existing ESLint flat-config warnings about legacy `/* eslint-env */` comments in unrelated files.

## Claim Boundary

Maximum claim supported by this packet:

```text
DEPLOYED /api/forge/build endpoint dispatch demonstrated.
BuildExecutionWorker Stage 1 Complete is recommended for W04 adjudication.
```

This packet supports closing:

```text
DEPLOYED_ENTRYPOINT_POST_BLOCK
```

Claims that still do not move:

- `BUILD_EXECUTION_VERIFIED`
- `CREATOR_VERIFIED`
- `UPGRADER_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- `Build-Production-Auto`
- Deploy proof
- Persistence proof
- Behavioral verification
- Product-agnostic two-product proof

## Recommended Ruling

Recommend W04 adjudicate:

```text
PASS

DEPLOYED_ENTRYPOINT_POST_BLOCK closed.

BuildExecutionWorker Stage 1 Complete.

No higher capability claim moves.
```
