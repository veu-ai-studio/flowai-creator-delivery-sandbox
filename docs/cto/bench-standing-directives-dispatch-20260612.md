# FROM: CTO
# TO: CB, CB2, CT2, CR
# ACTION: Standing bench directives - read and adopt

Date: 2026-06-12
Branch: `docs/cto-four-path-execution-20260612`

## Directive

Each technical bench role must read its standing goal directive and operate from it unless a newer CTO/W04/CEO instruction supersedes it.

## Role Files

- CB: `docs/cto/standing-goal-cb.md`
- CB2: `docs/cto/standing-goal-cb2.md`
- CT2: `docs/cto/standing-goal-ct2.md`
- CR: `docs/cto/standing-goal-cr.md`

## Supervisor

CTO is the direct technical supervisor for CB, CB2, CT2, and CR dispatch flow.

## Routine Work Rule

Do not wait for Victor or W04 on routine work inside your assigned role scope. Approve and run routine commands needed to inspect, test, build, review, or capture evidence.

Use the pause conditions in your role file for anything non-routine.

## Hard Stops

Pause before:

- Canonical SSOT changes.
- VERIFIED or matrixArtifact movement.
- Destructive commands.
- Secret exposure.
- New product, repo, domain, or business-direction decisions.
- Unsupported production promotion/rollback.
- Any result that would require fabricating branch, URL, score, governance, or ProductSSOT evidence.

## Repo-As-Communication-Layer Rule

Reports, prompts, DoDs, review results, screenshots/transcript summaries, and proof evidence must be committed under `docs/cto/` on a branch pushed to origin.

Victor is not the relay.
