═══════════════════════════════════════════════════════════
D40 PHASE-B SCORECARD — PRESSAI
═══════════════════════════════════════════════════════════
product_id:   pressai
live url:     https://pressai-platform.vercel.app
crawl:        maxPages=10 depth=3
probe budget: 180s
runId:        934a5f0d-6d2f-4fce-89ef-5a0dc3de58c0
started:      2026-05-19T02:04:27.619Z

STEP 1 — structured crawl
  pagesCrawled:        4
  totalTextLength:     4939
  brokenLinks:         0
  errors:              14
  forms:               0
  interactiveElements: 8

STEP 2 — surface-only §7.6 (Phase A only)
  SURFACE §7.6:        90.5/100  (band: showcase-ready)
  counts:              {"critical":0,"high":0,"medium":4,"low":3}
  penalty:             9.5
  phase A finding count: 7

STEP 3 — Phase B adversarial surface probe
  ok:                  true
  durationMs:          57787
  interactivesTested:  9
  deadOrErroring:      5
  modalsFailing:       0
  formsFailing:        0
  agentsNonFunctional: 0
  mockOnlyFlagged:     0
  network:             totalRequests=56 meaningfulSameOrigin=5 distinctUrls=1
  findings count:      5

STEP 4 — canonical §7.6 with Phase B findings unioned
  PHASE-B §7.6:        65.5/100  (band: internal-only)
  counts:              {"critical":0,"high":5,"medium":4,"low":3}
  penalty:             34.5
  phase A finding count: 7
  phase B finding count: 5
  total findings:        12

STEP 5 — top 5 concrete functional defects (by severity, Phase A + Phase B union)
  [high] broken-modal @ https://pressai-platform.vercel.app div#root > div:nth-of-type(1) > nav > div:nt
     click on <button> text="Sign In" triggered console error(s): Failed to load resource: the server responded with a status of 404 (); Failed t
  [high] broken-modal @ https://pressai-platform.vercel.app div#root > div:nth-of-type(1) > nav > div:nt
     click on <button> text="Get Started Free" triggered console error(s): Failed to load resource: the server responded with a status of 404 ();
  [high] broken-modal @ https://pressai-platform.vercel.app div#root > div:nth-of-type(1) > section:nth-
     click on <button> text="Start Publishing Free →" triggered console error(s): Failed to load resource: the server responded with a status of 
  [high] broken-modal @ https://pressai-platform.vercel.app div#root > div:nth-of-type(1) > section:nth-
     click on <a> text="See Pricing" triggered console error(s): Failed to load resource: the server responded with a status of 404 (); Failed to
  [high] broken-modal @ https://pressai-platform.vercel.app section#pricing > div > div:nth-of-type(2) >
     click on <button> text="Get Started Free" triggered console error(s): Failed to load resource: the server responded with a status of 404 ()

═══════════════════════════════════════════════════════════
VERDICT — PRESSAI: FACADE
═══════════════════════════════════════════════════════════
reason:              mock-only=0 dead-interactives=5 score=65.5
surface-only §7.6:   90.5/100  (band: showcase-ready)
phase-B §7.6:        65.5/100  (band: internal-only)
delta (surface→PhB): -25.0 points
started:             2026-05-19T02:04:27.619Z
completed:           2026-05-19T02:05:35.303Z
duration:            1m 8s
═══════════════════════════════════════════════════════════

MACHINE-READABLE-FOOTER:
{"productId":"pressai","url":"https://pressai-platform.vercel.app","surfaceScore":90.5,"surfaceBand":"showcase-ready","phaseBScore":65.5,"phaseBBand":"internal-only","delta":-25,"counts":{"critical":0,"high":5,"medium":4,"low":3},"summary":{"interactivesTested":9,"deadOrErroring":5,"modalsFailing":0,"formsFailing":0,"agentsNonFunctional":0,"mockOnlyFlagged":0,"networkSummary":{"totalRequests":56,"meaningfulSameOrigin":5,"distinctUrls":1,"methodCounts":{"GET":51,"POST":5}}},"topFindings":[{"severity":"high","category":"broken-modal","location":"https://pressai-platform.vercel.app div#root > div:nth-of-type(1) > nav > div:nth-of-type(2) > button:nth-of-type(1)","evidence":"click on <button> text=\"Sign In\" triggered console error(s): Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 ()"},{"severity":"high","category":"broken-modal","location":"https://pressai-platform.vercel.app div#root > div:nth-of-type(1) > nav > div:nth-of-type(2) > button:nth-of-type(2)","evidence":"click on <button> text=\"Get Started Free\" triggered console error(s): Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 ()"},{"severity":"high","category":"broken-modal","location":"https://pressai-platform.vercel.app div#root > div:nth-of-type(1) > section:nth-of-type(1) > div > div:nth-of-type(2) > button","evidence":"click on <button> text=\"Start Publishing Free →\" triggered console error(s): Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 ()"},{"severity":"high","category":"broken-modal","location":"https://pressai-platform.vercel.app div#root > div:nth-of-type(1) > section:nth-of-type(1) > div > div:nth-of-type(2) > a","evidence":"click on <a> text=\"See Pricing\" triggered console error(s): Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 (); Failed to load resource: the server responded with a status of 404 ()"},{"severity":"high","category":"broken-modal","location":"https://pressai-platform.vercel.app section#pricing > div > div:nth-of-type(2) > div:nth-of-type(1) > button","evidence":"click on <button> text=\"Get Started Free\" triggered console error(s): Failed to load resource: the server responded with a status of 404 ()"}],"verdict":"FACADE","verdictReason":"mock-only=0 dead-interactives=5 score=65.5","durationS":68}
