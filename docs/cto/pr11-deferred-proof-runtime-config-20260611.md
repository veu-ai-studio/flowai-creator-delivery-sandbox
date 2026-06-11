# PR #11 Deferred Proof and Runtime Config Dispatch

Date: 2026-06-11
Owner: CTO
Branch: `fix/forge-runtime-config-800`
Base main: `06829983b50f16613c548f77708e96b905a8fbb9`

## Context

PR #11 was merged with the documented W04/CEO waiver:

`Waiver: unmocked live proof waived for URL context labeling fix; regression test covers CR-block scenario. Full live proof deferred to next forge acceptance run.`

After production deployment of main `06829983b50f`, CTO ran the deferred constrained SAIGE proof against production.

## Production Readiness Before Proof

- Production URL: `https://flowai-dun.vercel.app`
- Production deployment: `flowai-k7tobddup-veu-ai-studio.vercel.app`
- `/api/health` commit: `06829983b50f16613c548f77708e96b905a8fbb9`
- `/api/operator-readiness`: `ok=true`, 7/7 required operator credentials present

## Proof Request

- Endpoint: `POST https://flowai-dun.vercel.app/api/agent/3/execute`
- Headers: `Accept: text/event-stream`, `Content-Type: application/json`, `x-product-scope: saige`
- Body:

```json
{
  "gtmTarget": 95,
  "url": "https://saigeplatform.com",
  "maxIterations": 1,
  "runId": "cto-saige-primary-retry-proof-20260611-0909",
  "mode": "auto"
}
```

## Result

Status: INCOMPLETE / BLOCK

The production SSE stream did not produce a terminal event.

Observed transcript summary:

- 37 `data:` events total
- No `data: [DONE]`
- No `type:"final"`
- No `type:"timeout"`
- No `type:"error"`
- Last event: heartbeat at `2026-06-11T13:06:10.838Z`
- Vercel production log for the proof POST: `responseStatusCode: 0`

The stream closed about 60 seconds after start, without an honest terminal SSE result.

## Milestones Reached

- GitHub operator credential mode: `github_connected`
- FlowAI unified input context
- Tool intelligence selections for the 8-step forge vocabulary
- Product Discovery PATH A: productId `saige`
- Operator credential readiness governance record
- Upgrade target resolver: fork-based SAIGE upgrade target
- Upgrade target provisioner
- GitHub operator repo probe: read/write available
- Rate cap check
- Honest-gate historical context
- Crawl complete: 11 pages crawled, reason `frontier_drained`

## Milestones Not Reached

- Design/fix planning after crawl
- Build/fix candidate generation
- Branch creation
- Preview deployment
- Post-fix scoring
- Final governance write
- ProductSSOT run persistence
- Terminal SSE `[DONE]`

No VERIFIED movement is justified by this proof.

## Technical Finding

The intended runtime window is 800 seconds, but production behavior still closed the Agent 3 SSE proof at roughly 60 seconds.

Repo inspection found a concrete runtime-config drift:

- Root `vercel.json` sets `api/inngest.js` to `maxDuration: 800`.
- `api/inngest.js` exported `maxDuration: 60`.
- Root `vercel.json` sets `api/agent/3/execute.js` to `maxDuration: 800`.
- `api/agent/3/execute.js` did not export a source-level Vercel function config.

This branch makes the 800-second window explicit in source-level function exports and pins the alignment in tests.

## Patch Scope

- `api/inngest.js`: exported `maxDuration` changed from 60 to 800.
- `api/agent/3/execute.js`: added explicit exported `config = { maxDuration: 800 }`.
- `tests/api/agent3ExecuteTimeout.test.js`: pins both root `vercel.json` and source-level function config.

No scoring logic, governance policy, SSOT status, VERIFIED status, or repair gate changed.

## Verification

- `node --check api/agent/3/execute.js`: PASS
- `node --check api/inngest.js`: PASS
- `npx vitest run tests/api/agent3ExecuteTimeout.test.js`: PASS, 1 file / 6 tests
- `npm run preflight`: PASS
  - 230 files passed
  - 3655 tests passed
  - 3 skipped
  - lane discipline PASS
  - SSOT traceability PASS

## Post-Merge Acceptance

After this branch is reviewed, merged, and deployed to production, rerun the constrained SAIGE proof.

Required evidence:

- Production `/api/health` reports the new deployed commit.
- SSE stream produces either a normal terminal `final` + `[DONE]`, or an honest terminal `timeout` + `[DONE]`.
- If a valid fix candidate is produced: branch creation, preview deploy, post-fix scoring, governance write, and ProductSSOT persistence must be independently observed.
- If a fix candidate is rejected: report the exact repair-integrity gate reason.

No VERIFIED movement until the acceptance run produces the required live evidence.
