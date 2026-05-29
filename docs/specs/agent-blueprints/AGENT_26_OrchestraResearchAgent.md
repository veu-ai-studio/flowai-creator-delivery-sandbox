# Agent #26 — Orchestra Research Agent — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A26-REVISE` plurality 5/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs; addresses A26 Panel objections + applies cluster-fix paste blocks)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal Executor pattern from CA-7 §15.5 EXECUTOR_REGISTRY sibling — **NOT** the dual-authority-on-primary pattern from the legacy CA-9-Q4=(b) arbitration. **CA-9-Q4 Option (a) is LOCKED per CANONICAL_HISTORY ENTRY 009** — Agents #21 + #26 route through EXECUTOR_REGISTRY sibling pattern; primary charter reverts to `[RECOMMEND_ONLY]`.
**Anchor canonical:** Rev-2.1 §15.1 row 26 + §8.1 (auto-admission pipeline owner) + CA-9-A + CA-9-B + §25 Locked Rule 2 (26-agent canonical roster) + CA-11-B.9 ToolMenu + **CA-9-Q4 Option (a)** (ENTRY 009 LOCKED) + CA-7 §15.5 EXECUTOR_REGISTRY sibling.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #66 / #97 (authority contradiction at primary layer):** §1 identity table authority field is now **`[RECOMMEND_ONLY]`** only. The dual-authority capability surface (`[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`) moves to the NEW `orchestra-research-executor` sibling registered in `EXECUTOR_REGISTRY` per CA-7 §15.5. v1's `[RECOMMEND_ONLY, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` compound charter is **REMOVED** from the primary layer. `BaseAgent.guard()` retains strict per-invocation `authorityNeeded` set membership.
- **Obj #82 (CA-9-Q4 re-disposition uncertainty):** RESOLVED — CA-9-Q4 Option (a) is LOCKED per ENTRY 009. v2 reflects the locked disposition; no further CEO arbitration required.
- **Obj #85 / #99 (_registry.ts 25→26 roster mutation risk):** §6.1 + §10 now explicitly distinguish (a) PRIMARY roster expansion 25→26 entries for Agent #26's primary row, vs (b) `EXECUTOR_REGISTRY` addition of the `orchestra-research-executor` sibling slot. Primary-roster expansion follows the canonical §15.1 row 26 catalogue; `validateRoster()` accepts 26 once Agent #26 first ships. The sibling lives in `EXECUTOR_REGISTRY` (a separate adapter registry per CA-7 §15.5), so no primary-roster cardinality entanglement. Migration order: primary-row addition lands BEFORE sibling registration to keep `validateExecutors()` invariant satisfied.
- **Cluster C paste block (Cluster C PROMOTED per ENTRY 009):** §14 added with canonical MessageBus topic + schema-validator integration. All 7 `26.orchestra.*` topics + `community.signal.v1` consumed-side declarations comply with the Cluster C canonical envelope shape; schema-validator hooks declared inline.
- **Cluster A Path P1 paste block (ACCEPT-WITH-CONDITIONS `A-a..A-d` per ENTRY 009):** §13 added per Cluster A v3 §3.1 + the 4 P1 conditions. Cost-signal emission boundary class membership documented; `costGovernor.reserve()` integration inline.
- **Cluster D paste block (PROMOTE-WITH-CONDITIONS `D-a/D-b/D-c` per ENTRY 009):** §15 added per Cluster D v3 §2.7 (hash-chain mirroring) + §2.8 (load-test artifact) + §2.1.0-Def (5-topic-per-ship ceiling). Agent #26 emits 7 topics; per the 5-topic ceiling, the §14.1 micro-amendment splits across two ship commits (5 topics in commit 1, 2 topics in commit 2 — see §15).
- **Cluster E paste block (v3 + Cluster E v4 LOCKED Option (a) per ENTRY 009):** §16 added per Cluster E v3 §2.6 (CEO re-arbitration block — Option (a) ratified) + §5.1 (§15.1 roster delta verbatim for Agent #26). Cluster E v4 final-form authority-ceiling template is still in flight per ENTRY 009 SPLIT status; v2 anchors to the Option (a) decision while flagging v4-readiness gaps for the Cluster E v4 dispatch.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

---

## 1. Agent identity (v2 — primary charter reverted to `[RECOMMEND_ONLY]` per CA-9-Q4 Option (a) LOCKED)

| Field | Value |
|---|---|
| ID | `26` |
| Name | `Orchestra Research Agent` |
| Mode | `always-on` |
| Step | n/a (always-on — runs continuously per §8.1 auto-admission cadence) |
| Embedding | `embedded` |
| **Primary charter authority (v2)** | **`[RECOMMEND_ONLY]`** — auto-admission *recommendation* envelopes only. The primary agent emits candidate-decision envelopes (`26.orchestra.candidate.v1` etc.); the actual auto-admission *write* (`26.orchestra.admitted.v1` lifecycle commit + Orchestra registry mutation) is performed by the sibling Executor (row below) per CA-9-Q4 Option (a) ENTRY 009 LOCKED + CA-7 §15.5 EXECUTOR_REGISTRY pattern. |
| **Sibling Executor (NEW per v2)** | **`orchestra-research-executor`** — registered in `EXECUTOR_REGISTRY` (per CA-7 §15.5) at Agent #26 first-ship commit. **Sibling charter authority:** `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. The sibling consumes the primary's `26.orchestra.candidate.v1` recommendations and performs the auto-admission write path (Orchestra adapter registration, lifecycle-state transitions, CANONICAL_HISTORY one-line append). `BaseAgent.guard()` enforces strict per-invocation `authorityNeeded` set membership at the sibling boundary. |
| Future Executor (Phase 2) | **N/A** — the sibling above IS the Executor; there is no separate Phase 2 elevation. The primary-vs-sibling split lands in Phase 1 alongside the Wave 1 cohort. |

## 2. Perceive → Decide → Execute → Emit cycle (v2 — split across primary `[RECOMMEND_ONLY]` and sibling `orchestra-research-executor`)

**Primary (`Agent26OrchestraResearch`, `[RECOMMEND_ONLY]`):**
- **Perceive:** consumes `community.signal.v1` (curated Slack/Discord webhooks per CA-9-A.2); consumes `11.platform.discovery.v1` (Agent #11's curated tracker output); consumes `15.benchmark.head_to_head.v1` (Agent #15's scoring); consumes `17.orchestra.deprecation_proposal.v1` (Agent #17's portfolio composition recommendations); polls vendor changelog feeds → `vendor.changelog.poll.v1` (own dispatch); processes the CEO-supplied seed list (13 candidates per §8.1) on first cycle.
- **Decide:** runs the §8.1 four-condition auto-admission gate per candidate — `rank_score ≥ 0.70` AND `head_to_head_minimum_invocations ≥ 30` AND capability-gap (existing Orchestra <2 wired members for at least one candidate capability) AND no carve-out flag from Agent #11 or Agent #14.
- **Recommend:** emits the candidate recommendation envelope `26.orchestra.candidate.v1` with one of four `recommendedAction` values (`admit` / `reject` / `panel_gate` / `reactivate`). Primary does NOT write to the Orchestra adapter registry directly; the recommendation is consumed by the sibling Executor.

**Sibling Executor (`orchestra-research-executor`, `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`):**
- **Guard:** `BaseAgent.guard()` enforces per-invocation `authorityNeeded` set membership; admission-write paths declare `authorityNeeded=[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. The `requires_human_gate` may auto-resolve when the primary's `recommendedAction` was `admit` AND all 4 gate conditions cleared cleanly (no carve-out, no policy flag); other paths route to Panel + CEO per Locked Rule 13.
- **Execute:** emits the appropriate decision envelope per the primary's recommendation:
  - `26.orchestra.admitted.v1` (auto-admit; writes new lifecycle state `Trial` per §8.1 lifecycle table; mutates Orchestra adapter registry)
  - `26.orchestra.candidate_rejected.v1` (below threshold)
  - `26.orchestra.candidate_panel_gate.v1` (carve-out flagged; routes to Panel + CEO per Locked Rule 13)
  - `26.orchestra.candidate_reactivated.v1` (Archived → Trial per §8.1 Re-activation Path)
  - Lifecycle transitions: `26.orchestra.lifecycle_state_changed.v1` on every Trial → Probation → Full member transition; `26.orchestra.deprecated.v1` on Panel + CEO-gated deprecation.
- **Audit:** writes one-line entries to `docs/CANONICAL_HISTORY.md` SECTION 8 + pointer in §18.4 on every admission per §8.1 (preserving §18 archive discipline even when the decision is automated).

**Why this split (Obj #66 / #82 / #97 resolution):** elevated authority lives in the EXECUTOR_REGISTRY sibling namespace; the primary stays `[RECOMMEND_ONLY]` per the canonical CA-7 §15.5 pattern (same shape as Agent #3 Self-Renewal Executor). The legacy CA-9-Q4=(b) "dual-authority on primary" pattern is superseded by CA-9-Q4 Option (a) LOCKED per ENTRY 009.

## 3. MessageBus topics

**Consumes** (per ENTRY 005 §15.1 row 26):
- `community.signal.v1`
- `11.platform.discovery.v1`
- `15.benchmark.head_to_head.v1`
- `17.orchestra.deprecation_proposal.v1`
- `vendor.changelog.poll.v1` (self-dispatched)

**Produces** (the 7 `26.orchestra.*` topics per ENTRY 005 §8.1):
- `26.orchestra.candidate.v1`
- `26.orchestra.admitted.v1`
- `26.orchestra.candidate_rejected.v1`
- `26.orchestra.candidate_panel_gate.v1`
- `26.orchestra.deprecated.v1`
- `26.orchestra.lifecycle_state_changed.v1`
- `26.orchestra.candidate_reactivated.v1` (per §CA-9-A.5.1 added)

## 4. Orchestra dispatch usage (per §15.4)

```js
// Web research / candidate discovery
orchestra.dispatch('crawl', { url: trackerUrl }, opts);  // curated industry-tracker URLs

// Candidate analysis + classification
orchestra.dispatch('analyze', { artifact: candidateEvidence, criteria: 'orchestra-admission-fit' }, opts);
orchestra.dispatch('extract-structured', { text, schema: candidateSchema }, opts);

// Vendor changelog poll
orchestra.dispatch('crawl', { url: vendorChangelogUrl, force: true }, opts);
```

## 5. ToolMenu (per CA-11-B.9)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research`, `vendor-tracking` |
| 2 | Browserless | `browserless` | low | `crawl` (vendor changelog poll + curated tracker URLs) |
| 3 | OpenRouter (frontier models) | `openrouter` | high | `analyze`, `summarize`, `extract-structured` |
| 4 | Anthropic API direct | `anthropic-api` | high | `analyze` (candidate fit assessment) |

## 6. Implementation file structure (v2 — primary + sibling split)

```
src/lib/agents/agents/Agent26OrchestraResearch.js                  # ~480 LOC (primary: discovery loop + 4-condition gate + candidate recommendation envelopes; NO admission-write path)
src/lib/agents/agents/__tests__/Agent26OrchestraResearch.test.js   # ~320 LOC
src/lib/agents/executors/OrchestraResearchExecutor.js              # ~280 LOC (NEW v2: sibling Executor — consumes primary recommendations + admission-write path + 5-state lifecycle + CANONICAL_HISTORY writer)
src/lib/agents/executors/__tests__/OrchestraResearchExecutor.test.js  # ~200 LOC
src/lib/agents/agents/orchestraResearch/                            # helper modules (shared between primary + sibling)
  fourConditionGate.js                                              # §8.1 gate implementation (pure function — used by primary)
  lifecycleStateMachine.js                                          # 5-state lifecycle transitions (used by sibling)
  seedListProcessor.js                                              # CEO-supplied 13-candidate batch on first cycle (used by primary)
  historyLogWriter.js                                               # one-line CANONICAL_HISTORY entry per admission (used by sibling)
```

**Primary class skeleton (v2 — `[RECOMMEND_ONLY]` charter):**

```js
export class Agent26OrchestraResearch extends BaseAgent {
  static charterId = 26;
  static charter() {
    const r = getAgent(26);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,   // embedded
      authority: [AUTHORITY.RECOMMEND_ONLY],         // v2 — sibling carries auto_write_internal + requires_human_gate
      requiredCredentials: [...r.requiredCredentials],  // ANTHROPIC_API_KEY, BROWSERLESS_API_KEY
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* run discovery loop OR process seed-list batch on first cycle */ }
  async recommend(ctx) {
    // Per-candidate: apply 4-condition gate; emit 26.orchestra.candidate.v1
    // with recommendedAction in {'admit','reject','panel_gate','reactivate'}.
    // Sibling Executor consumes and performs the admission-write per CA-7 §15.5.
  }
  // NO act() — primary does not perform side effects. Recommendation envelopes only.
}
```

**Sibling Executor skeleton (NEW v2 — `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` in EXECUTOR_REGISTRY):**

```js
// Registered in EXECUTOR_REGISTRY per CA-7 §15.5 — sibling for agentId=26.
export class OrchestraResearchExecutor extends BaseExecutor {
  static executorKey = 'orchestra-research-executor';
  static charterAgentId = 26;
  static charter() {
    return Object.freeze({
      key: 'orchestra-research-executor',
      agentId: 26,
      authority: [AUTHORITY.AUTO_WRITE_INTERNAL, AUTHORITY.REQUIRES_HUMAN_GATE],
      consumes: ['26.orchestra.candidate.v1'],
      produces: [
        '26.orchestra.admitted.v1', '26.orchestra.candidate_rejected.v1',
        '26.orchestra.candidate_panel_gate.v1', '26.orchestra.candidate_reactivated.v1',
        '26.orchestra.lifecycle_state_changed.v1', '26.orchestra.deprecated.v1',
      ],
    });
  }
  async execute(ctx, candidateRecommendation) {
    // BaseAgent.guard() enforces authorityNeeded=[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]
    // requires_human_gate auto-resolves on clean admit; carve-out / policy flags route to Panel.
    // Performs Orchestra adapter registry mutation + lifecycle transition + history-log append.
  }
}
```

## 7. OrchestratorHub wire-in pattern

`always-on` registration via `hub.registerAlwaysOn('orchestra-research', agent)`. Inngest scheduled jobs:
- **Daily 03:00 UTC** (aligns with Sprint PROTECT-1 Phase 2 scheduled-self-test) — main research loop per §8.1
- **Daily 04:00 UTC** — vendor changelog poll per CA-9-A.2
- **Continuous (push)** — `community.signal.v1` webhook ingestion
- **Quarterly cadence** — Archived-member re-evaluation per §8.1 Re-activation Path (Lovable + Replit)

## 8. Test plan (matching Agent #3 rigor)

| ID | Category | Test |
|---|---|---|
| A26-N1 | Nominal | Seed-list batch (13 candidates) processed on first cycle; each emits `26.orchestra.candidate.v1` with `source = "ceo_seed_list_2026-05-15"` |
| A26-N2 | Nominal | Candidate clearing all 4 gate conditions → `26.orchestra.admitted.v1` + lifecycle state `Trial`; one-line CANONICAL_HISTORY entry written |
| A26-N3 | Nominal | Candidate failing rank threshold (rank_score < 0.70) → `26.orchestra.candidate_rejected.v1` reason `below_threshold` |
| A26-N4 | Nominal | Archived member (Lovable / Replit) re-evaluated; clears gate → `26.orchestra.candidate_reactivated.v1`; lifecycle `Archived → Trial` |
| A26-M1 | Malformed | Discovery returns empty list → no envelopes emitted; logs trace "no candidates" |
| A26-M2 | Malformed | Candidate evidence corrupted → schema error; specific candidate skipped, others continue |
| A26-E1 | Edge | Candidate at exactly rank_score=0.70 → admitted (boundary check; inclusive) |
| A26-E2 | Edge | Candidate at head-to-head invocations=29 → not yet admitted (per §8.1 ≥30 threshold) |
| A26-E3 | Edge | AWS-bound seed candidate (Kiro, Q Developer) → `26.orchestra.candidate_panel_gate.v1` reason `carveout: data-residency` regardless of rank_score |
| A26-X1 | Adversarial | Dual-authority charter violation: plan declares `authorityNeeded=[AUTO_WRITE_INTERNAL]` without `[REQUIRES_HUMAN_GATE]` → BaseAgent.guard() rejects per CA-9-Q4=(b) (must declare both) |
| A26-X2 | Adversarial | Prompt-injection in candidate evidence does NOT alter the 4-condition gate logic |
| A26-X3 | Adversarial | Hostile getter pattern test (matches Agent #3 X1) |
| A26-X4 | Adversarial | Replay attack: same `candidate_id` processed twice within TTL → second emission idempotent (no duplicate admission) |
| A26-X5 | Adversarial | Cross-tenant tampering with the seed list blocked (`flowai-internal` audit-write only) |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A26-* tests passing
- All 7 `26.orchestra.*` topics emit valid payloads against MessageSchema.js validators
- 5-state lifecycle state machine tested across all transitions (Trial → Probation → Full member; Probation → red-health → Trial demotion; Full member → Deprecated; Archived → Trial reactivation)
- Seed-list batch processed end-to-end on first invocation; all 13 candidates emit `26.orchestra.candidate.v1`
- CANONICAL_HISTORY one-line append works correctly (atomic write; file integrity preserved)
- ≥7 consecutive days of daily 03:00 UTC + 04:00 UTC scheduled invocations produce non-empty telemetry
- At least one real auto-admission (or one real carveout-flag panel-gate) executes end-to-end in production
- W4 adversarial coverage ≥12 cases passing (Agent #26 has the most adversarial test surface of any agent — security-critical auto-admission)

## 10. Dependencies + sequencing notes

- **Hard depends on:**
  - CA-9-A + CA-9-B promoted (§8.1 auto-admission + Locked Rule 2 26-agent count + dual-authority `BaseAgent.guard()` amendment) — ALL CANONICAL per ENTRY 005
  - CA-11-C ToolMenu schema (post-CA-11 promotion) — would unlock per-agent ToolMenu validation; until then, ships with hardcoded ToolMenu inline
  - Agent #11 Strategic Intelligence + Agent #14 Public Policy SHIPPED-GREEN (joint carve-out evaluators per §8.1 §CA-9-A.6)
  - Agent #15 Benchmarking SHIPPED-GREEN (per CA-9-B head-to-head scoring → §8.1 condition #2)
- **Soft depends on:** Agent #17 Product Evolution SHIPPED-GREEN (consumes its deprecation proposals)
- **Provides to:** All other agents (Orchestra composition is portfolio-wide); Self-Renewal cycle (per `26.orchestra.deprecated.v1` adapter de-listing); admin/CEO via Panel consultations

## 11. Estimated build effort

**~22 W-hours** (largest dormant agent — 4-condition gate + 5-state lifecycle + 7 topic emissions + seed-list batch + CANONICAL_HISTORY writer + dual-authority handling). NOTE: dual-authority is the same shape as Agent #3 Self-Renewal Executor per CA-7; pattern is already proven, but Agent #26 is the FIRST agent to ship with the dual-authority shape at the primary-agent layer (Self-Renewal Executor lives in EXECUTOR_REGISTRY sibling namespace).

## 12. Open clarification flags

None blocking. Charter is fully canonical post-ENTRY 005. The 4-condition gate logic + 5-state lifecycle + seed-list processing are all spec'd in Rev-2.1 §8.1 verbatim. **Agent #26 is the most build-ready of the 20 dormant agents** — every parameter is canonical.

Optional clarifications (NOT blocking):
- **OPTIONAL Q:** Quarterly re-evaluation cadence for Archived members (Lovable + Replit) — quarterly recommended per §CA-9-A.5.1 but cadence is not strictly canonical. **OPTIONAL.**
- **OPTIONAL Q:** Curated industry-tracker URL list (Hacker News, Product Hunt, OpenRouter `/v1/models`, etc. per §8.1 + CA-9-A.2) — should ship with a canonical seed list reviewed by Panel ≥7/10. Could ship with W3-curated list initially + Panel-ratify in first quarterly cycle. **OPTIONAL.**

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `docs/specs/canonical-templates/CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict. The four ratification conditions are reflected verbatim below:

- **A-a (boundary-class membership documented):** Agent #26 is in the canonical **`always-on cross-tenant`** cost-class per Cluster A §3.1; cost-signal aggregation is at the agent×day grain. All LLM dispatches (Perplexity / OpenRouter / Anthropic direct per §5 ToolMenu) MUST call `costGovernor.reserve(estimatedUsd)` BEFORE dispatch + `costGovernor.settle(actualUsd)` after dispatch + emit `agent.cost.signal.v1` per Cluster A §2.2 envelope.
- **A-b (advisory-lock + lease-token pattern):** `costGovernor.reserve()` uses the advisory-lock + lease-token discipline from Cluster A v3 §2.5 (PostgreSQL advisory lock + 60s lease TTL); Agent #26 retries on `LEASE_EXPIRED` with a fresh `reserve()` call before falling through to halt.
- **A-c (SERIALIZABLE isolation for budget mutations):** `flowai_run_budgets` mutations issued by Agent #26 (via the Cluster A library, not direct SQL) MUST run under SERIALIZABLE isolation per Cluster A v3 §2.7. Agent #26 does not bypass the canonical reserve/settle path.
- **A-d (cost-signal halt envelope):** if `costGovernor.reserve()` denies due to budget AND Agent #26 has no further fallback adapter on its ToolMenu, the agent halts the cycle with `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }` per the canonical Cluster A halt envelope. Per-cycle work is checkpointed so the next cadence resumes from the unfinished candidate set.

Cost envelope per Agent #26 cycle (per §11 estimate + Note 3 from CLUSTER_A v3 §6): ~$3-8 per daily cycle in steady state (4-condition gate analysis + candidate-fit prompts via Anthropic + crawl costs via Browserless / Perplexity).

## 14. Cluster C integration — PROMOTED canonical MessageBus topic + schema-validator block (v2 paste block)

Per `docs/specs/canonical-templates/CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md` + ENTRY 009 Cluster C PROMOTED verdict. Cluster C is the canonical MessageBus-touching template for every downstream agent.

**Topic + schema-validator declarations:**
- **Consumed (per §3 above):** `community.signal.v1`, `11.platform.discovery.v1`, `15.benchmark.head_to_head.v1`, `17.orchestra.deprecation_proposal.v1`, `vendor.changelog.poll.v1`. Each is validated against the canonical Cluster C envelope shape on consume (mode-stamping carries the `pipelineMode` field for Cluster C ratification).
- **Produced (primary + sibling, 7 topics total per §3 + §6 above):** all 7 `26.orchestra.*` topics. Each emit validates against the per-topic schema declared in `MessageSchema.js` (Cluster D v3 §2.3 contract); unknown-topic emits throw `UNKNOWN_TOPIC[<topicName>]` per Cluster D §2.3 invariant.
- **Mode-stamping (per Cluster C §2.4):** every Agent #26 emit carries `pipelineMode` derived from the cycle's invocation context (mode-1 / mode-2 / mode-3A per CA-12 v3 §A.1). Since Agent #26 is `always-on cross-tenant`, the cycle aggregates per-product modes via a `pipelineMode: 'mixed'` value when the cycle spans multiple modes; per-candidate envelopes carry the candidate's specific mode.

**Schema validator hook:** `MessageBus.emit()` calls validate against `src/lib/messages/MessageSchema.js` per the Cluster C registration. Agent #26's seven topic declarations are added to `MessageSchema.js` in the same commit as `_registry.ts` row 26 (see §17 below).

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (v2 paste block, D-a/D-b/D-c)

Per `docs/specs/canonical-templates/CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009 Cluster D PROMOTE-WITH-CONDITIONS verdict (D-a / D-b / D-c).

- **D-a (envelope drift guards):** all 7 `26.orchestra.*` topic payloads conform to the Cluster D v3 §2.2 naming convention (`<agentId>.<area>.<action>.v<schemaVersion>`); migration test harness per §2.3.1 covers Agent #26's seven topics before the §14.1 micro-amendment lands.
- **D-b (retention-class binding):** all 7 `26.orchestra.*` topics are classified as `retention-class: governance` (per Cluster D §14.3 + ENTRY 009 D-b condition) → 7-year cold-store retention + hash-chain mirroring per Cluster D v3 §2.7. Hash-chain mirror posts to both Slack webhook + S3 object-lock per the v3 §2.7 contract.
- **D-c (replay-buffer semantics):** Agent #26's idempotency key (`runId + candidate_id + cycleStartedAt`) prevents replay-buffer double-admission per A26-X4 adversarial test. Replay attempts emit `26.orchestra.candidate_rejected.v1 { reason: 'duplicate_replay' }` rather than re-emitting `admitted.v1`.

**Topic-per-ship ceiling (Cluster D v3 §2.1.0-Def, R-D2):** Agent #26 emits 7 net-new topics, exceeding the 5-topic-per-commit ceiling. Per the canonical split rule, Agent #26's §14.1 micro-amendment lands across **two ship commits**:
- **Commit 1 (Agent #26 primary first-ship):** 5 topics — `26.orchestra.candidate.v1`, `26.orchestra.admitted.v1`, `26.orchestra.candidate_rejected.v1`, `26.orchestra.candidate_panel_gate.v1`, `26.orchestra.lifecycle_state_changed.v1`.
- **Commit 2 (Agent #26 sibling Executor first-ship, follow-on):** 2 topics — `26.orchestra.deprecated.v1`, `26.orchestra.candidate_reactivated.v1`.

**Load-test artifact gate (Cluster D v3 §2.8):** Agent #26's first-ship is gated on the §14.1 P0-patch load-test artifact (`flowai.audit.load_test.v1`) being green per Cluster D AC-CD-11 (500 TPS / p99 ≤ 50ms / zero `UNKNOWN_TOPIC`). The artifact is shared across all Wave 1 agents — Agent #26 does not produce its own.

## 16. Cluster E integration — v3 + Option (a) LOCKED (v2 paste block; Cluster E v4 still in flight per ENTRY 009 SPLIT)

Per `docs/specs/canonical-templates/CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md` v3 + ENTRY 009 CA-9-Q4 Option (a) LOCKED + ENTRY 009 Cluster E v4-still-required note.

**CA-9-Q4 Option (a) compliance verbatim (Cluster E v3 §2.6 E0):**
> "CEO re-arbitration 2026-05-17: Option A selected. Agents #21 + #26 route through EXECUTOR_REGISTRY sibling pattern. Primary agents revert to `[recommend_only]`. This supersedes CA-9-Q4=(b) ratified previously."

Agent #26 v2 reflects this verbatim: primary `[RECOMMEND_ONLY]`; sibling `orchestra-research-executor` carries `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` per CA-7 §15.5.

**§15.1 roster delta (Cluster E v3 §5.1 verbatim for Agent #26):**
- Primary Agent #26 row authority: `[RECOMMEND_ONLY]` (v2 reverts from legacy `[recommend_only, auto_write_internal, requires_human_gate]`).
- NEW EXECUTOR_REGISTRY row: `orchestra-research-executor` → agentId=26, authority `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`.
- `validateExecutors()` 25-ID partition invariant: primary ∪ sibling authority for #26 = `[recommend_only, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` (recovers the legacy compound charter distributed across primary + sibling).

**Authoritative ceiling enforcement (Cluster E v3 §2.5 R2):** sibling Executor's `execute()` entry traverses `BaseAgent.guard(authorityNeeded, dispatchCtx)`; `getCeiling()` advisory cache check + Orchestrator authoritative re-validation per Cluster E v3 §2.5 + §2.8 split-brain resolution (E2: authoritative wins; `CEILING_ADVISORY_REJECT` retryable, `CEILING_EXCEEDED` non-retryable).

**Cluster E v4 readiness (ENTRY 009 SPLIT — v4 still required):** Cluster E v4 final-form template is in flight per ENTRY 009. Agent #26 v2 anchors to the Option (a) decision (the load-bearing part); the remaining v4 deltas (e.g. `recommend_only` vs `auto_write_internal` vs `requires_human_gate` boundary cases) will be reflected in a follow-up micro-revision once Cluster E v4 ratifies. Until v4 lands, Agent #26 follows the Cluster E v3 canonical path.

## 17. Registry mutation — primary 25→26 + sibling EXECUTOR_REGISTRY addition (Obj #85 / #99 resolution)

Two distinct registry mutations are required by Agent #26 first-ship; they MUST land in the canonical order below to keep `validateRoster()` + `validateExecutors()` invariants satisfied:

**Mutation 1 — Primary roster expansion 25 → 26 entries (`src/lib/agents/_registry.ts`):**
- Add row 26 `Orchestra Research Agent` to the canonical roster array.
- Update `validateRoster()` to accept exactly 26 entries (was 25 at line ~550 per Obj #85). This matches Rev-2.1 §15.1 row 26 catalogue (Agent #26 is canonical at the SSOT layer; the implementation registry catches up).
- The 5 SHIPPED-GREEN agents (#1-5) + the 20 DORMANT agents in the build cohort = 25 ≠ 26. The 26th is Agent #26 itself; `validateRoster()` accepts the new count once the row lands.
- **Migration test:** all 25 SHIPPED-GREEN expectation tests (per Obj #99 risk) re-run green against the 26-entry roster; tests that hard-code `entries.length === 25` are migrated to `entries.length === 26`.

**Mutation 2 — Sibling Executor registration (`src/lib/agents/executors/_registry.ts` or canonical EXECUTOR_REGISTRY surface per CA-7 §15.5):**
- Add `orchestra-research-executor` entry → `agentId: 26`, authority `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`.
- `validateExecutors()` accepts the new entry per CA-7 §15.5 sibling-keyed-by-primary-agentId pattern.
- EXECUTOR_REGISTRY has no 25-cap (it's a separate adapter registry, not the primary roster); no partition invariant is affected beyond the per-agent primary ∪ sibling authority union.

**Mutation ordering:** Mutation 1 lands FIRST (primary-row addition + `validateRoster()` 25→26 update + topic-set commit-1 micro-amendment). Mutation 2 lands SECOND (sibling EXECUTOR_REGISTRY addition + topic-set commit-2 micro-amendment) at Agent #26 sibling first-ship. Per Cluster D 5-topic ceiling, these are TWO separate ship commits.

---

## 18. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution |
|---|---|---|
| **66** | Authority contradiction (§1/§2 vs §5.5 Cluster E) | §1 + §2 + §6 rewritten — primary is `[RECOMMEND_ONLY]`; sibling `orchestra-research-executor` carries elevated authority. Contradiction removed. |
| **82** | CA-9-Q4 re-disposition uncertainty | CA-9-Q4 Option (a) LOCKED per ENTRY 009. No further CEO arbitration required. v2 reflects the locked disposition verbatim in §16. |
| **85** | _registry.ts 25→26 expansion vs validateRoster() 25-cap | §17 documents the migration: primary roster expansion 25→26 lands first; sibling lives in EXECUTOR_REGISTRY (separate cap). Test-migration path documented. |
| **97** | Authority handling complexity (BaseAgent.guard() correctness) | §2 + §6 split clarifies — primary `recommend()` never invokes elevated authority; sibling `execute()` is the only `BaseAgent.guard()` callsite with `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. Cluster E v3 §2.5 enforces. |
| **99** | Registry mutation risk (25 SHIPPED-GREEN expectation tests) | §17 test-migration sub-bullet — all 25 SHIPPED-GREEN tests re-run green against the 26-entry roster; hard-coded `length === 25` assertions migrated. |

---

*End of Agent #26 Orchestra Research Agent build blueprint v2. Panel `PLURALITY_A26-REVISE` 5/10 objections resolved per §18 above. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification; following ratification, engineering dispatch lands per the §17 two-commit migration sequence.*
