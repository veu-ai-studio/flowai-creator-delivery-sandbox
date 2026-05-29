# W03 Standing Operating Protocol — CANONICAL (Maximum-Oversight Configuration)

**Status:** **CANONICAL** as of 2026-05-11. CEO-approved. **Maximum-oversight configuration.** Supersedes `docs/W03_STANDING_OPERATING_PROTOCOL_DRAFT_v1.md` (deleted on promotion). All 4 Panel-surfaced decisions resolved (see Synthesis Metadata at end of file). CEO chose maximum oversight over Panel-recommended leaner variants on Decisions 1, 3, and 4.
**Source:** Synthesis of 5-reviewer panel consultation in `docs/panel-consultations/w03-self-governance-2026-05-11.md`, with CEO dispositions applied 2026-05-11.
**Reviewers:** Slot 1 = Claude Opus 4.7 · Slot 2 = GPT-5.5 · Slot 3 = Gemini 2.5 Pro · Slot 4 = Perplexity Sonar Pro Search · Slot 10 = GPT-4o (web-grounded).
**Purpose:** Make W03 rule-compliance monitoring functional **today**, using only what is already built — Agent #3 Self-Renewal (SHIPPED-GREEN, recommend_only, step 6 `govern`), the 10-AI Panel (7/10 LIVE; 8/10 LIVE on slim-bundle dispatches), the audit-log schema, and existing scripts. The protocol auto-sunsets when the W3 audit stack (reportGenerator + auditOfAuditor + defectDatabase + rubricRunner + migration 0010) ships.

---

## Section 1 — Immediate activations (no code needed, today)

**CONSENSUS (5 of 5).** Activate the **W03 Self-Governance Loop** by gluing three already-shipped components:

1. **W03 turn capture (filesystem only).** At end of every W03 turn, W03 writes its outgoing message + active rule list + dispatch context into `docs/w03-turns/{turnId}.md`. No DB change required.
2. **Agent #3 Self-Renewal as compliance reviewer.** Manually (or via a thin shell wrapper around the existing OrchestratorHub step 6 `govern` invocation) dispatch the per-turn file to Agent #3. Its existing `recommend_only` output envelope becomes the first-pass compliance signal.
3. **`flowai_audit_log` as durable compliance ledger.** Both Agent #3's verdict AND the original W03 turn hash get appended under topic `w03_self_audit_{turnId}` — append-only file or DB row, whichever the audit-log adapter already supports.
4. **Panel-lite escalation for flagged turns.** Any Agent #3 verdict ≥ AMBER triggers an on-demand dispatch of the turn bundle to the 7/10 LIVE Panel via the existing panel-runner pattern (`scripts/run-panel-smoke.mjs`-class). Decision logged under topic `panel_w03_compliance_review_{turnId}`.
5. **CEO-visible signal: compact end-of-turn footer.** W03 appends a one-line **W03 Compliance Sentinel** footer to every CEO-facing turn (no "material vs routine" gate per CEO Decision 4 — every CEO-facing turn): `PASS | WARN | ESCALATE`, top risk, CEO/Panel escalation flag, audit artifact id.

**Canonical topic:** **`w03.turn.completed`** (CEO Decision 2 — see Section 3 and Synthesis Metadata).

**W03 RECOMMENDATION (actionable today):**
- W03 begins emitting the per-turn file + Sentinel footer **immediately**, before any code work.
- A 1-page shell wrapper (~30 minutes of CEO-side glue work) routes the file to Agent #3 + Panel-lite.
- Daily roll-up is human-readable from the audit-log within hours.

---

## Section 2 — Build priorities (CEO Decision 1 — BOTH paths canonical)

**CANONICAL (CEO Decision 1, 2026-05-11): adopt BOTH the deterministic per-turn probe AND the daily digest generator as canonical build priorities, in this order.** The Panel split (4-of-5 probe-first, Slot 3 alone for digest-first) is reconciled by sequencing the probe FIRST as the immediate-drift-detection build, then the digest SECOND once the probe has been running ≥3 days and producing events the digest can aggregate.

### Build 1 — Per-Turn Deterministic Compliance Probe (FIRST PRIORITY, single dispatch)

**Canonical filename: `scripts/w03ComplianceProbe.mjs`** (synthesized from the 4-reviewer cluster — Slot 1's `w03ComplianceProbe.mjs`, Slot 2's `w03-compliance-snapshot.mjs`, Slot 4's `w03-compliance-scanner.mjs`, Slot 10's `w03_compliance_scanner.js`).

**Why deterministic-first:** false-positive noise from LLM judges destroys trust faster than missed catches at this scale; deterministic regex/structural heuristics produce a CEO-readable verdict in seconds and feed cleanly into the eventual W3 `rubricRunner`. Agent #3 (LLM judge) layers on top of the deterministic probe, not in place of it.

**Function signatures (canonical):**

```js
// Loads canonical rule set from canonical docs + (when available) the
// 17 Locked Rules + 13 CEO Preferences file.
export function loadRuleset({ lockedRulesPath, preferencesPath, ssotPath, planPath }) → Ruleset

// Pure function — deterministic regex/structural/heuristic checks per rule.
export function probeTurn({ turnText, ruleset, context }) → ProbeResult

// Wraps probeTurn + Agent #3 (recommend_only, SYNCHRONOUS — every turn,
// no exemptions per CEO Decision 4) + Panel-lite quorum on AMBER/RED.
// Merges all signals into one envelope.
export async function runComplianceProbe({ turnId, turnText, ruleset }) → ComplianceReport

// Writes to flowai_audit_log + emits a single-page markdown summary
// under reports/w03-compliance/{date}.md.
export async function emitReport({ report, outDir }) → { auditLogId, reportPath }

// CLI entrypoint.
export async function main(argv = process.argv.slice(2))
```

**`ProbeResult` shape:**
```js
{
  turnId, timestamp,
  ruleChecks: [{ ruleId, ruleName, status: 'PASS'|'FAIL'|'UNCHECKABLE', evidence, severity }],
  heuristicFlags: [{ flag, evidence }],
  score: 0..100,
  verdict: 'GREEN'|'AMBER'|'RED'
}
```

**Deterministic checks (the high-leverage, build-today catches — all 5 reviewers converge on these):**
1. **`[ROUTINE]` tag frequency** over rolling 10-turn window — flag if > 30–40%.
2. **Proactive-scan absence** — multi-turn dispatch (≥3 turns) without a `## Self-Scan` block in W03's output.
3. **Tunnel-vision** — dispatch domain keyword match against cross-cutting Locked Rules; flag any Locked-Rule absent from W03's reasoning trail.
4. **Authority-tier violation** — `recommend_only` agent output framed in imperative/action-verb shape without explicit gate language.
5. **Anti-drift hierarchy inversion** (Locked Rule L4 / EP1) — flag any turn citing memory over canonical without an explicit `[CONFLICT-FLAGGED]` block.

**CEO-visible output:** one daily file `reports/w03-compliance/{date}.md` containing GREEN/AMBER/RED verdict, top-3 violations, audit-log link, 24h-trend line. Postable to CEO terminal.

### Build 2 — Daily Compliance Digest Generator (SECOND PRIORITY, follow-up dispatch after Build 1 has run ≥3 days)

**Canonical filename: `scripts/generate_w03_compliance_digest.mjs`** (Slot 3's original proposal; promoted from dissent to canonical because CEO chose BOTH paths).

**Trigger to ship Build 2:** Build 1 has been running ≥3 days AND has generated ≥30 turn-level probe events AND has produced ≥3 daily-report files. Build 2 aggregates that history.

**Function signatures (canonical):**

```js
/**
 * @param {string} since - ISO 8601 timestamp to start search from.
 * @returns {Promise<Array<object>>} - Array of w03_compliance_review events.
 */
async function fetchComplianceEvents(since);

/**
 * @param {Array<object>} events - The events from fetchComplianceEvents.
 * @returns {string} - A markdown-formatted report.
 */
function generateMarkdownDigest(events);
```

**Output shape (CEO-readable markdown):**
```md
# W03 Compliance Digest: 2026-05-12 08:00 UTC

**Summary (Last 24 Hours):** 152 Turns Audited | 4 Non-Compliant | 1 Panel Escalation

---

### Non-Compliant Dispatches

| Timestamp | Dispatch ID | Severity | Violated Rule | Agent #3 Recommendation | Panel Verdict |
|---|---|---|---|---|---|
| 07:45:11 | d-a4b1c2 | HIGH | L4: Anti-Drift | "Output contradicts canonical pricing in E4." | CONFIRMED |
| 06:15:33 | d-f8e9d0 | MED | MG4: Escalation | "Failed to escalate on irreversible action." | PENDING |
```

**Postable to CEO via email or Slack message after Build 1 has accumulated event history.**

**Why both, in this order:** Build 1 produces the per-turn signal that detects drift immediately; Build 2 produces the rolling trend signal that detects drift *patterns* over time. Build 1 catches today's regression; Build 2 catches the slow drift that no single turn surfaces. Neither replaces the other.

---

## Section 3 — Agent #3 wiring specification (CEO Decision 4 — SYNCHRONOUS, no exemptions)

**CONSENSUS (5 of 5) on the wiring shape; CEO override on sync-vs-async.** Agent #3 subscribes to the W03-turn-completion topic through the existing OrchestratorHub step 6 `govern` flow. **No code change to Agent #3 itself** — only an `AgentRegistry` topic addition + envelope adapter + CEO-notice emitter. Agent #3's 35/35 test contract is preserved.

**Canonical topic:** **`w03.turn.completed`** (CEO Decision 2, 2026-05-11). Slot 3's alternate `w03_dispatch_govern_request` and Slot 4's alternate `w03.output` are **OVERRULED** for naming consistency with existing OrchestratorHub publish/subscribe conventions.

**Input envelope Agent #3 receives — `W03TurnEnvelope`:**
```js
{
  turnId: string,             // ULID
  parentDispatchId: string,
  w03OutputMarkdown: string,  // raw W03 reply (the candidate, BEFORE delivery to CEO)
  activeRules: { locked: [...17], preferences: [...13] },
  recentTurnHashes: string[], // last 10 turns for rolling-window heuristics
  canonicalSources: { ssotPath, planPath },
  context: { dispatchTag, mode, ceoPresent: bool, routineTagUsed: bool, routineTagJustification: string|null }
}
```

This matches Agent #3's existing artifact-review contract; only field-name aliasing required — **no rebuild, no test churn.**

**Output envelope Agent #3 returns — `ComplianceRecommendation`:**
```js
{
  turnId,
  authority: 'recommend_only',  // unchanged — preserves SHIPPED-GREEN status
  verdict: 'GREEN'|'AMBER'|'RED',
  score: 0..100,
  violations: [
    { ruleId, severity: 'HIGH'|'MED'|'LOW', evidence, recommendedRemediation }
  ],
  proactiveFlags: [...],            // routine_tag_overuse, proactive_scan_missing, tunnel_vision, …
  driftSignals: { proactiveScanFail: bool, tunnelVision: bool, routineOveruse: bool, sourceHierarchyFail: bool, escalationMiss: bool },
  confidence: 0..100,
  evidenceLayer: 'L1'|'L2'|'L3'|'L4'|'L5',
  requiresCeoEscalation: bool,
  requiresPanelEscalation: bool,
  auditLogTopic: 'w03_self_audit_{turnId}'
}
```

### Timing model — SYNCHRONOUS for every W03 → CEO message (CEO Decision 4, 2026-05-11)

CEO override on the Panel's hybrid sync-vs-async recommendation: **ALL W03 → CEO messages MUST be reviewed synchronously by Agent #3 BEFORE delivery. No async/background reviews. No exemptions for routine messages.**

Operational flow on every turn:

1. W03 drafts the CEO-facing reply.
2. W03 publishes `w03.turn.completed` with the draft as `w03OutputMarkdown`.
3. **W03 blocks on Agent #3's `ComplianceRecommendation` return** — the draft is NOT delivered to CEO until Agent #3 responds.
4. If verdict is GREEN → W03 attaches Sentinel footer marked `Agent #3 review: complete · PASS` and delivers to CEO.
5. If verdict is AMBER → W03 must self-correct OR include the AMBER violation in the Sentinel footer with explicit acknowledgement, then deliver.
6. If verdict is RED → W03 HALTS delivery. Issues a `[CEO-ESCALATION: red-compliance-verdict]` notice with the violation, awaits CEO acknowledgment before any further dispatch.

**Latency budget:** Agent #3's existing recommend-only path on a turn-sized artifact is sub-30s in practice. Acceptable as a synchronous gate.

**Slot 2's hybrid sync-vs-async cutoff (governance-critical sync / material async / routine async) — OVERRULED by CEO.** The Panel's premise that async review is acceptable for "non-material" turns assumed reviewer latency would dominate user-facing delay; CEO has accepted the latency cost in exchange for guaranteed pre-delivery review on every turn.

### How the result reaches CEO

- **GREEN** → Sentinel footer in CEO reply: `PASS · Agent #3 review: complete`. No CEO interrupt.
- **AMBER** → Sentinel footer: `WARN · top violation: <one line>`. CEO sees the violation inline.
- **RED + any Locked-Rule violation** → MG4 escalation trigger #10 (unresolved blocking dissent on Locked Rules). **W03 HALTS the next dispatch until CEO acknowledgment.**

**Total wiring work:** one `AgentRegistry` topic addition + one envelope adapter + one CEO-notice emitter + one synchronous-wait wrapper around the W03 reply path. **Single dispatch.**

---

## Section 4 — Top 5 dangerous gaps ranked by severity

All 5 reviewers ranked these violations as the most dangerous if undetected. Consensus top 5 (every item below has ≥3-reviewer support; items 1–4 have unanimous 5/5 support):

| # | Violation | Severity | Likelihood | Detection hint (deterministic) |
|---|-----------|----------|------------|--------------------------------|
| 1 | **Anti-drift hierarchy inversion** (Locked Rule L4 / EP1) — W03 cites session memory over canonical docs or code without surfacing the conflict. | HIGH | **HIGH** | Memory citation in turn AND canonical exists for same claim AND no `[CONFLICT-FLAGGED]` block. **Consensus: 5/5.** |
| 2 | **Proactive-scan omission** on multi-turn operational problems — W03 fails to scan its own conversation for cross-cutting rule application. | HIGH | **HIGH** (already observed) | ≥3 turns on one dispatch without a `## Self-Scan` block in W03 output. **Consensus: 5/5.** |
| 3 | **Tunnel-vision rule-dropping** — W03 focuses on the dispatch surface and silently drops cross-cutting Locked Rules (evidence tagging, confidence calibration, audit-log obligation, etc.). | HIGH | **HIGH** (already observed) | Dispatch domain regex hits a Locked-Rule keyword set; rules with matching keywords absent from W03's reasoning trail. **Consensus: 5/5.** |
| 4 | **`[ROUTINE]` low-friction tag abuse** — bypasses full peer review / 95/95 / 6-step Clearance on dispatches that touch Locked-Rule domains. | HIGH | **HIGH** (already observed) | `[ROUTINE]` tag rate >30–40% over rolling 10-turn window OR `[ROUTINE]` applied to a turn touching Locked-Rule domains. **Consensus: 5/5.** |
| 5 | **CEO escalation miss (MG4)** — W03 makes/recommends an action matching one of the 12 canonical MG4 triggers (revenue split, authority-tier, Locked-Rule amendment, 95/95 exception, legal/IP/regulatory, irreversible action, etc.) without explicit `[CEO-ESCALATION]` marker. | HIGH | **MED-HIGH** | MG4-trigger keyword regex match on turn content, `[CEO-ESCALATION]` marker absent. **Consensus: 5/5.** |

**Honorable mentions (≥3-reviewer support, surfaced for completeness):**
- **Authority-tier overreach** — W03 frames `recommend_only` agent output as imperative/directive. (Slot 1 #3, Slot 2 #6, Slot 3 #3, Slot 4 #6 — 4/5)
- **Silent conflict resolution** — W03 resolves code/canonical/memory disagreement without surfacing the conflict. (Slot 1 #11, Slot 2 #7, Slot 4 #4, Slot 10 #4 — 4/5)
- **Confidence + evidence-layer triplet omission** (Locked Rule EP3) — outputs lacking the `confidence | layer | authority` triplet. (Slot 1 #9, Slot 2 #12, Slot 10 #6 — 3/5)
- **Three-gate independence conflation** (Locked Rule L5) — one governance gate treated as subsuming another. (Slot 1 #6, Slot 2 #10 — 2/5)

---

## Section 5 — Standing protocol: 18-item maximalist checklist (CEO Decision 3)

**CANONICAL (CEO Decision 3, 2026-05-11): adopt the 18-item maximalist checklist** drawn from Slot 2's proposal in `docs/panel-consultations/w03-self-governance-2026-05-11.md`. The 11-item synthesized variant and Slot 4's 7-item lean variant are **OVERRULED** in favor of maximum coverage against the observed drift pattern.

**Paste into W03's system prompt under header `## STANDING W03 SELF-GOVERNANCE PROTOCOL (in effect until W3 audit stack ships).`**

Each item names: **the check**, **its trigger**, **the artifact** W03 must produce to demonstrate compliance. Items appear in execution order (classification → scans → gates → emission).

```
1. CLASSIFY THE TURN
   Trigger:  Every W03 response.
   Action:   Determine whether the turn is governance, code, deployment,
             audit, product integrity, money, legal/IP/regulatory,
             tenant isolation, authority, or CEO-escalation related.
   Artifact: turnClass = routine | material | governance-critical.
   Fails if: turnClass absent OR misclassified for the topic.

2. DEFAULT AWAY FROM [ROUTINE] ON GOVERNANCE WORK
   Trigger:  Any use of [ROUTINE].
   Action:   Confirm the turn does not touch Locked Rules, CEO
             Preferences, authority, deployment, audit, money,
             legal/IP/regulatory exposure, product integrity, tenant
             isolation, or Panel/CEO escalation. If any is true,
             downgrade to [STANDARD] (full review).
   Artifact: routineTagJustification = explicit rationale string,
             required if [ROUTINE] used.
   Fails if: [ROUTINE] used without justification OR justification
             falsely claims a non-touched domain.

3. RUN SOURCE-OF-TRUTH HIERARCHY CHECK
   Trigger:  Any factual, architectural, or governance claim.
   Action:   Apply the hierarchy: code > canonical docs > user-curated
             memory > auto-memory. Tag each substantive claim with its
             source basis. Raise [CONFLICT-FLAGGED] if a higher-priority
             source contradicts the claim — never silent-resolve.
   Artifact: sourceBasis = code | canonical | user-memory |
             auto-memory | unknown (per claim).
   Fails if: substantive claim present without source tag OR memory cite
             present AND canonical exists AND no [CONFLICT-FLAGGED]
             block.

4. SCAN AGAINST LOCKED RULES AND CEO PREFERENCES
   Trigger:  Every material or governance-critical turn.
   Action:   Explicitly ask: "Does this answer violate or bypass any of
             the 17 Locked Rules or 13 CEO Preferences?" Iterate each;
             mark applicable rules.
   Artifact: lockedRuleScan = pass | warn | escalate, with applied
             rule IDs listed.
   Fails if: block missing OR rule IDs absent that the dispatch domain
             keyword-matches.

5. SCAN AGAINST LAYER 1 AND LAYER 2 CANONICAL DOCS
   Trigger:  Every material or governance-critical turn.
   Action:   Verify consistency with docs/FLOWAI_SSOT.md and
             docs/FLOWAI_IMPLEMENTATION_PLAN.md.
   Artifact: canonicalConsistency = pass | warn | escalate.
   Fails if: claim contradicts canonical AND no flag block raised.

6. SCAN MG4 CEO ESCALATION TRIGGERS
   Trigger:  Every material or governance-critical turn.
   Action:   Match the turn content against the 12 canonical MG4
             triggers (Locked Rule amendment, revenue-split deviation,
             authority-tier change, cross-product breakage,
             legal/IP/regulatory, 95/95 exception, Clearance override,
             irreversible action, major customer commitment,
             unresolved Locked-Rule dissent, Panel protocol change,
             marketplace-intel staleness >30 days). If any trigger
             keywords match, mark [CEO-ESCALATION: trigger #N] at top
             of turn and DO NOT proceed past current turn without CEO
             acknowledgment.
   Artifact: ceoEscalationRequired = yes | no + reason.
   Fails if: trigger keywords present, marker absent.

7. SCAN PANEL ESCALATION TRIGGERS
   Trigger:  Any suspected Locked Rule issue, dissent-worthy governance
             call, W03 self-governance issue, or high-impact uncertainty.
   Action:   Determine whether 7/10 Panel review is required.
   Artifact: panelEscalationRequired = yes | no + proposed review topic.
   Fails if: high-impact uncertainty present, no Panel-trigger decision
             recorded.

8. CHECK AUTHORITY BOUNDARIES
   Trigger:  Any recommendation involving agents, automation, deployment,
             fixes, or governance enforcement.
   Action:   Confirm no component is described as having more authority
             than shipped. Agent #3 remains recommend_only. W3 audit
             infrastructure is not shipped. Preserve advisory framing
             on recommend_only agent output — never imperative-shape
             its recommendations.
   Artifact: authorityCheck = pass | warn.
   Fails if: imperative verbs / file-writes proposed under a
             recommend_only attribution.

9. CHECK SHIPPED-VS-PLANNED STATUS
   Trigger:  Any statement about infrastructure capability.
   Action:   Mark whether the capability is shipped-green, live, being
             built, dormant, deferred, or canonical-only.
   Artifact: buildStateCheck = pass | warn.
   Fails if: planned capability described as shipped, or vice-versa.

10. CHECK FOR TUNNEL VISION
    Trigger:  Every multi-turn operational answer.
    Action:   Ask: "Did I answer only the local dispatch while dropping
              cross-cutting governance requirements?"
    Artifact: tunnelVisionCheck = pass | warn (with one omitted-risk
              note if applicable).
    Fails if: cross-cutting Locked Rule applies, was not addressed,
              and no warn note recorded.

11. CHECK PROACTIVE SELF-SCAN COMPLETION
    Trigger:  End of every material or governance-critical answer.
              Also when turn count on same dispatch ≥3.
    Action:   Confirm W03 performed the compliance scan before
              finalizing. For multi-turn dispatches, review prior
              turns for rule violations BEFORE producing new output.
    Artifact: proactiveScanCompleted = yes | no.
              ## Self-Scan block at end of turn listing applied rule
              IDs and any flags raised from prior-turn review.
    Fails if: block missing OR ≥3-turn dispatch missing the prior-
              turn review.

12. INVOKE AGENT #3 SELF-RENEWAL REVIEW (SYNCHRONOUS — CEO Decision 4)
    Trigger:  EVERY W03 → CEO message. No exemptions.
    Action:   Send W03 output envelope (W03TurnEnvelope per Section 3)
              to OrchestratorHub step 6 govern for Agent #3
              recommendation-only review. BLOCK on Agent #3 response
              before delivering the message to CEO.
    Artifact: agent3Review = pass | warn | escalate (NEVER 'pending'
              for delivered messages — pending means undelivered).
    Fails if: turn delivered to CEO without agent3Review = complete.

13. PRODUCE AUDIT-LOG-COMPATIBLE ARTIFACT
    Trigger:  Every material or governance-critical answer.
    Action:   Create a minimal audit record even before W3 ships.
    Artifact: w03_compliance_tripwire_{timestamp} with dispatchId,
              ruleScan, agent3Review status, escalation status,
              and top finding.
    Fails if: turn ends without filesystem entry OR audit-log topic
              w03_self_audit_{turnId}.

14. ADD CEO-VISIBLE COMPLIANCE FOOTER
    Trigger:  Every CEO-facing answer (no material/routine gate per
              CEO Decision 4 — every CEO-facing turn).
    Action:   Append the compact W03 Compliance Sentinel footer.
    Artifact: Footer:
              **W03 Compliance Sentinel:** PASS | WARN | ESCALATE
              Agent #3 review: complete
              Top risk: <one-line risk or "none detected">
              CEO escalation: yes | no
              Panel escalation: yes | no
              Audit artifact: <id>
    Fails if: CEO-facing turn delivered without the footer.

15. CORRECT IMMEDIATELY ON WARN OR ESCALATE
    Trigger:  Agent #3, self-scan, probe, or Panel flags WARN,
              ESCALATE, or BLOCK_RECOMMENDED.
    Action:   Do not silently continue. Issue a correction,
              escalation, or hold recommendation BEFORE delivering
              the current turn.
    Artifact: w03_correction_{dispatchId}.
    Fails if: WARN/ESCALATE/BLOCK_RECOMMENDED returned and turn
              delivered without correction or [CEO-ESCALATION]
              acknowledgement.

16. ESCALATE REPEATED DRIFT
    Trigger:  Same drift type appears twice in a session or three
              times in a week.
    Action:   Route to 7/10 Panel review.
    Artifact: panel_w03_drift_review_{date}.
    Fails if: drift recurrence threshold met, no Panel dispatch
              recorded.

17. FREEZE [ROUTINE] FOR W03 GOVERNANCE UNTIL CLEARED
    Trigger:  Now until the W3 audit stack ships AND Panel clears
              the freeze.
    Action:   Treat W03 governance monitoring, rule compliance,
              CEO escalation, and audit protocol as non-routine
              by default.
    Artifact: routine_freeze_active = true.
    Fails if: [ROUTINE] applied to a W03-self-governance dispatch
              while freeze is active.

18. END EVERY GOVERNANCE-CRITICAL TURN WITH A COMPLIANCE STATEMENT
    Trigger:  Governance-critical answer.
    Action:   State whether the answer is compliant, uncertain, or
              escalated under this protocol.
    Artifact: Final line:
              > Compliance status: PASS | WARN | ESCALATE under
              > W03 Standing Operating Protocol (max-oversight).
    Fails if: governance-critical turn ends without the statement.
```

### Suspension + sunset

This protocol may **NOT** be suspended unilaterally by W03. Any proposal to skip an item requires `[CEO-ESCALATION: protocol-suspension]` and explicit CEO acknowledgment.

This entire protocol auto-sunsets when migration 0010 lands **AND** `reportGenerator + auditOfAuditor + defectDatabase + rubricRunner` are all SHIPPED-GREEN — at which point the W3 stack assumes these duties and this prompt block is removed.

**Why this protocol works as a stopgap:** every check in items 1–11 + 14 + 17 + 18 is **performable by W03 itself in-turn** (no external infrastructure required); items 12 + 13 + 15 + 16 lean on already-shipped components (Agent #3, audit log, the probe from Section 2, the 7/10 LIVE Panel); the suspension clause prevents the protocol from quietly eroding — which is exactly the failure mode that produced the current drift. The protocol is designed to **die on its own** when the real W3 stack lands.

---

## Synthesis Metadata

- **Reviewers used:** 5 of 7 attempted LIVE slots in the source consultation (Slots 1, 2, 3, 4, 10). Slots 6 + 7 (GitHub Models) failed with HTTP 413 due to free-tier 8K-token request cap on the source-consultation bundle. Slot 5 (Vercel v0) DEFERRED for daily-quota exhaustion. Slots 8 + 9 (headless Base44 + Replit) DEFERRED — Playwright codegen pending.
- **Consensus rates across the 5 sub-questions of the source consultation:**
  - § 1 (IMMEDIATE): **5 of 5** on the loop shape.
  - § 2 (FIRST BUILD): 4-of-5 probe-first, Slot 3 alone for digest-first. **CEO Decision 1 reconciled the split by adopting BOTH as canonical builds in sequence.**
  - § 3 (WIRING): **5 of 5** on the topic-subscription pattern. **CEO Decision 2 chose `w03.turn.completed` as the canonical topic. CEO Decision 4 chose SYNCHRONOUS Agent #3 review on every turn, no exemptions.**
  - § 4 (GAPS): **5 of 5** on the top 5 violations.
  - § 5 (PROTOCOL): **CEO Decision 3 chose the 18-item maximalist checklist** drawn from Slot 2's proposal. The 11-item synthesized variant and Slot 4's 7-item lean variant are OVERRULED.
- **CEO FLAGS — ALL FOUR RESOLVED BY CEO (2026-05-11). Maximum-oversight chosen over Panel recommendations on Decisions 1, 3, and 4.**
  - **Decision 1 (§ 2 BUILD PRIORITY):** Adopt BOTH the deterministic per-turn probe AND the daily digest generator as canonical builds. Probe first (single dispatch), digest second (after probe ≥3 days). Slot 3's digest-first preference and the 4-of-5 probe-only synthesized recommendation are both honored.
  - **Decision 2 (§ 3 TOPIC NAME):** `w03.turn.completed` is canonical. Slot 3's `w03_dispatch_govern_request` and Slot 4's `w03.output` are OVERRULED.
  - **Decision 3 (§ 5 PROTOCOL ITEM COUNT):** 18-item maximalist checklist (Slot 2) is canonical. The 11-item synthesized variant and Slot 4's 7-item lean variant are OVERRULED. CEO chose maximum coverage over the Panel-synthesized leaner floor.
  - **Decision 4 (§ 3 SYNC VS ASYNC):** ALL W03 → CEO messages reviewed synchronously by Agent #3 BEFORE delivery. No async/background reviews. No exemptions for routine messages. The Panel's hybrid sync-for-critical-async-for-routine cutoff (4-of-5 reviewer recommendation) is OVERRULED. CEO has accepted the latency cost in exchange for guaranteed pre-delivery review on every turn.
- **Generated:** 2026-05-11, `w03-self-governance-2026-05-11.md` as input.
- **Status:** **CANONICAL.** Promoted from `docs/W03_STANDING_OPERATING_PROTOCOL_DRAFT_v1.md` to `docs/W03_STANDING_OPERATING_PROTOCOL.md` after CEO disposition of the 4 flagged items.
