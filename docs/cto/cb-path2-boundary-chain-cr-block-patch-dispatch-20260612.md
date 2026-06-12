# CB Dispatch - Patch CR Block on Path 2 Boundary Chain

Date: 2026-06-12
From: CTO
To: CB
Priority: immediate
Runtime branch: `fix/path2-platform-boundary-chain`
Blocked commit: `4290b39312e69087be8cd3a09bb3a68efef4802a`

## Required Reading

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/cb-path2-platform-boundary-chain-dispatch-20260612.md`
5. `docs/cto/path2-boundary-chain-step5-review-packet-20260612.md`
6. `docs/cto/cd-review-path2-boundary-chain-step5-result-20260612.md`
7. `docs/cto/cr-review-path2-boundary-chain-step5-result-20260612.md`

## Current Review State

CD: PASS-WITH-FINDINGS.

CR: BLOCK.

Do not merge the runtime branch until this block is patched and CR re-review passes.

## CR Block

CR found that active-host filtering is still partially bypassed by identifier-only matches.

### Finding 1

File:

- `src/lib/sourceMapping/registeredRepoSourceMapper.js`

Issue:

- `sourcePathForFinding` returns a mapping when `finding.id` matches, even if `observedLocationForFinding` filtered the finding out because the observed URL was not on the active target host.

Required fix:

- Make id-based source lookup host-aware.
- If active-host filtering removes observed location evidence for a finding that has URL-like evidence, do not allow a bare id match to resolve a source path.

### Finding 2

File:

- `src/lib/sourceMapping/sourceMappedFixGenerator.js`

Issue:

- `findMappingForFinding` can short-circuit on `finding.id` before validating location/host alignment.

Required fix:

- Make mapped proposal resolution host-aware.
- Do not generate recommendations from id-only mapping matches when observed URL evidence is absent or was filtered out by active-target host constraints.

## Implementation Guidance

Preserve the intent of the first patch:

- Fallback/run URL context must never become observed evidence.
- `url` must be observed evidence only when explicitly marked.
- Legitimate observed `saige-v2` app-layer findings must still map and reach branch creation in mocked tests.
- Platform/Base44/auth boundaries remain unchanged.
- No VERIFIED movement.

Prefer a shared helper if small and localized; avoid broad refactor.

## Tests Required

Add focused regression tests:

1. `sourcePathForFinding` must return `null` when a finding id matches an existing mapping but the current finding's URL evidence is from a non-active host.
2. `generateSourceMappedFixProposals` must not resolve a proposal by id when the finding's URL evidence is non-active-host context.
3. Existing positive case for observed `https://saige-v2.vercel.app/settings` still maps to `src/pages/Settings.jsx`.
4. Existing platform-boundary tests still pass.

Run at minimum:

```powershell
npx vitest run tests/sourceMapping/registeredRepoSourceMapper.test.js tests/sourceMapping/sourceMappedFixGenerator.test.js tests/agents/renewal/orchestrator.test.js
```

Run broader preflight if the patch touches orchestrator behavior beyond helper threading.

## Output

Push an updated commit to `fix/path2-platform-boundary-chain`.

Report:

- New commit SHA
- Files changed
- Tests run and result
- How each CR finding was fixed
- Whether CR re-review is ready

Do not touch canonical docs, matrixArtifact, VERIFIED state, env, or production deployment.
