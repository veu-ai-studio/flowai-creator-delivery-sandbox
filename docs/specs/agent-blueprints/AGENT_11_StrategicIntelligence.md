# Agent #11 — Strategic Intelligence — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A11-REVISE` plurality 6/9 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 11 + Locked Rule 16 (continuous marketplace intelligence) + CA-9-A Orchestra self-expansion + CA-11-B.2 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)**.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #01 / #15 / #23 / #31 (topic naming unresolved — `_registry.ts` produces missing 3 topics; `11.brief.weekly.v1` plus charter-expansion topics):** RESOLVED via §13.12 "topic name canonicalisation" block. Canonical produces set for Agent #11 (post-CA-9-B): `['11.platform.discovery.v1', '11.marketplace_intelligence_report.v1', '11.carveout_flag.v1', '11.cycle.empty.v1']` — 4 topics. `_registry.ts` row 11 migrates to this exact set at first-ship. The legacy `11.brief.weekly.v1` placeholder is REMOVED (`11.marketplace_intelligence_report.v1` is canonical per Locked Rule 16). `11.cycle.empty.v1` is the new explicit empty-cycle envelope (Obj #11-flavour failure handling).
- **Obj #05 (cross-agent dependency cycle — #11 ↔ #26 via `11.platform.discovery.v1` consumption):** RESOLVED via §13.17 "cycle-breaking init order" block. Cycle is logical (#11 feeds #26 candidate discoveries; #26 feeds back via `26.orchestra.deprecated.v1` → vendor-risk signal to #11). Initialisation order: #11 starts FIRST (no #26-dependency for initial discovery; seed list is W3-curated industry-trackers.json). #26 starts AFTER #11 has emitted ≥1 cycle. Re-entry from #26 → #11 is read-through-MessageBus only (no synchronous call); cycle cannot deadlock.
- **Obj #16 (over-reliance on LLMs):** RESOLVED via §13.13 "LLM-grounding hardening" block. Candidate classification is HYBRID — (a) rule-based first pass (capability-keyword extraction + structured-data parsing of vendor changelog feeds), (b) LLM second pass for narrative + relevance ranking. The `recommendedAction` field on `11.platform.discovery.v1` is rule-based (deterministic threshold against capability-keyword score); LLM provides `discoveryNarrative` advisory.
- **Obj #22 (mode logic conflicts):** RESOLVED via §13.4 mode-conditional clarification. Agent #11 OUTPUT is mode-agnostic; cadence is uniform across modes (monthly + daily 03:00 UTC per Locked Rule 16); `pipelineMode` field ALWAYS present per Obj #30 reconciliation, valued `'cross-step'` for cross-step agents.
- **Obj #25 (SSOT write scope):** RESOLVED via §13.11 "SSOT field-ownership partition" — Agent #11 has NO ProductSSOT write surface in Phase 1 (produces MessageBus envelopes only); future Phase 2 (hypothetical) would own `intelligence.candidates[]` exclusively. No overlap with #8/#9/#10/#17 SSOT scopes.
- **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18):** §13.15 added. Agent #11's competitive-set scoping + market-context for `11.platform.discovery.v1` envelopes evaluates candidates against the FULL canonical market per `product_registry.market_definition`. Narrowing market scope at the Strategic Intelligence layer (e.g. only "ESG university teams" for SAIGE) is REJECTED — candidate-relevance scoring must reflect each VEU product's full market.
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `11` |
| Name | `Strategic Intelligence` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | **`flowai-only`** |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — Strategic Intelligence produces signals, never executes side effects |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** scans curated industry-tracker URLs (Hacker News AI tag, Product Hunt AI category, OpenRouter `/v1/models`, Browserless `/marketplace`, v0 `/changelog`, etc.) per CA-9-A.2; consumes `community.signal.v1` (curated Slack/Discord webhooks); polls vendor changelog feeds → `vendor.changelog.poll.v1`; consumes `26.orchestra.deprecated.v1` for vendor-risk signal (cycle-broken per §13.17).
- **Decide:** hybrid classification per §13.13 — rule-based capability-keyword extraction + LLM narrative. Surfaces emerging threats + opportunities. Joint carve-out evaluation with Agent #14 per §8.1 §CA-9-A.6.
- **Execute:** emits `11.platform.discovery.v1` candidate signals; produces monthly marketplace-intelligence reports per Locked Rule 16; emits `11.carveout_flag.v1` for §8.1 panel-gate input; emits `11.cycle.empty.v1` when a scheduled cycle yields no new candidates (advisory-only).
- **Emit:** see §3.

## 3. MessageBus topics

**Consumes:**
- `community.signal.v1` (curated webhooks)
- `vendor.changelog.poll.v1` (own dispatch)
- `26.orchestra.deprecated.v1` (vendor-risk feedback per §13.17 cycle-break)

**Produces (4 net-new topics — within 5-topic ceiling):**
- `11.platform.discovery.v1` — payload: `{ candidate_id, candidate_name, source, evidence_url, observed_capabilities[], recommendedAction, relevanceScore, marketScope, discoveryNarrative, pipelineMode, at }` (per CA-9-B)
- `11.marketplace_intelligence_report.v1` — monthly digest per Locked Rule 16 (canonical; supersedes legacy `11.brief.weekly.v1`)
- `11.carveout_flag.v1` — payload: `{ candidate_id, reason: 'security'|'legal'|'regulatory'|'ip-risk', evidence, at }` (input to §8.1 panel-gate)
- `11.cycle.empty.v1` — payload: `{ cycleStartedAt, reason: 'no-new-candidates'|'trackers-all-empty'|'budget-cap-reached', at }` (Obj #11-style failure-handling envelope)

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('crawl', { url: industryTrackerUrl }, opts);
orchestra.dispatch('analyze', { artifact, criteria: 'strategic-relevance-narrative' }, opts);  // LLM advisory only
orchestra.dispatch('extract-structured', { text, schema: candidateSchema }, opts);
```

## 5. ToolMenu (per CA-11-B.2)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research`, `analyze` |
| 2 | Anthropic API direct | `anthropic-api` | high | `analyze`, `extract-structured` |
| 3 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, `summarize`, multimodal |
| 4 | Browserless | `browserless` | low | `crawl` (vendor changelog poll, curated tracker URLs) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent11StrategicIntelligence.js                # ~520 LOC
src/lib/agents/agents/__tests__/Agent11StrategicIntelligence.test.js # ~340 LOC
src/lib/agents/agents/trackers/                                      # NEW directory — curated industry-tracker URL list per CA-9-A.2
  industry-trackers.json                                             # canonical tracker URL set; Panel-reviewed quarterly
src/lib/agents/agents/strategicIntelligence/                         # helper modules
  ruleBasedCandidateClassifier.js                                    # deterministic capability-keyword scorer
  cycleBreakerInitializer.js                                         # ensures #11 starts before #26 per §13.17
```

**Class skeleton:**

```js
export class Agent11StrategicIntelligence extends BaseAgent {
  static charterId = 11;
  static charter() {
    const r = getAgent(11);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* rule-based discovery + LLM narrative second-pass */ }
  async act(ctx, plan) { /* emit 4-topic set per §3 */ }
  async recommend(ctx) { /* cross-step invocation API */ }
}
```

## 7. OrchestratorHub wire-in pattern

Cross-step agents register via `hub.registerCrossStep('strategic-intelligence', agent)`. Cadence: ≥monthly + daily 03:00 UTC alignment with Sprint PROTECT-1 Phase 2 scheduled-self-test per CA-9-A.2. **Initialisation gate:** `cycleBreakerInitializer` ensures #11 emits at least one cycle BEFORE Agent #26 starts consuming `11.platform.discovery.v1` (per §13.17).

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A11-N1 | Nominal | Discovery loop produces ≥1 `11.platform.discovery.v1` event per tracked URL with content |
| A11-N2 | Nominal | Monthly digest aggregates ≥10 candidates with classification |
| A11-N3 | Nominal | AWS-bound seed candidate (Kiro, Q Developer) triggers `11.carveout_flag.v1` with reason `data-residency` |
| A11-N4 | Nominal | Rule-based classifier confidence ≥0.6 → LLM second-pass SKIPPED; canonical `recommendedAction` from rules |
| A11-N5 | Nominal | Empty cycle (all trackers empty + no community signals) → emits `11.cycle.empty.v1` reason `trackers-all-empty` |
| A11-M1 | Malformed | Tracker URL returns empty body → discovery skips that tracker; logs `tracker-empty` warning |
| A11-M2 | Malformed | Vendor changelog feed unreachable → fallback to next-best ToolMenu adapter per CA-11-A.4 |
| A11-E1 | Edge | 100 candidates discovered in a single cycle → batched into ≤10 envelopes for downstream consumers |
| A11-E2 | Edge | Candidate already in §8 Orchestra roster → `11.platform.discovery.v1` skipped (no-op; rule-based dedup) |
| A11-E3 | Edge | Initialisation order: #26 attempts consume before #11 first emit → blocked by cycle-breaker gate per §13.17 |
| A11-X1 | Adversarial | Hostile tracker URL serves prompt-injection content → analyze (LLM advisory pass) does NOT execute the injection; rule-based pass is immune by design |
| A11-X2 | Adversarial | Hostile getter pattern test |
| A11-X3 | Adversarial | Cross-tenant tracker tampering blocked (`flowai-internal` audit-write only) |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A11-* tests passing
- `industry-trackers.json` content Panel-reviewed ≥7/10
- Daily 03:00 UTC scheduled job invokes Agent #11; ≥7 consecutive days emit non-empty envelopes
- Agent #26 Orchestra Research Agent consumes `11.platform.discovery.v1` end-to-end on at least 3 candidates AFTER #11's initialisation gate clears
- W4 adversarial coverage ≥7 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** CA-9 promoted (§8.1 auto-admission + Agent #26 charter) — already canonical per ENTRY 005
- **Soft depends on:** `community.signal.v1` webhook receivers (NEW endpoint; deferred); Agent #11 ships with crawl + vendor-changelog-poll first; community-signal wired later
- **Provides to:** Agent #26 (consumes `11.platform.discovery.v1` AFTER #11's initialisation gate clears); Agent #15 Benchmarking; Agent #17 Product Evolution
- **Initialisation order constraint (§13.17):** #11 must complete ≥1 cycle before #26 begins consumption

## 11. Estimated build effort

**~12 W-hours** Phase 1 (discovery loop + monthly digest + carveout-flag emitter + cycle-breaker init).

## 12. Open clarification flags

- **Q (RESOLVED v2 — ratification gated):** Initial `industry-trackers.json` content — Panel ratifies the canonical URL set BEFORE Agent #11 first-ship. Same rubric-style gate as Agent #8 v2 §13.5.
- **Q (RESOLVED v2 — implementation):** Monthly digest format — Markdown + JSON parity, matches W4 §6.3 reporting requirement.

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict.

- **A-a (boundary-class):** Agent #11 is `cross-step flowai-only` cost-class; cost aggregated at agent×cycle grain. All LLM dispatches via §5 ToolMenu MUST call `costGovernor.reserve(estimatedUsd)` + `settle(actualUsd)` + emit `agent.cost.signal.v1`.
- **A-b (advisory-lock + lease-token):** PostgreSQL advisory-lock + 60s lease TTL per Cluster A v3 §2.5.
- **A-c (SERIALIZABLE isolation):** mutations through canonical Cluster A library only.
- **A-d (halt envelope):** budget-cap → `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }` + emit `11.cycle.empty.v1 { reason: 'budget-cap-reached' }` per §3.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

Output mode-agnostic; cadence uniform across modes (cross-step agent). `pipelineMode` field ALWAYS present on every emit per Obj #30 reconciliation; for cross-step agents the value is `'cross-step'` (or `'mixed'` for per-product aggregations).

### §13.11 — SSOT field-ownership partition (Obj #25 resolution)

| SSOT field family | Owner | Other agents' access |
|---|---|---|
| (Phase 1) NO ProductSSOT writes from Agent #11 | n/a | n/a |
| (Phase 2 hypothetical) `intelligence.candidates[]` | Agent #11 (future sibling) | read-only |
| `audit.*`, `gtm.*`, `monitor.*`, `governance_record[]` | #8 / #9 / #10 / #3-Executor | read-only to #11 |

No semantic-collision risk; Agent #11 produces MessageBus envelopes only in Phase 1.

### §13.12 — Topic name canonicalisation (Obj #01 / #15 / #23 / #31 resolution)

Canonical produces set (4 topics, within 5-topic ceiling):
- `11.platform.discovery.v1` (CA-9-B canonical)
- `11.marketplace_intelligence_report.v1` (Locked Rule 16 canonical; supersedes legacy `11.brief.weekly.v1`)
- `11.carveout_flag.v1` (§8.1 carve-out canonical)
- `11.cycle.empty.v1` (NEW v2 — failure-handling envelope)

`_registry.ts` row 11 `produces` field migrates to this exact list at first-ship. The legacy `11.brief.weekly.v1` is REMOVED (not dual-emitted — was never live in production).

### §13.13 — LLM-grounding hardening (Obj #16 resolution)

Candidate classification HYBRID:
- **Rule-based primary (deterministic):** capability-keyword extraction + structured changelog parsing. Outputs `{ capabilities[], relevanceScore: 0..1, recommendedAction: 'admit_candidate'|'monitor'|'reject' }`.
- **LLM secondary (advisory):** narrative paragraph for `discoveryNarrative` field; relevance-ranking re-score advisory only. Canonical `recommendedAction` REMAINS the rule-based output.

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)

Agent #11's candidate-relevance scoring evaluates against the FULL canonical market per `product_registry.market_definition` (mirrors SSOT §1.1; PERMANENT). For each VEU product, the candidate's observed capabilities must be relevant to the product's full market — not a narrowed sub-segment. Examples:
- A candidate adapter "ESG university research dashboard" is scored against SAIGE's FULL "EHS/ESG/CSR/Sustainability/SDG practitioners and orgs globally" market — high relevance for the university sub-segment but partial relevance for the full market.
- A "pregnant-women-in-Nigeria community platform" is scored against MyPregLife's FULL "any person/family navigating pregnancy globally" market — Africa-first launch context is acknowledged but relevance score reflects global market.

Narrowing the market at Agent #11's classification layer is REJECTED — `narrowMarketAt: 'agent11'` is not a valid configuration.

### §13.17 — Cycle-breaking init order (Obj #05 resolution)

The #11 ↔ #26 dependency cycle is broken via STRICT initialisation order + asynchronous bus mediation:

| Step | Action | Constraint |
|---|---|---|
| 1 | Agent #11 starts first | Seeds discovery from W3-curated `industry-trackers.json`; NO #26 dependency for initial cycle |
| 2 | Agent #11 completes first cycle | Emits `11.platform.discovery.v1` envelopes (or `11.cycle.empty.v1` if no candidates) |
| 3 | Agent #26 cycle-breaker gate releases | `cycleBreakerInitializer` (in #26's bootstrap) waits for #11's first-cycle envelope before allowing #26's consumption start |
| 4 | Agent #26 begins consumption | Reads #11's emissions via MessageBus (async; no sync call into #11) |
| 5 | Agent #26 deprecations feed back to #11 | `26.orchestra.deprecated.v1` → #11 consumes for vendor-risk signal in NEXT cycle (async; cycle cannot deadlock) |

**Deadlock impossibility proof:** read-through-MessageBus is asynchronous; both agents are scheduled (not request/response). `cycleBreakerInitializer` enforces the strict order at boot via a one-time gate; once #11's first envelope lands, #26 starts and the bidirectional feedback is steady-state.

## 14. Cluster C integration — see §13.4

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 4 `11.*` topics conform to v3 §2.2 naming; migration test harness per §2.3.1 covers all 4 topics.
- **D-b (retention-class binding):** `11.carveout_flag.v1` is `retention-class: governance` (7-year + hash-chain mirror per §8.1 panel-gate auditability). `11.platform.discovery.v1` + `11.marketplace_intelligence_report.v1` are `retention-class: operational` (90-day; high volume). `11.cycle.empty.v1` is `retention-class: operational` (30-day; advisory).
- **D-c (replay-buffer semantics):** idempotency key `cycleStartedAt + candidate_id` prevents replay double-emit.

**Topic-per-ship ceiling:** 4 net-new topics fit within single first-ship commit.

**Load-test artifact gate:** shared Wave 1 cohort artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED context

Agent #11 primary `[RECOMMEND_ONLY]`; no sibling Executor (Strategic Intelligence is read-only by design per §1 + §2). No charter change required; Agent #11 was always on the canonical recommend-only path. No roster mutation, no sibling registration. Authoritative ceiling enforcement via `BaseAgent.guard()` per Cluster E v3 §2.5 applies on every dispatch.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **01/15/23/31** | Topic naming unresolved | §13.12 — 4 canonical topics; `11.brief.weekly.v1` removed |
| **05** | #11 ↔ #26 dependency cycle | §13.17 — init order + async bus mediation; deadlock impossible |
| **16** | Over-reliance on LLMs | §13.13 — rule-based primary; LLM advisory only |
| **22** | Mode logic conflicts | §13.4 — output mode-agnostic; cadence uniform |
| **25** | SSOT write scope | §13.11 — no ProductSSOT writes in Phase 1 |
| **30** | Cluster C `pipelineMode` consistency | §13.4 — always present |
| **N/A** | VEU §1.1 market scope (CEO 2026-05-18) | §13.15 — full-market scoring; narrowing rejected |

---

*End of Agent #11 Strategic Intelligence build blueprint v2. Panel `PLURALITY_A11-REVISE` 6/9 objections resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification.*
