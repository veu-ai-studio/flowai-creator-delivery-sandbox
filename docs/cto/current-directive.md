# CTO Current Directive

Date: 2026-06-14 UTC
Owner: CTO
Status: Active operating directive; replaces all prior `docs/cto/current-directive.md` content.
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`.

This folder is an executive coordination layer. Canonical authority remains `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## CTO Buy-In And Evidence Corrections

The W04/CEO comprehensive directive to reach 95/100 SSOT is accepted as the controlling operating strategy with these evidence-preserving corrections:

- Active matrixArtifact status on current main: `VERIFIED=0`, `WIRED=0`, `CURRENT=2`, total entries `39`.
- Path 1 Migration has one CT2-confirmed public deployed URL, `https://saige-v2.vercel.app`, but no matrixArtifact VERIFIED movement has been applied.
- Milestone 1 axis wiring is complete at the live-production evidence level. CT2 confirmed four-axis visibility, independent selection, request propagation, and run-log axis envelope on production commit `65f46a0c96930a207e7cd0c0160cf51317c89822`.
- Codex TIM Build rank/callability code is present on main, but live Step 3 Build evidence is still required before counting it as verified behavior.
- Clerk readiness/routes are live on production runtime commit `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`: `/api/health` reports `clerkReady:true`, `/sign-up` and `/sign-in` render real Clerk UI, and `/api/me` remains anonymous/open while `AUTH_REQUIRED=false`.
- Full authenticated Clerk session proof is not complete. CT2 hit Cloudflare human verification during public sign-up, and the backend-created user plus sign-in-token proof did not propagate an authenticated Clerk session to `/api/me`.
- Latest origin/main may include docs-only evidence commits after the deployed runtime commit. Runtime claims must cite the exact deployment and commit under test.
- Future VERIFIED movement requires W04/CEO clearance and the claim-promotion checklist. The CTO may prepare packets but must not apply promotion unilaterally.

Any pasted or prior directive fact that conflicts with this section is superseded by the evidence-corrected state above.

## Mission

FlowAI is a universal product upgrade engine serving any product from any organization worldwide: websites, native apps, mobile apps, SaaS, and agentic AI systems.

The five VEU AI Studio products are proof-of-concept targets only. They are not the scope of FlowAI. Build every feature as if the next submission could come from a school in Nigeria, a government agency in Indonesia, an NGO in Brazil, or a small business anywhere in the world.

## Honest Baseline

- VERIFIED matrixArtifact entries: 0.
- WIRED matrixArtifact status entries: 0.
- Max matrixArtifact status currently attained: CURRENT, 2 of 39 entries.
- Three Flow Hub paths with deployed URLs: 1 of 3 at the URL-evidence level. Path 1 Migration has CT2-confirmed `https://saige-v2.vercel.app`.
- Four axes wired end to end: CT2 live browser/run proof PASS at the evidence level; no VERIFIED movement applied.
- Forge completing full 8-step runs: not yet proven.
- Clerk auth: environment, health readiness, and Clerk-rendered sign-up/sign-in routes are live; full authenticated session proof is blocked.
- Real external users: 0.

Honest progress estimate: FlowAI has substantial infrastructure built, but production-verified behavior remains early. Treat every claim as evidence-in-progress until live proof and matrix promotion both exist.

## Anti-Drift Rules

1. No fabrication.
   Never claim a URL is deployed unless CT2 independently confirms it in a browser. Never claim a feature works unless a live run proves it. Never move VERIFIED without `evidenceUrl`, `verifiedAt`, and `verifiedBy`.

2. No cycling.
   If a fix reveals a new blocker, map the full blocker chain before dispatching CB. Do not patch one layer, deploy, hit the next layer, and repeat. Diagnose all known layers first and dispatch the complete fix.

3. No drift.
   Read `docs/cto/current-directive.md` at every session start. If a session ends without a milestone, write `docs/cto/session-brief.md` explaining exactly what blocked it and what the next session must do first.

4. No hallucination.
   Do not report progress that cannot be independently verified. Do not claim an axis is wired live unless a live run confirms the selector affects run behavior. Do not claim a path works unless CT2 confirms the deployed URL.

5. No retrogression.
   Before merging any runtime branch, run full preflight or a documented equivalent accepted by CD/CR for the branch scope. Before deploying, confirm no new regression is known from CB2/CT2 evidence. If a merge introduces regressions, fix them before starting unrelated work.

6. One runtime milestone at a time.
   Code-bearing runtime branches stay one active branch at a time unless W04/CEO declares a hotfix or explicit exception. Docs, review prompts, evidence packets, and read-only diagnostics may proceed in parallel.

7. Product-agnostic code.
   Never put a product name, URL, or product-specific rule in FlowAI core code. SAIGE is a test subject. Every fix must work for any product submission.

## Active Queue

1. VERIFIED Promotion First Batch - waiting on W04/CEO clearance.
   The packet `docs/cto/verified-promotion-packet-milestone1-20260613.md` is prepared. Do not apply matrixArtifact VERIFIED movement until W04/CEO explicitly authorizes it.

2. Clerk Session Boundary - active technical blocker to map before the next CB dispatch.
   The env/key route work is merged and live. The remaining blocker is authenticated session propagation to `/api/me`, not Clerk account creation. Boundary analysis is filed at `docs/cto/clerk-session-boundary-analysis-20260614.md`; CB dispatch is filed at `docs/cto/cb-clerk-session-propagation-dispatch-20260614.md`.

3. Flow Hub URL Proofs - next runtime path after Clerk boundary is either fixed or formally deferred.
   Continue with Path 2 Production against an app-layer-owned target, then Path 3 Fresh Build, then Path 4 Three-URL Synthesis after CEO approval of the three selected URLs.

## Milestone 1 - Axis Wiring Live Proof

Status: COMPLETE at the evidence level. No VERIFIED movement applied.

Completed:

- Axis wiring branch merged and promoted.
- Runtime clarity patch merged and promoted.
- CT2 rerun PASS confirmed all four axes visible and unambiguous in the sidebar.
- CT2 confirmed each axis independently selectable.
- CT2 confirmed route switching preserves path state.
- CT2 confirmed live `/api/run-construction` payload includes all four axis values.
- CT2 confirmed run log includes the Flow Hub axis envelope.
- CT2 observed no false deployed URL, branch, preview URL, or VERIFIED claim.
- VERIFIED promotion packet prepared at `docs/cto/verified-promotion-packet-milestone1-20260613.md`.

Acceptance condition met at evidence level:

Victor can open `https://flowai-dun.vercel.app`, see four independent axis selectors in the sidebar, change each one, launch a forge run, and see the run log confirm all four normalized axis values were used.

## Milestone 2 - VERIFIED Promotion First Batch

Status: packet prepared; W04/CEO clearance required before application.

Candidate evidence:

- Path 1 Migration deployed URL: `https://saige-v2.vercel.app`.
- Structural Layer axis behavior.
- Operational Mode axis behavior.
- Analysis Depth request propagation and run-log envelope. Crawl-depth delta requires separate proof if that is the claim being promoted.
- Flow Hub Path selector behavior.

Codex TIM Build is not included unless a live Step 3 Build run proves Codex was selected and used.

Each promoted entry requires:

- `evidenceUrl`: live URL, production run transcript, or durable proof artifact.
- `verifiedAt`: date/time of CT2 or production confirmation.
- `verifiedBy`: CT2 browser acceptance, production run log, or named reviewer evidence.
- Evidence label: `LIVE_PRODUCTION` or `LIVE_PREVIEW`.

Do not apply any VERIFIED entry without W04/CEO clearance.

## Milestone 3 - Clerk Auth

Status: route/readiness wired; full authenticated session proof blocked.

Completed:

- Doppler/Vercel Clerk env diagnostic completed without printing secret values.
- Vercel Production has `CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` populated.
- Runtime branch `fix/clerk-auth-completion` merged to main at `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`.
- Production deployment `https://flowai-mmprr7n0l-veu-ai-studio.vercel.app` promoted.
- `/api/health` reports `clerkReady:true` and auth check `PASS`.
- `/api/version` reports Clerk readiness true.
- `/api/me` reports anonymous/open mode with Clerk configured while `AUTH_REQUIRED=false`.
- CT2 confirmed `/sign-up` renders real Clerk sign-up UI.
- CT2 confirmed `/sign-in` renders real Clerk sign-in UI.

Blocked:

- Public sign-up attempt is blocked by Cloudflare human verification.
- Backend-created disposable Clerk user plus sign-in token URL did not produce an authenticated `/api/me` response in the same browser context.

Next technical action:

Dispatch CB from the prepared session-propagation packet:

1. Read `docs/cto/clerk-session-boundary-analysis-20260614.md`.
2. Build from `docs/cto/cb-clerk-session-propagation-dispatch-20260614.md`.
3. Fix the full known bearer-token propagation chain in one branch.
4. Return CB DoD with tests and CT2 app-origin proof instructions.

No VERIFIED movement is allowed from Clerk work until CT2 proves a real authenticated user session and W04/CEO clears the promotion packet.

## Milestone 4 - All Three Flow Hub Paths Producing URLs

Flow Hub UI path labels: Production, Migration, Fresh Build.

Canonical SSOT input modes remain distinct: Clone & Improve, Describe & Build, Paste/Upload, Synthesize & Build. The UI path labels do not amend canonical input-mode names.

Path 1 - Migration: SAIGE.

- Status: URL milestone complete.
- Confirmed URL: `https://saige-v2.vercel.app`.
- Boundary: remaining SAIGE typecheck or product cleanup debt is tracked separately and does not erase the URL evidence. Do not overclaim migration completion beyond the CT2-confirmed public URL.

Path 2 - Production: app-layer-owned product.

- Preferred target: migrated `saige-v2.vercel.app`, because the codebase is app-layer owned and should not hit the Base44 platform boundary.
- Target: forge scores it, proposes app-layer fixes if warranted, creates a GitHub branch, deploys a preview URL, and records honest governance evidence.
- Accept `HONEST_GATE_REFUSAL` if the score is already high enough and the forge correctly declines mutation. That is correct behavior, not failure.
- If `saige-v2` is too high-scoring for Production to act, identify a real public product with genuine app-layer issues. Do not fabricate a low-scoring product.

Path 3 - Fresh Build.

- Enable `FLOWAI_ENABLE_FRESH_BUILD=true` in Vercel Production env before live proof if not already set.
- Submit this description and synthesis sources:
  - Description: `VEU AI Studio - the organization behind FlowAI, a universal AI product upgrade engine serving underserved organizations worldwide.`
  - URL 1: `https://victorudo.com`
  - URL 2: `https://flowai-dun.vercel.app`
- Target: FlowAI generates a new platform-free codebase and deploys a new URL for a VEU AI Studio website.
- CT2 must confirm the URL loads and shows meaningful content.

Path 4 - Three-URL Synthesis.

- CTO selects three publicly accessible external URLs from different organizations.
- Criteria: related enough for coherent synthesis, output serves real users, all sources publicly crawlable, not VEU AI Studio or proof-of-concept properties.
- CTO reports the candidate URLs and proposed synthesized product to W04 for CEO approval before execution.

## Milestone 5 - Forge Full 8-Step Completion

The 8 forge steps are:

Research -> Design -> Build -> Quality Audit -> Deploy -> Self-Renewal -> GTM -> Monitor.

Current honest state: early steps are substantially wired, but complete 8-step execution across diverse live products is not proven.

Fix sequence:

1. Confirm Analysis Depth wiring reduces crawl time so the 800s window is not consumed by Research alone.
2. Confirm Codex is called in Build for real code generation, not merely ranked in TIM.
3. Confirm Deploy uses the Vercel token to create a real preview URL after Build.
4. Confirm Self-Renewal scores the deployed preview and compares it to the original.
5. Confirm GTM generates real recommendations based on score delta.
6. Confirm Monitor creates or records ongoing tracking.

Each step must produce honest evidence in the run log. No scaffold-only steps. No stub outputs labeled as complete. CT2 must confirm all 8 steps show complete or honest degraded status in a live run. Fix and verify one step at a time beyond Step 4.

## Milestone 6 - 95 VERIFIED Matrix Entries

Current: 0 VERIFIED entries in the active matrix artifact.
Target: 95 VERIFIED entries with real evidence.

Evidence accumulation strategy:

- Every CT2-confirmed forge run produces evidence.
- Every deployed URL produces an `evidenceUrl` candidate.
- Every axis confirmed in a live run produces evidence.
- Every forge step confirmed in a live run produces evidence.

After each milestone, prepare a batch VERIFIED promotion packet and signal W04. Do not accumulate evidence and then promote everything at once. Promote in batches of 5-10 after each milestone only after W04/CEO clearance.

This is weeks of systematic work, not days. Do not rush VERIFIED promotion. Every entry must have real independently verifiable evidence or it corrupts the SSOT.

## Bench Coordination Rules

CTO owns the technical bench. W04 owns governance. Victor approves CEO-level decisions only.

Window roster:

- CB: Codex builder/fixer in the same Codex environment as CTO.
- CB2: Codex auditor in the same Codex environment as CTO.
- CT2: Codex browser acceptance tester in the same Codex environment as CTO.
- CD: Claude Code reviewer on PowerShell.
- CR: Codex reviewer on PowerShell.
- W04: Claude strategic orchestration and governance adjudication.

CTO responsibilities:

- Dispatch CB, CB2, CT2, CD, and CR directly through repo files under `docs/cto/`.
- Promote Vercel deployments using the Vercel token.
- Merge docs-only branches when they are safe and traceable.
- Merge runtime branches after CD PASS and CR PASS, unless W04 explicitly blocks.
- Keep windows moving without waiting for Victor on routine work.
- Write `docs/cto/session-brief.md` after every session or milestone.

CB responsibilities:

- Build only what CTO dispatches.
- Run full preflight before every runtime push unless the dispatch explicitly defines a narrower proof and reviewers accept it.
- Never merge. Push and signal CTO.
- STOP and report on unknown blockers.

CB2 responsibilities:

- Audit production on every SHA change.
- Report new regressions to CTO immediately.
- Never build. Audit only.

CT2 responsibilities:

- Run browser acceptance on every production SHA change and every proof URL.
- Confirm deployed URLs in a real browser.
- Report PASS/BLOCK to CTO through repo evidence.
- Never build. Test only.

CD and CR responsibilities:

- Review all runtime branches dispatched by CTO.
- Read dispatch prompts from `docs/cto/` directly.
- Report PASS/BLOCK to CTO through repo evidence.
- Never build. Review only.

W04 responsibilities:

- Adjudicate governance disputes.
- Authorize VERIFIED promotions.
- Interface with Victor on CEO decisions.
- Do not dispatch CB, CD, or CR directly unless explicitly taking over a governance exception.

Victor responsibilities:

- CEO decisions only.
- Read `docs/cto/session-brief.md` each session.
- Approve VERIFIED promotions.
- Paste and approve only when genuinely required.

## What Requires Victor

Only these items require Victor's explicit action:

- Changes to `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, or `docs/IMPLEMENTATION_PLAN.md`.
- VERIFIED movement authorization.
- New business or strategic direction decisions.
- Path 4 three-URL synthesis approval.
- Human-only auth/dashboard action, if CT2/CB prove it cannot be automated safely.
- Anything outside this directive.

Everything else runs autonomously under CTO supervision.

## Session Ritual

Session start:

1. Read `docs/cto/current-directive.md`.
2. Read `docs/cto/session-brief.md`.
3. Pull current main.
4. Identify the latest origin/main commit and latest production runtime commit. If docs-only commits are ahead of runtime, record that explicitly rather than treating it as a runtime mismatch.
5. For any live proof, confirm `/api/health` or Vercel deployment metadata matches the runtime commit under test.
6. Check CB2/CT2 evidence for open regressions.
7. Continue from exactly where the last session ended.

Session end:

1. Commit all evidence to `docs/cto/`.
2. Write `docs/cto/session-brief.md` covering:
   - What was completed with evidence URLs.
   - What is in progress and what remains.
   - Any decisions that require Victor.
   - Honest next session starting point.
3. Push to main or to the appropriate review branch.
4. Victor reads one document: `docs/cto/session-brief.md`.

## Success Definition

FlowAI is delivered, functional, and operational when:

1. All three Flow Hub paths have each produced at least one CT2-confirmed deployed URL from a real product submission.
2. All four axes are independently selectable and confirmed working in live forge runs.
3. The forge completes all 8 steps reliably across at least three diverse product submissions.
4. Clerk auth is enabled and a real user can sign up, submit a product, and receive a deployed URL.
5. 95 VERIFIED matrixArtifact entries exist with real `evidenceUrl`, `verifiedAt`, and `verifiedBy` fields.
6. Victor can open FlowAI, enter any product URL, select his four axes, launch the forge, and receive a deployed upgraded URL without manual intervention from the technical team.

That is the finish line. Everything else is a milestone on the way there.
