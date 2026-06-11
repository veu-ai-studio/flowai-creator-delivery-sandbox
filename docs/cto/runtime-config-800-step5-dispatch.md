# Runtime Config 800s Step 5 Review Dispatch

Date: 2026-06-11
Owner: CTO
Branch: `fix/forge-runtime-config-800`
Review target: latest `origin/fix/forge-runtime-config-800`
Technical code delta: `61d3f2cc3d55c38c1faacb39542be225c2e1c32a`

## Purpose

This file is the repo-backed dispatch index for CD and CR Step 5 review.
CD and CR should pull from origin, check out the latest runtime branch, and review from the files listed below.

Victor is not the relay for these prompts.

## Reviewers

- CD: Claude Code reviewer on PowerShell.
- CR: Codex reviewer on PowerShell.

## Required Review Files

CD should read:

- `docs/cto/cd-review-runtime-config-800-prompt.md`

CR should read:

- `docs/cto/cr-review-runtime-config-800-prompt.md`

Both reviewers may use these context files:

- `docs/cto/pr11-deferred-proof-runtime-config-20260611.md`
- `docs/cto/runtime-config-800-pr-merge-packet.md`
- `docs/cto/runtime-config-800-advisory-review-20260611.md`

## Code Files In Scope

- `api/inngest.js`
- `api/agent/3/execute.js`
- `tests/api/agent3ExecuteTimeout.test.js`

## Review Question

Return `PASS` or `BLOCK` for the latest `origin/fix/forge-runtime-config-800`.

If `BLOCK`, include exact file and line evidence plus the minimal required patch.

## Boundaries

- No live proof is requested from CD or CR.
- No scoring changes are in scope.
- No governance writes are in scope.
- No ProductSSOT changes are in scope.
- No VERIFIED movement is allowed.
- W04 CLEAR TO MERGE is still required after CD and CR PASS.
- Post-merge production proof is still required before any success or VERIFIED claim.

