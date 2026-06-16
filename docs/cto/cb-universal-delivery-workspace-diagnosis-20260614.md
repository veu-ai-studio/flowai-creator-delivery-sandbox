# CB Diagnosis - Universal Delivery Workspace

Date: 2026-06-14 UTC
Branch: `feature/universal-delivery-workspace`
Base: `2c0d98695f6adf965c8560f5a5ae8a736f597126`
Scope: diagnosis before runtime patching
Canonical docs edited: no
matrixArtifact edited: no
VERIFIED movement: no

## Required Reading Confirmed

Read before this diagnosis:

- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/session-brief.md`
- `docs/cto/cb-universal-delivery-workspace-dispatch-20260614.md`
- `docs/cto/universal-input-journey-audit-20260614.md`
- `docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md`
- `docs/cto/universal-delivery-workspace-postclearance-runbook-20260614.md`

Production health checked during diagnosis: `https://flowai-dun.vercel.app/api/health` returned `ok:true`, branch `main`, commit `d6b92d54e1693fd18f37b5549df9d68285204449`, `githubAppReady:true`, `inngestReady:true`, and `vercelKv:PASS`. That health response does not expose GitHub App permission detail.

## 1. Current Callers Of `provisionUpgradeTarget`

Runtime caller:

- `src/lib/agents/renewal/orchestrator.js:1597` calls `provisionUpgradeTarget({ product, mode: state.mode, env: process.env })` after resolving upgrade targets for registered-product Path A. It records the returned advisory state in `state.upgradeProvisioning` and emits a Step 5 log.

Tests:

- `tests/provisioning/upgradeTargetProvisioner.test.js:63` calls `provisionUpgradeTarget` directly.

Definition:

- `src/lib/provisioning/upgradeTargetProvisioner.js:288` defines `provisionUpgradeTarget`.

Important behavior: the current exported function is advisory only. It returns `recommendation: "provisioning_required"` or `"already_provisioned"` and token availability at `src/lib/provisioning/upgradeTargetProvisioner.js:288-303`; it does not call `ensureUpgradeRepo` or `ensureVercelProject`.

## 2. Current Callers Of `writeGeneratedCodebaseToUpgradeRepo`

Runtime caller:

- `src/lib/freshBuild/freshBuildOrchestrator.js:328` selects `options.writeGeneratedCodebase || writeGeneratedCodebaseToUpgradeRepo`.
- `src/lib/freshBuild/freshBuildOrchestrator.js:404` invokes the selected writer.

Tests:

- `tests/freshBuild/freshBuildDeploymentAdapter.test.js` calls `writeGeneratedCodebaseToUpgradeRepo` directly at lines 103, 123, 157, 177, 211, 281, 351, 418, 471, 511, 567, 629, 675, 731, and 828.

Definition:

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js:483` defines `writeGeneratedCodebaseToUpgradeRepo`.

Important behavior: the adapter requires an existing `upgrade_repo`, `upgradeRepo`, or `github_repo_url`; if missing it returns `UPGRADE_REPO_REQUIRED` at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:504-510`. It can write a generated tree to an existing repo branch, but it does not create the repo.

## 3. Current Callers Of `deployBranchPreview`

Direct runtime callers:

- `src/lib/agents/renewal/orchestrator.js:985` resolves `_deployBranchPreview = deps.deployBranchPreview || deployBranchPreview`; `src/lib/agents/renewal/orchestrator.js:4592` invokes it for Path A operator branch deploy.
- `src/lib/agents/renewal/optionCPipeline.js:537` resolves `_deployBranchPreview = deps.deployBranchPreview || deployBranchPreview`; `src/lib/agents/renewal/optionCPipeline.js:641` invokes it in Step G.

Fresh Build default dependency:

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js:2` imports `deployBranchPreview`.
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js:492` defaults `deployPreviewImpl = deployBranchPreview`.
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js:611` invokes `deployPreviewImpl(vercelArgs)`.

Tests:

- `tests/agents/renewal/vercelBranchDeploy.test.js` calls `deployBranchPreview` directly across the happy path, error, timeout, auth, and validation cases.

Definition:

- `src/lib/agents/renewal/vercelBranchDeploy.js:263` defines `deployBranchPreview`.

Important behavior: `deployBranchPreview` posts to `/v13/deployments` and polls `/v13/deployments/{deploymentId}` until `READY`. It requires existing `projectId`, `orgId`, `owner`, `repo`, `branchName`, and `token`; it does not create or resolve a Vercel project.

## 4. Recommended Persistence Backend For `DeliveryWorkspace`

Recommended first substrate: Supabase-backed `workspace_runs` with a JSON workspace envelope stored in an existing JSON column, plus Step/status mirroring through `forgeRunStatusBus`.

Reasoning:

- `supabase/migrations/0001_initial.sql:98` already creates `workspace_runs`.
- `supabase/migrations/0001_initial.sql:107-110` includes `inputs jsonb`, `objective`, `auto_params jsonb`, and `multi_mode`.
- `api/_lib/db.js:248-263` already inserts `workspace_runs`.
- `api/_lib/db.js:291-301` already updates `workspace_runs`.

This avoids an unapproved schema migration for the first substrate. A dedicated `delivery_workspaces` table would be cleaner long-term, but the active dispatch says to stop if a durable workspace state requires an unapproved schema/canonical change. For this patch, `workspace_runs.auto_params.deliveryWorkspace` can hold non-secret metadata while ProductSSOT receives references/evidence pointers.

## 5. Supabase Tables Already Available For Run/Workspace State

Available:

- `workspaces`: created at `supabase/migrations/0001_initial.sql:84`.
- `workspace_runs`: created at `supabase/migrations/0001_initial.sql:98`.
- `run_steps`: created at `supabase/migrations/0001_initial.sql:123`.
- RLS policies for `workspaces` and `workspace_runs`: `supabase/migrations/0011_rls_policies.sql:131-172`.
- `product_ssot`: created at `supabase/migrations/0013_product_ssot.sql:29`.
- `product_ssot_version`: created at `supabase/migrations/0013_product_ssot.sql:57`.

Not found:

- No dedicated `delivery_workspaces` table currently exists.
- No existing schema column specifically named `delivery_workspace` was found.

## 6. Can `forgeRunStatusBus` Carry Workspace Metadata Without Becoming Source Of Truth?

Yes, with a strict boundary.

`api/_lib/forgeRunStatusBus.js` is a status/event channel backed by Vercel KV when configured and memory otherwise. It normalizes records with `events`, `final`, and `error` fields at `api/_lib/forgeRunStatusBus.js:39-58`; appends events at `api/_lib/forgeRunStatusBus.js:109-134`; and marks terminal failures at `api/_lib/forgeRunStatusBus.js:136-169`.

It can carry redacted workspace snapshots for UI/run visibility: owner, repo, branch, commit SHA, Vercel project/deployment IDs, URL, credential source label, and status. It must not be the source of truth because memory fallback is explicitly non-durable and KV has a 24-hour TTL (`STATUS_TTL_SEC` at `api/_lib/forgeRunStatusBus.js:12`). Persistent state should live in Supabase `workspace_runs.auto_params.deliveryWorkspace` and ProductSSOT references.

## 7. Can `product_ssot` Reference Workspace Artifacts Safely?

Yes, if it stores references and evidence metadata, not credentials.

`product_ssot` has JSONB blocks for `identity_block`, `build_brief`, and `architecture_snapshot`, plus append-only `delta_log` and `governance_record` arrays at `supabase/migrations/0013_product_ssot.sql:29-45`. Existing artifact writer code updates `product_ssot` and appends `product_ssot_version` entries in `src/lib/forge/productSsotArtifactWriter.js:96-150`.

Safe reference fields include run ID, workspace ID, GitHub owner/repo/branch/commit SHA, Vercel project/deployment IDs, returned URL, source input mode, and credential source label. Unsafe fields include raw GitHub/Vercel tokens, authorization headers, installation token values, and private PEM material. ProductSSOT should reference the workspace artifact and final URL only after deploy readiness; fallback/context URLs must remain labeled as such.

## 8. Vercel Project Creation Endpoint Version

Current helper state:

- Existing lookup uses `GET /v9/projects/{idOrName}` at `src/lib/provisioning/upgradeTargetProvisioner.js:241`.
- Existing project creation uses `POST /v10/projects` at `src/lib/provisioning/upgradeTargetProvisioner.js:259`.
- Existing branch deploy correctly uses `POST /v13/deployments` at `src/lib/agents/renewal/vercelBranchDeploy.js:186` and polling at `src/lib/agents/renewal/vercelBranchDeploy.js:227`.

The CTO audit records current Vercel docs as `POST /v11/projects` (`docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md:159`). Recommendation: update project creation to `/v11/projects` in the runtime substrate and cover it with tests.

## 9. GitHub App Installation Permission Evidence

Current evidence:

- Production `/api/health` reports `githubAppReady:true` and `githubApp.status:"PASS"`, with `configured:true`, `patFallback:true`, and installation ID alias `GITHUB_APP_INSTALLATION_ID`.
- Local non-secret check of `getInstallationToken` did not mint a token because this workspace lacks `GITHUB_APP_ID`.
- `src/lib/agents/renewal/githubApp.js:148-257` returns GitHub-reported `permissions` and `repositorySelection` when token minting succeeds, but the current health endpoint does not expose those fields.

Conclusion: current production readiness does not prove `Administration: write`, `Contents: write`, or all-repository access. This is not a reason to invent evidence. The runtime patch must add a non-secret permission preflight that mints a token, inspects GitHub's returned metadata, and blocks repo provisioning with explicit evidence if `administration !== "write"`, `contents !== "write"`, or `repositorySelection !== "all"` when those are required for org repo creation and writing. If production lacks these permissions, the run must terminally block with a plain-language status.

## 10. Operator-Token Fallback Policy

Allowed by dispatch, but only as an operator fallback and only if recorded without weakening auditability.

Current token behavior:

- Fresh Build write token candidates include `GITHUB_OPERATOR_TOKEN`, `GITHUB_PAT`, and `GITHUB_TOKEN` at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:70-72`.
- `getInstallationToken` supports PAT fallback and returns non-sensitive source metadata at `src/lib/agents/renewal/githubApp.js:128-153`.
- `provisionUpgradeTarget` currently reports only token availability for `GITHUB_OPERATOR_TOKEN || GITHUB_PAT` and `VERCEL_OPERATOR_TOKEN || VERCEL_TOKEN` at `src/lib/provisioning/upgradeTargetProvisioner.js:301-304`.

Policy for implementation:

- Prefer GitHub App installation token.
- Use operator token fallback only when app permissions are insufficient or app minting fails and the configured fallback token exists.
- Persist only `credentialSource:"github_app"` or `credentialSource:"operator_token"` plus non-secret permission/status evidence.
- Never persist, emit, log, or return token values.
- Mark fallback use in the DeliveryWorkspace record and status bus so CD/CR/CT2 can audit it.

## Stop/Proceed Decision

No canonical doc, matrixArtifact, VERIFIED, or credential catalog change is required for the smallest substrate.

Proceed with runtime implementation if it stays within the allowed files and uses existing Supabase `workspace_runs` plus ProductSSOT references for persistence. The unresolved GitHub App permission evidence must be handled by runtime preflight and explicit blocked status, not by assuming production `githubAppReady:true` is sufficient.
