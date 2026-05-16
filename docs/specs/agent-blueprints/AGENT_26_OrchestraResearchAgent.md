# Agent #26 — Orchestra Research Agent — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1 + CA-9-B; canonical per ENTRY 005). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern + dual-authority pattern from CA-7 EXECUTOR_REGISTRY (per CA-9-Q4=(b) CEO arbitration).
**Anchor canonical:** Rev-2.1 §15.1 row 26 + §8.1 (auto-admission pipeline owner) + CA-9-A + CA-9-B + §25 Locked Rule 2 (26-agent canonical roster) + CA-11-B.9 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `26` |
| Name | `Orchestra Research Agent` |
| Mode | `always-on` |
| Step | n/a (always-on — runs continuously per §8.1 auto-admission cadence) |
| Embedding | `embedded` |
| Authority (Phase 1 + Phase 2 — SAME charter) | **`[RECOMMEND_ONLY, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`** (dual + gate per CA-9-Q4=(b) CEO arbitration; the `requires_human_gate` is required whenever `auto_write_internal` is declared, mirroring the Self-Renewal Executor charter shape per CA-7 §15.5) |
| Future Executor (Phase 2) | **NONE** — Agent #26's dual-authority charter handles auto-admission writes inline per CEO Q4=(b); no separate sibling executor needed because the per-invocation `authorityNeeded` set membership pattern from CA-9-B.6 + CA-11-A handles the gate. |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes `community.signal.v1` (curated Slack/Discord webhooks per CA-9-A.2); consumes `11.platform.discovery.v1` (Agent #11's curated tracker output); consumes `15.benchmark.head_to_head.v1` (Agent #15's scoring); consumes `17.orchestra.deprecation_proposal.v1` (Agent #17's portfolio composition recommendations); polls vendor changelog feeds → `vendor.changelog.poll.v1` (own dispatch); processes the CEO-supplied seed list (13 candidates per §8.1) on first cycle.
- **Decide:** runs the §8.1 four-condition auto-admission gate per candidate — `rank_score ≥ 0.70` AND `head_to_head_minimum_invocations ≥ 30` AND capability-gap (existing Orchestra <2 wired members for at least one candidate capability) AND no carve-out flag from Agent #11 or Agent #14.
- **Execute:** emits one of four canonical decision envelopes per §8.1:
  - `26.orchestra.admitted.v1` (auto-admit; writes new lifecycle state `Trial` per §8.1 lifecycle table)
  - `26.orchestra.candidate_rejected.v1` (below threshold)
  - `26.orchestra.candidate_panel_gate.v1` (carve-out flagged; routes to Panel + CEO per Locked Rule 13)
  - `26.orchestra.candidate_reactivated.v1` (for `Archived` members re-evaluated; promotes `Archived → Trial` per §8.1 Re-activation Path)
  - Plus lifecycle transitions: `26.orchestra.lifecycle_state_changed.v1` on every Trial → Probation → Full member transition; `26.orchestra.deprecated.v1` on Panel + CEO-gated deprecation.
- **Emit:** all 7 `26.orchestra.*` topics per §8.1 (canonical ENTRY 005); writes one-line entries to `docs/CANONICAL_HISTORY.md` SECTION 8 + pointer in §18.4 on every admission per §8.1 (preserving §18 archive discipline even when the decision is automated).

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

## 6. Implementation file structure

```
src/lib/agents/agents/Agent26OrchestraResearch.js                  # ~720 LOC (large agent — 4-condition gate logic + 5-state lifecycle + 7 audit-log topics + seed-list processor + history-log writer)
src/lib/agents/agents/__tests__/Agent26OrchestraResearch.test.js   # ~480 LOC
src/lib/agents/agents/orchestraResearch/                            # NEW directory — helper modules
  fourConditionGate.js                                              # §8.1 gate implementation (pure function)
  lifecycleStateMachine.js                                          # 5-state lifecycle transitions
  seedListProcessor.js                                              # CEO-supplied 13-candidate batch on first cycle
  historyLogWriter.js                                               # one-line CANONICAL_HISTORY entry per admission
```

**Class skeleton:**

```js
export class Agent26OrchestraResearch extends BaseAgent {
  static charterId = 26;
  static charter() {
    const r = getAgent(26);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,   // embedded
      authority: [AUTHORITY.RECOMMEND_ONLY, AUTHORITY.AUTO_WRITE_INTERNAL, AUTHORITY.REQUIRES_HUMAN_GATE],
      requiredCredentials: [...r.requiredCredentials],  // ANTHROPIC_API_KEY, BROWSERLESS_API_KEY
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* run discovery loop OR process seed-list batch on first cycle */ }
  async act(ctx, plan) {
    // Per-candidate: apply 4-condition gate; emit one of 4 decision envelopes
    // Auto-admit path uses authorityNeeded=[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE] per CA-9-Q4=(b)
    // BaseAgent.guard() enforces dual-authority per-invocation set membership per CA-9-B.6
  }
  async recommend(ctx) { /* always-on cadence entry */ }
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
