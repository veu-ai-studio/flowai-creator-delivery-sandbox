# Review Router Dispatch - Product Card Gate

FROM: CTO
TO: W04, CD, CR
DATE: 2026-06-15 UTC
STATUS: DISPATCHED
Runtime branch: `fix/portfolio-product-ssot-cards`
Branch head: `c78727b114ae2f00abcc67006b5fd1f467c7bf9f`
Current main: `215c08b09a07c807112d4869bec1e43de4c61f13`
VERIFIED movement: no
Canonical docs: no edits
Runtime changes: no edits from this dispatch

## Purpose

CTO dispatched the product-card review gate through the existing repo/in-app review-router lane so Victor does not need to relay prompts.

The review-router was instructed to dispatch CD and CR independently for `origin/fix/portfolio-product-ssot-cards`, using the current branch head above.

## Required Reading

Review-router was instructed to read from `origin/main`:

- `docs/cto/cd-cr-active-review-dispatch-20260615.md`
- `docs/cto/active-review-gates-20260614.md`
- `docs/cto/w04-product-card-review-waiver-decision-packet-20260615.md`

Review prompts on the branch:

- `docs/cto/cd-review-saige-product-card-score-prompt-20260614.md`
- `docs/cto/cr-review-saige-product-card-score-prompt-20260614.md`

Evidence on the branch:

- `docs/cto/cb2-review-saige-product-card-score-result-20260614.md`
- `docs/cto/saige-product-card-score-fix-evidence-20260614.md`
- `docs/cto/saige-product-card-score-audit-followup-20260614.md`

## Review Focus

1. Product cards must come from ProductSSOT-backed data, not hardcoded seed fixtures.
2. Scores must come from score-bearing ProductSSOT governance records only.
3. `/api/products` must not error on text org ids.
4. `/portfolio`, `/dashboard`, and `/products` must use a consistent product read boundary.
5. The CB2 finding about public/no-org read surface while `AUTH_REQUIRED=false` is already recorded as nonblocking; reviewers should block only if it creates unacceptable exposure for the current internal proof deployment or violates branch scope.
6. No CT2 completion, deployment, scoring formula movement, governance write movement, canonical-doc movement, matrixArtifact status movement, WIRED movement, or VERIFIED movement is claimed by this branch.

## Privacy Boundary

Review-router was explicitly instructed not to use external Claude/Codex CLI reviewer commands that transmit private branch code unless Victor/W04 explicitly approves.

Allowed lanes are repo/in-app review lanes that can read the repo directly.

## Expected Result Files

If safe to commit through the repo, expected files are:

- `docs/cto/cd-review-saige-product-card-score-result-20260615.md`
- `docs/cto/cr-review-saige-product-card-score-result-20260615.md`

If committing result files is not safe, review-router should return CD and CR verdicts in that thread so CTO can commit the result packet.

Expected verdict format: `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`, independently for CD and CR, with file/line evidence for any finding.

## Gate Impact

This dispatch does not merge, promote, or move VERIFIED.

`fix/portfolio-product-ssot-cards` remains blocked until CD and CR verdicts land or W04 issues the explicit waiver already prepared in `docs/cto/w04-product-card-review-waiver-decision-packet-20260615.md`.
