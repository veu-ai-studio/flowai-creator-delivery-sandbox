# CD Review Result - Path 2 Boundary Chain Step 5

Date: 2026-06-12
Reviewer: CD
Supervisor: CTO
Branch reviewed: `fix/path2-platform-boundary-chain`
Commit reviewed: `4290b39312e69087be8cd3a09bb3a68efef4802a`
Verdict: PASS-WITH-FINDINGS
VERIFIED movement: no

## Summary

CD found no BLOCK condition. The patch is consistent with the canonical SSOT and Build Protocol, preserves the Base44/platform/auth boundary, separates observed URL evidence from fallback/run context, introduces no fabricated branch/deploy/preview/VERIFIED claims, and leaves ProductSSOT/governance honesty intact.

CD explicitly confirmed that a live Path 2 proof rerun is still required after merge/deploy before any VERIFIED movement is authorized.

## Findings

### 1. SSOT and Build Protocol consistency

PASS. The patch is scoped to source-mapping and URL-evidence plumbing. It does not change deployment logic, scoring, governance entry generation, product policy, or SSOT fields. The `mapFindingsToSource` to `sourcePathForFinding` to orchestrator fix-loop chain is internally consistent and does not widen authority beyond `recommend_only`.

### 2. Platform boundary preservation

PASS. The `classifyFileBoundary` check in `sourceMappedFixGenerator.js` is unchanged. `PLATFORM_BOUNDARY_BLOCKED` and `HUMAN_REVIEW_REQUIRED` paths still terminate with a non-actionable proposal before any `proposedFix` is emitted. The new `activeTargetUrl` and `observedHostnames` parameters operate on URL evidence only; they do not bypass the boundary classifier.

### 3. Observed URL evidence versus fallback/run context

PASS. CD identified this as the core repair.

Before the patch, source mapping treated `finding.location ?? finding.url ?? null` as location and route-token extraction treated `url` like observed evidence. That allowed a source/registry/fallback URL such as `saigeplatform.com` to become route evidence while the active evaluation target was `saige-v2.vercel.app`.

After the patch:

- `observedLocationForFinding` uses explicit observed URL fields or `url` only when marked observed.
- `routeTokensFromFinding` uses the same observed-field gate.
- Active-target host filtering rejects URL evidence from non-matching hosts at the orchestrator call sites.

CD found the new source-mapper tests precisely targeted for the negative fallback URL case and the positive observed `saige-v2` location case.

### 4. README fallback removal

PASS. CD accepted replacing the previous `README.md` default with null-guarding and a `SOURCE_MAPPING_REQUIRED` rejection. No source-mapped file now means no fix attempt, and the rejection is explicit and auditable.

### 5. No fabricated delivery/VERIFIED claims

PASS. The diff introduces no writes to `previewUrl`, `upgradedUrl`, `upgradeDeployed`, `upgradeDeployStatus`, or any VERIFIED field. Deployment logic is untouched.

### 6. Live Path 2 proof requirement

CONFIRMED. CD classified the current evidence as mocked-test evidence only. A live orchestration run with real evaluation target, source mapping, and observed findings must still be run after merge/deploy before VERIFIED movement.

## Non-Blocking Findings

1. Triple duplication of observed URL field logic:
   - `OBSERVED_URL_FIELDS` / URL-observed predicate logic now exists in `registeredRepoSourceMapper.js`, `sourceMappedFixGenerator.js`, and `orchestrator.js`.
   - Current behavior is correct, but future divergence is a maintenance risk.
   - Recommendation: extract to a shared source-mapping utility in follow-up.

2. Semantic looseness in `pageUrl: it.pageUrl || it.location || null`:
   - If `location` is a selector rather than a URL, it may be copied into `pageUrl` and later rejected as non-URL.
   - This does not inflate evidence, but it is loose.

3. `upgradeTargets.upgradeUrl` as third active-target fallback:
   - Pattern: `currentUrl ?? initialUrl ?? upgradeTargets.upgradeUrl ?? null`.
   - If both current and initial URL are null, the registered upgrade URL becomes active target.
   - This restricts evidence to a single host rather than opening all hosts, so CD did not block, but recommended tracking.

## Verdict

PASS-WITH-FINDINGS.

Merge is acceptable from CD perspective after CR review, with live Path 2 proof still required after merge/deploy. No VERIFIED movement is authorized.
