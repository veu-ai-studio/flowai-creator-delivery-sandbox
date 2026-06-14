# CB Dispatch Draft - Universal Delivery Workspace

FROM: CTO
TO: CB
DATE: 2026-06-14 UTC
STATUS: DRAFT ONLY - DO NOT EXECUTE UNTIL W04 CLEARANCE
Suggested branch after clearance: `feature/universal-delivery-workspace`
VERIFIED movement: no
canonical docs: do not edit
matrixArtifact: do not edit

## Clearance Boundary

This packet is prepared so CB can move quickly after W04 clears the architecture. It is not an active build dispatch yet.

Do not implement, push a runtime branch, run live provisioning, or modify production configuration until CTO posts a follow-up dispatch that explicitly says `CLEAR TO EXECUTE`.

## Required Reading

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/current-directive.md`
5. `docs/cto/universal-input-journey-audit-20260614.md`
6. `docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md`
7. `docs/cto/w04-universal-delivery-workspace-clearance-request-20260614.md`

## Problem

The active forge does not yet provide the universal user journey:

User submits a URL, description, or multiple URLs. FlowAI creates the delivery infrastructure invisibly, writes code, deploys it, and returns a live URL.

Current blockers:

- Type 1 arbitrary URLs can become evaluation-only because no FlowAI-owned destination exists.
- Type 2 description-only cannot enter `/api/run-construction` without a URL.
- Type 3 multi-URL synthesis is legacy/prototype, not wired into the active Flow Hub forge path.
- `provisionUpgradeTarget` is advisory and does not create repo/project resources.
- Existing GitHub writers assume repo/base branch already exist.
- Existing Vercel branch deploy assumes project ID already exists.

## Build Objective After Clearance

Implement the smallest honest runtime foundation for a FlowAI-owned **Universal Delivery Workspace**.

The first build does not need to complete all three input types. It must establish the shared infrastructure contract that all three will use:

1. Create or resolve a FlowAI-owned GitHub repo for a run.
2. Write an initial generated codebase or branch commit into that repo.
3. Create or resolve a FlowAI-owned Vercel project for that repo.
4. Deploy the selected branch through Vercel.
5. Return a live URL and persist the workspace metadata.
6. Preserve SSOT, BUILD_PROTOCOL, and evidence honesty.

## Proposed Runtime Model

Add a serializable `DeliveryWorkspace` record.

Minimum fields:

```json
{
  "workspaceId": "string",
  "runId": "string",
  "inputType": "single_url | description_only | multi_url_synthesis",
  "productId": "string | null",
  "sourceUrls": ["string"],
  "descriptionHash": "string | null",
  "github": {
    "owner": "string",
    "repo": "string",
    "repoUrl": "string",
    "defaultBranch": "main",
    "workingBranch": "string",
    "commitSha": "string | null",
    "credentialSource": "github_app | operator_token | null"
  },
  "vercel": {
    "teamId": "string",
    "projectId": "string | null",
    "projectName": "string",
    "deploymentId": "string | null",
    "deploymentUrl": "string | null"
  },
  "status": "planned | repo_created | code_written | project_created | deployed | failed",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "errors": []
}
```

No token values may be stored in this record.

## Required Diagnosis Before Patch

Before editing runtime code, map and document:

1. Every current caller of `provisionUpgradeTarget`.
2. Every current caller of `writeGeneratedCodebaseToUpgradeRepo`.
3. Every current caller of `deployBranchPreview`.
4. Which persistence backend is safest for `DeliveryWorkspace` in the current codebase.
5. Whether Supabase tables already exist for a run/workspace record.
6. Whether `forgeRunStatusBus` can store workspace metadata without becoming the source of truth.
7. Whether `product_ssot` can reference workspace artifacts without becoming a provisioning log.
8. Whether Vercel project creation must use `/v11/projects` instead of the current helper's `/v10/projects`.
9. Whether the current GitHub App installation reports `Administration: write`, `Contents: write`, and all-repository access.
10. Whether operator-token fallback is allowed for repo creation, and how it is recorded without weakening auditability.

Commit this diagnosis to `docs/cto/` before any runtime patch.

## Required Behavior

When the build is cleared, implement behavior conservatively:

- FlowAI creates repos only under the configured FlowAI-owned GitHub organization.
- Repo names must include a slug and run/workspace identifier to avoid collisions.
- New repos default to private unless W04/CEO explicitly clears public repos.
- The user never supplies or sees GitHub/Vercel credentials.
- GitHub App installation token is preferred when permissions are sufficient.
- Operator token fallback is allowed only if explicitly recorded as `credentialSource:"operator_token"` and never exposed.
- Vercel project creation uses the current documented API shape and the configured team/scope.
- Deployment URL is not claimed until Vercel reports READY or the existing deployment proof code confirms a public URL.
- Existing preconfigured-product paths must keep working.
- Protected original repo write guards remain intact.
- Preview/public URL evidence must remain clearly labeled as observed vs fallback/context.

## First Proof Target After Merge

Recommended first proof target after CD/CR review and production deploy:

Type 2 description-only Fresh Build with a minimal Vite React app description, because it avoids source repo ambiguity and proves the new workspace can create a repo/project from nothing.

Success evidence:

- workspace record persisted,
- GitHub repo URL exists under FlowAI-owned org,
- branch/commit SHA exists,
- Vercel project/deployment ID exists,
- public deployment URL opens in browser,
- CT2 confirms the page independently,
- ProductSSOT records the returned URL without VERIFIED movement.

## Tests Required

At minimum:

1. Creates repo under configured owner with safe slug/run naming.
2. Refuses repo creation outside configured FlowAI-owned owner.
3. Does not store token values in workspace state, logs, errors, or status bus.
4. Records credential source without exposing secrets.
5. Handles GitHub App missing `Administration: write` as explicit blocked status.
6. Handles GitHub App missing `Contents: write` as explicit blocked status.
7. Creates initial commit/tree for generated files in an empty repo.
8. Creates or resolves Vercel project using documented API version.
9. Deploys GitHub branch through Vercel and returns URL only after READY.
10. Existing SAIGE preconfigured production path remains green.
11. Fresh Build write/deploy tests remain green.
12. Migration target safety tests remain green.

Run focused tests for touched modules plus `npm run build:preflight`. If full `npm run preflight` is still blocked by live external test boundaries, document the exact blocker and include all passing suites.

## Review Required

After CB patch:

- CD review required.
- CR review required.
- CTO adjudication required.
- Runtime merge only after CD + CR PASS or W04 adjudication of non-blocking findings.
- CT2 proof only after production deployment.

## Stop Conditions

Stop and report if implementation would require any of these:

- Asking the end user to create a GitHub/Vercel account.
- Asking the end user to configure a repo/project.
- Writing to an original/protected repo.
- Persisting a token.
- Bypassing source-map, platform-boundary, parse, auth, secret, package, deploy, governance, or SSOT gates.
- Claiming a deployment URL without independent evidence.
- Moving VERIFIED without W04/CEO authorization.
- Editing canonical docs without W04/CEO authorization.

## CTO Note

This draft intentionally scopes the first build around the shared delivery substrate. Type 1, Type 2, and Type 3 routing can be layered onto it after the workspace contract is real and tested. The important shift is that FlowAI owns delivery infrastructure for the user, instead of assuming it was manually prepared before the run.
