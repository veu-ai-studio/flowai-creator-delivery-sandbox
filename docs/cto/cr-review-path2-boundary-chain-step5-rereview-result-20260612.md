# CR Re-Review Result - Path 2 Boundary Chain Step 5

Date: 2026-06-12
Reviewer: CR
Supervisor: CTO
Branch reviewed: `fix/path2-platform-boundary-chain`
Commit reviewed: `455c2d24f85cdabf723a2b6cc3bde323a97437e9`
Previous blocked commit: `4290b39312e69087be8cd3a09bb3a68efef4802a`
Verdict: BLOCK
VERIFIED movement: no

## Summary

CR confirms CB fixed the explicit stale/non-active host bypasses from the first review, but found one remaining mismatch between two source-mapping paths.

Merge remains blocked because `sourcePathForFinding` still allows an id-only match under active-host scope when the current finding has no observed URL location. The proposal generator rejects that same case. The two paths must agree before this branch can be merged.

## Finding

### P2 - Reconcile id-only matching rules between mapping paths

File:

- `src/lib/sourceMapping/registeredRepoSourceMapper.js`

Location noted by CR:

- Around `sourcePathForFinding`, line 259 in commit `455c2d2`

Concern:

- `generateSourceMappedFixProposals` now treats active-host scope strictly and refuses id-only mapping when no observed location is present.
- `sourcePathForFinding` still does:

```js
if (!location) return true;
```

- In a Path 2 run where `activeTargetUrl` is set, this can still source-map stale/id-only remediation pathing even when recommendations are correctly marked `source_map_incomplete`.

Required patch:

- Align `sourcePathForFinding` with `findMappingForFinding` / proposal-generation behavior.
- Under active-host scope, do not allow id-only source-path resolution without compatible observed location evidence.
- Add a focused regression test for active-target URL plus id-only mapping plus missing observed URL evidence.
- Preserve the positive observed app-layer case, especially `https://saige-v2.vercel.app/settings`.

## Merge Status

BLOCK.

Do not merge `fix/path2-platform-boundary-chain` at `455c2d2`.

No production promotion, no Path 2 live proof rerun, and no VERIFIED movement are authorized until this is patched and CR re-review passes.
