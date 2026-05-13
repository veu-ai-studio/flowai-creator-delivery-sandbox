# W3 Stub Replacement Plan — DRAFT v1

**Status:** **DRAFT** — synthesis of the 8-reviewer panel consultation `docs/panel-consultations/w3-stub-replacement-2026-05-11.md`. **All 10 CEO flags resolved 2026-05-13** (dispositions: Flag 1→A, Flag 2→A, Flag 3→B, Flag 4→A, Flag 5→A, Flag 6→A, Flag 7→Hybrid, Flag 8→Layer-3-canonical, Flag 9→A, Flag 10→(b) accept 8/10 quorum). Promotion to canonical (`docs/W3_STUB_REPLACEMENT_PLAN.md`) deferred to a separate dispatch after build smoke. Implementation landed: 10 measurement evaluators + 3 deferred + `w3/deferred-evaluators.json` allowlist + CI guard + per-evaluator red/green fixtures. Full vitest suite 1198/1198 green post-build.

**Authored:** 2026-05-12 by W3 (this dispatch).
**Prior synthesis:** A W5b synthesis at this same path landed at commit `e66ddf7 feat: W3 stub replacement plan draft synthesis [W5b]` and remains in git history. This W3 version applies the COI rule per the dispatch brief (see Appendix C) and is **not a strict superset** of W5b's draft — on two splits (aggregate gate behavior; first-evaluator pick), the W3 synthesis surfaces the dissent as a CEO flag where W5b's draft picks the softer side. CEO should treat the two as alternative readings of the same panel.

**Source panel:** Slot 1 Opus 4.7 · Slot 2 GPT-5.5 · Slot 3 Gemini 2.5 Pro · Slot 4 Perplexity Sonar Pro · Slot 5 Vercel v0 · Slot 6 GPT-4.1 · Slot 7 GPT-4o-mini · Slot 10 GPT-4o (Slots 8/9 deferred — Playwright codegen not done).
**Consensus rule:** ≥5 of 8 reviewers in agreement = consensus.
**COI rule (brief-directed):** W3 originally authored the 13 `structured_stub` evaluators that this plan replaces. When the Panel proposes a harder method than W3's stub, the harder method gets synthesized. No measurement-method downgrade, no sequencing override, no work minimization. Specific applications are recorded in Appendix C.

---

## Section 1 — Doable-now evaluators

**CONSENSUS (7 of 8):** 10 evaluators are implementable today against existing infrastructure (`flowai_audit_log` via `0003_flowai_audit_log.sql`; `BaseAgent.runId` records; MessageBus publish/subscribe records; agent registry charters; W5b primitives `auditChain.js` / `errors.js` / `logger.js`).
**DISSENT:** Slot 10 also defers `gov.escalation` pending upstream evaluators (9 doable / 4 deferred). The 7-of-8 majority treats `gov.escalation` as doable today.
**RECOMMENDATION:** Ship the 10 below. Flag the `gov.escalation` classification to CEO (see §5 Flag 2).

| # | Evaluator | Primary data source | Formula (0–100), normalised | Red-fixture verification artifact | Recommended tier |
|---|---|---|---|---|---|
| 1 | `gov.audit_completeness` | `flowai_audit_log` rows + `auditChain.verifyRange()` over BaseAgent run lineage | `coverage_ratio × 100`, with `auditChain.verifyRange()` returning `ok=true`. Hash-chain failure floors the score (Slots 1 + 2: chain integrity is non-negotiable evidence — see §5 Flag 5). | Inject one mutated `prevHash` row + one runId missing terminal event → `score < 50`; findings include `chainBreak`, `missingTerminal`. | Tier 1 |
| 2 | `gov.authority` | Registry `charter.authority_tier` + `flowai_audit_log.actor_tier` per row | `(authorized_events / total_governable_events) × 100`. Cap at 60 if any single event exceeded its required tier (Slot 2 — "tier escalation in evidence" is a hard finding, not amortised away). If `total = 0` → see §5 Flag 4. | Tier-1 agent publishes to a tier-2 protected topic → `score < 60` AND `unauthorized_events ≥ 1`. | Tier 1 |
| 3 | `gov.charter_contract` | Registry charters (`consumes, produces, escalation_policy, contract_hash`) + MessageBus traffic + `flowai_audit_log.charter.registered` events | Composite: `0.6 × field_completeness + 0.4 × topic_alignment`. Field completeness = (agents with all required fields + ledger hash match) / active agents. Topic alignment = `max(0, 100 − 20·(ghost + undeclared))` (Slot 5); ≥5 violations ⇒ 0. | Active charter missing `escalation_policy` + registry `contract_hash` not matching ledger → `score < 100`; findings include `MISSING_REQUIRED_FIELD` + `CHARTER_HASH_MISMATCH`. | Tier 1 |
| 4 | `gov.message_schema` | MessageBus payloads + charter-linked topic schema registry (AJV-validated) | `(valid_messages / total_messages) × 100`. A message is valid only if envelope fields exist, `run_id` is non-null, topic is declared by producer charter, schema version is known, and payload validates. Unknown topic/schema in use → cap at 80 (Slot 1). | Publish 3 invalid messages: missing `run_id`, undeclared topic, payload missing required field → `score < 100` AND `invalid_messages.length === 3`. | Tier 2 |
| 5 | `gov.escalation` | `flowai_audit_log` trigger events + correlated `governance.escalated` rows within SLA | `(escalated_within_sla / trigger_events) × 100`. SLAs: 5 min critical, 15 min high (Slot 2). If `trigger_events = 0`, return **null** with `reason: NO_ESCALATION_TRIGGER_EVIDENCE` (Slot 2 explicit: NOT 100). Harness MUST inject ≥1 synthetic trigger per gate run. | Synthetic high-severity `AUTHORITY_DENIED` with no matching `governance.escalated` row within 15 min → `score < 100`; finding `ESCALATION_MISSING_OR_LATE`. | Tier 2 |
| 6 | `gov.secrets_hygiene` | MessageBus payloads + `flowai_audit_log.metadata` + `logger.js` output | Regex scan against high-confidence patterns: `AKIA[0-9A-Z]{16}`, `sk-[A-Za-z0-9_-]{20,}`, `ghp_[A-Za-z0-9_]{20,}`, `-----BEGIN PRIVATE KEY-----`, JWT triplet. `score = 100` only if `scanned_artifacts > 0 AND hits = 0`. Any private-key block / canary forces `score = 0`. Otherwise `max(0, 100 − 50·hits − 10·medium_hits)`. Explicit `[REDACTED]` / `<SECRET>` placeholders are NOT leaks. | Canary `"apikey": "sk-flowai-canary-do-not-use-1234567890"` in MessageBus payload → `score ≤ 50` for 1 hit, `score = 0` for 2; finding `SECRET_LEAK_DETECTED`. | Tier 2 |
| 7 | `rdy.functional` | `flowai_audit_log` `event_type ∈ {RUN_COMPLETE, RUN_FAILED}` per `runId` + required output-topic check from `charter.produces_topics` | `(passing_scenarios / required_scenarios) × 100`. Scenario passes only if run completed AND no high/critical errors AND every declared output topic published. If `required_scenarios = 0` OR `total_runs < min_window` (see §5 Flag 7), return null with appropriate reason. | 50 runs with exactly 10 `RUN_FAILED` rows → `score = 80 ± 0.1` (exact arithmetic; Slot 1). | Tier 3 |
| 8 | `rdy.failure_handling` | `errors.js` typed errors (`code, severity, retryable, runId, correlationId`) + `flowai_audit_log` `RECOVERY` rows correlated by `correlationId` | `(handled_failures / injected_failures) × 100`. Handled failure requires structured `errors.js` envelope, terminal `failed` or `recovered` state, configured failure routing (DLQ / error topic). Raw stack traces without `errors.js` fields count as failed. Recovery latency > 60s ⇒ partial credit capped at 50 per incident (Slot 5). | Inject 3 errors with no matching `RECOVERY` rows + 1 raw exception without `errors.js` envelope → `score < 100`; findings `UNSTRUCTURED_ERROR` + `MISSING_FAILURE_ROUTE`. | Tier 3 |
| 9 | `rdy.dependencies` | Charter `consumes_topics, produces_topics, dependencies[]` + MessageBus broker `listTopics()` + `flowai_audit_log.dependency.call` events | `round(40·topic_resolution + 40·declared_dependency_quality + 20·observed_call_declaration)`. Topic resolution: every consumed topic has an active producer or explicit external-source declaration. Declaration quality: each dep has `name, type, owner, version_or_range, required, fallback`. Observed-call declaration: every `dependency.call` corresponds to a declared dep. Undeclared observed call caps that agent at 50. | Charter `consumes: [topicX]` with no active producer + observed `dependency.call` to undeclared service → `score < 100`; findings `UNRESOLVED_TOPIC_DEPENDENCY` + `UNDECLARED_DEPENDENCY_CALL`. | Tier 3 |
| 10 | `rdy.documentation` | Registry `charter_json` required fields: `owner, purpose, readme_url, runbook_url, inputs, outputs, configuration, examples, known_limits, changelog, support_contact` (Slot 2 — 11 fields). | `doc_points[a] = present_required_fields[a] / total_required`. `score = round(100 · avg(doc_points))`. Placeholders `"TODO"`, `"TBD"`, `"N/A"`, empty strings, < 10 chars count as missing (Slot 2 + Slot 5). | Charter with `readme_url = "TODO"`, missing `runbook_url`, no `known_limits` → `score < 100`; findings list each missing/placeholder doc field. | Tier 4 |

**Tier definitions** (consensus from Slots 1, 2, 5):
- **Tier 1** = governance substrate that everything else implicitly trusts (ship first).
- **Tier 2** = governance evaluators that read from the trusted substrate (ship second).
- **Tier 3** = readiness evaluators reusing Tier 1/2 primitives.
- **Tier 4** = readiness evaluators with no runtime coupling (pure registry static checks; parallelisable).

---

## Section 2 — Deferred evaluators

**CONSENSUS (8 of 8 — strongest single panel convergence):** Deferred evaluators return `score: null`, never `100`, never `0`. Reason string is machine-readable. Excluded from aggregate denominator.

| Evaluator | Blocker | Return value | Reason string | Aggregate behavior |
|---|---|---|---|---|
| `gov.ip_protection` | **IP-T1b / IP-T2** — no IP boundary metadata, asset lineage, policy tag, or enforcement record exists in the audit ledger yet. | `{ score: null, status: 'DEFERRED', ... }` | `"deferred-pending-IP-T1b-IP-T2"` | Excluded from denominator. Surfaces with `falseGreenGuard: true` flag. See §5 Flag 3. |
| `rdy.performance` | **Agent #10 Monitor** — no durable latency/throughput/error-rate time series. | Same envelope. | `"deferred-pending-agent-10-monitor"` | Same. |
| `rdy.observability` | **Agent #10 Monitor** — no canonical monitor source for span/metric/log coverage, cardinality, freshness, alertability. | Same envelope. | `"deferred-pending-agent-10-monitor"` | Same. |

**Canonical null envelope** (consensus shape — Slots 1, 2, 3, 5, 6, 7, 10):

```json
{
  "evaluatorId": "gov.ip_protection",
  "score": null,
  "status": "DEFERRED",
  "reason": "deferred-pending-IP-T1b-IP-T2",
  "blockingDependency": "IP-T1b / IP-T2",
  "since": "<ISO-8601 timestamp when deferred status was set>",
  "nextReview": "<ISO-8601 milestone target>",
  "falseGreenGuard": true,
  "contractTestPassing": true,
  "evidence_window": { "from_ts": "...", "to_ts": "..." },
  "findings": [{ "code": "DEFERRED", "detail": "measurement cannot yet be performed" }],
  "counts": { "measured_items": 0, "deferred_items": 1 },
  "replacement_of_stub": true
}
```

**Approved deferral list — committed as `w3/deferred-evaluators.json`** (Slot 1):

```json
{
  "approvedDeferrals": [
    { "evaluator": "gov.ip_protection", "blockedBy": "IP-T1b / IP-T2",     "reason": "deferred-pending-IP-T1b-IP-T2" },
    { "evaluator": "rdy.performance",   "blockedBy": "Agent #10 Monitor", "reason": "deferred-pending-agent-10-monitor" },
    { "evaluator": "rdy.observability", "blockedBy": "Agent #10 Monitor", "reason": "deferred-pending-agent-10-monitor" }
  ]
}
```

CI fails if any evaluator returns `status: 'DEFERRED'` whose id is NOT on this allowlist. Forces explicit removal of each deferral when its blocker lands. Structural guard against deferral becoming the next silent false-green pattern.

---

## Section 3 — Per-evaluator measurement specs

Each subsection records: (a) data source, (b) deterministic computation, (c) scoring formula, (d) boundary conditions including `null`-return cases. Where reviewer formulas diverged, the synthesis chooses the **harder** option per the COI rule.

### 3.1 `gov.audit_completeness`

**(a) Data source.** `flowai_audit_log` (from `0003_flowai_audit_log.sql`) + `baseagent_run_log` lineage + `auditChain.verifyRange(from_ts, to_ts)` from W5b's `src/lib/shared/auditChain.js`.

**(b) Computation.** Two checks, both required:
1. **Coverage ratio.** Take all `runId` values emitted by the candidate agent in `baseagent_run_log` within `[from_ts, to_ts]`. Count how many appear in `flowai_audit_log` for the same window. `coverage_ratio = covered_count / expected_count`.
2. **Chain integrity.** Call `auditChain.verifyRange({ fromTs, toTs })`. Result `{ ok: boolean, breaks: [...] }`. Slots 1 + 2 are explicit: chain verification is **non-negotiable evidence**, not advisory.

**(c) Scoring formula** (Slot 2 composite — harder of two reviewer formulas):

```text
score = round(
  30 · started_ratio
  + 25 · terminal_ratio
  + 25 · message_link_ratio
  + 20 · chain_valid_ratio
)
where chain_valid_ratio = 1.0 only if auditChain.verifyRange().ok === true.
```

**(d) Boundary conditions.**
- `expected_count === 0` → return `null` with `reason: NO_RUN_EVIDENCE`. **Do not fabricate 100** (Slot 5; Slot 2 explicit).
- Any `prevHash` mismatch in the window → `chain_valid_ratio = 0` AND finding `AUDIT_CHAIN_INVALID`.

### 3.2 `gov.authority`

**(a) Data source.** Registry `charter.authority_tier` + `flowai_audit_log.actor_tier` per row + `charter.allowed_actions` (Slot 2). **NOTE — vocabulary split, see §5 Flag 8.**

**(b) Computation.** For every published message and audited action in window, verify the producer/actor is allowed under its charter:
- Messages: producer must declare the topic in `produces_topics`.
- Actions: `payload.authority_required <= charter.authority_tier` AND action ∈ `charter.allowed_actions`.

**(c) Scoring formula.**

```text
score = round(100 · authorized_events / total_governable_events)
if any single event required a higher tier than the agent has, cap at 60.
```

**(d) Boundary conditions.**
- `total_governable_events === 0` → see §5 Flag 4 (CEO disposition: null vs penalty vs binary).
- Unknown agent or missing charter → that event counts as unauthorized.

### 3.3 `gov.charter_contract`

**(a) Data source.** `agent_registry` + `flowai_audit_log.event_type='charter.registered'` rows.

**(b) Computation.** For each active agent, require these charter fields present and non-empty: `agent_id, owner, purpose, authority_tier, mode, consumes_topics, produces_topics, escalation_policy, contract_hash, charter_version`. Verify `contract_hash` matches latest `charter.registered` payload for that agent. Separately, count ghost topics (declared but absent from broker) and undeclared topics (in use but not declared).

**(c) Scoring formula** (composite — both reviewer formulas merged):

```text
field_completeness = (active_agents_with_all_required_fields_and_hash_match) / active_agents
topic_alignment    = max(0, 100 - 20·(ghost_topics + undeclared_topics))   // Slot 5
                   capped at 0 if ≥5 violations
score = round(0.6 · 100 · field_completeness + 0.4 · topic_alignment)
```

**(d) Boundary conditions.**
- `active_agents === 0` → return `null` with `reason: NO_ACTIVE_AGENT_CHARTERS`.
- Hash mismatch with ledger is invalid even if all fields are present.

### 3.4 `gov.message_schema`

**(a) Data source.** `message_bus_records.payload` + `agent_registry.charter_json.produces_topics[].schema` (referenced or embedded) + AJV.

**(b) Computation.** For every message in window:
1. Required envelope fields present: `message_id, run_id, topic, producer_agent_id, schema_version, published_at, payload`.
2. `run_id` non-null.
3. Topic declared in producer's charter `produces_topics`.
4. Schema version known.
5. `ajv.validate(schema, payload) === true`.

**(c) Scoring formula.**

```text
score = round(100 · valid_messages / total_messages)
cap at 80 if any topic in use lacks a declared schema (Slot 1)
```

**(d) Boundary conditions.**
- `total_messages === 0` → return `null` with `reason: NO_MESSAGE_EVIDENCE` (Slot 2: not 100).
- Missing `run_id` ⇒ message counts as invalid.

### 3.5 `gov.escalation`

**(a) Data source.** `flowai_audit_log` trigger events + `governance.escalated` events correlated by `payload.source_event_id` (Slot 2).

**(b) Computation.** Trigger events are rows where `severity ∈ {critical, high}` OR `code ∈ {AUTHORITY_DENIED, SCHEMA_INVALID, SECRET_LEAK, DATA_LOSS, UNHANDLED_EXCEPTION}` OR terminal `run.failed`. For each trigger, require a matching `governance.escalated` row within SLA. SLAs: 5 min critical, 15 min high.

**(c) Scoring formula.**

```text
score = round(100 · escalated_within_sla / trigger_events)
```

**(d) Boundary conditions.**
- `trigger_events === 0` → return **null** with `reason: NO_ESCALATION_TRIGGER_EVIDENCE` (Slot 2 explicit: NOT 100). Harness MUST inject ≥1 synthetic high-severity trigger per gate run.

### 3.6 `gov.secrets_hygiene`

**(a) Data source.** `message_bus_records.payload` + `flowai_audit_log.metadata` + `logger.js` output samples.

**(b) Computation.** Regex scan against high-confidence patterns (Slot 2 catalog, augmented):

```
/AKIA[0-9A-Z]{16}/                                       AWS access key
/sk-[A-Za-z0-9_-]{20,}/                                  Anthropic/OpenAI-style
/ghp_[A-Za-z0-9_]{20,}/                                  GitHub personal token
/-----BEGIN (PRIVATE|RSA PRIVATE|EC PRIVATE) KEY-----/   PEM private key block
/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/      JWT triplet
/Bearer\s+[A-Za-z0-9_\-\.]{16,}/                         bearer token
/api[_-]?key[=:]\s*[A-Za-z0-9_-]{16,}/i                  api_key=foo form
```

Explicit placeholders `[REDACTED]`, `<SECRET>`, approved canary hashes do NOT count as leaks.

**(c) Scoring formula.**

```text
score = 100  if scanned_artifacts > 0 AND high_confidence_leaks = 0
score = max(0, 100 - 50·high_confidence_leaks - 10·medium_hits)  otherwise
score = 0    if any private-key block OR known canary appears
```

**(d) Boundary conditions.**
- `scanned_artifacts === 0` → return `null` with `reason: NO_SECRET_SCAN_EVIDENCE` (Slot 2: NOT 100).
- Any private-key block forces `score = 0` and acts as a W4 fail-gate (Slot 5).

### 3.7 `rdy.functional`

**(a) Data source.** `flowai_audit_log` `event_type ∈ {RUN_COMPLETE, RUN_FAILED}` per `runId` + `message_bus_records` for required output topics + `agent_registry.charter_json.produces_topics`.

**(b) Computation.** For each required smoke scenario, the run must:
1. Reach `event_type = RUN_COMPLETE`.
2. Have no `severity ∈ {critical, high}` events in the run window.
3. Have published ≥1 message on each declared output topic.

**(c) Scoring formula.**

```text
score = round(100 · passing_scenarios / required_scenarios)
```

**(d) Boundary conditions.**
- `required_scenarios === 0` → `null`, `reason: NO_FUNCTIONAL_SCENARIOS` (Slot 2).
- `total_runs < min_window` → `null`, `reason: INSUFFICIENT_RUNS`. **min_window is split between Slot 1 (20) and Slot 5 (3) — see §5 Flag 7.**
- Missing output topic ⇒ scenario fails even if `RUN_COMPLETE`.

### 3.8 `rdy.failure_handling`

**(a) Data source.** `errors.js` typed error records (`code, severity, retryable, runId, correlationId`) + `flowai_audit_log.RECOVERY` rows correlated by `correlationId` + DLQ/error-topic publishes on MessageBus.

**(b) Computation.** For each injected failure, require:
1. Structured `errors.js` envelope (`code, severity, retryable, run_id`).
2. Terminal `failed` or `recovered` state without process crash.
3. Configured failure routing observed (DLQ publish or error-topic publish where applicable).

`error.code ∈ knownTaxonomy` — `errors.js` exports include `ConfigError, ValidationError, PayloadError, CharterError, AuthorityError, DependencyError, NotImplementedError, ChainError, EvaluatorError` (per W5b's shipped taxonomy).

**(c) Scoring formula.**

```text
score = round(100 · handled_failures / injected_failures)
partial credit capped at 50 per incident with recovery latency > 60s   // Slot 5
```

**(d) Boundary conditions.**
- `injected_failures === 0` → **`null`**, `reason: NO_FAILURE_INJECTION_EVIDENCE` (Slot 2 — NOT 100). Harness must inject ≥1 failure per gate run.
- Raw stack traces without `errors.js` fields ⇒ that failure counts as failed.

### 3.9 `rdy.dependencies`

**(a) Data source.** Charter `consumes_topics, produces_topics, dependencies[]` + MessageBus `listTopics()` + `flowai_audit_log` `dependency.call` events.

**(b) Computation.** Three sub-checks:
1. **Topic resolution.** Every `consumes_topics[t]` resolves to an active agent producing it or is marked `external_source: "<name>"`.
2. **Declared dependency quality.** Each `dependencies[i]` has `name, type, owner, version_or_range, required, fallback`.
3. **Observed-call declaration.** Every `dependency.call` row has a matching declared dep.

**(c) Scoring formula.**

```text
score = round(
  40 · topic_resolution_ratio
  + 40 · declared_dependency_quality
  + 20 · observed_call_declaration_ratio
)
```

Undeclared observed call caps that agent's dependency subscore at 50.

**(d) Boundary conditions.**
- If an agent has no dependencies, charter MUST explicitly declare `dependencies: []`. Absence is incomplete metadata, not zero dependencies.

### 3.10 `rdy.documentation`

**(a) Data source.** `agent_registry.charter_json` required fields: `owner, purpose, readme_url, runbook_url, inputs, outputs, configuration, examples, known_limits, changelog, support_contact` (Slot 2 — 11 fields). **NOTE — field-set split with Slot 5's 3-field set, see §5 Flag 6.**

**(b) Computation.** For each active agent, check each required field is present, non-empty, ≥10 characters, and not one of the placeholders `"TODO"`, `"TBD"`, `"N/A"`. Optional: HEAD-check `readme_url` if network access allowed; otherwise require immutable doc hash in charter.

**(c) Scoring formula.**

```text
doc_points[a] = present_required_fields[a] / total_required_fields
score = round(100 · avg over active agents)
```

**(d) Boundary conditions.**
- `active_agents === 0` → `null`, `reason: NO_DOCUMENTATION_SUBJECTS`.

---

## Section 4 — Verification test plan

**CONSENSUS (8 of 8 — strongest single panel convergence):** every evaluator ships with a paired green-fixture/red-fixture and a CI mutation test that catches any unconditional `return 100`. This is the structural defense against re-introducing the original false-green failure mode.

### 4.1 Minimum merge standard (per Slots 2, 5)

Every evaluator's PR must satisfy ALL of:
1. **Green fixture** that produces `score = 100`.
2. **Red fixture** that produces `score < 100`.
3. **Machine-readable findings**, not only a numeric score.
4. **Missing-evidence-is-failure semantics** — except the three explicitly-deferred evaluators on the approved deferral list.
5. **Mutation test:** CI replaces the evaluator body with `return 100`; the red fixture MUST catch the mutation.

### 4.2 Universal anti-false-green guard (Slot 1)

```js
// tests/audit-criterion-falsifiability.test.js
describe('criterion_must_be_falsifiable', () => {
  for (const criterionId of NON_DEFERRED_CRITERIA) {
    it(`${criterionId}: red fixture scores below green fixture`, async () => {
      const evaluator = await loadEvaluator(criterionId);
      const green = await evaluator(GREEN_FIXTURES[criterionId]);
      const red   = await evaluator(RED_FIXTURES[criterionId]);
      expect(red.score).toBeLessThan(green.score);
    });

    it(`${criterionId}: empty input returns null, not 100`, async () => {
      const evaluator = await loadEvaluator(criterionId);
      const empty = await evaluator({});
      expect(empty.score).toBeNull();
    });

    it(`${criterionId}: produces machine-readable findings`, async () => {
      const evaluator = await loadEvaluator(criterionId);
      const red = await evaluator(RED_FIXTURES[criterionId]);
      expect(red.findings).toBeInstanceOf(Array);
      expect(red.findings.length).toBeGreaterThan(0);
      expect(red.status).toBe('measured');
    });
  }
});
```

### 4.3 Per-evaluator red-fixture catalog (synthesis of all 8 reviewer scenarios)

| Evaluator | Red-fixture scenario | Catching assertion |
|---|---|---|
| `gov.audit_completeness` | One run missing terminal event + one MessageBus record with `run_id=null` + one broken audit hash link | `score < 50`; findings include `MISSING_TERMINAL_EVENT`, `UNLINKED_MESSAGE`, `AUDIT_CHAIN_INVALID` |
| `gov.authority` | Tier-1 agent emits `mutate.production` event (requires tier ≥ 2) | `score < 60` (tier-escalation cap); `unauthorized_events ≥ 1` |
| `gov.charter_contract` | Active charter missing `escalation_policy` AND registry `contract_hash` not matching ledger | `score < 100`; findings include `MISSING_REQUIRED_FIELD` + `CHARTER_HASH_MISMATCH` |
| `gov.message_schema` | Three invalid messages: missing `run_id`, undeclared topic, payload missing required field | `score < 100`; `invalid_messages.length === 3` |
| `gov.escalation` | Synthetic high-severity `AUTHORITY_DENIED` with no matching `governance.escalated` row within 15 min | `score < 100`; finding `ESCALATION_MISSING_OR_LATE` |
| `gov.secrets_hygiene` | MessageBus payload contains `"apikey": "sk-flowai-canary-do-not-use-1234567890"` | `score ≤ 50` for 1 hit; `score = 0` for 2; finding `SECRET_LEAK_DETECTED` |
| `rdy.functional` | 50 runs with exactly 10 `RUN_FAILED` rows | `score = 80 ± 0.1` (exact arithmetic; Slot 1) |
| `rdy.failure_handling` | 3 error records with zero matching `RECOVERY` rows | `score = 0` (zero recovery rate); any `> 0` proves the join is broken |
| `rdy.dependencies` | Charter `consumes: [topicX]` with no active producer + observed `dependency.call` to undeclared service | `score < 100`; findings `UNRESOLVED_TOPIC_DEPENDENCY` + `UNDECLARED_DEPENDENCY_CALL` |
| `rdy.documentation` | Active agent charter with `readme_url="TODO"`, missing `runbook_url`, no `known_limits` | `score < 100`; findings list each missing/placeholder doc field |

### 4.4 Aggregate gate test

**CONSENSUS (Slots 1, 2, 5 explicit; others implicit):** the aggregator MUST NOT impute `100` for `null`. Two-part aggregate (Slot 2 wording):

```text
measured_score        = weighted average over criteria with numeric scores only
measurement_coverage  = scored_weight / total_weight   (deferred criteria IN the denominator)
```

With 10 measured and 3 deferred at equal weight, `measurement_coverage = 10/13 = 76.9%`. Gate behavior — **see §5 Flag 3** (this synthesis surfaces the split as a CEO flag; W5b's earlier synthesis picked the softer Position B).

### 4.5 W4 smoke surfacing

**CONSENSUS:** W4 smoke surfaces deferred evaluators as **yellow** (Slot 1), with `falseGreenGuard: true` as the machine-readable signal that the aggregator must NEVER treat null as 100. UI/API copy template (Slot 3 + Slot 5):

```text
Governance score:     <X>/100   (computed over <N> evaluators; <K> deferred)
Readiness score:      <Y>/100   (computed over <N> evaluators; <K> deferred)
Measurement coverage: <C>%
Deferred:             <K>/13 (ids: gov.ip_protection, rdy.performance, rdy.observability)
W4 gate status:       <CLEAR | BLOCKED-DEFERRED | BLOCKED-LOW-SCORE>
```

---

## Section 5 — CEO flags requiring disposition

Before W3 begins implementation, these decisions are needed. Each flag records the dissent and the synthesis recommendation, but the CEO call is binding.

### Flag 1 — First-evaluator sequencing tiebreak

- **Position A** (Slots 1, 2, 7 — 3 votes): start with `gov.audit_completeness`. Rationale: every other evaluator presumes the audit substrate is trustworthy; verify the substrate first.
- **Position B** (Slots 4, 6, 10 — 3 votes): start with `gov.authority`. Rationale: registry-only lookup, zero runtime coupling, defines authority baseline.
- **Outliers:** Slot 3 → `rdy.documentation` (easiest static check); Slot 5 → `gov.message_schema` (zero new infra; hardest contract).
- **No ≥5 consensus.**
- **W5b prior draft (commit e66ddf7) picked Position B** as tiebreaker citing "cheapest registry-only check."
- **W3 synthesis recommendation:** **Position A.** The audit-log substrate is consumed by 4 of the 6 governance evaluators (`completeness, authority, charter_contract, escalation, secrets_hygiene`); if its integrity is wrong, every downstream evaluator gives false numbers. Substrate-first is the safer order under the COI rule (no W3 minimization of work).
- **CEO disposition required.**

### Flag 2 — `gov.escalation` classification

- **Consensus (7 of 8):** doable now. `flowai_audit_log` has trigger events and correlation is shippable.
- **Dissent (Slot 10):** defer pending "upstream evaluators functional."
- **Synthesis recommendation:** doable now. Slot 10's reasoning conflates *implementation* with *correctness*; the 7-of-8 majority is consistent with the existing audit-log shape.
- **CEO disposition required** (default = doable now if no override).

### Flag 3 — W4 gate behavior under deferral

- **Position A — BLOCK** (Slots 1 + 5 explicit — 2 votes): `W4_ENTRY_PERMITTED = (deferred_count === 0) AND (aggregate_score >= 95)`. Even a perfect 100/100 across the 10 measured evaluators does NOT clear W4 if 3 are deferred. Rationale: deferral is itself a coverage gap and risks re-introducing the original false-green pattern.
- **Position B — REPORT** (Slots 3, 4, 6, 7, 10 — 5 votes): aggregate excludes nulls from the average, reports deferred count + reasons transparently, but does NOT block. Rationale: blocking penalizes the implementer for dependencies they cannot ship.
- **5-of-8 majority is Position B**, which would normally meet the consensus rule.
- **W5b prior draft (commit e66ddf7) adopted Position B.**
- **W3 synthesis recommendation:** **Position A (BLOCK).** The COI rule says "If Panel consensus calls for harder implementation, that is what gets synthesized." Position A is the harder, more conservative call and the one less likely to silently re-introduce false-greens at the aggregate level. The 5-of-8 majority for Position B is dispositive under the consensus rule for any panel WITHOUT a COI concern; the COI rule on this dispatch overrides the simple majority. **This is a CEO call that supersedes both synthesis recommendations.**
- **CEO disposition required.**

### Flag 4 — `gov.authority` "no traffic" handling

- **Position A — null** (Slot 1): `total_governable_events === 0` ⇒ return `null` with `reason: NO_AUTHORITY_EVIDENCE`.
- **Position B — null + synthetic injection** (Slot 2): same as A; harness MUST inject ≥1 synthetic governable action per gate run.
- **Position C — penalty score** (Slot 5): if `total = 0` AND charter has no tier set, return `50`.
- **Position D — binary** (Slot 6): `score = tier === required ? 100 : 0` (no traffic check).
- **Synthesis recommendation:** Position B. Returning a number for "no evidence" is exactly the failure mode the panel was convened to fix. Harness injection ensures the evaluator always has data.
- **CEO disposition required.**

### Flag 5 — `gov.audit_completeness` chain verification requirement

- **Position A — mandatory** (Slots 1 + 2 explicit): `auditChain.verifyRange()` is non-negotiable. Any chain break floors the score (Slot 1) or weights at 20% (Slot 2).
- **Position B — coverage-only** (Slots 3, 4, 6, 7, 10): just count expected vs covered audit rows; ignore the hash chain.
- **Synthesis recommendation:** Position A. The W5b `auditChain.js` is shipped; not using it leaves evidence on the table — explicitly against the COI rule. Position B is the easier (and weaker) method.
- **CEO disposition required.**

### Flag 6 — `rdy.documentation` field-set size

- **Position A — 11 fields** (Slot 2): `owner, purpose, readme_url, runbook_url, inputs, outputs, configuration, examples, known_limits, changelog, support_contact`.
- **Position B — 3 fields + bonus** (Slot 5): `description, version, owner` required; `changelog` optional bonus.
- **Synthesis recommendation:** Position A. 11-field partial credit is the harder method most likely to surface real doc gaps. Position B is satisfied by a 3-field charter that produces score=100 — exactly the kind of thin-pass the panel warned about.
- **CEO disposition required.**

### Flag 7 — Minimum run window for `rdy.functional`

- **Slot 1:** `total_runs < 20 ⇒ null`.
- **Slot 5:** `total_runs < 3 ⇒ null`.
- **No other reviewer named a number.**
- **Synthesis recommendation:** 20 for production-grade evaluator; 3 for development/test mode (env-flag-gated). Too-small windows produce noisy scores; too-large means new agents have no data for the entire warmup period.
- **CEO disposition required.**

### Flag 8 — Authority tier vocabulary mapping

- **Slot 5 vocabulary:** `T1 | T2 | T3`.
- **Layer 3 canonical (BaseAgent.AUTHORITY):** `RECOMMEND_ONLY | DRAFT_ONLY | AUTO_CONTAIN_KNOWN | AUTO_WRITE_INTERNAL | REQUIRES_HUMAN_GATE`.
- **Slots 1, 2 reference both but don't pick.**
- **Synthesis recommendation:** Lock to Layer 3 canonical. Likely mapping if back-compat needed: `T1 = RECOMMEND_ONLY`, `T2 = AUTO_CONTAIN_KNOWN`, `T3 = AUTO_WRITE_INTERNAL`. Without a CEO-locked vocabulary, the authority tier check is meaningless because the registry charter today uses the Layer 3 vocabulary while the panel proposed against the T1/T2/T3 vocabulary. (This flag is the one W5b's prior draft identified that W3's earlier internal draft missed — credit to W5b.)
- **CEO disposition required.**

### Flag 9 — Approved deferral list mechanism

- **Position A — committed allowlist** (Slot 1): `w3/deferred-evaluators.json` lists exactly the 3 approved deferred ids + blockers; CI fails on any other evaluator returning `status=deferred`.
- **Position B — soft list** (default for other reviewers): evaluator emits whatever reason it wants; aggregator counts but doesn't gate.
- **Synthesis recommendation:** Position A. Otherwise a future contributor adding a 4th deferral silently lowers measurement coverage without explicit approval.
- **CEO disposition required.**

### Flag 10 — Panel non-response (process flag)

Slots 8 and 9 (headless: base44_chat, replit_agent) returned DEFERRED — Playwright codegen not yet done. This was an 8-of-10 panel, not the 10/10 the Locked Rule mandates. Recommend either (a) authorize Playwright codegen as follow-up before next W3 panel, or (b) formally accept 8/10 as the operating quorum for the W3 series.
- **CEO disposition required.**

---

## Appendix A — Cross-reviewer convergence matrix

| Question | Convergence | Notes |
|---|---|---|
| Q1 SEQUENCE | Partial (group-structure consensus; first-pick split 3/3) | All 8 group governance before readiness, defer 3 (or 4 per Slot 10). First-pick tie surfaces as Flag 1. |
| Q2 DOABLE NOW | Strong (7 of 8 agree on the 10-evaluator set) | Slot 10 dissents on `gov.escalation` — Flag 2. |
| Q3 MEASUREMENT METHOD | Convergent on patterns; divergent on hardness | All 8 propose ratio-based scores; Slots 1, 2, 5 propose harder methods (chain verification, AJV, multi-component composites). Synthesis adopts harder under COI rule. |
| Q4 VERIFICATION | Strong (all 8 require red-fixture + falsifiability) | Slots 1, 2, 5 explicit on mutation/contract test. Adopted. |
| Q5 DEFERRED | Unanimous on `score=null + reason`; converged on envelope shape | W4 gate strictness split — Flag 3. |

---

## Appendix B — Reviewer-by-reviewer first-pick map

| Slot | Provider/Model | First evaluator | Rationale |
|---|---|---|---|
| 1 | Opus 4.7 | `gov.audit_completeness` | "Every other evaluator presumes the audit log is trustworthy; verify it first." |
| 2 | GPT-5.5 | `gov.audit_completeness` | "Establishes whether the audit substrate is trustworthy before any other evaluator relies on it." |
| 3 | Gemini 2.5 Pro | `rdy.documentation` | "Easiest check; reads a single static field from the agent registry." |
| 4 | Perplexity Sonar Pro | `gov.authority` | "No deps, defines authority baseline for other gov evals." |
| 5 | Vercel v0 | `gov.message_schema` | "Zero new infrastructure; validates a hard contract that every other evaluator implicitly assumes is sound." |
| 6 | GPT-4.1 | `gov.authority` | "Foundational; uses agent registry charters, no dependencies." |
| 7 | GPT-4o-mini | `gov.audit_completeness` | "Critical for governance; can be implemented now." |
| 10 | GPT-4o | `gov.authority` | "Foundational governance check; relies on agent registry charters." |

3 of 8 → `gov.audit_completeness`. 3 of 8 → `gov.authority`. 1 each → `rdy.documentation`, `gov.message_schema`. No ≥5 consensus. Surfaces as Flag 1.

---

## Appendix C — Conflict-of-interest disclosure

W3 originally authored the 13 stub evaluators that this plan replaces. The Part 1 / Part 2 / Part 3 dispatches (2026-05-07, 2026-05-11) shipped `scoringEngine.js`, `rubricRunner.js`, the 13 criterion modules, the 4 audit modules, and migration 0010 — every one of those criterion modules currently returns the `score=100` stub the panel was convened to eliminate.

This synthesis was generated under the explicit brief-directed COI rule:

> Synthesis must structure Panel consensus faithfully — DO NOT minimize work, DO NOT select easier measurement methods than Panel proposed, DO NOT override Panel sequencing. If Panel consensus calls for harder implementation, that is what gets synthesized.

Specific applications of that rule in this draft:

- **§3 measurement methods**: where Slots 1 / 2 / 5 proposed harder formulas (auditChain.verifyRange integration in §3.1; multi-component composite in §3.9; charter+ledger hash match in §3.3), this synthesis adopted the harder method even though a simpler row-count formula would have been easier for W3 to implement.
- **§4 verification**: the universal mutation/contract test (`criterion_must_be_falsifiable`) is adopted from Slots 1 + 2 even though it requires W3 to author red fixtures for all 10 doable-now criteria.
- **§5 Flag 1**: W3 synthesis declines to tiebreak the 3/3 first-pick split, instead surfacing it for CEO disposition. W5b's prior draft (commit e66ddf7) picked the softer Position B (`gov.authority` first, "cheapest registry-only check"). W3 recommends Position A (`gov.audit_completeness` first, substrate-trustworthiness) but defers to CEO.
- **§5 Flag 3**: W3 synthesis recommends BLOCK over REPORT despite the 5-of-3 majority favouring REPORT. The COI rule overrides the simple-majority consensus rule on this single flag — the harder option is recommended. W5b's prior draft adopted REPORT. CEO call is binding.
- **§5 Flag 4**: Position B (null + synthetic injection) over Position D (binary 100/0) — recommended despite Position D letting three of W3's existing stubs pass without work.
- **§5 Flag 5**: Position A (mandatory hash-chain verification) over Position B (count-only) — recommended despite Position B being trivially implementable.
- **§5 Flag 6**: Position A (11-field partial credit) over Position B (3 fields binary URL check) — recommended despite Position B being one line of code.

If the CEO disposes any of Flags 1–10 contrary to these recommendations, this DRAFT is correct in surfacing the divergence — it should not be promoted to canonical with W3-preferred alternatives substituted in silently.

W5b's prior draft (commit e66ddf7) is a legitimate panel synthesis from a non-COI vantage point. CEO may treat the two drafts as a "strict synthesis" (this W3 version) versus a "consensus-only synthesis" (W5b's earlier version) and choose between them, OR may take Flags 1–10 as the substantive working set and disregard both synthesis recommendations.

---

## Appendix D — Suggested build phasing (informational; depends on Flag dispositions)

If the CEO disposes the flags above with W3-recommended positions, the implementer phase order is approximately:

| Phase | Evaluator(s) | Effort | Dependencies |
|---|---|---|---|
| W3-A | `gov.audit_completeness` | 2 days | auditChain.js (shipped); Flag 1, 5 resolved |
| W3-B | `gov.authority` | 1 day | Flag 4, 8 resolved |
| W3-C | `gov.charter_contract` | 1 day | Registry charter shape locked |
| W3-D | `gov.message_schema` | 1 day | Topic schemas in charter |
| W3-E | `gov.escalation` | 1 day | Flag 2 resolved; SLA windows (Flag-adjacent) |
| W3-F | `gov.secrets_hygiene` | 1 day | Regex pattern set locked |
| W3-G | `rdy.functional` | 1 day | Flag 7 resolved (min run window) |
| W3-H | `rdy.failure_handling` | 1 day | errors.js taxonomy (shipped) |
| W3-I | `rdy.dependencies` | 1 day | Charter `dependencies[]` shape locked |
| W3-J | `rdy.documentation` | 1 day | Flag 6 resolved (field set) |
| W3-K | Deferred-envelope wiring + `w3/deferred-evaluators.json` allowlist | 0.5 day | Flag 9 resolved |
| W3-L | Aggregate gate + W4 entry harness | 1 day | Flag 3 resolved |
| W3-M | CI mutation test + `criterion_must_be_falsifiable.test.js` | 0.5 day | All above |

**Total:** ≈13 days of engineer-time, assuming all 10 CEO flags are dispositioned. Phases are parallelizable across multiple Wx dispatches; the gating dependency is CEO flag resolution rather than technical sequencing. Phasing borrowed from W5b's earlier draft (e66ddf7 Section 6) with adjustments.

---

## Status

This is a **DRAFT**. It is NOT canonical and MUST NOT be referenced as the W3 build instruction until:
1. The 10 CEO flags in §5 are dispositioned.
2. The disposed-flag answers are baked back into §§1–4.
3. The W3-vs-W5b synthesis choice is recorded (CEO selects one synthesis as canonical, or composites the two).
4. The resulting v2 is promoted to `docs/W3_STUB_REPLACEMENT_PLAN.md` (canonical name, no `_DRAFT_v1` suffix).

Until then: this document is W3's COI-aware panel synthesis. Dispositions are not yet recorded.

*End of W3 Stub Replacement Plan — DRAFT v1.*
