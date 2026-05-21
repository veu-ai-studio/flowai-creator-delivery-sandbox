# SSOT Claim-to-Runtime Traceability Matrix

**Generated:** 2026-05-21T21:16:42Z
**HEAD commit:** `aeff00e4abde1014bb4025cd63c90897715a9d10`
**Branch:** `flowai-v0.1`
**Governance status:** `PROPOSED_GOVERNANCE`
**Panel artifact:** `UNAVAILABLE` (no traceability-matrix Panel ratification artifact found in `docs/panel-consultations/`)
**Companion sidecar:** [`SSOT_TRACEABILITY_MATRIX.sidecar.json`](./SSOT_TRACEABILITY_MATRIX.sidecar.json)
**Checker:** [`scripts/check-ssot-traceability.mjs`](../../scripts/check-ssot-traceability.mjs)

---

## §1 — Purpose

This matrix is the canonical ledger that prevents collective hallucination across Claude (Execution Orchestrator), GPT (Strategic Integrity), Codex (Adversarial Technical Review), and Claude Code (Implementation Engine). It records which SSOT claims are backed by code, tests, runtime output, or governance artifacts — and which are not.

**Core principle.** No claim is `VERIFIED` because an AI said so. A claim is `VERIFIED` only when backed by artifacts appropriate to its `verificationType`. Production-facing claims with deployment drift, or runtime claims without runtime artifacts, are `PARTIAL` at best.

**Scope constraint.** This document is **VERIFICATION ONLY**. It does not add product features, modify orchestrator behavior, change UI components, expand architecture, implement remediation, or create new agents. If a claim is `NOT_IMPLEMENTED`, the matrix records it. A separate dispatch fixes it.

---

## §2 — Schema

### §2.1 Core fields

| Field | Type | Definition |
|---|---|---|
| `claimId` | string | Unique identifier (e.g. `CA18-URL-ANY`) |
| `ssotSource` | string | Source file + section |
| `claimText` | string | Verbatim SSOT claim |
| `runtimeExpectation` | string | What production should demonstrate |
| `implementationFiles` | string[] | Code files implementing the claim |
| `testFiles` | string[] | Tests verifying the claim |
| `runtimeEvidence` | string[] | Run logs, screenshots, deploy verifications |
| `governanceEvidence` | string[] | CA-N entries, panel records, audit reports |
| `status` | enum | `VERIFIED` / `PARTIAL` / `STUBBED` / `SIMULATED` / `NOT_IMPLEMENTED` / `DEFERRED` / `UNKNOWN` |
| `confidence` | enum | `HIGH` / `MEDIUM` / `LOW` |
| `gaps` | string[] | Description of what is missing |
| `nextAction` | string | Action to advance status |

### §2.2 Scope + freshness fields

| Field | Type | Definition |
|---|---|---|
| `scope` | enum | `BRANCH_ONLY` / `PRODUCTION` / `GOVERNANCE` / `EXPERIMENTAL` |
| `lastVerifiedAt` | ISO-8601 | Wall-clock time of last verification |
| `verifiedAgainstCommit` | string | Commit hash at verification |
| `verifiedAgainstDeployment` | string \| null | Production URL or deployment ID |
| `evidenceFreshness` | enum | `CURRENT` (<7d) / `RECENT` (<30d) / `STALE` (>30d) / `UNKNOWN` |

### §2.3 Evidence-quality fields

| Field | Type | Definition |
|---|---|---|
| `verificationType` | enum | `UNIT_TEST` / `INTEGRATION_TEST` / `LIVE_RUNTIME` / `GOVERNANCE_RECORD` / `MANUAL_INSPECTION` / `DEPLOYMENT_EVIDENCE` |
| `runtimeArtifactRequired` | boolean | `true` for production-facing claims; `false` for governance-only claims |

### §2.4 Risk + contradictions

| Field | Type | Definition |
|---|---|---|
| `operationalSeverity` | enum | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |
| `contradictions` | object[] | Flags conflicting evidence (e.g. branch has fix but production does not) |
| `isNegativeControl` | boolean | `true` only for intentional false-claim rows (e.g. claim 11); exempts from checker failure |

### §2.5 Evidence rules by `verificationType`

- `LIVE_RUNTIME`: runtime artifacts required for `VERIFIED`.
- `UNIT_TEST` / `INTEGRATION_TEST`: tests + implementation required.
- `GOVERNANCE_RECORD`: governance artifacts sufficient for `VERIFIED`.
- `DEPLOYMENT_EVIDENCE`: deployment proof required.
- `MANUAL_INSPECTION`: inspector identity + timestamp required.

`VERIFIED` MUST have evidence appropriate to its `verificationType`. Governance-only `VERIFIED` rows MAY rely on governance evidence alone.

---

## §3 — Claims (n=11; 10 real + 1 negative control)

The full machine-readable per-claim record (with `implementationFiles`, `testFiles`, `runtimeEvidence`, `governanceEvidence`, `gaps`, `contradictions`, `nextAction`) is in [`SSOT_TRACEABILITY_MATRIX.sidecar.json`](./SSOT_TRACEABILITY_MATRIX.sidecar.json). The table below summarizes status; consult the sidecar for evidence.

| # | claimId | Status | Confidence | Severity | Scope | verificationType | runtimeArtifactRequired | Negative control |
|---|---|---|---|---|---|---|---|---|
| 1 | `CA18-URL-ANY` | `PARTIAL` | `MEDIUM` | `CRITICAL` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 2 | `CA18-HONEST-URL` | `PARTIAL` | `MEDIUM` | `HIGH` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 3 | `CA18-WEIGHTED-SCORE` | `PARTIAL` | `MEDIUM` | `HIGH` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 4 | `CA18-DIMENSION-DISCLOSURE` | `PARTIAL` | `MEDIUM` | `MEDIUM` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 5 | `CA18-EVAL-PIPELINE` | `PARTIAL` | `LOW` | `HIGH` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 6 | `CA18-DELTA-VERIFY` | `PARTIAL` | `MEDIUM` | `MEDIUM` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 7 | `CA18-REMEDIATION-SAFETY` | `PARTIAL` | `LOW` | `HIGH` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 8 | `CA18-UNIVERSAL-LIMIT` | `PARTIAL` | `HIGH` | `CRITICAL` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 9 | `CA18-AUDIT-TRAIL` | `PARTIAL` | `MEDIUM` | `HIGH` | `GOVERNANCE` | `GOVERNANCE_RECORD` | false | false |
| 10 | `CA18-DEPLOY-TRUTH` | `NOT_IMPLEMENTED` | `HIGH` | `CRITICAL` | `PRODUCTION` | `DEPLOYMENT_EVIDENCE` | true | false |
| 11 | `FALSE-CLAIM-AUTONOMOUS-DEPLOY` | `NOT_IMPLEMENTED` | `HIGH` | `CRITICAL` | `GOVERNANCE` | `MANUAL_INSPECTION` | false | **true** |

---

## §4 — Honest summary

- `VERIFIED`: **0**
- `PARTIAL`: **9**
- `STUBBED`: **0**
- `SIMULATED`: **0**
- `NOT_IMPLEMENTED`: **2** (claim 10 = real gap; claim 11 = negative control, intentional)
- `DEFERRED`: **0**
- `UNKNOWN`: **0**
- Negative controls: **1**
- Critical-severity non-VERIFIED (excluding negative controls): **3** — claims 1, 8, 10

**Why no `VERIFIED` rows.** Eight of the 10 real claims have solid implementation evidence and branch-level test/smoke evidence, but per §2.5 evidence rules + the dispatch's strict reading (LIVE_RUNTIME claims require runtime artifacts; production-facing claims need production evidence to be `VERIFIED`, not just branch-level smoke output), they advance to `PARTIAL` only. Promoting any of them to `VERIFIED` requires a live production run with the corresponding artifact (e.g. governance_record export, prod live-URL log with effectiveTrustScore, deployment-commit verification).

**Critical gaps.**

1. **`CA18-DEPLOY-TRUTH` is `NOT_IMPLEMENTED`** (claim 10, CRITICAL). No code path was found that verifies the deployed production commit matches HEAD or discloses drift. This is a hard gap that the matrix is designed to surface — a separate dispatch must fix this.
2. **`CA18-EVAL-PIPELINE` is `PARTIAL` LOW confidence** (claim 5, HIGH). All four evaluators are wired but the per-finding `evaluator_id` field is missing from `findingNormalizer.js`; findings carry `source` + `evaluatorVersion` but not a unique evaluator-id as the CA-18 claim implies.
3. **`CA18-REMEDIATION-SAFETY` is `PARTIAL` LOW confidence** (claim 7, HIGH). Rate-cap and remediation engine exist, but registry, explicit confidence threshold constants, and rollback invocation are not canonically documented.

**Negative control fires correctly.** Claim 11 (`FALSE-CLAIM-AUTONOMOUS-DEPLOY`) records as `NOT_IMPLEMENTED` with `isNegativeControl: true` and HIGH confidence. The grep+citation in `src/lib/agents/renewal/githubPrWriter.js:11-12` proves the `/merge` string appears only in comments documenting the prohibition. This row demonstrates the matrix correctly rejects false-capability claims.

---

## §5 — Companion files

| File | Purpose |
|---|---|
| `docs/specs/SSOT_TRACEABILITY_MATRIX.sidecar.json` | Machine-readable claim records |
| `scripts/check-ssot-traceability.mjs` | Schema + evidence-rule checker; exits 1 on failure, prints summary |

---

## §6 — Operating discipline going forward

1. When any claim's underlying evidence changes (new test, new prod run, new audit), update the sidecar row's `lastVerifiedAt`, `verifiedAgainstCommit`, and `evidenceFreshness`.
2. When a production deploy occurs, update `productionCommit` at the top of the sidecar and re-run the checker.
3. When a claim is found to be false, immediately mark its row appropriately (`SIMULATED` for fabricated outputs; `NOT_IMPLEMENTED` if no implementation; `PARTIAL` if partial) — do NOT delete the row.
4. `VERIFIED` is a future-state target, not a default. Status changes flow forward through evidence, not backward through edits.
5. The matrix is `PROPOSED_GOVERNANCE` until a Panel ratification artifact promotes it to `RATIFIED_GOVERNANCE`. Until then, it has the force of a working agreement, not canonical authority.

---

*End of SSOT Traceability Matrix v1. Generated 2026-05-21 from HEAD `aeff00e`. No product code changes accompany this document.*
