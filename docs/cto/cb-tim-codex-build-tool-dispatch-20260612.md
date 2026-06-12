# CB Dispatch - Add Codex as Rank-1 Build Tool in TIM

Date: 2026-06-12
From: CTO
To: CB
Priority: immediate after current Path 2 merge/proof gate unless W04 reorders
Runtime repo: `C:\Users\victo\Downloads\truthful-flow-logic-lab`
Suggested branch: `fix/tim-codex-build-tool`
Action label: KEY BUILD
VERIFIED movement: no

## Required Reading

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/tim-codex-build-tool-amendment-plan-20260612.md`

## Problem

The Tool Intelligence Marketplace Build step currently omits Codex.

Observed/expected current UI state:

- Claude Code: `AUTO PENDING APPROVAL`
- Cursor: `AUTO STUB UNAVAILABLE`
- Base44: `AUTO STUB UNAVAILABLE`

Required target:

- Codex appears as rank 1 for Step 3 Build.
- Codex ranks above Claude Code, Cursor, Bolt, Windsurf, Replit, and Base44.
- When FlowAI reaches Step 3 Build, it selects Codex in AUTOMATIC mode if Codex is honestly callable.
- If Codex is not honestly callable because an adapter/credential is missing, the UI/SSE must say that exactly and must not relabel a fallback as Codex.

## Ownership

Primary files to inspect and likely edit:

- `src/lib/tools/stepToolVisibility.js`
- `src/lib/toolRegistry.js`
- `src/lib/tools/toolDispatchContract.js`
- `src/lib/orchestra/index.js`
- `src/lib/orchestra/codex.js` if adding the member
- `src/lib/forge/buildRunner.js`
- relevant tests under `tests/`

Secondary files if code reality requires:

- `api/_lib/marketplaceSeed.js`
- `api/_lib/lifecycleToolSlots.js`
- `src/lib/tools/ToolIntelligenceService.js`
- Step-card/UI tests for `RunConstructionPanel` or Forge pages

Do not modify:

- canonical docs
- matrixArtifact / VERIFIED entries
- production env
- unrelated orchestration branches

## Required Behavior

### Ranking

Step 3 Build candidates must rank:

1. Codex
2. Claude Code
3. Cursor
4. Bolt
5. Windsurf
6. Replit
7. Base44

### Callable Honesty

Codex may show `callable` only if:

- it resolves to a real Orchestra member or dispatch adapter
- required server-side credentials are present
- invocation returns real `MemberResult` output
- tests prove the path does not silently fall back while still labeling the output as Codex

If full Codex repo-agent behavior is not yet available in Vercel, implement the honest minimum adapter available and label it accurately. Do not claim tests/push/branch behavior unless the adapter does those actions.

### Build Runner

`runBuild` must not hardcode Anthropic readiness when Codex is selected. Readiness and dispatch must follow the selected member.

If fallback is needed, it must be explicit in output fields and not count as Codex-built evidence.

## Tests Required

At minimum:

1. `rankedToolsForStepCard('build')` returns Codex at rank 1.
2. Build candidate ordering includes Codex, Claude Code, Cursor, Bolt, Windsurf, Replit, Base44 in the required order.
3. Dispatch contract resolves Codex aliases to member id `codex`.
4. Missing Codex credential produces `missing_credentials` or another honest non-callable state.
5. If Codex member is wired, member listing includes `codex` with `code-patch` / `generate-from-scratch`.
6. Build runner selected-tool output chooses Codex in AUTOMATIC mode when available.
7. Build runner does not require `ANTHROPIC_API_KEY` for a Codex-selected path unless the fallback is explicitly Claude.
8. Existing platform/Base44/auth/source-mapping boundaries remain unchanged.

Run focused tests for all touched modules.

Run `npm run build:preflight`.

If runtime Forge UI is touched, include browser/CT2 instructions to confirm Step 3 Build displays Codex rank 1 without overlap or false callable labels.

## DoD Required

Report:

- branch
- commit SHA
- files changed
- tests run and results
- proof label per proof
- evidence tier claimed
- exact UI/SSE output for Build candidate list
- whether Codex is `ranked`, `callable`, and/or `dispatched`
- any missing credentials/adapters
- claim impact
- VERIFIED movement: no

## Stop Conditions

Stop without implementation if:

- Codex cannot be wired honestly without an external worker/API that is not available in repo/env.
- The only possible change is to rename Claude Code as Codex.
- The implementation would bypass any repair integrity, parse, diff-preserve, platform-boundary, route-rewrite, auth-gate, secret, package, branch, deploy, governance, or regression gate.

No production promotion and no VERIFIED movement are authorized by this dispatch alone.
