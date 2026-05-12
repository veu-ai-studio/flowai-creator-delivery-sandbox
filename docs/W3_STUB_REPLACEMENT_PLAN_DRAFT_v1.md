# W3 Stub Evaluator Replacement — Plan Draft v1

**Status:** DRAFT (synthesis of 8-reviewer panel — pending CEO approval)
**Authored:** 2026-05-12 by W5b
**Input:** `docs/panel-consultations/w3-stub-replacement-2026-05-11.md`
**Reviewers (8 LIVE-OK):** Slot 1 = Opus 4.7 · Slot 2 = GPT-5.5 · Slot 3 = Gemini 2.5 Pro · Slot 4 = Perplexity Sonar Pro · Slot 5 = Vercel v0 · Slot 6 = GPT-4.1 · Slot 7 = GPT-4o-mini · Slot 10 = GPT-4o-web-grounded
**Reviewers non-responsive:** Slots 8 & 9 (headless, Playwright codegen not done)
**Synthesis rule:** "Consensus" = position supported by ≥5 of 8 reviewers.

This document replaces the placeholder `structured_stub` evaluators currently in `src/lib/audits/criteria/governance/*.js` and `src/lib/audits/criteria/readiness/*.js` (all 13 return `score: 100` with descriptive evidence). The panel was unanimous that fabricating `100` constitutes a false-green failure mode — the goal of this plan is to replace stubs with real measurement for the 10 evaluators whose data sources already exist, and to convert the other 3 to honest `score: null` envelopes pending W3-blocking dependencies (Agent #10 Monitor, IP-T1b / IP-T2).

---

## SECTION 1 — DOABLE-NOW EVALUATORS

Ten evaluators can ship today against existing data sources (`flowai_audit_log`, `BaseAgent.runId` records, MessageBus traffic, agent registry charters, and the W5b primitives shipped in commit 496886d: `auditChain.js`, `errors.js`, `logger.js`).

| # | Evaluator | Primary data source | Formula (0–100) | Red-fixture verification artifact | Ship order |
|---:|---|---|---|---|---:|
| 1 | `gov.authority` | Registry `charter.authority_tier` + audit-log `event.action` rows | `100 × (1 − violations / totalActions)`; if any event requires higher tier than agent holds, cap at 60; `null` if `totalActions = 0` | Tier-1 agent emits `mutate.production` event → assert `score < 100 AND violations >= 1` | 1 |
| 2 | `gov.charter_contract` | Registry `consumes` / `produces` lists + MessageBus traffic | `100 × (1 − (undeclaredPublishes + undeclaredSubscribes) / totalInteractions)`, or `max(0, 100 − 20 × violations)` (S5) | Active charter missing `escalation_policy` + ledger contract-hash mismatch → assert `score < 100 AND findings includes 'CHARTER_HASH_MISMATCH'` | 2 |
| 3 | `gov.message_schema` | MessageBus payloads + topic schema registry (charter-linked) | `100 × (valid_messages / total_messages)`; ajv-validate each payload; envelope must carry `messageId, runId, topic, producerAgentId, schemaVersion, publishedAt, payload`; topic must be in producer charter's `produces[]`; if topic schema missing → cap at 80 | Publish three invalid messages (missing `runId`, undeclared topic, schema-violating payload) → assert `score < 100 AND invalid_messages.length === 3` | 3 |
| 4 | `gov.audit_completeness` | `flowai_audit_log` + `BaseAgent.runId` + `auditChain.verifyRange(from, to)` | Composite: `round(30 × started_ratio + 25 × terminal_ratio + 25 × message_link_ratio + 20 × chain_valid)`, where `chain_valid = 1` only if every `prevHash → rowHash` link verifies end-to-end. Alternative simpler form (S1): `100 − 50 × (chainBreaks > 0) − min(50, 100 × missingTerminal / totalRuns)`. `null` if `totalRuns = 0`. | Inject row with mutated `prevHash` + one run missing `run.end` + one message with `runId = null` → assert `score < 50 AND findings includes 'AUDIT_CHAIN_INVALID', 'MISSING_TERMINAL_EVENT', 'UNLINKED_MESSAGE'` | 4 |
| 5 | `gov.escalation` | `flowai_audit_log` rows with `severity ∈ {critical, high}` or `code ∈ {AUTHORITY_DENIED, SCHEMA_INVALID, SECRET_LEAK, DATA_LOSS, UNHANDLED_EXCEPTION}` or `run.failed` + `event_type='governance.escalated'` correlated rows | `100 × (escalated_within_sla / trigger_events)`. SLA: critical=5 min, high=15 min. If `trigger_events = 0` → return `0` with finding `NO_ESCALATION_TRIGGER_EVIDENCE` (not 100 — harness must include synthetic trigger) | High-severity `AUTHORITY_DENIED` with no `governance.escalated` row inside 15 min → assert `score < 100 AND findings includes 'ESCALATION_MISSING_OR_LATE'` | 5 |
| 6 | `gov.secrets_hygiene` | MessageBus payloads + `flowai_audit_log.metadata` + logger.js output | Regex scan against `/sk-[A-Za-z0-9_-]{20,}/`, `/AKIA[0-9A-Z]{16}/`, `/ghp_[A-Za-z0-9_]{20,}/`, `/-----BEGIN PRIVATE KEY-----/`, `/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/`. Score: `100` if zero hits; `max(0, 100 − 50 × high_confidence_leaks − 10 × medium_confidence_hits)`. Private-key blocks or known canary leaks force `score = 0`. | Insert canary `sk-flowai-canary-do-not-use-1234567890` into MessageBus payload → assert `score == 0 AND findings includes 'SECRET_LEAK_DETECTED'` | 6 |
| 7 | `rdy.functional` | `flowai_audit_log` events `RUN_COMPLETE` / `RUN_FAILED` per `runId` + required output-topic check from charter | `100 × (passing_scenarios / required_scenarios)` where scenario passes only if (a) run reached `status=completed`, (b) no critical/high severity errors, (c) all expected output topics published. `null` if `total_runs < 20` (S1) OR `< 3` (S5) — TBD threshold | Insert 2 `RUN_COMPLETE` + 1 `RUN_FAILED` → assert `score == 67 AND findings includes 'RUN_FAILED'`. Bonus: scenario where run completed but required output topic not published → assert `score < 100 AND findings includes 'MISSING_EXPECTED_OUTPUT_TOPIC'` | 7 |
| 8 | `rdy.failure_handling` | `errors.js` structured errors with `code, severity, retryable, message, runId, correlationId` + `flowai_audit_log` `event_type='RECOVERY'` correlated rows | For each failure, require `error.code ∈ knownTaxonomy AND (error.handled === true OR error.escalated === true)`. `score = 100 × (handled / total_failures)`. If `total_failures = 0` → `100`. Recovery latency > 60s caps partial credit at 50 per incident. Raw stack traces without errors.js fields count failed. | Inject malformed input → raw exception without errors.js fields + no DLQ publish → assert `score < 100 AND findings includes 'UNSTRUCTURED_ERROR', 'MISSING_FAILURE_ROUTE'` | 8 |
| 9 | `rdy.dependencies` | Charter `consumes[]` + MessageBus `listTopics()` + broker `getTopicHealth(topic)` returning `{ exists, lastMessageAge_ms, subscriberCount }` | `score = (healthy_deps / total_deps) × 100` where healthy = `exists AND lastMessageAge_ms < 300_000`. If `total_deps = 0` AND charter explicitly declares `dependencies: []` → `100`; if `total_deps = 0` AND not declared → flag as incomplete metadata. Composite (S2): `round(40 × topic_resolution + 40 × declaration_quality + 20 × observed_call_declaration)`. | Charter declares `consumes: ['non-existent-topic']` → assert `score < 100 AND findings includes 'UNRESOLVED_TOPIC_DEPENDENCY'` | 9 |
| 10 | `rdy.documentation` | Registry `charter.description, version, owner, runbook, changelog, support_contact, known_limits` | For each agent, count present + non-empty (≥10 chars) required fields. `score = 100 × (present_required / total_required)`. Placeholder values (`"TODO"`, `"TBD"`, `"N/A"`) count missing. Optional `changelog` adds +10 bonus when present. Step-function (S5): `0, 30, 60, 90, 100`. | Charter with `readme_url = "TODO"`, missing `runbook_url`, no `known_limits` → assert `score < 100 AND findings includes each missing field name` | 10 |

**Sequencing rationale.** Six of eight reviewers (S1, S2, S4, S5, S6, S7, S10 — only S3 dissented) ordered governance-foundation evaluators (authority / charter / schema / audit) before readiness. Within the governance group, the choice between `gov.authority` first (S4, S5, S6, S10) and `gov.audit_completeness` first (S1, S2, S7) is split 4-3. The synthesized order leads with **`gov.authority`** because (a) it is the cheapest registry-only check (no audit-log dependency), and (b) it surfaces tier-violation evidence that every downstream governance evaluator presumes is consistent. `gov.audit_completeness` follows at #4 once schema and charter foundations have established the ledger's trust prerequisites.

---

## SECTION 2 — DEFERRED EVALUATORS

Three evaluators cannot ship today; all 8 reviewers (unanimous) agree they must return `score: null` with a stable `reason` string, NOT `score: 100` and NOT `score: 0`.

| # | Evaluator | Blocker | Return value (envelope) | Reason string |
|---:|---|---|---|---|
| 11 | `gov.ip_protection` | IP-T1b / IP-T2 not yet shipped — no IP provenance ledger / classifier exists to query | `{ evaluatorId, score: null, status: 'DEFERRED', reason, blockedBy: 'IP-T1b / IP-T2', falseGreenGuard: true, since, nextReview }` | `deferred-pending-IP-T1b-IP-T2` |
| 12 | `rdy.performance` | Agent #10 Monitor not yet built — no durable latency / throughput / error-rate time series at evaluator-required granularity | Same envelope shape | `deferred-pending-Agent10-Monitor` |
| 13 | `rdy.observability` | Agent #10 Monitor not yet built — no metric coverage map / span / log freshness data | Same envelope shape | `deferred-pending-Agent10-Monitor` |

**Canonical envelope** (consensus shape across S1, S2, S3, S4, S5, S6, S10):

```js
{
  evaluatorId:     "gov.ip_protection" | "rdy.performance" | "rdy.observability",
  score:           null,
  status:          "DEFERRED",
  reason:          "deferred-pending-<dependency>",
  blockedBy:       "IP-T1b / IP-T2" | "Agent #10 Monitor",
  since:           "<ISO-8601 timestamp when deferred status was set>",
  nextReview:      "<ISO-8601 milestone target>",
  evaluatedAt:     "<ISO-8601 current run>",
  contractTestPassing: true,       // proves harness wired even though compute is stubbed
  falseGreenGuard: true            // machine-readable flag: aggregator must NEVER treat null as 100
}
```

**Approved deferral allowlist** (per S1): commit `w3/deferred-evaluators.json` to the repo with the three IDs + their blocking deps. CI fails if ANY evaluator outside this list returns `status: DEFERRED`. This prevents deferral from becoming the next silent false-green failure mode.

**Aggregate handling — DISSENT FLAGGED.** See Section 5 / Flag #1.

---

## SECTION 3 — PER-EVALUATOR MEASUREMENT SPECS

Each subsection records: data sources, deterministic query / pseudocode, scoring formula, and boundary cases. Where reviewers diverged on formula precision, both the synthesis and the dissent are recorded.

### 3.1 `gov.authority`

- **(a) Data sources:** Agent registry `charter.authority_tier` (enum: `T1 | T2 | T3` per S5; or `RECOMMEND_ONLY | DRAFT_ONLY | AUTO_CONTAIN_KNOWN | AUTO_WRITE_INTERNAL | REQUIRES_HUMAN_GATE` per Layer 3 canonical). `flowai_audit_log.actor_tier` column on each event row. `agent_registry.charter_json.allowed_actions[]`. MessageBus `producer_agent_id` on each publish.
- **(b) Computation:** For every published message and audited action in the evaluation window:
  1. Resolve `producer_agent_id` → registry charter → declared `authority_tier`.
  2. Lookup the action's required tier from a table-driven authority map (`mutate.production` ⇒ tier ≥ 2; etc.).
  3. `unauthorized = action.required_tier > agent.tier` OR `topic ∉ charter.produces`.
  4. SQL (per S5): `SELECT COUNT(*) FILTER (WHERE actor_tier = charter_tier) AS matching, COUNT(*) AS total FROM flowai_audit_log WHERE agent_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`.
- **(c) Formula:** `score = round(100 × (authorized_events / total_governable_events))`; cap at 60 if any event requires higher tier than agent holds. Return `null` with `reason: 'no-traffic'` if `total_governable_events = 0`. Return `score = 50` if `total_governable_events > 0` but charter has no tier set (missing config penalty per S5).
- **Boundary cases:** Unknown agent or missing charter ⇒ unauthorized. Tier-escalation events ⇒ hard-cap 60.

### 3.2 `gov.charter_contract`

- **(a) Data sources:** `agent_registry` (charter fields: `agent_id, owner, purpose, authority_tier, mode, consumes_topics, produces_topics, escalation_policy, contract_hash, charter_version`). `flowai_audit_log` charter-registration events (`event_type='charter.registered'`).
- **(b) Computation:** For each active agent:
  1. Require all 10 fields present.
  2. Verify `registry.contract_hash === latest flowai_audit_log.payload.contract_hash` for that agent.
  3. Compute `ghostTopics = declared \ liveBrokerTopics`; `undeclaredTopics = (publishedBy(agent) ∪ subscribedBy(agent)) \ declared`.
- **(c) Formula:** Two equivalent formulations on the table:
  - S2 ratio form: `score = round(100 × valid_active_agents / active_agents)` where valid = all fields present + registry hash equals ledger hash.
  - S5 deduction form: `score = max(0, 100 − 20 × (ghostTopics.length + undeclaredTopics.length))`; ≥5 violations → 0.
- **Boundary cases:** No active agents ⇒ `score = 0` with `NO_ACTIVE_AGENT_CHARTERS`. Hash mismatch is invalid even if fields present.

### 3.3 `gov.message_schema`

- **(a) Data sources:** `message_bus_records (message_id, run_id, topic, producer_agent_id, schema_version, payload, published_at)` + topic schema registry embedded/referenced by charters. Per S1: each topic has a schema-linked JSON Schema in `charter.produces[].schema`.
- **(b) Computation:** For each MessageBus record in window, validate:
  1. Envelope fields present: `message_id, run_id, topic, producer_agent_id, schema_version, published_at, payload`.
  2. `topic ∈ registry[producer_agent_id].produces_topics`.
  3. `ajv.validate(schemaFor(topic, schema_version), payload) === true`.
- **(c) Formula:** `score = round(100 × valid_messages / total_messages)`. If schema missing for a topic in use, cap at 80 (S1). Return `null` if `total_messages = 0` (S5) or `0` with `NO_MESSAGE_EVIDENCE` (S2).
- **Boundary cases:** Missing `runId` ⇒ invalid. Unknown topic / schema ⇒ invalid.

### 3.4 `gov.audit_completeness`

- **(a) Data sources:** `flowai_audit_log` rows + `auditChain.verifyRange(from_ts, to_ts)` (already shipped in commit 496886d) + `base_agent_runs` table.
- **(b) Computation:** Two complementary checks:
  1. **Chain integrity:** call `auditChain.verifyRange({fromTs, toTs})` → boolean. Hash-link verification using `prevHash → rowHash` per S1's auditChain implementation.
  2. **Run-coverage:** Compare `expected = DISTINCT run_id FROM base_agent_runs` vs `covered = DISTINCT run_id FROM flowai_audit_log` in the window. Compute `missingTerminal` (runs without `run.end` event), `chainBreaks` (rows where prevHash mismatch), `messageLinks` (MessageBus records with `run_id ∈ expected`).
- **(c) Formula (synthesized — pick one before Phase 1):**
  - **S2 composite (recommended):** `score = round(30 × started_ratio + 25 × terminal_ratio + 25 × message_link_ratio + 20 × chain_valid)`, each ratio 0..1. `chain_valid = 1` only if `verifyRange` returns ok.
  - **S1 deduction (alternative):** `score = floor(100 − 50 × (chainBreaks > 0) − min(50, 100 × missingTerminal / totalRuns))`.
- **Boundary cases:** `total_runs = 0` ⇒ return `null` with `NO_RUN_EVIDENCE` (S2). Any single `chainBreak` already cuts the score in half (S1).

### 3.5 `gov.escalation`

- **(a) Data sources:** `flowai_audit_log` where `severity ∈ {critical, high}` OR `code ∈ {AUTHORITY_DENIED, SCHEMA_INVALID, SECRET_LEAK, DATA_LOSS, UNHANDLED_EXCEPTION}` OR terminal `run.failed` + correlated `event_type='governance.escalated'` rows with `payload.source_event_id`.
- **(b) Computation:** For each trigger event, require an `governance.escalated` row with `payload.source_event_id = trigger.id` within the SLA:
  - Critical SLA: 5 minutes.
  - High SLA: 15 minutes.
  - Escalation row must carry a non-null, non-empty `metadata.escalation_target` (S5 — explicit guard against empty targets).
- **(c) Formula:** `score = round(100 × escalated_within_sla / trigger_events)`. −25 per occurrence where `escalation_target` references an unregistered agentId (S5). If `trigger_events = 0` → return `0` with `NO_ESCALATION_TRIGGER_EVIDENCE` (S2 — harness MUST inject a synthetic trigger to make the evaluator meaningful).

### 3.6 `gov.secrets_hygiene`

- **(a) Data sources:** `message_bus_records.payload` + `flowai_audit_log.metadata` + `logger.js` structured logs.
- **(b) Computation:** Regex-scan serialized payloads / metadata / log text against the synthesized pattern set (cross-reviewer union):

  ```
  /sk-[A-Za-z0-9_-]{20,}/                                  // OpenAI / Anthropic / FlowAI key shape
  /AKIA[0-9A-Z]{16}/                                       // AWS access key
  /ghp_[A-Za-z0-9_]{20,}/                                  // GitHub personal access token
  /-----BEGIN (PRIVATE|RSA PRIVATE|EC PRIVATE) KEY-----/   // PEM private key block
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/      // JWT
  /Bearer\s+[A-Za-z0-9_\-\.]{16,}/                         // bearer token
  /api[_-]?key[=:]\s*[A-Za-z0-9_-]{16,}/i                  // api_key= form
  ```

  Ignore explicit redaction placeholders (`[REDACTED]`, `<SECRET>`, approved canary hashes).
- **(c) Formula:** `score = 100` if `scanned_artifacts > 0 AND high_confidence_leaks = 0`. Otherwise `score = max(0, 100 − 50 × high_confidence_leaks − 10 × medium_confidence_hits)` (S2). Any private-key block OR known canary leak forces `score = 0`. `0` (not 100) if `scanned_artifacts = 0` (no scan evidence — harness MUST submit at least one artifact).

### 3.7 `rdy.functional`

- **(a) Data sources:** `flowai_audit_log` events `RUN_COMPLETE` / `RUN_FAILED` keyed by `(agent_id, run_id)`. Charter `produces_topics` per scenario. `flowai_audit_log` `severity` column.
- **(b) Computation:** For each required smoke scenario (defined per-agent in charter or in a `scenarios.json`):
  - Run reached `status = 'completed'`.
  - No `severity ∈ {critical, high}` rows for that `run_id`.
  - At least one MessageBus record was produced on each expected output topic.
- **(c) Formula:** `score = round(100 × passing_scenarios / required_scenarios)`. Return `null` if `total_runs < min_window` (S1: 20, S5: 3 — see Flag #2). Missing expected output topic is a failure even if run status is `completed` (S2).

### 3.8 `rdy.failure_handling`

- **(a) Data sources:** `errors.js` structured errors recorded in `flowai_audit_log` (`agentId, code, severity, retryable, message, runId, correlationId`) + `flowai_audit_log` rows with `event_type='RECOVERY'` joined on `correlationId`.
- **(b) Computation:** For each error, require:
  - `error.code ∈ knownTaxonomy` (from `errors.js` exports — `ConfigError`, `ValidationError`, `PayloadError`, `CharterError`, `AuthorityError`, `DependencyError`, `NotImplementedError`, `ChainError`, `EvaluatorError`).
  - `error.handled === true` OR `error.escalated === true`.
  - A matching `RECOVERY` row within 60s by `correlationId`.
- **(c) Formula:** `score = round(100 × recovered_or_handled / total_failures)`. Raw stack traces lacking `errors.js` typed fields count as failed (S2). Recovery latency > 60s ⇒ partial credit capped at 50 per incident (S5). If `total_failures = 0` ⇒ `score = 100`.

### 3.9 `rdy.dependencies`

- **(a) Data sources:** `agent_registry.charter_json.dependencies[]` (each: `{name, type, owner, version_or_range, required, fallback}`) + `charter.consumes_topics[]` + MessageBus broker `listTopics()` + broker `getTopicHealth(topic)` → `{exists, lastMessageAge_ms, subscriberCount}` + `flowai_audit_log` `event_type='dependency.call'` for observed call declaration.
- **(b) Computation:** Three checks (S2 composite):
  - `topic_resolution_ratio`: every consumed topic resolves to an active producer OR an explicitly declared external source.
  - `declared_dependency_quality`: every declared service dependency has all required metadata fields.
  - `observed_call_declaration_ratio`: every observed `dependency.call` is declared in charter.
- **(c) Formula:** `score = round(40 × topic_resolution + 40 × declaration_quality + 20 × observed_call_declaration)`. Simpler form (S5): `score = healthy / total_deps × 100` where healthy = `exists AND lastMessageAge_ms < 300_000`. Agent with no dependencies MUST declare `dependencies: []` explicitly; otherwise treated as incomplete metadata. Undeclared observed call caps that agent's subscore at 50 (S2).

### 3.10 `rdy.documentation`

- **(a) Data sources:** `agent_registry.charter_json` fields. Required per S2 union: `owner, purpose, readme_url, runbook_url, inputs, outputs, configuration, examples, known_limits, changelog, support_contact`. Smaller required set per S5: `description, version, owner` (each ≥10 chars) + optional `changelog`. **Pick one — see Flag #3.**
- **(b) Computation:** For each active agent, count present required fields where present = non-null AND non-placeholder (placeholders include `"TODO"`, `"TBD"`, `"N/A"`, `""`, strings <10 chars).
- **(c) Formula:** `score = round(100 × avg(present_required / total_required across agents))`. Or step-function (S5): `0, 30, 60, 90, 100` with +10 bonus for `changelog`. Optional `HEAD readme_url` check if network access allowed; otherwise require immutable doc hash in charter (S2).

---

## SECTION 4 — VERIFICATION TEST PLAN

The panel's single strongest convergence (8 of 8 reviewers) was that **every evaluator must ship with a paired green-fixture / red-fixture and a CI mutation test that catches any unconditional `return 100`**. This is the structural defense against re-introducing the original false-green failure mode.

### 4.1 Minimum merge standard (per S2, S5)

Every evaluator's PR must satisfy ALL of:

1. **Green fixture** that produces `score = 100`.
2. **Red fixture** that produces `score < 100`.
3. **Machine-readable findings**, not only a numeric score.
4. **Missing-evidence-is-failure semantics** — except for the three explicitly-deferred evaluators on the approved deferral list.
5. **Mutation test:** CI replaces the evaluator body with `return 100`; the red fixture MUST catch the mutation (i.e. CI fails when the mutation is applied).

### 4.2 Universal anti-false-green guard (S1)

A single contract test runs against every non-deferred evaluator:

```js
// criterion_must_be_falsifiable.test.js
for (const evalId of NON_DEFERRED_EVALUATORS) {
  const evaluator = await loadEvaluator(evalId);
  const green = await loadFixture(`${evalId}.green.json`);
  const red   = await loadFixture(`${evalId}.red.json`);

  // 1. Red fixture must produce a lower score than green.
  expect(evaluator.run(red).score).toBeLessThan(evaluator.run(green).score);

  // 2. Empty / missing-evidence input must NOT return 100.
  expect(evaluator.run(emptyInput).score).not.toBe(100);
  expect(evaluator.run(emptyInput).score).toBeNull();   // or zero with NO_EVIDENCE finding

  // 3. Findings must be non-empty when score < 100.
  const redResult = evaluator.run(red);
  if (redResult.score < 100) {
    expect(redResult.findings.length).toBeGreaterThan(0);
    expect(redResult.status).toBe('measured');
  }
}
```

This guard makes "stub returning 100" structurally impossible to ship.

### 4.3 Red-fixture catalogue (synthesized across all 8 reviewers)

| Evaluator | Red fixture | Assertion catching false-green |
|---|---|---|
| `gov.authority` | Tier-1 agent emits `mutate.production` event in audit log + low-tier agent publishes to admin-only topic | `score < 100 AND unauthorized_events.length >= 2`; if tier escalation occurred, `score <= 60` |
| `gov.charter_contract` | Active charter missing `escalation_policy` + registry `contract_hash` does NOT match ledger hash | `score < 100 AND findings includes MISSING_REQUIRED_FIELD AND CHARTER_HASH_MISMATCH` |
| `gov.message_schema` | Publish 3 invalid messages: missing `run_id`, undeclared topic, schema-violating payload | `score < 100 AND invalid_messages.length === 3` |
| `gov.audit_completeness` | Insert 5 `runId` entries in `baseagent_run_log`, write only 3 to `flowai_audit_log` + one row with mutated `prevHash` | `score === 60` (3/5 coverage) AND `chain_valid === false` |
| `gov.escalation` | Emit high-severity `AUTHORITY_DENIED` with no corresponding `governance.escalated` row within 15 min | `score < 100 AND findings includes ESCALATION_MISSING_OR_LATE` |
| `gov.secrets_hygiene` | Insert canary `sk-flowai-canary-do-not-use-1234567890` in MessageBus payload + log line | `score === 0 AND findings includes SECRET_LEAK_DETECTED` |
| `rdy.functional` | Insert 2 `RUN_COMPLETE` + 1 `RUN_FAILED` rows | `score === 67` (2/3 × 100 ≈ 66.67 → 67); a score of 100 proves the evaluator is ignoring `RUN_FAILED` rows |
| `rdy.failure_handling` | Insert 3 error records with no corresponding `RECOVERY` rows + 1 raw exception without errors.js fields | `score === 0 AND findings includes UNSTRUCTURED_ERROR AND MISSING_FAILURE_ROUTE` |
| `rdy.dependencies` | Charter declares `consumes: ['non-existent-topic']` + observed dependency.call to undeclared service | `score < 100 AND findings includes UNRESOLVED_TOPIC_DEPENDENCY AND UNDECLARED_DEPENDENCY_CALL` |
| `rdy.documentation` | Charter with `description = ""`, missing `owner`, `runbook_url = "TODO"` | `score === 30` (only `version` present, 30 pts); a score of 100 proves the evaluator is not reading charter fields |

### 4.4 Approved deferral allowlist (S1)

Commit `w3/deferred-evaluators.json`:

```json
{
  "approvedDeferrals": [
    { "evaluator": "gov.ip_protection",  "blockedBy": "IP-T1b / IP-T2", "reason": "deferred-pending-IP-T1b-IP-T2" },
    { "evaluator": "rdy.performance",    "blockedBy": "Agent #10 Monitor", "reason": "deferred-pending-Agent10-Monitor" },
    { "evaluator": "rdy.observability",  "blockedBy": "Agent #10 Monitor", "reason": "deferred-pending-Agent10-Monitor" }
  ]
}
```

CI rule: any evaluator returning `status: 'DEFERRED'` whose `evaluator` field is NOT in this allowlist ⇒ test fails. This is the structural guard against deferral becoming the next silent false-green pattern.

### 4.5 Aggregate gate test

The aggregate gate (used by W4 entry) MUST verify:

1. **Measurement coverage** = `count(measured) / count(total) ≥ 0.95` (or whatever threshold the CEO picks — see Flag #1).
2. **Measured score** = weighted average of non-null scores ≥ 95.
3. **Deferred ⊆ approvedDeferralList**.

The W4 UI surfaces deferred evaluators as **yellow**, not green — visually distinct from passing (per S1, S5).

---

## SECTION 5 — CEO FLAGS REQUIRING DISPOSITION BEFORE W3 BUILDS

The synthesis surfaced several decisions where reviewers diverged enough that the W3 implementer needs an explicit CEO call before writing code.

### Flag #1 — Aggregate gate behavior: BLOCK vs REPORT on deferred

The largest dissent across the panel.

- **BLOCK camp** (S1, S2, S5 — 3 of 8): While any deferred evaluator exists, the W4 entry gate is BLOCKED. Measurement coverage must be 100% before W4 entry is permitted. The 95/95 aggregate cannot show green. Rationale: deferral is itself a coverage gap; the system should not advance until it is closed.

  ```
  W4_ENTRY_PERMITTED = (deferred_count === 0) AND (aggregate_score >= 95)
  ```

- **REPORT camp** (S3, S4, S6, S7, S10 — 5 of 8): Aggregate excludes nulls from the average, reports deferred count + reasons transparently, but does NOT block. The 10 implementable evaluators can be built, tested, and enforced immediately; the deferred 3 are tracked in a separate "coverage" metric. Rationale: blocking penalizes the implementer for dependencies they cannot ship.

  ```
  aggregate_score        = mean(non-null scores)
  measurement_coverage   = scored_count / total_count    (currently 10/13 = 76.9%)
  gate_status            = "measured: 95, coverage: 76.9%, deferred: 3"
  ```

**CEO disposition needed:** Pick BLOCK or REPORT. The block stance is more conservative but means W3 has to wait for Agent #10 + IP-T1b/T2 before any 95/95 green flag can appear; the report stance lets W4 progress on the 10 measurable evaluators in parallel.

**Synthesis recommendation:** REPORT, with a clearly-visible non-green status while any approved-deferral is open. The block stance trades correctness for project momentum; the report stance still prevents false-greens (the aggregate label honestly says "coverage 76.9%") without holding the build hostage.

### Flag #2 — Minimum run window for `rdy.functional`

S1 specifies `total_runs < 20 ⇒ null`; S5 specifies `total_runs < 3 ⇒ null`; no other reviewer named a number. The threshold matters because too-small windows produce noisy scores; too-large windows mean new agents have no data for the entire warmup period.

**CEO disposition needed:** Pick a number — recommend **20** for production-grade evaluator, **3** for development/test mode (gated by env flag).

### Flag #3 — Required documentation fields

S2's required field set: 11 fields including `runbook_url`, `examples`, `known_limits`, `changelog`, `support_contact`. S5's: 3 fields (`description`, `version`, `owner`) with `changelog` as bonus.

**CEO disposition needed:** Pick the field set. Sparse set ships faster; richer set surfaces real documentation debt. Recommend the larger S2 set, since the dispatch's stated motive is "no false-greens" and a 3-field charter that produces score=100 is exactly the kind of thin-pass the panel warned about.

### Flag #4 — Authority tier vocabulary

S5 uses `T1 | T2 | T3`; Layer 3 canonical uses `RECOMMEND_ONLY | DRAFT_ONLY | AUTO_CONTAIN_KNOWN | AUTO_WRITE_INTERNAL | REQUIRES_HUMAN_GATE`; S1/S2 reference both but don't pick.

**CEO disposition needed:** Map S5's compact form to the Layer 3 canonical form before `gov.authority` is implemented. The likely mapping: `T1 = RECOMMEND_ONLY`, `T2 = AUTO_CONTAIN_KNOWN`, `T3 = AUTO_WRITE_INTERNAL`. Without a CEO-locked mapping, the authority tier check is meaningless.

### Flag #5 — Audit-completeness formula

S1 (deduction) and S2 (composite) propose materially different scoring formulas. Both are sound; they produce different scores for the same input.

**CEO disposition needed:** Pick S1's `100 − 50 × chainBreak − 50 × missingTerminal/totalRuns` OR S2's `30 × started + 25 × terminal + 25 × link + 20 × chain`. Synthesis recommendation: **S2 composite** — it surfaces partial-coverage cases (e.g. 100% chain-valid but missing terminals) more legibly than S1's blunt deduction.

### Flag #6 — `gov.escalation` SLA windows

S1 = 5 seconds for high-severity; S2 = 5 min critical / 15 min high; S5 = no SLA, just existence check. The synthesis used S2's 5/15-min windows because S1's 5-second window is unrealistic for a human-in-the-loop escalation path.

**CEO disposition needed:** Confirm 5 min / 15 min, or pick different.

### Flag #7 — `gov.escalation` deferral status

S10 (alone among 8 reviewers) marks `gov.escalation` as DEFERRED on the grounds that it "requires upstream evaluators to be functional." All other reviewers treat it as doable now using `flowai_audit_log` + `errors.js`. S10 is outvoted 7-1, so synthesis treats it as doable now — but the dispatch should explicitly accept this.

**CEO disposition needed:** Confirm `gov.escalation` ships in the doable-now wave (synthesis position), or accept S10's deferral framing.

### Flag #8 — `rdy.performance` deferral

S7 lists "rdy.message_schema" as deferred — but that evaluator doesn't exist; it's a typo for `gov.message_schema` (which all 8 reviewers agree is doable now). Ignore as a transcription error.

**CEO disposition needed:** None — flag is non-actionable, just noted.

### Flag #9 — Panel non-response (process)

Slots 8 and 9 (headless: base44_chat, replit_agent) returned DEFERRED status — Playwright codegen not yet done. This was an 8-of-10 panel, not the 10/10 the Locked Rule mandates. Recommend the Playwright codegen be sequenced for completion before the next W3 dispatch panel runs, since the headless reviewers are the only channel for soliciting non-API-accessible LLM perspectives.

**CEO disposition needed:** Authorize Playwright codegen work as a follow-up, OR formally accept 8/10 as the operating quorum for the W3 series.

---

## SECTION 6 — RECOMMENDED W3 BUILD PHASING

If the CEO disposes of the flags above, the W3 implementer can follow this build order:

| Phase | Evaluator(s) | Effort | Dependencies on prior phases |
|---|---|---|---|
| **W3-A** | `gov.authority` | 1 day | None (registry-only) |
| **W3-B** | `gov.charter_contract` | 1 day | None (registry + broker topic list) |
| **W3-C** | `gov.message_schema` | 1 day | Topic schemas in charter (existing) |
| **W3-D** | `gov.audit_completeness` | 2 days | auditChain.js (already shipped) + Flag #5 resolved |
| **W3-E** | `gov.escalation` | 1 day | Flag #6 resolved (SLA windows) |
| **W3-F** | `gov.secrets_hygiene` | 1 day | Regex pattern set locked |
| **W3-G** | `rdy.functional` | 1 day | Flag #2 resolved (min-run window) |
| **W3-H** | `rdy.failure_handling` | 1 day | errors.js taxonomy locked (shipped in commit 496886d) |
| **W3-I** | `rdy.dependencies` | 1 day | Charter `dependencies[]` field shape locked |
| **W3-J** | `rdy.documentation` | 1 day | Flag #3 resolved (required field set) |
| **W3-K** | Deferred-envelope wiring + approved-deferral allowlist | 0.5 day | Flag #1 resolved (block vs report) |
| **W3-L** | Aggregate gate + W4 entry harness | 1 day | Flag #1 resolved |
| **W3-M** | CI mutation test + falsifiable contract test | 0.5 day | All above |

**Total:** ≈13 days of focused engineer-time, assuming all 9 CEO flags are dispositioned. The phases are independent enough to be parallelizable across multiple Wx dispatches; the gating dependency is CEO flag resolution rather than technical sequencing.

---

## SECTION 7 — METRICS

| Metric | Value |
|---|---|
| Reviewers in panel | 8 of 10 LIVE-OK (slots 1, 2, 3, 4, 5, 6, 7, 10) |
| Non-responsive slots | 2 of 10 (slots 8, 9 — headless, Playwright codegen pending) |
| Questions synthesized | 5 of 5 (sequence / doable-now / measurement / verification / deferred handling) |
| Evaluators classified | 13 of 13 (10 doable-now / 3 deferred) |
| Consensus on doable-now set | 7 of 8 (S10 dissents on `gov.escalation`) |
| Consensus on deferred set | 8 of 8 (unanimous — `gov.ip_protection`, `rdy.performance`, `rdy.observability`) |
| Consensus on `score: null` envelope | 8 of 8 (unanimous — NOT `100`, NOT `0`) |
| Consensus on green-vs-red fixture verification | 8 of 8 (unanimous — strongest single panel convergence) |
| CEO flags surfaced | 9 (most impactful: aggregate gate BLOCK vs REPORT) |

---

## STATUS

This is a **DRAFT**. It is NOT canonical and MUST NOT be referenced as the W3 build instruction until:

1. The 9 CEO flags in Section 5 are dispositioned.
2. The disposed-flag answers are baked back into Sections 1–4.
3. The resulting v2 is promoted to `docs/W3_STUB_REPLACEMENT_PLAN.md` (canonical name, no `_DRAFT_v1` suffix).

Until then: this document is the panel synthesis; the dispositions are not yet recorded.
