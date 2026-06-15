# W04 Decision Packet - Product Card Review Lane Waiver

FROM: CTO
TO: W04 / Victor Udo, FNSE, PhD - CEO
DATE: 2026-06-15 UTC
Branch: `fix/portfolio-product-ssot-cards`
Current branch head: `c78727b114ae2f00abcc67006b5fd1f467c7bf9f`
Current main when refreshed: `80fddc556f393ec5da7786ec6f90dff7d4c00964`
Status: ready for W04 decision
Runtime work: built, pushed, not merged
VERIFIED movement: no
Canonical docs: not edited

Refresh note: this packet was updated after the CTO continuation check so W04 can clear the live remote branch head, not an older docs-sync SHA. The scope and recommendation are unchanged.

## Decision Needed

Choose whether to waive the missing CD/CR verdicts for the narrow SAIGE product-card score visibility branch, or keep the branch blocked until CD and CR can review through an approved path.

This packet applies only to `fix/portfolio-product-ssot-cards`.

It does not waive review for `feature/universal-delivery-workspace`.

## Why This Decision Exists

The normal Step 5 gate requires CD + CR review before runtime merge.

CTO attempted to run the intended PowerShell reviewer tools directly so Victor would not have to relay prompts:

- `claude.exe` is installed.
- `codex.ps1` is installed.
- Claude Code connectivity check returned `OK`.
- Claude Code CD review with repo-read tools failed with `API Error: Unable to connect to API (ConnectionRefused)`.
- Escalated Claude Code retry was denied by tenant policy because it would disclose private branch code and repo context to an external Claude review service from a non-public workspace.
- Codex CLI review failed under sandbox networking, then escalated retry was denied by tenant policy because it would disclose private branch code and repo context to an external Codex/OpenAI review service from a non-public workspace.

Evidence: `docs/cto/review-lane-execution-status-20260615.md`.

CTO will not route around that tenant-policy denial.

## Branch Purpose

This branch resolves the remaining SAIGE visual acceptance blocker:

- `/portfolio`, `/dashboard`, and `/products` should show ProductSSOT-backed product cards.
- SAIGE should display a numeric score when ProductSSOT contains a score-bearing governance record.
- Empty product API results should not fall back to hardcoded proof-target fixtures.
- Text org ids such as `veu-ai-studio` should not be applied to UUID-only filters and crash the product read path.

The branch is intentionally not:

- a scoring formula change,
- a forge orchestration change,
- a deployment/governance mutation change,
- a canonical doc change,
- a VERIFIED promotion.

## Evidence Basis

Review packets and evidence:

1. `docs/cto/cd-review-saige-product-card-score-prompt-20260614.md`
2. `docs/cto/cr-review-saige-product-card-score-prompt-20260614.md`
3. `docs/cto/cb2-review-saige-product-card-score-result-20260614.md`
4. `docs/cto/saige-product-card-score-fix-evidence-20260614.md`
5. `docs/cto/saige-product-card-score-audit-followup-20260614.md`
6. `docs/cto/active-review-gates-20260614.md`
7. `docs/cto/review-lane-execution-status-20260615.md`

Known verification:

- CB2 verdict: `PASS-WITH-FINDINGS`.
- Accepted CB2 finding: `/api/products` fallback increases public/no-org read surface while `AUTH_REQUIRED=false`; acceptable for current internal proof mode, but must be auth/tenant-gated or public-safe before broad external tenant exposure.
- Branch preflight after dispatch-board sync: PASS.
- Branch preflight evidence: lint/build PASS, `237` test files / `3741` tests passed / `3` skipped, lane discipline PASS, SSOT traceability PASS, matrix generation PASS.
- Main preflight after documenting review-lane execution status: PASS, `236` test files / `3734` tests passed / `3` skipped.

## CTO Recommendation

Choose **Option A**.

### Option A - Waive CD/CR for Product-Card Branch Only

W04 explicitly waives the missing CD/CR verdicts for `fix/portfolio-product-ssot-cards` because:

- the branch has a narrow UI/API read-boundary purpose;
- CB2 already returned `PASS-WITH-FINDINGS`;
- the known finding is accepted and tracked;
- the branch does not move scoring formulas, governance writes, deployment code, canonical docs, or VERIFIED status;
- the direct external review path is blocked by tenant policy;
- the next required proof is CT2 after production deploy, not a claim of completion at merge.

If W04 selects this option, CTO may merge after a final docs-sync/delete-risk check, promote production, and dispatch CT2 for post-deploy visual acceptance.

### Option B - Require CD/CR Before Merge

Keep `fix/portfolio-product-ssot-cards` blocked until CD and CR produce result files through an approved review path:

- CD: `docs/cto/cd-review-saige-product-card-score-result-20260615.md`
- CR: `docs/cto/cr-review-saige-product-card-score-result-20260615.md`

If W04 selects this option, CTO keeps the branch open and does not merge.

### Option C - CEO Explicitly Approves External Reviewer CLI Disclosure

Victor/CEO explicitly approves sending private branch context to external Claude/Codex CLI review services for this repo.

If W04 selects this option, CTO can retry the direct PowerShell reviewer tools under the approved disclosure boundary.

CTO does not recommend this for the product-card branch because Option A is lower-friction and proportionate to the branch risk.

## Recommended W04 Clearance Text

```text
FROM: W04
TO: CTO

CLEAR TO MERGE - fix/portfolio-product-ssot-cards.

Documented waiver: CD/CR verdicts waived for this narrow ProductSSOT-backed product-card score visibility branch because direct PowerShell reviewer execution was blocked by tenant policy, CB2 returned PASS-WITH-FINDINGS, the accepted finding is tracked, and the branch does not change scoring formulas, governance writes, deployment code, canonical docs, or VERIFIED status.

Before merge:
- sync the branch with current main if needed;
- run the required docs/cto delete-risk guard;
- run preflight or preserve existing branch preflight only if the sync is docs-only and W04 accepts that scope.

After merge:
- push main;
- promote production;
- confirm /api/health or /api/version commit identity;
- dispatch CT2 for post-deploy SAIGE product-card visual acceptance.

No VERIFIED movement is authorized by this waiver.
Universal Delivery Workspace remains gated on CD/CR or separate explicit waiver.
```

## If W04 Chooses Option A

CTO next action:

1. Fetch origin.
2. Sync `fix/portfolio-product-ssot-cards` with current `origin/main` if the branch would delete current-main `docs/cto` evidence.
3. Run:

   ```powershell
   git diff --name-status origin/main..origin/fix/portfolio-product-ssot-cards --diff-filter=D -- docs/cto
   ```

   The result must be empty.

4. Merge `origin/fix/portfolio-product-ssot-cards` into `main`.
5. Run `npm run preflight`.
6. Restore timestamp-only `matrixArtifact.json` churn if generated.
7. Push `main`.
8. Promote production using the approved Vercel operator path.
9. Confirm production commit identity.
10. Dispatch CT2 using `docs/cto/ct2-saige-product-card-score-postdeploy-dispatch-20260614.md`.

Victor action required: none.

## If W04 Chooses Option B

CTO next action:

1. Keep the branch open.
2. Leave `active-review-gates` unchanged.
3. Continue repo-based CD/CR dispatch.

Victor action required: none unless W04 wants Victor to authorize a different reviewer path.

## If W04 Chooses Option C

CTO next action:

1. Record the explicit CEO approval boundary in `docs/cto/`.
2. Retry `claude.exe` and/or `codex.ps1` review execution for the product-card branch.
3. Commit result files if produced.

Victor action required: explicit CEO approval of private branch context disclosure to external reviewer CLI services.

## CTO Position

Option A is the right move for the product-card branch.

It preserves SSOT honesty while preventing a small visual/read-boundary patch from being held indefinitely by an external-review transport issue. The branch still must prove itself through CT2 after production deploy before any user-facing completion claim or VERIFIED movement.
