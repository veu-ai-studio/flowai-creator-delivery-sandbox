# Milestone 1 BuildExecutionWorker Plan

Date: 2026-06-23

Owner: CTO (Codex)

Status: PLAN ONLY

Implementation authorized: NO

## Objective

Milestone 1 answers one narrow question:

Can the actual FlowAI Build path select the Build tool, dispatch it, and cause a sandbox repository mutation with a commit and evidence?

Required proof path:

Build Request

-> buildRunner

-> getTopTool

-> Selected Tool

-> Dispatch

-> Repository Mutation

-> Commit

-> Evidence

This is not BuildExecutionVerified, CreatorVerified, UpgraderVerified, UniversalEngineVerified, deploy proof, persistence proof, or behavioral verification.

## Current Source Map

Current Build request surfaces:

- `src/pages/ForgeBuildForm.jsx:55` auto-runs Build Forge for a selected product by calling `runBuild`.
- `src/pages/ForgeBuildForm.jsx:74` defines `submitBuild`.
- `src/pages/ForgeBuildForm.jsx:76` calls `runBuild` on submit.
- `src/pages/ForgeBuildForm.jsx:86` persists the Build artifact after `runBuild`.
- `src/lib/forge/verticalSliceRunner.js:171` defines `runReferenceVerticalSlice`.
- `src/lib/forge/verticalSliceRunner.js:208` calls `runBuild` inside the reference vertical slice.

Current Build runner:

- `src/lib/forge/buildRunner.js:284` defines `runBuild`.
- `src/lib/forge/buildRunner.js:287` calls `selectForgeStepTool` for `stepKey: 'build'`.
- `src/lib/forge/buildRunner.js:297` resolves `buildTool` from the first pipeline tool.
- `src/lib/forge/buildRunner.js:299` computes `liveDispatch`.
- `src/lib/forge/buildRunner.js:303` checks selected member readiness through `assertSelectedBuildMemberReady`.
- `src/lib/forge/buildRunner.js:305` enters `runLiveBuildTasks`.
- `src/lib/forge/buildRunner.js:209` defines `runLiveBuildTasks`.
- `src/lib/forge/buildRunner.js:218` is the current point where decision becomes execution: `dispatchFn('code-patch', ...)`.
- `src/lib/forge/buildRunner.js:345` includes `evidenceSummary`.

Current Tool Intelligence path:

- `src/lib/forge/toolSelection.js:141` defines `selectForgeStepTool`.
- `src/lib/forge/toolSelection.js:160` calls `selectToolForStep`.
- `src/lib/tools/ToolIntelligenceService.js:161` defines `getTopTool`.
- `src/lib/tools/ToolIntelligenceService.js:346` defines `selectToolForStep`.
- `src/lib/tools/ToolIntelligenceService.js:380` calls `service.getTopTool`.
- `src/lib/tools/ToolIntelligenceService.js:397` writes `tool.selection` lineage when a cold store is present.

Current selected Build tool:

- `src/lib/tools/buildToolRanking.js:1` defines Build tool order.
- `src/lib/tools/buildToolRanking.js:18` ranks `Codex` at rank 1.
- `src/lib/tools/buildToolRanking.js:117` exposes `canonicalBuildRankingRows`.

Current dispatch/member path:

- `src/lib/orchestra/index.js:52` defines `dispatch`.
- `src/lib/orchestra/index.js:53` honors explicit `memberId`.
- `src/lib/orchestra/index.js:63` maps `code-patch` to Codex by default.
- `src/lib/orchestra/codex.js:9` defines member id `codex`.
- `src/lib/orchestra/codex.js:11` declares `code-patch` and `generate-from-scratch`.
- `src/lib/orchestra/codex.js:12` marks Codex `wired = true`.
- `src/lib/orchestra/codex.js:17` defines `invoke`.
- `src/lib/orchestra/codex.js:23` defines `codePatch`.
- `src/lib/orchestra/codex.js:44` returns patched content.
- `src/lib/orchestra/codex.js:89` requires `OPENAI_API_KEY`.

Current dispatch substrate proof to reuse as a pattern, not an endpoint:

- `api/_lib/runtimeDispatchAuthorityProof.js:52` hard-stops unapproved sandbox targets.
- `api/_lib/runtimeDispatchAuthorityProof.js:144` wraps GitHub API requests.
- `api/_lib/runtimeDispatchAuthorityProof.js:185` writes/updates a sandbox workflow.
- `api/_lib/runtimeDispatchAuthorityProof.js:387` dispatches the workflow.
- `api/_lib/runtimeDispatchAuthorityProof.js:326` reads workflow artifacts.
- `api/runtime-dispatch-authority-proof.js:1` is the Milestone 0 proof route and must not be reused for Milestone 1.

## Honest Current Gap

The Build path already selects Codex and dispatches `code-patch` in automatic mode when all gates are satisfied. The result is only in-memory patched content.

The Codex adapter explicitly says disk, git, tests, and deploy are outside the adapter in `src/lib/orchestra/codex.js:4`.

Therefore Milestone 1 should not pretend Codex itself performs repository mutation. Codex remains the selected Build tool for code generation. BuildExecutionWorker becomes the sandbox mutation and commit layer that receives the selected tool output and commits it to the approved sandbox repository.

## Proposed Architecture

BuildExecutionWorker Stage 1 is a server-side Build-path extension with three pieces:

1. Permanent server Build request entrypoint

Proposed file:

`api/forge/build.js`

Purpose:

- Accept an operator-authenticated Build request.
- Generate `buildRequestId` and `proofRunId`.
- Construct or receive the design output, source content, and target file path needed by `runBuild`.
- Instantiate the real Tool Intelligence service.
- Call `runBuild` with `toolIntelligenceMode: AUTOMATIC`.
- Pass a sandbox-only mutation executor into `runBuild`.

This is not a proof route. It is the server-side Build request path needed because the current browser Build form cannot safely hold GitHub mutation credentials.

2. Build runner mutation hook

Proposed file changes:

`src/lib/forge/buildRunner.js`

Purpose:

- Preserve existing behavior when no mutation executor is supplied.
- After the selected Codex `code-patch` dispatch succeeds and returns `patchedContent`, call `config.mutationExecutor`.
- Require `proofRunId`, selected member id, target file path, patched content, and build task metadata.
- Add mutation evidence to the Build output and `codeTaskDispatches`.
- Fail closed if mutation is requested but not completed.

The decision-to-execution sequence remains inside `runBuild`; the worker is not invoked directly.

3. Sandbox BuildExecutionWorker dispatcher

Proposed files:

- `api/_lib/buildExecutionWorker.js`
- `api/_lib/buildExecutionWorkerWorkflow.js`

Purpose:

- Reuse the Milestone 0 GitHub Actions dispatch substrate pattern.
- Do not call `/api/runtime-dispatch-authority-proof`.
- Hard-stop unless the target repository is `veu-ai-studio/flowai-build-execution-sandbox`.
- Ensure or update a sandbox workflow named `flowai-build-execution-worker-stage1.yml`.
- Dispatch the workflow with `proofRunId`, `buildRequestId`, selected tool metadata, target file path, and base64-encoded selected tool output.
- Poll for the workflow run.
- Read the workflow artifact and commit evidence.
- Return run id, commit SHA, mutated file path, artifact id, and nonce-continuity fields to `runBuild`.

## Actual Execution Chain

Planned Milestone 1 chain:

Operator-authenticated Build request

-> `api/forge/build.js`

-> `runBuild` in `src/lib/forge/buildRunner.js`

-> `selectForgeStepTool`

-> `selectToolForStep`

-> `getTopTool('build')`

-> selected pipeline tool = Codex

-> `assertSelectedBuildMemberReady`

-> `runLiveBuildTasks`

-> `orchestra.dispatch('code-patch', ..., { memberId: 'codex' })`

-> Codex returns `patchedContent`

-> `config.mutationExecutor`

-> `api/_lib/buildExecutionWorker.js`

-> GitHub Actions `workflow_dispatch`

-> sandbox runner writes selected tool output into sandbox repo

-> sandbox runner commits with `proofRunId`

-> FlowAI polls run and observes artifact/commit

-> Build output includes mutation evidence

Decision becomes execution at the existing `dispatchFn('code-patch', ...)` call in `src/lib/forge/buildRunner.js:218`.

Execution becomes repository mutation at the proposed mutation executor call immediately after `assertLiveDispatchResult` returns selected Codex output.

## Selected Tool Discipline

The expected selected tool is Codex because:

- `src/lib/tools/buildToolRanking.js:18` ranks `Codex` first.
- `src/lib/tools/toolDispatchContract.js:62` requires `OPENAI_API_KEY` for Codex.
- `src/lib/orchestra/codex.js:12` marks Codex wired.

Rules:

- If `getTopTool('build')` selects Codex and `OPENAI_API_KEY` is absent, Milestone 1 returns BLOCK or STOP.
- If `getTopTool('build')` selects a different rank-1 tool, the evidence must name it and use that selected member honestly.
- If the selected tool is not callable, STOP.
- Do not substitute Claude Code, CB, CTO, local scripts, or the GitHub runner as the selected Build tool.
- The GitHub runner is the mutation worker, not the selected code-generation tool.

## No Proof-Route Bypass

The Milestone 0 proof endpoint does not count and must not be called.

Allowed:

- Reuse the GitHub Actions dispatch substrate pattern.
- Reuse shared helper patterns for sandbox assertion, workflow write, workflow dispatch, polling, and artifact observation.

Not allowed:

- Calling `/api/runtime-dispatch-authority-proof`.
- Calling a worker directly.
- Invoking a local script and relabeling it Build path execution.
- Mutating the sandbox repository from outside the Build request path.

## Repository Mutation Strategy

Sandbox repository:

`veu-ai-studio/flowai-build-execution-sandbox`

Workflow:

`.github/workflows/flowai-build-execution-worker-stage1.yml`

Mutated file:

`proof/build-execution/${proofRunId}.json`

Commit message:

`FlowAI BuildExecutionWorker Stage 1 ${proofRunId}`

Mutation content:

The file should include:

- `proofRunId`
- `buildRequestId`
- `runId`
- selected tool id
- selected tool name
- selected tool action
- target file path
- SHA-256 hash of selected tool patched content
- selected tool patched content excerpt or complete content if small
- FlowAI implementation commit
- workflow run id
- timestamp

The worker should reject the mutation if the generated file content does not contain the exact `proofRunId`.

Commit mechanism:

- GitHub Actions runner in the sandbox repo.
- Workflow `permissions: contents: write`.
- Commit performed by the sandbox workflow using the repo-scoped `GITHUB_TOKEN`.

Evidence mechanism:

- GitHub Actions run id and URL.
- Sandbox commit SHA.
- Mutated file path and GitHub file URL.
- Uploaded artifact containing the same evidence JSON.
- FlowAI Build output containing the same `proofRunId` and sandbox commit SHA.
- `docs/cto/milestone-1-build-execution-worker-evidence-20260623.md` after implementation, if W04 authorizes implementation.

## proofRunId Continuity

The same `proofRunId` must appear in:

- Build request body
- `runBuild` config
- Tool dispatch payload `issueSpec.fixSpec`
- Selected Codex prompt context
- Codex returned patched content or BuildExecutionWorker evidence wrapper
- GitHub workflow dispatch payload
- Runner environment/input
- Mutated file content
- Commit message
- Uploaded artifact name or content
- FlowAI Build output
- Evidence packet

If any link is absent, Milestone 1 fails.

## Executor Declaration

Who dispatches?

FlowAI server-side Build path in `api/forge/build.js`, through `runBuild`, then the sandbox mutation dispatcher.

Who generates code?

The selected Build tool from `getTopTool('build')`, expected Codex for the current ranking.

Who mutates?

The GitHub Actions runner inside `veu-ai-studio/flowai-build-execution-sandbox`.

Who commits?

The sandbox workflow using the sandbox repository's `GITHUB_TOKEN`.

Who verifies?

FlowAI server-side Build path polls GitHub Actions and reads the resulting artifact/commit metadata. W04 adjudicates from origin and GitHub evidence.

CB safety boundary:

CB is not the executor for this proof. CB may later implement reviewed code if authorized, but the Milestone 1 proof must be produced by the FlowAI Build path and the sandbox runner.

## Dependencies

Runtime credentials:

- `OPENAI_API_KEY`: required for selected Codex code generation.
- `GITHUB_WORKFLOW_TOKEN`: required for FlowAI to create/update and dispatch the sandbox workflow.
- `FLOWAI_OPERATOR_SECRET` or equivalent operator auth: required to invoke the server Build request endpoint during the controlled proof.

Runtime services:

- Vercel Preview for server-side Build request invocation.
- GitHub API access to `veu-ai-studio/flowai-build-execution-sandbox`.
- Tool Intelligence service with Build ranking available. If unavailable, the live proof should STOP rather than inject a fake selection.

Packages:

- No new npm dependency is expected.
- Use built-in `fetch`, `crypto`, and existing repo patterns.

## Implementation Milestones After W04 Plan Adjudication

Milestone 1A: testable helper design

- Add a build execution worker module with fake-fetch unit tests.
- Add workflow content generator tests.
- Add sandbox boundary tests.
- No live network required.

Milestone 1B: Build runner integration

- Extend `runBuild` with optional `proofRunId` and `mutationExecutor`.
- Add tests proving no mutation occurs unless the real automatic Build path reaches selected-tool dispatch.
- Add tests proving direct worker invocation is not accepted as Build-path proof.

Milestone 1C: server Build request endpoint

- Add permanent server Build endpoint.
- Operator-auth protect it.
- Call `runBuild`, not the worker directly.
- Return Build output plus mutation evidence.

Milestone 1D: live sandbox proof

- Deploy preview from the implementation branch.
- Invoke the server Build request endpoint once.
- Confirm:
  - selected tool = Codex or STOP if not callable
  - workflow_dispatch run exists
  - sandbox file was mutated
  - sandbox commit was created
  - proofRunId continuity holds
  - evidence packet is pushed to origin

## Acceptance-Proof Design

Proof input:

- Product id: `milestone-1-sandbox-build`
- Build mode: `AUTOMATIC`
- Design output: minimal `MINIMUM BUILD DIRECTIVE`
- Target file path: `src/App.jsx` or sandbox proof target
- Source content: small deterministic React component
- `proofRunId`: generated by the server Build request endpoint

Expected evidence:

- FlowAI implementation commit SHA
- Build request id
- `proofRunId`
- selected tool id/name
- selected tool dispatch result
- GitHub workflow id
- GitHub Actions run id
- sandbox commit SHA
- mutated file path
- artifact id/name
- proofRunId continuity checklist

Acceptance statement if successful:

BUILD-PATH DISPATCH DEMONSTRATED

BUILDEXECUTIONWORKER STAGE 1 COMPLETE

No broader claim movement.

## STOP/BLOCK/DISPROOF Conditions

STOP:

- Build request does not enter `runBuild`.
- Tool selection is bypassed.
- Worker is invoked directly.
- Proof route is reused.
- A non-selected tool performs code generation.
- Mutation touches any non-sandbox repository.
- `proofRunId` continuity breaks.

BLOCK:

- `OPENAI_API_KEY` missing or rejected.
- `GITHUB_WORKFLOW_TOKEN` missing or lacks workflow/contents authority.
- Tool Intelligence service unavailable and no real selected tool can be resolved.
- Vercel preview cannot run the server Build request endpoint.

DISPROOF:

- Current architecture cannot route real Build requests through selected-tool dispatch before mutation without a larger refactor.
- GitHub Actions cannot safely commit in the sandbox from a FlowAI-triggered Build request.

## Verification To Run After Implementation Authorization

Planned checks:

```powershell
node --check api\forge\build.js
node --check api\_lib\buildExecutionWorker.js
node --check api\_lib\buildExecutionWorkerWorkflow.js
node --check src\lib\forge\buildRunner.js
npx vitest run tests\forge\buildStep.test.js tests\buildExecutionWorker.test.js
npm run lint:evidence
```

Live proof:

- Deploy preview from the implementation branch.
- Invoke the server Build request endpoint.
- Record the exact raw response, redacted for secrets.
- Verify the sandbox commit from GitHub.
- Commit `docs/cto/milestone-1-build-execution-worker-evidence-20260623.md`.

## CTO Recommendation

This plan is viable if W04 accepts a server-side Build request endpoint as the permanent Build path entrypoint. That endpoint is necessary because repository mutation credentials cannot safely be exposed to the existing browser-only Build form.

The smallest honest proof is not deploy or persistence. It is:

Build request

-> selected Codex dispatch

-> sandbox workflow dispatch

-> sandbox file mutation

-> sandbox commit

-> origin-verifiable evidence

Implementation should not begin until W04 adjudicates this plan from origin.
