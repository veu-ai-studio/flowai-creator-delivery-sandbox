# Research Recovery Non-Builder Review - 2026-06-25

Reviewer: non-builder Codex sub-agent `Planck`.

Branch reviewed: `origin/feature/research-recovery-failover`.

## Gate 1 - Preview Merge Gate

Verdict: PASS-WITH-FINDINGS.

Preview evidence reviewed:

- Evidence packet: `docs/cto/research-recovery-failover-implementation-evidence-20260625.md`.
- Raw SSE: `docs/cto/research-recovery-live-preview-20260625T140330Z.sse`.
- Preview commit recorded in packet: `20732e04553f24ecdf558386b2049903b5dce6c4`.

Reviewer findings:

- Raw SSE confirms Browserless timeout -> Playwright failed/no usable evidence -> Perplexity succeeded.
- Recovered evidence and scoring were present.
- Final preview run recorded `finalScore=66`, `effectiveTrustScore=39.6`, `gtmReady=false`, `exitReason=PLATFORM_BOUNDARY_BLOCKED`.
- No `ALREADY_AT_TARGET` or degraded-100 false pass was observed for the current run.
- `RESEARCH_EVIDENCE_UNAVAILABLE` appeared only in prior-run context, not the current final run.

Finding:

- Reviewer could not live re-confirm `/api/version` because the preview redirects to Vercel auth, but committed origin evidence was internally consistent.

## Gate 2 - Reusable Template Precondition

Verdict: PASS-WITH-FINDINGS.

A1: reusable step-failover adapter exists.

- `src/lib/forge/rankedToolFailover.js` accepts generic `action`, `candidates`, `dispatchFn`, `validateResult`, and per-candidate timeout inputs.
- The reviewer found this is not Research-only.

A2: reusable tool-adapter contract exists.

- Tool-callability and credential state are centralized through the tool dispatch contract and Orchestra members.
- The reviewer found this can be mechanically adopted across steps.

A3: parameterized test harness exists enough for rollout precondition, but is not yet a centralized full-matrix harness.

- Shared contract test exists in `tests/forge/rankedToolFailover.test.js`.
- Design/Build/QA adoption is represented by step-level tests in:
  - `tests/forge/designStep.test.js`
  - `tests/forge/buildStep.test.js`
  - `tests/forge/auditStep.test.js`

Gate 2 conclusion:

- A1/A2/A3 are satisfied enough for mechanical Design/Build/QA adoption.
- Do not STOP as Research-specific.
- Do not claim full-matrix verification until a centralized matrix harness and production CT2 proof exist.

## Claim Ceiling

Allowed after production proof:

`RESEARCH RECOVERY FAILOVER - IN PRODUCTION`

Not earned:

- Full-matrix reliability
- Creator
- Upgrader
- Universal Engine
- VERIFIED matrix movement
