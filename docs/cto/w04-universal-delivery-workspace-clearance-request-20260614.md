# W04 Clearance Request - Universal Delivery Workspace

FROM: CTO
TO: W04 / Victor Udo, FNSE, PhD - CEO
DATE: 2026-06-14 UTC
Branch: `docs/cto-auto-repo-provisioning-plan`
Status: diagnosis complete; build not dispatched
VERIFIED movement: no
canonical docs: no edits
matrixArtifact: no edits

## Required Reading

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/universal-input-journey-audit-20260614.md`
5. `docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md`

## CTO Finding

The universal-product-engine gap is confirmed.

FlowAI has partial code for crawling, scoring, Fresh Build generation, GitHub writes, Vercel deploys, and some provisioning helper functions. It does not yet have one active, durable delivery subsystem that turns any valid user input into:

1. a FlowAI-owned GitHub repo,
2. a committed codebase,
3. a FlowAI-owned Vercel project/deployment,
4. a returned live URL,
5. a ProductSSOT evidence record.

The current active forge still assumes a preconfigured product delivery target in too many places. That is why proofs on SAIGE and RelTwin keep surfacing target-specific blockers instead of proving a universal user journey.

## Evidence Summary

### Type 1 - Single URL

State: partial.

The active route accepts one public URL and can research/score/attempt forge execution. It does not guarantee a deployed output for arbitrary public URLs because unknown products can become evaluation-only and registered products still need safe repo/project mappings.

Key evidence:

- `src/api/run-construction.js:370` requires one HTTP(S) URL.
- `src/lib/agents/renewal/orchestrator.js:4350` can skip deploy in universal mode because there is no operator GitHub repo or FlowAI-owned destination.
- `src/api/run-construction.js:1300` blocks Migration when `upgrade_repo` is missing.

### Type 2 - Description Only

State: not end-to-end in the active forge.

Description inputs exist in UI/legacy layers, but the active construction endpoint rejects a request without a URL before Fresh Build can run. Current Fresh Build also requires URL-derived feature/design evidence and an existing upgrade repo.

Key evidence:

- `src/api/run-construction.js:370` rejects missing URL.
- `src/lib/freshBuild/freshBuildOrchestrator.js:292` requires `input.url || input.productUrl`.
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js:509` blocks with `UPGRADE_REPO_REQUIRED`.

### Type 3 - Multi-URL Synthesis

State: not end-to-end in the active forge.

Legacy synthesis can accept multiple URLs, but active `/api/run-construction` accepts only one URL and does not route multi-URL synthesis into the eight-step forge, ProductSSOT, and deployed URL proof path.

Key evidence:

- `src/api/run-construction.js:15` documents `url: string`, not `urls[]`.
- `api/_lib/synthesisEngine.js` is legacy and separate from the current Flow Hub forge path.

### Infrastructure

State: provisioning pieces exist but are not active as a universal delivery subsystem.

Key evidence:

- `src/lib/provisioning/upgradeTargetProvisioner.js:68` has `ensureUpgradeRepo`.
- `src/lib/provisioning/upgradeTargetProvisioner.js:229` has `ensureVercelProject`.
- `src/lib/provisioning/upgradeTargetProvisioner.js:288` has `provisionUpgradeTarget`, but it returns `provisioning_required` or `already_provisioned` instead of performing repo/project creation.
- `src/lib/agents/renewal/githubBranchWriter.js` assumes repo and base branch already exist.
- `src/lib/agents/renewal/vercelBranchDeploy.js` assumes a Vercel project ID already exists.

## CTO Recommendation

Create a first-class **Universal Delivery Workspace** subsystem before running more Production path proofs against manually preconfigured products.

Definition:

A Universal Delivery Workspace is the durable FlowAI-owned delivery record for one forge run. It must bind:

- runId
- input type
- normalized input artifact
- FlowAI-owned GitHub owner/repo
- default branch
- working branch
- commit SHA
- Vercel team/project ID
- deployment ID
- returned URL
- ProductSSOT artifact reference
- CT2/browser verification status
- cleanup/retention status

This should become the shared delivery target for:

- Type 1 arbitrary single URL upgrades,
- Type 2 description-only new builds,
- Type 3 multi-URL synthesis new builds.

## Decisions Requested From W04

1. Clear the architecture direction: FlowAI-owned Universal Delivery Workspace is the required delivery substrate for all non-preconfigured user runs.
2. Confirm that new Production proof runs on manually preconfigured products stay paused until the workspace design/build is cleared, except for explicitly authorized evidence reruns.
3. Clear CB to build only after reviewing the draft dispatch in `docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md`.
4. Decide whether the SSOT amendment should be drafted now or after the first workspace proof. CTO recommendation: defer canonical amendment text until W04 approves the architecture, but acknowledge that an amendment is likely required.
5. Confirm that GitHub App org installation/permission verification and Vercel team/project API verification may be performed by tools/operators, with Victor involved only if a dashboard authorization cannot be automated safely.

## Non-Negotiable Guardrails For Any Build Clearance

- No user GitHub requirement.
- No user Vercel requirement.
- No user repo/project configuration requirement.
- No token persistence in run state or logs.
- No writes to protected original repos.
- No deployment claim without a live URL and independent verification.
- No VERIFIED movement without W04/CEO authorization and required fields.
- No canonical doc edits without W04/CEO clearance.

## Proposed Next Motion After Clearance

If W04 clears this direction, CTO will dispatch CB from the repo using the draft packet. CD and CR will review the resulting branch before merge. CT2 will browser-test the first workspace proof only after runtime merge and production deploy.

The fastest honest target after implementation is a Type 2 description-only Fresh Build proof because it avoids source-repo ambiguity. A Type 1 arbitrary URL proof should follow immediately after the workspace can create and deploy a FlowAI-owned repo.

## Bottom Line

The current FlowAI forge is not yet a universal product engine because delivery is not universal. The next architecture/build step should make delivery universal before additional proof runs try to force product-specific paths to behave like a global user journey.
