# Agent #10 — Monitor — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_10_Monitor.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 10, §9 step 8 (monitor), §16.4 Live Monitor, CA-9-C customer-feedback infra (LIVE per ENTRY 005), CA-10-A ProductSSOT + CA-10-B symbiotic-loop writes, CA-11-B.6 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=10 (lines 178–188).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `10` |
| Name | `Monitor` |
| Mode | `step-owner` |
| Pipeline step owned | **Step 8 — `monitor`** (closes the 8-step pipeline; produces the final clearance decision per Locked Rule 3 0–50 scale) |
| Build-authority | **recommend_only** (Phase 1); **supervised** (Phase 2 Executor with `[auto_write_internal, requires_human_gate]` — writes ProductSSOT delta_log + architecture_snapshot drift updates). |
| Operational-authority | **autonomous** for ToolMenu dispatch + customer-signal ingestion within budget. |
| Current status | **DORMANT** — charter ratified; AutoRunner step 8 currently runs a placeholder final-report routine. |
| Depends on | All prior step agents (#6, #7, #8, #9) consumed in final report; CA-9-C (LIVE); CA-10-A (LIVE); ProductSSOT (LIVE); Agent #21 ACE (soft — `21.crawl.completed.v1`). |

---

## §2 — What This Agent Does

Plain English: Monitor closes the assessment pipeline. It ingests three streams of signal — what the upstream pipeline produced (steps 1–7), what's happening in the live product (anomaly detection: session speed, score jumps, clearance contradictions), and what customers are saying about the product (in-app reports, app-store reviews, support tickets) — and synthesizes them into a final operator-facing report plus a clearance decision (0–50 scale per Locked Rule 3).

Specifically: Monitor runs **three customer signal ingestion channels** per CA-9-C: (1) in-app reporting widget POST → `/api/customer/feedback`; (2) app-store / public review scraping via Orchestra `crawl` dispatch; (3) support-ticket webhooks from Zendesk / Intercom / Help Scout. It normalizes feedback (severity-mapped: 1–2 reports/24h → medium, 3–9 → high, ≥10 → critical per CA-9-C.3), de-duplicates, sentiment-tags, and emits anomaly + customer-issue + ssot-updated envelopes. The Phase 2 Executor writes ProductSSOT `architecture_snapshot` drift updates + `delta_log` customer-issue entries.

The operator sees: the final scorecard (95/95 status + GTM readiness + customer signal trends), real-time anomaly alerts, and a customer-feedback inbox tagged by severity.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 184)

```
consumes: []   // initial step-8 invocation isn't a bus topic; conceptual consumes documented below
```

Plus by convention (Monitor consumes the entire pipeline; the `_registry.ts` `consumes: []` is a quirk of charter timing — the canonical consume list is below):

- All prior step-completion topics: `1.product.lifecycle_event.v1`, `2.build.completed.v1`, `7.design.spec.v1`, `8.audit.completed.v1`, `9.gtm.assessment.v1`, `21.crawl.completed.v1`
- Customer signal topics per CA-9-C: `customer.feedback.raw.v1`, `customer.review.scraped.v1`, `customer.support.ticket.v1`

### §3.2 Input shape (step-8 invocation `ctx`)

```ts
{
  runId, productId, productScope, environment,
  pipelineArtifacts: {
    research, design, build, audit, gtm,
    aceCrawl?,
  },
  customerSignals: {
    feedback: Array<RawFeedback>,                  // last 24h
    reviews: Array<ScrapedReview>,
    supportTickets: Array<SupportTicket>,
  },
  historicalArchitecture: SsotArchitectureSnapshot,
}
```

### §3.3 Preconditions

- All prior step events for this `runId` have fired (or block envelopes emitted for blocked steps).
- ProductSSOT row exists for `productId`.
- Customer-signal endpoints (`/api/customer/feedback`, `/api/customer/support-ticket-webhook`) registered.
- At least one of: Browserless adapter (for review scraping) OR explicit operator opt-out per-product.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 185)

```
produces: ['10.metric.v1', '10.health.v1', '10.anomaly.v1']
```

Plus per CA-9-C + CA-10-B expansions:

- `10.customer.feedback.v1` — normalized, de-duped, sentiment-tagged feedback envelope
- `10.customer.issue.v1` — issues mapped to issueDetector category set per CA-9-C
- `10.ssot.updated.v1` — per CA-10-B; payload `{ productId, environment, blockUpdated, updateSummary, at }`
- Final clearance-decision envelope to AutoRunner step 8 surface (0–50 scale per Locked Rule 3)

### §4.2 Output shape — `10.anomaly.v1`

```ts
{
  runId, productId,
  severity: 'low' | 'medium' | 'high' | 'critical',
  kind: 'session-speed' | 'score-jump' | 'clearance-contradiction' | 'architecture-drift',
  evidence: string,
  metricsContext: { observed, expected, threshold },
  at: ISO8601,
}
```

### §4.3 Output shape — `10.customer.issue.v1`

```ts
{
  runId, productId,
  severity: 'medium' | 'high' | 'critical',     // per CA-9-C.3 mapping
  category: string,                              // issueDetector taxonomy
  count24h: number,
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed',
  sampleEvidence: string[],                      // ≤3 PII-scrubbed examples
  ssotDeltaLogEntryRef?: string,                 // when Phase 2 Executor wrote to SSOT
  at: ISO8601,
}
```

### §4.4 Postconditions

- ColdStore lineage row written per `runId`.
- All metric / health / anomaly / customer envelopes emitted with `unit` field present (escalationPolicy requirement).
- Anomalies with `severity: 'high'` escalate to Agent #12 Portfolio Risk within 60s (escalationPolicy).
- Phase 2: ProductSSOT `architecture_snapshot` + `delta_log` updates written via Executor.

---

## §5 — Pipeline Integration

### §5.1 Step owned

Step 8 — `monitor`. Wired via `OrchestratorHub.registerStepOwner('monitor', ctx => agent10.recommend(ctx))`.

### §5.2 Upstream feeders

- **Every prior step agent** in the 8-step pipeline.
- **Customer signal channels** (3 per CA-9-C): in-app widget, review scraper, support webhook.

### §5.3 Downstream consumers

- **Agent #3 Self-Renewal** (consumes `10.anomaly.v1` per `_registry.ts` line 105–106; will gain `10.customer.issue.v1` per CA-9-C).
- **Agent #11 Strategic Intelligence** (consumes `10.health.v1`).
- **Agent #12 Portfolio Risk** (consumes `10.anomaly.v1`).
- **Agent #16 Productivity & HR** (consumes `10.metric.v1`).
- **Agent #18 Business Planning** (consumes `10.health.v1`).
- **Agent #19 Technological Evolution** (depends on `10.*` for tech-signal detection).

### §5.4 Mode behavior

| Mode | Agent #10 behavior |
|---|---|
| **Mode 1** | Final report + clearance decision; anomaly + customer signal ingestion ON. Phase 2 Executor inactive (no SSOT writes). |
| **Mode 2 SUB-2A** | Identical to Mode 1; Phase 2 Executor active when authority ceiling permits — writes drift + delta_log to ProductSSOT. |
| **Mode 3A** | Identical to Mode 2 SUB-2A for the operator-attested source path. |

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent10Monitor.js` — ~700 LOC (3 ingestion channels + anomaly detector + drift detector + sentiment classifier + composite final-report).
- `src/lib/agents/agents/__tests__/Agent10Monitor.test.js` — ~450 LOC.
- `api/customer/feedback.js` — POST endpoint for in-app widget.
- `api/customer/support-ticket-webhook.js` — webhook receiver for Zendesk / Intercom / Help Scout.
- `src/lib/agents/agents/normalizers/feedbackNormalizer.js` — dedup + sentiment + severity mapping per CA-9-C.3.
- `src/lib/agents/agents/normalizers/reviewScraperAdapter.js` — vendor-agnostic app-store review extraction.

Phase 2 Executor:

- `src/lib/agents/agents/Agent10MonitorIngestionExecutor.js` — ~440 LOC mirroring `Agent3SelfRenewalExecutor`.
- New `EXECUTOR_REGISTRY` entry: key `monitor-ingestion-executor`, `agentId: 10`, `authority: ['auto_write_internal', 'requires_human_gate']`.

### §6.2 Files to modify (existing)

- `src/pages/AutoRunner.jsx` — wire step-8 to Agent #10.
- `src/lib/agents/_registry.ts` — Phase 2 only: add `monitor-ingestion-executor` entry.
- `vite.config.js` (or equivalent) — register webhook endpoints if not auto-discovered.

### §6.3 Estimated effort

**~18 W-hours Phase 1** (largest dormant Wave 1 agent — 3 ingestion channels + anomaly + drift + sentiment + composite). **+10 W-hours Phase 2 Executor**.

### §6.4 Key engineering risks

1. **PII in customer feedback** — operator-product end-users may include PII in feedback. Mitigation: `scrubCredentials()` extended per CA-10-E.2 catches email + phone + CC + government IDs + customer-self-identified names.
2. **Cross-tenant feedback isolation** — operator A's feedback must never leak to operator B's product. Mitigation: RLS at Supabase row level (per §13 + §14.3); enforced at `/api/customer/feedback` endpoint AND at Monitor read boundary.
3. **Webhook receiver authentication** — Zendesk/Intercom/Help Scout webhooks need shared-secret verification. Mitigation: per-vendor `WEBHOOK_SHARED_SECRET` in Doppler; reject unsigned payloads with 401.
4. **Review-scraper rate limits** — App Store / Google Play / Trustpilot rate-limit scrapers. Mitigation: configurable per-product `reviewScrapeIntervalHours` (default 24h); back off on 429.
5. **Sentiment classifier prompt-injection** — customer feedback text may try to manipulate the classifier. Mitigation: deterministic prompt prefix; feedback text in system-quoted block; per-feedback classification (not concatenated).
6. **Final-report cost** — composite final-report Claude call processes large context (research + design + audit + gtm + customer signal). Mitigation: per-product `monitorBudgetCap` (default $1.50 per run).
7. **Anomaly storm** — a single product issue may produce 100s of anomaly events. Mitigation: dedup window (1 anomaly per `kind` per `productId` per 5 minutes); count surfaced as `recurrenceCount`.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 183:

```
requiredCredentials: []
```

(Phase 1 charter declares no credentials. Phase 2 needs `WEBHOOK_SHARED_SECRET_*` per vendor; Browserless for review scraping; Anthropic API for sentiment.)

All credentials memory-only, never logged, scrubbed per AUTH_TRAVERSAL_SECURITY_SPEC v3 patterns.

### §7.2 Data exfiltration controls

- Customer feedback text sent ONLY to: Anthropic API (sentiment classification); ColdStore; HotStore; MessageBus; ProductSSOT. NEVER sent to external analytics or third-party PII processors.
- `scrubCredentials()` extended per CA-10-E.2 applied to customer feedback BEFORE persist (catches PII).
- Review scraper output filtered to public review content only; never authenticated review APIs.
- Webhook payloads validated against vendor schema BEFORE persist; unknown fields dropped (defense against payload-bloat exfiltration).

### §7.3 Scope limiting

- Per-product feedback ingestion; cross-product aggregates require `flowAiOnly` scope (Agent #12 Portfolio Risk territory, not Agent #10).
- Anomaly detection scoped to single-product time-series; no cross-product correlation.
- Review scraping limited to operator-attested review URLs in `ProductRegistry.reviewSources` (operator declares which review pages are theirs).

### §7.4 Escalation policy (from `_registry.ts` lines 186–187)

```
escalationPolicy:
  'Every metric must include unit. Anomalies with severity=high escalate to #12 within 60s.'
```

Concrete enforcement:

- `10.metric.v1` schema validation rejects emissions without `unit` field — agent throws at emit boundary if unit absent (load-bearing invariant).
- `10.anomaly.v1` with `severity: 'high' | 'critical'` triggers immediate MessageBus emit + Agent #12 wake-up; 60s SLA verified by integration test.
- 10+ customer reports same category 24h → severity `critical` → Self-Renewal Executor auto-deploy-blocked per §12 (canonical CA-9-C.3 mapping).

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- 3-channel customer signal ingestion (in-app widget, review scraping, support webhooks)
- 4 anomaly kinds: session-speed, score-jump, clearance-contradiction, architecture-drift
- Sentiment classification per feedback (positive / neutral / negative / mixed)
- Severity mapping per CA-9-C.3 thresholds
- Final clearance decision (0–50 scale per Locked Rule 3)
- Emit all required envelopes with `unit` field present (load-bearing)

### §8.2 Phase 2 capabilities (deferred)

- Executor writes ProductSSOT `architecture_snapshot` drift updates + `delta_log` customer-issue entries (CA-10-B symbiotic loop closes)
- Automatic drift remediation hand-off to Agent #3 Self-Renewal Executor when drift detected (PR-and-preview path per `SELF_RENEWAL_SPEC.md`)
- Richer monitoring tool integration (Sentry / Datadog / PostHog / New Relic) per ToolMenu CA-11-B.6 — Phase 1 ships with Browserless + Anthropic API only

### §8.3 What this agent CANNOT do — ever

- **Never names individual customers in aggregate reports** — feedback is normalized + PII-scrubbed; sample evidence in `10.customer.issue.v1` ≤3 examples max.
- **Never leaks cross-tenant signals.** RLS rejects cross-product reads at the Supabase boundary.
- **Never auto-rolls-back deployments.** Anomaly response is recommend-only; rollback authority belongs to operator + Agent #3 Executor (Phase 2).
- **Never accepts unsigned webhook payloads.** Webhook shared-secret verification is load-bearing.

---

## §9 — Acceptance Criteria

1. **AC-10.1** — Given a passing pipeline run with no anomalies, no customer issues, no drift, Agent #10 emits a final clearance-decision envelope with `cleared: true` and `clearanceScore` on 0–50 scale. A10-N1.
2. **AC-10.2** — 3 customer reports same category 24h → `10.customer.issue.v1` emitted with `severity: 'high'`; 10+ → `severity: 'critical'`; Self-Renewal Executor auto-deploy gated per §12. A10-N3 + A10-N4.
3. **AC-10.3** — Malformed Intercom webhook payload (missing required field) rejected with 400 + schema error; never reaches plan(); never persists. A10-M1.
4. **AC-10.4** — Architecture drift dev vs prd detected → `10.anomaly.v1 kind: 'architecture-drift'` emitted within 60s of detection. A10-E1.
5. **AC-10.5** — Customer feedback containing `javascript:` payload PII-scrubbed + sanitised before persist; persisted form contains no executable scheme. A10-X1.
6. **AC-10.6** — Cross-tenant feedback (operator A submits to product B owned by operator C) rejected by RLS at `/api/customer/feedback`; no persist. A10-X2.
7. **AC-10.7** — Customer-feedback text containing prompt-injection does NOT manipulate sentiment classification. A10-X3.
8. **AC-10.8** — All emitted `10.metric.v1` envelopes carry `unit` field; agent throws on emit attempt with missing unit. A10 unit-invariant test.

---

## §10 — Panel Questions

### G10-Q1 — Webhook vendor coverage in v1

CA-9-C mentions Zendesk + Intercom + Help Scout. Which vendor adapters ship in v1?

- (a) All three day-one — full coverage at ship; longer build but completes CA-9-C in one stroke.
- (b) Zendesk only day-one; Intercom + Help Scout follow as Phase 1.5.
- (c) Generic webhook receiver (vendor-agnostic JSON schema) day-one; per-vendor adapters as plugins.
- (d) Defer all webhook receivers to Phase 2; v1 ships with only in-app widget + review scraping.
- (e) INSUFFICIENT_INFORMATION.

### G10-Q2 — Sentry / Datadog / PostHog integration timing

ToolMenu CA-11-B.6 lists Sentry / Datadog / PostHog / New Relic as monitoring tools. Phase 1 plan ships without them. Right timing?

- (a) Phase 1 ships without; Phase 2 adds them based on per-operator demand.
- (b) Phase 1 ships with Sentry only (most-requested OSS option).
- (c) Phase 1 ships with PostHog only (OSS, lowest cost-tier).
- (d) Phase 1 ships with all 4 — full ToolMenu coverage day-one.
- (e) INSUFFICIENT_INFORMATION.

### G10-Q3 — Anomaly dedup window

§6.4 risk #7 specifies 1 anomaly per `kind` per `productId` per 5 minutes. Right window?

- (a) 5 minutes — current plan; balances noise vs missed signals.
- (b) 1 minute — finer granularity; more storage; risk of alert fatigue.
- (c) 15 minutes — coarser; lower alert volume; risk of missing fast-recovering anomalies.
- (d) Operator-configurable per-product per-kind.
- (e) INSUFFICIENT_INFORMATION.

### G10-Q4 — Review scraping consent model

App Store / Trustpilot review scraping touches third-party content. Should operators explicitly opt-in per-product?

- (a) Opt-in default-off; operator declares review URLs in `ProductRegistry.reviewSources`.
- (b) Opt-out default-on; FlowAI scrapes any review URL it can discover via Research; operator can disable per-product.
- (c) Always-on for public review sources (no operator consent needed for public content); always-off for authenticated review APIs.
- (d) Always-off — review scraping deferred entirely to Phase 2; v1 only uses in-app + support tickets.
- (e) INSUFFICIENT_INFORMATION.

### G10-Q5 — Phase 2 Executor SSOT write authority

Phase 2 Executor writes `architecture_snapshot` drift + `delta_log` entries to ProductSSOT. Authority is `requires_human_gate`. Should every write require human gate, or only certain kinds?

- (a) Every SSOT write requires human gate — most conservative.
- (b) `architecture_snapshot` drift writes require human gate; `delta_log` customer-issue entries are autonomous (additive, non-destructive).
- (c) Severity-based — `critical` writes always gated; `medium/high` autonomous below a per-product threshold.
- (d) Operator-configurable per-product per-block.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #10 Monitor engineering spec. Pending W6 Panel ratification.*
