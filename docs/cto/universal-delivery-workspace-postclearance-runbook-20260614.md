# Universal Delivery Workspace Post-Clearance Runbook

FROM: CTO
TO: CTO / CB / CD / CR / CT2
DATE: 2026-06-14 UTC
STATUS: ACTIVE AFTER CEO FINAL DIRECTIVE
Runtime work: authorized through `docs/cto/cb-universal-delivery-workspace-dispatch-20260614.md`
VERIFIED movement: no
Canonical docs: do not edit

## Purpose

This runbook defines what happens after W04/CEO cleared Universal Delivery Workspace work in the 2026-06-14 Comprehensive Final Directive.

It exists so Victor does not become the relay. It does not override the active CB dispatch, BUILD_PROTOCOL, or review gates.

## Active Clearance

Runtime work is now authorized by:

- `docs/cto/current-directive.md`
- `docs/cto/cb-universal-delivery-workspace-dispatch-20260614.md`

CB should start from the active dispatch, not this runbook alone.

## Operating Sequence

### Step 1 - CTO Posts Active Dispatch

Completed by CTO:

- `docs/cto/cb-universal-delivery-workspace-dispatch-20260614.md`

Source draft:

- `docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md`

CTO pushes the dispatch and signals CB through the repo.

### Step 2 - CB Commits Diagnosis Before Runtime Patch

Before code edits, CB must commit a diagnosis artifact under `docs/cto/` covering:

1. Every caller of `provisionUpgradeTarget`.
2. Every caller of `writeGeneratedCodebaseToUpgradeRepo`.
3. Every caller of `deployBranchPreview`.
4. Recommended persistence backend for `DeliveryWorkspace`.
5. Supabase/table availability or absence.
6. Whether `forgeRunStatusBus` can carry workspace metadata without becoming source of truth.
7. Whether `product_ssot` can reference workspace artifacts safely.
8. Vercel project create endpoint version: current docs `/v11/projects` vs helper `/v10/projects`.
9. GitHub App installation permission evidence.
10. Operator-token fallback policy and evidence metadata.

CB must stop after diagnosis if a required permission or persistence boundary cannot be resolved safely.

### Step 3 - CB Builds The Smallest Runtime Substrate

If diagnosis confirms a safe path, CB implements the minimum runtime substrate:

- serializable `DeliveryWorkspace` record,
- FlowAI-owned repo create/resolve,
- initial full-tree commit for generated code,
- Vercel project create/resolve,
- Vercel branch deployment,
- URL return only after READY/public proof signal,
- no token persistence,
- no protected original repo writes,
- existing preconfigured product paths preserved.

The first implementation may focus on Type 2 description-only Fresh Build as the proof target, but the workspace contract must not be hard-coded to VEU, Victor, SAIGE, or a single product.

### Step 4 - CB Verification

CB runs focused tests for touched modules plus `npm run build:preflight`.

Minimum tests:

1. Safe repo slug/run naming.
2. Reject owner outside FlowAI-owned org.
3. No token values in persisted workspace, logs, status bus, or errors.
4. Credential source recorded without secret exposure.
5. Missing `Administration: write` blocks clearly.
6. Missing `Contents: write` blocks clearly.
7. Initial commit/tree creation for an empty repo.
8. Vercel project create/resolve with documented API version.
9. Deployment URL returned only after READY.
10. Existing SAIGE/preconfigured path preserved.
11. Fresh Build write/deploy tests preserved.
12. Migration target safety tests preserved.

CB records all results in `docs/cto/`.

### Step 5 - CD And CR Review

After CB evidence is pushed, CTO creates final CD/CR review prompts from these drafts:

- `docs/cto/cd-review-universal-delivery-workspace-prompt-draft-20260614.md`
- `docs/cto/cr-review-universal-delivery-workspace-prompt-draft-20260614.md`

CD and CR review must return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

Runtime merge requires CD + CR PASS or W04 adjudication of non-blocking findings.

### Step 6 - Merge, Deploy, Promote

After review clearance:

1. CTO merges runtime branch.
2. CTO promotes production using Vercel token.
3. CTO confirms `/api/health` commit identity.
4. CTO dispatches CT2 proof from the CT2 draft.

### Step 7 - CT2 Proof

CT2 runs the first workspace proof from:

- `docs/cto/ct2-universal-delivery-workspace-proof-draft-20260614.md`

Target proof:

- Type 2 description-only Fresh Build unless diagnosis shows a safer faster target.

Required proof:

- public URL opens anonymously,
- page is generated product, not FlowAI operator shell,
- Vercel protection not observed,
- GitHub repo/branch/commit evidence exists,
- Vercel project/deployment evidence exists,
- workspace metadata and ProductSSOT reference exist,
- no VERIFIED movement.

## Stop Conditions

Stop and report to W04 if:

- GitHub App permissions do not allow org repo creation or code writes.
- Vercel token/scope does not allow project creation/deploy.
- A dashboard-only action is required and cannot be automated safely.
- Implementation would store tokens or expose credentials.
- Implementation would write to protected original repos.
- The only passing proof would rely on a preconfigured manual target.
- CB cannot create a durable workspace state without an unapproved schema/canonical change.

## Victor Involvement Rule

Victor should only be asked for:

- W04/CEO architecture clearance or revision,
- dashboard authorization that tools cannot safely perform,
- canonical doc changes,
- VERIFIED movement,
- new product/business direction.

Everything else stays inside the technical bench and repo.
