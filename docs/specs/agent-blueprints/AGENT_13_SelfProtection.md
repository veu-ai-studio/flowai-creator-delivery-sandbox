# Agent #13 — Self-Protection (anti-crawl / IP) — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A13-REVISE` plurality 5/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 13 + §20 Remediation+IP Protection + §20.1 (reconciliation with embedded layer) + §25 Locked Rule 14 (continuous crawl + fix at any time) + CA-11-B.8 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED).

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #33 / #55 / #64 (watermark spec dependency blocks Phase 2):** RESOLVED via §13.25 "watermark spec resolution" block. Phase 2 watermark capability is HARD-GATED on a separate `WATERMARK_GENERATION_SPEC.md` ratification (NEW dispatch outside Wave 1 cohort). v2 explicitly de-couples Phase 1 from Phase 2 — Phase 1 ships with NO watermark dependency (advisory threat detection only; no rotation cycle). Phase 2 BLOCKED until watermark spec drafts + ratifies. The 24 W-hour Phase 2 estimate becomes "≥24 W-hours conditional on watermark spec landing." Phase 1 ships unblocked.
- **Obj #34 / #50 / #52 (legal liability — DMCA auto-generation without counsel review):** RESOLVED via §13.26 "legal counsel gate" block. DMCA letter generation (Phase 2) is HARD-GATED on per-filing legal counsel review — no auto-file path exists. The DMCA workflow is: (a) Agent #13 generates draft; (b) `13.dmca_draft.v1` emits to legal-review queue; (c) human counsel reviews + approves; (d) operator with admin role triggers filing per §10.2 + Locked Rule 13. Default policy: ALL DMCA actions are `requires_human_gate` regardless of severity. NO "auto-file on critical" path. Adversarial test A13-X5 enforces.
- **Obj #51 (Data Quality Gate Exception):** RESOLVED via §13.2 "Cluster B exception documentation" block. Agent #13's empty-edge-log batch is NOT a halt condition (continuous-monitoring agents normally have empty batches when no threats present). This is an explicit canonical EXCEPTION to the standard Cluster B halt-on-empty pattern — documented inline + the exception is annotated on every `13.cycle.empty.v1` envelope so downstream consumers know to treat differently from Cluster B halts.
- **Obj #61 (insufficient security controls — LLM-generated content risk):** RESOLVED via §13.10 "security controls extension" block. LLM-generated DMCA letters carry per-request audit trail (model version, prompt hash, output hash, generation timestamp); admin UI surfaces the audit chain on every draft. Cross-tenant tampering protection: `tenantId` on every envelope; RLS enforced. Prompt-injection in cloned-content body does NOT alter Cloudflare policy logic (adversarial test A13-X2 already covered this — now explicitly part of security controls extension).
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED + Phase 2 sibling Executor):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification AND watermark spec ratification (Phase 2).

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `13` |
| Name | `Self-Protection (anti-crawl / IP)` |
| Mode | `always-on` |
| Step | n/a (always-on — runs continuously per Locked Rule 14) |
| Embedding | `embedded` (ships with every product per §20 + §22 metadata-driven) |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Phase 2 sibling Executor | `self-protection-executor` — registered in `EXECUTOR_REGISTRY` per CA-7 §15.5 + Cluster E v3 §2.6 Option (a). Authority `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. Performs Cloudflare policy updates (admin-gated) + DMCA filings (counsel-gated per §13.26) + watermark rotation (BLOCKED on watermark spec per §13.25). Primary stays `[RECOMMEND_ONLY]` throughout. §20.1 confirms portfolio-wide orchestration distinct from embedded code-level defences. |

## 2. Perceive → Decide → Execute → Emit cycle (Phase 1)

- **Perceive:** monitors edge logs + bot-detection signals from Sprint PROTECT-1 Phase 1 (DevTools detection events, rapid-click patterns, headless fingerprints); ingests external clone-detection signals (Google Search results for FlowAI's proprietary phrases, ad-tech retargeting feeds); consumes `21.crawl.completed.v1` for self-checks against own surface to detect leaks.
- **Decide:** classifies threats — clone discovered (DMCA draft workflow per Phase 2), suspicious crawler pattern (Cloudflare rule update via Phase 2), scraper bypassing existing defences (bot-management policy escalation via Phase 2). Per Locked Rule 14 ("continuous crawl + fix at any time; no maintenance windows") Agent #13 operates 24/7.
- **Execute (Phase 1 recommend_only):** emits threat envelopes; admin/operator triages via `/self-protection` UI surface.
- **Execute (Phase 2 via sibling Executor):** sibling emits `13.dmca_draft.v1` (NOT auto-file per §13.26); sibling performs Cloudflare policy updates with admin gate; watermark rotation BLOCKED on §13.25.
- **Emit:** see §3.

## 3. MessageBus topics

**Consumes:**
- Edge-log stream (via custom edge functions per §20)
- `21.crawl.completed.v1` (per ENTRY 006 — self-check against own surface)
- `26.orchestra.candidate.v1` (carve-out evaluation per §8.1)

**Produces (Phase 1 — 4 net-new topics within ceiling):**
- `13.threat_detected.v1` — payload: `{ threatId, tenantId, category: 'clone-discovered'|'suspicious-crawler'|'scraper-bypass'|'watermark-invalid', severity, evidence, pipelineMode, at }`
- `13.cycle.empty.v1` — emitted when an always-on cycle yields no threats (per §13.2 Cluster B exception)
- `13.dmca_draft.v1` (Phase 2 — sibling emit) — payload: `{ threatId, tenantId, dmcaLetterText, targetService, modelVersion, promptHash, outputHash, draftedAt, status: 'awaiting_counsel_review' }` (NEVER auto-files per §13.26)
- `13.bot_policy_update.v1` (Phase 2 — sibling emit) — payload: `{ ruleSetId, rulesAdded[], rulesRemoved[], adminApprovedBy, at }`
- (Phase 2 follow-on, BLOCKED on §13.25) `13.watermark_rotation.v1`

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('interact', { url: ourPublicUrl, surfaceProbe: 'leak-check' }, opts);
orchestra.dispatch('analyze', { artifact: edgeLog, criteria: 'threat-classification' }, opts);
// Phase 2:
orchestra.dispatch('generate-from-scratch', { spec: dmcaLetterSpec, framework: 'text' }, opts);
orchestra.dispatch('cloudflare-bot-policy-update', { ruleSet }, opts);
```

## 5. ToolMenu (per CA-11-B.8)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Cloudflare Bot Management | `cloudflare-bot` (NEW adapter; deferred today) | medium | `bot-detection`, `edge-defense` |
| 2 | Browserless | `browserless` | low | `crawl` (probe own surface for clones / leaks) |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze` (clone-detection classifier; DMCA letter draft generation) |
| 4 | Custom edge functions | `vercel` (extended — Vercel Edge Functions runtime) | free | `edge-defense` |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent13SelfProtection.js                   # ~580 LOC
src/lib/agents/agents/__tests__/Agent13SelfProtection.test.js    # ~380 LOC
src/lib/agents/agents/selfProtection/                            # helper modules
  threatClassifier.js                                            # deterministic edge-log pattern matching
  emptyBatchExceptionHandler.js                                  # §13.2 Cluster B exception
```

Phase 2 sibling Executor (HARD-GATED on watermark spec for full functionality):
```
src/lib/agents/executors/SelfProtectionExecutor.js               # ~480 LOC (DMCA draft + Cloudflare policy; watermark rotation blocked on §13.25)
src/lib/orchestra/cloudflare-bot.js                              # NEW adapter
api/self-protection/dmca-draft-review-queue.js                   # NEW endpoint (counsel review queue)
api/self-protection/policy-update.js                             # NEW endpoint (admin-gated)
```

**Primary class skeleton (`[RECOMMEND_ONLY]`):**

```js
export class Agent13SelfProtection extends BaseAgent {
  static charterId = 13;
  static charter() {
    const r = getAgent(13);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* always-on perception + classification */ }
  async act(ctx, plan) { /* emit threat + empty-cycle envelopes; Phase 2 routes through sibling */ }
  async recommend(ctx) { /* always-on cadence entry */ }
}
```

**Sibling Executor skeleton (Phase 2, `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`):**

```js
export class SelfProtectionExecutor extends BaseExecutor {
  static executorKey = 'self-protection-executor';
  static charterAgentId = 13;
  static charter() {
    return Object.freeze({
      key: 'self-protection-executor',
      agentId: 13,
      authority: [AUTHORITY.AUTO_WRITE_INTERNAL, AUTHORITY.REQUIRES_HUMAN_GATE],
      consumes: ['13.threat_detected.v1'],
      produces: ['13.dmca_draft.v1', '13.bot_policy_update.v1'],
    });
  }
  async execute(ctx, threat) {
    // DMCA path: ALWAYS requires_human_gate per §13.26 (counsel review)
    // Cloudflare policy path: requires admin role per §10.2
    // Watermark rotation: BLOCKED until §13.25 watermark spec ratifies
  }
}
```

## 7. OrchestratorHub wire-in pattern

`always-on` agents register via `hub.registerAlwaysOn('self-protection', agent)`. Continuous-loop invocation per Locked Rule 14 — Inngest scheduled job every 5 minutes + edge-log-stream event-trigger.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A13-N1 | Nominal | Edge-log with no threats → emits `13.cycle.empty.v1` per §13.2 exception (NOT Cluster B halt) |
| A13-N2 | Nominal | Edge-log with headless-fingerprint match → `13.threat_detected.v1` severity `medium` |
| A13-N3 | Nominal | Clone discovery via crawl probe → `13.threat_detected.v1` category `clone-discovered` severity `high` |
| A13-N4 | Nominal | Phase 2 sibling drafts DMCA on clone-discovered → emits `13.dmca_draft.v1 { status: 'awaiting_counsel_review' }`; NEVER auto-files |
| A13-M1 | Malformed | Edge-log entry malformed → skip + log; no agent crash |
| A13-M2 | Malformed | Anthropic API unreachable → fallback to OpenRouter per CA-11-A.4 |
| A13-E1 | Edge | Watermark validation: rendered surface returns expected watermark → no-op (Phase 2-only; gated on §13.25) |
| A13-E2 | Edge | Watermark validation: rendered surface mismatch → `13.threat_detected.v1` category `watermark-invalid` severity `critical` (detection only; rotation Phase 2-blocked) |
| A13-X1 | Adversarial | Operator without admin role attempts to approve DMCA → guard rejects per §13 + §10.2 |
| A13-X2 | Adversarial | Prompt-injection in cloned-content body does NOT alter Cloudflare policy update logic |
| A13-X3 | Adversarial | Hostile getter pattern test |
| A13-X4 | Adversarial | Per §20.1 reconciliation — embedded Sprint PROTECT-1 Phase 1 defences NOT mutated by Agent #13 actions |
| A13-X5 | Adversarial | Bypass counsel-review gate attempt: attempt to emit `13.dmca_filed.v1` directly → no such topic exists in `_registry.ts`; emit rejected per Cluster D `UNKNOWN_TOPIC` |
| A13-X6 | Adversarial | Cross-tenant clone-detection envelope tampering → `tenantId` field rejected on mismatch with current tenant scope |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A13-* tests passing
- Always-on Inngest job runs 7 consecutive days emitting threat-classification telemetry (including `13.cycle.empty.v1` for no-threat cycles)
- Phase 2 BLOCKED until: (a) watermark spec ratified per §13.25; (b) legal counsel review workflow operational per §13.26; (c) Cloudflare adapter wired
- Watermark validation works against ≥3 of the 5 VEU products (detection only; Phase 1)
- W4 adversarial coverage ≥7 cases passing (including A13-X5 counsel-bypass + A13-X6 cross-tenant)

## 10. Dependencies + sequencing notes

- **Hard depends on:** Sprint PROTECT-1 Phase 1 embedded defences shipped (LIVE per §20.1); Agent #21 ACE Conductor SHIPPED-GREEN
- **Phase 2 depends on:** Cloudflare adapter wired (deferred); DMCA counsel-review workflow operational (deferred — process dep); watermark spec ratified per §13.25 (HARD BLOCKER for watermark rotation only)
- **Provides to:** Agent #11 Strategic Intelligence (consumes `13.threat_detected.v1` for carveout-flag synthesis); operator/admin via `/self-protection` UI

## 11. Estimated build effort

**~14 W-hours** Phase 1 (always-on loop + perception + classification + 4 emission paths including empty-cycle exception). Phase 2 Executor + Cloudflare adapter + DMCA workflow adds **~12 W-hours**; full watermark rotation adds an ADDITIONAL **~12 W-hours** ONLY after watermark spec ratifies — total Phase 2 ≥24 W-hours (conditional).

## 12. Open clarification flags

- **Q (RESOLVED v2 — hard-gated on separate dispatch):** Watermark mint+rotation pipeline — no canonical spec exists today; v2 hard-gates Phase 2 watermark rotation on a separate `WATERMARK_GENERATION_SPEC.md` ratification. Phase 1 ships unblocked.
- **Q (RESOLVED v2 — counsel gate mandatory):** DMCA filing destination — RESOLVED to draft-only Phase 2 per §13.26; all filings require human counsel review + admin operator approval. No auto-file path exists.
- **Q (RESOLVED v2 — implementation):** Cloudflare adapter scope — Cloudflare Bot Management is enterprise-tier; cost implications surfaced via Cluster A §13 reserve/settle. Carve-out evaluation per §8.1 applies.

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict.

- **A-a (boundary-class):** Agent #13 is `always-on cross-tenant` cost-class (primary); Phase 2 sibling is `flowai-internal sibling-executor` cost-class. Cost aggregated at agent×day grain. All LLM dispatches (threat classifier, DMCA draft) MUST call `costGovernor.reserve()` + `settle()` + emit `agent.cost.signal.v1`.
- **A-b/A-c:** advisory-lock + SERIALIZABLE per canonical Cluster A v3.
- **A-d (halt envelope):** budget-cap-reached → emit `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }` + emit `13.cycle.empty.v1 { reason: 'budget-cap-reached' }`. Always-on cycle resumes on next scheduled window.

### §13.2 — Cluster B Data Quality Gate (Obj #51 exception documentation)

**Canonical exception:** Agent #13 (always-on continuous-monitoring agent) emits `13.cycle.empty.v1` when an edge-log batch contains no threats. This is NOT a Cluster B halt — continuous-monitoring agents normally have empty batches when no threats present. The exception is canonical per §20 + Locked Rule 14 (continuous crawl + fix at any time).

| Standard Cluster B halt | Agent #13 empty-batch behaviour |
|---|---|
| Data insufficiency → halt pipeline | NOT applicable — Agent #13 has no downstream-blocking dependency |
| Emit `agent.data_quality.insufficient.v1` | NOT emitted on empty-batch (only on actual data-quality failures like malformed log entries) |
| Operator override required | NOT required for empty batches |
| Standard `recoveryHint` field | NOT present on `13.cycle.empty.v1` (no recovery needed) |

Downstream consumers (e.g. Agent #11 vendor-risk feed from `13.threat_detected.v1`) treat empty cycles as "no signal," NOT as a Cluster B halt requiring override.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

Output mode-agnostic (threats classified identically across modes); `pipelineMode` field ALWAYS present on every emit per Obj #30 reconciliation. For always-on agents the value is `'always-on'` (or `'mixed'` for cross-product portfolio scans).

### §13.10 — Security controls extension (Obj #61 resolution)

LLM-generated content audit trail:
- Every `13.dmca_draft.v1` carries `modelVersion`, `promptHash` (SHA-256 of full prompt), `outputHash` (SHA-256 of generated text), `draftedAt`.
- Admin UI surfaces the audit chain on every draft review.
- Counsel can request regeneration (logged separately with `regenerationCount`).
- LLM-prompt scrubbing: cloned-content body included in DMCA-draft prompt is wrapped in system-quoted blocks; Anthropic prompt-shield API layered above when available (same hardening as Agent #6 v2 §13.7).

Cross-tenant tampering:
- `tenantId` field MANDATORY on every emit; RLS predicate on every SSOT read.
- Cross-tenant clone-detection envelope rejected at schema validator (test A13-X6).

DMCA content security:
- DMCA draft text held in encrypted ColdStore until counsel-approved.
- Hash chain on `13.dmca_draft.v1` per Cluster D §15 to detect tampering between draft + approval.

### §13.11 — SSOT field-ownership partition

Agent #13 has NO ProductSSOT write surface in Phase 1. Phase 2 sibling writes to `self_protection.dmca_drafts[]`, `self_protection.policy_updates[]` exclusively. No collision with #8/#9/#10/#12 SSOT scopes.

### §13.25 — Watermark spec resolution (Obj #33 / #55 / #64 resolution)

Phase 2 watermark rotation capability is HARD-GATED on a separate `WATERMARK_GENERATION_SPEC.md` ratification (NEW dispatch outside Wave 1 cohort). The spec must cover:
- Generation: cryptographic per-product watermark mint algorithm
- Embedding: how watermarks embed into rendered surfaces (DOM, image alt-text, CSS pseudo-elements, etc.)
- Rotation: cadence, atomic-rotation guarantees, blue-green rollout for live products
- Validation: how Phase 1 `watermark-invalid` detection verifies the expected watermark

Until `WATERMARK_GENERATION_SPEC.md` ratifies:
- Phase 1 ships UNBLOCKED — watermark-invalid detection ships in advisory mode (emits `13.threat_detected.v1 { category: 'watermark-invalid' }` based on a static seed watermark per product; no rotation cycle).
- Phase 2 partial-ships: DMCA draft + Cloudflare policy paths unblocked; watermark rotation path BLOCKED.
- Phase 2 watermark estimate: ≥12 W-hours additional ONLY after watermark spec ratifies.

### §13.26 — Legal counsel gate (Obj #34 / #50 / #52 resolution)

DMCA workflow contract (Phase 2):

| Step | Action | Authority required |
|---|---|---|
| 1 | Agent #13 primary detects clone | none (read-only perception) |
| 2 | Agent #13 primary emits `13.threat_detected.v1 { category: 'clone-discovered' }` | `[RECOMMEND_ONLY]` |
| 3 | Sibling Executor consumes; drafts DMCA letter via Anthropic | `[AUTO_WRITE_INTERNAL]` (internal draft only) |
| 4 | Sibling Executor emits `13.dmca_draft.v1 { status: 'awaiting_counsel_review' }` | `[AUTO_WRITE_INTERNAL]` |
| 5 | Draft routes to legal-review queue (`/api/self-protection/dmca-draft-review-queue`) | n/a (queue persistence) |
| 6 | Human counsel reviews + approves OR requests regeneration | counsel role |
| 7 | Operator with admin role triggers filing per §10.2 | admin role |
| 8 | Filing executes; emits `13.dmca_filing_complete.v1` (NEW; Phase 2.5 follow-on; outside Wave 1) | sibling Executor `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` |

**Default policy:** ALL DMCA actions are `requires_human_gate` regardless of severity. NO "auto-file on critical" path. The `requires_human_gate` NEVER auto-resolves for DMCA actions (unlike e.g. Orchestra auto-admission which auto-resolves on clean conditions).

**Adversarial protection:** test A13-X5 enforces — attempts to emit `13.dmca_filed.v1` directly (bypassing the draft + counsel + admin flow) are rejected at Cluster D `UNKNOWN_TOPIC` boundary (no such topic exists in `_registry.ts`).

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)

Agent #13's clone-detection scope evaluates against the FULL canonical market per `product_registry.market_definition` — clones serving any sub-segment of the full market are flagged. E.g. a clone targeting "Africa-based pregnancy users" of MyPregLife is flagged because the FULL market includes globally; clones in any market sub-segment count as clones of the full-market product.

## 14. Cluster C integration — see §13.4

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 4 Phase-1 topics + 2 Phase-2 sibling topics conform to v3 §2.2 naming.
- **D-b (retention-class binding):** `13.threat_detected.v1`, `13.dmca_draft.v1`, `13.bot_policy_update.v1` are `retention-class: security` (7-year + hash-chain mirror; tamper-evident per §13.10). `13.cycle.empty.v1` is `retention-class: operational` (30-day; high volume).
- **D-c (replay-buffer semantics):** idempotency key `threatId + tenantId + cycleStartedAt`; replay attempts emit advisory log.

**Topic-per-ship ceiling (Cluster D v3 §2.1.0-Def):** 4 Phase-1 topics + 2 Phase-2 sibling topics = 6 total. Per the 5-topic ceiling, Agent #13 first-ship lands in TWO commits:
- **Commit 1 (Phase 1 first-ship):** 4 topics — `13.threat_detected.v1`, `13.cycle.empty.v1`, + 2 Phase-2 reservations declared in `_registry.ts` (Phase 2 sibling topics declared for schema-validator visibility).
- **Commit 2 (Phase 2 sibling first-ship):** 2 sibling topics activate.

**Load-test artifact gate:** shared Wave 1 cohort artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED (v2 paste block)

Per `CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md` v3 + ENTRY 009.

Agent #13 primary `[RECOMMEND_ONLY]`; Phase 2 sibling `self-protection-executor` carries `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` per the canonical CA-7 §15.5 + Cluster E v3 §2.6 Option (a) pattern. NO dual-authority on the primary at any phase. The sibling is registered in `EXECUTOR_REGISTRY` at Phase 2 first-ship commit; `validateExecutors()` accepts the entry; primary roster cardinality is unaffected.

**Authoritative ceiling enforcement (Cluster E v3 §2.5 R2):** sibling Executor's `execute()` entry traverses `BaseAgent.guard(authorityNeeded, dispatchCtx)`. `requires_human_gate` resolution rules:
- DMCA actions: NEVER auto-resolve per §13.26 — always routes to counsel + admin.
- Cloudflare policy updates: auto-resolve for `low` / `medium` severity bot-policy rule additions; routes to admin for `high` / `critical` (per §10.2).
- Watermark rotation: BLOCKED on §13.25 watermark spec ratification.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **33/55/64** | Watermark spec dependency blocks Phase 2 | §13.25 — Phase 2 watermark hard-gated on separate spec; Phase 1 unblocked |
| **34/50/52** | DMCA legal liability without counsel | §13.26 — counsel gate mandatory; no auto-file path exists |
| **51** | Data Quality Gate Exception | §13.2 — empty-batch exception documented; NOT a Cluster B halt |
| **61** | Insufficient security controls (LLM content) | §13.10 — per-request audit trail (model/prompt/output hash); cross-tenant RLS |

---

*End of Agent #13 Self-Protection build blueprint v2. Panel `PLURALITY_A13-REVISE` 5/10 objections resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification AND watermark spec ratification (Phase 2 only).*
