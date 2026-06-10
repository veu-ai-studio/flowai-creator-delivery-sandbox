# FlowAI Window Roster

## Executive Roles

| Role | Window | Responsibility |
|---|---|---|
| Victor | CEO | Final authority; paste-and-approve only; final guided browser test when required. |
| W04 | Claude strategic orchestration and adjudication | Owns operating rhythm, adjudicates reviewer reports, issues CLEAR TO BUILD / CLEAR TO MERGE / CLEAR TO PROMOTE. |
| CTO | CTO executive layer | Owns technical direction, architecture decisions, evidence integrity, trade-off calls, and cross-workstream technical quality. |

## Technical Workstreams

| Role | Window | Responsibility |
|---|---|---|
| CB | Codex environment | Builder. Drafts and implements approved dispatches. Sole code writer when assigned. |
| CB2 | Codex environment | Auditor. Performs continuous production and repo audits; reports blockers and defects. |
| CT2 | Codex environment | Browser and acceptance tester. Runs forge acceptance testing and production/runtime checks. |
| CD | Claude Code on PowerShell | Reviewer. Primary SSOT/data-shape/implementation reviewer. |
| CR | Codex on PowerShell | Reviewer. Adversarial evidence, security, governance, and deployment-proof reviewer. |

## Working Rule

Only CD and CR are PowerShell-designated reviewer windows. CB, CB2, and CT2 are Codex environments.

Victor should not debug, inspect repos, run commands, or reconcile technical conflicts. Machine windows prepare exact actions; Victor approves or performs only specified final CEO/browser actions.
