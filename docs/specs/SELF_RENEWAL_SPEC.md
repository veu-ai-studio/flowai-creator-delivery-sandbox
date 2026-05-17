# Self-Renewal Spec — Option C: PR + Preview + Delta Score

**Status:** DRAFT — pending W6 adversarial Panel ratification before any build begins. Spec only; **zero code** in this dispatch. **NOT canonical SSOT.**
**Author:** W3, 2026-05-16.
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

### §3.2 — GitHub fine-grained PAT, per product, in Doppler

The PAT is a **fine-grained personal access token** (NOT a classic PAT — classic PATs have over-broad permissions). Minimum permissions:

- `contents: write` — create branches, push commits to the renewal branch
- `pull-requests: write` — open PRs, comment, update PR body

**MUST NOT have:**
- `actions: write` (Self-Renewal does not modify CI workflows)
- `administration: *` (Self-Renewal does not change repo settings)
- `secrets: *` (Self-Renewal does not read or write secrets)
- `workflows: write` (no workflow file changes — see §4 fix scope exclusions)

**PAT scope:** the PAT MUST be scoped to operator-owned repos only. The PAT's `repository_selection` (per GitHub fine-grained PAT API) MUST be either `selected` with the operator's repos enumerated, OR `all` if the PAT is bound to an operator-owned GitHub organisation. The PAT MUST NOT be `all` for a personal user account that the operator does not own.

**Storage:** the PAT is stored in Doppler at path `flowai/<env>/PRODUCT_<productId>_GITHUB_PAT`. Read via `CredentialAdapter` (per Rev-2.1 §21 + commit `8e29e84`). The PAT is read ONCE per renewal run, held in process memory, and discarded at run end (same pattern as `AUTH_TRAVERSAL_SECURITY_SPEC.md` v3 Invariant 2 — memory-only credential lifetime).

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

Phase A (this spec, ratified-and-built scope) restricts fix generation to changes within a **single file per finding**. The Claude prompt receives one source file as context, and the output diff MUST touch only that file.

Multi-file fixes are deferred to Phase B (§7 graduation plan). Findings that require multi-file changes are excluded from Phase A's fix-generation pass (logged as `out-of-scope: multi-file required`).

### §4.4 — Fix-discard gates

A fix is DISCARDED (and the finding logged as `auto_fix_attempted_failed { gate: <gate_name> }`) if ANY of the following gates fail:

| Gate | Check | Discard reason |
|---|---|---|
| **Diff parseability** | Output is a valid unified diff parseable by `parse-diff` or equivalent | `gate: 'diff_unparseable'` |
| **Syntax check** | Resulting patched file passes language-specific syntax check (e.g., `node --check` for JS/TS, `python -m py_compile` for Python, etc.) | `gate: 'syntax_invalid'` |
| **Test suite** | `npm test` (or equivalent for the framework — `yarn test`, `pnpm test`, `vitest run`) passes against the patched file tree | `gate: 'test_failure'` |
| **Lint** | `npm run lint` (or `eslint`, `tsc --noEmit`) introduces zero NEW errors (existing lint debt is ignored — Self-Renewal must not be blocked by pre-existing project debt) | `gate: 'new_lint_errors'` |
| **Build** | `npm run build` (or framework equivalent — `vite build`, `next build`) completes without errors | `gate: 'build_failure'` |

**Never a broken PR.** If any gate fails, the fix is discarded BEFORE the GitHub Contents API write. The branch is never created with broken code. The finding is logged as `auto_fix_attempted_failed` and remains in the operator's open-findings list for manual remediation.

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

### §6.4 — Honest reporting

If the delta is **negative** (the fix made things worse), it is reported as a negative number in the PR body table. No score manipulation, no rounding-toward-zero, no hiding regressions.

If the delta is **zero or negative**, the PR body includes a banner:

```
⚠️ **No improvement detected** — post-renewal score is not higher than pre-renewal.
This PR is still opened so you can review the proposed changes, but the delta
score suggests the fix did not improve the assessment. Recommend reviewing
each fix individually and deciding whether to discard the PR (close without merge).
```

The PR is still opened (per §5 contract — preview-before-PR ordering doesn't require positive delta). The operator decides. This is core to the Option C philosophy: surface the data, let the human judge.

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

## §10 — Panel Questions (7, adversarial format)

Standard 4-option + INSUFFICIENT_INFORMATION format per `docs/PANEL_INFRASTRUCTURE.md` engagement-filter conventions. No anchoring. No author-preference tags.

### G-Q1 — Single-file-only fix scope

Phase A restricts fix generation to single-file changes (§4.3). Multi-file fixes are deferred to Phase B. Is single-file scope the right boundary for Phase A?

- (a) Single-file scope is correct — multi-file fixes are too risky for the first production deployment of automated fix application.
- (b) Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).
- (c) Single-file scope is too permissive — Phase A should restrict further (e.g., single-function-only within a file).
- (d) The single-file vs multi-file framing is the wrong question — Phase A should restrict by file type (e.g., `*.jsx` only, no `*.json` / no `*.config.js` regardless of file count).
- (e) INSUFFICIENT_INFORMATION.

### G-Q2 — "Fix must pass npm test" gate sufficiency

§4.4 gates a fix on `npm test` (or equivalent for the framework) passing. Is this the right test surface, or does the gate need more guards?

- (a) `npm test` is sufficient — existing test suite is the canonical pre-merge gate; if a fix breaks a test, the discard gate catches it.
- (b) `npm test` is insufficient — Phase A should also require `npm run typecheck` (or `tsc --noEmit`) where applicable.
- (c) `npm test` is insufficient — Phase A should also require a smoke test of the Vercel preview (e.g., basic `fetch(previewUrl)` + assert 2xx + assert key DOM elements present).
- (d) `npm test` is the wrong gate entirely — projects without tests cannot use Self-Renewal at all, which is an unacceptable limitation; the gate should be optional with operator opt-in.
- (e) INSUFFICIENT_INFORMATION.

### G-Q3 — GitHub PAT minimum permissions

§3.2 requires `contents:write` + `pull-requests:write`. Are these the right minimum permissions?

- (a) `contents:write` + `pull-requests:write` is the correct minimum — narrow enough to prevent abuse, broad enough to do the job.
- (b) Insufficient — Phase A also needs `metadata:read` (likely already implicit) and `commit-statuses:read` (to surface CI status in the PR body).
- (c) Over-broad — `contents:write` allows force-pushing to the default branch, which Self-Renewal never does; the permission should be narrower (e.g., `contents:write` scoped to branches matching `flowai/*`).
- (d) Different permission model entirely — Phase A should use a GitHub App rather than a fine-grained PAT, with installation-time consent + finer-grained webhook subscription.
- (e) INSUFFICIENT_INFORMATION.

### G-Q4 — Negative-delta PR opening

§6.4 specifies that if the fix makes the score worse (negative delta), the PR is still opened with a "no improvement detected" banner. Is this the right policy?

- (a) Always open the PR — surface the data; let the human decide. Negative deltas are information the operator needs.
- (b) Never open the PR if delta is negative — close the renewal run as failed; don't waste operator review time on regressions.
- (c) Open the PR but mark it explicitly "discarded by FlowAI" — branch deleted, PR closed in same commit, operator gets a record but no review burden.
- (d) Threshold-based — open the PR if delta is ≥ a configurable minimum (e.g., delta_total ≥ +5); below that, close as failed.
- (e) INSUFFICIENT_INFORMATION.

### G-Q5 — Preview-before-PR ordering

§5.5 requires the Vercel preview to be live (HTTP 2xx) before the PR is opened. Is this ordering the right gate?

- (a) Preview-before-PR is correct — the operator MUST see the renewed result in-browser before being asked to review code.
- (b) Preview-before-PR is too strict — Phase A should open the PR concurrently with the preview build (PR opens immediately on branch creation; preview URL is added as a PR comment when ready).
- (c) Preview-before-PR is too lax — Phase A should additionally require the preview URL to pass a smoke-test assessment (Agent #21 quick crawl) before the PR is opened.
- (d) Preview-before-PR is the wrong gate entirely — for non-Vercel-hosted operators, there is no preview; Phase A should support a "no preview" path with explicit operator opt-in (limits Option C to PR-only without preview for those operators).
- (e) INSUFFICIENT_INFORMATION.

### G-Q6 — Minimum-delta threshold for PR opening

Related to G-Q4 but distinct: should there be a configurable minimum delta required before a PR is opened (regardless of operator UI policy)?

- (a) Always open the PR (no minimum delta required) — operator sees everything.
- (b) Configurable per-product minimum delta (e.g. `ProductRegistry.selfRenewalMinimumDelta = 0` by default) — operator decides.
- (c) Hard-coded minimum delta of +1 — FlowAI never opens PRs that don't show measurable improvement.
- (d) Hard-coded minimum delta of +5 — FlowAI only opens PRs with substantial improvement (per a Panel-ratified threshold for what "substantial" means).
- (e) INSUFFICIENT_INFORMATION.

### G-Q7 — Overall Self-Renewal spec disposition

After reading the full draft, the appropriate Panel disposition is:

- (a) Promote — spec is ready for Phase A engineering dispatch.
- (b) Revise — identify specific sections that need revision before promotion.
- (c) Defer — Phase A is not the right next investment; some other engineering work should land first (specify in rationale).
- (d) Reject — Option C is the wrong architectural approach; a different approach should be pursued (specify in rationale).
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
