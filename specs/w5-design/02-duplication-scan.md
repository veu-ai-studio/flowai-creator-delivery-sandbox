# 02 — Cross-Workstream Duplication Scan

**Generated:** 2026-05-07 · **Scope:** `src/`. **Goal:** Identify utility code duplicated across workstream territories that should be promoted to `src/lib/shared/` (W5).

## Workstream territory map (as observed)

| Workstream | Territory | Status |
| --- | --- | --- |
| W1 | Vault / Doppler credentials. Code interface = `CredentialAdapter` (currently in W5 territory; W1 spec lives at `/specs/w1-vault/architecture.md` per defect register). | Adapter only |
| W2 | Backend Super Agents. Code: `src/lib/agents/`, `src/lib/governance/`. Files present: `BaseAgent.js`, `MessageSchema.js`, `ScoreEvaluator.js`. | 3 files |
| W3 | Audits + marketplace. Code: `src/lib/audits/`, `src/lib/marketplace/`. **Both directories do not exist.** | 0 files |
| W4 | Front-end / orchestration glue / IP protection. Code: top-level `src/lib/*.{js,jsx}` + `src/pages/` + `src/components/`. | many files |
| W5 | Shared utilities. Code: `src/lib/shared/`. | 1 file (`CredentialAdapter.js`) |

> Because **W3 has no code on disk**, every pair involving W3 (W2+W3, W3+W4, W1+W3) is empty by construction. They are listed below for completeness but contain no findings.

---

## Pairwise scans

### Pair W1 + W2 — STRONG DUPLICATION

**Subjects:** `CredentialAdapter.js` (W1 contract) vs. `BaseAgent.js`, `MessageSchema.js`, `ScoreEvaluator.js` (W2).

| # | Pattern | W1 (CredentialAdapter.js) | W2 site | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Set of valid FlowAI envs (`{prod, staging}`) | line 32 (`VALID_FLOWAI_ENVS`) | `BaseAgent.js:74` (`FLOWAI_VALID_ENVS`) | Identical content. Promote. |
| 2 | Set of valid product envs (`{prod, staging, demo, live-demo, sales-demo}`) | line 33 (`VALID_PRODUCT_ENVS`) | `BaseAgent.js:75` (`PRODUCT_VALID_ENVS`) | Identical content. Promote. |
| 3 | Set of valid product scopes (`{flowai, saige, reltwin, reachsms, pressai, mypreglife}`) | line 34-36 (`VALID_PRODUCT_PROJECTS`) | `BaseAgent.js:57-64` (`PRODUCT_SCOPES`, object form) and `MessageSchema.js:15-17` (`VALID_PRODUCT_SCOPES`, set form) | Same six names declared three times. Promote. |
| 4 | `clock.now()` injection contract | line 61 (`opts.clock ?? { now: () => Date.now() }`) | `BaseAgent.js:84` (required dep, no default), `ScoreEvaluator.js:157-159` (required dep) | Same shape, different default policy. Promote shared `defaultClock`. |
| 5 | Slug-safe ID regex `/^[a-zA-Z0-9-]+$/` | line 29 (`ID_SLUG_RE`) | not present in W2 yet, but charter validation in `BaseAgent._validateCharter` will need it | Promote in anticipation. |
| 6 | Optional logger pattern (`logger?.warn?.(...)`) | line 158 | `MessageSchema.js`, `ScoreEvaluator.js`, `BaseAgent.js` all rely on `deps.logger` but never *call* it. | Idiom only; not a candidate. |
| 7 | `Object.freeze(new Set(...))` | not used (uses raw Set) | used at `BaseAgent.js:74-75` | Stylistic. Not a candidate. |

### Pair W2 + W3 — EMPTY

W3 has zero source files. No duplication possible. Forward-looking note: when W3 implements `auditOfAuditor` against `ScoreEvaluator`, it will need the same `clock` / `requireFields` / `mintId` / `prevHash` helpers — design these in W5 first.

### Pair W3 + W4 — EMPTY

W3 has zero source files. No duplication possible.

### Pair W2 + W4 — MODERATE DUPLICATION

**Subjects:** `BaseAgent.js`, `MessageSchema.js`, `ScoreEvaluator.js` (W2) vs. top-level `src/lib/*.{js,jsx}` and `src/pages/*.jsx` (W4).

| # | Pattern | W2 site | W4 site | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Audit-log entry construction (`{action_type, action_detail, timestamp, user, ...}`) | `BaseAgent.js:123-170` (writes to injected `auditLog.write`) | `auditLogger.js:7-17` (writes to `base44.entities.GovernanceAuditLog.create`); `contentProtection.js:65-71` (DevTools detection); `BaseAgentTest.jsx`, `ManualStep.jsx`, `CapabilityInstallSelfRenewal.jsx`, `CapabilityPackageSelfRenewal.jsx` (call `logAction`) | **Two parallel audit dialects.** W2 uses `{runId, phase, at}`; W4 uses `{action_type, action_detail, timestamp}`. The X-005 `prevHash` helper, when delivered, must work for both shapes (or W4 should migrate to W2 envelope shape). Flag for W0. |
| 2 | Random-suffix ID minting | `BaseAgent.js:217-221` (`run_${t}_${id}_${rand}`); `MessageSchema.js:190` (`msg_${at}_${rand}`); `MessageSchema.js:195` (`trace_${at}_${rand}`) | `JobContext.jsx:40` (`job_${Date.now()}_${rand}`); `contentProtection.js:80` (`Math.random().toString(36).slice(2) + Date.now().toString(36)` for session XOR key) | Same `Math.random().toString(36).slice(2, N)` + clock pattern in 5 places. **Promote to `mintId(prefix, clock, len)`.** |
| 3 | Wall-clock reads (`Date.now()`, `new Date().toISOString()`) | not direct (uses injected clock) | `flowExecutor.js` (5×), `flowSimulator.js` (7×), `jobRunners.js` (5×), `qaEngine.js` (1×), `JobContext.jsx`, `SessionContext.jsx`, `auditLogger.js`, `contentProtection.js` | W4 doesn't accept clock DI. **Not a near-term promotion target** — refactoring W4 to accept a clock is a much bigger ticket. Doc as known divergence. |
| 4 | Error throwing — `throw new Error(...)` | 23 occurrences in `BaseAgent.js` + `MessageSchema.js` + `ScoreEvaluator.js`, all plain `Error` with prefix string | many in W4 (`flowStore.jsx`, `OrchestrationContext.jsx`, `AuthContext.jsx`, etc.) all plain `Error` | No structured error types anywhere in either pair. **Promote shared error hierarchy** (job 08). |
| 5 | Validation — `typeof x !== 'string' \|\| x.length === 0` | `MessageSchema.js:147,162,170`; `ScoreEvaluator.js:265`; `BaseAgent.js:227,239,249` | `flowValidator.js:22,29,45`; `flowExecutor.js:66`; `flowSimulator.js:138`; `qaEngine.js:12,36,87` | Same idiom hand-rolled ~15 times. **Promote to `assertNonEmptyString` / `assertNonEmptyArray`.** |
| 6 | Optional-chained logger / silent failures | n/a | `auditLogger.js:18`, `contentProtection.js:71,127` (catch + swallow) | W4 swallows errors; W2 throws. Architectural difference, not duplication. Not a promotion target. |

### Pair W1 + W3 — EMPTY

W3 has zero source files.

### Pair W1 + W4 — WEAK / NONE

W4 does not consume `CredentialAdapter`. Only `auditLogger.js` and `contentProtection.js` reach for credentials, and they go directly through the Base44 client (`@/api/base44Client`). No utility duplication. (This is a cross-WS *gap*, not a duplication: W4's secret access bypasses W1's vault.)

---

## Promotion shortlist for W5

Ranked by reach (number of distinct call sites that benefit) × strength of duplication:

| Rank | Proposed module | Replaces / consolidates | Affected files |
| --- | --- | --- | --- |
| 1 | `src/lib/shared/scopes.js` | `VALID_FLOWAI_ENVS`, `VALID_PRODUCT_ENVS`, `VALID_PRODUCT_PROJECTS`, `VALID_PRODUCT_SCOPES`, `PRODUCT_SCOPES`, `ENVIRONMENTS`, `isValidEnvironmentForScope` | BaseAgent, MessageSchema, CredentialAdapter |
| 2 | `src/lib/shared/auditChain.js` (X-005) | New (no existing implementation). Threads `prevHash` across `auditLog.write`. | BaseAgent (today), W3 audits/* (future), W4 auditLogger.js (potentially) |
| 3 | `src/lib/shared/mintId.js` | `_mintRunId`, message-id and trace-id construction, JobContext id pattern, contentProtection session-key | BaseAgent, MessageSchema, JobContext, contentProtection |
| 4 | `src/lib/shared/validators.js` | `assertNonEmptyString`, `assertNonEmptyArray`, `assertSlugSafe`, `requireFields` | MessageSchema, ScoreEvaluator, BaseAgent, CredentialAdapter, flowValidator, qaEngine, flowExecutor |
| 5 | `src/lib/shared/defaultClock.js` | `{ now: () => Date.now() }` factory + `assertClock(deps)` | BaseAgent, ScoreEvaluator, CredentialAdapter |
| 6 | `src/lib/shared/errors.js` | Replace plain `Error` with `ConfigError` / `ValidationError` / `AuthorityError` / `ChainError` | every file currently throwing |
| 7 | `src/lib/shared/hashing.js` | New (no existing implementation). Browser-safe SHA-256 for X-005. | auditChain.js consumer |

## Cross-workstream call-out

- **X-005 (`prevHash` helper):** owed by W5 per defect register line 107. Not started. Designed in `03-prevhash-helper-spec.md`.
- **W4's audit dialect divergence:** `GovernanceAuditLog` entity uses `{action_type, action_detail, timestamp, user, session_id, product_url, outcome, mode, step_name}` — none of those fields appear in BaseAgent's audit calls. If X-005 is to apply repo-wide, W0 needs to decide: (a) W4 migrates to W2 envelope, or (b) `appendChained` accepts arbitrary entry shape and only chains the hash field. (b) is the lower-blast-radius design and is the recommendation in `07-hashing-spec.md`.
