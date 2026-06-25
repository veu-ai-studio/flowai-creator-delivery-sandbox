# Research Recovery Failover Implementation Evidence - 2026-06-25

## Scope

Milestone: Research Recovery Failover as reusable dispatch spine.

Claim ceiling at this stage: code/test-level implementation only. No production claim moves until CT2 verifies a deployed production run.

Target claim after live proof only:

`RESEARCH RECOVERY FAILOVER DEMONSTRATED (Production Research path, forced timeout -> alternate ranked tool -> usable evidence -> honest scoring)`

## Credential Preflight

Direct credential checks found no direct Tavily, Exa, or Perplexity key in the local execution environment.

Doppler `flowai/prd` name check found `OPENROUTER_API_KEY`.

Implementation decision: admit `Perplexity AI` as a read-only Research recovery member through OpenRouter, requiring `OPENROUTER_API_KEY`. Tavily and Exa are not silently faked or marked callable.

## Implementation

Files changed:

- `src/lib/orchestra/perplexity.js`
  - New wired read-only Orchestra member: `perplexity`.
  - Capabilities: `crawl`, `analyze`.
  - Uses OpenRouter model `perplexity/sonar` by default.
  - Requires `OPENROUTER_API_KEY`.

- `src/lib/forge/researchRecoveryAdapters.js`
  - New reusable adapter layer.
  - `invoke` remains member-specific; normalization converts external research JSON into an Agent21-style crawl report.
  - The canonical `conductStructuredCrawl` adapter still performs the final scorer-facing mapping.

- `src/lib/tools/toolDispatchContract.js`
  - `perplexity` credential requirement changed to `OPENROUTER_API_KEY`.

- `src/lib/orchestra/index.js`
  - Registered `perplexity` as an admitted wired member.

- `src/lib/agents/renewal/crawlOutputAdapter.js`
  - Preserves recovery metadata: `evidenceRecovered`, `evidenceRecoveryKind`, `evidenceSource`, `recoveryFindings`.

- `src/lib/agents/renewal/gtmReadinessScorer.js`
  - Surfaces `evidenceDegraded` explicitly in scoring output.

- `src/lib/agents/renewal/orchestrator.js`
  - Production Research crawl candidates now execute browser crawl members first, then `Perplexity Research Recovery`.
  - Forced proof hang now reaches the actual STEP 3 structured crawl seam, not only the pre-walk proof seam.
  - Forced-hang proof timeout applies only to the first browser crawl attempt; recovery candidates keep the normal bounded structured-crawl timeout.
  - Recovered external research evidence is scored under coverage `research_recovery_external_evidence`, not `crawl_only_early_baseline`.
  - Recovered evidence is not marked degraded unless the underlying score envelope is degraded.

- `src/lib/forge/rankedToolFailover.js`
  - Added per-candidate timeout selection so a deliberately short hang detector does not starve slower recovery tools.

## Code-Level Proof

Syntax:

- `node --check src\lib\forge\researchRecoveryAdapters.js` PASS
- `node --check src\lib\orchestra\perplexity.js` PASS
- `node --check src\lib\agents\renewal\orchestrator.js` PASS

Focused tests:

- `npx vitest run tests\forge\rankedToolFailover.test.js tests\forge\researchStep.test.js tests\agents\renewal\orchestrator.test.js`
- Result: 3 files PASS, 167 tests PASS.

Focused timeout-correction tests:

- `node --check src\lib\forge\rankedToolFailover.js` PASS.
- `node --check src\lib\agents\renewal\orchestrator.js` PASS.
- `npx vitest run tests\forge\rankedToolFailover.test.js tests\agents\renewal\orchestrator.test.js`
- Result: 2 files PASS, 144 tests PASS.

Adjacent registry/selection tests:

- `npx vitest run tests\renewal\orchestra.test.js tests\tools\ToolIntelligenceService.test.js tests\forge\toolSelection.test.js`
- Result: 3 files PASS, 80 tests PASS.

Evidence lint:

- `npm run lint:evidence` PASS.

Preflight:

- `npm run build:preflight` PASS.

## New Guard Test

Added unit proof:

`production STEP 3 recovers from a hung browser crawl through external research evidence and scores non-degraded`

The test proves:

- Browser Research member times out.
- Playwright fails.
- Perplexity/OpenRouter recovery succeeds.
- Recovery output passes through the canonical crawl adapter.
- Scorer receives `coverage: research_recovery_external_evidence`.
- `coverageDegraded === false`.
- `evidenceDegraded === false`.
- Coverage is not `crawl_only_early_baseline`.

Added timeout-regression proof:

`can use a short forced-hang timeout without starving the recovery candidate`

The test proves:

- Browserless receives the short forced-hang timeout.
- Browserless times out.
- Perplexity receives a longer recovery timeout.
- Perplexity succeeds instead of being starved by the proof timeout.

## Deployed Preview Attempt

Preview identity gate:

- URL: `https://flowai-c7vfb448e-veu-ai-studio.vercel.app`
- `/api/version` reported commit `98019ccca015fe4bd1d86f36b5fa93f1c441c2bb`.
- Branch: `feature/research-recovery-failover`.
- Environment: `preview`.

Live forced-hang run:

- `runId`: `research-recovery-live-20260625-98019cc`
- Raw SSE evidence: `docs/cto/research-recovery-live-preview-20260625T135006Z.sse`
- HTTP status: `200`.
- Browserless selected, then timed out after `5000ms`.
- Playwright was attempted.
- Perplexity Research Recovery was attempted with `OPENROUTER_API_KEY: PRESENT`.
- Run failed fast with `RESEARCH_EVIDENCE_UNAVAILABLE`.
- It did not hang.
- It did not continue into degraded empty-evidence scoring.
- It did not report `100`, `showcase-ready`, or `ALREADY_AT_TARGET`.

Finding from live attempt:

- The original implementation applied the proof's `5000ms` timeout to every candidate.
- That correctly proved fail-fast/no-false-100, but it starved the external recovery adapter.
- The current patch changes this so only the forced first browser attempt uses the short proof timeout; recovery candidates use the normal bounded structured-crawl timeout.

## Corrected Deployed Preview Proof

Preview identity gate:

- URL: `https://flowai-obgbk4db6-veu-ai-studio.vercel.app`
- `/api/version` reported commit `20732e04553f24ecdf558386b2049903b5dce6c4`.
- Branch: `feature/research-recovery-failover`.
- Environment: `preview`.

Live forced-hang run:

- `runId`: `research-recovery-live-20260625-20732e0`
- Raw SSE evidence: `docs/cto/research-recovery-live-preview-20260625T140330Z.sse`
- HTTP status: `200`.
- Browserless selected, then timed out after `5000ms`.
- Playwright was selected, then failed because it produced no usable crawl evidence.
- Perplexity Research Recovery was selected with `OPENROUTER_API_KEY: PRESENT`.
- Perplexity succeeded.
- STEP 3 completed with:
  - `kind: production_research_crawl_failover.v1`
  - `selectedDispatchMemberId: perplexity`
  - `evidenceRecovered: true`
  - `evidenceRecoveryKind: external_research_to_crawl_report`
  - `recoveryFindings: 2`
- STEP 5 early scorer consumed `coverage: research_recovery_external_evidence`.
- STEP 5 early scorer recorded `coverageDegraded: false` and `evidenceDegraded: false`.
- Final run completed without `RESEARCH_EVIDENCE_UNAVAILABLE`.
- Final run did not fire `ALREADY_AT_TARGET`.
- Final score: `66`.
- Effective trust score: `39.6`.
- `gtmReady: false`.
- Exit reason: `PLATFORM_BOUNDARY_BLOCKED`.

This proves deployed-preview Research recovery, not production/main.

## Not Yet Proven

This packet does not prove the production/main route or independent CT2 verification.

Required production proof:

1. Merge/promote this branch after non-builder review.
2. Confirm production `/api/version` reports the merge commit.
3. Run production `POST /api/run-construction` on `https://victorudo.com`.
4. Force the Research browser tool to hang.
5. Confirm visible attempt history:
   - browser tool selected
   - timeout fired
   - next browser/research candidate attempted
   - Perplexity/OpenRouter recovery succeeded or the run failed fast visibly
6. Confirm scoring consumes recovered evidence:
   - `coverageDegraded === false`
   - `evidenceDegraded === false`
   - `coverage !== crawl_only_early_baseline`
7. CT2 verifies from browser/SSE evidence.

## Claim Movement

No production claim moves from this implementation packet alone.

Eligible only after production CT2 proof:

`RESEARCH RECOVERY FAILOVER DEMONSTRATED (Production Research path, forced timeout -> alternate ranked tool -> usable evidence -> honest scoring)`

Current evidence supports the narrower pre-review statement:

`RESEARCH RECOVERY FAILOVER PREVIEW-DEMONSTRATED (deployed preview, forced timeout -> Perplexity recovery -> honest non-target final scoring)`

Claims still not earned:

- Creator
- Upgrader
- Universal Engine
- Build failover
- VERIFIED matrix movement
