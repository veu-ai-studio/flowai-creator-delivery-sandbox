# Agent #11 — Strategic Intelligence — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1 + CA-9-B charter expansion — global AI-platform discovery primary function). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 11 + Locked Rule 16 (continuous marketplace intelligence) + CA-9-A Orchestra self-expansion + CA-11-B.2 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `11` |
| Name | `Strategic Intelligence` |
| Mode | `cross-step` |
| Step (if step-owner) | n/a (cross-step — intervenes opportunistically across multiple steps) |
| Embedding | **`flowai-only`** |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — Strategic Intelligence produces signals, never executes side effects |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** scans curated industry-tracker URLs (Hacker News AI tag, Product Hunt AI category, OpenRouter `/v1/models`, Browserless `/marketplace`, v0 `/changelog`, etc.) per CA-9-A.2; consumes `community.signal.v1` (curated Slack/Discord webhooks); polls vendor changelog feeds (RSS / GitHub Releases) → `vendor.changelog.poll.v1`.
- **Decide:** classifies candidates by relevance to FlowAI's 8-step pipeline + 5 VEU products; surfaces emerging threats + opportunities (competitor launches, regulatory shifts, security CVEs, pricing changes).
- **Execute:** produces `11.platform.discovery.v1` candidate signals (consumed by Agent #26 Orchestra Research Agent per §8.1 / CA-9-A); produces marketplace-intelligence reports per Locked Rule 16 monthly minimum.
- **Emit:** `11.platform.discovery.v1` + carve-out evaluation flags (Agent #11 + Agent #14 jointly decide carve-outs per §8.1 §CA-9-A.6).

## 3. MessageBus topics

**Consumes:**
- `community.signal.v1` (curated webhooks)
- `vendor.changelog.poll.v1` (own dispatch)

**Produces:**
- `11.platform.discovery.v1` — payload: `{ candidate_id, candidate_name, source, evidence_url, observed_capabilities[], at }` (per CA-9-B)
- `11.marketplace_intelligence_report.v1` — monthly digest per Locked Rule 16
- `11.carveout_flag.v1` — payload: `{ candidate_id, reason: 'security'|'legal'|'regulatory'|'ip-risk', evidence, at }` (input to §8.1 panel-gate decision)

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('crawl', { url: industryTrackerUrl }, opts);
orchestra.dispatch('analyze', { artifact, criteria: 'strategic-relevance' }, opts);
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
  async plan(ctx) { /* run discovery loop; classify candidates */ }
  async act(ctx, plan) { /* emit 11.platform.discovery.v1 + carveout flags */ }
  async recommend(ctx) { /* cross-step invocation API (NOT step-owner) */ }
}
```

## 7. OrchestratorHub wire-in pattern

**Cross-step agents do NOT register with `hub.registerStepOwner()`.** Instead, they register with a separate `hub.registerCrossStep('strategic-intelligence', agent)` API + run on a scheduled cadence per Locked Rule 16 (≥monthly + daily 03:00 UTC alignment with Sprint PROTECT-1 Phase 2 scheduled-self-test per CA-9-A.2).

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A11-N1 | Nominal | Discovery loop produces ≥1 `11.platform.discovery.v1` event per tracked URL with content |
| A11-N2 | Nominal | Monthly digest aggregates ≥10 candidates with classification |
| A11-N3 | Nominal | AWS-bound seed candidate (Kiro, Q Developer) triggers `11.carveout_flag.v1` with reason `data-residency` |
| A11-M1 | Malformed | Tracker URL returns empty body → discovery skips that tracker; logs `tracker-empty` warning |
| A11-M2 | Malformed | Vendor changelog feed unreachable → fallback to next-best ToolMenu adapter per CA-11-A.4 |
| A11-E1 | Edge | 100 candidates discovered in a single cycle → batched into ≤10 envelopes for downstream consumers |
| A11-E2 | Edge | Candidate already in §8 Orchestra roster → `11.platform.discovery.v1` skipped (no-op) |
| A11-X1 | Adversarial | Hostile tracker URL serves prompt-injection content → analyze does NOT execute the injection |
| A11-X2 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A11-* tests passing
- `industry-trackers.json` content Panel-reviewed ≥7/10
- Daily 03:00 UTC scheduled job invokes Agent #11; ≥7 consecutive days emit non-empty envelopes
- Agent #26 Orchestra Research Agent consumes `11.platform.discovery.v1` end-to-end on at least 3 candidates
- W4 adversarial coverage ≥7 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** CA-9 promoted (§8.1 auto-admission + Agent #26 charter) — already canonical per ENTRY 005
- **Soft depends on:** `community.signal.v1` webhook receivers (NEW endpoint; deferred); Agent #11 ships with crawl + vendor-changelog-poll first; community-signal wired later
- **Provides to:** Agent #26 Orchestra Research Agent (consumes `11.platform.discovery.v1`); Agent #15 Benchmarking (uses #11 candidate signals to schedule benchmark runs); Agent #17 Product Evolution (consumes for composition recommendations)

## 11. Estimated build effort

**~12 W-hours** Phase 1 (discovery loop + monthly digest + carveout-flag emitter).

## 12. Open clarification flags

- **Q:** Initial `industry-trackers.json` content — Panel must ratify the canonical URL set before Agent #11 ships. **NEEDS CEO/PANEL CLARIFICATION** before engineering dispatch.
- **Q:** Monthly digest format — Markdown only, or also JSON for tooling? Defaults to both for parity with adversarial test plan §6.3 reporting. **CLARIFICATION RECOMMENDED.**
