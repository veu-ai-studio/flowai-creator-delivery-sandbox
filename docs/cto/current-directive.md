# CTO Current Directive

Date: 2026-06-13
Owner: CTO
Status: Active operating directive; replaces all prior `docs/cto/current-directive.md` content.
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`.

This folder is an executive coordination layer. Canonical authority remains `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## CTO Acceptance Revisions

I accept this directive as the operating plan with the following evidence corrections so the repo does not drift:

- Actual matrixArtifact status count on current main before this docs update: `VERIFIED=0`, `WIRED status=0`, `CURRENT=2`, total entries `39`.
- Path 1 Migration has one CT2-confirmed deployed public URL, `https://saige-v2.vercel.app`, but no matrixArtifact VERIFIED movement has been applied.
- Priority 2 axis wiring is merged to main and promoted to production at commit `54422549044c5ff8e4e187a155c25bfc38462e10`, with CD PASS and CR PASS. CT2 live proof is still required before it can be claimed live-wired.
- Codex TIM Build rank/callability code is present on main, but live Step 3 Build evidence is still required before counting it as verified behavior.
- Any future VERIFIED movement requires W04/CEO clearance and the claim-promotion checklist. The CTO may prepare packets but must not apply promotion unilaterally.

## Mission

FlowAI is a universal product upgrade engine serving any product from any organization worldwide: websites, native apps, mobile apps, SaaS, and agentic AI systems.

The five VEU AI Studio products are proof-of-concept targets only. They are not the scope of FlowAI. Build every feature as if the next submission could come from a school in Nigeria, a government agency in Indonesia, an NGO in Brazil, or a small business anywhere in the world.

## Honest Baseline

- VERIFIED matrixArtifact entries: 0.
- WIRED matrixArtifact status entries: 0.
- Max matrixArtifact status currently attained: CURRENT, 2 of 39 entries.
- Three Flow Hub paths with deployed URLs: 1 of 3 at the URL-evidence level. Path 1 Migration has CT2-confirmed `https://saige-v2.vercel.app`.
- Four axes wired end to end: code merged and production deployed; CT2 live browser/run proof pending.
- Forge completing full 8-step runs: not yet proven.
- Clerk auth: not enabled in production health.
- Real external users: 0.

Honest progress estimate: infrastructure is materially built, but production-verified behavior remains early. Treat FlowAI as evidence-in-progress until live runs prove each claim.

## Anti-Drift Rules

These rules exist because the project has cycled, drifted, and hallucinated progress multiple times. Every window must follow them without exception.

1. No fabrication.
   Never claim a URL is deployed unless CT2 independently confirms it in a browser. Never claim a feature works unless a live run proves it. Never move VERIFIED without `evidenceUrl`, `verifiedAt`, and `verifiedBy`.

2. No cycling.
   If a fix reveals a new blocker, map the full blocker chain before dispatching CB. Do not patch one layer, deploy, hit the next layer, and repeat. Diagnose all known layers first and dispatch the complete fix.

3. No drift.
   Read `docs/cto/current-directive.md` at every session start. If a session ends without a milestone, write `docs/cto/session-brief.md` explaining exactly what blocked it and what the next session must do first.

4. No hallucination.
   Do not report progress that cannot be independently verified. Do not claim an axis is wired live unless a live run confirms the selector affects run behavior. Do not claim a path works unless CT2 confirms the deployed URL.

5. No retrogression.
   Before merging any runtime branch, run full preflight or a documented equivalent cleared by CD/CR for the branch scope. Before deploying, confirm no new regression is known from CB2/CT2 evidence. If a merge introduces regressions, fix them before starting unrelated work.

6. One milestone at a time.
   Complete the active milestone before starting another runtime track. Do not work on axes and Fresh Build simultaneously. Do not touch SAIGE product completion while building FlowAI core features unless that is the active milestone.

7. Product-agnostic code.
   Never put a product name, URL, or product-specific rule in FlowAI core code. SAIGE is a test subject. Every fix must work for any product submission.

## Active Milestone 1 - Axis Wiring Live Proof

Status: code built, reviewed, merged to main, and promoted to production. CT2 live proof is pending.

Completed:

1. Priority 2 axis wiring branch built.
2. Focused tests passed.
3. `npm run build:preflight` passed.
4. `npm run lint` passed with existing warnings only.
5. CD review passed.
6. CR review passed.
7. Branch merged to main at `c6a2d97c1f1b2f160887ba7dafc4551c105a1515`.
8. Current main promoted to production at `54422549044c5ff8e4e187a155c25bfc38462e10`.
9. `https://flowai-dun.vercel.app/api/health` reports the promoted main SHA.
10. `https://flowai-dun.vercel.app/flow-hub/production` returns `200 OK`.

Remaining before claiming Milestone 1 complete:

1. CT2 must verify in a live browser:
   - All four axes are visible in the sidebar.
   - Each axis is independently selectable.
   - Changing Structural Layer changes run behavior.
   - Changing Analysis Depth changes crawl/scoring depth.
   - Changing Flow Hub Path changes which pipeline runs.
   - All four axis values appear in a real forge run log.
2. CT2 PASS is required before claiming live axis wiring complete.
3. Prepare, but do not apply, a VERIFIED promotion packet for W04/CEO clearance.

Acceptance criteria:

Victor can open `https://flowai-dun.vercel.app`, see four independent axis selectors in the sidebar, change each one, launch a forge run, and see the run log confirm all four normalized axis values were used.

## Milestone 2 - VERIFIED Promotion First Batch

After Milestone 1 CT2 PASS, prepare a claim-promotion packet for explicit W04/CEO clearance. The packet should cover only claims with independent evidence:

- Migration path deployed URL: `https://saige-v2.vercel.app`, already CT2 PASS at the URL-evidence level.
- Each axis behavior confirmed in a live run.
- Codex TIM Build rank/callability confirmed in a live run, if CT2 observes it.

Each candidate entry requires:

- `evidenceUrl`: live URL, production run transcript, or durable proof artifact.
- `verifiedAt`: date/time of CT2 or production confirmation.
- `verifiedBy`: CT2 browser acceptance, production run log, or named reviewer evidence.
- Evidence label: `LIVE_PRODUCTION` or `LIVE_PREVIEW`.

Do not apply any VERIFIED entry without W04/CEO clearance. Target after clearance: 5-8 VERIFIED entries, only if each entry has evidence.

## Milestone 3 - Clerk Auth

`clerkReady` is currently not confirmed true in production. No real external user path is complete until Clerk is live.

Steps:

1. Check Doppler for `CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` under `flowai/prd`.
2. If keys exist, add them to Vercel production env vars and redeploy.
3. If keys do not exist, document exact Clerk setup steps and signal W04 for Victor action.
4. After keys are live, verify `/api/health` reports `clerkReady:true`.
5. Dispatch CT2 to confirm a new-user sign-up flow works end to end.

Credential discovery can run as a non-code audit while another milestone waits on deployment, but no unrelated runtime branch should start until Milestone 1 is closed.

## Milestone 4 - All Three Flow Hub Paths Producing URLs

Path 1 - Migration: SAIGE.

- Status: URL milestone complete.
- Confirmed URL: `https://saige-v2.vercel.app`.
- Boundary: remaining SAIGE typecheck debt is tracked separately and does not erase the URL evidence. Do not overclaim migration completion beyond the CT2-confirmed public URL.

Path 2 - Production: app-layer-owned product.

- Preferred target: migrated `saige-v2.vercel.app`, because the codebase is app-layer owned and should not hit the Base44 platform boundary.
- Target: forge scores it, proposes app-layer fixes, creates a GitHub branch, deploys a preview URL, and records honest governance evidence.
- Accept `HONEST_GATE_REFUSAL` if the score is already high enough and the forge correctly declines mutation. That is correct behavior, not a failure.
- If `saige-v2` is too high-scoring for Production to act, identify a real public product with genuine app-layer issues. Do not fabricate a low-scoring product.

Path 3 - Fresh Build.

- Enable `FLOWAI_ENABLE_FRESH_BUILD=true` in Vercel production env before live proof.
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
- Anything outside this directive.
- Path 4 three-URL synthesis approval.

Everything else runs autonomously under CTO supervision.

## Session Ritual

Session start:

1. Read `docs/cto/current-directive.md`.
2. Read `docs/cto/session-brief.md`.
3. Pull current main.
4. Confirm production SHA matches main HEAD.
5. Check CB2/CT2 evidence for open regressions.
6. Continue from exactly where the last session ended.

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
