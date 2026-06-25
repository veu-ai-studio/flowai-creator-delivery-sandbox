# FlowAI Spine Reliability Failover - Implementation Evidence

Date: 2026-06-24
Branch: feature/spine-reliability-failover
Base HEAD: c627db0
Authoring role: CTO / Codex
Claim ceiling: implementation evidence only. No Creator, Upgrader, Universal, or VERIFIED movement.

## Objective

Implement the approved orchestrator spine reliability plan:

URL-or-description -> selected ranked tool -> dispatch -> timeout/failover/fail-fast -> visible status.

The production failure mode was a tool call that stayed pending with no resolution. This implementation therefore tests the hard case directly:

candidate accepts call -> never resolves -> timeout fires -> next ranked callable candidate runs -> run does not hang.

## What Changed

### Shared Contract

Added `src/lib/forge/rankedToolFailover.js`.

The contract:

- normalizes ranked candidates with the existing `toolDispatchContract`;
- skips unavailable, missing-credential, stubbed, or unsupported-action candidates;
- wraps every actual dispatch in a hard timeout;
- records attempt history as selected / unavailable / timeout / failed / succeeded / final_failed;
- throws `RankedToolFailoverError` with full attempt history when all candidates are exhausted.

### Research Step

Updated `src/lib/forge/researchRunner.js`.

Research now:

- uses the shared failover contract for `crawl`;
- uses the shared failover contract for `analyze`;
- records attempt history in the Research output;
- exposes timeout counts in `evidenceSummary`;
- no longer depends on a single selected tool resolving forever.

### Build Step

Updated `src/lib/forge/buildRunner.js`.

Build now:

- uses the same failover contract for `code-patch`;
- no longer hard-stops at the first uncallable selected member when a next ranked callable member exists;
- records selected fallback member and attempt history;
- preserves existing mutation and deploy-chain evidence paths;
- fails fast with `RankedToolFailoverError` only after ranked candidates are exhausted.

### UI Visibility

Updated `src/components/forge/ForgeSectionRenderer.jsx`.

Forge selected-tool sections now render a visible Tool attempts panel when attempt history exists.

This is required for the reliability bar: "never hangs" must be observable as selected / unavailable / timeout / failover / final status.

## Tests Added Or Updated

Added `tests/forge/rankedToolFailover.test.js`.

New direct contract coverage:

- unavailable candidate -> next callable candidate runs;
- hanging candidate -> timeout -> next callable candidate runs;
- all candidates unavailable -> fail-fast with attempt history.

Updated Research tests:

- `AUTOMATIC research times out a hanging crawl candidate and fails over`
- URL crawl tests now use explicit Browserless credential setup.

Updated Build tests:

- `live build times out a hanging selected member and fails over to the next ranked callable tool`
- `live build fails over when the top-ranked member is missing credentials`
- exhausted/placeholder cases now assert attempt-history-backed fail-fast.

## Verification

Syntax:

```text
node --check src\lib\forge\rankedToolFailover.js
node --check src\lib\forge\researchRunner.js
node --check src\lib\forge\buildRunner.js
PASS
```

Focused tests:

```text
npx vitest run tests/forge/rankedToolFailover.test.js tests/forge/researchStep.test.js tests/forge/buildStep.test.js tests/forge/ForgeSectionRenderer.test.js tests/tools/toolDispatchContract.test.js

Test Files  5 passed (5)
Tests       104 passed (104)
```

Preflight:

```text
npm run build:preflight
PASS
```

## What This Proves

Code/test level:

- The shared failover contract handles the actual hang mode: a candidate that never resolves.
- Research can timeout a hanging crawl candidate and continue to the next ranked callable tool.
- Build can timeout a hanging selected member and continue to the next ranked callable tool.
- Attempt history is present in outputs and visible in Forge rendering.

## What This Does Not Prove Yet

Not yet proven:

- live production forced-failover demo;
- CT2 browser verification;
- deployed web-app spine run with visible failover;
- Creator movement;
- Upgrader movement;
- Universal engine movement;
- VERIFIED movement.

## Next Acceptance Step

Run the repeatable live spine demo:

Input URL:
https://flowai-m3-upgrader-before.vercel.app/

Required live evidence:

1. force first Research candidate to hang or time out;
2. show timeout event in visible attempt history;
3. show failover to next ranked callable tool;
4. complete the narrow web-app spine to a deployed URL, or fail fast with a visible reason;
5. CT2 verifies from a fresh browser that the run did not hang and the attempt history is visible.

Claim if live proof passes:

ORCHESTRATOR SPINE RELIABILITY DEMONSTRATED
(narrow web-app slice, forced failover, scoped only to steps actually proven)

