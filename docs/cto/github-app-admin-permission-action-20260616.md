# GitHub App Administration Permission Action

Date: 2026-06-16 UTC
Owner: CTO
Status: BLOCKED ON EXTERNAL GITHUB APP APPROVAL
VERIFIED movement: no
Runtime code changes in this packet: no

## Why This Exists

W04/CEO directed one active task: merge, deploy, and prove `feature/universal-delivery-workspace` by having a Type 2 description-only Fresh Build produce a real deployed URL.

The branch is merged and deployed, and production is running `8b88d1b1410a8eb5f8cd452ffd2860007edf33a0`. The Type 2 proof now reaches Fresh Build code generation, but it cannot create the FlowAI-owned GitHub delivery repo. Without that repo, FlowAI cannot create/import the Vercel project and cannot return a deployed URL.

This is not a request for Victor to debug. It is one GitHub App permission approval.

## Current Production Evidence

- Production URL: `https://flowai-dun.vercel.app`
- `/api/health` status: `ready`
- Runtime commit: `8b88d1b1410a8eb5f8cd452ffd2860007edf33a0`
- Deployment URL: `https://flowai-onq1pw0xp-veu-ai-studio.vercel.app`
- `githubAppReady`: `true`

## Latest Type 2 Proof Evidence

- Run ID: `cto-type2-description-only-20260615-2324`
- Input type: Type 2 description-only Fresh Build
- Product description: Community Resource Navigator for a small nonprofit
- Fresh Build generated files: `14`
- Platform dependencies: `0`
- Terminal stage: `upgrade_repo_write`
- Terminal code: `ACCESS_BLOCKED`
- Terminal message: `Resource not accessible by personal access token`
- Preview URL: none
- CT2 dispatch: not sent because there is no deployed URL yet

The important point: the pipeline gets past "can FlowAI generate code from description only?" and stops at "can FlowAI create the delivery repository invisibly for the user?"

## GitHub App Permission Evidence

GitHub App:

- App name: `flowai-self-renewal`
- App owner: `veu-ai-studio`
- Installation owner: `veu-ai-studio`
- Repository selection: `all`
- Current installation permissions:
  - `contents: write`
  - `metadata: read`
  - `pull_requests: write`
  - `workflows: write`

Missing permission:

- `administration: write`

FlowAI's delivery workspace guard correctly requires:

- `administration: write`
- `contents: write`
- all-repository access

That guard lives in `src/lib/provisioning/upgradeTargetProvisioner.js` and prevents FlowAI from pretending it can create universal delivery workspaces when GitHub will reject repo creation.

## Latest Recheck

2026-06-16 UTC recheck:

- GitHub App installation token still returns `repository_selection: all`.
- GitHub App installation token still has `contents: write`.
- GitHub App installation token still does not have `administration: write`.
- `GITHUB_OPERATOR_TOKEN` is not present in Doppler `flowai / prd`.
- `GITHUB_PAT` is present, but authenticates as user `victor2081new-cloud` and returns no visible GitHub organizations from `/user/orgs`.
- GitHub CLI is not installed in this environment, so there is no separate local `gh` operator session to use.

Conclusion: there is no current machine-actionable credential path that can honestly create FlowAI-owned delivery repos under `veu-ai-studio`. The GitHub App permission approval remains the required action.

## Required Victor/W04 Approval

Approve the GitHub permission change for:

`https://github.com/apps/flowai-self-renewal`

Required repository permissions:

- Administration: Read and write
- Contents: Read and write
- Pull requests: Read and write
- Workflows: Read and write

Required repository access:

- All repositories

Required installation owner:

- `veu-ai-studio`

No SSOT amendment is required. This is an infrastructure permission needed to satisfy the already-documented Universal Delivery Workspace requirement: FlowAI creates a FlowAI-owned repo, writes generated/upgraded code, creates/imports the Vercel project, deploys, and returns the URL without user setup.

## CTO Action Immediately After Approval

Once the GitHub App permission prompt is approved:

1. Reconfirm the installation token includes `administration: write`.
2. Set delivery ownership back to the FlowAI-owned org namespace:
   - `FLOWAI_DELIVERY_GITHUB_OWNER=veu-ai-studio`
   - `FLOWAI_DELIVERY_GITHUB_OWNER_TYPE=org`
3. Redeploy production from current `main`.
4. Rerun the same Type 2 description-only Fresh Build proof.
5. If a URL is returned, dispatch CT2 to confirm the URL in a real browser.
6. Update `docs/cto/session-brief.md` with the result.

## Stop Condition

Do not claim Universal Delivery Type 2 proof complete until CT2 independently confirms a returned deployed URL.
