# CB Path 3 Fresh Build Codegen Recovery Result - 2026-06-14

Branch: `fix/path3-fresh-build-codegen-recovery`
Implementation HEAD: `2dfc632e066067c5f87b2f2849089ac41e2c7f62`
Dispatch: `docs/cto/cb-path3-fresh-build-codegen-recovery-dispatch-20260614.md`
Canonical authority read at session start: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`
Live failure evidence read: `docs/cto/path3-fresh-build-veusite-proof-20260614.md`, `docs/cto/path3-fresh-build-veusite-proof-20260614/cto-path3-veusite-20260614-0615.sse`
VERIFIED movement: no

## Summary

Patched Fresh Build deterministic code generation and structured blocking without weakening `validateGeneratedCodebase`.

- Generated text now encodes delimiter-heavy crawled content before it enters JSX text, attributes, JSON route/link data, README, and generated HTML title surfaces.
- The exact live failure class is covered by a regression test that generates `src/components/ListListXlrmdf.jsx` from content with an unmatched `(` and proves the generated codebase validates cleanly.
- If safety validation still fails, `generateCodebase` returns a structured `BLOCKED` result with `failureStage:"codebase_generator"`, invalid file path, validation reason, and no files for deployment.
- `runFreshBuild` now returns an honest blocked Fresh Build result if generation returns or throws a safety validation block.
- The deployment adapter still validates generated code before GitHub write and blocks invalid code before any write/deploy call.
- No deploy URL, branch URL, PR URL, score, or VERIFIED claim is fabricated.

## Files Changed

- `src/lib/freshBuild/codebaseGenerator.js`
- `src/lib/freshBuild/freshBuildOrchestrator.js`
- `tests/freshBuild/codebaseGenerator.test.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- `tests/freshBuild/freshBuildOrchestrator.test.js`
- `docs/cto/cb-path3-fresh-build-codegen-recovery-result-20260614.md`

## Tests Run

```text
npx vitest run tests/freshBuild/codebaseGenerator.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js
npm run build:preflight
npm run lint
git diff --check
```

Results:

- Focused Fresh Build tests: PASS, 3 files / 33 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check`: PASS.

## Regression Coverage

The 2026-06-14 live failure is now covered by regression test:

- Test file: `tests/freshBuild/codebaseGenerator.test.js`
- Test: `covers the ListListXlrmdf unbalanced parenthesis regression with delimiter-safe generated JSX`
- Fixture class: component id/type produce `src/components/ListListXlrmdf.jsx`; content and product name contain unmatched `(`.
- Assertion: generated file contains delimiter-safe text, does not contain the raw unmatched text, and `validateGeneratedCodebase(codebase)` returns `{ ok: true, errors: [] }`.

Additional safety assertions:

- `validateGeneratedCodebase` still rejects a manually invalid `src/components/ListListXlrmdf.jsx` with `unbalanced ()`.
- `runFreshBuild` does not call `writeGeneratedCodebase` when code generation is blocked.
- The deployment adapter does not call GitHub write or Vercel deploy when generated code remains invalid.
- Blocked results keep `previewUrl:null` and `scoreStatus:"SCORE_NOT_ATTEMPTED"`.

## Live Proof Recommendation

Rerun the Path 3 Fresh Build live proof after CD/CR review, merge, deploy, and production identity confirmation.

Expected rerun target:

- Production URL: `https://flowai-dun.vercel.app`
- Endpoint: `POST /api/run-construction`
- Mode: `FRESH_BUILD`
- Input URL: `https://victorudo.com`
- Description: same VEU AI Studio website synthesis prompt used in `cto-path3-veusite-20260614-0615`.

PASS condition for this patch:

- Codebase generator no longer fails on `src/components/ListListXlrmdf.jsx has unbalanced ()`.
- If another invalid generated file appears, result is structured as blocked with no preview/deploy/score claim.
- Deployment/write is attempted only after generated code passes safety validation.

## Mandatory DoD Fields

Mocked tests used: yes
Unmocked runtime proof: N-A with reason - CB did not deploy or run the live Fresh Build proof; CT2/CTO should rerun after review/merge/deploy.
Production URL serving HEAD commit SHA verified: N-A with reason - no production deployment or promotion was performed from this branch.
Proof labels used: UNIT
Evidence tier claimed: B
Claim impact: PARTIAL->WIRED
VERIFIED movement: no

## Browser / Live Test Instructions

Automated gate:

```text
npx vitest run tests/freshBuild/codebaseGenerator.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js
```

Manual live proof after merge/deploy:

1. Confirm `https://flowai-dun.vercel.app/api/health` reports the promoted post-merge runtime commit.
2. Run the same Fresh Build request recorded in `docs/cto/path3-fresh-build-veusite-proof-20260614.md`.
3. Confirm SSE reaches codebase generation without the `ListListXlrmdf.jsx has unbalanced ()` failure.
4. Confirm any preview/deploy URL is reported only if deployment actually occurs and is browser-verifiable.
5. Confirm failure, if any, remains fail-closed with `previewUrl:null`, `deploymentId:null`, `prUrl:null`, and `scoreStatus:"SCORE_NOT_ATTEMPTED"` until deployment is real.

FAIL criteria:

- Safety validation is bypassed or weakened.
- Invalid generated files reach the deployment adapter.
- A preview/deploy/PR URL is claimed without a real write/deploy.
- The same `ListListXlrmdf.jsx has unbalanced ()` failure recurs.
- Any matrixArtifact or VERIFIED state is moved.
