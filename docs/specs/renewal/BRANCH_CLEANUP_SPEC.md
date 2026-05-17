# Branch Cleanup Module Spec (Module 11)

**Status:** DRAFT — pending W6 Panel ratification before W5a engineering dispatch.
**Author:** W3, 2026-05-17.
**Module index:** 11 (W5a builds immediately after Module 10).
**Anchor canonical:** `docs/specs/SELF_RENEWAL_SPEC.md` §5.1 (branch naming `flowai/renewal-<runId>`), §5.5 (preview-before-PR ordering), §6.5 (governance_record_entry audit trail), §3.2 (GitHub App permissions: `contents: write` + `pull_requests: write` + `metadata: read`; matches `.github/flowai-app-manifest.yml` committed at `dbf7d87`).

---

## §1 — Module Identity

| Field | Value |
|---|---|
| Module | `branchCleanup.js` |
| Location | `src/lib/agents/renewal/branchCleanup.js` |
| Tests | `src/lib/agents/renewal/__tests__/branchCleanup.test.js` |
| Build wave | Wave 5 (Module 11 — immediately after Module 10) |
| Invoked by | Inngest scheduled job + admin on-demand button per `/self-renewal` UI |
| Cadence | Daily 02:00 UTC scheduled (configurable per-product via `ProductRegistry.branchCleanupCadenceHours`; default 24h) |

---

## §2 — Module Purpose

When Self-Renewal Executor opens a PR on branch `flowai/renewal-<runId>`, operator may:
- Merge the PR — branch is auto-deleted by GitHub (default repo setting).
- Close the PR without merging — branch persists indefinitely without explicit cleanup.
- Ignore the PR (no action) — branch + PR persist; PR rots; branch fills the repo's `flowai/renewal-*` namespace.

Without cleanup: an operator product accumulates dozens of stale `flowai/renewal-*` branches over weeks, polluting the git branch list and obscuring active proposals. Module 11 reclaims unused branches per retention policy: branches that are (a) older than `retentionDays` AND (b) have no open PR are safe to delete. Branches with open PRs are PRESERVED regardless of age — the operator may still be deliberating.

---

## §3 — Module Export

```js
// src/lib/agents/renewal/branchCleanup.js

/**
 * Cleanup stale `flowai/renewal-*` branches on an operator-owned repo.
 *
 * Lists all branches matching the `flowai/renewal-*` prefix; for each branch
 * checks (a) age > retentionDays AND (b) no open PR. Both conditions must
 * hold before the branch is deleted.
 *
 * @param {object} opts
 * @param {string} opts.owner          - GitHub owner (e.g. 'veu-ai-studio')
 * @param {string} opts.repo           - GitHub repo name
 * @param {number} opts.retentionDays  - Age threshold in days (e.g. 7)
 * @param {string} opts.token          - GitHub App installation token (per §3.2 manifest)
 * @param {object} opts.supabase       - Supabase client for governance_record_entry writes
 *
 * @returns {Promise<{
 *   inspected: number,                 // count of flowai/renewal-* branches listed
 *   eligibleForDeletion: number,       // count meeting both conditions (age + no open PR)
 *   deleted: Array<{ branch, age_days, runId, deletedAt, ssotEntryRef }>,
 *   preservedByOpenPR: Array<{ branch, prNumber, age_days, runId }>,
 *   preservedByAge: Array<{ branch, age_days, runId }>,
 *   failed: Array<{ branch, runId, reason, willRetry }>,
 *   completedAt: string,               // ISO8601
 * }>}
 */
export async function cleanupStaleBranches({
  owner,
  repo,
  retentionDays,
  token,
  supabase,
}) { /* implementation per §4 logic */ }
```

---

## §4 — Module Logic

### §4.1 — Algorithm

```
1. List all branches matching `flowai/renewal-*` prefix via:
     GET /repos/{owner}/{repo}/branches?per_page=100
   Paginate until exhausted. Filter to refs starting `refs/heads/flowai/renewal-`.

2. For each branch:
   a. Extract `runId` from branch name suffix (after `flowai/renewal-`).
   b. Fetch branch commit date via:
        GET /repos/{owner}/{repo}/branches/{branch}
      Use `commit.commit.committer.date` as branch age anchor.
   c. Compute `age_days = (now - commitDate) / 86400_seconds`.
   d. Query open PRs targeting this branch via:
        GET /repos/{owner}/{repo}/pulls?head={owner}:{branch}&state=open
      `openPrCount = response.length` (0 or 1; multiple open PRs on same head
      is impossible per GitHub).
   e. Decision matrix:
      - `age_days <= retentionDays` AND `openPrCount === 0` → PRESERVE (age);
        record in `preservedByAge[]`.
      - `age_days <= retentionDays` AND `openPrCount > 0`  → PRESERVE (open PR);
        record in `preservedByOpenPR[]`.
      - `age_days > retentionDays` AND `openPrCount > 0`   → PRESERVE (open PR);
        record in `preservedByOpenPR[]`. **Open PR overrides age threshold.**
      - `age_days > retentionDays` AND `openPrCount === 0` → DELETE.

3. For each branch eligible for deletion:
   a. Delete branch ref via:
        DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}
      Expected response: 204 No Content.
   b. On success:
      - Append `governance_record_entry` to ProductSSOT (per §4.2 schema).
      - Push entry to `deleted[]` result array.
   c. On failure (any non-204 response):
      - Push entry to `failed[]` result array with classified `reason` per §5.
      - Skip governance entry (defect: never claim a delete that didn't succeed).

4. Return aggregated result envelope per §3 signature.
```

### §4.2 — Governance entry shape

Per `SELF_RENEWAL_SPEC.md` §6.5 schema pattern, each successful deletion writes:

```json
{
  "kind": "self_renewal.branch_cleaned_up.v1",
  "runId": "<runId-extracted-from-branch-name>",
  "productId": "<resolved-from-repo-mapping>",
  "branch": "flowai/renewal-<runId>",
  "branchAgeDays": <number>,
  "retentionDaysApplied": <number>,
  "deletedAt": "<ISO8601>",
  "deletionMethod": "github_app_token",
  "operatorRepoOwner": "<owner>",
  "operatorRepoName": "<repo>",
  "trigger": "scheduled" | "admin_on_demand"
}
```

Entry inserted via `supabase.from('product_ssot_governance_record').insert(...)`
(per CA-10-A.2 `governance_record_entry` schema). Each entry includes
`ssotEntryRef` (Supabase row UUID) returned in the result `deleted[]` array for
audit traceability.

### §4.3 — Cleanup-failed envelope

When a delete attempt fails persistently (per §5 classification):

```json
{
  "kind": "self_renewal.cleanup_failed.v1",
  "runId": "<runId>",
  "productId": "<productId>",
  "branch": "flowai/renewal-<runId>",
  "reason": "permission_denied" | "branch_not_found" | "branch_protected" |
            "github_5xx" | "rate_limited" | "unknown",
  "githubResponseStatus": <number>,
  "willRetryNextRun": boolean,
  "at": "<ISO8601>"
}
```

Emitted to MessageBus as `self_renewal.cleanup_failed.v1` (added to Cluster D
Deferred set per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v2/v3 §2.1.0-Def — ships
with Module 11's first commit). Also written to ProductSSOT
`governance_record_entry` for permanent audit trail.

---

## §5 — Error Handling

Failures classified into transient (retry next run) vs persistent (surface as
`cleanup_failed.v1`):

| GitHub response | Classification | Action |
|---|---|---|
| 204 No Content | success | Insert governance entry; push to `deleted[]`. |
| 403 Forbidden (rate limit) | TRANSIENT | Push to `failed[]` with `willRetry: true`; do NOT emit `cleanup_failed.v1` until 3 consecutive failures. |
| 403 Forbidden (branch protected) | PERSISTENT | Push to `failed[]` with `willRetry: false`; emit `cleanup_failed.v1` with `reason: 'branch_protected'`. |
| 404 Not Found | PERSISTENT | Branch already deleted by another process. Push to `failed[]` with `willRetry: false`; emit `cleanup_failed.v1` with `reason: 'branch_not_found'`; treat as benign idempotent success path (no remediation needed). |
| 422 Unprocessable Entity | PERSISTENT | API contract mismatch. Push to `failed[]` with `willRetry: false`; emit `cleanup_failed.v1` with `reason: 'unknown'` + full response body in observability. |
| 5xx Server Error | TRANSIENT | Push to `failed[]` with `willRetry: true`; do NOT emit `cleanup_failed.v1` until 3 consecutive failures. |
| Network error / timeout | TRANSIENT | Same as 5xx. |
| 401 Unauthorized | PERSISTENT + ESCALATION | GitHub App token invalid OR `contents: write` permission revoked. Push to `failed[]`; emit `cleanup_failed.v1` with `reason: 'permission_denied'`; escalate to admin via notification surface (token rotation OR App reinstallation required). |

Per `SELF_RENEWAL_SPEC.md` §8 security controls: never include the GitHub
token in any error response, log line, governance entry, or MessageBus
envelope. `scrubCredentials()` per `src/lib/renewal/inputArtifact.js:146`
applied to every error path before persist.

---

## §6 — Tests (MUST pass before Module 11 ships)

Test fixtures live at `src/lib/agents/renewal/__tests__/branchCleanup.test.js`.
Mock `octokit` (or equivalent GitHub API client) and Supabase client per
existing test scaffolding patterns.

### §6.1 — Coverage matrix

| # | Test | Setup | Assert |
|---|---|---|---|
| BC-N1 | Branch aged + no open PR → deleted | Mock branch with `commit.date` 8 days ago; mock empty PR list; `retentionDays = 7`. | `deleted[].length === 1`; `governance_record_entry` inserted with `kind === 'self_renewal.branch_cleaned_up.v1'`; `DELETE /git/refs/heads/...` API called exactly once. |
| BC-N2 | Branch aged + open PR → preserved | Mock branch 8d old + mock one open PR targeting that branch. | `deleted[].length === 0`; `preservedByOpenPR[].length === 1`; DELETE API NOT called; governance entry NOT inserted. |
| BC-N3 | Branch young + no open PR → preserved | Mock branch 3d old; no PR. | `preservedByAge[].length === 1`; DELETE NOT called. |
| BC-N4 | Branch young + open PR → preserved | Mock branch 3d old + open PR. | `preservedByOpenPR[].length === 1` (open PR is the stronger signal); DELETE NOT called. |
| BC-N5 | Multiple branches mixed states | 5 branches: 2 aged+no-PR (delete), 1 aged+open-PR (preserve), 1 young+no-PR (preserve), 1 young+open-PR (preserve). | `deleted.length === 2`; `preservedByOpenPR.length === 2`; `preservedByAge.length === 1`; DELETE called exactly 2× with the correct branch names. |
| BC-M1 | Pagination handled | Mock 250 branches across 3 pages. | All 250 inspected; no pagination off-by-one. |
| BC-M2 | Non-`flowai/renewal-*` branches ignored | Mock branches including `main`, `dev`, `flowai/other-prefix-*`. | Inspector skips non-matching branches; `inspected` count matches only `flowai/renewal-*` count. |
| BC-E1 | Branch on exact retention boundary | Mock branch exactly `retentionDays * 86400` seconds old, no PR. | INCLUSIVE policy: `age > retentionDays` is strict greater-than — boundary case PRESERVED. Document this boundary explicitly in the result envelope's `preservedByAge[]` entry. |
| BC-E2 | runId extraction with embedded UUID | Branch name `flowai/renewal-7f3a8b2c-1d4e-4f6a-9b8c-2e5d4f3a1b8c`. | `runId === '7f3a8b2c-1d4e-4f6a-9b8c-2e5d4f3a1b8c'`. Governance entry's `runId` field matches. |
| BC-X1 | GitHub 5xx → transient failure | Mock DELETE returning 503 on 1st attempt. | `failed[].length === 1` with `willRetry: true`; no `cleanup_failed.v1` emitted (first failure); no governance entry inserted. |
| BC-X2 | GitHub 5xx 3 consecutive runs → emit cleanup_failed | Mock 3 consecutive 503 responses across 3 module invocations. | On 3rd run, `cleanup_failed.v1` emitted; `reason: 'github_5xx'`. |
| BC-X3 | GitHub 404 → idempotent | Mock DELETE returning 404 (branch already deleted by another process). | `failed[].length === 1` with `reason: 'branch_not_found'`; emit `cleanup_failed.v1`; do NOT raise alert (idempotent benign case). |
| BC-X4 | GitHub 403 branch-protected → persistent | Mock DELETE returning 403 with body containing `'branch is protected'`. | `failed[].length === 1` with `reason: 'branch_protected'`, `willRetry: false`; emit `cleanup_failed.v1`. |
| BC-X5 | GitHub 401 → escalation | Mock DELETE returning 401. | `failed[].length === 1` with `reason: 'permission_denied'`; emit `cleanup_failed.v1`; admin notification fired. |
| BC-X6 | Token never logged on failure | Mock DELETE returning 5xx with token in request headers. | Error log + envelope + governance entry contain ZERO instances of the token string (canary credential test pattern). |
| BC-X7 | Hostile branch name | Mock branch named `flowai/renewal-../../etc/passwd` (path-traversal attempt). | DELETE API call uses URL-encoded branch parameter; no path-traversal in actual GitHub request. |

### §6.2 — Test data

Each test loads from `__tests__/fixtures/branches/`:
- `single-aged-no-pr.json` — 1 branch aged + no PR
- `single-aged-with-pr.json` — 1 branch aged + open PR
- `multi-mixed.json` — 5 branches mixed states
- `paginated-250.json` — 250 branches across 3 pages
- `error-responses/` — 5xx, 404, 403, 401 fixture responses

Fixtures use synthetic `runId` UUIDs and `flowai/renewal-*` branch names only;
no real operator data per §22 product-agnostic rule.

---

## §7 — Inngest Integration

### §7.1 — Scheduled job

```js
// inngest/functions/renewal-branch-cleanup-tick.js (NEW)

import { Inngest } from 'inngest';
import { cleanupStaleBranches } from '@/lib/agents/renewal/branchCleanup.js';
// ... credentials + supabase client setup per existing patterns

export default inngest.createFunction(
  { id: 'renewal-branch-cleanup-tick', name: 'Renewal Branch Cleanup (daily)' },
  { cron: '0 2 * * *' },   // daily 02:00 UTC
  async ({ step }) => {
    const products = await loadOperatorProducts();  // from ProductRegistry
    for (const product of products) {
      await step.run(`cleanup-${product.productId}`, async () => {
        return cleanupStaleBranches({
          owner: product.githubRepoOwner,
          repo: product.githubRepoName,
          retentionDays: product.branchRetentionDays ?? 7,
          token: await readGithubAppToken(product.productId),
          supabase: createSupabaseClient(),
        });
      });
    }
  }
);
```

### §7.2 — Admin on-demand button

`/self-renewal` UI surface exposes a "Cleanup stale branches now" button
(admin role per §13). Button posts to `/api/renewal/cleanup-branches` which
invokes the same `cleanupStaleBranches()` function with `trigger:
'admin_on_demand'` recorded in the governance entry.

---

## §8 — Configuration

### §8.1 — Per-product retention

`ProductRegistry.branchRetentionDays` JSONB field (NEW per Module 11):
- Default: `7` (one week of preservation after PR close / non-merge).
- Operator-configurable per product via admin UI (admin role per §13).
- Bounds: `[1, 90]` (1 day minimum to avoid accidental same-day reaping;
  90 day maximum to avoid indefinite hoarding).
- Out-of-bounds operator overrides clamped to nearest bound; admin notified
  via `branchRetentionDays_clamped` log event.

### §8.2 — Per-product enablement

`ProductRegistry.branchCleanupEnabled` boolean (NEW per Module 11):
- Default: `true` for all operator-owned products with
  `selfRenewalCredentialMode in {'app', 'pat_fallback'}`.
- Operator can opt out per product (e.g. to manually curate branches).
- When `false`: Module 11 skips that product entirely; governance entry NOT
  written; result envelope shows `inspected: 0`.

### §8.3 — Per-product cadence override

`ProductRegistry.branchCleanupCadenceHours` integer (NEW per Module 11):
- Default: `24` (daily 02:00 UTC scheduled job).
- Operator can extend per product (e.g. `168` for weekly).
- Bounds: `[24, 720]` (daily minimum to avoid runaway cadence; 30-day
  maximum to avoid effective non-cleanup).
- The scheduled job filters products per their cadence: a product with
  `cadenceHours: 168` runs cleanup only on Mondays.

---

## §9 — Out-of-Scope (Phase 11 — explicitly NOT done)

1. **Cross-product cleanup orchestration.** Phase 11 cleans per-product
   serially within a single Inngest tick. Cross-product parallelisation
   deferred to Phase 12+ if throughput becomes a concern.
2. **Branch revival from cold storage.** Deleted branches are gone — no
   undelete path. Operator who wants to recover deleted work must re-run
   Self-Renewal Executor to regenerate the proposal. (GitHub's branch
   restore-on-delete is per-branch via the UI within the GitHub event log;
   we do not provide our own restore path.)
3. **Cleanup of non-`flowai/renewal-*` branches.** Module 11 ONLY touches
   `flowai/renewal-<runId>` branches. Operator's own branches (main / dev /
   feature/* / etc.) are NEVER candidates for deletion regardless of age
   or PR status.
4. **Cleanup of closed (not merged) PRs themselves.** Module 11 deletes
   BRANCHES; the closed PRs remain as historical record. GitHub retains
   closed PRs indefinitely; no cleanup needed (and PR history is operator-
   facing context that should not be reaped).
5. **Conflict detection between cleanup + active Self-Renewal Executor run.**
   If Self-Renewal Executor is mid-flight creating `flowai/renewal-<runId>`
   while Module 11 runs against same product, the branch will be young
   enough to be preserved (Self-Renewal Executor commits land within
   seconds of branch creation). No additional synchronisation needed.

---

## §10 — Acceptance Criteria

1. **AC-BC-1 (Both conditions required for delete):** Branch deleted ONLY
   when `age_days > retentionDays` AND `openPrCount === 0`. Tested by
   BC-N1 / BC-N2 / BC-N3 / BC-N4.
2. **AC-BC-2 (Governance entry per delete):** Every successful DELETE writes
   exactly one `governance_record_entry` with `kind:
   'self_renewal.branch_cleaned_up.v1'` per §4.2 schema. Tested by BC-N1.
3. **AC-BC-3 (Open-PR override age):** Open PR on aged branch → branch
   PRESERVED regardless of age. Tested by BC-N2.
4. **AC-BC-4 (Non-renewal branches untouched):** `main` / `dev` / `feature/*`
   etc. ignored. Tested by BC-M2.
5. **AC-BC-5 (Failure classification):** 5xx → transient; 404 → idempotent
   (treat as success); 403 (protected) / 401 → persistent. Tested by
   BC-X1–BC-X5.
6. **AC-BC-6 (Token never logged):** GitHub token absent from all error
   surfaces. Tested by BC-X6 canary credential pattern.
7. **AC-BC-7 (Path-traversal safe):** Branch parameter URL-encoded;
   adversarial branch names cannot escape the DELETE URL. Tested by BC-X7.
8. **AC-BC-8 (Inngest schedule wired):** Daily 02:00 UTC tick invokes
   `cleanupStaleBranches()` per operator product. Verified by integration
   test in staging.
9. **AC-BC-9 (Per-product enable/disable honored):** Products with
   `branchCleanupEnabled: false` skipped entirely. Tested by configuration
   integration test.
10. **AC-BC-10 (Retention bound clamp):** Operator override of
    `branchRetentionDays` to `0` clamps to `1`; to `365` clamps to `90`.
    Tested by configuration test.

---

## §11 — Cross-cluster integration

- **Cluster A (Cost Governor):** Module 11 makes GitHub API calls (no LLM
  dispatch); cost-signal emission per Cluster A is OPTIONAL for non-LLM
  dispatches. GitHub API calls are free under the operator's installation;
  no `agent.cost.signal.v1` needed for this module unless engineering
  dispatch decides to instrument GitHub API quota usage.
- **Cluster B (Data Quality Gate):** Module 11 doesn't consume upstream
  data streams; data-quality halt does NOT apply. The module operates on
  GitHub state directly.
- **Cluster C (Mode behavior):** Module 11 is mode-agnostic (Pattern P1).
  Cleanup happens regardless of operator pipeline mode; the module isn't
  invoked in-pipeline.
- **Cluster D (Audit-Log Topics):** `self_renewal.branch_cleaned_up.v1` +
  `self_renewal.cleanup_failed.v1` topics added to Cluster D Deferred set
  per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 §2.1.0-Def. Ship in the
  same commit as Module 11's first runtime release.
- **Cluster E (Authority-Ceiling):** Module 11 writes to operator-owned
  GitHub repos using the App's `contents: write` permission. Per
  `SELF_RENEWAL_SPEC.md` §3.2 + `.github/flowai-app-manifest.yml` (commit
  `dbf7d87`), permission scope is minimum-necessary. Authority-ceiling check
  per Cluster E applies at admin on-demand invocation (admin role required);
  scheduled invocation runs under Inngest service identity, not gated by
  per-product ceiling (cleanup is operational not build-authority).
- **Cluster F (Model-Budget Fallback):** Module 11 doesn't invoke any LLM;
  Cluster F doesn't apply.

---

## §12 — Honest Capability Boundary

### §12.1 — What Module 11 does in Phase 11 (first build)

- List `flowai/renewal-*` branches on each operator-owned repo.
- Check age + open-PR status per branch.
- Delete branches meeting both criteria via GitHub App token.
- Write governance entry per delete.
- Emit cleanup-failed envelope on persistent failure.
- Operator opt-in / opt-out + retention tuning per product.

### §12.2 — Deferred to Phase 12+

- Cross-product parallelisation.
- Branch revival / restore path.
- Aggregate cleanup analytics dashboard (e.g. "X branches reaped this
  month across Y products").
- Cleanup of stale closed-PR comments / draft PRs as a separate sweep.

### §12.3 — What Module 11 CANNOT do — ever

- **Never deletes branches outside the `flowai/renewal-*` prefix.** Operator
  branches are NEVER candidates.
- **Never deletes a branch with an open PR**, regardless of age.
- **Never auto-merges OR auto-closes the PR itself.** Module 11 reaps only
  abandoned branches; PRs remain operator-controlled.
- **Never logs the GitHub App token** in any surface (per §5 invariant).
- **Never operates on non-operator-owned repos.** `ProductRegistry`
  `githubRepoOwner` + `githubRepoName` must resolve to an operator-attested
  repo per `SELF_RENEWAL_SPEC.md` §3.5; same allowlist rule applies to
  Module 11.

---

*End of `BRANCH_CLEANUP_SPEC.md` Module 11 spec. Pending W6 Panel ratification before W5a engineering dispatch.*
