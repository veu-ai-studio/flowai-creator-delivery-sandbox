# CR Review Result - TIM Codex Build Tool Step 5

Date: 2026-06-12
Reviewer lane: CR
Reviewed branch: `origin/fix/tim-codex-build-tool`
Initial reviewed head: `a6b82e5c893fac1491b2c25611a680bd1ca0bed8`
Patched reviewed head: `121c98cbdf489dcdfb3e673087013b5c8f5042d0`
Final result: PASS

## Initial Result

CR initially returned BLOCK.

Blocking finding: migration `0032` inserted Codex-first rows by ranks already occupied by existing Build rows, then used `on conflict (step_name, rank)` to update static seed scores. That could overwrite observed production score fields maintained by `ToolIntelligenceService.recordUsage()`.

CR noted other attacked areas were good:

- Selected Codex is dispatched explicitly and fallback is rejected.
- Missing `OPENAI_API_KEY` stops Codex dispatch.
- Static UI says `server check pending`.
- Tool order is correct.
- Build-only rank 1..7 constraint is present.
- No canonical, VERIFIED, or matrixArtifact movement.

## Patch

Patch commit: `121c98cbdf489dcdfb3e673087013b5c8f5042d0`

Patch summary:

- Migration now snapshots existing Build rows by normalized `platform_name` before reorder.
- It deletes old Build rows by `step_name = 'build'`.
- It inserts canonical Build rows in the required order.
- It carries forward `performance_score`, `cost_score`, `speed_score`, `reliability_score`, and `last_updated` for matching platforms.
- It removes the previous rank-based `on conflict (step_name, rank)` update path.
- It adds `tests/tools/buildToolRankingMigration.test.js` to guard against this regression.

## Re-Review Result

CR returned PASS after the patch.

CR evidence:

- Existing rows are snapshotted by normalized `platform_name` before reorder in `supabase/migrations/0032_step_tool_rankings_build_codex.sql`.
- Score fields and `last_updated` are captured before deletion.
- Old Build rows are deleted by step only, avoiding the previous rank-conflict overwrite path.
- New insert joins canonical rows to prior rows on normalized platform name.
- The four score fields use `coalesce(e.<score>, c.<score>)`.
- Regression test checks the coalesces and asserts the old rank-conflict pattern is absent.

## Verification

CTO verification after patch:

- Focused TIM suite plus migration regression: PASS, 9 files / 137 tests.
- `node --check src\lib\orchestra\codex.js` PASS.
- `node --check src\lib\tools\buildToolRanking.js` PASS.
- `git diff --check` PASS with Windows line-ending warning only.
- `npm run build:preflight` PASS.

CR verification:

- `npx vitest run tests/tools/buildToolRankingMigration.test.js` PASS, 1 file / 1 test.

## Residual Evidence Boundary

No live Postgres/Supabase migration-apply proof was run. Current proof is code review plus focused SQL text regression coverage.

No VERIFIED movement. No matrixArtifact movement. No canonical SSOT file changed.
