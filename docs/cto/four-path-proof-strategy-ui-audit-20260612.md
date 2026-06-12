# FROM: CTO
# TO: W04 / Victor Udo, FNSE, PhD - CEO
# ACTION: Four-path proof strategy, canonical path audit, and Flow Hub UI audit

Date: 2026-06-12
Repo: `C:\Users\victo\Downloads\truthful-flow-logic-lab`
FlowAI production: `https://flowai-dun.vercel.app`
Production commit verified before execution: `21109fee0ae30d381923d4422da3f107d41cd8a1`

## Executive Status

W04/CEO cleared tonight execution for the four-path proof strategy. Hard stops remain:

- No canonical SSOT amendment without Victor.
- No VERIFIED movement.
- No new product or business-direction decision outside the four-path strategy.
- All evidence must remain honest: fallback/context URLs are never observed delivery URLs.

## Governing Docs Read

Read and used:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`

Key governing references:

- Canonical input modes: `docs/CANONICAL_REFERENCE.md:104-111`
- Output contract: `docs/CANONICAL_REFERENCE.md:185`
- Tool Intelligence axis: `docs/CANONICAL_REFERENCE.md:376`
- System Operation axis: `docs/CANONICAL_REFERENCE.md:452`
- Locked Rule 4: `docs/CANONICAL_REFERENCE.md:1253`
- Evidence standards: `docs/IMPLEMENTATION_PLAN.md:43-50`
- Production identity proof requirement: `docs/BUILD_PROTOCOL.md:85-92`

## Task 1 - Canonical Name And Definition Of Paths

### Canonical correction

The SSOT does not ratify exactly three "Flow Hub paths" named Production, Migration, and Fresh Build.

The canonical operator-facing workflow categories are four input modes:

1. `Clone & Improve` - single URL, crawl, audit, enhance, redeploy.
2. `Describe & Build` - natural language, generate from scratch.
3. `Paste / Upload` - text plus screenshots, reconstruct and build.
4. `Synthesize & Build` - 2-5 URLs, comparative scoring, best-feature extraction, synthesis composition.

Source: `docs/CANONICAL_REFERENCE.md:104-111`.

`Fresh Build` is an implementation/UI label currently used for the generate-from-scratch pipeline (`Feature Extractor`, `Design Synthesizer`, `Codebase Generator`). It maps most closely to canonical `Describe & Build` / `generate-from-scratch`, but the exact label `Fresh Build` is not the canonical SSOT name for a third path. If the product direction is to expose "Fresh Build" as a top-level Flow Hub path, the minimum-safe label is:

`Describe & Build (Fresh Build)`

That avoids canonical drift while keeping the operational language Victor and W04 are using tonight.

### Path definitions

`Production / Clone & Improve`: FlowAI takes an existing product URL, crawls and audits it, applies the 8-step forge pipeline, attempts safe source changes through the registered upgrade target, deploys a separate preview/upgrade URL, re-scores, writes governance/ProductSSOT evidence, and never destructively modifies the input URL.

`Migration`: FlowAI treats the input as a platform-dependent product that needs a standalone v2 codebase. It reads the source/baseline as rollback context, writes only to an authorized upgrade target, removes platform dependencies such as Base44, verifies lint/build/typecheck/deploy, and outputs a standalone deployed URL when migration succeeds.

`Describe & Build (Fresh Build)`: FlowAI takes a natural-language/product-context brief, or a URL-derived feature inventory when using the current implementation, generates a platform-free codebase from scratch, writes it to an authorized upgrade repo, and deploys a new URL. Current production implementation requires `FLOWAI_ENABLE_FRESH_BUILD=true` and a registered product config with `upgrade_repo`.

`Synthesize & Build`: FlowAI takes 2-5 public URLs from related but distinct sources, extracts the best product features and service patterns, synthesizes a new product specification/codebase, and should deploy a new URL. This is canonical, but current `run-construction` accepts a single `url`, so full multi-URL synthesis execution is not yet wired through the construction endpoint.

### Does each path produce a new deployed URL?

Canonical answer: yes for web/SaaS/generic URL target classes. The output contract requires a hosted deployable URL at Step 5 for those target classes (`docs/CANONICAL_REFERENCE.md:185-195`).

Current implementation status:

- Production / Clone & Improve: intended to produce a new deployed URL. Recent SAIGE platform-boundary runs correctly block instead of inflating fallback URLs.
- Migration: intended to produce a standalone deployed URL. Current SAIGE migration branch still contains Base44 dependencies and must be cleaned before this can count.
- Describe & Build / Fresh Build: intended to produce a new deployed URL, but blocked unless the input maps to a registered `upgrade_repo`.
- Synthesize & Build: canonical URL output required, but full multi-URL construction execution is not wired in current `run-construction`.

## Task 2 - Four-Axis UI Clarity Audit

Live target audited:

- URL: `https://flowai-dun.vercel.app/flow-hub/production`
- Production health during audit: `21109fee0ae30d381923d4422da3f107d41cd8a1`
- Screenshot artifact: `C:\Users\victo\Documents\Codex\flowai-verification\flow-hub-production-ui-audit-20260612.png`
- JSON text artifact: `C:\Users\victo\Documents\Codex\flowai-verification\flow-hub-production-ui-audit-20260612.json`

### Source findings

Sidebar Flow Hub exposes only:

- `Production`
- `Migration`
- Forge step links

Source: `src/components/layout/Sidebar.jsx:77-94`.

LandingPage exposes operation mode and depth inside page cards, not sidebar controls:

- Depth list: `src/pages/LandingPage.jsx:30`
- Header hardcodes `Mode: Supervised`: `src/pages/LandingPage.jsx:933`
- Operation mode section: `src/pages/LandingPage.jsx:1060`
- Analysis Depth nested under Auto only: `src/pages/LandingPage.jsx:1082-1088`
- Fresh Build card: `src/pages/LandingPage.jsx:1134-1163`
- Migration card: `src/pages/LandingPage.jsx:1171-1178`

### Live UI findings

Live sidebar text observed:

`FLOW HUB -> Production, Migration, Research Forge, Design Forge, Build Forge, Quality Audit, Deploy Forge, Self-Renewal Forge, GTM Forge, Monitor Forge`

Live body text observed:

- `Flow Hub - Production`
- `Mode: Supervised`
- `Auto`, `Guided`, `Manual`
- `Analysis Depth`: `Quick`, `Standard`, `Deep`
- `Fresh Build` marked `EXPERIMENTAL`
- `Fresh Build is off by default. Victor must enable FLOWAI_ENABLE_FRESH_BUILD before execution.`
- `Migrate`

### Axis assessment

| Axis requested by W04 | Current sidebar status | Current page status | Assessment |
|---|---:|---:|---|
| Structural Layer: Autonomous / Supervised / Controlled | Missing | Header says `Mode: Supervised`; no independent selector | Missing as an independent control. Also requires canonical-label mapping because SSOT locks current user-facing axes to AUTOMATIC / GUIDED / MANUAL. |
| Operational Mode: Auto / Guided / Manual | Missing | Present as page-local cards | Present but not sidebar-level and not canonical casing. |
| Analysis Depth: Quick / Standard / Deep | Missing | Present only under Auto card | Present but buried and coupled to Auto UI. |
| Flow Hub Path: Production / Migration / third path | Partial: Production + Migration only | Fresh Build + Migrate cards inside page | Missing third path in sidebar; canonical fourth path (`Synthesize & Build`) missing from this Flow Hub surface. |

### Can Victor change any axis independently without restarting or navigating away?

No, not fully.

- Operation mode can be changed page-locally.
- Analysis depth can be changed page-locally only inside the Auto card.
- Flow Hub path requires sidebar navigation for Production/Migration and page-local card selection for Fresh Build/Migrate, so it is split across two patterns.
- Structural Layer is not independently selectable.
- Tool Intelligence and System Operation are canonical independent axes, but the UI does not present both as independent sidebar controls.

### Is the distinction between paths clear to a first-time user?

Not yet.

The page says Production is the "standard product upgrade flow," Migration is standalone v2/platform dependency work, and Fresh Build creates a platform-free codebase. That is directionally useful, but it is not organized as a stable, independent path selector and does not explain the canonical relationship among Clone & Improve, Describe & Build, Paste/Upload, and Synthesize & Build.

### Recommended UI changes for CB dispatch

Add a persistent `Flow Controls` section to the sidebar, under `FLOW HUB`, with compact segmented controls:

1. `Flow Hub Path`
   - `Production / Clone & Improve`
   - `Migration`
   - `Describe & Build / Fresh Build`
   - `Synthesize & Build`

2. `Tool Intelligence`
   - `AUTOMATIC`
   - `GUIDED`
   - `MANUAL`

3. `System Operation`
   - `AUTOMATIC`
   - `GUIDED`
   - `MANUAL`
   - Optional helper text/tooltips may mention historical aliases only where useful: autonomous/supervised/manual.

4. `Analysis Depth`
   - `Quick`
   - `Standard`
   - `Deep`

Implementation notes:

- Persist selections in URL query params and localStorage, e.g. `flowPath`, `toolMode`, `operationMode`, `depth`.
- Feed the selected values into `LandingPage`, `RunConstructionPanel`, and request payloads.
- Add routes or query-backed state for `/flow-hub/describe-build` and `/flow-hub/synthesize` if route clarity is preferred.
- Do not use "Controlled" as a new canonical user-facing label unless Victor amends SSOT. If kept for an internal structural-layer concept, show it as an implementation-level label with a clear canonical mapping.
- Include source-level tests for query/localStorage persistence and UI tests for no overlap on desktop/mobile.

## Task 3 - Four-Path Proof Strategy

### Cross-cutting TIM Build amendment

W04 added a required Tool Intelligence Marketplace correction on 2026-06-12: Codex must be present as the rank-1 callable Step 3 Build candidate.

This is now part of the four-path proof strategy:

- every path that reaches Step 3 Build must record the Build candidate list
- Codex must appear as rank 1
- Codex must rank above Claude Code, Cursor, Bolt, Windsurf, Replit, and Base44
- if Step 3 dispatches a build action, the evidence must identify whether Codex actually produced the accepted output
- fallback or context-only execution must not be labeled as Codex-built evidence

Planning packet:

- `docs/cto/tim-codex-build-tool-amendment-plan-20260612.md`

CB dispatch packet:

- `docs/cto/cb-tim-codex-build-tool-dispatch-20260612.md`

No canonical amendment or VERIFIED movement is made by this planning update.

### Path 1 - Migration: SAIGE

Status: in progress.

CB dispatch issued to worker agent `019eba14-6597-7bf2-9fca-9fed8777eb73` (`Harvey`).

Worktree:

`C:\Users\victo\Documents\Codex\saige-v2-migration-inspect`

Branch at dispatch:

`flowai/migration-saige-1781139104798-ctosaige`

HEAD at dispatch:

`e11c1643dc4b320b27e8db6ae2c1724010e5b507`

Observed before dispatch:

- `rg -n "base44|Base44|@base44|base44\\." -S .` returned 1220 matching lines in the current migration branch.
- Major runtime dependencies remain in `vite.config.js`, `package.json`, `package-lock.json`, `src/api/base44Client.js`, many `src/pages/*`, `src/components/*`, and `base44/functions/*`.

Target:

- Clean migrated branch on `veu-ai-studio/saige-v2`.
- Remove Base44 platform dependencies.
- Lint/build/typecheck pass or exact remaining failures documented.
- Produce or trigger deployed URL if Vercel can build the branch.

### Path 2 - Production: SAIGE migrated codebase

Gate:

- Do not run until Path 1 produces a clean enough `saige-v2` deployed URL or explicit branch/preview target.

Execution target:

- Use the migrated `saige-v2` URL, not `https://saigeplatform.com`.
- Run Production / Clone & Improve mode.
- Expected outcome: no `PLATFORM_BOUNDARY_BLOCKED` because `saige-v2` is app-layer owned and should not hit the original SAIGE platform boundary.

Proof fields:

- Branch creation observed.
- Preview deployment observed.
- Post-fix scoring observed.
- Governance write observed.
- ProductSSOT persistence observed.
- No VERIFIED movement.

### Path 3 - Describe & Build / Fresh Build: VEU AI Studio website

Source inputs:

- `https://victorudo.com` - public content identifies VictorUdo.com as a personal brand/advisory platform for Dr. Victor Udo spanning sustainability, decarbonization, AI, and community leadership.
- `https://flowai-dun.vercel.app` - FlowAI production app; live UI and health verified tonight.

Draft product description:

Build an upgraded VEU AI Studio website that presents Victor Udo, FNSE, PhD and VEU AI Studio as the executive studio behind FlowAI and the five flagship products. The site should combine Victor's public credibility in sustainability, decarbonization, AI, advisory work, books, speaking, and community leadership with FlowAI's product-agnostic AI operating system promise: research, design, build, audit, deploy, self-renew, go-to-market, and monitor improvements for underserved individuals and organizations globally. The output should be a platform-free, fast, accessible website with clear studio positioning, proof-led product portfolio, responsible AI/compliance language, founder biography, advisory/contact paths, and no fabricated certifications or customer claims.

Current execution blocker:

`run-construction` Fresh Build currently requires an input URL that resolves to a registered product config with `upgrade_repo`. `victorudo.com` and `flowai-dun.vercel.app` are not registered in `src/lib/products/registeredProductConfig.js`; only SAIGE currently has an `upgrade_repo`. Without adding a VEU website product config and authorized upgrade repo, Fresh Build can generate internally but cannot write/deploy a URL.

Allowed next action tonight:

- Run a bounded Fresh Build probe against `https://victorudo.com` to capture exact blocker if time permits.
- Do not claim Path 3 deployed URL unless a real `previewUrl` is returned and browser-access verified.
- Adding a new VEU website registry entry/repo should be treated as a business/product direction decision unless W04/CEO explicitly treats the Path 3 directive as sufficient authorization for that repo.

### Path 4 - Three-URL synthesis: new product

Hard-stop note:

This path creates a new product direction. W04/CEO authorized the four-path strategy, but the standing hard stop still says new product/business direction decisions require Victor. Therefore tonight can prepare candidates and, if FlowAI has a synthesize endpoint, run a non-committal proof only when the output is clearly labeled candidate/prototype and no deploy claim is made without approval.

Candidate URLs selected:

1. `https://www.usa.gov/benefits`
2. `https://www.211.org/`
3. `https://www.needhelppayingbills.com/`

Crawlability:

- All three rendered as public text sources through browser/web fetch during CTO review.

Synthesized product:

`AidNavigator` - a plain-language assistance navigator for underserved households that combines official benefit categories, local 211 referral pathways, and practical bill/rent/food/utility assistance preparation. It would ask for location, household situation, and urgency; produce a prioritized action plan; show required documents; warn about scams; and provide SMS-friendly next steps.

Why useful:

- Real users often know they need help but do not know whether to start with federal benefits, local emergency services, nonprofit/faith assistance, or utilities/rent/food programs.
- The synthesis is coherent: official eligibility pathways + local referral pathways + practical application preparation.
- It aligns with FlowAI's underserved mission while remaining distinct from VEU properties.

Current execution blocker:

`run-construction` currently accepts a single `url`, not a 2-5 URL synthesis payload. Full Path 4 execution likely needs a UI/API dispatch for canonical `Synthesize & Build` wiring before it can produce a deployed URL via FlowAI itself.

## Tonight Execution Order

1. Finish Path 1 SAIGE migration branch as far as possible.
2. If Path 1 produces a deployed `saige-v2` URL, run Path 2 proof against that URL.
3. Run or prepare Path 3 Fresh Build probe only after Path 1/2 critical path is moving.
4. Keep Path 4 as candidate/prototype planning unless W04/CEO confirms the business-direction decision for the synthesized product.
5. Commit all evidence to `docs/cto/`.
6. End with `docs/cto/session-brief.md` so Victor reads one morning document.

## Claim Impact

- Mocked tests used: no for this audit packet.
- Unmocked runtime proof: yes for production health and live UI text/screenshot.
- Production URL serving HEAD commit SHA verified: yes, `/api/health` reported `21109fee0ae30d381923d4422da3f107d41cd8a1`.
- Proof labels used: LIVE_PRODUCTION for UI/health audit; CODE for source inspection.
- Evidence tier claimed: none for VERIFIED; audit evidence only.
- Claim impact: no movement.
- VERIFIED movement: no.
