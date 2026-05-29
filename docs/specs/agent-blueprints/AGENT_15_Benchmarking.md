# Agent #15 — Benchmarking — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1 + CA-9-B charter expansion — continuous head-to-head scoring). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 15 + Locked Rule 16 (Orchestra ranking updates) + §8.1 head-to-head benchmark for auto-admission + CA-11-B.2 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `15` |
| Name | `Benchmarking` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — Benchmarking emits scoring data; ranking-table updates handled by Orchestra spec §4.2 rolling-outcome-score machinery |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes `11.platform.discovery.v1` (new candidates to benchmark) + `26.orchestra.candidate.v1` (Agent #26 discoveries); maintains rolling 30-invocation tally per (candidate × capability) per CA-9-B charter; reads Orchestra invocation history from `flowai_adapter_cost` ledger (per Orchestra spec §7.1) + new `flowai_agent_tool_outcome` table (per CA-11-D.3).
- **Decide:** schedules head-to-head benchmark runs across the 8 pipeline steps × each candidate's declared capabilities; compares candidate performance to existing wired members per Locked Rule 18 formula; computes performance-score delta.
- **Execute:** emits `15.benchmark.head_to_head.v1` per (candidate × member × capability) triple after rolling 30-invocation minimum; feeds Orchestra ranking pipeline.
- **Emit:** consumed by Agent #26 Orchestra Research Agent (auto-admission gate per §8.1) + Agent #17 Product Evolution (composition recommendations).

## 3. MessageBus topics

**Consumes:**
- `11.platform.discovery.v1` (candidates to benchmark)
- `26.orchestra.candidate.v1` (additional candidate stream)
- Orchestra invocation telemetry (via direct ledger reads)

**Produces:**
- `15.benchmark.head_to_head.v1` — payload: `{ candidate_id, member_id, capability, candidate_score, member_score, sample_size, p50_latency_candidate_ms, p50_latency_member_ms, at }` (per CA-9-B)
- `15.benchmark.cycle_completed.v1` — monthly digest aggregating all head-to-head results

## 4. Orchestra dispatch usage

```js
// Each scheduled benchmark run invokes both candidate + member on identical synthetic fixtures
orchestra.dispatch('code-patch', { fixturePayload }, { ...opts, memberId: 'claude-code' });   // baseline
orchestra.dispatch('code-patch', { fixturePayload }, { ...opts, memberId: 'cursor' });        // candidate

// Score the outputs against rubric
orchestra.dispatch('score', { artifact, rubric }, opts);
```

## 5. ToolMenu (per CA-11-B.2)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `score` (rubric-based benchmark scoring) |
| 2 | OpenAI API | `openrouter` (`openai/gpt-5`) | high | `score`, `analyze` |
| 3 | Browserless | `browserless` | low | `crawl` (vendor performance evidence gathering — e.g. published SWE-Bench scores) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent15Benchmarking.js                   # ~520 LOC
src/lib/agents/agents/__tests__/Agent15Benchmarking.test.js    # ~340 LOC
src/lib/agents/agents/benchmarks/                              # NEW directory — neutral fixture sets per capability
  code-patch-fixtures.json, generate-from-scratch-fixtures.json, ...
```

**Class skeleton:**

```js
export class Agent15Benchmarking extends BaseAgent {
  static charterId = 15;
  static charter() {
    const r = getAgent(15);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* schedule head-to-head benchmark runs */ }
  async act(ctx, plan) { /* emit 15.benchmark.head_to_head.v1 */ }
  async recommend(ctx) { /* cross-step invocation API */ }
}
```

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('benchmarking', agent)`. Cadence: daily 05:00 UTC (Orchestra ranking refresh aligned with Sprint PROTECT-1 Phase 2 self-test cadence) + event-trigger on `11.platform.discovery.v1` / `26.orchestra.candidate.v1`.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A15-N1 | Nominal | Candidate at 30 invocations across `code-patch` → `15.benchmark.head_to_head.v1` emitted with stable scores |
| A15-N2 | Nominal | Candidate score > wired-member score on capability → triggers §8.1 auto-admission consideration in Agent #26's pipeline |
| A15-M1 | Malformed | Candidate adapter unreachable → skip + log; benchmark cycle continues with remaining candidates |
| A15-M2 | Malformed | Fixture file malformed → schema error; specific fixture skipped, others continue |
| A15-E1 | Edge | Candidate at exactly 29 invocations → not yet emit; minimum threshold per CA-9-B = 30 |
| A15-E2 | Edge | All 5 fixtures fail for a candidate → emit failure pattern; tag for review |
| A15-X1 | Adversarial | Prompt-injection in fixture content does NOT alter scoring rubric |
| A15-X2 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A15-* tests passing
- Neutral fixture sets reviewed for §22 Product-Agnostic Rule (no VEU product names)
- Benchmark cycle scheduled daily; ≥3 consecutive cycles produce `15.benchmark.head_to_head.v1` envelopes
- At least one candidate auto-admitted via §8.1 gate using Agent #15-produced scores
- W4 adversarial coverage ≥5 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agent #11 (Strategic Intelligence) + Agent #26 (Orchestra Research) SHIPPED-GREEN — Benchmarking consumes their candidate streams; CA-11-D.3 per-agent score storage migrated
- **Soft depends on:** Initial fixture sets curated + Panel-reviewed
- **Provides to:** Agent #26 Orchestra Research Agent (auto-admission scores) + Agent #17 Product Evolution (composition decisions) + global Orchestra ranking refresh

## 11. Estimated build effort

**~12 W-hours** Phase 1.

## 12. Open clarification flags

- **Q:** Per-capability fixture sets — who curates? Engineering-dispatch team initially; Panel-reviewed before first benchmark cycle. **CLARIFICATION RECOMMENDED** on fixture-set ownership.
- **Q:** Cost cap on benchmark cycles — 30 invocations per (candidate × capability) at ~$0.05/invocation × 5 capabilities × 5 candidates = ~$37.50/cycle; daily cadence = ~$1125/month. Need cost-budget confirmation. **CLARIFICATION RECOMMENDED.**
