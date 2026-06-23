# CB Dispatch: BuildExecutionWorker M1

Date: 2026-06-23

From: CTO (Codex)

To: CB

Status: IMPLEMENTATION AUTHORIZED

Branch: `feature/build-execution-worker-m1`

Base: `origin/feature/build-execution-worker-m0` at or after `44f9579`

## Objective

Implement the smallest honest BuildExecutionWorker M1 proof.

The proof must show that the real FlowAI Build path can move from selected Build tool to dispatched execution to sandbox repository mutation.

Required chain:

```text
Build Request
-> buildRunner
-> getTopTool / selectForgeStepTool
-> selected Build tool
-> dispatch
-> sandbox runner
-> repository mutation
-> commit
-> evidence
```

This milestone does not prove deploy, persistence, behavioral verification, Creator, Upgrader, Universal Engine, or Build Execution verified.

## Source Plan

Implement against:

`docs/cto/milestone-1-build-execution-worker-plan-20260623.md`

Fold in the PASS-WITH-FINDINGS corrections captured in:

`docs/cto/cto-operating-reset-20260623.md`

and this dispatch.

## Non-Negotiable Scope

No proof-only route.

No direct worker invocation.

No local script stand-in.

No manual mutation.

No production repository mutation.

No customer repository mutation.

No FlowAI production repository mutation.

The mutation must originate from the real Build path:

```text
Build Request
-> buildRunner
-> getTopTool / selectForgeStepTool
-> selected Build tool
-> dispatch
```

## Selected Tool Rule

Do not hardcode the proof to Codex.

The selected Build tool is the tool returned by the real Tool Intelligence path:

```text
selectForgeStepTool
-> selectToolForStep
-> getTopTool('build')
```

Evidence must include the exact selected-tool output, including at minimum:

- `proofRunId`
- selected tool id/name
- ranking or score fields available from Tool Intelligence
- reason/lineage fields available from Tool Intelligence
- selected member id passed into dispatch

If the selected tool is Codex, invoke Codex honestly through the existing OpenAI API Codex adapter boundary. Do not claim Codex Desktop, Codex CLI, or headless Codex unless that is actually what runs.

If Codex is selected and `OPENAI_API_KEY` or other required Codex adapter authority is absent, STOP or BLOCK. Do not substitute CB, CTO, Claude, shell scripts, GitHub Actions, or another executor and relabel it Codex.

If a non-Codex tool is selected, do not override the selection. Either invoke that selected tool honestly if it is callable, or STOP with exact evidence explaining why the selected tool cannot be executed.

The GitHub Actions runner is the mutation worker only. It is not the selected Build tool unless Tool Intelligence actually selected a GitHub Actions build tool.

## Sandbox Hard Stop

The only allowed mutation target is:

`veu-ai-studio/flowai-build-execution-sandbox`

Any other owner/repo must hard-stop before workflow write, workflow dispatch, file mutation, or commit.

Mirror the strict containment posture already proven in the runtime dispatch authority proof.

## proofRunId Continuity

`proofRunId` must be generated once and fail closed through the complete chain.

The same `proofRunId` must appear in:

- Build request
- Tool Intelligence selection result
- selected member dispatch payload
- runner dispatch payload
- runner execution logs or artifact
- mutated file
- commit message
- FlowAI response
- evidence packet

If any link is missing or mismatched, the proof fails.

## Mutation Content

The committed sandbox file must contain real selected-tool output.

It must not be a static placeholder, a prewritten fixture, or text generated directly by CB/CTO.

Minimum mutated file path:

`proof/build-execution/${proofRunId}.json`

Minimum commit message:

`FlowAI BuildExecutionWorker Stage 1 ${proofRunId}`

The file should include:

- `proofRunId`
- `buildRequestId`
- selected tool id/name
- selected member id
- dispatch/run id
- selected-tool output or an auditable excerpt/hash plus storage reference
- mutation timestamp
- sandbox repo identifier

## Implementation Boundary

Allowed:

- Add a server-side Build request entrypoint if needed to keep credentials off the browser.
- Add a mutation executor hook inside `runBuild` after the selected tool returns output.
- Add sandbox-only GitHub Actions workflow dispatch helpers.
- Reuse helper patterns from Milestone 0.

Not allowed:

- Calling `/api/runtime-dispatch-authority-proof`.
- Reusing Milestone 0 as the proof route.
- Mutating from outside the Build request path.
- Adding deploy, persistence, behavior tests, Creator, Upgrader, or Universal Engine work.
- Claiming Production/Upgrader Build path proof from this forge Build path milestone.

## Required Evidence Packet

Create an evidence packet in `docs/cto/` with:

- implementation branch
- implementation commit SHA
- Build request id
- `proofRunId`
- exact `getTopTool('build')` / selection output
- selected member id
- dispatch/run identifier
- sandbox repository URL
- mutated file path
- sandbox commit SHA
- independent read-back of sandbox commit content
- proofRunId continuity checklist
- test output
- `npm run lint:evidence` result
- explicit claim boundary

The evidence must be origin-verifiable. Local-only evidence does not count.

## Verification Required Before Reporting

Run targeted tests for the BuildExecutionWorker path.

Run:

```text
npm run lint:evidence
```

Perform a read-only verification of the sandbox commit from the sandbox repository and record the result in the evidence packet.

## Expected Outcomes

All outcomes are acceptable if evidenced:

- SUCCESS
- STOP
- BLOCK
- DISPROOF

If the real Build path cannot dispatch the selected tool honestly, report STOP.

If credentials or sandbox mutation authority are missing, report BLOCK.

If the path only works through a proof route or direct worker call, report DISPROOF for Milestone 1.

Do not engineer around any of these walls.

## Claim Boundary

If successful, the only claim earned is:

`BUILD-PATH DISPATCH DEMONSTRATED`

and:

`BuildExecutionWorker Stage 1 Complete`

Precise meaning:

The real forge Build path selected a Build tool through Tool Intelligence, dispatched the selected tool, and committed that selected-tool output to the approved sandbox repository with proofRunId-traced evidence.

This does not prove:

- committed code correctness
- build/test success of the committed output
- deploy
- persistence
- behavioral verification
- agnosticism
- Production/Upgrader autonomous execution
- Creator verified
- Upgrader verified
- Universal Engine verified

## Reporting

Report back with the evidence packet path and origin commit SHA.

Do not ask W04 or Victor to adjudicate until the artifact exists on origin.
