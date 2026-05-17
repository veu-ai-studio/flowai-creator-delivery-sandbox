# Agent #11 — Strategic Intelligence — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_11_StrategicIntelligence.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 11, Locked Rule 16, CA-9-A Orchestra self-expansion, CA-9-B (charter expansion — global AI-platform discovery), §8.1 carve-out joint with Agent #14, CA-11-B.2 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=11 (lines 189–202).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `11` |
| Name | `Strategic Intelligence` |
| Mode | `cross-step` |
| Pipeline step owned | n/a (cross-step — runs on schedule + event triggers, not a step-owner) |
| Build-authority | **recommend_only** in all phases. Strategic Intelligence produces signals; never executes side effects. |
| Operational-authority | **autonomous** for ToolMenu dispatch (crawl + analyze) within budget. |
| Current status | **DORMANT** — charter ratified, scheduled job not wired. |
| Depends on | CA-9 promoted (already canonical per ENTRY 005); `industry-trackers.json` Panel-ratified URL set; `community.signal.v1` webhook receiver (soft — Phase 1 ships without; webhook later). |

---

## §2 — What This Agent Does

Strategic Intelligence is FlowAI's continuous AI-platform-discovery agent. It scans curated industry trackers (Hacker News AI tag, Product Hunt AI category, OpenRouter `/v1/models`, Browserless `/marketplace`, v0 `/changelog`, etc.), classifies candidates by relevance to FlowAI's 8-step pipeline, polls vendor changelog feeds, and surfaces emerging threats and opportunities (competitor launches, regulatory shifts, security CVEs, pricing changes).

The operator sees: a monthly marketplace-intelligence digest, real-time alerts for material events (per escalation policy: "Material events alert W0 within 15 minutes of detection"), and a stream of Orchestra candidate suggestions that Agent #26 Orchestra Research Agent picks up for full vetting.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 195)

```
consumes: ['10.health.v1', '15.benchmark.report.v1', '14.regulation.new.v1']
```

Plus by convention:

- `community.signal.v1` — curated Slack / Discord webhooks (soft; Phase 1.5).
- `vendor.changelog.poll.v1` — own dispatch output (RSS / GitHub Releases).

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled' | 'event-triggered' | 'manual',
  scheduledAt: ISO8601,
  triggerEvent?: { topic, payload },
  productScope: 'flowai-only',
  trackerUrls: string[],                    // from industry-trackers.json
  historicalCandidates?: Array<{ candidate_id, last_seen }>,
}
```

### §3.3 Preconditions

- `industry-trackers.json` present and schema-valid.
- ToolMenu adapters available (Perplexity OR Anthropic OR Browserless minimum).
- ProductScope `flowai-only` (cross-tenant aggregation restricted to FlowAI-internal scope).

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` lines 196–200)

```
produces: ['11.brief.weekly.v1', '11.alert.material.v1', '11.trajectory.report.v1']
```

Implementation additionally emits (charter expansion per CA-9-B; reconcile at engineering dispatch):

- `11.platform.discovery.v1` — Orchestra-candidate signal envelope (consumed by Agent #26).
- `11.carveout_flag.v1` — joint with Agent #14 per §8.1.
- `11.marketplace_intelligence_report.v1` — monthly digest.

### §4.2 Output shape — `11.platform.discovery.v1`

```ts
{
  candidate_id: string,
  candidate_name: string,
  source: string,
  evidence_url: string,
  observed_capabilities: string[],
  relevance_band: 'low' | 'medium' | 'high',
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row written per invocation.
- Discovery envelopes emitted exactly once per `candidate_id` per cycle (deduped against historical).
- `11.alert.material.v1` emitted within 15 minutes of detection for material events (escalation SLA).
- Monthly digest written to admin dashboard surface.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None (cross-step). Registered via `hub.registerCrossStep('strategic-intelligence', agent)`.

### §5.2 Upstream feeders

- **Agent #10 Monitor** — `10.health.v1` (cross-product health signals).
- **Agent #14 Public Policy** — `14.regulation.new.v1` (regulatory drift).
- **Agent #15 Benchmarking** — `15.benchmark.report.v1` (head-to-head scores).
- Curated industry trackers (own dispatch).

### §5.3 Downstream consumers

- **Agent #26 Orchestra Research Agent** — consumes `11.platform.discovery.v1` for full candidate vetting.
- **Agent #15 Benchmarking** — schedules benchmark runs on discovered candidates.
- **Agent #17 Product Evolution** — composition recommendations.
- **Agent #14 Public Policy** — joint carve-out evaluation.

### §5.4 Mode behavior

Mode-agnostic — Strategic Intelligence runs on schedule regardless of operator mode; its output is consumed differently downstream (Mode 2/3 may act on Orchestra updates; Mode 1 only reads).

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent11StrategicIntelligence.js` — ~520 LOC.
- `src/lib/agents/agents/__tests__/Agent11StrategicIntelligence.test.js` — ~340 LOC.
- `src/lib/agents/agents/trackers/industry-trackers.json` — canonical tracker URL set; Panel-reviewed quarterly.
- `src/lib/agents/agents/prompts/strategicRelevancePrompt.js` — deterministic candidate-classification prompt.

### §6.2 Files to modify (existing)

- `src/pages/AutoRunner.jsx` (or scheduler entry) — register cross-step agent + daily 03:00 UTC cadence.
- `inngest/functions/strategic-intelligence-tick.js` (new Inngest function) — invokes daily.

### §6.3 Estimated effort

**~12 W-hours** Phase 1.

### §6.4 Key engineering risks

1. **`industry-trackers.json` Panel ratification** — Panel must approve URL set before ship.
2. **Tracker URL drift** — sites change; selector-based extraction breaks. Mitigation: schema-validate each crawl output; fall back to LLM extraction.
3. **Prompt injection in tracker content** — hostile site content. Same deterministic-prefix mitigation as Agent #6.
4. **Material event SLA** — 15-minute alert SLA requires near-real-time path. Mitigation: event-triggered invocation in addition to daily schedule; Inngest function with retry budget.
5. **Cost** — daily crawl + LLM classification across ~20 trackers × ~5 LLM calls = ~$0.50/day baseline.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 194:

```
requiredCredentials: ['ANTHROPIC_API_KEY']
```

Plus per ToolMenu: `BROWSERLESS_TOKEN` (crawl), optional `OPENROUTER_API_KEY` (Perplexity/Gemini fallback). All memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Tracker content sent to Anthropic / OpenRouter (LLM) + Perplexity (web-grounded research) + ColdStore (internal).
- Per FlowAI-only scope: never persists external-tenant data; cross-tenant queries blocked.
- `scrubCredentials()` applied before persist.

### §7.3 Scope limiting

- Trackers limited to `industry-trackers.json` allowlist; no auto-discovery of new trackers without Panel ratification.
- Discovery envelopes deduped against ColdStore historical candidates; no spam.

### §7.4 Escalation policy (from `_registry.ts` line 201)

```
escalationPolicy: 'FlowAI-only. Material events alert W0 within 15 minutes of detection.'
```

Concrete enforcement:

- `material` severity → emit `11.alert.material.v1` synchronously + invoke notification adapter (admin email / Slack DM) within 15-min SLA.
- Cross-tenant queries throw `SCOPE_VIOLATION` at agent boundary.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Crawl curated trackers + classify candidates
- Emit Orchestra discovery envelopes
- Joint carve-out flag emission with Agent #14
- Monthly marketplace digest
- 15-min material-event SLA

### §8.2 Deferred to Phase 2+

- `community.signal.v1` webhook receiver (Slack / Discord curated channels)
- Auto-discovery of new trackers (today: ratified allowlist only)
- Vendor pricing-change auto-detection (vendor sites vary; manual cycle in Phase 1)

### §8.3 What this agent CANNOT do — ever

- **Never executes Orchestra adapter changes.** Adapter wiring is Agent #26's responsibility; #11 only signals.
- **Never crosses FlowAI-internal scope.** Cross-tenant aggregation blocked.
- **Never auto-adds trackers without Panel ratification.**

---

## §9 — Acceptance Criteria

1. **AC-11.1** — Daily scheduled invocation produces ≥1 `11.platform.discovery.v1` per non-empty tracker. A11-N1.
2. **AC-11.2** — AWS-bound seed candidate triggers joint `11.carveout_flag.v1` per §8.1. A11-N3.
3. **AC-11.3** — Empty tracker body → skip with `tracker-empty` warning; agent does NOT crash. A11-M1.
4. **AC-11.4** — Hostile tracker content with prompt injection does NOT alter classification. A11-X1.
5. **AC-11.5** — Material event emits `11.alert.material.v1` within 15-min SLA. Integration test with synthetic event.
6. **AC-11.6** — Candidate already in §8 Orchestra roster → no-op (deduped). A11-E2.
7. **AC-11.7** — `ANTHROPIC_API_KEY` never persisted (canary test).

---

## §10 — Panel Questions

### G11-Q1 — `industry-trackers.json` initial URL set

Who curates the initial allowlist and how is it ratified?

- (a) W3 drafts; Panel ratifies as a package.
- (b) Per-tracker Panel review; ship incrementally as each ratifies.
- (c) Operator-configurable per-deployment.
- (d) Defer Phase 1 until tracker set has 30-day stability across initial Panel review cycle.
- (e) INSUFFICIENT_INFORMATION.

### G11-Q2 — Material-event SLA enforcement layer

15-min SLA. Where is it enforced?

- (a) Inside Agent #11 — synchronous emit within plan() boundary.
- (b) In Inngest job scheduler — event-triggered runs guarantee <15-min wake-up.
- (c) Hybrid — Agent #11 best-effort sync emit + Inngest backstop within 15 min.
- (d) Defer SLA enforcement — Phase 1 is best-effort; SLA testing in Phase 2.
- (e) INSUFFICIENT_INFORMATION.

### G11-Q3 — Monthly digest format

Markdown only, JSON only, or both?

- (a) Both (Markdown for humans, JSON for tooling).
- (b) Markdown only.
- (c) JSON only.
- (d) Configurable per-operator.
- (e) INSUFFICIENT_INFORMATION.

### G11-Q4 — Topic naming reconciliation

`_registry.ts` produces `11.brief.weekly.v1`, `11.alert.material.v1`, `11.trajectory.report.v1`. Blueprint adds `11.platform.discovery.v1`, `11.carveout_flag.v1`. Resolution?

- (a) Update `_registry.ts` to include all 5 topics.
- (b) Map blueprint's `11.platform.discovery.v1` → existing `11.brief.weekly.v1`; same envelope shape.
- (c) Deprecate `11.brief.weekly.v1` in favor of the more specific `11.platform.discovery.v1`.
- (d) Keep both with separate purposes (weekly brief is summary; discovery is per-candidate).
- (e) INSUFFICIENT_INFORMATION.

### G11-Q5 — Cross-tenant aggregation interpretation

§22 Product-Agnostic Rule allows multi-tenant FlowAI deployments. Does Strategic Intelligence aggregate across tenants?

- (a) Single-tenant only — never aggregate across tenants.
- (b) Aggregate within `flowai-only` scope (FlowAI's own portfolio); tenant-isolated for everyone else.
- (c) Configurable per-deployment (`globalIntelligenceEnabled` boolean).
- (d) Aggregate but anonymize tenant identity before persist.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #11 Strategic Intelligence engineering spec.*
