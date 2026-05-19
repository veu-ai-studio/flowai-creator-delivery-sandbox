═══════════════════════════════════════════════════════════
D40 PHASE-B SCORECARD — SAIGE
═══════════════════════════════════════════════════════════
product_id:   saige
live url:     https://saige-platform.vercel.app
crawl:        maxPages=10 depth=3
probe budget: 180s
runId:        c0bbec3a-3406-4019-82a5-9d3947c828c6
started:      2026-05-19T02:00:15.825Z

STEP 1 — structured crawl
  pagesCrawled:        8
  totalTextLength:     6472
  brokenLinks:         1
  errors:              24
  forms:               0
  interactiveElements: 32

STEP 2 — surface-only §7.6 (Phase A only)
  SURFACE §7.6:        70.5/100  (band: internal-only)
  counts:              {"critical":0,"high":2,"medium":8,"low":7}
  penalty:             29.5
  phase A finding count: 17

STEP 3 — Phase B adversarial surface probe
  ok:                  true
  durationMs:          54649
  interactivesTested:  10
  deadOrErroring:      9
  modalsFailing:       0
  formsFailing:        0
  agentsNonFunctional: 0
  mockOnlyFlagged:     0
  network:             totalRequests=8 meaningfulSameOrigin=2 distinctUrls=2
  findings count:      9

STEP 4 — canonical §7.6 with Phase B findings unioned
  PHASE-B §7.6:        52.5/100  (band: not-demo-ready)
  counts:              {"critical":0,"high":2,"medium":17,"low":7}
  penalty:             47.5
  phase A finding count: 17
  phase B finding count: 9
  total findings:        26

STEP 5 — top 5 concrete functional defects (by severity, Phase A + Phase B union)
  [high] network-failure @ https://saige-platform.vercel.app/Landing
     2 network failure(s)
  [high] network-failure @ https://base44.com/logo_v2.svg
     broken link
  [medium] console-error @ https://saige-platform.vercel.app/Landing
     8 console error(s)
  [medium] console-error @ https://saige-platform.vercel.app/home
     2 console error(s)
  [medium] console-error @ https://saige-platform.vercel.app/enterprise-demo
     2 console error(s)

═══════════════════════════════════════════════════════════
VERDICT — SAIGE: FACADE
═══════════════════════════════════════════════════════════
reason:              mock-only=0 dead-interactives=9 score=52.5
surface-only §7.6:   70.5/100  (band: internal-only)
phase-B §7.6:        52.5/100  (band: not-demo-ready)
delta (surface→PhB): -18.0 points
started:             2026-05-19T02:00:15.825Z
completed:           2026-05-19T02:01:29.638Z
duration:            1m 14s
═══════════════════════════════════════════════════════════

MACHINE-READABLE-FOOTER:
{"productId":"saige","url":"https://saige-platform.vercel.app","surfaceScore":70.5,"surfaceBand":"internal-only","phaseBScore":52.5,"phaseBBand":"not-demo-ready","delta":-18,"counts":{"critical":0,"high":2,"medium":17,"low":7},"summary":{"interactivesTested":10,"deadOrErroring":9,"modalsFailing":0,"formsFailing":0,"agentsNonFunctional":0,"mockOnlyFlagged":0,"networkSummary":{"totalRequests":8,"meaningfulSameOrigin":2,"distinctUrls":2,"methodCounts":{"GET":7,"POST":1}}},"topFindings":[{"severity":"high","category":"network-failure","location":"https://saige-platform.vercel.app/Landing","evidence":"2 network failure(s)"},{"severity":"high","category":"network-failure","location":"https://base44.com/logo_v2.svg","evidence":"broken link"},{"severity":"medium","category":"console-error","location":"https://saige-platform.vercel.app/Landing","evidence":"8 console error(s)"},{"severity":"medium","category":"console-error","location":"https://saige-platform.vercel.app/home","evidence":"2 console error(s)"},{"severity":"medium","category":"console-error","location":"https://saige-platform.vercel.app/enterprise-demo","evidence":"2 console error(s)"}],"verdict":"FACADE","verdictReason":"mock-only=0 dead-interactives=9 score=52.5","durationS":74}
