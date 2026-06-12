# CR Review Result - Path 2 Boundary Chain Step 5

Date: 2026-06-12
Reviewer: CR
Supervisor: CTO
Branch reviewed: `fix/path2-platform-boundary-chain`
Commit reviewed: `4290b39312e69087be8cd3a09bb3a68efef4802a`
Verdict: BLOCK
VERIFIED movement: no

## Summary

CR found two P2 issues that directly weaken the intent of the Path 2 repair. The new active-host filtering can still be bypassed by identifier-only mapping matches, allowing stale or non-active findings to resolve to source mappings and produce repair-driven output despite URL scoping checks.

Merge is blocked until these findings are patched and re-reviewed.

## Findings

### P2 - Enforce host filter before id-based source lookup

File:

- `src/lib/sourceMapping/registeredRepoSourceMapper.js`

Concern:

- `sourcePathForFinding` can return a mapping immediately when `finding.id` matches.
- This happens even when `observedLocationForFinding` intentionally filtered out the finding location because it was on a non-active host.
- In mixed-source runs, a stale/non-active finding can still pick a previously mapped file path despite failing the new URL-scope check.
- That can target the wrong file for repair attempts.

Required patch:

- Make id-based mapping resolution host-aware.
- If active-host filtering removes observed location evidence, do not allow a bare id match to resurrect the mapping unless the mapping itself has compatible active-host evidence or no URL evidence is required by policy.
- Add a regression test for stale id match plus non-active host.

### P2 - Apply host-aware matching in mapped proposal resolution

File:

- `src/lib/sourceMapping/sourceMappedFixGenerator.js`

Concern:

- `findMappingForFinding` can short-circuit on `finding.id` before validating location/host alignment.
- Recommendations can still be generated from a mapping whose URL was intentionally ignored by the observed-host logic.
- This defeats active-host gating for recommendation output and can surface proposals for wrong target routes.

Required patch:

- Make `findMappingForFinding` reject id-only matches when the finding's observed URL evidence is absent or filtered out by active-target host constraints.
- Thread active-target/observed-host context into mapped proposal resolution if needed.
- Add regression coverage.

## Reviewer Output Excerpt

CR summary:

> The new active-host filtering is partially bypassed by identifier-only matches, so stale or non-active findings can still resolve to mappings and produce repair-driven outputs despite URL scoping checks, which undermines the commit's intent to prevent wrong-path-path2 mappings.

## Merge Status

BLOCK.

Do not merge `fix/path2-platform-boundary-chain` at `4290b39`.

No VERIFIED movement is authorized.
