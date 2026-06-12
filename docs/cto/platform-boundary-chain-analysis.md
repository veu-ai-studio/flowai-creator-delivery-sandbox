# Platform Boundary Chain Analysis

Date: 2026-06-11
Base repo: `C:\Users\victo\Downloads\truthful-flow-logic-lab`
Base commit: `e8aef065533bd273fbd86b55d90c5ea35aea91c5`
Branch: `docs/cto-platform-boundary-analysis`

## Executive Answer

`FLOWAI_ENABLE_LLM_FIXES=true` satisfies only the LLM feature flag. It does not satisfy the platform-boundary classifier, universal-mode mutation block, deterministic-first policy, forbidden-path guard, candidate validation, repair-integrity gate, pre-deploy parse gate, GitHub branch-write gate, Vercel deploy gate, regression gate, or operator-approval PR gate.

The latest SAIGE boundary evidence points to `src/api/base44Client.js` with reason `base44_client_internal` and stage `prioritization`. That is a deterministic platform-boundary refusal, not a timeout and not a simple disabled-LLM condition.

Do not dispatch CB for a one-line env/flag change. The next build dispatch must either route the finding to a safe app-layer source file or explicitly record it as governance/manual platform work. It must not weaken the Base44/platform/auth boundary.

## Exact Boundary Anchors

Primary source-mapping classifier:

- `src/lib/sourceMapping/classifyFileBoundary.js:63-69`
- Fires `SOURCE_MAPPING_STATUSES.PLATFORM_BOUNDARY_BLOCKED` when the selected file is a platform-boundary path or when the source text has top-level Base44/platform SDK imports.

Primary orchestrator classifier:

- `src/lib/agents/renewal/orchestrator.js:6051-6055`
- Pattern `base44_client` matches `src/api/base44Client.js` and assigns reason `base44_client_internal`.
- `src/lib/agents/renewal/orchestrator.js:6077-6087`
- `classifyPlatformBoundaryChange` returns `{ blocked: true, classification: 'PLATFORM_BOUNDARY_BLOCKED', reason, policy, filePath }`.

Latest SAIGE live-proof boundary location:

- `src/lib/agents/renewal/orchestrator.js:3065-3072`
- Prioritized issues are filtered through the platform-boundary classifier. Blocked issues are appended to `state.platformBoundaryBlocked` with `stage: 'prioritization'` and `classification: 'PLATFORM_BOUNDARY_BLOCKED'`.
- Evidence artifact `cto-saige-sse-proof-20260612003407.sse` reports first boundary: `src/api/base44Client.js`, reason `base44_client_internal`, stage `prioritization`.

## Full Boundary Chain

1. Product discovery and target mode
   - `src/lib/agents/renewal/orchestrator.js:1323-1331` documents PATH A registered product versus PATH B synthesized config.
   - `src/lib/agents/renewal/orchestrator.js:1394-1398` defines universal mode as evaluation-only for unknown URLs with no repo.
   - Universal mode skips mutation and keeps preview null by design.

2. Source-map recommendation boundary
   - `src/lib/sourceMapping/classifyFileBoundary.js:63-69` blocks platform files or platform SDK imports during source mapping.
   - `src/lib/sourceMapping/sourceMappedFixGenerator.js:222-229` converts those findings into non-actionable `PLATFORM_BOUNDARY_BLOCKED` proposals.
   - `src/lib/sourceMapping/sourceMappedFixGenerator.js:271-279` rechecks fetched file content and blocks top-level platform SDK imports.
   - `src/lib/agents/renewal/orchestrator.js:2931-2950` appends blocked source-mapped recommendations with stage `source_mapped_recommendation`.

3. Prioritization boundary
   - `src/lib/agents/renewal/orchestrator.js:3065-3072` appends blocked prioritized issues with stage `prioritization`.
   - In the latest SAIGE proof, this is the observed stop point for `src/api/base44Client.js`.

4. LLM repair boundary
   - `src/lib/agents/renewal/orchestrator.js:3351` enables LLM fixes only when dependency override or `FLOWAI_ENABLE_LLM_FIXES=true` is present.
   - `src/lib/agents/renewal/orchestrator.js:3446-3448` rejects with `LLM_FIX_FEATURE_DISABLED` when the flag is absent.
   - `src/lib/agents/renewal/orchestrator.js:3450-3452` rejects universal/PATH B source patching with `UNIVERSAL_MODE_SOURCE_PATCH_BLOCKED`.
   - `src/lib/agents/renewal/orchestrator.js:3454-3456` rejects deterministic-first issues with `DETERMINISTIC_REPAIR_FIRST`.
   - `src/lib/agents/renewal/orchestrator.js:3458-3463` rejects forbidden LLM source paths with `PLATFORM_BOUNDARY_BLOCKED` at stage `llm_pre_call_guard`.
   - `src/lib/agents/renewal/orchestrator.js:3597-3612` validates the LLM response and records stage `llm_response_guard` for platform-boundary candidates.
   - `src/lib/agents/renewal/llmFixSafeguards.js:63-70` shows the env flag only toggles LLM availability; forbidden paths remain forbidden.
   - `src/lib/agents/renewal/llmFixSafeguards.js:149-178` validates candidate scope and independently blocks forbidden paths as `PLATFORM_BOUNDARY_BLOCKED`.

5. No-fix exit before branch creation
   - `src/lib/agents/renewal/orchestrator.js:4012-4018` sets `exitReason='PLATFORM_BOUNDARY_BLOCKED'` when no commit-ready files exist and `state.platformBoundaryBlocked` is non-empty.

6. Repair-integrity gate
   - `src/lib/agents/renewal/orchestrator.js:4060-4080` records repair-integrity platform-boundary rejections and writes `self_renewal.platform_boundary_blocked.v1`.
   - `src/lib/agents/renewal/orchestrator.js:4094-4103` exits with `PLATFORM_BOUNDARY_BLOCKED` when repair integrity rejects every generated change.
   - `src/lib/agents/renewal/orchestrator.js:6235-6242` also blocks `requiresAuth` escalation as `PLATFORM_BOUNDARY_BLOCKED`.

7. Pre-deploy parse gate
   - `src/lib/agents/renewal/orchestrator.js:4106-4156`
   - Every generated file must pass parse checking before branch creation. If all are rejected, branch creation is skipped.

8. Branch creation and commit
   - `src/lib/agents/renewal/orchestrator.js:4180-4234`
   - `_createRenewalBranch` and `_commitFileToBranch` only run after at least one file survives all prior gates.
   - Additional failure modes include invalid repo URL, missing/expired token, branch-write timeout, branch exists, file write failure, and rate-cap mutation block.

9. Preview deploy
   - `src/lib/agents/renewal/orchestrator.js:4292-4303`: universal mode skips preview deploy because it is evaluation-only.
   - `src/lib/agents/renewal/orchestrator.js:4409-4428`: PATH A skips preview deploy if Vercel credential/project mapping is unavailable.
   - `src/lib/agents/renewal/orchestrator.js:4437-4451`: rate-cap mutation guard can block deploy.
   - `src/lib/agents/renewal/orchestrator.js:4462-4497`: PATH A Vercel deploy can timeout or fail.

10. Post-deploy and PR gates
   - `src/lib/agents/renewal/orchestrator.js:4929-4962` runs transformation/regression evidence when post-fix snapshots exist.
   - `src/lib/agents/renewal/orchestrator.js:5045-5086` blocks regressing fixes.
   - `src/lib/agents/renewal/orchestrator.js:5279-5293` skips PR creation on regression.
   - `src/lib/agents/renewal/orchestrator.js:5294-5315` skips PR creation unless operator approval is explicit.

## Conditions Required To Pass To Branch Creation

All of the following must be true before branch creation can happen:

- The run must not be universal evaluation-only mode.
- The target product must resolve to a registered PATH A repo with a parseable GitHub repo URL.
- GitHub operator repo probe/token path must be valid for the active upgrade repo.
- At least one prioritized issue must map to an app-layer file, not a platform/Base44/auth boundary file.
- The selected file must not import a platform SDK at top level in a way that makes app-layer mutation unsafe.
- If LLM repair is needed, `FLOWAI_ENABLE_LLM_FIXES=true` or equivalent dependency override must be active.
- The issue must not require deterministic repair first.
- The source path must pass `isForbiddenLlmSourcePath`.
- The LLM or deterministic candidate must pass candidate validation, secret guard, package/import guard, route-rewrite guard, diff-preserve guard, and content replacement checks.
- Repair integrity must accept at least one generated file.
- Pre-deploy parse check must accept at least one generated file.
- Rate cap must allow mutation.
- Branch creation and file commit must complete within timeout.

## Does `FLOWAI_ENABLE_LLM_FIXES=true` Satisfy All Gates?

No. It satisfies only the LLM availability condition at `src/lib/agents/renewal/orchestrator.js:3351` and avoids `LLM_FIX_FEATURE_DISABLED` at `src/lib/agents/renewal/orchestrator.js:3446-3448`.

It does not:

- Reclassify `src/api/base44Client.js`.
- Allow platform/Base44/auth internals to be patched.
- Override universal-mode evaluation-only limits.
- Override deterministic-first policy.
- Override forbidden-path validation.
- Override repair integrity.
- Override parse checking.
- Create GitHub/Vercel credentials.
- Create operator approval for PRs.
- Move SSOT or VERIFIED claims.

## Dispatch Implication

The next CB dispatch should not ask CB to "turn on LLM fixes" as the fix. LLM fixes are necessary for some app-layer repairs, but insufficient for this boundary.

CB needs a full-chain assignment:

- Preserve platform/Base44/auth mutation refusal.
- Improve source mapping/prioritization so public UX findings route to safe app-layer files where evidence supports that route.
- If the true finding is platform-owned, persist it as governance/manual platform work and terminate cleanly.
- Add tests proving `FLOWAI_ENABLE_LLM_FIXES=true` does not override platform-boundary refusal.
- Add tests proving safe app-layer findings can still proceed to branch creation when all downstream gates pass.
- Keep ProductSSOT evidence labels honest and avoid VERIFIED movement.
