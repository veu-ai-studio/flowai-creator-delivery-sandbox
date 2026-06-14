# CTO Current Directive

Date: 2026-06-14 UTC
Owner: CTO
Status: Active operating directive; supersedes older `docs/cto/current-directive.md` content.
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`.

This folder is an executive coordination layer. Canonical authority remains `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## Additive Final Directive - 2026-06-14

Source: W04 / Victor Udo, FNSE, PhD - CEO. This is an additive update. Prior ratified decisions, canonical amendments, governance rules, and evidence standards remain in force. Where this directive conflicts with earlier CTO coordination docs, this directive controls.

Mission:

- FlowAI is a universal product upgrade engine. Any user anywhere submits a URL, description, or multiple URLs, selects options, launches the forge, and receives a deployed upgraded URL.
- The five VEU AI Studio products are proof targets only, not the product scope.
- Build product-agnostically for websites, native apps, mobile apps, SaaS platforms, and agentic AI systems from any organization worldwide.

Immediate authorizations now in force:

- Apply the batch VERIFIED promotion packet now. Populate `evidenceUrl`, `verifiedAt`, and `verifiedBy` for every CT2-confirmed item in the authorized packet.
- `fix/path2-production-token-upgrade-target` is cleared. Merge it, promote production, and dispatch CT2.
- Path 4 URL selection is authorized. CTO may choose three external, publicly accessible, non-VEU URLs from different organizations and execute the synthesis proof without waiting for W04.
- CB is unblocked and clear to build the listed infrastructure gaps. CTO dispatches CB directly through `docs/cto/`.

Final Flow Hub path definitions:

- Path 1 - Production: take any product URL, make it better, deploy, and return the improved URL.
- Path 2 - Migration: move any product from any platform to a standalone environment with no feature loss, no stubs, no simulations, and no platform dependencies.
- Path 3 - New Build: use a description and/or two or more URLs to create a brand-new product from scratch. `FLOWAI_ENABLE_FRESH_BUILD` is already true in Vercel. The next VEU AI Studio website proof may use `https://victorudo.com` and `https://flowai-dun.vercel.app` as synthesis inputs.

Input types that must work end-to-end:

- Type 1 - Single URL: crawl, analyze, upgrade or migrate, deploy, return URL.
- Type 2 - Description only: generate product specification from description, select stack based on product type, generate full codebase, deploy, return URL.
- Type 3 - Multi-URL synthesis: crawl all URLs independently, extract best features and design patterns, reconcile conflicts, synthesize a coherent product spec, generate codebase, deploy, return URL, and record source attribution.

Authorized infrastructure gap queue:

1. Auto repo creation and Vercel project/deployment for every new product submission.
2. Pre-flight validation before every forge dispatch with plain-language user messages.
3. Full Type 2 and Type 3 multi-input pipeline support.
4. Clerk auth end-to-end sign-up, verification, login, Flow Hub access, run history, and session persistence.
5. Product type selection as a fifth Flow Hub input: Website, Native App, Mobile App, SaaS Platform, Agentic AI System.
6. Anonymous vs authenticated runs: one anonymous preview per day per IP; authenticated users get persistent history and saved configurations.
7. Human-readable run status visibility across all 8 steps.
8. Plain-language score explanation with issues, fixes, human-attention items, next steps, and original-vs-upgrade comparison.
9. Deployment failure handling that preserves work and explains retryability.
10. Multi-product management for authenticated users.
11. Four axes fully wired into live run behavior.
12. Full 8-step forge completion through Deploy, Self-Renewal, GTM, and Monitor.
13. Codex confirmed as the live Step 3 Build tool with provider provenance.
14. Grow matrixArtifact toward 95 VERIFIED entries through CT2-confirmed evidence.

Additive anti-drift rules:

- No merge without CB2 PASS.
- No claimed complete without CT2 PASS.
- No more than two branches in review simultaneously.
- Full preflight before every push.
- Diagnose the full blocker chain before dispatching CB.
- Wrong target stops the run.
- Runtime commits on main are the only implementation progress; docs are coordination/evidence.
- Update `docs/cto/session-brief.md` after every session.
- If one blocker affects multiple gaps, stop parallel tracks and resolve the shared blocker first.
- Never hard-code product-specific logic in FlowAI core.
- Additive directives only; do not replace prior ratified directives unless explicitly instructed.

## Evidence-Corrected State

- Active repo: `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`.
- Last production identity verified before this directive refresh: `7bc95bb36a573cc94528d08c09d9de6aac9d2d01`.
- Production: `https://flowai-dun.vercel.app`.
- Production `/api/health` was verified at that identity to report branch `main`, `clerkReady:true`, GitHub ready, Inngest ready, and Codex orchestra member PASS.
- Current `main` is ahead at docs-only commit `40830d6` before the latest proof evidence commit; production is behind only by docs coordination commits. Verify `/api/health` again before runtime claims.
- Active matrixArtifact state remains `VERIFIED=0`, `WIRED=0`; no matrixArtifact edit has been made.
- Highest matrixArtifact status remains `CURRENT` on 2 of 39 entries.
- Deployed URL evidence exists for 2 of 3 Flow Hub paths:
  - Path 1 Migration: CT2-confirmed public URL `https://saige-v2.vercel.app`.
  - Path 3 Fresh Build: CT2-confirmed public URL `https://flowai-fresh-public-veusite.vercel.app`.
  - Path 2 Production: no CT2-confirmed deployed URL yet.
- Latest Path 2 reruns: SAIGE v2 ended honestly with `HONEST_GATE_REFUSAL_ALREADY_PASSING` at score `98`; RelTwin is the active below-target Production candidate.
- Latest constrained RelTwin Production proof after Anthropic credit restoration: pre-fix scoring PASS at score `69`, step 5 to step 6 handoff observed, branch creation not observed, preview URL not produced, terminal stop `STEP_8` `GITHUB_AUTH_FAILED` from GitHub App PEM signing failure. Unsafe same original/upgrade repo resolution remains visible behind that gate.
- Path 2 token/upgrade-target runtime fix is pushed at branch `fix/path2-production-token-upgrade-target`, head `acebaa1`. Runtime patch commit `5a66bee` is now merged with current main proof evidence and refreshed review docs.
- Path 2 verification status: focused tests PASS, full `npm run preflight` PASS, CTO local review PASS-WITH-GATE. Formal CD/CR CLI review was blocked by the app privacy guard because it would transmit private branch code/review material to external model services. Do not merge until CD/CR PASS, W04 waiver, or explicit approval for that external transmission after privacy-risk disclosure.
- W04 identified a larger universal delivery gap: FlowAI cannot assume preconfigured upgrade repos or Vercel projects for real users. CTO completed diagnosis on branch `docs/cto-auto-repo-provisioning-plan`, latest commit `b8d94ec`, and pushed a W04 clearance request plus CB draft dispatch. No runtime build has been dispatched.
- Universal input state: Type 1 single URL is partial; Type 2 description-only is not end-to-end in the active forge; Type 3 multi-URL synthesis is not end-to-end in the active forge.
- Universal infrastructure state: repo/project provisioning helpers exist, but the active forge does not yet create a FlowAI-owned GitHub repo, write code, create/import a Vercel project, deploy, return a URL, and bind ProductSSOT evidence for arbitrary user input.
- Four-axis UI and run propagation are CT2-confirmed at the evidence level: Structural Layer, Operational Mode, Analysis Depth, and Flow Hub Path are visible, independently selectable, and appear in live run payload/log evidence.
- Clerk ticket/session is CT2-confirmed at the evidence level: app-owned `/sign-in-token` flow lands on Flow Hub Production, scrubs the ticket, establishes a signed-in Clerk app session, and app-origin `/api/me` returns authenticated Clerk state. This does not prove `AUTH_REQUIRED=true`, paid-user onboarding, or organization enforcement.
- TIM Build Codex ranking is CT2/CB2-confirmed as visible with Codex ranked first. Live Step 3 Codex invocation is not yet proven.
- Fresh Build public delivery is CT2-confirmed for one generated VEU AI Studio site. CT2 finding: sampled nav links leave the generated domain for `victorudo.com`; this is a polish/follow-up issue, not a URL proof blocker.
- Full 8-step forge completion is not yet proven.
- No VERIFIED movement is allowed until W04/CEO authorizes exact row mapping and required fields.

## Current Priority Order

1. Apply the authorized VERIFIED batch promotion from `docs/cto/verified-promotion-packet-acceleration-20260614.md` using the exact-row guidance in `docs/cto/verified-promotion-row-mapping-proposal-20260614.md`.
2. Merge `fix/path2-production-token-upgrade-target`, promote production, and dispatch CT2 for the Path 2 proof chain.
3. Dispatch CB for Universal Delivery Workspace and infrastructure gap work. The first CB branch must diagnose before runtime patching and must respect the "no more than two branches in review" rule.
4. Select and document three external Path 4 synthesis URLs, then execute the proof when the active run target is ready.
5. Keep session evidence and `docs/cto/session-brief.md` current after every milestone.

## Active Evidence Packets

- Batch VERIFIED packet: `docs/cto/verified-promotion-packet-acceleration-20260614.md`.
- Row-mapping proposal: `docs/cto/verified-promotion-row-mapping-proposal-20260614.md`.
- Path 3 Fresh Build proof: `docs/cto/path3-fresh-build-veusite-publictarget-result-20260614.md`.
- Path 3 CT2 acceptance: `docs/cto/ct2-path3-publictarget-acceptance-result-20260614.md`.
- Acceleration CT2 sweep: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`.
- Path 2 rerun result: `docs/cto/path2-production-rerun-result-20260614.md`.
- Latest RelTwin Production proof result: `docs/cto/production-path-proof-reltwin-result-20260614.md`.
- CB Path 2 dispatch: `docs/cto/cb-path2-production-token-and-upgrade-target-dispatch-20260614.md`.
- Path 2 runtime fix evidence on branch `fix/path2-production-token-upgrade-target`: `docs/cto/path2-token-upgrade-target-fix-evidence-20260614.md`.
- Universal input audit: `docs/cto/universal-input-journey-audit-20260614.md`.
- Auto-repo infrastructure audit: `docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md`.
- Universal Delivery Workspace W04 clearance request: `docs/cto/w04-universal-delivery-workspace-clearance-request-20260614.md`.
- Universal Delivery Workspace W04 decision packet: `docs/cto/w04-universal-delivery-workspace-decision-packet-20260614.md`.
- Universal Delivery Workspace CB draft dispatch: `docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md`.
- Universal Delivery Workspace active CB dispatch: `docs/cto/cb-universal-delivery-workspace-dispatch-20260614.md`.
- Universal Delivery Workspace post-clearance runbook: `docs/cto/universal-delivery-workspace-postclearance-runbook-20260614.md`.
- Universal Delivery Workspace CD review draft: `docs/cto/cd-review-universal-delivery-workspace-prompt-draft-20260614.md`.
- Universal Delivery Workspace CR review draft: `docs/cto/cr-review-universal-delivery-workspace-prompt-draft-20260614.md`.
- Universal Delivery Workspace CT2 proof draft: `docs/cto/ct2-universal-delivery-workspace-proof-draft-20260614.md`.

## Anti-Drift Rules

1. No fabrication.
   Never claim a URL is deployed unless CT2 independently confirms it in a browser. Never claim a feature works unless a live run or live browser proof supports the exact claim.

2. No unchecked promotion.
   Never move a matrixArtifact row to VERIFIED without `evidenceUrl`, `verifiedAt`, and `verifiedBy`, plus W04/CEO authorization of the exact row.

3. No broad-row overclaiming.
   If an existing matrix row is broader than the observed proof, prepare a new exact row proposal instead of promoting the broad row silently.

4. No cycling.
   If a fix reveals a new blocker, map the blocker chain before dispatching another narrow patch.

5. No retrogression.
   Runtime branches need full preflight or an explicitly documented equivalent accepted by CD/CR. Known non-branch live-smoke blockers must be stated in the merge packet.

6. Product-agnostic code.
   Do not hard-code SAIGE, VEU, Victor, or any proof target into FlowAI core runtime behavior.

## Bench Coordination Rules

CTO owns the technical bench. W04 owns governance. Victor approves CEO-level decisions only.

- CB: builder/fixer in Codex environment.
- CB2: production auditor in Codex environment.
- CT2: browser acceptance tester in Codex environment.
- CD: Claude Code reviewer on PowerShell.
- CR: Codex reviewer on PowerShell.
- W04: strategic orchestration and governance adjudication.

CTO dispatches through repo files in `docs/cto/`, promotes deployments, merges docs-only work when safe, and merges runtime branches after CD/CR PASS unless W04 blocks. Victor should not relay prompts or manually perform routine technical steps.

## What Requires Victor Or W04/CEO

- Any change to canonical docs.
- New evidence categories not covered by the original VERIFIED packet.
- New product or business direction decisions.
- Any human-only dashboard/auth action after the technical bench proves it cannot be safely automated.

Everything else proceeds under CTO authority.

## Session Ritual

Start each session by reading this file, `docs/cto/session-brief.md`, and current git/production health. If docs-only commits are ahead of the deployed runtime, record that explicitly and do not treat it as a runtime regression.

End each session by committing evidence to `docs/cto/`, updating `docs/cto/session-brief.md`, and pushing the appropriate branch. Victor reads one document: `docs/cto/session-brief.md`.

## Finish Line

FlowAI is delivered when all three Flow Hub paths have produced CT2-confirmed deployed URLs, all four axes are independently selectable and wired into real runs, the forge completes all 8 steps reliably across diverse product submissions, Clerk supports real users, and 95 matrixArtifact entries are VERIFIED with honest evidence.
