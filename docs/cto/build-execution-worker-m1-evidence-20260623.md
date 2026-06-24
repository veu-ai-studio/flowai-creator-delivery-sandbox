# BuildExecutionWorker M1 Evidence

Date: 2026-06-23

Owner: CTO (Codex)

Branch: `feature/build-execution-worker-m1`

Implementation commit: `27d7232`

Status: EVIDENCE PACKET FOR W04 ADJUDICATION

## Claim Under Test

Can the real FlowAI Build runner move from Tool Intelligence selection to selected-tool dispatch to sandbox repository mutation?

Required chain:

```text
Build Request
-> buildRunner / runBuild
-> getTopTool / selectForgeStepTool
-> selected Build tool
-> dispatch
-> sandbox runner
-> repository mutation
-> commit
-> evidence
```

## Implementation Summary

Implemented:

- `api/_lib/buildExecutionWorker.js`
- `api/forge/build.js`
- `src/lib/forge/buildRunner.js` mutation hook
- `tests/buildExecutionWorker.test.js`
- `tests/forge/buildStep.test.js` coverage for M1 path

The mutation hook fires only when `mutationExecutor` is supplied. Existing Build runner behavior remains unchanged when no mutation executor is provided.

## Dispatch Discipline

The implementation does not hardcode Codex.

The selected tool comes from:

```text
selectForgeStepTool
-> selectToolForStep
-> getTopTool('build')
```

The selected member id is derived from the selected tool and passed into `orchestra.dispatch('code-patch', ..., { memberId })`.

If the selected tool is not callable, the runner STOPs before mutation.

## Live Core Wire Proof

Execution surface:

`local committed-code harness importing runBuild; not deployed API route`

This is important: the run used committed FlowAI code and the real `runBuild` path, but it did not complete through deployed `POST /api/forge/build`. See "Deployed route caveat" below.

Live proof result:

- Implementation commit: `27d7232`
- Build request id: `flowai-build-request-20260623T145704-9fadbf3f`
- proofRunId: `flowai-build-20260623T145704-88975db9`
- Tool Intelligence selected tool: `Codex`
- Selected member id: `codex`
- Dispatch status: `LIVE_BUILD_TOOL_DISPATCHED_AND_MUTATED`
- Sandbox repo: `veu-ai-studio/flowai-build-execution-sandbox`
- GitHub Actions workflow run id: `28035146296`
- Workflow conclusion: `success`
- Mutated file path: `proof/build-execution/flowai-build-20260623T145704-88975db9.json`
- Sandbox commit SHA: `d4e7b583dc05784b7da7f30fc9384f32c5fea36c`
- Commit URL: `https://github.com/veu-ai-studio/flowai-build-execution-sandbox/commit/d4e7b583dc05784b7da7f30fc9384f32c5fea36c`

## proofRunId Continuity

Observed continuity:

- Build request: PASS
- Selected-tool dispatch: PASS
- Runner dispatch: PASS
- Runner run title: PASS
- Runner artifact: PASS
- Mutated file: PASS
- Commit message: PASS
- FlowAI response: PASS

Commit message independently confirmed:

`FlowAI BuildExecutionWorker Stage 1 flowai-build-20260623T145704-88975db9`

## Independent Sandbox Read-Back

The sandbox repo is private. Public raw GitHub read returned 404.

Read-back using `GITHUB_WORKFLOW_TOKEN` confirmed:

- Commit SHA: `d4e7b583dc05784b7da7f30fc9384f32c5fea36c`
- Commit message includes proofRunId: PASS
- Tree contains proof file: PASS
- Proof file blob SHA: `b42dc44f68e7a9d3b004cd1ac8240fde1b3fa565`
- Blob proofRunId: `flowai-build-20260623T145704-88975db9`
- Blob buildRequestId: `flowai-build-request-20260623T145704-9fadbf3f`
- Blob selectedToolId: `Codex`
- Blob selectedMemberId: `codex`
- Blob selectedToolOutputSha256: `d186ecaed91b5eb73f4e727171b87de8c79345f1ed67d6eaf1006cb2eb82260b`
- Blob sandbox: `veu-ai-studio/flowai-build-execution-sandbox`
- Blob sandboxApproved: `true`
- Blob selected-tool output contains M1/sandbox marker: PASS

`GITHUB_PAT` did not have enough visibility to read the private sandbox commit and returned 404. `GITHUB_WORKFLOW_TOKEN` could read the commit/tree/blob.

## Deployed Route Caveat

`api/forge/build.js` was implemented as the server-side Build request entrypoint.

Preview deployment attempts were made with:

- Vercel protection bypass
- preview-only temporary `FLOWAI_OPERATOR_SECRET`
- branch code containing implementation commit `27d7232`

Observed:

- Preview `https://flowai-n32vsu8ht-veu-ai-studio.vercel.app` returned empty `404` for `POST /api/forge/build`.
- Preview `https://flowai-h6fa6hrix-veu-ai-studio.vercel.app` returned `405` for `GET /api/forge/build`, confirming route discovery, but empty `404` for `POST /api/forge/build`.

Therefore the deployed API entrypoint proof did not complete.

CTO interpretation:

- Core selected-tool Build runner wire is live-proven.
- Deployed API route execution remains unresolved.
- Do not overclaim deployed server entrypoint proof from this packet.

## Verification

Commands run:

```text
npx vitest run tests/forge/buildStep.test.js
```

Result:

```text
1 test file passed
27 tests passed
```

Commands run:

```text
npx vitest run tests/forge/buildStep.test.js tests/buildExecutionWorker.test.js
```

Result:

```text
2 test files passed
31 tests passed
```

Commands run:

```text
node --check api/_lib/buildExecutionWorker.js
node --check api/forge/build.js
```

Result:

```text
PASS
```

Command run:

```text
npm run lint
```

Result:

```text
PASS
```

Note: repo has pre-existing ESLint flat-config warnings about old `/* eslint-env */` comments in unrelated files.

Command run:

```text
npm run build:preflight
```

Result:

```text
PASS
```

## Claim Boundary

Maximum claim supported by this packet:

`BUILD-PATH SELECTED-TOOL DISPATCH TO SANDBOX MUTATION DEMONSTRATED AT CORE runBuild LEVEL`

Recommended W04 adjudication:

`PASS-WITH-FINDINGS`

Finding:

The real `runBuild` path selected Codex through Tool Intelligence, dispatched Codex, and committed Codex output to the approved sandbox with proofRunId continuity. However, the deployed `POST /api/forge/build` entrypoint did not complete due empty 404 behavior on preview POST. If W04 requires deployed API entrypoint execution for M1, keep `BuildExecutionWorker Stage 1 Complete` open and classify the remaining gap as `DEPLOYED_ENTRYPOINT_POST_BLOCK`.

Claims that do not move:

- `BUILD_EXECUTION_VERIFIED`
- `CREATOR_VERIFIED`
- `UPGRADER_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- Production autonomous execution
- Deploy proof
- Persistence proof
- Behavioral verification
- Production/Upgrader path proof

## Next Technical Action

If W04 accepts core `runBuild` proof for M1:

Proceed to the next milestone: build/test/deploy/persist extension.

If W04 requires the deployed server entrypoint for M1:

Patch and prove `POST /api/forge/build` on preview, preserving the same selected-tool and sandbox mutation rules.
