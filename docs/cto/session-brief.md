# CTO Session Brief

Date: 2026-06-14 UTC
Owner: CTO
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`
VERIFIED movement: no
matrixArtifact edited: no

## Executive Summary

FlowAI has now produced two CT2-confirmed public deployed URLs across the Flow Hub proof strategy:

- Path 1 Migration: `https://saige-v2.vercel.app`.
- Path 3 Fresh Build: `https://flowai-fresh-public-veusite.vercel.app`.

The Path 3 result is the strongest proof so far: FlowAI generated a 342-file platform-free VEU AI Studio site, created a GitHub branch, deployed it to a dedicated public Vercel project, scored baseline `93` to final `100`, and CT2 opened the public URL anonymously without a bypass header. The remaining highest-value gap is Path 2 Production producing its own deployed URL from an app-layer-owned product.

No VERIFIED movement has been applied. The batch packet is prepared and now needs W04/CEO exact row authorization before any `matrixArtifact` edit. The stale batch-packet filename now points to the current acceleration packet so there is only one active promotion packet.

Path 2 was rerun after the Fresh Build milestone. SAIGE v2 ended with an honest no-mutation result because it scored `98`; RelTwin is the better below-target candidate but currently blocks on GitHub token acquisition and unsafe upgrade-target resolution. A runtime fix branch for that chain is now pushed for CD/CR review.

## Current Production

- FlowAI production: `https://flowai-dun.vercel.app`.
- Last production identity verified after the packet refresh: `7bc95bb36a573cc94528d08c09d9de6aac9d2d01`.
- `/api/health` reports branch `main`, `clerkReady:true`, GitHub ready, Inngest ready, and Codex orchestra member PASS.
- `main` is now ahead at docs-only commit `77fa518fee1960bfe0e804d11db3da1e7404ec11`; production runtime is therefore behind only by a docs coordination commit. Do not use `77fa518` as runtime evidence until production is redeployed/promoted to that SHA.

## Completed Evidence

Path 1 Migration URL:

- CT2-confirmed public URL: `https://saige-v2.vercel.app`.
- Evidence: `docs/cto/ct2-saige-production-acceptance-2026-06-13.md`.
- Boundary: this proves a public URL, not complete SAIGE cleanup or typecheck perfection.

Path 3 Fresh Build public URL:

- Run ID: `cto-path3-veusite-publictarget-20260614-1253`.
- Public URL: `https://flowai-fresh-public-veusite.vercel.app`.
- Dedicated Vercel project: `flowai-fresh-public-veusite`.
- Generated branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-publictarget-20260614-1253`.
- Generated commit: `95512be0cf898251ad2b12301ae8043690b6852e`.
- File count: `342`.
- Runtime score: baseline `93`, final `100`, delta `+7`.
- Runtime preview probe: HTTP `200`, `PREVIEW_BROWSER_CLEAR`, `bypassAttempted:false`.
- CT2 verdict: `PASS-WITH-FINDINGS`.
- CT2 finding: sampled nav links go to `victorudo.com`; same-origin generated-route handling remains polish/follow-up.
- Evidence: `docs/cto/path3-fresh-build-veusite-publictarget-result-20260614.md`.
- CT2 evidence: `docs/cto/ct2-path3-publictarget-acceptance-result-20260614.md`.

Four-axis evidence:

- Structural Layer, Operational Mode, Analysis Depth, and Flow Hub Path are visible and independently selectable.
- CT2 confirmed request propagation and run-log axis envelope on live production.
- Evidence: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md` and `docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`.
- Boundary: Analysis Depth crawl-budget delta still needs a separate measured proof if that exact claim is promoted.

Clerk ticket/session evidence:

- FlowAI-owned `/sign-in-token` ticket flow lands on `/flow-hub/production`, scrubs the ticket, establishes a signed-in Clerk app session, and app-origin `/api/me` returns authenticated Clerk state.
- Fresh no-session `/api/me` remains anonymous/open while `AUTH_REQUIRED=false`.
- Evidence: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md` and `docs/cto/ct2-clerk-ticket-redirect-live-rerun-result-20260614.md`.
- Boundary: this does not prove `AUTH_REQUIRED=true`, paid-user onboarding, or organization enforcement.

TIM Build Codex visibility:

- CT2/CB2 observed Codex ranked first in the Build step candidate list.
- Boundary: live Step 3 invocation of Codex is not yet proven.

Path 2 Production reruns:

- SAIGE v2 run `cto-path2-saige-v2-rerun-20260614-1336` scored `98` and ended with `HONEST_GATE_REFUSAL_ALREADY_PASSING`; no branch or preview URL was expected.
- RelTwin run `cto-path2-reltwin-20260614-1337` scored `71.5` but failed before branch creation with `GITHUB_AUTH_FAILED`.
- RelTwin evidence also showed original and upgrade repo resolving to the same repo while `originalReadOnly:true`, so Production mode must not write until the upgrade target chain is made safe.
- Evidence: `docs/cto/path2-production-rerun-result-20260614.md`.
- CB dispatch: `docs/cto/cb-path2-production-token-and-upgrade-target-dispatch-20260614.md`.

Path 2 token/upgrade-target patch:

- Branch: `fix/path2-production-token-upgrade-target`.
- Commit: `5a66bee` (`fix/forge | harden path2 token and upgrade target gates`).
- Review prompts: `docs/cto/cd-review-path2-token-upgrade-target-20260614.md` and `docs/cto/cr-review-path2-token-upgrade-target-20260614.md` on that branch.
- Evidence: `docs/cto/path2-token-upgrade-target-fix-evidence-20260614.md` on that branch.
- Focused verification: `139/139` resolver + orchestrator tests PASS.
- Static checks: lane discipline PASS; SSOT traceability PASS.
- Full `npm run preflight`: stopped on existing/external smoke failure `tests/smoke/api-health.test.js > POST /api/test-claude`, expected `200` but received `500`; lint/build and 3732 tests passed before that single failure.

## Current Packets

- Batch VERIFIED packet: `docs/cto/verified-promotion-packet-acceleration-20260614.md`.
- Legacy batch filename now points to the acceleration packet: `docs/cto/verified-promotion-packet-batch-20260614.md`.
- Exact row mapping proposal: `docs/cto/verified-promotion-row-mapping-proposal-20260614.md`.

No matrixArtifact edit has been made. W04/CEO must authorize exact row movement before promotion.

## Known Gaps

- Path 2 Production has no CT2-confirmed deployed URL.
- Path 2 RelTwin is blocked by GitHub token fallback and upgrade-target safety.
- Full 8-step forge completion is not proven.
- Codex live Build invocation is not proven.
- `/api/test-claude` live smoke returns HTTP 500 and blocks full `npm run preflight` for otherwise scoped passing branches.
- Path 4 three-URL synthesis requires W04/CEO approval of the selected URLs and product direction before execution.

## Next Starting Point

1. Submit the row-mapping proposal to W04/CEO with the acceleration packet.
2. Await CD/CR review on `fix/path2-production-token-upgrade-target`; if PASS, merge and redeploy/promote production.
3. Rerun RelTwin Path 2 after the token/upgrade-target fix lands.
4. Resolve or formally quarantine the `/api/test-claude` smoke boundary so full preflight no longer obscures branch health.
5. Keep accumulating CT2-confirmed evidence, but do not move VERIFIED until W04/CEO authorizes the exact rows.

Victor action required:

- W04/CEO authorization for exact VERIFIED row mapping.
- Path 4 three-URL synthesis approval.
- Canonical doc changes, if W04/CEO chooses to add new canonical surface rows instead of only updating matrixArtifact evidence state.
