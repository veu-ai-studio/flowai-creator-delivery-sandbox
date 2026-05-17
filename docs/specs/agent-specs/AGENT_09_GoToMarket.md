# Agent #9 — Go-to-Market — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_09_GoToMarket.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 9, §9 step 7 (gtm), §11 Six-Step Clearance Protocol Step 5, CA-11-B.7 ToolMenu, ENTRY 006 §7.6 GTM Readiness Report.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=9 (lines 167–177).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `9` |
| Name | `Go-to-Market` |
| Mode | `step-owner` |
| Pipeline step owned | **Step 7 — `gtm`** (gates Clearance Step 5 Demo Readiness per ENTRY 006 §7.6) |
| Build-authority | **recommend_only** in all planned phases. GTM produces assessments + recommendations; never writes operator source. |
| Operational-authority | **autonomous** for ToolMenu dispatch (Anthropic API / OpenRouter / Perplexity for competitive intel) within budget. Per escalation policy: "All assets emitted as `draft=true`. Authority guard rejects any non-draft side effects until W0 approves." |
| Current status | **DORMANT** — charter ratified; AutoRunner step 7 currently runs a placeholder GTM routine. |
| Depends on | Agent #8 Quality Audit SHIPPED-GREEN; Agent #21 ACE Conductor SHIPPED-GREEN (per ENTRY 006 §7.6 GTM Readiness Report producer); ClearanceProtocolPrompt UI (Sprint HARD-1 SHIPPED). |

---

## §2 — What This Agent Does

Plain English: GTM is the agent that decides "is this product ready to show to a prospect?" It takes the upstream audit + crawl results and produces a **GTM-readiness assessment** — a readiness score band, top demo risks, the most impactful fixes before any prospect demo, and an `clearanceStep5Eligible` boolean that controls whether the operator can advance through Clearance Step 5 (Demo Readiness, per §11).

Specifically: Agent #9 reads the Quality Audit envelope (`8.audit.completed.v1`), the ACE GTM Readiness Report (`21.gtm.readiness.v1`), and the design context (`7.design.spec.v1`), then runs a single composite "GTM readiness" Claude analysis. It ranks the top fixes per the ENTRY 006 §7.6 impact_score formula (severity × visibility × effort), emits `9.gtm.assessment.v1`, and writes the result to ProductSSOT `governance_record_entry` (kind `gtm_assessment`).

The operator sees: a GTM readiness scorecard (band 0–100 with named tier — "Pre-MVP / MVP / Demo-Ready / GTM-Ready"), a ranked top-5 risks list, and a "READY FOR DEMO" or "BLOCKED — fix Security Posture sub-6 first" banner. Clearance Step 5 unlocks only when `clearanceStep5Eligible === true`.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 173)

```
consumes: ['8.audit.completed.v1']
```

Plus by convention (enrichment topics):

- `21.gtm.readiness.v1` (per ENTRY 006) — ACE-derived readiness signal.
- `2.build.completed.v1` — build URL reference for live competitive context.
- `7.design.spec.v1` — design context for demo-asset framing.

### §3.2 Input shape

```ts
{
  runId, productId, productScope, environment,
  upstreamArtifacts: {
    audit: { scores, overallPass, recommendations, ... },  // required
    aceReadiness?: { score, scoreBand, issues, ... },
    build: { url, deploymentId },
    design?: { spec },
  },
  historicalGtmScores?: Array<{ at, readinessScore, scoreBand }>,
  competitiveSetUrls?: string[],                            // optional ops-supplied
}
```

### §3.3 Preconditions

- `8.audit.completed.v1` fired for this `runId` (hard precondition).
- Operator role permits triggering ClearanceProtocolPrompt (per §13: admin role only).
- ProductSSOT row exists.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 174)

```
produces: ['9.gtm.asset.v1']
```

Phase 1 implementation emits a richer envelope (`9.gtm.assessment.v1`) that supersedes the `_registry.ts`-named `9.gtm.asset.v1` topic; the topic name in `_registry.ts` should be reconciled at engineering dispatch (see Conflict Note in §6.5).

Phase 2 (demo assets, deferred until Demo Builder matures):

- `9.gtm.demo_assets.v1` — `{ runId, productId, microsite, tourScript, investorAssets, draft: true, at }`.

### §4.2 Output shape — `9.gtm.assessment.v1`

```ts
{
  runId, productId,
  readinessScore: 0-100,
  scoreBand: 'pre-mvp' | 'mvp' | 'demo-ready' | 'gtm-ready',
  demoRisks: Array<{
    severity, category, evidence, ownerAgent,           // ownerAgent: which agent should fix
  }>,
  topFixes: Array<{                                     // ranked per §7.6 impact_score
    rank, severity, visibility, effortPoints,
    impactScore, description, autoFixable,
  }>,
  assetReadiness: {
    microsite: 'absent' | 'draft' | 'ready',
    tourScript: 'absent' | 'draft' | 'ready',
    investorDeck: 'absent' | 'draft' | 'ready',
  },
  clearanceStep5Eligible: boolean,                       // 4-prerequisite gate per ENTRY 006 §7.6
  clearanceStep5BlockReason?: string,
  draft: true,                                           // load-bearing per escalation policy
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row written.
- ProductSSOT `governance_record_entry` `kind: 'gtm_assessment'` written.
- `9.gtm.assessment.v1` emitted exactly once per `runId`.
- All emitted envelopes carry `draft: true` (load-bearing per escalation policy).
- ClearanceProtocolPrompt UI consumes `clearanceStep5Eligible` to gate Step 5 advance.

---

## §5 — Pipeline Integration

### §5.1 Step owned

Step 7 — `gtm`. Wired via `OrchestratorHub.registerStepOwner('gtm', ctx => agent9.recommend(ctx))`.

### §5.2 Upstream feeders

- **Agent #8 Quality Audit** — hard precondition (`8.audit.completed.v1`).
- **Agent #21 ACE Conductor** — `21.gtm.readiness.v1` (enrichment).
- **Agent #2 Code Builder** — `2.build.completed.v1` for build URL.
- **Agent #7 Design** — `7.design.spec.v1` for demo-asset framing.

### §5.3 Downstream consumers

- **Agent #10 Monitor** (folds GTM assessment into final report).
- **Clearance Wizard Step 5** (Demo Readiness — reads `clearanceStep5Eligible`).
- **Operator UI** — GTM scorecard rendering.

### §5.4 Mode behavior

| Mode | Agent #9 behavior |
|---|---|
| **Mode 1** | Full GTM assessment; emit envelope. |
| **Mode 2 SUB-2A** | Identical; `topFixes` with `autoFixable: true` feed Agent #3 Self-Renewal Executor's fix-generation queue. |
| **Mode 3A** | Identical. |

Agent #9 is mode-agnostic; recommendations differ only in whether downstream Self-Renewal acts on them.

---

### §5.5 — Cluster Template Integration Blocks (v2 — per W3 Dispatch #11)

**Cluster A — Cost signaling** (per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v2):
This agent emits `agent.cost.signal.v1` before each LLM call (GTM readiness
analysis + competitive-intel crawl analyze). It does NOT self-enforce budget
caps. Agent #23 is the sole canonical enforcement owner. Call order per
Cluster A §2.6 v2 R4 applies per dispatch.

**Cluster B — Data quality gate** (per `CLUSTER_B_DATA_QUALITY_GATE.md` v2):
Effective threshold = `ProductRegistry.minimumDataQuality.agent_9_go_to_market.pageCountMin`
OR per-agent default: `pageCountMin: 1` (clamped to [1, 50]).
- Mode 1 + Mode 2 SUB-2A: missing `8.audit.completed.v1` → emit
  `agent.data_quality.insufficient.v1` and halt; populate provenance with
  `upstream-block` reason referencing Agent #8 Quality Audit.
- Mode 3A (per Cluster B §2.7 v2 R1): if `dataQualityScore ≥ 0.3`, may
  emit `9.gtm.assessment.v1` with `outputQuality: 'degraded'`; below 0.3
  → halt.
Upstream-halt tolerance per Cluster B §2.8 v2 R4: `degrade-on-any` (Agent
#21 ACE readiness is enrichment; missing → emit low-confidence assessment
flagging absence).

**Cluster C — Mode behavior** (Pattern P2 per Cluster C §2.3):
- **In Mode 1 (Assess):** emit `9.gtm.assessment.v1` with GTM readiness
  scorecard per §4.2; `topFixes[]` contains ranked recommendations but
  `autoFixable: false` on all entries (Mode 1 is read-only).
- **In Mode 2 SUB-2A (Build):** same envelope + `topFixes[]` entries with
  `autoFixable: true` flag where the fix is mechanical (consumed by Agent
  #3 Self-Renewal Executor for queueing fix-generation).
- **In Mode 3A (Benchmark):** same envelope as Mode 2 but evaluated against
  the Vercel preview URL produced by Self-Renewal Executor; clearance
  Step-5 eligibility computed against preview rather than prd surface.
- **Default:** Mode 1 when `pipelineMode` is unspecified.
Every emitted envelope carries `pipelineMode` field per Cluster C §2.4 v2 R2
(mandatory for P2). All emissions still carry `draft: true` per escalation
policy.

**Cluster D — MessageBus topics** (per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`
v2): This agent emits `9.gtm.assessment.v1` (renamed from `9.gtm.asset.v1`
per G9-Q3 disposition (a) — Cluster D dual-emit window applies during
migration per §2.4 v2 R4) plus `9.gtm.demo_assets.v1` (Phase 2). Cross-
cluster topics ship in P0 patch. Topic rename uses Phase-1/Phase-2/Phase-3
dual-emit migration contract.

**Cluster F — Model selection** (per `CLUSTER_F_MODEL_BUDGET_FALLBACK.md`
v2): Default tier `medium`; tier-policy `budget-flex` per Cluster F §2.1.2.
Selection:
1. `ProductRegistry.modelSelectionOverride[productId].medium`.
2. `FLOWAI_MODEL_TIER_MEDIUM` from Doppler.
3. `FLOWAI_MODEL_TIER_MEDIUM_FALLBACK_CHAIN` from Doppler.
4. `CLUSTER_F_DEFAULTS.medium` → `claude-sonnet-4-6`.
Selection re-read per dispatch. Tier-downgrade per Cluster F §2.5 v2 R2
(medium → low → free; max 3 attempts).

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent9GoToMarket.js` — ~520 LOC.
- `src/lib/agents/agents/__tests__/Agent9GoToMarket.test.js` — ~340 LOC.
- `src/lib/agents/agents/prompts/gtmReadinessPrompt.js` — deterministic Claude prompt template.
- `src/lib/agents/agents/scorers/impactScoreFormula.js` — ranks top fixes per §7.6 (severity × visibility × effort).

### §6.2 Files to modify (existing)

- `src/pages/AutoRunner.jsx` — wire step-7 to Agent #9.
- `src/components/clearance/Step5DemoReadiness.jsx` (Sprint HARD-1 existing) — consume `clearanceStep5Eligible` from envelope.
- `src/lib/agents/_registry.ts` — at engineering dispatch, reconcile produces topic name `9.gtm.asset.v1` ↔ implementation `9.gtm.assessment.v1` (see §6.5 Conflict Note).

### §6.3 Estimated effort

**~10 W-hours Phase 1.** Phase 2 demo asset generation adds **~8 W-hours** but defers to Demo Builder integration maturity.

### §6.4 Key engineering risks

1. **Subjective readiness scoring** — what's "demo-ready" varies by industry. Mitigation: per-product `gtmReadinessRubric` override in `ProductRegistry`; default rubric Panel-ratified.
2. **`clearanceStep5Eligible` false-positives** — agent says ready, product fails in front of prospect. Mitigation: 4-prerequisite hard gate (per ENTRY 006 §7.6) AS WELL AS readiness band check; both must pass.
3. **Competitive-intel crawl prompt injection** — third-party competitor sites may contain adversary content. Mitigation: same deterministic-prompt pattern as Agent #6.
4. **`draft: true` invariant** — escalation policy load-bearing: agent must NOT emit any envelope with `draft: false` until W0 approves. Mitigation: BaseAgent schema validation rejects emission with `draft !== true` (unless agent's authority includes a non-draft elevation — none planned).
5. **Topic naming reconciliation** — `_registry.ts` says `9.gtm.asset.v1`, blueprint says `9.gtm.assessment.v1`. Engineering dispatch must reconcile (see §6.5).

### §6.5 SSOT Conflict Note

`_registry.ts` line 174 names `produces: ['9.gtm.asset.v1']`. Blueprint + this spec use `9.gtm.assessment.v1` for the readiness envelope and reserve `9.gtm.asset.v1` for Phase 2 demo assets. Two options:

- **Option A**: Update `_registry.ts` to produce BOTH `9.gtm.assessment.v1` (Phase 1) and `9.gtm.asset.v1` (Phase 2).
- **Option B**: Keep `9.gtm.asset.v1` as the canonical topic; rename the Phase 1 envelope to fit; treat assessment + asset as the same envelope with `assetReadiness` field.

Recommendation: **Option A** (Panel-ratify at engineering dispatch). This conflict is flagged in the final consolidated report.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 172:

```
requiredCredentials: ['ANTHROPIC_API_KEY']
```

Plus per ToolMenu: optional `OPENROUTER_API_KEY` (for GPT-5 / Perplexity / Gemini fallback) and `PERPLEXITY_API_KEY` if direct (preferred via OpenRouter).

All credentials memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Build URL + audit recommendations sent ONLY to: Anthropic API (analysis); OpenRouter (fallback only via CA-11-A.4); ColdStore; HotStore; MessageBus; ProductSSOT. NEVER to non-Anthropic LLMs without ToolMenu fallback.
- Competitive-intel crawl content scrubbed before persist.
- Demo assets (Phase 2) MAY contain operator branding — operator MUST opt-in per-product to demo-asset generation.

### §7.3 Scope limiting

- Per-product GTM assessment; cross-product GTM comparison is Agent #15 Benchmarking territory.
- Competitive-intel crawl limited to operator-attested competitor URLs (`ProductRegistry.competitiveSet`); never auto-discovered competitors.

### §7.4 Escalation policy (from `_registry.ts` lines 175–176)

```
escalationPolicy:
  'All assets emitted as draft=true. Authority guard rejects any non-draft side effects until W0 approves.'
```

Concrete enforcement:

- BaseAgent schema validation rejects emit when `draft !== true` — load-bearing invariant.
- Phase 2 demo-asset generation (microsite, tour script, investor deck) emitted with `draft: true`; promotion to non-draft requires explicit W0 (admin) approval via UI gate.
- `clearanceStep5Eligible: true` triggers ClearanceProtocolPrompt but does NOT autonomously advance Step 5 — operator must still click through the prompt.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Produce GTM readiness assessment envelope (score, band, top fixes, asset readiness, eligibility)
- Rank top fixes per §7.6 impact_score formula
- Gate Clearance Step 5 via `clearanceStep5Eligible` flag
- Persist to ProductSSOT `governance_record`
- Trigger ClearanceProtocolPrompt when ready

### §8.2 Phase 2 capabilities (deferred — Demo Builder maturity)

- Generate microsite copy via Anthropic API
- Generate prospect tour script
- Generate investor deck talking points
- All assets `draft: true` until W0 approval

### §8.3 What this agent CANNOT do — ever

- **Never emits non-draft assets without W0 approval** — load-bearing invariant.
- **Never auto-advances Clearance Step 5** — eligibility flag is recommend-only; operator action required.
- **Never invents competitive set** — competitor URLs operator-attested only.
- **Never writes operator source** — recommend-only forever.

---

## §9 — Acceptance Criteria

1. **AC-9.1** — Given passing audit (overallPass=true) + ACE readiness ≥75, Agent #9 emits assessment with `clearanceStep5Eligible: true`, `scoreBand: 'demo-ready' | 'gtm-ready'`. A9-N1.
2. **AC-9.2** — Top 5 fixes ranked per §7.6 impact_score formula; ranking deterministic for same input. A9-N2.
3. **AC-9.3** — Missing `8.audit.completed.v1` → low-confidence envelope; `clearanceStep5Eligible: false`. A9-M1.
4. **AC-9.4** — ACE finds `xss-in-form-echo` critical → `clearanceStep5Eligible: false` regardless of audit overallPass. A9-E2.
5. **AC-9.5** — Operator with `client` role attempts to trigger ClearanceProtocolPrompt — UI guard rejects per §13. A9-X1.
6. **AC-9.6** — All emitted envelopes carry `draft: true`; agent throws on emit attempt with `draft !== true`. A9-X4.
7. **AC-9.7** — `ANTHROPIC_API_KEY` never present in any persisted artifact (canary test).
8. **AC-9.8** — Boundary case: ACE score exactly 75.0 → eligible; 74.9 → blocked. A9-E1.

---

## §10 — Panel Questions

### G9-Q1 — Readiness band thresholds

The 4 score bands (pre-mvp / mvp / demo-ready / gtm-ready) are not currently specified by numeric range. Where should the thresholds sit?

- (a) Pre-MVP 0–39, MVP 40–59, Demo-Ready 60–79, GTM-Ready 80–100 (matches §7.6 conventions).
- (b) Pre-MVP 0–24, MVP 25–49, Demo-Ready 50–74, GTM-Ready 75–100 (lower bar; faster operator graduation).
- (c) Per-product configurable thresholds (`ProductRegistry.gtmReadinessThresholds`); default per (a).
- (d) Industry-vertical defaults — different thresholds for B2B SaaS vs Consumer vs Enterprise.
- (e) INSUFFICIENT_INFORMATION.

### G9-Q2 — Clearance Step 5 4-prerequisite gate

ENTRY 006 §7.6 specifies a 4-prerequisite gate. Are the 4 prerequisites canonical per ENTRY 006, or should Agent #9 surface them?

- (a) Canonical per ENTRY 006; Agent #9 enforces them as-is.
- (b) Agent #9 dynamically derives the 4 from audit + ACE + design state per product.
- (c) Operator-configurable per-product 4-prerequisite list.
- (d) Defer the 4-prerequisite enforcement to the Clearance Wizard UI; Agent #9 only emits eligibility flag.
- (e) INSUFFICIENT_INFORMATION.

### G9-Q3 — Topic naming reconciliation (§6.5 conflict)

`_registry.ts` produces `9.gtm.asset.v1`; spec uses `9.gtm.assessment.v1`. Resolution?

- (a) Update `_registry.ts` to produce both topics (Option A in §6.5).
- (b) Rename Phase 1 envelope to `9.gtm.asset.v1`; treat assessment + asset as same envelope shape (Option B).
- (c) Deprecate `9.gtm.asset.v1` entirely; only `9.gtm.assessment.v1` ever.
- (d) Keep both as separate topics with different shapes; document the distinction in Rev-2.1 §15.1.
- (e) INSUFFICIENT_INFORMATION.

### G9-Q4 — Phase 2 demo-asset generation timing

Phase 2 needs Demo Builder integration. When should it ship?

- (a) Defer until Demo Builder reaches Probation in Sprint 7 lifecycle.
- (b) Ship Phase 2 with stubbed Demo Builder (returns canned templates); real generation later.
- (c) Skip Phase 2 entirely — operator generates demo assets externally; Agent #9 only assesses readiness.
- (d) Phase 2 ships day-one alongside Phase 1.
- (e) INSUFFICIENT_INFORMATION.

### G9-Q5 — Competitive set scope

§7.3 limits competitive-intel crawl to `ProductRegistry.competitiveSet`. Should Agent #9 auto-suggest competitors based on Research findings?

- (a) Operator-only — current plan; no auto-suggestion.
- (b) Suggest; operator confirms before crawl.
- (c) Auto-crawl any competitor URL in Research findings; operator can opt-out.
- (d) Defer competitive intel entirely to Agent #15 Benchmarking; Agent #9 doesn't crawl competitors.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #9 Go-to-Market engineering spec. Pending W6 Panel ratification.*
