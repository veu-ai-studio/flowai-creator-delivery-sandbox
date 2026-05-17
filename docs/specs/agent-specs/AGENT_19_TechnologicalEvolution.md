# Agent #19 — Technological Evolution — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_19_TechnologicalEvolution.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 19, CA-11-B.10 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=19 (lines 293–302).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `19` |
| Name | `Technological Evolution` |
| Mode | `cross-step` |
| Pipeline step owned | n/a |
| Build-authority | **recommend_only** in all phases. Produces tech-evolution proposals; never executes upgrades (Self-Renewal Executor handles fixes per CA-7). |
| Operational-authority | **autonomous** for CVE feed + vendor release tracking within budget. |
| Current status | **DORMANT** — charter ratified. |
| Depends on | Agent #10 Monitor SHIPPED-GREEN (consumes `10.ssot.updated.v1` for `architecture_snapshot.dependencies[]` feed). |

---

## §2 — What This Agent Does

Technological Evolution tracks the underlying tech stack: runtime versions (Node 24 → 25 → 26), framework releases (Vite, React, Next), database engine versions, security CVE feeds. It reads ProductSSOT `architecture_snapshot.dependencies[]` for per-product baselines, compares against current marketplace, and classifies upgrade urgency:

- `critical` — known CVE actively exploited
- `high` — security CVE within remediation SLA
- `medium` — performance improvement available
- `low` — minor-version release

Output: per-product upgrade proposals + per-CVE alerts. Per escalation policy: "Signal-only — never auto-applies tech changes." All actions go through Self-Renewal Executor with operator approval.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 299)

```
consumes: []
```

By convention:

- `10.ssot.updated.v1` — `architecture_snapshot.dependencies[]` per product.
- External CVE feeds (NVD, GitHub Security Advisories) — own dispatch.
- Vendor release feeds — own dispatch.

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled-daily' | 'scheduled-weekly' | 'event-triggered',
  scheduledAt: ISO8601,
  productScope: { ... },
  cveFeed?: Array<CveEntry>,
  vendorReleases?: Array<VendorRelease>,
  productDependencies: Record<productId, DependencyManifest>,
}
```

### §3.3 Preconditions

- ProductSSOT readable per product.
- CVE feeds (NVD / GitHub Security Advisories) reachable.
- ToolMenu adapter (Perplexity / Anthropic / Browserless) available.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 300)

```
produces: ['19.tech.signal.v1']
```

Implementation additionally emits (charter expansion):

- `19.tech_upgrade_proposal.v1` — per-product upgrade envelope.
- `19.cve_alert.v1` — per-CVE alert envelope.

### §4.2 Output shape — `19.cve_alert.v1`

```ts
{
  cveId: string,
  affectedDependency: { name, versionRange },
  severity: 'low' | 'medium' | 'high' | 'critical',
  productsAffected: string[],
  remediationVersion: string,
  exploitObservedInWild: boolean,
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row per CVE/upgrade.
- Critical CVE → per-product proposal emitted per affected product + admin notified within 60s.
- De-duplicated within 24h window (same CVE alerted once).

---

## §5 — Pipeline Integration

### §5.1 Step owned

None. `hub.registerCrossStep('technological-evolution', agent)` + daily 07:00 UTC for CVE + weekly Sundays 02:00 UTC for vendor releases.

### §5.2 Upstream feeders

- Agent #10 Monitor (`10.ssot.updated.v1`).
- External CVE feeds.

### §5.3 Downstream consumers

- **Agent #3 Self-Renewal** — consumes `19.cve_alert.v1` for security-driven renewal.
- **Agent #17 Product Evolution** — consumes tech-upgrade-proposal stream.

### §5.4 Mode behavior

Mode-agnostic — emits regardless of operator mode. Downstream Self-Renewal Executor acts only in Mode 2/3.

---

### §5.5 — Cluster Template Integration Blocks (v2 — per W3 Dispatch #11)

**Cluster A — Cost signaling** (per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v2):
Emits `agent.cost.signal.v1` before each LLM call (daily CVE classification +
weekly vendor release tracking). Agent #23 is the sole canonical enforcement
owner. Call order per Cluster A §2.6 v2 R4 applies per dispatch.

**Cluster B — Data quality gate** (per `CLUSTER_B_DATA_QUALITY_GATE.md` v2):
Effective threshold = `ProductRegistry.minimumDataQuality.agent_19_technological_evolution.eventCountMin`
OR per-agent default: `eventCountMin: 1` (clamped to [1, 1000]).
- Mode 1 + Mode 2 SUB-2A: empty CVE feed is the COMMON case (silence is
  the normal state); do NOT halt — emit no envelope and log trace-level
  "no-cves". Documented exception same as Agent #13.
- If feed present but classification fails on data quality → emit
  `agent.data_quality.insufficient.v1` and halt.
- Mode 3A: degrade per Cluster B §2.7 v2 R1 if dataQualityScore ≥ 0.3.
Upstream-halt tolerance per Cluster B §2.8 v2 R4: `degrade-on-any` (CVE
feed + vendor release feed are independent streams).

**Cluster C — Mode behavior:** agent output is identical across all pipeline
modes (Pattern P1 per Cluster C §2.3). `pipelineMode` field omitted per
Cluster C §2.4 v2 R2. Default Mode 1.

**Cluster D — MessageBus topics** (per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`
v2): This agent emits `19.tech.signal.v1` (per `_registry.ts`) plus
`19.cve_alert.v1`, `19.tech_upgrade_proposal.v1`. Cross-cluster topics
ship in P0 patch.

**Cluster F — Model selection** (per `CLUSTER_F_MODEL_BUDGET_FALLBACK.md`
v2): Default tier `low`; tier-policy `strict` per Cluster F §2.1.2 (daily
CVE classification at scale; cost-controlled tier mandatory). Selection:
1. `ProductRegistry.modelSelectionOverride[productId].low`.
2. `FLOWAI_MODEL_TIER_LOW` from Doppler.
3. `FLOWAI_MODEL_TIER_LOW_FALLBACK_CHAIN` from Doppler.
4. `CLUSTER_F_DEFAULTS.low` (canonical low-tier model).
Selection re-read per dispatch. Strict policy → halt on budget denial.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent19TechnologicalEvolution.js` — ~440 LOC.
- `src/lib/agents/agents/__tests__/Agent19TechnologicalEvolution.test.js` — ~280 LOC.
- `src/lib/agents/agents/feeds/cveFeedAdapter.js` — NVD + GitHub Security Advisories.
- `src/lib/agents/agents/feeds/vendorReleaseAdapter.js` — vendor release RSS / GitHub Releases.
- `src/lib/agents/agents/classifiers/upgradeUrgency.js` — severity classification.

### §6.2 Files to modify (existing)

- Scheduler — daily + weekly cadence.

### §6.3 Estimated effort

**~9 W-hours** Phase 1.

### §6.4 Key engineering risks

1. **CVE feed allowlist** — NVD + GitHub canonical; Snyk / Dependabot integration deferred. See G19-Q1.
2. **CVE deduplication** — same CVE may appear in multiple feeds; risk of double-alerting. Mitigation: cveId-keyed dedup window 24h.
3. **Auto-upgrade temptation** — escalation policy explicitly forbids auto-apply. Mitigation: schema validation rejects `autoApply: true` in emit boundary.
4. **Cost** — daily CVE feed crawl + classification = ~$0.30/day baseline.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 298:

```
requiredCredentials: ['ANTHROPIC_API_KEY']
```

Plus per ToolMenu: optional `OPENROUTER_API_KEY`, `BROWSERLESS_TOKEN`. Memory-only, scrubbed.

### §7.2 Data exfiltration controls

- CVE content sent to Anthropic / OpenRouter for analysis; scrubbed.
- Per-product proposals include `affectedDependency` references only; no operator-product code.

### §7.3 Scope limiting

- CVE feeds limited to NVD + GitHub Security Advisories allowlist; no random feeds.
- Per-product proposals scoped to that product's `architecture_snapshot.dependencies[]`.

### §7.4 Escalation policy (from `_registry.ts` line 301)

```
escalationPolicy: 'Signal-only — never auto-applies tech changes.'
```

Concrete enforcement:

- All envelopes carry `advisory: true`.
- BaseAgent emit boundary rejects any envelope with `autoApply: true` (load-bearing).

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Daily CVE feed monitoring
- Weekly vendor release tracking
- Per-product upgrade proposals
- Per-CVE alerts with severity classification
- 60s critical-severity SLA

### §8.2 Deferred to Phase 2+

- Snyk / Dependabot integration
- Auto-upgrade via Self-Renewal Executor PR-and-preview (Phase 1 surfaces; Self-Renewal acts)
- Per-product CVE exemption tracking

### §8.3 What this agent CANNOT do — ever

- **Never auto-applies tech changes.** Signal-only per escalation policy.
- **Never executes upgrades.** Agent #3 Executor owns enactment.
- **Never adds CVE feeds without allowlist update.**

---

## §9 — Acceptance Criteria

1. **AC-19.1** — Critical CVE in known dependency → `19.cve_alert.v1` severity `critical` + per-product proposal for each affected product. A19-N1.
2. **AC-19.2** — Vendor minor-version release → `19.tech_upgrade_proposal.v1` urgency `low`. A19-N2.
3. **AC-19.3** — CVE feed unreachable → fallback per CA-11-A.4; agent does NOT crash. A19-M1.
4. **AC-19.4** — Same CVE within 24h → de-duped; single alert. A19-E1.
5. **AC-19.5** — Hostile CVE-feed content does NOT trigger auto-upgrade — proposal stays advisory. A19-X1.
6. **AC-19.6** — Envelope with `autoApply: true` rejected at emit boundary. Unit test.
7. **AC-19.7** — `ANTHROPIC_API_KEY` never persisted (canary).

---

## §10 — Panel Questions

### G19-Q1 — CVE feed allowlist

NVD + GitHub Security Advisories canonical. Add Snyk / Dependabot?

- (a) Phase 1 NVD + GHSA only; Phase 2 adds Snyk + Dependabot.
- (b) Day-one add Snyk (richer dataset).
- (c) Day-one add Dependabot (GitHub-native).
- (d) Day-one all 4 — full coverage.
- (e) INSUFFICIENT_INFORMATION.

### G19-Q2 — Upgrade urgency severity tuning

Right severity mapping (CVSS → urgency)?

- (a) CVSS 9.0+ → critical; 7.0–8.9 → high; 4.0–6.9 → medium; <4.0 → low.
- (b) CVSS 8.0+ → critical; 6.0–7.9 → high; ...
- (c) Per-vendor SLA-tuned mapping.
- (d) Operator-configurable severity thresholds.
- (e) INSUFFICIENT_INFORMATION.

### G19-Q3 — Critical-CVE 60s SLA enforcement

How enforced?

- (a) Synchronous emit + notification adapter in plan() boundary.
- (b) Inngest event-triggered backstop.
- (c) Hybrid — sync best-effort + Inngest backstop.
- (d) Defer SLA enforcement to Phase 2.
- (e) INSUFFICIENT_INFORMATION.

### G19-Q4 — Vendor release feed cadence

Weekly Sundays. Right?

- (a) Weekly — current plan.
- (b) Daily — faster catch on minor releases.
- (c) Per-dependency tier (high-frequency for framework majors, weekly for libraries).
- (d) Event-triggered via GitHub webhooks (no schedule).
- (e) INSUFFICIENT_INFORMATION.

### G19-Q5 — Self-Renewal Executor hand-off authority

When CVE alert fires, can Agent #3 Executor auto-PR the upgrade?

- (a) Never auto-PR — operator manually requests upgrade via UI.
- (b) Auto-PR with operator pre-authorisation per-product (`cveAutoPrEnabled` boolean).
- (c) Auto-PR for `critical` severity only; `high/medium/low` require operator action.
- (d) Auto-PR with PR-and-preview pattern per `SELF_RENEWAL_SPEC.md`; operator merges.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #19 Technological Evolution engineering spec.*
