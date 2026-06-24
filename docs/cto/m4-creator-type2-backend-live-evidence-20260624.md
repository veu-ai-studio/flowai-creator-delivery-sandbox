# M4 Creator Type 2 Backend Live Evidence — 2026-06-24

## Status

`BLOCKED`, not failed.

FlowAI now generates a backend-capable description-only Creator app through the SSOT Fresh Build path. The live proof is blocked at delivery repo creation authority before a public product URL can be returned.

No Creator claim moves yet.

## Branch And Commits

Branch: `feature/m4-creator-type2-proof`

Origin commits:

- `5cd792c` — generated backend persistence wiring
- `1b1678e` — generated persistence migration runner
- `13dea72` — prefer GitHub App for delivery workspaces

Preview runtime:

- URL: `https://flowai-p1b834en1-veu-ai-studio.vercel.app`
- Identity: `docs/cto/m4-creator-type2-backend-preview-version-20260624-r2.json`
- Runtime commit: `13dea72fc1eee5fdb0799d119bb2c431b46055b5`

Raw live SSE:

- `docs/cto/m4-creator-type2-backend-live-20260624-r2.sse`

Earlier failed credential evidence:

- `docs/cto/m4-creator-type2-backend-live-20260624.sse`

## Which Path Persists

The backend persistence enablement is in the SSOT Creator path, not a parallel proof route:

```text
POST /api/run-construction
-> FRESH_BUILD
-> description_build_brief
-> src/lib/freshBuild/codebaseGenerator.js
-> GeneratedCodebase with src/App.jsx + api/resource-requests.js
-> src/lib/freshBuild/freshBuildDeploymentAdapter.js
-> src/lib/provisioning/upgradeTargetProvisioner.js
```

Recorded code changes:

- `src/lib/freshBuild/codebaseGenerator.js` emits `api/resource-requests.js` for persistence-backed description-only Creator apps.
- `src/lib/freshBuild/codebaseGenerator.js` emits a UI that writes through `/api/resource-requests`, does not use `localStorage`, `sessionStorage`, or `IndexedDB`, and displays backend-retrieved recommendations.
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js` forwards `GeneratedCodebase.metadata.persistence` to delivery workspace provisioning.
- `src/lib/provisioning/upgradeTargetProvisioner.js` injects generated backend env vars into the generated Vercel project.
- `supabase/migrations/0033_generated_product_records.sql` creates the server-side persistence table.

This is not a bespoke persistence endpoint beside Creator.

## Backend Substrate

Live migration applied:

```text
generated_product_records migration state:
{"table_name":"generated_product_records","existing_rows":0}
```

PostgREST visibility after migration:

```text
status=200
[]
```

The generated app serverless route uses server-side credentials only:

- `FLOWAI_GENERATED_SUPABASE_URL`
- `FLOWAI_GENERATED_SUPABASE_SERVICE_ROLE_KEY`
- `FLOWAI_GENERATED_PRODUCT_ID`

No browser-side Supabase service key is generated.

## Live Run Result

Run ID: `m4-creator-type2-backend-live-20260624-1728`

Observed chain:

```text
POST /api/run-construction
-> FRESH_BUILD
-> description_build_brief completed
-> codebase_generator READY
-> generatedFileCount 12
-> platformDependencies 0
-> upgrade_repo_write BLOCKED
```

Exit:

```text
exitReason: ACCESS_BLOCKED
failureStage: deployment_adapter
message: You need admin access to the organization before adding a repository to it.
```

## Gate Status

### Gate 1 — Delivery Repo Creation

`BLOCKED`.

The deployed runtime reached repo creation and was denied org repo creation:

```text
ACCESS_BLOCKED: You need admin access to the organization before adding a repository to it.
```

Credential facts:

- GitHub App token can be minted.
- Local metadata check shows repository-level permissions: `administration: write`, `contents: write`, `workflows: write`, `repositorySelection: all`.
- The live org repo creation API still rejects with org-admin authority required.

Interpretation:

Repository-level administration is not enough for autonomous org repo creation. FlowAI needs a separate scoped delivery credential or GitHub App installation with org-level repository creation authority. This should be a delivery/workspace credential, not a silent broadening of the self-renewal app without SSOT review.

### Gate 2 — Independent Verifier Read Access

`NOT REACHED`.

No generated product URL exists yet, so CT2 cannot run the cross-session browser proof. Once Gate 1 clears, CT2 still needs one of:

- read access to `generated_product_records` for the generated product row, or
- cross-session fresh-browser verification plus cold re-read after delay.

## Verification

Executed before live proof:

```text
node --check src/lib/freshBuild/codebaseGenerator.js
node --check src/lib/provisioning/upgradeTargetProvisioner.js
node --check src/lib/freshBuild/freshBuildDeploymentAdapter.js
npx vitest run tests/freshBuild/codebaseGenerator.test.js tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js
# 3 files / 50 tests PASS
npx vitest run tests/freshBuild tests/provisioning
# 6 files / 77 tests PASS
npm run build:preflight
# PASS
npm run lint:evidence
# PASS
npx vitest run tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js
# 2 files / 35 tests PASS
```

## Claim Discipline

Earned:

- SSOT Creator path now reaches backend-capable code generation for description-only persistence requests.
- Generated product backend substrate is live in Supabase.
- Delivery authority gap is proven at the correct boundary.

Not earned:

- `CREATOR TYPE 2 DESCRIPTION-ONLY DEMONSTRATED`
- `CREATOR_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- Any ProductSSOT or matrixArtifact movement

## Next Required Action

Clear Gate 1 with a scoped delivery credential that can create repositories under the approved FlowAI-owned delivery namespace.

Then rerun:

```text
Description-only
-> SSOT Creator / FRESH_BUILD / codebaseGenerator
-> generated backend app
-> auto-created delivery repo
-> Vercel project with generated Supabase env
-> public URL
-> CT2 write in browser context 1
-> server-side persistence proof
-> fresh context read in browser context 2
-> cold re-read after delay or DB row confirmation
```

Only that live chain can move Creator.
