# CTO Audit: Auto Repo Provisioning Infrastructure Gap

Date: 2026-06-14
Branch: docs/cto-auto-repo-provisioning-plan
Author: CTO
Scope: Diagnosis and API requirements only. No build dispatch, no implementation plan, no runtime changes.

## Executive Finding

W04's infrastructure concern is valid. FlowAI currently contains partial helpers for GitHub repository creation, Git tree writes, Vercel project creation, and Vercel deployment, but the active forge does not yet execute a universal "input in, FlowAI-owned repo/project out, deployed URL returned" delivery chain.

The current runtime still assumes that a safe write target already exists for many successful paths:

- Product configuration or registry metadata supplies a repo/project.
- Branch writers assume a repo and base branch already exist.
- Fresh Build blocks if no `upgrade_repo` or equivalent GitHub repo target exists.
- Vercel branch deployment assumes an existing Vercel project ID.
- The exported provisioning function reports `provisioning_required`, but does not perform provisioning side effects.

Therefore auto-repo creation is necessary, but not sufficient by itself. The missing infrastructure is a complete FlowAI-owned delivery workspace that ties run input, generated or migrated code, GitHub repo, branch/commit, Vercel project, deployment, returned URL, and ProductSSOT persistence into one durable record.

## Active Code Evidence

### Provisioning Helpers Exist But Are Not Active

`src/lib/provisioning/upgradeTargetProvisioner.js` already includes low-level helper functions:

- `ensureUpgradeRepo` starts at `src/lib/provisioning/upgradeTargetProvisioner.js:68`.
- `copyGithubDefaultBranch` starts at `src/lib/provisioning/upgradeTargetProvisioner.js:134`.
- The copy helper defaults to `maxFiles = 500` at `src/lib/provisioning/upgradeTargetProvisioner.js:143` and blocks truncated or oversized trees at `src/lib/provisioning/upgradeTargetProvisioner.js:167`.
- `ensureVercelProject` starts at `src/lib/provisioning/upgradeTargetProvisioner.js:229`.
- It currently creates projects through `/v10/projects` at `src/lib/provisioning/upgradeTargetProvisioner.js:259`.
- `provisionUpgradeTarget` starts at `src/lib/provisioning/upgradeTargetProvisioner.js:288`.
- `provisionUpgradeTarget` returns `provisioning_required` or `already_provisioned` rather than calling repo/project creation. See `src/lib/provisioning/upgradeTargetProvisioner.js:298`.

This is the central infrastructure gap. The repo has pieces named like provisioning, but the active exported path is advisory, not provisioning.

### GitHub Token Minter Exists

`src/lib/agents/renewal/githubApp.js` mints GitHub App installation tokens:

- It documents the installation token endpoint at `src/lib/agents/renewal/githubApp.js:6`.
- `getInstallationToken` starts at `src/lib/agents/renewal/githubApp.js:156`.
- It has a PAT fallback path documented at `src/lib/agents/renewal/githubApp.js:128`.
- It returns GitHub-reported `permissions` and `repositorySelection` at `src/lib/agents/renewal/githubApp.js:256`.

This is useful for proof, but the universal architecture should treat PAT fallback as an operator fallback, not as the core user journey. End users must not supply GitHub credentials.

### Existing Branch Writer Assumes Repo And Base Branch

`src/lib/agents/renewal/githubBranchWriter.js` is a branch/file updater, not a repo initializer:

- It expects `GET /repos/{owner}/{repo}/git/ref/heads/{baseBranch}` before creating a branch. See `src/lib/agents/renewal/githubBranchWriter.js:13` and `src/lib/agents/renewal/githubBranchWriter.js:137`.
- It creates a branch through `POST /repos/{owner}/{repo}/git/refs`. See `src/lib/agents/renewal/githubBranchWriter.js:167`.
- It reads and writes file contents through the contents API. See `src/lib/agents/renewal/githubBranchWriter.js:205` and `src/lib/agents/renewal/githubBranchWriter.js:242`.
- `createRenewalBranch` requires `owner`, `repo`, `baseBranch`, `branchName`, `filePath`, `fileContent`, `commitMessage`, and `token`. See `src/lib/agents/renewal/githubBranchWriter.js:299`.

This writer cannot create an empty repo, create an initial default branch, or write an entire generated tree from scratch by itself.

### Fresh Build Still Requires A Preconfigured Upgrade Repo

`src/lib/freshBuild/freshBuildDeploymentAdapter.js` has a stronger multi-file Git tree writer, but it still requires a resolved repo target:

- `createGitHubTreeCommitClient` starts at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:365`.
- `writeGeneratedCodebaseToUpgradeRepo` starts at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:483`.
- It resolves only existing `productConfig.upgrade_repo`, `upgradeRepo`, or `github_repo_url` at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:504`.
- It blocks with `UPGRADE_REPO_REQUIRED` at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:509`.
- Vercel args are resolved from existing product config/env mappings, including `vercel_project_id`, beginning at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:444`.

So Fresh Build can write a generated codebase once a repo exists, but it cannot currently create the FlowAI-owned workspace from nothing.

### Vercel Branch Deploy Assumes Existing Project

`src/lib/agents/renewal/vercelBranchDeploy.js` deploys a GitHub branch to an existing Vercel project:

- The file documents `POST /v13/deployments?teamId={orgId}` with `gitSource`. See `src/lib/agents/renewal/vercelBranchDeploy.js:12`.
- `createDeployment` starts at `src/lib/agents/renewal/vercelBranchDeploy.js:176`.
- It sends `project: projectId` and `gitSource: { type: 'github', org, repo, ref }`. See `src/lib/agents/renewal/vercelBranchDeploy.js:190`.
- `deployBranchPreview` requires `projectId`, `orgId`, `owner`, `repo`, `branchName`, and `token`. See `src/lib/agents/renewal/vercelBranchDeploy.js:267`.

This can deploy after provisioning, but it does not create or import the Vercel project.

### Inline Vercel Deploy Is Not The Required Architecture

`src/lib/orchestra/vercel.js` can deploy inline file lists:

- It posts inline files to `/v13/deployments` at `src/lib/orchestra/vercel.js:85`.
- It can create a Vercel deployment without first writing a GitHub repo.

That path may be useful for emergency proof, but it does not satisfy W04's required architecture because the generated/upgraded code is not first written to a FlowAI-owned GitHub repo.

### Active Construction Route Still Depends On Existing Targets

`src/api/run-construction.js` has target assumptions that block universal delivery:

- The route rejects missing or non-HTTP(S) URL input with `invalid_url` at `src/api/run-construction.js:370`.
- Fresh Build is invoked inside the route at `src/api/run-construction.js:602`, after URL validation.
- Migration hooks require a registered product at `src/api/run-construction.js:1271`.
- Migration returns `missing_upgrade_repo` if no target repo exists around `src/api/run-construction.js:1300`.

`src/lib/products/registeredProductConfig.js` also shows the narrow current happy path:

- SAIGE has a configured `upgrade_repo` and `upgrade_repo_status` at `src/lib/products/registeredProductConfig.js:12`.
- Other registered products do not show equivalent complete upgrade/deploy metadata in that file.

## GitHub App Permission Requirements

Based on GitHub's current REST documentation, a FlowAI-owned organization repo path needs these GitHub App capabilities.

### Required For Creating FlowAI-Owned Repos

GitHub's "Create an organization repository" endpoint is `POST /orgs/{org}/repos`. GitHub documents that GitHub App installation tokens can use it, and the fine-grained token must have `"Administration" repository permissions (write)`.

Required:

- GitHub App installed on the FlowAI-owned organization that will own generated upgrade repos.
- `Administration: write` repository permission for repo creation and settings.
- Installation access to newly created repositories. This is a real operational risk if the installation is configured for selected repositories only.

### Required For Writing Generated Or Upgraded Code

GitHub's Git Database tree API documents `POST /repos/{owner}/{repo}/git/trees`; when used to add, delete, or modify file contents, the tree must be committed and the branch reference updated. The endpoint requires `"Contents" repository permissions (write)`.

Required:

- `Contents: write` for blobs, trees, commits, refs, and contents updates.
- `Metadata: read`, which is mandatory baseline metadata access.
- `Pull requests: write` if FlowAI continues to create governance PRs in the generated repo.
- `Workflows: write` only if FlowAI writes files under `.github/workflows`. Avoiding workflow files keeps this optional.
- `Deployments: write` only if GitHub deployment/status records are written. Vercel deployment through Vercel API alone does not require GitHub deployment writes.

### Token Lifetime And Scope

GitHub installation tokens expire after one hour. GitHub also documents that tokens may be narrowed by `repositories`, `repository_ids`, and `permissions`, but cannot be granted permissions or repo access the app installation does not already have.

Implications:

- The forge cannot persist a GitHub installation token as durable phase state.
- Long-running or resumed forge phases must mint a fresh token.
- The state envelope should store token source/expiration metadata only, never the token.
- If the app is installed on selected repositories, newly created repos may not be writable unless the app installation has all-repositories access or the org/app setup explicitly grants access to created repos.

## Vercel API Requirements

Based on Vercel's current REST documentation and the existing code paths, the universal delivery chain needs these Vercel operations.

### Project Lookup

Vercel documents project lookup as:

- `GET /v9/projects/{idOrName}`

The existing helper already uses the v9 project lookup shape.

### Project Creation Or Import

Vercel currently documents project creation as:

- `POST /v11/projects`

The existing `ensureVercelProject` helper uses `/v10/projects`, so that helper should be treated as potentially stale until tested against Vercel's current API.

Required project creation payload concepts:

- `name`: FlowAI-owned project slug.
- `framework`: likely `vite` for current deterministic Fresh Build output, unless stack selection changes.
- `gitRepository`: GitHub repository binding for the FlowAI-created repo.
- Team/scope query, such as `teamId`, for the VEU AI Studio Vercel team.

### Deployment

Vercel documents deployment creation as:

- `POST /v13/deployments`

The existing branch deploy path already uses `/v13/deployments` with:

- `project`
- `gitSource: { type: 'github', org, repo, ref }`
- optional `target`

Deployment polling currently uses:

- `GET /v13/deployments/{deploymentId}`

### Environment Variables

Generated products with no secrets can avoid Vercel env var creation. If future generated products require runtime credentials, FlowAI will need an allowlisted env var injection path through Vercel project environment-variable endpoints. That is not present as a universal user-safe capability today.

## Missing Infrastructure Capabilities

This is a diagnostic inventory, not a build sequence.

### FlowAI-Owned Workspace Identity

There is no durable universal workspace record that ties together:

- `runId`
- input type and normalized input artifact
- generated product slug
- GitHub owner/repo
- default branch
- working branch
- commit SHA
- Vercel team/project ID
- deployment ID
- returned URL
- ProductSSOT artifact reference
- cleanup/retention status

Without this, retries, resumed phases, CT2 evidence, and ProductSSOT updates can drift.

### Repo Slug And Ownership Policy

The current provisioning helper derives target names from product IDs, such as `product_id-v2`. W04's universal requirement needs run-safe global names such as:

- `github.com/flowai-upgrades/[slug]-[runid]`

The repo must be FlowAI-owned. It cannot depend on the user owning GitHub, knowing GitHub, or providing a GitHub repo.

### First Commit Writer

The existing branch writer cannot initialize an empty repo. Fresh Build's tree writer is closer, but it still assumes a repo target and branch/ref context. Universal delivery needs an initial commit path that can write the complete generated file tree and establish the default branch for a new repo.

### Migration Source Handling

`copyGithubDefaultBranch` can copy a GitHub default branch, but it has a 500-file serverless copy cap and requires a source GitHub repo. That does not cover arbitrary public product URLs. Type 1 URL upgrades need a generated app-layer codebase or an accessible source-repo path; they cannot assume the source URL has a GitHub repo behind it.

### Vercel Project Binding

Existing deployment assumes a project exists. Universal delivery needs a project creation/import record before branch deployment can be called. The current helper's project creation endpoint version mismatch (`/v10/projects` in code vs `/v11/projects` in docs) is a specific verification risk.

### ProductSSOT And Evidence Binding

The returned URL must be persisted with evidence semantics:

- `evidenceUrl`
- `verifiedAt`
- `verifiedBy`
- CT2/browser proof where required
- ProductSSOT persistence reference

Currently these are not guaranteed by provisioning. They are later governance/evidence concerns and can fail independently of GitHub/Vercel success.

### Lifecycle And Safety

There is no visible universal policy for:

- private vs public generated repos
- retention/cleanup of failed proof repos
- quota limits per run/user
- secret scanning guardrails
- generated code license/IP notes
- branch/project naming collisions
- abandoned Vercel projects

These are part of "invisible to the user" operation. Invisible cannot mean unmanaged.

## Impact By Input Type

### Type 1 - Single URL

Current state:

- Registered products can work only when repo/project metadata is preconfigured.
- Unknown URLs can be evaluated but may not produce a deployment because there is no FlowAI-owned destination.

Infrastructure gap:

- FlowAI needs to create a delivery workspace for any submitted URL that lacks a safe existing target.

### Type 2 - Description Only

Current state:

- The active route blocks before code generation because it requires an HTTP(S) URL.
- Fresh Build still expects URL-derived evidence and an upgrade repo.

Infrastructure gap:

- FlowAI needs a new repo/project from no existing URL, no source repo, and no preconfigured product metadata.

### Type 3 - Multi-URL Synthesis

Current state:

- Legacy synthesis can process multiple URLs, but active Flow Hub forge does not accept `urls[]` as a first-class deployed run.

Infrastructure gap:

- FlowAI needs one synthesized delivery workspace that is not owned by any one source URL and can still persist source attribution for all URLs.

## SSOT Impact

This is likely an SSOT-impacting architecture decision, but no canonical amendment is drafted in this diagnosis document.

The reason is simple: the current canonical mission says FlowAI is product-agnostic and serves users priced out, locked out, or capability-gapped. A mandatory preconfigured GitHub/Vercel target contradicts that mission for real users. The canonical docs may need a minimum amendment that explicitly states:

- Users submit product inputs, not infrastructure.
- FlowAI owns repo/project provisioning.
- FlowAI returns a deployed URL.
- Users do not need GitHub, Vercel, repo knowledge, or manual configuration.

That amendment should be handled only with W04/Victor clearance.

## External API References Checked

- GitHub REST: Create an organization repository - `POST /orgs/{org}/repos`; requires `Administration: write` for fine-grained/GitHub App installation tokens.
- GitHub REST: Git Trees - `POST /repos/{owner}/{repo}/git/trees`; requires `Contents: write` for code tree writes.
- GitHub REST: Create installation access token - installation tokens expire after one hour and cannot exceed the app installation's repository or permission scope.
- Vercel REST: Find project - `GET /v9/projects/{idOrName}`.
- Vercel REST: Create project - current docs show `POST /v11/projects`.
- Vercel REST: Create deployment - current docs show `POST /v13/deployments` with `gitSource` support.

## Bottom Line

FlowAI cannot honestly be called a universal product engine until this infrastructure gap is closed. The current code has useful parts, but no active, durable, end-to-end provisioning chain. Any next build dispatch should treat repo/project provisioning as a first-class delivery subsystem, not as a small patch inside branch creation.

No build should be dispatched from this document alone. It should be reviewed with the universal input journey audit so W04 can clear the actual architecture/design dispatch.
