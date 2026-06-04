# FlowAI Build Protocol
**Version:** 1.1 | **Authority:** docs/CANONICAL_REFERENCE.md Section 28.7
**Active until:** FlowAI reaches 95/100 SSOT evidence
**Every dispatch begins with:** Read this file + docs/CANONICAL_REFERENCE.md + docs/IMPLEMENTATION_PLAN.md

---

## The 8-Step Build Loop

**STEP 1 - CB drafts dispatch**
CB drafts every future dispatch from actual codebase state. Before any
dispatch draft or build, CB reads `docs/CANONICAL_REFERENCE.md`,
`docs/IMPLEMENTATION_PLAN.md`, and `docs/BUILD_PROTOCOL.md`.

Each dispatch includes: scope, verified file paths, SSOT sections affected,
acceptance criteria, evidence tags (CODE / TEST / RUNTIME / PRODUCTION),
test requirements, action label (BUILD / CLEANUP / READ-ONLY), STOP
conditions, which SSOT claims this dispatch affects, and what tier
advancement is expected.

**STEP 2 - CEO pastes dispatch to CB / CD / CR / CG simultaneously**
KEY dispatches: all four reviewers. CB participates at Step 2 to confirm
build feasibility, file-path accuracy, scope, sequencing, and STOP
conditions; CB is not an independent reviewer of its own draft. CD, CR, and
CG provide independent review. CG participates at Step 2 only.

CLEANUP dispatches use the reviewer set specified by the dispatch unless the
cleanup changes behavior, scoring, governance, deploy, persistence, agent
authority, SSOT meaning, or verification status, in which case it is treated
as KEY.

All reports are filed independently. CEO pastes all reports to W04.

**STEP 3 - W04 reviews reports**
W04 adjudicates reviewer findings. ANY blocking finding from ANY reviewer
means W04 identifies what must change, CB drafts the revised dispatch, and
Step 2 repeats. W04 does not rewrite or edit CB output before it reaches CD
and CR.

All agree -> W04 sends "CLEAR TO BUILD."

**STEP 4 - CEO pastes agreed dispatch to CB only**
CB does NOT start until W04 has sent "CLEAR TO BUILD."
CB runs: Vitest + `npm run preflight` + `npm run audit:commit`.

CB produces DoD: branch, HEAD, tests run, known failures, evidence tag per
claim, preview/runtime URL if applicable, and Browser Test Instructions.
Every DoD must confirm:

`Read CANONICAL_REFERENCE.md, IMPLEMENTATION_PLAN.md, and BUILD_PROTOCOL.md at session start.`

Missing confirmation is a CD/CR BLOCK.

**STEP 5 - CEO pastes CB's DoD to CD and CR simultaneously**
CD and CR perform the SAME FULL CHECK independently. Neither sees the other's
report until both are filed to W04.

Both check:
- Does output match the SSOT?
- Is evidence real and correctly tiered? (WIRED != VERIFIED)
- Was any claim upgraded without Tier A/B proof?
- Does the build do what the dispatch said it would?
- Does the DoD contain complete Browser Test Instructions?

**STEP 5.5 - Claim Impact Check (inside each Step 5 report)**
CD and CR each state: which SSOT claims were touched, whether any moved
(STUBBED -> PARTIAL or PARTIAL -> VERIFIED), what evidence supports the move,
and whether the Traceability Matrix was consulted.

**STEP 6 - CEO pastes both CD and CR reports to W04**
W04 compares the reports and looks for what neither reviewer raised but the
SSOT would expect. Agree -> proceed. Disagree or gap -> patch dispatch -> CEO
pastes to CB -> CB patches same branch -> back to Step 5.

**STEP 7 - W04 + CEO perform highest applicable proof**
After Step 5 PASS, W04/CEO execute the highest applicable browser/runtime
proof on the preview or promoted target specified by the dispatch. Production
promotion happens only when the dispatch type requires it and W04 issues
CLEAR TO MERGE / CLEAR TO PROMOTE.

Proof type guide:
- UI/UX change -> browser test
- Backend / agent -> runtime/API proof
- Deploy step -> live URL + operator gate confirmed
- Docs / cleanup -> doc diff + traceability check

W04 gives exact action. CEO executes and reports. Pass -> W04 issues the
applicable clearance. Fail -> back to Step 6. Production breaks after promote
-> CEO reverts, W04 opens patch dispatch.

**STEP 7b - Post-merge SSOT update (before Step 8)**
CB drafts a CLEANUP dispatch updating: matrixArtifact entries
(evidenceUrl + verifiedAt), Section 18.4 ledger, Section 26 phase status,
Section 27 open-question count. CEO pastes to CB -> CB applies -> CD verifies
-> merge. ONLY THEN does Step 8 begin.

**STEP 8 - CB drafts next dispatch -> back to Step 1.**

---

## Browser Test Instructions Requirement

Every CB DoD must include a `BROWSER TEST INSTRUCTIONS` section with:

1. Automated gate:
   - command to run
   - expected pass count/result
   - target URL or `PLAYWRIGHT_BASE_URL` when applicable
2. Manual production checks or highest applicable proof:
   - URL, preview, API, document, or runtime target
   - exact action to perform
   - exact visible/runtime/document condition to confirm
3. PASS criteria:
   - what must be true for W04/CEO to close Step 7
4. FAIL criteria and action:
   - what blocks clearance
   - whether CB opens a patch branch or patches the same branch

Missing or vague Browser Test Instructions are a CD/CR BLOCK.

---

## Standing Rules

1. Every dispatch begins: "Read docs/BUILD_PROTOCOL.md,
   docs/CANONICAL_REFERENCE.md, and docs/IMPLEMENTATION_PLAN.md first."
2. CB / CD / CR / CG cite the exact SSOT section used for any finding.
   "SSOT says" is never from memory alone.
3. CD and CR file independently; neither sees the other's report until both
   are filed.
4. CB is the sole codebase writer. CD / CR / CG / W04 never write code.
5. CB does not start building until W04 sends "CLEAR TO BUILD."
6. Nothing merges without Step 7 proof appropriate to the dispatch type.
7. No claim advances to VERIFIED without Tier A/B evidence.
8. Patch loops stay on the same branch unless W04 declares reset.
9. CG joins every KEY dispatch at Step 2; exempt from Step 5/6.
10. The CEO holds paste and merge authority at every step. No tool can build,
    merge, push, or promote without CEO action.
11. Every CB DoD must include Browser Test Instructions with an automated
    gate, manual production checks or highest applicable proof, PASS criteria,
    and FAIL criteria/action.
12. W04 does not draft dispatches and does not touch or rewrite CB output
    before it reaches CD and CR. W04 adjudicates Step 6 and retains CLEAR TO
    BUILD, CLEAR TO MERGE, and CLEAR TO PROMOTE authority.
13. Victor performs only the exact click/copy/paste/browser actions specified
    by W04/CB, with no independent technical debugging or repo work.

---

## Role Accountability

| Role | Responsibility | Accountability gate |
|------|----------------|---------------------|
| W04 (Claude Chat) | Browser/runtime proof direction and confirmation; Step 6 adjudication; issues CLEAR TO BUILD / CLEAR TO MERGE / CLEAR TO PROMOTE; never drafts dispatches or writes code | Will not clear without conditions met |
| CB (Codex Builder) | Drafts dispatches from code reality; sole builder; builds, tests, commits; STOPs on unexpected state | Will not draft or build before reading the three governing docs; will not build without CLEAR TO BUILD |
| CD (Claude Code) | Full check - SSOT + evidence; files independently | Blocks on canonical drift or claim upgrade |
| CR (Codex Reviewer) | Full check - SSOT + evidence; files independently | Blocks on evidence violation or WIRED=VERIFIED |
| CG (ChatGPT) | Spec critic + governance; KEY dispatches Step 2 only | Flags spec conflicts and governance gaps |
| Victor (CEO) | Performs only the exact click/copy/paste/browser actions specified by W04/CB, with no independent technical debugging or repo work; holds merge/push/promote authority | Ultimate gate - nothing moves without CEO action |

---

*Canonical authority: docs/CANONICAL_REFERENCE.md Section 28.7*
*Loop version: 1.1 - 2026-06-03*

---
