# CT2 Dispatch - Path 2 Post-Merge Production Proof

FROM: CTO
TO: CT2
DATE: 2026-06-14 UTC
STATUS: DISPATCHED
VERIFIED movement: no
matrixArtifact edits: no
canonical docs: do not edit

## Standing Context

CTO supervises the technical bench. Do not wait for Victor or W04 on routine browser testing, curl checks, screenshot capture, or evidence commits. Pause only for destructive actions, secret exposure risk, canonical edits, VERIFIED movement, or production-changing commands.

## Target

Production URL:

- `https://flowai-dun.vercel.app`

Expected `/api/health` identity:

- `commitFull`: `d6b92d54e1693fd18f37b5549df9d68285204449`
- branch: `main`
- deployment URL: `https://flowai-22fb3bmld-veu-ai-studio.vercel.app`

## Objective

Rerun the constrained Path 2 Production proof after merge/promotion of `fix/path2-production-token-upgrade-target`.

The prior RelTwin proof proved pre-fix scoring but blocked before branch creation on:

- `GITHUB_AUTH_FAILED`
- unsafe same original/upgrade repo resolution behind that gate

The merged fix should:

- use explicit operator-token fallback when GitHub App signing fails and operator token is available;
- never expose token values;
- block unsafe same-repo original-read-only write targets before branch creation;
- surface clear safe blocked states such as `UPGRADE_TARGET_UNSAFE` rather than generic overclaiming.

## Proof Target

Use:

- Product URL: `https://reltwin.com`
- Product scope: `reltwin`
- Mode: `auto`
- Max iterations: `1`
- GTM target: `95`
- Suggested run ID: `ct2-path2-reltwin-postmerge-20260614`

## Acceptance Questions

Answer each explicitly:

1. Does `/api/health` report the expected commit?
2. Does the run pass pre-fix scoring again?
3. Does GitHub auth now avoid the PEM signing hard failure through explicit safe fallback, or does it still fail?
4. Does the unsafe same-repo upgrade-target guard block before branch creation?
5. If blocked, is the blocker plain and honest rather than generic `STEP_FAILED`?
6. If a safe target is somehow available, does branch creation occur?
7. Is any preview/deployed URL produced?
8. Does the UI ever overclaim a deployed URL or VERIFIED movement?
9. Does the run terminate cleanly, not hang?

## Evidence Required

Commit result under:

- `docs/cto/ct2-path2-postmerge-production-proof-result-20260614.md`

Include raw redacted evidence under:

- `docs/cto/ct2-path2-postmerge-production-proof-20260614/`

Include:

- request payload,
- SSE/run transcript,
- final summary JSON,
- screenshot(s) if a browser UI flow is used,
- `/api/health` output,
- PASS/BLOCK verdict.

## PASS / BLOCK

PASS if production no longer fails with the prior GitHub App PEM signing error and handles RelTwin safely: either branch creation proceeds only to a safe upgrade target, or the run blocks before branch creation with a clear safe target error.

BLOCK if:

- production is not at expected commit,
- prior `GITHUB_AUTH_FAILED` PEM error remains,
- same-repo original-read-only target reaches branch creation,
- a fallback/context URL is relabeled as observed evidence,
- a preview/deployed URL is claimed without real evidence,
- secrets appear in evidence.
