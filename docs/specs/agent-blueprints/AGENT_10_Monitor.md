# Agent #10 — Monitor — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A10-REVISE` plurality 5/9 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs; addresses A10 Panel objections + applies cluster-fix paste blocks)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 10 + §9 step 8 monitor + §16.4 Live Monitor + CA-11-B.6 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + CA-9-C customer-feedback infra + CA-10-B SSOT-write expansions + **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)**.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #04 / #21 (PII scrubbing — WHERE + non-Western ID gaps):** RESOLVED via §13.16 "PII scrub boundary + multi-pattern coverage" block. `scrubCredentials()` runs at THREE explicit boundaries — (a) ingestion endpoint (BEFORE the raw envelope persists to the hot store), (b) BEFORE every MessageBus emit (`10.customer.*`), (c) BEFORE every ProductSSOT write (Phase 2 Executor path). Each boundary is a hard gate; an unscrubbed envelope CANNOT pass. The pattern library extends to ≥35 PII patterns covering non-Western government IDs (Nigerian NIN, Indian Aadhaar, Brazilian CPF, EU national IDs, Chinese resident ID, Japanese My Number, etc.), plus financial identifiers (IBAN, SWIFT, card numbers), plus medical identifiers (HL7/FHIR patient IDs, NHS numbers). Closes the 5–15% gap flagged by Obj #21.
- **Obj #11 (Lack of Failure Handling — 3 customer signal channels):** RESOLVED via §13.9 "error handling contract" block. Each of the 3 ingestion channels (in-app widget POST, app-store/public-review scraping, support-ticket vendor webhooks) has explicit failure-mode + recovery-path declarations: schema rejection → 400 + structured error envelope; channel disruption → circuit breaker + buffered-replay queue; vendor outage → fallback to next adapter on the ToolMenu per CA-11-A.4; all-channels-down → emits `10.monitor.degraded.v1` + advisory-only final report (Cluster B halt-on-data-quality).
- **Obj #16 (Over-reliance on LLMs — sentiment classification):** RESOLVED via §13.13 "LLM-grounding hardening" block. Sentiment classification is HYBRID — (a) rule-based first pass (lexicon + keyword + emoji + negation handling; deterministic), (b) LLM second pass ONLY when rule-based confidence < 0.6. Severity mapping (1-2/24h → medium, 3-9 → high, ≥10 → critical per CA-9-C.3) is PURELY rule-based — LLM never sets severity. The LLM advisory layer attaches a `sentimentNarrative` field; the canonical `sentiment` field comes from the rule-based classifier.
- **Obj #17 (Phase 2 deferral complexity — Executor):** RESOLVED via §13.14 "Phase 2 boundary clarification" block. Phase 1 ships independently (anomaly + customer-issue envelopes only; NO SSOT writes). Phase 2 `monitor-ingestion-executor` lives in `EXECUTOR_REGISTRY` per CA-7 §15.5 + Cluster E v3 §2.6 (Option (a) LOCKED pattern). The Executor carries `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`; primary stays `[RECOMMEND_ONLY]`. Phase 1 → Phase 2 transition is additive (no charter mutation on the primary).
- **Obj #22 (mode logic conflicts):** RESOLVED via §13.4 mode-conditional clarification (same boundary shape as Agent #6 v2 + Agent #8 v2). Agent #10 OUTPUT (anomaly + customer-issue envelopes) is mode-agnostic; severity-band THRESHOLDS are mode-conditional via `ProductRegistry.monitorSeverityFloors.byMode` (defaults to global). `pipelineMode` field ALWAYS present per Obj #30 reconciliation.
- **Obj #25 (Audit/SSOT write scope too broad — overlap with #8 + #9):** RESOLVED via §13.11 "SSOT field-ownership partition" table. Agent #10 owns `monitor.health[]`, `architecture_snapshot`, `delta_log`, `monitor.customer_issues[]`. No overlap with Agent #8's `audit.*` or Agent #9's `gtm.*`. Schema-validator (Cluster C) rejects writes to fields outside the agent's declared column-set.
- **Obj #31 (Topic naming unresolved — Agent #10 produces vs `_registry.ts`):** RESOLVED via §13.12 "topic name canonicalisation" block. Canonical produces set for Agent #10 (post-CA-9-C + CA-10-B) is **`['10.anomaly.v1', '10.customer.feedback.v1', '10.customer.issue.v1', '10.monitor.degraded.v1', '10.ssot.updated.v1']`** (5 net-new topics — at the 5-topic-per-ship ceiling per Cluster D v3 §2.1.0-Def). `_registry.ts` row 10 produces field migrates to this exact list at Agent #10 first-ship.
- **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18):** §13.15 added. Agent #10's customer-feedback severity floors + monitor-health scoring evaluate against the FULL canonical market per `product_registry.market_definition`. Narrowing the market at Agent #10's analysis layer (e.g. only "Africa-based pregnancy users" for MyPregLife) is REJECTED — `narrowMarketAt: 'agent10'` is not a valid `ProductRegistry` configuration.
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

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
| Phase 2 sibling Executor | `monitor-ingestion-executor` — registered in `EXECUTOR_REGISTRY` per CA-7 §15.5 + Cluster E v3 §2.6 Option (a). Authority `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. Consumes Phase 1 emissions; performs ProductSSOT `architecture_snapshot` drift writes + `delta_log` customer-issue entries. Primary stays `[RECOMMEND_ONLY]` throughout Phase 2 transition. |

## 2. Perceive → Decide → Execute → Emit cycle (Phase 1)

- **Perceive:** consumes every prior pipeline step's outcome (8 topics); ingests THREE customer signal channels per CA-9-C — (a) in-app widget POST → `/api/customer/feedback` → `customer.feedback.raw.v1`; (b) app-store / public-review scraping via Orchestra `crawl` dispatch → `customer.review.scraped.v1`; (c) support-ticket vendor webhooks (Zendesk / Intercom / Help Scout) at `/api/customer/support-ticket-webhook` → `customer.support.ticket.v1`.
- **Decide:** classifies anomalies (session-speed, score-jump, clearance-contradiction per PROTECT-1 Phase 2); detects architecture drift (dev vs prd diff per §16.3); normalises customer feedback through the §13.13 hybrid sentiment + rule-based severity mapping (1-2/24h → medium, 3-9 → high, ≥10 → critical per CA-9-C.3).
- **Execute (Phase 1):** emits anomaly + feedback + customer-issue envelopes; NO SSOT writes (those are Phase 2 Executor responsibility).
- **Emit:** final report compiled into clearance decision (0–50 scale per Locked Rule 3); feeds Agent #3 Self-Renewal trigger via `10.customer.issue.v1`.

**Phase 2 (sibling Executor):** consumes Phase 1 `10.customer.issue.v1` + `10.anomaly.v1` envelopes; performs SSOT writes (`architecture_snapshot` drift, `delta_log` customer entries); `BaseAgent.guard()` at the sibling boundary enforces `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`; `requires_human_gate` auto-resolves for `medium` severity, routes to Panel + CEO for `critical`.

## 3. MessageBus topics

**Consumes:**
- All prior step-completion topics (`1.product.lifecycle_event.v1`, `2.build.completed.v1`, `7.design.spec.v1`, `8.audit.completed.v1`, `9.gtm.assessment.v1`, `21.crawl.completed.v1` per ENTRY 006)
- `customer.feedback.raw.v1`, `customer.review.scraped.v1`, `customer.support.ticket.v1` (per CA-9-C)

**Produces (Phase 1 — 5 net-new topics, at ceiling):**
- `10.anomaly.v1` — payload: `{ runId, productId, severity, kind: 'session-speed'|'score-jump'|'clearance-contradiction'|'architecture-drift', evidence, pipelineMode, at }`
- `10.customer.feedback.v1` — normalised, de-duped, sentiment-tagged (per CA-9-C)
- `10.customer.issue.v1` — issues mapped to issueDetector category set
- `10.monitor.degraded.v1` — emitted when ≥2 of 3 ingestion channels are degraded (Obj #11 recovery path)
- `10.ssot.updated.v1` — Phase 2 sibling emission only (per CA-10-B)

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('crawl', { url: appStoreReviewPage }, opts);
orchestra.dispatch('analyze', { artifact: rawFeedback, criteria: 'sentiment-narrative' }, opts);
orchestra.dispatch('interact', { url: liveUrl }, opts);
```

## 5. ToolMenu (per CA-11-B.6)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Sentry | `sentry` (NEW; deferred) | low | `monitor-errors`, `track-performance` |
| 2 | Datadog | `datadog` (NEW; enterprise tier) | enterprise | `monitor-infrastructure`, `monitor-logs`, `monitor-traces` |
| 3 | Vercel Analytics | `vercel` (extended) | free | `monitor-page-views`, `monitor-web-vitals` |
| 4 | PostHog | `posthog` (NEW; OSS) | low | `monitor-product-analytics`, `feature-flags` |
| 5 | New Relic | `new-relic` (NEW) | high | `monitor-infrastructure`, `monitor-apm` |
| 6 | Browserless | `browserless` | low | `crawl` (customer review scraping) |
| 7 | Anthropic API direct | `anthropic-api` | high | `analyze` (sentiment narrative only — never sets severity per §13.13) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent10Monitor.js                            # ~700 LOC (3 ingestion channels + anomaly + drift + hybrid sentiment)
src/lib/agents/agents/__tests__/Agent10Monitor.test.js             # ~450 LOC
src/lib/agents/agents/monitor/                                     # helper modules
  piiScrubber.js                                                   # 35-pattern multi-region PII scrubber (Obj #04/#21)
  ruleBasedSentiment.js                                            # deterministic lexicon + negation classifier
  ingestionCircuitBreaker.js                                       # per-channel circuit breaker + buffered replay (Obj #11)
api/customer/feedback.js                                           # NEW endpoint for widget POST
api/customer/support-ticket-webhook.js                             # NEW vendor webhook receiver
```

Phase 2 Executor:
```
src/lib/agents/executors/MonitorIngestionExecutor.js               # ~440 LOC (SSOT-write path; sibling per CA-7 §15.5)
src/lib/agents/executors/__tests__/MonitorIngestionExecutor.test.js
```

**Primary class skeleton (`[RECOMMEND_ONLY]`):**

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
  async plan(ctx) { /* anomaly + drift + customer-signal detection; scrub at ingestion + emit boundary */ }
  async act(ctx, plan) { /* emit Phase 1 envelopes; NO SSOT writes — Phase 2 sibling owns SSOT path */ }
  async recommend(ctx) { /* PA #2.7-analogous step-owner entry */ }
}
```

**Sibling Executor skeleton (Phase 2, `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`):**

```js
export class MonitorIngestionExecutor extends BaseExecutor {
  static executorKey = 'monitor-ingestion-executor';
  static charterAgentId = 10;
  static charter() {
    return Object.freeze({
      key: 'monitor-ingestion-executor',
      agentId: 10,
      authority: [AUTHORITY.AUTO_WRITE_INTERNAL, AUTHORITY.REQUIRES_HUMAN_GATE],
      consumes: ['10.customer.issue.v1', '10.anomaly.v1'],
      produces: ['10.ssot.updated.v1'],
    });
  }
  async execute(ctx, envelope) { /* SSOT scrub-then-write; requires_human_gate auto-resolves on medium */ }
}
```

## 7. OrchestratorHub wire-in pattern

Standard step-owner registration at step `monitor` for Phase 1 primary. Phase 2 sibling registered in `EXECUTOR_REGISTRY` per CA-7 §15.5. Webhook receiver endpoints registered in `api/` for the 3 ingestion channels.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A10-N1 | Nominal | All-clear final-report on a passing pipeline run (no anomalies, no customer issues, no drift) |
| A10-N2 | Nominal | 1 customer report (24h window) → emits `10.customer.issue.v1` severity=medium |
| A10-N3 | Nominal | 3 customer reports same category 24h → severity=high (per CA-9-C.3 mapping; rule-based) |
| A10-N4 | Nominal | 10+ customer reports same category 24h → severity=critical; Self-Renewal auto-deploy-blocked per §12 |
| A10-N5 | Nominal | Sentiment hybrid: rule-based confidence ≥0.6 → LLM dispatch SKIPPED; classifier output used directly |
| A10-M1 | Malformed | Malformed webhook payload from Intercom → rejected at endpoint with 400 + structured error; never reaches plan() |
| A10-M2 | Malformed | Missing `8.audit.completed.v1` → final-report emits incomplete-pipeline warning |
| A10-M3 | Malformed | 2 of 3 ingestion channels degraded → emits `10.monitor.degraded.v1`; circuit breaker buffers replay |
| A10-E1 | Edge | Architecture drift dev vs prd detected → `10.anomaly.v1` kind=`architecture-drift` |
| A10-E2 | Edge | Customer review with mixed sentiment → `10.customer.feedback.v1` `sentiment: 'mixed'` (rule-based) |
| A10-E3 | Edge | Customer-feedback text with Nigerian NIN + Aadhaar in same payload → BOTH scrubbed at ingestion boundary |
| A10-X1 | Adversarial | Customer-feedback text containing `javascript:` → PII-scrubbed + sanitised before persist (per CA-10-E.2 + §13.16) |
| A10-X2 | Adversarial | Cross-tenant feedback (operator A submits feedback for tenant B's product) → RLS rejects (per §13 + §14.3) |
| A10-X3 | Adversarial | Prompt injection in customer-feedback text → sentiment classifier (rule-based primary) NOT subverted; LLM advisory layer guarded by system-quoted block |
| A10-X4 | Adversarial | Hostile getter pattern test |
| A10-X5 | Adversarial | Unscrubbed envelope attempting MessageBus emit → schema-validator rejects at emit boundary (§13.16 hard gate) |
| A10-X6 | Adversarial | Phase 2 sibling SSOT-write attempt without `requires_human_gate` resolution on `critical` severity → `BaseAgent.guard()` rejects |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A10-* tests passing
- All 3 customer signal channels wired + 24h soak test produces ≥10 normalised events
- ProductSSOT `architecture_snapshot` drift detection works (synthetic injection test; Phase 2 sibling)
- AutoRunner step 8 invokes Agent #10 in place of placeholder
- W4 adversarial coverage ≥7 cases including PII-scrub validation across all 35 patterns
- 7 consecutive clean Auto Runner runs on dev SUT

## 10. Dependencies + sequencing notes

- **Hard depends on:** All prior step agents (#6, #7, #8, #9) — consumes their outputs in final report
- **Hard depends on:** CA-9-C customer-feedback infra (LIVE per ENTRY 005); CA-10-A ProductSSOT entity (LIVE per ENTRY 005)
- **Soft depends on:** Sentry/Datadog/PostHog adapters wired (deferred today); Agent #10 ships with current toolkit (Browserless + Anthropic API) at first graduation
- **Blocks downstream:** Agent #3 Self-Renewal (consumes `10.anomaly.v1` already; will gain `10.customer.issue.v1` per CA-9-C)

## 11. Estimated build effort

**~18 W-hours** Phase 1 (large agent — 3 ingestion channels + anomaly detector + drift detector + hybrid sentiment classifier + 35-pattern PII scrubber). Phase 2 sibling Executor adds **~10 W-hours**.

## 12. Open clarification flags

- **Q (RESOLVED v2 — admission gated):** Vendor support-ticket webhook endpoints — Phase 1 ships Zendesk + Intercom (2 highest-volume vendors); Help Scout added as Phase 1.5 follow-on. **CLARIFICATION ACCEPTED — implementation sequencing.**

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict.

- **A-a (boundary-class membership):** Agent #10 is `step-owner` cost-class (Phase 1); the Phase 2 sibling Executor is in the `flowai-internal sibling-executor` cost-class. Cost aggregated at agent×run grain. All LLM dispatches (sentiment narrative, anomaly classifier) via §5 ToolMenu MUST call `costGovernor.reserve(estimatedUsd)` BEFORE + `costGovernor.settle(actualUsd)` after + emit `agent.cost.signal.v1`.
- **A-b (advisory-lock + lease-token):** PostgreSQL advisory-lock + 60s lease TTL per Cluster A v3 §2.5; retry on `LEASE_EXPIRED`.
- **A-c (SERIALIZABLE isolation):** `flowai_run_budgets` mutations through canonical Cluster A library only.
- **A-d (halt envelope):** budget-cap at step 8 → `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }`. The pipeline does not block (Agent #10 is the final step); final report carries `degradedDueToBudget: true`.

### §13.2 — Cluster B Data Quality Gate (per-channel deadlock escape)

Cluster B halts from Agent #10 carry `recoveryHint.degradedChannels: [...]` field indicating which of the 3 ingestion channels are down. Operator may set `ProductRegistry.allowPartialMonitorChannels = true` to accept partial-coverage monitoring rather than full halt.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

- **Output mode-agnostic; thresholds mode-conditional.** Same boundary as Agent #6 v2 §13.4 + Agent #8 v2 §13.4. Severity floors (1-2/24h → medium etc.) read from `ProductRegistry.monitorSeverityFloors.byMode` if present, else global, else CA-9-C.3 canonical defaults.
- **`pipelineMode` field ALWAYS present** on every Cluster D audit-log row (Obj #30 reconciliation). Cross-mode aggregation envelopes use `'mixed'`.

### §13.9 — Error handling contract per ingestion channel (Obj #11 resolution)

| Channel | Failure mode | Detection | Error envelope | Recovery |
|---|---|---|---|---|
| In-app widget POST | Schema-invalid body | endpoint Zod validator | 400 + `customer.feedback.rejected.v1 { reason }` | Client retries; never persists |
| In-app widget POST | Endpoint unreachable | client-side timeout | (client-side; not Agent #10) | Client buffers + retries 3× w/ backoff |
| App-store/review scraping | Crawl returns empty | Orchestra `crawl` adapter | `10.scraper.empty.v1 { source, at }` | Skip cycle; circuit breaker opens after 3 consecutive failures |
| App-store/review scraping | Crawl 429-throttled | Orchestra adapter response | `10.scraper.throttled.v1` | Backoff + retry next cycle |
| Support-ticket webhook | Vendor signature invalid | endpoint signature verifier | 401 + structured error; envelope discarded | Vendor re-pushes |
| Support-ticket webhook | Vendor down | webhook delivery failure | `customer.support.vendor_down.v1` (advisory) | Buffer replay queue; fall-through to next vendor adapter per CA-11-A.4 |
| ALL CHANNELS DOWN | ≥2 of 3 channels degraded | per-channel circuit breaker | `10.monitor.degraded.v1` + Cluster B halt-on-data-quality | Final report flagged degraded; operator review |

### §13.11 — SSOT field-ownership partition (Obj #25 resolution; aligned with Agent #8 v2 §13.11)

| SSOT field family | Owner | Other agents' access |
|---|---|---|
| `monitor.health[]`, `architecture_snapshot`, `delta_log`, `monitor.customer_issues[]` | **Agent #10** (Phase 2 sibling writes) | read-only |
| `audit.scores[]`, `audit.evidence[]`, `audit.recommendations[]` | Agent #8 | read-only |
| `gtm.assessment[]`, `gtm.demo_readiness[]`, `gtm.demo_assets[]` | Agent #9 | read-only |
| `governance_record[]` | Agent #3 Self-Renewal Executor | read-only |

Schema-validator (Cluster C) rejects writes to fields outside an agent's declared ownership column-set per CA-10-A schema.

### §13.12 — Topic name canonicalisation (Obj #31 resolution)

Canonical produces set: **5 topics at first ship** (at ceiling per Cluster D v3 §2.1.0-Def):
- `10.anomaly.v1`
- `10.customer.feedback.v1`
- `10.customer.issue.v1`
- `10.monitor.degraded.v1` (NEW — Obj #11 recovery path)
- `10.ssot.updated.v1` (Phase 2 sibling only; declared in primary `produces` for schema-validator visibility)

`_registry.ts` row 10 `produces` field migrates to this exact list at first-ship. No legacy aliases.

### §13.13 — LLM-grounding hardening (Obj #16 resolution)

Sentiment classification HYBRID:
- **Rule-based primary (deterministic):** lexicon + keyword + emoji + negation handling. Outputs `{ sentiment: 'positive'|'neutral'|'negative'|'mixed', confidence: 0..1 }`.
- **LLM secondary (advisory only, conditional):** dispatched ONLY when rule-based confidence < 0.6. Outputs a `sentimentNarrative` field. The canonical `sentiment` value REMAINS the rule-based output even when LLM is dispatched (LLM provides narrative context, not classification).
- **Severity mapping (rule-based only):** 1-2/24h → medium; 3-9 → high; ≥10 → critical per CA-9-C.3. LLM NEVER touches severity assignment.

### §13.14 — Phase 2 boundary clarification (Obj #17 resolution)

- **Phase 1:** anomaly + customer-issue + degraded envelopes only. NO SSOT writes. Ships in Wave 1.
- **Phase 2:** SSOT writes via `monitor-ingestion-executor` sibling in `EXECUTOR_REGISTRY` per CA-7 §15.5 + Cluster E v3 §2.6 (Option (a)). Primary stays `[RECOMMEND_ONLY]`. Phase 2 dispatch independent of Phase 1 graduation.
- **Phase 1 → Phase 2 transition is additive:** no charter mutation on the primary; sibling slot is registered at Phase 2 first-ship commit. `validateExecutors()` accepts the new entry per the CA-7 §15.5 sibling-keyed-by-primary-agentId pattern.

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)

Agent #10's customer-feedback severity floors + monitor-health scoring read `product_registry.market_definition` (mirrors SSOT §1.1; PERMANENT per CEO instruction). The full canonical market is the scoring substrate; narrowing the market at Agent #10's analysis layer (e.g. only Africa-based MyPregLife users, or only "ESG teams" for SAIGE) is REJECTED — `narrowMarketAt: 'agent10'` is not a valid `ProductRegistry` configuration. Per ENTRY 010 §28 narrow-the-scope clarification + SSOT §7.6 "Market-definition scope" clause: full-market evaluation is enforced.

### §13.16 — PII scrub boundary + multi-pattern coverage (Obj #04 + #21 resolution)

`scrubCredentials()` runs at THREE explicit boundaries — none optional:

| Boundary | When | Hard gate behaviour |
|---|---|---|
| (a) Ingestion endpoint | BEFORE the raw envelope persists to hot store | Unscrubbed bytes NEVER hit the DB; pre-scrub raw is held in memory only |
| (b) MessageBus emit | BEFORE every `10.customer.*` emit | `MessageBus.emit()` schema-validator rejects payloads where the scrubber's `unscrubbed_token_count > 0` |
| (c) ProductSSOT write (Phase 2) | BEFORE every sibling-Executor SSOT write | `MonitorIngestionExecutor.execute()` re-scrubs at the boundary; double-scrub defense in depth |

Pattern library (≥35 patterns; closes Obj #21 non-Western ID gap):
- **Western government IDs:** US SSN, US ITIN, US driver's license states, EU national IDs (per-country), UK NI number, Canadian SIN, Australian TFN.
- **Non-Western government IDs:** Nigerian NIN, Indian Aadhaar, Brazilian CPF/CNPJ, Chinese resident ID, Japanese My Number, Korean RRN, Indonesian NIK, South African ID, Mexican CURP, Argentine DNI.
- **Financial:** IBAN (per-country), SWIFT/BIC, card numbers (Visa/MC/Amex/Discover/UnionPay/JCB), bank account number patterns (US ACH, EU SEPA, etc.).
- **Medical:** HL7/FHIR patient IDs, UK NHS number, US MRN patterns, generic ICD-10 + medication-name leakage flags.
- **Contact:** email, phone (E.164 + per-country regional), physical address fragments.

Closes the 5–15% gap flagged by Obj #21. Pattern set ratified by Panel ≥7/10 before Agent #10 first-ship (rubric-style ratification gate).

## 14. Cluster C integration — see §13.4 above

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 5 `10.*` topics conform to v3 §2.2 naming; migration test harness per §2.3.1 covers the 5 topics before §14.1 micro-amendment lands.
- **D-b (retention-class binding):** `10.customer.issue.v1`, `10.customer.feedback.v1`, `10.ssot.updated.v1` are `retention-class: governance` (7-year + hash-chain mirror). `10.anomaly.v1`, `10.monitor.degraded.v1` are `retention-class: operational` (90-day).
- **D-c (replay-buffer semantics):** idempotency key `runId + channel + customer_signal_id + at-truncated-to-second` prevents replay double-emit; replay attempts emit advisory log only.

**Topic-per-ship ceiling:** 5 net-new topics fit within the single first-ship commit. No split required.

**Load-test artifact gate (Cluster D v3 §2.8):** shared Wave 1 cohort artifact per Cluster D AC-CD-11; Agent #10 does not produce its own.

## 16. Cluster E integration — v3 + Option (a) LOCKED (v2 paste block)

Per `CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md` v3 + ENTRY 009.

Agent #10 primary `[RECOMMEND_ONLY]`; Phase 2 sibling `monitor-ingestion-executor` carries `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` per the canonical CA-7 §15.5 + Cluster E v3 §2.6 Option (a) pattern. NO dual-authority on the primary at any phase. The sibling is registered in `EXECUTOR_REGISTRY` at Phase 2 first-ship; `validateExecutors()` accepts the entry; primary roster cardinality is unaffected.

**Authoritative ceiling enforcement (Cluster E v3 §2.5 R2):** sibling Executor's `execute()` entry traverses `BaseAgent.guard(authorityNeeded, dispatchCtx)`; `getCeiling()` advisory-cache check + Orchestrator authoritative re-validation per §2.5 + §2.8 split-brain resolution.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **04** | PII scrubbing — WHERE | §13.16 — 3 explicit scrub boundaries (ingest / emit / SSOT-write) |
| **11** | Lack of failure handling (3 channels) | §13.9 — per-channel failure-mode + recovery table + `10.monitor.degraded.v1` |
| **16** | Over-reliance on LLMs (sentiment) | §13.13 — rule-based primary; LLM advisory only when confidence < 0.6 |
| **17** | Phase 2 deferral complexity | §13.14 — sibling Executor in EXECUTOR_REGISTRY; primary stays recommend_only |
| **21** | PII scrub gaps (non-Western IDs) | §13.16 — ≥35 pattern coverage incl. NIN/Aadhaar/CPF/Chinese ID etc. |
| **22** | Mode logic conflicts | §13.4 — output mode-agnostic; thresholds mode-conditional |
| **25** | SSOT write scope (overlap #8/#9) | §13.11 — partition table; Agent #10 owns monitor.* + architecture_snapshot + delta_log |
| **30** | Cluster C `pipelineMode` consistency | §13.4 — always present on every emit |
| **31** | Topic naming unresolved | §13.12 — 5 canonical topics; `_registry.ts` migrates at first-ship |
| **N/A** | VEU §1.1 market scope (CEO 2026-05-18) | §13.15 — full-market scoring; narrowing rejected |

---

*End of Agent #10 Monitor build blueprint v2. Panel `PLURALITY_A10-REVISE` 5/9 objections (9 distinct A10-touching objections in the W6 doc) resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification.*
