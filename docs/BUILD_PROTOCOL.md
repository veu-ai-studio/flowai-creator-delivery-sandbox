# FlowAI Build Protocol
**Version:** 1.2 | **Authority:** docs/CANONICAL_REFERENCE.md Section 28.7
**Active until:** FlowAI reaches 95/100 SSOT evidence
**Every dispatch begins with:** Read this file + docs/CANONICAL_REFERENCE.md + docs/IMPLEMENTATION_PLAN.md

---

## Proof Labels And Evidence Tiers

Proof labels describe where and how proof was gathered. They do not replace the canonical Evidence Tier A/B/C taxonomy in docs/IMPLEMENTATION_PLAN.md and docs/CANONICAL_REFERENCE.md Section 28.7.6.

| Proof label | Meaning | Evidence effect |
|---|---|---|
| UNIT | Local Vitest, unit, static, or behavioral tests. | Can support Tier B only when assertions execute real behavior or stable code contracts. |
| MOCKED_E2E | Browser/Playwright proof with mocked network, mocked SSE, mocked backend, fixtures, or page.route(). | Useful for UI rendering confidence. Never sufficient alone for runtime, production, persistence, deploy, monitor, or VERIFIED claims. |
| LIVE_PREVIEW | Unmocked runtime proof on a preview deployment or local dev server. | Counts only when target URL and HEAD/deployment identity are identified. Can close runtime wiring claims when production behavior is not claimed. |
| LIVE_PRODUCTION | Unmocked runtime proof on production. | Required for production behavior claims, deployment claims, monitor claims, production regressions, and any future VERIFIED promotion dependent on production behavior. |

Rules:
- No phase claim advances from MOCKED_E2E alone.
- Any DoD saying "E2E passed" must state whether the E2E was mocked or unmocked.
- LIVE_PRODUCTION alone is not automatically Tier A. VERIFIED requires persistent Tier A or valid Tier B evidence plus the claim-promotion checklist.
- WIRED remains distinct from VERIFIED.

---

## The 8-Step Build Loop

**STEP 1 - CB drafts dispatch**
CB drafts every future dispatch from actual codebase state. Before any dispatch draft or build, CB reads `docs/CANONICAL_REFERENCE.md`, `docs/IMPLEMENTATION_PLAN.md`, and `docs/BUILD_PROTOCOL.md`.

Each dispatch includes: scope, verified file paths, SSOT sections affected, acceptance criteria, proof labels, evidence tier expectations, test requirements, action label (BUILD / CLEANUP / READ-ONLY / HOTFIX), STOP conditions, which SSOT claims this dispatch affects, and what tier advancement is expected.

**STEP 2 - CEO pastes dispatch to CB / CD / CR / CG simultaneously**
KEY dispatches: all four reviewers. CB participates at Step 2 to confirm build feasibility, file-path accuracy, scope, sequencing, and STOP conditions; CB is not an independent reviewer of its own draft. CD, CR, and CG provide independent review. CG participates at Step 2 only.

CLEANUP dispatches use the reviewer set specified by the dispatch unless the cleanup changes behavior, scoring, governance, deploy, persistence, agent authority, SSOT meaning, or verification status, in which case it is treated as KEY.

All reports are filed independently. CEO pastes all reports to W04.

**STEP 3 - W04 reviews reports**
W04 adjudicates reviewer findings. ANY blocking finding from ANY reviewer means W04 identifies what must change, CB drafts the revised dispatch, and Step 2 repeats. W04 does not rewrite or edit CB output before it reaches CD and CR.

All agree -> W04 sends "CLEAR TO BUILD."

**STEP 4 - CEO pastes agreed dispatch to CB only**
CB does NOT start until W04 has sent "CLEAR TO BUILD," except under the HOTFIX lane below. CB runs: targeted tests, Vitest where applicable, `npm run preflight`, `npm run lint:evidence`, and `npm run audit:commit`.

CB produces DoD: branch, HEAD, files changed, tests run, known failures, proof label per proof, evidence tier per claim, claim impact, preview/runtime URL if applicable, Browser Test Instructions, and the mandatory DoD proof fields below.

Every DoD must confirm:

`Read CANONICAL_REFERENCE.md, IMPLEMENTATION_PLAN.md, and BUILD_PROTOCOL.md at session start.`

Missing confirmation is a CD/CR BLOCK.

**STEP 5 - CEO pastes CB's DoD to CD and CR simultaneously**
CD and CR perform the SAME FULL CHECK independently. Neither sees the other's report until both are filed to W04.

Both check:
- Does output match the SSOT?
- Is evidence real and correctly tiered? (WIRED != VERIFIED)
- Was any claim upgraded without Tier A/B proof?
- Does the build do what the dispatch said it would?
- Does the DoD contain complete Browser Test Instructions?
- Are mocked and unmocked proofs labeled correctly?

**STEP 5.5 - Claim Impact Check (inside each Step 5 report)**
CD and CR each state: which SSOT claims were touched, whether any moved (STUBBED -> PARTIAL, PARTIAL -> WIRED, or PARTIAL -> VERIFIED), what evidence supports the move, and whether the Traceability Matrix was consulted.

**STEP 6 - CEO pastes both CD and CR reports to W04**
W04 compares the reports and looks for what neither reviewer raised but the SSOT would expect. Agree -> proceed. Disagree or gap -> patch dispatch -> CEO pastes to CB -> CB patches same branch -> back to Step 5.

**STEP 7 - W04 + CEO perform highest applicable proof**
After Step 5 PASS, W04/CEO execute the highest applicable browser/runtime proof on the preview or promoted target specified by the dispatch. Production promotion happens only when the dispatch type requires it and W04 issues CLEAR TO MERGE / CLEAR TO PROMOTE.

Proof type guide:
- UI/UX change -> browser test
- Backend / agent -> runtime/API proof
- Deploy step -> live URL + operator gate confirmed
- Docs / cleanup -> doc diff + traceability check

Every production proof must confirm the production URL is serving the intended HEAD commit or deployment.

Acceptable production identity proof:
- Vercel deployment inspect/alias output showing target production and current deployment.
- Explicit production endpoint/build metadata showing HEAD SHA.
- Manual Vercel dashboard confirmation directed by W04/CB.

If Vercel CLI reports wrong team/project, alias ambiguity, stale alias, or deployment mismatch, production proof is incomplete until alias-to-deployment is confirmed.

W04 gives exact action. CEO executes and reports. Pass -> W04 issues the applicable clearance. Fail -> back to Step 6. Production breaks after promote -> CEO reverts or invokes HOTFIX, W04 opens or accepts patch dispatch.

**STEP 7b - Post-merge SSOT update (before Step 8)**
CB drafts a CLEANUP dispatch updating: matrixArtifact entries (evidenceUrl + verifiedAt), Section 18.4 ledger, Section 26 phase status, Section 27 open-question count. CEO pastes to CB -> CB applies -> CD verifies -> merge. ONLY THEN does Step 8 begin.

**STEP 8 - CB drafts next dispatch -> back to Step 1.**

---

## HOTFIX Lane

HOTFIX applies only when production is broken or a live security exposure exists. This lane is authorized by docs/CANONICAL_REFERENCE.md Section 28.7.4.

Rules:
- CB drafts a narrow hotfix dispatch from actual codebase state.
- Minimum pre-merge review is W04 adjudication plus one independent reviewer report.
- CR is preferred for security/runtime. CD is preferred for SSOT/data-shape.
- CEO may authorize expedited build, merge, push, and promotion.
- After merge, retroactive full Step 5 review by CD and CR is mandatory.
- After merge, Step 7 production proof is mandatory.
- No non-hotfix phase work may resume until retroactive Step 5 and Step 7 proof are complete.
- Any residual blocker becomes an immediate patch dispatch.
- HOTFIX does not allow VERIFIED promotion.

---

## Mandatory DoD Proof Fields

Every CB DoD must include these exact fields:

```text
Mocked tests used: yes/no
Unmocked runtime proof: yes/no/N-A with reason
Production URL serving HEAD commit SHA verified: yes/no/N-A with reason
Proof labels used: UNIT / MOCKED_E2E / LIVE_PREVIEW / LIVE_PRODUCTION
Evidence tier claimed: A / B / C / none
Claim impact: no movement / STUBBED->PARTIAL / PARTIAL->WIRED / PARTIAL->VERIFIED
VERIFIED movement: yes/no
```

Missing field = CD/CR BLOCK.
Unjustified N-A = CD/CR BLOCK.

---

## Claim Promotion Checklist

Before any PARTIAL -> VERIFIED movement:

- `evidenceUrl` exists.
- `verifiedAt` exists.
- `verifiedBy` exists.
- Proof label is appropriate.
- Evidence tier is A or valid B.
- CD review confirms canonical consistency.
- CR review confirms evidence validity.
- W04 confirms claim movement.
- matrixArtifact / traceability source updated.
- No mocked-only proof is cited as live proof.

No checklist completion = no VERIFIED promotion.

---

## Forge Health Check Requirement

Any KEY dispatch touching Forge UI, forge runners, orchestration, tool selection, SSRF/crawl, persistence, deploy, monitor, ProductSSOT, or runtime launch requires one unmocked LIVE_PREVIEW or LIVE_PRODUCTION forge health check.

Minimum check:
- preview or production URL identified
- HEAD/deployment identity confirmed
- input URL identified
- run starts without fatal error
- URL/product context propagates
- ranked tool list visible or SSE-emitted for every running step where Tool Intelligence applies
- legitimate public URL is not SSRF-blocked
- localhost/private/link-local URL remains blocked
- no raw JSON, no JSON.stringify output, no `<pre>` output on user-facing forge pages
- ProductSSOT persistence state verified when phase includes persistence
- Browser Test Instructions include exact URL/action/expected result

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

1. Every dispatch begins: "Read docs/BUILD_PROTOCOL.md, docs/CANONICAL_REFERENCE.md, and docs/IMPLEMENTATION_PLAN.md first."
2. CB / CD / CR / CG cite the exact SSOT section used for any finding. "SSOT says" is never from memory alone.
3. CD and CR file independently; neither sees the other's report until both are filed.
4. CB is the sole codebase writer. CD / CR / CG / W04 never write code.
5. CB does not start non-HOTFIX builds until W04 sends "CLEAR TO BUILD."
6. Nothing merges without Step 7 proof appropriate to the dispatch type, except HOTFIX merges, which require retroactive Step 5 and Step 7 before non-hotfix work resumes.
7. No claim advances to VERIFIED without Tier A/B evidence and the Claim Promotion Checklist.
8. Patch loops stay on the same branch unless W04 declares reset.
9. CG joins every KEY dispatch at Step 2; exempt from Step 5/6.
10. The CEO holds paste and merge authority at every step. No tool can push or promote without CEO action or explicit CEO instruction.
11. Every CB DoD must include Browser Test Instructions with an automated gate, manual production checks or highest applicable proof, PASS criteria, and FAIL criteria/action.
12. W04 does not draft dispatches and does not touch or rewrite CB output before it reaches CD and CR. W04 adjudicates Step 6 and retains CLEAR TO BUILD, CLEAR TO MERGE, and CLEAR TO PROMOTE authority.
13. Victor performs only the exact click/copy/paste/browser actions specified by W04/CB, with no independent technical debugging or repo work.
14. Proof labels are not evidence tiers. Evidence Tier A/B/C remains canonical.

---

## Role Accountability

| Role | Responsibility | Accountability gate |
|------|----------------|---------------------|
| W04 (Claude Chat) | Browser/runtime proof direction and confirmation; Step 6 adjudication; issues CLEAR TO BUILD / CLEAR TO MERGE / CLEAR TO PROMOTE; never drafts dispatches or writes code | Will not clear without conditions met |
| CB (Codex Builder) | Drafts dispatches from code reality; sole builder; builds, tests, audits, debugs, verifies, deploys when authorized, browser-tests, reports, and STOPs on unexpected state | Will not draft or build before reading the three governing docs; will not build non-HOTFIX work without CLEAR TO BUILD |
| CD (Claude Code) | Full check - SSOT + evidence; files independently at required review gates and end-of-phase review | Blocks on canonical drift or claim upgrade |
| CR (Codex Reviewer) | Full check - SSOT + evidence; files independently at required review gates and end-of-phase review | Blocks on evidence violation or WIRED=VERIFIED |
| CG (ChatGPT) | Spec critic + governance; KEY dispatches Step 2 only unless W04/CEO requests final-release review | Flags spec conflicts and governance gaps |
| Victor (CEO) | Performs only the exact click/copy/paste/browser actions specified by W04/CB, with no independent technical debugging or repo work; holds merge/push/promote authority | Ultimate gate - nothing moves without CEO action |

---

*Canonical authority: docs/CANONICAL_REFERENCE.md Section 28.7*
*Loop version: 1.2 - 2026-06-04*

---
