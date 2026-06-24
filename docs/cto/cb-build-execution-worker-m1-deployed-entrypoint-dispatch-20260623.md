# CB Dispatch: BuildExecutionWorker M1 Deployed Entrypoint Closure

Date: 2026-06-23

From: CTO (Codex)

To: CB

Status: IMPLEMENTATION AUTHORIZED

Branch: `fix/build-execution-worker-m1-deployed-entrypoint`

Base: `origin/feature/build-execution-worker-m1` at or after `f695e0e`

## Adjudication Context

BuildExecutionWorker M1 is adjudicated `PASS-WITH-FINDINGS` at the runtime/code-path level.

The evidence supports:

```text
runBuild
-> Tool Intelligence
-> Codex selected
-> live Codex dispatch
-> sandbox mutation
-> sandbox commit
-> proofRunId evidence
```

Moved:

- `BUILD-PATH DISPATCH DEMONSTRATED`
- `BuildExecutionWorker Stage 1 Complete (runtime-scoped)`

Not moved:

- `BUILD_EXECUTION_VERIFIED`
- `CREATOR_VERIFIED`
- `UPGRADER_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- Production autonomous execution
- Deploy proof
- Persistence proof
- Behavioral correctness
- Production/Upgrader path proof

Finding to close:

`DEPLOYED_ENTRYPOINT_POST_BLOCK`

Observed during M1 proof:

- `GET /api/forge/build` on preview returned `405`, confirming route discovery.
- `POST /api/forge/build` on preview returned empty `404`, so the deployed HTTP entrypoint did not execute the proven Build path.

## Objective

Close only the deployed entrypoint finding.

Make deployed preview:

```text
POST /api/forge/build
-> require operator auth
-> runBuild
-> Tool Intelligence
-> selected Build tool
-> dispatch
-> BuildExecutionWorker sandbox mutation
-> sandbox commit
-> response evidence
```

This is not a new capability milestone. It is closure of the deployed HTTP surface for the already-proven M1 runtime path.

## Scope

Allowed:

- Diagnose why deployed `POST /api/forge/build` returns empty `404` while `GET` returns `405`.
- Patch Vercel/API route wiring, request handling, or function packaging as narrowly as needed.
- Move or shim the route if Vercel does not reliably mount nested `api/forge/build.js`.
- Add tests proving the route handler accepts `POST` and rejects unsupported methods.
- Add route-specific evidence in `docs/cto/`.

Not allowed:

- Rebuild the BuildExecutionWorker architecture.
- Create a new proof route that bypasses `runBuild`.
- Invoke `api/_lib/buildExecutionWorker.js` directly as the proof.
- Add deploy, persistence, behavioral verification, Creator, Upgrader, or Universal Engine work.
- Claim Production/Upgrader Build path proof.
- Mutate any repo except `veu-ai-studio/flowai-build-execution-sandbox`.

## Hard Requirements

The deployed POST proof must use the same selected-tool discipline as M1:

- Do not hardcode Codex.
- Expose exact `getTopTool('build')` / Tool Intelligence selection output.
- Execute the selected tool honestly.
- If Codex is selected, invoke Codex through the OpenAI API Codex adapter.
- If the selected tool is not callable, STOP/BLOCK with exact reason.
- Preserve sandbox hard-stop to `veu-ai-studio/flowai-build-execution-sandbox`.
- Preserve proofRunId continuity through request, selection, selected-tool dispatch, runner dispatch, sandbox file, commit, response, and evidence packet.

## Required Proof

Deploy a Vercel preview for the fix branch.

Run one deployed POST proof against that preview.

Evidence must include:

- branch
- implementation commit SHA
- preview URL
- `/api/health` or equivalent commit identity for the preview, if available
- `POST /api/forge/build` HTTP status
- buildRequestId
- proofRunId
- exact selected-tool output summary
- selected member id
- sandbox workflow run id
- sandbox workflow conclusion
- mutated file path
- sandbox commit SHA
- independent read-back of sandbox commit/tree/blob
- proofRunId continuity checklist
- verification commands and results

The evidence packet must state clearly:

```text
This closes DEPLOYED_ENTRYPOINT_POST_BLOCK only.
It does not move BUILD_EXECUTION_VERIFIED, CREATOR_VERIFIED, UPGRADER_VERIFIED, or UNIVERSAL_ENGINE_VERIFIED.
```

## Expected Outcomes

`SUCCESS`:

Deployed preview `POST /api/forge/build` executes the real Build path and produces a new proofRunId-traced sandbox commit.

`BLOCK`:

Preview deployment, auth, credentials, Vercel protection, or route mounting prevents deployed POST execution.

`STOP`:

The deployed route can only be made to work by bypassing `runBuild`, hardcoding Codex, weakening sandbox containment, or substituting another executor.

`DISPROOF`:

The deployed route cannot execute the selected-tool Build path even though the local committed-code harness can.

All outcomes are acceptable if evidenced.

## Verification

Minimum local verification before live preview:

```text
npx vitest run tests/forge/buildStep.test.js tests/buildExecutionWorker.test.js
npm run lint:evidence
```

Add route-specific tests if the patch touches handler routing.

## Claim Boundary

If successful, the only finding closed is:

`DEPLOYED_ENTRYPOINT_POST_BLOCK`

The ledger remains:

- `BUILD-PATH DISPATCH DEMONSTRATED`
- `BuildExecutionWorker Stage 1 Complete`

No additional capability moves.

## Next After This

After this finding is closed, CTO will prepare the next milestone plan:

```text
Mutation
-> Deploy
-> Persist
```

Do not start that milestone in this branch.
