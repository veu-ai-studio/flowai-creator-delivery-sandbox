# Spine Reliability Production Path Readiness - 2026-06-24

## Status

CODE / TEST READY ONLY.

No reliability claim moves until CT2 verifies the deployed run.

## Live Proof Blocker - 2026-06-25

CT2 attempted the deployed forced-failover proof and hit `/api/run-construction` rate limiting before the 2-3 repeatable live runs could complete.

Current blocker:

- `CRON_SECRET` is absent in Doppler `flowai/prd` as of `2026-06-25T00:32:11-04:00`.
- Without `CRON_SECRET`, CT2 cannot bypass the 10 requests/hour per-IP limit on `/api/run-construction`.
- Result: live spine-reliability proof remains BLOCKED, not failed.

Useful observation:

- The endpoint returned a clean `429` with `retry-after`; that is good fail-fast behavior and confirms the run did not hang at the rate-limit layer.

Product reliability note:

- The current 10 requests/hour per-IP limit is a separate production reliability surface. It may be too tight for underserved users behind shared/NAT IPs, retry-heavy low-bandwidth networks, schools, clinics, libraries, and community organizations. This should be reviewed before any broad "reliable for worldwide users" claim.

Unblock:

- Add one secret: `CRON_SECRET` in Doppler `flowai/prd`.
- Rerun the same deployed proof after the secret is present.

## Branch

`feature/spine-reliability-failover`

## What Changed

The existing failover contract now reaches the production Flow Hub route:

`/flow-hub/production -> /api/run-construction -> runOrchestration -> multiPageCrawler.crawlSite`

The production pre-loop Research crawl can be run in an operator-gated proof mode:

1. Tool Intelligence Research candidates are preserved when available.
2. Browserless and Playwright are appended as explicit crawl fallbacks.
3. The first callable Research crawl candidate is forced to hang.
4. `runRankedToolWithFailover` fires the hard timeout.
5. The next callable candidate runs the existing production crawler.
6. The fallback crawl result feeds the normal production pipeline.
7. Attempt history is emitted visibly to the Flow Hub UI.

This avoids the prior false proof risk: `/api/forge/build` and local harnesses are not the route being tested.

## Operator Gate

The forced-hang proof is not public default behavior.

To activate it, the request must include:

- body: `spineReliabilityProof: true`
- header: `x-flowai-operator-secret`
- secret must match `FLOWAI_OPERATOR_SECRET` or `FLOWAI_INTERNAL_SECRET`

The UI forwards proof mode only when the page URL includes:

`?spineReliabilityProof=1`

Optional timeout override:

`?spineReliabilityProof=1&spineReliabilityProofTimeoutMs=5000`

## CT2 Live Proof Target

Input URL:

https://flowai-m3-upgrader-before.vercel.app/

CT2 should open the deployed FlowAI preview / production URL on:

`/flow-hub/production?spineReliabilityProof=1&spineReliabilityProofTimeoutMs=5000`

Then:

1. Enter the operator secret in the existing FlowAI operator-secret field.
2. Run FlowAI on `https://flowai-m3-upgrader-before.vercel.app/`.
3. Observe the visible attempt history.
4. Confirm the run never stays indefinitely PENDING.
5. Confirm attempt history includes:
   - selected Research crawl candidate
   - timeout
   - fallback selected
   - fallback succeeded, or a clear final failure
6. Repeat 2-3 times.

## Acceptance

PASS requires deployed CT2 evidence, not unit output:

- deployed Flow Hub path used
- forced hang occurs on a live run
- timeout fires within the configured bound
- fallback or fail-fast is visible
- no indefinite PENDING
- repeated 2-3 times
- evidence pushed to origin before merge

If the deployed run cannot produce a URL, the reliability proof may still pass for Research only if the run visibly fails fast or continues without indefinite PENDING. Any Build claim is limited to Build only if Build failover fires live.

## Verification Completed

Syntax:

- `node --check src\lib\agents\renewal\orchestrator.js` PASS
- `node --check src\api\run-construction.js` PASS

Focused tests:

- `npx vitest run tests/agents/renewal/orchestrator.test.js tests/ui/toolStepCardVisibility.test.js tests/api/runConstructionHandlerSse.test.js`
- PASS: 3 files / 153 tests

Note: `node --check` cannot parse `.jsx` files in this repo because Node reports unknown `.jsx` extension. JSX coverage is through Vitest/Vite.

## Claim Boundary

If CT2 live proof passes, the maximum claim is:

`ORCHESTRATOR SPINE RELIABILITY DEMONSTRATED (narrow web-app slice, forced failover, deployed run, Research step)`

No Creator, Upgrader, Universal, ProductSSOT VERIFIED, or Build failover claim moves from this packet unless independently exercised live.
