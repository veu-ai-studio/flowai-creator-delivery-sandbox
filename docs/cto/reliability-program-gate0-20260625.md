# Reliability Program Gate 0 - Step Classification and Matrix Collapse

Date: 2026-06-25

Branch: feature/build-failover-production-proof

Purpose: make the FlowAI reliability rollout executable without discovering credential or matrix-shape gaps mid-build.

## Current Claim Baseline

- Research Recovery Failover is proven in production on runtime commit `bc7ca51`.
- Full 8-step reliability is not proven.
- Build failover is the next production proof target because Build has two callable code-generation members today: Codex and Claude Code.

## Step Classification and Credential List

| Forge step | Callable tools today | Reliability class | Missing credential decision | Notes |
| --- | --- | --- | --- | --- |
| Research | Browserless, Playwright, Perplexity | FAILOVER capable | None known for current proof path: `BROWSERLESS_API_KEY`, `OPENROUTER_API_KEY` already exercised in production | Done for recovery path: browser hang -> timeout -> Perplexity recovery -> honest score. |
| Design | Claude Code | FAIL-SAFE only today | Optional second design tool would require a new model adapter and credential; not needed before fail-safe sweep | Current work should ensure timeout -> visible fail-fast, never outer-window hang. |
| Build | Codex, Claude Code | FAILOVER capable | None known for Result 1 if `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are present in production | Result 1 proof forces Codex hang -> timeout -> Claude Code recovery through `/api/forge/build`. |
| Quality Audit | Claude Code | FAIL-SAFE only today | Optional second scoring/audit model would require a new adapter and credential; not needed before fail-safe sweep | Must not score empty/degraded evidence as ready. |
| Deploy | Vercel | FAIL-SAFE only today | `VERCEL_OPERATOR_TOKEN` or `VERCEL_TOKEN` required; already used by deploy-chain proofs | No second deploy provider exists today. Timeout/fail-fast must be visible. |
| Self-Renewal | Internal FlowAI runner + GitHub/Vercel primitives | FAIL-SAFE only today | GitHub mutation token and Vercel operator token remain required | Not a tool-failover step until an alternative execution substrate is admitted. |
| GTM | Internal/Claude Code content path | FAIL-SAFE only today | Optional second GTM model would require new adapter; not needed before fail-safe sweep | Must fail safe on missing evidence, not produce inflated readiness claims. |
| Monitor | Internal monitor text + available model/tool calls | FAIL-SAFE first; failover only after a second callable monitor tool is admitted | The live `MONITOR_TEXT_UNAVAILABLE` defect is the next single-tool fail-safe target | Current priority: timeout -> surfaced fail-fast, never indefinite pending or false score. |

## Victor Credential Sitting

No new Victor credential is required for Result 1 Build failover if production already has:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `VERCEL_OPERATOR_TOKEN` or `VERCEL_TOKEN`
- GitHub deploy sandbox write authority already used by M2/M3 deploy-chain work

If any are missing, the correct outcome is BLOCK with the exact missing credential. Do not substitute a builder, shell script, or local harness and relabel it as Build failover.

## Matrix Collapse Verification

Depth and path should remain parameters of the same reliability machinery:

- Analysis depth: `Quick`, `Standard`, `Deep` should only change timeout budgets, crawl breadth, scoring breadth, or evidence thresholds.
- Flow Hub path: `Production`, `Migration`, `Fresh Build` should only change input shape, source acquisition, and delivery target.
- Structural layer and operational mode should affect authorization and operator interaction, not fork the failover primitive.

STOP condition: if any matrix cell requires a separate failover implementation instead of invoking the same A1/A2/A3 adapter-contract-test pattern, stop and record `MATRIX_CELL_CUSTOM_FAILOVER_LOGIC_REQUIRED`.

## Result 1 Build Failover Bar

The production proof must enter through the deployed `/api/forge/build` endpoint and the real `runBuild` path.

Required live sequence:

1. Tool Intelligence returns the Build candidate ranking with Codex ahead of Claude Code.
2. The request enables proof-only `buildProofControls.forceHangOnce` for `code-patch` / `codex`.
3. Codex is selected and then hangs mid-dispatch.
4. The per-call timeout fires within the configured bound.
5. The failover loop dispatches the next callable ranked member, Claude Code.
6. Claude Code returns real `patchedContent`.
7. The output is committed to the approved deploy sandbox and deployed to a public URL.
8. Attempt history and response evidence show selected -> timeout -> failover -> succeeded.

Claim ceiling if successful:

`BUILD FAILOVER - IN PRODUCTION (codex -> claude-code, forced hang -> recover, honesty held).`

Non-claims:

- It does not prove Creator.
- It does not prove Upgrader.
- It does not prove Universal Engine.
- It does not prove all Build defects are repairable.
- It does not prove full 8-step reliability.

