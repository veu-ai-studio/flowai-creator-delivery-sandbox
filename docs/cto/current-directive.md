# CTO Current Directive

Date: 2026-06-23 UTC
Owner: CTO
Status: Active additive operating directive. It does not replace prior ratified governance, evidence, or canonical decisions.
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`.

This folder is an executive coordination layer. Canonical authority remains `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## CTO Operating Reset - 2026-06-23

Source: CTO synthesis after Victor/W04/Claude/ChatGPT feedback on administrative drag.
Artifact: `docs/cto/cto-operating-reset-20260623.md`.

FlowAI now returns to `Build -> Evidence -> Review -> Decision`.

Claude is retained only as artifact-bound adversarial reviewer: plan adjudication, evidence verification, and claim discipline. No artifact means no Claude review. Do not send Claude draft dispatches, governance restatements, meta-governance, reviews of reviews, or dispatches about dispatches.

AOL UI Work-State Contract work is AOL work unless W04/CEO explicitly maps it to a specific FlowAI runtime surface. The AOL Milestone A contract is routed to `docs/aol/work-state-contract-milestone-a-20260623.md`. Do not dispatch FlowAI CB to implement `NETWORK -> Connect Buyer` in FlowAI, and do not mix AOL UI evidence into FlowAI capability claims.

FlowAI's runtime lane remains BuildExecutionWorker M1 and product-engine proof. The Milestone 1 plan exists on origin at commit `0687c38` and is recommended PASS-WITH-FINDINGS. No further Milestone 1 gate documents are needed; next FlowAI technical action is implementation only when requested, with Codex-adapter claim boundary and fail-closed proofRunId continuity folded in.

Implementation dispatch issued: `docs/cto/cb-build-execution-worker-m1-implementation-dispatch-20260623.md`.

Key correction: the BuildExecutionWorker M1 proof must dispatch the actual tool returned by `getTopTool('build')`; it must not hardcode Codex. If Codex is selected, Codex must be invoked honestly through the OpenAI API Codex adapter boundary or the run must STOP/BLOCK. Evidence must include exact selected-tool output and proofRunId continuity through selection, dispatch, sandbox mutation, commit, response, and evidence packet.

M1 implementation evidence packet: `docs/cto/build-execution-worker-m1-evidence-20260623.md`. Core `runBuild` wire live proof succeeded with sandbox commit `d4e7b583dc05784b7da7f30fc9384f32c5fea36c`; deployed `POST /api/forge/build` entrypoint proof remains caveated due preview POST empty 404.

## Additive Completion Charter - 2026-06-23

Source: W04 final ratified FlowAI Capability Completion Charter.
Implementation artifact: `docs/cto/flowai-capability-completion-charter-20260623.md`.
Implementation result: `docs/cto/flowai-capability-completion-charter-implementation-result-20260623.md`.

This charter now governs CTO claim movement and completion language. A FlowAI capability is complete only when behavior, evidence, and independent verification all exist. Deployed URLs, source code, architecture, passing tests, scores, candidate implementations, demos, and governance reports remain evidence, but do not constitute completion by themselves.

Current governing states:

- Build Execution: `MILESTONE 0 BLOCKED` because execution authority is unresolved.
- Auditor: `RUNTIME_ACTIVE` and authorized to advance toward `AUDITOR_VERIFIED`.
- Creator: `PARTIALLY PROVEN`; downstream of `BUILD_EXECUTION_VERIFIED`.
- Upgrader: `NOT PROVEN`; frozen adjudication `UPGRADER_AUTONOMOUS_DISPROVEN` remains in force until Build Execution exists.
- Universal Product Engine: `NOT PROVEN`; capstone claim only after Auditor, Build Execution, Creator, and Upgrader are verified.

Immediate control rule: BuildExecutionWorker implementation does not proceed until GitHub workflow/actions authority or an equivalent FlowAI-controlled execution substrate is resolved and verified from origin. Auditor verification may proceed independently.

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

Detailed build requirements from the full CEO/W04 packet:

- Auto repo creation must create a FlowAI-owned GitHub repo for every new product submission, write upgraded/generated code through the GitHub App, create or import the Vercel project, deploy, return the live URL as the only user-facing output, and be idempotent by `runId`.
- Pre-flight validation must stop impossible runs before spending credits. It must check URL crawlability, Anthropic availability, GitHub App permissions, Vercel deployment availability, path-specific feasibility, and return plain-language messages instead of technical codes.
- Type 2 New Build must work with no URL and no source repo by turning the user description into a product specification, selecting a stack based on product type, generating a complete codebase, creating delivery infrastructure, deploying, and returning a URL.
- Type 3 synthesis must crawl two or more URLs independently, extract useful features and design patterns, reconcile conflicts, synthesize one coherent product specification, record source attribution, generate the new codebase, deploy, and return a URL.
- Clerk completion requires a real user to sign up, verify email, log in, reach Flow Hub, launch a run, receive a URL, return later, see run history, and keep the session across refresh.
- Product type is a fifth Flow Hub input, not metadata. It must affect build strategy, stack selection, code generation, and deployment behavior for Website, Native App, Mobile App, SaaS Platform, and Agentic AI System outputs.
- Anonymous users may submit one preview run per day per IP and receive a preview URL; authenticated users get persistent history, multiple products, and saved configurations. Authentication adds value but must not block first use.
- Run status must be human-readable across all 8 steps, including current step, plain-language findings, estimated time remaining, before/after scores, deployed URL, and failure explanations with no stack traces.
- Score explanations must state what the score means, which issues were found, which were fixed, which need human attention, what to do next, and how the upgraded version compares to the original.
- Deployment failures must explain what was attempted, what failed, whether auto-retry is possible, what the user can do next, and must preserve all completed work.
- Multi-product management must let authenticated users submit multiple products, view scores, run forge on any product, inspect run history, compare scores over time, and see deployed improvements.
- Four axes remain required in live runs: Structural Layer affects checkpoint behavior, Analysis Depth affects crawl/scoring depth, Operational Mode affects step execution, and Flow Hub Path selects Production, Migration, or New Build.
- Full 8-step completion must finish Deploy, Self-Renewal, GTM, and Monitor after Research, Design, Build, and Quality Audit. CT2 confirmation is required step by step.
- Codex must be proven as the live Step 3 Build tool, not merely listed in TIM. Provider provenance must be recorded in run evidence.

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

Execution controls from the full CEO/W04 packet:

- Before any forge proof, confirm the product has a configured upgrade repo or auto-repo creation will handle delivery, the product has app-layer issues FlowAI can fix, and the target is publicly crawlable. If any answer is no, stop and fix the gap first.
- Before any CB dispatch, map the full blocker chain and dispatch the complete fix surface rather than one layer at a time.
- Do not stack more than two runtime branches in review at once.
- A commit is not evidence. CT2 browser confirmation is evidence for user-facing completion.
- Documentation commits coordinate the bench; only runtime commits on `main` count as implementation progress.
- If any shared blocker affects multiple gaps, pause parallel tracks and resolve the shared blocker before continuing.

## Evidence-Corrected State

- Active repo: `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`.
- Reviewed `origin/main` baseline before this update: `7aadc14`.
- Last production identity verified after Path 2 merge/promotion: `d6b92d54e1693fd18f37b5549df9d68285204449`.
- Production: `https://flowai-dun.vercel.app`.
- Production `/api/health` was verified at that identity to report branch `main`, `clerkReady:true`, GitHub ready, Inngest ready, and Codex orchestra member PASS.
- Current `main` is ahead of deployed runtime by docs/evidence commits only. Verify `/api/health` again before runtime claims.
- W04/CEO authorized the batch VERIFIED promotion in the final directive. The narrow exact-row set is now applied in `src/lib/orchestratorFramework/matrixArtifact.json`: `10 VERIFIED`, `0` missing `evidenceUrl` / `verifiedAt` / `verifiedBy` fields.
- Evidence note: `docs/cto/verified-promotion-applied-20260614.md`.
- No broad SSOT rows were promoted beyond the exact CT2-confirmed evidence scope.
- Deployed URL evidence exists for 2 of 3 Flow Hub paths:
  - Path 1 Migration: CT2-confirmed public URL `https://saige-v2.vercel.app`.
  - Path 3 Fresh Build: CT2-confirmed public URL `https://flowai-fresh-public-veusite.vercel.app`.
  - Path 2 Production: no CT2-confirmed deployed URL yet.
- Latest Path 2 reruns: SAIGE v2 ended honestly with `HONEST_GATE_REFUSAL_ALREADY_PASSING` at score `98`; RelTwin is the active below-target Production candidate.
- Latest constrained RelTwin Production proof after Anthropic credit restoration: pre-fix scoring PASS at score `69`, step 5 to step 6 handoff observed, branch creation not observed, preview URL not produced, terminal stop `STEP_8` `GITHUB_AUTH_FAILED` from GitHub App PEM signing failure. Unsafe same original/upgrade repo resolution remains visible behind that gate.
- Path 2 token/upgrade-target runtime fix is merged on `main` through merge commit `e08a624` and deployed in production identity `d6b92d54e1693fd18f37b5549df9d68285204449`.
- CT2 post-merge RelTwin proof result: PASS with one caution. The prior GitHub App PEM signing hard failure did not recur; redacted `GITHUB_OPERATOR_TOKEN` fallback was observed; unsafe same-repo upgrade-target detection blocked before branch creation. No deployed URL was produced.
- W04 identified a larger universal delivery gap: FlowAI cannot assume preconfigured upgrade repos or Vercel projects for real users. The final directive clears CB to build the Universal Delivery Workspace. Active dispatch: `docs/cto/cb-universal-delivery-workspace-dispatch-20260614.md`; CB branch: `feature/universal-delivery-workspace`.
- Universal input state: Type 1 single URL is partial; Type 2 description-only is not end-to-end in the deployed production forge; Type 3 multi-URL synthesis is not end-to-end in the deployed production forge. The Universal Delivery Workspace branch adds a Type 2 substrate pending CD/CR/CB2 review, merge, deploy, and CT2 proof.
- Universal infrastructure state: repo/project provisioning helpers exist, but the active forge does not yet create a FlowAI-owned GitHub repo, write code, create/import a Vercel project, deploy, return a URL, and bind ProductSSOT evidence for arbitrary user input.
- Four-axis UI and run propagation are CT2-confirmed at the evidence level: Structural Layer, Operational Mode, Analysis Depth, and Flow Hub Path are visible, independently selectable, and appear in live run payload/log evidence.
- Clerk ticket/session is CT2-confirmed at the evidence level: app-owned `/sign-in-token` flow lands on Flow Hub Production, scrubs the ticket, establishes a signed-in Clerk app session, and app-origin `/api/me` returns authenticated Clerk state. This does not prove `AUTH_REQUIRED=true`, paid-user onboarding, or organization enforcement.
- TIM Build Codex ranking is CT2/CB2-confirmed as visible with Codex ranked first. Live Step 3 Codex invocation is not yet proven.
- Fresh Build public delivery is CT2-confirmed for one generated VEU AI Studio site. CT2 finding: sampled nav links leave the generated domain for `victorudo.com`; this is a polish/follow-up issue, not a URL proof blocker.
- Full 8-step forge completion is not yet proven.
- Further VERIFIED movement beyond the already-authorized exact-row batch requires W04/CEO authorization of the exact row mapping and required fields.

## Current Priority Order

1. Drive CB's Universal Delivery Workspace branch to an honest diagnosis and smallest deployable substrate for auto-created GitHub repos, Vercel projects/deployments, returned URLs, and ProductSSOT evidence binding.
2. Fold CB2's post-`d6b92d5` production regression audit into `docs/cto/` and dispatch fixes for any BLOCK findings.
3. Resolve the Path 2 unsafe same-repo delivery-target blocker through the Universal Delivery Workspace path; do not run more manually preconfigured Production proofs as proof-of-universal delivery.
4. Resolve the SAIGE visual acceptance blocker: product-card score visibility on `/portfolio` and `/dashboard`.
5. Execute Path 4 only when the active run target honestly supports multi-URL synthesis to a deployed URL.

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
- Universal Delivery Workspace CB sync request before review: `docs/cto/cb-universal-delivery-workspace-sync-request-20260614.md`.
- Universal Delivery Workspace post-clearance runbook: `docs/cto/universal-delivery-workspace-postclearance-runbook-20260614.md`.
- Universal Delivery Workspace CD review draft: `docs/cto/cd-review-universal-delivery-workspace-prompt-draft-20260614.md`.
- Universal Delivery Workspace CR review draft: `docs/cto/cr-review-universal-delivery-workspace-prompt-draft-20260614.md`.
- Universal Delivery Workspace CD review dispatch: `docs/cto/cd-review-universal-delivery-workspace-prompt-20260614.md`.
- Universal Delivery Workspace CR review dispatch: `docs/cto/cr-review-universal-delivery-workspace-prompt-20260614.md`.
- Universal Delivery Workspace CB2 branch audit dispatch: `docs/cto/cb2-review-universal-delivery-workspace-dispatch-20260614.md`.
- Universal Delivery Workspace CTO review note: `docs/cto/cto-review-universal-delivery-workspace-20260614.md`.
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

FlowAI is delivered when:

1. Any user anywhere can open FlowAI, submit a URL, description, or multiple URLs, and receive a deployed upgraded URL without technical knowledge or manual setup.
2. All three Flow Hub paths each produce at least one CT2-confirmed deployed URL from a real submission.
3. All four axes are independently selectable and confirmed working in live forge runs by CT2.
4. The forge completes all 8 steps reliably across at least three diverse submissions from different organizations.
5. Clerk auth lets a new user sign up, submit a product, and receive a deployed URL in one session.
6. Anonymous users can submit a product without signing up and receive a preview URL.
7. `95` matrixArtifact entries are VERIFIED with real `evidenceUrl`, `verifiedAt`, and `verifiedBy`.
8. Run status is human-readable and scores include plain-language explanations.
9. Deployment failures are handled gracefully with plain-language messages and no lost work.
10. Multi-product management works for authenticated users across multiple sessions.
