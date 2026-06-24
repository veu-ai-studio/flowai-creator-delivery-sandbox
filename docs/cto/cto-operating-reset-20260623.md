# CTO Operating Reset

Date: 2026-06-23

Owner: CTO (Codex)

Status: Active coordination decision. This is an executive coordination artifact, not a canonical amendment.

## Decision

The FlowAI workstream will return to:

Build

-> Evidence

-> Review

-> Decision

The workstream will stop spending cycles on:

Review of review

-> governance about governance

-> dispatch about dispatch

-> repeated gate descriptions without a new artifact

## Role Discipline

CTO owns implementation design, sequencing, and tasking CB.

W04 owns objective, acceptance bar, and final adjudication.

Claude is retained, but narrowed to artifact-bound adversarial review.

CT2 remains independent browser acceptance.

CB builds. CB2 audits. CD and CR review where assigned.

## Claude Usage Rule

No artifact = no Claude review.

Send Claude only:

- a plan
- an evidence packet
- a commit
- a run
- a recording
- an origin artifact
- a precise claim plus evidence

Do not send Claude:

- draft dispatches
- dispatch rewrites
- governance restatements
- reviews of reviews
- meta-governance
- dispatches about dispatches

Expected Claude output:

- PASS
- PASS-WITH-FINDINGS
- BLOCK
- exact evidence/claim mismatch
- exact claim earned

Claude should not act as co-CTO or dispatch factory.

## Project Boundary

The AOL UI Work-State Contract is AOL work unless W04/CEO explicitly maps it to a specific FlowAI runtime surface.

Current repo search found AOL guidance under `docs/aol`, but no FlowAI runtime card named `Connect Buyer` or matching `What do you want to buy?` / `Find Sellers` work state in `src`.

Therefore:

- Do not dispatch FlowAI CB to implement `NETWORK -> Connect Buyer` in FlowAI.
- Do not mix AOL UI milestones into FlowAI capability claims.
- If AOL Work-State Contract proceeds, route it through `docs/aol/`.
- If W04/CEO wants a FlowAI UI Work-State milestone, the dispatch must name the exact FlowAI route/card/component and the FlowAI acceptance artifact.

## FlowAI Runtime Lane

The FlowAI runtime lane remains product-engine proof:

1. BuildExecutionWorker Milestone 1: real Build path selects Codex adapter, dispatches it, and commits selected-tool output to the sandbox repo with proofRunId continuity.
2. Auditor: continue toward verified evidence only when real user-auth and CT2 confirmation exist.
3. Creator/Upgrader: resume only after Build Execution exists.

BuildExecutionWorker M1 current state:

- Plan exists on origin.
- Plan commit: `0687c38`.
- Plan file: `docs/cto/milestone-1-build-execution-worker-plan-20260623.md`.
- CTO adjudication recommendation: PASS-WITH-FINDINGS.
- Required findings to fold into implementation:
  - Codex claim boundary is OpenAI API Codex adapter, not Codex desktop/CLI/headless.
  - proofRunId continuity must fail closed across request, selected-tool dispatch, runner dispatch, runner execution, mutated file, commit message, artifact, FlowAI response, and evidence packet.

## Operating Rule

If the next action is not one of these, stop:

- Build a scoped runtime change.
- Produce evidence from an actual run.
- Verify an origin artifact.
- Review a concrete artifact.
- Make a claim movement decision from evidence.

Anything else is administrative drag.

## CTO Action

No further gate documents for Milestone 1.

No FlowAI implementation of AOL UI.

Next FlowAI technical action, once implementation is requested in this thread, is BuildExecutionWorker M1 execution against the already-adjudicated plan.
