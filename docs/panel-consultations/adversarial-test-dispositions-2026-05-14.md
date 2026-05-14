# Panel Consultation — FlowAI Self-Adversarial Test Plan Dispositions (2026-05-14)

**Lineage:** W04 dispatch → W6 execution. Disposition request on 8 open questions blocking adversarial-test suite construction. Spec: `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9 (commit `b06e901`).

**Mode:** read-only Panel consultation. 8 multiple-choice questions, 3 options each. Engineering accepts supermajority (≥8/10 ENGAGED) verbatim.

**Started:** 2026-05-14T20:26:08.111Z
**Finished:** 2026-05-14T20:28:18.783Z
**Bundle size:** 80113 chars (full CANONICAL_REFERENCE.md + test plan attached).
**Panel:** 10-slot LIVE composition; Slot 5 + Slot 7 backup adapters wired per W6 brief.

**W6 thresholds:** Quorum = 7 of 10 · Supermajority = 8 of 10.

---

## Slot status

| Slot | Provider | Model | Status | Backup? | Latency (ms) | Error |
|------|----------|-------|--------|---------|--------------|-------|
| 1 | openrouter | `openai/gpt-5` | LIVE-OK | — | 27515 |  |
| 2 | openrouter | `openai/gpt-5` | LIVE-OK | YES | 32667 |  |
| 3 | openrouter | `google/gemini-2.5-pro` | LIVE-OK | — | 36302 |  |
| 4 | openrouter | `mistralai/mistral-large-2411` | LIVE-OK | — | 18821 |  |
| 5 | openrouter | `cohere/command-r-plus-08-2024` | LIVE-OK | — | 32328 |  |
| 6 | openrouter | `qwen/qwen-2.5-72b-instruct` | LIVE-OK | — | 34445 |  |
| 7 | openrouter | `deepseek/deepseek-r1` | LIVE-OK | — | 78816 |  |
| 8 | openrouter | `perplexity/sonar` | LIVE-OK | — | 17156 |  |
| 9 | openrouter | `mistralai/mistral-large-2411` | LIVE-OK | YES | 19177 |  |
| 10 | openrouter | `openai/gpt-4o` | LIVE-OK | — | 5277 |  |

LIVE-OK: 10/10. Backups applied: 2. Quorum met (>=7 LIVE-OK): true. Supermajority achievable (>=8 LIVE-OK): true.

Engagement: ENGAGED=9 · TANGENTIAL=1 · SILENT=0 · EVASIVE=0 (of 10 slots).

---

## Tally + verdicts (ENGAGED-only)

| Q | Topic | (a) | (b) | (c) | other | Top | Verdict |
|---|---|---:|---:|---:|---:|---|---|
| **Q1** | WAF bypass for Playwright tests | 7 | 2 | 0 | 0 | `(a)` | `QUORUM_PLURALITY_(a)` |
| **Q2** | Test data isolation across runs | 9 | 0 | 0 | 0 | `(a)` | `SUPERMAJORITY_(a)` |
| **Q3** | Stripe adversarial scope | 0 | 9 | 0 | 0 | `(b)` | `SUPERMAJORITY_(b)` |
| **Q4** | Self-Protection Agent #13 conflict (when #13 ships) | 6 | 0 | 3 | 0 | `(a)` | `PLURALITY_(a)` |
| **Q5** | Performance baselines (p50/p95 SLAs) | 4 | 5 | 0 | 0 | `(b)` | `PLURALITY_(b)` |
| **Q6** | Real LLM vs Mock for adversarial tests | 0 | 9 | 0 | 0 | `(b)` | `SUPERMAJORITY_(b)` |
| **Q7** | Capability Transfer testing scope | 0 | 9 | 0 | 0 | `(b)` | `SUPERMAJORITY_(b)` |
| **Q8** | Reporting format | 8 | 0 | 1 | 0 | `(a)` | `SUPERMAJORITY_(a)` |

---

## Recommended dispositions (Panel-winning option per question)

- **Q1** (§9 OQ-1) — WAF bypass for Playwright tests
  - Verdict: `QUORUM_PLURALITY_(a)` · Top option: `(a)` (7/9 ENGAGED)
  - Winning option text: Add X-Test-Bypass-Token header allowlist on the SUT (Playwright fingerprint sends a known token; production also accepts header but only for allowlisted IPs / dev environment)

- **Q2** (§9 OQ-2) — Test data isolation across runs
  - Verdict: `SUPERMAJORITY_(a)` · Top option: `(a)` (9/9 ENGAGED)
  - Winning option text: Reserved productScope='_test' tenant with auto-cleanup (RLS-isolated test tenant; nightly TRUNCATE; per-run sub-tenants under it)

- **Q3** (§9 OQ-3) — Stripe adversarial scope
  - Verdict: `SUPERMAJORITY_(b)` · Top option: `(b)` (9/9 ENGAGED)
  - Winning option text: Sandbox for nominal only (live Stripe sandbox for A4-N1/N2 nominal; mock everything else to avoid abuse-flagging)

- **Q4** (§9 OQ-4) — Self-Protection Agent #13 conflict (when #13 ships)
  - Verdict: `PLURALITY_(a)` · Top option: `(a)` (6/9 ENGAGED)
  - Winning option text: Allowlist test suite via the same mechanism that exempts internal audit (Locked Rule E1) — explicit allowlist entry by fingerprint / token

- **Q5** (§9 OQ-5) — Performance baselines (p50/p95 SLAs)
  - Verdict: `PLURALITY_(b)` · Top option: `(b)` (5/9 ENGAGED)
  - Winning option text: Record-only, no pass/fail (suite logs latency to GovernanceAuditLog; no assertions; baselines emerge from data)

- **Q6** (§9 OQ-6) — Real LLM vs Mock for adversarial tests
  - Verdict: `SUPERMAJORITY_(b)` · Top option: `(b)` (9/9 ENGAGED)
  - Winning option text: Hybrid: real Claude for prompt-injection adversarial only; MockClaude for malformed/edge/nominal (per spec §9 recommendation; ~$0.30–$0.80 per run; ~$110–$290/year)

- **Q7** (§9 OQ-7) — Capability Transfer testing scope
  - Verdict: `SUPERMAJORITY_(b)` · Top option: `(b)` (9/9 ENGAGED)
  - Winning option text: Test RLS + UI rendering only (per spec recommendation; do NOT generate live install sprints — neutral fixtures only per Locked Rule 22)

- **Q8** (§9 OQ-8) — Reporting format
  - Verdict: `SUPERMAJORITY_(a)` · Top option: `(a)` (8/9 ENGAGED)
  - Winning option text: Markdown + CSV (per spec §6 as-written)

---

## Per-question detail

### Q1 — WAF bypass for Playwright tests (§9 OQ-1)

- (a) Add X-Test-Bypass-Token header allowlist on the SUT (Playwright fingerprint sends a known token; production also accepts header but only for allowlisted IPs / dev environment)
- (b) Use stealth Playwright profile (override User-Agent + automation signatures so Sprint PROTECT-1 Phase 1 bot detection does not fire)
- (c) Test against dev SUT only (do not exercise bot detection on the deployed Vercel URL; run nightly against http://localhost:5173 or a non-prd preview)

**Verdict:** `QUORUM_PLURALITY_(a)` — 7 of 9 ENGAGED on (a) (≥ quorum 7/10, < supermajority 8/10).

### Q2 — Test data isolation across runs (§9 OQ-2)

- (a) Reserved productScope='_test' tenant with auto-cleanup (RLS-isolated test tenant; nightly TRUNCATE; per-run sub-tenants under it)
- (b) Dev SUT only (no isolation needed because prd is not exercised; rows accumulate in dev which we accept)
- (c) Separate test database (entirely separate Supabase project for adversarial test data)

**Verdict:** `SUPERMAJORITY_(a)` — 9 of 9 ENGAGED on (a) (≥ 8/10).

### Q3 — Stripe adversarial scope (§9 OQ-3)

- (a) Mock Stripe everywhere (no live Stripe calls in the adversarial suite; deterministic mock; zero abuse-flag risk)
- (b) Sandbox for nominal only (live Stripe sandbox for A4-N1/N2 nominal; mock everything else to avoid abuse-flagging)
- (c) Skip Stripe tests entirely (defer Agent #4 commercial-rail tests until production hardening track)

**Verdict:** `SUPERMAJORITY_(b)` — 9 of 9 ENGAGED on (b) (≥ 8/10).

### Q4 — Self-Protection Agent #13 conflict (when #13 ships) (§9 OQ-4)

- (a) Allowlist test suite via the same mechanism that exempts internal audit (Locked Rule E1) — explicit allowlist entry by fingerprint / token
- (b) Disable Agent #13 during test runs (test environment flips #13 off; restores after)
- (c) Not blocking, defer (Agent #13 is DORMANT today; revisit when #13 graduation is dispatched)

**Verdict:** `PLURALITY_(a)` — 6 of 9 ENGAGED on (a) (below quorum 7/10).

### Q5 — Performance baselines (p50/p95 SLAs) (§9 OQ-5)

- (a) Set p50/p95 defaults now (per-endpoint budgets baked into the suite — e.g. p95<2s for /api/orchestrator/run, p95<500ms for /api/health — explicitly assertable)
- (b) Record-only, no pass/fail (suite logs latency to GovernanceAuditLog; no assertions; baselines emerge from data)
- (c) Defer until production traffic data (no perf assertions in adversarial suite until real prd traffic establishes empirical baselines)

**Verdict:** `PLURALITY_(b)` — 5 of 9 ENGAGED on (b) (below quorum 7/10).

### Q6 — Real LLM vs Mock for adversarial tests (§9 OQ-6)

- (a) MockClaude everywhere (deterministic, free, no real Anthropic API calls; sacrifices prompt-injection coverage realism)
- (b) Hybrid: real Claude for prompt-injection adversarial only; MockClaude for malformed/edge/nominal (per spec §9 recommendation; ~$0.30–$0.80 per run; ~$110–$290/year)
- (c) Real Claude everywhere (most realistic; highest cost; full prompt-injection coverage on all categories)

**Verdict:** `SUPERMAJORITY_(b)` — 9 of 9 ENGAGED on (b) (≥ 8/10).

### Q7 — Capability Transfer testing scope (§9 OQ-7)

- (a) Skip Capability Transfer entirely (defer all /capability-transfer testing)
- (b) Test RLS + UI rendering only (per spec recommendation; do NOT generate live install sprints — neutral fixtures only per Locked Rule 22)
- (c) Full test with mock credentials (generate-and-validate install sprints using mock VEU product credentials)

**Verdict:** `SUPERMAJORITY_(b)` — 9 of 9 ENGAGED on (b) (≥ 8/10).

### Q8 — Reporting format (§9 OQ-8)

- (a) Markdown + CSV (per spec §6 as-written)
- (b) Markdown + JSON (replace CSV with JSON for downstream-tooling compatibility)
- (c) All three (Markdown + CSV + JSON — maximal compatibility)

**Verdict:** `SUPERMAJORITY_(a)` — 8 of 9 ENGAGED on (a) (≥ 8/10).


---

## Per-reviewer picks + rationales

**Slot 1** [ENGAGED] — openrouter:openai/gpt-5

- **Q1** = `(a)`
  > Per §9 OQ-1, Sprint PROTECT-1 Phase 1 added bot detection; CI is intended to run nightly against the deployed Vercel URL (§7.5). A X-Test-Bypass-Token allowlist preserves the protection while enabling tests, unlike stealth evasion.
- **Q2** = `(a)`
  > §9 OQ-2 flags row accumulation; a reserved productScope='_test' tenant with auto-cleanup keeps test data RLS-isolated. This aligns with cross-agent invariant INV-4 in §3.6 and patterns like A1-X1 ('RLS isolates').
- **Q3** = `(b)`
  > §9 OQ-3 recommends sandbox for nominal and mocks for adversarial to avoid Stripe abuse flags. This fits the Agent #4 nominal cases A4-N1/N2 in §3.4 while safely mocking the rest.
- **Q4** = `(a)`
  > As noted in §9 OQ-4, when Agent #13 Self-Protection ships the suite must be allowlisted via the same mechanism that exempts internal audit (Locked Rule E1). This avoids disabling protections while permitting internal adversarial runs.
- **Q5** = `(b)`
  > §9 OQ-5 notes SLAs are not canonical; §5.1 references latency budgets without defined targets. Record-only to GovernanceAuditLog (Rev-2 §14) avoids false failures until empirical p50/p95 baselines are set.
- **Q6** = `(b)`
  > Adopt the hybrid approach explicitly recommended in §9 OQ-6: real Claude for prompt-injection adversarial, MockClaude for malformed/edge/nominal, with the stated ~$110–$290/year cost.
- **Q7** = `(b)`
  > Per §9 OQ-7 and §4.5, test only RLS + UI rendering on /capability-transfer and do not generate install sprints. This respects Locked Rule 22 (neutral fixtures only).
- **Q8** = `(a)`
  > Follow §6 as written (Markdown + CSV) and §9 OQ-8’s guidance to add JSON later if needed. This keeps the reporting scope aligned with the current spec.

Overall notes: Ensure the X-Test-Bypass-Token is IP-scoped and environment-scoped, and that the _test tenant auto-cleanup runs on the same 03:00 UTC cadence as Sprint PROTECT-1’s scheduled self-test.

---

**Slot 2** [ENGAGED] — openrouter:openai/gpt-5

- **Q1** = `(a)`
  > Sprint PROTECT-1 Phase 1 introduced bot detection, and §7.5 schedules nightly CI against the deployed preview, so an explicit X-Test-Bypass-Token allowlist is the safest way to avoid false 403/429 without evasion. This aligns with §9 OQ-1’s suggested mitigations while preserving coverage of the PROTECT-1 defenses.
- **Q2** = `(a)`
  > Adopt a reserved productScope='_test' tenant with auto-cleanup to keep data isolated while exercising the deployed SUT, as raised in §9 OQ-2. productScope is already a tested concept in the plan (e.g., A4-X3 and A5-X3), making this consistent with the suite’s RLS assumptions.
- **Q3** = `(b)`
  > Follow §9 OQ-3’s recommendation: use Stripe sandbox for nominal cases (A4-N1/N2) and mock adversarial payloads to avoid abuse-flagging the account. This preserves realism for Agent #4’s happy path while safely covering edge/adversarial behaviors.
- **Q4** = `(a)`
  > Per §9 OQ-4, when Agent #13 (Self-Protection) ships, allowlist the adversarial suite via the same mechanism that exempts internal audit (Locked Rule E1) instead of disabling protections. This keeps Sprint PROTECT-1 defenses active while permitting internal tests.
- **Q5** = `(b)`
  > §5.1 mentions 'latency within budget' but §9 OQ-5 notes no canonical p50/p95 SLAs yet; therefore record-only metrics to GovernanceAuditLog (Rev-2 §14) until budgets are set. This avoids false failures while establishing empirical baselines.
- **Q6** = `(b)`
  > Adopt the hybrid approach recommended in §9 OQ-6: real Claude for prompt-injection adversarial, MockClaude for nominal/malformed/edge, with the cited ~$110–$290/year cost. This balances realism with determinism and cost control for Agents #2/#3/#4/#5.
- **Q7** = `(b)`
  > Limit to RLS + UI rendering checks on /capability-transfer as advised in §9 OQ-7 and §4.5, without generating live install sprints, to respect Locked Rule 22 (neutral fixtures only). This still exercises authorization paths without requiring real product credentials.
- **Q8** = `(a)`
  > Ship Markdown + CSV per §6 Reporting Format as written; JSON can be added later if needed. This matches the plan’s current tooling and GovernanceAuditLog integration (Rev-2 §14).

Overall notes: Selections follow the plan’s own recommendations where present (e.g., §9 OQ-3, OQ-6, OQ-7) and preserve deployed-surface coverage of Sprint PROTECT-1 by using explicit allowlisting rather than stealth.

---

**Slot 3** [ENGAGED] — openrouter:google/gemini-2.5-pro

- **Q1** = `(a)`
  > This is the most robust and auditable solution, creating an explicit, controlled bypass rather than engaging in a brittle arms race with stealth profiles. This aligns with the system's emphasis on auditable actions, such as the GovernanceAuditLog mentioned in Sprint HARD-1 and test plan §6, and avoids leaving the bot detection from Sprint PROTECT-1 untested on the target environment.
- **Q2** = `(a)`
  > Using a reserved `_test` tenant leverages the system's own RLS architecture for isolation, which is cleaner and more realistic than managing a separate database. This approach is consistent with the design of RLS-centric adversarial tests like A4-X2 and A5-X2, which already presume a robust, testable tenancy model.
- **Q3** = `(b)`
  > The hybrid approach recommended in §9 OQ-3 provides the best balance of realism and safety. It validates the nominal path (A4-N1) against the live Stripe sandbox for integration confidence, while using mocks for potentially abusive adversarial tests to prevent the test account from being flagged.
- **Q4** = `(a)`
  > An explicit allowlist is the correct architectural path, aligning with the principle of controlled exemptions mentioned in the test plan's OQ-4 and its reference to 'Locked Rule E1'. Disabling Agent #13 during tests would mean the suite is not testing the system in its true, fully-protected state, defeating part of the test's purpose.
- **Q5** = `(a)`
  > Setting default performance budgets now makes performance a concrete, testable requirement and prevents silent regressions. This operationalizes the 'latency within budget' pass criterion mentioned in §5.1 of the test plan, providing immediate value even if the specific budget numbers are refined later based on production data.
- **Q6** = `(b)`
  > The hybrid approach is the most pragmatic, directly following the recommendation in §9 OQ-6. It focuses the cost and realism of live LLM calls on the highest-risk adversarial prompt-injection tests (e.g., A2-X1), where mocks are insufficient, while using cheaper, deterministic mocks for other categories.
- **Q7** = `(b)`
  > This option correctly balances test coverage with project constraints, as recommended in §9 OQ-7. It provides crucial security testing for RLS bypass on the `/capability-transfer` surface (§4.5) while strictly adhering to 'Locked Rule 22' by not requiring live VEU product credentials.
- **Q8** = `(a)`
  > This choice directly implements the reporting format as specified in §6 of the test plan. While other formats may have benefits, adhering to the written specification is the most direct path to compliance, and OQ-8 itself suggests a JSON exporter could be a 'follow-up' if needed.

Overall notes: The test plan is comprehensive, and its recommendations for hybrid testing (Q3, Q6) and explicit bypass mechanisms (Q1, Q4) are pragmatic and architecturally sound. The suite provides excellent coverage of the surfaces and agents defined in the CANONICAL_REFERENCE.

---

**Slot 4** [ENGAGED] — openrouter:mistralai/mistral-large-2411

- **Q1** = `(b)`
  > Using a stealth Playwright profile is the most practical solution as it ensures that the tests can run without triggering bot detection mechanisms, allowing for accurate results without modifying the production environment.
- **Q2** = `(a)`
  > A reserved productScope='_test' tenant with auto-cleanup ensures test data isolation and prevents data accumulation, aligning with the need for a clean test environment as per §9 OQ-2.
- **Q3** = `(b)`
  > Using the live Stripe sandbox for nominal tests ensures real-world accuracy while mocking other tests to avoid abuse-flagging, as recommended in Sprint PROTECT-1.
- **Q4** = `(c)`
  > Since Agent #13 is DORMANT, deferring this decision is appropriate until the agent is shipped, avoiding premature changes as per §9 OQ-4.
- **Q5** = `(b)`
  > Recording latency without pass/fail criteria allows for data-driven baseline establishment, aligning with the need for empirical data as per §9 OQ-5.
- **Q6** = `(b)`
  > A hybrid approach balances cost and realism, using real Claude for prompt-injection tests and MockClaude for others, following the spec recommendation in §9 OQ-6.
- **Q7** = `(b)`
  > Testing RLS + UI rendering without generating live install sprints adheres to Locked Rule 22 and the spec recommendation, ensuring neutral fixtures are used as per §9 OQ-7.
- **Q8** = `(a)`
  > Following the spec as written with Markdown + CSV reporting ensures compliance and consistency, as per §6.

Overall notes: All decisions align with the spec and CANONICAL_REFERENCE, ensuring a balanced approach to testing and compliance.

---

**Slot 5** [TANGENTIAL] — openrouter:cohere/command-r-plus-08-2024

- **Q1** = `(a)`
  > The test suite should be able to run against the production environment without triggering bot detection. Adding a header allowlist on the SUT is a more robust solution than using a stealth profile, as it ensures that the tests can run in a production-like environment without being blocked. It also allows for more flexibility in the future, as the header can be used to allowlist other test runners or tools.
- **Q2** = `(a)`
  > A dedicated test tenant with auto-cleanup is the best option, as it allows for isolation of test data without the need for a separate database. This approach ensures that the production environment remains clean and that test data is automatically cleaned up after each run, reducing the risk of data accumulation and potential issues.
- **Q3** = `(b)`
  > Using a live Stripe sandbox for nominal cases and mocking for adversarial cases is a good balance between realism and safety. It allows for testing the Stripe integration in a production-like environment while minimizing the risk of abuse-flagging. This approach also ensures that the test suite can cover both nominal and adversarial cases, providing a comprehensive test coverage.
- **Q4** = `(a)`
  > Allowlisting the test suite is the best option, as it ensures that the tests can run without being blocked by the Self-Protection Agent. This approach is similar to the one used for internal audit, which is a proven and effective method. It also allows for more flexibility in the future, as the allowlist can be updated as needed.
- **Q5** = `(a)`
  > Setting p50/p95 defaults now is the best option, as it allows for explicit assertions and provides a clear baseline for performance testing. This approach ensures that the test suite can catch performance regressions and provides a clear metric for success. It also aligns with the SSOT W04-Rev-2 §6, which requires a resolution contract for performance issues.
- **Q6** = `(b)`
  > Using a hybrid approach with real Claude for prompt-injection adversarial cases and MockClaude for other cases is the best option, as it provides a balance between cost and coverage. This approach ensures that the test suite can catch prompt-injection regressions while keeping costs low. It also aligns with the recommendation in the test plan, which suggests a hybrid approach.
- **Q7** = `(b)`
  > Testing RLS and UI rendering only is the best option, as it allows for testing the Capability Transfer feature without the need for live product credentials. This approach ensures that the test suite can cover the feature without violating the 'neutral fixtures only' rule. It also aligns with the recommendation in the test plan, which suggests testing RLS and UI rendering only.
- **Q8** = `(a)`
  > Using Markdown and CSV is the best option, as it aligns with the test plan and provides a good balance between compatibility and simplicity. This approach ensures that the test suite can generate reports in a format that is easy to read and share, while also being compatible with downstream tooling. It also allows for more flexibility in the future, as additional formats can be added as needed.

Overall notes: The test plan is well-structured and comprehensive, covering a wide range of scenarios and surfaces. The open questions are well-defined and provide clear options for addressing potential issues. The recommended options for each question are well-reasoned and aligned with the goals of the test suite.

---

**Slot 6** [ENGAGED] — openrouter:qwen/qwen-2.5-72b-instruct

- **Q1** = `(a)`
  > Adding an X-Test-Bypass-Token header aligns with the security measures in Sprint PROTECT-1 Phase 1, ensuring that the test suite can run without triggering bot detection.
- **Q2** = `(a)`
  > A reserved productScope='_test' tenant with auto-cleanup provides a clean and isolated environment for testing, ensuring that test data does not interfere with production data.
- **Q3** = `(b)`
  > Using the Stripe sandbox for nominal cases and mocking for adversarial cases balances the need for realistic testing with the risk of abuse-flagging the test account.
- **Q4** = `(a)`
  > Allowlisting the test suite via the same mechanism that exempts internal audit (Locked Rule E1) ensures that the test suite can run without being blocked by Agent #13 when it ships.
- **Q5** = `(a)`
  > Setting p50/p95 defaults now provides clear performance baselines that can be asserted in the test suite, ensuring that the system meets expected latency requirements.
- **Q6** = `(b)`
  > The hybrid approach of using real Claude for prompt-injection adversarial tests and MockClaude for other categories balances realism with cost, as recommended in the test plan.
- **Q7** = `(b)`
  > Testing RLS and UI rendering only for Capability Transfer aligns with the neutral fixtures only requirement (Locked Rule 22) and ensures that the test scope is manageable.
- **Q8** = `(a)`
  > Using Markdown + CSV as specified in the test plan ensures that the reporting format is consistent and aligns with the existing documentation standards.

Overall notes: The selected options balance security, performance, and cost considerations while ensuring that the test suite is comprehensive and aligned with the project's goals and constraints.

---

**Slot 7** [ENGAGED] — openrouter:deepseek/deepseek-r1

- **Q1** = `(a)`
  > Test plan §9 OQ-1 explicitly lists X-Test-Bypass-Token as a mitigation strategy. This aligns with Sprint PROTECT-1's security architecture while allowing realistic testing against deployed environments.
- **Q2** = `(a)`
  > Test plan §9 OQ-2 recommends a reserved tenant solution. This maintains RLS isolation per Sprint 6 Phase 3 while enabling production-like testing, avoiding dev-only limitations.
- **Q3** = `(b)`
  > Test plan §9 OQ-3 explicitly recommends hybrid approach: sandbox for nominal cases (A4-N1/N2) and mocks for adversarial to prevent abuse-flagging while maintaining realism.
- **Q4** = `(a)`
  > Test plan §9 OQ-4 cites Locked Rule E1 for internal audit exemptions. This provides future-proofing without disabling critical functionality when Agent #13 ships.
- **Q5** = `(a)`
  > Test plan §5.1 requires latency assertions. Setting initial budgets enables immediate verification of Rev-2 §6 commitments while allowing empirical refinement later.
- **Q6** = `(b)`
  > Test plan §9 OQ-6 explicitly recommends hybrid approach. This balances cost containment ($110-290/year) with critical prompt-injection coverage for adversarial cases.
- **Q7** = `(b)`
  > Test plan §9 OQ-7 recommendation cites Locked Rule 22 (neutral fixtures). Testing RLS/UI without live generation maintains scope compliance while validating key security surfaces.
- **Q8** = `(a)`
  > Test plan §6 mandates CSV+Markdown format. The spec explicitly states JSON should be a follow-up if needed, preserving current engineering priorities.

---

**Slot 8** [ENGAGED] — openrouter:perplexity/sonar

- **Q1** = `(a)`
  > X-Test-Bypass-Token allowlist is the most operationally sound approach. Sprint PROTECT-1 Phase 1 (§1, PROTECT-1 section) added bot detection as a security hardening measure; a test-specific bypass token preserves that hardening while enabling the adversarial suite to run against the deployed Vercel URL without false positives. This aligns with the resolution contract (Rev-2 §6) requiring findings to be tamper-evident and auditable on the canonical SUT.
- **Q2** = `(a)`
  > Reserved productScope='_test' tenant with auto-cleanup is the cleanest isolation model. The CANONICAL_REFERENCE (§1, Sprint 7.5a) establishes role-based RLS as the foundational access control; a dedicated _test tenant leverages that same RLS boundary. Auto-cleanup via nightly TRUNCATE keeps the test surface deterministic and prevents row accumulation from skewing subsequent runs.
- **Q3** = `(b)`
  > Sandbox for nominal only (A4-N1/N2) with mock for adversarial/edge/malformed is the recommended hybrid per §9 OQ-3. Agent #4 Provider Onboarding (§3.4, HARD-1 section) is SHIPPED-GREEN; nominal Stripe sandbox calls validate the real integration path without abuse-flag risk, while mocking adversarial cases (injection, oversized payloads) avoids provider-level friction.
- **Q4** = `(c)`
  > Agent #13 Self-Protection is DORMANT (CANONICAL_REFERENCE §2, 'Agent #6 Research has a content-insufficient block semantic... but no class file — counts as partially wired, not shipped-green'). Deferring this decision until #13 graduation is dispatched is the pragmatic choice; revisit when #13 becomes active and the conflict becomes real.
- **Q5** = `(a)`
  > Set p50/p95 defaults now with explicit per-endpoint budgets. The test plan §5.1 already references 'latency within budget' as a pass criterion; baking in concrete targets (e.g., p95<2s for /api/orchestrator/run per §7.4 runtime budget) makes the suite immediately actionable and prevents latency regressions from shipping undetected. This operationalises the Self-Governance Layer (Sprint 5, CANONICAL_REFERENCE §1) four Human Gates concept.
- **Q6** = `(b)`
  > Hybrid approach (real Claude for prompt-injection adversarial only; MockClaude for malformed/edge/nominal) is the spec recommendation (§9 OQ-6). This balances realism ($110–$290/year cost is acceptable for nightly cadence) with determinism; prompt-injection coverage is the highest-risk category and deserves real LLM validation per the resolution contract (Rev-2 §6, critical findings block merge).
- **Q7** = `(b)`
  > Test RLS + UI rendering only, per spec recommendation and Locked Rule 22 ('no live VEU product crawl, uses neutral fixtures only'). Capability Transfer (HARD-1 section, /capability-transfer route) is a UI surface that must be tested for auth/RLS correctness, but generating live install sprints with mock credentials violates the neutral-fixtures constraint and introduces external dependency risk.
- **Q8** = `(c)`
  > Ship all three formats (Markdown + CSV + JSON). The spec §6 mandates Markdown + CSV; adding JSON exporter at the same time maximizes downstream tooling compatibility (some systems prefer JSON for programmatic ingestion) without additional engineering burden. GovernanceAuditLog (Rev-2 §14, HARD-1 section) already stores findings as structured records; JSON export is a natural extension.

Overall notes: All eight questions are operationally grounded in the CANONICAL_REFERENCE sprint history and Rev-2 SSOT commitments. The hybrid approach (real LLM for high-risk, mock for determinism; test-specific bypass tokens; dedicated _test tenant) balances security hardening with test pragmatism. No questions required null picks; all rationales cite specific sections, sprints, or locked rules.

---

**Slot 9** [ENGAGED] — openrouter:mistralai/mistral-large-2411

- **Q1** = `(b)`
  > Using a stealth Playwright profile ensures that the tests are realistic and do not bypass the actual security measures in place, providing a more accurate assessment of the system's resilience against bot detection mechanisms as outlined in §9 OQ-1.
- **Q2** = `(a)`
  > A reserved productScope='_test' tenant with auto-cleanup aligns with the need for test data isolation and ensures that tests do not interfere with production data, as specified in §9 OQ-2.
- **Q3** = `(b)`
  > Using the live Stripe sandbox for nominal tests while mocking other scenarios prevents abuse-flagging and ensures realistic testing for nominal cases, adhering to the guidelines in §9 OQ-3.
- **Q4** = `(c)`
  > Deferring the decision until Agent #13 is shipped avoids premature decisions and ensures that the test suite remains aligned with the current state of the system, as mentioned in §9 OQ-4.
- **Q5** = `(b)`
  > Recording latency without pass/fail criteria allows for the collection of baseline data without imposing arbitrary performance thresholds, which can be set later based on empirical data, as suggested in §9 OQ-5.
- **Q6** = `(b)`
  > A hybrid approach using real Claude for prompt-injection tests and MockClaude for other categories balances cost and realism, ensuring comprehensive coverage without excessive expenditure, as recommended in §9 OQ-6.
- **Q7** = `(b)`
  > Testing RLS and UI rendering without generating live install sprints adheres to Locked Rule 22 and ensures that the tests remain within the scope of neutral fixtures, as per §9 OQ-7.
- **Q8** = `(a)`
  > Using Markdown and CSV for reporting aligns with the current specification in §6 and ensures compatibility with existing downstream tooling.

---

**Slot 10** [ENGAGED] — openrouter:openai/gpt-4o

- **Q1** = `(a)`
  > Adding an X-Test-Bypass-Token header allowlist on the SUT ensures that Playwright tests can run without triggering bot detection, aligning with the security measures in Sprint PROTECT-1 Phase 1.
- **Q2** = `(a)`
  > Using a reserved productScope='_test' tenant with auto-cleanup allows for isolated test data management, preventing accumulation and ensuring clean test runs, as suggested in §9 OQ-2.
- **Q3** = `(b)`
  > Using the Stripe sandbox for nominal tests and mocking for adversarial cases balances realism with risk management, as recommended in §9 OQ-3.
- **Q4** = `(a)`
  > Allowlisting the test suite via the same mechanism that exempts internal audit ensures compatibility with Agent #13 once it ships, per Locked Rule E1.
- **Q5** = `(b)`
  > Recording latency without pass/fail assertions allows baselines to emerge from data, which is practical given the lack of established SLAs, as noted in §9 OQ-5.
- **Q6** = `(b)`
  > A hybrid approach using real Claude for prompt-injection adversarial tests and MockClaude for others provides a balance between cost and realism, as recommended in §9 OQ-6.
- **Q7** = `(b)`
  > Testing RLS and UI rendering without generating live install sprints adheres to Locked Rule 22, focusing on neutral fixtures only, as recommended in §9 OQ-7.
- **Q8** = `(a)`
  > Using Markdown and CSV for reporting aligns with the current specification in §6, ensuring compatibility with existing processes.

Overall notes: The recommendations focus on balancing realism, security, and cost-effectiveness while adhering to Locked Rules and current specifications.


---

## Raw reviewer responses

### Slot 1 — openrouter:openai/gpt-5

- Provider: `openrouter`
- Latency: 27515 ms
- HTTP status: OK

```
{
  "reviewer_slot": 4,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": { "pick": "(a)", "rationale": "Per §9 OQ-1, Sprint PROTECT-1 Phase 1 added bot detection; CI is intended to run nightly against the deployed Vercel URL (§7.5). A X-Test-Bypass-Token allowlist preserves the protection while enabling tests, unlike stealth evasion." },
    "Q2": { "pick": "(a)", "rationale": "§9 OQ-2 flags row accumulation; a reserved productScope='_test' tenant with auto-cleanup keeps test data RLS-isolated. This aligns with cross-agent invariant INV-4 in §3.6 and patterns like A1-X1 ('RLS isolates')." },
    "Q3": { "pick": "(b)", "rationale": "§9 OQ-3 recommends sandbox for nominal and mocks for adversarial to avoid Stripe abuse flags. This fits the Agent #4 nominal cases A4-N1/N2 in §3.4 while safely mocking the rest." },
    "Q4": { "pick": "(a)", "rationale": "As noted in §9 OQ-4, when Agent #13 Self-Protection ships the suite must be allowlisted via the same mechanism that exempts internal audit (Locked Rule E1). This avoids disabling protections while permitting internal adversarial runs." },
    "Q5": { "pick": "(b)", "rationale": "§9 OQ-5 notes SLAs are not canonical; §5.1 references latency budgets without defined targets. Record-only to GovernanceAuditLog (Rev-2 §14) avoids false failures until empirical p50/p95 baselines are set." },
    "Q6": { "pick": "(b)", "rationale": "Adopt the hybrid approach explicitly recommended in §9 OQ-6: real Claude for prompt-injection adversarial, MockClaude for malformed/edge/nominal, with the stated ~$110–$290/year cost." },
    "Q7": { "pick": "(b)", "rationale": "Per §9 OQ-7 and §4.5, test only RLS + UI rendering on /capability-transfer and do not generate install sprints. This respects Locked Rule 22 (neutral fixtures only)." },
    "Q8": { "pick": "(a)", "rationale": "Follow §6 as written (Markdown + CSV) and §9 OQ-8’s guidance to add JSON later if needed. This keeps the reporting scope aligned with the current spec." }
  },
  "overall_notes": "Ensure the X-Test-Bypass-Token is IP-scoped and environment-scoped, and that the _test tenant auto-cleanup runs on the same 03:00 UTC cadence as Sprint PROTECT-1’s scheduled self-test."
}
```

---

### Slot 2 [BACKUP applied] — openrouter:openai/gpt-5

- Provider: `openrouter`
- Latency: 32667 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:anthropic/claude-opus-4` (error: openrouter 402: {"error":{"message":"This request requires more credits, or fewer max_tokens. You requested up to 32000 tokens, but can only afford 18755. To increase, visit https://openrouter.ai/settings/keys and cr)

```
{
  "reviewer_slot": 4,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(a)",
      "rationale": "Sprint PROTECT-1 Phase 1 introduced bot detection, and §7.5 schedules nightly CI against the deployed preview, so an explicit X-Test-Bypass-Token allowlist is the safest way to avoid false 403/429 without evasion. This aligns with §9 OQ-1’s suggested mitigations while preserving coverage of the PROTECT-1 defenses."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Adopt a reserved productScope='_test' tenant with auto-cleanup to keep data isolated while exercising the deployed SUT, as raised in §9 OQ-2. productScope is already a tested concept in the plan (e.g., A4-X3 and A5-X3), making this consistent with the suite’s RLS assumptions."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Follow §9 OQ-3’s recommendation: use Stripe sandbox for nominal cases (A4-N1/N2) and mock adversarial payloads to avoid abuse-flagging the account. This preserves realism for Agent #4’s happy path while safely covering edge/adversarial behaviors."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "Per §9 OQ-4, when Agent #13 (Self-Protection) ships, allowlist the adversarial suite via the same mechanism that exempts internal audit (Locked Rule E1) instead of disabling protections. This keeps Sprint PROTECT-1 defenses active while permitting internal tests."
    },
    "Q5": {
      "pick": "(b)",
      "rationale": "§5.1 mentions 'latency within budget' but §9 OQ-5 notes no canonical p50/p95 SLAs yet; therefore record-only metrics to GovernanceAuditLog (Rev-2 §14) until budgets are set. This avoids false failures while establishing empirical baselines."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "Adopt the hybrid approach recommended in §9 OQ-6: real Claude for prompt-injection adversarial, MockClaude for nominal/malformed/edge, with the cited ~$110–$290/year cost. This balances realism with determinism and cost control for Agents #2/#3/#4/#5."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Limit to RLS + UI rendering checks on /capability-transfer as advised in §9 OQ-7 and §4.5, without generating live install sprints, to respect Locked Rule 22 (neutral fixtures only). This still exercises authorization paths without requiring real product credentials."
    },
    "Q8": {
      "pick": "(a)",
      "rationale": "Ship Markdown + CSV per §6 Reporting Format as written; JSON can be added later if needed. This matches the plan’s current tooling and GovernanceAuditLog integration (Rev-2 §14)."
    }
  },
  "overall_notes": "Selections follow the plan’s own recommendations where present (e.g., §9 OQ-3, OQ-6, OQ-7) and preserve deployed-surface coverage of Sprint PROTECT-1 by using explicit allowlisting rather than stealth."
}
```

---

### Slot 3 — openrouter:google/gemini-2.5-pro

- Provider: `openrouter`
- Latency: 36302 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 7,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(a)",
      "rationale": "This is the most robust and auditable solution, creating an explicit, controlled bypass rather than engaging in a brittle arms race with stealth profiles. This aligns with the system's emphasis on auditable actions, such as the GovernanceAuditLog mentioned in Sprint HARD-1 and test plan §6, and avoids leaving the bot detection from Sprint PROTECT-1 untested on the target environment."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Using a reserved `_test` tenant leverages the system's own RLS architecture for isolation, which is cleaner and more realistic than managing a separate database. This approach is consistent with the design of RLS-centric adversarial tests like A4-X2 and A5-X2, which already presume a robust, testable tenancy model."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "The hybrid approach recommended in §9 OQ-3 provides the best balance of realism and safety. It validates the nominal path (A4-N1) against the live Stripe sandbox for integration confidence, while using mocks for potentially abusive adversarial tests to prevent the test account from being flagged."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "An explicit allowlist is the correct architectural path, aligning with the principle of controlled exemptions mentioned in the test plan's OQ-4 and its reference to 'Locked Rule E1'. Disabling Agent #13 during tests would mean the suite is not testing the system in its true, fully-protected state, defeating part of the test's purpose."
    },
    "Q5": {
      "pick": "(a)",
      "rationale": "Setting default performance budgets now makes performance a concrete, testable requirement and prevents silent regressions. This operationalizes the 'latency within budget' pass criterion mentioned in §5.1 of the test plan, providing immediate value even if the specific budget numbers are refined later based on production data."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "The hybrid approach is the most pragmatic, directly following the recommendation in §9 OQ-6. It focuses the cost and realism of live LLM calls on the highest-risk adversarial prompt-injection tests (e.g., A2-X1), where mocks are insufficient, while using cheaper, deterministic mocks for other categories."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "This option correctly balances test coverage with project constraints, as recommended in §9 OQ-7. It provides crucial security testing for RLS bypass on the `/capability-transfer` surface (§4.5) while strictly adhering to 'Locked Rule 22' by not requiring live VEU product credentials."
    },
    "Q8": {
      "pick": "(a)",
      "rationale": "This choice directly implements the reporting format as specified in §6 of the test plan. While other formats may have benefits, adhering to the written specification is the most direct path to compliance, and OQ-8 itself suggests a JSON exporter could be a 'follow-up' if needed."
    }
  },
  "overall_notes": "The test plan is comprehensive, and its recommendations for hybrid testing (Q3, Q6) and explicit bypass mechanisms (Q1, Q4) are pragmatic and architecturally sound. The suite provides excellent coverage of the surfaces and agents defined in the CANONICAL_REFERENCE."
}
```
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 18821 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": { "pick": "(b)", "rationale": "Using a stealth Playwright profile is the most practical solution as it ensures that the tests can run without triggering bot detection mechanisms, allowing for accurate results without modifying the production environment." },
    "Q2": { "pick": "(a)", "rationale": "A reserved productScope='_test' tenant with auto-cleanup ensures test data isolation and prevents data accumulation, aligning with the need for a clean test environment as per §9 OQ-2." },
    "Q3": { "pick": "(b)", "rationale": "Using the live Stripe sandbox for nominal tests ensures real-world accuracy while mocking other tests to avoid abuse-flagging, as recommended in Sprint PROTECT-1." },
    "Q4": { "pick": "(c)", "rationale": "Since Agent #13 is DORMANT, deferring this decision is appropriate until the agent is shipped, avoiding premature changes as per §9 OQ-4." },
    "Q5": { "pick": "(b)", "rationale": "Recording latency without pass/fail criteria allows for data-driven baseline establishment, aligning with the need for empirical data as per §9 OQ-5." },
    "Q6": { "pick": "(b)", "rationale": "A hybrid approach balances cost and realism, using real Claude for prompt-injection tests and MockClaude for others, following the spec recommendation in §9 OQ-6." },
    "Q7": { "pick": "(b)", "rationale": "Testing RLS + UI rendering without generating live install sprints adheres to Locked Rule 22 and the spec recommendation, ensuring neutral fixtures are used as per §9 OQ-7." },
    "Q8": { "pick": "(a)", "rationale": "Following the spec as written with Markdown + CSV reporting ensures compliance and consistency, as per §6." }
  },
  "overall_notes": "All decisions align with the spec and CANONICAL_REFERENCE, ensuring a balanced approach to testing and compliance."
}
```
```

---

### Slot 5 — openrouter:cohere/command-r-plus-08-2024

- Provider: `openrouter`
- Latency: 32328 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(a)",
      "rationale": "The test suite should be able to run against the production environment without triggering bot detection. Adding a header allowlist on the SUT is a more robust solution than using a stealth profile, as it ensures that the tests can run in a production-like environment without being blocked. It also allows for more flexibility in the future, as the header can be used to allowlist other test runners or tools."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "A dedicated test tenant with auto-cleanup is the best option, as it allows for isolation of test data without the need for a separate database. This approach ensures that the production environment remains clean and that test data is automatically cleaned up after each run, reducing the risk of data accumulation and potential issues."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Using a live Stripe sandbox for nominal cases and mocking for adversarial cases is a good balance between realism and safety. It allows for testing the Stripe integration in a production-like environment while minimizing the risk of abuse-flagging. This approach also ensures that the test suite can cover both nominal and adversarial cases, providing a comprehensive test coverage."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "Allowlisting the test suite is the best option, as it ensures that the tests can run without being blocked by the Self-Protection Agent. This approach is similar to the one used for internal audit, which is a proven and effective method. It also allows for more flexibility in the future, as the allowlist can be updated as needed."
    },
    "Q5": {
      "pick": "(a)",
      "rationale": "Setting p50/p95 defaults now is the best option, as it allows for explicit assertions and provides a clear baseline for performance testing. This approach ensures that the test suite can catch performance regressions and provides a clear metric for success. It also aligns with the SSOT W04-Rev-2 §6, which requires a resolution contract for performance issues."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "Using a hybrid approach with real Claude for prompt-injection adversarial cases and MockClaude for other cases is the best option, as it provides a balance between cost and coverage. This approach ensures that the test suite can catch prompt-injection regressions while keeping costs low. It also aligns with the recommendation in the test plan, which suggests a hybrid approach."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Testing RLS and UI rendering only is the best option, as it allows for testing the Capability Transfer feature without the need for live product credentials. This approach ensures that the test suite can cover the feature without violating the 'neutral fixtures only' rule. It also aligns with the recommendation in the test plan, which suggests testing RLS and UI rendering only."
    },
    "Q8": {
      "pick": "(a)",
      "rationale": "Using Markdown and CSV is the best option, as it aligns with the test plan and provides a good balance between compatibility and simplicity. This approach ensures that the test suite can generate reports in a format that is easy to read and share, while also being compatible with downstream tooling. It also allows for more flexibility in the future, as additional formats can be added as needed."
    }
  },
  "overall_notes": "The test plan is well-structured and comprehensive, covering a wide range of scenarios and surfaces. The open questions are well-defined and provide clear options for addressing potential issues. The recommended options for each question are well-reasoned and aligned with the goals of the test suite."
}
```

---

### Slot 6 — openrouter:qwen/qwen-2.5-72b-instruct

- Provider: `openrouter`
- Latency: 34445 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": { "pick": "(a)", "rationale": "Adding an X-Test-Bypass-Token header aligns with the security measures in Sprint PROTECT-1 Phase 1, ensuring that the test suite can run without triggering bot detection." },
    "Q2": { "pick": "(a)", "rationale": "A reserved productScope='_test' tenant with auto-cleanup provides a clean and isolated environment for testing, ensuring that test data does not interfere with production data." },
    "Q3": { "pick": "(b)", "rationale": "Using the Stripe sandbox for nominal cases and mocking for adversarial cases balances the need for realistic testing with the risk of abuse-flagging the test account." },
    "Q4": { "pick": "(a)", "rationale": "Allowlisting the test suite via the same mechanism that exempts internal audit (Locked Rule E1) ensures that the test suite can run without being blocked by Agent #13 when it ships." },
    "Q5": { "pick": "(a)", "rationale": "Setting p50/p95 defaults now provides clear performance baselines that can be asserted in the test suite, ensuring that the system meets expected latency requirements." },
    "Q6": { "pick": "(b)", "rationale": "The hybrid approach of using real Claude for prompt-injection adversarial tests and MockClaude for other categories balances realism with cost, as recommended in the test plan." },
    "Q7": { "pick": "(b)", "rationale": "Testing RLS and UI rendering only for Capability Transfer aligns with the neutral fixtures only requirement (Locked Rule 22) and ensures that the test scope is manageable." },
    "Q8": { "pick": "(a)", "rationale": "Using Markdown + CSV as specified in the test plan ensures that the reporting format is consistent and aligns with the existing documentation standards." }
  },
  "overall_notes": "The selected options balance security, performance, and cost considerations while ensuring that the test suite is comprehensive and aligned with the project's goals and constraints."
}
```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 78816 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(a)",
      "rationale": "Test plan §9 OQ-1 explicitly lists X-Test-Bypass-Token as a mitigation strategy. This aligns with Sprint PROTECT-1's security architecture while allowing realistic testing against deployed environments."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Test plan §9 OQ-2 recommends a reserved tenant solution. This maintains RLS isolation per Sprint 6 Phase 3 while enabling production-like testing, avoiding dev-only limitations."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Test plan §9 OQ-3 explicitly recommends hybrid approach: sandbox for nominal cases (A4-N1/N2) and mocks for adversarial to prevent abuse-flagging while maintaining realism."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "Test plan §9 OQ-4 cites Locked Rule E1 for internal audit exemptions. This provides future-proofing without disabling critical functionality when Agent #13 ships."
    },
    "Q5": {
      "pick": "(a)",
      "rationale": "Test plan §5.1 requires latency assertions. Setting initial budgets enables immediate verification of Rev-2 §6 commitments while allowing empirical refinement later."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "Test plan §9 OQ-6 explicitly recommends hybrid approach. This balances cost containment ($110-290/year) with critical prompt-injection coverage for adversarial cases."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Test plan §9 OQ-7 recommendation cites Locked Rule 22 (neutral fixtures). Testing RLS/UI without live generation maintains scope compliance while validating key security surfaces."
    },
    "Q8": {
      "pick": "(a)",
      "rationale": "Test plan §6 mandates CSV+Markdown format. The spec explicitly states JSON should be a follow-up if needed, preserving current engineering priorities."
    }
  },
  "overall_notes": ""
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 17156 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 7,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(a)",
      "rationale": "X-Test-Bypass-Token allowlist is the most operationally sound approach. Sprint PROTECT-1 Phase 1 (§1, PROTECT-1 section) added bot detection as a security hardening measure; a test-specific bypass token preserves that hardening while enabling the adversarial suite to run against the deployed Vercel URL without false positives. This aligns with the resolution contract (Rev-2 §6) requiring findings to be tamper-evident and auditable on the canonical SUT."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Reserved productScope='_test' tenant with auto-cleanup is the cleanest isolation model. The CANONICAL_REFERENCE (§1, Sprint 7.5a) establishes role-based RLS as the foundational access control; a dedicated _test tenant leverages that same RLS boundary. Auto-cleanup via nightly TRUNCATE keeps the test surface deterministic and prevents row accumulation from skewing subsequent runs."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Sandbox for nominal only (A4-N1/N2) with mock for adversarial/edge/malformed is the recommended hybrid per §9 OQ-3. Agent #4 Provider Onboarding (§3.4, HARD-1 section) is SHIPPED-GREEN; nominal Stripe sandbox calls validate the real integration path without abuse-flag risk, while mocking adversarial cases (injection, oversized payloads) avoids provider-level friction."
    },
    "Q4": {
      "pick": "(c)",
      "rationale": "Agent #13 Self-Protection is DORMANT (CANONICAL_REFERENCE §2, 'Agent #6 Research has a content-insufficient block semantic... but no class file — counts as partially wired, not shipped-green'). Deferring this decision until #13 graduation is dispatched is the pragmatic choice; revisit when #13 becomes active and the conflict becomes real."
    },
    "Q5": {
      "pick": "(a)",
      "rationale": "Set p50/p95 defaults now with explicit per-endpoint budgets. The test plan §5.1 already references 'latency within budget' as a pass criterion; baking in concrete targets (e.g., p95<2s for /api/orchestrator/run per §7.4 runtime budget) makes the suite immediately actionable and prevents latency regressions from shipping undetected. This operationalises the Self-Governance Layer (Sprint 5, CANONICAL_REFERENCE §1) four Human Gates concept."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "Hybrid approach (real Claude for prompt-injection adversarial only; MockClaude for malformed/edge/nominal) is the spec recommendation (§9 OQ-6). This balances realism ($110–$290/year cost is acceptable for nightly cadence) with determinism; prompt-injection coverage is the highest-risk category and deserves real LLM validation per the resolution contract (Rev-2 §6, critical findings block merge)."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Test RLS + UI rendering only, per spec recommendation and Locked Rule 22 ('no live VEU product crawl, uses neutral fixtures only'). Capability Transfer (HARD-1 section, /capability-transfer route) is a UI surface that must be tested for auth/RLS correctness, but generating live install sprints with mock credentials violates the neutral-fixtures constraint and introduces external dependency risk."
    },
    "Q8": {
      "pick": "(c)",
      "rationale": "Ship all three formats (Markdown + CSV + JSON). The spec §6 mandates Markdown + CSV; adding JSON exporter at the same time maximizes downstream tooling compatibility (some systems prefer JSON for programmatic ingestion) without additional engineering burden. GovernanceAuditLog (Rev-2 §14, HARD-1 section) already stores findings as structured records; JSON export is a natural extension."
    }
  },
  "overall_notes": "All eight questions are operationally grounded in the CANONICAL_REFERENCE sprint history and Rev-2 SSOT commitments. The hybrid approach (real LLM for high-risk, mock for determinism; test-specific bypass tokens; dedicated _test tenant) balances security hardening with test pragmatism. No questions required null picks; all rationales cite specific sections, sprints, or locked rules."
}
```
```

---

### Slot 9 [BACKUP applied] — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 19177 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:qwen/qwen-2.5-coder-32b-instruct` (error: openrouter 400: {"error":{"message":"Provider returned error","code":400,"metadata":{"raw":"{\"errors\":[{\"message\":\"AiError: AiError: This model's maximum context length is 32768 tokens. However, you requested 34)

```
```json
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": { "pick": "(b)", "rationale": "Using a stealth Playwright profile ensures that the tests are realistic and do not bypass the actual security measures in place, providing a more accurate assessment of the system's resilience against bot detection mechanisms as outlined in §9 OQ-1." },
    "Q2": { "pick": "(a)", "rationale": "A reserved productScope='_test' tenant with auto-cleanup aligns with the need for test data isolation and ensures that tests do not interfere with production data, as specified in §9 OQ-2." },
    "Q3": { "pick": "(b)", "rationale": "Using the live Stripe sandbox for nominal tests while mocking other scenarios prevents abuse-flagging and ensures realistic testing for nominal cases, adhering to the guidelines in §9 OQ-3." },
    "Q4": { "pick": "(c)", "rationale": "Deferring the decision until Agent #13 is shipped avoids premature decisions and ensures that the test suite remains aligned with the current state of the system, as mentioned in §9 OQ-4." },
    "Q5": { "pick": "(b)", "rationale": "Recording latency without pass/fail criteria allows for the collection of baseline data without imposing arbitrary performance thresholds, which can be set later based on empirical data, as suggested in §9 OQ-5." },
    "Q6": { "pick": "(b)", "rationale": "A hybrid approach using real Claude for prompt-injection tests and MockClaude for other categories balances cost and realism, ensuring comprehensive coverage without excessive expenditure, as recommended in §9 OQ-6." },
    "Q7": { "pick": "(b)", "rationale": "Testing RLS and UI rendering without generating live install sprints adheres to Locked Rule 22 and ensures that the tests remain within the scope of neutral fixtures, as per §9 OQ-7." },
    "Q8": { "pick": "(a)", "rationale": "Using Markdown and CSV for reporting aligns with the current specification in §6 and ensures compatibility with existing downstream tooling." }
  },
  "overall_notes": ""
}
```
```

---

### Slot 10 — openrouter:openai/gpt-4o

- Provider: `openrouter`
- Latency: 5277 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(a)",
      "rationale": "Adding an X-Test-Bypass-Token header allowlist on the SUT ensures that Playwright tests can run without triggering bot detection, aligning with the security measures in Sprint PROTECT-1 Phase 1."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Using a reserved productScope='_test' tenant with auto-cleanup allows for isolated test data management, preventing accumulation and ensuring clean test runs, as suggested in §9 OQ-2."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Using the Stripe sandbox for nominal tests and mocking for adversarial cases balances realism with risk management, as recommended in §9 OQ-3."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "Allowlisting the test suite via the same mechanism that exempts internal audit ensures compatibility with Agent #13 once it ships, per Locked Rule E1."
    },
    "Q5": {
      "pick": "(b)",
      "rationale": "Recording latency without pass/fail assertions allows baselines to emerge from data, which is practical given the lack of established SLAs, as noted in §9 OQ-5."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "A hybrid approach using real Claude for prompt-injection adversarial tests and MockClaude for others provides a balance between cost and realism, as recommended in §9 OQ-6."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Testing RLS and UI rendering without generating live install sprints adheres to Locked Rule 22, focusing on neutral fixtures only, as recommended in §9 OQ-7."
    },
    "Q8": {
      "pick": "(a)",
      "rationale": "Using Markdown and CSV for reporting aligns with the current specification in §6, ensuring compatibility with existing processes."
    }
  },
  "overall_notes": "The recommendations focus on balancing realism, security, and cost-effectiveness while adhering to Locked Rules and current specifications."
}
```
