# Panel Consultation — FlowAI Self-Adversarial Test Plan Dispositions (2026-05-14, 4-option re-run)

**Lineage:** W04 dispatch → W6 execution. 4-option re-run with rebalanced Panel composition (≤2/provider, 8 distinct providers). Spec: `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9 (commit `b06e901`).

**Mode:** read-only Panel consultation. 8 multiple-choice questions, 4 options each + `INSUFFICIENT_INFORMATION` valid abstention. Engineering accepts supermajority (≥8/10 ENGAGED) verbatim.

**Started:** 2026-05-14T20:53:36.103Z
**Finished:** 2026-05-14T20:55:38.008Z
**Bundle size:** 93420 chars (full CANONICAL_REFERENCE.md + test plan attached, per Rev-2 §11 / §19 Panel SSOT Access Rules).
**Panel composition audit:** {"providerCounts":{"openai":2,"anthropic":1,"google":1,"mistralai":1,"cohere":1,"qwen":2,"deepseek":1,"perplexity":1},"maxPerProvider":2,"slots":10} — providers ≤2 each, 10 slots, 8 distinct providers.

**W6 thresholds:** Quorum = 7 of 10 · Supermajority = 8 of 10 · Unanimous = 10 of 10.

---

## Slot status (rebalanced composition)

| Slot | Provider | Model | Region/Role | Backup adapter | Status | Backup fired? | Latency (ms) | Error |
|------|----------|-------|-------------|----------------|--------|---------------|--------------|-------|
| 1 | openrouter | `openai/gpt-5` | US · frontier reasoning | `openrouter:anthropic/claude-opus-4` | LIVE-OK | — | 42999 |  |
| 2 | openrouter | `anthropic/claude-opus-4` | US · reasoning | `openrouter:openai/gpt-5` | DEGRADED | — | 1033 | openrouter 402: {"error":{"message":"This request requires more credits, or fewer max_tokens. You re |
| 3 | openrouter | `google/gemini-2.5-pro` | US · frontier multimodal | `openrouter:mistralai/mistral-large-2411` | LIVE-OK | — | 69270 |  |
| 4 | openrouter | `mistralai/mistral-large-2411` | Europe · European frontier | `openrouter:cohere/command-r-plus-08-2024` | LIVE-OK | — | 21838 |  |
| 5 | openrouter | `cohere/command-r-plus-08-2024` | Europe/CA · European RAG-tuned | `openrouter:mistralai/mistral-large-2411` | LIVE-OK | — | 33042 |  |
| 6 | openrouter | `qwen/qwen-2.5-72b-instruct` | Asia · Asia generalist | `openrouter:deepseek/deepseek-r1` | LIVE-OK | — | 25800 |  |
| 7 | openrouter | `deepseek/deepseek-r1` | Asia · Asia reasoning | `openrouter:qwen/qwen-2.5-72b-instruct` | LIVE-OK | — | 93066 |  |
| 8 | openrouter | `perplexity/sonar` | US web-grounded · web-grounded research | `openrouter:google/gemini-2.5-pro` | LIVE-OK | — | 22592 |  |
| 9 | openrouter | `mistralai/mistral-large-2411` | Asia/dev · developer/builder AI | `openrouter:mistralai/mistral-large-2411` | LIVE-OK | YES (openrouter:openrouter:qwen/qwen-2.5-coder-32b-instruct → openrouter:openrouter:mistralai/mistral-large-2411) | 28334 |  |
| 10 | openrouter | `openai/gpt-4o` | US · fast generalist | `openrouter:anthropic/claude-opus-4` | LIVE-OK | — | 6213 |  |

LIVE-OK: 9/10. Backups applied: 1. Quorum met (>=7 LIVE-OK): true. Supermajority achievable (>=8 LIVE-OK): true.

Engagement: **ENGAGED=8** · TANGENTIAL=1 · SILENT=1 · EVASIVE=0 (of 10 slots). `INSUFFICIENT_INFORMATION` responses across all reviewers: **0**.

---

## Tally + verdicts (ENGAGED-only)

| Q | Topic | (a) | (b) | (c) | (d) | INSUFF | other | Top | Verdict |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| **Q1** | WAF bypass strategy for Playwright tests | 2 | 0 | 0 | 6 | 0 | 0 | `(d)` | `PLURALITY_(d)` |
| **Q2** | Test data isolation strategy (Agents #4/#5 create rows) | 8 | 0 | 0 | 0 | 0 | 0 | `(a)` | `UNANIMOUS_(a)` |
| **Q3** | Stripe Connect adversarial scope | 0 | 8 | 0 | 0 | 0 | 0 | `(b)` | `UNANIMOUS_(b)` |
| **Q4** | Self-Protection Agent #13 conflict (when #13 ships) | 7 | 0 | 1 | 0 | 0 | 0 | `(a)` | `QUORUM_PLURALITY_(a)` |
| **Q5** | Performance baselines (p50/p95 not yet canonical) | 3 | 5 | 0 | 0 | 0 | 0 | `(b)` | `PLURALITY_(b)` |
| **Q6** | Real LLM calls vs MockClaude for adversarial tests | 0 | 8 | 0 | 0 | 0 | 0 | `(b)` | `UNANIMOUS_(b)` |
| **Q7** | Capability Transfer install-sprint testing (vs Locked Rule 22 "neutral fixtures only") | 0 | 8 | 0 | 0 | 0 | 0 | `(b)` | `UNANIMOUS_(b)` |
| **Q8** | Reporting format for ~436 test results | 3 | 3 | 2 | 0 | 0 | 0 | `(a)` | `SPLIT` |

---

## Highest-conviction questions (UNANIMOUS / SUPERMAJORITY — CEO confirmation only)

- **Q2** (§9 OQ-2) — `UNANIMOUS_(a)` · winning option `(a)`: Reserved productScope='_test' tenant with auto-cleanup after each run
- **Q3** (§9 OQ-3) — `UNANIMOUS_(b)` · winning option `(b)`: Stripe sandbox for nominal cases only; mock for adversarial
- **Q6** (§9 OQ-6) — `UNANIMOUS_(b)` · winning option `(b)`: Hybrid: MockClaude for malformed/edge; real Claude for prompt-injection cases only
- **Q7** (§9 OQ-7) — `UNANIMOUS_(b)` · winning option `(b)`: Test only RLS + UI rendering (no live install)

## Lower-conviction questions (SPLIT / PLURALITY / NO_QUORUM — CEO arbitration required)

- **Q1** (§9 OQ-1) — `PLURALITY_(d)` — 6 of 8 ENGAGED on (d) (below 7/10 quorum)
- **Q4** (§9 OQ-4) — `QUORUM_PLURALITY_(a)` — 7 of 8 ENGAGED on (a) (≥ 7/10 quorum, < 8/10 supermajority)
- **Q5** (§9 OQ-5) — `PLURALITY_(b)` — 5 of 8 ENGAGED on (b) (below 7/10 quorum)
- **Q8** (§9 OQ-8) — `SPLIT` — top tie at 3 between (a) / (b)

---

## Per-question detail

### Q1 — WAF bypass strategy for Playwright tests (§9 OQ-1)

- (a) Add X-Test-Bypass-Token header allowlist mechanism
- (b) Use stealth Playwright profile (fingerprint randomization)
- (c) Test against dev SUT only (no production traffic)
- (d) Combination of (a) for prod + (c) for high-risk adversarial

**Verdict:** `PLURALITY_(d)` — 6 of 8 ENGAGED on (d) (below 7/10 quorum).

### Q2 — Test data isolation strategy (Agents #4/#5 create rows) (§9 OQ-2)

- (a) Reserved productScope='_test' tenant with auto-cleanup after each run
- (b) Restrict entire suite to dev SUT only
- (c) Separate test database (independent Supabase project)
- (d) Time-windowed test rows (auto-delete >24h old)

**Verdict:** `UNANIMOUS_(a)` — 8 of 8 ENGAGED on (a) (unanimous).

### Q3 — Stripe Connect adversarial scope (§9 OQ-3)

- (a) Mock Stripe everywhere (no real API calls)
- (b) Stripe sandbox for nominal cases only; mock for adversarial
- (c) Skip all Stripe tests in this run; defer to dedicated Stripe test suite
- (d) Sandbox for everything

**Verdict:** `UNANIMOUS_(b)` — 8 of 8 ENGAGED on (b) (unanimous).

### Q4 — Self-Protection Agent #13 conflict (when #13 ships) (§9 OQ-4)

- (a) Allowlist test suite by signed identifier
- (b) Disable #13 during test runs
- (c) Not blocking — #13 is dormant; defer until activation
- (d) Run suite in maintenance window

**Verdict:** `QUORUM_PLURALITY_(a)` — 7 of 8 ENGAGED on (a) (≥ 7/10 quorum, < 8/10 supermajority).

### Q5 — Performance baselines (p50/p95 not yet canonical) (§9 OQ-5)

- (a) Set default targets now: p50 < 1s, p95 < 3s for API; p50 < 2s, p95 < 5s for page-load
- (b) Record-only, no pass/fail until production traffic gives baseline
- (c) Defer perf testing entirely until separate perf-test dispatch
- (d) Use SSOT §16 Live Monitor existing thresholds if any

**Verdict:** `PLURALITY_(b)` — 5 of 8 ENGAGED on (b) (below 7/10 quorum).

### Q6 — Real LLM calls vs MockClaude for adversarial tests (§9 OQ-6)

- (a) MockClaude everywhere — zero LLM cost
- (b) Hybrid: MockClaude for malformed/edge; real Claude for prompt-injection cases only
- (c) Real Claude everywhere — highest fidelity, highest cost
- (d) Real Claude for first run only (baseline); MockClaude for nightly cadence

**Verdict:** `UNANIMOUS_(b)` — 8 of 8 ENGAGED on (b) (unanimous).

### Q7 — Capability Transfer install-sprint testing (vs Locked Rule 22 "neutral fixtures only") (§9 OQ-7)

- (a) Skip Capability Transfer tests entirely
- (b) Test only RLS + UI rendering (no live install)
- (c) Use synthetic mock credentials with full install simulation
- (d) Defer until SSOT §22 amendment cycle

**Verdict:** `UNANIMOUS_(b)` — 8 of 8 ENGAGED on (b) (unanimous).

### Q8 — Reporting format for ~436 test results (§9 OQ-8)

- (a) Markdown + CSV (per current plan §6)
- (b) Markdown + JSON (better for tooling integration)
- (c) All three (Markdown + CSV + JSON)
- (d) JSON only with a generator for the other two on demand

**Verdict:** `SPLIT` — top tie at 3 between (a) / (b).


---

## Conflicts with canonical SSOT (flagged by reviewers)

- Slot 8: Q1(d) + Q4(a) assume X-Test-Bypass-Token mechanism exists; Rev-2 §20 Sprint PROTECT-1 Phase 1 mentions bot detection but does not canonically define a test-bypass header. Engineering decision required before implementation.
- Slot 8: Q5(b) defers perf baselines; Rev-2 §16 Readiness Checker scores 6 dimensions (0–10 each) but does not pin latency thresholds. Conflicts with implicit assumption that 'latency within budget' (§7.1) is measurable without canonical targets.

---

## Per-reviewer picks + rationales

**Slot 1** [ENGAGED] — openrouter:openai/gpt-5

- **Q1** = `(d)`
  > Test Plan §9 OQ-1 lists allowlisting via a test header or stealth, and SSOT §20 (Sprint PROTECT-1) confirms bot detection is active. Use an X-Test-Bypass-Token for prod to avoid false positives, and run high-risk adversarial cases against the dev SUT per §7.5 CI constraints.
- **Q2** = `(a)`
  > Test Plan §9 OQ-2 flags row-creation by Agents #4/#5; a reserved productScope='_test' tenant with auto-cleanup aligns with SSOT §3 metadata-driven architecture and §22 Product-Agnostic Rule. RLS isolation per SSOT §14.3 further confines test data.
- **Q3** = `(b)`
  > Per Test Plan §9 OQ-3 and SSOT §15 (Agent #4 Provider Onboarding), use Stripe sandbox for nominal flows and mock for adversarial payloads to avoid abuse flags while still covering risk cases.
- **Q4** = `(a)`
  > Test Plan §9 OQ-4 recommends allowlisting the adversarial suite once Agent #13 activates; SSOT §20/§20.1 distinguishes embedded defenses from Agent #13 orchestration. A signed identifier allowlist preserves protections without disabling the agent.
- **Q5** = `(b)`
  > Test Plan §9 OQ-5 notes p50/p95 targets are not canonical; SSOT §16.4 Live Monitor defines cadence but not thresholds. Record-only establishes baselines before enforcing pass/fail gates.
- **Q6** = `(b)`
  > Hybrid matches Test Plan §9 OQ-6: MockClaude for malformed/edge, real Claude for prompt-injection. This focuses real calls where they matter (prompt-injection is escalated to critical per Test Plan §8) while respecting SSOT Locked Rule 8 (LLM model standard).
- **Q7** = `(b)`
  > Test Plan §9 OQ-7 advises limiting to RLS + UI checks for `/capability-transfer`; full installs would violate the 'neutral fixtures only' stance. SSOT §4 (L4 Capability Transfer) and §22 Product-Agnostic Rule support testing the surface without touching real tenants.
- **Q8** = `(a)`
  > The plan’s Reporting Format (§6) specifies Markdown + CSV. Adopting that now keeps the suite aligned with the authored spec; JSON can be added later without blocking.

Overall notes: Note: the Test Plan references 'Locked Rule 22' for neutral fixtures; in SSOT this is §22 Product-Agnostic Rule, not a locked rule number.

---

**Slot 2** [SILENT] — openrouter:anthropic/claude-opus-4

> _(degraded / parse-failure / no engagement)_

---

**Slot 3** [ENGAGED] — openrouter:google/gemini-2.5-pro

- **Q1** = `(a)`
  > An explicit bypass token is a secure, auditable, and reliable mechanism that aligns with the governance principles of the SSOT, such as the GovernanceAuditLog (§14). This approach is superior to a brittle stealth profile and allows for testing the production-like SUT as intended by the test plan (§7.1), unlike a dev-only strategy.
- **Q2** = `(a)`
  > Using a reserved `productScope='_test'` with auto-cleanup is the most architecturally consistent solution, as it leverages the core metadata-driven tenancy model described in SSOT §3 and §22. This avoids the heavy lift of a separate database and provides better isolation than time-windowed deletion or restricting tests to a dev-only environment.
- **Q3** = `(b)`
  > The hybrid approach, recommended in the test plan's OQ-3, correctly balances risk and test fidelity. It verifies the nominal path against the Stripe sandbox while using mocks to safely simulate adversarial conditions, thus testing our system's resilience without risking the test account.
- **Q4** = `(a)`
  > Allowlisting the test suite via a signed identifier is the correct long-term strategy, as it allows the security agent to remain active while recognizing a legitimate audit function. This avoids violating Locked Rule 14, which prohibits maintenance windows, and is a more robust practice than disabling security controls during tests.
- **Q5** = `(b)`
  > The test plan's OQ-5 correctly notes that performance targets are not yet canonical, and SSOT §16.4 does not specify concrete thresholds. Therefore, the most prudent action is to implement record-only performance tracking to establish a data-driven baseline from which official targets can be derived in a future SSOT amendment.
- **Q6** = `(b)`
  > The hybrid approach is the most cost-effective and pragmatic solution, as explicitly recommended in the test plan's OQ-6. It reserves expensive, high-fidelity real LLM calls for testing critical adversarial cases like prompt injection (e.g., A2-X1), while using free, deterministic mocks for the bulk of nominal and malformed input tests.
- **Q7** = `(b)`
  > This option correctly respects the hard constraint of Locked Rule 22 ("neutral fixtures only") while still providing meaningful test coverage. It allows for testing the `/capability-transfer` UI and its critical RLS access control policies without attempting a live install sprint that would require out-of-scope live product credentials, as noted in OQ-7.
- **Q8** = `(b)`
  > Adopting Markdown for human readability and JSON for machine consumption is a robust, future-proof choice. As noted in OQ-8, JSON is better for tooling, and the test plan's requirement (§6) to write findings to the GovernanceAuditLog (SSOT §14) already implies the need for a structured format like JSON.

Overall notes: The test plan is comprehensive and well-aligned with the SSOT. The proposed dispositions aim to resolve the open questions in a pragmatic and architecturally sound manner, respecting all Locked Rules.

---

**Slot 4** [ENGAGED] — openrouter:mistralai/mistral-large-2411

- **Q1** = `(d)`
  > Combining both strategies ensures comprehensive coverage while minimizing security risks. The use of X-Test-Bypass-Token for production allows for realistic testing, while restricting high-risk adversarial tests to the dev SUT mitigates potential security issues (§9 OQ-1).
- **Q2** = `(a)`
  > A reserved productScope='_test' tenant with auto-cleanup ensures data isolation without the complexity of managing a separate test database or the limitations of restricting the suite to the dev SUT (§9 OQ-2).
- **Q3** = `(b)`
  > Using Stripe sandbox for nominal cases ensures realism, while mocking for adversarial cases avoids potential abuse-flagging, aligning with security best practices (§9 OQ-3).
- **Q4** = `(c)`
  > Since Agent #13 is dormant, deferring the resolution until its activation avoids premature decisions and aligns with the current operational status (§9 OQ-4).
- **Q5** = `(a)`
  > Setting default performance targets now provides a clear baseline for future optimizations and aligns with the need for quantified SLAs (§9 OQ-5, §26).
- **Q6** = `(b)`
  > A hybrid approach balances cost and fidelity, using real Claude for critical prompt-injection cases while MockClaude handles less sensitive scenarios, optimizing resource usage (§9 OQ-6).
- **Q7** = `(b)`
  > Testing only RLS + UI rendering ensures compliance with Locked Rule 22 while providing necessary validation without requiring live install sprints (§9 OQ-7, §22).
- **Q8** = `(b)`
  > Markdown + JSON reporting format enhances tooling integration while maintaining human-readable documentation, providing a balanced solution (§9 OQ-8).

---

**Slot 5** [ENGAGED] — openrouter:cohere/command-r-plus-08-2024

- **Q1** = `(a)`
  > The test plan (§9 OQ-1) suggests adding an X-Test-Bypass-Token header allowlist mechanism, which is a valid approach to ensure that the Playwright tests are not blocked by the WAF. This option is also mentioned in the SSOT §16 Live Monitor section, which discusses the need for a bypass mechanism for known test runners.
- **Q2** = `(a)`
  > The test plan (§9 OQ-2) recommends using a reserved productScope='_test' tenant with auto-cleanup after each run. This approach ensures that the test data is isolated and does not interfere with the production data. It also allows for efficient cleanup after each test run, which is important for maintaining the integrity of the test environment.
- **Q3** = `(b)`
  > The test plan (§9 OQ-3) suggests using the Stripe sandbox for nominal cases and mocking for adversarial cases. This approach ensures that the test suite does not make real API calls to the Stripe production environment, which could potentially lead to abuse-flagging of the test account. It also allows for more control over the test environment and better isolation of the test data.
- **Q4** = `(a)`
  > The test plan (§9 OQ-4) suggests allowlisting the test suite by signed identifier, which is a valid approach to ensure that the Self-Protection Agent #13 does not block the test suite. This option is also mentioned in the SSOT §16 Live Monitor section, which discusses the need for a bypass mechanism for known test runners.
- **Q5** = `(a)`
  > The test plan (§9 OQ-5) recommends setting default targets for p50 and p95, which is a valid approach to ensure that the performance of the system is monitored and optimized. This option is also mentioned in the SSOT §16 Live Monitor section, which discusses the need for performance monitoring and optimization.
- **Q6** = `(b)`
  > The test plan (§9 OQ-6) suggests using a hybrid approach, with MockClaude for malformed/edge cases and real Claude for prompt-injection cases. This approach ensures that the test suite covers both nominal and adversarial scenarios, while also minimizing the cost of LLM calls. It is a reasonable compromise between fidelity and cost.
- **Q7** = `(b)`
  > The test plan (§9 OQ-7) suggests testing only RLS and UI rendering, without live install. This approach ensures that the test suite covers the critical aspects of the Capability Transfer process, while also adhering to the Locked Rule 22 "neutral fixtures only" principle. It is a valid approach to ensure that the test suite is comprehensive and compliant with the SSOT.
- **Q8** = `(a)`
  > The test plan (§6) specifies Markdown and CSV as the reporting formats, which is a valid approach to ensure that the test results are presented in a human-readable and machine-readable format. This option is also mentioned in the SSOT §14 GovernanceAuditLog section, which discusses the need for tamper-evident retention of test results.

Overall notes: The test plan and SSOT provide sufficient information to answer all questions with confidence. The selected options are well-supported by the provided evidence and align with the overall goals of the test suite.

---

**Slot 6** [TANGENTIAL] — openrouter:qwen/qwen-2.5-72b-instruct

- **Q1** = `(d)`
  > Combining (a) and (c) ensures that the test suite can run against both production and development environments, with a bypass token for production to avoid false positives from bot detection.
- **Q2** = `(a)`
  > A reserved '_test' tenant with auto-cleanup is the most controlled and isolated approach, ensuring that test data does not interfere with production data.
- **Q3** = `(b)`
  > Using the Stripe sandbox for nominal cases and mocking for adversarial cases balances realism and safety, avoiding potential abuse flags from Stripe.
- **Q4** = `(a)`
  > Allowlisting the test suite by a signed identifier is the most secure and non-disruptive method to ensure the suite can run without being blocked by Agent #13.
- **Q5** = `(a)`
  > Setting default performance targets now provides a clear baseline for the test suite, aligning with the need for latency within budget as specified in §5.1.
- **Q6** = `(b)`
  > A hybrid approach using MockClaude for malformed/edge cases and real Claude for prompt-injection cases balances cost and fidelity, ensuring realistic testing without excessive expense.
- **Q7** = `(b)`
  > Testing only RLS and UI rendering for Capability Transfer aligns with the Locked Rule 22 requirement for neutral fixtures, ensuring that the test suite remains within scope.
- **Q8** = `(a)`
  > Markdown and CSV formats, as specified in §6, provide a clear and structured way to report test results, aligning with the current plan and ensuring compatibility with existing tooling.

Overall notes: All answers are aligned with the canonical SSOT and the test plan, ensuring a robust and secure adversarial testing strategy.

---

**Slot 7** [ENGAGED] — openrouter:deepseek/deepseek-r1

- **Q1** = `(d)`
  > Combination strategy aligns with §9 OQ-1 mitigation options and SSOT §20.1 embedded defenses. Prod requires tokenized bypass while dev isolation handles high-risk cases without compromising security posture.
- **Q2** = `(a)`
  > Reserved '_test' tenant satisfies SSOT §22 Product-Agnostic Rule through metadata-driven isolation. Auto-cleanup ensures test hygiene without violating RLS principles per §13.
- **Q3** = `(b)`
  > Hybrid approach balances fidelity and safety per §9 OQ-3 recommendation. Mocking adversarial cases prevents sandbox abuse-flagging while nominal sandbox calls validate integration as per Agent #4 charter.
- **Q4** = `(a)`
  > Allowlisting aligns with Locked Rule E1 exemption for internal audit workflows. SSOT §15.1 notes Agent #13 is dormant, but preemptive allowlisting maintains test integrity upon activation without maintenance windows.
- **Q5** = `(b)`
  > Record-only approach defers targets until production baselines exist, per §9 OQ-5 CEO disposition requirement. SSOT §16.4 Live Monitor lacks canonical thresholds, making pass/fail judgments premature.
- **Q6** = `(b)`
  > Hybrid strategy follows §9 OQ-6 explicit recommendation. Real calls for prompt-injection cases validate adversarial defenses while mock handles edge cases, balancing cost and fidelity as per Orchestra spec §7.
- **Q7** = `(b)`
  > Testing only RLS/UI rendering respects Locked Rule 22 neutral-fixture mandate in test plan scope. Full installs require product credentials violating §22, making (c) nonviable per SSOT metadata isolation principle.
- **Q8** = `(c)`
  > Supporting all formats satisfies both test plan §6 specification and downstream tooling needs. JSON addition doesn't conflict with existing CSV+Markdown requirement and enhances GovernanceAuditLog (§14) integration.

---

**Slot 8** [ENGAGED] — openrouter:perplexity/sonar

- **Q1** = `(d)`
  > Combination approach aligns with Rev-2 §20 embedded code-level Self-Protection (always-on bot detection) and §15 Agent #13 orchestration layer. Production SUT requires X-Test-Bypass-Token allowlist (per Sprint PROTECT-1 Phase 1 bot detection); high-risk adversarial cases (prompt-injection, auth-bypass per §9 OQ-1 severity escalation) should run against dev SUT to avoid triggering real abuse flags. This satisfies both security (prod protected) and fidelity (adversarial coverage complete).
- **Q2** = `(a)`
  > Reserved `productScope='_test'` tenant with auto-cleanup operationalises Rev-2 §3 metadata-driven architecture (productScope as runtime parameter, never hardcoded). This allows Agents #4/#5 to create test rows without polluting production data, and aligns with Locked Rule 22 (Product-Agnostic Rule) — the test tenant is metadata-only, not code-specific. Auto-cleanup satisfies idempotency for nightly cadence (§7.5).
- **Q3** = `(b)`
  > Hybrid approach balances fidelity and risk. Nominal cases (Agent #4 onboarding happy-path) use Stripe sandbox to validate real integration per §3.4 A4-N1; adversarial cases (injection, oversized payload) mock Stripe to avoid abuse-flagging the test account and triggering rate-limits that would produce false-positive WARN verdicts. Aligns with §9 OQ-3 mitigation guidance and keeps test cost ~$0.30–$0.80 per run (real calls only on nominal path).
- **Q4** = `(a)`
  > Once Agent #13 Self-Protection ships (currently DORMANT per §15 row 13), it will orchestrate portfolio-wide IP protection including scraper blocking. The adversarial suite IS a hostile crawler from #13's perspective. Allowlisting by signed identifier (e.g. `X-Test-Bypass-Token` from Q1, or a dedicated service account) operationalises the same mechanism that exempts internal audit per Locked Rule E1 (referenced in §20.1 reconciliation). This avoids disabling #13 (security regression) or maintenance windows (violates Locked Rule 14).
- **Q5** = `(b)`
  > Rev-2 §26 notes Layer 4 Building Guidance not yet built, and E6 Slot 1 dissent flagged missing quantified SLAs. Recording baselines now without canonical targets risks false-positive failures if targets are later set higher. §7.1 mentions 'latency within budget' but budget is undefined. Record-only mode (capture p50/p95 per endpoint in the adversarial report) feeds into the next CA-n amendment cycle (§18) for canonical SLA definition, per Panel-review threshold (Locked Rule 17).
- **Q6** = `(b)`
  > Hybrid approach maximises regression detection while controlling cost. Malformed/edge cases (§3.1–§3.5 M1/M2/E1/E2) use MockClaude (deterministic, free, catches schema violations). Adversarial prompt-injection cases (A1-X2, A2-X1, A3-X1, A4-X1, A5-X1) use real Claude to detect actual instruction-takeover regressions — these are security-critical per §5.2 severity escalation. Estimated cost ~$0.15–$0.25 per run (only ~10 real calls for injection cases). Aligns with §9 OQ-6 recommendation.
- **Q7** = `(b)`
  > Locked Rule 22 (Product-Agnostic Rule) mandates 'neutral fixtures only' — no live VEU product credentials in tests. Testing RLS + UI rendering of the Capability Transfer generator (§4.5 `/capability-transfer` adversarial cases) validates the metadata-driven surface without requiring live install. Full install-sprint generation for the 5 VEU products belongs in per-product clearance (Rev-2 §11 Clearance Protocol Step 5 Data Export), not in this platform-level suite. Defers to §27 OQ-5 (Capability Transfer completeness check) for future scope.
- **Q8** = `(c)`
  > All three formats serve distinct downstream consumers: Markdown for human review (PR comments, audit trail narrative per §14), CSV for spreadsheet analysis and trend tracking, JSON for CI/CD tooling integration and automated escalation (§7.5 CI gate logic). §6 specifies Markdown + CSV; adding JSON exporter (per §9 OQ-8 note) is low-cost and aligns with Rev-2 §14 GovernanceAuditLog flexibility (topics logged in structured form, multiple serialisation formats acceptable). Supports both human and machine consumers per Locked Rule 5 (multi-AI peer review).

Conflicts flagged with canonical SSOT:
  - Q1(d) + Q4(a) assume X-Test-Bypass-Token mechanism exists; Rev-2 §20 Sprint PROTECT-1 Phase 1 mentions bot detection but does not canonically define a test-bypass header. Engineering decision required before implementation.
  - Q5(b) defers perf baselines; Rev-2 §16 Readiness Checker scores 6 dimensions (0–10 each) but does not pin latency thresholds. Conflicts with implicit assumption that 'latency within budget' (§7.1) is measurable without canonical targets.

Overall notes: All 8 questions answered with specific SSOT citations (§ numbers, sprint names, Locked Rules). Engagement: ENGAGED (all rationales cite at least one canonical item). No INSUFFICIENT_INFORMATION responses — the test plan + SSOT jointly provide sufficient basis for each disposition. Two minor conflicts flagged: test-bypass mechanism and perf baselines require engineering/CEO clarification before test suite construction.

---

**Slot 9** [ENGAGED] — openrouter:mistralai/mistral-large-2411

- **Q1** = `(d)`
  > Combining (a) for production and (c) for high-risk adversarial ensures comprehensive coverage while maintaining security. This approach allows for realistic testing in a production environment while isolating high-risk tests to a controlled setting.
- **Q2** = `(a)`
  > A reserved productScope='_test' tenant with auto-cleanup ensures test data isolation without restricting the test environment to development only, aligning with §9 OQ-2.
- **Q3** = `(b)`
  > Using Stripe sandbox for nominal cases ensures realistic testing while mocking for adversarial cases prevents abuse flagging, as per §9 OQ-3.
- **Q4** = `(a)`
  > Allowlisting the test suite by signed identifier ensures that the adversarial suite can run without being blocked by Agent #13, aligning with §9 OQ-4.
- **Q5** = `(a)`
  > Setting default performance targets now provides a clear baseline for testing, ensuring that performance issues are caught early, as per §9 OQ-5.
- **Q6** = `(b)`
  > A hybrid approach using MockClaude for malformed/edge cases and real Claude for prompt-injection cases balances cost and fidelity, as per §9 OQ-6.
- **Q7** = `(b)`
  > Testing only RLS + UI rendering ensures compliance with Locked Rule 22 while still providing valuable insights into the Capability Transfer process, as per §9 OQ-7.
- **Q8** = `(b)`
  > Markdown + JSON reporting format enhances tooling integration while maintaining human-readable documentation, as per §9 OQ-8.

---

**Slot 10** [ENGAGED] — openrouter:openai/gpt-4o

- **Q1** = `(d)`
  > Combining (a) and (c) allows for production testing with a bypass token and high-risk tests on a dev SUT, aligning with the need for security and thorough testing (§9 OQ-1).
- **Q2** = `(a)`
  > Using a reserved productScope='_test' tenant with auto-cleanup ensures isolation and prevents data accumulation, as discussed in §9 OQ-2.
- **Q3** = `(b)`
  > Using the Stripe sandbox for nominal cases and mocking for adversarial tests balances safety and realism, as per §9 OQ-3.
- **Q4** = `(a)`
  > Allowlisting the test suite by signed identifier ensures that the suite can run without interference from Agent #13, which aligns with the need for controlled testing environments (§9 OQ-4).
- **Q5** = `(b)`
  > Recording performance without pass/fail criteria allows for baseline establishment from real traffic, which is prudent given the lack of canonical baselines (§9 OQ-5).
- **Q6** = `(b)`
  > A hybrid approach using MockClaude for most tests and real Claude for critical prompt-injection cases balances cost and fidelity, as suggested in §9 OQ-6.
- **Q7** = `(b)`
  > Testing only RLS and UI rendering respects Locked Rule 22 while ensuring critical components are tested (§9 OQ-7).
- **Q8** = `(a)`
  > Using Markdown and CSV aligns with the current plan and provides a balance between human readability and data processing needs (§9 OQ-8).

Overall notes: The selected options align with the test plan's goals and constraints, ensuring comprehensive and secure testing.


---

## Raw reviewer responses

### Slot 1 — openrouter:openai/gpt-5

- Provider: `openrouter`
- Latency: 42999 ms
- HTTP status: OK

```
{
  "reviewer_slot": 6,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": { "pick": "(d)", "rationale": "Test Plan §9 OQ-1 lists allowlisting via a test header or stealth, and SSOT §20 (Sprint PROTECT-1) confirms bot detection is active. Use an X-Test-Bypass-Token for prod to avoid false positives, and run high-risk adversarial cases against the dev SUT per §7.5 CI constraints." },
    "Q2": { "pick": "(a)", "rationale": "Test Plan §9 OQ-2 flags row-creation by Agents #4/#5; a reserved productScope='_test' tenant with auto-cleanup aligns with SSOT §3 metadata-driven architecture and §22 Product-Agnostic Rule. RLS isolation per SSOT §14.3 further confines test data." },
    "Q3": { "pick": "(b)", "rationale": "Per Test Plan §9 OQ-3 and SSOT §15 (Agent #4 Provider Onboarding), use Stripe sandbox for nominal flows and mock for adversarial payloads to avoid abuse flags while still covering risk cases." },
    "Q4": { "pick": "(a)", "rationale": "Test Plan §9 OQ-4 recommends allowlisting the adversarial suite once Agent #13 activates; SSOT §20/§20.1 distinguishes embedded defenses from Agent #13 orchestration. A signed identifier allowlist preserves protections without disabling the agent." },
    "Q5": { "pick": "(b)", "rationale": "Test Plan §9 OQ-5 notes p50/p95 targets are not canonical; SSOT §16.4 Live Monitor defines cadence but not thresholds. Record-only establishes baselines before enforcing pass/fail gates." },
    "Q6": { "pick": "(b)", "rationale": "Hybrid matches Test Plan §9 OQ-6: MockClaude for malformed/edge, real Claude for prompt-injection. This focuses real calls where they matter (prompt-injection is escalated to critical per Test Plan §8) while respecting SSOT Locked Rule 8 (LLM model standard)." },
    "Q7": { "pick": "(b)", "rationale": "Test Plan §9 OQ-7 advises limiting to RLS + UI checks for `/capability-transfer`; full installs would violate the 'neutral fixtures only' stance. SSOT §4 (L4 Capability Transfer) and §22 Product-Agnostic Rule support testing the surface without touching real tenants." },
    "Q8": { "pick": "(a)", "rationale": "The plan’s Reporting Format (§6) specifies Markdown + CSV. Adopting that now keeps the suite aligned with the authored spec; JSON can be added later without blocking." }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "Note: the Test Plan references 'Locked Rule 22' for neutral fixtures; in SSOT this is §22 Product-Agnostic Rule, not a locked rule number."
}
```

---

### Slot 2 — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 1033 ms
- HTTP status: DEGRADED
- Error: openrouter 402: {"error":{"message":"This request requires more credits, or fewer max_tokens. You requested up to 32000 tokens, but can only afford 12140. To increase, visit https://openrouter.ai/settings/keys and cr

```
{"error":{"message":"This request requires more credits, or fewer max_tokens. You requested up to 32000 tokens, but can only afford 12140. To increase, visit https://openrouter.ai/settings/keys and create a key with a higher total limit","code":402,"metadata":{"provider_name":null}},"user_id":"user_3DVfQQQAtku9d1VDUCozUxvWIPE"}
```

---

### Slot 3 — openrouter:google/gemini-2.5-pro

- Provider: `openrouter`
- Latency: 69270 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 7,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(a)",
      "rationale": "An explicit bypass token is a secure, auditable, and reliable mechanism that aligns with the governance principles of the SSOT, such as the GovernanceAuditLog (§14). This approach is superior to a brittle stealth profile and allows for testing the production-like SUT as intended by the test plan (§7.1), unlike a dev-only strategy."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Using a reserved `productScope='_test'` with auto-cleanup is the most architecturally consistent solution, as it leverages the core metadata-driven tenancy model described in SSOT §3 and §22. This avoids the heavy lift of a separate database and provides better isolation than time-windowed deletion or restricting tests to a dev-only environment."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "The hybrid approach, recommended in the test plan's OQ-3, correctly balances risk and test fidelity. It verifies the nominal path against the Stripe sandbox while using mocks to safely simulate adversarial conditions, thus testing our system's resilience without risking the test account."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "Allowlisting the test suite via a signed identifier is the correct long-term strategy, as it allows the security agent to remain active while recognizing a legitimate audit function. This avoids violating Locked Rule 14, which prohibits maintenance windows, and is a more robust practice than disabling security controls during tests."
    },
    "Q5": {
      "pick": "(b)",
      "rationale": "The test plan's OQ-5 correctly notes that performance targets are not yet canonical, and SSOT §16.4 does not specify concrete thresholds. Therefore, the most prudent action is to implement record-only performance tracking to establish a data-driven baseline from which official targets can be derived in a future SSOT amendment."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "The hybrid approach is the most cost-effective and pragmatic solution, as explicitly recommended in the test plan's OQ-6. It reserves expensive, high-fidelity real LLM calls for testing critical adversarial cases like prompt injection (e.g., A2-X1), while using free, deterministic mocks for the bulk of nominal and malformed input tests."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "This option correctly respects the hard constraint of Locked Rule 22 (\"neutral fixtures only\") while still providing meaningful test coverage. It allows for testing the `/capability-transfer` UI and its critical RLS access control policies without attempting a live install sprint that would require out-of-scope live product credentials, as noted in OQ-7."
    },
    "Q8": {
      "pick": "(b)",
      "rationale": "Adopting Markdown for human readability and JSON for machine consumption is a robust, future-proof choice. As noted in OQ-8, JSON is better for tooling, and the test plan's requirement (§6) to write findings to the GovernanceAuditLog (SSOT §14) already implies the need for a structured format like JSON."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "The test plan is comprehensive and well-aligned with the SSOT. The proposed dispositions aim to resolve the open questions in a pragmatic and architecturally sound manner, respecting all Locked Rules."
}
```
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 21838 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 5,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(d)",
      "rationale": "Combining both strategies ensures comprehensive coverage while minimizing security risks. The use of X-Test-Bypass-Token for production allows for realistic testing, while restricting high-risk adversarial tests to the dev SUT mitigates potential security issues (§9 OQ-1)."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "A reserved productScope='_test' tenant with auto-cleanup ensures data isolation without the complexity of managing a separate test database or the limitations of restricting the suite to the dev SUT (§9 OQ-2)."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Using Stripe sandbox for nominal cases ensures realism, while mocking for adversarial cases avoids potential abuse-flagging, aligning with security best practices (§9 OQ-3)."
    },
    "Q4": {
      "pick": "(c)",
      "rationale": "Since Agent #13 is dormant, deferring the resolution until its activation avoids premature decisions and aligns with the current operational status (§9 OQ-4)."
    },
    "Q5": {
      "pick": "(a)",
      "rationale": "Setting default performance targets now provides a clear baseline for future optimizations and aligns with the need for quantified SLAs (§9 OQ-5, §26)."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "A hybrid approach balances cost and fidelity, using real Claude for critical prompt-injection cases while MockClaude handles less sensitive scenarios, optimizing resource usage (§9 OQ-6)."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Testing only RLS + UI rendering ensures compliance with Locked Rule 22 while providing necessary validation without requiring live install sprints (§9 OQ-7, §22)."
    },
    "Q8": {
      "pick": "(b)",
      "rationale": "Markdown + JSON reporting format enhances tooling integration while maintaining human-readable documentation, providing a balanced solution (§9 OQ-8)."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": ""
}
```
```

---

### Slot 5 — openrouter:cohere/command-r-plus-08-2024

- Provider: `openrouter`
- Latency: 33042 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(a)",
      "rationale": "The test plan (§9 OQ-1) suggests adding an X-Test-Bypass-Token header allowlist mechanism, which is a valid approach to ensure that the Playwright tests are not blocked by the WAF. This option is also mentioned in the SSOT §16 Live Monitor section, which discusses the need for a bypass mechanism for known test runners."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "The test plan (§9 OQ-2) recommends using a reserved productScope='_test' tenant with auto-cleanup after each run. This approach ensures that the test data is isolated and does not interfere with the production data. It also allows for efficient cleanup after each test run, which is important for maintaining the integrity of the test environment."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "The test plan (§9 OQ-3) suggests using the Stripe sandbox for nominal cases and mocking for adversarial cases. This approach ensures that the test suite does not make real API calls to the Stripe production environment, which could potentially lead to abuse-flagging of the test account. It also allows for more control over the test environment and better isolation of the test data."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "The test plan (§9 OQ-4) suggests allowlisting the test suite by signed identifier, which is a valid approach to ensure that the Self-Protection Agent #13 does not block the test suite. This option is also mentioned in the SSOT §16 Live Monitor section, which discusses the need for a bypass mechanism for known test runners."
    },
    "Q5": {
      "pick": "(a)",
      "rationale": "The test plan (§9 OQ-5) recommends setting default targets for p50 and p95, which is a valid approach to ensure that the performance of the system is monitored and optimized. This option is also mentioned in the SSOT §16 Live Monitor section, which discusses the need for performance monitoring and optimization."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "The test plan (§9 OQ-6) suggests using a hybrid approach, with MockClaude for malformed/edge cases and real Claude for prompt-injection cases. This approach ensures that the test suite covers both nominal and adversarial scenarios, while also minimizing the cost of LLM calls. It is a reasonable compromise between fidelity and cost."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "The test plan (§9 OQ-7) suggests testing only RLS and UI rendering, without live install. This approach ensures that the test suite covers the critical aspects of the Capability Transfer process, while also adhering to the Locked Rule 22 \"neutral fixtures only\" principle. It is a valid approach to ensure that the test suite is comprehensive and compliant with the SSOT."
    },
    "Q8": {
      "pick": "(a)",
      "rationale": "The test plan (§6) specifies Markdown and CSV as the reporting formats, which is a valid approach to ensure that the test results are presented in a human-readable and machine-readable format. This option is also mentioned in the SSOT §14 GovernanceAuditLog section, which discusses the need for tamper-evident retention of test results."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "The test plan and SSOT provide sufficient information to answer all questions with confidence. The selected options are well-supported by the provided evidence and align with the overall goals of the test suite."
}
```

---

### Slot 6 — openrouter:qwen/qwen-2.5-72b-instruct

- Provider: `openrouter`
- Latency: 25800 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": { "pick": "(d)", "rationale": "Combining (a) and (c) ensures that the test suite can run against both production and development environments, with a bypass token for production to avoid false positives from bot detection." },
    "Q2": { "pick": "(a)", "rationale": "A reserved '_test' tenant with auto-cleanup is the most controlled and isolated approach, ensuring that test data does not interfere with production data." },
    "Q3": { "pick": "(b)", "rationale": "Using the Stripe sandbox for nominal cases and mocking for adversarial cases balances realism and safety, avoiding potential abuse flags from Stripe." },
    "Q4": { "pick": "(a)", "rationale": "Allowlisting the test suite by a signed identifier is the most secure and non-disruptive method to ensure the suite can run without being blocked by Agent #13." },
    "Q5": { "pick": "(a)", "rationale": "Setting default performance targets now provides a clear baseline for the test suite, aligning with the need for latency within budget as specified in §5.1." },
    "Q6": { "pick": "(b)", "rationale": "A hybrid approach using MockClaude for malformed/edge cases and real Claude for prompt-injection cases balances cost and fidelity, ensuring realistic testing without excessive expense." },
    "Q7": { "pick": "(b)", "rationale": "Testing only RLS and UI rendering for Capability Transfer aligns with the Locked Rule 22 requirement for neutral fixtures, ensuring that the test suite remains within scope." },
    "Q8": { "pick": "(a)", "rationale": "Markdown and CSV formats, as specified in §6, provide a clear and structured way to report test results, aligning with the current plan and ensuring compatibility with existing tooling." }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "All answers are aligned with the canonical SSOT and the test plan, ensuring a robust and secure adversarial testing strategy."
}
```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 93066 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(d)",
      "rationale": "Combination strategy aligns with §9 OQ-1 mitigation options and SSOT §20.1 embedded defenses. Prod requires tokenized bypass while dev isolation handles high-risk cases without compromising security posture."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Reserved '_test' tenant satisfies SSOT §22 Product-Agnostic Rule through metadata-driven isolation. Auto-cleanup ensures test hygiene without violating RLS principles per §13."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Hybrid approach balances fidelity and safety per §9 OQ-3 recommendation. Mocking adversarial cases prevents sandbox abuse-flagging while nominal sandbox calls validate integration as per Agent #4 charter."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "Allowlisting aligns with Locked Rule E1 exemption for internal audit workflows. SSOT §15.1 notes Agent #13 is dormant, but preemptive allowlisting maintains test integrity upon activation without maintenance windows."
    },
    "Q5": {
      "pick": "(b)",
      "rationale": "Record-only approach defers targets until production baselines exist, per §9 OQ-5 CEO disposition requirement. SSOT §16.4 Live Monitor lacks canonical thresholds, making pass/fail judgments premature."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "Hybrid strategy follows §9 OQ-6 explicit recommendation. Real calls for prompt-injection cases validate adversarial defenses while mock handles edge cases, balancing cost and fidelity as per Orchestra spec §7."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Testing only RLS/UI rendering respects Locked Rule 22 neutral-fixture mandate in test plan scope. Full installs require product credentials violating §22, making (c) nonviable per SSOT metadata isolation principle."
    },
    "Q8": {
      "pick": "(c)",
      "rationale": "Supporting all formats satisfies both test plan §6 specification and downstream tooling needs. JSON addition doesn't conflict with existing CSV+Markdown requirement and enhances GovernanceAuditLog (§14) integration."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": ""
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 22592 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(d)",
      "rationale": "Combination approach aligns with Rev-2 §20 embedded code-level Self-Protection (always-on bot detection) and §15 Agent #13 orchestration layer. Production SUT requires X-Test-Bypass-Token allowlist (per Sprint PROTECT-1 Phase 1 bot detection); high-risk adversarial cases (prompt-injection, auth-bypass per §9 OQ-1 severity escalation) should run against dev SUT to avoid triggering real abuse flags. This satisfies both security (prod protected) and fidelity (adversarial coverage complete)."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Reserved `productScope='_test'` tenant with auto-cleanup operationalises Rev-2 §3 metadata-driven architecture (productScope as runtime parameter, never hardcoded). This allows Agents #4/#5 to create test rows without polluting production data, and aligns with Locked Rule 22 (Product-Agnostic Rule) — the test tenant is metadata-only, not code-specific. Auto-cleanup satisfies idempotency for nightly cadence (§7.5)."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Hybrid approach balances fidelity and risk. Nominal cases (Agent #4 onboarding happy-path) use Stripe sandbox to validate real integration per §3.4 A4-N1; adversarial cases (injection, oversized payload) mock Stripe to avoid abuse-flagging the test account and triggering rate-limits that would produce false-positive WARN verdicts. Aligns with §9 OQ-3 mitigation guidance and keeps test cost ~$0.30–$0.80 per run (real calls only on nominal path)."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "Once Agent #13 Self-Protection ships (currently DORMANT per §15 row 13), it will orchestrate portfolio-wide IP protection including scraper blocking. The adversarial suite IS a hostile crawler from #13's perspective. Allowlisting by signed identifier (e.g. `X-Test-Bypass-Token` from Q1, or a dedicated service account) operationalises the same mechanism that exempts internal audit per Locked Rule E1 (referenced in §20.1 reconciliation). This avoids disabling #13 (security regression) or maintenance windows (violates Locked Rule 14)."
    },
    "Q5": {
      "pick": "(b)",
      "rationale": "Rev-2 §26 notes Layer 4 Building Guidance not yet built, and E6 Slot 1 dissent flagged missing quantified SLAs. Recording baselines now without canonical targets risks false-positive failures if targets are later set higher. §7.1 mentions 'latency within budget' but budget is undefined. Record-only mode (capture p50/p95 per endpoint in the adversarial report) feeds into the next CA-n amendment cycle (§18) for canonical SLA definition, per Panel-review threshold (Locked Rule 17)."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "Hybrid approach maximises regression detection while controlling cost. Malformed/edge cases (§3.1–§3.5 M1/M2/E1/E2) use MockClaude (deterministic, free, catches schema violations). Adversarial prompt-injection cases (A1-X2, A2-X1, A3-X1, A4-X1, A5-X1) use real Claude to detect actual instruction-takeover regressions — these are security-critical per §5.2 severity escalation. Estimated cost ~$0.15–$0.25 per run (only ~10 real calls for injection cases). Aligns with §9 OQ-6 recommendation."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Locked Rule 22 (Product-Agnostic Rule) mandates 'neutral fixtures only' — no live VEU product credentials in tests. Testing RLS + UI rendering of the Capability Transfer generator (§4.5 `/capability-transfer` adversarial cases) validates the metadata-driven surface without requiring live install. Full install-sprint generation for the 5 VEU products belongs in per-product clearance (Rev-2 §11 Clearance Protocol Step 5 Data Export), not in this platform-level suite. Defers to §27 OQ-5 (Capability Transfer completeness check) for future scope."
    },
    "Q8": {
      "pick": "(c)",
      "rationale": "All three formats serve distinct downstream consumers: Markdown for human review (PR comments, audit trail narrative per §14), CSV for spreadsheet analysis and trend tracking, JSON for CI/CD tooling integration and automated escalation (§7.5 CI gate logic). §6 specifies Markdown + CSV; adding JSON exporter (per §9 OQ-8 note) is low-cost and aligns with Rev-2 §14 GovernanceAuditLog flexibility (topics logged in structured form, multiple serialisation formats acceptable). Supports both human and machine consumers per Locked Rule 5 (multi-AI peer review)."
    }
  },
  "conflicts_with_ssot": [
    "Q1(d) + Q4(a) assume X-Test-Bypass-Token mechanism exists; Rev-2 §20 Sprint PROTECT-1 Phase 1 mentions bot detection but does not canonically define a test-bypass header. Engineering decision required before implementation.",
    "Q5(b) defers perf baselines; Rev-2 §16 Readiness Checker scores 6 dimensions (0–10 each) but does not pin latency thresholds. Conflicts with implicit assumption that 'latency within budget' (§7.1) is measurable without canonical targets."
  ],
  "overall_notes": "All 8 questions answered with specific SSOT citations (§ numbers, sprint names, Locked Rules). Engagement: ENGAGED (all rationales cite at least one canonical item). No INSUFFICIENT_INFORMATION responses — the test plan + SSOT jointly provide sufficient basis for each disposition. Two minor conflicts flagged: test-bypass mechanism and perf baselines require engineering/CEO clarification before test suite construction."
}
```
```

---

### Slot 9 [BACKUP FIRED] — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 28334 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:qwen/qwen-2.5-coder-32b-instruct` (error: openrouter 400: {"error":{"message":"Provider returned error","code":400,"metadata":{"raw":"{\"errors\":[{\"message\":\"AiError: AiError: This model's maximum context length is 32768 tokens. However, you requested 38)

```
```json
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": { "pick": "(d)", "rationale": "Combining (a) for production and (c) for high-risk adversarial ensures comprehensive coverage while maintaining security. This approach allows for realistic testing in a production environment while isolating high-risk tests to a controlled setting." },
    "Q2": { "pick": "(a)", "rationale": "A reserved productScope='_test' tenant with auto-cleanup ensures test data isolation without restricting the test environment to development only, aligning with §9 OQ-2." },
    "Q3": { "pick": "(b)", "rationale": "Using Stripe sandbox for nominal cases ensures realistic testing while mocking for adversarial cases prevents abuse flagging, as per §9 OQ-3." },
    "Q4": { "pick": "(a)", "rationale": "Allowlisting the test suite by signed identifier ensures that the adversarial suite can run without being blocked by Agent #13, aligning with §9 OQ-4." },
    "Q5": { "pick": "(a)", "rationale": "Setting default performance targets now provides a clear baseline for testing, ensuring that performance issues are caught early, as per §9 OQ-5." },
    "Q6": { "pick": "(b)", "rationale": "A hybrid approach using MockClaude for malformed/edge cases and real Claude for prompt-injection cases balances cost and fidelity, as per §9 OQ-6." },
    "Q7": { "pick": "(b)", "rationale": "Testing only RLS + UI rendering ensures compliance with Locked Rule 22 while still providing valuable insights into the Capability Transfer process, as per §9 OQ-7." },
    "Q8": { "pick": "(b)", "rationale": "Markdown + JSON reporting format enhances tooling integration while maintaining human-readable documentation, as per §9 OQ-8." }
  },
  "conflicts_with_ssot": [],
  "overall_notes": ""
}
```
```

---

### Slot 10 — openrouter:openai/gpt-4o

- Provider: `openrouter`
- Latency: 6213 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "Q1": {
      "pick": "(d)",
      "rationale": "Combining (a) and (c) allows for production testing with a bypass token and high-risk tests on a dev SUT, aligning with the need for security and thorough testing (§9 OQ-1)."
    },
    "Q2": {
      "pick": "(a)",
      "rationale": "Using a reserved productScope='_test' tenant with auto-cleanup ensures isolation and prevents data accumulation, as discussed in §9 OQ-2."
    },
    "Q3": {
      "pick": "(b)",
      "rationale": "Using the Stripe sandbox for nominal cases and mocking for adversarial tests balances safety and realism, as per §9 OQ-3."
    },
    "Q4": {
      "pick": "(a)",
      "rationale": "Allowlisting the test suite by signed identifier ensures that the suite can run without interference from Agent #13, which aligns with the need for controlled testing environments (§9 OQ-4)."
    },
    "Q5": {
      "pick": "(b)",
      "rationale": "Recording performance without pass/fail criteria allows for baseline establishment from real traffic, which is prudent given the lack of canonical baselines (§9 OQ-5)."
    },
    "Q6": {
      "pick": "(b)",
      "rationale": "A hybrid approach using MockClaude for most tests and real Claude for critical prompt-injection cases balances cost and fidelity, as suggested in §9 OQ-6."
    },
    "Q7": {
      "pick": "(b)",
      "rationale": "Testing only RLS and UI rendering respects Locked Rule 22 while ensuring critical components are tested (§9 OQ-7)."
    },
    "Q8": {
      "pick": "(a)",
      "rationale": "Using Markdown and CSV aligns with the current plan and provides a balance between human readability and data processing needs (§9 OQ-8)."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "The selected options align with the test plan's goals and constraints, ensuring comprehensive and secure testing."
}
```
