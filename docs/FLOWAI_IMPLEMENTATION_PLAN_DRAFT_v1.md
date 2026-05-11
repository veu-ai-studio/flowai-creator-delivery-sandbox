# FlowAI Implementation Plan — Draft v1 (Layer 2)

**Status:** DRAFT, pending CEO approval (same pattern as Layer 1 SSOT promotion flow).
**Source:** Synthesis of 5-reviewer Layer 2 panel from `docs/implementation-review/layer2-impl-panel-review-2026-05-11.md`.
**Reviewers:** Slot 1 = Claude Opus 4.7 · Slot 2 = GPT-5.5 · Slot 3 = Gemini 2.5 Pro · Slot 4 = Perplexity Sonar Pro Search · Slot 10 = GPT-4o (web-grounded).
**Consensus rule:** ≥3 of 5 reviewers in agreement = consensus. Split decisions are surfaced verbatim for CEO disposition. Each question records: (a) consensus answer, (b) majority CONFIDENCE level, (c) most-cited KEY ASSUMPTION, (d) DISSENT (one-line per diverging reviewer), and (e) CEO FLAG if the panel split.

Layer 1 anchor: **`docs/FLOWAI_SSOT.md`** (canonical) — every answer below has been checked against the Layer 1 SSOT and inherits its 4 CEO-resolved dispositions (25-agent roster, E4 ceiling/floor, MG2 simple ≥7/10, MG4 broad 12-item trigger list).

---

## PHASES + GATES (PG1–PG5)

### PG1. Phase structure

**CONSENSUS — 5-phase build from current state to full 25-agent production with all 5 products integrated.**

1. **Phase 1 — Foundation & Commercial Spine.** Substrate hardening (BaseAgent validator 20→25, Doppler live, Supabase RLS provisioned, audit-log durability) plus Agent #4 Provider Onboarding shipped with Stripe Connect sandbox-100%. Exit: substrate ready for multi-tenant traffic + #4 onboards a test provider with RLS isolation verified.
2. **Phase 2 — Pipeline Spine Activation.** Build #8 Quality Audit, #10 Monitor, #6 Research, #7 Design, #9 GTM. Exit: 8-step pipeline runs end-to-end on FlowAI itself; ≥95/95 audit on a self-test artifact; Agent #3 detects + proposes fix for a seeded P2 bug.
3. **Phase 3 — Embedded Faculties + Ops Runners Bootstrap.** Build #5 End-Customer Intake (depends on #4), #13 Self-Protection, #15/#17/#19/#20, plus first Ops Runners (#21 Pipeline/Crawl Conductor, #23 Cost Governor). Exit: tenant isolation re-verified under load; Cost Governor kill-switch validated; product crawl infrastructure capacity-proven.
4. **Phase 4 — Strategic Intelligence + Full Ops Runners.** Build #11, #12, #14, #16, #18 + remaining Ops Runners (#22, #24, #25). Exit: all 25 agents live; FlowAI runs continuous marketplace intelligence cycle; first Panel-orchestrated decision logged.
5. **Phase 5 — Five-Product Production Integration + Panel Self-Orchestration.** Per-product integration sprints in PI1 order; each gated by PI2. Exit: all 5 flagship products under continuous crawl + 12-agent embed; 6-step Clearance pass on each; 90 days clean Panel decisions; ready for Panel handover gate.

**CONFIDENCE:** HIGH (4 of 5).
**KEY ASSUMPTION:** Doppler + Supabase RLS + Stripe Connect provisioning can complete inside Phase 1 (≤4 weeks) — slip pushes everything right.
**Phase-count variance (DISSENT):** Slot 1 splits into 7 sub-phases (1.0/1.1/1.2/1.3/1.4/1.5/2.0); Slot 2 collapses into 6; Slot 3 into 4. The 5-phase shape above is the median + structurally consistent.

### PG2. Success criteria per phase gate

**CONSENSUS.** Every phase gate must show ALL of:

1. **Tests:** ≥95% statement coverage on new code, 100% on BaseAgent contracts, **zero regression** against the 879-test Phase 0 baseline.
2. **Governance:** ScoreEvaluator returns ≥95/95 on every shipped artifact; 6-step Clearance pass on phase deliverable.
3. **Operational:** Monitor 0–50 green for 7 consecutive days; MTTD <15 min on synthetic breakage injection (per CEO-pending quantified SLA).
4. **Authority compliance:** every shipped agent passes 100 sequential runs at RECOMMEND_ONLY with zero unauthorized side-effects in audit log.
5. **Rollback rehearsal:** rollback executed successfully against the phase artifact, audit-log entry `phase_rollback_rehearsal_{phaseId}` recorded.
6. **Phase-specific milestone:**
   - Phase 1: Agent #4 onboards a test provider via Stripe Connect with full RLS isolation.
   - Phase 2: full Auto-Runner pass on self-test artifact ≥95/95.
   - Phase 3: ≥18 of 25 agents live; cross-tenant contamination test passes (≥10 attack vectors).
   - Phase 4: first Panel-orchestrated decision recorded with quorum + evidence pack.
   - Phase 5: all 5 products green on continuous crawl ≥7 days.

**CONFIDENCE:** HIGH (5 of 5).
**KEY ASSUMPTION:** Quantified SLAs (MTTD/MTTR/RTO/RPO) get CEO sign-off as canonical numbers before Phase 1.0 — they are currently missing commitments per the Layer 1 SSOT.

### PG3. Rollback policy

**CONSENSUS — Three-tier rollback by granularity, chosen by failure type.**

- **Per-agent** (contract violation, sideEffects leak): de-register agent from OrchestratorHub (flip `dormant: true` in AgentRegistry); existing in-flight runs complete or abort per topic. Reversible in <5 min. Audit entry `agent_rollback_{agentId}`.
- **Per-phase** (substrate failure, multi-agent regression): git revert to last G3-tagged commit at the prior phase boundary; Vercel canary roll-back to prior deployment slot; Doppler config snapshot restore. Audit entry `phase_rollback_{phaseId}`.
- **Per-product / per-tenant** (blast-radius failure on a product): isolated tenant freeze via Supabase RLS deny-all toggle; continuous crawl paused; Self-Renewal disabled until human gate clears. Audit entry `tenant_isolation_{productId}`.

**CONFIDENCE:** HIGH (4 of 5; Slot 4 MEDIUM).
**KEY ASSUMPTION:** AgentRegistry + OrchestratorHub allow dynamic registration/de-registration at runtime, effectively acting as feature flags; git tags + Vercel deployment immutability give a true last-known-good state at every phase boundary.

### PG4. Parallel vs sequential

**CONSENSUS.**

- **Strictly sequential:** Phase 1 → Phase 2 (substrate before agents). Doppler → RLS → Stripe Connect → Agent #4 within Phase 1. Product integration sprints (Phase 5) are sequential per PI1 ordering.
- **Parallelizable within phase:** Phase 2 agent builds (#6, #7, #9, #10) can run in parallel; #8 must follow because it audits the others (cannot self-audit per SSOT). Phase 3 intelligence/Ops agents are mostly parallel. Phase 4 is highly parallelizable.
- **Hard dependencies:** #5 → #4. #3 (already shipped) needs #8 live for fix-validation cycle. All embedded agents depend on the PI2 integration gate before product embedding begins.
- **Independent tracks running parallel to phases:** documentation, Locked Rules Registry curation, Panel orchestration bootstrap (Slot 1).

**CONFIDENCE:** HIGH (4 of 5; Slot 1 MEDIUM on the parallel-agent-build claim).
**KEY ASSUMPTION:** Agent build teams can run 2-3 agent builds concurrently without OrchestratorHub registration collision — requires the Phase 1 git race-condition fix (Slot 1 + Slot 2 explicit, Layer 1 SSOT Missing Q-set item).

### PG5. Authority progression

**CONSENSUS — Stage-by-stage elevation; each stage requires a separate Panel decision + CEO countersign on tier change (per MG4 #3).**

Default ladder (Slot 1 most detailed; Slot 2/3/4/10 align on shape):
1. **RECOMMEND_ONLY → DRAFT_ONLY:** ≥30 days shadow-mode evidence + zero unauthorized side-effects + ≥95/95 + confidence calibration within ±10%.
2. **DRAFT_ONLY → AUTO_CONTAIN_KNOWN:** ≥60 days clean draft history + adversarial test pass + scoped to known-pattern playbook.
3. **AUTO_CONTAIN_KNOWN → AUTO_WRITE_INTERNAL:** ≥90 days + Panel ≥7/10 vote (MG2) + CEO countersign (MG4 trigger #3).
4. **REQUIRES_HUMAN_GATE:** assigned at charter, not earned; reserved for irreversible/high-stakes domains (#3 Self-Renewal is the canonical example).

Elevation is **never automatic**; always a separate Panel decision with audit-log entry `agent_authority_elevation_{agentId}`. Final tier change requires CEO acknowledgment even after Panel ≥7/10 approval.

**CONFIDENCE:** HIGH (5 of 5).
**KEY ASSUMPTION:** Confidence back-testing infrastructure (Layer 1 EP3 Slot-1 dissent folded in) is built in Phase 1 — without it, calibration claims are unverifiable.

---

## AGENT BUILD SEQUENCE (AB1–AB5)

### AB1. Build order for #4–#25

**CONSENSUS BUILD ORDER (synthesized from 4-of-5 alignment on #4-early, #8/#10 early, Ops Runners last):**

1. **#4 Provider Onboarding** — single largest gap to "$5B OS" claim; unblocks multi-tenant revenue model. (Slot 2/3/4/10 put it first; Slot 1 puts #8 first because it gates 95/95 enforcement.)
2. **#8 Quality Audit + #10 Monitor** — parallel; #8 gates 95/95 on all subsequent agents, #10 supplies operational signals.
3. **#6 Research + #7 Design** — parallel; pipeline steps 1–2.
4. **#9 GTM** — pipeline step 7; depends on #2 (built), #8, #10.
5. **#5 End-Customer Intake** — depends on #4.
6. **#13 Self-Protection** — embedded; needed before product integration GA.
7. **#15 Benchmarking + #17 Product Evolution** — parallel.
8. **#19 Tech Evolution + #20 Environmental** — parallel.
9. **#11 Strategic Intelligence + #12 Portfolio Risk** — parallel.
10. **#14 Public Policy + #16 Productivity/HR + #18 Business Planning** — parallel.
11. **#21–#25 Ops Runners** — last; replace manual orchestration glue.

**CONFIDENCE:** HIGH (4 of 5; Slot 2 MEDIUM on Ops-Runner placement).
**KEY ASSUMPTION:** #8 Quality Audit can be built without itself failing the audit-self problem — relies on Panel review as external auditor of #8 (Layer 1 Missing-Q "self-test of self-tester").

**CEO FLAG — #4 vs #8 first:** 4 reviewers favor #4 first (revenue model unlock); Slot 1 favors #8 first (95/95 enforcement substrate). Both are defensible. Recommendation: start **#4 and #8 in parallel** since their substrate dependencies (Doppler/RLS/Stripe for #4; ScoreEvaluator/test harness for #8) do not conflict. CEO disposition welcome.

### AB2. Dependency map

**CONSENSUS dependency graph (synthesized from 5-of-5 alignment on core edges):**

```
#1 Lifecycle ─── (BUILT)
#2 Code Builder ─ (BUILT)
#3 Self-Renewal ─ (BUILT) → depends on #8 (fix-validation), #10 (breakage signals)

#4 Provider Onboarding → Doppler + Supabase RLS + Stripe Connect (Phase 1 substrate)
#5 End-Customer Intake → #4

#6 Research → independent; consumed by #7, #15
#7 Design → #6
#8 Quality Audit → ScoreEvaluator + audit log + test harness; audits all others
#9 GTM → #2 (built artifacts), #8 (audited), #10 (monitor signals)
#10 Monitor → substrate health endpoints

#13 Self-Protection → #8 (security posture dimension)
#15 Benchmarking → #6 (research feeds)
#17 Product Evolution → #10, #15
#19 Tech Evolution → independent; feeds #17
#20 Environmental → independent

#11 Strategic Intelligence → #6, #15, #19
#12 Portfolio Risk → #10, #11
#14 Public Policy → #6
#16 Productivity/HR → independent
#18 Business Planning → #11, #12

#21–#25 Ops Runners → all step-owner agents being live
```

**CONFIDENCE:** HIGH (4 of 5).
**KEY ASSUMPTION:** Inter-agent contracts are MessageBus topics only (no direct imports) — the dependency graph is a routing dependency, not a code dependency.

### AB3. Ops Runner charters (#21–#25)

**SPLIT — no clear 3-of-5 consensus on the exact responsibility split.** Two strongest proposals presented for CEO decision:

**Proposal A — Operational responsibilities (Slot 1 + Slot 2 + Slot 3 + Slot 10 align on shape):**
- **#21 Pipeline Conductor / Crawl Coordinator:** orchestrates 8-step run state, retries, dead-letter, manages Playwright crawl pool, sandbox account rotation. Authority: AUTO_WRITE_INTERNAL / AUTO_CONTAIN_KNOWN.
- **#22 Audit Auditor / Crawl Probe Ops:** meta-self-audit; verifies log integrity, detects gaps, raises Panel review; also crawl-probe management. Authority: RECOMMEND_ONLY.
- **#23 Cost Governor:** per-tenant token + compute budgets; kill-switches on overrun; consumes all `cost.*` events. Authority: AUTO_WRITE_INTERNAL (kill-switch is critical).
- **#24 Release / Tenant-Credential Ops:** manages agent activation (dormant→active), deployment canaries, tenant provisioning, RLS verification, Doppler secret checks. Authority: AUTO_CONTAIN_KNOWN.
- **#25 Panel Orchestrator / Incident-Recovery:** dispatches Panel reviews, manages quorum/substitution per MG5, records decisions per MG7; also incident escalation and kill-switch execution. Authority: REQUIRES_HUMAN_GATE until Panel handover gate (MG6) clears.

**Proposal B — Pipeline-step ownership (Slot 4 alone):**
- #21: Research/Design Runner (steps 1–2). #22: Build/QA (steps 3–4). #23: Deploy/Self-Renewal (steps 5–6). #24: GTM/Monitor (steps 7–8). #25: Cross-pipeline Orchestrator (escalations, deadlocks).

**CONFIDENCE:** MEDIUM (4 of 5).
**KEY ASSUMPTION:** Five Ops Runners is the right cardinality — could collapse to 3 (Conductor, Governor, Panel) if scope slips; Layer 1 SSOT lists #21–#25 as stubs already.

**CEO FLAG:** Proposal A is the operational-responsibility model (4 reviewers cluster here). Proposal B is the pipeline-step-ownership model (Slot 4 alone). Recommend Proposal A — it aligns with the Layer 1 SSOT's distinction between agent ownership of pipeline steps (#6-#10) and operational orchestration glue (#21-#25).

### AB4. Wire-in sequencing

**CONSENSUS.** Wire-in order = build order (AB1); each wire-in is gated by:

1. Agent passes own smoke tests + Gate 5 regression-free.
2. Agent registered in AgentRegistry with explicit `dormant: false` flag.
3. OrchestratorHub subscribes agent to declared topics.
4. **Shadow run** (24h): agent receives messages, produces output to a shadow audit-log topic, no downstream consumer reads it. Diff against expected behavior.
5. **Live run:** flag flipped, downstream consumes.

**Trigger:** explicit human action recorded as `agent_activation_{agentId}` in audit log. **Never automatic.** Slot 3 designates Agent #24 (Release Ops) as the executor of the activation; consistent with Proposal A in AB3.

**CONFIDENCE:** HIGH (4 of 5; Slot 2 MEDIUM).
**KEY ASSUMPTION:** Shadow-run infrastructure is built in Phase 1 — currently absent.

### AB5. Testing strategy per agent

**CONSENSUS category-based testing contract:**

- **Step-Owner agents (#1, #2, #6, #7, #8, #9, #10):** unit tests on plan/guard/act, integration tests on full step execution, contract tests on consumes/produces, golden-output tests on 5 reference inputs per VEU product, regression suite frozen post-G2.
- **Cross-Step agents (#3, #4, #5, #13, #17):** all of above + cross-step interaction tests (e.g., #3 must test the `#10-breakage → #3-fix → #8-audit → re-deploy → re-crawl` cycle end-to-end), tenant-isolation tests where applicable, authority-boundary tests.
- **Always-On agents (#11, #12, #14, #15, #16, #18, #19, #20):** all of above + cadence tests (monthly trigger fires correctly), event-driven tests (CVE/regulation/competitor signal injection), data-source mock tests (since external vendors not yet integrated), soak/high-volume MessageBus tests, false-positive/false-negative measurement.
- **Universal:** adversarial robustness suite (prompt injection, malicious crawl content, hostile pages) — Layer 1 SSOT Missing-Q.

**CONFIDENCE:** HIGH (4 of 5; Slot 3 MEDIUM on test-harness assumption).
**KEY ASSUMPTION:** Adversarial test capacity (currently absent per Layer 1 SSOT doability assessment) is built before Phase 3.

---

## PRODUCT INTEGRATION (PI1–PI4)

### PI1. Integration sequence

**CONSENSUS — MyBirthSafe LAST (4 of 5); first-product split.**

**Consensus on shape:** Risk-ascending order; MyBirthSafe (POPIA + maternal health + rebrand collision) is the highest-risk integration and goes last. 4 of 5 reviewers agree.

**Dissent (Slot 10):** Risk-descending — MyBirthSafe first. Outlier; rejected by majority.

**CEO FLAG — first-product decision (split):**
- **Option A — PressAI first** (Slot 1 + Slot 4): live Stripe revenue validates plumbing first; lowest integration risk; "begin with live revenue → existing third-party integrations → product maturity → regulatory complexity."
- **Option B — SAIGE first** (Slot 2 + Slot 3): low PII risk, complex enough to exercise FlowAI's capabilities; best balance of risk/coverage; minimum blast radius if integration falters.

**Synthesized sequence (using Option A):** PressAI → ReachSMS → RelTwin → SAIGE → MyBirthSafe.
**Synthesized sequence (using Option B):** SAIGE → PressAI → RelTwin → ReachSMS → MyBirthSafe.

Either is defensible. Recommend Option A — validates revenue plumbing first, aligning with the multi-tenant unlock thesis of Phase 1.

**CONFIDENCE:** MEDIUM (3 of 5 MEDIUM).
**KEY ASSUMPTION:** PressAI's live Stripe state is integration-ready (not just billing-ready) — verify before sequencing locks.

### PI2. Integration gate

**CONSENSUS (5 of 5).** Both sides must show:

- **FlowAI side:** ≥18 of 25 agents live (all Step-Owners + #3 + #4 + #13 + #15), substrate hardened (Phase 1 complete), continuous crawl infrastructure live, Self-Renewal proven on FlowAI itself for ≥30 days, ScoreEvaluator + audit log + Doppler + Supabase RLS production-verified.
- **Product side:** baseline health score ≥85 (or Playwright crawl pass-rate ≥95%), all 5 GTM stack trackers live, `/api/health` endpoint live, Doppler credentials provisioned for the product's tenant scope, Self-Renewal + Self-Protection capability packages installed, stable production deployment, no P0/P1 bugs in issue tracker.
- **Joint:** signed integration contract recording SLA, escalation path, on-call human, expected MTTD/MTTR for that product.

**CONFIDENCE:** HIGH (5 of 5).
**KEY ASSUMPTION:** Capability packages (already built per Canonical History) propagate cleanly into product codebases without local conflicts.

### PI3. Continuous crawl activation

**CONSENSUS (5 of 5).** Crawl activates **per-product** after PI2 clears, in a tiered protocol:

1. Crawl budget + scope declared (URLs, depth, frequency, sandbox accounts).
2. **Read-only crawl** for ≥7 days — record findings, no Self-Renewal trigger. Baseline established.
3. **Diagnose-only** for ≥7 days — Agent #3 generates fixes but does NOT deploy.
4. **Live crawl** — full Self-Renewal authority active, MTTD <15 min target enforced.

Sandbox account provisioning, payment-rail sandboxing, no-destructive-action rules locked before step 1. No crawl may submit payments, send SMS/email, mutate records, or trigger customer-facing workflows unless an explicit sandbox adapter is active.

**CONFIDENCE:** HIGH (4 of 5; Slot 1 MEDIUM on Playwright capacity).
**KEY ASSUMPTION:** Playwright endpoint capacity scales to 5 products × continuous crawl without saturating shared infra (Layer 1 SSOT Missing-Q on capacity planning).

### PI4. 12-agent embedding

**CONSENSUS (4 of 5) — Per-product, sequential, never simultaneous.**

For each product (in PI1 order):
1. Capability Transfer page generates per-product install sprint (already built).
2. Embed the 12 agents in dormant state.
3. Wire-in one category at a time over ~4 weeks: lifecycle (#1, #2, #3) → research/design (#6, #7) → operate (#9, #10, #13) → intelligence (#15, #17, #19, #20).
4. 95/95 audit on product after each category lit.

Simultaneous embed across all 5 products is rejected — blast radius too large given current dormant-agent count.

**DISSENT (Slot 4):** simultaneous embed post-Phase 3 via Capability Transfer sprints. Outlier; rejected by majority.

**CONFIDENCE:** HIGH (3 of 5; Slot 2 MEDIUM, Slot 4 dissent).
**KEY ASSUMPTION:** Capability Transfer system handles per-product config drift cleanly; if embeds collide with product-specific code, sequencing buys debug time.

---

## DEPENDENCY GRAPH + DEFERRED INVENTORY (DG1–DG3)

### DG1. Critical path

**CONSENSUS (5 of 5).** Single longest chain, est. ~14 weeks if executed without slack:

```
Doppler integration → Supabase RLS provisioning → BaseAgent validator
20→25 → Agent #4 Provider Onboarding shipped → Stripe Connect live →
first non-VEU tenant onboarded → Agent #8 Quality Audit shipped →
multi-tenant load test passed → Phase 1/2 exit gate → #13 Self-Protection
+ capability package validated → first product (PressAI or SAIGE)
integration gate (PI2) → continuous crawl shadow → diagnose → live →
first product live in production under FlowAI governance → remaining
4 products integrated → MyBirthSafe (terminating compliance-heavy node).
```

**Bottleneck:** **Agent #4 Provider Onboarding.** It blocks the revenue model, depends on Doppler + Stripe Connect + RLS (three external dependencies), and Layer 1 SSOT explicitly calls it out as "the single largest gap to the '$5B OS' claim." Slot 3 adds: MyBirthSafe integration is the critical-path terminator due to HIPAA/POPIA compliance validation time.

**CONFIDENCE:** HIGH (5 of 5).
**KEY ASSUMPTION:** External dependencies (Doppler/Stripe/Supabase) can resolve in parallel with #6/#7/#10 builds — if serialized, critical path extends to ~22 weeks.

### DG2. Deferred features

**CONSENSUS (5 of 5).** Explicitly deferred to post-Phase-5:

- **Native Panel orchestration by FlowAI** — deferred until Panel-to-FlowAI handover gate (MG6) and anti-circularity safeguards. Trigger: Phase 5 + 90 days clean Panel decisions.
- **Headless adapter for non-VEU products** — deferred until 2 external providers onboarded. Trigger: revenue threshold or board direction.
- **Marketplace intelligence full activation** (event-driven L9) — deferred until external data sources (Crunchbase, Bloomberg Law, Electricity Maps, WattTime) are wired. Trigger: vendor contracts signed.
- **Confidence back-testing automation** (Layer 1 EP3 enhancement) — deferred until Phase 4. Trigger: ≥6 months of confidence + outcome data.
- **Quantitative ESG dashboards (#20)** — deferred until Electricity Maps + WattTime live.
- **App Store distribution backend** — UI built, backend deferred to post-Phase 5.
- **Full external-provider scale onboarding** — deferred until all 5 internal products integrated and stable for 90 days.

**Promoted to non-deferred** (Slot 1 recommendation): **Locked Rules Registry as canonical artifact** must ship before Phase 1 exit, not deferred.

**CONFIDENCE:** MEDIUM (3 of 5 MEDIUM).
**KEY ASSUMPTION:** CEO accepts that "marketplace intelligence" — a Layer 1 commitment — is partially aspirational until vendor contracts close.

### DG3. External dependencies

**CONSENSUS (5 of 5).** Resolution order:

1. **CEO sign-off on quantified SLAs** (MTTD/MTTR/RTO/RPO numbers). Blocks PG2 enforcement.
2. **CEO sign-off on the Agent #4 charter** including E4 ceiling/floor operationalization (per highest-risk decision below).
3. **CEO sign-off on Locked Rules Registry artifact** format + amendment schema.
4. **Doppler vault provisioning** (account, paths, secrets migration plan). Blocks Phase 1.
5. **Supabase project + RLS schema deploy.** Blocks Phase 1.
6. **Stripe Connect platform application + approval.** Blocks #4. ~2–6 weeks at Stripe's pace — file Day 1.
7. **Playwright codegen / endpoint capacity expansion.** Blocks PI3.
8. **Product-specific credentials:** Twilio, Paystack, Cloudflare, PostHog, email, analytics.
9. **Vendor contracts** (Crunchbase, Bloomberg Law, Electricity Maps) — non-blocking for Phase 1, blocking for Phase 4.
10. **Clerk multi-tenant auth migration** (Phase 3).
11. **Git race-condition fix for concurrent Claude Code sessions** (Layer 1 Missing-Q). Blocks parallel agent builds.

**CONFIDENCE:** HIGH (5 of 5).
**KEY ASSUMPTION:** Stripe Connect approval is the single most variable external timeline — can range from 2 to 6 weeks; should be initiated Day 1 of Phase 1.

---

## RISK + RECOVERY (RR1–RR3)

### RR1. Top 3 implementation risks

**CONSENSUS — synthesized from 3-of-5 alignment on each item:**

1. **Multi-tenant data contamination** (Slot 2 #1, Slot 3 #2, Slot 4 implicit, Slot 10 #2). Misconfigured Supabase RLS policy leaks data between tenants. **Mitigation:** dedicated security sprint in Phase 1 with an extensive test suite of ≥20 specific cross-tenant attack vectors before onboarding any provider; Slot 1 Cost Governor doubles as tenant-isolation attestation runner.
2. **Production crawl side effects** (Slot 1 #1, Slot 2 #2, Slot 4 #2, Slot 10 #3). Autonomous actions on live production products without sandboxing cause real harm. **Mitigation:** read-only crawl mode → diagnose-only → live (tiered activation per PI3); synthetic accounts, sandbox adapters, explicit no-destructive-action rules; crawl replay review before phase advance.
3. **Cost runaway / LLM token unbounded** (Slot 1 implicit via Cost Governor, Slot 3 #1, Slot 10 implicit). Autonomous agents create infinite loops or inefficient queries. **Mitigation:** build and activate **Agent #23 (Cost Governor)** with hard per-tenant + per-run budget kill-switches early in Phase 3; phase budget set at phase start.

**Honorable mentions** (each cited by 2 reviewers; CEO to weigh):
- **Doppler + Stripe + Supabase concurrent dependency cliff** (Slot 1 #3) — three external dependencies, all blocking #4.
- **Agent #8 self-audit paradox** (Slot 1 #2) — Quality Audit cannot audit itself; Panel must serve as external auditor.
- **23/25 agents currently DORMANT** (Slot 4 #3, Slot 10 #1) — orchestration substrate exists but the orchestra is silent.
- **Autonomous regression** (Slot 3 #3) — Self-Renewal deploys a "fix" that causes a worse silent failure.

**CONFIDENCE:** HIGH (5 of 5).
**KEY ASSUMPTION:** Proactive risk mitigation through dedicated agents (Cost Governor) and strict governance gates (95/95 re-audit on every Self-Renewal fix) is the core defense strategy.

### RR2. Minimum viable FlowAI

**CONSENSUS shape — small agent set + full governance + 1 product** (5 of 5 agree on the principle; specific agent counts differ).

**Synthesized MVP:** **6 agents, full 8-step pipeline (4 agent-driven + 4 human-supplied), 95/95 + 6-step Clearance + audit log, 1 product (PressAI), read-only continuous integrity.**

- **Agents:** #1 Lifecycle, #2 Code Builder, #3 Self-Renewal (already built) + **#8 Quality Audit** + **#10 Monitor** + **#13 Self-Protection** (the widest 3-reviewer overlap).
- **Pipeline:** Build (3) → Quality Audit (4) → Self-Renewal (6) → Monitor (8) agent-driven; Research/Design/Deploy/GTM treated as human-supplied inputs.
- **Product:** PressAI only (Stripe live, simplest GTM stack).
- **Governance:** 95/95, 6-step Clearance, Monitor 0–50, audit log — non-negotiable.
- **Excluded:** multi-tenant (#4/#5), all intelligence agents (#11/#12/#14/#16/#18), Ops Runners.

This delivers "AI product governed end-to-end with continuous integrity" — the Layer 1 SSOT elevator pitch — at ~1/4 the agent count.

**Reviewer dissent on agent set:**
- Slot 1: 5 agents only (no #13).
- Slot 2: adds #21 Pipeline Ops + #22 Crawl/Probe Ops; 8 agents.
- Slot 3: includes #6 + #7 (Research + Design agent-driven); 6 agents.
- Slot 4: #1–#4 + Pipeline stubs; argues #4 is MVP-critical.
- Slot 10: 7 agents (#1–#7); argues #4 + #5 + #6 + #7 deliver the multi-tenant pipeline.

**CONFIDENCE:** HIGH (4 of 5; Slot 1 + Slot 4 MEDIUM).
**KEY ASSUMPTION:** Single-tenant + single-product is acceptable as MVP — explicitly violates "multi-tenant OS" framing but satisfies governance promise.

### RR3. Self-testing protocol

**CONSENSUS (5 of 5).** FlowAI tests itself by treating its own next agent build (or its own codebase) as a product going through the canonical 8-step pipeline with `productScope=flowai`.

- **Input:** the agent's charter (markdown), reference implementation skeleton, contract files; alternatively, the live `veaas.com` marketing site + `docs/FLOWAI_SSOT.md` as `Synthesize & Build` inputs.
- **Step 1 Research:** Agent #6 surveys prior agents' patterns, identifies risks.
- **Step 2 Design:** #7 produces architecture spec; reviewed against BaseAgent contract.
- **Step 3 Build:** #2 (Code Builder) generates implementation; #1 (Lifecycle) governs.
- **Step 4 Quality Audit:** #8 (or **Panel** if #8 is the agent under test — addressing the self-audit paradox) scores ≥95/95.
- **Step 5 Deploy:** dormant registration in AgentRegistry; shadow-run for 24h.
- **Step 6 Self-Renewal:** #3 monitors, generates fix proposals on observed defects.
- **Step 7 GTM:** internal release notes, charter publication, audit-log entry.
- **Step 8 Monitor:** #10 watches first 7 days of live execution.

**Pass criteria:** 95/95 + 6-step Clearance + 7-day green Monitor + zero unauthorized side-effects in audit log + Panel ≥7/10 on dogfooding artifact + zero regression on the 879-test Phase 0 baseline + Playwright confirms critical routes.

**Anti-regress:** if FlowAI cannot put its own next agent through this pipeline, that agent is not ready; advancement halts until the pipeline can govern itself.

**Cadence:** weekly "Constitutional Conformance" run (Slot 3) AND per-agent-build run.

**CONFIDENCE:** HIGH (4 of 5; Slot 3 MEDIUM on regen-itself feasibility).
**KEY ASSUMPTION:** Pipeline can run on agent-build artifacts (markdown + JS files) the same way it runs on product artifacts — requires generalized artifact schema, currently implicit.

---

## MISSING QUESTIONS (union, deduplicated, ranked by reviewer-mention frequency)

Questions raised by ≥3 reviewers (high-priority gaps to fold into Phase 1 scope):

1. **Cost governance / per-tenant LLM-token budget + kill-switch** (Slot 1, Slot 2, Slot 4, Slot 10) — 4/5.
2. **Disaster recovery RTO/RPO contract** for FlowAI itself (Slot 1, Slot 2, Slot 3, Slot 10) — 4/5.
3. **Adversarial robustness testing** (prompt injection, hostile crawl pages, malicious providers) (Slot 1, Slot 2, Slot 4, Slot 10) — 4/5.
4. **Human-in-the-loop on-call model + SLA** (Slot 1, Slot 2, Slot 3) — 3/5.
5. **Cross-tenant contamination contract** (detection, blast radius, remediation) (Slot 1, Slot 2, Slot 4) — 3/5.
6. **Data governance** (residency, retention, deletion, portability, consent, offboarding) per product + per jurisdiction (Slot 1, Slot 2, Slot 3) — 3/5.

Questions raised by 2 reviewers:

7. Quantified SLAs (MTTD/MTTR/RTO/RPO) per severity tier (Slot 1, Slot 2).
8. Compliance regime map per product (GDPR/POPIA/HIPAA/PCI/SOC 2) (Slot 1, Slot 2).
9. Marketplace neutrality proof (VEU-products vs external providers) (Slot 1, Slot 2).
10. End-customer recourse path for AI-caused harm (Slot 1, Slot 2).
11. Panel independence / anti-circularity safeguards (Slot 1, Slot 2).
12. Git/concurrency control (multi-session race conditions) (Slot 1, Slot 2).
13. Observability architecture for FlowAI itself (Slot 1, Slot 2).

Questions raised by 1 reviewer (worth flagging but lower priority):

14. Locked Rules Registry as canonical numbered artifact (Slot 1).
15. Phase 1.0 → 1.1 boundary discipline / phase-done artifact (Slot 1).
16. Agent #25 Panel Orchestrator bootstrap paradox during Phase 1 (Slot 1).
17. Documentation-as-product policy / doc-renewal cadence (Slot 1).
18. Self-modification boundary (which governance files may FlowAI never modify without CEO approval) (Slot 2).
19. Credential rotation, expiry, incident-revocation, least-privilege policy (Slot 2).
20. Customer communication triggers (provider notice / end-customer notice / regulator notice / public status-page) (Slot 2).
21. Kill-switch authority (who can pause crawls, freeze deployments, isolate tenants) (Slot 2).
22. Revenue-floor mechanics (sustainability floor calculation + storage + enforcement) (Slot 2).
23. False-positive tolerance for crawl breakage / QA findings / Self-Renewal triggers (Slot 2).
24. Version-compatibility / G3→G4 migration of in-flight runs and audit-log entries (Slot 2).
25. Agent phylogeny — how new versions of agents are trained, validated, promoted (Slot 3).
26. Liability + indemnification when an autonomous agent causes damage (Slot 3).

---

## HIGHEST-RISK DECISION (synthesized — 3 of 5 reviewers converge)

**The Agent #4 Provider Onboarding charter and the Stripe Connect economic model embedded in it.**

Specifically: **the precise contractual language that operationalizes Layer 1 E4** — VEU 15% ceiling, separate non-negotiable sustainability floor, ≥85% provider retention, per-contract negotiation between ceiling and floor.

Why this is the single highest-risk decision (3 reviewers converge — Slot 1, Slot 2, Slot 10):

1. **Irreversibility.** Once Stripe Connect is live and the first external provider onboards under a fee schedule, that schedule becomes precedent. Renegotiating with a live tenant is materially harder than designing the right model upfront.
2. **Critical-path bottleneck (DG1).** Slip here cascades through Phase 2/3, multi-tenant proof, and the entire "$5B OS" thesis.
3. **Locked Rule embodiment.** Layer 1 E4 was CEO-resolved on 2026-05-11; Agent #4's implementation is where that resolution becomes binding code, contracts, and money flow. Any drift between the canonical resolution and the implementation is a Locked Rule violation in production.
4. **MG4 escalation trigger surface.** Every non-default contract generates a CEO escalation (MG4 #2) unless the default-band policy is precisely defined now.
5. **Inflection moment.** It is the moment FlowAI moves from governance shell to revenue-generating OS — the fee schedule, sustainability floor definition, and Stripe Connect plumbing must all be approved as one coherent artifact, not assembled piecemeal.

**Alternate framings (worth merging into the Agent #4 review):**
- **Slot 2:** "Whether FlowAI is allowed to proceed toward multi-tenant/provider onboarding before Supabase RLS, Doppler credential isolation, crawl side-effect prevention, rollback, and Agent #4 revenue/contract rails are production-verified." (Encloses the #4 charter decision in a broader gate.)
- **Slot 3:** "Agent Build and Activation Sequence (AB1) coupled with Phase Gating Criteria (PG2)." (Argues the master plan IS the decision; CEO alignment on the risk-managed path is non-negotiable.)

**Recommended CEO action before Phase 1 kickoff:** sign off on a single approval packet containing **(a)** the canonical fee-schedule document with explicit sustainability-floor formula, **(b)** the standard provider contract template with the negotiable band defined numerically between ceiling and floor, **(c)** the Stripe Connect platform configuration, **(d)** the audit-log schema for revenue events, and **(e)** the multi-tenant readiness gate (RLS contamination test, Doppler isolation, crawl side-effect prevention, rollback rehearsal) that must pass before #4 onboards its first external provider.

---

## IMPLEMENTATION SEQUENCE SUMMARY (consensus build order with rationale)

| # | Agent | Phase | Rationale |
|---|-------|-------|-----------|
| 1 | **#4 Provider Onboarding** | Phase 1 | Unlocks multi-tenant revenue model; single largest gap to "$5B OS". Bottleneck of the critical path. |
| 2 | **#8 Quality Audit** | Phase 1–2 | Gates 95/95 on every subsequent agent. Build in parallel with #4 (no substrate conflict). |
| 3 | **#10 Monitor** | Phase 2 | Supplies operational signals; needed for Self-Renewal feedback loop, continuous crawl, and SLA enforcement. |
| 4 | **#6 Research** | Phase 2 | Pipeline step 1; independent of others. Parallel with #7. |
| 5 | **#7 Design** | Phase 2 | Pipeline step 2; depends on #6 outputs. |
| 6 | **#9 GTM** | Phase 2 | Pipeline step 7; depends on #2 (built), #8 (audited), #10 (monitor signals). |
| 7 | **#5 End-Customer Intake** | Phase 3 | Depends on #4. Completes the tenancy chain. |
| 8 | **#13 Self-Protection** | Phase 3 | Cross-step; needed before product integration GA (security posture is a QA dimension). |
| 9 | **#15 Benchmarking** | Phase 3 | Feeds #17. Parallel with #17. |
| 10 | **#17 Product Evolution** | Phase 3 | Depends on #10, #15. Parallel with #15. |
| 11 | **#19 Tech Evolution** | Phase 3 | Independent; feeds #17. Parallel with #20. |
| 12 | **#20 Environmental** | Phase 3 | Independent; ESG dashboard agent. Parallel with #19. |
| 13 | **#21 Pipeline/Crawl Conductor** | Phase 3 | First Ops Runner — bootstrap orchestration glue + Playwright pool management. |
| 14 | **#23 Cost Governor** | Phase 3 | Mitigates RR1 risk #3 (cost runaway). Ship before high-volume crawl + intelligence cycles. |
| 15 | **#11 Strategic Intelligence** | Phase 4 | Depends on #6, #15, #19. |
| 16 | **#12 Portfolio Risk** | Phase 4 | Depends on #10, #11. |
| 17 | **#14 Public Policy** | Phase 4 | Depends on #6. Parallel with #16, #18. |
| 18 | **#16 Productivity/HR** | Phase 4 | Independent. Parallel with #14, #18. |
| 19 | **#18 Business Planning** | Phase 4 | Depends on #11, #12. Parallel with #14, #16. |
| 20 | **#22 Audit Auditor** | Phase 4 | Meta-self-audit Ops Runner; raises Panel review when audit gaps detected. |
| 21 | **#24 Release / Tenant-Credential Ops** | Phase 4 | Manages activation canaries + RLS verification + Doppler checks. |
| 22 | **#25 Panel Orchestrator** | Phase 4 | Bootstraps Panel reviews (REQUIRES_HUMAN_GATE until handover gate clears). |

**Already SHIPPED-GREEN on flowai-v0.1 (not in build order):** #1 Lifecycle Engine, #2 Code Builder, #3 Self-Renewal.

---

## SYNTHESIS METADATA

- **Reviewers used:** 5 of 8 attempted LIVE slots (Slots 1, 2, 3, 4, 10); 3 failed (Slot 5 v0 timeout on 125 KB bundle; Slots 6/7 GitHub Models 413/404 due to free-tier 8K-token cap / model not in catalog); 2 deferred (Slots 8, 9 headless not wired).
- **Consensus rate (20 questions):** strong-consensus (5/5 or 4/5) on 14 questions (70%); 3-of-5 consensus with synthesized dissent on 4 questions (20%); SPLIT requiring CEO disposition on 2 questions (10%).
- **CEO FLAGS requiring disposition before promotion to `docs/FLOWAI_IMPLEMENTATION_PLAN.md`:**
  - **AB1 / #4 vs #8 first** — 4 reviewers favor #4-first; Slot 1 favors #8-first. Recommendation: parallel build (substrate dependencies don't conflict).
  - **AB3 / Ops Runner charter scheme** — 4 reviewers cluster on Proposal A (operational responsibilities); Slot 4 alone proposes Proposal B (pipeline-step ownership). Recommendation: Proposal A.
  - **PI1 / first-product** — 2 reviewers favor PressAI (live revenue), 2 favor SAIGE (low PII, complex). Slot 10 is the reverse-order outlier (rejected). Recommendation: PressAI (Option A) — validates revenue plumbing early.
  - **PI4 / embed simultaneity** — 4 reviewers per-product-sequential; Slot 4 simultaneous post-Phase 3. Recommendation: per-product-sequential (majority).
- **Generated:** 2026-05-11, `layer2-impl-panel-review-2026-05-11.md` as input.
- **Status:** DRAFT — awaiting CEO approval before promotion to `docs/FLOWAI_IMPLEMENTATION_PLAN.md`.
