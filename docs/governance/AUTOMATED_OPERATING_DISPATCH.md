# Automated Operating Dispatch - FlowAI Build Loop

Version: 1.2
Effective: from acceptance forward
Authority: CEO direction, May 27 2026
Reviewers: Codex Window (approved v1.1 + 2 clarifications), Codex PowerShell (approved v1.1 + 6 clarifications)
Status: PROPOSED v1.2 - pending CEO acceptance

## Operating Principle

Claude observes. Codex drives. Victor decides.

## Role Definitions

### Codex Window

Builder, local verifier, and process driver.

- Reads canonical sources directly:
  - `docs/specs/SSOT_TRACEABILITY_MATRIX.md`
  - `docs/specs/MASTER_BUILD_DISPATCH.md`
  - `docs/CANONICAL_REFERENCE.md`
  - `docs/CANONICAL_HISTORY.md`
  - `docs/governance/CODEX_WINDOWS_STANDING_DIRECTIVE.md`
  - `docs/specs/task-verification-manifest.json`
- Executes phases per Master Build Dispatch.
- For each task: builds, runs `verify-task.mjs` with task manifest, commits, and pushes when verification passes and the task is not high-risk.
- Stops only at the escalation triggers below.
- Updates `docs/CANONICAL_HISTORY.md` at task or phase completion, not at every internal retry.

### Codex PowerShell

Independent auditor.

- Mandatory audit for high-risk commits:
  - Repo write logic
  - Deployment logic
  - Secret/auth/credential handling
  - SSE payload shape changes
  - Code generation safety gate changes
  - SSOT VERIFIED promotions
- Mandatory audit at phase boundaries.
- Authoritative for gate decisions in the first three tasks after v1.2 adoption.
- Not invoked for routine low-risk commits.

### Claude Chat

Observational browser testing only.

- Records expected and actual behavior.
- Captures screenshots.
- Flags contradictions between observed behavior and SSOT.
- Does not prescribe implementation unless Victor asks.
- Does not author build dispatches unless Victor explicitly requests.
- Does not issue Phase Clearance.
- Does not re-litigate completed phases.
- Does not interpret outputs that have clear meaning.

### Victor

CEO.

- Sole authority for Phase Clearance.
- Sole authority to deploy production.
- Approves dispatch revisions.
- Makes strategic decisions when Codex escalates.

## Autonomous Execution Scope

Codex Window is pre-authorized to:

1. Read SSOT, Master Build Dispatch, and verification manifest.
2. Build/modify files per the dispatch.
3. Run tests, build, lint, SSOT checker, and `verify-task.mjs` with task-specific manifest.
4. Commit with standard message conventions.
5. Push to `origin/flowai-v0.1` when verification passes and the commit is not high-risk.
6. Update `SSOT_TRACEABILITY_MATRIX.md` only when a task changes implementation, evidence, or status relevant to an SSOT claim.
7. Update `CANONICAL_HISTORY.md` at task or phase completion, not noisy intermediate logs.
8. Refactor only when required to complete the current task safely, with no unrelated behavior changes.

## High-Risk Commits

For these commits, Codex commits locally, triggers PowerShell audit, then pushes only after audit passes:

- Repo write logic
- Deployment adapter or deployment paths
- Authentication, credential, or secret handling
- SSOT VERIFIED promotions
- Code generation safety gate changes
- SSE payload shape changes

If a high-risk commit is pushed accidentally before audit, PowerShell still audits before any deploy. Do not rewrite history unless Victor explicitly orders it.

## Safety Constraints

Never override these:

1. Never modify `src/api/base44Client.js`.
2. Never modify other platform boundary files.
3. Never write to original product repos.
4. Never push to `main` or `master` branch directly.
5. Never bypass safety gates in `src/lib/freshBuild/codebaseGenerator.js`.
6. Never stream secrets, tokens, full HTML, or full `designSpec` in SSE payloads.
7. Never promote SSOT items to VERIFIED without PowerShell audit.
8. Never claim Phase Clearance; this is exclusively Victor's authority.
9. Never deploy production. Codex may push branch commits only. Victor alone deploys production.
10. Any production-facing VERIFIED promotion requires a deploy truth check plus an artifact pointer.

## Test/Build Exceptions

Docs-only commits require SSOT checker and diff verification. Full test suite is recommended for docs commits but not required unless the task spec requires it.

## Escalation Triggers

Codex stops only at:

1. **Phase-level deploy gate** - all tasks in phase committed and pushed, production deploy needed.
2. **Browser test gate** - a user-visible change just deployed.
3. **Phase clearance gate** - all tasks complete, deployed, browser-tested, and PowerShell phase-boundary audit passed.
4. **Safety / ambiguity escalation** - verification fails after 2 retry attempts, spec contradicts SSOT, output materially diverges, production breakage is detected, or a high-risk commit is pending PowerShell audit.

For any task not one of these four triggers, Codex Window does not stop and does not request input.

## Verification Script Prerequisite

Before this dispatch takes full effect, Codex Window builds:

- `scripts/verify-task.mjs`
- `docs/specs/task-verification-manifest.json`

Usage:

```bash
node scripts/verify-task.mjs --task <task-id> --commit <sha>
```

The script reads the manifest and runs git scope checks, pattern checks, tests, build, lint, SSOT checker, protected-file checks, working tree checks, and a standard demarcation report.

For the first three tasks after v1.2 adoption, `verify-task.mjs` output is advisory and PowerShell remains authoritative for gate decisions. After three successful advisory cycles, `verify-task.mjs` becomes authoritative for low-risk commits.

## Escalation Report Format

```text
ESCALATION: [trigger type]
PHASE: [current phase]
TASK: [task name + commit SHA]
STATUS: [what just happened]
EVIDENCE: [test counts, files, verification output]
REQUIRED ACTION: [what Victor + Claude need to do]
NEXT TASK: [what Codex will do after action]
```

## Phase Clearance Criteria

A phase clears when all tasks are committed and pushed, production deploy is Ready, browser test passes when applicable, SSOT is updated, Known Gaps are documented, PowerShell phase-boundary audit passes, and Victor issues explicit clearance.

## Successful Task-Driven Cycle Definition

A successful task-driven cycle means:

- Task selected from Master Build Dispatch.
- Manifest entry exists in `task-verification-manifest.json`.
- Codex builds and commits.
- `verify-task.mjs` passes.
- PowerShell audits if high-risk.
- Commit pushed according to risk class.
- No regression in tests, build, lint, or SSOT checker.

## Acceptance Process

1. Victor accepts dispatch v1.2.
2. First implementation task: `feat: add automated task verification script and operating dispatch v1.2`.
3. Codex builds `scripts/verify-task.mjs`, `docs/specs/task-verification-manifest.json`, and this dispatch file.
4. Three advisory cycles test the new mode.
5. After three successful cycles, v1.2 is fully operational.

Until then, current operating mode continues.
