# Cluster B — Minimum Data Quality Gate (Canonical Template)

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Anchor canonical:** Rev-2.1 §6 (Aggressive Crawling + Resolution Contract — partial-coverage handling), §15.1 row 6 (Agent #6 Research block semantic per commit `0fc8851`), CA-10-A.2 ProductSSOT `governance_record_entry` schema, ENTRY 006 §7.6 (GTM Readiness 4-prerequisite gate).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Top-3 Finding #2 + Batch 1 objection #13.

---

## §1 — Problem Statement

The 18-agent consolidated Panel identified **partial-data policy under-specification** as the second-highest systemic risk:

### Verbatim Panel quotes

**Top-3 Highest-Risk Finding #2 (Slot 8 — openrouter:perplexity/sonar):**
> G6-Q3 admits partial ACE output but does not define minimum coverage, normalization rules, or how missing-page bias affects the brief. Accepting 3/8 pages can systematically over-weight the pages ACE happened to find, especially on sites with auth walls or dynamic navigation. The proposal lacks a provenance model for which pages were omitted and why, so downstream consumers may misread low-confidence output as complete coverage.

**Batch 1 objection #13 (Slot 4):**
> Inadequate handling of auth-gated content.

**Batch 2 objection #11 (Slot 4):**
> The deprecation window for Agent #17 is set to 60 days, but this may be too conservative or too aggressive depending on the context. There is no adaptive mechanism proposed.

### Affected scope

Every agent that consumes upstream artifacts (research brief, crawl output, audit findings, cost-ledger entries, customer signals, etc.) faces the same question: **how much input data is "enough" before producing output?** Without a canonical answer, agents either:

- (a) Produce low-confidence output on thin input (misleading downstream consumers), OR
- (b) Block on arbitrary per-agent thresholds (operator UX fragmentation).

Both modes were surfaced by the Panel across multiple agents (#6 partial ACE, #8 missing audit prerequisites, #10 missing customer signals, #15 below-30-invocation benchmarks, #17 insufficient signal trends, #18 missing upstream signals, #20 empty cost-ledger).

### Why this blocks engineering dispatch

Without canonical minimum-coverage threshold semantics: downstream consumers cannot distinguish "high-confidence output" from "best-effort with bias" and may treat partial-coverage results as authoritative — leading to false positives in 95/95 governance scoring (§10.1), GTM-readiness assessment (ENTRY 006 §7.6), Self-Renewal triggering (CA-7 §15.5), and Orchestra auto-admission (§8.1).

---

## §2 — Canonical Resolution

**A canonical minimum-coverage threshold per agent + a single fail-loud envelope semantic.** Below threshold, agents MUST emit `agent.data_quality.insufficient.v1` and halt — never produce low-confidence output that downstream consumers might mistake for authoritative.

### §2.1 — Single canonical threshold metric

Every agent declares its minimum data quality threshold using ONE of three canonical metrics:

| Metric | Type | Example values |
|---|---|---|
| `pageCountMin` | integer (count of upstream pages / artifacts) | 3 (Research, ACE re-use); 1 (Quality Audit build artifact) |
| `bodyContentCharsMin` | integer (sum chars of crawl body content) | 1000 (Research); 500 (Quality Audit) |
| `eventCountMin` | integer (count of consumed MessageBus events) | 5 (Monitor 24h customer signals); 30 (Benchmarking head-to-head per CA-9-B) |

Per-agent threshold defaults are declared in the agent's spec; **operator override per product via `ProductRegistry.minimumDataQuality` JSONB field** (§2.3).

### §2.2 — Canonical fail-loud envelope topic

**Topic:** `agent.data_quality.insufficient.v1`

**Payload shape:**
```ts
{
  runId: string,
  productId: string,
  agentId: number,
  thresholdMetric: 'pageCountMin' | 'bodyContentCharsMin' | 'eventCountMin',
  thresholdConfigured: number,            // the agent's effective threshold for this product
  observed: number,                        // what was actually measured
  provenance: {                            // per Top-3 Finding #2 "provenance model"
    consumedSources: Array<{ topic, atRange: [ISO, ISO], count }>,
    omissionReasons: Array<{               // why pages/artifacts/events were missing
      reason: 'auth-gated' | 'crawl-cap-reached' | 'budget-cap' |
              'rate-limit' | 'stale-cache' | 'upstream-block' | 'other',
      detail: string,
    }>,
  },
  recommendedAction: 'await-additional-upstream' | 'lower-threshold-via-override' |
                     'enable-auth-traversal' | 'increase-crawl-cap' | 'manual-review',
  at: ISO8601,
}
```

### §2.3 — Per-product configurable override

`ProductRegistry.minimumDataQuality` JSONB column shape:

```json
{
  "agent_6_research": { "bodyContentCharsMin": 500 },
  "agent_8_quality_audit": { "pageCountMin": 1 },
  "agent_10_monitor": { "eventCountMin": 3 },
  "agent_15_benchmarking": { "eventCountMin": 50 }
}
```

- Operators with shallow products (single-page apps) can lower `bodyContentCharsMin` per product.
- Operators with high-stakes products (medical, financial) can raise thresholds per product.
- Per-product override read by the agent at invocation; falls back to per-agent canonical default if absent.

### §2.4 — Provenance model (per Top-3 Finding #2)

When an agent halts on threshold, it MUST include in the envelope:
1. **`consumedSources`** — what topics / time-ranges were actually read (transparency).
2. **`omissionReasons`** — for every artifact/page/event NOT consumed, the reason it was missing.

This prevents downstream consumers from "misreading low-confidence output as complete coverage" — instead, downstream consumers see explicit absence and can route to remediation (e.g. enable Phase 3 auth-traversal if `omissionReasons` includes `auth-gated`).

### §2.5 — Halt semantics

When an agent emits `agent.data_quality.insufficient.v1`:
- The agent's normal output envelope (e.g. `6.research.brief.v1`, `8.audit.completed.v1`) is NOT emitted.
- AutoRunner pipeline halts at that step (analogous to Agent #6's block semantic per commit `0fc8851`).
- Operator notification surface alerts admin with the `recommendedAction`.
- ColdStore lineage records the halt + provenance for audit.
- Self-Renewal does NOT auto-retry — the halt is "data is genuinely not there yet", not a transient failure.

### §2.6 — Distinction from cost cap (Cluster A)

Data quality halt (Cluster B) and cost-cap halt (Cluster A) are distinct:
- Cluster A: "we ran out of money" → `agent.cost.signal.v1` `costEvent: 'pre-dispatch-rejected'` + agent block envelope with reason `'budget-cap-reached'`.
- Cluster B: "we don't have enough input data" → `agent.data_quality.insufficient.v1` + halt.

Both halts use the same AutoRunner step-block mechanism; only the envelope topic + reason differ.

---

## §3 — Agent Spec Integration Instructions

Every affected agent spec MUST add this canonical block to §3 Input Contract (preconditions) AND §4 Output Contract (block variant).

### §3.1 — Block to paste into §3.3 Preconditions

````markdown
### §3.X — Minimum data quality (canonical per CLUSTER_B_DATA_QUALITY_GATE.md)

Effective threshold = `ProductRegistry.minimumDataQuality[<agent-key>][<metric>]`
OR per-agent canonical default below if absent.

| Metric | Per-agent default |
|---|---:|
| `<metric>` | `<value>` |

Below threshold this agent MUST NOT produce its normal output envelope.
Instead, emit `agent.data_quality.insufficient.v1` with full provenance
per Cluster B §2.4, and halt. AutoRunner pipeline step blocks; operator
is notified with `recommendedAction`.

Data-quality halt is DISTINCT from cost-cap halt (Cluster A) — different
topic, different reason; both use the AutoRunner step-block mechanism.
````

### §3.2 — Block to paste into §4 Output Contract (block variants)

````markdown
### §4.X — Data-quality block envelope (canonical per Cluster B §2.2)

`agent.data_quality.insufficient.v1` payload (per Cluster B §2.2):

```ts
{
  runId, productId, agentId: <agent-id>,
  thresholdMetric, thresholdConfigured, observed,
  provenance: { consumedSources, omissionReasons },
  recommendedAction, at,
}
```

Emitted when observed < threshold per §3.X. Normal output envelope
(`<agent's normal topic>`) is NOT emitted alongside; this is a halt.
````

### §3.3 — Block to paste into §9 Acceptance Criteria

````markdown
- **AC-DQ-N** — Given upstream input below `<metric>` threshold:
  agent emits `agent.data_quality.insufficient.v1` with full
  provenance; agent does NOT emit `<agent's normal topic>`; AutoRunner
  step halts. Verify by mocking upstream input at threshold-1.
- **AC-DQ-N+1** — `agent.data_quality.insufficient.v1.provenance.
  omissionReasons[]` is non-empty when observed < threshold; each
  entry carries one of the 7 canonical `reason` enum values per
  Cluster B §2.2.
````

---

## §4 — Acceptance Criteria

How W2 verifies the Cluster B fix is correctly implemented across agent spec revisions.

1. **AC-CB-1 (Spec-level coverage):** Every affected agent spec contains the Cluster B §3.1 block in §3 preconditions AND the §3.2 block in §4 output contract. Spec-level grep verifies.

2. **AC-CB-2 (Threshold declared):** Every affected agent spec declares ONE canonical metric + per-agent default in §3.X. Specs that omit are non-conformant.

3. **AC-CB-3 (Envelope schema):** `agent.data_quality.insufficient.v1` payload validates against §2.2 shape; topic registered in §14.1 canonical catalogue per Cluster D extension.

4. **AC-CB-4 (Provenance non-empty on halt):** Implementation test (deferred) — every halt emits at least one `omissionReasons` entry. Empty provenance is a defect.

5. **AC-CB-5 (Halt blocks downstream):** AutoRunner step-block mechanism verifies — when `agent.data_quality.insufficient.v1` is emitted, the agent's normal envelope topic does NOT appear in the same `runId`, and downstream consumers do NOT advance.

6. **AC-CB-6 (Operator override honored):** Per-product `ProductRegistry.minimumDataQuality` JSONB override applied correctly — operator can lower / raise threshold per product; effective threshold reads override first, then canonical default.

7. **AC-CB-7 (Distinction from cost halt):** Same-`runId` halts on cost vs data-quality emit distinct topics (`agent.cost.signal.v1` `pre-dispatch-rejected` vs `agent.data_quality.insufficient.v1`). No agent emits both for the same halt cause.

---

## §5 — Affected Agents

| Agent | Canonical threshold metric + default | Cluster B revision required |
|---:|---|---|
| #6 Research | `bodyContentCharsMin: 1000` (Top-3 Finding #2 anchor); OR `pageCountMin: 3` (ACE re-use) | YES — adds halt path; G6-Q3 resolved by Cluster B |
| #7 Design | `pageCountMin: 1` (design depends on Research brief presence) | YES |
| #8 Quality Audit | `pageCountMin: 1` (build artifact + design spec presence) | YES |
| #9 Go-to-Market | `pageCountMin: 1` (audit envelope presence) | YES |
| #10 Monitor | `eventCountMin: 5` (24h customer signals window) | YES |
| #11 Strategic Intelligence | `eventCountMin: 1` (per-cycle tracker output) | YES |
| #12 Portfolio Risk | `pageCountMin: 1` (≥1 product; portfolio signal needs ≥3 declared in spec) | YES |
| #13 Self-Protection | `eventCountMin: 1` (5-min edge-log batch) | YES |
| #14 Public Policy | `bodyContentCharsMin: 500` (regulatory doc minimum) | YES |
| #15 Benchmarking | `eventCountMin: 30` (CA-9-B rolling minimum) | YES — already implicitly declared; canonicalise |
| #16 Productivity / HR | `eventCountMin: 7` (7-day audit-log slice) | YES |
| #17 Product Evolution | `eventCountMin: 1` (benchmark stream presence) | YES |
| #18 Business Planning | `eventCountMin: 3` (upstream agents producing within month) | YES |
| #19 Technological Evolution | `eventCountMin: 1` (CVE feed entry) | YES |
| #20 Environmental Impacts | `eventCountMin: 10` (cost-ledger entry minimum for meaningful CO₂e estimate) | YES |
| #22/#24/#25 Ops Runners (BLOCKED §27 OQ-2) | TBD per role | YES — once role disposed |
| #23 Ops Runner Gamma — Cost Governor | `eventCountMin: 1` (cost-ledger entry per cycle) | YES |
| #26 Orchestra Research Agent | `eventCountMin: 1` (per-cycle candidate stream) | YES |

**Total agents unblocked by this template: 20** (all dormant agents including #23).

---

## §6 — Cross-cluster integration notes

- **Cluster A** (Cost Governor): cost-cap halt and data-quality halt are distinct topics + distinct reasons; both halt AutoRunner but never alongside each other for same cause.
- **Cluster D** (Audit-Log Topic Schema): `agent.data_quality.insufficient.v1` added to §14.1 canonical catalogue extension.
- **Cluster E** (Authority-Ceiling Integration): a halt does NOT consume authority quota — Operational-authority is not exhausted by a data-quality block.
- **Cluster F** (Model-Budget Fallback): when data-quality is insufficient, agents halt BEFORE invoking the LLM dispatch chain — Cluster F fallbacks never fire for data-quality halts.

---

*End of CLUSTER_B_DATA_QUALITY_GATE.md canonical template. Pending W6 Panel ratification.*
