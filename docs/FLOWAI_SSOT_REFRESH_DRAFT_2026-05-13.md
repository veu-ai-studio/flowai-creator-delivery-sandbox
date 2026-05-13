# FlowAI SSOT — REFRESH DRAFT 2026-05-13

## Status

**DRAFT REFRESH** of `docs/FLOWAI_SSOT.md` (CANONICAL as of 2026-05-11), inventorying the diff between the canonical SSOT text and shipped repo state as of 2026-05-13.

**NOT CANONICAL.** Promotion to canonical requires:

1. CEO disposition of each proposed amendment below.
2. Panel ≥7/10 supermajority on the accepted amendments per MG2 (canonical decision threshold).
3. A separate dispatch to apply accepted text into `docs/FLOWAI_SSOT.md`, archive the prior version into `docs/archive/`, and update `docs/CANONICAL_HISTORY.md`.

**Authoring scope:** W5a, draft-only. The canonical SSOT file is NOT modified by this dispatch.

---

## What's changed since 2026-05-11 (commit inventory)

Every claim in this draft is backed by a specific commit hash. The list below is the source map.

| Commit | Date | Change |
|---|---|---|
| `d2bcbbd` | 2026-05-11 11:39 | Phase 1.0 25-agent roster lock. `BaseAgent.js` partition validator enforces EXACTLY 25 IDs; `_registry.ts` extended with #21–#25 charters; `credentials/CredentialAdapter.ts` ID bounds widened 20→25. |
| `5006431` | 2026-05-11 14:57 | Agent #4 Provider Onboarding SHIPPED-GREEN (`Agent4ProviderOnboarding.js`, 51 new tests). Recommend_only authority preserved. |
| `2fff449` | 2026-05-11 15:39 | Agent #5 End-Customer Intake SHIPPED-GREEN (`Agent5EndCustomerIntake.js`, 57 new tests). Bus-subscription to `4.provider.suspended.v1`. |
| `2054a0d` | 2026-05-11 16:35 | W3 audit subsystem landed: `auditOfAuditor.js`, `disagreementProtocol.js`, `defectDatabase.js`, `reportGenerator.js`, `rubricRunner.js`, per-criterion evaluators, migration `0010_w3_audit_infra.sql`. |
| `496886d` | 2026-05-11 18:48 | Shared layer complete: `errors.js`, `logger.js`, `auditChain.js`. Full vitest 1115/1115 passing across 52 files. |
| `6e9660e` | 2026-05-11 23:29 | `W03_STANDING_OPERATING_PROTOCOL.md` promoted to CANONICAL (maximum-oversight configuration). |
| `c5720a5` | 2026-05-12 | `FLOWAI_ENGINEERING_SPEC.md` (Layer 3) promoted to CANONICAL — 10 CEO decisions applied. |
| `511493e` | 2026-05-12 12:32 | W03 Build 1 shipped: `scripts/w03ComplianceProbe.mjs` (18-rule deterministic probe) + `src/lib/agents/w03ComplianceWiring.js` (Agent #3 synchronous reviewer per CEO Decision 4). |
| `8e29e84` | 2026-05-12 21:43 | CredentialAdapter accepts `prd` (canonical Doppler config name) + `prod` (alias). `docs/operations/credential-adapter-naming.md` published. |
| `c533e2d` | 2026-05-12 22:09 | Vercel Deployment Protection bypass LIVE. `VERCEL_AUTOMATION_BYPASS_SECRET` provisioned in Doppler `flowai/prd`, auto-synced to Vercel project. End-to-end verified (HTTP 200 with bypass / HTTP 401 without). `docs/operations/vercel-deployment-protection-bypass.md` published. |
| `de6b9e0` | 2026-05-12 | `PANEL_INFRASTRUCTURE.md` engagement filter §; `docs/operations/panel-engagement-filter.md` published. |
| `9997f83` | 2026-05-12 23:09 | W3 stub replacement complete: 10 governance + readiness evaluators replaced with real measurement, 3 deferred (`gov.ip_protection`, `rdy.performance`, `rdy.observability`) allowlisted via `w3/deferred-evaluators.json`, CI guard fails on out-of-allowlist deferred. All 10 CEO flag dispositions from 2026-05-13 applied. |
| `32cd109` | 2026-05-13 | Panel Slots 6+7 swapped `github_models` → `openrouter` (`mistralai/mistral-large-2411`, `deepseek/deepseek-r1`) to bypass GitHub Models 8K free-tier token cap. |
| `f1b189e` | 2026-05-13 | Slot 8 Base44 chat headless adapter scaffolded (`scripts/lib/headless/base44-chat.mjs`, Playwright + storage-state reuse). LIVE once `scripts/setup-base44-session.mjs` is run by CEO. |
| `efe20aa` | 2026-05-13 | Slot 9 Replit agent headless adapter scaffolded (`scripts/lib/headless/replit-agent.mjs`, same pattern as Slot 8). |

---

## Section-by-section diff

### § L2 — Roster size / BaseAgent validator

**Current canonical text (FLOWAI_SSOT.md L97–L100):**

> The operating roster is **25 agents (G3-ratified; #21–#25 Ops Runner charters active)**.
>
> **Slot 4 factual flag — OVERRULED BY CEO (2026-05-11).** … *The validator update from 20 → 25 is queued for Phase 1.0 as an implementation task and does not change the canonical roster count.*

**Proposed amended text:**

> The operating roster is **25 agents (G3-ratified; #21–#25 Ops Runner charters active)**. The `BaseAgent.js` partition validator was updated to enforce EXACTLY 25 unique IDs in commit `d2bcbbd` (2026-05-11), so canonical text and code now agree.

**Justification:** `src/lib/agents/BaseAgent.js:55-62` reads `if (all.size !== 25) throw new Error('Roster partition invalid: expected 25 unique IDs')` and the `_validateCharter` Charter.id range is `1–25`. The "queued for Phase 1.0" language in the SSOT is stale — the implementation task completed on the same day the SSOT was promoted but the SSOT body did not catch up.

---

### § DOABILITY — Missing capabilities → Agent #3 / #4 / #5 DORMANT

**Current canonical text (FLOWAI_SSOT.md L392–L393):**

> **Agent #4 (Provider Onboarding) is DORMANT** — the entire multi-tenant revenue model is paper-only until this ships. *This is the single largest gap to the "$5B OS" claim.*
>
> **23 of 25 agents are DORMANT** (Agents #3 + #4–#20 + #21–#25) — orchestration substrate exists but the orchestra is silent; current FlowAI is a governance shell, not yet a working OS.

**Proposed amended text:**

> **20 of 25 agents are DORMANT** (Agents #6–#20 + #21–#25). SHIPPED-GREEN: **#1 Lifecycle Engine** (`Agent1LifecycleEngine.ts`), **#2 Code Builder** (`Agent2CodeBuilder.js`, commit `5d…` PA-2.7 wire), **#3 Self-Renewal** (`Agent3SelfRenewal.js`, commit `68a0c75`, plus W03 wiring commit `511493e`), **#4 Provider Onboarding** (`Agent4ProviderOnboarding.js`, commit `5006431`), **#5 End-Customer Intake** (`Agent5EndCustomerIntake.js`, commit `2fff449`). The "$5B OS" gap narrows accordingly — multi-tenant revenue path now has its onboarding agent (#4) and customer-intake agent (#5) live, though Stripe Connect API client code is not yet written (path scheme + credential lookup only — see § Stripe below).

**Justification:** Five impl files exist under `src/lib/agents/agents/` with passing tests under `tests/agents/`; SSOT text predates 5006431 / 2fff449 / 511493e and reflects only Agents #1 + #2 as live.

---

### § DOABILITY — Missing capabilities → Doppler integration

**Current canonical text (FLOWAI_SSOT.md L394):**

> **Doppler integration is designed, not wired** — credential security is currently Base44 Secrets, which is insufficient for multi-tenant production.

**Proposed amended text:**

> Doppler is wired and operational for FlowAI project (`flowai/prd`, `flowai/staging`). The `CredentialAdapter` (`src/lib/shared/CredentialAdapter.js`) routes through `dopplerClient.fetchSecret({project, config, name})` with explicit fallback paths for tests. `prd` is the canonical config name; `prod` retained as backwards-compat alias (commit `8e29e84`). First production secret in Doppler: `VERCEL_AUTOMATION_BYPASS_SECRET` (commit `c533e2d`, verified end-to-end). Per-product Doppler projects (`saige`, `reltwin`, `reachsms`, `pressai`, `mybirthsafe`) are registered in the adapter whitelist but not yet exercised by shipped agents. Provider-scoped and Stripe-Connect-scoped path schemes (`flowai/<env>/STRIPE_CONNECT_<providerId>`) are declared; no live secrets verified in repo.

**Justification:** `CredentialAdapter.js:154-166` calls `dopplerClient.fetchSecret(...)` directly; `c533e2d` commit notes "Doppler matches Vercel (sha8=9cc181d3, 32 bytes), Positive smoke via header form: HTTP 200" — Doppler is the source of truth for that secret in production. `docs/operations/credential-adapter-naming.md` documents the prd/prod mapping.

---

### § DOABILITY — Missing capabilities → Supabase RLS

**Current canonical text (FLOWAI_SSOT.md L395):**

> **Supabase RLS is designed, not provisioned** — tenant isolation is a contract without an enforcer.

**Proposed amended text:**

> Supabase RLS is **provisioned at the schema level** across all migrated tables (5 migrations: `0001_initial.sql`, `0002_super_customer.sql`, `0003_flowai_audit_log.sql`, `0004_tool_marketplace.sql`, `0010_w3_audit_infra.sql` — 24 tables with `alter table ... enable row level security`). **Policy correctness for tenant isolation is NOT verified** — the migrations enable RLS but the `CREATE POLICY` audit returned zero matches under `supabase/migrations/`, which means policies (if any) live outside the migration directory or are missing entirely. **CEO-disposition-required:** the SSOT's claim that RLS is "designed not provisioned" is half-right — the *enabler* is shipped, the *policies* may not be. Recommend a follow-up dispatch to inventory RLS policies before promoting amended text.

**Justification:** grep `enable row level security` returns 24 hits across 5 migration files. grep `CREATE POLICY` / `create policy` returns zero hits under `supabase/migrations/`.

---

### § DOABILITY — Missing capabilities → Audit-chain / shared layer

**Current canonical text:** SSOT does not explicitly list audit-chain as a missing capability, but the "orchestration spine (BaseAgent + MessageBus + ScoreEvaluator + CredentialAdapter)" enumeration (L382) omits `auditChain` and `errors` / `logger`.

**Proposed amended text:**

> The orchestration spine is **BaseAgent + MessageBus + ScoreEvaluator + CredentialAdapter + auditChain (tamper-evidence) + structured errors + logger** — the shared layer landed at commit `496886d` (2026-05-11) with `src/lib/shared/{errors,logger,auditChain}.js` complete and 1115/1115 vitest pass. `auditChain.js` provides `appendChained`, `verifyChain`, `newChain`, `GENESIS_PREV_HASH` and is consumed by the W03 compliance probe (`scripts/w03ComplianceProbe.mjs`) for chained per-turn audit entries.

**Justification:** `src/lib/shared/auditChain.js` and `scripts/w03ComplianceProbe.mjs:40` (which imports `newChain`) confirm the shared layer is the orchestration substrate, not an out-of-spine concern.

---

### § NEW — W03 Standing Operating Protocol (no current SSOT section)

**Current canonical text:** none — W03 SOP did not exist when the SSOT was promoted on 2026-05-11; it was canonicalized later the same day at commit `6e9660e` and built out at commit `511493e` on 2026-05-12.

**Proposed amended addition (to follow "MG7 Approval scope" as MG8):**

> ### MG8. W03 Standing Operating Protocol (CANONICAL — `6e9660e`, Build 1 at `511493e`)
>
> Every W03 → CEO message passes a synchronous two-stage review per CEO Decision 4 of the maximum-oversight configuration: (1) deterministic 18-rule probe (`scripts/w03ComplianceProbe.mjs`), then (2) Agent #3 Self-Renewal recommend_only review (`src/lib/agents/w03ComplianceWiring.js`). The probe verdict (pass / flag / block) is the floor; Agent #3 can nudge upward (toward block) on high-confidence renewal flags but cannot downgrade. On `block`, a CEO notice is published on topic `w03.compliance.ceo_notice` and delivery is suppressed. Authority preservation: Agent #3 stays recommend_only — the wiring layer makes the recommendation block delivery by inspecting verdict, not by elevating Agent #3.
>
> Reference: `docs/W03_STANDING_OPERATING_PROTOCOL.md`.

**Justification:** This is canonical and shipped; the SSOT needs to point to it so future Panel members understand the meta-governance kernel they operate within.

---

### § NEW — Layer 3 Engineering Spec (no current SSOT section)

**Current canonical text:** none — `FLOWAI_ENGINEERING_SPEC.md` (Layer 3) was promoted at commit `c5720a5` after SSOT promotion.

**Proposed amended addition (to follow "EPISTEMOLOGY EP6" as EP7, or as a cross-reference in Synthesis Metadata):**

> ### EP7. Engineering authority — Layer 1 vs Layer 2 vs Layer 3
>
> Three canonical authority layers govern build decisions. **Layer 1** = this SSOT (philosophy / ontology / governance gates). **Layer 2** = `FLOWAI_IMPLEMENTATION_PLAN.md` (commit `6d0ccbb`, sprint-by-sprint plan with CEO flag dispositions). **Layer 3** = `FLOWAI_ENGINEERING_SPEC.md` (commit `c5720a5`, code-level contracts, schemas, invariants). Conflicts cascade upward: Layer 3 defers to Layer 2 defers to Layer 1 defers to code (Locked Rule 4 anti-drift hierarchy). Each layer was synthesized via 5-reviewer panel + CEO disposition on flagged items per MG2.

**Justification:** Layer 2 + Layer 3 are canonical and shipped; the SSOT currently does not name them as peers in the hierarchy, which leaves their authority ambiguous to readers arriving at the SSOT.

---

### § NEW — W3 audit measurement infrastructure (no current SSOT section)

**Current canonical text:** none.

**Proposed amended addition (to follow E2 95/95 — quality bar or safety floor):**

> ### E2.bis — How 95/95 is measured (`9997f83`)
>
> The 95/95 floor is enforced by 13 evaluators under `src/lib/audits/criteria/` (6 governance: `audit_completeness`, `authority`, `charter_contract`, `message_schema`, `escalation`, `secrets_hygiene`; 7 readiness: `functional`, `failure_handling`, `documentation`, `dependencies`, `ip_protection`, `performance`, `observability`). 10 evaluators run real measurement against `ctx.auditLog` / `ctx.messageBus` / `ctx.registry` / `ctx.auditChain` / `ctx.errorLog` / `ctx.baseAgentRuns`. 3 evaluators are formally deferred via `w3/deferred-evaluators.json` (`gov.ip_protection` blocked by IP-T1b/T2; `rdy.performance` and `rdy.observability` blocked by Agent #10 Monitor). A CI guard fails on any out-of-allowlist deferred evaluator OR a stale allowlist entry (`tests/audit-criterion-allowlist.test.js`). The Universal Falsifiability Guard (`tests/audit-criterion-falsifiability.test.js`) prevents any evaluator from emitting `score=100` on empty context — a structural defense against false-green inflation (MISSING-Q #26 above).

**Justification:** Commit `9997f83` is the largest single quality-floor lever shipped since SSOT promotion. The SSOT calls out 95/95 as both quality bar and safety floor (E2) but does not name the measurement substrate that enforces it. This addition closes the gap.

---

### § NEW — Vercel Deployment Protection bypass (no current SSOT section)

**Current canonical text:** none — Vercel bypass was unwired when the SSOT was promoted.

**Proposed amended addition (operational appendix, after Synthesis Metadata):**

> **Operational state — Vercel Deployment Protection bypass (`c533e2d`):** Bypass token provisioned in Doppler `flowai/prd` as `VERCEL_AUTOMATION_BYPASS_SECRET` and auto-synced to Vercel project as a System Environment Variable. End-to-end verified: HTTP 200 on latest READY preview URL with bypass header; HTTP 401 without. Production gate (`ssoProtection=all_except_custom_domains`) unchanged. Operational runbook at `docs/operations/vercel-deployment-protection-bypass.md`. Verification script (no-echo on secret values): `scripts/w1-bypass-diag-and-verify.mjs`.

**Justification:** This is the first production secret in the Doppler vault and the first crawl-relevant operational unblocking. Future Panel sessions need to know preview crawls are unblocked.

---

### § NEW — Panel composition (current canonical 5-slot composition is stale)

**Current canonical text (FLOWAI_SSOT.md L5 + L437):**

> **Reviewers:** Slot 1 = Claude Opus 4.7 · Slot 2 = GPT-5.5 · Slot 3 = Gemini 2.5 Pro · Slot 4 = Perplexity Sonar Pro Search · Slot 10 = GPT-4o (web-grounded).
>
> **Reviewers used:** 5 of 7 LIVE slots; 3 deferred (Vercel v0, Base44, Replit) and 2 failed (GitHub Models — free-tier 8K-token cap exceeded).

**Proposed amended text (Panel Composition appendix, updated 2026-05-13):**

> **Panel slot map (current, per `scripts/run-panel-smoke.mjs` head-of-tree at commit `32cd109`/`f1b189e`/`efe20aa`):**
>
> | Slot | Provider | Model | State |
> |---|---|---|---|
> | 1 | OpenRouter | `openai/gpt-5` | LIVE |
> | 2 | OpenRouter | `openai/gpt-4o` | LIVE |
> | 3 | OpenRouter | `google/gemini-2.5-pro` | LIVE |
> | 4 | OpenRouter | `anthropic/claude-opus-4` | LIVE |
> | 5 | Vercel v0 | `v0-1.5-md` | LIVE (B1 / W5c, commit pre-2026-05-11) |
> | 6 | OpenRouter | `mistralai/mistral-large-2411` | LIVE — swapped from `github_models / openai/gpt-4.1` on `32cd109` to bypass 8K free-tier token cap |
> | 7 | OpenRouter | `deepseek/deepseek-r1` | LIVE — swapped from `github_models / openai/gpt-4o-mini` on `32cd109` |
> | 8 | Headless | `base44_chat` | LIVE once `scripts/setup-base44-session.mjs` has been run by CEO; otherwise `storage_state_missing` (scaffold at `f1b189e`) |
> | 9 | Headless | `replit_agent` | SCAFFOLDED at `efe20aa` — driver file created but Playwright storage state not yet captured |
> | 10 | OpenRouter | `openai/gpt-4o` (web-grounded variant) | LIVE |
>
> Phase 1.0 dispatch acceptance gate: ≥5 LIVE slots succeed → exit code 0.

**Justification:** `scripts/run-panel-smoke.mjs:60-88` reads as the source of truth for current panel composition; SSOT identifies only 5 LIVE slots whereas current composition is 7 confirmed LIVE + 2 conditional LIVE (Slots 8/9 require session setup) + Slot 5 LIVE.

---

### § E4 / Stripe Connect sandbox — partial-state, CEO-disposition-required

**Current canonical text (FLOWAI_SSOT.md L185–L189):**

> VEU platform fee is a **ceiling of 15%** … sustainability floor is defined separately per contract and is **non-negotiable**; providers retain **at minimum 85%** of end-customer revenue; the exact split is **negotiable between the ceiling and the floor** on a per-contract basis. **Implementation rail: Stripe Connect via Agent #4.**

**Proposed amended text:**

> [Body unchanged.] **Implementation rail (status 2026-05-13):** Agent #4 Provider Onboarding is SHIPPED-GREEN (commit `5006431`); the `CredentialAdapter.getStripeConnect(providerId)` accessor and the `flowai/<env>/STRIPE_CONNECT_<providerId>` Doppler path scheme are wired (commit `8e29e84` for env-name fix). **No Stripe HTTP/SDK client code exists anywhere in `src/` or `api/`** (verified via `specs/w4-overnight/07-pressai-stripe.md` audit); the credential lookup returns the secret but nothing currently *calls Stripe*. **CEO-disposition-required:** the W03 dispatch claims a sandbox account ID `acct_1TW1sAApQwn04Jkj` is provisioned in Doppler — this is not verifiable in the repo (Doppler-external) and there is no shipped client to consume it. Recommend the amendment land as "Implementation rail (status 2026-05-13): credential path + Agent #4 onboarding wired; sandbox account provisioned externally in Doppler; Stripe SDK client + Connect onboarding flow not yet implemented" with the externally-provisioned fact gated on CEO confirmation.

**Justification:** `src/lib/shared/CredentialAdapter.js:101-109` defines the path scheme. `specs/w4-overnight/07-pressai-stripe.md` confirms no API call exists. `acct_1TW1sAApQwn04Jkj` does not appear anywhere in repo grep — its existence and provisioning state are external to the repo and require CEO confirmation before the canonical SSOT can record them.

---

### § SYNTHESIS METADATA — Reviewer slot status, factual flags

**Current canonical text (FLOWAI_SSOT.md L437–L443):**

> Reviewers used: 5 of 7 LIVE slots; 3 deferred (Vercel v0, Base44, Replit) and 2 failed (GitHub Models — free-tier 8K-token cap exceeded).

**Proposed amended text:**

> Reviewers used (in the v1 Layer 1 panel review of 2026-05-11): 5 of 7 LIVE slots; 3 deferred (Vercel v0, Base44, Replit) and 2 failed (GitHub Models — free-tier 8K-token cap exceeded). **Panel composition has since evolved (2026-05-13):** Slot 5 Vercel v0 is now LIVE; Slots 6+7 GitHub Models have been replaced by OpenRouter (mistral-large-2411, deepseek-r1); Slots 8+9 (Base44 chat, Replit agent) have headless adapters scaffolded and become LIVE once Playwright storage state is captured by CEO. Subsequent Layer 2 and Layer 3 panels used the expanded slot map; future Layer 1 amendments should use the current composition for re-review per MG2.

**Justification:** Future Panel members reading this SSOT need to know the slot map is no longer 5 LIVE — it is up to 10 LIVE — when computing whether a future amendment meets the MG2 ≥7/10 threshold.

---

## Unchanged sections (still accurate as drafted)

The following SSOT sections remain accurate as of 2026-05-13 and require no amendment:

- ONTOLOGY O1–O10 (philosophical content; not affected by shipped infrastructure).
- LOGIC L1, L3, L4, L5, L6, L7, L8, L9 (decision-framework content unchanged).
- ETHICS E1, E2 (body), E3, E5, E6, E7 (commitments unchanged).
- EPISTEMOLOGY EP1–EP6 (authority hierarchy unchanged).
- META-GOVERNANCE MG1, MG2, MG3, MG4, MG5, MG6, MG7 (Panel charter unchanged; **MG8** proposed as addition only, not a modification).
- MISSING QUESTIONS list (every gap there is still open; none were closed by 2026-05-11 → 2026-05-13 work).
- DOABILITY ASSESSMENT subsections "Doable as drafted" and "Missing capacities" and "Missing commitments" (except the roster-truth alignment item, which is partly stale per § L2 above).
- ELEVATOR PITCH (unchanged).

---

## Open items requiring CEO disposition

The following are NOT mechanical syncs — each requires a substantive CEO call before promotion:

1. **Supabase RLS policy state.** SSOT says "designed, not provisioned." Migrations show `enable row level security` on 24 tables (provisioned) but zero `CREATE POLICY` matches (policies missing or living outside migrations dir). CEO call: is the absence of policies-in-migrations a known state (policies live in seed scripts or were provisioned via Supabase dashboard) or a real gap? The amendment depends on which.
2. **Stripe Connect sandbox account ID** `acct_1TW1sAApQwn04Jkj`. Not in repo, not verifiable from current state. CEO confirms the external Doppler provisioning before any SSOT text records it.
3. **Per-product Doppler projects** (`saige`, `reltwin`, `reachsms`, `pressai`, `mybirthsafe`). Whitelisted in `CredentialAdapter`, never exercised. CEO call: are these provisioned in Doppler? Or whitelisted-only pending product-specific build work?
4. **Slot 4 of the v1 Layer 1 panel = Perplexity Sonar Pro Search** (per SSOT L5) but **current Slot 4 in `run-panel-smoke.mjs` = `anthropic/claude-opus-4`** via OpenRouter. The v1 panel was 5-slot (numbered 1, 2, 3, 4, 10); the current 10-slot panel renumbers slots. Confirm: should we preserve the v1 numbering in historical record AND maintain the current numbering for future panels, or renumber retroactively?
5. **MG8 W03 SOP addition** (proposed § above). Promoting MG8 sets a meta-governance precedent — the canonical W03 SOP becomes a *Panel-acknowledged* meta-governance instrument rather than just a CEO-issued protocol. Confirm whether that elevation is desired.
6. **Layer 1 / Layer 2 / Layer 3 hierarchy callout (EP7 addition).** Currently the three layers are canonical-as-files but the SSOT does not formally name them as peers. Confirm whether to elevate the layer-hierarchy callout into the SSOT (per § EP7 above) or leave it as a `CANONICAL_REFERENCE.md` convention.
7. **MISSING QUESTIONS triage.** Most of the 36 missing questions remain open. CEO call: does this refresh dispatch open follow-up dispatches to triage them, or are they parked until the Agent #6–#20 wave begins?

---

## Promotion checklist

- [ ] CEO reviews draft.
- [ ] CEO accepts / amends / rejects each proposed change individually (a single accept-all would obscure the 7 CEO-disposition-required items above).
- [ ] Panel ≥7/10 supermajority on accepted changes per MG2.
- [ ] W5a/W5b/W5c promotes accepted text into `docs/FLOWAI_SSOT.md` via a separate dispatch.
- [ ] Old SSOT version archived to `docs/archive/FLOWAI_SSOT_2026-05-11.md`.
- [ ] `docs/CANONICAL_HISTORY.md` updated with the refresh entry.
- [ ] This draft file moved to `docs/archive/` (or deleted) once promotion completes.

---

## Draft metadata

- **Authored by:** W5a (per W03 dispatch, 2026-05-13).
- **Inputs:** repo HEAD `9997f83`-and-later; `docs/FLOWAI_SSOT.md` (canonical 2026-05-11); `scripts/run-panel-smoke.mjs`; `src/lib/agents/BaseAgent.js`; `src/lib/agents/agents/`; `src/lib/shared/{auditChain,CredentialAdapter}.js`; `src/lib/agents/w03ComplianceWiring.js`; `scripts/w03ComplianceProbe.mjs`; `supabase/migrations/`; `w3/deferred-evaluators.json`; `specs/w4-overnight/07-pressai-stripe.md`; commit log via `git show --stat`.
- **Mode:** draft-only. The canonical SSOT was NOT modified by this dispatch.
- **Scope:** diff inventory + proposed amendments + CEO-disposition surfacing. NOT a unilateral rewrite.
