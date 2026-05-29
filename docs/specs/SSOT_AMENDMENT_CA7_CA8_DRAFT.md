# SSOT Amendment Draft — CA-7 + CA-8 (Combined)

**Status:** DRAFT — pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).
**Author:** W3, 2026-05-15.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` Rev-2.1 (commit `9495b26`).
**Target sections amended:** §15 (CA-7), §20 (CA-8); ripple impact on §14 (CA-7 mitigation M2).
**Lineage:**
- CA-7 source: `docs/panel-consultations/executor-registry-pattern-ratification-2026-05-14.md` (W6 Run 2, quorum met 10/10 LIVE-OK, 7/10 ENGAGED). EXECUTOR_REGISTRY pattern introduced by W5a commit `176d870` (Agent #3 graduation Phase 1.3). Shipped form verified in `src/lib/agents/_registry.ts` lines 573–664 (`ExecutorRecord` interface, `EXECUTOR_REGISTRY` constant, `getExecutor()` / `listExecutors()` + independent `validateExecutors()` self-check at module load).
- CA-8 source: `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9.1 (`8eaf44c`); follow-up flagged in test plan §15. W5c commit `0bd26b9` shipped X-Test-Bypass-Token issuance + verification + Self-Protection middleware with a Doppler key naming pattern that diverges from the test-plan-text. Per Locked Rule 1 (code wins), the shipped form is canonical; CA-8 documents it and amends §20 to canonicalise the contract.

**Why combined:** CA-7 + CA-8 both extend canonical sections (§15 and §20) without contradicting each other or any other section. They are bundled to reduce CA-n cycle overhead and to give Panel + CEO a single ratification decision against the same Rev-2.1 anchor.

---

## CA-7 — Add §15.5 EXECUTOR_REGISTRY Section

### CA-7.1 Background

The Self-Renewal Agent #3 graduation (CEO Q2 = `(b)` SPLIT charter, 2026-05-14) required a registry slice that holds executor charters whose authority profile (`auto_write_internal` + `requires_human_gate`) is incompatible with the canonical RECOMMEND_ONLY-dominant 25-agent partition. W5a implemented the pattern in commit `176d870` as a **sibling namespace** — a separate constant `EXECUTOR_REGISTRY` next to `AGENT_REGISTRY` in `src/lib/agents/_registry.ts`, with its own validator + lookup function (`getExecutor()`) + independent self-check (`validateExecutors()`). The 25-ID partition and single-authority-per-charter invariants are preserved because executors never enter `AGENT_REGISTRY`, never collide with `BY_ID`, and never affect `validateRoster()`.

W6 Run 2 (2026-05-14T23:27:05Z, commit hash documented in consultation file) ratified the pattern:

| Q | Topic | ENGAGED | Top | Verdict |
|---|---|---:|---|---|
| Q1 | Ratify EXECUTOR_REGISTRY as canonical pattern for split-charter agents | 7 | (a) ratify as canonical | `PLURALITY_(a)` 6/7 |
| Q2 | SSOT Rev-2.1 amendment to formally document EXECUTOR_REGISTRY in §15 | 7 | (a) yes, propose CA-N in same cycle | `UNANIMOUS_(a)` 7/7 |
| Q3 | Architectural risks with dual-registry pattern | 7 | (b) risks identified; specify mitigations | `PLURALITY_(b)` 6/7 |

Q2 is `UNANIMOUS_(a)` — this CA-7 implements that unanimous Panel-direction to formally document the pattern. Q1 + Q3 (PLURALITY each, below 7/10 supermajority bar) are surfaced as CEO-disposition items in §CA-7.5 below.

### CA-7.2 Proposed amendment to §15 (verbatim insertion)

Insert the following new sub-section **§15.5 EXECUTOR_REGISTRY (split-charter sibling namespace)** after the existing §15.4 Agent → Orchestra wiring sub-section:

```md
### 15.5 EXECUTOR_REGISTRY (split-charter sibling namespace)

The **EXECUTOR_REGISTRY** is a sibling namespace to `AGENT_REGISTRY` in
`src/lib/agents/_registry.ts`. It holds charters for **executors** —
elevated-authority counterparts to existing primary agents whose authority
profile would otherwise break the canonical RECOMMEND_ONLY-dominant
25-agent partition (per §25 Locked Rule 2). Executors share a charter id
with a primary agent (e.g. id=3 for the Self-Renewal Executor) but carry
distinct `mode` and `authority` arrays.

**Why a sibling namespace (and not an extension of AGENT_REGISTRY):**

- The 25-ID partition + single-authority-per-charter invariant in
  `BaseAgent.js` are preserved because executors never enter
  `AGENT_REGISTRY`, never collide with `BY_ID`, and never affect
  `validateRoster()`.
- Putting executors inside `AGENT_REGISTRY` would either duplicate id=3
  (violating partition uniqueness) or expand the roster to 26+ (violating
  Locked Rule 2).
- The sibling namespace + independent validator + `getExecutor()` lookup
  is the canonical pattern for any future split-charter agent
  (CEO disposition Q2 = (b) SPLIT, 2026-05-14; W6 Run 2 ratification
  2026-05-14T23:27:05Z).

**Canonical type contract** (per `src/lib/agents/_registry.ts`):

```ts
export interface ExecutorRecord {
  readonly key: string;                       // unique identifier within EXECUTOR_REGISTRY
  readonly agentId: number;                   // the primary agent this executor extends (1..25)
  readonly name: string;                      // human label, e.g. "Self-Renewal Executor"
  readonly mode: 'cross-step';                // executors MUST declare 'cross-step' (never step-owner)
  readonly authority: readonly AuthorityLevel[];
  readonly requiredCredentials: readonly string[];
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
  readonly escalationPolicy: string;
}
```

**Lookup API:**
- `getExecutor(key: string): ExecutorRecord | undefined` — look up by unique key.
- `listExecutors(): readonly ExecutorRecord[]` — enumerate all registered executors.
- `getAgent(id)` and `getExecutor(key)` are **distinct namespaces**; a class
  must source its charter from exactly one of them.

**Validator invariants** (compile-time, enforced by `validateExecutors()` at module load):

1. Every executor `key` is a unique non-empty string.
2. Every executor `agentId` is an integer in `[1, 25]` AND exists in
   `AGENT_REGISTRY` (cross-link referential integrity — see Mitigation
   M1 below).
3. Every executor `mode` is `'cross-step'`. Executors MUST NOT register
   as `'step-owner'` or `'always-on'`.
4. If executor `authority` includes `'auto_write_internal'`, it MUST
   also include `'requires_human_gate'`.
5. The OrchestratorHub's `invokeStepOwner(stepKey, ctx)` never resolves
   to an executor — executors are only invocable out-of-band via
   `/api/agent/<id>/execute` + the Inngest job runner.

**Current population (1 executor as of Rev-2.1 + CA-7):**

| key | agentId | name | mode | authority | invoked via |
|---|---|---|---|---|---|
| `self-renewal-executor` | 3 | Self-Renewal Executor | `cross-step` | `auto_write_internal`, `requires_human_gate` | `/api/agent/3/execute` + Inngest job |

`consumes`: `3.renewal.candidate.v1` (emitted by the primary Agent #3).
`produces`: `3.renewal.applied.v1`, `3.renewal.delta.v1`,
`3.renewal.build_failed.v1`, `3.renewal.disabled.v1` (per
`docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §3.2).

**Cross-link with §14 GovernanceAuditLog:** every audit-log row written
by an executor MUST include an `executorKey` field disambiguating from
primary-agent events. See §14 amendment in CA-7.4 below.

**Cross-link with §15.1 Roster table:** the primary Agent #3 row in the
25-agent roster now optionally references its executor key(s) under an
`executors[]` column for discoverability. Adding a row to
`EXECUTOR_REGISTRY` without adding the corresponding entry to the
primary agent's `executors[]` causes `validateExecutors()` to throw.
```

(End of verbatim §15.5 insertion.)

### CA-7.3 Five Panel-ratified mitigations (W6 Run 2 Q3 synthesis)

W6 Run 2 Q3 verdict `PLURALITY_(b)` (6 of 7 ENGAGED) identified risks + mitigations. W3 synthesised the 7 reviewers' individual mitigation lists into **5 canonical mitigations** clustered by mention-frequency and coherent action. Each mitigation is normative — the engineering dispatch SHALL implement all five.

| ID | Mitigation | Reviewer support | Implementation locus |
|---|---|---|---|
| **M1 — Cross-link AGENT_REGISTRY ↔ EXECUTOR_REGISTRY** | Each `AgentRecord` gains an optional `executors: readonly string[]` field listing executor keys. `validateExecutors()` extended to cross-check that every executor's `agentId` exists in `AGENT_REGISTRY` AND that the primary agent's `executors[]` includes the executor key (bidirectional referential integrity). | Slots 1, 3, 8, 9 (4 of 7) | `src/lib/agents/_registry.ts` — extend `AgentRecord` + `validateExecutors()`; update Agent #3 row to set `executors: ['self-renewal-executor']` |
| **M2 — Audit-log `executorKey` field + `.executor.` topic prefix** | GovernanceAuditLog schema (§14) extended: rows emitted by executors include `executorKey` (e.g. `'self-renewal-executor'`). Executor-specific bus topics prefixed `.executor.` (e.g. `3.executor.renewal.applied.v1` for cases where disambiguation is needed at the topic layer; existing `3.renewal.*` topics retain their names and add `executorKey` in the payload — no breaking change). | Slots 1, 2, 3, 7, 8 (5 of 7 — strongest support) | §14 schema amendment (see §CA-7.4); `Agent3SelfRenewalExecutor.js` writes `executorKey` on every audit-log invocation |
| **M3 — Executor mode + authority constraints (validator-enforced)** | Validator rejects executor registration if `mode !== 'cross-step'`. If `authority` includes `'auto_write_internal'`, validator requires `'requires_human_gate'` to also be present. OrchestratorHub's `invokeStepOwner()` MUST NEVER resolve to an executor — entrypoint-only invocation via `/api/agent/<id>/execute` + Inngest. Compile-time + runtime guard. | Slot 1 (1 of 7 with explicit mitigation; the constraints are implicit in `EXECUTOR_REGISTRY` shipped form per `_registry.ts` lines 591–625) | `src/lib/agents/_registry.ts` extend `validateExecutors()`; `OrchestratorHub.ts` add explicit reject path with audit-log topic `agent.execution.reject_executor_via_hub.v1` |
| **M4 — SSOT §15.5 documentation + admin discoverability** | §15 amended per §CA-7.2 above (canonical pattern documented). Admin diagnostics UI exposes `listExecutors()` alongside `listAgents()`. Executor class charter headers use explicit "SPLIT-CHARTER EXCEPTION" label (already present in `_registry.ts` line 575). Developer onboarding doc gains a new section pointing to §15.5. | Slots 1, 2, 3, 4, 5, 7, 8 (7 of 7 — universally supported) | §15.5 insertion (§CA-7.2); `src/pages/Settings/AdminDiagnostics.jsx` — new page or section; `docs/FLOWAI_BUILDING_GUIDANCE.md` (when Layer 4 ships) gets a §3 sub-section pointing to §15.5 |
| **M5 — Drift detection: startup + nightly `executor_registered.v1` audit events** | On every server start: emit `executor_registered.v1` to GovernanceAuditLog for each executor currently in `EXECUTOR_REGISTRY`. Nightly cron re-emits to surface drift (executor added/removed since last snapshot). Tamper-evident via §14.2 hash chain. | Slot 1 (1 of 7 with explicit mitigation; implicit in §14.2 nightly snapshot pattern) | New cron job in `.github/workflows/executor-drift-detection.yml` (3:15 UTC daily, 15 min after Sprint PROTECT-1 Phase 2 self-test); audit-log emission helper in `src/lib/agents/_registry.ts` exported as `emitExecutorRegisteredSnapshot()` |

### CA-7.4 Ripple amendment to §14 GovernanceAuditLog (per M2 + M5)

Insert the following two rows into the §14.1 topics-logged table:

```md
| `executor_registered.v1` | Server startup + nightly drift-detection cron | executorKey, agentId, mode, authority, consumes, produces, at |
| `agent.execution.reject_executor_via_hub.v1` | OrchestratorHub guard (M3) — emitted if any caller attempts to route to an executor via `invokeStepOwner()` | callerStack, executorKey, attemptedStepKey, at |
```

Insert the following row above the existing `3.renewal.*` row in §14.1:

```md
| `executorKey` field (cross-cutting) | Every audit-log row emitted by an executor adds `executorKey: string` to disambiguate from primary-agent events. Backwards-compatible: existing topic names unchanged; new field appears alongside existing fields. | varies per topic |
```

§14.2 (tamper-evidence) is unchanged — the hash chain accommodates the new `executorKey` field transparently because the row is serialised with all fields verbatim.

### CA-7.5 CEO disposition items surfaced from W6 Run 2 (PLURALITY items)

Two Q items did not reach 7/10 supermajority and surface as explicit CEO-disposition items in this CA-7:

**CA-7-DI-1 — Q1 ratification scope (PLURALITY 6/7 (a))**

The Q1 plurality was (a) "Ratify as canonical pattern for future split-charter agents." One reviewer (Slot 3 Gemini-2.5-pro) chose (b) "Ratify with amendment" — specifically amending `AgentRecord` to include the optional `executors: readonly string[]` field. **This amendment is already absorbed as Mitigation M1 above**, so the (b) amendment substantively converges with (a). W3 recommends CEO ratifies as canonical with M1 included. CEO confirm or revise.

**CA-7-DI-2 — Q3 mitigation set canonicality (PLURALITY 6/7 (b))**

The Q3 plurality was (b) "Yes — risks identified; specify mitigations." The 5 mitigations in §CA-7.3 are W3's synthesis of the 7 individual reviewer mitigation lists. **W3 recommends CEO ratifies all 5 as binding on the engineering dispatch.** Alternative: CEO selects a subset and the engineering dispatch ships only the selected mitigations (not recommended — Slot 1 alone produced 6 distinct mitigations and Slot 3 added bidirectional cross-link beyond Slot 1's unidirectional version; the synthesis preserves the strongest signals).

### CA-7.6 Test plan + spec ripple

- `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §4.3 — Option B (split-charter) was the disposed path. Once CA-7 is canonical, that spec's §4.3 Q2 becomes resolved (no longer "open"); ripple update to be applied in a follow-up housekeeping dispatch.
- `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` — no direct impact (Orchestra adapters are not agents).
- `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` — the agent invariant tests in §3.6 INV-1 through INV-6 stay applicable to both `AGENT_REGISTRY` and `EXECUTOR_REGISTRY`. Once CA-7 ships, INV-5 expands implicitly: "validator passes at module load" now includes `validateExecutors()`. No test text change required; testing-implementation engineer extends MockOrchestra to cover executors.

---

## CA-8 — Canonicalise X-Test-Bypass-Token Contract in §20 + Reconcile Doppler Key Naming

### CA-8.1 Background

`docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9.1 (commit `8eaf44c`) defined the X-Test-Bypass-Token contract for the adversarial test suite. The test plan explicitly flagged in §9.1 that the contract needed a CA-n SSOT amendment to be canonical in Rev-2.1 §20 (Sprint PROTECT-1 IP Protection).

Concurrently, W5c commit `0bd26b9` shipped the actual issuance + verification + Self-Protection middleware (`src/lib/security/{testBypassToken.js,selfProtection.js}` + `scripts/setup-test-bypass-keys.mjs` + tests). The shipped Doppler key naming **diverges** from the test-plan-text contract:

| | Test plan §9.1 (path-style) | W5c shipped form (suffix-style) |
|---|---|---|
| Private key name | `TEST_BYPASS_TOKEN_PRIVATE_KEY` (single canonical name) | `TEST_BYPASS_PRIVATE_KEY_DEV` / `TEST_BYPASS_PRIVATE_KEY_PROD` (env suffix; no "TOKEN" middle word) |
| Public key name | `TEST_BYPASS_TOKEN_PUBLIC_KEY` (single canonical name) | `TEST_BYPASS_PUBLIC_KEY_DEV` / `TEST_BYPASS_PUBLIC_KEY_PROD` |
| Env distinguished by | Doppler config path (`flowai/<env>/<name>`) | Suffix on the secret name + Doppler config path |
| Implementation | (not shipped — spec only) | LIVE — commit `0bd26b9`, 1077 LOC + 344 LOC tests |

Per Locked Rule 1 (code > canonical > user-curated memory > auto-memory) the **shipped form is canonical**. CA-8 reconciles the spec to match shipped code and canonicalises the contract in Rev-2.1 §20.

### CA-8.2 Proposed amendment to §20 (verbatim insertion)

Insert the following new sub-section **§20.2 X-Test-Bypass-Token Contract (Canonical)** after the existing §20.1 Reconciliation sub-section:

```md
### 20.2 X-Test-Bypass-Token Contract (Canonical, ratified CA-8)

The **X-Test-Bypass-Token** is a signed JWT-style token sent in the HTTP
header `X-Test-Bypass-Token` on every request from an internal-audit /
adversarial-test source to the SUT. The Self-Protection layer
(this §20 embedded code-level + future Agent #13 orchestration per
§20.1) MUST validate the token signature + claims before applying any
bypass.

**Scope of bypass** (and what it does NOT bypass):

- BYPASSES: bot-detection rate limits; headless-fingerprint rejection;
  Cloudflare Bot Management challenge (when present); future Agent #13
  hostile-crawler heuristics.
- DOES NOT BYPASS: authentication (§13); RLS (§14.3); role gates on
  Human Gates (§10.2); 95/95 governance threshold (§19); the
  Self-Renewal authority guards.

**Algorithm:** RS256 preferred (asymmetric — public key on the verifier
side; private key only at the issuer). HS256 acceptable when key
distribution to verifiers is impractical (e.g. local dev). Production +
Vercel preview MUST use RS256.

**Claim schema:**

```json
{
  "iss": "flowai-adversarial-suite",
  "sub": "test-runner",
  "testSuiteId": "flowai-adversarial",
  "runId": "<uuid v4>",
  "env": "prod | dev-SUT",
  "iat": <unix-seconds>,
  "exp": <unix-seconds, max iat + 3600>,
  "scope": ["bot-detection-bypass", "agent13-allowlist"],
  "fingerprint": "<sha256 of expected User-Agent + IP CIDR>"
}
```

**Validation rules** (verifier-side, all MUST pass):

1. `iss` equals `"flowai-adversarial-suite"`. Otherwise reject + log to
   GovernanceAuditLog topic `auth.test_bypass_token.reject` (reason:
   `iss_mismatch`).
2. `exp` is in the future and `≤ iat + 3600` (max 1-hour TTL). Reject
   expired or long-lived tokens.
3. `env` MUST match the SUT environment. A prod-issued token MUST NOT
   validate against dev-SUT and vice versa.
4. `runId` is a valid UUID v4. Replay-attack mitigation: each `runId`
   is single-use within the token TTL; a second request bearing the
   same `runId` after the first run completes is rejected.
5. Signature verified against the per-environment public key from
   Doppler (see §20.2.1 key naming below).
6. Token bypasses ONLY the items in the "BYPASSES" list above.

**§20.2.1 Doppler key naming (canonical — env-suffix form, per shipped W5c code):**

Keys are stored under Doppler config `flowai/<config>` where
`<config>` ∈ {`dev`, `prd`} (canonical Doppler workspace config names —
note `prd` NOT `prod` per `CredentialAdapter` Packet 1.5 amendment).
Secret names use an env suffix in the name itself (NOT a path), so a
single config can hold both dev and prod keys if needed (operational
flexibility for shared-config audits) and runtime lookups are explicit:

| Env | Doppler config | Private-key secret name | Public-key secret name |
|---|---|---|---|
| dev | `flowai/dev` | `TEST_BYPASS_PRIVATE_KEY_DEV` | `TEST_BYPASS_PUBLIC_KEY_DEV` |
| prod | `flowai/prd` | `TEST_BYPASS_PRIVATE_KEY_PROD` | `TEST_BYPASS_PUBLIC_KEY_PROD` |

**Notes on naming evolution:**

- The test-plan-text §9.1 (commit `8eaf44c`) referenced path-style keys
  named `TEST_BYPASS_TOKEN_PRIVATE_KEY` / `_PUBLIC_KEY` (no env suffix,
  no env in name; env distinguished by Doppler config path only).
- W5c shipped form drops the `TOKEN` middle word and appends the env
  suffix. This is the canonical form (Locked Rule 1: code wins).
- The test plan §9.1 will be retroactively updated post-CA-8 promotion
  to match the canonical form.

**Issuance:**

Issuance is owned by the CI pipeline (production / Vercel preview
adversarial run) or local-dev `scripts/setup-test-bypass-keys.mjs` (dev
run). The private key is read from Doppler at issuance time, never
checked into the repo. The script supports three modes:

- `--mode=doppler` (default): pipes generated PEMs via stdin to
  `doppler secrets set`. Requires `doppler` CLI authenticated to the
  `flowai` project.
- `--mode=stdout`: prints PEMs to stdout for hand-copy into Doppler UI
  or 1Password vault.
- `--mode=files`: writes `test-bypass-private-<env>.pem` (mode 600) +
  `test-bypass-public-<env>.pem` (mode 644) to `tmp/test-bypass-keys/`
  for upload. The local private PEM MUST be deleted after upload.

The `tmp/test-bypass-keys/` path is gitignored (`.gitignore` updated in
commit `0bd26b9`).

**Key rotation:** re-run `scripts/setup-test-bypass-keys.mjs` to
generate a fresh pair and re-upload. Rotation cadence: at minimum
quarterly + on any suspected compromise + on any departure of a CI
service-role-holding contributor.

**Audit:** every token issuance, every successful verification, and
every reject (per the validation rules above) is logged to
GovernanceAuditLog. Topics:

- `auth.test_bypass_token.issued` — emitted by `setup-test-bypass-keys`
  on rotation (not per-token issuance — tokens are issued at runtime
  by the CI runner and the runtime issuance is logged as `.minted`).
- `auth.test_bypass_token.minted` — emitted on per-run token mint by
  the CI runner. Payload: `{ testSuiteId, runId, env, exp, at }`.
- `auth.test_bypass_token.verified` — emitted by the verifier on
  successful validation. Payload: `{ runId, env, scope, at }`.
- `auth.test_bypass_token.reject` — emitted on any failed validation.
  Payload: `{ reason, partialClaims?, at }`. `reason` is one of:
  `iss_mismatch`, `expired`, `env_mismatch`, `replay_attempt`,
  `signature_invalid`, `claim_missing`.
```

(End of verbatim §20.2 insertion.)

### CA-8.3 Ripple amendment to test plan §9.1

Once CA-8 is canonical (Panel ≥7/10 + CEO ratification), the test plan
§9.1 text MUST be updated to point at §20.2 as the canonical source and
to use the canonical env-suffix key naming. Proposed §9.1 future state:

> The X-Test-Bypass-Token contract is canonically defined in SSOT
> Rev-2.1 §20.2 (CA-8 ratified `<promotion-commit-hash>`). The test
> suite implements the verifier per §20.2 validation rules and the
> issuance helper per `scripts/setup-test-bypass-keys.mjs`. Doppler
> key names per §20.2.1 (env-suffix form): `TEST_BYPASS_PRIVATE_KEY_DEV`
> / `_PROD` and `TEST_BYPASS_PUBLIC_KEY_DEV` / `_PROD`.

The prior path-style language in §9.1 will be struck and replaced with
the above pointer. Housekeeping commit to follow CA-8 promotion.

### CA-8.4 No CEO-disposition items

Unlike CA-7, CA-8 has no PLURALITY-level disposition items. The
canonicalisation is a straight reconciliation: spec was wrong, code
shipped, code wins (Locked Rule 1). The only decision is the
ratification of §20.2 verbatim text + the §9.1 retroactive update.

---

## Combined CA-7 + CA-8 Disposition Request

### Routing

- **W6 Panel review.** This combined CA-n proposes substantive
  amendments to canonical sections §15 + §20 (and a ripple amendment
  to §14). Per Locked Rule 17 + P11 + §19 Panel SSOT Access Rules, a
  Panel consultation MUST run before promotion. Threshold: ≥7/10
  ENGAGED supermajority per question, per CA-n cycle (§18.2).
- **CEO ratification.** After Panel passes (or via CEO override per
  Locked Rule 13), CEO disposes:
  - CA-7 — confirm 5 mitigations binding on engineering dispatch +
    confirm or revise the two PLURALITY items (CA-7-DI-1 + CA-7-DI-2).
  - CA-8 — ratify §20.2 verbatim + authorise retroactive §9.1 update.
- **Promotion commit** (post-Panel + CEO). W5x or W2 ships in a single
  commit:
  - Edit `docs/CANONICAL_REFERENCE.md` to insert §15.5 (per §CA-7.2),
    §14 new rows (per §CA-7.4), and §20.2 (per §CA-8.2).
  - Create pre-promotion archive at
    `docs/archive/FLOWAI_SSOT-pre-CA7-CA8-promotion.md`.
  - Append entries to `docs/CANONICAL_HISTORY.md` SECTION 8 + the
    pointer copy in `docs/CANONICAL_REFERENCE.md` §7.
  - Mark the parking-lot entries (none for CA-7 + CA-8 directly —
    these arose from spec + W6 consultation, not parking-lot, so no
    parking-lot ENTRY needs disposition flip).

### Open coupling (intentional)

CA-7 + CA-8 are bundled because:

1. Both extend canonical sections without touching each other's content.
2. Both have the same Panel-review + CEO-ratification + promotion
   workflow.
3. Both carry ripple amendments to other sections that are
   self-contained (§14 row insertions for CA-7; test plan §9.1 update
   for CA-8).
4. Bundling reduces CA-n cycle overhead and Panel context-bundle size
   per dispatch.

If Panel or CEO want to disposit them separately, that is permissible
— the document below cleanly separates CA-7 (§15 + §14 ripple) from
CA-8 (§20 + test plan ripple) so a partial promotion (CA-7 only or
CA-8 only) is operationally clean.

### Threshold expectations

Per CA-n cycle (§18.2):

- ≥7/10 ENGAGED on EVERY question = supermajority cleared (the bar).
- 6/10 ENGAGED on any question + W3 recommended-action note = surface
  to CEO as PLURALITY for arbitration.
- Below quorum 7/10 ENGAGED = re-Panel required.

W3 prepared the consultation prompt (separate dispatch — not in this
file) to ask Panel three questions per CA:

- CA-7-Q1: Adopt §15.5 verbatim per §CA-7.2?
- CA-7-Q2: All 5 mitigations binding per §CA-7.3?
- CA-7-Q3: §14 ripple amendments per §CA-7.4?
- CA-8-Q1: Adopt §20.2 verbatim per §CA-8.2?
- CA-8-Q2: Authorise retroactive §9.1 update per §CA-8.3?

5 questions × 4 options each + INSUFF abstention, per the standard
W6 multi-choice frame.

---

## Provenance

| Source | Commit | Used for |
|---|---|---|
| W6 Run 2 EXECUTOR_REGISTRY consultation | (commit hash in consultation file; document is `docs/panel-consultations/executor-registry-pattern-ratification-2026-05-14.md`) | CA-7 §15.5 content; 5 mitigations synthesis (§CA-7.3) |
| EXECUTOR_REGISTRY shipped form | `src/lib/agents/_registry.ts` lines 573–664 (commit `176d870` and follow-ups) | CA-7 verbatim type contract; validator invariants |
| Self-Renewal Agent #3 graduation spec | `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §4.3 (commit `446ddb5`) | CA-7 background — Option B SPLIT charter disposition |
| Test plan X-Test-Bypass-Token contract | `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9.1 (commit `8eaf44c`) | CA-8 background; pre-canonical contract spec |
| W5c X-Test-Bypass-Token implementation | `0bd26b9` (`scripts/setup-test-bypass-keys.mjs`, `src/lib/security/{testBypassToken.js, selfProtection.js}`, `tests/security/test-bypass-token.test.js` — 1077 LOC + 344 LOC tests) | CA-8 §20.2 canonical content — env-suffix Doppler key naming |
| Canonical anchor | `docs/CANONICAL_REFERENCE.md` Rev-2.1 (commit `9495b26`) | §15 / §14 / §20 insertion points |
| CredentialAdapter `prd` vs `prod` Doppler convention | Packet 1.5 amendment in `BaseAgent.js` + commit `8e29e84` | CA-8 §20.2.1 note on `prd` vs `prod` |

---

## Versioning

- CA-7 + CA-8 are draft amendments. Numbering follows the existing
  CA-1 / CA-2 / CA-3 ratified sequence (§18.4) + the deferred
  CA-4 / CA-5 / CA-6 pending CEO disposition.
- This draft does NOT promote either amendment unilaterally; it is
  the Panel-input document for the next W6 consultation cycle.
- If Panel + CEO promote, the canonical CANONICAL_REFERENCE.md
  edit + archive ceremony happens in a separate W5x commit per §18.3.

*End of CA-7 + CA-8 combined draft. Pending Panel review per §19 + CEO ratification per §18.*
