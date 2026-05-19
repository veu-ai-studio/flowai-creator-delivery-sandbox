═══════════════════════════════════════════════════════════
D40 PHASE-B SCORECARD — RELTWIN
═══════════════════════════════════════════════════════════
product_id:   reltwin
live url:     https://reltwin-platform.vercel.app
crawl:        maxPages=10 depth=3
probe budget: 180s
runId:        4e2ed7a3-a725-45f6-98d0-508090528707
started:      2026-05-19T02:01:31.843Z

STEP 1 — structured crawl
  pagesCrawled:        10
  totalTextLength:     24066
  brokenLinks:         1
  errors:              51
  forms:               0
  interactiveElements: 69

STEP 2 — surface-only §7.6 (Phase A only)
  SURFACE §7.6:        24.5/100  (band: not-demo-ready)
  counts:              {"critical":0,"high":11,"medium":10,"low":1}
  penalty:             75.5
  phase A finding count: 22

STEP 3 — Phase B adversarial surface probe
  ok:                  true
  durationMs:          61172
  interactivesTested:  6
  deadOrErroring:      6
  modalsFailing:       1
  formsFailing:        0
  agentsNonFunctional: 0
  mockOnlyFlagged:     0
  network:             totalRequests=39 meaningfulSameOrigin=14 distinctUrls=9
  findings count:      9

STEP 4 — canonical §7.6 with Phase B findings unioned
  PHASE-B §7.6:        3.5/100  (band: not-demo-ready)
  counts:              {"critical":0,"high":12,"medium":18,"low":1}
  penalty:             96.5
  phase A finding count: 22
  phase B finding count: 9
  total findings:        31

STEP 5 — top 5 concrete functional defects (by severity, Phase A + Phase B union)
  [high] network-failure @ https://reltwin-platform.vercel.app/
     1 network failure(s)
  [high] network-failure @ https://reltwin-platform.vercel.app/Home
     1 network failure(s)
  [high] network-failure @ https://reltwin-platform.vercel.app/YourRelationships
     1 network failure(s)
  [high] network-failure @ https://reltwin-platform.vercel.app/YourCommunications
     1 network failure(s)
  [high] network-failure @ https://reltwin-platform.vercel.app/AskRelTwinAI
     1 network failure(s)

═══════════════════════════════════════════════════════════
VERDICT — RELTWIN: FACADE
═══════════════════════════════════════════════════════════
reason:              mock-only=0 dead-interactives=6 score=3.5
surface-only §7.6:   24.5/100  (band: not-demo-ready)
phase-B §7.6:        3.5/100  (band: not-demo-ready)
delta (surface→PhB): -21.0 points
started:             2026-05-19T02:01:31.843Z
completed:           2026-05-19T02:03:00.288Z
duration:            1m 28s
═══════════════════════════════════════════════════════════

MACHINE-READABLE-FOOTER:
{"productId":"reltwin","url":"https://reltwin-platform.vercel.app","surfaceScore":24.5,"surfaceBand":"not-demo-ready","phaseBScore":3.5,"phaseBBand":"not-demo-ready","delta":-21,"counts":{"critical":0,"high":12,"medium":18,"low":1},"summary":{"interactivesTested":6,"deadOrErroring":6,"modalsFailing":1,"formsFailing":0,"agentsNonFunctional":0,"mockOnlyFlagged":0,"networkSummary":{"totalRequests":39,"meaningfulSameOrigin":14,"distinctUrls":9,"methodCounts":{"GET":36,"POST":3}}},"topFindings":[{"severity":"high","category":"network-failure","location":"https://reltwin-platform.vercel.app/","evidence":"1 network failure(s)"},{"severity":"high","category":"network-failure","location":"https://reltwin-platform.vercel.app/Home","evidence":"1 network failure(s)"},{"severity":"high","category":"network-failure","location":"https://reltwin-platform.vercel.app/YourRelationships","evidence":"1 network failure(s)"},{"severity":"high","category":"network-failure","location":"https://reltwin-platform.vercel.app/YourCommunications","evidence":"1 network failure(s)"},{"severity":"high","category":"network-failure","location":"https://reltwin-platform.vercel.app/AskRelTwinAI","evidence":"1 network failure(s)"}],"verdict":"FACADE","verdictReason":"mock-only=0 dead-interactives=6 score=3.5","durationS":88}
