FLOWAI OPERATIONAL REALITY — PRE W6

PURPOSE

This document tracks VERIFIED operational reality for FlowAI.
The SSOT describes the intended future state. This document describes the current executable state.

This file MUST:
- distinguish REAL vs PARTIAL vs STUBBED vs SIMULATED behavior
- identify KNOWN_GAP areas honestly
- prevent orchestration drift
- prevent specification inflation
- align runtime reality with governance claims

OPERATIONAL TRUTH RULE

If this document conflicts with aspirational canonical language,
this document governs operational decision-making until runtime
behavior changes and is re-verified.

SSOT defines intended future behavior.
Operational Reality defines verified present behavior.

STATUS DEFINITIONS
- REAL — fully operational, verified by human eyes or automated test
- PARTIAL — some capability exists, not end-to-end verified
- STUBBED — placeholder code exists, not functional
- SIMULATED — produces output that looks real but is fabricated
- DISCONNECTED — code exists but is not wired to production path
- BLOCKED — cannot proceed due to external dependency
- NOT_IMPLEMENTED — no code exists for this capability
- VERIFIED — confirmed working by human or Panel verification
- UNVERIFIED — may work but not independently confirmed

NEVER FAKE INVARIANTS
- Never fabricate deploy URLs
- Never fabricate governance records
- Never fabricate scores
- Never fabricate crawl counts
- Never fabricate tool selections
- Never silently omit dimensions
- Never claim runtime behavior that is not operational

1. CORE LOOP STATUS
STATUS: PARTIAL
CANONICAL CLAIM: Input URL → crawl → improve → deploy → new URL
VERIFIED REALITY:
Phase B1+B2 operational.
Evidence pipeline produces 88 findings.
Remediation classifies 12 eligible findings and generates 7 successful patches.
Multi-Fix Generation executes successfully.
End-to-end loop operational for bounded low-risk remediation.
LAST VERIFIED: 2026-05-21

2. CONSTRUCTION ENGINE STATUS
STATUS: PARTIAL
CANONICAL CLAIM: S1-S8 gate chain produces construction_complete.v1
VERIFIED REALITY:
7 remediation patches succeeded out of 12 attempted.
4 patches kept with provenance and rollback metadata.
Construction engine no longer starves on thin SPA targets.
LAST VERIFIED: 2026-05-21

3. GOVERNANCE RUNTIME STATUS
STATUS: PARTIAL
VERIFIED REALITY: Governance architecture and canonical systems exist. 44 governance_record entries across 7 product_ssot rows. 0 tool.selection envelopes. 6 of 10 dimensions silently omitted. dimensions_contributing[] field does not exist on any envelope.
LAST VERIFIED: 2026-05-20

4. TOOL INTELLIGENCE STATUS
STATUS: PARTIAL
VERIFIED REALITY:
8/8 tool.selection governance envelopes emitted per run.
LAST VERIFIED: 2026-05-21

5. CRAWL ENGINE STATUS
STATUS: PARTIAL
VERIFIED REALITY:
Multi-page BFS crawler operational.
Honest stop-reason reporting operational.
Thin SPA verification produced:
1 crawled page
stopReason=frontier_drained
LAST VERIFIED: 2026-05-21

6. DEPLOYMENT REALITY STATUS
STATUS: PARTIAL
VERIFIED REALITY:
/api/run-construction.js operational.
SSE streaming operational.
RunConstructionPanel active in UI.
Preview deployments verified through Vercel.
LAST VERIFIED: 2026-05-21

7. SELF-APPLICATION STATUS
STATUS: BLOCKED
VERIFIED REALITY: flowai.construction_eligible set to true. 4 prior self-runs had empty payloads until Track B fix. Latest observed FlowAI self-score: 65.5/100. Scoring consistency not yet verified. Track A construction proof still in progress.
LAST VERIFIED: 2026-05-20

8. VERIFICATION STATUS
STATUS: EMERGING
VERIFIED REALITY:
Phase C verification modules created:
- baselineSnapshot
- postFixSnapshot
- deltaCalculator
- patchEffectClassifier
- regressionGate
Orchestrator wiring in progress.
LAST VERIFIED: 2026-05-21

9. KNOWN INTEGRITY RISKS
- /api/run.js fabricates URLs (deprecated, not deleted)
- Phase B finds 0 interactives on most URLs tested
- Browserless/S4 hangs unpredictably (60min timeout)
- Scores inconsistent across runs (0, 33, 63.5, 99.5 on same product)
- Canonical scope exceeds executable reality
- Tool Intelligence not runtime-wired
- Multi-dimension scoring incomplete (4 of 10)
- Self-application unresolved

10. VERIFIED WORKING FLOWS
- Governance record writes to Supabase: VERIFIED
- Product registry CRUD: VERIFIED
- Step tool rankings seeded (40 rows): VERIFIED
- Panel consultation infrastructure (multi-LLM): VERIFIED
- CLI orchestration runs (14-step pipeline): VERIFIED
- SSE emission from /api/run-construction.js: PARTIAL (built, not UI-verified)
- Auth magic-link flow: BUILT (Track E PR4, not yet merged)
- Rate limiting: BUILT (Track E PR2, not yet merged)
- Sentry integration: BUILT (Track E PR1, not yet merged)
