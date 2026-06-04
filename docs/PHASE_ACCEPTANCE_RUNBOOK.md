# FlowAI Phase Acceptance Runbook

**Authority:** `docs/CANONICAL_REFERENCE.md` + `docs/IMPLEMENTATION_PLAN.md` + `docs/BUILD_PROTOCOL.md`
**Applies:** P1 through P12, final human acceptance, final production deployment, and market-readiness.
**Rule:** WIRED != VERIFIED. Proof labels do not replace Evidence Tier A/B/C. MOCKED_E2E never closes live runtime claims.

---

## Global Operating Rules

- Every phase dispatch starts by reading `docs/CANONICAL_REFERENCE.md`, `docs/IMPLEMENTATION_PLAN.md`, and `docs/BUILD_PROTOCOL.md`.
- CB drafts from actual codebase state, builds, tests, audits, debugs, verifies, deploys when authorized, browser-tests, and reports.
- CD and CR independently verify evidence at required gates and end-of-phase review.
- W04 adjudicates, confirms browser/runtime proof, and issues clearances.
- CEO performs only the exact click/copy/paste/browser actions specified by W04/CB.
- Browser/runtime proof must be automated wherever possible.
- Manual proof must be reduced to exact URL/action/expected result.
- Do not stop for yes/no questions unless code/docs cannot resolve the decision and guessing would risk drift.
- No VERIFIED promotion occurs without the Claim Promotion Checklist in `docs/BUILD_PROTOCOL.md`.

---

## Proof Labels

Proof labels describe proof environment. Evidence Tier A/B/C remains canonical.

| Proof label | Meaning |
|---|---|
| UNIT | Local test or code-contract proof. |
| MOCKED_E2E | Browser proof with mocked network/SSE/backend. Never closes live runtime claims. |
| LIVE_PREVIEW | Unmocked runtime proof on preview/local target with HEAD/deployment identity. |
| LIVE_PRODUCTION | Unmocked runtime proof on production with production identity confirmed. |

---

## Global Automated Gates

Unless a dispatch explicitly narrows the gate, every phase build runs:

- targeted tests for changed modules
- `npm run lint:evidence`
- `npm run audit:commit -- --base [base] --head HEAD`
- `npm run preflight`
- `npm run test:e2e:ci` when UI, Forge, runtime launch, orchestration, deploy, monitor, ProductSSOT, browser proof, or production behavior changes

Accepted baseline failures remain only the current approved baseline. Any new failure is a blocker unless W04 records an explicit accepted residual-risk decision.

---

## Outstanding Governance Obligations Before P3

These obligations exist because commit `372231f` was a production hotfix before the HOTFIX lane existed.

1. Retroactive CD/CR Step 5 review of `372231f`.
2. Step 7 proof that the production alias serves `372231f`.
3. KEY SSRF security dispatch: DNS-failure path must re-check transport-resolved IP and fail closed on private/blocked IPs.
4. P3 remains blocked until all three are closed, unless W04 explicitly records accepted residual risk.

Review focus for `372231f`:

- SSRF DNS-failure path
- confirmed private IP blocking remains intact
- ranked candidate envelope emission timing
- production alias serves `372231f`
- no VERIFIED promotion

---

## P1 - Integrity Fixes

**Objective:** Keep scoring and evidence substrate honest.

**Build scope:** scoring integrity, matrix evidence linting, registry consistency, and related tests.

**Automated tests:**

- targeted P1 tests
- `npm run lint:evidence`
- `npm run audit:commit -- --base [base] --head HEAD`
- `npm run preflight`

**Browser/runtime proof:** none unless UI/runtime is touched.

**Proof labels:** UNIT.

**Evidence tier allowed:** Tier B for behavioral/code-contract tests; no Tier A unless persistent artifact is created.

**CD/CR audit focus:**

- no VERIFIED without `evidenceUrl`, `verifiedAt`, and `verifiedBy`
- known baseline failures unchanged
- no scoring shortcut treats stubs/advisories as complete

**W04/CEO acceptance action:** review DoD and confirm no browser action is required unless UI/runtime changed.

**PASS criteria:** evidence lint passes; no stale VERIFIED rows; baseline failures unchanged.

**FAIL action:** patch same branch before any later phase opens.

**Claim movement allowed:** STUBBED -> PARTIAL only.

---

## P2 - Live Execution

**Objective:** Forge steps 1-4 execute through real adapters where available and surface honest tool/ranked output.

**Build scope:** research/design/build/audit runners, orchestration, Tool Intelligence, SSRF/crawl, runtime launch, and UI display as applicable.

**Automated tests:**

- targeted forge/orchestra tests
- SSRF tests when crawl/fetch changes
- `npm run test:e2e:ci`
- global automated gates

**Browser/runtime proof:**

- Run Forge on preview or production with a public URL.
- Confirm run starts.
- Confirm URL/product context propagates.
- Confirm ranked candidates are visible or SSE-emitted.
- Confirm legitimate public URL is not SSRF-blocked.
- Confirm localhost/private/link-local URL remains blocked.

**Proof labels:** UNIT + MOCKED_E2E + LIVE_PREVIEW or LIVE_PRODUCTION.

**Evidence tier allowed:** Tier B for live runtime behavior; Tier A only if durable artifact exists.

**CD/CR audit focus:**

- MOCKED_E2E cannot be cited as live proof
- SSRF blocks confirmed private IPs
- ranking logic is not changed accidentally
- no raw JSON or `<pre>` on user-facing forge pages

**W04/CEO acceptance action:** execute exact URL/action supplied by CB or review automated browser proof with production/preview identity.

**PASS criteria:** unmocked runtime proof exists and all expected forge health checks pass.

**FAIL action:** HOTFIX if production is broken; otherwise patch branch before P3.

**Claim movement allowed:** WIRED/PARTIAL only unless durable evidence supports more.

---

## P3 - Minimal ProductSSOT

**Objective:** Persist forge step artifacts through authenticated ProductSSOT write path.

**Build scope:** forge artifact endpoint, ProductSSOT writer, UI persistence state, auth handling, rollback tests.

**Automated tests:**

- auth endpoint test
- browser service-role grep test
- atomic rollback test
- UI persistence state test
- global automated gates

**Browser/runtime proof:**

- Logged-in operator runs `/forge/research?productId=flowai&productName=FlowAI`.
- Confirm `persisted: success` with productId, stepKey, version/hash.
- Logged-out or unauthenticated run executes but shows `persisted: skipped_auth_required`.
- Forced write failure shows `persisted: failed`, not plain complete.

**Proof labels:** UNIT + LIVE_PREVIEW or LIVE_PRODUCTION.

**Evidence tier allowed:** Tier A only when durable ProductSSOT artifact exists; otherwise Tier B.

**CD/CR audit focus:**

- no browser service-role key
- no unauthenticated ProductSSOT write
- rollback preserves prior governance state
- 401 maps to skipped_auth_required; other write failure maps to failed

**W04/CEO acceptance action:** follow CB's exact authenticated and unauthenticated browser proof steps.

**PASS criteria:** authenticated durable artifact exists; unauthenticated write skipped.

**FAIL action:** patch before P4.

**Claim movement allowed:** persistence substrate PARTIAL; no VERIFIED without persistent reviewed evidence.

---

## P4 - Forge Step 5: Deploy

**Objective:** Add Step 5 Deploy with canonical per-target-class delivery artifact.

**Build scope:** deploy runner/template/scorer/logger/page/route, Vercel adapter, distribution registry, operator gate.

**Automated tests:**

- deploy runner tests
- operator gate tests
- adapter tests
- global automated gates
- E2E when UI/deploy path changes

**Browser/runtime proof:**

- Trigger deploy step on approved artifact.
- Confirm operator approval gate occurs before deploy/submission.
- Confirm output includes commitSha, deploymentId, target URL/package/artifact.
- Confirm no production promotion without CEO approval.

**Proof labels:** UNIT + LIVE_PREVIEW or LIVE_PRODUCTION.

**Evidence tier allowed:** Tier A when deployment artifact/URL/audit log is durable.

**CD/CR audit focus:**

- no fabricated URL/artifact
- operator gate before deploy/submission
- no autonomous public publishing
- target-class delivery artifact matches SSOT

**W04/CEO acceptance action:** perform exact approval/deploy browser steps supplied by CB.

**PASS criteria:** real delivery artifact produced; never fabricated.

**FAIL action:** patch before P5/P6/P7.

**Claim movement allowed:** deploy WIRED/PARTIAL until live persistent evidence is reviewed.

---

## P5 - Forge Step 6: Self-Renewal

**Objective:** Wrap Agent #3 as Step 6 Self-Renewal.

**Build scope:** renewal runner/template/scorer/logger/page/route and ProductSSOT write.

**Automated tests:**

- renewal runner tests
- human gate tests
- loop/escalation tests
- ProductSSOT write tests
- global automated gates

**Browser/runtime proof:**

- Run Self-Renewal against deployed artifact.
- Confirm issue -> proposed fix -> approval/gate -> applied or safely refused.
- Confirm before/after delta persisted.

**Proof labels:** UNIT + LIVE_PREVIEW or LIVE_PRODUCTION.

**Evidence tier allowed:** Tier A when before/after delta is durable; Tier B for behavior tests.

**CD/CR audit focus:**

- no silent production mutation
- unsafe loops escalate
- no fake success when no safe fix exists

**W04/CEO acceptance action:** perform exact renewal run and approval/refusal proof supplied by CB.

**PASS criteria:** no silent production mutation; unsafe loops escalate.

**FAIL action:** patch before P8 and before final vertical slice.

**Claim movement allowed:** PARTIAL/WIRED; VERIFIED only with durable before/after evidence and checklist.

---

## P6 - Forge Step 7: GTM

**Objective:** Add real post-deploy GTM step.

**Build scope:** GTM runner/template/scorer/logger/page/route and source-of-truth integration.

**Automated tests:**

- GTM runner tests
- readiness-blocking tests
- no-fabricated-claims tests
- global automated gates

**Browser/runtime proof:**

- Run GTM after deployed evidence exists.
- Confirm output cites actual product/deploy/ProductSSOT state.
- Confirm no fabricated market/readiness claims.
- Confirm human decision log exists.

**Proof labels:** UNIT + LIVE_PREVIEW or LIVE_PRODUCTION.

**Evidence tier allowed:** Tier A when GTM decision/evidence is durable.

**CD/CR audit focus:**

- readiness is not claimed without product evidence
- market claims are sourced
- governance/human gate is visible

**W04/CEO acceptance action:** review exact GTM output and decision log.

**PASS criteria:** GTM readiness is evidence-linked and gated.

**FAIL action:** patch before final vertical slice.

**Claim movement allowed:** PARTIAL/WIRED unless durable reviewed evidence supports more.

---

## P7 - Forge Step 8: Monitor

**Objective:** Add Step 8 Monitor with live signals and ProductSSOT write.

**Build scope:** monitor runner/template/scorer/logger/page/route, live check adapter, store-review signal when available.

**Automated tests:**

- monitor runner tests
- unavailable-state tests
- healthy-only-after-live-check tests
- ProductSSOT write tests
- global automated gates

**Browser/runtime proof:**

- Run monitor against live deployed URL.
- Confirm timestamped signal emitted.
- Confirm unavailable is marked honestly when no URL exists.
- Confirm store-review-status channel when distribution adapter exists.

**Proof labels:** UNIT + LIVE_PREVIEW or LIVE_PRODUCTION.

**Evidence tier allowed:** Tier A when monitor signal is durable.

**CD/CR audit focus:**

- no "healthy" without real live check
- monitor can recommend renewal but does not silently mutate
- timestamps and check type are present

**W04/CEO acceptance action:** perform exact monitor run supplied by CB.

**PASS criteria:** live monitor signal persisted or unavailable marked honestly.

**FAIL action:** patch before P8/P9.

**Claim movement allowed:** PARTIAL/WIRED unless durable reviewed evidence supports more.

---

## P8 - Symbiotic Loop

**Objective:** Make run N write ProductSSOT and run N+1 read it.

**Build scope:** full ProductSSOT, AutoRunner continuity, run-to-run read/write behavior.

**Automated tests:**

- two-run continuity tests
- ProductSSOT read/write tests
- multi-product fixture tests
- global automated gates

**Browser/runtime proof:**

- Run N writes ProductSSOT.
- Run N+1 reads prior ProductSSOT and changes behavior or explicitly explains no change.
- Repeat for at least two products.

**Proof labels:** UNIT + LIVE_PREVIEW or LIVE_PRODUCTION.

**Evidence tier allowed:** Tier A when ProductSSOT continuity is durable.

**CD/CR audit focus:**

- prior truth is not corrupted
- run-to-run continuity is real
- no product-specific hardcoding

**W04/CEO acceptance action:** follow exact two-run proof script supplied by CB.

**PASS criteria:** durable continuity evidence exists.

**FAIL action:** patch before P9.

**Claim movement allowed:** PARTIAL/WIRED; VERIFIED only after durable reviewed evidence.

---

## P9 - Reference Vertical Slice

**Objective:** Prove full 8-step loop through current reference fixtures using product-agnostic contracts.

**Current reference fixtures:** SAIGE and MyPregLife. These are current proof fixtures, not permanent protocol requirements.

**Build scope:** full 8-step runtime campaign, evidence capture, no product-specific core code paths.

**Automated tests:**

- full-pipeline targeted tests
- product-agnostic grep/static tests
- E2E/runtime tests
- global automated gates

**Browser/runtime proof:**

- Run current reference fixtures through steps 1-8.
- Confirm product-agnostic contracts are used.
- Confirm no product-specific core code path.
- Confirm every step produces phase-appropriate artifact.

**Proof labels:** UNIT + LIVE_PREVIEW + LIVE_PRODUCTION where production claims are made.

**Evidence tier allowed:** Tier A for durable full-loop evidence.

**CD/CR audit focus:**

- proof fixtures do not become hardcoded architecture
- all evidence is traceable
- no unsupported autonomous claim

**W04/CEO acceptance action:** review CB-provided full run URLs, ProductSSOT records, and production proof.

**PASS criteria:** reusable contracts proven beyond fixture-specific behavior.

**FAIL action:** patch before claim promotion.

**Claim movement allowed:** selected claims may become VERIFIED only through checklist.

---

## P10 - Claim Promotion

**Objective:** Promote SSOT/matrix claims only after evidence.

**Build scope:** matrixArtifact, traceability matrix, CANONICAL_REFERENCE updates, phase status.

**Automated tests:**

- lint:evidence
- audit:commit
- traceability checks
- preflight

**Browser/runtime proof:** document/traceability review unless UI/runtime touched.

**Proof labels:** UNIT; LIVE_PRODUCTION only for cited production evidence.

**Evidence tier allowed:** Tier A/B only with checklist.

**CD/CR audit focus:**

- every VERIFIED row has evidenceUrl, verifiedAt, verifiedBy
- no scaffolded feature labeled verified
- SSOT and code vocabulary match

**W04/CEO acceptance action:** review claim promotion package.

**PASS criteria:** every VERIFIED claim has complete evidence and review trail.

**FAIL action:** patch docs/matrix before P11/P12.

**Claim movement allowed:** PARTIAL -> VERIFIED only with checklist.

---

## P11 - Agent Graduation

**Objective:** Graduate step-owner agents and then remaining dormant agents as needed.

**Build scope:** Agents #6-#10 via OrchestratorHub step-owner wiring, then remaining agents by priority.

**Automated tests:**

- per-agent registry tests
- runtime invocation tests
- authority/gate tests
- global automated gates

**Browser/runtime proof:**

- For each graduated agent, trigger runtime invocation.
- Confirm role, authority, input, output, and human gate behavior.

**Proof labels:** UNIT + LIVE_PREVIEW or LIVE_PRODUCTION.

**Evidence tier allowed:** Tier A when invocation/audit evidence is durable.

**CD/CR audit focus:**

- rostered/implemented/wired/runtime-active/production-verified states are distinct
- authority remains recommend_only unless explicitly gated
- no autonomous escalation without human gate

**W04/CEO acceptance action:** review per-agent runtime proof package.

**PASS criteria:** registry and runtime proof distinguish all agent states honestly.

**FAIL action:** patch agent before graduation claim.

**Claim movement allowed:** agent-specific claims only.

---

## P12 - Product-Agnostic Expansion + Market Readiness

**Objective:** Prove FlowAI works for non-VEU products and reaches market-ready deployment.

**Build scope:** Ring-A product-agnostic cleanup, non-VEU onboarding, target-class readiness, final production deployment, market-readiness.

**Automated tests:**

- product-agnostic grep/static tests
- multi-product fixtures
- target-class tests
- production E2E
- global automated gates

**Browser/runtime proof:**

- Onboard non-VEU product through metadata/config only.
- Confirm no core source change.
- Confirm supported input modes and target classes behave per SSOT.
- Confirm final production deployment serves HEAD.
- Confirm final human acceptance completed.

**Proof labels:** UNIT + LIVE_PREVIEW + LIVE_PRODUCTION.

**Evidence tier allowed:** Tier A for final production/durable evidence.

**CD/CR audit focus:**

- no core runtime file assumes a VEU product
- target classes are represented correctly
- production claims match evidence
- deployment/distribution governance is intact

**W04/CEO acceptance action:** execute final acceptance script supplied by CB.

**PASS criteria:** FlowAI is deployed, governed, evidence-backed, product-agnostic, and ready for market use.

**FAIL action:** patch before release.

**Claim movement allowed:** final VERIFIED claims only with checklist.

---

## Final Human Acceptance

CB provides:

- final production URL
- exact scenario list
- exact browser/runtime actions
- expected visible/runtime result
- automated command list
- proof labels
- evidence tier claims
- final claim impact

W04 gives the acceptance instructions to CEO.

CEO performs only directed browser/click/copy/paste actions.

CD verifies SSOT consistency.

CR verifies evidence and production behavior.

CG verifies governance/spec coherence when final release claims are involved.

W04 issues final market-readiness clearance.

CEO authorizes final push/promotion/release.

---

## Final Deployment

Final deployment requires:

- production alias serves final HEAD
- Vercel deployment is Ready and production-targeted
- topmost deployment promoted only
- no older deployment promoted
- Doppler/env confirmed; no hardcoded secrets
- `npm run test:e2e:ci` passes against production
- unmocked production Forge run passes
- ProductSSOT evidence exists
- matrixArtifact / traceability entries updated only after evidence
- no unsupported autonomous claim remains
- CEO authorizes production release

---

## Phase Exit Report Template

Every end-of-phase report to W04/CEO and CD/CR includes:

```text
Phase:
Branch:
HEAD:
Base:
Files changed:
Read CANONICAL_REFERENCE.md, IMPLEMENTATION_PLAN.md, and BUILD_PROTOCOL.md at session start: yes
Mocked tests used: yes/no
Unmocked runtime proof: yes/no/N-A with reason
Production URL serving HEAD commit SHA verified: yes/no/N-A with reason
Proof labels used:
Evidence tier claimed:
Claim impact:
VERIFIED movement: yes/no
Tests run:
Accepted baseline failures:
Browser/runtime proof:
Production/deployment proof:
Residual risks:
CD/CR review package:
W04/CEO acceptance instructions:
PASS/FAIL recommendation:
```

