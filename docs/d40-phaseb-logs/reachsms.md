═══════════════════════════════════════════════════════════
D40 PHASE-B SCORECARD — REACHSMS
═══════════════════════════════════════════════════════════
product_id:   reachsms
live url:     https://reachsms-platform.vercel.app
crawl:        maxPages=10 depth=3
probe budget: 180s
runId:        cc58a308-d014-47dc-be30-14758871fd20
started:      2026-05-19T02:03:02.568Z

STEP 1 — structured crawl
  pagesCrawled:        10
  totalTextLength:     3069
  brokenLinks:         1
  errors:              29
  forms:               0
  interactiveElements: 5

STEP 2 — surface-only §7.6 (Phase A only)
  SURFACE §7.6:        65.5/100  (band: internal-only)
  counts:              {"critical":0,"high":2,"medium":10,"low":9}
  penalty:             34.5
  phase A finding count: 21

STEP 3 — Phase B adversarial surface probe
  ok:                  true
  durationMs:          61105
  interactivesTested:  6
  deadOrErroring:      6
  modalsFailing:       1
  formsFailing:        0
  agentsNonFunctional: 0
  mockOnlyFlagged:     0
  network:             totalRequests=8 meaningfulSameOrigin=2 distinctUrls=2
  findings count:      9

STEP 4 — canonical §7.6 with Phase B findings unioned
  PHASE-B §7.6:        44.5/100  (band: not-demo-ready)
  counts:              {"critical":0,"high":3,"medium":18,"low":9}
  penalty:             55.5
  phase A finding count: 21
  phase B finding count: 9
  total findings:        30

STEP 5 — top 5 concrete functional defects (by severity, Phase A + Phase B union)
  [high] network-failure @ https://reachsms-platform.vercel.app/
     1 network failure(s)
  [high] network-failure @ https://base44.com/logo_v2.svg
     broken link
  [high] broken-modal @ https://reachsms-platform.vercel.app div > div > div > div > div > button
     modal trigger <button> text="English" errored on click: locator.click: Target page, context or browser has been closed
Call log:
[2m  - wai
  [medium] console-error @ https://reachsms-platform.vercel.app/
     10 console error(s)
  [medium] console-error @ https://reachsms-platform.vercel.app/Dashboard
     2 console error(s)

═══════════════════════════════════════════════════════════
VERDICT — REACHSMS: FACADE
═══════════════════════════════════════════════════════════
reason:              mock-only=0 dead-interactives=6 score=44.5
surface-only §7.6:   65.5/100  (band: internal-only)
phase-B §7.6:        44.5/100  (band: not-demo-ready)
delta (surface→PhB): -21.0 points
started:             2026-05-19T02:03:02.568Z
completed:           2026-05-19T02:04:25.283Z
duration:            1m 23s
═══════════════════════════════════════════════════════════

MACHINE-READABLE-FOOTER:
{"productId":"reachsms","url":"https://reachsms-platform.vercel.app","surfaceScore":65.5,"surfaceBand":"internal-only","phaseBScore":44.5,"phaseBBand":"not-demo-ready","delta":-21,"counts":{"critical":0,"high":3,"medium":18,"low":9},"summary":{"interactivesTested":6,"deadOrErroring":6,"modalsFailing":1,"formsFailing":0,"agentsNonFunctional":0,"mockOnlyFlagged":0,"networkSummary":{"totalRequests":8,"meaningfulSameOrigin":2,"distinctUrls":2,"methodCounts":{"GET":7,"POST":1}}},"topFindings":[{"severity":"high","category":"network-failure","location":"https://reachsms-platform.vercel.app/","evidence":"1 network failure(s)"},{"severity":"high","category":"network-failure","location":"https://base44.com/logo_v2.svg","evidence":"broken link"},{"severity":"high","category":"broken-modal","location":"https://reachsms-platform.vercel.app div > div > div > div > div > button","evidence":"modal trigger <button> text=\"English\" errored on click: locator.click: Target page, context or browser has been closed\nCall log:\n\u001b[2m  - waiting for locator('div > div > div > "},{"severity":"medium","category":"console-error","location":"https://reachsms-platform.vercel.app/","evidence":"10 console error(s)"},{"severity":"medium","category":"console-error","location":"https://reachsms-platform.vercel.app/Dashboard","evidence":"2 console error(s)"}],"verdict":"FACADE","verdictReason":"mock-only=0 dead-interactives=6 score=44.5","durationS":83}
