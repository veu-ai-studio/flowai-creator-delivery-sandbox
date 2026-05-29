# FLOWAI Engineering Spec — Layer 3 Canonical

**Status:** CANONICAL as of 2026-05-11. CEO-approved. 10 flags resolved. RLS-only marked MOST DANGEROUS ASSUMPTION per Panel; mitigated by hybrid tier strategy (L3-7).
**Promoted:** 2026-05-12 by W5c (Layer 3 promotion of `docs/FLOWAI_ENGINEERING_SPEC_DRAFT_v1.md`, commit 43eed41).
**Authored:** 2026-05-11 by W5b (draft) · resolutions applied 2026-05-11 (CEO) · canonical promotion 2026-05-12 (W5c).
**Inputs:**
- Panel review: `docs/engineering-review/layer3-eng-panel-review-2026-05-11.md`
- 5 LIVE-OK reviewers: `openrouter:anthropic/claude-opus-4.7` (S1), `openrouter:openai/gpt-5.5` (S2), `openrouter:google/gemini-2.5-pro` (S3), `openrouter:perplexity/sonar-pro-search` (S4), `openrouter:openai/gpt-4o-2024-11-20` (S10)
- 5 slots non-responsive: vercel_v0 quota-exhausted, github_models×2 (413 too-large), headless×2 (Playwright codegen not done)
**Anchors:** `docs/FLOWAI_SSOT.md` (Layer 1 canonical) · `docs/FLOWAI_IMPLEMENTATION_PLAN.md` (Layer 2 canonical)
**Synthesis rule:** "Consensus" = position supported by ≥3 of 5 reviewers. Where consensus exists the spec is prescriptive; where it didn't, the section records explicit CEO disposition.

> **CEO FLAGS — ALL TEN RESOLVED BY CEO (2026-05-11).** L3-1, L3-2, L3-4, L3-6 delegated to W03 picks; L3-3, L3-5, L3-7, L3-8, L3-9 direct CEO choice; L3-10 process item, no code impact.

---

## PER-AGENT TECHNICAL SPECS

### AT1. Standard agent contract

**CONSENSUS SPEC:** Every agent extends `BaseAgent` with a constructor charter `{ id, version (semver), authority: enum('RECOMMEND_ONLY'|'DRAFT_ONLY'|'AUTO_CONTAIN_KNOWN'|'AUTO_WRITE_INTERNAL'|'REQUIRES_HUMAN_GATE'), scopes, topics: { consumes, produces }, sideEffectPolicy, dormant: bool }`. The mandatory entry point is `async run(context: AgentContext): Promise<AgentOutputEnvelope>` where `AgentContext` carries at minimum `{ runId, orgId, productScope, sessionId, traceId, input, credentials: CredentialAdapter, bus: MessageBus, signal: AbortSignal }`. The output envelope is `{ status: 'ok'|'error'|'escalate', artifact, sideEffects[], confidence: 0-100, evidenceLayer: L1..L5, citations[], errors[], auditRefs[] }`. `BaseAgent.runWithGuards(context)` (the only sanctioned entrypoint) validates schema, authority, tenant scope and cost budget, writes `agent_run_started`/`agent_run_completed` audit events, and wraps `run()` in a try/catch that emits structured `AgentError` envelopes on failure.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** `BaseAgent.js` contract layer (G3-ratified; 20→25 validator update queued for Phase 1).
**DISSENT:** S1 + S2 demand a typed `AgentError` subclass hierarchy (`ContractViolation`, `AuthorityViolation`, `TimeoutError`, `UpstreamError`); S3/S4/S10 leave error typing generic.

### AT2. Step-Owner vs Cross-Step vs Always-On wiring

**CONSENSUS SPEC:** All three modes share the `run(context)` signature; only dispatch differs.
- **Step-Owner** agents (#1, #2, #6–#10) subscribe to one canonical pipeline topic `pipeline.step.{n}.request` and emit `pipeline.step.{n}.complete`; the Hub invokes them synchronously inside a session's step state machine (`await hub.runStep(sessionId, stepN)`).
- **Cross-Step** agents (#3, #4, #5, #13, #17) subscribe to event topics (`crawl.breakage.detected`, `tenant.provisioned`, `self_protection.scan`, etc.) via `hub.subscribe(topics, handler)` and run asynchronously off the session's main loop.
- **Always-On** agents (#11–#20) register on schedules (`hub.cron(agentId, expr)`) plus event triggers, receive a synthetic `AgentContext` (`productScope='all'`), and write to their own audit-log topics rather than to a session.
`OrchestratorHub.dispatch()` normalizes every output into `AgentOutputEnvelope` and varies only `triggerType`, `stepType`, `authorityGrant`, `deadlineMs`, and `idempotencyKey`.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** `OrchestratorHub` topic router with both sync step-execution AND async pub/sub (currently sync-only — extension required in Phase 1).
**DISSENT:** S4 conflates Always-On with cron-only and ignores event triggers; S10 doesn't separate sync vs async dispatch mechanics.

### AT3. Authority enforcement at runtime

**CONSENSUS SPEC:** Authority is enforced in **one mediated path** between the agent and any real-world effect: agents have no ambient credentials, no `globalThis.supabaseAdmin`, no direct outbound calls. Every side-effect-bearing operation is declared in the output envelope as a structured `SideEffect`/`action` (`{ type: 'read'|'write'|'external'|'irreversible', target, payload }` or `{ action: 'git.commit', params: {...} }`) and brokered through a single **`ToolGateway`** central choke point that validates the requested action against a canonical authority→permitted-actions map, mints/checks capability tokens, and records the call. Unauthorized requests throw `AuthorityViolation`, auto-rollback the envelope, write `agent_authority_violation` to the audit log, and place the offending agent in `dormant:true` quarantine. Elevation requires an audit entry `agent_authority_elevation_{agentId}` countersigned by Panel (≥7/10) + CEO; `AgentRegistry` refuses to load any runtime authority that exceeds the registered authority.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** A canonical SideEffect/AuthorityActionMap taxonomy enforced exclusively by `ToolGateway` (single audit point per L3-1).
**RESOLVED (CEO L3-1, 2026-05-11 via W03 pick):** Option **B** — `ToolGateway` central choke point is the single authority audit point. Alternative homes — SideEffect taxonomy inside `OrchestratorHub` (S1), `AuthorityActionMap` JSON (S3), `BaseAgent.guard()` (S4), `AgentRegistry` runtime check (S10) — are **OVERRULED**. The capability-token / single-choke-point pattern (S2) is canonical; other modules may consult the gateway but may not duplicate or shortcut the enforcement.
**DISSENT (historical):** Original 5-way split among reviewers; resolved per L3-1.

### AT4. Agent isolation between provider orgs

**CONSENSUS SPEC:** `AgentContext.orgId` is mandatory and non-spoofable; `BaseAgent.runWithGuards()` rejects missing/mismatched tenant identifiers before any model or tool call. All DB clients are constructed via a single `getSupabaseForOrg(orgId)` factory that sets the `app.current_org` Postgres GUC consumed by RLS policies; agents may not instantiate their own clients (static AST check at registration + runtime AsyncLocalStorage check). MessageBus envelopes carry `orgId` in the header and the Hub refuses to route messages whose `orgId` differs from the subscribing agent's session. `ContextAssembler` refuses to mix artifacts across orgs in prompt assembly. In-memory caches must be `Map<orgId, T>`-keyed. Top-tier customers additionally get **schema-per-tenant** isolation for the sensitive tables (see MT1 / L3-7); the org-aware factory selects the schema transparently by `orgId → tier` lookup.
**CONFIDENCE:** HIGH (3/5 HIGH + 2 MEDIUM)
**KEY DEPENDENCY:** Supabase RLS provisioning (Phase 1) + Node.js `AsyncLocalStorage` for org-context propagation across awaits + Clerk multi-tenant JWT claims + schema-per-tenant provisioning path for top-tier orgs.
**DISSENT (resolved):** S1 + S4's RLS-as-sole-blast-wall concern is **adopted as defense-in-depth** via the hybrid tier strategy in MT1/L3-7 — RLS is the default boundary for all tenants, and schema-per-tenant is the additional structural defense for top-tier orgs. Majority view of "RLS is sufficient" stands for non-top-tier orgs.

### AT5. Agent versioning + upgrade/rollback

**CONSENSUS SPEC:** Agents are identified by `agentId@major.minor.patch+gitSha`; `AgentRegistry` rows store `{ activeVersion, candidateVersion, previousStableVersion, compatibilityContract }`. New versions follow `dormant → shadow_24h → canary → active`; shadow output is diffed against the live version on the same request topic and written to `agent_shadow_diff` audit entries. Agent #24 (Release Ops) flips the manifest default for *new sessions only*. In-flight sessions are pinned at session start to the agent versions then-active and never see a mid-run change (sticky `sessionAgentManifest`). Rollback = manifest revert; emergency security-CVE force-upgrades replay the affected session from the last clean step boundary and emit `agent_force_upgrade_{sessionId}` audit. Audit-log entries record `agentId@semver` so historical audits remain reproducible.
**CONFIDENCE:** HIGH (4/5)
**KEY DEPENDENCY:** `AgentRegistry` with multi-version load + sticky session manifests (currently single-version — Phase 1 task).
**DISSENT:** S3/S4/S10 specify simpler "shadow then activate" without the canary stage between shadow and active.

---

## PER-PIPELINE-STEP SPECS

### PS1. Step input/output contract

**CONSENSUS SPEC:** `StepInputContext = { runId, orgId, productId, sessionId, stepType, stepNumber: 1..8, pipelineVersion, mode: 'auto'|'guided'|'manual', priorArtifactRefs: ArtifactRef[], userInputs, constraints: { budget, deadline, lockedRules[] }, authorityGrant, deadlineMs, traceId, initiatedBy }`. `StepArtifact = { artifactId: uuid, artifactType, stepType, producerAgentId, schemaVersion, contentRef (content-hashed), summary, confidence: 0-100, evidenceLayer: L1..L5, provenance[], governanceScore, readinessScore, sideEffects, citations, validationResults, panelReviewRequired: bool, nextStepInputs }`. Both ends validated by a shared schema validator (Zod or JSON Schema) at the OrchestratorHub boundary; contract failure auto-rejects the step and writes `pipeline_step_rejected_schema`. Artifacts persist to `flowai_artifacts` (jsonb + content-hash dedupe) in R2/S3.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** Shared schema validator (Zod / JSON Schema / ajv) + Postgres jsonb storage with content-hash index + R2/S3 for artifact blobs.
**DISSENT:** S10 specifies a minimal `{ stepId, sessionId, orgId, status, artifact }` shape that drops governance/readiness/evidence fields entirely.

### PS2. Step failure handling

**CONSENSUS SPEC:** Three failure classes:
1. **Transient** (timeout, 5xx upstream, rate limit) → exponential-backoff retry by OrchestratorHub / Agent #21 Pipeline Conductor, **max 3 attempts on the curve `[30 s, 2 min, 10 min]` with jitter (±20%)**. Retry budget is per-step, not per-session.
2. **Deterministic** (contract violation, governance reject, authority denial, cost exceeded) → no auto-retry; route to Agent #3 (Self-Renewal) for diagnosis or to user gate in guided/manual mode.
3. **Catastrophic** (agent crash, authority violation, unhandled exception) → de-register the agent (`dormant:true`), page on-call via Agent #25, freeze session in `step_blocked` state.

Exhausted retry budget → dead-letter queue + `step_failed` audit + escalation to Agent #25 if `severity≥P1`. All retries write `step_retry_{n}` entries with the prior error envelope. Rollback is mandatory if the failed step already produced deployed or externally visible changes.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** Agent #21 Pipeline Conductor + a durable job queue (BullMQ/Redis or Supabase queues) — currently in-memory, must move to durable in Phase 1.
**RESOLVED (CEO L3-2, 2026-05-11 via W03 pick):** Option **B** — `[30 s, 2 min, 10 min]` escalating curve. Alternative curves — `[2 s, 8 s, 30 s]` (S1), `[5 s, 30 s, 120 s]` (S3), `[1 s, 2 s, 4 s]` (S4), exponential to 5 min (S10) — are **OVERRULED**. Rationale: a $5B governance platform tolerates longer retry windows in exchange for fewer total attempts and clearer dead-letter signaling.

### PS3. Step parallelism

**CONSENSUS SPEC:** Within a single `pipelineRunId`/session, the canonical 8-step order is **sequential by default at the step level** with two named exceptions: Research(1) → Design(2) → Build(3) → QA(4) → Deploy(5) → Self-Renewal(6) → GTM(7) → Monitor(8). Hard dependencies: Design requires Research; Build requires Design; QA requires Build; Deploy requires QA pass.

**Parallel-where-safe exceptions (CEO L3-3):**
- **#6 Self-Renewal** runs continuously alongside the main 8-step pipeline as a Cross-Step / Always-On agent. It consumes events (`crawl.breakage.detected`, `marketplace.event.*`, Monitor anomalies) and emits patch proposals; it does **not** block step progression unless a `P0` finding is raised, which suspends the active step in `step_blocked` until cleared.
- **#7 GTM** may begin execution **alongside #5 Deploy** once Build is sealed (i.e., once Build → QA → Deploy hand-off has occurred and the deploy artifact is pinned). GTM cannot publish customer-visible artifacts until Deploy confirms green. All other step combinations remain sequential.

**Parallelism inside steps** remains permitted (multi-source Research, design alternatives, test shards, crawl probes, score sub-rubrics, GTM channel checks). Cross-step speculative execution outside the two named exceptions is permitted only as `shadow_artifact` and cannot advance gates or deploy. Parallel sessions across different `pipelineRunId`s are unrestricted. Enforcement: `PipelineDAG` state machine in OrchestratorHub backed by Postgres (transactional state transitions, not in-memory) — the DAG must explicitly model the #5/#7 overlap and the #6 continuous-context lane.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** `PipelineDAG` state machine in OrchestratorHub backed by transactional Postgres state, with two named non-sequential edges (#6 ⇆ pipeline, #7 ‖ #5).
**RESOLVED (CEO L3-3, 2026-05-11 direct):** Option **A with parallel-where-safe default.** S1's permitted cross-step parallelism is **adopted scoped to #6 and #7/#5 only.** S10's broader steps-1+2+7 parallel grouping is **OVERRULED.** S3 / S4's strictly-sequential position is **OVERRULED** in favor of the two named exceptions.

### PS4. Step audit trail

**CONSENSUS SPEC:** Every step boundary writes to `flowai_audit_log`: at minimum `{ auditId: uuid, ts: timestamptz, orgId, productScope, sessionId, runId, stepNumber, stepType, agentId, agentVersion, eventType: 'step_started'|'step_completed'|'step_failed'|'step_skipped', traceId, parentTraceId, inputHash: sha256, outputHash: sha256, governanceScore, readinessScore, confidence, evidenceLayer, sideEffectsCount, panelDecisionId?, prevHash: sha256, rowHash: sha256, schemaVersion }`. `prevHash` chains to the previous row for the same `(orgId, productScope)`; `rowHash = sha256(canonicalJson(row \ rowHash))`. RLS forbids UPDATE/DELETE — corrections are new rows referencing `supersedesAuditId`. Chain validation via `audit_chain_verify(orgId, productScope)`.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** `flowai_audit_log` table + Postgres trigger enforcing append-only + `auditChain.js` library.
**DISSENT:** None substantive — all 5 reviewers converge on hash-chained append-only.

---

## GOVERNANCE SPECS

### GV1. 95/95 scoring rubric

**CONSENSUS SPEC:** Both scores are 0–100 weighted sums computed by `ScoreEvaluator.score(artifact, context) → { governance, readiness, breakdown, evidence }`; both must independently be ≥95 to pass (no compensation between them). **Governance score** factors (cross-reviewer union): authority compliance, audit/provenance completeness, evidence quality (L1–L5 tagging), tenant isolation, safety/security, policy/clearance alignment, hallucination risk (any unverified L1/L2 claim hard-caps the score). **Readiness score** factors: test coverage, functional correctness (golden output diff), integration/crawl pass rate, operational health, rollback rehearsal recency, security posture, performance budget, credential readiness, documentation, GTM/customer-impact readiness. Any authority violation, cross-tenant leak, or failed critical security check hard-caps the relevant score below 95.

**Rubric weighting (CEO L3-4):** **Governance-criterion weights are 2× the corresponding readiness-criterion weights.** Concretely, every active governance factor has weight `2 · w_base` and every active readiness factor has weight `1 · w_base`, where `w_base` is set such that each score sums to a max of 100. Within Governance the seven factors share weight uniformly (subject to a final pass over the rubric by `ScoreEvaluator` test fixtures); within Readiness the ten factors share weight uniformly. This 2× rule is the canonical weighting until Agent #22 (Audit-Auditor) emits a defensible re-weighting recommendation backed by ≥30 days of telemetry.
**CONFIDENCE:** MEDIUM (4/5 MEDIUM + 1 HIGH)
**KEY DEPENDENCY:** `ScoreEvaluator.js` with the 2× governance-vs-readiness weight ratio implemented in the canonical fixture set.
**RESOLVED (CEO L3-4, 2026-05-11 via W03 pick):** Option **B** — governance criteria are weighted **2× readiness criteria**. Alternative weightings — S1's testCoverage 0.25 / contractCompliance 0.20 / authority 0.15 split, S2's per-factor table, S3's lint 20 / security 30 / provenance 20 / authority 30, S4's 5×20 split, S10's generic shape — are **OVERRULED** as the canonical weighting. They may inform Agent #22's re-weighting proposals after the 30-day telemetry window. Rationale: for a $5B governance platform the safer interpretation of "A & B" is to bias governance heavily over readiness; a readiness-led rubric ships features faster but can certify unsafe artifacts.

### GV2. 6-step Clearance Protocol

**CONSENSUS SPEC:** Implemented as `clearance.runAll(artifactId, context) → ClearanceResult[]`, each step a discrete async check returning `{ pass, evidence, blockers }`. **Canonical 6-step order (CEO L3-5): Spec → Build → Test → Audit → Sign-off → Promote.**

1. **Spec** — Specification & contract integrity. Required artifacts present, schemas validate, content hashes match the spec inputs, and the artifact declares its `schemaVersion`, `pipelineVersion`, and `producerAgentId@semver`. Writes `clearance_spec_{pass|fail}`.
2. **Build** — Build & CI integrity. `git status --porcelain` empty + commit signed + last 10 CI runs green + deploy artifact reproducibly built (content-hashed). Writes `clearance_build_{pass|fail}`.
3. **Test** — Operational test conformance. Full vitest suite green vs Phase-0 baseline (881-test snapshot) + crawl/probe pass + rollback rehearsal recorded within the last 30 days. Writes `clearance_test_{pass|fail}`.
4. **Audit** — Governance + authority + tenant + chain integrity (merger of former 95/95 + Authority/Scope + Tenant Security + Audit Chain checks). `score_evaluations.governanceScore ≥ 95 AND readinessScore ≥ 95` for the artifact's commit hash; zero `agent_authority_violation` events for the session; all tool calls within `authorityGrant`; RLS isolation test passes; Doppler path scoped; dependency/security scans clean; `audit_chain_verify(orgId)` true. Writes `clearance_audit_{pass|fail}`.
5. **Sign-off** — Human / Panel decision. Required Panel ≥7/10 decision + CEO countersign for high-risk releases + audit-chain finality verified. Writes `clearance_signoff_{pass|fail}`.
6. **Promote** — Deploy-gate verification. Monitor 0–50 ≥45 (green, per L3-6) at promote time; deploy artifact pinned to the audited commit hash (no time-of-check-vs-time-of-use drift between Audit and Promote); deploy authorization token minted by `ToolGateway` (per L3-1). Writes `clearance_promote_{pass|fail}`.

Any step fail blocks deploy and writes a `clearance_blocked_at_{step}` audit row.
**CONFIDENCE:** HIGH (4/5)
**KEY DEPENDENCY:** Reliable API access to GitHub (CI status) + issue tracker (Linear/Jira) + the canonical `test_baseline.json` snapshot (must be created at Phase-0 lock) + a `ToolGateway`-minted deploy authorization token.
**RESOLVED (CEO L3-5, 2026-05-11 direct):** Option **A** — `Spec → Build → Test → Audit → Sign-off → Promote`. Alternative orderings — S1's `Code/Test/95/Audit/Authority/Operational`, S4's `95/Authority/RLS/Rollback/Panel/Monitor`, S10's generic `CI/CD`, and the draft's implicit `Artifact-Integrity / 95-95 / Authority / Tenant-Security / Operational / Sign-off` — are **OVERRULED**.

### GV3. Monitor 0–50 score computation

**CONSENSUS SPEC:** Score produced by Agent #10 (Monitor) on a sliding window (~5 min) and published to `monitor.score.{productId}` every 60 s. **Scale (CEO L3-6): 50 = green.** Signals (cross-reviewer union, normalized 0–100): uptime/availability, error rate, p95 latency, crawl pass-rate, integration probe health, marketplace freshness (`days_since_last_scan / 30 × 100`), cost-budget headroom, security/credential health, user-impact signals. Critical conditions (cross-tenant leak, payment misrouting, credential exposure, active exploit) **override arithmetic and force the score to red**.

**Canonical thresholds + labels (CEO L3-6):**
- **CLEARED** — score `45-50` (green; passes the Promote gate in GV2 Step 6).
- **CONDITIONAL** — score `30-44` (degraded; auto-files a Self-Renewal Alert via Agent #3, does not auto-page).
- **NOT CLEARED** — score `<30` (red; auto-pages on-call via Agent #25 and force-suspends new deploys for the affected product).

**CONFIDENCE:** HIGH (4/5 — direction now locked)
**KEY DEPENDENCY:** Agent #10 + product-side `/api/health` standardized contract (currently varies per product) + observability stack (Sentry, Vercel log drains).
**RESOLVED (CEO L3-6, 2026-05-11 via W03 pick):** Option **A** — 50 = green; CLEARED `45-50`; CONDITIONAL `30-44`; NOT CLEARED `<30`. This matches the Locked Rule as written and Layer 2's "≥45 green" anchor. **S2's inverted interpretation (0 = green, 50 = blocked) is OVERRULED** with the rationale that the Locked Rule text is ambiguous but the surrounding canonical material (Layer 2 anchors, Locked Rule narrative, prior code comments) all support direction A.

### GV4. Audit log integrity

**CONSENSUS SPEC:** `flowai_audit_log` is **append-only** enforced by Postgres trigger (`raise exception` on UPDATE/DELETE) and RLS that permits INSERT only via the `flowai_audit_writer` service role. Each row carries `prevHash` (sha256 of previous row's `rowHash` for the same `(orgId, productScope)`) and `rowHash` (sha256 of canonical JSON of the row minus `rowHash`). Chains partitioned by `orgId` plus a global chain for platform events. Chain-verifier function `audit_chain_verify(orgId, productScope)` runs nightly via Agent #22 (Audit-Auditor) and on-demand pre-deploy. Daily Merkle root of all chains exported to immutable storage (S3 Object Lock or Cloudflare R2 with versioning) and optionally published to a public ledger endpoint. Any chain break raises P0 incident, freezes the affected tenant, pages CEO.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** `auditChain.js` (already shipped in commit 496886d) + immutable external storage (S3 Object Lock or R2 with versioning — must contract).
**DISSENT:** None substantive.

---

## MULTI-TENANCY SPEC

### MT1. Org isolation stack — HYBRID (CEO L3-7)

**CONSENSUS SPEC (with CEO hybrid amendment):** Five enforced layers, with **Supabase RLS as the default boundary for all tenants** and **schema-per-tenant as defense-in-depth for top-tier customers** on the highest-sensitivity tables (`credentials`, `audit_log`, `artifacts`, `score_evaluations`).

1. **Auth/Session:** Clerk JWT carries `orgId` claim.
2. **Database — default (all tenants):** Supabase RLS policy `current_setting('app.current_org')::uuid = org_id` on every multi-tenant table; service-role connections never bypass; `app.current_org` GUC set via `set_config()` in a transaction (PgBouncer transaction-mode + `SET LOCAL` required).
3. **Database — top-tier (hybrid amendment):** For customers in `tier ∈ { 'enterprise', 'regulated' }`, the sensitive tables listed above live in a per-tenant Postgres schema `tenant_{orgId}.{table}`; `getSupabaseForOrg(orgId)` resolves the schema via the `tier` lookup and sets `search_path` accordingly. RLS remains active on all tables in all schemas (defense-in-depth, not replacement).
4. **Application:** Single `getSupabaseForOrg(orgId)` factory is the only sanctioned client constructor; `globalThis.supabaseAdmin` forbidden outside migrations. Every API route runs through `withOrg(req)` middleware. Static AST check at registration + runtime AsyncLocalStorage check.
5. **Credentials:** Doppler config per org (`flowai/{env}/{orgId}` or `/flowai/{env}/org/{orgId}/product/{productId}/service/{name}`); CredentialAdapter rejects cross-org reads.
6. **Compute / Storage / Events:** R2/S3 paths prefixed by `orgId`; MessageBus topics partitioned `org.{orgId}.*`; audit log partitioned by `orgId` with separate hash chains.

Cross-org leak detection: nightly `tenant_isolation_test` job runs ≥20 attack vectors (crafted JWTs, header tampering, RLS-policy fuzz, schema-search-path injection for hybrid tiers) and writes results to `tenant_isolation_attestation`.

**Tier threshold (CEO L3-7):** A tenant qualifies for schema-per-tenant when **any one** of the following is true:
- Contract value (ARR) ≥ **$250 K**, OR
- Regulatory class triggers (POPIA-sensitive maternal-health data, PCI scope, HIPAA-adjacent, EU GDPR with > 100 K subject records), OR
- CEO designation (e.g., flagship co-development partners with bespoke SLAs).

Tier is recorded on `orgs.tier` at provisioning (see MT2); promotion from `standard` → `enterprise/regulated` requires the migration path below.

**Migration path between RLS-only and schema-per-tenant:**
1. Agent #4 (Tenant Operations) opens a migration ticket `tenant_tier_upgrade_{orgId}`.
2. CEO countersign + Panel ≥7/10 approval recorded in `flowai_audit_log`.
3. Background job creates `tenant_{orgId}` schema, runs `CREATE TABLE … LIKE` for each sensitive table, copies rows under a read-only consistency snapshot, verifies row counts + hash-chain integrity post-copy.
4. Application config flips `orgs.tier` → new tier; `getSupabaseForOrg(orgId)` starts resolving the new schema on next session. In-flight sessions complete against the old schema, then close.
5. Old rows in the public-schema tables are dropped after a 30-day retention window (audit-log retention is permanent; sensitive rows are crypto-shredded per PII policy if applicable).
6. Reverse migration (schema-per-tenant → RLS-only) is supported by the same job in reverse and requires the same approval gate.

**CONFIDENCE:** HIGH (4/5 + CEO override raises to HIGH on the structural-defense question)
**KEY DEPENDENCY:** Supabase RLS provisioning (Phase 1) + Clerk multi-tenant JWT claims (Phase 3 per Layer 2 DG3) + a schema-provisioning job + AsyncLocalStorage propagation of `(orgId, tier)`.
**RESOLVED (CEO L3-7, 2026-05-11 direct):** Option **C — Hybrid.** RLS-only is the default for all tenants; schema-per-tenant is **additive** defense-in-depth for top-tier customers per the threshold above. **S1's "single-database RLS is structurally insufficient" position is adopted partially as a tier-scoped structural defense, not as a full RLS replacement.** Majority view (S2/S3/S10) holds for non-top-tier orgs.

### MT2. Provider onboarding technical sequence

**CONSENSUS SPEC:** `Agent #4.onboardProvider(input)` executes a Postgres transaction wrapping:
1. `INSERT orgs (id, name, tier, fee_schedule_id, sustainability_floor, status='provisioning')`. `tier` is set from input and gates step 1a below.
2. **(top-tier only)** Create per-tenant schema `tenant_{orgId}` and provision sensitive-table copies (`credentials`, `audit_log`, `artifacts`, `score_evaluations`) per MT1 § 3. Required when `tier ∈ {'enterprise','regulated'}`; skipped for `standard`.
3. `INSERT org_users (org_id, user_id, role='owner')` for the seed admin.
4. Doppler API: create config `flowai/prod/{orgId}` with seed secrets.
5. Stripe Connect Express account create (`metadata: { orgId }`); store `stripe_account_id`; register webhooks.
6. RLS + (top-tier) schema-isolation attestation: run `tenant_isolation_test(orgId)` synchronously; abort the transaction if any vector leaks.
7. Seed `flowai_session (org_id, type='onboarding')` + first audit entry with `prevHash=GENESIS_PREV_HASH`.
8. Emit `tenant.provisioned` event; provider stays in `pending_verification` until `onboarding_clearance_passed`.

On failure at any step the transaction rolls back and Doppler/Stripe artifacts are reaped via the `tenant_provisioning_failed` compensation handler. Target latency <30 s for `standard` tier, <120 s for `enterprise/regulated` tier (schema provisioning adds time); idempotency key required on the API call. User's JWT is refreshed to include the new `orgId` claim.
**CONFIDENCE:** HIGH (4/5)
**KEY DEPENDENCY:** Stripe Connect approval (Layer 2 DG3 critical-path) + Doppler API + atomic compensation logic + schema-provisioning job (top-tier path).
**DISSENT:** S1 wants RLS attestation *synchronous* inside the provisioning transaction — **adopted** (item 6 above is synchronous); S2/S3's async-attestation option is rejected.

### MT3. Data export

**CONSENSUS SPEC:** `POST /api/orgs/{orgId}/exports` (auth: org owner) initiates an async export job (Agent #4 or #24) that produces:
- Newline-delimited JSON (JSONL) per tenant-scoped table filtered by `org_id` (RLS) or scoped to the tenant schema (top-tier).
- Audit log dump with hash chain intact (verifiability).
- Artifacts as content-hashed blobs in original format.
- Doppler config snapshot — **secrets redacted** (last-4 only) + a separate signed handoff for full secrets if the provider re-authorizes.
- `MANIFEST.json` with row counts, table list, hash-chain root, schema version, export timestamp.

Delivered as a single tarball to a one-time signed URL valid 7 days. Completeness guarantee: `count(*)` per table at `export_watermark_audit_id` recorded pre-export; post-export verifier asserts row-count + checksum match; mismatch fails the job. POPIA/GDPR portability format = JSON (machine-readable per GDPR Article 20).
**CONFIDENCE:** HIGH (3/5 HIGH + 2 MEDIUM)
**KEY DEPENDENCY:** Object storage with signed URLs (Supabase Storage or R2) + a `pg_dump`-equivalent filtered by `WHERE org_id=$1` (custom job — `pg_dump` itself can't filter by predicate cleanly).
**DISSENT:** S1/S2 mandate a pre-snapshot watermark + completeness verifier — **adopted**; S3/S4/S10's simpler "supabase export" without the watermark step is rejected for $5B compliance posture.

---

## CONTINUOUS CRAWL + MARKETPLACE SPEC

### CM1. Crawl architecture

**CONSENSUS SPEC:** Agent #21 (Pipeline/Crawl Conductor) manages a `crawl_jobs` queue. Triggers: scheduled cron (per-product, default every 6 h), event-driven (post-deploy, marketplace alert, Monitor anomaly, Self-Renewal fix verification, manual). Jobs check out Playwright workers from a pool sized at **15 concurrent workers per tenant (CEO L3-9, 2026-05-11)**, autoscaled within that ceiling, with per-tenant fairness. Each job loads the product's `crawl_config.json` (URLs, depth ≤3, sandbox credentials from Doppler, no-destructive-action selectors). Each crawl runs in `read_only` / `diagnose_only` / `live` mode per PI3 with mandatory `sandbox: true` adapter that intercepts payment/SMS/email APIs and returns canned responses; crawl aborts on any unsandboxed external call. Outputs: Playwright trace + screenshots + console log + network HAR + DOM snapshot, streamed to `crawl_runs` / `crawl_pages` / `crawl_assertions` / `integration_probe_results` with paths `s3://flowai-artifacts/{orgId}/{productId}/crawls/{crawlId}/...`.
**CONFIDENCE:** HIGH (4/5)
**KEY DEPENDENCY:** Playwright worker pool infra (BrowserBase / self-hosted / Vercel Edge with Browser) — capacity is Layer 2 RR1 #2 risk.
**RESOLVED (CEO L3-9, 2026-05-11 direct):** **15 workers per tenant** as compromise between S1's 20 and S4's 10. **Basis: CEO judgment, 2026-05-11; revisit after capacity math from first 30 days of crawl telemetry.** Agent #22 (Audit-Auditor) is responsible for producing the revisit recommendation; the ceiling is adjustable by CEO disposition without re-opening Layer 3 canonical status.

### CM2. Breakage detection data model

**CONSENSUS SPEC:** `BreakageRecord = { breakageId: uuid, crawlId, orgId, productId, severity: P0..P3, category: enum('navigation'|'auth'|'payment'|'integration'|'gtm-tracker'|'api'|'webhook'|'analytics'|'visual-regression'|'performance'|'security'|'content'|'compliance'), selector, expected, actual, evidenceUrls: { screenshot, trace, har, consoleLog }, firstSeenAt, lastSeenAt, occurrenceCount, suspectedRootCause, autoFixCandidate: bool, blastRadius: enum('local'|'product'|'tenant'|'platform'), sideEffectRisk, reproSteps[], confidence }`. Detection: post-crawl differ compares current vs last-known-good (HAR / DOM / pixel diff via `pixelmatch`) using `crawl_rules/*.yaml` (one rule per category). New failures create records; recurring increment `occurrenceCount`. Deduplication via `fingerprint = hash(productId + route/integration + category + normalizedError)`. Records published to `crawl.breakage.detected` topic; Agent #3 (Self-Renewal) consumes with severity-priority queue and emits `PatchProposal` + rollback + re-crawl plan.
**CONFIDENCE:** HIGH (3/5 HIGH + 2 MEDIUM)
**KEY DEPENDENCY:** Crawl rules library (`crawl_rules/*.yaml`) — must be built per-product in PI3 Step 1; currently absent.
**DISSENT:** S1/S2 demand `blastRadius` + `autoFixCandidate` fields — **adopted**; S3/S4/S10's minimal `{url, errorType, severity, timestamp}` shape is rejected.

### CM3. Marketplace intelligence cycle

**CONSENSUS SPEC:** Agent #11 (Strategic Intelligence — with #15 Benchmarking and #17 Product Evolution) runs monthly cron (`0 0 1 * *`) plus event triggers (`marketplace.event.{regulatory|cve|competitor|pricing|model_release|deprecation}`).

**Launch sources (CEO L3-8): public RSS only.** Concretely, at launch Agent #11 ingests:
- Vendor changelogs / release feeds via RSS (OpenAI, Anthropic, Google, Vercel, Stripe, Supabase, Clerk, etc. — curated RSS list).
- Public regulatory feeds (POPIA notices, GDPR EDPB feed, FTC press releases, ICO updates) where RSS exists.
- GitHub Advisory DB (public RSS / Atom feed) and NVD CVE feeds.
- Public competitor blog RSS where available.

**Deferred sources (paid vendor contracts) — NOT INGESTED AT LAUNCH:** Crunchbase API, Bloomberg Law, Electricity Maps, paid pricing/competitive-intel APIs. Activation deferred until Phase 4 vendor contracts close (matches Layer 2 DG2). When activated, these slot in as additional `marketplace.event.*` source channels behind the same dedup + verification gate.

**Verification gate:** Findings require **≥2 independent AI/source confirmations or Playwright/API ground truth** or are tagged `unverified` and cannot auto-execute.

**Output:** `marketplace_events` rows + per-product `SelfRenewalAlert = { id, productId, opportunity: { title, summary, evidenceUrls, confidence, urgency, impact: low|med|high|critical }, executionPaths: [{ mode: 'auto'|'guided'|'manual', estCost, estDuration, rollbackPlan, agentsInvolved[] }], expiresAt }`.

**SLA:** No product may remain >30 days behind relevant marketplace evolution without explicit user acknowledgment.

**CONFIDENCE:** MEDIUM (4/5 MEDIUM + 1 LOW)
**KEY DEPENDENCY:** Curated RSS feed list (build during Phase 1) + a generic RSS fetcher + dedup hashing on findings + Agent #15 / #17 evaluation logic for impact scoring.
**RESOLVED (CEO L3-8, 2026-05-11 direct):** Option **A — public RSS only at launch.** Crunchbase / Bloomberg Law / Electricity Maps are **deferred until paid vendor contracts close.** Matches Layer 2 DG2 (deferred-paid-feeds policy). **S2's "marketplace knowledge graph" framing is adopted as the long-term target architecture; the launch implementation is the RSS subset only.**

### CM4. Self-Renewal Alert delivery

**CONSENSUS SPEC:** Multi-channel fan-out by Agent #9 (GTM) acting as alert dispatcher: in-app (`/alerts` dashboard), email (Resend / SendGrid with signed action links), Slack / Teams webhook (per-org config), and `/api/alerts` for programmatic consumers. **Schema** mirrors CM3's `SelfRenewalAlert` plus `actionTokens: { auto, guided, manual }` — **HMAC-signed, single-use, 7-day TTL**. **User response paths:**
- `auto` → POST `/api/alerts/{id}/execute` with `mode=auto` spawns a pipeline session (`productScope={productId}`, alert payload as `userInputs`), returns `sessionId`.
- `guided` → opens the FlowAI session-builder pre-filled with the alert context.
- `manual` → marks alert acknowledged + records user-supplied resolution.
- `DeferWithAcknowledgment` / `RejectWithReason` are accepted terminal states.

All transitions logged to `alert_lifecycle` (`created → delivered → opened → action_selected → executed → outcome_recorded`).
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** Resend / SendGrid for email + a signed-action-token library (`@panva/jose` or equivalent) + a notification service (Novu or custom on top of provider).
**DISSENT:** S1 mandates HMAC + 7-d TTL on action tokens — **adopted**; S2/S3/S4/S10's generic notification delivery without explicit signing semantics is rejected for $5B trust posture.

---

## (1) MISSING ENGINEERING QUESTIONS — deduplicated union across all 5 reviewers

Ordered by reviewer citation count (most-cited first):

1. **Disaster recovery contract (RTO/RPO + runbook + rehearsal cadence)** — cited by 4 reviewers. Per tier, including Supabase, audit log, artifact store, Doppler, MessageBus, crawl traces, deployment state.
2. **Credential rotation / lifecycle / least-privilege / emergency revocation** — cited by 4. Doppler-managed secrets; propagation latency when a key is rotated; CredentialAdapter rotation surface.
3. **Cost governance / FinOps / per-tenant budgets / kill thresholds** — cited by 4. Per-org, per-product, per-agent, per-session, per-model token budgets before Agent #23 is live; cloud-cost attribution.
4. **Adversarial robustness (prompt injection, hostile crawled pages, poisoned marketplace data, rogue providers, hostile files)** — cited by 4.
5. **Emergency kill-switch authority** — cited by 3. Who can pause agents/crawls/deployments/Stripe/credential access platform-wide; technical enforcement.
6. **Compliance mapping (SOC 2 / GDPR / POPIA / PCI / HIPAA-adjacent maternal health / SMS / IP rights)** — cited by 3. Control mapping + monitoring + audit cadence.
7. **Observability stack for FlowAI itself (Prometheus / SLO dashboards / on-call runbooks, distinct from product Monitor)** — cited by 3.
8. **Capacity planning math + alarm thresholds** — cited by 2. `sessions × steps × LLM calls × token cost × crawl cost = burn rate`. *(Note: Playwright worker ceiling is now CEO-set at 15/tenant per L3-9; remaining capacity math still open.)*
9. **Agent performance calibration over time (confidence, accuracy, regression, repair success, cost, latency, human-override rate)** — cited by 2.
10. **Data governance / retention / deletion / residency / consent / offboarding** — cited by 2 (esp. interaction with GDPR Article 17 vs append-only audit chain).
11. **Model / provider routing policy (risk, cost, latency, jurisdiction, data sensitivity, fallback)** — cited by 2.
12. **Panel anti-circularity for self-orchestration** — cited by 2. Quorum dispatch + substitution + independence preservation.
13. **PII detection + right-to-be-forgotten reconciled with hash-chained audit log** — cited by 2. Crypto-shredding per-subject keys is the leading candidate.
14. **Incident classification + blameless post-mortem template + action-item tracking** — cited by 2.
15. **Distributed tracing standard (OpenTelemetry?)** — cited by 1; trace-id propagation across MessageBus, Playwright workers, agent calls, external API calls.
16. **Schema migration policy (online DDL, backward-compat windows for in-flight sessions, no downtime)** — cited by 1.
17. **Time-of-check-vs-time-of-use between 95/95 audit and deploy + artifact pinning mechanism** — cited by 1. *(Note: addressed in GV2 Step 6 Promote per L3-5.)*
18. **MessageBus delivery guarantees (at-least-once vs exactly-once, DLQ, replay semantics, topic retention)** — cited by 1.
19. **Backpressure / per-tenant fairness (weighted fair queueing when one agent floods the bus or one tenant saturates Playwright pool)** — cited by 1.
20. **Long-running session checkpointing (multi-hour sessions surviving process restart)** — cited by 1.
21. **Clock skew + audit-ordering across multiple writers (vector clocks / Lamport / single-writer guarantee)** — cited by 1.
22. **Model output caching + cache poisoning (key derivation, staleness, invalidation)** — cited by 1.
23. **Feature flag system separate from / merged with AgentRegistry** — cited by 1.
24. **External API versioning + deprecation policy (semver, deprecation windows, sunset signaling)** — cited by 1.
25. **Deploy artifact signing + supply-chain attestation (SLSA, Sigstore)** — cited by 1.
26. **Network egress allowlist + egress proxy + exfiltration detection** — cited by 1.
27. **Customer notification rules (when does breakage trigger provider / end-customer / regulator / status-page notice)** — cited by 1.
28. **False-positive tolerance (rate of crawl / QA / Self-Renewal FPs before authority is reduced)** — cited by 1.
29. **Self-modification boundary (which files / schemas / policies may FlowAI never modify without CEO)** — cited by 1.
30. **Git / concurrency control between agent-building sessions (registry / schema / migration conflicts)** — cited by 1. *(W5b note: the wx-stage-lock protocol shipped in commit df03d58 is the start of this answer, but adoption is still discipline-only.)*
31. **Liability and recourse workflow when an AI-authored action harms a provider or end-customer** — cited by 1.
32. **Prompt versioning + agent eval harness (separate from runtime audit log)** — cited by 1.

---

## (2) MOST DANGEROUS TECHNICAL ASSUMPTION — synthesized (status post-L3-7)

**Originally identified:** the implicit assumption that Supabase RLS + an `app.current_org` GUC is a sufficient multi-tenant blast wall for a 25-agent autonomous OS that ingests tenant data through LLM prompts, runs Playwright crawls with stored credentials, makes outbound model calls and webhook traffic, and writes a single hash-chained audit log shared across orgs.

**Status:** **PARTIALLY MITIGATED via L3-7 (hybrid tier strategy).** Top-tier customers (`enterprise`/`regulated`, ARR ≥ $250 K, regulatory-class data, or CEO designation per MT1) move to schema-per-tenant for sensitive tables, demoting RLS to defense-in-depth for that population. Non-top-tier customers continue on RLS-primary, which is **still flagged as production-incident-class** by the Panel and which still requires the structural reinforcements below.

**Why this assumption remains production-incident-class for non-top-tier orgs:**
- **GUC propagation is fragile.** A single missed `set_config('app.current_org', $1)` in any agent path, queue worker, cron job, or Playwright callback silently disables RLS for that connection — Postgres returns rows from every org with no error. PgBouncer transaction-mode can leak GUCs across requests unless paired with `RESET ALL` or `SET LOCAL` inside an explicit transaction. There is no compile-time check that every code path sets the GUC; failures are silent until a leak is observed in production.
- **Outbound LLM calls cross the boundary.** Agents prompt OpenAI / Anthropic with tenant payloads; once the data is on the wire to a third party, RLS is irrelevant. There is no specified contract for what tenant data may leave the trust boundary, no per-org provider-routing policy, no PII-redaction middleware between agent and model.
- **Playwright workers persist auth state and cookies.** Without per-job ephemeral sandboxes (fresh container per crawl), a worker reused across orgs carries cookies/sessions across the tenant boundary — RLS does not see this.
- **The audit log is hash-chained per-org but stored in one table.** A single bad RLS policy or a stray service-role read discloses cross-tenant audit metadata (competitors, products, costs, decisions — itself sensitive). Top-tier orgs are now isolated per L3-7; standard orgs remain on this shared table.
- **23 dormant agents will be activated under time pressure.** Probability that all of them correctly use the org-scoped client factory, set the GUC under AsyncLocalStorage, and never instantiate a global client approaches zero without compile-time enforcement.

**Structural mitigation (recommended layered defense — items 2/3/4/5 below remain open as Phase 1 work):**
1. **Per-tenant Postgres schemas for top-tier orgs** — **ADOPTED per L3-7** for `credentials`, `audit_log`, `artifacts`, `score_evaluations`. RLS becomes defense-in-depth on top-tier sensitive tables.
2. **Per-org ephemeral Playwright containers** with no shared filesystem; new container per crawl job. — **OPEN.**
3. **Mandatory `OrgContext` type** as the only constructor argument shape accepted by any Supabase / Doppler / LLM client factory, enforced by TypeScript types + a custom ESLint rule banning direct client instantiation. — **OPEN.**
4. **Outbound-call egress proxy** that tags every external call with `orgId` and refuses unlabeled traffic; provides exfiltration detection by design. — **OPEN.**
5. **Hardened sandboxes for agent tool execution** (containment beyond `ToolGateway` action-mediation per L3-1), since LLM agents will find escape hatches in nominally-safe tools. — **OPEN.**

Items 2-5 should be tracked as Phase 1 Defense-in-Depth (DID) work items.

---

## (3) ENGINEERING SPEC SUMMARY — one-paragraph onboarding

FlowAI is a 25-agent autonomous OS where every agent extends `BaseAgent` with a versioned charter (`{ id, version, authority, scopes, topics, sideEffectPolicy }`) and exposes a single `async run(context)` entry point that returns a structured `AgentOutputEnvelope` (`status, artifact, sideEffects[], confidence, evidenceLayer, citations, errors, auditRefs`). Agents fall into three dispatch modes — Step-Owner (subscribes to `pipeline.step.N.request`), Cross-Step (subscribes to event topics), Always-On (cron + event triggers) — all routed by `OrchestratorHub`. **Authority is enforced at a single `ToolGateway` choke point** (L3-1): every side effect is declared as a structured action, validated against the agent's charter via capability tokens, and rejected with auto-rollback + dormant-quarantine on violation. **Tenant isolation is hybrid** (L3-7): Supabase RLS over an `orgId`-aware client factory (`getSupabaseForOrg`) is the default for all tenants, and per-tenant Postgres schemas wrap the sensitive tables (`credentials`, `audit_log`, `artifacts`, `score_evaluations`) for top-tier customers (ARR ≥ $250 K, regulatory class, or CEO designation). Clerk JWT claims, per-org Doppler paths, org-prefixed object-storage keys, and `org.{orgId}.*`-partitioned MessageBus topics complete the isolation stack; audit-log rows are hash-chained per tenant via `auditChain.js` (`prevHash → rowHash → daily Merkle root → immutable storage`). **The 8-step pipeline is sequential by default with two named parallel exceptions** (L3-3): Self-Renewal (#6) runs continuously alongside the main pipeline; GTM (#7) may run alongside Deploy (#5) once Build is sealed. **Gates are run as Spec → Build → Test → Audit → Sign-off → Promote** (L3-5), and **95/95 weights governance criteria 2× readiness criteria** (L3-4). **Monitor uses 50 = green; CLEARED 45-50, CONDITIONAL 30-44, NOT CLEARED <30** (L3-6). **Retries on transient failures follow the `[30 s, 2 min, 10 min]` curve with ±20% jitter** (L3-2). Continuous Playwright crawls run with **15 workers per tenant** (L3-9) and feed a `BreakageRecord` data model into Agent #3 (Self-Renewal); monthly marketplace scans pull **public RSS feeds at launch** (L3-8, paid vendor sources deferred until contracts close) and emit `SelfRenewalAlert`s with HMAC-signed Auto/Guided/Manual action tokens (7-day TTL). Provider onboarding atomically provisions Postgres rows (and tenant schema for top-tier), Doppler config, Stripe Connect account, and the per-tenant audit chain root within a synchronous RLS-attested transaction; data export delivers a hash-verified tarball under a signed URL with a pre-snapshot completeness watermark. The most-dangerous-assumption section flags that RLS-only for non-top-tier orgs remains production-incident-class and that structural reinforcements 2-5 (ephemeral Playwright containers, mandatory `OrgContext`, outbound egress proxy, hardened agent sandboxes) are open Phase 1 work.

---

## CEO DECISIONS — ALL TEN RESOLVED

The 10 flags raised at draft synthesis are resolved as follows. Where the decision was delegated by the CEO to W03, the W03 pick is recorded with the delegation note.

| # | Flag | Resolution | Source | Spec section(s) updated |
|---|---|---|---|---|
| L3-1 | AT3 Authority enforcement location | **Option B** — `ToolGateway` central choke point as single audit point. Slots 1/2/3/4/5 alternatives OVERRULED. | Delegated CEO → W03 pick | AT3 |
| L3-2 | PS2 Retry backoff curve | **Option B** — `[30 s, 2 min, 10 min]` escalating curve. Other 4 curves OVERRULED. | Delegated CEO → W03 pick | PS2 |
| L3-3 | PS3 Cross-step parallelism | **Option A with parallel-where-safe default.** #6 Self-Renewal alongside main pipeline; #7 GTM alongside #5 Deploy. All other combos sequential. | Direct CEO | PS3 |
| L3-4 | GV1 Rubric weights | **Option B** — Governance criteria weighted 2× readiness criteria. (Original CEO input "A & B"; delegated to W03; W03 picked B as safer interpretation for $5B governance platform.) | Delegated CEO → W03 pick | GV1 |
| L3-5 | GV2 6-step Clearance order | **Option A** — Spec → Build → Test → Audit → Sign-off → Promote. Alternative orderings OVERRULED. | Direct CEO | GV2 |
| L3-6 | GV3 Monitor scoring direction | **Option A** — 50 = green; CLEARED 45-50, CONDITIONAL 30-44, NOT CLEARED <30. Matches Locked Rule as written. Slot 2's inversion OVERRULED. | Delegated CEO → W03 pick | GV3 |
| L3-7 | MT1/MT4 Multi-tenancy | **Option C — Hybrid.** Supabase RLS default + schema-per-tenant for top-tier (ARR ≥ $250 K, regulatory class, or CEO designation). Migration path documented. | Direct CEO | MT1, MT2, MT3, AT4, §(2) most-dangerous-assumption |
| L3-8 | CM3 Marketplace sources | **Option A** — Public RSS only at launch. Crunchbase / Bloomberg Law / Electricity Maps deferred until paid vendor contracts. Matches Layer 2 DG2. | Direct CEO | CM3 |
| L3-9 | CM1 Playwright concurrency | **15 workers per tenant.** Compromise between Slot 1's 20 and Slot 4's 10. Basis: CEO judgment, 2026-05-11; revisit after capacity math from first 30 days of crawl telemetry. | Direct CEO | CM1, §(1) item 8 |
| L3-10 | Panel availability process | **SLIM-bundle adopted as default for future engineering consultations.** No code impact; process item only. | Direct CEO | (process — no spec section) |

Follow-up workstream items spawned by the resolutions:
- **MT1 hybrid migration plan:** Agent #4 (Tenant Ops) needs the bidirectional RLS-only ↔ schema-per-tenant migration job (Phase 1 task).
- **CM1 capacity math revisit:** Agent #22 (Audit-Auditor) to produce a worker-ceiling recommendation backed by the first 30 days of crawl telemetry (target review: 2026-06-11).
- **Defense-in-depth items 2-5** from §(2) remain open as Phase 1 DID work.
- **GV1 fixture lock:** `ScoreEvaluator` test fixtures must enforce the 2× governance-vs-readiness weight ratio before any clearance gate goes live (Phase 1 task).

---

## SYNTHESIS METRICS

| Section | Questions | HIGH consensus | MEDIUM consensus | LOW consensus | Status post-CEO |
|---|---|---|---|---|---|
| Per-agent (AT1–AT5) | 5 | 4 | 1 | 0 | AT3 enforcement-location: **RESOLVED (L3-1)** |
| Per-step (PS1–PS4) | 4 | 4 | 0 | 0 | PS2 retry curve **RESOLVED (L3-2)**; PS3 parallelism **RESOLVED (L3-3)** |
| Governance (GV1–GV4) | 4 | 2 | 2 | 0 | GV1 weights **RESOLVED (L3-4)**; GV2 order **RESOLVED (L3-5)**; GV3 direction **RESOLVED (L3-6)** |
| Multi-tenancy (MT1–MT3) | 3 | 3 | 0 | 0 | RLS-vs-schema **RESOLVED via hybrid (L3-7)** |
| Crawl + marketplace (CM1–CM4) | 4 | 3 | 1 | 0 | CM1 concurrency **RESOLVED (L3-9)**; CM3 sources **RESOLVED (L3-8)** |
| **TOTAL** | **20** | **16** | **4** | **0** | **10/10 CEO flags resolved 2026-05-11** |

Consensus rate: **20/20 (100%)** of spec questions reached ≥3-of-5 consensus on the spec shape. Confidence distribution: **HIGH = 16/20 (80%)** · **MEDIUM = 4/20 (20%)** · **LOW = 0**. **All 10 open CEO flags are resolved as of 2026-05-11; spec is canonical as of 2026-05-12.**
