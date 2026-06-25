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
  - Recovered external research evidence is scored under coverage `research_recovery_external_evidence`, not `crawl_only_early_baseline`.
  - Recovered evidence is not marked degraded unless the underlying score envelope is degraded.

## Code-Level Proof

Syntax:

- `node --check src\lib\forge\researchRecoveryAdapters.js` PASS
- `node --check src\lib\orchestra\perplexity.js` PASS
- `node --check src\lib\agents\renewal\orchestrator.js` PASS

Focused tests:

- `npx vitest run tests\forge\rankedToolFailover.test.js tests\forge\researchStep.test.js tests\agents\renewal\orchestrator.test.js`
- Result: 3 files PASS, 167 tests PASS.

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

## Not Yet Proven

This packet does not prove the deployed production route.

Required live proof:

1. Deploy this branch.
2. Confirm `/api/version` reports the deployed branch commit.
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

No claim moves from this implementation packet alone.

Eligible only after live CT2 proof:

`RESEARCH RECOVERY FAILOVER DEMONSTRATED (Production Research path, forced timeout -> alternate ranked tool -> usable evidence -> honest scoring)`

Claims still not earned:

- Creator
- Upgrader
- Universal Engine
- Build failover
- VERIFIED matrix movement
