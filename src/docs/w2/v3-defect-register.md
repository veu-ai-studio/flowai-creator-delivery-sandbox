# V3 DEFECT REGISTER — Packet 1.5

**Status:** Reconstructed from first principles. Ratified by W0. Canonical `/src/lib/*` paths. Packet 1.5 BaseAgent amendment included.

**Owner path:** `/docs/w2/v3-defect-register.md`

**Scope:** Agent-side defects only. Cross-workstream defects flagged separately.

---

## AGENT-SIDE DEFECTS — W2-OWNED

### D-001 — Agent #1 Lifecycle Engine: gate transitions are not idempotent
**Severity:** High  
**Fix sketch:** Add `idempotencyKey` to lifecycle event payloads; persist last-applied key per (product, gate) tuple; reject duplicates.

### D-002 — Agent #1 Lifecycle Engine: gate evaluation does not consult #8 Quality Audit
**Severity:** Critical  
**Fix sketch:** Before any stage advance, publish `1.product.gate_request.v1`, await `system.clearance.decision.v1`, only advance on `CLEAR`.

### D-003 — Agent #2 Code Builder: build artifacts not signed or hash-pinned
**Severity:** High  
**Fix sketch:** Compute SHA-256 of artifact; include in `2.build.completed.v1`; #3 verifies hash before apply.

### D-004 — Agent #2 Code Builder: failed builds emit no diagnostic envelope
**Severity:** Medium  
**Fix sketch:** Payload validator for `2.build.failed.v1` requiring `{phase, exitCode, stderr, retryable: boolean}`.

### D-005 — Agent #3 Self-Renewal: no rollback path on failed apply
**Severity:** Critical  
**Fix sketch:** Capture pre-apply snapshot; on failure, restore and emit `3.renewal.applied.v1` with `outcome: 'rolled_back'`.

### D-006 — Agent #3 Self-Renewal: bypasses Clearance gate on "minor" updates
**Severity:** Critical  
**Fix sketch:** Remove minor-update bypass entirely. No grandfathering per W0.

### D-007 — Agent #4 Provider Onboarding: provider activation completes before credentials exist
**Severity:** High  
**Fix sketch:** Onboarding probes `adapter.getProviderSecret(providerId, 'API_KEY')` before emitting `4.provider.onboarded.v1`. Provider IDs must be slug-safe.

### D-008 — Agent #5 End-Customer Intake: sub-org provisioned without provider scope check
**Severity:** Critical  
**Fix sketch:** Subscribe to `4.provider.suspended.v1`; reject pending intakes for suspended providers. Customer IDs must be slug-safe.

### D-009 — Agent #6 Research / #7 Design: net-new builds, escalated to Wave 1
**Status:** REOPENED 2026-05-07. Falsely resolved per W2 Part 1 audit — the claimed stub files at `/src/lib/agents/06-research.js` and `/src/lib/agents/07-design.js` did not exist on disk. Reopened by W2 Part 2 build. Status: in-progress on `feature/agents-overnight` branch.
**Original status (false):** RESOLVED IN PACKET 1. Stubs at `/src/lib/agents/06-research.js` and `/src/lib/agents/07-design.js`.

### D-010 — Agent #8 Quality Audit: self-audit problem
**Severity:** Critical  
**Fix sketch:** ScoreEvaluator at `/src/lib/governance/ScoreEvaluator.js` rejects self-audit by primary instance. W3 builds auditor-of-auditor.  
**Cross-workstream:** W3.

### D-011 — Agent #8 Quality Audit: defect register format not standardized
**Severity:** High  
**Fix sketch:** Use `ScoreEvaluator.toDefectRegister()` as single producer.

### D-012 — Agent #9 Go-To-Market: assets emitted as final, not draft
**Severity:** High  
**Fix sketch:** Require `draft: true` on every `9.gtm.asset.v1`. Authority guard rejects non-draft side effects.

### D-013 — Agent #10 Monitor: metric emission lacks unit field
**Severity:** Medium  
**Fix sketch:** Payload validator in `/src/lib/agents/MessageSchema.js` requires `unit`.

### D-014 — Audit log lacks tamper-evidence chain
**Severity:** Critical  
**Fix sketch:** Each entry includes `prevHash`. Helper at `/src/lib/shared/` (W5).  
**Cross-workstream:** W5.

### D-015 — No canonical agent registry
**Status:** REOPENED 2026-05-07. Falsely resolved per W2 Part 1 audit — `/src/lib/agents/AgentRegistry.js` did not exist on disk. Reopened by W2 Part 2 build. Status: in-progress on `feature/agents-overnight` branch.
**Original status (false):** RESOLVED IN PACKET 1. `/src/lib/agents/AgentRegistry.js` delivered.

### D-016 — Authority boundaries conventional, not enforced
**Severity:** Critical  
**Fix sketch:** `BaseAgent.guard()` enforces declared authority before `act()` runs.

### D-017 — IP protection baseline absent on at least one product surface
**Severity:** High  
**Fix sketch:** #13 Self-Protection Wave 3 build. Interim: W4 headers + W1 Cloudflare baseline.  
**Cross-workstream:** W1, W4.

### D-018 — BaseAgent did not require `environment` dep [Packet 1.5]
**Status:** RESOLVED IN PACKET 1.5.  
**Fix delivered:** BaseAgent.js requires `environment` dep, validated against productScope. FlowAI accepts prod|staging; products accept prod|staging|demo|live-demo|sales-demo.  
**Migration impact:** All callers constructing agents must pass `environment`.

---

## CROSS-WORKSTREAM DEFECTS — FLAGGED, NOT W2-FIXED

### X-001 — Audit tooling does not validate against MessageSchema
**Owner:** W3 — `/src/lib/audits/*`  
**W2 dependency:** W3 must consume `validateEnvelope` from `/src/lib/agents/MessageSchema.js`.

### X-002 — No auditor-of-auditor instance exists
**Owner:** W3 — `/src/lib/audits/*`  
**W2 dependency:** ScoreEvaluator supports `auditOfAuditorMode: true`.

### X-003 — Marketplace tools required by Wave 1 agents not yet registered
**Owner:** W3  
**W2 dependency:** Charter `marketplaceTools` lists must be honored before audit.

### X-004 — W1 credentials not procured
**Owner:** W1. Vault: Doppler. Specs at `/specs/w1-vault/architecture.md` and `/specs/w1-credentials/credential-inventory.md`.  
**W2 dependency:** `rdy.dependencies` evaluator distinguishes `expected` from `missing`. Auto-rises 70 → 100 when W1 wires keys.

### X-005 — Shared `prevHash` audit-chain helper not in W5
**Owner:** W5 — `/src/lib/shared/*`  
**W2 dependency:** W2 uses helper once it exists. Will not implement locally.

### X-006 — CredentialAdapter is W5-territory; W2 authored as spec [Packet 1.5]
**Status:** Spec authored by W2, ratified by W0, placed at `/src/lib/shared/CredentialAdapter.js`.  
**W2 dependency:** Wave 1.5 wiring of #11/#15/#18 reads through this adapter.

---

## PACKET 1.5 STATUS

Files delivered:
- `agents/BaseAgent.js` — AMENDED: adds `environment` dep with scope-aware validation
- `shared/CredentialAdapter.js` — Doppler-aware, structured paths per W0 rulings 1A/2A/3B
- `docs/w2/v3-defect-register.md` — UPDATED: this document, adds D-018 and X-006

Wave 1.5 readiness: When W1 reports Doppler keys live, `rdy.dependencies` auto-detects via `adapter.probe(key)` and #11/#15/#18 readiness scores rise from ~90 to 100 without agent code change.