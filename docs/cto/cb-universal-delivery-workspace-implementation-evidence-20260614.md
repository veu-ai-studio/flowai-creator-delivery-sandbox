# CB Evidence - Universal Delivery Workspace Runtime Patch

Date: 2026-06-14 UTC
Branch: `feature/universal-delivery-workspace`
Diagnosis commit: `1290110`
Canonical docs edited: no
matrixArtifact edited: no
VERIFIED movement: no

## Runtime Summary

Implemented the smallest honest Universal Delivery Workspace substrate for Fresh Build delivery:

- FlowAI-owned delivery workspace provisioning in `src/lib/provisioning/upgradeTargetProvisioner.js`.
- GitHub owner guardrails: workspace repos must use the configured FlowAI-owned owner.
- GitHub App permission preflight: requires `Administration: write`, `Contents: write`, and all-repository access when using the app path.
- Operator-token fallback is recorded as `credentialSource:"operator_token"` and token values are not JSON-serializable in workspace metadata.
- Vercel project creation now uses `/v11/projects`; deployment continues through `/v13/deployments`.
- Fresh Build can initialize an empty repo by creating the first tree, commit, and branch ref when the base branch is missing.
- Fresh Build uses an auto-provisioned delivery workspace when no preconfigured `upgrade_repo` exists and a FlowAI delivery owner is configured.
- Description-only Fresh Build can enter `/api/run-construction` without a URL, generates description-derived feature/design inputs, and does not fabricate baseline score evidence.

## Files Changed

- `src/api/run-construction.js`
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `src/lib/freshBuild/freshBuildOrchestrator.js`
- `src/lib/provisioning/upgradeTargetProvisioner.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- `tests/freshBuild/freshBuildOrchestrator.test.js`
- `tests/provisioning/upgradeTargetProvisioner.test.js`
- `docs/cto/cb-universal-delivery-workspace-diagnosis-20260614.md`
- `docs/cto/cb-universal-delivery-workspace-implementation-evidence-20260614.md`

## Verification

Focused syntax:

- `node --check src/lib/provisioning/upgradeTargetProvisioner.js` - PASS
- `node --check src/lib/freshBuild/freshBuildDeploymentAdapter.js` - PASS
- `node --check src/lib/freshBuild/freshBuildOrchestrator.js` - PASS
- `node --check src/api/run-construction.js` - PASS

Focused tests:

- `npx vitest run tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js` - PASS, 2 files, 30 tests
- `npx vitest run tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js` - PASS, 3 files, 40 tests

Full preflight:

- `npm run preflight` - PASS
- Lint PASS
- Build preflight PASS
- Vitest PASS: 236 files, 3740 passed, 3 skipped
- Lane discipline PASS
- SSOT traceability PASS
- Matrix generation PASS

Operational note: local `node_modules` was missing declared packages such as `@clerk/clerk-react`; `npm install` was run to restore dependencies before build/preflight. It produced dependency audit warnings, but no dependency files were changed.

## Browser Test Instructions

Automated gate:

- Run `npm run preflight`.
- Expected: lint/build/tests/lane/SSOT/matrix all PASS.

Manual/runtime proof after review merge and production deploy:

- Submit a Fresh Build request with no URL and a plain product description.
- Expected: run starts, registry step reports description-only skip, Fresh Build emits `description_build_brief`, creates/uses a FlowAI-owned GitHub repo, writes generated code, creates/uses a Vercel project, deploys the branch, returns a public URL only after READY/browser-clear evidence, and records workspace metadata without token values.

PASS criteria:

- Public generated URL opens anonymously.
- Workspace metadata contains repo, branch, commit, Vercel project/deployment, credential source labels, and no secrets.
- No original/protected repo write occurs.
- No VERIFIED movement is claimed.

FAIL criteria/action:

- Missing GitHub App `Administration: write`, `Contents: write`, or all-repository access must block with explicit status.
- Missing Vercel project/deploy credential must block with explicit status.
- Any token value in logs/status/final payload blocks merge; patch same branch.

## Mandatory DoD Proof Fields

Mocked tests used: yes
Unmocked runtime proof: no - branch not deployed or CT2-run yet
Production URL serving HEAD commit SHA verified: no - no production promotion in this dispatch
Proof labels used: UNIT
Evidence tier claimed: B
Claim impact: no movement
VERIFIED movement: no

## Blockers

No code blocker remains on this branch.

Runtime proof still depends on production environment configuration:

- Configured FlowAI-owned GitHub owner.
- GitHub App permissions or operator-token fallback.
- Vercel team/project creation credentials.
