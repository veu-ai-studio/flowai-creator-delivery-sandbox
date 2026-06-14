# CTO Audit: Universal Input Journey and Infrastructure Gaps

Date: 2026-06-14
Branch: docs/cto-auto-repo-provisioning-plan
Author: CTO
Scope: Diagnosis only. No build dispatch, no implementation plan, no runtime changes.

## Executive Finding

FlowAI is canonically a universal product engine, but the current active forge implementation is still centered on a single public URL plus a preconfigured delivery target. The codebase contains partial pieces for all three requested input types, but they are not unified into the active eight-step forge with autonomous GitHub repository creation, autonomous Vercel project/deployment provisioning, ProductSSOT persistence, and a browser-confirmed returned URL.

The honest state is:

- Type 1 - Single URL: partially wired. It can research, score, and in some registered cases reach build/deploy logic, but it breaks when the product lacks an authorized upgrade repo, safe write target, Vercel project mapping, or source access. Unknown URLs can fall into universal/evaluation-only mode with no deployed output.
- Type 2 - Description only: not supported end-to-end in the active forge. UI and legacy renewal pieces can carry description inputs, but `/api/run-construction` rejects requests without an HTTP URL before Fresh Build can run.
- Type 3 - Multi-URL synthesis: not supported end-to-end in the active forge. UI and legacy synthesis pieces exist, but `/api/run-construction` accepts only one `url`, and multi-URL synthesis is not wired into the current Flow Hub forge path with deployable output and SSOT persistence.

This audit intentionally does not propose the fix sequence. It records the current breakpoints and assumptions W04 asked to surface before any build dispatch.

## Canonical Baseline

Canonical input modes are defined in `docs/CANONICAL_REFERENCE.md`:

- `Clone & Improve`: single URL, crawl, audit, enhance, redeploy. See `docs/CANONICAL_REFERENCE.md:106`.
- `Describe & Build`: natural language, generate from scratch. See `docs/CANONICAL_REFERENCE.md:107`.
- `Paste / Upload`: text plus screenshots, reconstruct and build. See `docs/CANONICAL_REFERENCE.md:108`.
- `Synthesize & Build`: 2-5 URLs, cross-URL comparative scoring, best-feature extraction, synthesis composition. See `docs/CANONICAL_REFERENCE.md:109`.

The same canonical section states maturity:

- Single URL: CURRENT. See `docs/CANONICAL_REFERENCE.md:119`.
- Multiple URLs: ROADMAP. See `docs/CANONICAL_REFERENCE.md:120`.
- Text description: IN_PROGRESS. See `docs/CANONICAL_REFERENCE.md:121`.
- Brand-new product from non-URL input: ROADMAP. See `docs/CANONICAL_REFERENCE.md:135`.
- Synthesized product from best of multiple inputs: ROADMAP. See `docs/CANONICAL_REFERENCE.md:137`.

So the SSOT already distinguishes "canonical direction" from "implementation maturity." The implementation should not be described as complete for Types 2 or 3.

## Active Forge Entry Point

The active forge API declares a single `url` field in the request contract:

- `src/api/run-construction.js:15` documents body as `{ url: string, mode: ... }`.
- `src/api/run-construction.js:342` extracts `body.url`.
- `src/api/run-construction.js:343` extracts `body.description`, but the route still rejects before using description-only input.
- `src/api/run-construction.js:370` returns `invalid_url` unless `body.url` is an HTTP(S) URL.

This is the first global break for Type 2 and Type 3. Description-only cannot enter the route. Multi-URL cannot enter as first-class input; only one URL is accepted.

## Type 1 Audit: Single URL

User journey: user submits one existing product URL. FlowAI analyzes, upgrades or migrates it, deploys the result, returns a new URL.

### Current Support

Partial.

The active forge can accept one HTTP(S) URL through `/api/run-construction`. It validates SSRF/public URL status, upserts or resolves product context, runs the orchestrator or Fresh Build mode, emits SSE, and can produce step logs and final envelopes.

The main orchestrator recognizes known registered products and unknown URL paths:

- Registered product lookup and path reporting are in `src/lib/agents/renewal/orchestrator.js:1449`.
- Unknown URL without repo access is explicitly described as universal/evaluation-only in `src/lib/agents/renewal/orchestrator.js:1449`.
- Universal mode later skips deploy because there is no FlowAI-owned destination in `src/lib/agents/renewal/orchestrator.js:4350`.

### Where It Breaks

1. Unknown product URL can become evaluation-only, not deployed output.

`src/lib/agents/renewal/orchestrator.js:4350` records the reason: "universal mode - no operator GitHub repo and no FlowAI-owned destination to deploy into." This directly contradicts the required universal user journey of URL in, upgraded URL out.

2. Production path depends on a valid repo target before branch creation.

The orchestrator validates `githubRepoUrl` before file mutation and says the remediation is to configure `product_registry.github_repo_url` or `upgrade_repo` before repo mutation/deploy. See `src/lib/agents/renewal/orchestrator.js:3320`.

3. Branch creation requires an existing owner/repo/branch and token.

Actual branch creation runs through `createRenewalBranch` after file changes survive gates. See `src/lib/agents/renewal/orchestrator.js:4236`.

4. Vercel deploy requires a project mapping.

PATH A deploy uses `resolveVercelProjectId`, `VERCEL_ORG_ID`, and `VERCEL_OPERATOR_TOKEN` / `VERCEL_TOKEN`; missing mapping skips or degrades. See `src/lib/agents/renewal/orchestrator.js:4485` and `src/lib/agents/renewal/orchestrator.js:4515`.

5. Migration mode requires a registered product and target repo.

`createMigrationRuntimeHooks` returns `product_not_found` when no registered product exists, then returns `missing_upgrade_repo` when no target repo exists. See `src/api/run-construction.js:1264` and `src/api/run-construction.js:1300`.

6. Preconfigured product config proves the narrow assumption.

`src/lib/products/registeredProductConfig.js:1` has only SAIGE fully configured with `upgrade_repo`, `upgrade_url`, `deployment_status`, and related upgrade fields. RelTwin, ReachSMS, PressAI, and MyPregLife only show base repo/branch registration.

### Type 1-Only Assumptions

These assumptions work only when there is an existing product URL:

- A crawler can fetch a public URL.
- Pre-fix scoring has a live baseline product to score.
- A source URL can be mapped to a product registry row.
- ProductSSOT can be keyed by a product URL or URL hash.
- A branch/deploy target can be resolved from product metadata.
- The comparison baseline is the submitted URL.

These assumptions break or become undefined for description-only and multi-URL synthesis.

### Honest Type 1 State

Single URL is CURRENT only for research/scoring and partially for registered-product improvement. It is not yet a universal deployed-output path because new public URLs without preconfigured repo/project delivery can terminate as evaluation-only or blocked before branch/deploy.

## Type 2 Audit: Description Only

User journey: user describes what they want built. No existing product, no URL to crawl. FlowAI generates a brand-new product and deploys it.

### Current Support

Not end-to-end in the active forge.

There are partial components:

- `src/lib/renewal/inputArtifact.js:79` accepts `description` as a valid input artifact type.
- `api/_lib/renewalEngine.js:12` documents `description -> remediate (generate-from-scratch path)`.
- `api/_lib/remediationEngine.js:207` calls `dispatch('generate-from-scratch')`.
- `src/lib/orchestra/index.js:64` routes `generate-from-scratch` to Codex.
- `src/lib/orchestra/vercel.js:9` can deploy inline file lists to Vercel using `POST /v13/deployments`.
- `src/pages/Configuration.jsx:28` exposes `Describe & Build` in a session configuration surface.

But these pieces do not equal active Flow Hub forge completion.

### Where It Breaks

1. Active forge route rejects description-only input before execution.

`src/api/run-construction.js:370` requires `body.url` to be an HTTP(S) URL. The `description` field is read at `src/api/run-construction.js:343`, but it is not enough to pass the route boundary.

2. Fresh Build is URL-derived, not description-derived.

`src/lib/freshBuild/freshBuildOrchestrator.js:23` and `src/lib/freshBuild/freshBuildOrchestrator.js:28` require a non-empty HTTP(S) URL. `runFreshBuild` then calls `requireHttpUrl(input.url || input.productUrl)` at `src/lib/freshBuild/freshBuildOrchestrator.js:292`.

3. Feature extraction requires a URL crawl.

`src/lib/freshBuild/featureExtractor.js` requires a URL, crawls the URL, and builds FeatureInventory from crawled pages. It has a scaffold mode, but it is still scaffolded around a normalized URL, not a description-native source artifact.

4. Design synthesis requires a URL crawl.

`src/lib/freshBuild/designSynthesizer.js:333` describes synthesis from a live URL, and `synthesizeDesign` requires a URL at `src/lib/freshBuild/designSynthesizer.js:345`.

5. Code generation source of truth is URL-derived FeatureInventory plus DesignSpec.

`src/lib/freshBuild/codebaseGenerator.js:682` generates files from `featureInventory` and `designSpec`. In the active Fresh Build path those are crawl-derived, not description-derived.

6. Repo write still requires an upgrade repo.

Fresh Build writes to `writeGeneratedCodebaseToUpgradeRepo`, and that adapter returns `UPGRADE_REPO_REQUIRED` when `productConfig.upgrade_repo`, `upgradeRepo`, or `github_repo_url` is absent. See `src/lib/freshBuild/freshBuildDeploymentAdapter.js:483` and `src/lib/freshBuild/freshBuildDeploymentAdapter.js:509`.

7. UI description forms are not proof of deployable forge support.

`src/pages/Configuration.jsx:149` stores a description input in session config, and `src/pages/CreatorStudio.jsx:595` presents a Describe & Build mode, but Creator Studio produces strategy/architecture/Base44 sprint artifacts through Base44 LLM calls rather than a fully deployed FlowAI forge output URL.

### W04 Questions For Type 2

How does the forge generate code with no URL to crawl and no codebase to read?

- Current active Fresh Build does not. It needs a URL-derived FeatureInventory and DesignSpec. Legacy renewal/remediation can generate from a normalized description artifact, but that path is not the active eight-step forge path and is not ProductSSOT/Flow Hub complete.

What is the source of truth for the build?

- In the active Fresh Build runner, source of truth is the URL-derived FeatureInventory plus DesignSpec.
- In legacy renewal, source of truth is `InputArtifact.normalized` from description.
- There is no single active forge-owned description BuildBrief serving as the SSOT input for description-only builds.

How does it know what stack to use?

- Fresh Build deterministic generator defaults to `react-vite-tailwind-vercel`.
- Legacy Codex/Claude generate-from-scratch supports only `vite-react`.
- Stack selection is hardcoded/defaulted, not inferred from a product description or chosen through a deployability matrix.

How does it create a repo from nothing?

- It does not in the active Fresh Build path. It writes to an existing configured upgrade repo or blocks.
- Legacy Vercel inline deploy can deploy files without a GitHub repo, but that does not satisfy the new requirement that FlowAI auto-create and write a GitHub repo under a FlowAI-owned organization.

### Honest Type 2 State

Description-only is IN_PROGRESS at the artifact/UI/legacy-remediation layer, but it is not end-to-end in the current forge. It cannot pass the active construction API without a URL, and the active Fresh Build implementation still expects URL-derived evidence and a preconfigured write target.

## Type 3 Audit: Multi-URL Synthesis

User journey: user submits two or more URLs from different sources. FlowAI synthesizes the best of all inputs into one new product and deploys it.

### Current Support

Not end-to-end in the active forge.

There are partial components:

- `api/_lib/synthesisEngine.js` implements a legacy multi-URL synthesis engine.
- `api/_lib/synthesisEngine.js:37` accepts `urls: string[]`.
- It validates 2-5 URLs, crawls them in parallel through `adaptUrl`, ranks feature dimensions, composes a spec, and hands off to remediation.
- `api/_lib/renewalEngine.js:51` routes `multi-url-synthesis` or `urls.length >= 2` into synthesis.
- `src/pages/Configuration.jsx:30` exposes `Synthesize & Build`, and `src/pages/Configuration.jsx:144` builds a list of URL inputs.
- `src/pages/CreatorStudio.jsx:583` stores source URLs for registered synthesized products.

### Where It Breaks

1. Active forge route accepts only one URL.

`src/api/run-construction.js:15` documents `url: string`, and `src/api/run-construction.js:342` extracts only one URL. There is no first-class `urls[]` handling in this active endpoint.

2. The multi-URL engine is a separate legacy renewal path.

`api/_lib/synthesisEngine.js` can synthesize, but it is not wired into the current Flow Hub production/migration/fresh-build route as a deployable eight-step forge run.

3. Multi-URL crawl exists only in the legacy synthesis engine.

`api/_lib/synthesisEngine.js:37` defines `urls`, and the engine crawls all URLs through `adaptUrl`. That is useful but separate from the Fresh Build FeatureInventory/DesignSpec path.

4. Conflict resolution is shallow.

The current synthesis ranking picks winners by simple dimensions such as CTA count, value prop, trust signals, legal signal, features, and heading hierarchy. It does not perform robust conflict reconciliation across business model, data model, user flows, compliance constraints, IP constraints, target users, or technical architecture.

5. Stack choice is not synthesized.

The handoff goes to remediation generate-from-scratch. Legacy generation supports only Vite React. There is no current multi-URL stack selection based on sources or user intent.

6. ProductSSOT and evidence promotion are not integrated.

The legacy path can return `renewedUrl`, `sourceContributions`, and logs, but the active Flow Hub proof standard requires forge step evidence, ProductSSOT persistence, and CT2/browser-confirmed deployed URL before any VERIFIED movement.

7. UI synthesis surfaces can produce briefs/sprints rather than deployed URLs.

Creator Studio Mode 3 uses Base44 LLM prompts to create comparative audit, best elements, synthesis plan, and Base44 build sprint. See `src/pages/CreatorStudio.jsx:410`, `src/pages/CreatorStudio.jsx:437`, `src/pages/CreatorStudio.jsx:458`, and `src/pages/CreatorStudio.jsx:479`. That is not the same as a FlowAI-produced deployed URL.

### W04 Questions For Type 3

How does the forge crawl multiple URLs?

- Legacy `api/_lib/synthesisEngine.js` crawls multiple URLs in parallel through `adaptUrl`.
- The active `/api/run-construction` forge path does not accept or crawl multiple URLs as a single run input.

How does it reconcile conflicting features?

- Current legacy synthesis ranks simple dimensions and chooses source winners. It does not deeply reconcile conflicting feature sets, user journeys, architecture, monetization, compliance, or IP constraints.

How does it decide which stack to use?

- It does not decide dynamically. Legacy generate-from-scratch is fixed to Vite React. Fresh Build deterministic generation defaults to React/Vite/Tailwind/Vercel.

How does it merge insights into one product?

- Legacy `composeSynthesisSpec` builds one concept from the value-prop winner, aggregates core claims, takes detected features from the features winner or unique features, and attaches `sourceContributions`.
- This is a starter artifact, not a production-grade synthesis planning engine.

### Honest Type 3 State

Multi-URL synthesis is ROADMAP in the canonical maturity table and only partially prototyped in legacy renewal and UI surfaces. It is not wired into the active forge as an end-to-end path that returns a deployed URL and ProductSSOT evidence.

## Cross-Type Infrastructure Gap

All three input types share a delivery gap:

- The user must never need a GitHub account.
- The user must never know what a repo is.
- The user must never configure a Vercel project.
- FlowAI must own repo creation, code writing, deployment, evidence, and returned URL.

Current code does not meet that universally.

### GitHub Assumptions

The codebase already has helper functions that look like repo provisioning, but the exported provisioner does not execute them:

- `ensureUpgradeRepo` exists at `src/lib/provisioning/upgradeTargetProvisioner.js:68`.
- `ensureVercelProject` exists at `src/lib/provisioning/upgradeTargetProvisioner.js:229`.
- `provisionUpgradeTarget` exists at `src/lib/provisioning/upgradeTargetProvisioner.js:288`, but currently returns `provisioning_required` or `already_provisioned` without creating anything. See `src/lib/provisioning/upgradeTargetProvisioner.js:297`.

Fresh Build has a Git tree writer, but it writes only to an already resolved repo:

- `writeGeneratedCodebaseToUpgradeRepo` starts at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:483`.
- It blocks at `src/lib/freshBuild/freshBuildDeploymentAdapter.js:509` when no upgrade repo exists.

### Vercel Assumptions

There are two different deploy shapes:

- Git branch deployment through `src/lib/agents/renewal/vercelBranchDeploy.js`, which requires existing Vercel project ID/org/token and a GitHub branch.
- Inline file deployment through `src/lib/orchestra/vercel.js`, which posts file lists to `/v13/deployments` and can create a Vercel deployment without first writing to GitHub.

The required universal architecture needs the GitHub repo path and Vercel project/deploy path to converge. Today they are split, and neither is fully wired to "any input -> FlowAI-owned repo -> FlowAI-owned Vercel deployment -> returned URL."

## Type 1 Assumptions That Break Types 2 And 3

- Crawl-first pipeline: description-only has no URL; multi-URL has several URLs and no single baseline.
- Baseline scoring: description-only has no existing product score; multi-URL has multiple baselines and no obvious single pre-score.
- Existing source repo assumption: description-only has no source code; multi-URL synthesis has no single canonical source repo.
- Upgrade target assumption: generated products should not require a pre-existing `upgrade_repo`.
- Product registry lookup by URL: description-only may have no URL; multi-URL may have several unrelated URLs.
- Source mapping to existing files: description-only and synthesis builds create a new file tree rather than patching observed app-layer files.
- Branch-of-record semantics: new products need an initial default branch and first commit before branch mutation makes sense.
- Governance evidence: description-only and synthesis need a BuildBrief/SourceContribution artifact as the evidence source, not a crawl-only evidence envelope.

## New Agents, Tools, Or Pipeline Steps Needed - Diagnostic Inventory

This section lists capability gaps only. It is not an implementation plan.

### Needed For Type 2

- Description intake normalizer that turns natural language into a canonical BuildBrief without requiring a URL.
- Stack selection / deployment-target selector for new products.
- Description-native FeatureInventory and DesignSpec builders, or a replacement source artifact that code generation can consume.
- New-product scoring model that does not depend on pre-fix URL scoring.
- FlowAI-owned workspace provisioner that creates the repo/project from no existing product.
- First-commit writer for generated codebases.
- ProductSSOT persistence for `build_brief.originalInput.mode = describe-build`.

### Needed For Type 3

- Multi-URL intake normalizer with per-source role/context.
- Multi-source crawler that produces one comparable evidence envelope per URL.
- Comparative scorer across URLs with transparent source attribution.
- Conflict reconciliation engine for user flows, features, data models, compliance, monetization, visual language, and IP risk.
- Synthesis BuildBrief generator with `sourceContributions`.
- Stack selector for the synthesized product.
- New-product deploy/provision path identical to Type 2 after synthesis.
- ProductSSOT persistence for `build_brief.originalInput.mode = synthesize-build` and `sourceUrls`.

### Needed For All Types

- FlowAI-owned GitHub repo creation and first commit.
- FlowAI-owned Vercel project creation/import/deploy.
- A persistent workspace record tying runId, input artifact, repo, branch, commit, Vercel project, deployment, returned URL, and ProductSSOT update.
- CT2/browser proof that the returned URL opens.
- Evidence discipline that never promotes VERIFIED until `evidenceUrl`, `verifiedAt`, and `verifiedBy` exist.

## Final Honest State Table

| Input type | Current state | What works | Where it breaks |
|---|---|---|---|
| Type 1 - Single URL | PARTIAL | Active route accepts one public URL; crawl/scoring/orchestrator exist; registered product runs can reach branch/deploy logic in some cases | Unknown URLs can become evaluation-only; registered products need safe upgrade repo and Vercel project mapping; migration needs registered product and target repo |
| Type 2 - Description only | NOT END-TO-END | UI can collect descriptions; InputArtifact supports `description`; legacy remediation can generate Vite React from normalized description; Codex is wired for generate-from-scratch | Active forge rejects missing URL; Fresh Build requires URL-derived FeatureInventory/DesignSpec; no description-native BuildBrief in active forge; no auto repo/project |
| Type 3 - Multi-URL synthesis | NOT END-TO-END | UI can collect 2-5 URLs; legacy synthesis engine crawls several URLs and composes a simple synthesis spec; remediation can attempt generated deploy | Active forge accepts only one URL; synthesis not wired into Flow Hub forge; conflict reconciliation is shallow; stack selection fixed; no auto repo/project/SSOT proof |

## Bottom Line

The architecture gap W04 identified is real and larger than repository creation alone. Auto-repo creation is necessary but not sufficient. The active forge also needs input-type-native source artifacts and delivery semantics for description-only and multi-URL synthesis. Until those are wired, FlowAI should not claim universal "any input -> deployed upgraded/new URL" behavior.

No build should be dispatched from this document alone. It is the diagnosis that should feed a separate W04-cleared architecture/design dispatch.
