# Agent #14 — Public Policy — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_14_PublicPolicy.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 14, §8.1 carve-out evaluation co-owner with Agent #11, CA-11-B.7 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=14 (lines 235–249).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `14` |
| Name | `Public Policy` |
| Mode | `cross-step` |
| Pipeline step owned | n/a |
| Build-authority | **recommend_only** in all phases. Compliance assessments are advisory, not legal opinions; remediation through §10.2 human gate. |
| Operational-authority | **autonomous** for regulatory-tracker crawl + policy classification within budget. |
| Current status | **DORMANT** — charter ratified. |
| Depends on | Agent #11 Strategic Intelligence SHIPPED-GREEN (joint carve-out per §8.1); `regulatory-trackers.json` Panel + legal-counsel reviewed; legal-counsel review process defined. |

---

## §2 — What This Agent Does

Public Policy is FlowAI's regulatory radar. It crawls jurisdictional regulatory sites (GDPR EDPB, FTC, ICO, state AGs, EU AI Act), ingests vendor T&C changes, and consumes Orchestra candidate signals to evaluate legal/regulatory exposure. It produces compliance assessments per (subject, jurisdiction) and joint carve-out flags with Agent #11 per §8.1.

Findings categories: data-residency, vendor-export-restriction, IP-protection, regulatory-compliance (GDPR/CCPA/HIPAA/POPIA), liability-exposure. The operator sees: a per-product compliance scorecard, regulatory drift alerts when applicable, and a joint flag stream that gates Orchestra auto-admission for candidates with regulatory red flags.

LLM-generated compliance assessments are **advisory, not legal opinions**. Legal counsel review process is required before findings reach operator-facing surfaces — see §10 G14-Q1.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 241)

```
consumes: []
```

By convention (cross-step):

- `11.platform.discovery.v1` — candidate evaluation per §8.1.
- Regulatory tracker crawl signals (own dispatch).

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled' | 'event-triggered' | 'on-product-onboard',
  scheduledAt: ISO8601,
  subject?: { kind: 'candidate' | 'product', id: string },
  trackerUrls: string[],                  // from regulatory-trackers.json
  productJurisdictions?: string[],        // from ProductRegistry
}
```

### §3.3 Preconditions

- `regulatory-trackers.json` present + schema-valid.
- ToolMenu adapter (Perplexity OR Anthropic OR Browserless) available.
- Legal-counsel review status known per finding (see §6.4 risk #1).

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` lines 242–246)

```
produces: [
  '14.regulation.new.v1',
  '14.regulation.update.v1',
  '14.compliance.brief.weekly.v1',
]
```

Implementation additionally emits (charter expansion):

- `14.policy_assessment.v1` — per-subject compliance status envelope.
- `14.carveout_flag.v1` — joint with Agent #11.

### §4.2 Output shape — `14.policy_assessment.v1`

```ts
{
  subject: { kind: 'candidate' | 'product', id: string },
  jurisdictions: string[],
  regulations: Array<{ name, status: 'compliant' | 'caveat' | 'non-compliant', evidence }>,
  overallComplianceStatus: 'compliant' | 'caveat' | 'non-compliant',
  legalCounselReviewStatus: 'pending' | 'reviewed' | 'advisory-only',
  recommendedRemediation: string[],
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row.
- Joint carve-out flag emitted with Agent #11 on `non-compliant` candidates.
- New regulation detected → `14.regulation.new.v1` alerts admin same-day (escalation SLA).
- Weekly compliance brief written to admin dashboard.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None. `hub.registerCrossStep('public-policy', agent)`.

### §5.2 Upstream feeders

- Agent #11 Strategic Intelligence — discovery events.
- Regulatory trackers via Orchestra `crawl`.

### §5.3 Downstream consumers

- **Agent #26 Orchestra Research Agent** — carve-out flags gate §8.1 auto-admission.
- **Agent #11 Strategic Intelligence** — joint carve-out coordination.
- **Operator/admin** — per-product compliance scorecards.

### §5.4 Mode behavior

Mode-agnostic — Public Policy runs on schedule regardless of operator mode.

---

### §5.5 — Cluster Template Integration Blocks (v2 — per W3 Dispatch #11)

**Cluster A — Cost signaling** (per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v2):
Emits `agent.cost.signal.v1` before each LLM call (monthly regulatory tracker
analysis + per-candidate compliance check). Agent #23 is the sole canonical
enforcement owner. Call order per Cluster A §2.6 v2 R4 applies per dispatch.

**Cluster B — Data quality gate** (per `CLUSTER_B_DATA_QUALITY_GATE.md` v2):
Effective threshold = `ProductRegistry.minimumDataQuality.agent_14_public_policy.bodyContentCharsMin`
OR per-agent default: `bodyContentCharsMin: 500` (clamped to [100, 100_000];
regulatory documents have substantive content; very short fetches indicate
broken trackers).
- Mode 1 + Mode 2 SUB-2A: below threshold → emit
  `agent.data_quality.insufficient.v1` and halt; populate provenance with
  `tracker-empty` reason.
- Mode 3A: degrade per Cluster B §2.7 v2 R1 if dataQualityScore ≥ 0.3.
Upstream-halt tolerance per Cluster B §2.8 v2 R4: `degrade-on-any`
(partial tracker set still produces useful compliance signal).

**Cluster C — Mode behavior:** agent output is identical across all pipeline
modes (Pattern P1 per Cluster C §2.3). `pipelineMode` field omitted per
Cluster C §2.4 v2 R2. Default Mode 1.

**Cluster D — MessageBus topics** (per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`
v2): This agent emits per §4 — `14.regulation.new.v1`, `14.regulation.update.v1`,
`14.compliance.brief.weekly.v1`, plus charter-expansion topics
`14.policy_assessment.v1`, `14.carveout_flag.v1`. Cross-cluster topics ship
in P0 patch.

**Cluster F — Model selection** (per `CLUSTER_F_MODEL_BUDGET_FALLBACK.md`
v2): Default tier `medium`; tier-policy `budget-flex` per Cluster F §2.1.2
(regulatory text is dense; medium tier needed for quality).
Selection:
1. `ProductRegistry.modelSelectionOverride[productId].medium`.
2. `FLOWAI_MODEL_TIER_MEDIUM` from Doppler.
3. `FLOWAI_MODEL_TIER_MEDIUM_FALLBACK_CHAIN` from Doppler.
4. `CLUSTER_F_DEFAULTS.medium` → `claude-sonnet-4-6`.
Selection re-read per dispatch. Tier-downgrade per Cluster F §2.5 v2 R2.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent14PublicPolicy.js` — ~450 LOC.
- `src/lib/agents/agents/__tests__/Agent14PublicPolicy.test.js` — ~300 LOC.
- `src/lib/agents/agents/regulators/regulatory-trackers.json` — canonical regulatory URL set; Panel-reviewed annually.
- `src/lib/agents/agents/prompts/regulatoryCompliancePrompt.js` — deterministic prompt.

### §6.2 Files to modify (existing)

- Scheduler — monthly cadence + event triggers on `11.platform.discovery.v1`.

### §6.3 Estimated effort

**~10 W-hours** Phase 1.

### §6.4 Key engineering risks

1. **Legal-counsel review process** — LLM-generated compliance assessments must NOT be treated as legal opinions. Mitigation: explicit `legalCounselReviewStatus: 'advisory-only'` default; operator-facing UI clearly marks advisory.
2. **`regulatory-trackers.json` curation** — needs legal counsel input; not just W3 + Panel.
3. **Cross-jurisdiction conflict resolution** — EU GDPR vs US CLOUD Act can conflict; assessment must surface, not silently pick one.
4. **Prompt injection in regulator content** — same mitigation as Agent #6.
5. **Cost** — monthly crawl across ~10–20 regulatory sites × LLM analysis = ~$2–$5/month.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 240:

```
requiredCredentials: ['ANTHROPIC_API_KEY']
```

Plus per ToolMenu: optional `OPENROUTER_API_KEY`, `BROWSERLESS_TOKEN`. Memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Regulatory content sent to Anthropic / OpenRouter (LLM) only.
- Per-product assessments include only the product's declared jurisdictions; no cross-product leakage.
- Findings strings scrubbed before persist.

### §7.3 Scope limiting

- Regulators limited to `regulatory-trackers.json` allowlist; no auto-discovery.
- Per-product assessments scoped to operator-declared jurisdictions.

### §7.4 Escalation policy (from `_registry.ts` line 248)

```
escalationPolicy:
  'FlowAI-only. New regulations in user-selected jurisdictions alert W0 same-day.'
```

Concrete enforcement:

- New regulation detected in a tracked jurisdiction → emit `14.regulation.new.v1` synchronously + admin notification within same calendar day.
- Compliance status change for an operator product → per-product admin alert.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Monthly regulatory tracker crawl + classification
- Per-subject compliance assessments
- Joint carve-out flags with Agent #11
- Weekly compliance digest
- Same-day new-regulation alerts

### §8.2 Deferred to Phase 2+

- Real-time regulatory feed subscriptions (RSS / GovTrack APIs)
- Per-product legal-counsel review workflow integration
- Multi-language regulatory tracking (Phase 1 English-only)
- Auto-update operator `/terms-of-use` + `/privacy-policy` pages on regulatory drift (today: alert only)

### §8.3 What this agent CANNOT do — ever

- **Never substitutes for legal counsel.** Output is advisory.
- **Never auto-removes products from operator portfolio on non-compliance.** Alert only.
- **Never adds trackers without Panel + legal-counsel ratification.**

---

## §9 — Acceptance Criteria

1. **AC-14.1** — GDPR-relevant product compliance check → assessment with status + jurisdictions populated. A14-N1.
2. **AC-14.2** — AWS-bound candidate → joint `14.carveout_flag.v1` + `11.carveout_flag.v1`. A14-N2.
3. **AC-14.3** — Regulator-site change detected → `14.regulation.new.v1` emitted; admin notified same-day. A14-N3.
4. **AC-14.4** — Conflicting jurisdictions (EU GDPR vs US CLOUD Act) → surfaced with `complianceStatus: 'caveat'`. A14-E1.
5. **AC-14.5** — Prompt-injection in regulator content does NOT manipulate classification. A14-X1.
6. **AC-14.6** — All operator-facing assessments marked `legalCounselReviewStatus: 'advisory-only'` by default until counsel reviews.

---

## §10 — Panel Questions

### G14-Q1 — Legal-counsel review cadence

LLM assessments are advisory. Required review process before surfacing to admin?

- (a) Every assessment reviewed by counsel before surfacing (slow but safe).
- (b) Counsel reviews jurisdictional templates; per-assessment surfacing is automatic with "advisory" marker.
- (c) Counsel reviews high-severity only (`non-compliant` status); `compliant`/`caveat` surface automatically.
- (d) No counsel review — operator accepts liability; FlowAI surfaces advisory clearly.
- (e) INSUFFICIENT_INFORMATION.

### G14-Q2 — `regulatory-trackers.json` annual cadence

Annual Panel review proposed. Right cadence?

- (a) Annual review — current plan; balances stability vs drift.
- (b) Quarterly review — more responsive to regulatory landscape changes.
- (c) Monthly review — most responsive; highest Panel cost.
- (d) Event-driven review — Panel reviews when material regulatory events (e.g. new GDPR amendment) trigger it.
- (e) INSUFFICIENT_INFORMATION.

### G14-Q3 — Multi-language regulatory coverage

Phase 1 ships English-only regulatory tracking. Right scope?

- (a) English-only Phase 1; major EU languages (French, German, Spanish) Phase 2.
- (b) Day-one cover top-5 languages (en/es/fr/de/zh-CN) per 9-language i18n floor (AUTH_TRAVERSAL_SECURITY_SPEC v3).
- (c) English + jurisdiction-native — track each regulator in its native language (e.g. CNIL in French).
- (d) English-only forever — translation of regulatory text introduces error risk; counsel reviews local-language sources independently.
- (e) INSUFFICIENT_INFORMATION.

### G14-Q4 — Auto-update operator terms-of-use pages

When regulation changes, should FlowAI auto-update operator `/terms-of-use` + `/privacy-policy`?

- (a) Never auto-update — alert only; operator updates manually with counsel.
- (b) Auto-update with PR-and-preview path (per `SELF_RENEWAL_SPEC.md`); operator merges.
- (c) Auto-update with admin opt-in per-product.
- (d) Auto-update only for minor drift; major changes require operator action.
- (e) INSUFFICIENT_INFORMATION.

### G14-Q5 — Carve-out flag escalation

Joint carve-out flags from Agent #11 + #14 — how do they gate Orchestra auto-admission?

- (a) Either flag blocks auto-admission — must clear both before admission proceeds.
- (b) Both flags required to block — single flag is advisory only.
- (c) Severity-tiered — high-severity from either blocks; low-severity advisory.
- (d) CEO arbitration — flags surface to CEO; CEO decides admission.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #14 Public Policy engineering spec.*
