# FlowAI Build Protocol
**Version:** 1.0 | **Authority:** docs/CANONICAL_REFERENCE.md §28.7
**Active until:** FlowAI reaches 95/100 SSOT evidence
**Every dispatch begins with:** Read this file + docs/CANONICAL_REFERENCE.md

---

## The 8-Step Build Loop

**STEP 1 — W04 drafts dispatch**
Includes: scope, SSOT sections affected, acceptance criteria,
evidence tags (CODE / TEST / RUNTIME / PRODUCTION), test requirements,
action label (BUILD / CLEANUP / READ-ONLY), which SSOT claims this
dispatch affects and what tier advancement is expected.

**STEP 2 — CEO pastes dispatch to CB · CD · CR · CG simultaneously**
KEY dispatches: all four reviewers.
CLEANUP dispatches: CB · CD · CR only.
All report independently. CEO pastes all reports to W04.

**STEP 3 — W04 reviews reports**
ANY blocking finding from ANY reviewer → W04 revises → repeat Step 2.
All agree → W04 sends "CLEAR TO BUILD."

**STEP 4 — CEO pastes agreed dispatch to CB only**
CB does NOT start until W04 has sent "CLEAR TO BUILD."
CB runs: Vitest + npm run preflight + npm run audit:commit.
CB produces DoD: branch, HEAD, tests run, known failures,
evidence tag per claim, preview/runtime URL if applicable.

**STEP 5 — CEO pastes CB's DoD to CD and CR simultaneously**
CD and CR perform the SAME FULL CHECK independently.
Neither sees the other's report until both are filed to W04.
Both check:
  - Does output match the SSOT?
  - Is evidence real and correctly tiered? (WIRED ≠ VERIFIED)
  - Was any claim upgraded without Tier A/B proof?
  - Does the build do what the dispatch said it would?

**STEP 5.5 — Claim Impact Check (inside each Step 5 report)**
CD and CR each state: which SSOT claims were touched, whether any
moved (STUBBED→PARTIAL or PARTIAL→VERIFIED), what evidence supports
the move, and whether the Traceability Matrix was consulted.

**STEP 6 — CEO pastes both CD and CR reports to W04**
W04 compares AND looks for what neither reviewer raised but the SSOT
would expect. Agree → proceed. Disagree or gap → patch dispatch →
CEO pastes to CB → CB patches same branch → back to Step 5.

**STEP 7 — W04 + CEO perform highest applicable proof**
  UI/UX change      → browser test
  Backend / agent   → runtime/API proof
  Deploy step       → live URL + operator gate confirmed
  Docs / cleanup    → doc diff + traceability check
W04 gives exact action. CEO executes and reports.
Pass → W04 issues CLEAR TO MERGE →
       CEO: merge + push + Vercel promote (topmost only).
Fail → back to Step 6.
Production breaks after promote → CEO reverts, W04 opens patch dispatch.

**STEP 7b — Post-merge SSOT update (before Step 8)**
W04 drafts a CLEANUP dispatch updating: matrixArtifact entries
(evidenceUrl + verifiedAt), §18.4 ledger, §26 phase status,
§27 open-question count. CEO pastes to CB → CB applies →
CD verifies → merge. ONLY THEN does Step 8 begin.

**STEP 8 — W04 drafts next dispatch → back to Step 1.**

---

## Standing Rules

1. Every dispatch begins: "Read docs/BUILD_PROTOCOL.md and
   docs/CANONICAL_REFERENCE.md first."
2. CB · CD · CR · CG cite the exact SSOT section used for
   any finding. "SSOT says" is never from memory alone.
3. CD and CR file independently — neither sees the other's
   report until both are filed.
4. CB is the sole codebase writer. CD · CR · CG · W04
   never write code.
5. CB does not start building until W04 sends "CLEAR TO BUILD."
6. Nothing merges without Step 7 proof appropriate to the
   dispatch type.
7. No claim advances to VERIFIED without Tier A/B evidence.
8. Patch loops stay on the same branch unless W04 declares reset.
9. CG joins every KEY dispatch at Step 2; exempt from Step 5/6.
10. The CEO holds paste and merge authority at every step.
    No tool can build, merge, push, or promote without CEO action.

---

## Role Accountability

| Role | Responsibility | Accountability gate |
|------|---------------|-------------------|
| W04 (Claude Chat) | Orchestrates; drafts dispatches; issues CLEAR TO BUILD / CLEAR TO MERGE; never writes code | Will not clear without conditions met |
| CB (Codex Builder) | Sole builder; builds, tests, commits; STOPs on unexpected state | Will not start without CLEAR TO BUILD |
| CD (Claude Code) | Full check — SSOT + evidence; files independently | Blocks on canonical drift or claim upgrade |
| CR (Codex Reviewer) | Full check — SSOT + evidence; files independently | Blocks on evidence violation or WIRED=VERIFIED |
| CG (ChatGPT) | Spec critic + governance; KEY dispatches Step 2 only | Flags spec conflicts and governance gaps |
| Victor (CEO) | Paste and approve; holds merge/push/promote authority | Ultimate gate — nothing moves without CEO action |

---
*Canonical authority: docs/CANONICAL_REFERENCE.md §28.7*
*Loop version: 1.0 — 2026-06-01*

---
