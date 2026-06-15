# Product Card Post-Waiver Execution Runbook - 2026-06-15

FROM: CTO
TO: CTO, W04, CT2
DATE: 2026-06-15 UTC
STATUS: READY IF W04 WAIVES CD/CR

## Scope

This runbook applies only to:

- Branch: `fix/portfolio-product-ssot-cards`
- Current branch head: `11797648f9b4c9b7a5be6dc3dab69a4fb23c4ece`
- Current main when written: `823a1a7cd879a00d3c5a65effdcebcb5916dfcb2`

This runbook is not merge clearance by itself.

Required clearance remains one of:

1. CD + CR verdicts, or
2. explicit W04 waiver from `docs/cto/w04-product-card-review-waiver-decision-packet-20260615.md`.

No VERIFIED movement is authorized by this runbook.

## Pre-Merge Guard

Run from the CTO main worktree:

```powershell
git fetch origin
git diff --name-status origin/main..origin/fix/portfolio-product-ssot-cards --diff-filter=D -- docs/cto
```

Required result:

- no output.

If the command returns any deleted `docs/cto` evidence files, stop and docs-sync the product-card branch again before merge.

## Merge Sequence

After W04 waiver or CD/CR clearance:

```powershell
git fetch origin
git checkout main
git pull origin main
git merge --no-ff origin/fix/portfolio-product-ssot-cards -m "merge: product card ProductSSOT score visibility"
npm run preflight
```

If `src/lib/orchestratorFramework/matrixArtifact.json` changes only `generatedAt`, restore it:

```powershell
git restore -- src/lib/orchestratorFramework/matrixArtifact.json
```

Then verify and push:

```powershell
git status --short --branch
git push origin main
```

## Production Promotion

After the merge is pushed to `main`, promote the Git-backed Ready deployment for `veu-ai-studio/flowai`.

Preferred token retrieval:

```powershell
doppler secrets get VERCEL_TOKEN --project flowai --config prd --plain
```

Fallback token name if needed:

```powershell
doppler secrets get VERCEL_OPERATOR_TOKEN --project flowai --config prd --plain
```

Promotion command shape:

```powershell
vercel promote <deployment-url-or-id> --token <token> --scope veu-ai-studio
```

Do not print, commit, or paste the token.

## Production Identity Confirmation

After promotion:

```powershell
curl.exe https://flowai-dun.vercel.app/api/version
curl.exe https://flowai-dun.vercel.app/api/health
```

Required:

- production commit identity matches the pushed `main` merge commit;
- `githubAppReady:true`;
- `inngestReady:true`;
- no claim of CT2 acceptance yet.

## CT2 Dispatch

After production identity is confirmed, dispatch CT2 to run the existing post-deploy product-card visual acceptance packet from the merged branch:

- `docs/cto/ct2-saige-product-card-score-postdeploy-dispatch-20260614.md`

Acceptance target:

- Production: `https://flowai-dun.vercel.app`
- Product: SAIGE
- Expected visual surfaces: `/portfolio`, `/dashboard`, `/products`

CT2 must independently confirm in browser:

1. SAIGE card appears on the target surfaces.
2. Numeric score is visible when ProductSSOT-backed score evidence exists.
3. No hardcoded seed product fallback is presented as live evidence.
4. No CT2 completion or VERIFIED movement is claimed by the UI before CT2 evidence.

## Post-CT2 Outcomes

If CT2 PASS:

1. Record CT2 evidence under `docs/cto/`.
2. Update `docs/cto/session-brief.md`.
3. Keep VERIFIED movement blocked unless W04/CEO authorizes exact row mapping and fields.

If CT2 BLOCK:

1. Do not promote VERIFIED.
2. Dispatch CB with the exact CT2 finding and screenshot/browser evidence.
3. Keep the product-card gate open until patched and re-tested.

## Standing Non-Actions

- Do not merge Universal Delivery Workspace under this product-card waiver.
- Do not promote production before merge.
- Do not claim a deployed URL from this branch.
- Do not move VERIFIED.
- Do not expose tokens.
- Do not bypass CT2.
