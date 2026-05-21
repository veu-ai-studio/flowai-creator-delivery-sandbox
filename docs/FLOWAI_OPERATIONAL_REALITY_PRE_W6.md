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
VERIFIED REALITY: UI accepts URL. Orchestration runs via CLI. /api/run-construction.js built but not yet wired to UI. No end-to-end browser-verified cycle exists.
LAST VERIFIED: 2026-05-20

2. CONSTRUCTION ENGINE STATUS
STATUS: PARTIAL
CANONICAL CLAIM: S1-S8 gate chain produces construction_complete.v1
VERIFIED REALITY: Code exists (128 tests pass). S1/S2/S6 gates cleared in test runs. 0 construction_complete.v1 ever produced. 26 attempt_aborted envelopes on reltwin.
LAST VERIFIED: 2026-05-20

3. GOVERNANCE RUNTIME STATUS
STATUS: PARTIAL
VERIFIED REALITY: Governance architecture and canonical systems exist. 44 governance_record entries across 7 product_ssot rows. 0 tool.selection envelopes. 6 of 10 dimensions silently omitted. dimensions_contributing[] field does not exist on any envelope.
LAST VERIFIED: 2026-05-20

4. TOOL INTELLIGENCE STATUS
STATUS: DISCONNECTED
VERIFIED REALITY: 40 ranking rows in step_tool_rankings table (seeded). ToolIntelligenceService code exists (29 tests pass). attachToolIntelligenceService() has 0 call sites in production. 0 runtime tool.selection envelopes emitted.
LAST VERIFIED: 2026-05-20

5. CRAWL ENGINE STATUS
STATUS: PARTIAL
VERIFIED REALITY: Single-page crawler exists (api/_lib/crawler.js). No BFS multi-page crawl. No robots.txt handling. No politeness scheduling. Multi-page crawl not yet built.
LAST VERIFIED: 2026-05-20

6. DEPLOYMENT REALITY STATUS
STATUS: PARTIAL
VERIFIED REALITY: Vercel integration exists. /api/run.js FABRICATED URLs at line 33-35 (deprecated). /api/run-construction.js emits real SSE orchestration events but full UI wiring and end-to-end runtime verification still pending. 0 PRs shipped across all 18 runs. previewUrl was null on all runs until Track B fix (67532c4).
LAST VERIFIED: 2026-05-20

7. SELF-APPLICATION STATUS
STATUS: BLOCKED
VERIFIED REALITY: flowai.construction_eligible set to true. 4 prior self-runs had empty payloads until Track B fix. Latest observed FlowAI self-score: 65.5/100. Scoring consistency not yet verified. Track A construction proof still in progress.
LAST VERIFIED: 2026-05-20

8. KNOWN INTEGRITY RISKS
- /api/run.js fabricates URLs (deprecated, not deleted)
- Phase B finds 0 interactives on most URLs tested
- Browserless/S4 hangs unpredictably (60min timeout)
- Scores inconsistent across runs (0, 33, 63.5, 99.5 on same product)
- Canonical scope exceeds executable reality
- Tool Intelligence not runtime-wired
- Multi-dimension scoring incomplete (4 of 10)
- Self-application unresolved

9. VERIFIED WORKING FLOWS
- Governance record writes to Supabase: VERIFIED
- Product registry CRUD: VERIFIED
- Step tool rankings seeded (40 rows): VERIFIED
- Panel consultation infrastructure (multi-LLM): VERIFIED
- CLI orchestration runs (14-step pipeline): VERIFIED
- SSE emission from /api/run-construction.js: PARTIAL (built, not UI-verified)
- Auth magic-link flow: BUILT (Track E PR4, not yet merged)
- Rate limiting: BUILT (Track E PR2, not yet merged)
- Sentry integration: BUILT (Track E PR1, not yet merged)
