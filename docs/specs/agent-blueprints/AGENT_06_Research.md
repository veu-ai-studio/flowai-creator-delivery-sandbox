# Agent #6 — Research — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A6-REVISE` plurality 5/9 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 6 + §9 step 1 research + CA-11-B.2 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED).

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #06 (lack of clear metrics for research brief quality):** RESOLVED via §13.5 "research-brief quality metrics" block. Five concrete graded metrics — Five-Layer-coverage completeness, evidence-citation density, competitive-set cardinality, market-context grounding score, structured-extraction validity — each with numeric pass/fail thresholds.
- **Obj #09 (ambiguous authority elevation — autonomous operational-authority for ToolMenu adapter invocation):** RESOLVED via §13.6 "ToolMenu adapter authority bounding" block. Operational-authority for adapter invocation is bounded by (a) ToolMenu allow-list (CA-11-B.2), (b) operator's `authorityCeilings[mode_X][operational]` per CA-12 v3, (c) per-adapter rate limits enforced by Orchestra. No autonomous-without-bound elevation paths exist.
- **Obj #18 (data quality gate thresholds — `bodyContentCharsMin` clamping):** RESOLVED via §13.2 "Cluster B threshold semantics" sub-block within the Cluster B Data Quality Gate paste block. Clamp range `[200, 50_000]` documented; values outside the range are rejected at `ProductRegistry.minimumDataQuality` write-time (not silently clamped at gate-evaluation time).
- **Obj #20 (prompt injection in crawl):** RESOLVED via §13.7 "adversarial-crawl mitigation hardening" block. System-quoted blocks AS PRIMARY mitigation are insufficient — v2 adds (a) Anthropic prompt-shield API (when available) layered above system-quoting, (b) adversarial-test suite with ≥20 known prompt-injection patterns gate the ship, (c) `6.research.adversarial_pattern_detected.v1` emit on suspected injection for SOC review.
- **Obj #22 (mode logic conflicts — mode-agnostic claim vs mode-specific Cluster C behavior):** RESOLVED via §13.4 "mode-conditional behavior clarification" within the Cluster C paste block. Agent #6 OUTPUT is mode-agnostic (same finding shape across modes); Agent #6 BEHAVIOR is mode-conditional only in Cluster B halt thresholds (per mode-specific data-quality floors). The two are not in conflict; v2 documents the boundary explicitly.
- **Obj #24 (data-quality gate deadlock — Agent #6 + Agent #8 Cluster B halts):** RESOLVED via §13.2 escape valve. Cluster B halt envelopes from step-1 Research carry a `recoveryHint` field documenting the minimum partial-content threshold that would re-enable the pipeline. Operator can override via `ProductRegistry.allowPartialContentInResearch = true` (admin-gated) to accept lower-quality input rather than full pipeline halt.
- **Obj #26 (insufficient input validation — §3.3 lacks SSRF validation):** RESOLVED via §13.8 "input validation + SSRF defense" block. `targetUrl` validation now requires (a) HTTPS scheme, (b) DNS resolution to non-private IP ranges (RFC1918 / link-local / loopback excluded), (c) no `targetUrl` carrying credentials in userinfo position, (d) explicit allow-list when product-registry binds the crawl target.
- **Obj #27 (lack of detailed error handling — §4.3 postconditions):** RESOLVED via §13.9 "error handling contract" block. Every `6.research.*` emit declares its failure modes: schema validation failure → `PAYLOAD_SCHEMA_FAILURE`; budget cap reached → `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }`; LLM dispatch exhaust → `6.research.block.v1 { reason: 'llm-dispatch-exhausted' }`.
- **Obj #28 (unclear budget enforcement — Cluster A emits but doesn't self-enforce):** RESOLVED via §13 Cluster A P1 paste block — Agent #6 calls `costGovernor.reserve()` BEFORE every LLM dispatch; `costGovernor.settle()` after. Budget-cap-reached halts via the canonical Cluster A v3 §2.5 advisory-lock + lease-token mechanism. Self-enforcement is structural via the reserve/settle wrapper.
- **Cluster A Path P1 paste block (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `6` |
| Name | `Research` |
| Mode | `step-owner` |
| Step | **1 — `research`** (collab with Agent #1 Lifecycle) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — Research is read-only by design; never elevates |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** receives `1.crawl.request.v1` from AutoRunner step 1 entry; receives raw crawl output from Orchestra dispatch.
- **Decide:** classifies the crawl artifact along five Layers per Rev-2.1 §6 framework (Functionality / Operational / Financial / Business / GTM); produces structured research findings keyed by Layer.
- **Execute:** writes findings to ColdStore lineage (audit only); emits `6.research.findings.v1` on MessageBus; block-semantic on content-insufficient already wired per commit `0fc8851` (returns `block` outcome so AutoRunner halts downstream steps when crawl returned null body).
- **Emit:** `6.research.findings.v1` consumed by Agent #2 Code Builder + Agent #7 Design + Agent #8 Quality Audit downstream.

## 3. MessageBus topics

**Consumes:**
- `1.crawl.request.v1` — entry signal from AutoRunner step 1
- `21.crawl.completed.v1` — when Aggressive Crawl Engine has run (per ENTRY 006), Research consumes its enriched output rather than crawling again

**Produces:**
- `6.research.findings.v1` — payload: `{ runId, productId, layers: { L1, L2, L3, L4, L5 }, marketContext, competitiveSet, confidence, at }`
- `6.research.block.v1` — payload: `{ runId, productId, reason: 'content-insufficient'|'crawl-failed'|'auth-required', at }` (per existing `0fc8851` block-semantic)

## 4. Orchestra dispatch usage (per §15.4)

```js
// Crawl (skip if 21.crawl.completed.v1 already in-stream)
orchestra.dispatch('crawl', { url, force }, opts);

// Analyse the crawl
orchestra.dispatch('analyze', { artifact, criteria: 'five-layer-framework' }, opts);

// Summarise findings into structured envelope
orchestra.dispatch('summarize', { text, maxTokens: 2000 }, opts);
```

## 5. ToolMenu (per CA-11-B.2)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Browserless | `browserless` | low | `crawl` |
| 2 | Playwright | `playwright` | low | `crawl`, `interact` |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize`, `extract-structured` |
| 4 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent6Research.js                 # ~520 LOC mirroring Agent3SelfRenewal.js
src/lib/agents/agents/__tests__/Agent6Research.test.js  # ~350 LOC test suite
```

**Class skeleton (mirrors Agent #3):**

```js
import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';
import { dispatchWithFallback } from '../dispatchWithFallback.js';  // per CA-11-A.4

const HOT_TTL_SECONDS = 24 * 60 * 60;
const HOT_KEYS = Object.freeze({ run: (runId) => `research:run:${runId}` });

export class Agent6Research extends BaseAgent {
  static charterId = 6;
  static charter() {
    const r = getAgent(6);
    return Object.freeze({
      id: r.id, name: r.name,
      flowAiOnly: false, authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  constructor(deps) {
    super(deps);
    if (!deps.hot || !deps.cold || !deps.messageBus) throw new Error('Agent6Research: hot/cold/bus required');
    this.hot = deps.hot; this.cold = deps.cold; this.bus = deps.messageBus;
  }
  async plan(ctx) { /* classify crawl artifact along 5 layers; emit block on content-insufficient */ }
  async act(ctx, plan)  { /* persist + emit 6.research.findings.v1 OR 6.research.block.v1 */ }
  async recommend(ctx) { /* PA #2.7-analogous step-owner entrypoint */ }
}

export function analyzeFindings(crawlArtifact) { /* pure helper, exported for unit tests */ }
```

## 7. OrchestratorHub wire-in pattern (per PA #2.7)

```js
// src/pages/AutoRunner.jsx — extend getOrchestratorBundle():
import { Agent6Research } from '@/lib/agents/agents/Agent6Research';
const agent6 = new Agent6Research({ logger, messageBus, auditLog, clock, productScope, environment, hot, cold });
hub.registerStepOwner('research', (ctx) => agent6.recommend(ctx));
```

## 8. Test plan (matching Agent #3 rigor)

| ID | Category | Test |
|---|---|---|
| A6-N1 | Nominal | plan() over a complete crawl artifact returns findings with all 5 layers populated |
| A6-N2 | Nominal | plan() consumes `21.crawl.completed.v1` envelope; skips re-crawl |
| A6-M1 | Malformed | input missing runId throws explicit error caught in BaseAgent.run() |
| A6-M2 | Malformed | crawl artifact `null` triggers `6.research.block.v1` emission with reason `content-insufficient` |
| A6-E1 | Edge | crawl artifact with 100 KB body summarises within token budget |
| A6-E2 | Edge | partial-content crawl (3 of 8 pages) still produces best-effort findings + flags incomplete |
| A6-X1 | Adversarial | prompt-injection in crawl body does NOT take over Claude analyze prompt |
| A6-X2 | Adversarial | hostile getter on ctx fields caught in recommend() extraction try/catch |
| A6-X3 | Adversarial | Orchestra dispatch returns 429 → fallback to next ToolMenu entry per CA-11-A.4 |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- ≥30 vitest invocations land + 0 failing
- `validateRosterPartition()` passes at module load
- AutoRunner step 1 invokes Agent #6 instead of (or alongside) Agent #1 Lifecycle's research role
- 5 neutral-fixture full runs end-to-end produce non-null `6.research.findings.v1` payloads
- W4 adversarial test plan §3 covers Agent #6 with ≥7 test cases passing (mirrors Agent #3's §3.3 9-test set)
- 7 consecutive clean Auto Runner runs on dev SUT without `act.error` on phase 'research'

## 10. Dependencies + sequencing notes

- **Hard depends on:** ToolMenu schema CA-11-C (post-promotion `toolMenu` field on AgentRecord); dispatchWithFallback module CA-11-A.4
- **Soft depends on:** Agent #21 ACE Conductor wired (per ENTRY 006) — when ACE produces `21.crawl.completed.v1`, Research consumes it; otherwise Research dispatches `crawl` itself
- **Blocks downstream:** Agent #8 Quality Audit (consumes findings); Agent #2 Code Builder (consumes findings as build context)

## 11. Estimated build effort

**~8 W-hours** (Agent #6 has the cleanest charter of the dormant set — read-only analyzer; no Executor needed; block semantic already shipped).

## 12. Open clarification flags

None. Charter is unambiguous in Rev-2.1 + commit `0fc8851`.

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d) + per-condition Panel resolutions

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 (Agent #23 is the canonical owner; Agent #6 consumes the contract).

- **A-a (boundary-class membership):** Agent #6 is `step-owner` cost-class; cost aggregated at run grain. All LLM dispatches via §5 ToolMenu MUST call `costGovernor.reserve(estimatedUsd)` BEFORE dispatch + `costGovernor.settle(actualUsd)` after + emit `agent.cost.signal.v1`.
- **A-b (advisory-lock + lease-token):** uses PostgreSQL advisory-lock + 60s lease TTL per Cluster A v3 §2.5; retry on `LEASE_EXPIRED`.
- **A-c (SERIALIZABLE isolation):** mutations through canonical Cluster A library only.
- **A-d (halt envelope):** budget-cap-reached emits `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }`; pipeline step-1 halts (no downstream emit). Resolves Obj #28 (unclear budget enforcement).

### §13.2 — Cluster B Data Quality Gate threshold semantics (Obj #18 + #24 resolution)

Per `CLUSTER_B_DATA_QUALITY_GATE.md` integration:
- **`bodyContentCharsMin`** clamped to `[200, 50_000]`. Values outside this range are REJECTED at `ProductRegistry.minimumDataQuality` write-time with `INVALID_DATA_QUALITY_FLOOR { field, value, allowedRange }`. NOT silently clamped at gate-evaluation time (Obj #18 — the silent-clamp behavior is removed).
- **Deadlock escape (Obj #24):** Cluster B halt envelopes from Agent #6 carry a `recoveryHint: { minimumContentChars: <N>, partialContentAcceptable: <boolean> }` field. Operator may set `ProductRegistry.allowPartialContentInResearch = true` (admin-gated) to accept partial content rather than full pipeline halt. Default `false` (strict).

### §13.3 — Cluster F (REVERTED v2 + F-a opt-in alert per ENTRY 009)

Per ENTRY 009 Cluster F REGRESSED verdict — v2 template + F-a operator opt-in alert ONLY. Agent #6 uses canonical model selection per Cluster F v2 §2.1 (tier-keyed Doppler); the v3 async-downgrade is rolled back per ENTRY 009. F-a opt-in alert: when LLM fallback fires for Agent #6, operator may opt-in to `agent.model.fallback.v1` notifications via `ProductRegistry.alertOnModelFallback = true`.

### §13.4 — Cluster C integration (PROMOTED) + mode boundary clarification (Obj #22)

Per `CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md` + ENTRY 009 Cluster C PROMOTED. Topic schema-validator applies to `6.research.findings.v1` + `6.research.block.v1`.

**Mode-conditional clarification (Obj #22 resolution):**
- **Agent #6 OUTPUT shape is mode-agnostic.** `6.research.findings.v1` payload is identical across modes 1/2/3A — the same Five-Layer findings shape.
- **Agent #6 BEHAVIOR is mode-conditional ONLY in Cluster B halt thresholds** (per `ProductRegistry.minimumDataQuality.byMode` if set, falling back to `ProductRegistry.minimumDataQuality` global, falling back to Cluster B canonical defaults).
- The two are not contradictory: mode-conditional THRESHOLDS, mode-agnostic OUTPUT. The boundary is explicit in v2.

### §13.5 — Research-brief quality metrics (Obj #06 resolution)

Five concrete graded metrics evaluate `6.research.findings.v1` quality. Each has a numeric pass/fail threshold; emit includes a `qualityScorecard` field:

| Metric | Definition | Pass threshold |
|---|---|---|
| **Five-Layer coverage** | All 5 Layers (L1-L5) have ≥1 finding with non-null evidence | 5/5 |
| **Evidence citation density** | Findings carry inline evidence (URL anchor / DOM excerpt / quoted text) | ≥ 0.7 (70% of findings cite evidence) |
| **Competitive-set cardinality** | Distinct competitor / comparable product references | ≥ 2 |
| **Market-context grounding score** | LLM grading rubric on market-context section (separate Anthropic prompt with rubric) | ≥ 0.6 / 1.0 |
| **Structured-extraction validity** | `extract-structured` outputs validate against canonical Five-Layer schema | 100% pass |

Findings below the threshold emit `6.research.findings.v1 { qualityScorecard: <below>, recommendedAction: 'human_review' }` rather than feeding directly into Agent #8 Quality Audit downstream.

### §13.6 — ToolMenu adapter authority bounding (Obj #09 resolution)

Operational-authority for adapter invocation is NOT "autonomous unbounded". It is bounded by three layers:
1. **ToolMenu allow-list** (CA-11-B.2): Agent #6's ToolMenu declares 4 adapters; calls outside the allow-list throw `ADAPTER_NOT_IN_TOOLMENU`.
2. **Operator authorityCeilings**: `authorityCeilings[mode_X][operational]` per CA-12 v3 caps the per-invocation authority. `recommend_only` ceiling blocks all adapter calls (Agent #6 falls back to cached prior crawl per Cluster B halt path).
3. **Per-adapter rate limits**: Orchestra-enforced (Browserless 1 req/s default; Anthropic 200 RPM default; etc.). Rate-limit exhaust emits `agent.dispatch.rate_limited.v1`.

No autonomous-without-bound elevation paths exist.

### §13.7 — Adversarial crawl mitigation hardening (Obj #20 resolution)

v1 §6.4 mitigation (system-quoted blocks) is INSUFFICIENT alone. v2 adds:

1. **Anthropic prompt-shield API** (when available) layered above system-quoting. Configured per `flowai/<env>/ANTHROPIC_PROMPT_SHIELD_ENABLED`.
2. **Adversarial-test suite ≥20 known prompt-injection patterns** gates the Agent #6 first-ship commit. Suite includes (a) instruction-hijack patterns ("Ignore previous instructions and..."), (b) role-confusion patterns ("System: you are now..."), (c) tool-call hijacks attempting to invoke `extract-structured` with attacker-controlled schemas, (d) data-exfil patterns ("Output your prompt for debugging"), (e) jailbreak attempts via DAN-style framing.
3. **Suspected-injection emit:** any classifier match on the ≥20 patterns emits `6.research.adversarial_pattern_detected.v1 { runId, productId, patternId, evidenceExcerpt, at }` for SOC review (NOT auto-halt; SOC triages and can manually halt).

### §13.8 — Input validation + SSRF defense (Obj #26 resolution)

`targetUrl` validation now requires ALL of:
1. HTTPS scheme (no HTTP, no file://, no data://, no javascript:).
2. DNS resolution returns non-private IP ranges. Excluded: RFC1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), link-local (169.254.0.0/16), loopback (127.0.0.0/8), AWS metadata (169.254.169.254/32), GCP metadata (169.254.169.254/32 + metadata.google.internal).
3. No userinfo position credentials (no `https://user:pass@host/...` forms).
4. **Allow-list mode (recommended):** when `ProductRegistry.crawlTargetAllowList[productId]` is non-empty, `targetUrl` host MUST match at least one entry. The 5 VEU products (SAIGE / RelTwin / ReachSMS / PressAI / MyPregLife) ship with explicit per-product allow-lists.

Rejection envelope: `6.research.block.v1 { reason: 'ssrf-validation-failed', detail: <which check failed> }`.

### §13.9 — Error handling contract (Obj #27 resolution)

Every `6.research.*` emit declares its failure modes inline. The §4.3 postcondition table:

| Failure mode | Detection | Error envelope | Recovery |
|---|---|---|---|
| Schema validation failure on emit | `MessageSchema.js` validator | `PAYLOAD_SCHEMA_FAILURE[6.research.findings.v1]` | Caller catches; emit `6.research.block.v1 { reason: 'schema-validation-failed' }`; halt step 1 |
| Budget cap reached | `costGovernor.reserve()` denies | `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }` | Halt step 1; operator review |
| LLM dispatch exhaust (all ToolMenu fallbacks failed) | `dispatchWithFallback` returns null | `6.research.block.v1 { reason: 'llm-dispatch-exhausted' }` | Halt step 1; operator review |
| Crawl returns empty body | Orchestra `crawl` adapter | `6.research.block.v1 { reason: 'content-insufficient' }` | Halt step 1; OR operator opts in to `allowPartialContentInResearch` per §13.2 |
| Adversarial pattern detected | §13.7 classifier | `6.research.adversarial_pattern_detected.v1` (audit, NOT halt by default) | SOC triage |
| SSRF validation failed | §13.8 validator | `6.research.block.v1 { reason: 'ssrf-validation-failed' }` | Reject input; operator review URL |

## 14. Cluster C integration — see §13.4 above

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009. Agent #6 emits 3 net-new topics (`6.research.findings.v1`, `6.research.block.v1`, `6.research.adversarial_pattern_detected.v1`) — within 5-topic-per-ship ceiling. Single first-ship commit. D-a/D-b/D-c standard application:
- **D-a:** all topics conform to v3 §2.2 naming + migration harness coverage.
- **D-b:** `findings` + `block` are `retention-class: governance` (7-year); `adversarial_pattern_detected` is `retention-class: security` (7-year + hash-chain mirror).
- **D-c:** idempotency key `runId + step + at-truncated-to-second` prevents replay double-emit.

Load-test artifact gate per Cluster D AC-CD-11 shared with Wave 1 cohort.

## 16. Cluster E integration — v3 + Option (a) LOCKED (canonical sibling pattern compliance)

Agent #6 primary `[RECOMMEND_ONLY]`; no sibling Executor (Research is read-only by design per §1 v1; v2 preserves this). No charter change required — Agent #6 was already on the canonical recommend-only path; no roster mutation, no sibling registration. Authoritative ceiling enforcement via `BaseAgent.guard()` per Cluster E v3 §2.5 applies on every dispatch.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **06** | Lack of clear metrics for research brief quality | §13.5 — 5 graded metrics + qualityScorecard field |
| **09** | Ambiguous authority elevation (autonomous adapter invocation) | §13.6 — 3-layer authority bounding |
| **18** | Cluster B threshold clamping (`bodyContentCharsMin`) | §13.2 — registry-write-time rejection (not silent clamp) |
| **20** | Prompt injection in crawl (system-quoting insufficient) | §13.7 — prompt-shield + ≥20-pattern test suite + emit on detection |
| **22** | Mode logic conflicts (mode-agnostic vs mode-specific) | §13.4 — output mode-agnostic, behavior mode-conditional only in Cluster B thresholds |
| **24** | Data-quality gate deadlock | §13.2 — `recoveryHint` field + operator opt-in `allowPartialContentInResearch` |
| **26** | Insufficient input validation (SSRF) | §13.8 — HTTPS + private-IP exclusion + userinfo + allow-list |
| **27** | Lack of detailed error handling | §13.9 — postcondition failure-mode table with recovery paths |
| **28** | Unclear budget enforcement | §13 (Cluster A P1) — `costGovernor.reserve()`/`settle()` wrapper structural |

---

*End of Agent #6 Research build blueprint v2. Panel `PLURALITY_A6-REVISE` 5/9 objections (9 distinct A6-touching objections in the W6 doc) resolved per §17 above. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification.*
