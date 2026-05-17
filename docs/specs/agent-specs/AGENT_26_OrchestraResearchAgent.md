# Agent #26 — Orchestra Research Agent — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification. **MOST BUILD-READY of the 18 dormant agents** — every parameter is canonical per ENTRY 005 + CA-9-A + CA-9-B.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_26_OrchestraResearchAgent.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 26, §8.1 (auto-admission pipeline owner), CA-9-A + CA-9-B (Orchestra self-expansion + dual-authority CEO Q4=(b)), Locked Rule 2 (26-agent canonical roster), CA-11-B.9 ToolMenu, §25 Locked Rule 18 (rank_score).
**Charter source of truth:** Currently absent from `src/lib/agents/_registry.ts` `AGENT_REGISTRY[]` (registry currently 25 entries per `validateRoster()` line 550; row 26 must be added at engineering dispatch per Locked Rule 2 expansion to 26-agent roster).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `26` |
| Name | `Orchestra Research Agent` |
| Mode | `always-on` |
| Pipeline step owned | n/a (always-on — runs continuously per §8.1 auto-admission cadence) |
| Build-authority | **`[recommend_only, auto_write_internal, requires_human_gate]`** dual + gate per CA-9 Q4=(b) CEO arbitration. The `requires_human_gate` is required whenever `auto_write_internal` is declared, mirroring the Self-Renewal Executor charter shape per CA-7 §15.5. Per-invocation `authorityNeeded` set membership pattern per CA-9-B.6 + CA-11-A handles the gate. |
| Operational-authority | **autonomous** for discovery loop + 4-condition gate evaluation within budget. |
| Current status | **DORMANT, charter fully canonical** — blueprint is unblocked; engineering dispatch can begin once `_registry.ts` 26th row is added. Agent #26 has the MOST adversarial test surface of any agent (security-critical auto-admission). |
| Depends on | CA-9-A + CA-9-B promoted (canonical per ENTRY 005); CA-11-C ToolMenu schema (soft); Agents #11 + #14 SHIPPED-GREEN (joint carve-out evaluators per §8.1 §CA-9-A.6); Agent #15 SHIPPED-GREEN (head-to-head scoring per CA-9-B → §8.1 condition #2). |

---

## §2 — What This Agent Does

Orchestra Research Agent is FlowAI's **Orchestra membership management agent**. It runs 24/7 and manages the lifecycle of every adapter in the Orchestra (the LLM + tool marketplace), from candidate discovery through admission, probation, full membership, and deprecation. It implements the **§8.1 four-condition auto-admission gate**:

1. `rank_score ≥ 0.70` (per Locked Rule 18 formula)
2. `head_to_head_minimum_invocations ≥ 30` (per CA-9-B)
3. Capability-gap exists (existing Orchestra <2 wired members for at least one candidate capability)
4. No carve-out flag from Agent #11 or Agent #14

Per CEO Q4=(b) arbitration, Agent #26 carries a **dual-authority charter** — the agent ITSELF (not a sibling Executor) holds `[recommend_only, auto_write_internal, requires_human_gate]`. When the 4-condition gate clears, it autonomously writes the admission decision; when any condition fails OR a carve-out flag fires, it routes to Panel + CEO per Locked Rule 13.

It emits 7 canonical `26.orchestra.*` topics per §8.1 and writes one-line entries to `docs/CANONICAL_HISTORY.md` SECTION 8 + pointer in §18.4 on every admission (preserving §18 archive discipline even when automated).

The operator sees: the live Orchestra roster (auto-updated by Agent #26), admission decisions in the audit feed, Panel-gate alerts when carve-outs fire, and a quarterly Archived-member re-evaluation cycle.

---

## §3 — Input Contract

### §3.1 Consumes (per ENTRY 005 §15.1 row 26)

```
consumes: [
  'community.signal.v1',
  '11.platform.discovery.v1',
  '15.benchmark.head_to_head.v1',
  '17.orchestra.deprecation_proposal.v1',
  'vendor.changelog.poll.v1',          // self-dispatched
]
```

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled-daily-03utc' | 'scheduled-daily-04utc' | 'scheduled-quarterly' | 'event-triggered',
  scheduledAt: ISO8601,
  triggerEvent?: { topic, payload },
  candidates: Array<{
    candidate_id, candidate_name, source, evidence_url,
    observed_capabilities: string[],
    benchmarkScores?: HeadToHeadResult,
    carveoutFlags?: Array<{ source: 'agent-11' | 'agent-14', reason }>,
  }>,
  currentOrchestraComposition: {
    members: Array<{ id, capabilities, lifecycleState }>,
    archived: Array<{ id, archivedAt, archiveReason }>,
  },
  seedListProcessed: boolean,           // false on first cycle only
}
```

### §3.3 Preconditions

- CA-9-A + CA-9-B canonical (per ENTRY 005 — LIVE).
- Agent #11 + #14 carve-out evaluators SHIPPED-GREEN.
- Agent #15 Benchmarking SHIPPED-GREEN (provides condition #2 input).
- `dispatchWithFallback` per CA-11-A.4 available.
- CEO-supplied 13-candidate seed list available on first cycle.

---

## §4 — Output Contract

### §4.1 Produces (7 topics per ENTRY 005 §8.1)

```
produces: [
  '26.orchestra.candidate.v1',
  '26.orchestra.admitted.v1',
  '26.orchestra.candidate_rejected.v1',
  '26.orchestra.candidate_panel_gate.v1',
  '26.orchestra.deprecated.v1',
  '26.orchestra.lifecycle_state_changed.v1',
  '26.orchestra.candidate_reactivated.v1',     // per §CA-9-A.5.1
]
```

### §4.2 Output shape — `26.orchestra.admitted.v1`

```ts
{
  candidate_id: string,
  candidate_name: string,
  admittedAt: ISO8601,
  lifecycleStateBefore: 'Candidate',
  lifecycleStateAfter: 'Trial',                // per §8.1 lifecycle table
  gateResults: {
    rank_score: number,                         // ≥0.70 required
    head_to_head_invocations: number,           // ≥30 required
    capability_gap_capabilities: string[],      // ≥1 required
    carveout_flags: [],                         // MUST be empty
  },
  authorityUsed: ['auto_write_internal', 'requires_human_gate'],   // per CA-9-Q4=(b)
  historyLogEntryRef: string,                   // pointer to CANONICAL_HISTORY append
  at: ISO8601,
}
```

### §4.3 Output shape — `26.orchestra.candidate_panel_gate.v1`

```ts
{
  candidate_id, candidate_name,
  carveoutFlags: Array<{ source: 'agent-11' | 'agent-14', reason, evidence }>,
  proposedAction: 'admit-with-caveat' | 'reject' | 'defer',
  panelConsultationRequired: true,
  ceoArbitrationRequired: boolean,              // true when Panel non-quorum
  at: ISO8601,
}
```

### §4.4 Postconditions

- ColdStore lineage row per decision.
- One-line `docs/CANONICAL_HISTORY.md` SECTION 8 entry + §18.4 pointer per admission (atomic write).
- 5-state lifecycle state machine transitions audited (Trial → Probation → Full member; Probation → Trial demotion; Full member → Deprecated; Archived → Trial reactivation).
- Idempotency: same `candidate_id` within TTL → second emission no-op.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None (always-on). Registered via `hub.registerAlwaysOn('orchestra-research', agent)`. Inngest schedule:

- **Daily 03:00 UTC** — main research loop per §8.1 (aligns with Sprint PROTECT-1 Phase 2)
- **Daily 04:00 UTC** — vendor changelog poll per CA-9-A.2
- **Continuous (push)** — `community.signal.v1` webhook ingestion
- **Quarterly cadence** — Archived-member re-evaluation per §8.1 Re-activation Path (Lovable + Replit)

### §5.2 Upstream feeders

- **Agent #11 Strategic Intelligence** — `11.platform.discovery.v1`.
- **Agent #14 Public Policy** — carve-out flags via joint `11.carveout_flag.v1` + `14.carveout_flag.v1`.
- **Agent #15 Benchmarking** — `15.benchmark.head_to_head.v1`.
- **Agent #17 Product Evolution** — `17.orchestra.deprecation_proposal.v1`.
- Community signal webhooks (curated Slack/Discord per CA-9-A.2).
- Vendor changelog feeds (self-dispatched).

### §5.3 Downstream consumers

- **All other agents** (Orchestra composition is portfolio-wide).
- **Self-Renewal cycle** — `26.orchestra.deprecated.v1` triggers adapter de-listing.
- **Agent #12 Portfolio Risk** — `26.orchestra.deprecated.v1` informs vendor concentration risk.
- **Admin/CEO** via Panel consultations.

### §5.4 Mode behavior

Mode-agnostic — Orchestra management runs regardless of operator mode. Per-product mode dispositions don't affect portfolio-wide Orchestra composition.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent26OrchestraResearch.js` — **~720 LOC** (largest dormant agent).
- `src/lib/agents/agents/__tests__/Agent26OrchestraResearch.test.js` — ~480 LOC.
- `src/lib/agents/agents/orchestraResearch/fourConditionGate.js` — §8.1 gate (pure function).
- `src/lib/agents/agents/orchestraResearch/lifecycleStateMachine.js` — 5-state transitions.
- `src/lib/agents/agents/orchestraResearch/seedListProcessor.js` — CEO-supplied 13-candidate batch.
- `src/lib/agents/agents/orchestraResearch/historyLogWriter.js` — atomic CANONICAL_HISTORY append.

### §6.2 Files to modify (existing)

- `src/lib/agents/_registry.ts` — **CRITICAL: add 26th row** (currently 25 entries; `validateRoster()` line 550 expects 25). Per Locked Rule 2 expansion to 26-agent roster:
  - Update `validateRoster()` to expect 26.
  - Update id-range checks to allow id=26.
  - Add Agent #26 record at lines 312+ with all canonical fields per ENTRY 005.
- `inngest/functions/` — register 4 schedules.

### §6.3 Estimated effort

**~22 W-hours** (largest dormant agent — 4-condition gate + 5-state lifecycle + 7 topic emissions + seed-list batch + CANONICAL_HISTORY writer + dual-authority handling). The dual-authority shape is identical to Agent #3 Self-Renewal Executor per CA-7; pattern is proven, but Agent #26 is the FIRST agent to ship with dual-authority shape at the **primary-agent layer** (Self-Renewal Executor lives in EXECUTOR_REGISTRY sibling namespace).

### §6.4 Key engineering risks

1. **`_registry.ts` 26th row addition** — `validateRoster()` currently enforces exactly 25; Agent #26 charter add requires coordinated update to expectations + tests. Risk of breaking 25 SHIPPED-GREEN agents if not careful.
2. **Dual-authority `BaseAgent.guard()` correctness** — CA-9-B.6 + CA-11-A authority-set-membership pattern is new at the primary-agent layer. Risk of guard-bypass bug. Mitigation: A26-X1 adversarial test explicitly checks `authorityNeeded` set membership rejection.
3. **CANONICAL_HISTORY atomic write** — concurrent admissions could race the append. Mitigation: file-lock + atomic-rename pattern.
4. **Seed-list idempotency** — first-cycle 13-candidate batch must not re-emit on second cycle. Mitigation: `seedListProcessed` flag in ColdStore + `_registry.ts` boot guard.
5. **Lifecycle state machine correctness** — 5 states × 7 transitions = 35 cases; missing transition = bug. Mitigation: state-machine library (e.g. xstate) + exhaustive test coverage.
6. **Adversarial test surface** — Agent #26 controls Orchestra membership; security-critical. ≥12 adversarial cases required per blueprint.

---

## §7 — Security Controls

### §7.1 Credential handling

```
requiredCredentials: ['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY']
```

Memory-only, scrubbed per AUTH_TRAVERSAL_SECURITY_SPEC v3 patterns.

### §7.2 Data exfiltration controls

- Candidate evidence sent to Anthropic / OpenRouter (LLM) + Perplexity (web-grounded research) + ColdStore (internal).
- CANONICAL_HISTORY entries are public-facing — MUST be PII-free + scrubbed before append.
- Admission decisions persisted to internal stores only; never external.

### §7.3 Scope limiting

- Orchestra composition is portfolio-wide (`flowai-only: false` per blueprint — embedded).
- Per-tenant Orchestra composition isolation deferred to per-deployment configuration (multi-tenant FlowAI deployments would each manage their own Orchestra).

### §7.4 Escalation policy

```
escalationPolicy:
  '4-condition gate failure routes to Panel + CEO per Locked Rule 13; ' +
  'auto_write_internal admissions require human gate per CA-9-Q4=(b); ' +
  'Archived-member reactivation requires Panel review per §CA-9-A.5.1.'
```

Concrete enforcement:

- Gate failures → emit `26.orchestra.candidate_rejected.v1` OR `26.orchestra.candidate_panel_gate.v1` per failure reason.
- Carve-out flag from #11 OR #14 → ALWAYS panel-gate; never auto-admit.
- Dual-authority guard rejects emissions declaring `authorityNeeded: [auto_write_internal]` without `[requires_human_gate]` (load-bearing per CA-9-Q4=(b)).

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities (= canonical Phase 1)

- Daily 03:00 UTC discovery loop (§8.1 four-condition gate)
- Daily 04:00 UTC vendor changelog poll
- Continuous community signal webhook ingestion
- Quarterly Archived-member re-evaluation
- 7 `26.orchestra.*` topic emissions
- 5-state lifecycle state machine (Trial / Probation / Full member / Deprecated / Archived)
- Seed-list processor for first-cycle CEO 13-candidate batch
- CANONICAL_HISTORY one-line append per admission
- Dual-authority charter at primary-agent layer (first of its kind)

### §8.2 Deferred to Phase 2+

- ML-driven candidate ranking (Phase 1 uses Locked Rule 18 formula + LLM classification)
- Real-time vendor changelog event streams (Phase 1 is 24h poll)
- Per-deployment Orchestra isolation in multi-tenant FlowAI (Phase 1 single-Orchestra-per-deployment)

### §8.3 What this agent CANNOT do — ever

- **Never auto-admits candidates with carve-out flags.** Panel + CEO gated.
- **Never bypasses human gate for auto_write_internal admissions.** CA-9-Q4=(b) load-bearing.
- **Never tampers with CANONICAL_HISTORY** beyond canonical one-line append per admission.
- **Never deprecates members without 60-day evidence + Panel review** per CA-9-B + Locked Rule 13.

---

## §9 — Acceptance Criteria

1. **AC-26.1** — Seed-list batch (13 candidates) processed on first cycle; each emits `26.orchestra.candidate.v1` with `source: "ceo_seed_list_2026-05-15"`. A26-N1.
2. **AC-26.2** — Candidate clearing all 4 gate conditions → `26.orchestra.admitted.v1` + lifecycle `Trial` + CANONICAL_HISTORY entry written. A26-N2.
3. **AC-26.3** — Candidate failing rank threshold → `26.orchestra.candidate_rejected.v1` reason `below_threshold`. A26-N3.
4. **AC-26.4** — Archived member (Lovable / Replit) re-evaluated; clears gate → `26.orchestra.candidate_reactivated.v1`; lifecycle `Archived → Trial`. A26-N4.
5. **AC-26.5** — Candidate at exactly `rank_score=0.70` → admitted (inclusive boundary). A26-E1.
6. **AC-26.6** — AWS-bound seed candidate (Kiro, Q Developer) → `26.orchestra.candidate_panel_gate.v1` regardless of rank_score. A26-E3.
7. **AC-26.7** — Dual-authority violation: plan declares `authorityNeeded: [auto_write_internal]` without `[requires_human_gate]` → BaseAgent.guard() rejects per CA-9-Q4=(b). A26-X1.
8. **AC-26.8** — Prompt-injection in candidate evidence does NOT alter 4-condition gate logic. A26-X2.
9. **AC-26.9** — Replay attack: same `candidate_id` processed twice within TTL → idempotent (no duplicate admission). A26-X4.
10. **AC-26.10** — Cross-tenant tampering with seed list blocked (`flowai-internal` audit-write only). A26-X5.
11. **AC-26.11** — `_registry.ts` 26th row addition does NOT break the 25 SHIPPED-GREEN agents' `validateRoster()` invariant (regression test).

---

## §10 — Panel Questions

### G26-Q1 — `_registry.ts` 26th row addition strategy

Adding Agent #26 requires `validateRoster()` update (currently expects 25). Right approach?

- (a) Single-commit update: bump expectations + add row + update tests atomically.
- (b) Two-commit: bump `validateRoster()` to expect 25-or-26; then add row.
- (c) Feature-flag the registry expansion — `EXPECT_26_AGENTS` env var.
- (d) Refactor `validateRoster()` to read expected count from a CHARTER_VERSION constant.
- (e) INSUFFICIENT_INFORMATION.

### G26-Q2 — Dual-authority at primary-agent layer precedent

Agent #26 is the FIRST primary agent to ship with dual-authority charter. Right precedent?

- (a) Yes — CA-9-Q4=(b) ratified the pattern; precedent canonical.
- (b) Reconsider — primary-agent dual-authority is architecturally risky; prefer EXECUTOR_REGISTRY sibling pattern (per CA-7) instead.
- (c) Ship Agent #26 with primary-agent dual-authority but add explicit Panel-review checkpoint after 30 days.
- (d) Document explicit reasoning per CA-9-Q4=(b); add canonical doc explaining when dual-authority is appropriate at primary-agent layer vs Executor.
- (e) INSUFFICIENT_INFORMATION.

### G26-Q3 — Quarterly Archived-member re-evaluation cadence

Per §CA-9-A.5.1 recommended quarterly. Right?

- (a) Quarterly — current per blueprint.
- (b) Annual — slower; lower Panel overhead.
- (c) Monthly — faster; higher Panel overhead.
- (d) Event-driven on `community.signal.v1` events mentioning Archived members.
- (e) INSUFFICIENT_INFORMATION.

### G26-Q4 — CANONICAL_HISTORY atomic-write mechanism

Risk: concurrent admissions race the file append. Right mechanism?

- (a) File-lock + atomic-rename pattern (current plan).
- (b) Append-via-Supabase-table + periodic flush to markdown.
- (c) Inngest serialized job — one admission at a time; queue subsequent.
- (d) Defer atomic concerns — single Inngest job serializes naturally.
- (e) INSUFFICIENT_INFORMATION.

### G26-Q5 — Adversarial test count

Blueprint says ≥12 adversarial cases (most of any agent). Right floor?

- (a) ≥12 — current; appropriate for security-critical role.
- (b) ≥15 — even more rigorous given dual-authority precedent-setting.
- (c) ≥8 — match other agents' standard (3 nominal + 3 edge + 3 adversarial).
- (d) Tiered — ≥10 for Phase 1 + ≥15 by 30-day post-ship review.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #26 Orchestra Research Agent engineering spec. MOST BUILD-READY of the dormant set; charter fully canonical per ENTRY 005.*
