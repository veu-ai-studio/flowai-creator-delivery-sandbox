# CB Dispatch - Universal Delivery Workspace And Infrastructure Gap Queue

FROM: CTO
TO: CB
DATE: 2026-06-14 UTC
STATUS: CLEAR TO EXECUTE - CEO FINAL DIRECTIVE APPROVED
Suggested branch: `feature/universal-delivery-workspace`
VERIFIED movement: no
canonical docs: do not edit
matrixArtifact: do not edit

## Clearance

W04 / Victor Udo, FNSE, PhD - CEO issued the 2026-06-14 Comprehensive Final Directive. CB is clear to build the infrastructure gaps under CTO supervision. Do not wait for Victor or W04 on routine technical decisions.

This dispatch activates the prior draft:

- `docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md`

## Required Reading

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/current-directive.md`
5. `docs/cto/session-brief.md`
6. `docs/cto/universal-input-journey-audit-20260614.md`
7. `docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md`
8. `docs/cto/universal-delivery-workspace-postclearance-runbook-20260614.md`

## Mission

FlowAI must become a universal product engine:

User submits a URL, description, or multiple URLs. FlowAI handles GitHub, Vercel, code generation, deployment, evidence, and returns a deployed URL. The user never needs GitHub, Vercel, repos, projects, branches, tokens, or technical setup.

## Branch Discipline

- Use one runtime branch for this dispatch: `feature/universal-delivery-workspace`.
- Commit diagnosis before runtime patching.
- Run full preflight before push.
- Do not push runtime code if preflight fails.
- Do not edit canonical docs or matrixArtifact.
- Do not move VERIFIED.
- Do not hard-code SAIGE, RelTwin, VEU, Victor, or any proof target into core runtime.
- Stop if a shared blocker affects multiple gaps.

## First Build Objective

Build the smallest honest Universal Delivery Workspace substrate:

1. Create or resolve a FlowAI-owned GitHub repo for a run.
2. Write an initial generated codebase or branch commit into that repo.
3. Create or resolve a FlowAI-owned Vercel project for that repo.
4. Deploy the selected branch through Vercel.
5. Return a live URL only after deployment readiness.
6. Persist workspace metadata for ProductSSOT/evidence binding.

This foundation must serve all three input types:

- Type 1: single URL.
- Type 2: description only.
- Type 3: multi-URL synthesis.

Recommended first proof target after merge: Type 2 description-only Fresh Build, unless diagnosis proves a safer faster target.

## Required Diagnosis Before Runtime Patch

Commit a diagnosis file under `docs/cto/` before code edits. Include:

1. Every current caller of `provisionUpgradeTarget`.
2. Every current caller of `writeGeneratedCodebaseToUpgradeRepo`.
3. Every current caller of `deployBranchPreview`.
4. Recommended persistence backend for `DeliveryWorkspace`.
5. Whether Supabase tables already exist for run/workspace state.
6. Whether `forgeRunStatusBus` can carry workspace metadata without becoming source of truth.
7. Whether `product_ssot` can reference workspace artifacts safely.
8. Whether Vercel project creation must use `/v11/projects` instead of current helper `/v10/projects`.
9. Whether current GitHub App installation reports `Administration: write`, `Contents: write`, and all-repository access.
10. Whether operator-token fallback is allowed for repo creation, and how it is recorded without weakening auditability.

Stop after diagnosis if a required permission, persistence, or safety boundary cannot be resolved honestly.

## Runtime Requirements

Implement behavior conservatively:

- FlowAI creates repos only under the configured FlowAI-owned GitHub organization.
- Repo names include a slug and run/workspace identifier to avoid collisions.
- New repos default to private unless CEO explicitly clears public repos.
- The user never supplies or sees GitHub/Vercel credentials.
- GitHub App installation token is preferred when permissions are sufficient.
- Operator token fallback is allowed only if recorded as `credentialSource:"operator_token"` and never exposed.
- Vercel project creation uses the current documented API shape and configured team/scope.
- Deployment URL is not claimed until Vercel reports READY or equivalent public proof.
- Existing preconfigured-product paths keep working.
- Protected original repo write guards remain intact.
- Fallback/context URLs are never relabeled as observed deployment evidence.
- User-facing failure messages are plain language, not technical codes or stack traces.

## Full Gap Queue Context

This branch should not attempt to finish all gaps at once. It must not close over an architecture that prevents them.

Authorized gap queue:

1. Auto repo creation and Vercel project/deployment.
2. Pre-flight validation before every forge dispatch.
3. Type 2 and Type 3 multi-input pipeline support.
4. Clerk auth end-to-end user journey.
5. Product type selection: Website, Native App, Mobile App, SaaS Platform, Agentic AI System.
6. Anonymous vs authenticated runs.
7. Human-readable run status visibility.
8. Plain-language score explanation.
9. Deployment failure handling.
10. Multi-product management.
11. Four axes fully wired.
12. Full 8-step forge completion.
13. Codex confirmed as live Step 3 Build tool.
14. MatrixArtifact progress toward 95 VERIFIED through evidence.

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
10. Existing SAIGE/preconfigured path remains green.
11. Fresh Build write/deploy tests remain green.
12. Migration target safety tests remain green.

Run focused tests for touched modules plus full preflight.

## Review And Proof

After CB patch:

- CD review required.
- CR review required.
- CB2 regression audit required before merge.
- CTO merge only after review/audit clearance.
- CT2 browser proof required after production deploy.

Draft review/proof packets already exist:

- `docs/cto/cd-review-universal-delivery-workspace-prompt-draft-20260614.md`
- `docs/cto/cr-review-universal-delivery-workspace-prompt-draft-20260614.md`
- `docs/cto/ct2-universal-delivery-workspace-proof-draft-20260614.md`

## Stop Conditions

Stop and report if implementation would require:

- Asking the end user to create GitHub/Vercel accounts.
- Asking the end user to configure repo/project/deploy settings.
- Writing to original/protected repos.
- Persisting or exposing tokens.
- Bypassing security, platform, deploy, governance, or SSOT gates.
- Claiming a deployment URL without independent evidence.
- Editing canonical docs or matrixArtifact.
- Moving VERIFIED.
