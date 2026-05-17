# Self-Renewal Spec — Option C: PR + Preview + Delta Score

**Status:** DRAFT v4 — addresses 8 conditions (R1–R8) from W6 v3 NOT_RATIFIED verdict, 2026-05-17. Pending W6 re-Panel ratification before any build begins. Spec only; **zero code** in this dispatch. **NOT canonical SSOT.**
**Author:** W3 (v1), W3a revision (v2 + v3 + v4), 2026-05-16/17.

**v4 change log (8 surgical fixes — CEO-locked Panel conditions R1–R8):**
- §6.4 (R1): `ProductRegistry.selfRenewalSubstantialThreshold` (integer, default `+5`, operator-configurable) restored. "Substantial improvement" is no longer a hardcoded `+5` — wherever the run is labeled or gated as substantial, the threshold is read from this field.
- §6.4 (R2): v2 two-field model restored — `selfRenewalNegativeDeltaPolicy` (`ALWAYS_OPEN` default | `DISCARD_ON_NEGATIVE`) + `selfRenewalMinimumDelta` (integer, default `0`). v3's `selfRenewalOpenPolicy` enum is REMOVED. Cross-field validation added: writes with `DISCARD_ON_NEGATIVE` AND `selfRenewalMinimumDelta < 0` are rejected at registry-write time.
- §3.2 (R3): branch-scoped PAT fallback RE-ADDED behind per-product feature flag `ProductRegistry.selfRenewalCredentialMode ∈ { 'app' (default), 'pat_fallback' }`. App remains the default primary path. PAT must be branch-scoped to `flowai/*` only. App manifest pinned in-repo at `.github/flowai-app-manifest.yml` so any change to the App's permission set produces an auditable diff.
- §4.3 (R4): Phase A → Phase B time-gated trigger REPLACED with an explicit Panel-ratification requirement. Phase B requires (a) ≥30 days proven production, (b) zero material incidents, AND (c) new Panel ratification of a Phase B spec — all three, not any of three. Scope-rollback mechanism added: operator can revert a Phase B product back to Phase A `MAX_FILES=1` via `ProductRegistry.selfRenewalScopeRollback = true`.
- §4.7 (R5 — NEW): hard renewal rate cap — `ProductRegistry.selfRenewalMaxPerDay` (integer, default `1`) caps renewal cycles per product per rolling 24-hour window. Runaway detector: `ProductRegistry.selfRenewalRunawayThreshold` (integer, default `3`) — N consecutive runs failing the same gate auto-disables Self-Renewal for that product and alerts the operator.
- §5.7 (R6 — NEW): branch cleanup mechanism — `flowai/renewal-*` branches older than `ProductRegistry.selfRenewalBranchRetentionDays` (integer, default `7`) days AND with no open PR are deleted by a nightly cleanup job.
- §4.4 (R7): smoke-selector validation moved to registry-write time. `ProductRegistry.selfRenewalSmokeSelectors` writes are rejected at registry-write boundary when any selector fails CSS-parse validation (must be parseable by `document.querySelector` without throwing). Gate-evaluation is now a pure read.
- §6.4 (R8): silent-close audit-log invariant tightened. Under `DISCARD_ON_NEGATIVE` or `delta_total < selfRenewalMinimumDelta`, the run MUST emit a `governance_record_entry` containing the full pre/post/delta payload — operator can always see what happened even when no PR was opened.

**v3 change log (3 surgical fixes — superseded in part by v4 above):**
- §3.2: PAT fallback path REMOVED entirely. GitHub App is the only credential model from Phase A day one. Products without a GitHub App installation cannot use Self-Renewal until installed; the operator is directed to the install flow. The "PAT fallback is INTERIM" graduation contract is also removed — no longer needed because the App is already the only path (addresses Panel `GQ3v2-APPONLY` plurality 5/7, CEO-locked Q3).
- §4.3: MAX_FILES reverted from 3 → 1. Single-file scope restored for Phase A. Phase B (per §7.3) raises to 3 files after ≥30 days proven in production (addresses Panel `GQ1v2-1FILE` plurality 4/7, CEO-locked Q1).
- §6.4: `ProductRegistry.selfRenewalNegativeDeltaPolicy` AND `ProductRegistry.selfRenewalMinimumDelta` collapsed into a single field `ProductRegistry.selfRenewalOpenPolicy` with three values: `ALL` (default — always open PR), `IMPROVEMENTS_ONLY` (open only if `delta_total > 0`), `SUBSTANTIAL_ONLY` (open only if `delta_total >= 5`). Decision sequence rewritten to use the single enum (addresses Panel `GQ4v2-HARD` + `GQ6v2` SPLIT including `GQ6v2-COLL` collapse vote, CEO-locked Q4+Q6 collapse).
- §10: G-Q1, G-Q3, G-Q4, G-Q6, G-Q7 rewritten to reflect v3 positions. G-Q2 carried unchanged (no v3 edit). G-Q5 carried as RATIFIED.

**v2 change log (5 surgical edits — superseded in part by v3 above):**
- §4.3: MAX_FILES raised from 1 → 3 (REVERTED by v3 — see §4.3 for current value).
- §4.4: typecheck gate (b) + preview smoke gate (c) added beyond `npm test` (carried unchanged in v3).
- §3.2: GitHub App promoted to PRIMARY credential target; fine-grained PAT scoped to `flowai/*` branches retained as INTERIM fallback (FALLBACK REMOVED by v3 — App is now the only path).
- §6.4: `selfRenewalNegativeDeltaPolicy` + `selfRenewalMinimumDelta` introduced (BOTH FIELDS REMOVED by v3 — collapsed into single `selfRenewalOpenPolicy` enum).
- §10: v2 Panel questions rewritten (further updated for v3 per the v3 change log above).
**Mission scope:** define how FlowAI takes assessment findings from the 8-step pipeline, acquires source from operator-owned GitHub repos, generates real fix diffs, opens a GitHub PR on a `flowai/renewal-<runId>` branch, triggers a Vercel preview deploy of that branch, re-assesses the preview, and produces a before/after governance delta score — all without merging anything autonomously.

**Anchor canonical:** `docs/CANONICAL_REFERENCE.md` §6 (Aggressive Crawling + Resolution Contract) + §10 (Self-Governance Layer / Self-Heal) + §11 (Clearance Protocol) + §15.1 Agent #3 row + §15.5 EXECUTOR_REGISTRY pattern. CA-12 v3 §A.2 Build-Authority Supervised maps to the Option C posture (FlowAI proposes code changes + deploys preview; human approves merge).

**Inputs read for this spec:**
- `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` v3 (frozen baseline, commit `be594e3`) — credential-handling patterns carried over to source acquisition + PR creation
- `src/lib/agents/agents/Agent3SelfRenewal.js` (commit `68a0c75`, 509 LOC skeleton — pure analyzer, no real fixes)
- `api/renew.js` (131 LOC, current renewal orchestrator endpoint)
- `api/_lib/sourceAcquisition.js` (GitHub tarball acquisition already shipped; this spec evolves the contract for PR-write authority)
- `docs/specs/agent-blueprints/AGENT_03_SelfRenewal.md` (split-charter reverse-engineered reference, commit context)
- `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` (earlier broader Self-Renewal draft; Option C is the concrete narrowing of its §6 fork-and-fix mode)

**CEO-locked context (per Dispatch #5):**
- Option C: BOTH a PR for code review AND an auto-deployed preview URL simultaneously.
- Target: all 5 operator-owned products (FlowAI has or can acquire the GitHub repos via fine-grained PAT).
- Human review: CEO reviews the PR and the preview before merging. **FlowAI NEVER merges autonomously.**
- Authority posture per CA-12 v3 §A.2: Build-Authority **SUPERVISED** (proposes + deploys preview; human approves merge); Operational-Authority Autonomous (crawl, API calls, etc.).
- Source acquisition: GitHub API using fine-grained PAT stored in Doppler.

---

## §1 — Scope

Self-Renewal in **Option C** does the following 8 things, end-to-end, per invocation:

1. **Receive assessment findings** from the 8-step pipeline output. The Monitor step (step 8 per Rev-2.1 §9) emits a final per-product report including ranked findings. Self-Renewal consumes that report as input.

2. **Acquire product source** from GitHub. Operator-owned repositories ONLY. Source acquisition uses a fine-grained PAT stored in Doppler per product (see §3 Source Acquisition Contract). If the operator does not own the repository, or no PAT is configured, Self-Renewal aborts the run with explicit error code `SELF_RENEWAL_NO_SOURCE` and writes a `governance_record_entry` to the ProductSSOT — no fallback to "generate-from-scratch" in Option C.

3. **Generate fix diffs** for each finding above the configurable severity threshold (default: `medium` and above per `ProductRegistry.selfRenewalSeverityFloor`; operator can raise or lower). Fix generation per §4 (Claude + finding context; unified diff output; single-file scope in Phase A).

4. **Open a GitHub PR** on a new branch named `flowai/renewal-<runId>`. PR body contains: findings list + fix summary + preview URL + before/after delta score. **Never auto-merge.** PR remains in draft state until a human reviewer (admin role per Rev-2.1 §13) explicitly approves and merges.

5. **Trigger a Vercel preview deploy** of the new branch automatically. Vercel preview must be live (URL reachable, HTTP 2xx) before the PR is opened — the operator MUST see the renewed result before being asked to review the code. Vercel webhook-triggered deploy on branch push; verified via Vercel deployments API per Orchestra `vercel.js` adapter.

6. **Re-assess the preview URL** using the same 8-step pipeline (same Agent #21 Conductor crawl + Agent #6/#7/#8/etc. graduations as the original assessment). Re-assessment writes its own Monitor-step report.

7. **Produce a before/after delta score** per §6 (Delta Score Contract). Delta is computed per Five-Layer Intelligence Framework (L1 Functionality, L2 Operational, L3 Financial, L4 Business, L5 GTM) + a single total. Delta is honest — if the fix made things worse, the delta is negative and reported as such.

8. **Report PR URL + preview URL + delta score + fix summary** to the operator via:
   - `governance_record_entry` written to the affected ProductSSOT (per Rev-2.1 §14 GovernanceAuditLog)
   - Per-operator notification surface (admin UI badge + optional email via existing `api/email/*` endpoints per Rev-2.1 §9 step 8 Monitor cross-link)
   - `3.renewal.applied.v1` MessageBus event with the PR + preview + delta payload (existing topic per Agent #3 Executor charter; payload extended per §5)

This 8-step flow is the canonical Option C **happy path**. Failure modes per §4 (fix generation discards bad diffs), §5 (preview must be live before PR), §3 (source acquisition aborts cleanly if no source).

---

## §2 — What Self-Renewal CANNOT Do (Honest Scope)

The following are **out of scope** for Option C and MUST NOT be silently attempted. Every item below is enforced either by validation (run-time error envelope) or by absent capability (the code path simply does not exist).

| Out-of-scope item | Why | Enforcement |
|---|---|---|
| **Merge PRs autonomously** | Per CEO Dispatch #5 + CA-12 v3 §A.2 Build-Authority SUPERVISED. Human-only merge is the core safety property of Option C. | No GitHub API call from any Self-Renewal code path invokes `PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge`. Spec-grep enforcement at engineering time + Panel-reviewed code-review gate. |
| **Fix issues requiring architectural redesign** | Architectural changes touch multiple files, change data models, and require human judgment. Phase A scope is single-file fixes only (per §4); even Phase B–D limit themselves to incremental refactors. | Findings tagged `architectural` by Agent #8 Quality Audit are excluded from the fix-generation pass (logged as `out-of-scope: architectural`). |
| **Fix auth-gated issues without Phase 3** | Authenticated crawl requires the Phase 3 auth-traversal infrastructure per `AUTH_TRAVERSAL_SECURITY_SPEC.md` v3. Without it, Self-Renewal cannot re-assess authenticated paths — meaning the delta score cannot include those paths. | Findings marked `authGated: true` (per Agent #21 crawl output) are excluded from the fix-generation pass when Phase 3 is not deployed (logged as `out-of-scope: auth-gated, awaiting Phase 3`). |
| **Acquire source from products it doesn't own** | Operator-owned only per CEO Dispatch #5 + parallels CA-12 v3 §A.1.4 (Mode 3B operator-attestation rationale). | §3 source-acquisition validator checks the GitHub PAT is present in `Doppler[product:productId:github_pat]`, the PAT's repo scope matches the requested repo, AND the repo's `owner.login` matches operator-attested ownership in `ProductRegistry`. Any mismatch → abort with `SELF_RENEWAL_NO_SOURCE`. |
| **Fix issues in third-party dependencies** | Fixes to upstream packages (npm modules, third-party APIs) are out of scope. Self-Renewal can recommend a dependency upgrade as a finding for human action, but cannot edit `node_modules/`, cannot fork third-party repos, cannot modify lockfiles. | Fix-generation pass excludes any diff touching `node_modules/`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` (already excluded from source-acquisition tarball per `sourceAcquisition.js` SKIP_FILES + SKIP_PREFIXES — same exclusion applies to fix output). |
| **Guarantee fix doesn't introduce regressions** | Regressions are detected by tests, not avoided by spec. Self-Renewal runs `npm test` against the fix per §4 to catch known regressions; unknown regressions are caught by the human PR reviewer + the Vercel preview's real-browser behavior. | §4 fix-discard gate (test failure → discard). Human PR review is the canonical regression-catching mechanism per CEO Dispatch #5. |

**Brutal-honesty statement:** Option C does NOT make FlowAI "self-healing in production." It makes FlowAI "propose, deploy preview, and present a delta for human review." The merge gate is human; the architectural judgment is human; the rollback authority is human. Self-Renewal in Option C is automation of the proposal-and-preview cycle, NOT automation of the merge decision.

---

## §3 — Source Acquisition Contract

### §3.1 — GitHub repository URL per product

Each operator-owned product registered in `ProductRegistry` has a `githubRepoUrl` field (string, e.g. `https://github.com/<org>/<repo>`). The operator sets this via admin UI (admin role per Rev-2.1 §13). If `githubRepoUrl` is absent, Self-Renewal aborts the run with explicit error `SELF_RENEWAL_NO_SOURCE { reason: 'no_repo_configured' }`.

### §3.2 — GitHub credential: App default, branch-scoped PAT fallback behind per-product feature flag

**Phase A's primary credential model is a single FlowAI GitHub App.** Per-product opt-in to a branch-scoped fine-grained PAT fallback is available via the `ProductRegistry.selfRenewalCredentialMode` field (enum: `'app'` default | `'pat_fallback'`). The App remains the default and recommended path; the PAT fallback exists for products whose operators have not yet installed the App or cannot install it for legitimate reasons (e.g. enterprise GitHub policy restricting App installations).

**Per-product feature flag:** `ProductRegistry.selfRenewalCredentialMode` is operator-configurable per product. Default is `'app'`. Operators set it to `'pat_fallback'` only when they have explicitly provisioned a branch-scoped PAT for that product (see fallback block below). Mode changes take effect on the next renewal run.

**Primary path: GitHub App** — one App registration shared across the FlowAI fleet, multi-installation per operator org, installed into each operator-owned GitHub organisation or user account that wishes to enable Self-Renewal. The App provides:

- **Installation-time consent** — the operator visibly authorises FlowAI to act on a finite set of repositories at installation time. No after-the-fact scope drift.
- **Fine-grained webhook subscription** — Phase A subscribes to `pull_request`, `pull_request_review`, `installation`, `installation_repositories`, and `meta` events ONLY. No `push`, no `issues`, no `repository_dispatch`, no `workflow_run`. The narrow subscription is verifiable by anyone reading the App manifest.
- **No long-lived token** — Self-Renewal mints an installation access token at the start of each renewal run (`POST /app/installations/{installation_id}/access_tokens`), uses it for the run, and discards it at run end. Installation tokens expire ≤ 1 hour by GitHub default — bounded blast radius even if leakage occurs.
- **Per-installation isolation** — the access token is scoped to a single installation's repositories; cross-tenant credential reuse is structurally impossible.

App permissions (minimum):
- `contents: write` — create branches, push commits to the renewal branch.
- `pull_requests: write` — open PRs, comment, update PR body.
- `metadata: read` — implicit/required for the above.

App permissions MUST NOT include: `actions: write`, `administration: *`, `secrets: *`, `workflows: write` (rationale unchanged — Self-Renewal does not modify CI, repo settings, secrets, or workflow files).

**App manifest pinned in-repo at `.github/flowai-app-manifest.yml`.** The canonical declaration of the App's name, permission set, webhook event subscription, and homepage URL is committed to the FlowAI repository at `.github/flowai-app-manifest.yml`. Any change to the App's permissions (e.g. adding a new event subscription, raising a permission scope) MUST be made via a PR that edits the manifest file, producing an auditable diff that the operator can review in their own GitHub UI before clicking "Accept new permissions" on the next installation update. The manifest file is the source of truth; the App registration in GitHub is reconciled from the file by a CI job in the FlowAI repository on merge to `main`. The manifest also exposes the install-flow setup-URL so the manifest itself documents how operators install the App.

**App-credential storage:** the App's private signing key (PEM) is stored in Doppler at `flowai/<env>/SELF_RENEWAL_APP_PRIVATE_KEY`; the numeric App ID at `flowai/<env>/SELF_RENEWAL_APP_ID`. The per-operator-installation ID is stored on `ProductRegistry.selfRenewalGithubInstallationId` (recorded at install-time via the App's setup callback URL). Per-run installation tokens are minted from those three values in memory, used for the run, and discarded at run end (same memory-only pattern as the existing AUTH_TRAVERSAL_SECURITY_SPEC v3 Invariant 2). The App private key and App ID are NOT product-scoped (single FlowAI App, multi-tenant via installations); the installation ID is the per-product binding.

**Fallback path: branch-scoped fine-grained PAT (opt-in only).** When `ProductRegistry.selfRenewalCredentialMode = 'pat_fallback'` for a product, Self-Renewal uses a fine-grained personal access token (NOT a classic PAT — classic PATs have over-broad permissions) with the following constraints:

- **Branch-scoped contents write.** The PAT MUST have `contents: write` scoped to branches matching `flowai/*` ONLY. The PAT MUST NOT have `contents: write` on the default branch (`main` / `master` / etc.) or on any non-`flowai/*` branch. Where the fine-grained PAT permission model does not support branch-pattern scoping natively, the equivalent posture is achieved by repository-level GitHub branch protection rules requiring all writes to non-`flowai/*` branches to come from a non-Self-Renewal author — the fallback PAT is bound to a dedicated `flowai-self-renewal` machine user whose write attempts to protected branches are rejected at the GitHub API layer.
- **Permissions:** `contents: write` (branch-scoped per above) + `pull-requests: write`.
- **MUST NOT have:** `actions: write`, `administration: *`, `secrets: *`, `workflows: write` (same denial list as the App).
- **Repository-selection scope:** `selected` with the operator's repos enumerated, OR `all` only when bound to an operator-owned GitHub organisation. NEVER `all` on a personal user account the operator does not own.
- **Storage:** stored in Doppler at path `flowai/<env>/PRODUCT_<productId>_GITHUB_PAT`. Read via `CredentialAdapter`. Memory-only lifetime per §3.3.

**Selection logic per renewal run:**
1. Read `ProductRegistry.selfRenewalCredentialMode` for the product (default `'app'`).
2. If mode == `'app'`:
   - If `ProductRegistry.selfRenewalGithubInstallationId` is set → use the GitHub App path (mint installation token).
   - Else → abort with `SELF_RENEWAL_NO_SOURCE { reason: 'no_app_installation' }` per §3.6.
3. Else if mode == `'pat_fallback'`:
   - If `Doppler[flowai/<env>/PRODUCT_<productId>_GITHUB_PAT]` is set → use the PAT path. Emit `governance_record_entry kind: 'self_renewal.using_pat_fallback'` on every run (so the operator and the Panel can see fallback usage frequency).
   - Else → abort with `SELF_RENEWAL_NO_SOURCE { reason: 'no_pat' }` per §3.6.
4. Else (mode is unrecognised) → abort with `SELF_RENEWAL_NO_SOURCE { reason: 'invalid_credential_mode' }`.

**App is the recommended path; PAT fallback is opt-in only.** When mode is `'app'` and step 2's abort fires (App not yet installed), the operator-facing notification deep-links to the GitHub App install flow (`https://github.com/apps/<flowai-app-slug>/installations/new`, prefilled with the product's repo as the install target where possible). Subsequent runs succeed automatically once installation is recorded on `ProductRegistry.selfRenewalGithubInstallationId`. Operators stuck mid-install with an urgent renewal need can flip `selfRenewalCredentialMode` to `'pat_fallback'` after provisioning the PAT — flipping back to `'app'` is encouraged once installation completes.

### §3.3 — Token lifetime: per-renewal-run only

Per AUTH_TRAVERSAL_SECURITY_SPEC v3 patterns (Invariants 7 + 8):

- PAT is loaded into process memory at the start of the renewal run, keyed by `runId`.
- PAT is passed to the GitHub API client as a Bearer token for the duration of the run.
- PAT is dereferenced (set to `null`) and the run's credential context is discarded at run end.
- PAT is NEVER written to disk (no `tmp/`, no temp file).
- PAT is NEVER persisted to Supabase, Vercel KV, Vercel Blob, git, log files, audit chain.
- PAT is NEVER serialised in a Claude / OpenRouter prompt payload.
- PAT is NEVER embedded in PR body, branch name, commit message, or any output artifact.

### §3.4 — Credential scrubbing

The `scrubCredentials()` helper (already shipped at `src/lib/renewal/inputArtifact.js:146`, extended per CA-10 §E.2 to scrub email + phone + CC + government IDs + customer-self-identified names) is applied at every persist / log / external-send boundary that touches Self-Renewal output.

Extended canary pattern for Self-Renewal acceptance test (mirrors AUTH_TRAVERSAL_SECURITY_SPEC §1 Invariant 1 test surface):
- Submit a known-canary PAT (`canary-GITHUB-PAT-FLOWAI-CANARY-${runId}-NONCE`) for one test run.
- Run a complete Option C cycle end-to-end.
- Grep every persistent artifact (Supabase rows, log files, Sentry sample, ProductSSOT JSON, audit-chain entries, Claude prompt history, PR body, branch name, commit message, fix diff content) for the canary string.
- Assert zero hits.

### §3.5 — Source-acquisition method (Option C-specific)

Option C source acquisition uses the **GitHub REST API directly** (NOT the existing tarball mechanism in `api/_lib/sourceAcquisition.js`, which serves the read-only renewal-engine path). Rationale: Option C needs to **write back** to the repo (create branch, push commit, open PR). The tarball API is read-only; the per-file Contents API + Git Data API supports the read-write path.

Concrete API sequence per renewal run:
1. `GET /repos/{owner}/{repo}` — verify repo exists + read access works (PAT scope check).
2. `GET /repos/{owner}/{repo}/git/ref/heads/{defaultBranch}` — read the default branch HEAD SHA.
3. `POST /repos/{owner}/{repo}/git/refs` — create `refs/heads/flowai/renewal-<runId>` pointing at the HEAD SHA.
4. For each fix in the renewal set: `PUT /repos/{owner}/{repo}/contents/{path}` — write the fixed file on the renewal branch (with commit message `flowai: self-renewal fix <finding_id>`).
5. `POST /repos/{owner}/{repo}/pulls` — open the PR (after preview is live per §5).

The Contents API + Git Data API are server-side-callable from Vercel functions (no shell-out needed; unlike `git clone`). This is the same architectural pattern as `api/_lib/sourceAcquisition.js` tarball acquisition (server-side-callable; no shell).

### §3.6 — Honest abort paths

The source-acquisition contract aborts cleanly with structured error envelopes when:

| Condition | Error code | ProductSSOT entry |
|---|---|---|
| `githubRepoUrl` missing on ProductRegistry row | `SELF_RENEWAL_NO_SOURCE { reason: 'no_repo_configured' }` | `governance_record_entry kind: 'self_renewal.aborted', reason: 'no_repo_configured'` |
| PAT not found in Doppler at expected path | `SELF_RENEWAL_NO_SOURCE { reason: 'no_pat' }` | Same kind, reason `no_pat` |
| PAT scope mismatch (repo not in PAT's repo set) | `SELF_RENEWAL_NO_SOURCE { reason: 'pat_scope_mismatch' }` | Same kind, reason `pat_scope_mismatch` |
| `GET /repos/.../{repo}` returns 404 (repo deleted, renamed, transferred) | `SELF_RENEWAL_NO_SOURCE { reason: 'repo_not_found' }` | Same kind, reason `repo_not_found` |
| `GET /repos/.../{repo}` returns 403 (PAT insufficient permissions) | `SELF_RENEWAL_NO_SOURCE { reason: 'pat_insufficient_permissions' }` | Same kind, reason `pat_insufficient_permissions` |
| Operator attestation mismatch (PAT owner != ProductRegistry operator) | `SELF_RENEWAL_NO_SOURCE { reason: 'attestation_mismatch' }` | Same kind, reason `attestation_mismatch` |

In all 6 cases, the operator-facing notification surfaces with a clear actionable message ("Configure GitHub repo URL", "Provision GitHub PAT in Doppler", etc.). The renewal run is reported as `failed` in the Monitor step's clearance decision — not as a degraded success.

---

## §4 — Fix Generation Contract

### §4.1 — Generation model

Fix generation uses Claude (same model as the pipeline per Rev-2.1 §25 Locked Rule 8 — `claude_sonnet_4_6` by default). The Claude prompt receives:

- The finding object (id, category, severity, location, evidence, autoFixable flag, fixSpec hint)
- The relevant source file content (single file in Phase A — see §4.3)
- The framework type (per `sourceAcquisition.js` `detectFramework()`: `vite`, `next`, `unknown`)
- The Five-Layer Intelligence Framework header for context (same prompt prefix as the assessment pipeline per `src/lib/operationsEngine.js` `FIVE_LAYER_FRAMEWORK` const)

The prompt explicitly forbids:
- Adding new imports unless required by the fix (per `claudeCode.js` adapter pattern)
- Altering formatting / whitespace outside the patched region
- Touching files beyond the single target file (Phase A scope; see §4.3)
- Modifying tests, lockfiles, workflow files, or `node_modules/`

### §4.2 — Fix output format

Each fix is emitted as a **unified diff** (standard `git diff` format). The Self-Renewal Executor (per CA-7 §15.5 EXECUTOR_REGISTRY pattern) applies the diff to the branched file tree via the GitHub Contents API (§3.5 step 4).

Diff format:
```
--- a/<original_path>
+++ b/<original_path>
@@ -<line>,<count> +<line>,<count> @@
-<removed line>
+<added line>
 <context line>
```

The diff is validated for parseability before any GitHub API call. Unparseable diffs are discarded per §4.4.

### §4.3 — Fix scope: single-file changes only in Phase A

Phase A (this spec, ratified-and-built scope) restricts fix generation to changes within a **single file per finding** (`MAX_FILES = 1`). The Claude prompt receives one source file as context, and the output diff MUST touch only that file.

**Diff-parse-time enforcement:** the unified diff returned by Claude is parsed BEFORE any GitHub API call. The parser counts distinct file headers (`--- a/<path>` / `+++ b/<path>` pairs). If the parsed count exceeds `MAX_FILES = 1`, the entire fix is discarded immediately and the finding is logged as `auto_fix_attempted_failed { gate: 'scope_exceeded', files_touched: <count> }`. **2+-file fixes are discarded at diff-parse time — never a PR with excessive scope.** No branch is created, no Contents API write occurs, no preview is triggered.

**Phase B graduation requirement (v4 — all three conditions must hold, not any of three):**

1. **Phase A proven in production for ≥30 days** against ≥3 of the 5 operator products. The 30-day clock starts on the first successful Phase A renewal run in production for the third operator product.
2. **Zero material incidents during the 30-day window.** A "material incident" is defined as: a Self-Renewal PR that, after operator merge, caused a production regression requiring revert; a Self-Renewal run that exfiltrated credentials, source content, or PII; or a Self-Renewal run that exceeded the cost envelope of Note 3 by >5×.
3. **New Panel ratification of a Phase B spec.** Phase B is not auto-promoted by the time-and-incidents conditions alone — a separate spec dispatch must be drafted (per the §7.3 graduation path), submitted to adversarial Panel, and ratified before Phase B's `MAX_FILES = 3` takes effect for any product. Conditions (1) and (2) are *necessary preconditions* for opening the Panel dispatch, not *sufficient triggers* for graduation.

Until all three conditions are met, Phase A is strictly single-file. The diff-parse-time enforcement gate (per §4.4) is the structural guarantee that the change-log here cannot drift from runtime behaviour.

**Scope-rollback mechanism.** After Phase B is ratified and `MAX_FILES = 3` is in effect, the operator can revert any specific product back to Phase A `MAX_FILES = 1` behaviour by setting `ProductRegistry.selfRenewalScopeRollback = true` (boolean, default `false`). When this flag is set, Self-Renewal treats the product as if Phase B had never been ratified for it — `MAX_FILES` is read as `1`, multi-file Claude prompts are not assembled, and the discard gate enforces single-file. This is the operator's emergency-brake when multi-file fixes start cascading failures on a specific product (e.g. a product whose test suite turns out to be too brittle for safe multi-file changes). Rollback is per-product, not fleet-wide, so one cascading-failure product does not halt Self-Renewal across the fleet.

Multi-file fixes are deferred to Phase B. Findings that require multi-file changes are excluded from Phase A's fix-generation pass (logged as `out-of-scope: multi-file required`).

### §4.4 — Fix-discard gates

A fix is DISCARDED (and the finding logged as `auto_fix_attempted_failed { gate: <gate_name> }`) if ANY of the following gates fail. Gates (a), (b), (c) are MUST gates — none may be skipped or marked optional in Phase A:

| Gate | Check | Discard reason |
|---|---|---|
| **Diff parseability** | Output is a valid unified diff parseable by `parse-diff` or equivalent | `gate: 'diff_unparseable'` |
| **Scope check** | Parsed diff touches ≤ `MAX_FILES = 1` distinct file in Phase A (per §4.3; Phase B raises to 3) | `gate: 'scope_exceeded'` |
| **Syntax check** | Resulting patched file passes language-specific syntax check (e.g., `node --check` for JS/TS, `python -m py_compile` for Python, etc.) | `gate: 'syntax_invalid'` |
| **(a) Test suite — MUST** | `npm test` (or equivalent for the framework — `yarn test`, `pnpm test`, `vitest run`) passes against the patched file tree | `gate: 'test_failure'` |
| **(b) Typecheck — MUST** | `npm run typecheck` (or `tsc --noEmit`) passes against the patched file tree, where a `tsconfig.json` is present at the repo root or in a workspace package. Projects without `tsconfig.json` skip this gate (logged as `gate_skipped: typecheck { reason: 'no_tsconfig' }`) — the gate is MUST-when-applicable, not MUST-universal, because non-TypeScript projects legitimately have no typecheck surface. Zero NEW type errors required (pre-existing typecheck debt is ignored — same precedent as the lint gate). | `gate: 'typecheck_failure'` |
| **(c) Preview smoke — MUST** | After the Vercel preview reaches `READY` (per §5.5 step 3), Self-Renewal performs a smoke test: `fetch(previewUrl)` with a 30-second timeout, asserts HTTP 2xx status, AND asserts at least **one key DOM element** is present in the rendered HTML response (per-product key-DOM selector list on `ProductRegistry.selfRenewalSmokeSelectors`, defaulting to `['html', 'body']` if unset — operator can configure stricter selectors such as `['#root', 'header', 'main']`). Selectors are validated at **registry-write time** (see §4.4.1), so gate-evaluation is a pure read with no parser-throw risk. | `gate: 'preview_smoke_failure'` |
| **Lint** | `npm run lint` (or `eslint`) introduces zero NEW errors (existing lint debt is ignored — Self-Renewal must not be blocked by pre-existing project debt) | `gate: 'new_lint_errors'` |
| **Build** | `npm run build` (or framework equivalent — `vite build`, `next build`) completes without errors | `gate: 'build_failure'` |

**Never a broken PR.** If any gate fails, the fix is discarded BEFORE the GitHub Contents API write (for parse/scope/syntax/test/typecheck/lint/build gates) OR BEFORE the Pulls API call (for the preview-smoke gate, which by ordering necessarily runs after the branch push per §5.5). The branch is never opened as a PR with broken code or a broken preview. The finding is logged as `auto_fix_attempted_failed` and remains in the operator's open-findings list for manual remediation.

**Gate-ordering note:** Diff-parse / scope / syntax run pre-push. Test / typecheck / lint / build run in the disposable Vercel build environment (per §4.6). Preview-smoke runs post-build, post-deploy, pre-PR (slots into §5.5 step 4 — replacing the prior bare-2xx smoke with the 2xx + DOM-element check).

### §4.4.1 — Smoke-selector validation at registry-write time (R7)

`ProductRegistry.selfRenewalSmokeSelectors` is a list of CSS selector strings (e.g. `['#root', 'header', 'main']`) consumed by the §4.4 preview-smoke MUST gate. Validation occurs at the moment the value is written to the registry, **not** at gate-evaluation time:

- The admin UI write path and any programmatic write to `ProductRegistry.selfRenewalSmokeSelectors` MUST invoke the canonical selector validator before persisting. The validator runs `document.querySelector(selector)` (or the server-side equivalent via `parse5` / `css-what` / equivalent CSS-selector parser available in the Vercel function environment) on each selector string in the list. Any selector that causes the parser to throw — invalid syntax, empty string, non-string value — is rejected.
- Rejection is reported synchronously to the writer with a clear actionable error: `INVALID_SMOKE_SELECTOR { index: <i>, value: <selector>, parserError: <message> }`. The whole write is rejected (not partially-applied) — the registry never holds a mixed valid/invalid selector list.
- Empty lists are valid (treated as "use the default `['html', 'body']`" at gate-evaluation time).
- The selector list is upper-bounded at 20 entries (operators with more complex smoke needs should split into multiple narrower products, not stuff one product with a long selector list).
- Once stored, selectors are trusted at gate-evaluation time: the §4.4 (c) preview-smoke gate reads the validated list and runs each selector against the rendered preview HTML, with no defensive try/catch around the selector itself. A selector that fails to match returns "no element found" (and the gate fails with `preview_smoke_failure`); a selector that throws would be a regression of this validation contract and is treated as a P1 bug.

Validation runs in three places that must stay in sync: the admin UI form-submit handler, the `ProductRegistry` write API (server-side), and any migration script that backfills `selfRenewalSmokeSelectors`. All three call the same `validateSmokeSelectors(list): { ok: true } | { ok: false, error: ... }` helper; the helper's contract is the source of truth.

### §4.5 — Per-finding fix-generation isolation

Each finding's fix-generation pass runs in isolation. A failure on one finding's fix does not affect other findings' fixes. The renewal run reports per-finding fix-status in the PR body (see §5.4 PR body format).

### §4.6 — Gate execution environment

Test + lint + build gates run in a **disposable Vercel build environment** (a preview build of the branched source code). Self-Renewal does NOT run untrusted operator-product test code on its own infrastructure. Vercel's preview-deploy sandbox is the test surface; if Vercel build fails, the fix is discarded (the failed build is the canonical signal).

### §4.7 — Renewal rate cap + runaway detector (R5)

Two per-product safety limits cap how often Self-Renewal can run and how it responds to repeated failures. Both are configured via `ProductRegistry` and enforced before any source acquisition, fix generation, or PR creation:

**Hard renewal rate cap — `ProductRegistry.selfRenewalMaxPerDay`** (integer, default `1`). Self-Renewal MUST NOT execute more than `selfRenewalMaxPerDay` renewal cycles per product in any rolling 24-hour window. The cap is enforced at the AutoRunner / orchestrator boundary BEFORE the run begins (no source acquisition, no fix generation, no PR — the run is rejected at scheduling time):

- The orchestrator reads the count of `governance_record_entry kind: 'self_renewal.*'` entries for the product whose `at` timestamp falls within the last 24 hours.
- If that count is ≥ `selfRenewalMaxPerDay`, the new run is rejected with error code `SELF_RENEWAL_RATE_LIMIT { reason: 'daily_cap_reached', cap: <N>, windowStart: <ISO>, nextEligibleAt: <ISO> }` and logged via `governance_record_entry kind: 'self_renewal.rate_limited'`.
- Rate-limited runs DO NOT consume cost (no Claude API calls, no Vercel preview build, no GitHub API write) — the rejection is at the orchestrator gate, not after.
- Operators who need a different cadence raise the field per product (e.g. `3` for a product with high finding-throughput, `0` to disable Self-Renewal entirely for a product while keeping the rest of the config intact).
- The 24-hour window is rolling (sliding), not aligned to calendar days — prevents the "burst at midnight then quiet for 24 hours" pattern.

**Runaway detector — `ProductRegistry.selfRenewalRunawayThreshold`** (integer, default `3`). Self-Renewal MUST disable itself automatically for a product when the most recent N consecutive runs all failed the same discard gate (per §4.4):

- After each renewal run that ends in `auto_fix_attempted_failed`, the orchestrator inspects the immediately preceding `governance_record_entry` events for that product to count consecutive same-gate failures.
- "Same gate" means the same `gate` value (e.g. `'preview_smoke_failure'`, `'test_failure'`, `'typecheck_failure'`). A run that fails a *different* gate resets the count.
- When the consecutive count reaches `selfRenewalRunawayThreshold` (default `3`), Self-Renewal is auto-disabled for the product. Auto-disable sets `ProductRegistry.selfRenewalDisabled = true` and writes `governance_record_entry kind: 'self_renewal.runaway_disabled'` with `{ gate: <gate_name>, consecutiveFailures: <count>, lastNRunIds: [<runId>...] }`.
- The operator is alerted via the admin UI badge surface + optional email (per §1 step 8 notification surface). The alert includes the failure gate, the consecutive count, and a deep-link to the most recent failed run's `governance_record_entry`.
- Re-enablement is manual: the operator reviews the failure pattern, fixes the underlying issue (e.g. updates the smoke selectors, fixes a broken test, repairs a typecheck error), and explicitly clears `selfRenewalDisabled` via the admin UI. Auto-disabled products do not silently re-enable on a timer.
- `selfRenewalDisabled = true` blocks all renewal cycles for the product, regardless of `selfRenewalMaxPerDay`. The auto-disable check runs BEFORE the rate-cap check.

These two limits together bound the worst case: a single product can attempt at most `selfRenewalMaxPerDay` runs per 24 hours, and a runaway-failure pattern halts the product entirely after `selfRenewalRunawayThreshold` consecutive same-gate failures. The fleet-wide blast radius of any single Self-Renewal misconfiguration is bounded.

---

## §5 — PR + Preview Contract

### §5.1 — Branch naming

`flowai/renewal-<runId>` where `<runId>` is the canonical UUID v4 runId from the AutoRunner. Examples:

- `flowai/renewal-7f3a8b2c-1d4e-4f6a-9b8c-2e5d4f3a1b8c`
- `flowai/renewal-a1b2c3d4-...`

The `flowai/` prefix is a hard-coded prefix; it is NOT operator-configurable (prevents accidental collisions with operator branches and gives the operator a clear `flowai/` filter in their git client).

### §5.2 — PR title

```
FlowAI Self-Renewal: <runId> — <N> fixes from governance assessment
```

Where `<N>` is the count of fixes that survived the discard gates per §4.4. Example:

```
FlowAI Self-Renewal: 7f3a8b2c... — 4 fixes from governance assessment
```

### §5.3 — PR draft state on creation

PR is created in **draft state** (`draft: true` in `POST /repos/.../pulls`). This signals to GitHub branch protection rules that the PR is not yet ready for merge and prevents accidental "Squash and merge" clicks. The operator promotes the PR out of draft when they're ready to review.

### §5.4 — PR body format

```markdown
## FlowAI Self-Renewal Report

**Run ID:** <runId>
**Source assessment:** <link to ProductSSOT entry of the originating assessment>
**Preview URL:** <vercel-preview-url> (live before this PR was opened)
**Before/after delta score:** <total-delta> (per-layer breakdown below)

## Fixes applied (<N> of <M> attempted)

For each fix in the surviving set:

### Fix <i>: <finding.category> (severity: <finding.severity>)

- **File:** `<path>`
- **Finding ID:** `<finding.id>`
- **Evidence:** <verbatim evidence snippet from the assessment>
- **Diff summary:** <one-line description of the change>
- **Test result:** PASSED
- **Layer impact (predicted):** L<N> + <points>

## Fixes attempted but discarded (<M - N>)

For each discarded fix:

### <finding.category> (discarded)

- **Discard gate:** `<gate_name>` (one of: diff_unparseable, syntax_invalid, test_failure, new_lint_errors, build_failure)
- **Finding ID:** `<finding.id>`
- **Recommended human action:** <Claude-generated one-line recommendation for manual remediation>

## Before/after delta score (per Five-Layer)

| Layer | Before | After | Delta |
|---|---:|---:|---:|
| L1 Functionality | <pre> | <post> | <delta> |
| L2 Operational | <pre> | <post> | <delta> |
| L3 Financial | <pre> | <post> | <delta> |
| L4 Business | <pre> | <post> | <delta> |
| L5 GTM | <pre> | <post> | <delta> |
| **Total** | **<pre_total>** | **<post_total>** | **<total_delta>** |

## What this PR does NOT do

- Does NOT auto-merge. You (human reviewer) review and decide.
- Does NOT modify tests, dependencies, or workflow files.
- Does NOT fix architectural or auth-gated issues (excluded from this run).
- Does NOT touch any file outside the surviving fix set above.

## Review checklist

- [ ] Open the preview URL and verify the fixes look right in-browser
- [ ] Review each fix diff in this PR's "Files changed" tab
- [ ] Check the delta score — does it match what you expected?
- [ ] If any fix looks wrong, comment on the specific file in the PR and FlowAI will surface the comment back to the next assessment run
- [ ] Merge when satisfied; close the PR if you reject the proposed fixes

---

🤖 Generated by FlowAI Self-Renewal (Option C: PR + preview + delta).
[FlowAI Renewal Spec](../docs/specs/SELF_RENEWAL_SPEC.md) | [Source assessment](<ProductSSOT entry link>)
```

PR body is generated by string template (NOT by Claude — deterministic per-run). All values are filled by Self-Renewal's reporting logic, NOT by an LLM. This avoids prompt-injection risk in the PR body and keeps the body byte-identical across reruns of the same input.

### §5.5 — Preview-before-PR ordering

**The preview URL MUST be live (HTTP 2xx, content rendered) BEFORE the PR is opened.** Order:

1. Push commits to the `flowai/renewal-<runId>` branch via Contents API (§3.5 step 4).
2. Vercel webhook fires on branch push → triggers preview build (per Vercel project's GitHub integration).
3. Self-Renewal polls Vercel deployments API (`GET /v6/deployments?gitRepoSlug=<owner>/<repo>&meta.githubCommitRef=flowai/renewal-<runId>`) for `state: 'READY'`.
4. Self-Renewal verifies preview URL returns HTTP 2xx (smoke test via `fetch`, 30-second timeout).
5. **Only then** open the PR with the preview URL in the body.

If the preview never reaches `READY` (within 10-minute poll timeout) OR the smoke-test fetch fails, the PR is NOT opened. Instead, Self-Renewal:
- Writes a `governance_record_entry kind: 'self_renewal.preview_failed'` to ProductSSOT
- Posts a draft PR with a body explaining the preview failure (so the operator can manually investigate the Vercel build log)
- Marks the renewal run as `degraded` in the Monitor step's clearance decision

Rationale: the operator MUST see the renewed result in-browser before being asked to review the code. If the preview is broken, the PR is more likely to mislead than help.

### §5.6 — Vercel preview infrastructure requirements

Per-product Vercel project MUST have GitHub integration enabled (the operator's product MUST be a Vercel-hosted product). If the operator's product is NOT on Vercel, Option C is not available for that product (logged as `out_of_scope: non_vercel_product`). This is a documented limitation of Option C; supporting non-Vercel deployment targets is deferred to a future Self-Renewal phase (Phase D or later — not in this spec).

`VERCEL_TOKEN` (per Rev-2.1 §21 + Doppler `flowai/<env>/VERCEL_TOKEN`) is required for the deployments-API poll. The token is loaded into process memory at run start + discarded at run end (same memory-only pattern as the GitHub PAT per §3.3).

### §5.7 — Branch cleanup mechanism (R6)

`flowai/renewal-*` branches accumulate on the operator's GitHub repository over time — every renewal run creates one. To prevent unbounded branch growth, a nightly cleanup job deletes stale renewal branches. The retention policy is per-product configurable:

- **`ProductRegistry.selfRenewalBranchRetentionDays`** (integer, default `7`). Branches matching the prefix `flowai/renewal-` that are older than this many days AND have no open PR associated with them are eligible for deletion.
- **Cleanup job runs nightly** (cron, ~02:00 UTC by default — adjustable in the FlowAI ops scheduler). For each product with `selfRenewalGithubInstallationId` (or `pat_fallback` credential mode) configured:
  1. List branches via `GET /repos/{owner}/{repo}/branches?per_page=100` filtered to `flowai/renewal-*` prefix.
  2. For each candidate branch, fetch `GET /repos/{owner}/{repo}/branches/{branch}` for the commit timestamp on the branch tip. If `now - tip_committed_at > selfRenewalBranchRetentionDays` days → eligible.
  3. Check for an open PR with `head` matching the branch via `GET /repos/{owner}/{repo}/pulls?state=open&head={owner}:{branch}`. If a PR is open → SKIP (do not delete; the operator is still considering this PR).
  4. If eligible AND no open PR → `DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}` and write `governance_record_entry kind: 'self_renewal.branch_cleaned_up'` with `{ branchName, ageInDays, retentionDays }`.
- **Closed PRs are not protection.** A branch whose PR was closed (rejected by operator, superseded by a newer renewal run, etc.) becomes eligible for cleanup once the retention window expires. The closed PR's metadata stays in GitHub's PR history regardless; only the branch ref is deleted.
- **Merged PRs.** Branches whose PR was merged are typically auto-deleted by GitHub's repo-level "Automatically delete head branches" setting if the operator has it enabled. If not, the same cleanup job catches them once they age past the retention window — merged + branch-retained is a slow leak the cleanup job closes.
- **Operator escape hatch.** Setting `selfRenewalBranchRetentionDays` to a large value (e.g. `365`) effectively disables cleanup for that product. Setting to `0` is also valid and means "delete branches immediately when their PR closes" (intersected with the no-open-PR rule — branches with open PRs are never deleted regardless of retention setting).
- **The cleanup job has the same App-or-PAT credential surface as the renewal runs themselves** (per §3.2). Specifically, the App's `contents: write` permission covers branch deletion via the Git Refs API; no additional permission is required. The PAT fallback path (`flowai/*`-branch-scoped contents:write) also covers branch deletion within the `flowai/renewal-*` prefix.

The cleanup job is best-effort: a transient GitHub API failure on one branch does not block cleanup of the others. Failed deletions are retried on the next nightly run; persistent failures (e.g. operator revoked the App installation) surface as `governance_record_entry kind: 'self_renewal.cleanup_failed'` and are batched into the operator alert surface.

---

## §6 — Delta Score Contract

### §6.1 — Pre-renewal score

The "pre-renewal" score is the Monitor step (step 8) score from the assessment run that triggered renewal. This score is recorded in the ProductSSOT's `governance_record` block per CA-10-A — Self-Renewal reads it via `ProductSSOT.governance_record.find(e => e.kind === '95_95_score' && e.runId === sourceAssessmentRunId)`.

If the source assessment did not produce a Monitor-step score (e.g. the assessment failed mid-pipeline), the pre-renewal score is `null` and the delta is reported as `"not computable — source assessment incomplete"`.

### §6.2 — Post-renewal score

The "post-renewal" score is a **fresh Monitor-step score** generated by running the same 8-step pipeline against the **Vercel preview URL** (NOT against the original product URL — the operator hasn't merged the PR yet; the original URL still reflects the pre-renewal state).

Re-assessment uses identical pipeline configuration as the source assessment (same `productScope`, same `mode`, same authority levels per CA-12 v3 §A.2, same Orchestra adapter rankings) — to ensure the delta is apples-to-apples.

### §6.3 — Per-Five-Layer breakdown

The Five-Layer Intelligence Framework (per `src/lib/operationsEngine.js` `FIVE_LAYER_FRAMEWORK`) produces per-layer scores at each step. The Monitor step aggregates to a final per-layer + total. Self-Renewal's delta is computed per-layer:

```
delta_layer = post_score_layer - pre_score_layer    (one per L1..L5)
delta_total = post_score_total - pre_score_total
```

All deltas are signed integers (positive = improvement, negative = regression, zero = no change).

### §6.4 — Honest reporting, two-field policy with cross-field validation (v4 restores v2 shape)

Reporting honesty is invariant: if the delta is **negative** (the fix made things worse), it is reported as a negative number in the `governance_record_entry` (§6.5) and — when a PR is opened — in the PR body table. No score manipulation, no rounding-toward-zero, no hiding regressions, regardless of whether the PR ends up opened.

**Three per-product `ProductRegistry` fields govern PR-opening behaviour and "substantial improvement" labelling** (v4 restores the v2 two-field model — R2 — and adds the v4 `selfRenewalSubstantialThreshold` — R1 — for configurable substantial-improvement classification):

| Field | Type | Default | Semantics |
|---|---|---|---|
| `selfRenewalNegativeDeltaPolicy` | enum | `ALWAYS_OPEN` | One of `ALWAYS_OPEN` or `DISCARD_ON_NEGATIVE`. Controls behaviour when `delta_total < 0`. |
| `selfRenewalMinimumDelta` | integer | `0` | Minimum `delta_total` required to open a PR. If `delta_total < selfRenewalMinimumDelta`, the run closes as `below_threshold` (see step 2b) WITHOUT opening a PR. Operator may raise the bar (e.g. `5` for "only meaningful improvements") or leave at `0` ("open if anything was preserved-or-improved"). |
| `selfRenewalSubstantialThreshold` | integer | `+5` | Threshold above which a delta is labelled "substantial improvement" in the PR body and in audit-log entries. NOT a suppression gate — runs at `delta_total >= selfRenewalSubstantialThreshold` get a "Substantial improvement" badge; runs below the threshold get a "Modest improvement" or no badge. Operator-configurable per product so the meaning of "substantial" maps to the product's value model (e.g. raise to `+10` for a product where each Five-Layer point is a major win, lower to `+3` for a high-finding-density product). |

**Cross-field validation (R2):** at registry-write time, any write to `selfRenewalNegativeDeltaPolicy` or `selfRenewalMinimumDelta` MUST validate the cross-field invariant:

- **Invalid combination:** `selfRenewalNegativeDeltaPolicy == 'DISCARD_ON_NEGATIVE'` AND `selfRenewalMinimumDelta < 0`. This combination is incoherent — the operator is asking "discard if delta < 0" while also asking "open PR even if delta < 0 down to <some negative value>". The negative-delta-policy decision dominates the threshold; the threshold's negative-value semantics are unreachable. Rejected at registry-write time with error `INVALID_DELTA_POLICY_COMBINATION { reason: 'discard_on_negative_with_negative_minimum', negativeDeltaPolicy: 'DISCARD_ON_NEGATIVE', minimumDelta: <value> }`.
- **`selfRenewalSubstantialThreshold` constraint:** integer; operator may set any value but the registry-write boundary rejects `selfRenewalSubstantialThreshold <= selfRenewalMinimumDelta` with error `INVALID_SUBSTANTIAL_THRESHOLD { reason: 'threshold_not_above_minimum' }` — if "substantial" is below or equal to the minimum-to-open-PR, the substantial-improvement label is meaningless.
- Both validations run before the write commits; partial writes are not possible.

**Decision sequence (executed in order after the post-renewal score is computed in §6.2):**

1. **Compute delta** per §6.3. `delta_total` is an integer (positive, zero, or negative).
2. **Apply negative-delta policy.** If `delta_total < 0`:
   - `ALWAYS_OPEN` (default) — proceed to step 3 (PR will still be opened; regression banner per below).
   - `DISCARD_ON_NEGATIVE` — close the renewal run as `discarded_on_negative_delta` via the step-2b silent-close path.
3. **Apply minimum-delta threshold.** If `delta_total < selfRenewalMinimumDelta`:
   - Close the renewal run as `below_threshold` via the step-2b silent-close path.
4. **Open PR.** `delta_total ≥ selfRenewalMinimumDelta`. Open the PR per §5 contract, with the regression banner included when `delta_total ≤ 0` (only reachable under `ALWAYS_OPEN`, since `DISCARD_ON_NEGATIVE` already filtered out negative deltas). The PR body also includes a "Substantial improvement" badge when `delta_total >= selfRenewalSubstantialThreshold`.

**2b. Silent-close audit-log path (R8 — invariant).** Whenever the run closes WITHOUT opening a PR via the negative-delta policy (step 2 → `DISCARD_ON_NEGATIVE`) or the minimum-delta threshold (step 3 → below threshold):

- The renewal branch is deleted (via `DELETE /repos/.../git/refs/heads/flowai/renewal-<runId>`) to avoid orphan branches accumulating.
- The run MUST emit a `governance_record_entry` with the full pre/post/delta payload, regardless of which silent-close path triggered. The operator can always see what happened even when no PR was opened. Two `kind` values cover the two paths:
  - `kind: 'self_renewal.discarded_negative_delta'` — emitted when step 2's `DISCARD_ON_NEGATIVE` policy closes the run.
  - `kind: 'self_renewal.below_threshold'` — emitted when step 3's minimum-delta gate closes the run.
- Both entries include the same payload shape:
  ```json
  {
    "kind": "self_renewal.discarded_negative_delta" | "self_renewal.below_threshold",
    "runId": "<runId>",
    "sourceAssessmentRunId": "<runId>",
    "preScore": { "L1": ..., "L2": ..., "L3": ..., "L4": ..., "L5": ..., "total": ... },
    "postScore": { "L1": ..., "L2": ..., "L3": ..., "L4": ..., "L5": ..., "total": ... },
    "delta": { "L1": ..., "L2": ..., "L3": ..., "L4": ..., "L5": ..., "total": ... },
    "policy": { "negativeDeltaPolicy": "<ALWAYS_OPEN|DISCARD_ON_NEGATIVE>", "minimumDelta": <integer>, "substantialThreshold": <integer> },
    "previewUrl": "<vercel-preview-url-or-null>",
    "branchDeleted": true,
    "at": "<ISO timestamp>"
  }
  ```
- The audit-log emission is a HARD MUST: orchestrator code paths for the silent-close branches MUST complete the `governance_record_entry` write before returning. A write failure is treated as a P1 incident (run reported as `failed` rather than `silently_closed`), not silently swallowed.
- Operator-facing dashboard widgets and email notifications surface these silent-close entries with the same prominence as PR-opening runs — the operator's mental model is "Self-Renewal ran and here is what it decided", not "Self-Renewal ran iff a PR was opened".

**Regression banner inserted into the PR body when `delta_total ≤ 0` and the PR is being opened (only under `ALWAYS_OPEN`):**

```
⚠️ **No improvement detected** — post-renewal score is not higher than pre-renewal.
This PR is still opened (operator policy: ALWAYS_OPEN) so you can review the
proposed changes, but the delta score suggests the fix did not improve the
assessment. Recommend reviewing each fix individually and deciding whether to
discard the PR (close without merge).
```

**Substantial-improvement badge inserted into the PR body when `delta_total >= selfRenewalSubstantialThreshold`:**

```
✅ **Substantial improvement** — post-renewal delta meets this product's
substantial-improvement threshold (selfRenewalSubstantialThreshold = <N>).
```

The decision sequence is **per-product configurable end-to-end**. The Option C philosophy — "surface the data, let the human judge" — is the `ALWAYS_OPEN + selfRenewalMinimumDelta=0` default (every result surfaces). Operators who prefer "don't waste my review cycles on regressions" set `DISCARD_ON_NEGATIVE`. Operators who only care about substantial wins raise `selfRenewalMinimumDelta`. The `selfRenewalSubstantialThreshold` is orthogonal — a labelling threshold for badge text, not a suppression gate. All three policies preserve the audit trail (R8 invariant above).

The operator-facing admin UI exposes all three fields per product (admin role per Rev-2.1 §13). Changes to any field take effect on the next renewal run; in-flight runs use the values they read at run start. The v3 `selfRenewalOpenPolicy` enum is NOT shipped — v4 reverts to the three-field model above.

### §6.5 — Delta-score audit trail

Every delta-score computation writes a `governance_record_entry` to the ProductSSOT:

```json
{
  "kind": "self_renewal.delta_score",
  "runId": "<runId>",
  "sourceAssessmentRunId": "<original assessment runId>",
  "preScore": { "L1": ..., "L2": ..., "L3": ..., "L4": ..., "L5": ..., "total": ... },
  "postScore": { "L1": ..., "L2": ..., "L3": ..., "L4": ..., "L5": ..., "total": ... },
  "delta": { "L1": ..., "L2": ..., "L3": ..., "L4": ..., "L5": ..., "total": ... },
  "prUrl": "<github-pr-url>",
  "previewUrl": "<vercel-preview-url>",
  "fixesApplied": <N>,
  "fixesDiscarded": <M - N>,
  "at": "<ISO timestamp>"
}
```

The audit-trail entry is the source of truth for delta-score reporting — operator-facing UI surfaces (dashboard widgets, email notifications) read from this entry, NOT from a separate cache.

---

## §7 — Agent #3 Graduation Plan

### §7.1 — Current state (skeleton)

Per `src/lib/agents/agents/Agent3SelfRenewal.js` (commit `68a0c75`, 509 LOC), Agent #3 is currently a **pure analyzer**. It runs 5 heuristics (`buildFailures`, `auditIssues`, `anomalySeverity`, `evolutionProposal`, `staleConfig`) over `(run_summary, step_results)`, produces a confidence-scored recommendation envelope, and emits `3.renewal.candidate.v1` on the MessageBus. It does NOT generate real fixes, does NOT open PRs, does NOT deploy previews, does NOT compute a delta score.

The split-charter Executor (per `docs/specs/agent-blueprints/AGENT_03_SelfRenewal.md` §1.2 + commit `176d870`) exists as `Agent3SelfRenewalExecutor` with authority `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` — but its current implementation is also a skeleton (catalogue-of-fixes, not real-fix-application).

### §7.2 — Phase A (this spec — Option C v1)

**Scope:** single-file fix generation + GitHub PR creation + Vercel preview deploy + delta score.

**Deliverables:**
- Source acquisition via GitHub Contents API (§3.5) — NEW code, not the existing tarball path.
- Fix generation via Claude with single-file scope (§4) — NEW code.
- Discard gates (§4.4) — NEW code (4 gates: diff parseable / syntax / test / lint / build; total 5 if we count syntax+lint separately).
- PR creation via GitHub Pulls API (§5) — NEW code.
- Vercel preview poll + smoke-test (§5.5) — NEW code, reusing existing Orchestra `vercel.js` adapter.
- Re-assessment via existing pipeline + delta computation (§6) — NEW code on top of existing pipeline.
- ProductSSOT `governance_record` entry per §6.5 — NEW code, fits existing CA-10-A schema.
- Operator notification surface (admin UI badge + optional email) — NEW UI work + existing email endpoints.

**NOT in Phase A:** multi-file fixes, test-generation, regression-aware fixes, auth-gated fix paths, non-Vercel deployment targets.

### §7.3 — Phase B (future, separate spec + Panel)

**Scope expansion:** multi-file fix generation. The Claude prompt receives multiple related source files; the output diff may touch any combination of those files. Cross-file consistency is checked at the discard-gate level (test suite still gates, but tests now cover the multi-file changeset).

**Not in scope for this spec.** Phase B will require its own spec dispatch + Panel ratification, especially around: how files are selected for inclusion in the prompt (likely Agent #6 Research's file-context output); cost envelope (multi-file prompts are much larger); the "scope creep" risk (an LLM with multi-file authority can rewrite half the codebase).

### §7.4 — Phase C (future)

**Scope expansion:** test-suite-aware fix generation. The Claude prompt reads existing tests as additional context; fixes are generated to respect existing test expectations. Helps reduce false-positive test failures from §4.4 discard gates.

### §7.5 — Phase D (future)

**Scope expansion:** regression-aware fix generation. Generates new tests alongside the fix to catch regressions in the changed area. Closes the "guarantee fix doesn't introduce regressions" gap from §2 (partially — new tests catch known classes of regressions but not all).

### §7.6 — Phase ordering rationale

Phases A → B → C → D in order. Each phase requires the prior phase to be proven in production for at least 30 days against ≥3 of the 5 operator products before the next phase is even drafted. This sequencing is per the CA-12 v3 GTM context (§A.0) — these are real production products, not prototypes; gradual expansion of Self-Renewal authority is the only safe path.

---

## §8 — Security Controls

The Phase A implementation MUST satisfy ALL of the following security invariants (mirrors `AUTH_TRAVERSAL_SECURITY_SPEC.md` v3 Invariants 1–10):

### §8.1 — GitHub PAT: memory-only, never logged

- Read from Doppler at run start; held as a JS heap reference keyed by `runId`; dereferenced at run end.
- Passed to GitHub API client via `Authorization: Bearer <PAT>` header at request time.
- `scrubCredentials()` (extended per §3.4) applied before any persist / log / external send.
- Canary test per §3.4 covers PAT exfiltration paths.

### §8.2 — Branch name contains runId only (no PII)

- Branch name template: `flowai/renewal-<runId>` (per §5.1).
- runId is a UUID v4 — no PII.
- Branch name is NOT operator-configurable. Branch names that contain PII patterns (email regex, phone regex, name patterns) MUST be rejected at branch-create time.

### §8.3 — PR body scrubbed before API call

- PR body is generated by deterministic string template (per §5.4), NOT by Claude — eliminates prompt-injection risk in PR body content.
- `scrubCredentials()` applied to the PR body before `POST /repos/.../pulls` — defense in depth even though deterministic template should not include credentials.
- Findings' evidence strings (which may contain user-supplied content from the assessment) are HTML-escaped + length-capped at 500 chars before inclusion in the PR body — prevents script injection in the rendered Markdown.

### §8.4 — Source code: never sent to external services beyond GitHub and Vercel

- Self-Renewal sends source content to:
  - **GitHub** (the operator's own infrastructure) — to read files for fix context (§3.5 step 1+) and write fixed files (§3.5 step 4).
  - **Vercel** (the operator's own infrastructure when they're a Vercel customer) — via the existing GitHub integration which Vercel reads to build the preview.
  - **Anthropic** (the LLM provider) — to generate fix diffs (§4.1). Per Rev-2.1 §21 + Locked Rule 8, Anthropic is the LLM standard; this is the canonical FlowAI external-LLM relationship.
- Self-Renewal does NOT send source content to: OpenRouter (any model), Browserless, Cloudflare, Sentry, Vercel KV, Vercel Blob, Doppler beyond credential read, or any other external service.
- The `scrubCredentials()` boundary applies to the Anthropic prompt — any embedded credentials in source content (e.g. a hardcoded API key the operator forgot to remove) are scrubbed before the Anthropic API call, mirroring AUTH_TRAVERSAL_SECURITY_SPEC v3 Invariant 6.

### §8.5 — `governance_record_entry` injection guards

- Per AUTH_TRAVERSAL_SECURITY_SPEC v3 Invariant T9 (audit-log injection), the values written to `governance_record_entry` (per §6.5) are escaped to prevent log-format-breaking characters (newlines, ANSI escape codes, terminal escape sequences). Same defensive-string-handling path the canonical `scrubCredentials()` uses.

### §8.6 — Per-product credential isolation

- The PAT for product A is NEVER reused for product B. Per-product Doppler paths (§3.2) enforce this at the credential-read layer. The Self-Renewal Executor MUST construct a fresh GitHub API client per renewal run, scoped to the run's `productId`'s PAT.

---

## §9 — Honest Capability Boundary

**Built AFTER this spec is ratified + Phase A engineering dispatch lands:**

| Capability | Status today | After Phase A |
|---|---|---|
| Source acquisition (GitHub Contents API + Git Data API for write) | **UNBUILT** | BUILT |
| Fix generation (Claude prompt + unified diff output, single-file scope) | **UNBUILT** | BUILT (single-file only) |
| Fix-discard gates (parseability + syntax + test + lint + build) | **UNBUILT** | BUILT |
| PR creation (GitHub Pulls API with deterministic body template) | **UNBUILT** | BUILT (draft state, never auto-merge) |
| Branch creation (`flowai/renewal-<runId>` naming convention) | **UNBUILT** | BUILT |
| Vercel preview trigger (webhook-driven, poll for READY state) | **UNBUILT** | BUILT (Vercel-hosted operator products only) |
| Preview-before-PR ordering enforcement | **UNBUILT** | BUILT |
| Re-assessment (running the 8-step pipeline against the preview URL) | **PARTIAL** | BUILT |
| Delta score (per-Five-Layer + total, honest reporting) | **PARTIAL** | BUILT |
| Operator notification (admin UI badge + optional email) | **PARTIAL** | BUILT |
| `governance_record_entry kind: 'self_renewal.delta_score'` schema | **NEW per this spec** | BUILT |
| `ProductRegistry.githubRepoUrl` + `ProductRegistry.selfRenewalSeverityFloor` fields | **NEW per this spec** | BUILT |
| Per-product GitHub PAT in Doppler (`PRODUCT_<productId>_GITHUB_PAT`) | **NEW per this spec** | Operator-provisioned (admin UI workflow) |

**Current Agent #3 skeleton produces:**

| Item | Status |
|---|---|
| A finding catalogue (5-heuristic recommendation envelope) | **BUILT (skeleton)** per `Agent3SelfRenewal.js` `recommend(ctx)` |
| Recommended fixes (text descriptions) | **BUILT (skeleton)** — `recommendation` field of the envelope |
| Real code diffs (unified diff format) | **NOT BUILT** |
| GitHub PR creation | **NOT BUILT** |
| Vercel preview deployment | **NOT BUILT** |
| Delta score (against preview re-assessment) | **NOT BUILT** |
| Per-product GitHub PAT management UI | **NOT BUILT** |

**Brutal-honesty footer:** Phase A is a substantial engineering effort. The 7 "BUILT" items in the after-Phase-A column represent ~3–4 weeks of focused engineering across W2 + W5x. None of those items exist today end-to-end; the existing `Agent3SelfRenewal.js` + `api/renew.js` + `api/_lib/sourceAcquisition.js` provide foundation pieces but Phase A wires the foundation into a coherent PR-preview-delta cycle that nothing in production currently does.

---

## §10 — Panel Questions (7, adversarial format — v4)

Standard 4-option + INSUFFICIENT_INFORMATION format per `docs/PANEL_INFRASTRUCTURE.md` engagement-filter conventions. No anchoring. No author-preference tags. Q1/Q3/Q4/Q6/Q7 have been rewritten for v4 to reflect the 8 CEO-locked conditions (R1–R8). Q2 is carried unchanged from v2 (no v4 edit to §4.4 gate composition). Q5 is carried as RATIFIED (`GQ5-PREFIRST` quorum-plurality 7/8 in v1).

### G-Q1 — Single-file scope with Panel-ratification graduation + scope-rollback (v4 R4)

§4.3 v4 replaces v3's "time-only" Phase B trigger with three required conditions: (a) ≥30 days proven production, (b) zero material incidents, AND (c) a new Panel ratification of a Phase B spec — all three, not any of three. v4 also adds a per-product `selfRenewalScopeRollback` boolean (default `false`) that lets operators revert any product back to `MAX_FILES = 1` even after Phase B ships, when multi-file fixes cascade-fail on that product. Is this the right scope-graduation model?

- (a) Three-condition AND-gate with per-product rollback is correct — Panel re-ratification preserves adversarial review at each authority expansion; per-product rollback bounds blast radius when a specific product turns out to be a poor multi-file candidate.
- (b) Insufficient — Phase A should also require a per-finding-category opt-in for multi-file in Phase B (e.g. "this product's `accessibility` findings can use multi-file, but `performance` findings cannot"), preventing one bad category from poisoning multi-file authority for an entire product.
- (c) Over-engineered — the per-product `selfRenewalScopeRollback` boolean is config-creep. Phase B should ship as fleet-wide `MAX_FILES = 3` with no per-product override; a product that misbehaves under multi-file gets fixed at the engineering level, not patched-around via config.
- (d) Graduation conditions are correct but the "material incident" definition (regression revert, credential exfiltration, 5× cost overrun) is too narrow — should also include "operator merge-rate drops below 50% of pre-Self-Renewal baseline" as a material incident, since that signals systemic loss of operator trust.
- (e) INSUFFICIENT_INFORMATION.

### G-Q2 — Three MUST gates: tests + typecheck + preview-smoke

§4.4 v2 adds two MUST gates beyond `npm test`: (b) typecheck (`npm run typecheck` / `tsc --noEmit`) where `tsconfig.json` exists, and (c) preview smoke (`fetch(previewUrl)` + HTTP 2xx + ≥1 key DOM element present, per `ProductRegistry.selfRenewalSmokeSelectors`). Is this the right set of MUST gates?

- (a) Three MUST gates (test + typecheck + preview-smoke) is correct — each catches a distinct failure class (logic regression, type regression, runtime/SSR regression); none is redundant.
- (b) Three MUST gates is too lax — Phase A should also MUST-gate accessibility (axe-core) and visual regression (screenshot diff against pre-renewal baseline) before any PR opens.
- (c) Three MUST gates is too strict — typecheck-skip-when-no-tsconfig and DOM-default-`['html','body']` are loopholes; either MUST-universal or drop the gates entirely.
- (d) The MUST framing is wrong — Phase A should treat all gates as advisory with a single "operator confidence threshold" parameter; let operators tune strictness.
- (e) INSUFFICIENT_INFORMATION.

### G-Q3 — App default + branch-scoped PAT fallback behind per-product feature flag + manifest-in-repo (v4 R3)

§3.2 v4 retains the GitHub App as the default primary path and adds a branch-scoped fine-grained PAT fallback behind a per-product feature flag (`ProductRegistry.selfRenewalCredentialMode ∈ { 'app' (default), 'pat_fallback' }`). The fallback PAT MUST be branch-scoped to `flowai/*` only via a dedicated `flowai-self-renewal` machine user + branch protection. The App's permission manifest is pinned in-repo at `.github/flowai-app-manifest.yml` so any permission-set change produces an auditable diff. Is this the right credential model for Phase A?

- (a) App-default + opt-in PAT fallback + in-repo manifest is correct — keeps the safe path as default, gives stuck-mid-install operators an escape hatch, and the manifest pinning means operators always see permission changes before accepting them.
- (b) Insufficient — Phase A should additionally require the PAT fallback usage to expire automatically (e.g. `selfRenewalCredentialMode` auto-reverts to `'app'` after 30 days of pat_fallback usage), so the fallback can't silently become the long-term default for a product whose operator forgot to flip it back.
- (c) Too permissive — opt-in PAT fallback re-introduces the long-lived-token attack surface that v3 eliminated; Phase A should keep App-only and accept the mid-install friction. The manifest pinning is good and should be kept.
- (d) Wrong shape on the manifest — pinning the manifest in `.github/flowai-app-manifest.yml` inside the FlowAI repo doesn't help operators (they don't read FlowAI's repo); the manifest should be cross-posted to a public FlowAI status page and referenced from the install flow's consent screen instead.
- (e) INSUFFICIENT_INFORMATION.

### G-Q4 — Two-field delta policy restored with cross-field validation + silent-close audit invariant (v4 R2 + R8)

§6.4 v4 reverts v3's `selfRenewalOpenPolicy` enum and restores the v2 two-field model: `selfRenewalNegativeDeltaPolicy` (`ALWAYS_OPEN` default | `DISCARD_ON_NEGATIVE`) + `selfRenewalMinimumDelta` (integer, default `0`). Cross-field validation (R2) rejects `DISCARD_ON_NEGATIVE` + `selfRenewalMinimumDelta < 0` at registry-write time. The silent-close audit invariant (R8) makes the full pre/post/delta `governance_record_entry` emission a HARD MUST for both `discarded_negative_delta` and `below_threshold` paths. Is this the right shape?

- (a) Two-field + cross-field validation + hard audit-log invariant is correct — the two fields give operators independent negative-delta and minimum-improvement controls; the cross-field check eliminates the only incoherent combination; the audit invariant means silent-close is never silent on the audit trail.
- (b) Insufficient — Phase A should also expose a `selfRenewalMinimumPerLayerDelta` map (per-Five-Layer minima) so an operator can require improvement on a specific layer (e.g. `{ L1: 0, L2: 0, L3: 0, L4: 0, L5: 5 }` means "GTM must improve by 5; other layers may break even") — the single `selfRenewalMinimumDelta` aggregates over all five and hides layer-specific regressions inside a positive total.
- (c) Over-engineered — Phase A should ship `DISCARD_ON_NEGATIVE` policy AS THE DEFAULT (not `ALWAYS_OPEN`); the audit-log invariant is enough to surface negative-delta runs to operators who care, and defaulting to `DISCARD_ON_NEGATIVE` cuts the regression-PR review burden to zero for the long-tail operator who doesn't tune.
- (d) Wrong invariant on R8 — silent-close audit emissions should NOT include the full `preScore`/`postScore` payload; that bloats `ProductSSOT.governance_record` over time and operators rarely re-read them. Emit only `delta` + `policy`; defer pre/post to a separate cold-storage event-log.
- (e) INSUFFICIENT_INFORMATION.

### G-Q5 — Preview-before-PR ordering (carried RATIFIED from v1)

This question is carried unchanged from v1 (`GQ5-PREFIRST` ratified 7/8 quorum-plurality). Re-rating is OPTIONAL — Panel may carry the prior verdict. §5.5 requires the Vercel preview to be live (HTTP 2xx) before the PR is opened. Is this ordering the right gate?

- (a) Preview-before-PR is correct — the operator MUST see the renewed result in-browser before being asked to review code.
- (b) Preview-before-PR is too strict — Phase A should open the PR concurrently with the preview build (PR opens immediately on branch creation; preview URL is added as a PR comment when ready).
- (c) Preview-before-PR is too lax — Phase A should additionally require the preview URL to pass a smoke-test assessment (Agent #21 quick crawl) before the PR is opened.
- (d) Preview-before-PR is the wrong gate entirely — for non-Vercel-hosted operators, there is no preview; Phase A should support a "no preview" path with explicit operator opt-in (limits Option C to PR-only without preview for those operators).
- (e) INSUFFICIENT_INFORMATION.

### G-Q6 — Configurable `selfRenewalSubstantialThreshold` integer (v4 R1)

§6.4 v4 restores configurability by adding `ProductRegistry.selfRenewalSubstantialThreshold` (integer, default `+5`, operator-configurable per product). v3's hardcoded `+5` is removed; the threshold becomes a per-product knob that controls when a delta is labelled "substantial improvement" in the PR body and audit-log entries. Cross-field validation requires `selfRenewalSubstantialThreshold > selfRenewalMinimumDelta`. Is configurable `+5`-default the right shape?

- (a) Configurable integer with `+5` default is correct — operators tune "substantial" to their product's value model (e.g. raise to `+10` for products where each Five-Layer point is a major win, lower to `+3` for high-finding-density products); `+5` default preserves a sensible out-of-box meaning.
- (b) Insufficient — Phase A should also expose `selfRenewalModestThreshold` (integer, default `+1`) so PR-body labels can distinguish "no improvement / modest / substantial" with three bands instead of just "substantial vs not"; operators need finer-grained delta labelling for review-queue triage.
- (c) Over-engineered — the substantial-vs-modest label is cosmetic; collapse `selfRenewalSubstantialThreshold` into `selfRenewalMinimumDelta` (one field, one knob) and let operators who want a "substantial" label render it client-side in their own dashboards.
- (d) Wrong validation — requiring `selfRenewalSubstantialThreshold > selfRenewalMinimumDelta` is too strict; operators may legitimately want `selfRenewalMinimumDelta = 5` (open only substantial-or-better PRs) AND `selfRenewalSubstantialThreshold = 5` (every PR that opens is by definition substantial). The validation should be `>=`, not `>`.
- (e) INSUFFICIENT_INFORMATION.

### G-Q7 — Disposition: is v4 ready for promotion?

v4 applies 8 surgical fixes (R1–R8) to address the conditions from the v3 NOT_RATIFIED verdict:
- **R1**: `selfRenewalSubstantialThreshold` (integer, default `+5`, operator-configurable) restored; v3 hardcoded `+5` removed.
- **R2**: v2 two-field model restored (`selfRenewalNegativeDeltaPolicy` + `selfRenewalMinimumDelta`); v3 `selfRenewalOpenPolicy` enum removed; cross-field validation rejects `DISCARD_ON_NEGATIVE` + negative minimum at registry-write time.
- **R3**: branch-scoped PAT fallback re-added behind per-product feature flag `selfRenewalCredentialMode ∈ { 'app', 'pat_fallback' }`; App remains default; App manifest pinned in-repo.
- **R4**: Phase B graduation requires three-condition AND-gate (30 days + zero material incidents + new Panel ratification); per-product `selfRenewalScopeRollback` boolean lets operators revert misbehaving products.
- **R5**: hard rate cap (`selfRenewalMaxPerDay`, default `1`) + runaway detector (`selfRenewalRunawayThreshold`, default `3` consecutive same-gate failures → auto-disable).
- **R6**: nightly branch cleanup (`selfRenewalBranchRetentionDays`, default `7`) deletes stale `flowai/renewal-*` branches with no open PR.
- **R7**: smoke-selector validation moved to registry-write time; invalid CSS selectors rejected synchronously with `INVALID_SMOKE_SELECTOR` error.
- **R8**: silent-close audit-log invariant tightened — `discarded_negative_delta` and `below_threshold` paths MUST emit full pre/post/delta payload.

G-Q2 (three MUST gates) and G-Q5 (preview-before-PR) are carried unchanged. Given all 8 conditions addressed, the appropriate Panel disposition for v4 is:

- (a) Promote — the 8 conditions are addressed cleanly and Option C v4 is ready for Phase A engineering dispatch.
- (b) Promote-with-Reservations — the 8 conditions are addressed but the Panel surfaces residual issues that the engineering dispatch should track (specify in rationale, non-blocking).
- (c) Revise — one or more of the 8 surgical fixes is incomplete, inconsistent, or introduces a new defect that must be fixed before promotion (specify which condition and the defect).
- (d) Reject — the 8 fixes expose a deeper architectural problem with Option C that surgical revisions cannot fix; the spec needs ground-up rework or replacement (specify the architectural concern).
- (e) INSUFFICIENT_INFORMATION.

---

## SSOT Conflicts and Cross-Spec Notes Surfaced During Drafting

The drafting process surfaced the following conflicts / cross-spec notes — flagged for Panel + CEO disposition:

### Note 1 — Two source-acquisition paths now exist

`api/_lib/sourceAcquisition.js` (existing, read-only via GitHub tarball — serves the renewal-engine path) and this spec's §3.5 read-write path via GitHub Contents API are TWO distinct source-acquisition mechanisms. They serve different purposes (read-only assessment vs read-write PR generation) but both touch the same `Doppler[PRODUCT_<productId>_GITHUB_PAT]` credential. The Phase A engineering dispatch should refactor `sourceAcquisition.js` to expose both paths through one credential-read boundary (single Doppler-read per run, two API-call patterns). No semantic conflict, but the duplication should not be silently shipped.

### Note 2 — Agent #3 split-charter clarification

Per `docs/specs/agent-blueprints/AGENT_03_SelfRenewal.md` (commit context), Agent #3 is canonically split: recommend-only primary (`Agent3SelfRenewal`) at step-6, plus Executor sibling (`Agent3SelfRenewalExecutor`) in EXECUTOR_REGISTRY with `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. Option C's PR + preview + delta cycle is implemented by the **Executor** sibling — NOT the primary. The primary continues to emit `3.renewal.candidate.v1` from step 6; the Executor consumes that envelope and runs the Option C cycle. This is consistent with CA-12 v3 §A.2 Build-Authority SUPERVISED → the Executor's `REQUIRES_HUMAN_GATE` authority is the canonical mapping.

### Note 3 — Re-assessment cost

§6.2 re-runs the full 8-step pipeline against the preview URL — this is a second full pipeline run per renewal. Per Orchestra Integration Spec §7 cost tracking, the assessment pipeline costs ~$0.30–$2.00 per run. Doubling that cost (assessment + re-assessment) puts the Self-Renewal cycle in the $0.60–$4.00 range per run. Add fix-generation Claude calls (~$0.05–$0.20 per fix × N fixes) and Vercel preview build time (no Vercel-side $ cost for preview, but ~30–120s wall-clock). Total Self-Renewal run cost envelope: **$0.65–$5.00 per run** with `N=1` to `N=20` fixes. Operator should be made aware via the existing cost-ledger surface (per Orchestra Integration Spec §7 + CA-9-C cost dashboard).

### Note 4 — CA-12 v3 §A.2 mapping precision

Option C uses Build-Authority SUPERVISED + Operational-Authority Autonomous per the CEO Dispatch #5 context. In CA-12 v3 §A.2.4 ceiling-storage notation, this corresponds to:

```json
{
  "mode_1": { "build": "supervised", "operational": "autonomous" }
}
```

Specifically for Mode 1 SUB-1B PREVIEW. The CEO can pre-set this ceiling per-product in the admin UI per CA-12 v3 §C.2. When a user runs Self-Renewal on a product whose ceiling is below Supervised, the run is rejected per CA-12 v3 §B.2 rule 6 (CONFIG_CEILING_VIOLATION).

### Note 5 — Conflict with §2 "guarantee fix doesn't introduce regressions"

§2 honestly states Self-Renewal cannot guarantee no regressions. §7.5 Phase D notes that regression-aware fix generation (new tests for each fix) partially closes this gap. Until Phase D ships, Phase A's regression-catching mechanism is solely the human PR reviewer. This is consistent with the CEO Dispatch #5 "human review of PR and preview before merging" principle but the spec MUST be brutally clear that the human is the canonical regression gate, not Self-Renewal itself.

---

## Provenance

| Source | Used for |
|---|---|
| CEO Dispatch #5 (2026-05-16) | Option C definition + 5 locked decisions |
| `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` v3 (commit `be594e3`) | Credential-handling patterns (memory-only, one-shot, scrubCredentials, canary tests) |
| `src/lib/agents/agents/Agent3SelfRenewal.js` (commit `68a0c75`) | Current skeleton state for §7 graduation plan baseline |
| `api/renew.js` (current renewal orchestrator) | Existing pipeline integration point |
| `api/_lib/sourceAcquisition.js` | Existing read-only source-acquisition baseline (§3.5 augments with read-write) |
| `docs/specs/agent-blueprints/AGENT_03_SelfRenewal.md` | Split-charter clarification (Note 2) |
| `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` (earlier broader draft) | Option C is the concrete narrowing of its §6 fork-and-fix mode |
| `docs/CANONICAL_REFERENCE.md` §6, §10, §11, §13, §14, §15.1, §15.5 | All canonical anchors |
| CA-12 v3 §A.2 (Build-Authority Supervised) | Authority posture mapping (Note 4) |
| CA-10-A §7.5 ProductSSOT + governance_record schema | §6.5 audit-trail entry shape |
| Orchestra Integration Spec §7 (cost tracking) | Note 3 cost envelope |

---

*End of Self-Renewal Spec — Option C: PR + preview + delta. Pending W6 adversarial Panel ratification.*
