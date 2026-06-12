# CB Dispatch - Path 2 Platform Boundary Chain

Date: 2026-06-12
From: CTO
To: CB
Priority: high
Branch to build: `fix/path2-platform-boundary-chain`
Base: current `origin/main`

## Read First

Read these before editing:

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/platform-boundary-chain-analysis.md`
5. `docs/cto/path2-saige-v2-production-proof-20260612.md`
6. `docs/cto/path1-saige-migration-phase3-dod-20260612.md`

Canonical authority remains the three governing documents. This dispatch is an implementation packet, not a canonical amendment.

## Problem

Path 2 was expected to avoid the original SAIGE platform boundary by targeting the migrated app-layer URL:

- Target URL: `https://saige-v2.vercel.app`
- Product scope: `saige`
- Run ID: `cto-path2-saige-v2-20260612-0450`

The live run did not create a branch or preview. It terminated cleanly with:

- Exit reason: `PLATFORM_BOUNDARY_BLOCKED`
- Final score: `54.5`
- Branch: none
- Delivery URL: none
- ProductSSOT persistence: observed
- Final governance write: observed

This means the blocker is not simply "LLM fixes disabled" and not simply "use the migrated URL." The full evidence-to-branch chain still routes the run into the platform-boundary refusal before commit-ready file changes exist.

## Engineering Goal

Make Path 2 capable of reaching branch creation for safe app-layer SAIGE findings on the migrated `saige-v2` codebase while preserving all platform/auth/Base44 refusal rules.

Do not weaken the boundary. Make the boundary more precise.

## Required Diagnosis

Before changing code, map the current run chain in comments or notes:

1. Which input URL is used for crawl evidence?
2. Which URL is used as fallback run context?
3. Which URL is the registered upgrade URL?
4. Which repo/branch is used for source mapping?
5. Which finding fields are treated as observed evidence?
6. Which finding fields are context only?
7. Where does the file path become `src/api/base44Client.js` or another forbidden path?
8. Which gate produces the final `PLATFORM_BOUNDARY_BLOCKED` for the Path 2 proof?

Use the existing anchors in `docs/cto/platform-boundary-chain-analysis.md`.

## Build Requirements

Patch the smallest code path that satisfies all of the following:

1. Keep fallback/run context separate from true observed finding URL evidence through source mapping, prioritization, LLM prompt construction, and governance output.
2. Ensure the migrated upgrade URL/repo can be used as the app-layer source target when the run is Path A known product and the active target is `saige-v2`.
3. Do not allow `src/api/base44Client.js`, Base44 internals, auth internals, framework files, secrets, package installs, or route rewrites to be patched unless existing gates already permit it.
4. If the only defensible mapped target is forbidden, continue to terminate as `PLATFORM_BOUNDARY_BLOCKED` with no branch/deploy claim.
5. If at least one independently observed app-layer finding maps to a safe file and passes all downstream gates, allow branch creation to proceed.
6. Preserve repair-integrity, parse, diff-preserve, platform-boundary, secret, package, branch, deploy, governance, and ProductSSOT gates.
7. Do not move VERIFIED or matrix artifacts.

## Likely Code Areas

Start here, but follow the code:

- `src/lib/agents/renewal/orchestrator.js`
- `src/lib/sourceMapping/registeredRepoSourceMapper.js`
- `src/lib/sourceMapping/sourceMappedFixGenerator.js`
- `src/lib/sourceMapping/classifyFileBoundary.js`
- `src/lib/agents/renewal/llmFixSafeguards.js`
- Existing orchestrator/source-mapping tests

Important anchors:

- Source-mapped recommendations: `orchestrator.js` around source mapping/proposal generation.
- Prioritization boundary: `orchestrator.js` where `filterPlatformBoundaryFindings(prioritizedIssues)` appends `stage: 'prioritization'`.
- LLM pre-call guard: `orchestrator.js` where `isForbiddenLlmSourcePath(filePath)` appends `stage: 'llm_pre_call_guard'`.
- No-fix exit: `orchestrator.js` where `fileChanges.length === 0` converts platform-boundary state into `exitReason = 'PLATFORM_BOUNDARY_BLOCKED'`.
- Branch creation: `orchestrator.js` where `_createRenewalBranch` first runs after at least one file survives all gates.

## Tests Required

Add or update focused tests proving:

1. Fallback run URL context is not promoted to observed finding evidence.
2. `FLOWAI_ENABLE_LLM_FIXES=true` does not override platform-boundary refusal.
3. A forbidden Base44/platform/auth path still blocks with no branch and no deploy claim.
4. A safe app-layer mapped finding on `saige-v2` can survive to the branch-creation boundary when downstream dependencies are mocked as passing.
5. The final payload remains honest when no branch/deploy is produced: `previewUrl:null`, `upgradeDeployed:false`, blocked/deferred status, no fabricated delivery URL.

## Verification Required

Run focused tests first. If focused tests pass, run the repo preflight appropriate for this scope.

Report:

- Files changed
- Tests run and results
- Exact gate fixed
- Whether branch creation is now reachable in mocked safe-app-layer conditions
- Whether the real Path 2 live proof still needs to be rerun

## Pause Conditions

Pause only if:

- A canonical amendment appears required.
- The only way to make Path 2 branch is to weaken platform/auth/Base44 boundaries.
- Credentials or network access prevent tests from running.
- The implementation would require broad ForgeRunState phase-split work.

Do not pause for routine commands. Do not wait for Victor or W04 on routine work. CTO owns this dispatch.
