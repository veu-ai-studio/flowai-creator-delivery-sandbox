# Job 11 — Defect Register Validation

**Sources checked:**
- `src/docs/w2/v3-defect-register.md` — present (canonical)
- `docs/w2/v3-defect-register.md` — **not present**

Only one copy exists, so there is no canonical-vs-stale divergence to reconcile. The frontmatter in the file claims `Owner path: /docs/w2/v3-defect-register.md` but the file lives under `src/docs/`. This is a metadata discrepancy.

---

## Per-defect status check

For each defect, the register declares a status (open/severity vs. RESOLVED). Below, "code reality" is the result of probing the filesystem and source for the artifacts the register claims exist or behaviors it claims have shipped.

| ID | Register status | Fix-sketch path / claim | Code reality | Verdict |
|---|---|---|---|---|
| D-001 | Open (High) | Add `idempotencyKey` to lifecycle events | No agent #1 source file exists (no `01-*.js`); `MessageSchema` `1.product.lifecycle_event.v1` payload validator is **absent** from `PAYLOAD_VALIDATORS` | **Confirmed open** |
| D-002 | Open (Critical) | Lifecycle awaits `system.clearance.decision.v1` before stage advance | Topic exists in `MessageSchema.TOPICS`, but no consumer agent file ships | **Confirmed open** |
| D-003 | Open (High) | SHA-256 in `2.build.completed.v1` | Topic exists, payload validator absent, no agent #2 file | **Confirmed open** |
| D-004 | Open (Medium) | Payload validator for `2.build.failed.v1` requiring `{phase, exitCode, stderr, retryable}` | No validator entry for `2.build.failed.v1` in `PAYLOAD_VALIDATORS` | **Confirmed open** |
| D-005 | Open (Critical) | Snapshot + rollback on failed apply | No agent #3 file | **Confirmed open** |
| D-006 | Open (Critical) | Remove minor-update bypass | No agent #3 file; `NO_GRANDFATHERING = true` in ScoreEvaluator (constant only, not yet enforced anywhere upstream) | **Confirmed open** |
| D-007 | Open (High) | Onboarding probes `adapter.getProviderSecret(...)` before activation | `CredentialAdapter.getProviderSecret` exists & rejects underscore providerIds; no agent #4 file consumes it | **Partial: adapter ready, agent missing** |
| D-008 | Open (Critical) | Subscribe to `4.provider.suspended.v1` before intake | Topic registered, no agent #5 file | **Confirmed open** |
| D-009 | RESOLVED IN PACKET 1 — files at `/src/lib/agents/06-research.js` and `/src/lib/agents/07-design.js` | **Files do NOT exist** (`src/lib/agents/` contains only `BaseAgent.js`, `MessageSchema.js`) | **Status DISAGREES with code** — register lies; defect is effectively still open |
| D-010 | Open (Critical) | ScoreEvaluator rejects self-audit by primary | `ScoreEvaluator.evaluate()` throws on agent #8 unless `auditOfAuditorMode: true` — verified by tests/scoreevaluator.test.js | **RESOLVED in code** — register status disagrees (says open) |
| D-011 | Open (High) | Single producer = `ScoreEvaluator.toDefectRegister()` | Static method exists and is exported; verified by tests | **RESOLVED in code** — register status disagrees |
| D-012 | Open (High) | `9.gtm.asset.v1` requires `draft: true`; guard rejects non-draft side effects | No payload validator for `9.gtm.asset.v1`; no agent #9 file | **Confirmed open** |
| D-013 | Open (Medium) | Validator requires `unit` on metric | `PAYLOAD_VALIDATORS['10.metric.v1']` requires `[surface, metric, value, unit]` — verified by tests | **RESOLVED in code** — register status disagrees |
| D-014 | Open (Critical), cross-WS W5 | `prevHash` audit-log helper at `/src/lib/shared/` | Only `CredentialAdapter.js` in `src/lib/shared/`; no audit-chain helper | **Confirmed open** |
| D-015 | RESOLVED IN PACKET 1 — `/src/lib/agents/AgentRegistry.js` delivered | **File does NOT exist** | **Status DISAGREES with code** — register lies; defect still open |
| D-016 | Open (Critical) | `BaseAgent.guard()` enforces declared authority before `act()` | `BaseAgent.guard(plan)` ships and rejects out-of-charter authority + RECOMMEND_ONLY side effects — verified by tests/authority-guard.test.js | **RESOLVED in code** — register status disagrees |
| D-017 | Open (High), cross-WS | #13 self-protection wave 3 | No agent #13 file | **Confirmed open** |
| D-018 | RESOLVED IN PACKET 1.5 — BaseAgent requires `environment` dep | `BaseAgent` constructor requires `environment` and validates against `productScope` — verified by tests/baseagent.test.js | **Confirmed RESOLVED** |
| X-001 | Open, owner W3 | Audit tooling consumes `validateEnvelope` | No `src/lib/audits/` directory — cross-WS | **N/A (W3 territory)** |
| X-002 | Open, owner W3 | Auditor-of-auditor instance | `auditOfAuditorMode` flag plumbed in ScoreEvaluator (W2 dependency satisfied); W3 instance not yet built | **W2 dependency satisfied; W3 still open** |
| X-003 | Open, owner W3 | Marketplace tools registry | Charters reference marketplace tools but no registry exists yet | **N/A (W3 territory)** |
| X-004 | Open, owner W1 | W1 credentials | `rdy.dependencies` evaluator must distinguish expected/missing — `CredentialAdapter` does so | **W2 dependency satisfied** |
| X-005 | Open, owner W5 | `prevHash` helper | Same as D-014; not present | **Confirmed open** |
| X-006 | RESOLVED IN PACKET 1.5 | `CredentialAdapter` at `/src/lib/shared/CredentialAdapter.js` | File present, exports correct, behaves as spec | **Confirmed RESOLVED** |

---

## Disagreements between register and code

### Register says RESOLVED, but code disagrees (false-positive resolutions)

1. **D-009** — Register: "RESOLVED IN PACKET 1. Stubs at `/src/lib/agents/06-research.js` and `/src/lib/agents/07-design.js`." → No such files. Stubs were never delivered.
2. **D-015** — Register: "RESOLVED IN PACKET 1. `/src/lib/agents/AgentRegistry.js` delivered." → No such file.

### Register says OPEN, but code shows the fix is in place (stale defect text)

3. **D-010** — ScoreEvaluator self-audit guard is in code and tested.
4. **D-011** — `ScoreEvaluator.toDefectRegister()` exists.
5. **D-013** — `unit` is required on `10.metric.v1`.
6. **D-016** — `BaseAgent.guard()` enforces authority.

These six entries should be reconciled in the next register update.

---

## Other observations

- The register's `Owner path: /docs/w2/v3-defect-register.md` is wrong; actual path is `src/docs/w2/v3-defect-register.md`.
- Packet 1 / Packet 1.5 file delivery claims should be verified at packet sign-off, not after the fact. The two false-positive resolutions (D-009, D-015) suggest the packet acceptance gate is not running.
- `NO_GRANDFATHERING = true` is exported from `ScoreEvaluator.js` but never imported or referenced by any consumer in the current tree, so D-006's enforcement claim ("no grandfathering") is symbolic only.
