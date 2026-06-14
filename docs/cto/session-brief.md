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

Path 2 was rerun after the Fresh Build milestone. SAIGE v2 ended with an honest no-mutation result because it scored `98`; RelTwin is the better below-target candidate. After Anthropic credits were restored, the constrained RelTwin Production proof passed pre-fix scoring and reached step 6, then blocked before branch creation on GitHub credential acquisition. Unsafe same-repo upgrade-target resolution is also visible behind that gate. A runtime fix branch for that chain is now pushed for CD/CR review.

W04 then identified the larger infrastructure gap: FlowAI cannot require preconfigured upgrade repos or Vercel projects for real users. CTO completed the requested diagnosis and pushed a Universal Delivery Workspace clearance packet. No build has been dispatched. The next architecture decision is whether W04 clears the FlowAI-owned workspace model for auto-created GitHub repos, committed code, Vercel projects/deployments, returned URLs, and ProductSSOT evidence. Until that is cleared, do not run more Production proofs that depend on manually preconfigured products except by explicit W04 instruction.

## Current Production

- FlowAI production: `https://flowai-dun.vercel.app`.
- Last production identity verified after the packet refresh: `7bc95bb36a573cc94528d08c09d9de6aac9d2d01`.
- `/api/health` reports branch `main`, `clerkReady:true`, GitHub ready, Inngest ready, and Codex orchestra member PASS.
- `main` is now ahead at docs-only commit `40830d6` before this proof evidence commit; production runtime is therefore behind only by docs coordination commits. Do not use docs-only commits as runtime evidence until production is redeployed/promoted to that SHA.

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

Constrained Production proof after Anthropic credit restoration:

- Target: `https://reltwin.com`.
- Run ID: `cto-production-proof-reltwin-20260614-1425`.
- Max iterations: `1`.
- Pre-fix scoring: PASS, baseline/current score `69`, handoff observed from step 5 to step 6.
- Branch creation: not observed.
- Preview URL: not produced.
- Terminal stop: `STEP_8`, `GITHUB_AUTH_FAILED`, GitHub App PEM signing failure.
- Safety observation: `writesOriginalRepo:true` and `originalReadOnly:true`, matching the pending Path 2 fix branch risk chain.
- Evidence: `docs/cto/production-path-proof-reltwin-result-20260614.md`.

Path 2 token/upgrade-target patch:

- Branch: `fix/path2-production-token-upgrade-target`.
- Current head: `acebaa1`.
- Runtime patch commit: `5a66bee` (`fix/forge | harden path2 token and upgrade target gates`).
- Branch has been merged with current main proof evidence and refreshed review docs.
- Review prompts: `docs/cto/cd-review-path2-token-upgrade-target-20260614.md` and `docs/cto/cr-review-path2-token-upgrade-target-20260614.md` on that branch.
- Evidence: `docs/cto/path2-token-upgrade-target-fix-evidence-20260614.md` on that branch.
- Focused verification: `139/139` resolver + orchestrator tests PASS.
- Static checks: lane discipline PASS; SSOT traceability PASS.
- Full `npm run preflight`: PASS after Anthropic credits were restored; lint, build, 236 test files / 3733 tests, lane discipline, SSOT traceability, and matrix generation all passed.
- CTO local review: PASS-WITH-GATE; no blocking code issue found.
- Formal gate: CD/CR external CLI review could not be run from this session because the app privacy guard rejected transmitting private branch code/review material to external model services. Do not merge until CD/CR PASS, W04 waiver, or explicit approval for external reviewer CLI transmission after privacy-risk disclosure.

Universal input and delivery architecture:

- Branch: `docs/cto-auto-repo-provisioning-plan`.
- Latest pushed commit: `b8d94ec` (`docs/cto | request universal delivery workspace clearance`).
- Universal input audit: `docs/cto/universal-input-journey-audit-20260614.md`.
- Auto-repo infrastructure audit: `docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md`.
- W04 clearance request: `docs/cto/w04-universal-delivery-workspace-clearance-request-20260614.md`.
- CB draft dispatch: `docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md`.
- Finding: Type 1 is partial; Type 2 and Type 3 are not end-to-end in the active forge. The active system still assumes preconfigured delivery targets in key paths.
- Status: diagnosis complete, runtime build not dispatched, canonical docs untouched, matrixArtifact untouched.
- Decision needed: W04 must clear or revise the Universal Delivery Workspace direction before CB implements it.

## Current Packets

- Batch VERIFIED packet: `docs/cto/verified-promotion-packet-acceleration-20260614.md`.
- Legacy batch filename now points to the acceleration packet: `docs/cto/verified-promotion-packet-batch-20260614.md`.
- Exact row mapping proposal: `docs/cto/verified-promotion-row-mapping-proposal-20260614.md`.
- Universal Delivery Workspace clearance request: `docs/cto/w04-universal-delivery-workspace-clearance-request-20260614.md`.
- Universal Delivery Workspace CB draft dispatch: `docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md`.

No matrixArtifact edit has been made. W04/CEO must authorize exact row movement before promotion.

## Known Gaps

- FlowAI does not yet have a universal delivery workspace that creates a FlowAI-owned GitHub repo, writes code, creates/imports a Vercel project, deploys, returns a URL, and binds ProductSSOT evidence for arbitrary user inputs.
- Path 2 Production has no CT2-confirmed deployed URL.
- Path 2 RelTwin is blocked by GitHub token fallback and upgrade-target safety.
- Type 2 description-only cannot enter the active construction route without a URL.
- Type 3 multi-URL synthesis is not wired into the active Flow Hub forge as a deployed URL path.
- Full 8-step forge completion is not proven.
- Codex live Build invocation is not proven.
- `/api/test-claude` live smoke returns HTTP 500 and blocks full `npm run preflight` for otherwise scoped passing branches.
- Path 4 three-URL synthesis requires W04/CEO approval of the selected URLs and product direction before execution.

## Next Starting Point

1. W04 reviews `docs/cto/w04-universal-delivery-workspace-clearance-request-20260614.md` and clears, revises, or blocks the Universal Delivery Workspace direction.
2. If cleared, CTO issues a `CLEAR TO EXECUTE` follow-up from `docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md`; CB first commits diagnosis before runtime patching.
3. Keep the VERIFIED row-mapping packet ready, but do not edit `matrixArtifact` until W04/CEO authorizes exact rows.
4. Hold additional manually preconfigured Production proof runs unless W04 explicitly instructs; the newly identified gap says universal delivery must come first.
5. Resolve the formal review gate on `fix/path2-production-token-upgrade-target` only if W04 decides that branch remains relevant before or alongside Universal Delivery Workspace work.

Victor action required:

- W04/CEO authorization for exact VERIFIED row mapping.
- W04 decision on Universal Delivery Workspace architecture.
- Path 4 three-URL synthesis approval.
- Canonical doc changes, if W04/CEO chooses to add new canonical surface rows instead of only updating matrixArtifact evidence state.
