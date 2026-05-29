# Production-Readiness Gaps — consolidated punch list

**Author:** W2, 2026-05-18.
**Source:** `docs/specs/FOUNDATION_AUDIT_BACKLOG.md` (commit `b48c856`, 25 items) re-verified against current `flowai-v0.1` HEAD (`4bfe8ca`) + cross-checked against CANONICAL_REFERENCE.md §26 / §27 + CANONICAL_HISTORY.md ENTRY 010 "Remaining for Phase A close".
**Method:** read-only grep + ls + Read across `src/`, `api/`, `supabase/migrations/`, `docs/specs/`. Every row below cites either a closing commit OR a file:line evidencing the open state. No code touched by this dispatch.
**Scope-claim:** this is the single canonical punch-list between FlowAI today and production. If a gap isn't on this list, it isn't a known production blocker.

---

## Master gap table (open + recently-closed, ranked by criticality)

Status legend: **OPEN-BLK** = open + blocks production. **OPEN-NB** = open but does not block production. **CLOSED** = resolved (commit cited). **PARTIAL** = scaffolding shipped, load-bearing behaviour incomplete.

| # | ID | Gap | Status | Block? | Owner | Depends on | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | **P1-3** | §11 Clearance Step 5 four-prerequisite gate enforcement (GTM Readiness exists / score≥75 + zero critical / Self-Renewal terminal-decision / LIMITATIONS published) | **OPEN-BLK** | **YES** | W2 + W5b | P0-3, P1-1 (closed), §28 | `src/components/clearance/ClearanceWizard.jsx:608` renders Step 5 UI but no code references the 4-prereq gate logic; grep `four.prerequisite\|GTM Readiness Report exists` → 0 hits in src/ |
| 2 | **P0-3** | §7.6 GTM Readiness Report scoring formula `100 − 10·crit − 5·high − 2·med − 0.5·low` | **OPEN-BLK** | **YES** | W2 | Agent #21 issue-detector output | grep `count_critical\|severity_weight` → 0 hits in src/ api/. `preScoreAdapter.js` produces a /100 score but it's `sum(l1..l5 × 2)` Five-Layer aggregate, NOT the §7.6 issue-count formula |
| 3 | **P0-1** | §6 authenticated crawl traversal in the live Conductor flow (actual credentialed login attempt + `storageState` re-render per §6 pass #2) | **OPEN-BLK** | **YES** | W5a | AUTH_TRAVERSAL_SECURITY_SPEC.md v3 (re-ratified) | `Agent21AggressiveCrawlConductor.js:25` "mark `authGated: true` and CONTINUE"; `crawler.js:423` `storageState` reference is comment-only; no `loginEmail`/`loginPassword` consumption. ENTRY 007 confirms the security infrastructure (`scrubArtifacts.js` + 10 invariants tested) is shipped — but the **traversal-on-real-credentials wire-in to the assessment path is not** |
| 4 | **P0-5** | §7 Output Contract item #5 — atomic ProductSSOT write with rollback-on-failure | **OPEN-BLK** | **YES** | W2 | P0-2 (closed) | `src/lib/agents/renewal/optionCPipeline.js:184` says verbatim *"write (NOT atomic — flagged as a future hardening item)"*. ProductSSOT writes happen but a failed write does NOT roll back the entire pipeline run per §7 line 132 |
| 5 | **ENTRY-010 #5** | Full GTM-ready loop verified end-to-end (sustained ≥75/100 across repeat-until-GTM loop iterations) | **OPEN-BLK** | **YES** | W5b | P0-3, P1-3, P1-1 (closed) | ENTRY 010 demonstrates single-pass 42/100 + real branch + real Vercel URL but does NOT show sustained ≥75/100 across multiple iterations. The orchestrator's 14-step repeat-until-GTM contract exists; the demonstration that it CONVERGES on real products is the missing proof |
| 6 | **P0-4** | Agent #21 Phase 2-3 wire-in (MessageBus + ProductSSOT writes + escalation rules) | **PARTIAL → OPEN-NB** | no | W5a | none remaining | MessageBus closed (P1-4). ProductSSOT writes happen (optionCPipeline.js:186-196 SELECT + UPDATE on `product_ssot.governance_record`). Escalation rules (`xss-in-form-echo` → admin-gate, etc.) not yet wired. SSOT row 479 still reads "DORMANT" but in practice Phase 1 + topic emission shipped |
| 7 | **P1-2** | §28 Symbiotic Feed-Back Loop (pre-pipeline-run READ from ProductSSOT to narrow crawl scope) | **OPEN-NB** | no | W5a (Agent #6) | P1-5, ProductSSOT UI override | ProductSSOT substrate exists + writes happen, but no code does pre-run READ of `architecture_snapshot.pages[]` to narrow the crawl. Agent #6 still DORMANT. §28.3 admin overrides have no UI surface |
| 8 | **P1-5** | Agent #6 Research charter (pre-pipeline ProductSSOT read + crawl-scope narrowing) | **OPEN-NB** | no | W5a | ProductSSOT readers | grep `Agent6\|Research.*charter` → no executor wiring. Step 1 Research still goes through `/api/research-url` → Claude directly, bypassing Agent #6 |
| 9 | **P2-3** | Agent #8 Quality Audit 5-dimension /95 path in the AutoRunner critical path | **OPEN-NB** | no | W5b | none | `src/lib/governance/ScoreEvaluator.js` (CLEARANCE_THRESHOLD=95) is consumed by `src/lib/audits/*` but NOT by AutoRunner. AutoRunner shows the /50 Monitor verdict; /95 governance verdict never surfaces to the operator |
| 10 | **P2-5** | Agent #10 customer signals (CA-9-C: in-app widget, app-store scraping, ticket webhooks) | **OPEN-NB** | no | W3 (TBD) | none | No `/api/customer/feedback` route, no `/api/customer/support-ticket-webhook` route. UNBUILT |
| 11 | **P2-7** | Agent #13 Self-Protection orchestrating layer (DMCA, clone detection, Cloudflare Bot Mgmt) | **OPEN-NB** | no | W3 (TBD) | none | Embedded Self-Protection is LIVE; orchestrating layer UNBUILT |
| 12 | **P2-8** | Agent #15 + #17 + #26 (CA-9 trio: benchmarking, deprecation proposals, Orchestra auto-admission) | **OPEN-NB** | no | W3 (TBD) | MessageBus topic schemas (closed) | None of 9 `15.benchmark.*` / `17.orchestra.*` / `26.orchestra.*` topics emitted. Auto-admission gate UNBUILT |
| 13 | **P2-2,4,6,9** | Agents #7, #9, #11, #12, #14, #16, #18, #19, #20, #22-25 — 12 DORMANT agents | **OPEN-NB** | no | W3 (TBD) | per-agent specs (ENTRY 009: 14 REVISE) | All charters in SSOT §15.1; no executors. Wave 1 BLOCKED per ENTRY 009 (Panel verdict 0 PROMOTE / 3 conditional / 14 REVISE) |
| 14 | **P2-10** | Agent #4 Provider Onboarding — Stripe Connect deployment | **OPEN-NB** | no | W2 + Ops | Stripe credentials in Vercel env, webhook receiver | Reclassified PARTIAL per ENTRY 008 (`88113f2`, `8b2be5f`). Executor exists; live deployment incomplete |
| 15 | **ENTRY-010 #1** | FlowAI Dashboard UI for live run observation | **PARTIAL → OPEN-NB** | no | W5b | none | `src/pages/FlowAIDashboard.jsx` shipped (`3c5e6b4`). Operator-facing completeness (mode controls + iteration history + GTM trajectory chart) per ENTRY 010 — partial; UI polish + integration tests remaining |
| 16 | **P3-1** | Tool marketplace category count mismatch (SSOT 65/12+1 vs code 61/14) | **OPEN-NB** | no | CEO decision | none | §27 Open Question. Pure SSOT-vs-code reconciliation |
| 17 | **P3-2** | CA-4 / CA-5 / CA-6 pending CEO disposition | **OPEN-NB** | no | CEO | none | §26 line 1018. Each needs a separate CEO dispatch |
| 18 | **P3-3** | Multi-LLM routing decision engine | **OPEN-NB** | no | CEO + W5b | Agent #4 graduation | §27 Open Question #4. "NO RECORD FOUND" in SSOT §2 |
| 19 | **P3-4** | Capability Transfer as canonical L4 surface | **OPEN-NB** | no | CEO | none | §27 Open Question #5. Open whether ALL future capabilities ship as transferable packages |
| 20 | **P3-5** | Orchestra Selection axis enum rename ('guided'→'recommended', 'manual'→'user-choice') | **OPEN-NB** | no | W5b | none | §27 Open Question #6. Surface-only vs enum rename |

## Closed items verified (cited closing commit per row)

| ID | Gap | Closed by | Verification |
|---|---|---|---|
| **P0-2** | ProductSSOT entity substrate (table + version log + RLS) | `7edd58d` (migration 0013) + `91f0c71` (0015) — both APPLIED to live Supabase per ENTRY 010 | Tables present in live DB; `optionCPipeline.js:186-196` SELECT + UPDATE against `product_ssot` |
| **P1-4** | Agent #21 MessageBus topic emission | `c56743c..4b432f6` (per ENTRY 009) | `api/agent/21/execute.js:283` + `api/agent/3/execute.js:219` + `api/research-url.js:31` + `api/_lib/inngest.js:209` all use `getServerMessageBus()` from `api/_lib/messageBus.js:66` |
| **P1-1** | Agent #3 Self-Renewal fork-and-fix loop end-to-end | ENTRY 010 (`4bfe8ca` final entry) | Real branch `flowai/renewal-b2ee1335-iter1` pushed to `veu-ai-studio/my-preg-life`; real Vercel preview `mypreglife-platform-pjiyhvlyy-veu-ai-studio.vercel.app` deployed; 10 Phase A modules under `src/lib/agents/renewal/*` |
| **ENTRY-010 #2** | SSE streaming for run-progress telemetry | shipped (commits within `c56743c..4bfe8ca` cohort) | `api/agent/3/execute.js:59` SSE branch + `api/agent/3/control.js` back-channel |
| **ENTRY-010 #3** | Crawl adapter polish (structured crawl output) | `b35f7bd` + `f910283` | `src/lib/agents/renewal/crawlOutputAdapter.js` + tests |
| **ENTRY-010 #4** | Branch cleanup scheduler | `c220fda` + `e1414d0` + `b06374f` + `9cddb3b` | `src/lib/agents/renewal/branchCleanup.js` + `api/cron/branch-cleanup.js` + `vercel.json` daily cron + tests |
| **Defect A** | Crawler body truncation (1500/8000/12000 → 50000) | `4b6293e` | All 4 truncation sites raised; verified by `ourpublishingai.com` 47-page crawl with bodyTextSnippet > 4000 chars |
| **Defect B** | Score self-inflation (deterministic code-summed total + verdict) | `1880333` + 11 regression tests | `src/lib/operationsEngine.js:732 computeMonitorClearance` |
| **Defect C** | Monitor step non-independence | `79b0053` | Prior step `full_output`s threaded into Monitor prompt |
| **Single-page → multi-page assessment** | Agent #21 Phase 1 wiring | `83fb20a` (per ENTRY 007 + production probe) | `/api/research-url` routes through `conductCrawl` → `aggressiveCrawl`; 47-page BFS confirmed in production |
| **Phase 3 Auth Traversal security infrastructure** | scrubArtifacts + cross-origin REFUSE + MFA fail-loud + 10 invariants | `7727f8d`..`076a35b` (5 chunks, per ENTRY 007) | `src/lib/agents/auth/scrubArtifacts.js` + AUTH_TRAVERSAL_SECURITY_SPEC v3 invariants tested. **Note: the SECURITY guards are shipped, the LIVE traversal flow is P0-1** |

## Cross-reference with CANONICAL_REFERENCE §26 / §27 + ENTRY 010 "Remaining for Phase A close"

- **§26 Current Phase status** (lines 1004-1018): primary status table — no NEW gaps beyond those above. Agent #4 SHIPPED-GREEN status reconciled to PARTIAL per ENTRY 008 (`88113f2`) + ENTRY 009.
- **§27 Open Questions** (lines 1031-1057): 6 items, all captured as P3-1..P3-5 + the Multi-LLM routing question (P3-3). Each is a CEO-decision item, not a build-blocker.
- **ENTRY 010 "Remaining for Phase A close"** (5 items): #2 SSE / #3 crawl adapter / #4 branch cleanup → CLOSED. #1 Dashboard → PARTIAL. #5 sustained ≥75/100 loop → OPEN-BLK (#5 in master table above).

## Counts

| Category | Count |
|---|---|
| Backlog items reviewed | 25 (P0×5 + P1×5 + P2×10 + P3×5) + ENTRY-010 remaining ×5 = **30 reviewed** |
| CLOSED since backlog publication | **11** (P0-2, P1-1, P1-4, ENTRY-010 #2, #3, #4, plus 5 prior-session defects re-verified) |
| OPEN | **19** (5 P0/P1 + 9 P2 + 5 P3) |
| **OPEN-BLK (blocks production)** | **5** (P1-3, P0-3, P0-1, P0-5, ENTRY-010 #5) |
| OPEN-NB (does not block production) | **14** |

## Production-blocking subset, ranked (this is the punch list)

1. **P1-3** — §11 Clearance Step 5 four-prerequisite gate enforcement. This is the canonical demo-readiness contract. Without it FlowAI ships products with unverified scoring.
2. **P0-3** — §7.6 GTM Readiness Report formula. Precondition for #1; the 100-point issue-count formula is the canonical scoring source.
3. **P0-1** — §6 authenticated crawl traversal in the live Conductor flow. The commercial promise to assess authenticated VEU products cannot be kept until the live flow consumes operator-supplied credentials and performs the §6 pass #2 login.
4. **ENTRY-010 #5** — Sustained ≥75/100 loop verification on at least one real product. Proves the engine converges, not just demonstrates a single pass.
5. **P0-5** — Atomic ProductSSOT write with rollback semantics per §7 item #5. Without it, partial-failure runs leave orphaned outputs in the audit trail.

## Production-NON-blocking (can ship without — useful, but not gate)

These improve coverage, cost, or maturity but do not block customer delivery:
- P0-4 (Agent #21 polish — escalation rules), P1-2 (§28 symbiotic loop — cost optimisation), P1-5 (Agent #6 — same), P2-3 (95/95 path in AutoRunner — alternate verdict surface), P2-5/7/8 (CA-9 trio + Agent #10/#13 — agent waves), P2-2/4/6/9 (12 DORMANT agents), P2-10 (Stripe Connect deployment — commercial layer once Step 5 enforcement ships), ENTRY-010 #1 (Dashboard UI polish), P3-1..P3-5 (roadmap + CEO-decision items).

## Methodology + scope of evidence (auditable)

- Backlog source: `docs/specs/FOUNDATION_AUDIT_BACKLOG.md` @ commit `b48c856`, read in full.
- Per-item verification: `grep -rn`, `ls`, direct Read against `src/`, `api/`, `supabase/migrations/`, `docs/specs/` at HEAD `4bfe8ca`.
- ENTRY 009 + ENTRY 010 status claims cross-checked against file system (e.g. `src/lib/agents/renewal/*` 10-module inventory verified by `ls`; `getServerMessageBus()` wiring verified by `grep`).
- "Production-blocking" definition (operative for this audit): a gap is OPEN-BLK if it prevents FlowAI from emitting a verified, scored, gate-enforced deliverable against a real product per the SSOT contract. Pure-coverage or pure-cost gaps are OPEN-NB.

No invented gaps. Every row points at either a closing commit OR a file:line evidencing the open state.
