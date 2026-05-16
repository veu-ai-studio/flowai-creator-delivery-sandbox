# 20-Agent Build Index — DORMANT → SHIPPED-GREEN Roadmap

**Status:** Index of build blueprints for the 20 remaining DORMANT agents (out of canonical 26-agent roster per Rev-2.1 §15.1 + ENTRY 005). 5 agents already SHIPPED-GREEN: #1 Lifecycle, #2 Code Builder, #3 Self-Renewal, #4 Provider Onboarding, #5 End-Customer Intake. Agent #21 (Ops Runner Alpha — Aggressive Crawl Conductor) is canonical per ENTRY 006 but DORMANT in implementation (engineering dispatch outstanding); not in this 20-blueprint set since its charter shipped via ENTRY 006 not a separate blueprint.

**Author:** W3, 2026-05-16.
**Anchor canonical:** Rev-2.1 §15.1 + ENTRY 003–006 cumulative SSOT.

---

## 1. Agent inventory table

All 20 dormant agents drafted in this blueprint set:

| Agent | Name | Mode | Step (if owner) | Phase 1 effort (W-hours) | Phase 2 effort | Hard dependencies |
|---:|---|---|---|---:|---:|---|
| #6 | Research | step-owner | 1 research | 8 | — | ToolMenu CA-11-C; Agent #21 ACE for `21.crawl.completed.v1` (soft) |
| #7 | Design | step-owner | 2 design | 10 | +12 (executor) | #6 SHIPPED; v0 adapter wired (Phase 2) |
| #8 | Quality Audit | step-owner | 4 qa_audit | 14 | — | #6, #7, #2; ScoreEvaluator.js (LIVE); rubric files Panel-reviewed |
| #9 | Go-to-Market | step-owner | 7 gtm | 10 | +8 (demo assets) | #8 SHIPPED; #21 SHIPPED (per ENTRY 006 §7.6) |
| #10 | Monitor | step-owner | 8 monitor | 18 | +10 (executor) | All prior step agents; CA-9-C + CA-10-A canonical (LIVE per ENTRY 005) |
| #11 | Strategic Intelligence | cross-step | n/a | 12 | — | CA-9 LIVE; `community.signal.v1` webhook receiver (deferred soft dep) |
| #12 | Portfolio Risk | cross-step | n/a | 10 | — | #8, #21 SHIPPED |
| #13 | Self-Protection | always-on | n/a | 14 | +24 (executor + Cloudflare + DMCA + watermark) | Sprint PROTECT-1 Phase 1 (LIVE); #21 SHIPPED |
| #14 | Public Policy | cross-step | n/a | 10 | — | #11 SHIPPED; legal counsel review (process dep) |
| #15 | Benchmarking | cross-step | n/a | 12 | — | #11 + #26 SHIPPED; CA-11-D.3 per-agent score storage |
| #16 | Productivity / HR | cross-step | n/a | 8 | — | GovernanceAuditLog (LIVE per §14) |
| #17 | Product Evolution | always-on | n/a | 12 | — | #15 + #26 SHIPPED |
| #18 | Business Planning | cross-step | n/a | 8 | — | #11, #12, #17 SHIPPED |
| #19 | Technological Evolution | cross-step | n/a | 9 | — | #10 SHIPPED |
| #20 | Environmental Impacts | cross-step | n/a | 7 | — | Orchestra cost-ledger (LIVE per Orchestra §7.1) |
| #22 | Ops Runner Beta | step-owner (TBD) | **TBD — BLOCKED on §27 OQ-2** | 10–14 | — | §27 OQ-2 disposition |
| #23 | Ops Runner Gamma (Cost Governor) | cross-step (proposed) | n/a | 13 | +6 (executor) | Orchestra cost-ledger + budget table (LIVE per Orchestra §7.1 + §8.4) |
| #24 | Ops Runner Delta | step-owner (TBD) | **TBD — BLOCKED on §27 OQ-2** | 10–16 | — | §27 OQ-2 disposition |
| #25 | Ops Runner Epsilon | step-owner (TBD) | **TBD — BLOCKED on §27 OQ-2** | 12–18 | — | §27 OQ-2 disposition |
| #26 | Orchestra Research Agent | always-on | n/a | 22 | — | CA-9 LIVE; CA-11-C ToolMenu schema (soft); #11, #14, #15 SHIPPED |

**Phase 1 totals (sum of Phase 1 effort, mid-range for ranges):** ~232 W-hours (~29 W-days at 8 W-hours/day).
**Phase 2 totals (where applicable):** ~60 W-hours (~7.5 W-days) — adds to #7 / #10 / #13 / #23 only.
**Grand total (Phase 1 + Phase 2):** ~292 W-hours (~36.5 W-days).

---

## 2. Recommended build order (critical path first)

The dispatch specified `#21 ACE Conductor → #6 → #8 → #7 → #10 → #26 → #13 → remainder`. W3 refines with explicit ordering + parallelism opportunities:

### Wave 1 — Foundation pipeline (sequential)

| # | Agent | Effort | Rationale |
|---|---|---:|---|
| 1 | **#21 Aggressive Crawl Conductor** (engineering of canonical ENTRY 006 spec) | ~18 W-h | Canonical per ENTRY 006; produces `21.crawl.completed.v1` that #6 consumes; the GTM-readiness foundation per §7.6 |
| 2 | **#6 Research** | 8 W-h | Step 1 — consumes #21's output; emits findings that #2/#7/#8 consume; smallest unblocked dormant agent |
| 3 | **#8 Quality Audit** | 14 W-h | Step 4 — owns the 5-dimension scoring engine per §10.1; gates pipeline progress to step 5 |
| 4 | **#7 Design** | 10 W-h | Step 2 — completes step 1-4 pipeline minus the already-shipped #2 Code Builder at step 3; restores full step-owner coverage for steps 1-4 |
| 5 | **#10 Monitor** | 18 W-h | Step 8 — closes the pipeline; consumes everything; ingests customer feedback per CA-9-C; ProductSSOT writes per CA-10-B |
| 6 | **#9 Go-to-Market** | 10 W-h | Step 7 — gates Clearance Step 5 (Demo Readiness) per ENTRY 006 §7.6 |

**Wave 1 total:** ~78 W-hours (~10 W-days). **All 8 pipeline steps + monitor covered after Wave 1.**

### Wave 2 — Orchestration intelligence (parallel-eligible)

| # | Agent | Effort | Parallelism |
|---|---|---:|---|
| 7 | **#26 Orchestra Research Agent** | 22 W-h | Largest single agent; depends on #11, #14, #15 from Wave 3 — soft sequencing: #26 can ship with seed list + hardcoded ToolMenu first (no #11/#14/#15 dependency for initial), then expand once they ship |
| 8 | **#13 Self-Protection** | 14 W-h (Phase 1) | Independent of pipeline path; depends only on Sprint PROTECT-1 Phase 1 (LIVE) |
| 9 | **#23 Ops Runner Gamma (Cost Governor)** | 13 W-h | Independent; depends on Orchestra cost-ledger (LIVE); cost-governance highest priority post-pipeline |

**Wave 2 total:** ~49 W-hours (~6.1 W-days at 1 W-day/day; **~3.0 W-days if parallel** since all 3 agents have no inter-dependencies — can be built by 3 parallel W-streams).

### Wave 3 — Marketplace + portfolio intelligence (parallel-eligible)

| # | Agent | Effort | Parallelism |
|---|---|---:|---|
| 10 | **#11 Strategic Intelligence** | 12 W-h | Pairs with #14 (joint carve-out flags per §8.1); pairs with #26 (provides candidate signals); pairs with #15 (provides benchmark inputs) |
| 11 | **#14 Public Policy** | 10 W-h | Pairs with #11 |
| 12 | **#15 Benchmarking** | 12 W-h | Pairs with #11 + #26 |
| 13 | **#19 Technological Evolution** | 9 W-h | Independent of #11/#14/#15; depends only on #10 (Wave 1) |

**Wave 3 total:** ~43 W-hours (~5.4 W-days at 1 W-day/day; **~3.0 W-days if parallel**).

### Wave 4 — Strategic + portfolio agents (parallel-eligible)

| # | Agent | Effort | Parallelism |
|---|---|---:|---|
| 14 | **#12 Portfolio Risk** | 10 W-h | Independent within Wave 4; depends on Wave 1 #8, #21 |
| 15 | **#17 Product Evolution** | 12 W-h | Independent within Wave 4; depends on #15, #26 (Waves 2-3) |
| 16 | **#18 Business Planning** | 8 W-h | Independent within Wave 4; depends on #11, #12, #17 |
| 17 | **#16 Productivity / HR** | 8 W-h | Independent; depends on GovernanceAuditLog (LIVE) |
| 18 | **#20 Environmental Impacts** | 7 W-h | Independent; depends on Orchestra cost-ledger (LIVE) |

**Wave 4 total:** ~45 W-hours (~5.6 W-days at 1 W-day/day; **~3.0 W-days if parallel — Wave 4 internally has #16, #20 with no inter-deps; #12 and #17 can run in parallel; #18 sequences last after #12/#17**).

### Wave 5 — Ops Runners pending §27 OQ-2 disposition (BLOCKED)

| # | Agent | Effort | Block |
|---|---|---:|---|
| 19 | **#22 Ops Runner Beta** | 10–14 W-h | Step + role TBD per §27 OQ-2 |
| 20 | **#24 Ops Runner Delta** | 10–16 W-h | Step + role TBD per §27 OQ-2 |
| 21 | **#25 Ops Runner Epsilon** | 12–18 W-h | Step + role TBD per §27 OQ-2 |

**Wave 5 total:** ~32–48 W-hours (~4–6 W-days). **BLOCKED until §27 OQ-2 Panel + CEO disposition** of the 3 remaining Ops Runner step+role bindings (joint disposition recommended with #23 Cost Governor).

### Wave 6 — Phase 2 executors (sequential after their Phase 1 counterparts)

| # | Agent | Phase 2 effort | Rationale |
|---|---|---:|---|
| Ph2-1 | **#3 Self-Renewal Executor** (already drafted at `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` commit `446ddb5`; canonical per CA-7 §15.5) | ~20 W-h | Engineering ratification dispatch outstanding; canonical pattern already proven |
| Ph2-2 | **#7 Design Executor** | 12 W-h | After v0 adapter Probation per §8.1 |
| Ph2-3 | **#10 Monitor Ingestion Executor** | 10 W-h | After Phase 1 Monitor stable |
| Ph2-4 | **#13 Self-Protection Executor** | 24 W-h | Largest Phase 2; needs Cloudflare adapter, DMCA workflow, watermark pipeline |
| Ph2-5 | **#23 Cost Governor Executor** | 6 W-h | Small Phase 2; budget-halt write path |

**Wave 6 total:** ~72 W-hours (~9 W-days) — defers until each Phase 1 counterpart proven; Phase 2 NOT on the critical path.

---

## 3. Total estimated effort + session count

| Wave | Agents | Phase 1 total (W-hours) | Calendar @ 1 W-d/day | Calendar @ 2 W parallel |
|---|---|---:|---:|---:|
| Wave 1 (Foundation pipeline) | #21, #6, #8, #7, #10, #9 | 78 | ~10 days | ~10 days (sequential within wave) |
| Wave 2 (Orchestration intelligence) | #26, #13, #23 | 49 | ~6 days | ~3 days |
| Wave 3 (Marketplace intelligence) | #11, #14, #15, #19 | 43 | ~5.5 days | ~3 days |
| Wave 4 (Strategic + portfolio) | #12, #17, #18, #16, #20 | 45 | ~5.5 days | ~3 days |
| Wave 5 (Ops Runners — BLOCKED) | #22, #24, #25 | 32–48 | ~4–6 days | ~4–6 days (after §27 OQ-2 disposition) |
| Wave 6 (Phase 2 Executors) | #3 graduation + 4 phase-2 | 72 | ~9 days | ~5 days |
| **TOTAL Phase 1 (Waves 1-5)** | 20 agents | **~252 W-hours** | **~31.5 W-days** | **~22 W-days** |
| **TOTAL Phase 1 + Phase 2** | 20 + executors | **~324 W-hours** | **~40.5 W-days** | **~27 W-days** |

**Session count (assuming 1 W-day per dispatch session):**
- Sequential: ~32 sessions Phase 1 / ~41 sessions Phase 1+2
- 2-W-parallel: ~22 sessions Phase 1 / ~27 sessions Phase 1+2

---

## 4. Parallel vs sequential map

### Inter-wave parallelism

- **Wave 1** is fully sequential (each agent in Wave 1 depends on its predecessor or the canonical pipeline structure).
- **Wave 2** internally parallel (3 agents, 0 inter-deps); BLOCKS on Wave 1 completion (specifically: #26 depends on Wave 3's #11/#14/#15 for full functionality but can ship with seed list first; #13 depends on Wave 1's #21).
- **Wave 3** internally parallel (4 agents, 0 inter-deps); BLOCKS on Wave 2's #26 for #15 to feed it; can overlap with Wave 2 if W3 streams: e.g. #11 + #14 can run parallel to #26's first phase.
- **Wave 4** internally parallel (5 agents); BLOCKS on Wave 3's #11/#15/#17 for downstream agents.
- **Wave 5** BLOCKED on §27 OQ-2 disposition (orthogonal to Waves 1-4).
- **Wave 6** is sequential per agent (Phase 2 follows Phase 1 of the same agent).

### Intra-wave parallelism (which agents can build simultaneously)

| Within wave | Parallel-safe set | Sequenced |
|---|---|---|
| Wave 1 | (none — all sequential) | #21 → #6 → #8 → #7 → #10 → #9 |
| Wave 2 | #26 + #13 + #23 (all 3 parallel) | n/a |
| Wave 3 | #11 + #14 + #15 + #19 (all 4 parallel) | n/a |
| Wave 4 | #12 + #16 + #20 (parallel); #17 sequential after #15 (Wave 3); #18 sequential after #12+#17 | #18 last |
| Wave 5 | #22 + #24 + #25 (parallel; same OQ-2 disposition unblocks all 3) | n/a |
| Wave 6 | #3 graduation + #7 Phase 2 + #10 Phase 2 + #13 Phase 2 + #23 Phase 2 (each independent of the others' Phase 2; each waits only on its own Phase 1) | n/a |

**Maximum-parallelism throughput:** 4 agents in parallel per wave (capped by reviewer + Panel-review bandwidth, not by W-stream availability). At 4 parallel, all 20 ship in ~22 W-days total elapsed (~3 weeks at 1 W-day per day per stream).

---

## 5. Open clarification flags requiring CEO / Panel disposition

The following clarifications are surfaced from individual blueprints. None blocks the Wave 1-2 critical path; some block specific Wave 4-5 agents.

| Flag | Agent(s) | Blocks |
|---|---|---|
| Rubric files for 5 audit dimensions (UI/UX, API, Logic, Business Value, Security Posture) Panel-reviewed before #8 ships | #8 | #8 Wave 1 step |
| v0 adapter Probation status before Agent #7 Phase 2 | #7 | #7 Phase 2 only (Wave 6) |
| Step + role for Ops Runners #22, #24, #25 | #22, #24, #25 | Wave 5 entirely |
| Watermark mint+rotation spec for Agent #13 Phase 2 | #13 | #13 Phase 2 only |
| DMCA filing destinations + legal counsel involvement | #13 | #13 Phase 2 |
| `industry-trackers.json` canonical URL set | #11, #26 | Wave 3 onwards |
| `regulatory-trackers.json` canonical URL set + legal counsel input | #14 | Wave 3 #14 |
| Benchmark fixture set ownership + cost budget | #15 | Wave 3 #15 |
| Cross-tenant aggregation scope for #12 + #20 (`flowAiOnly` scope clarification) | #12, #20 | Wave 4 #12, #20 |
| Carbon-emission factors data source for #20 | #20 | Wave 4 #20 |

---

## 6. Sequencing recommendations

**For maximum value-per-day delivered:**
1. Engineering-dispatch Wave 1 (#21 → #6 → #8 → #7 → #10 → #9) sequentially across ~10 W-days. This delivers a complete 8-step pipeline (was previously gated by the dormant agents).
2. After Wave 1 lands, dispatch Wave 2 in parallel (#26 + #13 + #23) across ~3 W-days with 3 W-streams. This delivers Orchestra self-expansion + IP defence + cost governance.
3. Wave 3 + Wave 4 alternate or overlap depending on Panel + CEO bandwidth for the per-agent rubric / tracker / fixture ratifications (each agent needs a small Panel review before its Phase 1 ships).
4. Wave 5 sits until §27 OQ-2 dispositioned; can be dispatched joint with Wave 6 Phase 2.
5. Wave 6 Phase 2 executors land continuously as each Phase 1 counterpart proves stable (≥30 days at status green per §8.1 lifecycle).

**For minimum-risk-to-existing-canonical:**
- Wave 1 critical path uses canonical patterns proven by Agents #1-#5 + #3 Executor draft. No charter ambiguity.
- Wave 2's #26 is the most complex single agent (~22 W-h) but its 4-condition gate + 5-state lifecycle + 7 audit-log topics are fully canonical per ENTRY 005.
- Waves 3-4 introduce LLM-driven analyzers with rubric/tracker dependencies — Panel review before each ship.
- Wave 5 BLOCKED until §27 OQ-2 — recommend joint Panel consultation on all 3 remaining Ops Runners.

---

## 7. Crash-safety notes

The blueprints were authored across 5 incremental commits:
- Batch 1 (#6, #7, #8, #9) — commit `fe6818e`
- Batch 2 (#10, #11, #12, #13) — commit `19d358c`
- Batch 3 (#14, #15, #16, #17) — commit `289fbf4`
- Batch 4 (#18, #19, #20, #22) — commit `3ecca88`
- Batch 5 (#23, #24, #25, #26) — commit `be03ba0`
- Build index (this file) + final — final commit hash in W3 report

Resumption from any point picks up at the last committed batch; no work is lost if interrupted mid-batch.

---

*End of Build Index. 20 blueprints + this index = complete dormant-agent roadmap. Engineering-dispatch authorisation per CEO + Panel per agent / per wave.*
