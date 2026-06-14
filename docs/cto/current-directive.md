# CTO Current Directive

Date: 2026-06-14 UTC
Owner: CTO
Status: Active operating directive; supersedes older `docs/cto/current-directive.md` content.
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`.

This folder is an executive coordination layer. Canonical authority remains `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## Evidence-Corrected State

- Active repo: `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`.
- Last production identity verified before this docs refresh: `6f3067678a1193b1763a0936854bfcae1197d3b6`.
- Production: `https://flowai-dun.vercel.app`.
- Production `/api/health` was verified at that identity to report branch `main`, `clerkReady:true`, GitHub ready, Inngest ready, and Codex orchestra member PASS. Docs-only commits may move `main` ahead; verify `/api/health` again before runtime claims.
- Active matrixArtifact state remains `VERIFIED=0`, `WIRED=0`; no matrixArtifact edit has been made.
- Highest matrixArtifact status remains `CURRENT` on 2 of 39 entries.
- Deployed URL evidence exists for 2 of 3 Flow Hub paths:
  - Path 1 Migration: CT2-confirmed public URL `https://saige-v2.vercel.app`.
  - Path 3 Fresh Build: CT2-confirmed public URL `https://flowai-fresh-public-veusite.vercel.app`.
  - Path 2 Production: no CT2-confirmed deployed URL yet.
- Latest Path 2 reruns: SAIGE v2 ended honestly with `HONEST_GATE_REFUSAL_ALREADY_PASSING` at score `98`; RelTwin scored `71.5` but failed before branch creation with `GITHUB_AUTH_FAILED` and unsafe same original/upgrade repo resolution.
- Four-axis UI and run propagation are CT2-confirmed at the evidence level: Structural Layer, Operational Mode, Analysis Depth, and Flow Hub Path are visible, independently selectable, and appear in live run payload/log evidence.
- Clerk ticket/session is CT2-confirmed at the evidence level: app-owned `/sign-in-token` flow lands on Flow Hub Production, scrubs the ticket, establishes a signed-in Clerk app session, and app-origin `/api/me` returns authenticated Clerk state. This does not prove `AUTH_REQUIRED=true`, paid-user onboarding, or organization enforcement.
- TIM Build Codex ranking is CT2/CB2-confirmed as visible with Codex ranked first. Live Step 3 Codex invocation is not yet proven.
- Fresh Build public delivery is CT2-confirmed for one generated VEU AI Studio site. CT2 finding: sampled nav links leave the generated domain for `victorudo.com`; this is a polish/follow-up issue, not a URL proof blocker.
- Full 8-step forge completion is not yet proven.
- No VERIFIED movement is allowed until W04/CEO authorizes exact row mapping and required fields.

## Current Priority Order

1. Keep the batch VERIFIED promotion packet current and add exact row-mapping guidance for W04/CEO. Do not edit `matrixArtifact` until authorized.
2. Dispatch and land the Path 2 Production token/upgrade-target chain fix so a below-target app-layer product can reach branch creation safely.
3. Resolve or formally document the live `/api/test-claude` smoke boundary that blocks full `npm run preflight` on otherwise passing branches.
4. Continue Fresh Build hardening after the public URL milestone: same-origin generated routes, broader submissions, and live Step 3 Build evidence.
5. Prepare Path 4 three-URL synthesis only as a proposal. Execution requires W04/CEO approval of the three URLs and product direction.

## Active Evidence Packets

- Batch VERIFIED packet: `docs/cto/verified-promotion-packet-acceleration-20260614.md`.
- Row-mapping proposal: `docs/cto/verified-promotion-row-mapping-proposal-20260614.md`.
- Path 3 Fresh Build proof: `docs/cto/path3-fresh-build-veusite-publictarget-result-20260614.md`.
- Path 3 CT2 acceptance: `docs/cto/ct2-path3-publictarget-acceptance-result-20260614.md`.
- Acceleration CT2 sweep: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`.
- Path 2 rerun result: `docs/cto/path2-production-rerun-result-20260614.md`.
- CB Path 2 dispatch: `docs/cto/cb-path2-production-token-and-upgrade-target-dispatch-20260614.md`.

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
- Any VERIFIED movement.
- Path 4 three-URL synthesis execution approval.
- New product or business direction decisions.
- Any human-only dashboard/auth action after the technical bench proves it cannot be safely automated.

Everything else proceeds under CTO authority.

## Session Ritual

Start each session by reading this file, `docs/cto/session-brief.md`, and current git/production health. If docs-only commits are ahead of the deployed runtime, record that explicitly and do not treat it as a runtime regression.

End each session by committing evidence to `docs/cto/`, updating `docs/cto/session-brief.md`, and pushing the appropriate branch. Victor reads one document: `docs/cto/session-brief.md`.

## Finish Line

FlowAI is delivered when all three Flow Hub paths have produced CT2-confirmed deployed URLs, all four axes are independently selectable and wired into real runs, the forge completes all 8 steps reliably across diverse product submissions, Clerk supports real users, and 95 matrixArtifact entries are VERIFIED with honest evidence.
