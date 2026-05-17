# Agent #13 — Self-Protection (anti-crawl / IP) — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_13_SelfProtection.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 13, §20 Remediation+IP Protection, §20.1 (reconciliation with embedded layer), §25 Locked Rule 14 (continuous crawl + fix at any time), §10.2 Human Gates, CA-11-B.8 ToolMenu, CA-7 §15.5 EXECUTOR_REGISTRY (Phase 2).
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=13 (lines 220–234).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `13` |
| Name | `Self-Protection` |
| Mode | `always-on` |
| Pipeline step owned | n/a (always-on — runs continuously per Locked Rule 14: "continuous crawl + fix at any time; no maintenance windows") |
| Build-authority | **recommend_only** (Phase 1); **supervised** (Phase 2 Executor — DMCA actions + Cloudflare policy updates + watermark rotation gated by human-approval for high/critical per §10.2). |
| Operational-authority | **autonomous** for perception + classification within budget; supervised for action emission (Phase 2). |
| Current status | **DORMANT** — charter ratified; always-on loop not wired. |
| Depends on | Sprint PROTECT-1 Phase 1 embedded defences LIVE per §20.1; Agent #21 ACE SHIPPED-GREEN (for surface probes); Phase 2 deps deferred (Cloudflare adapter, DMCA workflow, watermark spec). |

---

## §2 — What This Agent Does

Self-Protection is FlowAI's IP-defence agent. It runs 24/7 (no maintenance windows per Locked Rule 14) and watches for: clone discoveries (someone copied FlowAI's product UI), suspicious crawler patterns (bots evading existing defences), scraper bypass attempts, and watermark validation failures on FlowAI's own deployed surfaces.

In Phase 1 it produces threat envelopes that the operator triages via the `/self-protection` UI. In Phase 2 the Executor takes action: mint DMCA letters via Claude, file them to target services, update Cloudflare Bot Management policies, and rotate watermarks per product. All Phase 2 actions are human-gated for high/critical severity per §10.2.

§20.1 reconciliation: Agent #13 is DISTINCT from the embedded code-level Sprint PROTECT-1 Phase 1 defences (right-click protection, DevTools detection, headless fingerprinting). Sprint PROTECT-1 ships embedded in every product; Agent #13 is the portfolio-level orchestrator that monitors signal from those embedded defences and coordinates portfolio-wide response.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 226)

```
consumes: []
```

By convention (charter expansion):

- Edge-log stream (Vercel Edge Functions output per §20).
- `21.crawl.completed.v1` (per ENTRY 006 — self-check own surface).
- `26.orchestra.candidate.v1` (carve-out evaluation per §8.1).

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled' | 'event-triggered',
  scheduledAt: ISO8601,
  edgeLogBatch?: Array<{
    requestId, userAgent, fingerprint, behaviorSignals: { ... },
    geo: { country, asn },
    at,
  }>,
  surfaceProbeArtifact?: { url, expectedWatermark, observedWatermark, at },
}
```

### §3.3 Preconditions

- Sprint PROTECT-1 Phase 1 embedded defences deployed on at least one operator product surface.
- Edge-log stream accessible (Vercel logs API or equivalent).
- Phase 2: Cloudflare adapter configured; DMCA filing endpoints implemented; watermark spec drafted.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` lines 227–231)

```
produces: [
  '13.threat.detected.v1',
  '13.signature.update.v1',
  '13.dmca.filed.v1',
]
```

Phase 2 implementation also emits (reconcile at engineering dispatch):

- `13.bot_policy_update.v1` — Cloudflare policy change envelope.
- `13.watermark_rotation.v1` — per-product watermark rotation event.

### §4.2 Output shape — `13.threat.detected.v1`

```ts
{
  threatId: string,
  category: 'clone-discovered' | 'suspicious-crawler' | 'scraper-bypass' | 'watermark-invalid',
  severity: 'low' | 'medium' | 'high' | 'critical',
  evidence: string,                    // PII-scrubbed
  affectedProducts: string[],
  recommendedActions: Array<{ action, requiresHumanGate, autoExecutableInPhase2 }>,
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row written per threat.
- Critical severity → admin notification within 60s.
- Phase 2 actions audit-logged in GovernanceAuditLog hash-chain (§14).
- Embedded Sprint PROTECT-1 Phase 1 defences NEVER mutated by Agent #13.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None (always-on). Registered via `hub.registerAlwaysOn('self-protection', agent)` + Inngest scheduled job every 5 minutes + edge-log stream event-trigger.

### §5.2 Upstream feeders

- Vercel Edge Functions edge-log stream.
- Agent #21 ACE Conductor (surface probes via `21.crawl.completed.v1`).
- Browserless (clone-discovery probes).

### §5.3 Downstream consumers

- **Agent #11 Strategic Intelligence** — consumes `13.threat.detected.v1` for carve-out synthesis.
- **Operator/admin** via `/self-protection` UI surface.
- **Agent #12 Portfolio Risk** — consumes for portfolio-fire detection.

### §5.4 Mode behavior

Mode-agnostic — Self-Protection runs always-on regardless of operator mode. Phase 2 Executor actions respect per-product authority ceiling (some products may have Build-authority recommend-only — Executor cannot file DMCA for those without operator opt-in).

---

### §5.5 — Cluster Template Integration Blocks (v2 — per W3 Dispatch #11)

**Cluster A — Cost signaling** (per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v2):
Emits `agent.cost.signal.v1` before each LLM call (5-min always-on threat
classification + Phase 2 DMCA letter generation). Agent #23 is the sole
canonical enforcement owner. Call order per Cluster A §2.6 v2 R4 applies
per dispatch. Continuous 5-min cadence implies frequent reserve/settle
cycles; cost-ledger volume should be sized accordingly.

**Cluster B — Data quality gate** (per `CLUSTER_B_DATA_QUALITY_GATE.md` v2):
Effective threshold = `ProductRegistry.minimumDataQuality.agent_13_self_protection.eventCountMin`
OR per-agent default: `eventCountMin: 1` (clamped to [1, 1000]).
- Mode 1 + Mode 2 SUB-2A: empty 5-min edge-log batch is the COMMON case
  (silence is the normal state of a healthy system); do NOT halt — emit
  no envelope and log trace-level "no-threats". This is a documented
  exception to the canonical halt semantic; it is per Cluster B §2.5 the
  "no data is acceptable" boundary case for always-on monitoring.
- If batch present but classification fails on data quality → emit
  `agent.data_quality.insufficient.v1` and halt.
- Mode 3A (per Cluster B §2.7 v2 R1): if `dataQualityScore ≥ 0.3`, may
  emit threat envelope with `outputQuality: 'degraded'`.
Upstream-halt tolerance per Cluster B §2.8 v2 R4: `degrade-on-any` (edge-
log stream + ACE crawl probe + carve-out signals are independent inputs).

**Cluster C — Mode behavior:** Phase 1 agent output is identical across all
pipeline modes (Pattern P1 per Cluster C §2.3). `pipelineMode` field omitted
from emitted envelopes per Cluster C §2.4 v2 R2. Phase 2 Executor (separate
EXECUTOR_REGISTRY sibling) is Pattern P3 (active only in Mode 2 SUB-2A /
Mode 3A for DMCA + Cloudflare + watermark actions). Default Mode 1.

**Cluster D — MessageBus topics** (per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`
v2): This agent emits `13.threat.detected.v1`, `13.signature.update.v1`,
`13.dmca.filed.v1` (Phase 2), plus charter-expansion topics
`13.bot_policy_update.v1` (Phase 2), `13.watermark_rotation.v1` (Phase 2).
Cross-cluster topics ship in P0 patch.

**Cluster F — Model selection** (per `CLUSTER_F_MODEL_BUDGET_FALLBACK.md`
v2): Default tier `low`; tier-policy `strict` per Cluster F §2.1.2 (5-min
always-on cadence; cost-controlled tier mandatory). Selection:
1. `ProductRegistry.modelSelectionOverride[productId].low`.
2. `FLOWAI_MODEL_TIER_LOW` from Doppler.
3. `FLOWAI_MODEL_TIER_LOW_FALLBACK_CHAIN` from Doppler.
4. `CLUSTER_F_DEFAULTS.low` (canonical low-tier model).
Selection re-read per dispatch. Strict policy → no tier-downgrade on
budget denial; halt immediately. Phase 2 DMCA letter generation uses tier
`medium` (one-shot per filing, lower volume justifies higher quality).

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent13SelfProtection.js` — ~580 LOC.
- `src/lib/agents/agents/__tests__/Agent13SelfProtection.test.js` — ~380 LOC.
- `src/lib/agents/agents/classifiers/threatClassifier.js` — 4-category classifier.
- `inngest/functions/self-protection-tick.js` — 5-min scheduled job.

Phase 2 (deferred):

- `src/lib/agents/agents/Agent13SelfProtectionExecutor.js` — ~480 LOC.
- `src/lib/orchestra/cloudflare-bot.js` — NEW Cloudflare adapter.
- `api/self-protection/dmca-file.js` + `policy-update.js` + `watermark-rotate.js` — Phase 2 endpoints.
- `EXECUTOR_REGISTRY` entry: key `self-protection-executor`, `agentId: 13`, `authority: ['auto_write_internal', 'requires_human_gate']`.

### §6.2 Files to modify (existing)

- Scheduler — register always-on agent + 5-min cadence.

### §6.3 Estimated effort

**~14 W-hours Phase 1**; **+24 W-hours Phase 2** (largest Phase 2 effort; needs watermark spec + Cloudflare adapter + DMCA workflow).

### §6.4 Key engineering risks

1. **Watermark spec missing** — no canonical spec for watermark generation, embedding, rotation cadence. Blocks Phase 2. See §10 G13-Q3.
2. **DMCA legal liability** — auto-generated DMCA letters are legal artifacts. Legal counsel involvement required.
3. **Cloudflare adapter cost-tier** — Bot Management is enterprise-tier. Carve-out evaluation per §8.1 required.
4. **False clone-discoveries** — Claude may misidentify legitimate analogues as clones. Mitigation: high severity requires human gate; never auto-files DMCA for low/medium confidence.
5. **§20.1 reconciliation** — Agent #13 MUST NOT mutate embedded Sprint PROTECT-1 Phase 1 defences. Mitigation: explicit guard at Executor boundary.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 225:

```
requiredCredentials: ['CLOUDFLARE_API_TOKEN']
```

Phase 2 adds: `DMCA_FILING_API_KEY_*` per target service. All memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Edge-log content sent to Anthropic for classification; scrubbed first.
- DMCA letters generated locally; sent only to target service.
- Cloudflare policy updates touch Cloudflare API only.
- Watermark rotation operates within product deploy boundaries.

### §7.3 Scope limiting

- Per-product opt-in for Phase 2 actions (`ProductRegistry.selfProtectionPhase2Enabled`).
- DMCA filing requires admin role per §10.2 Acceptance Gate analogue.
- Embedded Sprint PROTECT-1 Phase 1 defences are READ-ONLY to Agent #13.

### §7.4 Escalation policy (from `_registry.ts` lines 232–233)

```
escalationPolicy:
  'IP-protection baseline must be present on every product surface; threats trigger #12 fire pipeline.'
```

Concrete enforcement:

- Missing embedded baseline on any product → emit `13.signature.update.v1` to surface gap; alert admin.
- All threats with severity `medium+` emit `13.threat.detected.v1` AND escalate to Agent #12 fire pipeline.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Edge-log perception via 5-min scheduled batch
- 4-category threat classification (clone, crawler, bypass, watermark)
- Surface-probe self-check via ACE crawl consumption
- Emit threat envelopes
- 60s critical-severity SLA
- Always-on per Locked Rule 14

### §8.2 Phase 2 capabilities (deferred — large dependencies)

- DMCA letter minting via Claude + filing via per-service adapters
- Cloudflare Bot Management policy updates via Cloudflare adapter (NEW; enterprise-tier — carve-out eval pending)
- Watermark rotation per product per environment (needs canonical watermark spec)
- All Phase 2 actions audit-logged + human-gated for high/critical

### §8.3 What this agent CANNOT do — ever

- **Never mutates embedded Sprint PROTECT-1 Phase 1 defences.** §20.1 reconciliation invariant.
- **Never auto-files DMCA without human gate for high/critical.**
- **Never bypasses operator-configured authority ceilings.**
- **Never accesses operator-product user data** — IP-defence scope limited to edge logs + surface probes.

---

## §9 — Acceptance Criteria

1. **AC-13.1** — Edge-log with no threats → no envelope emitted. A13-N1.
2. **AC-13.2** — Headless-fingerprint match → `13.threat.detected.v1` severity `medium`. A13-N2.
3. **AC-13.3** — Clone discovery via crawl probe → severity `high` + human gate per §10.2. A13-N3.
4. **AC-13.4** — Watermark mismatch → severity `critical`; admin notified within 60s. A13-E2.
5. **AC-13.5** — Client-role DMCA filing attempt rejected per §13 RLS. A13-X1.
6. **AC-13.6** — §20.1: Agent #13 never mutates embedded defences (explicit Executor-boundary guard test). A13-X4.
7. **AC-13.7** — `CLOUDFLARE_API_TOKEN` never present in any persisted artifact (canary).

---

## §10 — Panel Questions

### G13-Q1 — Cloudflare adapter scope + cost-tier

Cloudflare Bot Management is enterprise-tier ($200+/month). Carve-out eval?

- (a) Adopt Cloudflare — accept cost; necessary for Phase 2 IP-defence.
- (b) Defer Cloudflare; Phase 2 ships with Vercel Edge Functions only (free tier).
- (c) Per-product opt-in — operators on enterprise tier get Cloudflare; others get Edge Functions.
- (d) Evaluate alternative bot-management vendors before committing.
- (e) INSUFFICIENT_INFORMATION.

### G13-Q2 — DMCA legal counsel involvement

DMCA letters are legal artifacts. Required process?

- (a) Every DMCA letter reviewed by legal counsel before filing (human gate explicit).
- (b) Counsel reviews template; per-letter filing is operator-discretion (template-ratified).
- (c) Counsel reviews only high-volume cases (≥10 letters/month).
- (d) No counsel — operator accepts liability for DMCA filings.
- (e) INSUFFICIENT_INFORMATION.

### G13-Q3 — Watermark spec ownership

Watermark spec missing. Who drafts?

- (a) W3 drafts a separate engineering spec; Panel ratifies before Phase 2.
- (b) Defer Phase 2 watermark rotation entirely; Phase 2 ships without watermark functionality.
- (c) Operator-supplied watermark scheme per-product; FlowAI rotates whatever the operator declares.
- (d) Use existing browser-fingerprint or Vercel-deployment hash as canonical watermark.
- (e) INSUFFICIENT_INFORMATION.

### G13-Q4 — §20.1 enforcement mechanism

How is "Agent #13 never mutates embedded defences" enforced?

- (a) Static code review at engineering dispatch (manual gate).
- (b) Test invariant — every Phase 2 Executor action is integration-tested against an embedded-defences-untouched assertion.
- (c) Runtime guard — Executor refuses any action whose target path matches embedded-defence module paths.
- (d) All three (defense in depth).
- (e) INSUFFICIENT_INFORMATION.

### G13-Q5 — Always-on cadence

5-minute cadence per blueprint. Right interval?

- (a) 5 minutes — current plan; balances responsiveness vs cost.
- (b) 1 minute — finer detection; ~5× cost.
- (c) 15 minutes — coarser; lower cost; may miss fast-moving threats.
- (d) Event-triggered only (no scheduled cadence); rely on edge-log stream events.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #13 Self-Protection engineering spec.*
