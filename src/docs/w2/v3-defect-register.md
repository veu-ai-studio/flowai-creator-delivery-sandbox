# V3 DEFECT REGISTER — RECONSTRUCTED

**Status:** Reconstructed from first principles. Ratified by W0. Buffer/ContentGenius/ShopHub/BlogHub/NotionHub confirmed as v3 test apps, not VEU products.

**Authored by:** W2 (Backend Super Agents)  
**Owner path:** `/docs/w2/v3-defect-register.md`

**Scope:** Agent-side defects only. Defects in W3-owned audit tooling, W5 shared code, W4 GTM, or W1 credentials are flagged as cross-workstream and listed separately.

---

## AGENT-SIDE DEFECTS — W2-OWNED

### D-001 — Agent #1 Lifecycle Engine: gate transitions are not idempotent
**Severity:** High  
**Plausible test failure:** Repeated lifecycle calls advance the product surface multiple stages instead of confirming current stage.  
**Root cause hypothesis:** No idempotency key on stage-transition writes; concurrent invocations race.  
**Remediation owner:** W2  
**Fix sketch:** Add `idempotencyKey` to lifecycle event payloads; persist last-applied key per (product, gate) tuple; reject duplicates with current state echo.

### D-002 — Agent #1 Lifecycle Engine: gate evaluation does not consult #8 Quality Audit before advancing
**Severity:** Critical  
**Plausible test failure:** Product advances past a gate that should require a 95%+ clearance.  
**Root cause hypothesis:** Lifecycle never wired the Clearance Protocol check into its gate evaluator.  
**Remediation owner:** W2  
**Fix sketch:** Before any stage advance, publish `1.product.gate_request.v1`, await `system.clearance.decision.v1` for the target, only advance on `CLEAR`.

### D-003 — Agent #2 Code Builder: build artifacts are not signed or hash-pinned
**Severity:** High  
**Plausible test failure:** Self-Renewal applies an artifact that does not match the audited build.  
**Root cause hypothesis:** Builder emits `2.build.completed.v1` without artifact hash.  
**Remediation owner:** W2  
**Fix sketch:** Compute SHA-256 of artifact bundle, include in `2.build.completed.v1` payload; #3 Self-Renewal must verify hash before apply.

### D-004 — Agent #2 Code Builder: failed builds emit no diagnostic envelope
**Severity:** Medium  
**Plausible test failure:** Build failure produces an opaque error; downstream agents cannot determine whether to retry or escalate.  
**Root cause hypothesis:** `2.build.failed.v1` payload schema not enforced.  
**Remediation owner:** W2  
**Fix sketch:** Define payload validator for `2.build.failed.v1` requiring `{phase, exitCode, stderr, retryable: boolean}`. Enforce via MessageSchema.

### D-005 — Agent #3 Self-Renewal: no rollback path on failed apply
**Severity:** Critical  
**Plausible test failure:** A renewal partially applies, breaks the product surface, and the agent cannot revert.  
**Root cause hypothesis:** Renewal applies in place without a snapshot.  
**Remediation owner:** W2  
**Fix sketch:** Capture pre-apply snapshot (artifact hash + config hash); on apply failure, restore snapshot and emit `3.renewal.applied.v1` with `outcome: 'rolled_back'`.

### D-006 — Agent #3 Self-Renewal: bypasses Clearance gate on "minor" updates
**Severity:** Critical  
**Plausible test failure:** A self-applied update did not pass governance + readiness ≥95.  
**Root cause hypothesis:** Hard-coded "minor" classification skips the gate. No grandfathering means this must go.  
**Remediation owner:** W2  
**Fix sketch:** Remove minor-update bypass entirely. Every renewal goes through `system.clearance.decision.v1`. Per W0: no grandfathering.

### D-007 — Agent #4 Provider Onboarding: provider activation completes before all required credentials exist
**Severity:** High  
**Plausible test failure:** Provider receives an onboarded confirmation but their downstream agent calls fail with auth errors.  
**Root cause hypothesis:** Onboarding flow does not enforce W1 credential prerequisites.  
**Remediation owner:** W2 (with W1 contract dependency)  
**Fix sketch:** Define a `requiredCredentialsForProvider` predicate; onboarding cannot emit `4.provider.onboarded.v1` until W1 confirms all required credentials are present and authenticated.

### D-008 — Agent #5 End-Customer Intake: sub-org is provisioned without provider scope check
**Severity:** Critical  
**Plausible test failure:** A sub-org is created and attached to a provider that has been suspended (#4 emitted `4.provider.suspended.v1`).  
**Root cause hypothesis:** Intake does not subscribe to provider state; treats provider ID as static.  
**Remediation owner:** W2  
**Fix sketch:** Intake must check provider state at intake time; subscribe to `4.provider.suspended.v1` and reject pending intakes for suspended providers.

### D-009 — Agent #6 Research / #7 Design: net-new builds, escalated to Wave 1
**Severity:** Critical (blocking #2 Code Builder)  
**Plausible test failure:** Build pipeline executes without research brief or design spec consumed.  
**Status:** W0 ruling — treat as net-new. Build in Wave 1.  
**Remediation owner:** W2  
**Fix sketch:** Build minimal-viable agents emitting `6.research.brief.v1` and `7.design.spec.v1`. Wave 1 deliverable.

### D-010 — Agent #8 Quality Audit: self-audit problem (audit-of-the-auditor)
**Severity:** Critical  
**Plausible test failure:** #8 reports its own score as passing without an independent check.  
**Root cause hypothesis:** No second evaluator instance exists.  
**Remediation owner:** W3 builds the auditor-of-auditor (per W0 ruling); W2 implements `auditOfAuditorMode` recognition in the agent's prompt and state.  
**Fix sketch:** ScoreEvaluator (delivered) explicitly rejects self-audit by primary instance. W2 work: ensure #8's prompt and state machine route self-target to W3 endpoint.  
**Cross-workstream:** W3.

### D-011 — Agent #8 Quality Audit: defect register format not standardized
**Severity:** High  
**Plausible test failure:** Each audit run produces a differently-shaped defect register; remediation tracking is ad hoc.  
**Root cause hypothesis:** No canonical defect schema.  
**Remediation owner:** W2  
**Fix sketch:** Use `ScoreEvaluator.toDefectRegister()` (delivered) as the single producer of defect records. Deprecate any agent-local defect formats.

### D-012 — Agent #9 Go-To-Market: assets emitted as final, not draft
**Severity:** High  
**Plausible test failure:** A GTM asset is published externally without human review.  
**Root cause hypothesis:** Authority is implicit, not enforced; charter says draft-only but `9.gtm.asset.v1` does not carry a `draft: true` flag and downstream consumers do not check.  
**Remediation owner:** W2  
**Fix sketch:** Require `draft: true` on every `9.gtm.asset.v1` payload; only a human-gated promotion can flip it. Authority guard in BaseAgent will reject any plan from #9 declaring non-draft side effects.

### D-013 — Agent #10 Monitor: metric emission lacks unit field
**Severity:** Medium  
**Plausible test failure:** Downstream agents (#12, #18) misinterpret a metric (ms vs s, count vs rate).  
**Root cause hypothesis:** `10.metric.v1` payload missing `unit`.  
**Remediation owner:** W2  
**Fix sketch:** Payload validator (delivered in MessageSchema) now requires `unit`. Deprecate any unit-less emissions.

### D-014 — Audit log lacks tamper-evidence chain
**Severity:** Critical  
**Plausible test failure:** Audit replay produces inconsistent results across runs.  
**Root cause hypothesis:** Audit entries are appended without prior-entry hash chaining.  
**Remediation owner:** W2 (with W5 shared infra dependency for the hash-chain helper)  
**Fix sketch:** Each audit entry includes `prevHash`; chain validated at replay time. Helper lives in W5 (shared with W3 audit tooling).  
**Cross-workstream:** W5.

### D-015 — No canonical agent registry
**Severity:** High  
**Plausible test failure:** Orchestrator has agents the audit doesn't see, or vice versa.  
**Root cause hypothesis:** Roster is informal; multiple files declare agents independently.  
**Remediation owner:** W2  
**Fix sketch:** `BaseAgent.AGENT_IDS` (delivered) is the single source of truth. `AgentRegistry.js` (Packet 1) wires it into orchestrator.

### D-016 — Authority boundaries are conventional, not enforced
**Severity:** Critical  
**Plausible test failure:** A "recommend only" agent executes a side effect.  
**Root cause hypothesis:** No runtime guard.  
**Remediation owner:** W2  
**Fix sketch:** `BaseAgent.guard()` (delivered) enforces declared authority before `act()` runs. Existing agents must be migrated onto BaseAgent to inherit the guard.

### D-017 — IP protection baseline absent on at least one product surface
**Severity:** High  
**Plausible test failure:** Demo URL responds to scrapers without rate limiting or watermarking.  
**Root cause hypothesis:** Standard IP stack not deployed uniformly. Agent #13 not yet built.  
**Remediation owner:** W2 builds #13; W1 deploys edge config; W4 deploys public headers.  
**Fix sketch:** Per W0 charter for #13, deliver agent in Wave 3. Until then, products ship with W4-deployed headers + W1-deployed Cloudflare baseline as interim.  
**Cross-workstream:** W1, W4.

---

## CROSS-WORKSTREAM DEFECTS — FLAGGED, NOT W2-FIXED

### X-001 — Audit tooling does not validate against MessageSchema
**Owner:** W3  
**Symptom:** Audit accepts messages with unknown topics or invalid payloads.  
**W2 dependency:** W3 must consume `MessageSchema.validateEnvelope` or equivalent.

### X-002 — No auditor-of-auditor instance exists
**Owner:** W3  
**Symptom:** Agent #8 effectively self-audits.  
**W2 dependency:** ScoreEvaluator supports `auditOfAuditorMode: true`. W3 must instantiate and run it.

### X-003 — Marketplace tools required by Wave 1 agents not yet registered
**Owner:** W3  
**Symptom:** #11, #15, #17, #18 cannot reach 95% readiness without their marketplace tools.  
**W2 dependency:** Charter-declared `marketplaceTools` lists must be honored by W3 before audit.

### X-004 — W1 credentials for Wave 2 agents not procured
**Owner:** W1  
**Symptom:** #14, #19, #20, #12, #13 cannot reach 95% readiness without credentials.  
**W2 dependency:** Wave 2 build is gated on W1 procurement.

### X-005 — Shared `prevHash` audit-chain helper not in W5
**Owner:** W5 (W0)  
**Symptom:** Audit log not tamper-evident.  
**W2 dependency:** W2 will use the helper once it exists. Will not implement it locally.

---

## NEXT ACTIONS

1. Migrate agents #1, #2, #3 onto delivered BaseAgent. Closes D-016 and prerequisites for D-001 through D-006.
2. Wire MessageSchema payload validators into existing emit paths. Closes D-004, D-013.
3. Adopt ScoreEvaluator + clearanceDecision in #8 prompt and state. Closes D-006, D-011.
4. Build Wave 1 agents on BaseAgent from day one (#6, #7, #11, #15, #17, #18).