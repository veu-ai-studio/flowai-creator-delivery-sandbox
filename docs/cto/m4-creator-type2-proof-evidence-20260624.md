# M4 Creator Type 2 Proof Evidence

Date: 2026-06-24
Branch: `feature/m4-creator-type2-proof`
Implementation commit: `ff0943a4858b1d19e9059bcf2cf272545da8e887`
Preview runtime: `https://flowai-dzp46grio-veu-ai-studio.vercel.app`
Preview runtime identity: `docs/cto/m4-creator-type2-preview-version-20260624.json`

## Verdict

M4 is `BLOCKED`, not failed.

What cleared:

- The proof ran through the deployed `/api/run-construction` endpoint.
- Runtime identity confirms the preview is running commit `ff0943a4858b1d19e9059bcf2cf272545da8e887`.
- Option B persistence request entered the SSOT Fresh Build / codebaseGenerator path and stopped honestly at `PERSISTENCE_PROVISIONING_UNSUPPORTED`.
- Option A static request entered the same SSOT Creator path and generated an 11-file runnable Vite app candidate.

What blocked:

- Delivery workspace creation failed before repo write/deploy:
  `ACCESS_BLOCKED: You need admin access to the organization before adding a repository to it.`

No deployed Creator product URL exists yet.

No Creator claim moves.

## Raw Evidence

Option B raw SSE:

- `docs/cto/m4-creator-type2-optionb-persistence-stop-20260624.sse`

Option A raw SSE:

- `docs/cto/m4-creator-type2-optiona-static-run-20260624.sse`

Preview identity:

- `docs/cto/m4-creator-type2-preview-version-20260624.json`

Implementation dispatch:

- `docs/cto/m4-creator-type2-implementation-dispatch-20260624.md`

## Option B: Persistence-Backed Creator

Request:

Description-only Community Resource Navigator with backend persistence, cold reload, fresh session, and server-side retrieval requirements.

Observed chain:

```text
POST /api/run-construction
-> FRESH_BUILD
-> description_build_brief
-> codebase_generator
-> BLOCKED
```

Evidence excerpt:

```text
exitReason: PERSISTENCE_PROVISIONING_UNSUPPORTED
failureStage: codebase_generator
message: SSOT Fresh Build codebaseGenerator is limited to the allowlisted frontend Vite stack and cannot provision backend persistence for a description-only Creator request.
generatedFileCount: 0
platformDependenciesCount: 0
```

Assessment:

This is the correct honest result for Option B today. The SSOT Creator path has no backend persistence substrate. It did not fake persistence with localStorage, React state, IndexedDB, query strings, or a bespoke path.

Claim movement:

None.

Discovery:

The boundary between "FlowAI can generate a frontend" and "FlowAI can generate operational software with persistence" is now code-grounded.

## Option A: Static / Frontend-Only Creator

Request:

Description-only Community Resource Navigator without persistence. It must produce different recommendations for different needs.

Observed chain:

```text
POST /api/run-construction
-> FRESH_BUILD
-> description_build_brief
-> codebase_generator READY
-> upgrade_repo_write BLOCKED
```

Evidence excerpt:

```text
codebase_generator status: READY
generatedFileCount: 11
platformDependenciesCount: 0
writeStatus: BLOCKED
exitReason: ACCESS_BLOCKED
message: You need admin access to the organization before adding a repository to it.
```

Assessment:

Creator generated the static app candidate through the real SSOT path, but FlowAI could not create the delivery repository under `veu-ai-studio`. This blocks commit, deployment, and CT2 browser verification.

Claim movement:

None.

## Code Changes On Record

`src/lib/freshBuild/codebaseGenerator.js`

- Adds description-only detection for Fresh Build inventories.
- Adds fail-closed persistence detection for description-only requests.
- Adds a guided recommendation app output for resource-navigation descriptions.
- Keeps dependency allowlist unchanged.
- Keeps platformDependencies empty.
- Avoids localStorage, IndexedDB, sessionStorage, and backend fiction.

`tests/freshBuild/codebaseGenerator.test.js`

- Verifies the description-only resource navigator app produces materially different recommendation branches.
- Verifies persistence requests return `PERSISTENCE_PROVISIONING_UNSUPPORTED`.

## Verification

Executed before live proof:

```text
node --check src/lib/freshBuild/codebaseGenerator.js
node --check src/lib/freshBuild/freshBuildOrchestrator.js
node --check src/lib/freshBuild/freshBuildDeploymentAdapter.js
npx vitest run tests/freshBuild/codebaseGenerator.test.js
npx vitest run tests/freshBuild
```

Results:

- `tests/freshBuild/codebaseGenerator.test.js`: 15/15 PASS
- `tests/freshBuild`: 5 files / 65 tests PASS

## C1: Independent Verifier Access

Not satisfied yet.

Reason:

The run did not create a delivery repo or deployed product URL. Independent verifier read-back cannot happen until FlowAI can create or write the delivery repository.

Credential authority note:

The available credential path could not add a repository to `veu-ai-studio`. This is an org-level permission block. The builder must not self-grant, skip read-back, or route around this with a hand-precreated repo.

## C2: Operator-Secret Security Review

Reviewed file:

- `api/_lib/auth.js`

Current state:

- Operator-secret comparison uses `crypto.timingSafeEqual`.
- The header accepted is `x-flowai-operator-secret`.
- `FLOWAI_INTERNAL_SECRET` is accepted as one configured operator-secret candidate.

Security assessment:

This is acceptable for proof traffic only if `FLOWAI_INTERNAL_SECRET` is treated as an operator-grade high-entropy secret and never exposed to browsers. It is not acceptable as a long-term operational boundary because it widens an internal system credential into a general operator-auth bypass for every route that uses `requireOperatorAuth`.

Required before operational claim:

- Split proof/operator auth from internal service auth.
- Prefer a dedicated `FLOWAI_OPERATOR_SECRET` for operator-secret fallback.
- Keep `FLOWAI_INTERNAL_SECRET` reserved for internal service-to-service calls.

This does not block M4 proof work, but it blocks any "operationally dependable auth" claim.

## C3: Builder Is Not Merger

Satisfied so far.

The branch is pushed for evidence. It is not merged to `main`.

No M4 claim should move until a non-builder verifies a deployed product URL, the two-input behavior, and the evidence packet from origin.

## Required Next Action

Resolve the GitHub org repo-creation authority block.

One of these must become true:

- The `flowai-self-renewal` GitHub App has org-level `Administration: read/write`, `Contents: read/write`, and all-repository access for `veu-ai-studio`.
- Or Victor provides an approved operator credential that can create repositories under `veu-ai-studio`.

SSOT tension:

- `src/lib/provisioning/upgradeTargetProvisioner.js` and the Universal Delivery evidence require `Administration: write` plus all-repository access for autonomous FlowAI-owned repo creation.
- `docs/specs/SELF_RENEWAL_SPEC.md` still says the Self-Renewal GitHub App must not include `administration: *`.

This means repo auto-creation is not only a credential issue. It is also a canonical authority decision: either the existing GitHub App permission model must be amended for Universal Delivery / Creator workspace provisioning, or a separate delivery-workspace GitHub App / operator credential must own repo creation.

Do not silently broaden the current App without CEO approval.

After that, rerun the exact Option A request through the deployed `/api/run-construction` endpoint and verify:

```text
Description-only
-> SSOT Creator / FRESH_BUILD / codebaseGenerator
-> generated app commit
-> deployed public URL
-> Need A produces Recommendation A
-> Need B produces Recommendation B
-> CT2 browser verification
```

## Current M4 Claim

No `CREATOR TYPE 2 DESCRIPTION-ONLY DEMONSTRATED` claim is earned yet.

Current earned discovery only:

```text
Creator Option B persistence wall identified.
Creator Option A static generation reached codebase candidate.
Delivery is blocked by GitHub org repo-creation authority.
```
