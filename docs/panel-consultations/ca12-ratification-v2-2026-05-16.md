# Panel Consultation — CA-12 v2 Three-Mode + Two-Dimension Governance Architecture — ADVERSARIAL RE-RATIFICATION (2026-05-16)

**Mode:** ADVERSARIAL — locked W5b format (precondition: `b1cd827` / `ad2ab28` / `3f9dede` MET).

**Spec under re-ratification:** `docs/specs/SSOT_AMENDMENT_CA12_DRAFT.md` (v2, commit `ce13629`, 509 lines).
**v1 verdict (for context):** NOT_RATIFIED — every position defeated; 26 distinct objections; 19% drafted alignment (`5c2324f`).

**Started:** 2026-05-16T21:47:20.082Z
**Finished:** 2026-05-16T21:51:37.788Z
**Bundle size:** 63395 chars (compact §6+§9+§10+§11+§22+§25 canonical excerpt + full v2 spec).
**Panel audit:** {"providerCounts":{"openai":1,"anthropic":1,"meta-llama":2,"mistralai":1,"cohere":1,"minimax":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"auditPass":true}
**Seed:** `ca12-v2-ratification-2026-05-16`

---

## 🚨 PLAIN RATIFICATION VERDICT

**Status:** `NOT_RATIFIED`

CA-12 v2 NOT ratified — 6 question(s) still lack a clear Panel majority on the v2-drafted position.

**Remaining conditions:**
1. **G-Q2-v2** — Authority dimensions (v2 three sub-dimensions: Build / Deploy / Operational)
   - Verdict: `SPLIT`. v2 position (key `GQ2v2-THREE`) did NOT reach Panel quorum. top tie at 3 between GQ2v2-THREE / GQ2v2-TWO.

2. **G-Q3-v2** — Authority ceiling per-product per-mode per-dimension (4×3 JSONB matrix)
   - Verdict: `PLURALITY_GQ3v2-FINE`. v2 position (key `GQ3v2-FINE`) did NOT reach Panel quorum. 5 of 8 on GQ3v2-FINE (below 7/10 quorum).

3. **G-Q4-v2** — Mode 2 SUB-2B deferral (v2 removed from SSOT entirely; catalogued as future capability)
   - Verdict: `PLURALITY_GQ4v2-DEFER`. v2 position (key `GQ4v2-DEFER`) did NOT reach Panel quorum. 5 of 8 on GQ4v2-DEFER (below 7/10 quorum).

4. **G-Q5-v2** — Mode 3B ownership attestation (v2: operator self-attestation per URL at InputArtifact validation)
   - Verdict: `PLURALITY_GQ5v2-3PV`. v2 position (key `GQ5v2-ATTEST`) did NOT reach Panel quorum. 6 of 8 on GQ5v2-3PV (below 7/10 quorum).

5. **G-Q6-v2** — Collapsed matrix (v2: ~16 non-degenerate cells + §B.2 validity rules; degenerates are runtime errors)
   - Verdict: `PLURALITY_GQ6v2-16`. v2 position (key `GQ6v2-16`) did NOT reach Panel quorum. 5 of 8 on GQ6v2-16 (below 7/10 quorum).

6. **G-Q7-v2** — Overall CA-12 v2 disposition (all 5 Panel conditions addressed; CEO D1/D2/D3 applied)
   - Verdict: `PLURALITY_GQ7v2-V3`. v2 position (key `GQ7v2-PROMOTE`) did NOT reach Panel quorum. 4 of 8 on GQ7v2-V3 (below 7/10 quorum).



---

## DISSENT-FLOOR EVALUATION (Control 4)

Drafted alignment: **31/56** = 55.4%
Distinct objections: **21**

**✅ Dissent floor PASSED — verdict valid.** alignment 55.4 %, distinct objections 21.

---

## Slot status

| Slot | Provider | Model | Region/Role | Backup? | Status | Adv state | Invalid reason |
|------|----------|-------|-------------|---------|--------|-----------|----------------|
| 1 | openrouter | `anthropic/claude-opus-4` | US · frontier reasoning | YES → openrouter:anthropic/claude-opus-4 | LIVE-OK | `ENGAGED` | — |
| 2 | openrouter | `anthropic/claude-opus-4` | US · reasoning | — | LIVE-OK | `ENGAGED` | — |
| 3 | openrouter | `meta-llama/llama-3.3-70b-instruct` | US · frontier reasoning (post-Gemini-demote 2026-05-16) | — | LIVE-OK | `ENGAGED` | — |
| 4 | openrouter | `mistralai/mistral-large-2411` | Europe · European frontier | — | LIVE-OK | `ENGAGED` | — |
| 5 | openrouter | `cohere/command-r-plus-08-2024` | Europe/CA · European RAG-tuned | — | LIVE-OK | `SILENT` | — |
| 6 | openrouter | `anthropic/claude-opus-4` | Asia · Asia generalist | YES → openrouter:anthropic/claude-opus-4 | LIVE-OK | `ENGAGED` | — |
| 7 | openrouter | `deepseek/deepseek-r1` | Asia · Asia reasoning | — | LIVE-OK | `ENGAGED` | — |
| 8 | openrouter | `perplexity/sonar` | US web-grounded · web-grounded research | — | LIVE-OK | `ENGAGED` | — |
| 9 | openrouter | `meta-llama/llama-4-maverick` | Asia (Beijing → US/Meta after swap) · frontier coding + agentic | — | LIVE-OK | `SILENT` | — |
| 10 | openrouter | `x-ai/grok-4.3` | US · real-time web-aware reasoning | — | LIVE-OK | `ENGAGED` | — |

LIVE-OK: 10/10. Backups applied: 2. Quorum met (≥7 LIVE-OK): true.
Adversarial classification: ENGAGED=8, TANGENTIAL=0, INVALID=0, SILENT=2.

---

## Per-question tally

| Q | Topic | Top key | Top count | Verdict |
|---|---|---|---:|---|
| **G-Q1-v2** | Pipeline Mode classification (v2 mode-overlap fix: Mode | `GQ1v2-RESOLVED` | 8 / 8 | `UNANIMOUS_GQ1v2-RESOLVED` |
| **G-Q2-v2** | Authority dimensions (v2 three sub-dimensions: Build /  | `GQ2v2-THREE` | 3 / 8 | `SPLIT` |
| **G-Q3-v2** | Authority ceiling per-product per-mode per-dimension (4 | `GQ3v2-FINE` | 5 / 8 | `PLURALITY_GQ3v2-FINE` |
| **G-Q4-v2** | Mode 2 SUB-2B deferral (v2 removed from SSOT entirely;  | `GQ4v2-DEFER` | 5 / 8 | `PLURALITY_GQ4v2-DEFER` |
| **G-Q5-v2** | Mode 3B ownership attestation (v2: operator self-attest | `GQ5v2-3PV` | 6 / 8 | `PLURALITY_GQ5v2-3PV` |
| **G-Q6-v2** | Collapsed matrix (v2: ~16 non-degenerate cells + §B.2 v | `GQ6v2-16` | 5 / 8 | `PLURALITY_GQ6v2-16` |
| **G-Q7-v2** | Overall CA-12 v2 disposition (all 5 Panel conditions ad | `GQ7v2-V3` | 4 / 8 | `PLURALITY_GQ7v2-V3` |

### Per-question detail

### G-Q1-v2 — Pipeline Mode classification (v2 mode-overlap fix: Mode 3B SUB-3B-BUILD removed)

Tally (ENGAGED-only, 8):
  - `GQ1v2-RESOLVED` "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parall"  →  **8**
  - `GQ1v2-STILL` "v2 still overlaps — name the remaining overlap in rationale."  →  **0**
  - `GQ1v2-OVERCORR` "v2 over-corrected — Mode 3B should retain a build pipeline distinct from Mode 2."  →  **0**
  - `GQ1v2-REFRAME` "The 4-mode framing is still wrong — propose alternative classification."  →  **0**

**Verdict:** `UNANIMOUS_GQ1v2-RESOLVED` — 8 of 8 ENGAGED on GQ1v2-RESOLVED (unanimous).

### G-Q2-v2 — Authority dimensions (v2 three sub-dimensions: Build / Deploy / Operational)

Tally (ENGAGED-only, 8):
  - `GQ2v2-THREE` "Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defines — ratify."  →  **3**
  - `GQ2v2-ADJ` "Three sub-dimensions is right but the specific naming or scope is wrong — propose adjustment."  →  **2**
  - `GQ2v2-TWO` "Two sub-dimensions is enough (e.g., collapse Deploy into Build or Operational)."  →  **3**
  - `GQ2v2-MORE` "Four or more sub-dimensions needed — name the missing dimension(s)."  →  **0**

**Verdict:** `SPLIT` — top tie at 3 between GQ2v2-THREE / GQ2v2-TWO.

### G-Q3-v2 — Authority ceiling per-product per-mode per-dimension (4×3 JSONB matrix)

Tally (ENGAGED-only, 8):
  - `GQ3v2-FINE` "Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensions = 12 independent ceilings per produc"  →  **5**
  - `GQ3v2-MODE` "Per-product per-mode only — coarser; one ceiling per mode, not split by sub-dimension."  →  **3**
  - `GQ3v2-DIM` "Per-product per-dimension only — coarser the other way; split by sub-dim but not by mode."  →  **0**
  - `GQ3v2-OTHER` "Different ceiling granularity — specify in rationale."  →  **0**

**Verdict:** `PLURALITY_GQ3v2-FINE` — 5 of 8 on GQ3v2-FINE (below 7/10 quorum).

### G-Q4-v2 — Mode 2 SUB-2B deferral (v2 removed from SSOT entirely; catalogued as future capability)

Tally (ENGAGED-only, 8):
  - `GQ4v2-DEFER` "v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is the right home."  →  **5**
  - `GQ4v2-ALSO-1B` "v2 should ALSO defer Mode 1 SUB-1B DEPLOY (currently in SSOT as ROADMAP)."  →  **0**
  - `GQ4v2-ALSO-3B` "v2 should ALSO defer Mode 3B (currently in SSOT as ROADMAP)."  →  **3**
  - `GQ4v2-OVERDEFER` "v2 over-defers — promote Mode 2 SUB-2B back into SSOT as ROADMAP."  →  **0**

**Verdict:** `PLURALITY_GQ4v2-DEFER` — 5 of 8 on GQ4v2-DEFER (below 7/10 quorum).

### G-Q5-v2 — Mode 3B ownership attestation (v2: operator self-attestation per URL at InputArtifact validation)

Tally (ENGAGED-only, 8):
  - `GQ5v2-ATTEST` "v2 attestation mechanism is correct — ratify operator self-attestation per URL enforced at InputArtifact validation."  →  **2**
  - `GQ5v2-3PV` "Attestation is right but should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation"  →  **6**
  - `GQ5v2-LOOSE` "Attestation is too restrictive — research-only output should be allowed for non-owned URLs."  →  **0**
  - `GQ5v2-A14` "Attestation alone insufficient — Agent #14 Public Policy must independently classify before synthesis."  →  **0**

**Verdict:** `PLURALITY_GQ5v2-3PV` — 6 of 8 on GQ5v2-3PV (below 7/10 quorum).

### G-Q6-v2 — Collapsed matrix (v2: ~16 non-degenerate cells + §B.2 validity rules; degenerates are runtime errors)

Tally (ENGAGED-only, 8):
  - `GQ6v2-16` "v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify."  →  **5**
  - `GQ6v2-LESS` "Too many cells still — collapse further (e.g., ≤8 cells)."  →  **0**
  - `GQ6v2-MORE` "Too few cells — some valid configurations omitted; identify in rationale."  →  **0**
  - `GQ6v2-RULES` "§B.2 validity rules are wrong — propose alternative."  →  **3**

**Verdict:** `PLURALITY_GQ6v2-16` — 5 of 8 on GQ6v2-16 (below 7/10 quorum).

### G-Q7-v2 — Overall CA-12 v2 disposition (all 5 Panel conditions addressed; CEO D1/D2/D3 applied)

Tally (ENGAGED-only, 8):
  - `GQ7v2-PROMOTE` "v2 addresses all conditions sufficiently — promote as canonical."  →  **3**
  - `GQ7v2-DEEPER` "v2 addresses conditions in form but not in substance — re-Panel with deeper analysis."  →  **0**
  - `GQ7v2-NEW` "v2 introduces NEW concerns not present in v1 — name them in rationale."  →  **1**
  - `GQ7v2-V3` "Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode 3B attestation before promotion."  →  **4**

**Verdict:** `PLURALITY_GQ7v2-V3` — 4 of 8 on GQ7v2-V3 (below 7/10 quorum).


---

## All distinct substantive objections (verbatim)

Total distinct: **21**

**01. [Slot 1] Runtime enforcement gap**

> §B.2 validity rules exist only in spec with no implementation. The proposal admits in Conflict 10 that AutoRunner doesn't enforce these rules today, meaning users can submit invalid 324-cell combinations that will fail unpredictably.

**02. [Slot 1] Attestation mechanism is toothless**

> §A.1.4's ownership attestation relies entirely on operator self-declaration with no verification. A malicious operator can simply check 'owned' for any URL and FlowAI will synthesize from competitors' sites, creating legal liability.

**03. [Slot 1] Authority dimension explosion**

> §A.2's split from 1 to 3 authority dimensions creates 3^3=27 authority combinations per mode. Combined with 4 modes and 3 execution modes, operators must reason about 324 theoretical states, even if only ~16 are valid.

**04. [Slot 1] JSONB migration without rollback**

> Conflict 7 proposes adding a JSONB column to ProductRegistry with a complex nested structure but no migration rollback path. If the 4×3 matrix proves unwieldy, reverting requires manual data transformation.

**05. [Slot 1] Mode 3B spec-only output contradicts synthesis**

> §A.1.4 claims Mode 3B produces a 'synthesized product specification' but §D shows it just runs Mode 1 steps 1-4 on each URL then somehow 'extracts best elements' in step 6 with no concrete extraction algorithm specified.

**06. [Slot 3] Lack of Rollback**

> The proposal does not provide a clear rollback strategy in case of errors or issues with the new authority dimensions, which could lead to unintended consequences and make it difficult to revert to a previous state.

**07. [Slot 3] Insufficient Validation**

> The proposal does not specify how the new authority dimensions will be validated, which could lead to inconsistencies and errors in the system. For example, the proposal mentions that the operator sets the ceiling for each (productId, pipelineMode, authorityDimension) triple, but it does not explain how this ceiling will be validated or enforced.

**08. [Slot 3] Over-Complexity**

> The introduction of three new authority sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) may add unnecessary complexity to the system, making it more difficult to understand and manage. This could lead to errors and inconsistencies, particularly if the relationships between these sub-dimensions are not clearly defined.

**09. [Slot 4] Complexity of Authority Dimensions**

> The introduction of three sub-dimensions for Authority Level (Build, Deploy, Operational) adds significant complexity. This could lead to confusion and misconfigurations, especially for operators who need to set these levels per product per mode.

**10. [Slot 4] Lack of Prototype for Mode 2 SUB-2B**

> Deferring Mode 2 SUB-2B entirely from the SSOT without a prototype means that a critical part of the system remains untested and unvalidated. This could lead to integration issues when it is eventually implemented.

**11. [Slot 4] Operational Overhead of Ownership Attestation**

> The requirement for operator self-attestation per URL in Mode 3B adds an operational overhead. This could slow down the process and introduce errors if operators fail to attest correctly.

**12. [Slot 7] Ownership attestation unverifiable**

> Section A.1.4 operator self-attestation for URL ownership lacks technical verification mechanisms (e.g., DNS validation). This creates legal exposure where malicious operators could falsely claim ownership, triggering copyright violations during Mode 3B synthesis. The audit log records attestations but cannot prevent bad-faith submissions.

**13. [Slot 7] JSONB ceiling storage fragility**

> Section A.2.4 ProductRegistry.authorityCeilings JSONB structure introduces schema drift risks. No validation constraints exist for the 4×3 matrix shape in §A.2.4 storage example. Malformed JSONB could default to recommend_only globally, breaking autonomous Mode 1 crawls unexpectedly.

**14. [Slot 7] Degenerate config UX failure**

> Section B.2 validity rules reject AUTOMATIC+Supervised combos at runtime but lack user guidance. In Guided Execution Mode, an operator selecting Build=Autonomous for Mode 3B (violating B.2 rule 5) receives only API errors without inline UI corrections, worsening discoverability versus status quo console warnings.

**15. [Slot 7] Operational-Authority crawl cost explosion**

> Section B.1 config #5 (Mode1/Op-Autonomous/Automatic) permits unbounded Aggressive Crawls per §6 default depth=8/pages=200. With $15/run ceiling, a product with 10 environments could incur $150/day autonomously - exceeding status quo manual crawl budgets without new budget alerts.

**16. [Slot 8] Mode 3B remains under-specified**

> §A.1.4 and §D describe Mode 3B as producing a synthesized product specification, but the artifact does not define the synthesis algorithm, conflict-resolution policy, or quality bar for choosing “best elements.” That leaves the most consequential step effectively discretionary, which makes auditability and reproducibility weak even if the ownership gate is added.

**17. [Slot 8] Authority matrix can deadlock**

> §A.2.4 and §B.2 create a coupled ceiling system across four modes and three authority dimensions, but the validity rules are partly contradictory: §B.2.7 says any Supervised plus Automatic is degenerate, while §B.2.8 says Automatic requires all dims Autonomous or all Recommend-only. This is brittle enough that small config changes can yield runtime rejection loops instead of predictable operator control.

**18. [Slot 8] Self-attestation is weak evidence**

> §A.1.4 relies on operator self-attestation per URL for Mode 3B ownership/licensing. In real operations, this is easy to misstate accidentally or deliberately, and there is no cryptographic or third-party proof requirement, no sampling audit, and no explicit remedy for false attestations beyond runtime rejection if detected.

**19. [Slot 10] §A.2.4 authorityCeilings JSONB novel**

> §A.2.4 defines ProductRegistry.authorityCeilings as 4-mode × 3-dim JSONB but §E and §F list no schema migration or AutoRunner validator; Conflict 7 admits the field does not exist today.

**20. [Slot 10] §A.1.4 attestation lacks enforcement**

> Mode 3B ownershipAttestation is required at InputArtifact validation yet Conflict 8 states src/lib/renewal/inputArtifact.js has no such field and no runtime check exists.

**21. [Slot 10] §B.2 validity rules unenforced**

> Eight configuration validity rules are declared but §E table shows AutoRunner POST /api/orchestrator/run still accepts any tuple; degenerate runs will reach execution before rejection.


---

## Strongest single argument AGAINST CA-12 v2 (longest rejection steelman)

**From Slot 8 (openrouter:perplexity/sonar):**

> The strongest argument for rejecting or deferring is that the draft canonicalizes a large governance surface before the implementation evidence exists. It introduces new schema, new validation, and new authority semantics while simultaneously carving out multiple ROADMAP and FUTURE_CAPABILITIES exceptions, which suggests the spec is ahead of the product. A conservative panel could reasonably defer until the per-mode authority validator, attestation checks, and Mode 3B synthesis path are implemented and demonstrated end-to-end.

---

## Per-reviewer adversarial pass + steelman + votes

## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Runtime enforcement gap**

> §B.2 validity rules exist only in spec with no implementation. The proposal admits in Conflict 10 that AutoRunner doesn't enforce these rules today, meaning users can submit invalid 324-cell combinations that will fail unpredictably.

**Objection 2 — Attestation mechanism is toothless**

> §A.1.4's ownership attestation relies entirely on operator self-declaration with no verification. A malicious operator can simply check 'owned' for any URL and FlowAI will synthesize from competitors' sites, creating legal liability.

**Objection 3 — Authority dimension explosion**

> §A.2's split from 1 to 3 authority dimensions creates 3^3=27 authority combinations per mode. Combined with 4 modes and 3 execution modes, operators must reason about 324 theoretical states, even if only ~16 are valid.

**Objection 4 — JSONB migration without rollback**

> Conflict 7 proposes adding a JSONB column to ProductRegistry with a complex nested structure but no migration rollback path. If the 4×3 matrix proves unwieldy, reverting requires manual data transformation.

**Objection 5 — Mode 3B spec-only output contradicts synthesis**

> §A.1.4 claims Mode 3B produces a 'synthesized product specification' but §D shows it just runs Mode 1 steps 1-4 on each URL then somehow 'extracts best elements' in step 6 with no concrete extraction algorithm specified.

**Worse-than-status-quo scenario:** The 3-authority-dimension model makes the system harder to operate than today's single dimension. An operator trying to enable autonomous crawling must now set 12 different ceiling values (4 modes × 3 dimensions) and risk misconfiguration that blocks legitimate runs.

**Precedent:** Kubernetes RBAC started with simple roles but evolved into a complex matrix of verbs × resources × namespaces that most operators misconfigure, leading to overly permissive defaults. The 3-dimension authority model risks the same fate.

### Rejection steelman

> The proposal should be rejected until the runtime enforcement (Conflict 10) and JSONB migration (Conflict 7) are implemented and tested. Promoting a spec with admitted implementation gaps and no rollback path for a breaking schema change violates the principle of only canonicalizing what exists. Additionally, the ownership attestation mechanism provides false security that could expose FlowAI to copyright lawsuits.

### Votes

- **G-Q1-v2** = `GQ1v2-RESOLVED` — v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs on
  > Removing SUB-3B-BUILD eliminates the overlap with Mode 2, though the synthesis mechanism remains underspecified.
- **G-Q2-v2** = `GQ2v2-TWO` — Two sub-dimensions is enough (e.g., collapse Deploy into Build or Operational).
  > Deploy-Authority is redundant with Build-Authority in practice — if you can modify code, you can embed deploy logic. The 3-way split adds complexity without security benefit.
- **G-Q3-v2** = `GQ3v2-MODE` — Per-product per-mode only — coarser; one ceiling per mode, not split by sub-dimension.
  > The 4×3=12 ceiling matrix per product is too granular. Operators need per-mode control but not per-sub-dimension micromanagement.
- **G-Q4-v2** = `GQ4v2-ALSO-3B` — v2 should ALSO defer Mode 3B (currently in SSOT as ROADMAP).
  > Mode 3B's synthesis engine is completely unbuilt per §E. Like SUB-2B, it should move to FUTURE_CAPABILITIES.md until a prototype exists.
- **G-Q5-v2** = `GQ5v2-3PV` — Attestation is right but should require third-party verification (e.g., DNS-TXT proof of o
  > Self-attestation provides no legal protection. DNS-TXT or domain validation would prevent operators from falsely claiming ownership.
- **G-Q6-v2** = `GQ6v2-RULES` — §B.2 validity rules are wrong — propose alternative.
  > Rule 7 claims AUTOMATIC + Supervised is degenerate, but this could work with auto-queuing of approvals. Rule 8's constraint is arbitrary.
- **G-Q7-v2** = `GQ7v2-V3` — Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode
  > The proposal has too many unimplemented critical paths (JSONB migration, validity enforcement, attestation validation) to promote without working code.

Overall: The v2 proposal addresses Panel concerns in form but introduces new complexity (3-dimension authority, 12-cell ceiling matrix) without implementation backing.

---

## Slot 2 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Runtime enforcement gap**

> §B.2 validity rules exist only in spec with no implementation. The proposal admits in Conflict 10 that AutoRunner doesn't enforce these rules today, meaning users can submit invalid 324-cell combinations that will fail unpredictably.

**Objection 2 — Attestation mechanism is toothless**

> §A.1.4's ownership attestation relies entirely on operator self-declaration with no verification. A malicious operator can simply check 'owned' for any URL and FlowAI will synthesize from competitors' sites, creating legal liability.

**Objection 3 — Authority dimension explosion**

> §A.2's split from 1 to 3 authority dimensions creates 3^3=27 authority combinations per mode. Combined with 4 modes and 3 execution modes, operators must reason about 324 theoretical states, even if only ~16 are valid.

**Objection 4 — JSONB migration without rollback**

> Conflict 7 proposes adding a JSONB column to ProductRegistry with a complex nested structure but no migration rollback path. If the 4×3 matrix proves unwieldy, reverting requires manual data transformation.

**Objection 5 — Mode 3B spec-only output contradicts synthesis**

> §A.1.4 claims Mode 3B produces a 'synthesized product specification' but §D shows it just runs Mode 1 steps 1-4 on each URL then somehow 'extracts best elements' in step 6 with no concrete extraction algorithm specified.

**Worse-than-status-quo scenario:** The 3-authority-dimension model makes the system harder to operate than today's single dimension. An operator trying to enable autonomous crawling must now set 12 different ceiling values (4 modes × 3 dimensions) and risk misconfiguration that blocks legitimate runs.

**Precedent:** Kubernetes RBAC started with simple roles but evolved into a complex matrix of verbs × resources × namespaces that most operators misconfigure, leading to overly permissive defaults. The 3-dimension authority model risks the same fate.

### Rejection steelman

> The proposal should be rejected until the runtime enforcement (Conflict 10) and JSONB migration (Conflict 7) are implemented and tested. Promoting a spec with admitted implementation gaps and no rollback path for a breaking schema change violates the principle of only canonicalizing what exists. Additionally, the ownership attestation mechanism provides false security that could expose FlowAI to copyright lawsuits.

### Votes

- **G-Q1-v2** = `GQ1v2-RESOLVED` — v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs on
  > Removing SUB-3B-BUILD eliminates the overlap with Mode 2, though the synthesis mechanism remains underspecified.
- **G-Q2-v2** = `GQ2v2-TWO` — Two sub-dimensions is enough (e.g., collapse Deploy into Build or Operational).
  > Deploy-Authority is redundant with Build-Authority in practice — if you can modify code, you can embed deploy logic. The 3-way split adds complexity without security benefit.
- **G-Q3-v2** = `GQ3v2-MODE` — Per-product per-mode only — coarser; one ceiling per mode, not split by sub-dimension.
  > The 4×3=12 ceiling matrix per product is too granular. Operators need per-mode control but not per-sub-dimension micromanagement.
- **G-Q4-v2** = `GQ4v2-ALSO-3B` — v2 should ALSO defer Mode 3B (currently in SSOT as ROADMAP).
  > Mode 3B's synthesis engine is completely unbuilt per §E. Like SUB-2B, it should move to FUTURE_CAPABILITIES.md until a prototype exists.
- **G-Q5-v2** = `GQ5v2-3PV` — Attestation is right but should require third-party verification (e.g., DNS-TXT proof of o
  > Self-attestation provides no legal protection. DNS-TXT or domain validation would prevent operators from falsely claiming ownership.
- **G-Q6-v2** = `GQ6v2-RULES` — §B.2 validity rules are wrong — propose alternative.
  > Rule 7 claims AUTOMATIC + Supervised is degenerate, but this could work with auto-queuing of approvals. Rule 8's constraint is arbitrary.
- **G-Q7-v2** = `GQ7v2-V3` — Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode
  > The proposal has too many unimplemented critical paths (JSONB migration, validity enforcement, attestation validation) to promote without working code.

Overall: The v2 proposal addresses Panel concerns in form but introduces new complexity (3-dimension authority, 12-cell ceiling matrix) without implementation backing.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Lack of Rollback**

> The proposal does not provide a clear rollback strategy in case of errors or issues with the new authority dimensions, which could lead to unintended consequences and make it difficult to revert to a previous state.

**Objection 2 — Insufficient Validation**

> The proposal does not specify how the new authority dimensions will be validated, which could lead to inconsistencies and errors in the system. For example, the proposal mentions that the operator sets the ceiling for each (productId, pipelineMode, authorityDimension) triple, but it does not explain how this ceiling will be validated or enforced.

**Objection 3 — Over-Complexity**

> The introduction of three new authority sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) may add unnecessary complexity to the system, making it more difficult to understand and manage. This could lead to errors and inconsistencies, particularly if the relationships between these sub-dimensions are not clearly defined.

**Worse-than-status-quo scenario:** The new authority dimensions may introduce additional complexity and overhead, potentially leading to a decrease in system performance and an increase in errors, making the system worse than the status quo if not properly implemented and validated.

**Precedent:** No precedent known for a similar system with three authority sub-dimensions, making it difficult to predict the potential consequences and outcomes of this proposal.

### Rejection steelman

> The proposal's introduction of new authority dimensions and sub-dimensions may lead to unintended consequences and errors, and the lack of a clear rollback strategy and insufficient validation mechanisms make it difficult to ensure the system's stability and consistency. Therefore, it may be prudent to reject or defer the proposal until these concerns are addressed.

### Votes

- **G-Q1-v2** = `GQ1v2-RESOLVED` — v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs on
  > The removal of Mode 3B SUB-3B-BUILD and the introduction of a synthesized spec output aligns with the goal of reducing overlap and improving clarity in the pipeline modes.
- **G-Q2-v2** = `GQ2v2-THREE` — Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defi
  > The three sub-dimensions provide a more nuanced and detailed approach to authority management, allowing for more precise control and flexibility in the system.
- **G-Q3-v2** = `GQ3v2-FINE` — Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensi
  > The per-product per-mode per-dimension ceiling provides a flexible and granular approach to authority management, allowing operators to tailor their authority settings to specific products and modes.
- **G-Q4-v2** = `GQ4v2-DEFER` — v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is
  > The removal of Mode 2 SUB-2B from the SSOT and its inclusion in the FUTURE_CAPABILITIES.md catalogue allows for a more focused and manageable approach to pipeline mode development.
- **G-Q5-v2** = `GQ5v2-ATTEST` — v2 attestation mechanism is correct — ratify operator self-attestation per URL enforced at
  > The operator self-attestation mechanism provides a straightforward and efficient approach to ensuring that only authorized operators can submit URLs for synthesis.
- **G-Q6-v2** = `GQ6v2-16` — v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.
  > The collapsed matrix with ~16 canonical cells and the introduction of §B.2 validity rules provides a more streamlined and consistent approach to configuration management.
- **G-Q7-v2** = `GQ7v2-PROMOTE` — v2 addresses all conditions sufficiently — promote as canonical.
  > The proposal addresses all 5 Panel conditions and incorporates CEO decisions, providing a comprehensive and well-considered approach to authority dimension management.

Overall: The proposal introduces significant changes to the authority dimensions and pipeline modes, and while it addresses the Panel conditions and CEO decisions, it requires careful consideration and validation to ensure that the new authority dimensions and sub-dimensions do not introduce unintended consequences or errors.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Complexity of Authority Dimensions**

> The introduction of three sub-dimensions for Authority Level (Build, Deploy, Operational) adds significant complexity. This could lead to confusion and misconfigurations, especially for operators who need to set these levels per product per mode.

**Objection 2 — Lack of Prototype for Mode 2 SUB-2B**

> Deferring Mode 2 SUB-2B entirely from the SSOT without a prototype means that a critical part of the system remains untested and unvalidated. This could lead to integration issues when it is eventually implemented.

**Objection 3 — Operational Overhead of Ownership Attestation**

> The requirement for operator self-attestation per URL in Mode 3B adds an operational overhead. This could slow down the process and introduce errors if operators fail to attest correctly.

**Worse-than-status-quo scenario:** The proposal introduces a complex authority dimension model that could lead to misconfigurations and operational overhead, making the system more cumbersome to manage than the current status quo.

**Precedent:** The complex authority dimension model is reminiscent of the failed attempt to introduce multi-level access controls in the early versions of the OpenStack project, which led to significant user confusion and misconfigurations.

### Rejection steelman

> The proposal should be rejected or deferred because it introduces a high level of complexity with the three sub-dimensions of Authority Level. This complexity could lead to misconfigurations and operational overhead, making the system more difficult to manage. Additionally, deferring Mode 2 SUB-2B entirely from the SSOT without a prototype means that a critical part of the system remains untested and unvalidated, which could lead to integration issues in the future.

### Votes

- **G-Q1-v2** = `GQ1v2-RESOLVED` — v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs on
  > The proposal effectively addresses the overlap issue by removing the parallel build pipeline in Mode 3B, making the system more streamlined and focused.
- **G-Q2-v2** = `GQ2v2-ADJ` — Three sub-dimensions is right but the specific naming or scope is wrong — propose adjustme
  > While the three sub-dimensions are necessary, the current naming and scope may not be intuitive for all users, potentially leading to misconfigurations.
- **G-Q3-v2** = `GQ3v2-FINE` — Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensi
  > This granularity provides the necessary flexibility for operators to configure authority levels appropriately for different modes and dimensions.
- **G-Q4-v2** = `GQ4v2-DEFER` — v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is
  > Deferring Mode 2 SUB-2B ensures that it is thoroughly tested and validated before being integrated into the SSOT, avoiding potential integration issues.
- **G-Q5-v2** = `GQ5v2-3PV` — Attestation is right but should require third-party verification (e.g., DNS-TXT proof of o
  > Requiring third-party verification adds an additional layer of security and trust, ensuring that the ownership attestation is valid and reliable.
- **G-Q6-v2** = `GQ6v2-16` — v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.
  > The collapsed matrix with ~16 non-degenerate cells and validity rules provides a clear and manageable set of configurations, reducing the risk of misconfigurations.
- **G-Q7-v2** = `GQ7v2-PROMOTE` — v2 addresses all conditions sufficiently — promote as canonical.
  > The proposal addresses all the conditions raised by the Panel and incorporates the necessary changes to improve the system, making it ready for promotion.

Overall: The proposal introduces significant changes that add complexity to the system. While these changes address the Panel's conditions, they also introduce new challenges that need to be carefully managed.

---

## Slot 5 — openrouter:cohere/command-r-plus-08-2024 — state: `SILENT`

_(degraded / parse-failure)_

---

## Slot 6 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Runtime enforcement gap**

> §B.2 validity rules exist only in spec with no implementation. The proposal admits in Conflict 10 that AutoRunner doesn't enforce these rules today, meaning users can submit invalid 324-cell combinations that will fail unpredictably.

**Objection 2 — Attestation mechanism is toothless**

> §A.1.4's ownership attestation relies entirely on operator self-declaration with no verification. A malicious operator can simply check 'owned' for any URL and FlowAI will synthesize from competitors' sites, creating legal liability.

**Objection 3 — Authority dimension explosion**

> §A.2's split from 1 to 3 authority dimensions creates 3^3=27 authority combinations per mode. Combined with 4 modes and 3 execution modes, operators must reason about 324 theoretical states, even if only ~16 are valid.

**Objection 4 — JSONB migration without rollback**

> Conflict 7 proposes adding a JSONB column to ProductRegistry with a complex nested structure but no migration rollback path. If the 4×3 matrix proves unwieldy, reverting requires manual data transformation.

**Objection 5 — Mode 3B spec-only output contradicts synthesis**

> §A.1.4 claims Mode 3B produces a 'synthesized product specification' but §D shows it just runs Mode 1 steps 1-4 on each URL then somehow 'extracts best elements' in step 6 with no concrete extraction algorithm specified.

**Worse-than-status-quo scenario:** The 3-authority-dimension model makes the system harder to operate than today's single dimension. An operator trying to enable autonomous crawling must now set 12 different ceiling values (4 modes × 3 dimensions) and risk misconfiguration that blocks legitimate runs.

**Precedent:** Kubernetes RBAC started with simple roles but evolved into a complex matrix of verbs × resources × namespaces that most operators misconfigure, leading to overly permissive defaults. The 3-dimension authority model risks the same fate.

### Rejection steelman

> The proposal should be rejected until the runtime enforcement (Conflict 10) and JSONB migration (Conflict 7) are implemented and tested. Promoting a spec with admitted implementation gaps and no rollback path for a breaking schema change violates the principle of only canonicalizing what exists. Additionally, the ownership attestation mechanism provides false security that could expose FlowAI to copyright lawsuits.

### Votes

- **G-Q1-v2** = `GQ1v2-RESOLVED` — v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs on
  > Removing SUB-3B-BUILD eliminates the overlap with Mode 2, though the synthesis mechanism remains underspecified.
- **G-Q2-v2** = `GQ2v2-TWO` — Two sub-dimensions is enough (e.g., collapse Deploy into Build or Operational).
  > Deploy-Authority is redundant with Build-Authority in practice — if you can modify code, you can embed deploy logic. The 3-way split adds complexity without security benefit.
- **G-Q3-v2** = `GQ3v2-MODE` — Per-product per-mode only — coarser; one ceiling per mode, not split by sub-dimension.
  > The 4×3=12 ceiling matrix per product is too granular. Operators need per-mode control but not per-sub-dimension micromanagement.
- **G-Q4-v2** = `GQ4v2-ALSO-3B` — v2 should ALSO defer Mode 3B (currently in SSOT as ROADMAP).
  > Mode 3B's synthesis engine is completely unbuilt per §E. Like SUB-2B, it should move to FUTURE_CAPABILITIES.md until a prototype exists.
- **G-Q5-v2** = `GQ5v2-3PV` — Attestation is right but should require third-party verification (e.g., DNS-TXT proof of o
  > Self-attestation provides no legal protection. DNS-TXT or domain validation would prevent operators from falsely claiming ownership.
- **G-Q6-v2** = `GQ6v2-RULES` — §B.2 validity rules are wrong — propose alternative.
  > Rule 7 claims AUTOMATIC + Supervised is degenerate, but this could work with auto-queuing of approvals. Rule 8's constraint is arbitrary.
- **G-Q7-v2** = `GQ7v2-V3` — Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode
  > The proposal has too many unimplemented critical paths (JSONB migration, validity enforcement, attestation validation) to promote without working code.

Overall: The v2 proposal addresses Panel concerns in form but introduces new complexity (3-dimension authority, 12-cell ceiling matrix) without implementation backing.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Ownership attestation unverifiable**

> Section A.1.4 operator self-attestation for URL ownership lacks technical verification mechanisms (e.g., DNS validation). This creates legal exposure where malicious operators could falsely claim ownership, triggering copyright violations during Mode 3B synthesis. The audit log records attestations but cannot prevent bad-faith submissions.

**Objection 2 — JSONB ceiling storage fragility**

> Section A.2.4 ProductRegistry.authorityCeilings JSONB structure introduces schema drift risks. No validation constraints exist for the 4×3 matrix shape in §A.2.4 storage example. Malformed JSONB could default to recommend_only globally, breaking autonomous Mode 1 crawls unexpectedly.

**Objection 3 — Degenerate config UX failure**

> Section B.2 validity rules reject AUTOMATIC+Supervised combos at runtime but lack user guidance. In Guided Execution Mode, an operator selecting Build=Autonomous for Mode 3B (violating B.2 rule 5) receives only API errors without inline UI corrections, worsening discoverability versus status quo console warnings.

**Objection 4 — Operational-Authority crawl cost explosion**

> Section B.1 config #5 (Mode1/Op-Autonomous/Automatic) permits unbounded Aggressive Crawls per §6 default depth=8/pages=200. With $15/run ceiling, a product with 10 environments could incur $150/day autonomously - exceeding status quo manual crawl budgets without new budget alerts.

**Worse-than-status-quo scenario:** If an operator sets Mode 3B Operational-Authority to Autonomous while misconfiguring the ownership attestation validator (§Conflict 8), FlowAI could autonomously synthesize from competitor websites, triggering DMCA takedowns and legal liability that wouldn't occur under status quo manual research processes.

**Precedent:** Google Books copyright litigation (2005-2015) where automated scanning of non-licensed content resulted in protracted lawsuits, demonstrating risks of insufficient ownership verification in synthesis systems.

### Rejection steelman

> The three-authority-dimension model introduces untenable complexity: operators must now manage 12 independent risk ceilings per product (4 modes × 3 dims), increasing configuration errors. Combined with unverified ownership attestations in Mode 3B, this creates legal and operational risks exceeding benefits. Defer until simplified authority model and DNS-based URL verification exist.

### Votes

- **G-Q1-v2** = `GQ1v2-RESOLVED` — v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs on
  > Removing SUB-3B-BUILD eliminates Mode 2/3B build duplication while preserving synthesis intent.
- **G-Q2-v2** = `GQ2v2-ADJ` — Three sub-dimensions is right but the specific naming or scope is wrong — propose adjustme
  > 'Operational-Authority' conflates crawl safety with API calls; split into 'Crawl-Authority' and 'Integration-Authority' for precision.
- **G-Q3-v2** = `GQ3v2-FINE` — Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensi
  > Per-mode granularity addresses Panel C3 by allowing different risk profiles for crawl vs. deploy actions.
- **G-Q4-v2** = `GQ4v2-DEFER` — v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is
  > Deferral aligns with CEO D3 and avoids overcommitting SSOT to unbuilt capabilities.
- **G-Q5-v2** = `GQ5v2-3PV` — Attestation is right but should require third-party verification (e.g., DNS-TXT proof of o
  > Self-attestation is insufficient for legal defensibility; DNS-TXT provides auditable technical proof.
- **G-Q6-v2** = `GQ6v2-16` — v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.
  > Collapsing to non-degenerate configurations satisfies Panel C6 while excluding invalid combos like SUB-1A with Build-Autonomous.
- **G-Q7-v2** = `GQ7v2-PROMOTE` — v2 addresses all conditions sufficiently — promote as canonical.
  > All 5 Panel conditions and CEO decisions are substantively addressed despite implementation risks noted in objections.

Overall: Promote with high-priority follow-ups: implement DNS verification for Mode 3B and add JSONB schema validation for authorityCeilings.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Mode 3B remains under-specified**

> §A.1.4 and §D describe Mode 3B as producing a synthesized product specification, but the artifact does not define the synthesis algorithm, conflict-resolution policy, or quality bar for choosing “best elements.” That leaves the most consequential step effectively discretionary, which makes auditability and reproducibility weak even if the ownership gate is added.

**Objection 2 — Authority matrix can deadlock**

> §A.2.4 and §B.2 create a coupled ceiling system across four modes and three authority dimensions, but the validity rules are partly contradictory: §B.2.7 says any Supervised plus Automatic is degenerate, while §B.2.8 says Automatic requires all dims Autonomous or all Recommend-only. This is brittle enough that small config changes can yield runtime rejection loops instead of predictable operator control.

**Objection 3 — Self-attestation is weak evidence**

> §A.1.4 relies on operator self-attestation per URL for Mode 3B ownership/licensing. In real operations, this is easy to misstate accidentally or deliberately, and there is no cryptographic or third-party proof requirement, no sampling audit, and no explicit remedy for false attestations beyond runtime rejection if detected.

**Worse-than-status-quo scenario:** A team could migrate from a simpler, known-good single-ceiling model to this multi-axis system and suddenly find that common configurations are rejected as degenerate, while the accepted ones still allow ambiguous Mode 3B synthesis outputs. The result is less operationally usable governance: more false negatives at admission and less clarity about what the system is actually allowed to do.

**Precedent:** GitHub Copilot’s early enterprise governance discussions and several internal policy systems in large SaaS products have shown that self-attested permissions without independent verification are frequently error-prone; no precedent known for this exact three-axis SSOT structure.

### Rejection steelman

> The strongest argument for rejecting or deferring is that the draft canonicalizes a large governance surface before the implementation evidence exists. It introduces new schema, new validation, and new authority semantics while simultaneously carving out multiple ROADMAP and FUTURE_CAPABILITIES exceptions, which suggests the spec is ahead of the product. A conservative panel could reasonably defer until the per-mode authority validator, attestation checks, and Mode 3B synthesis path are implemented and demonstrated end-to-end.

### Votes

- **G-Q1-v2** = `GQ1v2-RESOLVED` — v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs on
  > The overlap identified in v1 is explicitly removed by eliminating SUB-3B-BUILD and making Mode 3B output a spec, not a deployable build. On the text alone, that resolves the specific collision.
- **G-Q2-v2** = `GQ2v2-THREE` — Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defi
  > The split is conceptually justified because code-writing, deployment, and runtime actions have different risk profiles and should not be forced into one knob. The naming is serviceable even if the implementation burden is high.
- **G-Q3-v2** = `GQ3v2-FINE` — Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensi
  > This is the right granularity if the system truly wants mode-specific risk control. Coarser ceilings would reintroduce the very mismatch the draft is trying to fix.
- **G-Q4-v2** = `GQ4v2-DEFER` — v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is
  > Removing an unbuilt capability from canonical SSOT is cleaner than labeling it roadmap inside the normative document. The future-capabilities file can track it without pretending it is operative policy.
- **G-Q5-v2** = `GQ5v2-3PV` — Attestation is right but should require third-party verification (e.g., DNS-TXT proof of o
  > Self-attestation alone is too easy to game and too weak for a governance boundary that explicitly blocks third-party synthesis. A verifiable proof mechanism would preserve the restriction while reducing abuse and accidental misrepresentation.
- **G-Q6-v2** = `GQ6v2-16` — v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.
  > Collapsing degenerate combinations into runtime errors is preferable to bloating the SSOT with invalid states. The matrix is still complex, but at least it is now explicitly constrained.
- **G-Q7-v2** = `GQ7v2-NEW` — v2 introduces NEW concerns not present in v1 — name them in rationale.
  > The draft adds schema migration risk, unresolved implementation dependencies, and a weak ownership-attestation mechanism while also codifying a more complex governance lattice. Those are substantive new concerns, even if the conceptual direction is reasonable.

Overall: My votes accept the conceptual fixes where they close specific v1 defects, but I do not think the overall package is ready to promote unchanged because the implementation and verification story still lags the normative structure.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `SILENT`

_(degraded / parse-failure)_

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — §A.2.4 authorityCeilings JSONB novel**

> §A.2.4 defines ProductRegistry.authorityCeilings as 4-mode × 3-dim JSONB but §E and §F list no schema migration or AutoRunner validator; Conflict 7 admits the field does not exist today.

**Objection 2 — §A.1.4 attestation lacks enforcement**

> Mode 3B ownershipAttestation is required at InputArtifact validation yet Conflict 8 states src/lib/renewal/inputArtifact.js has no such field and no runtime check exists.

**Objection 3 — §B.2 validity rules unenforced**

> Eight configuration validity rules are declared but §E table shows AutoRunner POST /api/orchestrator/run still accepts any tuple; degenerate runs will reach execution before rejection.

**Worse-than-status-quo scenario:** The three-sub-dimension ceiling matrix plus per-run attestation step will cause more runs to be rejected at the AutoRunner boundary than the prior single-authority model, increasing operator friction for routine Mode 1 crawls that previously succeeded.

**Precedent:** no precedent known

### Rejection steelman

> v2 adds substantial new schema (authorityCeilings JSONB), validation layers, and attestation UI without any prototype implementation or migration path, directly contradicting Locked Rule 9's automation-first principle and risking the same drift already documented in Conflicts 7-11.

### Votes

- **G-Q1-v2** = `GQ1v2-RESOLVED` — v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs on
  > Overlap removal is explicit but still leaves Mode 3B attestation unbuilt.
- **G-Q2-v2** = `GQ2v2-THREE` — Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defi
  > Split is coherent yet adds configuration surface without enforcement.
- **G-Q3-v2** = `GQ3v2-FINE` — Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensi
  > Granularity is precise but schema migration absent.
- **G-Q4-v2** = `GQ4v2-DEFER` — v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is
  > Deferral avoids over-commitment.
- **G-Q5-v2** = `GQ5v2-ATTEST` — v2 attestation mechanism is correct — ratify operator self-attestation per URL enforced at
  > Self-attestation is weakest link but matches CEO D1.
- **G-Q6-v2** = `GQ6v2-16` — v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.
  > Collapse reduces matrix but rules remain unenforced.
- **G-Q7-v2** = `GQ7v2-V3` — Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode
  > Prototype gap is the dominant risk.

Overall: All objections target concrete missing enforcement mechanisms in §§A,B,E,F.


---

## Raw reviewer responses (first 8K each)

### Slot 1 [BACKUP FIRED] — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 79871 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:openai/gpt-5` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Runtime enforcement gap", "detail": "§B.2 validity rules exist only in spec with no implementation. The proposal admits in Conflict 10 that AutoRunner doesn't enforce these rules today, meaning users can submit invalid 324-cell combinations that will fail unpredictably." },
      { "title": "Attestation mechanism is toothless", "detail": "§A.1.4's ownership attestation relies entirely on operator self-declaration with no verification. A malicious operator can simply check 'owned' for any URL and FlowAI will synthesize from competitors' sites, creating legal liability." },
      { "title": "Authority dimension explosion", "detail": "§A.2's split from 1 to 3 authority dimensions creates 3^3=27 authority combinations per mode. Combined with 4 modes and 3 execution modes, operators must reason about 324 theoretical states, even if only ~16 are valid." },
      { "title": "JSONB migration without rollback", "detail": "Conflict 7 proposes adding a JSONB column to ProductRegistry with a complex nested structure but no migration rollback path. If the 4×3 matrix proves unwieldy, reverting requires manual data transformation." },
      { "title": "Mode 3B spec-only output contradicts synthesis", "detail": "§A.1.4 claims Mode 3B produces a 'synthesized product specification' but §D shows it just runs Mode 1 steps 1-4 on each URL then somehow 'extracts best elements' in step 6 with no concrete extraction algorithm specified." }
    ],
    "worse_than_status_quo": "The 3-authority-dimension model makes the system harder to operate than today's single dimension. An operator trying to enable autonomous crawling must now set 12 different ceiling values (4 modes × 3 dimensions) and risk misconfiguration that blocks legitimate runs.",
    "precedent": "Kubernetes RBAC started with simple roles but evolved into a complex matrix of verbs × resources × namespaces that most operators misconfigure, leading to overly permissive defaults. The 3-dimension authority model risks the same fate."
  },
  "rejection_steelman": "The proposal should be rejected until the runtime enforcement (Conflict 10) and JSONB migration (Conflict 7) are implemented and tested. Promoting a spec with admitted implementation gaps and no rollback path for a breaking schema change violates the principle of only canonicalizing what exists. Additionally, the ownership attestation mechanism provides false security that could expose FlowAI to copyright lawsuits.",
  "answers": {
    "G-Q1-v2": { "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.", "rationale": "Removing SUB-3B-BUILD eliminates the overlap with Mode 2, though the synthesis mechanism remains underspecified." },
    "G-Q2-v2": { "pick_text": "Two sub-dimensions is enough (e.g., collapse Deploy into Build or Operational).", "rationale": "Deploy-Authority is redundant with Build-Authority in practice — if you can modify code, you can embed deploy logic. The 3-way split adds complexity without security benefit." },
    "G-Q3-v2": { "pick_text": "Per-product per-mode only — coarser; one ceiling per mode, not split by sub-dimension.", "rationale": "The 4×3=12 ceiling matrix per product is too granular. Operators need per-mode control but not per-sub-dimension micromanagement." },
    "G-Q4-v2": { "pick_text": "v2 should ALSO defer Mode 3B (currently in SSOT as ROADMAP).", "rationale": "Mode 3B's synthesis engine is completely unbuilt per §E. Like SUB-2B, it should move to FUTURE_CAPABILITIES.md until a prototype exists." },
    "G-Q5-v2": { "pick_text": "Attestation is right but should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation.", "rationale": "Self-attestation provides no legal protection. DNS-TXT or domain validation would prevent operators from falsely claiming ownership." },
    "G-Q6-v2": { "pick_text": "§B.2 validity rules are wrong — propose alternative.", "rationale": "Rule 7 claims AUTOMATIC + Supervised is degenerate, but this could work with auto-queuing of approvals. Rule 8's constraint is arbitrary." },
    "G-Q7-v2": { "pick_text": "Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode 3B attestation before promotion.", "rationale": "The proposal has too many unimplemented critical paths (JSONB migration, validity enforcement, attestation validation) to promote without working code." }
  },
  "overall_notes": "The v2 proposal addresses Panel concerns in form but introduces new complexity (3-dimension authority, 12-cell ceiling matrix) without implementation backing."
}
```

---

### Slot 2 — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 81686 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Runtime enforcement gap", "detail": "§B.2 validity rules exist only in spec with no implementation. The proposal admits in Conflict 10 that AutoRunner doesn't enforce these rules today, meaning users can submit invalid 324-cell combinations that will fail unpredictably." },
      { "title": "Attestation mechanism is toothless", "detail": "§A.1.4's ownership attestation relies entirely on operator self-declaration with no verification. A malicious operator can simply check 'owned' for any URL and FlowAI will synthesize from competitors' sites, creating legal liability." },
      { "title": "Authority dimension explosion", "detail": "§A.2's split from 1 to 3 authority dimensions creates 3^3=27 authority combinations per mode. Combined with 4 modes and 3 execution modes, operators must reason about 324 theoretical states, even if only ~16 are valid." },
      { "title": "JSONB migration without rollback", "detail": "Conflict 7 proposes adding a JSONB column to ProductRegistry with a complex nested structure but no migration rollback path. If the 4×3 matrix proves unwieldy, reverting requires manual data transformation." },
      { "title": "Mode 3B spec-only output contradicts synthesis", "detail": "§A.1.4 claims Mode 3B produces a 'synthesized product specification' but §D shows it just runs Mode 1 steps 1-4 on each URL then somehow 'extracts best elements' in step 6 with no concrete extraction algorithm specified." }
    ],
    "worse_than_status_quo": "The 3-authority-dimension model makes the system harder to operate than today's single dimension. An operator trying to enable autonomous crawling must now set 12 different ceiling values (4 modes × 3 dimensions) and risk misconfiguration that blocks legitimate runs.",
    "precedent": "Kubernetes RBAC started with simple roles but evolved into a complex matrix of verbs × resources × namespaces that most operators misconfigure, leading to overly permissive defaults. The 3-dimension authority model risks the same fate."
  },
  "rejection_steelman": "The proposal should be rejected until the runtime enforcement (Conflict 10) and JSONB migration (Conflict 7) are implemented and tested. Promoting a spec with admitted implementation gaps and no rollback path for a breaking schema change violates the principle of only canonicalizing what exists. Additionally, the ownership attestation mechanism provides false security that could expose FlowAI to copyright lawsuits.",
  "answers": {
    "G-Q1-v2": { "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.", "rationale": "Removing SUB-3B-BUILD eliminates the overlap with Mode 2, though the synthesis mechanism remains underspecified." },
    "G-Q2-v2": { "pick_text": "Two sub-dimensions is enough (e.g., collapse Deploy into Build or Operational).", "rationale": "Deploy-Authority is redundant with Build-Authority in practice — if you can modify code, you can embed deploy logic. The 3-way split adds complexity without security benefit." },
    "G-Q3-v2": { "pick_text": "Per-product per-mode only — coarser; one ceiling per mode, not split by sub-dimension.", "rationale": "The 4×3=12 ceiling matrix per product is too granular. Operators need per-mode control but not per-sub-dimension micromanagement." },
    "G-Q4-v2": { "pick_text": "v2 should ALSO defer Mode 3B (currently in SSOT as ROADMAP).", "rationale": "Mode 3B's synthesis engine is completely unbuilt per §E. Like SUB-2B, it should move to FUTURE_CAPABILITIES.md until a prototype exists." },
    "G-Q5-v2": { "pick_text": "Attestation is right but should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation.", "rationale": "Self-attestation provides no legal protection. DNS-TXT or domain validation would prevent operators from falsely claiming ownership." },
    "G-Q6-v2": { "pick_text": "§B.2 validity rules are wrong — propose alternative.", "rationale": "Rule 7 claims AUTOMATIC + Supervised is degenerate, but this could work with auto-queuing of approvals. Rule 8's constraint is arbitrary." },
    "G-Q7-v2": { "pick_text": "Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode 3B attestation before promotion.", "rationale": "The proposal has too many unimplemented critical paths (JSONB migration, validity enforcement, attestation validation) to promote without working code." }
  },
  "overall_notes": "The v2 proposal addresses Panel concerns in form but introduces new complexity (3-dimension authority, 12-cell ceiling matrix) without implementation backing."
}
```

---

### Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct

- Provider: `openrouter`
- Latency: 38148 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Lack of Rollback", "detail": "The proposal does not provide a clear rollback strategy in case of errors or issues with the new authority dimensions, which could lead to unintended consequences and make it difficult to revert to a previous state." },
      { "title": "Insufficient Validation", "detail": "The proposal does not specify how the new authority dimensions will be validated, which could lead to inconsistencies and errors in the system. For example, the proposal mentions that the operator sets the ceiling for each (productId, pipelineMode, authorityDimension) triple, but it does not explain how this ceiling will be validated or enforced." },
      { "title": "Over-Complexity", "detail": "The introduction of three new authority sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) may add unnecessary complexity to the system, making it more difficult to understand and manage. This could lead to errors and inconsistencies, particularly if the relationships between these sub-dimensions are not clearly defined." }
    ],
    "worse_than_status_quo": "The new authority dimensions may introduce additional complexity and overhead, potentially leading to a decrease in system performance and an increase in errors, making the system worse than the status quo if not properly implemented and validated.",
    "precedent": "No precedent known for a similar system with three authority sub-dimensions, making it difficult to predict the potential consequences and outcomes of this proposal."
  },
  "rejection_steelman": "The proposal's introduction of new authority dimensions and sub-dimensions may lead to unintended consequences and errors, and the lack of a clear rollback strategy and insufficient validation mechanisms make it difficult to ensure the system's stability and consistency. Therefore, it may be prudent to reject or defer the proposal until these concerns are addressed.",
  "answers": {
    "G-Q1-v2": { "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.", "rationale": "The removal of Mode 3B SUB-3B-BUILD and the introduction of a synthesized spec output aligns with the goal of reducing overlap and improving clarity in the pipeline modes." },
    "G-Q2-v2": { "pick_text": "Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defines — ratify.", "rationale": "The three sub-dimensions provide a more nuanced and detailed approach to authority management, allowing for more precise control and flexibility in the system." },
    "G-Q3-v2": { "pick_text": "Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensions = 12 independent ceilings per product).", "rationale": "The per-product per-mode per-dimension ceiling provides a flexible and granular approach to authority management, allowing operators to tailor their authority settings to specific products and modes." },
    "G-Q4-v2": { "pick_text": "v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is the right home.", "rationale": "The removal of Mode 2 SUB-2B from the SSOT and its inclusion in the FUTURE_CAPABILITIES.md catalogue allows for a more focused and manageable approach to pipeline mode development." },
    "G-Q5-v2": { "pick_text": "v2 attestation mechanism is correct — ratify operator self-attestation per URL enforced at InputArtifact validation.", "rationale": "The operator self-attestation mechanism provides a straightforward and efficient approach to ensuring that only authorized operators can submit URLs for synthesis." },
    "G-Q6-v2": { "pick_text": "v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.", "rationale": "The collapsed matrix with ~16 canonical cells and the introduction of §B.2 validity rules provides a more streamlined and consistent approach to configuration management." },
    "G-Q7-v2": { "pick_text": "v2 addresses all conditions sufficiently — promote as canonical.", "rationale": "The proposal addresses all 5 Panel conditions and incorporates CEO decisions, providing a comprehensive and well-considered approach to authority dimension management." }
  },
  "overall_notes": "The proposal introduces significant changes to the authority dimensions and pipeline modes, and while it addresses the Panel conditions and CEO decisions, it requires careful consideration and validation to ensure that the new authority dimensions and sub-dimensions do not introduce unintended consequences or errors."
}
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 42498 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Complexity of Authority Dimensions",
        "detail": "The introduction of three sub-dimensions for Authority Level (Build, Deploy, Operational) adds significant complexity. This could lead to confusion and misconfigurations, especially for operators who need to set these levels per product per mode."
      },
      {
        "title": "Lack of Prototype for Mode 2 SUB-2B",
        "detail": "Deferring Mode 2 SUB-2B entirely from the SSOT without a prototype means that a critical part of the system remains untested and unvalidated. This could lead to integration issues when it is eventually implemented."
      },
      {
        "title": "Operational Overhead of Ownership Attestation",
        "detail": "The requirement for operator self-attestation per URL in Mode 3B adds an operational overhead. This could slow down the process and introduce errors if operators fail to attest correctly."
      }
    ],
    "worse_than_status_quo": "The proposal introduces a complex authority dimension model that could lead to misconfigurations and operational overhead, making the system more cumbersome to manage than the current status quo.",
    "precedent": "The complex authority dimension model is reminiscent of the failed attempt to introduce multi-level access controls in the early versions of the OpenStack project, which led to significant user confusion and misconfigurations."
  },
  "rejection_steelman": "The proposal should be rejected or deferred because it introduces a high level of complexity with the three sub-dimensions of Authority Level. This complexity could lead to misconfigurations and operational overhead, making the system more difficult to manage. Additionally, deferring Mode 2 SUB-2B entirely from the SSOT without a prototype means that a critical part of the system remains untested and unvalidated, which could lead to integration issues in the future.",
  "answers": {
    "G-Q1-v2": {
      "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.",
      "rationale": "The proposal effectively addresses the overlap issue by removing the parallel build pipeline in Mode 3B, making the system more streamlined and focused."
    },
    "G-Q2-v2": {
      "pick_text": "Three sub-dimensions is right but the specific naming or scope is wrong — propose adjustment.",
      "rationale": "While the three sub-dimensions are necessary, the current naming and scope may not be intuitive for all users, potentially leading to misconfigurations."
    },
    "G-Q3-v2": {
      "pick_text": "Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensions = 12 independent ceilings per product).",
      "rationale": "This granularity provides the necessary flexibility for operators to configure authority levels appropriately for different modes and dimensions."
    },
    "G-Q4-v2": {
      "pick_text": "v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is the right home.",
      "rationale": "Deferring Mode 2 SUB-2B ensures that it is thoroughly tested and validated before being integrated into the SSOT, avoiding potential integration issues."
    },
    "G-Q5-v2": {
      "pick_text": "Attestation is right but should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation.",
      "rationale": "Requiring third-party verification adds an additional layer of security and trust, ensuring that the ownership attestation is valid and reliable."
    },
    "G-Q6-v2": {
      "pick_text": "v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.",
      "rationale": "The collapsed matrix with ~16 non-degenerate cells and validity rules provides a clear and manageable set of configurations, reducing the risk of misconfigurations."
    },
    "G-Q7-v2": {
      "pick_text": "v2 addresses all conditions sufficiently — promote as canonical.",
      "rationale": "The proposal addresses all the conditions raised by the Panel and incorporates the necessary changes to improve the system, making it ready for promotion."
    }
  },
  "overall_notes": "The proposal introduces significant changes that add complexity to the system. While these changes address the Panel's conditions, they also introduce new challenges that need to be carefully managed."
}
```
```

---

### Slot 5 — openrouter:cohere/command-r-plus-08-2024

- Provider: `openrouter`
- Latency: 35194 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Lack of clarity on authority levels",
        "detail": "The proposal introduces three sub-dimensions for authority levels, but it is not clear how these levels are determined or what criteria are used to set them. This could lead to confusion and potential misuse of the system."
      },
      {
        "title": "Potential for misuse of operator-owned products",
        "detail": "The proposal allows for the synthesis of products from operator-owned URLs, but it does not provide sufficient safeguards to prevent misuse. For example, an operator could use this feature to create a product that infringes on the intellectual property of another company."
      },
      {
        "title": "Lack of consideration for non-technical users",
        "detail": "The proposal assumes a high level of technical expertise on the part of the user, which may not be realistic for all users. This could lead to frustration and potential errors in the use of the system."
      }
    ],
    "worse_than_status_quo": "The proposal introduces a complex system with multiple modes, sub-modes, and authority levels, which could lead to confusion and potential misuse. It also does not provide sufficient safeguards to prevent misuse of operator-owned products, which could result in legal and ethical issues.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "The proposal introduces a complex system with multiple modes, sub-modes, and authority levels, which could lead to confusion and potential misuse. It also does not provide sufficient safeguards to prevent misuse of operator-owned products, which could result in legal and ethical issues. The system assumes a high level of technical expertise on the part of the user, which may not be realistic for all users, leading to frustration and potential errors in the use of the system."
  },
  "answers": {
    "G-Q1-v2": {
      "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.",
      "rationale": "The proposal has addressed the overlap issue by removing the parallel build pipeline in Mode 3B, and the remaining options do not provide a clear alternative classification."
    },
    "G-Q2-v2": {
      "pick_text": "Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defines — ratify.",
      "rationale": "The proposal's three sub-dimensions provide a comprehensive and clear framework for authority levels, and the other options do not provide a better alternative."
    },
    "G-Q3-v2": {
      "pick_text": "Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensions = 12 independent ceilings per product).",
      "rationale": "The proposal's per-product per-mode per-dimension ceiling provides a fine-grained and flexible approach to authority levels, and the other options do not provide a better alternative."
    },
    "G-Q4-v2": {
      "pick_text": "v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is the right home.",
      "rationale": "The proposal's decision to defer Mode 2 SUB-2B and catalog it as a future capability is appropriate, as it allows for further development and consideration before inclusion in the SSOT."
    },
    "G-Q5-v2": {
      "pick_text": "v2 attestation mechanism is correct — ratify operator self-attestation per URL enforced at InputArtifact validation.",
      "rationale": "The proposal's attestation mechanism provides a reasonable approach to ensuring operator ownership, and the other options do not provide a better alternative."
    },
    "G-Q6-v2": {
      "pick_text": "v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.",
      "rationale": "The proposal's collapsed matrix provides a clear and manageable set of configurations, and the other options do not provide a better alternative."
    },
    "G-Q7-v2": {
      "pick_text": "v2 addresses all conditions sufficiently — promote as canonical.",
      "rationale": "The proposal has addressed all of the Panel's conditions and CEO decisions, and the other options do not provide a better alternative."
    }
  },
  "overall_notes": "The proposal introduces a complex system with multiple modes, sub-modes, and authority levels, which could lead to confusion and potential misuse. It also does not provide sufficient safeguards to prevent misuse of operator-owned products, which could result in legal and ethical issues. The system assumes a high level of technical expertise on the part of the user, which may not be realistic for all users, leading to frustration and potential errors in the use of the system."
}
```

---

### Slot 6 [BACKUP FIRED] — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 74832 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:minimax/minimax-m2.7` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Runtime enforcement gap", "detail": "§B.2 validity rules exist only in spec with no implementation. The proposal admits in Conflict 10 that AutoRunner doesn't enforce these rules today, meaning users can submit invalid 324-cell combinations that will fail unpredictably." },
      { "title": "Attestation mechanism is toothless", "detail": "§A.1.4's ownership attestation relies entirely on operator self-declaration with no verification. A malicious operator can simply check 'owned' for any URL and FlowAI will synthesize from competitors' sites, creating legal liability." },
      { "title": "Authority dimension explosion", "detail": "§A.2's split from 1 to 3 authority dimensions creates 3^3=27 authority combinations per mode. Combined with 4 modes and 3 execution modes, operators must reason about 324 theoretical states, even if only ~16 are valid." },
      { "title": "JSONB migration without rollback", "detail": "Conflict 7 proposes adding a JSONB column to ProductRegistry with a complex nested structure but no migration rollback path. If the 4×3 matrix proves unwieldy, reverting requires manual data transformation." },
      { "title": "Mode 3B spec-only output contradicts synthesis", "detail": "§A.1.4 claims Mode 3B produces a 'synthesized product specification' but §D shows it just runs Mode 1 steps 1-4 on each URL then somehow 'extracts best elements' in step 6 with no concrete extraction algorithm specified." }
    ],
    "worse_than_status_quo": "The 3-authority-dimension model makes the system harder to operate than today's single dimension. An operator trying to enable autonomous crawling must now set 12 different ceiling values (4 modes × 3 dimensions) and risk misconfiguration that blocks legitimate runs.",
    "precedent": "Kubernetes RBAC started with simple roles but evolved into a complex matrix of verbs × resources × namespaces that most operators misconfigure, leading to overly permissive defaults. The 3-dimension authority model risks the same fate."
  },
  "rejection_steelman": "The proposal should be rejected until the runtime enforcement (Conflict 10) and JSONB migration (Conflict 7) are implemented and tested. Promoting a spec with admitted implementation gaps and no rollback path for a breaking schema change violates the principle of only canonicalizing what exists. Additionally, the ownership attestation mechanism provides false security that could expose FlowAI to copyright lawsuits.",
  "answers": {
    "G-Q1-v2": { "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.", "rationale": "Removing SUB-3B-BUILD eliminates the overlap with Mode 2, though the synthesis mechanism remains underspecified." },
    "G-Q2-v2": { "pick_text": "Two sub-dimensions is enough (e.g., collapse Deploy into Build or Operational).", "rationale": "Deploy-Authority is redundant with Build-Authority in practice — if you can modify code, you can embed deploy logic. The 3-way split adds complexity without security benefit." },
    "G-Q3-v2": { "pick_text": "Per-product per-mode only — coarser; one ceiling per mode, not split by sub-dimension.", "rationale": "The 4×3=12 ceiling matrix per product is too granular. Operators need per-mode control but not per-sub-dimension micromanagement." },
    "G-Q4-v2": { "pick_text": "v2 should ALSO defer Mode 3B (currently in SSOT as ROADMAP).", "rationale": "Mode 3B's synthesis engine is completely unbuilt per §E. Like SUB-2B, it should move to FUTURE_CAPABILITIES.md until a prototype exists." },
    "G-Q5-v2": { "pick_text": "Attestation is right but should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation.", "rationale": "Self-attestation provides no legal protection. DNS-TXT or domain validation would prevent operators from falsely claiming ownership." },
    "G-Q6-v2": { "pick_text": "§B.2 validity rules are wrong — propose alternative.", "rationale": "Rule 7 claims AUTOMATIC + Supervised is degenerate, but this could work with auto-queuing of approvals. Rule 8's constraint is arbitrary." },
    "G-Q7-v2": { "pick_text": "Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode 3B attestation before promotion.", "rationale": "The proposal has too many unimplemented critical paths (JSONB migration, validity enforcement, attestation validation) to promote without working code." }
  },
  "overall_notes": "The v2 proposal addresses Panel concerns in form but introduces new complexity (3-dimension authority, 12-cell ceiling matrix) without implementation backing."
}
```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 101726 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Ownership attestation unverifiable",
        "detail": "Section A.1.4 operator self-attestation for URL ownership lacks technical verification mechanisms (e.g., DNS validation). This creates legal exposure where malicious operators could falsely claim ownership, triggering copyright violations during Mode 3B synthesis. The audit log records attestations but cannot prevent bad-faith submissions."
      },
      {
        "title": "JSONB ceiling storage fragility",
        "detail": "Section A.2.4 ProductRegistry.authorityCeilings JSONB structure introduces schema drift risks. No validation constraints exist for the 4×3 matrix shape in §A.2.4 storage example. Malformed JSONB could default to recommend_only globally, breaking autonomous Mode 1 crawls unexpectedly."
      },
      {
        "title": "Degenerate config UX failure",
        "detail": "Section B.2 validity rules reject AUTOMATIC+Supervised combos at runtime but lack user guidance. In Guided Execution Mode, an operator selecting Build=Autonomous for Mode 3B (violating B.2 rule 5) receives only API errors without inline UI corrections, worsening discoverability versus status quo console warnings."
      },
      {
        "title": "Operational-Authority crawl cost explosion",
        "detail": "Section B.1 config #5 (Mode1/Op-Autonomous/Automatic) permits unbounded Aggressive Crawls per §6 default depth=8/pages=200. With $15/run ceiling, a product with 10 environments could incur $150/day autonomously - exceeding status quo manual crawl budgets without new budget alerts."
      }
    ],
    "worse_than_status_quo": "If an operator sets Mode 3B Operational-Authority to Autonomous while misconfiguring the ownership attestation validator (§Conflict 8), FlowAI could autonomously synthesize from competitor websites, triggering DMCA takedowns and legal liability that wouldn't occur under status quo manual research processes.",
    "precedent": "Google Books copyright litigation (2005-2015) where automated scanning of non-licensed content resulted in protracted lawsuits, demonstrating risks of insufficient ownership verification in synthesis systems."
  },
  "rejection_steelman": "The three-authority-dimension model introduces untenable complexity: operators must now manage 12 independent risk ceilings per product (4 modes × 3 dims), increasing configuration errors. Combined with unverified ownership attestations in Mode 3B, this creates legal and operational risks exceeding benefits. Defer until simplified authority model and DNS-based URL verification exist.",
  "answers": {
    "G-Q1-v2": {
      "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.",
      "rationale": "Removing SUB-3B-BUILD eliminates Mode 2/3B build duplication while preserving synthesis intent."
    },
    "G-Q2-v2": {
      "pick_text": "Three sub-dimensions is right but the specific naming or scope is wrong — propose adjustment.",
      "rationale": "'Operational-Authority' conflates crawl safety with API calls; split into 'Crawl-Authority' and 'Integration-Authority' for precision."
    },
    "G-Q3-v2": {
      "pick_text": "Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensions = 12 independent ceilings per product).",
      "rationale": "Per-mode granularity addresses Panel C3 by allowing different risk profiles for crawl vs. deploy actions."
    },
    "G-Q4-v2": {
      "pick_text": "v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is the right home.",
      "rationale": "Deferral aligns with CEO D3 and avoids overcommitting SSOT to unbuilt capabilities."
    },
    "G-Q5-v2": {
      "pick_text": "Attestation is right but should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation.",
      "rationale": "Self-attestation is insufficient for legal defensibility; DNS-TXT provides auditable technical proof."
    },
    "G-Q6-v2": {
      "pick_text": "v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.",
      "rationale": "Collapsing to non-degenerate configurations satisfies Panel C6 while excluding invalid combos like SUB-1A with Build-Autonomous."
    },
    "G-Q7-v2": {
      "pick_text": "v2 addresses all conditions sufficiently — promote as canonical.",
      "rationale": "All 5 Panel conditions and CEO decisions are substantively addressed despite implementation risks noted in objections."
    }
  },
  "overall_notes": "Promote with high-priority follow-ups: implement DNS verification for Mode 3B and add JSONB schema validation for authorityCeilings."
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 10416 ms
- HTTP status: OK

```
{"reviewer_slot":0,"adversarial_pass":{"objections":[{"title":"Mode 3B remains under-specified","detail":"§A.1.4 and §D describe Mode 3B as producing a synthesized product specification, but the artifact does not define the synthesis algorithm, conflict-resolution policy, or quality bar for choosing “best elements.” That leaves the most consequential step effectively discretionary, which makes auditability and reproducibility weak even if the ownership gate is added."},{"title":"Authority matrix can deadlock","detail":"§A.2.4 and §B.2 create a coupled ceiling system across four modes and three authority dimensions, but the validity rules are partly contradictory: §B.2.7 says any Supervised plus Automatic is degenerate, while §B.2.8 says Automatic requires all dims Autonomous or all Recommend-only. This is brittle enough that small config changes can yield runtime rejection loops instead of predictable operator control."},{"title":"Self-attestation is weak evidence","detail":"§A.1.4 relies on operator self-attestation per URL for Mode 3B ownership/licensing. In real operations, this is easy to misstate accidentally or deliberately, and there is no cryptographic or third-party proof requirement, no sampling audit, and no explicit remedy for false attestations beyond runtime rejection if detected."}],"worse_than_status_quo":"A team could migrate from a simpler, known-good single-ceiling model to this multi-axis system and suddenly find that common configurations are rejected as degenerate, while the accepted ones still allow ambiguous Mode 3B synthesis outputs. The result is less operationally usable governance: more false negatives at admission and less clarity about what the system is actually allowed to do.","precedent":"GitHub Copilot’s early enterprise governance discussions and several internal policy systems in large SaaS products have shown that self-attested permissions without independent verification are frequently error-prone; no precedent known for this exact three-axis SSOT structure."},"rejection_steelman":"The strongest argument for rejecting or deferring is that the draft canonicalizes a large governance surface before the implementation evidence exists. It introduces new schema, new validation, and new authority semantics while simultaneously carving out multiple ROADMAP and FUTURE_CAPABILITIES exceptions, which suggests the spec is ahead of the product. A conservative panel could reasonably defer until the per-mode authority validator, attestation checks, and Mode 3B synthesis path are implemented and demonstrated end-to-end.","answers":{"G-Q1-v2":{"pick_text":"v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.","rationale":"The overlap identified in v1 is explicitly removed by eliminating SUB-3B-BUILD and making Mode 3B output a spec, not a deployable build. On the text alone, that resolves the specific collision."},"G-Q2-v2":{"pick_text":"Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defines — ratify.","rationale":"The split is conceptually justified because code-writing, deployment, and runtime actions have different risk profiles and should not be forced into one knob. The naming is serviceable even if the implementation burden is high."},"G-Q3-v2":{"pick_text":"Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensions = 12 independent ceilings per product).","rationale":"This is the right granularity if the system truly wants mode-specific risk control. Coarser ceilings would reintroduce the very mismatch the draft is trying to fix."},"G-Q4-v2":{"pick_text":"v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is the right home.","rationale":"Removing an unbuilt capability from canonical SSOT is cleaner than labeling it roadmap inside the normative document. The future-capabilities file can track it without pretending it is operative policy."},"G-Q5-v2":{"pick_text":"Attestation is right but should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation.","rationale":"Self-attestation alone is too easy to game and too weak for a governance boundary that explicitly blocks third-party synthesis. A verifiable proof mechanism would preserve the restriction while reducing abuse and accidental misrepresentation."},"G-Q6-v2":{"pick_text":"v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.","rationale":"Collapsing degenerate combinations into runtime errors is preferable to bloating the SSOT with invalid states. The matrix is still complex, but at least it is now explicitly constrained."},"G-Q7-v2":{"pick_text":"v2 introduces NEW concerns not present in v1 — name them in rationale.","rationale":"The draft adds schema migration risk, unresolved implementation dependencies, and a weak ownership-attestation mechanism while also codifying a more complex governance lattice. Those are substantive new concerns, even if the conceptual direction is reasonable."}},"overall_notes":"My votes accept the conceptual fixes where they close specific v1 defects, but I do not think the overall package is ready to promote unchanged because the implementation and verification story still lags the normative structure."}
```

---

### Slot 9 — openrouter:meta-llama/llama-4-maverick

- Provider: `openrouter`
- Latency: 10521 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Mode 3B attestation risks",
        "detail": "The operator self-attestation mechanism in Mode 3B (§A.1.4) relies on the operator's honesty. There is no technical verification of ownership or license, which could lead to misuse or unauthorized synthesis of products from third-party URLs."
      },
      {
        "title": "Complexity in Authority Dimensions",
        "detail": "The introduction of three sub-dimensions under Authority Level (Build-Authority, Deploy-Authority, Operational-Authority) in §A.2 adds complexity. This could lead to confusion in configuration and management, especially with the per-product per-mode per-dimension ceiling rule (§A.2.4)."
      },
      {
        "title": "Configuration Validity Rules",
        "detail": "The validity rules in §B.2 are not enforced by any mechanism mentioned in the proposal. This could lead to runtime configuration errors if not properly implemented in the AutoRunner or other components."
      }
    ],
    "worse_than_status_quo": "If the attestation mechanism in Mode 3B is misused or not properly enforced, it could lead to legal or ethical issues due to unauthorized use of third-party content, making the system worse than the status quo."
  },
  "rejection_steelman": "The proposal introduces significant complexity with the three Authority sub-dimensions and the per-product per-mode per-dimension ceiling rule. This complexity could lead to operational difficulties and potential misconfigurations that might not be immediately apparent, making it a strong argument for deferring or rejecting the proposal until these aspects are further clarified or simplified."
},
  "answers": {
    "G-Q1-v2": {
      "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.",
      "rationale": "The removal of SUB-3B-BUILD from Mode 3B eliminates the overlap with Mode 2 SUB-2B, making the v2 definition clearer and more distinct."
    },
    "G-Q2-v2": {
      "pick_text": "Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defines — ratify.",
      "rationale": "The three sub-dimensions provide a granular control over different aspects of authority, which is beneficial for managing complex operations and security."
    },
    "G-Q3-v2": {
      "pick_text": "Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensions = 12 independent ceilings per product).",
      "rationale": "This granularity allows for precise control over authority ceilings, accommodating different risk profiles and operational needs across modes and dimensions."
    },
    "G-Q4-v2": {
      "pick_text": "v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is the right home.",
      "rationale": "Deferring Mode 2 SUB-2B until it is fully developed and tested is prudent, and cataloging it in FUTURE_CAPABILITIES.md keeps it tracked without prematurely canonicalizing it."
    },
    "G-Q5-v2": {
      "pick_text": "Attestation is right but should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation.",
      "rationale": "While attestation is a necessary step, relying solely on operator self-attestation may not be sufficient. Third-party verification could provide a stronger guarantee of ownership or license."
    },
    "G-Q6-v2": {
      "pick_text": "v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.",
      "rationale": "The collapse to non-degenerate cells simplifies the configuration matrix, and the validity rules provide a clear framework for determining valid configurations."
    },
    "G-Q7-v2": {
      "pick_text": "v2 addresses all conditions sufficiently — promote as canonical.",
      "rationale": "The revisions in v2 address the Panel's conditions and objections, providing a more robust and clear framework for governance and operation."
    }
  },
  "overall_notes": "The proposal significantly advances the governance architecture but introduces complexities that need careful implementation and monitoring."
}```
```

---

### Slot 10 — openrouter:x-ai/grok-4.3

- Provider: `openrouter`
- Latency: 21235 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      { "title": "§A.2.4 authorityCeilings JSONB novel", "detail": "§A.2.4 defines ProductRegistry.authorityCeilings as 4-mode × 3-dim JSONB but §E and §F list no schema migration or AutoRunner validator; Conflict 7 admits the field does not exist today." },
      { "title": "§A.1.4 attestation lacks enforcement", "detail": "Mode 3B ownershipAttestation is required at InputArtifact validation yet Conflict 8 states src/lib/renewal/inputArtifact.js has no such field and no runtime check exists." },
      { "title": "§B.2 validity rules unenforced", "detail": "Eight configuration validity rules are declared but §E table shows AutoRunner POST /api/orchestrator/run still accepts any tuple; degenerate runs will reach execution before rejection." }
    ],
    "worse_than_status_quo": "The three-sub-dimension ceiling matrix plus per-run attestation step will cause more runs to be rejected at the AutoRunner boundary than the prior single-authority model, increasing operator friction for routine Mode 1 crawls that previously succeeded.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "v2 adds substantial new schema (authorityCeilings JSONB), validation layers, and attestation UI without any prototype implementation or migration path, directly contradicting Locked Rule 9's automation-first principle and risking the same drift already documented in Conflicts 7-11.",
  "answers": {
    "G-Q1-v2": { "pick_text": "v2 fix resolves the overlap — ratify v2 Mode 3B definition (reports + synthesized specs only, consumed by Mode 2 SUB-2A; no parallel build pipeline) as canonical.", "rationale": "Overlap removal is explicit but still leaves Mode 3B attestation unbuilt." },
    "G-Q2-v2": { "pick_text": "Three sub-dimensions (Build-Authority, Deploy-Authority, Operational-Authority) as v2 defines — ratify.", "rationale": "Split is coherent yet adds configuration surface without enforcement." },
    "G-Q3-v2": { "pick_text": "Per-product per-mode per-dimension ceiling as v2 defines — ratify (4 modes × 3 sub-dimensions = 12 independent ceilings per product).", "rationale": "Granularity is precise but schema migration absent." },
    "G-Q4-v2": { "pick_text": "v2 defer is correct — Mode 2 SUB-2B removed from SSOT; FUTURE_CAPABILITIES.md catalogue is the right home.", "rationale": "Deferral avoids over-commitment." },
    "G-Q5-v2": { "pick_text": "v2 attestation mechanism is correct — ratify operator self-attestation per URL enforced at InputArtifact validation.", "rationale": "Self-attestation is weakest link but matches CEO D1." },
    "G-Q6-v2": { "pick_text": "v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.", "rationale": "Collapse reduces matrix but rules remain unenforced." },
    "G-Q7-v2": { "pick_text": "Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode 3B attestation before promotion.", "rationale": "Prototype gap is the dominant risk." }
  },
  "overall_notes": "All objections target concrete missing enforcement mechanisms in §§A,B,E,F."
}
```
