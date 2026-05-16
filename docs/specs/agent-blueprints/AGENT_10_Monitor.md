# Agent #10 — Monitor — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1 + CA-9-C + CA-10-B expansions). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 10 + §9 step 8 monitor + §16.4 Live Monitor + CA-11-B.6 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `10` |
| Name | `Monitor` |
| Mode | `step-owner` |
| Step | **8 — `monitor`** |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | `monitor-ingestion-executor` — needed when Monitor writes customer-feedback rows to ProductSSOT delta_log + architecture_snapshot drift updates (per CA-10-B). Authority `[auto_write_internal, requires_human_gate]` (mirrors Self-Renewal Executor pattern per CA-7 §15.5). |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes every prior pipeline step's outcome (8 topics); ingests THREE customer signal channels per CA-9-C:
  - **In-app reporting:** widget POST → `/api/customer/feedback` → `customer.feedback.raw.v1`
  - **App-store / public review scraping:** Agent #10 dispatches `orchestra.dispatch('crawl', ...)` against registered review pages → `customer.review.scraped.v1`
  - **Support-ticket webhooks:** Zendesk / Intercom / Help Scout vendor adapters at `/api/customer/support-ticket-webhook` → `customer.support.ticket.v1`
- **Decide:** classifies anomalies (session-speed, score-jump, clearance-contradiction per PROTECT-1 Phase 2); detects architecture drift (dev vs prd diff per §16.3); normalises customer feedback into severity-mapped issues (1-2 reports/24h → medium, 3-9 → high, ≥10 → critical per CA-9-C.3).
- **Execute:** Phase 1 — emits anomaly + feedback envelopes; Phase 2 (via Executor) — writes ProductSSOT `architecture_snapshot` drift updates + `delta_log` customer-issue entries.
- **Emit:** final report compiled into clearance decision (0–50 scale per Locked Rule 3); feeds Agent #3 Self-Renewal trigger via `10.customer.issue.v1`.

## 3. MessageBus topics

**Consumes:**
- All prior step-completion topics (`1.product.lifecycle_event.v1`, `2.build.completed.v1`, `7.design.spec.v1`, `8.audit.completed.v1`, `9.gtm.assessment.v1`, `21.crawl.completed.v1` per ENTRY 006)
- `customer.feedback.raw.v1`, `customer.review.scraped.v1`, `customer.support.ticket.v1` (per CA-9-C)

**Produces:**
- `10.anomaly.v1` — payload: `{ runId, productId, severity, kind: 'session-speed'|'score-jump'|'clearance-contradiction'|'architecture-drift', evidence, at }`
- `10.customer.feedback.v1` — normalised, de-duped, sentiment-tagged (per CA-9-C)
- `10.customer.issue.v1` — issues mapped to issueDetector category set (per CA-9-C)
- `10.ssot.updated.v1` — payload: `{ productId, environment, blockUpdated: 'architecture_snapshot'|'delta_log'|'governance_record', updateSummary, at }` (per CA-10-B)
- Final clearance-decision payload to AutoRunner step 8 surface

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('crawl', { url: appStoreReviewPage }, opts);          // CA-9-C scraping
orchestra.dispatch('analyze', { artifact: rawFeedback, criteria: 'sentiment+severity' }, opts);
orchestra.dispatch('interact', { url: liveUrl }, opts);                  // anomaly probe
```

## 5. ToolMenu (per CA-11-B.6)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Sentry | `sentry` (NEW Orchestra adapter; deferred today) | low | `monitor-errors`, `track-performance` |
| 2 | Datadog | `datadog` (NEW; enterprise tier) | enterprise | `monitor-infrastructure`, `monitor-logs`, `monitor-traces` |
| 3 | Vercel Analytics | `vercel` (extended) | free | `monitor-page-views`, `monitor-web-vitals` |
| 4 | PostHog | `posthog` (NEW; OSS) | low | `monitor-product-analytics`, `feature-flags` |
| 5 | New Relic | `new-relic` (NEW) | high | `monitor-infrastructure`, `monitor-apm` |
| 6 | Browserless | `browserless` | low | `crawl` (customer review scraping) |
| 7 | Anthropic API direct | `anthropic-api` | high | `analyze` (sentiment classification on customer feedback per LD-6 real-Claude-only) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent10Monitor.js                   # ~700 LOC (large agent — 3 ingestion channels + anomaly detector + drift detector + normaliser)
src/lib/agents/agents/__tests__/Agent10Monitor.test.js    # ~450 LOC
api/customer/feedback.js                                  # NEW endpoint for widget POST
api/customer/support-ticket-webhook.js                    # NEW vendor webhook receiver
```

Phase 2 Executor:
```
src/lib/agents/agents/Agent10MonitorIngestionExecutor.js  # ~440 LOC
# Plus EXECUTOR_REGISTRY entry per CA-7 §15.5 pattern
```

**Class skeleton:**

```js
export class Agent10Monitor extends BaseAgent {
  static charterId = 10;
  static charter() {
    const r = getAgent(10);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* anomaly + drift + customer-signal detection */ }
  async act(ctx, plan) { /* emit envelopes; Phase 2 writes via Executor */ }
  async recommend(ctx) { /* PA #2.7-analogous step-owner entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Standard step-owner registration at step `monitor`. Plus webhook receiver endpoints registered in `api/`.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A10-N1 | Nominal | All-clear final-report on a passing pipeline run (no anomalies, no customer issues, no drift) |
| A10-N2 | Nominal | 1 customer report (24h window) → emits `10.customer.issue.v1` severity=medium |
| A10-N3 | Nominal | 3 customer reports same category 24h → severity=high (per CA-9-C.3 mapping) |
| A10-N4 | Nominal | 10+ customer reports same category 24h → severity=critical; Self-Renewal auto-deploy-blocked per §12 |
| A10-M1 | Malformed | Malformed webhook payload from Intercom → rejected with schema error; never reaches plan() |
| A10-M2 | Malformed | Missing `8.audit.completed.v1` → final-report emits incomplete-pipeline warning |
| A10-E1 | Edge | Architecture drift dev vs prd detected → `10.anomaly.v1` kind=`architecture-drift` |
| A10-E2 | Edge | Customer review with mixed sentiment → `10.customer.feedback.v1` `sentiment: 'mixed'` |
| A10-X1 | Adversarial | Customer-feedback text containing `javascript:` → PII-scrubbed + sanitised before persist (per CA-10-E.2) |
| A10-X2 | Adversarial | Cross-tenant feedback (operator A submits feedback for tenant B's product) → RLS rejects (per §13 + §14.3) |
| A10-X3 | Adversarial | Prompt injection in customer-feedback text → MockClaude sentiment classifier does NOT take instructions from feedback content |
| A10-X4 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A10-* tests passing
- All 3 customer signal channels wired + 24h soak test produces ≥10 normalised events
- ProductSSOT `architecture_snapshot` drift detection works (synthetic injection test)
- AutoRunner step 8 invokes Agent #10 in place of placeholder
- W4 adversarial coverage ≥7 cases including PII-scrub validation
- 7 consecutive clean Auto Runner runs on dev SUT

## 10. Dependencies + sequencing notes

- **Hard depends on:** All prior step agents (#6, #7, #8, #9) — consumes their outputs in final report
- **Hard depends on:** CA-9-C customer-feedback infra (already canonical per ENTRY 005); CA-10-A ProductSSOT entity (already canonical per ENTRY 005)
- **Soft depends on:** Sentry/Datadog/PostHog adapters wired (deferred today); Agent #10 ships with current toolkit (Browserless + Anthropic API) at first graduation; richer monitoring tools added incrementally
- **Blocks downstream:** Agent #3 Self-Renewal (consumes `10.anomaly.v1` already; will gain `10.customer.issue.v1` per CA-9-C)

## 11. Estimated build effort

**~18 W-hours** Phase 1 (large agent — 3 ingestion channels + anomaly detector + drift detector + sentiment classifier). Phase 2 Executor adds **~10 W-hours** for ProductSSOT write path.

## 12. Open clarification flags

- **Q:** Vendor support-ticket webhook endpoints — which vendor adapters ship in v1? CA-9-C spec mentioned Zendesk + Intercom + Help Scout. Are all three first-day, or does v1 ship Zendesk only? **CLARIFICATION RECOMMENDED** before engineering dispatch.
