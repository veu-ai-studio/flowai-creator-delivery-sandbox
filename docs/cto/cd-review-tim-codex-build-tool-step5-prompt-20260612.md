# CD Review Prompt - TIM Codex Build Tool Step 5

FROM: CTO
TO: CD
ACTION: Step 5 architecture/SSOT review

Review branch:

- Branch: `origin/fix/tim-codex-build-tool`
- Head: `a6b82e5c893fac1491b2c25611a680bd1ca0bed8`
- Runtime base: `b4e02c566378e5f00b17252f9db176e20f9e7d42`
- Current `origin/main`: `2fa932d3d753ced3e1bb36b61b3a11f3cbd7da45` docs-only after the runtime base

Context:

W04 directed that Codex must be added to the Tool Intelligence Marketplace as the rank-1 Step 3 Build tool. The implementation is intentionally narrow: Codex is ranked first and callable through a server-side OpenAI API adapter when `OPENAI_API_KEY` is present. The adapter returns code-patch and generate-from-scratch artifacts only; surrounding forge machinery still owns file application, branch, tests, deploy, and governance.

Please review for:

1. Consistency with `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, and `docs/IMPLEMENTATION_PLAN.md`.
2. Whether the branch preserves the claim boundary: ranked/callable Codex adapter, not a fabricated full repo-agent claim.
3. Whether the Supabase migration is appropriate: seven Build ranks only, other steps remain ranks 1..5.
4. Whether Build runner dispatch chooses the selected Build member and fails honestly on missing credentials or wrong-member fallback.
5. Whether no VERIFIED movement, no matrixArtifact movement, and no canonical SSOT edit occurred.

Known verification:

- `npx vitest run tests/ui/toolStepCardVisibility.test.js tests/tools/ToolIntelligenceService.test.js tests/tools/toolDispatchContract.test.js tests/forge/toolSelection.test.js tests/forge/buildStep.test.js tests/orchestra/dispatch.test.js tests/renewal/orchestra.test.js tests/api-health-handler.test.js` PASS: 8 files, 136 tests.
- `node --check src\lib\orchestra\codex.js` PASS.
- `node --check src\lib\tools\buildToolRanking.js` PASS.
- `git diff --check` PASS with Windows line-ending warnings only.
- `npm run build:preflight` PASS.

Return PASS or BLOCK with file/line evidence.
