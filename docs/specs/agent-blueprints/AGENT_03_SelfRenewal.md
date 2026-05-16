# Agent #3 — Self-Renewal — Build Blueprint

**Status:** SHIPPED-GREEN. Build blueprint authored 2026-05-16 as a reverse-engineered reference for the only SHIPPED agent without a blueprint in `docs/specs/agent-blueprints/`. Reflects code as it stands at the time of authoring; not a forward-looking design.
**Author:** W5a, 2026-05-16.
**Template:** mirrors `AGENT_06_Research.md` structure (W3 blueprint template, 2026-05-16).
**Anchor canonical:** Rev-2.1 §15.1 row 3 + §15.5 EXECUTOR_REGISTRY + §10 Self-Governance Layer + §12 Remediation Modes + Locked Rule 16 (sampled verification cadence).

---

## 1. Agent identity — split charter

Per CA-7 §15.5 (EXECUTOR_REGISTRY pattern) and CEO disposition Q2 = (b), Agent #3 is realised as **two sibling classes** sharing charter id `3`. The recommend_only primary is the canonical step-6 owner; the Executor is the elevated-authority sibling.

### 1.1 Recommend-only primary (`Agent3SelfRenewal`)

| Field | Value |
|---|---|
| ID | `3` |
| Name | `Self-Renewal` |
| Mode | `step-owner` |
| Step | **6 — `govern`** |
| Embedding | `embedded` |
| Authority | `[RECOMMEND_ONLY]` |
| File | `src/lib/agents/agents/Agent3SelfRenewal.js` (commit `68a0c75`) |
| OrchestratorHub `STEP_OWNERS` mapping | `govern: 3` |

The recommend-only primary is what the AutoRunner step-6 `govern` invocation routes to via `hub.invokeStepOwner('govern', ctx)`. It produces the `3.renewal.candidate.v1` envelope. No side effects beyond storage seams + pub/sub.

### 1.2 Executor sibling (`Agent3SelfRenewalExecutor`)

| Field | Value |
|---|---|
| `agentId` | `3` (same charter family) |
| EXECUTOR_REGISTRY key | `self-renewal-executor` |
| Name | `Self-Renewal Executor` |
| Mode | `cross-step` (does NOT compete with step-6 step-owner registration) |
| Embedding | `embedded` (id=3 is in `EMBEDDED_AGENTS` per `BaseAgent.js`) |
| Authority | `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` |
| File | `src/lib/agents/agents/Agent3SelfRenewalExecutor.js` (commit `176d870`) |
| Required credentials | `ANTHROPIC_API_KEY`, `VERCEL_TOKEN` |
| Marketplace tools | `claude-code`, `vercel` |

The Executor is invoked out-of-band by:

- `api/agent/3/execute.js` — sync HTTP endpoint (Path X per Self-Renewal spec)
- `api/_lib/inngest.js` `runAgent3RenewalJob` — async Inngest path (Path Y)
- `src/pages/AutoRunner.jsx` step-6 sync/async toggle (Path Q, fire-and-forget when async toggle is on)

Authority preservation per BaseAgent contract: each class declares ONE authority array. The recommend-only primary's array is `[RECOMMEND_ONLY]`; the Executor's is `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. Each passes `BaseAgent._validateCharter()` independently because both classes have `flowAiOnly: false` (matching `EMBEDDED_AGENTS` membership for id 3). The 25-ID partition validator is unaffected because executors live in `EXECUTOR_REGISTRY`, not `AGENT_REGISTRY`.

## 2. Perceive → Decide → Execute → Emit cycle

### 2.1 Recommend-only primary

- **Perceive:** receives `{ kind: 'renewal.request', runId, run_summary?, step_results? }` via `recommend(ctx)` (the OrchestratorHub step-owner entrypoint).
- **Decide:** runs five heuristics (`buildFailures`, `auditIssues`, `anomalySeverity`, `evolutionProposal`, `staleConfig`) over `(run_summary, step_results)`. Each heuristic returns `null` or a flag `{ area, severity: 'low'|'medium'|'high', reason }`. Confidence is a single-number function of `max(severity_rank)`: `high → 0.9 · medium → 0.6 · low → 0.4 · no flags → 0.2 · no signal → 0.0`.
- **Execute:** writes `renewal:run:{runId}` to HotStore (TTL 24h), appends a `govern / step.success` row to ColdStore (audit only).
- **Emit:** `3.renewal.candidate.v1` on MessageBus. Returns the canonical step-owner envelope `{ agent_id: 3, agent_name: 'Self-Renewal', mode: 'step-owner', step: 6, authority: 'recommend_only', recommendation, renewal_flags, confidence, metadata }`.

### 2.2 Executor (split charter)

- **Perceive:** receives `{ kind: 'renewal.execute', mode, issue, productScope, runId?, sourceHints? }`. `mode` is one of `'recommend_only'` or `'fork_and_fix'`.
- **Decide:** classifies `issue.severity` via `src/lib/agents/severity.js` (3-tier `critical | high | medium`). `recommend_only` mode short-circuits with the analytical envelope; `fork_and_fix` routes by tier.
- **Execute (mode = `fork_and_fix`, severity = `medium`):** checks 24h build-failure backoff (HotStore key `renewal:backoff:{productScope}` — disables fork_and_fix for 24h on 2 consecutive failures); dispatches `remediationEngine.remediate(...)` (W2's adapter, wired by commit `ad8cf2f`); runs sampled verification re-crawl per `src/lib/agents/verification.js` (every-Nth + monthly minimum per Locked Rule 16); emits `3.renewal.applied.v1` on success or `3.renewal.build_failed.v1` on failure.
- **Execute (mode = `fork_and_fix`, severity = `high` or `critical`):** short-circuits to Human Gate per Rev-2.1 §10.2 (`Approve | Modify | Skip`). Emits `3.renewal.candidate.v1` + a `humanGateNoticeId`. NEVER auto-deploys.
- **Emit (GovernanceAuditLog per Rev-2.1 §14):** `agent.execution` (entry/exit), `agent.fork` (fork_and_fix initiation), `agent.deploy` (deploy completion or failure). All audit topics carry `agentId: 3` + `executor: 'self-renewal-executor'`.

## 3. MessageBus topics

**Consumes (recommend-only primary):**
- `8.audit.completed.v1` — quality-audit output drives `auditIssues` heuristic
- `10.anomaly.v1` — monitor anomaly drives `anomalySeverity` heuristic
- `17.evolution.proposal.v1` — product-evolution proposal drives `evolutionProposal` heuristic

**Consumes (Executor):**
- `3.renewal.candidate.v1` (when run as subscriber rather than direct-call) — the primary's candidate envelope becomes the Executor's input

**Produces:**

| Topic | Producer | Payload (key fields) |
|---|---|---|
| `3.renewal.candidate.v1` | primary + Executor on gated path | `{ runId, flags, confidence, at }` |
| `3.renewal.applied.v1` | Executor on `fork_and_fix` success | `{ productScope, runId, renewedUrl, deploymentId, path, deployedAt }` |
| `3.renewal.delta.v1` | Executor after verification re-crawl | `{ productScope, runId, resolved, unresolved, regressions }` |
| `3.renewal.build_failed.v1` | Executor on remediation failure | `{ productScope, runId, reason, issueId, buildLog? }` |
| `3.renewal.disabled.v1` | Executor on backoff trip | `{ productScope, reason, backoffExpiresAt }` |
| `3.renewal.initiated.v1` / `.completed.v1` / `.failed.v1` / `.status.v1` | Executor (lifecycle) | per registration commit `20548c7` |

Topic schemas registered in `src/lib/agents/MessageSchema.js`.

## 4. Orchestra dispatch usage (per §15.4)

The Executor injects `remediationEngine` as a constructor dep. W2 wired the production `RemediationEngine` adapter at commit `ad8cf2f`. The adapter internally uses Orchestra capabilities:

```js
// inside remediationEngine.remediate(...)
orchestra.dispatch('code-patch', { issue, sourceHints }, opts);      // patch-existing-source path
orchestra.dispatch('generate-from-scratch', { spec }, opts);          // fallback path
orchestra.dispatch('deploy', { artifact, productScope }, opts);       // Vercel preview deployment
orchestra.dispatch('crawl', { url: renewedUrl }, opts);               // sampled verification re-crawl
```

The Executor itself does not call Orchestra directly — the abstraction boundary is `remediationEngine.remediate({issues, productScope, sourceHints})` returning `{ ok, path, renewedUrl, deploymentId, deployedAt, patchedFiles?, generatedFiles?, buildLog? }`. This keeps the Executor's surface stable when Orchestra evolves.

## 5. ToolMenu (per CA-11-B.2)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Claude Code | `claude-code` | high | `code-patch`, `generate-from-scratch` |
| 2 | Vercel | `vercel` | low | `deploy`, `source-retrieval` |
| 3 | Browserless | `browserless` | low | `crawl` (verification re-crawl) |
| 4 | Anthropic API direct | `anthropic-api` | high | `analyze`, `normalize` (verification re-crawl post-processing) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent3SelfRenewal.js              # 510 LOC — recommend_only primary (commit 68a0c75)
src/lib/agents/agents/Agent3SelfRenewalExecutor.js      # 660 LOC — split-charter Executor (commit 176d870)
src/lib/agents/severity.js                              # 3-tier helper (commit 176d870)
src/lib/agents/verification.js                          # sampled re-crawl helper (commit 176d870)
src/lib/agents/_registry.ts (EXECUTOR_REGISTRY section) # 'self-renewal-executor' entry (commit 176d870)
api/agent/3/execute.js                                  # sync endpoint Path X (commit 176d870)
api/_lib/inngest.js (runAgent3RenewalJob)               # async Inngest Path Y (commit 176d870)
api/renew.js                                            # renewal pipeline orchestrator (existing — wraps renewalEngine.renew())
api/_lib/renewalEngine.js                               # the actual renewal mechanic (W2 territory)
api/_lib/beforeAfterReport.js                           # produces deltaScore {before, after} via scoreFromIssues
tests/agents/agent-3-self-renewal.test.js               # primary tests (pre-existing)
tests/agents/agent-3-self-renewal-executor.test.js      # Executor tests (38 tests, commit 176d870)
tests/renewal/beforeAfterReport.test.js                 # asserts deltaScore numerics (pre-existing)
```

## 7. Pre / Post score delta — current state

The renewal pipeline emits `report.deltaScore = { before, after }` per `api/_lib/beforeAfterReport.js` lines 74-75 + 99. The scores are derived by `scoreFromIssues(issueList)` in `api/_lib/issueDetector.js` — they are **issue-count-derived** scores, not the 5-dimension 95/95 scoring engine output. The Pre/Post delta is REAL in the issue-count sense but is NOT a call into the canonical 5-dimension scoring engine. Wiring the canonical scoring engine into the Pre/Post loop is a future dispatch (W2 currently owns the scoring engine implementation; the interface contract for the Pre/Post invocation is not yet stable).

## 8. Capability boundary (the HONEST scope)

What Agent #3 + the renewal pipeline can do TODAY (commits `68a0c75` + `176d870` + `ad8cf2f` + the existing api/renew.js):

- **Produce a NEW reachable URL** via Orchestra → Vercel preview deployment, when:
  - The input is a URL/description/content artifact FlowAI can re-synthesize into a new Vite-React site, OR
  - The input is a URL whose source FlowAI can acquire via `sourceAcquisition` (gitUrl + Vercel project hint) and patch via Claude Code
- **Severity-gated auto-deploy**: only `medium` severity issues auto-deploy; `high` and `critical` route to Human Gate per Rev-2.1 §10.2 (`Approve | Modify | Skip`)
- **Sampled verification re-crawl**: every Nth fork_and_fix verifies the renewed URL via a fresh crawl + issueDetector pass (with monthly minimum per Locked Rule 16)
- **Build-failure backoff**: 2 consecutive build failures within 24h on the same `productScope` disables fork_and_fix for 24h and emits `3.renewal.disabled.v1`
- **Authority preservation**: the recommend_only primary stays at `[RECOMMEND_ONLY]`; only the Executor (`[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`) writes side effects, and only on `mode = 'fork_and_fix'` with severity `medium`

What it CANNOT do:

- **Redeploy arbitrary third-party apps.** The "renewed URL" is a FlowAI-owned Vercel preview deployment of a re-synthesized or patched build, NOT a push to the original product's hosting. The dispatch's "fork-and-fix" name reflects this — we fork the artifact, fix it, and deploy a NEW URL.
- **Auto-deploy `high`/`critical` severity issues.** These ALWAYS route to Human Gate regardless of mode.
- **Patch source we cannot acquire.** When `sourceAcquisition` cannot retrieve the original source (no gitUrl, no Vercel project hint, no Base44 project), the path is `generate-from-scratch` — a fresh Vite-React skeleton seeded from the input artifact, not a patched copy of the original.
- **Call the canonical 5-dimension 95/95 scoring engine.** The current `deltaScore` is derived from issue counts; wiring the canonical scoring engine into the Pre/Post loop is a future dispatch.
- **Operate without explicit graduation flags.** The Executor's `fork_and_fix` mode requires explicit invocation; the AutoRunner step-6 toggle is OFF by default. No unguarded live deploys.

## 9. Test surface

- `tests/agents/agent-3-self-renewal.test.js` — primary recommend-only behavior, charter integrity, MessageBus subscription, browser-bundle posture (no node:crypto)
- `tests/agents/agent-3-self-renewal-executor.test.js` (38 tests, commit `176d870`) — severity routing, fork_and_fix happy path, gate paths, build-failure backoff, verification sampling, audit-log emission, endpoint validation (T-E1..T-E4), Inngest job path
- `tests/renewal/beforeAfterReport.test.js` — asserts `deltaScore.before` and `deltaScore.after` are numerical; asserts patched-issue categories are removed from the after list
- `tests/renewal/urlAdapter.test.js` — adaptUrl Claude-normalisation + heuristic fallback + zero-rendered-pages handling

## 10. Open extensions (NOT in current scope)

- Pre/Post call into the canonical 5-dimension 95/95 scoring engine — requires stabilising the scoring-engine interface contract (W2 in flight)
- Code-generation-as-PR mode (`mode (ii)` per spec §2.1) — defer per CEO Q1 = (a)
- Direct-write to user's source (`mode (iii)`) — defer per CEO Q1 = (a)
- Inngest job status polling endpoint `/api/agent/3/status?jobId=` — referenced in execute.js hints, not yet implemented

---

*End of Agent #3 reverse-engineered blueprint. Reflects code as it stands at 2026-05-16 across commits `68a0c75` (primary), `176d870` (Executor + endpoints + tests), and `ad8cf2f` (W2 RemediationEngine wire-in).*
