# FlowAI Self-Adversarial Test Plan

**Status:** DRAFT (read-only test plan; no test code in this dispatch). NOT canonical SSOT.
**Author:** W3, 2026-05-14.
**Anchors:** SSOT W04-Rev-2 §6 (Aggressive Crawling, Testing & Resolution Contract), §15 (25-Agent Roster), §17 (6-Section Sidebar), `docs/CANONICAL_REFERENCE.md` (sprint history → surface inventory), `src/App.jsx` (canonical route list), `src/lib/agents/_registry.ts` + `src/lib/agents/agents/Agent[1-5]*.{js,ts}` (shipped agents).
**Target system under test (SUT):**
- **Deployed app:** `https://truthful-flow-logic-lab.vercel.app` (per W04 dispatch)
- **Local dev:** `http://localhost:5173`
- **API base:** `<SUT>/api/*`
- **Shipped agents:** see §1
**Scope:** Authenticated + unauthenticated. Desktop (1920×1080) + tablet (768×1024) + mobile (375×667). Playwright e2e + direct API call coverage. No live VEU product crawl (uses neutral fixtures only per Locked Rule 22).

---

## 1. Agent count reconciliation

**Verified from code:** **5 agents shipped** (matches SSOT W04-Rev-2 §26; supersedes Rev-1 §17's stale "3 agents" claim).

| # | Class file | Mode | Step | Authority | Wired? | SHIPPED-GREEN commit |
|---|---|---|---|---|---|---|
| 1 | `src/lib/agents/agents/Agent1LifecycleEngine.ts` | `always-on` | n/a | `recommend_only` | YES (commit `7538d8e` wired to runtime PA #2.7) | `d712993` |
| 2 | `src/lib/agents/agents/Agent2CodeBuilder.js` | `step-owner` | 3 build | `recommend_only` | YES (commit `7538d8e` PA #2.7) | `fdd3863` |
| 3 | `src/lib/agents/agents/Agent3SelfRenewal.js` | `step-owner` | 6 govern | `recommend_only` | YES (commit `31f3522` AutoRunner step 6) | `68a0c75` + `511493e` (W03 wiring) |
| 4 | `src/lib/agents/agents/Agent4ProviderOnboarding.js` | step-owner (commercial layer) | n/a (Stripe Connect path) | `recommend_only` | YES — explicit "SHIPPED-GREEN" in commit | `5006431` |
| 5 | `src/lib/agents/agents/Agent5EndCustomerIntake.js` | step-owner (commercial layer) | n/a | `recommend_only` | YES — explicit "SHIPPED-GREEN" in commit | `2fff449` |

Source of truth: `src/lib/agents/_registry.ts` defines all 25 agent charters; only the 5 above have implementing class files. Agent #6 Research has a content-insufficient `block` semantic wired in `AutoRunner.jsx` (commit `0fc8851`) but no class file — counts as **partially wired, not shipped-green**.

**Reconciliation note:** Phase 0 (commit `5dec08d`, 387 tests baseline) shipped #1/#2/#3. Phase 1 (commits `5006431` + `2fff449`) added #4/#5 with explicit SHIPPED-GREEN tags. Rev-1 §17 missed Phase 1.

---

## 2. Surface Inventory

### 2.1 Routes from `src/App.jsx` (canonical)

Total routes: **~72** including redirects + GTM tiers + public. Adversarial coverage targets every non-redirect route.

**Public surfaces (no auth required):**

| Route | Component | Notes |
|---|---|---|
| `/` | `LandingPage` | Marketing landing |
| `/landing` | `MarketingPage` | Marketing variant |
| `/veuaas` | `VEUaaSMarketing` | GTM Tier 1 |
| `/demo` | `DemoSandbox` | GTM Tier 2 self-serve sandbox |
| `/live-demo` | `LiveDemo` | GTM Tier 3 public demo w/ real backend |
| `/enterprise-demo` | `EnterpriseDemo` | GTM Tier 4 sales-led tour |
| `/terms-of-use` | `TermsOfUse` | Sprint PROTECT-1 legal |
| `/privacy-policy` | `PrivacyPolicy` | Sprint PROTECT-1 legal |
| `/base-agent-test` | `BaseAgentTest` | Packet 1.5 smoke surface |
| `/about` | redirect → `/landing` | — |

**Authenticated surfaces — UX-C + ARCH-1 + HARD-1 era (current canonical):**

| Route | Component | Sidebar section | Notes |
|---|---|---|---|
| `/dashboard` | `MainDashboard` | PORTFOLIO | 6-panel dashboard |
| `/portfolio` | `PortfolioDashboard` | PORTFOLIO | |
| `/products` | `ProductRegistry` | PORTFOLIO | |
| `/runs` | `RunsHistory` | PORTFOLIO | |
| `/configuration` | `Configuration` | CONFIGURATION | 5-card session setup (Product / Input / Objective / AutoParams / Launch) |
| `/auto-runner` | `AutoRunner` | AUTO OPERATIONS | 8-step live stream — invokes Agents #1/#2/#3 |
| `/renewal` | `Renewal` | CONFIGURATION | 3-card workspace; W2 commit `9b4e511` three-input renewal pipeline |
| `/guided/:step` | `GuidedStep` | GUIDED OPERATIONS | 8 distinct sub-routes (research/design/build/qa_audit/deploy/govern/gtm/monitor) |
| `/manual/:step` | `ManualStep` | MANUAL OPERATIONS | 8 distinct sub-routes |
| `/clearance` | `Clearance` | GUIDED/MANUAL step 7 surface | 6-step Clearance Protocol wizard |
| `/onboarding` | `Onboarding` | (first-run) | 5-step guided setup |
| `/release-notes` | `ReleaseNotes` | SETTINGS | Sprint history |
| `/audit-trail` | `AuditTrail` | SETTINGS | GovernanceAuditLog read-only surface |
| `/capability-transfer` | `CapabilityTransfer` | SETTINGS | L4 surface per Rev-2 §4 |
| `/capability-packages/self-renewal` | `CapabilityPackageSelfRenewal` | (linked) | |
| `/capability-packages/self-protection` | `CapabilityPackageSelfProtection` | (linked) | |
| `/capability-packages/self-renewal/install` | `CapabilityInstallSelfRenewal` | (linked) | |
| `/capability-packages/self-protection/install` | `CapabilityInstallSelfProtection` | (linked) | |
| `/settings` | `OrgSettings` | SETTINGS | |
| `/users` | `UsersStub` | SETTINGS | admin-only (Sprint 7.5a) |
| `/url-whitelist` | `URLWhitelistStub` | SETTINGS | admin-only |
| `/cost-controls` | `CostControlsStub` | SETTINGS | |
| `/cost-usage` | `CostUsage` | SETTINGS | |
| `/architecture` | `Architecture` | SETTINGS | Sprint 6 Phase 2 readiness visualization |
| `/environments` | `Environments` | SETTINGS | Sprint 6 Phase 3 dual environments |
| `/production-monitor` | `ProductionMonitor` | SETTINGS | Live monitor per Sprint 6 Phase 3 |

**Authenticated surfaces — pre-UX-C era (still routed, mixed state):**

| Route | Component | Status |
|---|---|---|
| `/qa-audit` | `QAAudit` | active |
| `/research` | `Research` | active |
| `/design` | `Design` | active |
| `/build` | `Build` | active |
| `/pipeline` | `Pipeline` | active |
| `/gtm`, `/gtm-engine`, `/gtm-assets` | `GTMPlatform`/`GTMEngine`/`GTMAssets` | active |
| `/governance` | `Governance` | active |
| `/self-protection`, `/self-healing`, `/self-upgrade`, `/self-verification`, `/external-upgrade` | Sprint PROTECT-1 + Sprint 5 surfaces | active |
| `/domain-manager`, `/brand-system`, `/white-label`, `/data-export` | Sprint 6 Phase 1 + Sprint 9 surfaces | active |
| `/marketplace`, `/intelligence`, `/marketplace/intelligence`, `/compare-tools`, `/my-stack` | Sprint 8 Tool Intelligence Marketplace | active |
| `/realtime`, `/templates`, `/templates-library`, `/analytics`, `/billing`, `/activity`, `/ai-feedback` | older Phase 1 + Sprint 7 surfaces | active |
| `/portfolio-engine`, `/master-orchestrator`, `/product-generator`, `/demo-generator`, `/investor-studio` | Sprint 7 + ARCH-1 | active |
| `/app-store-distribution` | (recent) | active |
| `/my-products`, `/my-creations` | renamed per UX-C | active |

**Legacy redirects (do not need full adversarial coverage, but assert redirect works):**

`/old-dashboard` `/flow-designer` `/run-flow` `/flows` `/run-history` `/variables` `/autonomous-engine` `/creator-studio` `/workspace` — 9 redirects.

### 2.2 API endpoints from `api/*`

Total endpoints: **~30** (excluding `_lib` helpers).

| Path | Method | Notes |
|---|---|---|
| `/api/health` | GET | Sprint PROTECT-1 Phase 2 + d091b0e anti-tamper |
| `/api/diagnostic` | GET | |
| `/api/me` | GET | Auth session check |
| `/api/auth/sign-in` | POST | Sprint 7.5a |
| `/api/auth/sign-up` | POST | Sprint 7.5a |
| `/api/auth/session` | GET | |
| `/api/admin/seed` | POST | admin-only |
| `/api/products` | GET, POST | Product registry |
| `/api/products/[id]` | GET, PATCH, DELETE | |
| `/api/configuration/*` | various | session config |
| `/api/research-url` | POST | Input adapter (URL) |
| `/api/describe-product` | POST | Input adapter (description) |
| `/api/fetch-url` | POST | Crawler proxy |
| `/api/llm-step` | POST | Per-step LLM dispatch |
| `/api/propose-step` | POST | Guided proposal flow |
| `/api/run-step` | POST | Execute step |
| `/api/renew` | POST | W2 three-input renewal pipeline orchestrator |
| `/api/renewed/[hash]` | GET | Serves rendered HTML for fork-and-fix renewedUrl |
| `/api/orchestrator/run` | POST | OrchestratorHub run dispatch |
| `/api/orchestrator/health` | GET | |
| `/api/orchestrator/status/[id]` | GET | |
| `/api/self-renewal/check` | POST | Agent #3 invocation |
| `/api/governance/dashboard` | GET | |
| `/api/audit-log` | GET, POST | GovernanceAuditLog per Rev-2 §14 |
| `/api/audit-product` | POST | |
| `/api/audits/*` | various | |
| `/api/clearance/run` | POST | Clearance Protocol step exec |
| `/api/compliance/*` | various | |
| `/api/cost-summary` | GET | |
| `/api/marketplace/*` | various | Tool Intelligence |
| `/api/email/*` | various | |
| `/api/leads/*` | various | |
| `/api/inngest` | POST | Background job runner |

---

## 3. Adversarial Test Matrix per Agent

Five shipped agents × four input categories = **20 agent adversarial cases** + invariant checks. All invoked via direct API call (`POST /api/orchestrator/run` with explicit `agentId` + `ctx`, or per-agent endpoints).

### 3.1 Agent #1 Lifecycle Engine (always-on, `recommend_only`)

| # | Category | Input | Expected | Pass criterion |
|---|---|---|---|---|
| A1-N1 | Nominal | Sequence of `2.build.completed.v1` + `8.audit.completed.v1` + `system.clearance.decision.v1` over a 30-min window | Single `1.product.lifecycle_event.v1` emitted with stage transition; `1.product.gate_request.v1` emitted on each failure | Agent envelope `ok=true`; bus emissions match expected topics; audit-log shows `run.start` / `act.ok` per cycle |
| A1-M1 | Malformed | Topic with missing required field (`productId` absent on lifecycle_event payload) | Throws on `MessageSchema.assertEnvelope`; bus does not propagate | Agent does not crash AutoRunner; explicit reject in audit log; `run.error` written with the schema-violation message |
| A1-M2 | Malformed | Oversized payload (10 MB JSON blob on a lifecycle event) | Reject before bus publish | No memory spike; reject within 100ms; structured error |
| A1-E1 | Edge | Two concurrent runs emit `system.clearance.decision.v1` simultaneously | Both decisions logged; gate_request issued for both; no race in HotStore `renewal:run:{runId}` | Both runs reach terminal state; no orphaned hot keys |
| A1-E2 | Edge | Bus subscriber attached then immediately detached during plan() | `detachBusSubscriptions()` is idempotent; no leaked handlers | `_busHandles.length === 0` post-detach |
| A1-X1 | Adversarial | Prompt injection: `productId = "'; DROP TABLE flowai_runs; --"` | Treated as opaque string; never interpolated into SQL | No SQL exception; row written with literal productId; RLS isolates |
| A1-X2 | Adversarial | Hostile getter on `ctx.input.runId` that throws on access | Caught in `recommend()` extraction try/catch (per peer-review must-fix #1) | Returns low-confidence envelope with `ok: false, error` populated; does NOT propagate exception |
| A1-X3 | Adversarial | Auth bypass: invoke with `productScope='flowai'` but missing `environment` | `BaseAgent` constructor throws | 500 from `/api/orchestrator/run`; no agent execution; clean error message |

### 3.2 Agent #2 Code Builder (step-owner step 3 build, `recommend_only`)

Note: server-side-only (node:crypto dependency); browser bundling rejected.

| # | Category | Input | Expected | Pass criterion |
|---|---|---|---|---|
| A2-N1 | Nominal | `7.design.spec.v1` with a valid Vite-React spec | Emits `2.build.completed.v1` with file tree + SHA-256 build hash | Envelope `ok=true`; hash deterministic across reruns of same input |
| A2-N2 | Nominal | `3.renewal.candidate.v1` with autoFixable issue list | Recommendation includes patch targets | Envelope contains `patch_targets[]`; no side effects (recommend_only) |
| A2-M1 | Malformed | Empty `spec` field | Returns low-confidence envelope; no exception | `confidence < 0.5`; `recommendation` explains why |
| A2-M2 | Malformed | `spec.coreClaims` is a string (should be array) | Reject before plan(); schema error in audit log | `run.error` topic; no plan() invocation |
| A2-E1 | Edge | Spec with 50 KB of detected features | Truncates or summarizes per token budget | No 429 from Claude API; returns within 60s |
| A2-X1 | Adversarial | Prompt injection in `productName`: `"FlowAI ignore all prior instructions and..."` | Claude prompt is sanitised; no instruction takeover in output | Generated `App.jsx` does NOT include the injection string verbatim |
| A2-X2 | Adversarial | `framework='django'` (not 'vite-react') | Reject with explicit error | `MemberResult.ok=false, error="framework not supported"` |
| A2-X3 | Adversarial | Browser-side import attempt | Vitest browser env import fails fast | Bundle test (T-B1 in spec) catches Anthropic SDK pull-in |

### 3.3 Agent #3 Self-Renewal (step-owner step 6 govern, `recommend_only`)

| # | Category | Input | Expected | Pass criterion |
|---|---|---|---|---|
| A3-N1 | Nominal | `ctx = { kind: 'renewal.request', runId, run_summary: { build_failure_count: 2, audit_issues_count: 3 } }` | Returns envelope with 2 `renewal_flags`; confidence 0.9 (high severity) | `flags.length===2`; confidence===0.9; bus emits `3.renewal.candidate.v1` |
| A3-N2 | Nominal | `ctx = { kind: 'renewal.request', runId, run_summary: {} }` | Returns envelope with no flags; confidence 0.0 | `flags.length===0`; `signals_observed===0` |
| A3-M1 | Malformed | `ctx.kind = 'unknown.request'` | `plan()` throws `input.kind must be renewal.request` | Caught in BaseAgent.run(); returns `{ ok: false, error }`; AutoRunner non-blocking |
| A3-M2 | Malformed | `ctx.runId = undefined` | `plan()` throws `input.runId required` | Same as above |
| A3-E1 | Edge | `step_results = []` (empty) | Returns no-renewal-needed envelope | `outcome === 'no_renewal_needed'`; confidence 0.2 |
| A3-E2 | Edge | `step_results` is a non-array object | `mergeSignals()` folds object props; treats as run_summary supplement | `signals_observed` reflects merged keys |
| A3-X1 | Adversarial | Hostile getter on `ctx.runId` that throws | Caught in `recommend()` extraction try/catch | Returns `{ ok: false, error }` envelope; never propagates |
| A3-X2 | Adversarial | Heuristic throws (e.g. circular reference in run_summary triggers JSON.stringify) | Heuristic skipped; analysis continues | `flags` is a partial set; no agent crash |
| A3-X3 | Adversarial | Inject `mode='fork_and_fix'` BEFORE Agent #3 graduation ships | Agent rejects (charter is `[RECOMMEND_ONLY]` only) | `BaseAgent.guard()` rejects sideEffects; explicit charter-violation error |

### 3.4 Agent #4 Provider Onboarding (commercial layer, `recommend_only`)

| # | Category | Input | Expected | Pass criterion |
|---|---|---|---|---|
| A4-N1 | Nominal | Valid provider onboarding payload (name, email, Stripe Connect intent) | Returns onboarding recommendation envelope | `ok=true`; envelope contains `stripe_connect_link_recommendation` |
| A4-N2 | Nominal | Repeat onboarding for same provider | Idempotent; same `provider_id` returned; no duplicate Stripe Connect link | Audit log shows `lookup`, not `create` |
| A4-M1 | Malformed | Email is `"not-an-email"` | Validation rejection at plan() | Error envelope explains email format |
| A4-M2 | Malformed | Missing `name` field | Reject | Schema error in audit log |
| A4-E1 | Edge | Name with Unicode (e.g. `"日本語ユーザー"`) | Accepted; no encoding mangling | Stored as UTF-8; round-trips through API cleanly |
| A4-E2 | Edge | Name 1000 chars long | Truncated or rejected with explicit max-length error | Either path acceptable; no DB column overflow |
| A4-X1 | Adversarial | Email injection: `"a@b.com\nBcc: attacker@evil.com"` | CRLF stripped; treated as opaque | No bcc header injected if email is sent downstream |
| A4-X2 | Adversarial | Stripe Connect link request for a different provider's ID | Rejected unless caller is admin role; otherwise 403 | RLS enforces; audit log entry `403_rejected` |
| A4-X3 | Adversarial | Onboarding payload with `productScope='saige'` (FlowAI-only agent invoked outside flowai scope) | `BaseAgent` constructor rejects (charter.flowAiOnly=true) | 500; explicit charter-scope error |

### 3.5 Agent #5 End-Customer Intake (commercial layer, `recommend_only`)

| # | Category | Input | Expected | Pass criterion |
|---|---|---|---|---|
| A5-N1 | Nominal | Valid end-customer intake with provider linkage | Returns intake recommendation | `ok=true`; envelope contains provider link confirmation |
| A5-N2 | Nominal | Intake into a tenant the operator owns | Persists end_customer row in correct tenant | RLS isolates; admin of OTHER tenant cannot see |
| A5-M1 | Malformed | Intake without parent `provider_id` | Reject | Foreign key error caught at plan() |
| A5-M2 | Malformed | Future `intake_at` timestamp (year 9999) | Reject or clamp to UTC now | Either path acceptable; documented in test |
| A5-E1 | Edge | Intake of 100 end-customers in 1 minute | Rate-limited but not crashed | Audit log shows rate-limit event topic |
| A5-X1 | Adversarial | Intake with malicious URL in `notes`: `javascript:alert(1)` | Stored as opaque string; never rendered as link without escaping | No XSS in admin UI when viewing the row |
| A5-X2 | Adversarial | Cross-tenant intake (operator A intakes a customer into tenant B) | RLS rejects | 403 from API; audit log entry |
| A5-X3 | Adversarial | Intake with `productScope='flowai'` (Agent #5 is FlowAI-only but should NEVER ingest end-customers into flowai tenant itself) | Reject — FlowAI is the platform, not a tenant for end-customer intake | Explicit semantic rejection; documented in agent charter |

### 3.6 Cross-agent invariants

| # | Test | Expected |
|---|---|---|
| INV-1 | Every agent run produces an `auditLog.write({phase:'run.start'})` BEFORE any other side effect | True |
| INV-2 | Every agent run produces `run.start` + `run.error` OR `run.start` + `act.ok` (no `run.start` orphans) | True |
| INV-3 | No agent declares `plan.sideEffects.length > 0` while charter authority is only `RECOMMEND_ONLY` | `BaseAgent.guard()` throws |
| INV-4 | `BaseAgent` constructor rejects `productScope='flowai'` for any embedded-only agent (#13 example) and vice versa | True (per `BaseAgent.js` L111-115) |
| INV-5 | `_registry.ts` validator: 25 unique IDs, each in `[FLOWAI_ONLY_AGENTS ∪ EMBEDDED_AGENTS]` | Validator passes at module load |
| INV-6 | Every API endpoint `/api/orchestrator/*` requires authenticated session except `/api/orchestrator/health` | 401 on anonymous |

---

## 4. Per-Surface UI Test Matrix

For each authenticated route in §2.1, run the following adversarial passes via Playwright:

### 4.1 Common pass: Auth gate

| Test | Reproducer | Expected |
|---|---|---|
| SURF-AUTH-1 | Visit route WITHOUT session | Redirects to `/landing` or login surface |
| SURF-AUTH-2 | Visit route WITH expired session (8-hour XOR cipher expiry per Sprint PROTECT-1) | Redirect to login; session purged |
| SURF-AUTH-3 | Visit admin-only route (`/users`, `/url-whitelist`) with operator role | 403 or redirect; admin badge hidden |

### 4.2 Common pass: Element discovery + interaction

For every page, Playwright enumerates **every link, every card, every modal, every interactive engine, every embedded AI agent surface** (per SSOT §6 + parking-lot ENTRY 002) and:

- **Links:** clicks each `<a href>` and asserts non-404. External links must have `rel="noopener noreferrer"` (Sprint PROTECT-1 Phase 1).
- **Cards:** clicks each card's primary CTA; asserts navigation or modal open.
- **Modals:** opens via primary trigger; closes via Esc + close-button + backdrop click (per UX-A universal tooltip system); asserts no leaked event listeners.
- **Engines / workspaces:** triggers the engine; asserts loading state → terminal state within 60s.
- **Embedded AI agent surfaces:** any chat input / prompt box; sends a nominal prompt + a prompt injection; asserts agent responds without instruction takeover.

### 4.3 Common pass: Viewport coverage

Each route tested at **three viewports**:

| Viewport | Width × Height | Profile |
|---|---|---|
| Desktop | 1920 × 1080 | Default |
| Tablet | 768 × 1024 | iPad-class |
| Mobile | 375 × 667 | iPhone SE-class |

Per UX-B Sprint, all routes must conform to typography + density standards. Adversarial: assert no element clipped at any viewport; assert sidebar collapses on mobile; assert tooltips position correctly within viewport.

### 4.4 Common pass: Error state triggers

For pages with API dependencies (Auto Runner, Renewal, Clearance, AuditTrail, Architecture, Environments, Production Monitor, Cost Usage):

| Trigger | Expected error UI |
|---|---|
| Network offline mid-load | "Connection lost. Retrying in 5s..." with retry CTA |
| API 500 on first call | Error toast + retry button |
| API 401 mid-session | Redirect to login + preserve unsaved state |
| API 429 (rate limit) | "Rate limit reached. Try again in N seconds." |
| API timeout >60s | Spinner stops; "Operation timed out" message |
| Empty data state | Empty-state component renders per UX-B standards |
| Malformed API response (invalid JSON) | Boundary error caught; ErrorBoundary renders fallback |

### 4.5 Per-surface adversarial cases (selected high-risk surfaces)

| Surface | Adversarial case | Expected |
|---|---|---|
| `/auto-runner` | Paste URL `javascript:alert(1)` into target | URL validation rejects; no XSS |
| `/auto-runner` | Paste URL pointing to internal SSRF target (e.g. `http://169.254.169.254/`) | Crawler refuses (proxy blocks RFC1918 + link-local) |
| `/auto-runner` | Submit with `productId` you don't own | RLS rejects; 403 |
| `/renewal` | Upload 100 MB PNG via Paste/Upload mode | Reject at body-size limit; informative error |
| `/renewal` | Paste content containing a prompt-injection attack on Anthropic vision OCR | OCR returns the literal text; injection does not change agent behaviour downstream |
| `/clearance` | Skip a clearance step via direct API call without UI traversal | API rejects; clearance step transitions enforced server-side |
| `/audit-trail` | Filter by another tenant's productId | RLS rejects; empty result |
| `/audit-trail` | Tamper with a downloaded audit row hash | Hash chain verification fails on re-render; broken-chain banner shown |
| `/capability-transfer` | Generate install sprint for a Base44 product the operator doesn't own | RLS rejects; 403 |
| `/configuration` | Submit Configuration with 5 different URLs but `mode='clone-and-improve'` (single-URL mode) | UI rejects multi-URL in single-URL mode; API double-checks |
| `/users` (admin) | Operator tries to escalate own role to admin via direct API PATCH | RLS + role check rejects; audit log entry |
| `/url-whitelist` (admin) | Add URL `*` (wildcard) as whitelist | Reject — wildcard whitelist is a security regression |

---

## 5. Pass / Fail Criteria

### 5.1 Per-test verdict

| Verdict | Meaning |
|---|---|
| **PASS** | Actual = Expected; no regressions; no security signals; latency within budget |
| **FAIL — REGRESSION** | Previously PASSING test now fails; blocking |
| **FAIL — NEW** | Newly-added test fails on current build; blocking unless explicitly waived |
| **WARN** | Behaviour acceptable but degraded (latency near budget, intermittent flake, etc.); non-blocking |
| **SKIP** | Test pre-conditions unmet (e.g. headless adapter deferred); documented reason required |

### 5.2 Severity per finding

| Severity | Definition |
|---|---|
| **critical** | Auth bypass · data leak across tenants · agent crashes that propagate to AutoRunner · prompt-injection takeover · XSS · CSRF · RLS bypass · arbitrary code execution · credential exposure |
| **high** | Broken pipeline step that halts a run · 95/95 false positive · Self-Heal applies wrong fix · audit-log row missing · GovernanceAuditLog hash chain broken · clearance step bypass · payment-rail misroute |
| **medium** | Non-blocking error in non-critical surface · UI clipped at one viewport · slow-but-completing call · stale cache · missing tooltip · accessibility violation on non-critical control |
| **low** | Cosmetic · labelling · copy · animation glitch · minor a11y on tertiary surface |

### 5.3 Aggregate pass criteria for the run

- Zero **critical** findings = required to ship.
- Zero **high** findings = required to ship.
- ≤5 **medium** findings = acceptable; each documented + ticketed.
- **low** findings = informational; capture in backlog.

---

## 6. Reporting Format

Each finding written as one row in `reports/adversarial/<date>-<runId>.csv` + a markdown summary at `reports/adversarial/<date>-<runId>.md`. CSV column schema:

```csv
finding_id,severity,surface,test_id,category,reproducer_steps,expected_behavior,actual_behavior,evidence_paths,first_seen_commit,owner_agent_id_or_team,recommended_fix,status
```

Markdown row format (one block per finding):

```md
### FND-NNNN — [<severity>] <surface> · <test_id>

**Category:** nominal | malformed | edge | adversarial | invariant | ui | api
**Reproducer:**
1. step 1
2. step 2
3. step 3

**Expected:** <one line>
**Actual:** <one line>
**Evidence:** screenshot_path · har_path · audit_log_excerpt
**First seen:** <commit hash> (<commit subject>)
**Owner:** Agent #N · workstream Wx · or "platform"
**Recommended fix:** <one line>
**Status:** OPEN | TICKETED [<ticket id>] | RESOLVED [<commit hash>] | WAIVED [<rationale>]
```

Findings auto-appended to `GovernanceAuditLog` (Rev-2 §14) under topic `adversarial.finding.v1` for tamper-evident retention.

---

## 7. Execution

### 7.1 Playwright e2e (UI surfaces, §4)

```
tests/adversarial/playwright.config.ts          (3 projects: desktop / tablet / mobile)
tests/adversarial/fixtures/                     (auth states: anon, operator, admin)
tests/adversarial/specs/
  auth-gate.spec.ts                              (§4.1, ~6 tests)
  element-discovery.spec.ts                      (§4.2, ~50 tests — one per surface)
  viewport-coverage.spec.ts                      (§4.3, ~50×3 = 150 tests across viewports)
  error-states.spec.ts                           (§4.4, ~7 tests per API-bound surface ≈ 70)
  high-risk-surfaces.spec.ts                     (§4.5, ~12 explicit cases)
  redirects.spec.ts                              (9 legacy redirect assertions)
```

Playwright traces + screenshots + HAR captured per test. Failures auto-tagged with the surface route + viewport. Runs against `https://truthful-flow-logic-lab.vercel.app` (preview) and local dev (`http://localhost:5173`) — same suite, different baseURL.

Auth fixtures generated via `storageState` capture: anon (no state), operator (signed-in low-priv), admin (signed-in full-priv). Stored in `tests/adversarial/fixtures/storageState-*.json` (gitignored; regenerated by `scripts/adversarial-prepare.mjs`).

### 7.2 Direct API call suite (§3 agent matrix + §6 invariants)

```
tests/adversarial/api/
  agent1-lifecycle.test.ts                       (§3.1, 8 tests)
  agent2-codebuilder.test.ts                     (§3.2, 8 tests)
  agent3-selfrenewal.test.ts                     (§3.3, 9 tests)
  agent4-provideronboarding.test.ts              (§3.4, 9 tests)
  agent5-endcustomerintake.test.ts               (§3.5, 9 tests)
  cross-agent-invariants.test.ts                 (§3.6, 6 tests)
  api-endpoint-auth.test.ts                      (§2.2 ~30 endpoints × 3 auth states = 90 tests)
```

Vitest runner; each test makes raw `fetch()` calls to the SUT. No Playwright dependency. Runs against the same SUT URLs as the e2e suite. Auth tokens injected via `Authorization: Bearer <jwt>` header derived from the same `storageState` fixtures.

### 7.3 Test counts (executable)

| Suite | Test count |
|---|---|
| Per-agent matrix (§3.1–§3.5) | 43 |
| Cross-agent invariants (§3.6) | 6 |
| API endpoint auth (§2.2 × 3 states) | ~90 |
| Surface auth gate (§4.1) | 6 |
| Surface element discovery (§4.2) | ~50 |
| Surface viewport coverage (§4.3 × 3) | ~150 |
| Surface error states (§4.4) | ~70 |
| Surface high-risk adversarial (§4.5) | 12 |
| Legacy redirects (§2.1) | 9 |
| **Total executable tests** | **~436** |

### 7.4 Runtime budget

| Suite | Wall-clock budget |
|---|---|
| Agent API (direct calls, parallel) | 8 min |
| API endpoint auth (parallel) | 6 min |
| Playwright element-discovery (parallel across 3 viewports) | 25 min |
| Playwright viewport-coverage (parallel) | 18 min |
| Playwright error-states (sequential per surface) | 12 min |
| Playwright high-risk adversarial (sequential) | 5 min |
| Playwright redirects | 1 min |
| **Total parallel wall-clock budget** | **~30 min** (longest suite dominates) |

### 7.5 CI integration

- New GitHub Actions workflow: `.github/workflows/adversarial.yml` runs nightly at 03:00 UTC against the canonical Vercel preview URL (matches Sprint PROTECT-1 Phase 2 scheduled-self-test cadence).
- Findings ≥ `high` block the next merge to `main` (CI gate).
- Findings ≥ `medium` post a PR comment summarising on every PR.
- Manually triggered via `gh workflow run adversarial` for ad-hoc audits.

---

## 8. Resolution Contract Wiring (per Rev-2 §6)

Every finding produced by this suite enters the canonical resolution pipeline:

| Finding severity | Auto-routing |
|---|---|
| `critical` | Block merge; alert oncall; require human-gated terminal decision before next deploy |
| `high` | Block merge; create ticket; require terminal decision (Approve / Modify / Skip) within 24h |
| `medium` | PR comment; ticket created with 7-day SLA; medium findings on shipped UI become Self-Heal candidates per Sprint 5 §10 |
| `low` | Captured in backlog; no automated escalation |

Findings tagged `prompt-injection` or `auth-bypass` always escalate to `critical` regardless of detection surface, per Rev-2 §14 GovernanceAuditLog topic `panel_w03_compliance_review_<finding>`.

---

## 9. Open Questions / Blockers

1. **Anti-bot WAF on the deployed Vercel URL.** Sprint PROTECT-1 Phase 1 added bot detection (headless browser signatures, missing User-Agent, rapid-click detection). Playwright runs at default fingerprint may trigger bot detection on the SUT and produce false-positive 403/429. **Mitigation:** the adversarial suite needs an allowlist entry for its Playwright fingerprint, OR Playwright must run under a stealth profile, OR the SUT must expose a `X-Test-Bypass-Token` header for known test runners. **CEO disposition required** — security-sensitive.

2. **Test data isolation across runs.** Some tests (Agent #4 onboarding, Agent #5 intake) create rows. Without a dedicated `_test_<random>` tenant on the SUT, rows accumulate. **Mitigation:** require a `productScope='_test'` reserved tenant with auto-cleanup, OR run against a dev SUT only (not prd). **CEO disposition required.**

3. **Stripe Connect adversarial coverage scope.** Agent #4 wires Stripe Connect. Sending nominal Stripe-Connect-link requests against the live Stripe sandbox is safe; sending oversized payloads is rate-limited; sending injection payloads risks Stripe abuse-flagging the test account. **Mitigation:** mock the Stripe Connect path for adversarial cases; only use sandbox for nominal. Engineering decision, not CEO.

4. **Continuous-crawl invariance against the suite itself.** Agent #13 Self-Protection (DORMANT) is supposed to block hostile crawlers. Once #13 is wired, this adversarial suite IS a hostile crawler from #13's perspective. **Mitigation:** when #13 ships, this suite must be allowlisted via the same mechanism that exempts internal audit (Locked Rule E1).

5. **Performance baselines.** §5.1 mentions "latency within budget" but exact p50 / p95 targets per endpoint aren't canonical. Layer 1 SSOT missing-commitments list (E6 Slot 1 dissent: "MTTD <15 min, MTTR by severity tier") flagged quantified SLAs as missing. **CEO disposition required** to set per-endpoint latency budgets.

6. **Synthetic vs real LLM calls.** Adversarial coverage of Agent #2 + Agent #3 + #4 + #5 makes real Anthropic API calls (~50 across the suite). Per-run cost ≈ $0.30–$0.80. Annualised at nightly cadence: ~$110–$290. **Decision needed:** real LLM calls (most realistic) vs MockClaude (deterministic, free, but doesn't catch real prompt-injection regressions). **Recommend: hybrid** — MockClaude for malformed/edge categories; real Claude for adversarial prompt-injection only.

7. **Capability Transfer install-sprint test scope.** §4.5 lists `/capability-transfer` adversarial cases for RLS bypass. Should the suite also actually generate-and-validate install sprints for the 5 VEU products? That would require live product credentials, which is out of scope for "neutral fixtures only" (Locked Rule 22). **Recommend: skip install-sprint generation tests; only test RLS + UI rendering of the generator.**

8. **CSV vs JSON reporting format.** §6 specifies CSV + markdown. Some downstream tooling prefers JSON. **Engineering decision:** ship CSV + markdown (per §6); add JSON exporter as a follow-up if needed.

---

## 10. Out of scope (intentional)

- Adversarial testing of the 20 DORMANT agents (#6–#25) — they have no implementing code yet.
- Adversarial testing of live VEU products (SAIGE / RelTwin / ReachSMS / PressAI / MyBirthSafe) — covered by per-product clearance protocol (§11 of Rev-2), not by this suite.
- Multi-tenant RLS exhaustive matrix (every table × every role × every operation) — Production Hardening track.
- Vercel infrastructure pen-test (TLS, DDoS, BGP) — provider-level, out of scope.
- Anthropic / OpenRouter / Browserless / v0 API surface pen-test — third-party providers' responsibility.
- Mobile app adversarial (no mobile app shipped yet).
- Capability-Transfer-installed package adversarial inside an installed target product — that's the target product's test surface, not FlowAI's.

---

## 11. Relation to other Rev-2-conformant specs

| Spec | Path | How this suite interacts |
|---|---|---|
| Self-Renewal Agent #3 graduation | `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` (`446ddb5`) | Agent #3 adversarial cases (§3.3) cover both recommend-only path (current) and the planned fork-and-fix path (post-graduation gate). Re-run after graduation ships. |
| Orchestra Integration | `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` (`0d3fcd8`) | When Orchestra picker ships, §3.x agent tests gain dispatch-routing assertions; new tests added for adapter health degradation + fallback chain + cost ceiling enforcement. |
| SSOT W04-Rev-2 | `docs/SSOT_W04_REV2_DRAFT.md` (`10890b9`) | This suite operationalises Rev-2 §6 (resolution contract) + §10 (Self-Governance Layer four Human Gates) + §14 (GovernanceAuditLog as findings sink). |

---

*End of plan. Pending CEO disposition on Open Questions §9 + W6 re-Panel of SSOT W04-Rev-2 before engineering dispatch authorises test suite construction.*
