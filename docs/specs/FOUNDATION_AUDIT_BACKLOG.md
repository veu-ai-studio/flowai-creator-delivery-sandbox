# FOUNDATION AUDIT BACKLOG — "sounds-done-isn't" gaps

**Author:** W2, 2026-05-16.
**Scope:** read-only diagnostic compilation. Cross-references docs/CANONICAL_REFERENCE.md (SSOT W04-Rev-2.1, ENTRY 006), docs/CANONICAL_HISTORY.md, docs/specs/*, docs/panel-consultations/*, src/lib/agents/, api/. No code changed by this dispatch; this is the inventory document only.
**Status:** working document. Each row should be amended when a gap is closed (move to "Closed this session" or to a session-specific log).

## Reading guide

Every gap below is one of:
- **WIRING** — code exists, just mis-routed or not invoked from the assessment path.
- **UNBUILT** — no code exists for the named function.
- **PARTIAL** — scaffolding/skeleton exists, but the load-bearing behaviour is incomplete.
- **SPEC-ONLY** — a canonical spec exists, no code path of any kind references it.

Priority tiers:
- **P0** — blocks Phase 3 (the auth-traversal + multi-page Conductor production cut promised under Master Phased Build).
- **P1** — blocks Self-Renewal (the fork-and-fix loop the SSOT marks as the externalised output path).
- **P2** — blocks the agent waves (the 20 DORMANT agents that the SSOT roster ratifies but the codebase does not invoke).
- **P3** — roadmap items that are tracked but not on the critical path.

---

## P0 — Phase 3 blockers

### P0-1. §6 authenticated crawl traversal — UNBUILT
**SSOT:** CANONICAL_REFERENCE.md §6 line 92 *"Authenticated + unauthenticated paths"*; §6 lines 94-104 interaction pass #2 *"Auth handling — if `sessionStorageState` is set… attempt one credentialed login, save updated `storageState`, retry render"*; §6 line 110 credential handling.
**Spec:** `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` (frozen at v3 per CEO decision 2026-05-16; awaits W6 adversarial Panel re-ratification before Phase 3 implementation).
**Code reality:** `api/_lib/crawler.js:423` references `storageState` in a comment only; `api/_lib/inputAdapters/description.js:40-41` defines `loginEmail`/`loginPassword` JSDoc shape but nothing consumes it. `richCapture()` does `page.goto(target, { waitUntil: 'networkidle2' })` then DOM scrape with zero login logic. Phase 1 (commit `83fb20a`) marks `authGated: true` and continues without attempting login.
**Why P0:** the SSOT specifies authenticated full-product crawling as the assessment contract for §11 Clearance Step 5; without it the 5-VEU-product run cannot reach behind login walls. Phase 3 implementation is gated by the spec being re-ratified.

### P0-2. ProductSSOT entity (§7.5) — UNBUILT (no code surface)
**SSOT:** CANONICAL_REFERENCE.md §7.5 lines 136-156 ("Six canonical blocks per ProductSSOT row"); §7 Output Contract item #5 line 132 ("atomically with the rest of the output contract"); §13.1 lines 395-409 (`/product-ssot/:productId` UI surface); §28 Symbiotic Feed-Back Loop (consumes ProductSSOT pre-run).
**Code reality:** `ls src/lib/productSSOT` → no such directory. `ls src/pages/ProductSSOT*` → no file. `ls api/product-ssot` → no such directory. The `ProductSSOT` string appears in agent comments only ("Phase 2-3 will when ProductSSOT writes graduate" — `api/research-url.js:27`). Zero read/write code.
**Why P0:** §7 Output Contract item #5 is mandatory and atomic. Every pipeline run that produces an output SHOULD write a `delta_log` entry to ProductSSOT and the entire run is rolled back if the write fails. Today every run silently completes without the write. The §11 Clearance Step 5 four-prerequisite gate is unenforceable without it. §28 (Agent #6 reads ProductSSOT to narrow crawl scope) is also blocked.

### P0-3. §7.6 GTM Readiness Report scoring formula — UNBUILT
**SSOT:** CANONICAL_REFERENCE.md §7.6 lines 161-170 (formula `100 − 10·crit − 5·high − 2·med − 0.5·low` clamped to [0,100]); §7.6 lines 174-181 (4 bands: Showcase-ready / Demo-ready / Internal-only / Not demo-ready).
**Code reality:** `grep -rn "100.*10.*crit\|count_critical\|severity_weight" src/ api/` → matches only in `docs/CANONICAL_REFERENCE.md` and `docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md`. No production code computes the 100-point demo-readiness score from issue counts. The Defect B computer (`src/lib/operationsEngine.js:732 computeMonitorClearance`) sums LLM-supplied per-layer scores on the legacy /50 scale, not the §7.6 100-point issue-count formula.
**Why P0:** §7.6 is the canonical demo-readiness scoring formula; the Monitor /50 layer-summing is a legacy aggregate. §11 Clearance Step 5 prerequisite #2 says *"Report score ≥75 (Demo-ready band)"* — that's the 100-point score, not the /50. Without the formula computed against real issue detector output, the §11 four-prerequisite gate is bypassed by the Monitor's tri-band code-computed verdict.

### P0-4. Agent #21 Aggressive Crawl Conductor — PARTIAL (Phase 1 only)
**SSOT:** CANONICAL_REFERENCE.md §15.1 row 21 line 479 (step-owner; consumes `1.crawl.request.v1` / `10.ssot.updated.v1`; produces `21.crawl.completed.v1` / `21.issues.detected.v1` / `21.gtm.readiness.v1`; writes ProductSSOT `architecture_snapshot` + `governance_record`).
**Spec:** `docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md`.
**Code reality:** Phase 1 wiring shipped this session — `src/lib/agents/agents/Agent21AggressiveCrawlConductor.js` + `api/research-url.js:23-89` route through `conductCrawl()` → `aggressiveCrawl()`. Production probe confirms 47-page BFS on `ourpublishingai.com` (depth 8, pages 200, durationMs 113434). HOWEVER: the conductor uses memory-only stubs for MessageBus and AuditLog (`api/research-url.js:30-31`); no real `21.crawl.completed.v1` / `21.issues.detected.v1` / `21.gtm.readiness.v1` topic emission; no ProductSSOT writes (per P0-2 — there's nothing to write to); no `1.crawl.request.v1` consumption from AutoRunner (the AutoRunner calls `/api/research-url` HTTP, not a topic dispatch).
**Why P0:** Phase 1 closed the single-page → multi-page gap, but the agent contract (MessageBus topics, ProductSSOT writes, escalation rules in row 479) is unmet. SSOT row 479 still reads *"DORMANT (charter ratified; engineering wire-in pending)"* — the wire-in is Phase-1-complete-only.

### P0-5. §7 Output Contract item #5 (atomic ProductSSOT write) — UNBUILT
**SSOT:** CANONICAL_REFERENCE.md §7 line 132 *"The write is **atomic** with the rest of the output contract: a run that produces a renewed URL but fails to update ProductSSOT is considered INCOMPLETE and rolled back"*.
**Code reality:** no atomic write, because P0-2 is unbuilt. Every renewal run today (and every assessment run) produces outputs WITHOUT the atomic ProductSSOT write, then doesn't roll back because there's nothing to roll back.
**Why P0:** direct dependent of P0-2. Closes once ProductSSOT writes exist + are wired into AutoRunner.jsx + api/renew.js + Agent #21 conductCrawl().

---

## P1 — Self-Renewal blockers

### P1-1. Agent #3 Self-Renewal fork-and-fix loop — PARTIAL
**SSOT:** CANONICAL_REFERENCE.md §15.1 row 3 line 461 *"SHIPPED-GREEN (commit `68a0c75`); fork-and-fix graduation spec drafted at `docs/specs/SELF_RENEWAL_AGENT_SPEC.md`"*. §6 Resolution contract lines 113-120 (terminal-decision loop: detect → fork-and-fix → re-test → confirm clean).
**Spec:** `docs/specs/SELF_RENEWAL_AGENT_SPEC.md`. Blueprint reverse-engineered at `docs/specs/agent-blueprints/AGENT_03_SelfRenewal.md` (W5a commit `d182549`).
**Code reality:** `src/lib/agents/agents/Agent3SelfRenewal.js` and `src/lib/agents/agents/Agent3SelfRenewalExecutor.js` exist. The renewal pipeline (`api/renew.js` → `api/_lib/inputAdapters/url.js` → `api/_lib/renewalEngine.js`) produces renewed Vercel preview URLs. BUT: the **full crawl → detect → fix → re-crawl → confirm-clean loop is not closed end-to-end** per §4 L3 line 72 *"PARTIAL — fork-and-fix live; full crawl-fix-redeliver loop awaits Agent #3 graduation"*.
**Why P1:** the §6 *"Loop: crawl → detect → propose fix or gate decision → execute → re-test → confirm clean OR record gated/documented terminal decision"* is what makes FlowAI's commercial promise work. Today the components exist but the loop's terminal-decision verification on the renewed URL doesn't gate output delivery.

### P1-2. §28 Symbiotic Feed-Back Loop — UNBUILT (depends on P0-2 + DORMANT agents)
**SSOT:** CANONICAL_REFERENCE.md §28 lines 1057-1095. §28.1 pre-pipeline-run read from ProductSSOT; §28.2 Agent #6 crawl-scope narrowing per architecture_snapshot; §28.3 admin overrides as CEO-equivalent.
**Code reality:** no ProductSSOT (P0-2) means nothing to read. Agent #6 is DORMANT (P2-1) so crawl-scope narrowing has no consumer. Admin override semantics (§7.5 line 407 "override_entry" append-only audit trail) have no UI surface or code path.
**Why P1:** §28 is the canonical fidelity/cost mechanism (line 1080: *"both a cost optimisation + a fidelity improvement"*). Without it, every run does full re-discovery and the per-run cost ceiling (§6 line 108 $15/run) is hit unnecessarily on every cycle.

### P1-3. §11 Clearance Step 5 four-prerequisite gate — PARTIAL
**SSOT:** CANONICAL_REFERENCE.md §7.6 lines 185-191 (the four prerequisites: GTM Readiness Report exists; score ≥75 + zero critical; Self-Renewal terminal-decision on ≥high findings; LIMITATIONS section published).
**Code reality:** `src/components/clearance/ClearanceWizard.jsx` exists for the 6-step Clearance Protocol (LIVE per SSOT line 1012). BUT: the four prerequisites of Step 5 specifically aren't enforced because (a) §7.6 GTM Readiness Report isn't produced (P0-3), (b) zero-critical check needs the issueDetector output linked to clearance, (c) Self-Renewal terminal-decision check needs §28 + Agent #3 graduation (P1-1, P1-2), (d) LIMITATIONS verbatim publish hook isn't wired in delivery output.
**Why P1:** §11 Step 5 is the canonical demo-readiness gate. Today Step 5 surfaces a UI but doesn't enforce the actual blocking prerequisites the SSOT names.

### P1-4. Agent #21 MessageBus topic emission — UNBUILT
**SSOT:** CANONICAL_REFERENCE.md §15.2 ENTRY 006 line 505 (the 4 new topics).
**Code reality:** `api/research-url.js:30` instantiates the Conductor with `messageBus = { publish: async () => {}, subscribe: () => () => {} }` — a no-op stub. None of `21.crawl.completed.v1`, `21.issues.detected.v1`, `21.gtm.readiness.v1`, or `1.crawl.request.v1` are produced or consumed in production. The real MessageBus exists at `src/lib/agents/MessageBus.ts` but isn't wired to the api/* handlers.
**Why P1:** the MessageBus is the cross-agent integration substrate. Without real topic emission, Agent #10 customer-signal ingestion can't ingest, Agent #17 deprecation proposals can't trigger, Agent #26 auto-admission can't observe candidate metrics.

### P1-5. Agent #6 Research step-owner — DORMANT (WIRING gap)
**SSOT:** CANONICAL_REFERENCE.md §15.1 row 6 line 464 *"DORMANT — block-semantic on content-insufficient already wired (commit `0fc8851`)"*.
**Code reality:** Step 1 Research is invoked via `/api/research-url` → Claude analysis prompt. The block-semantic IS wired per `src/lib/runner/blockGate.js`. But the Agent #6 charter (read ProductSSOT pre-run, narrow crawl scope, produce `1.crawl.request.v1`, write `architecture_snapshot` deltas) has no code path.
**Why P1:** §28's crawl-scope narrowing (P1-2) flows through Agent #6. Without Agent #6 graduation, every run is full re-discovery.

---

## P2 — Agent wave blockers (20 of 26 agents still DORMANT)

The SSOT (§15.1 lines 459-487) lists 26 agents. **5 are SHIPPED-GREEN** (#1 Lifecycle, #2 Code Builder, #3 Self-Renewal, #4 Provider Onboarding, #5 End-Customer Intake). **1 is Phase-1-wired this session** (#21 Aggressive Crawl Conductor, partial per P0-4). **20 are DORMANT.** Each DORMANT row below is its own engineering task; consolidated here so the audit shows the full surface.

### P2-1. Agent #6 Research — DORMANT
See P1-5. WIRING gap (block-semantic exists; agent charter doesn't).

### P2-2. Agent #7 Design — DORMANT
**SSOT:** §15.1 row 7 line 465. Step 2 Design owner. UNBUILT.

### P2-3. Agent #8 Quality Audit — DORMANT
**SSOT:** §15.1 row 8 line 466 *"owns the 5-dimension scoring engine per §10"*; §10 line 296 *"5-dimension scoring (UI/UX, API, Logic, Business Value, Security Posture — per Sprint PROTECT-1 Phase 5). 95/95 threshold per dimension."*
**Code:** `src/lib/governance/ScoreEvaluator.js` (CLEARANCE_THRESHOLD=95, the 95/95 threshold helper) exists and is consumed by the audit machinery in `src/lib/audits/*`. The /50 Monitor scoring (Defect B fix) is the AutoRunner display path, NOT the Sprint PROTECT-1 Phase 5 95/95 path. UNBUILT in the AutoRunner critical path.
**Why P2:** the 95/95 governance threshold is the canonical clearance gate. Today the AutoRunner shows a /50 verdict; ScoreEvaluator's /95 verdict isn't shown to the operator. Mis-route, partial.

### P2-4. Agent #9 Go-to-Market — DORMANT
**SSOT:** §15.1 row 9 line 467. Step 7 GTM. UNBUILT.

### P2-5. Agent #10 Monitor + customer signals — DORMANT (CA-9-C)
**SSOT:** §15.1 row 10 line 468 *"per CA-9-C (ENTRY 005): charter expanded to ingest three customer signal channels — in-app 'Report an issue' widget (POST `/api/customer/feedback`); app-store / public review scraping via `orchestra.dispatch('crawl', ...)`; support-ticket webhooks at `/api/customer/support-ticket-webhook`"*.
**Code reality:** no `/api/customer/feedback` route, no `/api/customer/support-ticket-webhook` route, no app-store scraping invocation. UNBUILT.
**Why P2:** the symbiotic loop (P1-2) consumes `10.customer.issue.v1` to escalate severity. Without it, customer-reported issues don't influence Self-Renewal severity heuristics.

### P2-6. Agents #11, #12, #14, #16, #18, #19, #20 (FlowAI-only / cross-step) — DORMANT
SSOT §15.1 lines 469-486. Each charter exists; no executor code. UNBUILT.

### P2-7. Agent #13 Self-Protection orchestrating layer — DORMANT
**SSOT:** §15.1 row 13 line 471; §20 line 770 *"Agent #13 Self-Protection Agent (orchestrating, §15 row 13) … DORMANT — awaits OrchestratorHub wire-in"*.
**Code reality:** the EMBEDDED Self-Protection (edge defense, robots.txt, scraper blocking, session cipher, bot detection, content-protection CSS — §20 line 769) is LIVE in every product runtime. The ORCHESTRATING agent layer (DMCA workflows, clone detection across catalog, Cloudflare Bot Management updates) is UNBUILT. These are different layers per §20.1 reconciliation.
**Why P2:** portfolio-level threat response (DMCA, clone detection) requires this. Embedded protection is product-local.

### P2-8. Agent #15 Benchmarking + Agent #17 Product Evolution + Agent #26 Orchestra Research — DORMANT (CA-9 trio)
**SSOT:** §15.1 rows 15, 17, 26 (lines 473, 475, 484); §8.1 Orchestra Self-Expansion (ENTRY 005 CA-9-A).
**Code reality:** the CA-9 amendment is ratified; no executor code for the 4-condition auto-admission gate (rank_score ≥ 0.70, ≥30 invocations, capability-gap, no carve-out). No `community.signal.v1` ingester. No `15.benchmark.head_to_head.v1` producer. No `17.orchestra.deprecation_proposal.v1` producer. No `26.orchestra.*` (7 topics) producer.
**Why P2:** the canonical Orchestra evolution mechanism per CA-9. Today Orchestra is static; the SSOT says it should auto-curate.

### P2-9. Agents #22, #23, #24, #25 Ops Runners Beta/Gamma/Delta/Epsilon — DORMANT
**SSOT:** §15.1 rows 22-25 (lines 480-483). TBD step assignments; SSOT marks "step-owner (proposed)". UNBUILT.

### P2-10. Stripe Connect wiring for Agent #4 — PARTIAL (suspected)
**SSOT:** §3 line 47 *"Revenue tracked per provider via Stripe Connect (Agent #4 Provider Onboarding; DORMANT today)"*. §15.1 row 4 says Agent #4 is **SHIPPED-GREEN** — contradiction with §3.
**Code reality:** `src/lib/agents/agents/Agent4ProviderOnboarding.js` exists. Whether the Stripe SDK is actually wired into the deployed Vercel env (Stripe keys staged, webhook receiver, Connect Express flow) is not confirmed. The agent-wiring panel (panel-consultations/agent-wiring-priority-consultation-2026-05-13.md line 146) calls out *"deployed app shows onboarding is incomplete ('No products registered yet')"*.
**Why P2:** real onboarding gated by this; the commercial pricing model (§3) is unenforceable until provider+end-customer onboarding flows live.

---

## P3 — Roadmap items

### P3-1. Tool marketplace category count mismatch (§27 Open Question)
**SSOT:** CANONICAL_REFERENCE.md §27 line 1011 *"Tool Intelligence Marketplace (Sprint 8 — 65 tools / 12+1 categories) | LIVE per `src/lib/toolRegistry.js` (61 actual tools / 14 actual categories — see Open Questions §27)"*.
**Resolution path:** reconcile by updating the SSOT to the code-actual count, OR by extending `toolRegistry.js` to the SSOT-stated count. CEO decision.

### P3-2. CA-4 / CA-5 / CA-6 pending CEO disposition
**SSOT:** CANONICAL_REFERENCE.md §26 line 1018 *"CA-1 (9/10), CA-2 (8/10), CA-3 (8/8 engaged) ratified. CA-4 split 4/4 — CEO disposition pending. CA-5 below engagement floor — needs re-Panel. CA-6 SPLIT — REVISE AND RE-REVIEW"*.
**Resolution path:** CEO dispatch for each.

### P3-3. Multi-LLM routing decision engine (§27 Open Question #4)
**SSOT:** §27 line 1041 *"CANONICAL_REFERENCE Section 2 declares 'NO RECORD FOUND' for centralised routing logic"*. Open whether to build per Agent #4 graduation or defer.

### P3-4. Capability Transfer as L4 — completeness check (§27 Open Question #5)
**SSOT:** §27 line 1043. Open whether Capability Transfer is the canonical L4 surface for ALL future capabilities.

### P3-5. Orchestra Selection axis enum rename (§27 Open Question #6)
**SSOT:** §27 line 1045. Open whether to rename code enum strings ('guided'/'manual') to ('recommended'/'user-choice') or surface-only rename.

---

## Closed this session (2026-05-16 W2 dispatches)

These were active gaps before this session; resolved within it. Documented here for the audit trail; they do NOT block any tier above.

- **Tooltip case collision** — closed by commit `ef83dc3` (removed orphan radix `tooltip.jsx` + dead `sidebar.jsx`) and `2f438fc` (renamed Windows working-tree file to PascalCase to fix Vercel CLI upload).
- **Vite `@/` alias broken on Linux** — closed by commit `86c161f` (explicit `resolve.alias` with absolute path).
- **UI → dead Replit proxy on research path** — closed by commit `c770c71` (`fetchPageContext` + LandingPage `testFetch` now both call `/api/research-url`).
- **`CrawlerQualityDot` undefined `.label` crash** — closed by commit `9b96a4d` (`'rich'` → `'full'` + defense-in-depth map fallback).
- **Defect A — crawler body truncation** — closed by commit `4b6293e` (4 truncation sites raised from 1500/8000/12000 → 50000 chars).
- **Defect B — score self-inflation** — closed by commit `1880333` (deterministic `computeMonitorClearance` + 11 regression tests; LLM no longer adjudicates).
- **Defect C — Monitor step non-independence** — closed by commit `79b0053` (prior step `full_output`s threaded into Monitor prompt).
- **Single-page → multi-page assessment path** — closed by W5a commit `83fb20a` (Agent #21 Conductor wraps `aggressiveCrawl`; `/api/research-url` routes through it; production probe confirms 47-page crawl on `ourpublishingai.com`).

---

## Summary count

| Tier | Count |
|---|---|
| P0 — Phase 3 blockers | 5 |
| P1 — Self-Renewal blockers | 5 |
| P2 — Agent wave blockers | 10 (1 condensed row covering 7 agents) |
| P3 — Roadmap | 5 |
| Closed this session | 8 |

**Total open gaps:** 25 distinct items (P0+P1+P2+P3). **Architectural surface remaining:** the 20 DORMANT agents collapse the per-row P2 count, but each is a real engineering task — true open work is closer to 35-40 tasks when each P2 sub-row is broken out.

---

## Methodology + scope of evidence

- SSOT quotes verified by direct file read on commit `c770c71`+ session (HEAD `c770c71..` at time of writing).
- Code presence/absence checks via `grep -rn`, `ls`, and direct Read of relevant files.
- Panel consultation themes cross-checked against `docs/panel-consultations/agent-wiring-priority-consultation-2026-05-13.md` (the canonical priority panel for this question).
- "Sounds-done-isn't" is the failure mode this audit is designed to catch: SSOT marks something LIVE / ratified / shipped but the executor is a stub OR mis-routed. Each gap above quotes the SSOT and points at the file:line where the code does (or doesn't) exist.

No gaps invented. Every row is verifiable against the SSOT + code at the cited refs.
