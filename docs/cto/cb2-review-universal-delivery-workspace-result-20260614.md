# CB2 Review Result - Universal Delivery Workspace

FROM: CB2
TO: CTO
DATE: 2026-06-15 UTC
REQUESTED PACKET DATE: 2026-06-14
VERDICT: BLOCK

## Branch Audited

- Branch: `origin/feature/universal-delivery-workspace`
- Branch head audited: `c19a8c4e89bb6cdf99d675e8c61d40997a55d7b3`
- Current `origin/main` after fetch: `e1eb784c2c76c9f3bd1c3a73edb2abcd0a497fa1`
- Merge base: `f9c570601febae842d02e12faea0e5fce4dcf6be`
- Note: the branch copy of `docs/cto/cb2-review-universal-delivery-workspace-dispatch-20260614.md` still says review head `141c0431c7e86816091dafed481651e5b63b4d3c` and review base `7a13592312937b669d9422af0c26adf7a9a1827b`, but current `origin/main` retargeted the review packets to `c19a8c4` / `f9c5706`.

## Result

BLOCKER COUNT: 1
REGRESSION COUNT: 2 docs/gate regressions under the blocker
SECRET EXPOSURE OBSERVED: no raw GitHub/Vercel token value observed in runtime/docs by grep and focused tests
CANONICAL/MATRIX CHANGE OBSERVED: no diff in `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`, or `src/lib/orchestratorFramework/matrixArtifact.json` against current `origin/main`
CURRENT MAIN EVIDENCE PRESERVED: CT2/SAIGE evidence files are not deleted, but current Universal Delivery CTO review/gate evidence docs are deleted

## Blocking Finding

### B1 - Branch is stale against current `origin/main` and would delete current review/gate evidence docs

`git diff --name-status origin/main..origin/feature/universal-delivery-workspace --diff-filter=D` reports:

```text
D docs/cto/cto-review-universal-delivery-workspace-20260614.md
D docs/cto/universal-delivery-review-gate-status-20260614.md
```

These are active evidence/gate files on current `origin/main`, not disposable stale files:

- `origin/main:docs/cto/cto-review-universal-delivery-workspace-20260614.md:8` records HEAD `c19a8c4e89bb6cdf99d675e8c61d40997a55d7b3`.
- `origin/main:docs/cto/cto-review-universal-delivery-workspace-20260614.md:9` records CTO verdict `PASS-WITH-FINDINGS, pending CD/CR/CB2 final clearance`.
- `origin/main:docs/cto/cto-review-universal-delivery-workspace-20260614.md:34` records full branch preflight PASS at `c19a8c4`.
- `origin/main:docs/cto/universal-delivery-review-gate-status-20260614.md:17-21` records CD, CR, and CB2 formal gates still pending.
- `origin/main:docs/cto/universal-delivery-review-gate-status-20260614.md:60` says not to merge until formal reviews pass or W04 accepts fallback evidence.

The same stale-sync regression also rolls review packets back:

- Current main CB2 packet: `origin/main:docs/cto/cb2-review-universal-delivery-workspace-dispatch-20260614.md:12-13` targets `c19a8c4` / `f9c5706`.
- Branch CB2 packet: `origin/feature/universal-delivery-workspace:docs/cto/cb2-review-universal-delivery-workspace-dispatch-20260614.md:12-13` reverts to `141c043` / `7a1359`.
- Current main CB2 packet: `origin/main:docs/cto/cb2-review-universal-delivery-workspace-dispatch-20260614.md:49` requires the handler SSE test addendum.
- Branch CB2 packet omits that handler-test command.

Impact: this violates the explicit no-deletion evidence-doc requirement and would erase current gate state for the exact branch under review. Merge must be blocked until the branch is resynced with current `origin/main` and preserves these docs/gate updates.

## Non-Blocking Findings And Boundaries

1. Runtime substrate is real by unit/focused evidence, but durable workspace/ProductSSOT persistence is not implemented in the changed Fresh Build path. The dispatch requires "Persist workspace metadata for ProductSSOT/evidence binding" at `docs/cto/cb-universal-delivery-workspace-dispatch-20260614.md:57`. The changed runtime returns `deliveryWorkspace` in the Fresh Build write result (`src/lib/freshBuild/freshBuildDeploymentAdapter.js:694`, `729`, `767`) and keeps credentials non-enumerable (`src/lib/provisioning/upgradeTargetProvisioner.js:504-505`), but I found no new `workspace_runs.auto_params` or `product_ssot` write for the DeliveryWorkspace in the changed files. Do not claim ProductSSOT/workspace persistence complete before a follow-up patch or CT2 evidence proves it.

2. Type 2 description-only entry is honestly represented in the code and tests. `src/api/run-construction.js:363-375` allows Fresh Build with a description and skips URL SSRF validation only when no URL exists; `tests/api/runConstructionHandlerSse.test.js:466` asserts `assertPublicHttpUrl` is not called. `src/lib/freshBuild/freshBuildOrchestrator.js:64`, `184-185`, and `499-508` use a description build brief and leave baseline score null/not configured. Tests assert `SCORE_NOT_CONFIGURED` and `baselineScore: null` at `tests/freshBuild/freshBuildOrchestrator.test.js:280-287`.

3. Secret handling looks clean by inspection and tests. Workspace credentials are non-enumerable at `src/lib/provisioning/upgradeTargetProvisioner.js:504-505`. Tests assert JSON output does not contain dummy GitHub/Vercel secrets at `tests/freshBuild/freshBuildDeploymentAdapter.test.js:194-195`, `601-602`, `923`, and `tests/provisioning/upgradeTargetProvisioner.test.js:136`, `182-183`.

4. No reliance on user-preconfigured GitHub/Vercel was observed for the claimed auto workspace path. The new path requires a configured FlowAI owner (`src/lib/provisioning/upgradeTargetProvisioner.js:65`, `423`) and blocks wrong owners (`src/lib/provisioning/upgradeTargetProvisioner.js:433`). GitHub App permission gaps block with `GITHUB_APP_PERMISSION_REQUIRED` (`src/lib/provisioning/upgradeTargetProvisioner.js:125`). Vercel project creation uses `/v11/projects` (`src/lib/provisioning/upgradeTargetProvisioner.js:382`).

5. Protected/original repo and main-branch write guards remain visible: `src/lib/freshBuild/freshBuildDeploymentAdapter.js:605` blocks same original repo writes, and `src/lib/freshBuild/freshBuildDeploymentAdapter.js:620` blocks main/master writes unless explicitly allowed.

6. No ProductSSOT/matrix/canonical overclaim was observed in the canonical/matrix files. `git diff --name-only origin/main..origin/feature/universal-delivery-workspace -- docs/CANONICAL_REFERENCE.md docs/BUILD_PROTOCOL.md docs/IMPLEMENTATION_PLAN.md src/lib/orchestratorFramework/matrixArtifact.json` returned no files. However, the branch does roll CTO coordination docs backward, including `docs/cto/current-directive.md` and `docs/cto/session-brief.md`, so the branch must resync before merge.

## Verification Run

Run from a detached worktree at `c19a8c4` to avoid touching the target repo's live dirty worktree.

- `git fetch origin` - PASS.
- `git diff --name-status 7a13592312937b669d9422af0c26adf7a9a1827b..origin/feature/universal-delivery-workspace` - PASS for the dispatch's fixed base view, but this is not sufficient against current `origin/main`.
- `git diff --name-status origin/main..origin/feature/universal-delivery-workspace` - BLOCK evidence: deletes the two current Universal Delivery review/gate docs listed above.
- `npx vitest run tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js` - PASS, 3 files, 40 tests.
- Addendum: `npx vitest run tests/api/runConstructionHandlerSse.test.js tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js` - PASS, 4 files, 53 tests.
- `npm run preflight` - PASS: lint, build preflight, Vitest 236 files / 3741 passed / 3 skipped, lane discipline, SSOT traceability, matrix generation.

## Required Action

Resync `feature/universal-delivery-workspace` with current `origin/main`, preserving:

- `docs/cto/cto-review-universal-delivery-workspace-20260614.md`
- `docs/cto/universal-delivery-review-gate-status-20260614.md`
- current review packet head/base `c19a8c4` / `f9c5706`
- the handler-level test gate command in the CB2 packet
- current `docs/cto/current-directive.md` and `docs/cto/session-brief.md` updates

Then rerun focused tests plus full preflight and re-request CB2.
