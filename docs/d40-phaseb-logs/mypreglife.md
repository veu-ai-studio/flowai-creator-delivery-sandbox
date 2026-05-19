═══════════════════════════════════════════════════════════
D40 PHASE-B SCORECARD — MYPREGLIFE
═══════════════════════════════════════════════════════════
product_id:   mypreglife
live url:     https://mypreglife-platform.vercel.app
crawl:        maxPages=10 depth=3
probe budget: 180s
runId:        f1d7ae9f-5c27-486a-84e6-211e92728c4e
started:      2026-05-19T01:59:03.711Z

STEP 1 — structured crawl
  pagesCrawled:        5
  totalTextLength:     2584
  brokenLinks:         0
  errors:              9
  forms:               1
  interactiveElements: 8

STEP 2 — surface-only §7.6 (Phase A only)
  SURFACE §7.6:        88/100  (band: demo-ready)
  counts:              {"critical":0,"high":0,"medium":5,"low":4}
  penalty:             12
  phase A finding count: 9

STEP 3 — Phase B adversarial surface probe
  ok:                  true
  durationMs:          57896
  interactivesTested:  11
  deadOrErroring:      9
  modalsFailing:       0
  formsFailing:        1
  agentsNonFunctional: 0
  mockOnlyFlagged:     1
  network:             totalRequests=6 meaningfulSameOrigin=0 distinctUrls=0
  findings count:      11

STEP 4 — canonical §7.6 with Phase B findings unioned
  PHASE-B §7.6:        60/100  (band: internal-only)
  counts:              {"critical":0,"high":2,"medium":14,"low":4}
  penalty:             40
  phase A finding count: 9
  phase B finding count: 11
  total findings:        20

STEP 5 — top 5 concrete functional defects (by severity, Phase A + Phase B union)
  [high] broken-modal @ https://mypreglife-platform.vercel.app div#root > div > div > form
     form valid-submit produced no observable response (no nav, no success/error surface, no validation feedback) — likely silent no-op or mock-o
  [high] engine-error @ https://mypreglife-platform.vercel.app
     mock-only signal: 11 interactives + 1 forms + 0 agents exercised, ZERO meaningful same-origin XHR/fetch traffic captured during the probe (o
  [medium] console-error @ https://mypreglife-platform.vercel.app/
     1 console error(s)
  [medium] console-error @ https://mypreglife-platform.vercel.app/privacy-policy
     2 console error(s)
  [medium] console-error @ https://mypreglife-platform.vercel.app/terms-of-use
     2 console error(s)

═══════════════════════════════════════════════════════════
VERDICT — MYPREGLIFE: FACADE
═══════════════════════════════════════════════════════════
reason:              mock-only=1 dead-interactives=9 score=60
surface-only §7.6:   88/100  (band: demo-ready)
phase-B §7.6:        60/100  (band: internal-only)
delta (surface→PhB): -28.0 points
started:             2026-05-19T01:59:03.711Z
completed:           2026-05-19T02:00:13.539Z
duration:            1m 10s
═══════════════════════════════════════════════════════════

MACHINE-READABLE-FOOTER:
{"productId":"mypreglife","url":"https://mypreglife-platform.vercel.app","surfaceScore":88,"surfaceBand":"demo-ready","phaseBScore":60,"phaseBBand":"internal-only","delta":-28,"counts":{"critical":0,"high":2,"medium":14,"low":4},"summary":{"interactivesTested":11,"deadOrErroring":9,"modalsFailing":0,"formsFailing":1,"agentsNonFunctional":0,"mockOnlyFlagged":1,"networkSummary":{"totalRequests":6,"meaningfulSameOrigin":0,"distinctUrls":0,"methodCounts":{"GET":6}}},"topFindings":[{"severity":"high","category":"broken-modal","location":"https://mypreglife-platform.vercel.app div#root > div > div > form","evidence":"form valid-submit produced no observable response (no nav, no success/error surface, no validation feedback) — likely silent no-op or mock-only"},{"severity":"high","category":"engine-error","location":"https://mypreglife-platform.vercel.app","evidence":"mock-only signal: 11 interactives + 1 forms + 0 agents exercised, ZERO meaningful same-origin XHR/fetch traffic captured during the probe (only static assets / no write requests). Likely advertised features are not wired to a backend."},{"severity":"medium","category":"console-error","location":"https://mypreglife-platform.vercel.app/","evidence":"1 console error(s)"},{"severity":"medium","category":"console-error","location":"https://mypreglife-platform.vercel.app/privacy-policy","evidence":"2 console error(s)"},{"severity":"medium","category":"console-error","location":"https://mypreglife-platform.vercel.app/terms-of-use","evidence":"2 console error(s)"}],"verdict":"FACADE","verdictReason":"mock-only=1 dead-interactives=9 score=60","durationS":70}
