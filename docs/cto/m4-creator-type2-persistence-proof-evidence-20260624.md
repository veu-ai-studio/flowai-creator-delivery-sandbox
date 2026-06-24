# M4 Creator Type 2 Persistence Proof Evidence - 2026-06-24

## Verdict Recommendation

Recommended claim movement:

CREATOR TYPE 2 DESCRIPTION-ONLY DEMONSTRATED (PERSISTENCE-BACKED)

Scope:
- Description-only Fresh Build / Creator path.
- Persistence-backed generated app.
- One public deployed product URL.
- Independent verifier PASS.

Claims not earned:
- UNIVERSAL_ENGINE_VERIFIED.
- CREATOR_VERIFIED across all Creator input types.
- Upgrader movement.
- ProductSSOT / matrixArtifact VERIFIED movement.
- Quality score movement. This run had `scoreStatus=SCORE_NOT_CONFIGURED`.

## Final Public Product URL

[Community Resource Navigator](https://flowai-creator-delivery-sandbox-ju9u4hslt-veu-ai-studio.vercel.app/)

Backend API endpoint:

[GET /api/resource-requests](https://flowai-creator-delivery-sandbox-ju9u4hslt-veu-ai-studio.vercel.app/api/resource-requests)

## Runtime And Run Identity

FlowAI runtime URL:

[FlowAI M4 runtime](https://flowai-d41gh559o-veu-ai-studio.vercel.app/)

Runtime identity:
- `/api/version` commit: `3f40a8347998`
- Full commit: `3f40a8347998eab62299d51bd692a53b6ff5b93d`
- Branch: `feature/m4-creator-type2-proof`
- Runtime env: `preview`

Proof run:
- proofRunId: `flowai-m4-creator-20260624T163451-premade-repo`
- Raw SSE evidence: `docs/cto/m4-creator-type2-premade-repo-flowai-m4-creator-20260624T163451-premade-repo.sse`
- Mode: `FRESH_BUILD`
- Flow Hub path: `fresh_build`
- Input type: description-only. No source URL, no source repo, no crawl.

## FlowAI Path Declaration

This proof ran through the SSOT Creator/Fresh Build path:

`/api/run-construction` -> `runFreshBuild` -> `codebaseGenerator` -> `writeGeneratedCodebaseToUpgradeRepo` -> pre-made delivery repo -> Vercel deploy.

Evidence from SSE:
- `registry` skipped with `reason=description_only_fresh_build`.
- `description_build_brief` completed.
- `codebase_generator` completed with `status=READY`, `files=12`, `platformDependencies=0`.
- `upgrade_repo_write` completed with `status=WRITTEN_AND_DEPLOYED`.

Tool selection note:
- This Fresh Build path does not currently emit a Tool Intelligence Marketplace selected-tool record.
- The executing build component is the SSOT Creator `codebaseGenerator`, followed by the Fresh Build deployment adapter.
- No TIM/Codex selected-tool claim is made for this M4 proof.

## Delivery Repo And Deployment

Delivery repo:

[veu-ai-studio/flowai-creator-delivery-sandbox](https://github.com/veu-ai-studio/flowai-creator-delivery-sandbox)

Delivery commit:

[90d606fa11f43f57e13dd1b9cf9d813c2ce15712](https://github.com/veu-ai-studio/flowai-creator-delivery-sandbox/commit/90d606fa11f43f57e13dd1b9cf9d813c2ce15712)

Generated branch:

`flowai/fresh-build-community-resource-navigator-flowai-m4-creator-20260624t163451-premade-repo`

Deployment:
- deploymentId: `dpl_CxeuPx21L4eQQpdLa5jCFgyTL2gt`
- deployed URL: [https://flowai-creator-delivery-sandbox-ju9u4hslt-veu-ai-studio.vercel.app/](https://flowai-creator-delivery-sandbox-ju9u4hslt-veu-ai-studio.vercel.app/)
- previewAccessStatus: `PREVIEW_BROWSER_CLEAR`
- HTTP status in FlowAI preview probe: `200`

Backend env evidence in SSE:
- `FLOWAI_GENERATED_SUPABASE_URL`: `already_exists`
- `FLOWAI_GENERATED_SUPABASE_SERVICE_ROLE_KEY`: `already_exists`
- `FLOWAI_GENERATED_PRODUCT_ID`: `already_exists`

## Product Behavior Proven

Generated app:
- Renders actual `Community Resource Navigator` app, not a blank shell.
- Shows a real input form, category selector, backend status, and backend-retrieved recommendations.
- Supports differentiated recommendations by category.

Two-input functional proof on final URL:
- Housing input: `M4 final proof 2026-06-24T20-35-47-493Z: I need help paying rent before an eviction hearing.`
- Housing next step: emergency rental assistance / lease, notice, proof of income.
- Food input: `M4 final proof 2026-06-24T20-35-47-493Z: My family needs groceries this week.`
- Food next step: food pantry intake / household-size proof / mobile pantry routes.
- Recommendations differ materially.

Browser proof artifact:
- `docs/cto/m4-final-playwright-two-context-result.json`
- `docs/cto/m4-final-context1-write.png`
- `docs/cto/m4-final-context2-fresh-retrieve.png`

## Persistence Proof

Persistence mechanism:
- Vercel serverless API in generated app.
- Supabase table: `generated_product_records`.
- Project id: `flowai-creator-delivery-sandbox`.

Server-side evidence:
- `docs/cto/m4-final-supabase-persistence-rows-20260624.json`
- Supabase REST query returned `status=200`.
- Rows include final proof housing and food records, plus independent verifier records.

Fresh-session evidence:
- Browser context 1 wrote final proof housing and food records.
- Browser context 2 was a separate fresh browser context with no shared cookies/session.
- Context 2 retrieved both records from backend-rendered saved recommendations.
- `localStorage` or in-page React state cannot explain the result because Supabase rows exist and a fresh browser context retrieved the data.

## Independent Verification

Independent verifier PASS on final URL:

Verified target: [latest M4 Creator app](https://flowai-creator-delivery-sandbox-ju9u4hslt-veu-ai-studio.vercel.app/)

Independent checks reported:
- Public load: PASS. Opened without Vercel auth/bypass.
- Actual app render: PASS. Shows `Community Resource Navigator`, form fields, category selector, backend status, and saved recommendations.
- Two-input functional behavior: PASS.
  - Food need -> food pantry/mobile pantry recommendation.
  - Work need -> workforce center/resume/transport recommendation.
- Persistence: PASS.
  - Fresh tab retrieved both new records.
  - No-cookie API call to `/api/resource-requests` returned HTTP `200` with both records.
  - Direct Supabase read confirmed server-side rows:
    - `35ea6329-8bff-4909-9cbc-3cb162329d93` food
    - `bdc6e2d5-120d-4642-b004-58be72ea9422` work

Independent conclusion:

`LocalStorage/React state cannot explain the result because the records were returned by the public backend API and confirmed in Supabase.`

## FlowAI Code Changes On Record

Branch:

`feature/m4-creator-type2-proof`

Relevant commits:
- `4a1b310d7b2a` - `m4 creator | target premade delivery sandbox`
- `3f40a8347998` - `m4 creator | initialize empty delivery repo`

Code changes:
- Description-only Fresh Build can receive an env-configured delivery repo:
  - `FLOWAI_FRESH_BUILD_DELIVERY_REPO`
  - `FLOWAI_FRESH_BUILD_DELIVERY_BASE_BRANCH`
  - `FLOWAI_FRESH_BUILD_DELIVERY_VERCEL_PROJECT_ID`
  - `FLOWAI_FRESH_BUILD_DELIVERY_VERCEL_ORG_ID`
- Fresh Build deployment adapter accepts `GITHUB_DELIVERY_TOKEN`.
- Existing delivery repo deployments configure generated backend env vars before deploy.
- Empty pre-made delivery repos with GitHub `409 Git Repository is empty` are initialized by the existing Fresh Build write client.

Verification:
- `node --check src/api/run-construction.js` PASS.
- `node --check src/lib/freshBuild/freshBuildDeploymentAdapter.js` PASS.
- `node --check src/lib/provisioning/upgradeTargetProvisioner.js` PASS.
- Focused Vitest:
  - `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
  - `tests/api/runConstructionHandlerSse.test.js`
  - `40/40` PASS.
- `npm run build:preflight` PASS on commit `4a1b310d7b2a`.
- `npm run lint:evidence` PASS.

Note:
- The final live runtime was `3f40a8347998`.
- The broad build preflight was run before the second empty-repo commit. Focused tests cover the second commit.

## Infrastructure Setup Recorded

Allowed W04 interim delivery path used:
- Existing public repo: `veu-ai-studio/flowai-creator-delivery-sandbox`.
- Scoped token: `GITHUB_DELIVERY_TOKEN`.
- No org repo-creation attempted for this proof.

Fixture setup:
- The pre-created repo existed but was empty (`size=0`) and GitHub returned `409 Git Repository is empty`.
- The approved sandbox repo was initialized with a harmless README base commit:
  - `a7d47ded516a45b33cb27f8458044b49203b9e2d`
- Product delivery was not hand-built in that base commit. Generated product delivery came from FlowAI commit `90d606fa11f43f57e13dd1b9cf9d813c2ce15712`.

Vercel setup:
- Delivery project created/used: `flowai-creator-delivery-sandbox`
- Project id: `prj_GmyoYJ96Xni9Eyz9a0IF8dLjKMEX`
- Project SSO protection was disabled for public proof access (`ssoProtection=null`).

Standing infrastructure gap:
- Org-level autonomous repo creation remains unresolved and still belongs to the GitHub App administration workstream.
- This proof used the authorized pre-made repo workaround.

## Claim Boundary

Earned if W04 adjudicates:

`CREATOR TYPE 2 DESCRIPTION-ONLY DEMONSTRATED (PERSISTENCE-BACKED)`

Not earned:
- Universal engine.
- Creator across multi-URL synthesis.
- Autonomous org repo creation.
- ProductSSOT VERIFIED.
- 95/100 score.
- GTM-ready product claim.

## Result

PASS recommendation.

The M4 run proves that FlowAI's real SSOT Creator/Fresh Build path can take a description-only request, generate a multi-file persistence-backed app, write it to the approved delivery repo, deploy it to a public URL, and support server-side write -> fresh-session retrieve with differentiated recommendations.
