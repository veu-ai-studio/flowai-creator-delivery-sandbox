# Path 2 Production Rerun Result - SAIGE v2 and RelTwin

FROM: CTO
TO: W04
DATE: 2026-06-14 UTC
VERIFIED movement applied: no
matrixArtifact edited: no

## Purpose

After Path 3 Fresh Build produced a public URL, CTO ran constrained Path 2 Production proofs to find the fastest honest route to a Production-mode deployed URL.

## Run 1 - SAIGE v2

- Run ID: `cto-path2-saige-v2-rerun-20260614-1336`
- Base URL: `https://flowai-dun.vercel.app`
- Product scope: `saige`
- Target URL: `https://saige-v2.vercel.app`
- Max iterations: `1`
- Evidence folder: `docs/cto/path2-saige-v2-production-rerun-20260614/`

Result:

- Verdict: `TERMINAL_FINAL_INCOMPLETE_MILESTONES`
- Accepted terminal: true
- Final score: `98`
- Exit reason: `HONEST_GATE_REFUSAL_ALREADY_PASSING`
- Branch creation: not observed
- Preview deployment: not observed
- ProductSSOT persistence: not observed

CTO assessment:

This is correct behavior. SAIGE v2 is already above the target threshold for this constrained run, so FlowAI refused to mutate it. This does not produce the Path 2 deployed URL and should not be treated as a failure.

## Run 2 - RelTwin

- Run ID: `cto-path2-reltwin-20260614-1337`
- Base URL: `https://flowai-dun.vercel.app`
- Product scope: `reltwin`
- Target URL: `https://reltwin.com`
- Max iterations: `1`
- Evidence folder: `docs/cto/path2-reltwin-production-proof-20260614/`

Result:

- Verdict: `TERMINAL_FINAL_INCOMPLETE_MILESTONES`
- Accepted terminal: true
- Final score: `71.5`
- Exit reason: `STEP_FAILED`
- Failed step: `STEP_8`
- Failure code: `GITHUB_AUTH_FAILED`
- Branch creation: not observed
- Preview deployment: not observed
- ProductSSOT persistence: not observed

Observed blockers:

- Step 6 repo file list degraded with `signAppJwt: RS256 signing failed`.
- Step 8 credential acquisition failed with `GITHUB_AUTH_FAILED`.
- Product target state resolved `originalRepo` and `upgradeRepo` both to `https://github.com/veu-ai-studio/rel-twin`.
- The same target envelope also reported `writesOriginalRepo:true` and `originalReadOnly:true`.

CTO assessment:

RelTwin is a better Path 2 candidate than SAIGE v2 because it scored below target. However, it cannot be rerun blindly. The next blocker chain is not scoring; it is Production-mode write/deploy readiness:

1. GitHub token acquisition must fall back honestly to the operator token when GitHub App signing fails, without logging secrets.
2. Production mode must not write to a repo when the same repo is both original and upgrade target while `originalReadOnly:true`.
3. Non-SAIGE products need a safe upgrade target and Vercel project/deploy target configuration before branch creation and preview deployment can be claimed.

## Next Dispatch

CB dispatch filed:

- `docs/cto/cb-path2-production-token-and-upgrade-target-dispatch-20260614.md`

No VERIFIED movement is justified by these reruns.
