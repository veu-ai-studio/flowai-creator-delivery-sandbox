# FLOWAI Engineering Spec — Draft v1

**Status:** DRAFT (Layer 3 synthesis — not yet promoted to canonical)
**Authored:** 2026-05-11 by W5b
**Inputs:**
- Panel review: `docs/engineering-review/layer3-eng-panel-review-2026-05-11.md`
- 5 LIVE-OK reviewers: `openrouter:anthropic/claude-opus-4.7` (S1), `openrouter:openai/gpt-5.5` (S2), `openrouter:google/gemini-2.5-pro` (S3), `openrouter:perplexity/sonar-pro-search` (S4), `openrouter:openai/gpt-4o-2024-11-20` (S10)
- 5 slots non-responsive: vercel_v0 quota-exhausted, github_models×2 (413 too-large), headless×2 (Playwright codegen not done)
**Anchors:** `docs/FLOWAI_SSOT.md` (Layer 1 canonical) · `docs/FLOWAI_IMPLEMENTATION_PLAN.md` (Layer 2 canonical)
**Synthesis rule:** "Consensus" = position supported by ≥3 of 5 reviewers. Where consensus exists, the spec is given prescriptively; where it doesn't, the section calls out dissent explicitly.

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

**CONSENSUS SPEC:** Authority is enforced in **one mediated path** between the agent and any real-world effect: agents have no ambient credentials, no `globalThis.supabaseAdmin`, no direct outbound calls. Every side-effect-bearing operation is declared in the output envelope as a structured `SideEffect`/`action` (`{ type: 'read'|'write'|'external'|'irreversible', target, payload }` or `{ action: 'git.commit', params: {...} }`) and passed through OrchestratorHub's pre-commit middleware (`enforceAuthority(envelope, agent.authority)`), which validates the requested action against a canonical authority→permitted-actions map. Unauthorized requests throw `AuthorityViolation`, auto-rollback the envelope, write `agent_authority_violation` to the audit log, and place the offending agent in `dormant:true` quarantine. Elevation requires an audit entry `agent_authority_elevation_{agentId}` countersigned by Panel (≥7/10) + CEO; `AgentRegistry` refuses to load any runtime authority that exceeds the registered authority.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** A canonical SideEffect/AuthorityActionMap taxonomy enforced by `OrchestratorHub` (or by an equivalent `ToolGateway` capability-token layer). Five reviewers picked five different homes for the check (S1→SideEffect taxonomy, S2→ToolGateway, S3→AuthorityActionMap, S4→`BaseAgent.guard()`, S10→AgentRegistry); the surface is identical, the host module needs CEO disposition.
**DISSENT:** The enforcement *location* is the largest open structural question in this spec — five reviewers, five answers. Pick one before Phase 1 build-out.

### AT4. Agent isolation between provider orgs

**CONSENSUS SPEC:** `AgentContext.orgId` is mandatory and non-spoofable; `BaseAgent.runWithGuards()` rejects missing/mismatched tenant identifiers before any model or tool call. All DB clients are constructed via a single `getSupabaseForOrg(orgId)` factory that sets the `app.current_org` Postgres GUC consumed by RLS policies; agents may not instantiate their own clients (static AST check at registration + runtime AsyncLocalStorage check). MessageBus envelopes carry `orgId` in the header and the Hub refuses to route messages whose `orgId` differs from the subscribing agent's session. `ContextAssembler` refuses to mix artifacts across orgs in prompt assembly. In-memory caches must be `Map<orgId, T>`-keyed.
**CONFIDENCE:** HIGH (3/5 HIGH + 2 MEDIUM)
**KEY DEPENDENCY:** Supabase RLS provisioning (Phase 1) + Node.js `AsyncLocalStorage` for org-context propagation across awaits + Clerk multi-tenant JWT claims.
**DISSENT:** S1 (MEDIUM) and S4 (MEDIUM) flag RLS-as-sole-blast-wall as fragile; S1 argues for per-tenant Postgres schemas on the highest-sensitivity tables + ephemeral Playwright containers as defense-in-depth. Majority view (S2/S3/S10) treats RLS as sufficient if the org-aware factory is the only constructor and the GUC is set under AsyncLocalStorage.

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
1. **Transient** (timeout, 5xx upstream, rate limit) → exponential-backoff retry by OrchestratorHub / Agent #21 Pipeline Conductor, max 3 attempts with jitter. Retry budget is per-step, not per-session.
2. **Deterministic** (contract violation, governance reject, authority denial, cost exceeded) → no auto-retry; route to Agent #3 (Self-Renewal) for diagnosis or to user gate in guided/manual mode.
3. **Catastrophic** (agent crash, authority violation, unhandled exception) → de-register the agent (`dormant:true`), page on-call via Agent #25, freeze session in `step_blocked` state.

Exhausted retry budget → dead-letter queue + `step_failed` audit + escalation to Agent #25 if `severity≥P1`. All retries write `step_retry_{n}` entries with the prior error envelope. Rollback is mandatory if the failed step already produced deployed or externally visible changes.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** Agent #21 Pipeline Conductor + a durable job queue (BullMQ/Redis or Supabase queues) — currently in-memory, must move to durable in Phase 1.
**DISSENT:** Backoff curves diverge widely: S1=`[2s, 8s, 30s]`, S2=`30s→2m→10m`, S3=`5s, 30s, 120s`, S4=`1s→2s→4s`, S10=exponential to 5min. **Open: CEO must pick one curve before Phase 1.**

### PS3. Step parallelism

**CONSENSUS SPEC:** Within a single `pipelineRunId`/session, the canonical 8-step order is **strictly sequential** at the step level: Research(1) → Design(2) → Build(3) → QA(4) → Deploy(5) → Self-Renewal(6) → GTM(7) → Monitor(8) (numbers per current canonical step order). Hard dependencies: Design requires Research; Build requires Design; QA requires Build; Deploy requires QA pass. **Parallelism allowed inside steps** (multi-source Research, design alternatives, test shards, crawl probes, score sub-rubrics, GTM channel checks). Cross-step speculative execution is permitted only as `shadow_artifact` and cannot advance gates or deploy. Parallel sessions across different `pipelineRunId`s are unrestricted. Enforcement: `PipelineDAG` state machine in OrchestratorHub backed by Postgres (transactional state transitions, not in-memory).
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** `PipelineDAG` state machine in OrchestratorHub backed by transactional Postgres state.
**DISSENT:** S1 permits cross-step parallelism for #6 Self-Renewal (event-driven, always-on alongside any step) and #7 GTM (alongside #5 Deploy once Build is sealed); S10 separately groups steps 1+2+7 as parallel-capable. S3/S4 hold the line at strictly sequential. **Open: do continuous-context agents (#6, #8) overlap the linear step machine, or run as Cross-Step / Always-On modes outside the DAG?**

### PS4. Step audit trail

**CONSENSUS SPEC:** Every step boundary writes to `flowai_audit_log`: at minimum `{ auditId: uuid, ts: timestamptz, orgId, productScope, sessionId, runId, stepNumber, stepType, agentId, agentVersion, eventType: 'step_started'|'step_completed'|'step_failed'|'step_skipped', traceId, parentTraceId, inputHash: sha256, outputHash: sha256, governanceScore, readinessScore, confidence, evidenceLayer, sideEffectsCount, panelDecisionId?, prevHash: sha256, rowHash: sha256, schemaVersion }`. `prevHash` chains to the previous row for the same `(orgId, productScope)`; `rowHash = sha256(canonicalJson(row \ rowHash))`. RLS forbids UPDATE/DELETE — corrections are new rows referencing `supersedesAuditId`. Chain validation via `audit_chain_verify(orgId, productScope)`.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** `flowai_audit_log` table + Postgres trigger enforcing append-only + `auditChain.js` library.
**DISSENT:** None substantive — all 5 reviewers converge on hash-chained append-only.

---

## GOVERNANCE SPECS

### GV1. 95/95 scoring rubric

**CONSENSUS SPEC:** Both scores are 0–100 weighted sums computed by `ScoreEvaluator.score(artifact, context) → { governance, readiness, breakdown, evidence }`; both must independently be ≥95 to pass (no compensation between them). **Governance score** factors (cross-reviewer union): authority compliance, audit/provenance completeness, evidence quality (L1–L5 tagging), tenant isolation, safety/security, policy/clearance alignment, hallucination risk (any unverified L1/L2 claim hard-caps the score). **Readiness score** factors: test coverage, functional correctness (golden output diff), integration/crawl pass rate, operational health, rollback rehearsal recency, security posture, performance budget, credential readiness, documentation, GTM/customer-impact readiness. Any authority violation, cross-tenant leak, or failed critical security check hard-caps the relevant score below 95.
**CONFIDENCE:** MEDIUM (4/5 MEDIUM + 1 HIGH)
**KEY DEPENDENCY:** `ScoreEvaluator.js` + **exact weights need CEO sign-off** — current proposals are inferred and they diverge by reviewer.
**DISSENT:** Weights diverge widely (S1 governance: testCoverage 0.25 / contractCompliance 0.20 / authority 0.15 …; S2: authority 20 / isolation 15 / audit 15 / safety 20 / evidence 15 / policy 15; S3: lint 20 / security 30 / provenance 20 / authority 30; S4: 5×20 split; S10: generic). **Open: CEO must lock weights before Phase 1.**

### GV2. 6-step Clearance Protocol

**CONSENSUS SPEC:** Implemented as `clearance.runAll(artifactId, context) → ClearanceResult[]`, each step a discrete async check returning `{ pass, evidence, blockers }`. Step semantics (cross-reviewer union, sequence approximate):
1. **Artifact / Code Integrity:** required artifacts present + schemas validate + content hashes match; `git status --porcelain` empty + commit signed + last 10 CI runs green.
2. **95/95 Quality:** `score_evaluations.governanceScore ≥ 95 AND readinessScore ≥ 95` for the artifact's commit hash.
3. **Authority/Scope Compliance:** zero `agent_authority_violation` events for the session; tool calls within `authorityGrant`.
4. **Tenant / Security / Audit Check:** RLS isolation test passes + Doppler path scoped + dependency/security scans clean + audit chain intact (`audit_chain_verify(orgId)` true).
5. **Operational Verification:** full vitest suite green vs Phase-0 baseline (881-test snapshot) + Monitor 0-50 ≤10 (green) + crawl/probe pass + rollback rehearsal recorded.
6. **Human/Panel Sign-off:** required Panel ≥7/10 decision + CEO countersign for high-risk releases + audit-chain finality verified.

Each step writes `clearance_step_{n}_{pass|fail}` to audit log; any fail blocks deploy.
**CONFIDENCE:** HIGH (4/5)
**KEY DEPENDENCY:** Reliable API access to GitHub (CI status) + issue tracker (Linear/Jira) + the canonical `test_baseline.json` snapshot (must be created at Phase-0 lock).
**DISSENT:** Order of steps varies (S1 = Code/Test/95/Audit/Authority/Operational; S4 = 95/Authority/RLS/Rollback/Panel/Monitor; S10 = generic CI/CD). **Open: lock the canonical 6-step order before Phase 1.**

### GV3. Monitor 0–50 score computation

**CONSENSUS SPEC:** Score produced by Agent #10 (Monitor) on a sliding window (~5 min) and published to `monitor.score.{productId}` every 60 s. Signals (cross-reviewer union, normalized 0–100): uptime/availability, error rate, p95 latency, crawl pass-rate, integration probe health, marketplace freshness (`days_since_last_scan / 30 × 100`), cost-budget headroom, security/credential health, user-impact signals. Critical conditions (cross-tenant leak, payment misrouting, credential exposure, active exploit) **override arithmetic and force the score to red**. Thresholds: ≥45 = green / 30–44 = degraded / <30 = red (auto-pages on-call via Agent #25).
**CONFIDENCE:** MEDIUM (4/5 MEDIUM + 1 HIGH)
**KEY DEPENDENCY:** Agent #10 + product-side `/api/health` standardized contract (currently varies per product) + observability stack (Sentry, Vercel log drains).
**DISSENT:** **Scale direction is contested.** S1/S3/S4/S10 use 0–50 with 50=green and ≥45 passing. **S2 inverts it: 0=green, 50=blocked.** Both come from the same FlowAI Locked Rules text — the rule is ambiguous. **Open: CEO must lock direction before Phase 1.** Weights also diverge (S1's 8-component / S10's 4-component). Layer 2 anchored "≥45 green" so the majority view is more likely canonical, but it warrants explicit confirmation.

### GV4. Audit log integrity

**CONSENSUS SPEC:** `flowai_audit_log` is **append-only** enforced by Postgres trigger (`raise exception` on UPDATE/DELETE) and RLS that permits INSERT only via the `flowai_audit_writer` service role. Each row carries `prevHash` (sha256 of previous row's `rowHash` for the same `(orgId, productScope)`) and `rowHash` (sha256 of canonical JSON of the row minus `rowHash`). Chains partitioned by `orgId` plus a global chain for platform events. Chain-verifier function `audit_chain_verify(orgId, productScope)` runs nightly via Agent #22 (Audit-Auditor) and on-demand pre-deploy. Daily Merkle root of all chains exported to immutable storage (S3 Object Lock or Cloudflare R2 with versioning) and optionally published to a public ledger endpoint. Any chain break raises P0 incident, freezes the affected tenant, pages CEO.
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** `auditChain.js` (already shipped in commit 496886d) + immutable external storage (S3 Object Lock or R2 with versioning — must contract).
**DISSENT:** None substantive.

---

## MULTI-TENANCY SPEC

### MT1. Org isolation stack

**CONSENSUS SPEC:** Five enforced layers:
1. **Auth/Session:** Clerk JWT carries `orgId` claim.
2. **Database:** Supabase RLS policy `current_setting('app.current_org')::uuid = org_id` on every multi-tenant table; service-role connections never bypass; `app.current_org` GUC set via `set_config()` in a transaction (PgBouncer transaction-mode + `SET LOCAL` required).
3. **Application:** Single `getSupabaseForOrg(orgId)` factory is the only sanctioned client constructor; `globalThis.supabaseAdmin` forbidden outside migrations. Every API route runs through `withOrg(req)` middleware.
4. **Credentials:** Doppler config per org (`flowai/{env}/{orgId}` or `/flowai/{env}/org/{orgId}/product/{productId}/service/{name}`); CredentialAdapter rejects cross-org reads.
5. **Compute / Storage / Events:** R2/S3 paths prefixed by `orgId`; MessageBus topics partitioned `org.{orgId}.*`; audit log partitioned by `orgId` with separate hash chains.

Cross-org leak detection: nightly `tenant_isolation_test` job runs ≥20 attack vectors (crafted JWTs, header tampering, RLS-policy fuzz) and writes results to `tenant_isolation_attestation`.
**CONFIDENCE:** HIGH (4/5)
**KEY DEPENDENCY:** Supabase RLS provisioning (Phase 1) + Clerk multi-tenant JWT claims (Phase 3 per Layer 2 DG3).
**DISSENT:** S1 (MEDIUM) argues that single-database RLS is structurally insufficient and recommends **per-tenant Postgres schemas** for the highest-sensitivity tables (credentials, audit log, artifacts), reducing RLS to defense-in-depth. The other 4 reviewers treat RLS as sufficient.

### MT2. Provider onboarding technical sequence

**CONSENSUS SPEC:** `Agent #4.onboardProvider(input)` executes a Postgres transaction wrapping:
1. `INSERT orgs (id, name, tier, fee_schedule_id, sustainability_floor, status='provisioning')`.
2. `INSERT org_users (org_id, user_id, role='owner')` for the seed admin.
3. Doppler API: create config `flowai/prod/{orgId}` with seed secrets.
4. Stripe Connect Express account create (`metadata: { orgId }`); store `stripe_account_id`; register webhooks.
5. RLS policy attestation: run `tenant_isolation_test(orgId)` synchronously; abort the transaction if any vector leaks.
6. Seed `flowai_session (org_id, type='onboarding')` + first audit entry with `prevHash=GENESIS_PREV_HASH`.
7. Emit `tenant.provisioned` event; provider stays in `pending_verification` until `onboarding_clearance_passed`.

On failure at any step the transaction rolls back and Doppler/Stripe artifacts are reaped via the `tenant_provisioning_failed` compensation handler. Target latency <30 s; idempotency key required on the API call. User's JWT is refreshed to include the new `orgId` claim.
**CONFIDENCE:** HIGH (4/5)
**KEY DEPENDENCY:** Stripe Connect approval (Layer 2 DG3 critical-path) + Doppler API + atomic compensation logic.
**DISSENT:** S1 wants RLS attestation *synchronous* inside the provisioning transaction; S2/S3 are okay with running it asynchronously as part of the clearance gate.

### MT3. Data export

**CONSENSUS SPEC:** `POST /api/orgs/{orgId}/exports` (auth: org owner) initiates an async export job (Agent #4 or #24) that produces:
- Newline-delimited JSON (JSONL) per tenant-scoped table filtered by `org_id`.
- Audit log dump with hash chain intact (verifiability).
- Artifacts as content-hashed blobs in original format.
- Doppler config snapshot — **secrets redacted** (last-4 only) + a separate signed handoff for full secrets if the provider re-authorizes.
- `MANIFEST.json` with row counts, table list, hash-chain root, schema version, export timestamp.

Delivered as a single tarball to a one-time signed URL valid 7 days. Completeness guarantee: `count(*)` per table at `export_watermark_audit_id` recorded pre-export; post-export verifier asserts row-count + checksum match; mismatch fails the job. POPIA/GDPR portability format = JSON (machine-readable per GDPR Article 20).
**CONFIDENCE:** HIGH (3/5 HIGH + 2 MEDIUM)
**KEY DEPENDENCY:** Object storage with signed URLs (Supabase Storage or R2) + a `pg_dump`-equivalent filtered by `WHERE org_id=$1` (custom job — `pg_dump` itself can't filter by predicate cleanly).
**DISSENT:** S1/S2 mandate a pre-snapshot watermark + completeness verifier; S3/S4/S10 accept simpler "supabase export" without the watermark step.

---

## CONTINUOUS CRAWL + MARKETPLACE SPEC

### CM1. Crawl architecture

**CONSENSUS SPEC:** Agent #21 (Pipeline/Crawl Conductor) manages a `crawl_jobs` queue. Triggers: scheduled cron (per-product, default every 6 h), event-driven (post-deploy, marketplace alert, Monitor anomaly, Self-Renewal fix verification, manual). Jobs check out Playwright workers from a pool (target 10–20 concurrent, autoscaled, per-tenant fairness), load product's `crawl_config.json` (URLs, depth ≤3, sandbox credentials from Doppler, no-destructive-action selectors). Each crawl runs in `read_only` / `diagnose_only` / `live` mode per PI3 with mandatory `sandbox: true` adapter that intercepts payment/SMS/email APIs and returns canned responses; crawl aborts on any unsandboxed external call. Outputs: Playwright trace + screenshots + console log + network HAR + DOM snapshot, streamed to `crawl_runs` / `crawl_pages` / `crawl_assertions` / `integration_probe_results` with paths `s3://flowai-artifacts/{orgId}/{productId}/crawls/{crawlId}/...`.
**CONFIDENCE:** HIGH (4/5)
**KEY DEPENDENCY:** Playwright worker pool infra (BrowserBase / self-hosted / Vercel Edge with Browser) — capacity is Layer 2 RR1 #2 risk.
**DISSENT:** Worker-pool concurrency target diverges: S1 = 20 / S4 = 10 per tenant. Material for capacity planning.

### CM2. Breakage detection data model

**CONSENSUS SPEC:** `BreakageRecord = { breakageId: uuid, crawlId, orgId, productId, severity: P0..P3, category: enum('navigation'|'auth'|'payment'|'integration'|'gtm-tracker'|'api'|'webhook'|'analytics'|'visual-regression'|'performance'|'security'|'content'|'compliance'), selector, expected, actual, evidenceUrls: { screenshot, trace, har, consoleLog }, firstSeenAt, lastSeenAt, occurrenceCount, suspectedRootCause, autoFixCandidate: bool, blastRadius: enum('local'|'product'|'tenant'|'platform'), sideEffectRisk, reproSteps[], confidence }`. Detection: post-crawl differ compares current vs last-known-good (HAR / DOM / pixel diff via `pixelmatch`) using `crawl_rules/*.yaml` (one rule per category). New failures create records; recurring increment `occurrenceCount`. Deduplication via `fingerprint = hash(productId + route/integration + category + normalizedError)`. Records published to `crawl.breakage.detected` topic; Agent #3 (Self-Renewal) consumes with severity-priority queue and emits `PatchProposal` + rollback + re-crawl plan.
**CONFIDENCE:** HIGH (3/5 HIGH + 2 MEDIUM)
**KEY DEPENDENCY:** Crawl rules library (`crawl_rules/*.yaml`) — must be built per-product in PI3 Step 1; currently absent.
**DISSENT:** S1/S2 demand `blastRadius` + `autoFixCandidate` fields; S3/S4/S10 specify a minimal `{url, errorType, severity, timestamp}` shape.

### CM3. Marketplace intelligence cycle

**CONSENSUS SPEC:** Agent #11 (Strategic Intelligence — with #15 Benchmarking and #17 Product Evolution) runs monthly cron (`0 0 1 * *`) plus event triggers (`marketplace.event.{regulatory|cve|competitor|pricing|model_release|deprecation}`). **Sources:** Crunchbase API (competitor funding), GitHub Advisory DB + NVD (CVE), vendor changelogs (RSS / API), pricing scrapers (Playwright), model release feeds (OpenAI / Anthropic / Google), regulatory feeds (POPIA, GDPR, FTC). Findings require **≥2 independent AI/source confirmations or Playwright/API ground truth** or are tagged `unverified` and cannot auto-execute. **Output:** `marketplace_events` rows + per-product `SelfRenewalAlert = { id, productId, opportunity: { title, summary, evidenceUrls, confidence, urgency, impact: low|med|high|critical }, executionPaths: [{ mode: 'auto'|'guided'|'manual', estCost, estDuration, rollbackPlan, agentsInvolved[] }], expiresAt }`. **No product may remain >30 days behind relevant marketplace evolution without explicit user acknowledgment.**
**CONFIDENCE:** MEDIUM (4/5 MEDIUM + 1 LOW)
**KEY DEPENDENCY:** External vendor contracts (Crunchbase / GitHub Advisory / regulatory feeds / model release feeds) — Layer 2 DG2 deferred them to Phase 4.
**DISSENT:** S1 marks the whole question LOW confidence on external-dependency risk; S2 frames the source set as a curated "marketplace knowledge graph" rather than raw feeds. **Open: which sources are bootstrapped from public RSS vs which require paid contracts?**

### CM4. Self-Renewal Alert delivery

**CONSENSUS SPEC:** Multi-channel fan-out by Agent #9 (GTM) acting as alert dispatcher: in-app (`/alerts` dashboard), email (Resend / SendGrid with signed action links), Slack / Teams webhook (per-org config), and `/api/alerts` for programmatic consumers. **Schema** mirrors CM3's `SelfRenewalAlert` plus `actionTokens: { auto, guided, manual }` — **HMAC-signed, single-use, 7-day TTL**. **User response paths:**
- `auto` → POST `/api/alerts/{id}/execute` with `mode=auto` spawns a pipeline session (`productScope={productId}`, alert payload as `userInputs`), returns `sessionId`.
- `guided` → opens the FlowAI session-builder pre-filled with the alert context.
- `manual` → marks alert acknowledged + records user-supplied resolution.
- `DeferWithAcknowledgment` / `RejectWithReason` are accepted terminal states.

All transitions logged to `alert_lifecycle` (`created → delivered → opened → action_selected → executed → outcome_recorded`).
**CONFIDENCE:** HIGH (5/5)
**KEY DEPENDENCY:** Resend / SendGrid for email + a signed-action-token library (`@panva/jose` or equivalent) + a notification service (Novu or custom on top of provider).
**DISSENT:** S1 mandates HMAC + 7-d TTL on action tokens; S2/S3/S4/S10 accept generic notification delivery without explicit signing semantics.

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
8. **Capacity planning math + alarm thresholds** — cited by 2. `sessions × steps × LLM calls × token cost × crawl cost = burn rate`.
9. **Agent performance calibration over time (confidence, accuracy, regression, repair success, cost, latency, human-override rate)** — cited by 2.
10. **Data governance / retention / deletion / residency / consent / offboarding** — cited by 2 (esp. interaction with GDPR Article 17 vs append-only audit chain).
11. **Model / provider routing policy (risk, cost, latency, jurisdiction, data sensitivity, fallback)** — cited by 2.
12. **Panel anti-circularity for self-orchestration** — cited by 2. Quorum dispatch + substitution + independence preservation.
13. **PII detection + right-to-be-forgotten reconciled with hash-chained audit log** — cited by 2. Crypto-shredding per-subject keys is the leading candidate.
14. **Incident classification + blameless post-mortem template + action-item tracking** — cited by 2.
15. **Distributed tracing standard (OpenTelemetry?)** — cited by 1; trace-id propagation across MessageBus, Playwright workers, agent calls, external API calls.
16. **Schema migration policy (online DDL, backward-compat windows for in-flight sessions, no downtime)** — cited by 1.
17. **Time-of-check-vs-time-of-use between 95/95 audit and deploy + artifact pinning mechanism** — cited by 1.
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

## (2) MOST DANGEROUS TECHNICAL ASSUMPTION — synthesized

**The implicit assumption that Supabase RLS + an `app.current_org` GUC is a sufficient multi-tenant blast wall for a 25-agent autonomous OS that ingests tenant data through LLM prompts, runs Playwright crawls with stored credentials, makes outbound model calls and webhook traffic, and writes a single hash-chained audit log shared across orgs.**

This is the position **all 5 reviewers converge on** (S1, S2, S4, S10 name it explicitly; S3 names the adjacent assumption — "OrchestratorHub action-mediation as a sufficient security boundary for LLM agents"). It is also the assumption that Layer 2 RR1 #1 already calls out as the top risk; the canonical answer there is "dedicated security sprint with ≥20 attack vectors" — but **that is a test-time assertion, not a structural defense**. Tests prove safety in the cases tested; they say nothing about the cases not tested.

**Why it's production-incident-class:**
- **GUC propagation is fragile.** A single missed `set_config('app.current_org', $1)` in any agent path, queue worker, cron job, or Playwright callback silently disables RLS for that connection — Postgres returns rows from every org with no error. PgBouncer transaction-mode can leak GUCs across requests unless paired with `RESET ALL` or `SET LOCAL` inside an explicit transaction. There is no compile-time check that every code path sets the GUC; failures are silent until a leak is observed in production.
- **Outbound LLM calls cross the boundary.** Agents prompt OpenAI / Anthropic with tenant payloads; once the data is on the wire to a third party, RLS is irrelevant. There is no specified contract for what tenant data may leave the trust boundary, no per-org provider-routing policy, no PII-redaction middleware between agent and model.
- **Playwright workers persist auth state and cookies.** Without per-job ephemeral sandboxes (fresh container per crawl), a worker reused across orgs carries cookies/sessions across the tenant boundary — RLS does not see this.
- **The audit log is hash-chained per-org but stored in one table.** A single bad RLS policy or a stray service-role read discloses cross-tenant audit metadata (competitors, products, costs, decisions — itself sensitive).
- **23 dormant agents will be activated under time pressure.** Probability that all of them correctly use the org-scoped client factory, set the GUC under AsyncLocalStorage, and never instantiate a global client approaches zero without compile-time enforcement.

**Structural mitigation (recommended layered defense):**
1. **Separate Postgres schemas (or databases) per tenant** for the highest-sensitivity tables (credentials, audit log, artifacts). RLS becomes defense-in-depth rather than the primary boundary. (S1)
2. **Per-org ephemeral Playwright containers** with no shared filesystem; new container per crawl job. (S1)
3. **Mandatory `OrgContext` type** as the only constructor argument shape accepted by any Supabase / Doppler / LLM client factory, enforced by TypeScript types + a custom ESLint rule banning direct client instantiation. (S1, S2)
4. **Outbound-call egress proxy** that tags every external call with `orgId` and refuses unlabeled traffic; provides exfiltration detection by design. (S1, implicit in S2)
5. **Hardened sandboxes for agent tool execution** (containment beyond OrchestratorHub action-mediation), since LLM agents will find escape hatches in nominally-safe tools. (S3)

Any one of these alone is insufficient; layered, they make the assumption survivable.

---

## (3) ENGINEERING SPEC SUMMARY — one-paragraph onboarding

FlowAI is a 25-agent autonomous OS where every agent extends `BaseAgent` with a versioned charter (`{ id, version, authority, scopes, topics, sideEffectPolicy }`) and exposes a single `async run(context)` entry point that returns a structured `AgentOutputEnvelope` (`status, artifact, sideEffects[], confidence, evidenceLayer, citations, errors, auditRefs`). Agents fall into three dispatch modes — Step-Owner (subscribes to `pipeline.step.N.request`), Cross-Step (subscribes to event topics), Always-On (cron + event triggers) — all routed by `OrchestratorHub`, which is also the sole mediation point for authority: every side effect is declared as a structured action, validated against the agent's charter, and rejected with auto-rollback + dormant-quarantine on violation. Tenant isolation layers Supabase RLS over an `orgId`-aware client factory (`getSupabaseForOrg`), Clerk JWT claims, per-org Doppler paths, org-prefixed object-storage keys, and `org.{orgId}.*`-partitioned MessageBus topics; audit-log rows are hash-chained per tenant via `auditChain.js` (`prevHash → rowHash → daily Merkle root → immutable storage`). The 8-step pipeline is strictly sequential at the step level with parallelism inside steps, gated by a 95/95 `ScoreEvaluator` rubric (Governance + Readiness scores, each 0–100, both must be ≥95) and a 6-step Clearance Protocol (code integrity / test conformance / 95/95 / audit chain / authority compliance / operational health) before any deploy. Continuous Playwright crawls feed a `BreakageRecord` data model into Agent #3 (Self-Renewal); monthly marketplace scans (Crunchbase / CVE / regulatory / model-release feeds) emit `SelfRenewalAlert`s with HMAC-signed Auto/Guided/Manual action tokens (7-day TTL). Provider onboarding atomically provisions Postgres rows, Doppler config, Stripe Connect account, and the per-tenant audit chain root within a synchronous RLS-attested transaction; data export delivers a hash-verified tarball under a signed URL with a pre-snapshot completeness watermark. The single load-bearing assumption — that Supabase RLS is the multi-tenant boundary — is unanimously flagged by the panel as production-incident-class and needs structural reinforcement (per-tenant schemas for sensitive tables, ephemeral Playwright containers, mandatory `OrgContext` factory, outbound egress proxy, hardened agent sandboxes) before the substrate carries paying traffic.

---

## OPEN ITEMS FOR CEO DISPOSITION

The synthesis surfaced several questions where reviewers diverged enough that consensus alone can't pick the answer:

1. **AT3 — Authority enforcement location.** Five reviewers picked five different homes (SideEffect taxonomy in OrchestratorHub / ToolGateway with capability tokens / AuthorityActionMap JSON / `BaseAgent.guard()` / AgentRegistry runtime check). Surface is identical; module ownership needs CEO disposition before Phase 1.
2. **PS2 — Retry backoff curve.** Five distinct curves on the table (`[2s,8s,30s]` / `30s→2m→10m` / `[5s,30s,120s]` / `[1s,2s,4s]` / exponential to 5 min). Pick one before durable-queue wiring.
3. **PS3 — Cross-step parallelism.** Does Agent #6 (Self-Renewal) run alongside the step machine, and may #7 (GTM) run alongside #5 (Deploy)? S1 says yes, S3/S4 say strictly sequential.
4. **GV1 — 95/95 rubric weights.** No two reviewers agree on the weight distribution. CEO sign-off required before `ScoreEvaluator` weights are committed.
5. **GV2 — Canonical 6-step Clearance order.** Three different orderings on the table; lock one.
6. **GV3 — Monitor scale direction.** S2 inverts the scale (0=green, 50=blocked); S1/S3/S4/S10 use 50=green, ≥45 passing. Lock direction.
7. **MT1 / MT4 — RLS-only vs schema-per-tenant for sensitive tables.** S1's structural defense vs the majority's RLS-primary view; the most-dangerous-assumption section makes this a top-level CEO call.
8. **CM3 — Marketplace source set.** Which sources are bootstrapped from public RSS vs which require paid vendor contracts (Crunchbase, Bloomberg Law, Electricity Maps deferred per Layer 2 DG2)?
9. **CM1 — Playwright worker concurrency target.** S1=20 / S4=10 per tenant; needed for capacity planning + RR1 #2 risk math.
10. **Panel non-responsiveness.** 5 of 10 panel slots could not respond this turn (Vercel v0 quota, GitHub Models 413, headless adapters not wired). Layer 3 was a 5-of-10 panel, not the 10/10 the Locked Rule mandates. Future synthesis dispatches should either (a) shrink the artifact below 8000 tokens for GitHub Models, (b) buy more Vercel v0 quota, or (c) ship the Playwright codegen for the two headless slots.

---

## SYNTHESIS METRICS

| Section | Questions | HIGH consensus | MEDIUM consensus | LOW consensus | Key open question |
|---|---|---|---|---|---|
| Per-agent (AT1–AT5) | 5 | 4 | 1 | 0 | AT3 enforcement-location dissent |
| Per-step (PS1–PS4) | 4 | 4 | 0 | 0 | PS2 retry curve, PS3 parallelism |
| Governance (GV1–GV4) | 4 | 2 | 2 | 0 | GV1 weights, GV3 scale direction |
| Multi-tenancy (MT1–MT3) | 3 | 3 | 0 | 0 | RLS-only vs schema-per-tenant |
| Crawl + marketplace (CM1–CM4) | 4 | 3 | 1 | 0 | CM3 source contracts |
| **TOTAL** | **20** | **16** | **4** | **0** | — |

Consensus rate: **20/20 (100%)** of questions reached ≥3-of-5 consensus on the spec shape. Confidence distribution: **HIGH = 16/20 (80%)** · **MEDIUM = 4/20 (20%)** · **LOW = 0**.
