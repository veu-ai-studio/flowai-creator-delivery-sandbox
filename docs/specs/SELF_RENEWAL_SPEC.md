# Self-Renewal Spec — Option C: PR + Preview + Delta Score

**Status:** DRAFT v3 — addresses 3 conditions from W6 v2 NOT_RATIFIED verdict (`GQ7v2-REV` plurality 5/7, 2026-05-16). Pending W6 re-Panel ratification before any build begins. Spec only; **zero code** in this dispatch. **NOT canonical SSOT.**
**Author:** W3 (v1), W3a revision (v2 + v3), 2026-05-16/17.

**v3 change log (3 surgical fixes — CEO-locked Panel conditions, no other restructuring):**
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

### §3.2 — GitHub credential: GitHub App only (no PAT fallback)

**Phase A's canonical credential model is a single FlowAI GitHub App, and only the App** — one App registration shared across the FlowAI fleet, multi-installation per operator org, installed into each operator-owned GitHub organisation or user account that wishes to enable Self-Renewal. There is no fine-grained PAT fallback. The App provides:

- **Installation-time consent** — the operator visibly authorises FlowAI to act on a finite set of repositories at installation time. No after-the-fact scope drift.
- **Fine-grained webhook subscription** — Phase A subscribes to `pull_request`, `pull_request_review`, `installation`, `installation_repositories`, and `meta` events ONLY. No `push`, no `issues`, no `repository_dispatch`, no `workflow_run`. The narrow subscription is verifiable by anyone reading the App manifest.
- **No long-lived token** — Self-Renewal mints an installation access token at the start of each renewal run (`POST /app/installations/{installation_id}/access_tokens`), uses it for the run, and discards it at run end. Installation tokens expire ≤ 1 hour by GitHub default — bounded blast radius even if leakage occurs.
- **Per-installation isolation** — the access token is scoped to a single installation's repositories; cross-tenant credential reuse is structurally impossible.

App permissions (minimum):
- `contents: write` — create branches, push commits to the renewal branch.
- `pull_requests: write` — open PRs, comment, update PR body.
- `metadata: read` — implicit/required for the above.

App permissions MUST NOT include: `actions: write`, `administration: *`, `secrets: *`, `workflows: write` (rationale unchanged from v1 — Self-Renewal does not modify CI, repo settings, secrets, or workflow files).

**App-credential storage:** the App's private signing key (PEM) is stored in Doppler at `flowai/<env>/SELF_RENEWAL_APP_PRIVATE_KEY`; the numeric App ID at `flowai/<env>/SELF_RENEWAL_APP_ID`. The per-operator-installation ID is stored on `ProductRegistry.selfRenewalGithubInstallationId` (recorded at install-time via the App's setup callback URL). Per-run installation tokens are minted from those three values in memory, used for the run, and discarded at run end (same memory-only pattern as the existing AUTH_TRAVERSAL_SECURITY_SPEC v3 Invariant 2). The App private key and App ID are NOT product-scoped (single FlowAI App, multi-tenant via installations); the installation ID is the per-product binding.

**Selection logic per renewal run:**
1. If `ProductRegistry.selfRenewalGithubInstallationId` is set → use the GitHub App path (mint installation token).
2. Else → abort with `SELF_RENEWAL_NO_SOURCE { reason: 'no_app_installation' }` per §3.6.

**Products without a GitHub App installation cannot use Self-Renewal until the App is installed for that product.** When the abort in step 2 fires, the operator-facing notification surfaces with an actionable message directing the operator to the GitHub App install flow (deep-link to `https://github.com/apps/<flowai-app-slug>/installations/new`, prefilled with the product's repo as the install target where possible). The renewal run is reported as `failed` (not degraded) in the Monitor step's clearance decision; subsequent runs succeed automatically once installation is recorded on `ProductRegistry.selfRenewalGithubInstallationId`.

**No INTERIM PAT path. No graduation contract.** Earlier v2 drafts of this spec retained a fine-grained PAT as a documented INTERIM fallback, with a Phase B "remove the PAT path" graduation contract. v3 drops both: the App is the only path from Phase A day one, so no graduation step is necessary. The Doppler `PRODUCT_<productId>_GITHUB_PAT` path is not consumed by Self-Renewal in any phase; the `flowai-self-renewal` machine user is not provisioned.

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

**Phase B raises `MAX_FILES` to 3 after Phase A has run in production for ≥30 days against ≥3 of the 5 operator products without a material incident** (per §7.3 + §7.6 phase-ordering rationale). Until Phase B ratifies the expansion, Phase A is strictly single-file. The diff-parse-time enforcement gate (per §4.4) is the structural guarantee that the change-log here cannot drift from runtime behaviour.

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
| **(c) Preview smoke — MUST** | After the Vercel preview reaches `READY` (per §5.5 step 3), Self-Renewal performs a smoke test: `fetch(previewUrl)` with a 30-second timeout, asserts HTTP 2xx status, AND asserts at least **one key DOM element** is present in the rendered HTML response (per-product key-DOM selector list on `ProductRegistry.selfRenewalSmokeSelectors`, defaulting to `['html', 'body']` if unset — operator can configure stricter selectors such as `['#root', 'header', 'main']`). | `gate: 'preview_smoke_failure'` |
| **Lint** | `npm run lint` (or `eslint`) introduces zero NEW errors (existing lint debt is ignored — Self-Renewal must not be blocked by pre-existing project debt) | `gate: 'new_lint_errors'` |
| **Build** | `npm run build` (or framework equivalent — `vite build`, `next build`) completes without errors | `gate: 'build_failure'` |

**Never a broken PR.** If any gate fails, the fix is discarded BEFORE the GitHub Contents API write (for parse/scope/syntax/test/typecheck/lint/build gates) OR BEFORE the Pulls API call (for the preview-smoke gate, which by ordering necessarily runs after the branch push per §5.5). The branch is never opened as a PR with broken code or a broken preview. The finding is logged as `auto_fix_attempted_failed` and remains in the operator's open-findings list for manual remediation.

**Gate-ordering note:** Diff-parse / scope / syntax run pre-push. Test / typecheck / lint / build run in the disposable Vercel build environment (per §4.6). Preview-smoke runs post-build, post-deploy, pre-PR (slots into §5.5 step 4 — replacing the prior bare-2xx smoke with the 2xx + DOM-element check).

### §4.5 — Per-finding fix-generation isolation

Each finding's fix-generation pass runs in isolation. A failure on one finding's fix does not affect other findings' fixes. The renewal run reports per-finding fix-status in the PR body (see §5.4 PR body format).

### §4.6 — Gate execution environment

Test + lint + build gates run in a **disposable Vercel build environment** (a preview build of the branched source code). Self-Renewal does NOT run untrusted operator-product test code on its own infrastructure. Vercel's preview-deploy sandbox is the test surface; if Vercel build fails, the fix is discarded (the failed build is the canonical signal).

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

### §6.4 — Honest reporting, single per-product open-policy enum

Reporting honesty is invariant: if the delta is **negative** (the fix made things worse), it is reported as a negative number in the `governance_record_entry` (§6.5) and — when a PR is opened — in the PR body table. No score manipulation, no rounding-toward-zero, no hiding regressions, regardless of whether the PR ends up opened.

**A single per-product `ProductRegistry` field governs PR-opening behaviour as a function of the computed delta** (v3 collapses the prior v2 two-field design — `selfRenewalNegativeDeltaPolicy` + `selfRenewalMinimumDelta` — into one enum):

| Field | Type | Default | Semantics |
|---|---|---|---|
| `selfRenewalOpenPolicy` | enum | `ALL` | One of three values controlling whether the PR opens after the delta is computed:<br>• `ALL` — always open the PR, regardless of delta sign. Negative/zero deltas surface with the regression banner (see below).<br>• `IMPROVEMENTS_ONLY` — open the PR only when `delta_total > 0`. Runs with `delta_total ≤ 0` close as `below_threshold` without opening a PR.<br>• `SUBSTANTIAL_ONLY` — open the PR only when `delta_total >= 5`. Runs with `delta_total < 5` close as `below_threshold` without opening a PR. |

**Decision sequence (executed in order after the post-renewal score is computed in §6.2):**

1. **Compute delta** per §6.3. `delta_total` is an integer (positive, zero, or negative).
2. **Apply open-policy enum.** Read `ProductRegistry.selfRenewalOpenPolicy` for the product (default `ALL` if unset).
   - `ALL` → proceed to step 3 (PR will be opened; regression banner included if `delta_total ≤ 0`).
   - `IMPROVEMENTS_ONLY` AND `delta_total > 0` → proceed to step 3.
   - `IMPROVEMENTS_ONLY` AND `delta_total ≤ 0` → close as `below_threshold` (see step 2b below).
   - `SUBSTANTIAL_ONLY` AND `delta_total >= 5` → proceed to step 3.
   - `SUBSTANTIAL_ONLY` AND `delta_total < 5` → close as `below_threshold` (see step 2b below).
2b. **`below_threshold` close path** (used by `IMPROVEMENTS_ONLY` and `SUBSTANTIAL_ONLY` when their condition is not met):
   - Close the renewal run as `below_threshold` WITHOUT opening a PR. Delete the renewal branch (via `DELETE /repos/.../git/refs/heads/flowai/renewal-<runId>`) to avoid orphan branches accumulating. Write `governance_record_entry kind: 'self_renewal.below_threshold'` with `{ deltaTotal: <delta>, openPolicy: <ALL|IMPROVEMENTS_ONLY|SUBSTANTIAL_ONLY>, requiredDelta: <0 for IMPROVEMENTS_ONLY | 5 for SUBSTANTIAL_ONLY | null for ALL>, preScore, postScore }`. Stop here.
3. **Open PR.** Open the PR per §5 contract. Include the regression banner below when `delta_total ≤ 0` (only reachable under `ALL` policy, since `IMPROVEMENTS_ONLY` and `SUBSTANTIAL_ONLY` already filtered non-positive deltas at step 2).

**Regression banner inserted into the PR body when `delta_total ≤ 0` and the PR is being opened (only under `selfRenewalOpenPolicy = ALL`):**

```
⚠️ **No improvement detected** — post-renewal score is not higher than pre-renewal.
This PR is still opened (operator policy: ALL — surface every run) so you can
review the proposed changes, but the delta score suggests the fix did not
improve the assessment. Recommend reviewing each fix individually and deciding
whether to discard the PR (close without merge).
```

The Option C philosophy — "surface the data, let the human judge" — is preserved by the `ALL` default: every result surfaces. Operators who do not want regression PRs in their review queue set `IMPROVEMENTS_ONLY`. Operators who only want PRs with substantial improvement set `SUBSTANTIAL_ONLY` (Panel-ratified threshold of `+5`). Audit-trail honesty is preserved across all three policies — every run writes a `governance_record_entry` regardless of whether a PR is opened — so suppression at the PR layer never becomes suppression at the audit layer.

The operator-facing admin UI exposes this single field per product (admin role per Rev-2.1 §13). Changes take effect on the next renewal run; in-flight runs use the value they read at run start. The two v2 fields (`selfRenewalNegativeDeltaPolicy`, `selfRenewalMinimumDelta`) are NOT shipped — `selfRenewalOpenPolicy` is the only knob.

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

## §10 — Panel Questions (7, adversarial format — v3)

Standard 4-option + INSUFFICIENT_INFORMATION format per `docs/PANEL_INFRASTRUCTURE.md` engagement-filter conventions. No anchoring. No author-preference tags. Q1/Q3/Q4/Q6/Q7 have been rewritten for v3 to reflect the three CEO-locked surgical fixes. Q2 is carried unchanged from v2 (no v3 edit to §4.4). Q5 is carried as RATIFIED (`GQ5-PREFIRST` quorum-plurality 7/8 in v1).

### G-Q1 — Single-file fix scope with diff-parse-time enforcement (v3 revert)

§4.3 v3 reverts `MAX_FILES` from 3 → 1 per v2 Panel plurality `GQ1v2-1FILE` (4/7). Phase A is single-file; Phase B raises to 3 files after ≥30 days proven in production against ≥3 of 5 operator products. The diff-parse-time discard gate enforces the cap before any GitHub API call. Is this the right scope boundary for Phase A?

- (a) Single-file scope with diff-parse-time enforcement and a defined Phase B graduation trigger is correct — minimum production risk, structural guarantee, clear path to expansion once Phase A is proven.
- (b) Single-file is now too restrictive given the typecheck + preview-smoke MUST gates already catch most multi-file regressions — Phase A should re-raise to 2 files (component + companion test only) to avoid leaving the "trivially-paired-test" pattern on the table.
- (c) Single-file is correct for Phase A but the 30-day / 3-product graduation trigger is too quick — Phase B should require ≥90 days against ≥4 of 5 products, since multi-file fixes are categorically higher-risk.
- (d) The Phase A → Phase B transition should not be time-gated at all — Phase B should require a separate Panel ratification of a new spec (not just a count-based trigger), preserving adversarial review at each authority expansion.
- (e) INSUFFICIENT_INFORMATION.

### G-Q2 — Three MUST gates: tests + typecheck + preview-smoke

§4.4 v2 adds two MUST gates beyond `npm test`: (b) typecheck (`npm run typecheck` / `tsc --noEmit`) where `tsconfig.json` exists, and (c) preview smoke (`fetch(previewUrl)` + HTTP 2xx + ≥1 key DOM element present, per `ProductRegistry.selfRenewalSmokeSelectors`). Is this the right set of MUST gates?

- (a) Three MUST gates (test + typecheck + preview-smoke) is correct — each catches a distinct failure class (logic regression, type regression, runtime/SSR regression); none is redundant.
- (b) Three MUST gates is too lax — Phase A should also MUST-gate accessibility (axe-core) and visual regression (screenshot diff against pre-renewal baseline) before any PR opens.
- (c) Three MUST gates is too strict — typecheck-skip-when-no-tsconfig and DOM-default-`['html','body']` are loopholes; either MUST-universal or drop the gates entirely.
- (d) The MUST framing is wrong — Phase A should treat all gates as advisory with a single "operator confidence threshold" parameter; let operators tune strictness.
- (e) INSUFFICIENT_INFORMATION.

### G-Q3 — GitHub App only, no PAT fallback (v3)

§3.2 v3 drops the fine-grained PAT fallback per v2 Panel plurality `GQ3v2-APPONLY` (5/7). Phase A is App-only from day one: products without a GitHub App installation cannot use Self-Renewal and are directed to the install flow on their first failed run. No Doppler `PRODUCT_<productId>_GITHUB_PAT` path is consumed; no `flowai-self-renewal` machine user is provisioned; no Phase B graduation step is needed. Is this the right credential model for Phase A?

- (a) App-only from day one is correct — the install-flow friction is acceptable because the App is the long-term safe path and a temporary fallback would only require a removal dispatch later.
- (b) Insufficient — Phase A should additionally pin the App's manifest in-repo (e.g. `.github/flowai-app-manifest.yml`) so any change to the App's permission set produces an auditable diff visible to the operator before they accept the next installation update.
- (c) Too restrictive — Phase A should at least retain the branch-scoped PAT path behind a per-product feature flag, so an operator stuck mid-install can still get an emergency renewal run; the App should still be the default selection.
- (d) Wrong shape — drop the GitHub App entirely and use a per-renewal-run device-flow OAuth that asks the operator to authorise each run individually; this strictly minimises standing authority but materially increases friction.
- (e) INSUFFICIENT_INFORMATION.

### G-Q4 — Single 3-state open-policy enum (v3 collapse — Q4 axis)

§6.4 v3 collapses v2's two-field design (`selfRenewalNegativeDeltaPolicy` + `selfRenewalMinimumDelta`) into one per-product enum: `ProductRegistry.selfRenewalOpenPolicy ∈ { ALL (default), IMPROVEMENTS_ONLY, SUBSTANTIAL_ONLY }`. Per v2 Panel `GQ4v2-HARD` (3/7) + `GQ6v2-COLL` (one of three tied 2/7 votes in a SPLIT). Is the 3-state enum the right shape for the negative-delta dimension of this decision?

- (a) Single 3-state enum is correct — replaces two coupled fields with one, eliminates illegal combinations (e.g. `MinimumDelta=-5` + `DISCARD_ON_NEGATIVE`), keeps the `ALL` transparency-first default, and exposes only the three states operators actually want.
- (b) Insufficient — Phase A still needs a fourth state `IMPROVEMENTS_ONLY_NO_BANNER` (silent suppression of regression banners on zero-delta runs that just barely cleared the bar) so operators reviewing borderline PRs aren't visually pulled toward "this might be a regression" framing on neutral runs.
- (c) Too coarse — three states cannot capture the per-product reviewer-bandwidth nuance that the v2 two-field design supported (e.g. "open everything but only beep me if delta_total ≥ +3"); restore the two-field model and accept the cross-field validation cost.
- (d) Wrong default — `IMPROVEMENTS_ONLY` should be the default, not `ALL`; defaulting to "surface every run" trains operator review queues to ignore renewal PRs, which erodes the merge-gate over time.
- (e) INSUFFICIENT_INFORMATION.

### G-Q5 — Preview-before-PR ordering (carried RATIFIED from v1)

This question is carried unchanged from v1 (`GQ5-PREFIRST` ratified 7/8 quorum-plurality). Re-rating is OPTIONAL — Panel may carry the prior verdict. §5.5 requires the Vercel preview to be live (HTTP 2xx) before the PR is opened. Is this ordering the right gate?

- (a) Preview-before-PR is correct — the operator MUST see the renewed result in-browser before being asked to review code.
- (b) Preview-before-PR is too strict — Phase A should open the PR concurrently with the preview build (PR opens immediately on branch creation; preview URL is added as a PR comment when ready).
- (c) Preview-before-PR is too lax — Phase A should additionally require the preview URL to pass a smoke-test assessment (Agent #21 quick crawl) before the PR is opened.
- (d) Preview-before-PR is the wrong gate entirely — for non-Vercel-hosted operators, there is no preview; Phase A should support a "no preview" path with explicit operator opt-in (limits Option C to PR-only without preview for those operators).
- (e) INSUFFICIENT_INFORMATION.

### G-Q6 — `SUBSTANTIAL_ONLY` threshold value (v3 collapse — Q6 axis)

§6.4 v3 collapses v2's free-integer `selfRenewalMinimumDelta` into the discrete `SUBSTANTIAL_ONLY` state of `selfRenewalOpenPolicy`, with a Panel-fixed threshold of `delta_total >= 5`. Per v2 SPLIT verdict on Q6 + v2 Q4's `GQ4v2-HARD` plurality. Is `+5` the right threshold value for "substantial improvement"?

- (a) `+5` is correct — matches the v1 G-Q4 option (d) framing ("Panel-ratified threshold for what 'substantial' means"); large enough that LLM-noise-floor runs don't qualify, small enough that real wins do.
- (b) `+5` is too high — a real fix that improves one Five-Layer L by ~3 points (a common pattern when one finding category is addressed cleanly) would close as `below_threshold`; `+3` is the better fixed threshold.
- (c) `+5` is too low — given the cost envelope of ~$0.65–$5.00 per run (Note 3), `SUBSTANTIAL_ONLY` should mean delta covers at least one run's worth of value-per-point; `+10` is the better fixed threshold.
- (d) Any fixed integer is wrong — `SUBSTANTIAL_ONLY` should require a configurable per-product `selfRenewalSubstantialThreshold` integer (defaulting to `+5`) so operators tune to their own value model; collapse loses information that Q6's free integer carried.
- (e) INSUFFICIENT_INFORMATION.

### G-Q7 — Disposition: is v3 ready for promotion?

v3 applies 3 surgical fixes to address the conditions from the v2 NOT_RATIFIED verdict (`GQ7v2-REV` plurality 5/7): App-only credential model with the PAT fallback dropped (Q3), single-file fix scope restored with a documented Phase B graduation trigger (Q1), and the v2 two-field delta-policy design collapsed into a single 3-state enum `selfRenewalOpenPolicy ∈ { ALL, IMPROVEMENTS_ONLY, SUBSTANTIAL_ONLY }` with `SUBSTANTIAL_ONLY` fixed at `delta_total >= 5` (Q4 + Q6 collapse). G-Q2 (three MUST gates) and G-Q5 (preview-before-PR) are carried unchanged. Given these 3 changes, the appropriate Panel disposition for v3 is:

- (a) Promote — the 3 conditions are addressed cleanly and Option C v3 is ready for Phase A engineering dispatch.
- (b) Promote-with-Reservations — the 3 conditions are addressed but the Panel surfaces residual issues that the engineering dispatch should track (specify in rationale, non-blocking).
- (c) Revise — one or more of the 3 surgical fixes is incomplete, inconsistent, or introduces a new defect that must be fixed before promotion (specify which condition and the defect).
- (d) Reject — the 3 fixes expose a deeper architectural problem with Option C that surgical revisions cannot fix; the spec needs ground-up rework or replacement (specify the architectural concern).
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
