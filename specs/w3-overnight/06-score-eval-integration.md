# Job 6 — Score Evaluator Integration Check

`src/lib/governance/ScoreEvaluator.js` was read; not modified.

## Surface area exposed

- `CLEARANCE_THRESHOLD = 95` (line 13, `const`).
- `NO_GRANDFATHERING = true` (line 14, `const`).
- `TARGET_TYPES` = `agent | product | flowai`.
- `GOVERNANCE_RUBRIC_V1` — 7 criteria, weights summing to 100 (validated at module load, lines 139–144).
- `READINESS_RUBRIC_V1` — 6 criteria, weights summing to 100.
- `class ScoreEvaluator({ rubric, criterionEvaluators, deps, auditOfAuditorMode })` — constructor enforces an evaluator per criterion id and presence of `deps.logger`, `deps.clock`, `deps.messageBus`.
- `ScoreEvaluator.toDefectRegister(evaluation)` — static helper.
- `clearanceDecision(governanceEval, readinessEval)` — combiner.

## Integration points the engine expects from `src/lib/audits/*`

| # | Integration point | Required from W3 | Status today |
|---|---|---|---|
| 1 | `criterionEvaluators` for governance.v1 | A function per id: `gov.authority`, `gov.audit_completeness`, `gov.charter_contract`, `gov.message_schema`, `gov.ip_protection`, `gov.escalation`, `gov.secrets_hygiene`. Each `(target, ctx) -> { id, score 0–100, evidence: non-empty[], notes: string }`. | ❌ **Missing** — `src/lib/audits/` does not exist. |
| 2 | `criterionEvaluators` for readiness.v1 | `rdy.functional`, `rdy.failure_handling`, `rdy.performance`, `rdy.observability`, `rdy.documentation`, `rdy.dependencies`. | ❌ **Missing.** |
| 3 | `deps.logger` | Any `info/warn/error` shape. | ⚠️ **Stub** — `console` works; no shared concrete logger module ships under `src/lib/`. |
| 4 | `deps.clock` | `{ now(): number }` Unix ms. | ⚠️ **Stub** — trivial inline (`{ now: () => Date.now() }`); no shared module. |
| 5 | `deps.messageBus` | `publish({ topic, payload, from, at })` accepting `system.governance.score.v1`, `system.readiness.score.v1`, `system.clearance.decision.v1`. | ❌ **Missing** — no concrete `messageBus` exists in `src/lib/`. |
| 6 | MessageSchema topics + payload validators | `system.governance.score.v1`, `system.readiness.score.v1`, `system.clearance.decision.v1` with score-range validation. | ✅ **Built** — `MessageSchema.js` lines 100–144. |
| 7 | Audit-log replay store (`gov.audit_completeness`) | Reader over BaseAgent run records (`run.start`, `plan.ok`, `guard.ok`, `act.ok`, `run.error`) **with tamper-evidence chain (`prevHash`)**. | ❌ **Missing.** `BaseAgent.run()` writes phase entries via `auditLog.write(...)`, but no `auditLog.read()` exists. The chain helper is W5 territory per X-005 in `src/docs/w2/v3-defect-register.md` and is unbuilt. |
| 8 | Charter validator (`gov.charter_contract`) | Re-runs `BaseAgent._validateCharter` and compares declared `consumes/produces` to observed traffic. | ✅ **Validator exists** (`BaseAgent._validateCharter` lines 223–252). ❌ **Observed-traffic comparator missing.** |
| 9 | Message-schema replay (`gov.message_schema`) | Replays envelopes through `validateEnvelope` over an evaluation window. | ✅ **`validateEnvelope` exists** (`MessageSchema.js:161`). ❌ **Replay harness missing.** |
| 10 | IP-protection cross-checker (`gov.ip_protection`) | Agent #13 cross-check (robots.txt, X-Robots-Tag, rate limits, watermarking, DMCA). | ❌ **Missing.** Agent #13 surface absent. |
| 11 | Secrets-leakage scanner (`gov.secrets_hygiene`) | Walks logs/source/audit entries for credential leakage; verifies rotation events. | ❌ **Missing.** |
| 12 | Marketplace health-probe (`rdy.dependencies`) | Verifies every credential in `charter.requiredCredentials` and every tool in `charter.marketplaceTools` is present + responding. | ⚠️ **Partial.** `CredentialAdapter.probe(key)` exists for credentials. Marketplace-side probe missing (and `src/lib/marketplace/` itself missing). |
| 13 | Functional / failure / performance / observability / documentation collectors (`rdy.*` minus `rdy.dependencies`) | Per-target test runners + metric collectors. | ❌ **Missing.** No readiness collectors anywhere. |
| 14 | Auditor-of-auditor instance | Second `ScoreEvaluator` constructed with `auditOfAuditorMode: true` to evaluate Agent #8. | ❌ **Missing.** No call site instantiates `ScoreEvaluator` in either mode anywhere in `src/`. |
| 15 | Clearance gate driver | Composes governance + readiness → `clearanceDecision()` → publishes `system.clearance.decision.v1`. | ❌ **Missing.** `clearanceDecision()` has no caller. |
| 16 | Defect register sink | Consumer of `ScoreEvaluator.toDefectRegister(evaluation)` rows. | ❌ **Missing.** Helper exists; no consumer. |

## Built · Stub · Missing — quick summary

**✅ Built**

- `ScoreEvaluator` class, both rubrics, `clearanceDecision`, `toDefectRegister`.
- MessageSchema topics + payload validators for the three system-level events.
- `BaseAgent._validateCharter` (consumed by `gov.charter_contract`).
- `validateEnvelope` for replay-style message-schema checks.
- `CredentialAdapter` for partial `rdy.dependencies` (credentials only).

**⚠️ Stub-only / partial**

- `deps.logger`, `deps.clock` — trivial inline stubs work; no shared module.
- `auditOfAuditorMode` — the **flag** is wired into the engine constructor; the **module** that uses it does not exist.

**❌ Missing**

- `src/lib/audits/*` directory in entirety.
- 13 criterion evaluators (7 governance + 6 readiness).
- Concrete `messageBus`.
- Audit-log reader + tamper-evidence chain verification.
- Observed-traffic comparator vs. `charter.consumes/produces`.
- IP-protection cross-checker.
- Secrets-leakage scanner.
- Marketplace tool health-probe (and `src/lib/marketplace/` directory).
- Per-target functional/failure/performance/observability/documentation collectors.
- Auditor-of-auditor wiring.
- Clearance-gate driver and defect-register sink.

**Bottom line:** the engine is a finished W2 deliverable that today would throw `Missing evaluator for criterion "gov.authority"` on first construction in any caller — because zero W3 evaluators exist.
