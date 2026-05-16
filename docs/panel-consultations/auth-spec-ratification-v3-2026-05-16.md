# Panel Consultation — Auth-Traversal Security Spec v3 — FINAL ADVERSARIAL RE-RATIFICATION (2026-05-16)

**Mode:** ADVERSARIAL — locked W5b format (precondition: `b1cd827` / `ad2ab28` / `3f9dede` MET).

**Spec under final re-ratification:** `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` (v3, commit `be594e3`, 655 lines).

**Carried questions from prior runs (NOT re-voted):**
  - G-Q1 ✅ SUPERMAJORITY_REFUSE 8/9 (v1, commit `556a751`) — cross-origin refused entirely
  - G-Q5 ✅ SUPERMAJORITY_STRICT 8/9 (v1, commit `556a751`) — strict same-origin subdomain default
  - G-Q2-v2 ✅ SUPERMAJORITY_LOUD 8/9 (v2, commit `80682558`) — MFA fail-loud

**Re-vote questions in this run (4):** G-Q3-v3 (screenshots Option B defer), G-Q4-v3 (memory-only MUST), G-Q6-v3 (9-language i18n floor), G-Q7-v3 (90d hot + 1yr cold retention).

**Started:** 2026-05-16T22:10:39.195Z
**Finished:** 2026-05-16T22:14:07.466Z
**Bundle size:** 81646 chars (compact §6+§13+§14+§22+§25 canonical excerpt + full v3 spec).
**Panel audit:** {"providerCounts":{"openai":1,"anthropic":1,"meta-llama":2,"mistralai":1,"cohere":1,"minimax":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"auditPass":true}
**Seed:** `auth-spec-v3-ratification-2026-05-16`

---

## 🚨 PLAIN RATIFICATION VERDICT

**Status:** `NOT_RATIFIED`

Spec v3 NOT ratified — 3 question(s) still lack a clear Panel majority.

**Remaining conditions:**
1. **G-Q4-v3** — storageState memory-only as MUST (no encrypted-fs fallback codified in spec)
   - Verdict: `PLURALITY_GQ4v3-MUST`. v3 position (`GQ4v3-MUST`) did NOT reach Panel quorum. 5 of 9 on GQ4v3-MUST (below 7/10 quorum).

2. **G-Q6-v3** — Destructive-action gate i18n denylist floor (v3 expansion 6 → 9 languages: +ja, +ko, +ar)
   - Verdict: `PLURALITY_GQ6v3-9`. v3 position (`GQ6v3-9`) did NOT reach Panel quorum. 6 of 9 on GQ6v3-9 (below 7/10 quorum).

3. **G-Q7-v3** — Audit retention for credentialed runs (v3: 90 days hot + 1 year cold)
   - Verdict: `PLURALITY_GQ7v3-90-1`. v3 position (`GQ7v3-90-1`) did NOT reach Panel quorum. 6 of 9 on GQ7v3-90-1 (below 7/10 quorum).





---

## DISSENT-FLOOR EVALUATION

Drafted alignment across 4 re-vote questions:
  Aligned: **24 of 36** = 66.7%
Distinct objections: **26**

**✅ Dissent floor PASSED — verdict valid.** alignment 66.7 %, distinct objections 26.

---

## Slot status

| Slot | Provider | Model | Region/Role | Backup? | Status | Adv state | Invalid reason |
|------|----------|-------|-------------|---------|--------|-----------|----------------|
| 1 | openrouter | `anthropic/claude-opus-4` | US · frontier reasoning | YES → openrouter:anthropic/claude-opus-4 | LIVE-OK | `ENGAGED` | — |
| 2 | openrouter | `anthropic/claude-opus-4` | US · reasoning | — | LIVE-OK | `ENGAGED` | — |
| 3 | openrouter | `meta-llama/llama-3.3-70b-instruct` | US · frontier reasoning (post-Gemini-demote 2026-05-16) | — | LIVE-OK | `ENGAGED` | — |
| 4 | openrouter | `mistralai/mistral-large-2411` | Europe · European frontier | — | LIVE-OK | `ENGAGED` | — |
| 5 | openrouter | `cohere/command-r-plus-08-2024` | Europe/CA · European RAG-tuned | — | LIVE-OK | `SILENT` | — |
| 6 | openrouter | `minimax/minimax-m2.7` | Asia · Asia generalist | — | LIVE-OK | `ENGAGED` | — |
| 7 | openrouter | `deepseek/deepseek-r1` | Asia · Asia reasoning | — | LIVE-OK | `ENGAGED` | — |
| 8 | openrouter | `perplexity/sonar` | US web-grounded · web-grounded research | — | LIVE-OK | `ENGAGED` | — |
| 9 | openrouter | `meta-llama/llama-4-maverick` | Asia (Beijing → US/Meta after swap) · frontier coding + agentic | — | LIVE-OK | `ENGAGED` | — |
| 10 | openrouter | `x-ai/grok-4.3` | US · real-time web-aware reasoning | — | LIVE-OK | `ENGAGED` | — |

LIVE-OK: 10/10. Backups applied: 1. Quorum met (≥7 LIVE-OK): true.
Adversarial classification: ENGAGED=9, TANGENTIAL=0, INVALID=0, SILENT=1.

---

## Per-question tally

| Q | Topic | Top key | Top count | Verdict |
|---|---|---|---:|---|
| **G-Q3-v3** | Screenshot capture in Phase 3 (Option B CEO-locked — de | `GQ3v3-DEFER` | 7 / 9 | `QUORUM_PLURALITY_GQ3v3-DEFER` |
| **G-Q4-v3** | storageState memory-only as MUST (no encrypted-fs fallb | `GQ4v3-MUST` | 5 / 9 | `PLURALITY_GQ4v3-MUST` |
| **G-Q6-v3** | Destructive-action gate i18n denylist floor (v3 expansi | `GQ6v3-9` | 6 / 9 | `PLURALITY_GQ6v3-9` |
| **G-Q7-v3** | Audit retention for credentialed runs (v3: 90 days hot  | `GQ7v3-90-1` | 6 / 9 | `PLURALITY_GQ7v3-90-1` |

### Per-question detail

### G-Q3-v3 — Screenshot capture in Phase 3 (Option B CEO-locked — defer screenshots to Phase 4)

Tally (ENGAGED-only, 9):
  - `GQ3v3-DEFER` "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introd"  →  **7**
  - `GQ3v3-V2` "Reject v3; restore v2 §6a — 9-stage scrub pipeline + default-OFF retention + operator residual-risk acknowledgment."  →  **0**
  - `GQ3v3-DEV` "Different — screenshots permitted in dev/staging only, no scrub required, no retention; or other compromise."  →  **1**
  - `REJECT` (free-text REJECT bucket) → 1

**Verdict:** `QUORUM_PLURALITY_GQ3v3-DEFER` — 7 of 9 on GQ3v3-DEFER (≥ quorum 7/10).

### G-Q4-v3 — storageState memory-only as MUST (no encrypted-fs fallback codified in spec)

Tally (ENGAGED-only, 9):
  - `GQ4v3-MUST` "Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a filesystem-fallback path is non-conforman"  →  **5**
  - `GQ4v3-HEDGE` "Reject v3 MUST; restore v2 hedge language ("memory-only with optional encrypted-fs fallback if memory pressure becomes a concern")"  →  **0**
  - `GQ4v3-MONITOR` "Ratify MUST but require Phase 3 to ship a memory-pressure monitor with hard failure semantics — run fails loud rather than silentl"  →  **3**
  - `GQ4v3-OTHER` "Different — specify in rationale."  →  **0**
  - `REJECT` (free-text REJECT bucket) → 1

**Verdict:** `PLURALITY_GQ4v3-MUST` — 5 of 9 on GQ4v3-MUST (below 7/10 quorum).

### G-Q6-v3 — Destructive-action gate i18n denylist floor (v3 expansion 6 → 9 languages: +ja, +ko, +ar)

Tally (ENGAGED-only, 9):
  - `GQ6v3-9` "Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment."  →  **6**
  - `GQ6v3-6` "Reject v3; restore v2 6-language floor (per-product opt-in handles ja/ko/ar)."  →  **0**
  - `GQ6v3-MORE` "Require additional languages in v3 floor before Phase 3 ships — specify (e.g. hi, ru, vi must also be in floor)."  →  **2**
  - `GQ6v3-OTHER` "Different — specify in rationale."  →  **0**
  - `REJECT` (free-text REJECT bucket) → 1

**Verdict:** `PLURALITY_GQ6v3-9` — 6 of 9 on GQ6v3-9 (below 7/10 quorum).

### G-Q7-v3 — Audit retention for credentialed runs (v3: 90 days hot + 1 year cold)

Tally (ENGAGED-only, 9):
  - `GQ7v3-90-1` "Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail)."  →  **6**
  - `GQ7v3-30-0` "Reject v3; restore v2 short retention (30 hot + 0 cold)."  →  **0**
  - `GQ7v3-STD` "Reject v3; restore CA-10-E canonical retention (365 hot + 7yr cold) for credentialed-run entries too."  →  **0**
  - `GQ7v3-OTHER` "Different — specify in rationale (e.g. 90 hot + shorter cold, 365 hot + 1yr cold, or other hybrid)."  →  **3**

**Verdict:** `PLURALITY_GQ7v3-90-1` — 6 of 9 on GQ7v3-90-1 (below 7/10 quorum).


---

## All distinct substantive objections (verbatim)

Total distinct: **26**

**01. [Slot 1] Memory-only storageState creates DoS vector**

> §2 Invariant 2 mandates memory-only storageState with no filesystem fallback. A malicious actor could trigger OOM by submitting concurrent authenticated crawls with large cookie/localStorage payloads, crashing the Conductor process and denying service to legitimate operators.

**02. [Slot 1] 9-language denylist leaves critical gaps**

> §2 Invariant 5's i18n regex covers only 9 languages but FlowAI serves global products. A Hindi 'हटाएं' (delete) or Russian 'удалить' (delete) button would pass the hybrid gate undetected, potentially triggering destructive actions in authenticated context.

**03. [Slot 1] Single-attempt login breaks legitimate workflows**

> §2 Invariant 3's single-attempt rule with MFA fail-loud means transient network errors or rate-limiting during login permanently fail the entire run. No retry mechanism exists even for non-credential failures like DNS resolution or TLS handshake timeouts.

**04. [Slot 1] Audit retention mismatch creates compliance gap**

> §2 Invariant 9 specifies 90-day hot + 1-year cold for authenticated runs while §14.3 canonical specifies 365-day hot + 7-year cold for standard audit entries. This bifurcated retention creates a compliance gap where authenticated actions disappear from audit trail before related unauthenticated actions.

**05. [Slot 3] Lack of MFA support**

> The proposal does not support Multi-Factor Authentication (MFA), which is a critical security feature for many applications. This could lead to authentication failures and potential security vulnerabilities.

**06. [Slot 3] Insufficient storageState security**

> The proposal's storageState handling is memory-only, but it does not provide sufficient guarantees against memory dumps or other attacks that could compromise sensitive data.

**07. [Slot 3] Inadequate i18n support**

> The proposal's i18n support is limited to 9 languages, which may not be sufficient for global deployments. This could lead to issues with non-English speaking users and potential security vulnerabilities.

**08. [Slot 4] Invariant 2 StorageState Memory-Only**

> Invariant 2 mandates memory-only storageState with no filesystem fallback. This is highly restrictive and may lead to operational issues under memory pressure, especially in high-load scenarios. The spec should allow for a fallback mechanism to handle such cases.

**09. [Slot 4] Invariant 5 Hybrid Gate Complexity**

> The hybrid gate for destructive actions is complex and may not cover all edge cases. The allowlist and denylist mechanisms can be circumvented by obfuscated text or custom CSS classes. This introduces a significant risk of false negatives.

**10. [Slot 4] Invariant 9 Audit-Log Surface**

> The audit-log surface specifies what is logged and what isn't, but it doesn't address the potential for log injection attacks. If an operator submits credentials that contain log-format-breaking characters, it could corrupt the audit log.

**11. [Slot 6] data-crawl-safe allowlist enables authenticated destruction**

> Invariant 5's hybrid gate grants `data-crawl-safe="true"` explicit override power over the destructive-action denylist. Any developer or product author marking a delete button with this attribute defeats the entire protection. The spec provides no mechanism for auditing which elements carry this flag, no RLS restriction on who can set it, and no review gate before the flag takes effect. §7.3 ties the same-eTLD+1 flag to admin role, but the allowlist flag has no analogous role gate — it is a free-form data attribute any injected script or XSS payload could plant.

**12. [Slot 6] i18n regex word-boundary failures in Arabic**

> The destructive-action regex uses `\b` (word boundary) which matches between Arabic letter and space but FAILS between Arabic letters and punctuation, between joined Arabic letters, or across RTL/LTR boundaries. A button reading "حذف الحساب" (delete account) joined by ZWNJ renders as "حذف_الحساب" — the \b anchor cannot fire between two Arabic letters, so the match silently fails. The spec explicitly lists Arabic as a covered floor language but its acknowledged-residual section (end of Invariant 5) does not name this Unicode-boundary failure mode. Operators deploying to Arabic-language products will receive false security from the denylist.

**13. [Slot 6] MFA fail-loud creates DoS on operator accounts**

> Invariant 3 mandates fail-loud on MFA — the run terminates and returns `ok:false`. For products enforcing mandatory TOTP/MFA, this means a single run attempt locks out the operator's account after sufficient failed attempts (products typically lock after 3-10 consecutive failures). If the operator re-submits the same credentials in a retry run (which they must, since credentials are one-shot per §3.1), each retry risks triggering account lockout on the target product. The spec does not address lockout-rate-limit blowback (T7) with any mitigation beyond 'stop immediately' — which is the trigger, not the solution.

**14. [Slot 6] memory-only storageState amplifies crash-loss on multi-page crawls**

> Invariant 2 memory-only posture eliminates the filesystem write step, but under Vercel's memory ceiling (512 MB standard, 1.3 GB maximum for Plus), a 2000-page authenticated crawl holds all post-login cookies, localStorage, and sessionStorage in a single heap object for the entire run duration. No eviction policy exists for storageState under memory pressure. The acknowledged residual explicitly names 'hostile container introspection' as the threat — but Vercel OOM SIGKILL is not hostile, it is operational, and it destroys all storageState for the run with no recovery path, whereas v1's on-disk approach had at least a recovery artifact.

**15. [Slot 7] i18n denylist coverage gaps**

> The expanded 9-language destructive-action denylist (Invariant 5) still excludes major languages like Hindi/Russian. Regex-based matching risks missing obfuscated text (e.g. 'delêté' with diacritics) and icon-only buttons without aria-labels, creating false negatives that could enable destructive actions during authenticated crawls.

**16. [Slot 7] Memory-only storageState risks**

> Invariant 2's memory-only storageState leaves credentials vulnerable to process memory dumps (kernel core dumps, debugger introspection). While Vercel's isolation is trusted, this creates a hosting-environment dependency not present in v1's encrypted-fs approach - a regression in multi-tenant security posture.

**17. [Slot 7] Insufficient audit retention**

> 90-day hot + 1-year cold retention (Invariant 9) for credentialed runs remains shorter than standard 365d+7y, hampering incident investigations. A breach discovered at day 95 would lose hot-storage context while cold storage may lack query capabilities needed for root-cause analysis.

**18. [Slot 8] Memory-only is brittle**

> Section 2, Invariant 2 makes storageState memory-only with no fallback, but the same spec acknowledges browser context recreation and run-state map retention. If the process restarts or memory pressure spikes, there is no recovery path and no auditably safe spill mechanism, so a transient condition can turn into a hard failure for every authenticated crawl.

**19. [Slot 8] Allowlist overrides remain unsafe**

> Section 2, Invariant 5 lets `data-crawl-safe="true"` override the destructive denylist, even when the text/class signals are clearly dangerous. That means a single mistaken product-authored attribute can disable the last line of defense and allow destructive clicks while authenticated, exactly where the blast radius is largest.

**20. [Slot 8] Retention still overshoots minimization**

> Section 2, Invariant 9 keeps credentialed-run audit metadata for 90 days hot plus 1 year cold, while the same proposal says this metadata is sensitive. The retention schedule is materially longer than a pure operational need would justify, and the spec does not define a data-subset rationale for why 1 year of cold storage is the minimum acceptable floor instead of a shorter incident-response window.

**21. [Slot 9] Overly complex credential handling**

> The proposal introduces multiple mechanisms for handling credentials (§3), including validation, transit, and lifetime management. This complexity increases the risk of errors or security vulnerabilities.

**22. [Slot 9] Insufficient testing for MFA detection**

> The proposal (§8.1) relies on heuristic MFA detection, which may not cover all possible MFA challenge scenarios. Insufficient testing for MFA detection could lead to false negatives or false positives.

**23. [Slot 9] Retention policy divergence**

> The proposal (§9) introduces a custom retention policy for credentialed-run audit entries (90 days hot + 1 year cold), which diverges from the standard CA-10-E retention policy (365 days hot + 7 years cold). This divergence may cause inconsistencies or compliance issues.

**24. [Slot 10] Invariant 2 omits heap-dump exposure**

> §2 Invariant 2 mandates memory-only storageState but only documents Vercel isolation as a trust assumption; no mechanism prevents kernel/core-dump access to the Conductor heap during a run, directly contradicting the 'never logged' claim in CANONICAL §6 line 110.

**25. [Slot 10] RetentionClass conflicts with §14.3**

> §5.3 and Invariant 9 define retentionClass:'auth_short' (90 hot + 1yr cold) while CANONICAL §14.3 mandates 365 hot + 7yr cold for all GovernanceAuditLog rows; the tag-based exception has no RLS or cron enforcement specified.

**26. [Slot 10] Hybrid gate admits JS handlers**

> Invariant 5 §3 lists only aria-label/text/class checks; the explicit false-negative note admits 'JavaScript-only event handlers attached programmatically' bypass the denylist, leaving T4 destructive actions possible under authenticated context.


---

## Strongest single argument AGAINST v3 spec

**From Slot 6 (openrouter:minimax/minimax-m2.7):**

> The proposal addresses four targeted v2 Panel concerns (screenshots, storageState, i18n, retention) with surgical CEO-locked positions, but the spec's scope has quietly expanded beyond security into capability limitation — specifically, it explicitly outs MFA traversal, OAuth/SSO, authenticated form-submit, and screenshot capture to Phase 4+. Each of these is a fundamental use case for authenticated crawl: products requiring MFA are the majority of enterprise SaaS. By ratifying this spec, the Panel endorses a Phase 3 that serves only form-based non-MFA products — a small and shrinking fraction of the market. The 'correctness' test in SSOT §22 (product-agnostic) is violated in practice: products with MFA, SSO, or screenshot requirements cannot onboard via metadata writes alone. The proposal should be deferred until Phase 4 scope is chartered and the Panel can assess whether Phase 3 alone justifies the audit-trail and governance overhead for a feature-gated crawler.

---

## Per-reviewer adversarial pass + steelman + votes

## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Memory-only storageState creates DoS vector**

> §2 Invariant 2 mandates memory-only storageState with no filesystem fallback. A malicious actor could trigger OOM by submitting concurrent authenticated crawls with large cookie/localStorage payloads, crashing the Conductor process and denying service to legitimate operators.

**Objection 2 — 9-language denylist leaves critical gaps**

> §2 Invariant 5's i18n regex covers only 9 languages but FlowAI serves global products. A Hindi 'हटाएं' (delete) or Russian 'удалить' (delete) button would pass the hybrid gate undetected, potentially triggering destructive actions in authenticated context.

**Objection 3 — Single-attempt login breaks legitimate workflows**

> §2 Invariant 3's single-attempt rule with MFA fail-loud means transient network errors or rate-limiting during login permanently fail the entire run. No retry mechanism exists even for non-credential failures like DNS resolution or TLS handshake timeouts.

**Objection 4 — Audit retention mismatch creates compliance gap**

> §2 Invariant 9 specifies 90-day hot + 1-year cold for authenticated runs while §14.3 canonical specifies 365-day hot + 7-year cold for standard audit entries. This bifurcated retention creates a compliance gap where authenticated actions disappear from audit trail before related unauthenticated actions.

**Worse-than-status-quo scenario:** The memory-only storageState mandate without any pressure-relief valve means a production authenticated crawl hitting memory limits will crash the entire Conductor process, taking down ALL crawls (authenticated and unauthenticated) rather than gracefully degrading a single run.

**Precedent:** GitHub Actions' credential-handling initially used memory-only storage for secrets but added encrypted-disk caching after repeated OOM crashes on large matrix builds with many secrets - they had to retrofit the fallback path after production incidents.

### Rejection steelman

> This spec should be rejected because it removes critical operational flexibility (memory-only MUST with no fallback) while providing incomplete security coverage (9-language denylist in a global system). The Phase 3 implementation will face immediate production issues from memory pressure and non-covered destructive actions, requiring emergency patches that violate the spec's invariants. Better to defer until Phase 4 can implement a complete solution with proper fallback mechanisms and comprehensive i18n coverage.

### Votes

- **G-Q3-v3** = `GQ3v3-DEFER` — Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator
  > Deferring screenshots eliminates the complex 9-stage scrub pipeline and OCR dependencies, reducing Phase 3 attack surface while allowing Phase 4 to design against real fixtures.
- **G-Q4-v3** = `GQ4v3-MONITOR` — Ratify MUST but require Phase 3 to ship a memory-pressure monitor with hard failure semant
  > Memory-only is correct for security but needs operational safeguards; a pressure monitor that fails loud prevents the DoS vector while maintaining the security invariant.
- **G-Q6-v3** = `GQ6v3-MORE` — Require additional languages in v3 floor before Phase 3 ships — specify (e.g. hi, ru, vi m
  > The 9-language floor excludes Hindi (600M speakers), Russian (260M speakers), and Vietnamese (85M speakers) - all top-15 global languages that FlowAI likely serves, creating unacceptable destructive-action risk.
- **G-Q7-v3** = `GQ7v3-OTHER` — Different — specify in rationale (e.g. 90 hot + shorter cold, 365 hot + 1yr cold, or other
  > Should be 180 days hot + 2 years cold - long enough for quarterly security reviews to catch anomalies but short enough to limit sensitive metadata exposure, balancing compliance needs with privacy.

Overall: The spec makes hard tradeoffs favoring security over operational flexibility, but leaves significant gaps in i18n coverage and memory management that will cause production issues.

---

## Slot 2 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Memory-only storageState creates DoS vector**

> §2 Invariant 2 mandates memory-only storageState with no filesystem fallback. A malicious actor could trigger OOM by submitting concurrent authenticated crawls with large cookie/localStorage payloads, crashing the Conductor process and denying service to legitimate operators.

**Objection 2 — 9-language denylist leaves critical gaps**

> §2 Invariant 5's i18n regex covers only 9 languages but FlowAI serves global products. A Hindi 'हटाएं' (delete) or Russian 'удалить' (delete) button would pass the hybrid gate undetected, potentially triggering destructive actions in authenticated context.

**Objection 3 — Single-attempt login breaks legitimate workflows**

> §2 Invariant 3's single-attempt rule with MFA fail-loud means transient network errors or rate-limiting during login permanently fail the entire run. No retry mechanism exists even for non-credential failures like DNS resolution or TLS handshake timeouts.

**Objection 4 — Audit retention mismatch creates compliance gap**

> §2 Invariant 9 specifies 90-day hot + 1-year cold for authenticated runs while §14.3 canonical specifies 365-day hot + 7-year cold for standard audit entries. This bifurcated retention creates a compliance gap where authenticated actions disappear from audit trail before related unauthenticated actions.

**Worse-than-status-quo scenario:** The memory-only storageState mandate without any pressure-relief valve means a production authenticated crawl hitting memory limits will crash the entire Conductor process, taking down ALL crawls (authenticated and unauthenticated) rather than gracefully degrading a single run.

**Precedent:** GitHub Actions' credential-handling initially used memory-only storage for secrets but added encrypted-disk caching after repeated OOM crashes on large matrix builds with many secrets - they had to retrofit the fallback path after production incidents.

### Rejection steelman

> This spec should be rejected because it removes critical operational flexibility (memory-only MUST with no fallback) while providing incomplete security coverage (9-language denylist in a global system). The Phase 3 implementation will face immediate production issues from memory pressure and non-covered destructive actions, requiring emergency patches that violate the spec's invariants. Better to defer until Phase 4 can implement a complete solution with proper fallback mechanisms and comprehensive i18n coverage.

### Votes

- **G-Q3-v3** = `GQ3v3-DEFER` — Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator
  > Deferring screenshots eliminates the complex 9-stage scrub pipeline and OCR dependencies, reducing Phase 3 attack surface while allowing Phase 4 to design against real fixtures.
- **G-Q4-v3** = `GQ4v3-MONITOR` — Ratify MUST but require Phase 3 to ship a memory-pressure monitor with hard failure semant
  > Memory-only is correct for security but needs operational safeguards; a pressure monitor that fails loud prevents the DoS vector while maintaining the security invariant.
- **G-Q6-v3** = `GQ6v3-MORE` — Require additional languages in v3 floor before Phase 3 ships — specify (e.g. hi, ru, vi m
  > The 9-language floor excludes Hindi (600M speakers), Russian (260M speakers), and Vietnamese (85M speakers) - all top-15 global languages that FlowAI likely serves, creating unacceptable destructive-action risk.
- **G-Q7-v3** = `GQ7v3-OTHER` — Different — specify in rationale (e.g. 90 hot + shorter cold, 365 hot + 1yr cold, or other
  > Should be 180 days hot + 2 years cold - long enough for quarterly security reviews to catch anomalies but short enough to limit sensitive metadata exposure, balancing compliance needs with privacy.

Overall: The spec makes hard tradeoffs favoring security over operational flexibility, but leaves significant gaps in i18n coverage and memory management that will cause production issues.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Lack of MFA support**

> The proposal does not support Multi-Factor Authentication (MFA), which is a critical security feature for many applications. This could lead to authentication failures and potential security vulnerabilities.

**Objection 2 — Insufficient storageState security**

> The proposal's storageState handling is memory-only, but it does not provide sufficient guarantees against memory dumps or other attacks that could compromise sensitive data.

**Objection 3 — Inadequate i18n support**

> The proposal's i18n support is limited to 9 languages, which may not be sufficient for global deployments. This could lead to issues with non-English speaking users and potential security vulnerabilities.

**Worse-than-status-quo scenario:** The proposal's lack of MFA support and insufficient storageState security could make the system more vulnerable to attacks and authentication failures, potentially making it worse than the current status quo.

**Precedent:** The recent security breaches at major companies due to inadequate MFA support and poor storageState handling serve as a precedent for the potential risks associated with this proposal.

### Rejection steelman

> The proposal's limitations and potential security vulnerabilities make it unsuitable for implementation. The lack of MFA support, insufficient storageState security, and inadequate i18n support are significant concerns that need to be addressed before the proposal can be considered for implementation.

### Votes

- **G-Q3-v3** = `GQ3v3-DEFER` — Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator
  > This option is the most secure and simplest to implement, as it defers screenshot capture to Phase 4 and avoids introducing additional complexity and potential security vulnerabilities in Phase 3.
- **G-Q4-v3** = `GQ4v3-MUST` — Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a f
  > This option ensures that storageState is handled in a secure and memory-only manner, reducing the risk of sensitive data compromise.
- **G-Q6-v3** = `GQ6v3-9` — Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitm
  > This option provides a reasonable balance between i18n support and security, as it covers a significant number of languages and ensures that the system is tested for each language.
- **G-Q7-v3** = `GQ7v3-90-1` — Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-ze
  > This option provides a reasonable balance between data retention and security, as it allows for sufficient time for auditing and incident response while minimizing the risk of sensitive data compromise.

Overall: The proposal has some significant security concerns and limitations that need to be addressed before it can be considered for implementation. However, with careful consideration and mitigation of these risks, the proposal has the potential to provide a secure and functional authenticated crawl traversal system.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Invariant 2 StorageState Memory-Only**

> Invariant 2 mandates memory-only storageState with no filesystem fallback. This is highly restrictive and may lead to operational issues under memory pressure, especially in high-load scenarios. The spec should allow for a fallback mechanism to handle such cases.

**Objection 2 — Invariant 5 Hybrid Gate Complexity**

> The hybrid gate for destructive actions is complex and may not cover all edge cases. The allowlist and denylist mechanisms can be circumvented by obfuscated text or custom CSS classes. This introduces a significant risk of false negatives.

**Objection 3 — Invariant 9 Audit-Log Surface**

> The audit-log surface specifies what is logged and what isn't, but it doesn't address the potential for log injection attacks. If an operator submits credentials that contain log-format-breaking characters, it could corrupt the audit log.

**Worse-than-status-quo scenario:** The proposal's strict memory-only storageState invariant may lead to operational failures under high memory pressure, making the system less reliable than the current status quo where filesystem fallbacks are allowed.

**Precedent:** In a similar design, a financial services company implemented a strict memory-only policy for sensitive data handling, which led to system crashes during high-load periods due to memory exhaustion.

### Rejection steelman

> The proposal should be rejected or deferred until a more robust fallback mechanism for storageState is implemented. The current memory-only mandate is too restrictive and poses significant operational risks, especially under high memory pressure.

### Votes

- **G-Q3-v3** = `GQ3v3-DEV` — Different — screenshots permitted in dev/staging only, no scrub required, no retention; or
  > This option allows for a middle ground where screenshots can be used for testing purposes without the complexity of a full scrub pipeline.
- **G-Q4-v3** = `REJECT` — REJECT
  > The memory-only mandate is too restrictive and poses operational risks. A fallback mechanism should be allowed.
- **G-Q6-v3** = `GQ6v3-9` — Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitm
  > Expanding the i18n denylist floor to 9 languages provides better coverage and reduces the risk of destructive actions slipping through.
- **G-Q7-v3** = `GQ7v3-OTHER` — Different — specify in rationale (e.g. 90 hot + shorter cold, 365 hot + 1yr cold, or other
  > A hybrid retention policy could balance the need for audit trail availability and metadata minimization.

Overall: The proposal introduces significant operational risks with the memory-only storageState mandate. A fallback mechanism should be considered to handle high memory pressure scenarios.

---

## Slot 5 — openrouter:cohere/command-r-plus-08-2024 — state: `SILENT`

_(degraded / parse-failure)_

---

## Slot 6 — openrouter:minimax/minimax-m2.7 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — data-crawl-safe allowlist enables authenticated destruction**

> Invariant 5's hybrid gate grants `data-crawl-safe="true"` explicit override power over the destructive-action denylist. Any developer or product author marking a delete button with this attribute defeats the entire protection. The spec provides no mechanism for auditing which elements carry this flag, no RLS restriction on who can set it, and no review gate before the flag takes effect. §7.3 ties the same-eTLD+1 flag to admin role, but the allowlist flag has no analogous role gate — it is a free-form data attribute any injected script or XSS payload could plant.

**Objection 2 — i18n regex word-boundary failures in Arabic**

> The destructive-action regex uses `\b` (word boundary) which matches between Arabic letter and space but FAILS between Arabic letters and punctuation, between joined Arabic letters, or across RTL/LTR boundaries. A button reading "حذف الحساب" (delete account) joined by ZWNJ renders as "حذف_الحساب" — the \b anchor cannot fire between two Arabic letters, so the match silently fails. The spec explicitly lists Arabic as a covered floor language but its acknowledged-residual section (end of Invariant 5) does not name this Unicode-boundary failure mode. Operators deploying to Arabic-language products will receive false security from the denylist.

**Objection 3 — MFA fail-loud creates DoS on operator accounts**

> Invariant 3 mandates fail-loud on MFA — the run terminates and returns `ok:false`. For products enforcing mandatory TOTP/MFA, this means a single run attempt locks out the operator's account after sufficient failed attempts (products typically lock after 3-10 consecutive failures). If the operator re-submits the same credentials in a retry run (which they must, since credentials are one-shot per §3.1), each retry risks triggering account lockout on the target product. The spec does not address lockout-rate-limit blowback (T7) with any mitigation beyond 'stop immediately' — which is the trigger, not the solution.

**Objection 4 — memory-only storageState amplifies crash-loss on multi-page crawls**

> Invariant 2 memory-only posture eliminates the filesystem write step, but under Vercel's memory ceiling (512 MB standard, 1.3 GB maximum for Plus), a 2000-page authenticated crawl holds all post-login cookies, localStorage, and sessionStorage in a single heap object for the entire run duration. No eviction policy exists for storageState under memory pressure. The acknowledged residual explicitly names 'hostile container introspection' as the threat — but Vercel OOM SIGKILL is not hostile, it is operational, and it destroys all storageState for the run with no recovery path, whereas v1's on-disk approach had at least a recovery artifact.

**Worse-than-status-quo scenario:** A product with mandatory MFA (e.g. a banking SaaS, healthcare portal) will have zero authenticated coverage from Phase 3 — the spec explicitly outs MFA to Phase 4+. An operator submits credentials, the crawler immediately hits the MFA wall and returns `ok:false, authFailureReason: 'mfa_required'`, and the entire crawl terminates without crawling ANY page. The operator is now more blind than the Phase 1 unauthenticated crawler, which at least identified auth-gated pages without attempting login. The product receives zero crawl data, and the operator's account may be temporarily rate-limited from repeated failed-attempt signals sent by the login probe.

**Precedent:** The Atlassian Confluence CVE-2023-22515 (2023) and subsequent breach involved credentialed session tokens being exfiltrated through incomplete scrubbing in crawler/prawler infrastructure; similarly, the 2019 Capital One breach (SSRF via misconfigured IAM role) demonstrated how session-state leakage from automated crawlers can cascade into account takeover. The pattern — automated credentialed traversal + incomplete evidence scrubbing + memory-resident secrets + denial-of-service on retry — matches FlowAI's Phase 3 design in all four dimensions.

### Rejection steelman

> The proposal addresses four targeted v2 Panel concerns (screenshots, storageState, i18n, retention) with surgical CEO-locked positions, but the spec's scope has quietly expanded beyond security into capability limitation — specifically, it explicitly outs MFA traversal, OAuth/SSO, authenticated form-submit, and screenshot capture to Phase 4+. Each of these is a fundamental use case for authenticated crawl: products requiring MFA are the majority of enterprise SaaS. By ratifying this spec, the Panel endorses a Phase 3 that serves only form-based non-MFA products — a small and shrinking fraction of the market. The 'correctness' test in SSOT §22 (product-agnostic) is violated in practice: products with MFA, SSO, or screenshot requirements cannot onboard via metadata writes alone. The proposal should be deferred until Phase 4 scope is chartered and the Panel can assess whether Phase 3 alone justifies the audit-trail and governance overhead for a feature-gated crawler.

### Votes

- **G-Q3-v3** = `GQ3v3-DEFER` — Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator
  > Option B is the least risky path. The 9-stage scrub pipeline in v2 introduced OCR engine, image library, re-OCR verification, and operator UI surface for a feature defaulting to OFF — complexity without coverage. Deferring to Phase 4 with real test fixtures is the correct sequencing.
- **G-Q4-v3** = `GQ4v3-MUST` — Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a f
  > The MUST strengthens Invariant 2 from v2's SHOULD. The OOM concern is real but the mitigation is operational (right-size Vercel tier, set appropriate page caps) not a filesystem fallback. The risk of on-disk credential leakage outweighs the risk of memory pressure.
- **G-Q6-v3** = `REJECT` — REJECT
  > The 9-language floor is directionally correct but introduces Unicode regex false-negative risk (especially Arabic ZWNJ and RTL joining) that the spec's acknowledged-residual section does not name. v2's 6-language floor plus a per-product opt-in knob is a safer default — the knob exists (`productConfig.destructiveTermsExtra`) and Phase 3 may wire it.
- **G-Q7-v3** = `GQ7v3-90-1` — Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-ze
  > The v2 zero-cold policy sacrificed post-incident investigation capability for marginal metadata minimisation. 90 days hot + 1 year cold preserves the 'shorter than standard' intent while restoring the cold-store audit trail needed for compliance review.

Overall: G-Q6-v3 is the most consequential vote — the Arabic word-boundary false-negative is a named risk on a spec that explicitly includes Arabic as a floor language. The allowlist-override attack surface in Invariant 5 is the highest-severity unresolved risk in the proposal.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — i18n denylist coverage gaps**

> The expanded 9-language destructive-action denylist (Invariant 5) still excludes major languages like Hindi/Russian. Regex-based matching risks missing obfuscated text (e.g. 'delêté' with diacritics) and icon-only buttons without aria-labels, creating false negatives that could enable destructive actions during authenticated crawls.

**Objection 2 — Memory-only storageState risks**

> Invariant 2's memory-only storageState leaves credentials vulnerable to process memory dumps (kernel core dumps, debugger introspection). While Vercel's isolation is trusted, this creates a hosting-environment dependency not present in v1's encrypted-fs approach - a regression in multi-tenant security posture.

**Objection 3 — Insufficient audit retention**

> 90-day hot + 1-year cold retention (Invariant 9) for credentialed runs remains shorter than standard 365d+7y, hampering incident investigations. A breach discovered at day 95 would lose hot-storage context while cold storage may lack query capabilities needed for root-cause analysis.

**Worse-than-status-quo scenario:** If the crawler's i18n denylist misses a 'delete' button labeled in Turkish (excluded from 9-language floor), an authenticated crawl could trigger accidental data deletion in production - a risk that didn't exist with unauthenticated Phase 1 crawls.

**Precedent:** 2017 Uber breach: Credentials stored in GitHub led to data exposure. Similarly, memory-resident credentials could leak via debug logs/core dumps if hosting isolation fails.

### Rejection steelman

> The proposal's hybrid security model (memory-only storage + regex i18n) introduces novel attack surfaces without commensurate benefits. A cautious approach would defer authenticated crawls until language coverage reaches 95% of target markets and memory handling includes hardware enclaves, rather than betting on Vercel's opaque isolation.

### Votes

- **G-Q3-v3** = `GQ3v3-DEFER` — Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator
  > Deferring screenshots reduces Phase 3 attack surface while allowing focused security design in Phase 4 - aligns with 'secure by staged deployment' principle.
- **G-Q4-v3** = `GQ4v3-MUST` — Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a f
  > Filesystem fallbacks reintroduce v1's cleanup risks. Memory-only forces proper capacity planning and avoids speculative edge-case handling.
- **G-Q6-v3** = `GQ6v3-9` — Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitm
  > 9-language floor materially improves over v2 while keeping Phase 3 scope contained. Per-product extensions via destructiveTermsExtra knob address niche needs.
- **G-Q7-v3** = `GQ7v3-90-1` — Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-ze
  > Balances metadata minimization with investigation needs. Cold storage preserves chain-of-custody for compliance without full 7-year liability.

Overall: While concerning, objections represent manageable risks given Phase 3's limited scope. CEO-locked positions demonstrate adequate risk appetite for staged rollout.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Memory-only is brittle**

> Section 2, Invariant 2 makes storageState memory-only with no fallback, but the same spec acknowledges browser context recreation and run-state map retention. If the process restarts or memory pressure spikes, there is no recovery path and no auditably safe spill mechanism, so a transient condition can turn into a hard failure for every authenticated crawl.

**Objection 2 — Allowlist overrides remain unsafe**

> Section 2, Invariant 5 lets `data-crawl-safe="true"` override the destructive denylist, even when the text/class signals are clearly dangerous. That means a single mistaken product-authored attribute can disable the last line of defense and allow destructive clicks while authenticated, exactly where the blast radius is largest.

**Objection 3 — Retention still overshoots minimization**

> Section 2, Invariant 9 keeps credentialed-run audit metadata for 90 days hot plus 1 year cold, while the same proposal says this metadata is sensitive. The retention schedule is materially longer than a pure operational need would justify, and the spec does not define a data-subset rationale for why 1 year of cold storage is the minimum acceptable floor instead of a shorter incident-response window.

**Worse-than-status-quo scenario:** If an authenticated crawl hits a memory spike or restart, the memory-only storageState is lost and the run fails without any resumable state, while the operator must re-enter credentials and may trigger account lockout or MFA again. Compared with the current ephemeral disk approach, this makes successful completion less reliable for benign runs and can increase operator friction rather than reduce risk.

**Precedent:** no precedent known

### Rejection steelman

> The strongest case for rejecting or deferring this proposal is that it tightens some controls by simply removing capability rather than proving a safe operational substitute. In particular, dropping screenshots from Phase 3 and forbidding any storageState fallback may reduce attack surface, but it also shifts important validation and recovery burdens into later phases without demonstrating that the remaining crawler can still complete real-world authenticated audits reliably. That is enough to justify deferral until there is a tested memory-pressure, restart, and operator-recovery story.

### Votes

- **G-Q3-v3** = `REJECT` — REJECT
  > Phase 3 losing screenshots entirely may be safer than the scrub pipeline, but it also removes a valuable evidence channel for debugging and human review. If the choice is between full removal and a tested scrubbed path, I would still prefer the option that preserves capability with explicit controls.
- **G-Q4-v3** = `GQ4v3-MONITOR` — Ratify MUST but require Phase 3 to ship a memory-pressure monitor with hard failure semant
  > A strict no-disk rule is defensible, but only if the implementation fails loudly before it risks violating the invariant. This keeps the privacy guarantee while addressing the operational brittleness of memory-only storageState.
- **G-Q6-v3** = `GQ6v3-9` — Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitm
  > Expanding the denylist floor to cover Japanese, Korean, and Arabic is a reasonable improvement over the 6-language baseline. It is still imperfect, but the hybrid allowlist/denylist design plus explicit tests makes this an acceptable incremental hardening.
- **G-Q7-v3** = `GQ7v3-90-1` — Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-ze
  > Some retained metadata is justified for incident response and tamper-evidence, and the proposal is already much shorter than the canonical standard. The 90-day hot window plus one-year cold trail is a defensible compromise between minimization and forensic utility.

Overall: The main concern is operational brittleness, not just privacy. If Phase 3 can demonstrate memory-pressure handling and reliable recovery paths, the stricter privacy posture becomes easier to defend.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Overly complex credential handling**

> The proposal introduces multiple mechanisms for handling credentials (§3), including validation, transit, and lifetime management. This complexity increases the risk of errors or security vulnerabilities.

**Objection 2 — Insufficient testing for MFA detection**

> The proposal (§8.1) relies on heuristic MFA detection, which may not cover all possible MFA challenge scenarios. Insufficient testing for MFA detection could lead to false negatives or false positives.

**Objection 3 — Retention policy divergence**

> The proposal (§9) introduces a custom retention policy for credentialed-run audit entries (90 days hot + 1 year cold), which diverges from the standard CA-10-E retention policy (365 days hot + 7 years cold). This divergence may cause inconsistencies or compliance issues.

**Worse-than-status-quo scenario:** If the proposed authentication mechanism fails to properly isolate credentials or detect MFA challenges, it could lead to unauthorized access or data breaches, making the system worse than the status quo.

**Precedent:** Similar authentication mechanisms in other systems have caused problems when not properly tested or when relying on heuristics, such as the OAuth vulnerabilities discovered in various web applications.

### Rejection steelman

> The proposal could be rejected or deferred due to concerns about the complexity of credential handling, the reliability of MFA detection heuristics, and the potential compliance implications of a custom retention policy.

### Votes

- **G-Q3-v3** = `GQ3v3-DEFER` — Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator
  > Deferring screenshot capture to Phase 4 allows for a more focused and secure implementation in a separate dispatch.
- **G-Q4-v3** = `GQ4v3-MUST` — Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a f
  > Ensuring memory-only storage for credentials minimizes the risk of credential exposure.
- **G-Q6-v3** = `GQ6v3-9` — Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitm
  > Expanding the i18n denylist floor to 9 languages improves the security posture by covering more language families.
- **G-Q7-v3** = `GQ7v3-90-1` — Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-ze
  > The proposed retention policy strikes a balance between minimizing metadata retention and maintaining a sufficient audit trail.

Overall: The proposal addresses several security concerns related to authenticated crawl traversal, but careful implementation and testing are crucial to ensure its effectiveness.

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Invariant 2 omits heap-dump exposure**

> §2 Invariant 2 mandates memory-only storageState but only documents Vercel isolation as a trust assumption; no mechanism prevents kernel/core-dump access to the Conductor heap during a run, directly contradicting the 'never logged' claim in CANONICAL §6 line 110.

**Objection 2 — RetentionClass conflicts with §14.3**

> §5.3 and Invariant 9 define retentionClass:'auth_short' (90 hot + 1yr cold) while CANONICAL §14.3 mandates 365 hot + 7yr cold for all GovernanceAuditLog rows; the tag-based exception has no RLS or cron enforcement specified.

**Objection 3 — Hybrid gate admits JS handlers**

> Invariant 5 §3 lists only aria-label/text/class checks; the explicit false-negative note admits 'JavaScript-only event handlers attached programmatically' bypass the denylist, leaving T4 destructive actions possible under authenticated context.

**Worse-than-status-quo scenario:** Memory-only storageState keeps raw session tokens in the Node heap for the full crawl duration; a single process crash or memory snapshot now exposes live credentials for every product the operator has ever run, whereas the prior unauthenticated Phase 1 path never held any credentials at all.

**Precedent:** no precedent known

### Rejection steelman

> The spec introduces a high-value attack surface (authenticated sessions) while relying on incomplete denylists, unproven memory isolation, and a non-canonical retention carve-out; deferring until a full adversarial red-team exercise on real fixtures would be the safer engineering posture.

### Votes

- **G-Q3-v3** = `GQ3v3-DEFER` — Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator
  > Deferral avoids adding untested OCR/scrub surface area before Phase 3 ships.
- **G-Q4-v3** = `GQ4v3-MUST` — Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a f
  > Removes the escape hatch that v2 left open.
- **G-Q6-v3** = `GQ6v3-9` — Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitm
  > Expands coverage without changing the hybrid mechanism.
- **G-Q7-v3** = `GQ7v3-90-1` — Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-ze
  > Balances minimisation with post-incident audit needs.

Overall: All objections are drawn directly from §2, §5 and §14 of the reviewed artifact.


---

## Raw reviewer responses (first 8K each)

### Slot 1 [BACKUP FIRED] — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 65268 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:openai/gpt-5` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Memory-only storageState creates DoS vector",
        "detail": "§2 Invariant 2 mandates memory-only storageState with no filesystem fallback. A malicious actor could trigger OOM by submitting concurrent authenticated crawls with large cookie/localStorage payloads, crashing the Conductor process and denying service to legitimate operators."
      },
      {
        "title": "9-language denylist leaves critical gaps",
        "detail": "§2 Invariant 5's i18n regex covers only 9 languages but FlowAI serves global products. A Hindi 'हटाएं' (delete) or Russian 'удалить' (delete) button would pass the hybrid gate undetected, potentially triggering destructive actions in authenticated context."
      },
      {
        "title": "Single-attempt login breaks legitimate workflows",
        "detail": "§2 Invariant 3's single-attempt rule with MFA fail-loud means transient network errors or rate-limiting during login permanently fail the entire run. No retry mechanism exists even for non-credential failures like DNS resolution or TLS handshake timeouts."
      },
      {
        "title": "Audit retention mismatch creates compliance gap",
        "detail": "§2 Invariant 9 specifies 90-day hot + 1-year cold for authenticated runs while §14.3 canonical specifies 365-day hot + 7-year cold for standard audit entries. This bifurcated retention creates a compliance gap where authenticated actions disappear from audit trail before related unauthenticated actions."
      }
    ],
    "worse_than_status_quo": "The memory-only storageState mandate without any pressure-relief valve means a production authenticated crawl hitting memory limits will crash the entire Conductor process, taking down ALL crawls (authenticated and unauthenticated) rather than gracefully degrading a single run.",
    "precedent": "GitHub Actions' credential-handling initially used memory-only storage for secrets but added encrypted-disk caching after repeated OOM crashes on large matrix builds with many secrets - they had to retrofit the fallback path after production incidents."
  },
  "rejection_steelman": "This spec should be rejected because it removes critical operational flexibility (memory-only MUST with no fallback) while providing incomplete security coverage (9-language denylist in a global system). The Phase 3 implementation will face immediate production issues from memory pressure and non-covered destructive actions, requiring emergency patches that violate the spec's invariants. Better to defer until Phase 4 can implement a complete solution with proper fallback mechanisms and comprehensive i18n coverage.",
  "answers": {
    "G-Q3-v3": {
      "pick_text": "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.",
      "rationale": "Deferring screenshots eliminates the complex 9-stage scrub pipeline and OCR dependencies, reducing Phase 3 attack surface while allowing Phase 4 to design against real fixtures."
    },
    "G-Q4-v3": {
      "pick_text": "Ratify MUST but require Phase 3 to ship a memory-pressure monitor with hard failure semantics — run fails loud rather than silently spilling to disk.",
      "rationale": "Memory-only is correct for security but needs operational safeguards; a pressure monitor that fails loud prevents the DoS vector while maintaining the security invariant."
    },
    "G-Q6-v3": {
      "pick_text": "Require additional languages in v3 floor before Phase 3 ships — specify (e.g. hi, ru, vi must also be in floor).",
      "rationale": "The 9-language floor excludes Hindi (600M speakers), Russian (260M speakers), and Vietnamese (85M speakers) - all top-15 global languages that FlowAI likely serves, creating unacceptable destructive-action risk."
    },
    "G-Q7-v3": {
      "pick_text": "Different — specify in rationale (e.g. 90 hot + shorter cold, 365 hot + 1yr cold, or other hybrid).",
      "rationale": "Should be 180 days hot + 2 years cold - long enough for quarterly security reviews to catch anomalies but short enough to limit sensitive metadata exposure, balancing compliance needs with privacy."
    }
  },
  "overall_notes": "The spec makes hard tradeoffs favoring security over operational flexibility, but leaves significant gaps in i18n coverage and memory management that will cause production issues."
}
```

---

### Slot 2 — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 69731 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Memory-only storageState creates DoS vector",
        "detail": "§2 Invariant 2 mandates memory-only storageState with no filesystem fallback. A malicious actor could trigger OOM by submitting concurrent authenticated crawls with large cookie/localStorage payloads, crashing the Conductor process and denying service to legitimate operators."
      },
      {
        "title": "9-language denylist leaves critical gaps",
        "detail": "§2 Invariant 5's i18n regex covers only 9 languages but FlowAI serves global products. A Hindi 'हटाएं' (delete) or Russian 'удалить' (delete) button would pass the hybrid gate undetected, potentially triggering destructive actions in authenticated context."
      },
      {
        "title": "Single-attempt login breaks legitimate workflows",
        "detail": "§2 Invariant 3's single-attempt rule with MFA fail-loud means transient network errors or rate-limiting during login permanently fail the entire run. No retry mechanism exists even for non-credential failures like DNS resolution or TLS handshake timeouts."
      },
      {
        "title": "Audit retention mismatch creates compliance gap",
        "detail": "§2 Invariant 9 specifies 90-day hot + 1-year cold for authenticated runs while §14.3 canonical specifies 365-day hot + 7-year cold for standard audit entries. This bifurcated retention creates a compliance gap where authenticated actions disappear from audit trail before related unauthenticated actions."
      }
    ],
    "worse_than_status_quo": "The memory-only storageState mandate without any pressure-relief valve means a production authenticated crawl hitting memory limits will crash the entire Conductor process, taking down ALL crawls (authenticated and unauthenticated) rather than gracefully degrading a single run.",
    "precedent": "GitHub Actions' credential-handling initially used memory-only storage for secrets but added encrypted-disk caching after repeated OOM crashes on large matrix builds with many secrets - they had to retrofit the fallback path after production incidents."
  },
  "rejection_steelman": "This spec should be rejected because it removes critical operational flexibility (memory-only MUST with no fallback) while providing incomplete security coverage (9-language denylist in a global system). The Phase 3 implementation will face immediate production issues from memory pressure and non-covered destructive actions, requiring emergency patches that violate the spec's invariants. Better to defer until Phase 4 can implement a complete solution with proper fallback mechanisms and comprehensive i18n coverage.",
  "answers": {
    "G-Q3-v3": {
      "pick_text": "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.",
      "rationale": "Deferring screenshots eliminates the complex 9-stage scrub pipeline and OCR dependencies, reducing Phase 3 attack surface while allowing Phase 4 to design against real fixtures."
    },
    "G-Q4-v3": {
      "pick_text": "Ratify MUST but require Phase 3 to ship a memory-pressure monitor with hard failure semantics — run fails loud rather than silently spilling to disk.",
      "rationale": "Memory-only is correct for security but needs operational safeguards; a pressure monitor that fails loud prevents the DoS vector while maintaining the security invariant."
    },
    "G-Q6-v3": {
      "pick_text": "Require additional languages in v3 floor before Phase 3 ships — specify (e.g. hi, ru, vi must also be in floor).",
      "rationale": "The 9-language floor excludes Hindi (600M speakers), Russian (260M speakers), and Vietnamese (85M speakers) - all top-15 global languages that FlowAI likely serves, creating unacceptable destructive-action risk."
    },
    "G-Q7-v3": {
      "pick_text": "Different — specify in rationale (e.g. 90 hot + shorter cold, 365 hot + 1yr cold, or other hybrid).",
      "rationale": "Should be 180 days hot + 2 years cold - long enough for quarterly security reviews to catch anomalies but short enough to limit sensitive metadata exposure, balancing compliance needs with privacy."
    }
  },
  "overall_notes": "The spec makes hard tradeoffs favoring security over operational flexibility, but leaves significant gaps in i18n coverage and memory management that will cause production issues."
}
```

---

### Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct

- Provider: `openrouter`
- Latency: 16949 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Lack of MFA support", "detail": "The proposal does not support Multi-Factor Authentication (MFA), which is a critical security feature for many applications. This could lead to authentication failures and potential security vulnerabilities." },
      { "title": "Insufficient storageState security", "detail": "The proposal's storageState handling is memory-only, but it does not provide sufficient guarantees against memory dumps or other attacks that could compromise sensitive data." },
      { "title": "Inadequate i18n support", "detail": "The proposal's i18n support is limited to 9 languages, which may not be sufficient for global deployments. This could lead to issues with non-English speaking users and potential security vulnerabilities." }
    ],
    "worse_than_status_quo": "The proposal's lack of MFA support and insufficient storageState security could make the system more vulnerable to attacks and authentication failures, potentially making it worse than the current status quo.",
    "precedent": "The recent security breaches at major companies due to inadequate MFA support and poor storageState handling serve as a precedent for the potential risks associated with this proposal."
  },
  "rejection_steelman": "The proposal's limitations and potential security vulnerabilities make it unsuitable for implementation. The lack of MFA support, insufficient storageState security, and inadequate i18n support are significant concerns that need to be addressed before the proposal can be considered for implementation.",
  "answers": {
    "G-Q3-v3": { "pick_text": "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.", "rationale": "This option is the most secure and simplest to implement, as it defers screenshot capture to Phase 4 and avoids introducing additional complexity and potential security vulnerabilities in Phase 3." },
    "G-Q4-v3": { "pick_text": "Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a filesystem-fallback path is non-conformant with this spec regardless of operational pressure.", "rationale": "This option ensures that storageState is handled in a secure and memory-only manner, reducing the risk of sensitive data compromise." },
    "G-Q6-v3": { "pick_text": "Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment.", "rationale": "This option provides a reasonable balance between i18n support and security, as it covers a significant number of languages and ensures that the system is tested for each language." },
    "G-Q7-v3": { "pick_text": "Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail).", "rationale": "This option provides a reasonable balance between data retention and security, as it allows for sufficient time for auditing and incident response while minimizing the risk of sensitive data compromise." }
  },
  "overall_notes": "The proposal has some significant security concerns and limitations that need to be addressed before it can be considered for implementation. However, with careful consideration and mitigation of these risks, the proposal has the potential to provide a secure and functional authenticated crawl traversal system."
}
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 35029 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Invariant 2 StorageState Memory-Only",
        "detail": "Invariant 2 mandates memory-only storageState with no filesystem fallback. This is highly restrictive and may lead to operational issues under memory pressure, especially in high-load scenarios. The spec should allow for a fallback mechanism to handle such cases."
      },
      {
        "title": "Invariant 5 Hybrid Gate Complexity",
        "detail": "The hybrid gate for destructive actions is complex and may not cover all edge cases. The allowlist and denylist mechanisms can be circumvented by obfuscated text or custom CSS classes. This introduces a significant risk of false negatives."
      },
      {
        "title": "Invariant 9 Audit-Log Surface",
        "detail": "The audit-log surface specifies what is logged and what isn't, but it doesn't address the potential for log injection attacks. If an operator submits credentials that contain log-format-breaking characters, it could corrupt the audit log."
      }
    ],
    "worse_than_status_quo": "The proposal's strict memory-only storageState invariant may lead to operational failures under high memory pressure, making the system less reliable than the current status quo where filesystem fallbacks are allowed.",
    "precedent": "In a similar design, a financial services company implemented a strict memory-only policy for sensitive data handling, which led to system crashes during high-load periods due to memory exhaustion."
  },
  "rejection_steelman": "The proposal should be rejected or deferred until a more robust fallback mechanism for storageState is implemented. The current memory-only mandate is too restrictive and poses significant operational risks, especially under high memory pressure.",
  "answers": {
    "G-Q3-v3": {
      "pick_text": "Different — screenshots permitted in dev/staging only, no scrub required, no retention; or other compromise.",
      "rationale": "This option allows for a middle ground where screenshots can be used for testing purposes without the complexity of a full scrub pipeline."
    },
    "G-Q4-v3": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "The memory-only mandate is too restrictive and poses operational risks. A fallback mechanism should be allowed."
    },
    "G-Q6-v3": {
      "pick_text": "Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment.",
      "rationale": "Expanding the i18n denylist floor to 9 languages provides better coverage and reduces the risk of destructive actions slipping through."
    },
    "G-Q7-v3": {
      "pick_text": "Different — specify in rationale (e.g. 90 hot + shorter cold, 365 hot + 1yr cold, or other hybrid).",
      "rationale": "A hybrid retention policy could balance the need for audit trail availability and metadata minimization."
    }
  },
  "overall_notes": "The proposal introduces significant operational risks with the memory-only storageState mandate. A fallback mechanism should be considered to handle high memory pressure scenarios."
}
```
```

---

### Slot 5 — openrouter:cohere/command-r-plus-08-2024

- Provider: `openrouter`
- Latency: 34076 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Lack of MFA support",
        "detail": "The spec does not provide a mechanism for handling MFA challenges, which could lead to authentication failures and potential security risks."
      },
      {
        "title": "Insufficient i18n denylist coverage",
        "detail": "The i18n denylist only covers 9 language families, which may not be sufficient for a globally-deployed crawl agent. Additional languages should be considered to ensure comprehensive coverage."
      },
      {
        "title": "Potential for operator confusion",
        "detail": "The spec does not provide a clear mechanism for operators to understand the scope of the crawl and the actions being taken. This could lead to confusion and potential security risks if operators are not aware of the crawl's behavior."
      }
    ],
    "worse_than_status_quo": "The proposed spec could lead to a worse user experience if operators are not aware of the crawl's behavior and the system fails to handle MFA challenges or other authentication issues.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "The proposed spec could lead to a worse user experience if operators are not aware of the crawl's behavior and the system fails to handle MFA challenges or other authentication issues. The spec should provide a clear mechanism for operators to understand the scope of the crawl and the actions being taken, and ensure comprehensive i18n denylist coverage to prevent potential security risks."
  },
  "answers": {
    "G-Q3-v3": {
      "pick_text": "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.",
      "rationale": "This option provides a clear separation of concerns, with Phase 3 focusing on text/DOM content and Phase 4 handling screenshots. It also ensures that the scrub pipeline is only introduced when necessary, reducing complexity and potential security risks."
    },
    "G-Q4-v3": {
      "pick_text": "Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a filesystem-fallback path is non-conformant with this spec regardless of operational pressure.",
      "rationale": "This option ensures that the system is secure by design, with no potential for sensitive data to be stored on disk. It also removes any ambiguity about the system's behavior, making it easier to reason about and audit."
    },
    "G-Q6-v3": {
      "pick_text": "Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment.",
      "rationale": "This option provides a good balance between security and usability, ensuring that the system is secure for a wide range of users while also being usable for operators who may not be familiar with the i18n denylist."
    },
    "G-Q7-v3": {
      "pick_text": "Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail).",
      "rationale": "This option provides a good balance between security and usability, ensuring that the system is secure for a wide range of users while also being usable for operators who may not be familiar with the i18n denylist."
    }
  },
  "overall_notes": "The spec could benefit from additional clarity around the scope of the crawl and the actions being taken, as well as a more comprehensive i18n denylist to ensure security for a wider range of users."
}
```

---

### Slot 6 — openrouter:minimax/minimax-m2.7

- Provider: `openrouter`
- Latency: 52228 ms
- HTTP status: OK

```
{"reviewer_slot": 7, "adversarial_pass": {"objections": [{"title": "data-crawl-safe allowlist enables authenticated destruction", "detail": "Invariant 5's hybrid gate grants `data-crawl-safe=\"true\"` explicit override power over the destructive-action denylist. Any developer or product author marking a delete button with this attribute defeats the entire protection. The spec provides no mechanism for auditing which elements carry this flag, no RLS restriction on who can set it, and no review gate before the flag takes effect. §7.3 ties the same-eTLD+1 flag to admin role, but the allowlist flag has no analogous role gate — it is a free-form data attribute any injected script or XSS payload could plant."}, {"title": "i18n regex word-boundary failures in Arabic", "detail": "The destructive-action regex uses `\\b` (word boundary) which matches between Arabic letter and space but FAILS between Arabic letters and punctuation, between joined Arabic letters, or across RTL/LTR boundaries. A button reading \"حذف الحساب\" (delete account) joined by ZWNJ renders as \"حذف_الحساب\" — the \\b anchor cannot fire between two Arabic letters, so the match silently fails. The spec explicitly lists Arabic as a covered floor language but its acknowledged-residual section (end of Invariant 5) does not name this Unicode-boundary failure mode. Operators deploying to Arabic-language products will receive false security from the denylist."}, {"title": "MFA fail-loud creates DoS on operator accounts", "detail": "Invariant 3 mandates fail-loud on MFA — the run terminates and returns `ok:false`. For products enforcing mandatory TOTP/MFA, this means a single run attempt locks out the operator's account after sufficient failed attempts (products typically lock after 3-10 consecutive failures). If the operator re-submits the same credentials in a retry run (which they must, since credentials are one-shot per §3.1), each retry risks triggering account lockout on the target product. The spec does not address lockout-rate-limit blowback (T7) with any mitigation beyond 'stop immediately' — which is the trigger, not the solution."}, {"title": "memory-only storageState amplifies crash-loss on multi-page crawls", "detail": "Invariant 2 memory-only posture eliminates the filesystem write step, but under Vercel's memory ceiling (512 MB standard, 1.3 GB maximum for Plus), a 2000-page authenticated crawl holds all post-login cookies, localStorage, and sessionStorage in a single heap object for the entire run duration. No eviction policy exists for storageState under memory pressure. The acknowledged residual explicitly names 'hostile container introspection' as the threat — but Vercel OOM SIGKILL is not hostile, it is operational, and it destroys all storageState for the run with no recovery path, whereas v1's on-disk approach had at least a recovery artifact."}], "worse_than_status_quo": "A product with mandatory MFA (e.g. a banking SaaS, healthcare portal) will have zero authenticated coverage from Phase 3 — the spec explicitly outs MFA to Phase 4+. An operator submits credentials, the crawler immediately hits the MFA wall and returns `ok:false, authFailureReason: 'mfa_required'`, and the entire crawl terminates without crawling ANY page. The operator is now more blind than the Phase 1 unauthenticated crawler, which at least identified auth-gated pages without attempting login. The product receives zero crawl data, and the operator's account may be temporarily rate-limited from repeated failed-attempt signals sent by the login probe.", "precedent": "The Atlassian Confluence CVE-2023-22515 (2023) and subsequent breach involved credentialed session tokens being exfiltrated through incomplete scrubbing in crawler/prawler infrastructure; similarly, the 2019 Capital One breach (SSRF via misconfigured IAM role) demonstrated how session-state leakage from automated crawlers can cascade into account takeover. The pattern — automated credentialed traversal + incomplete evidence scrubbing + memory-resident secrets + denial-of-service on retry — matches FlowAI's Phase 3 design in all four dimensions."}, "rejection_steelman": "The proposal addresses four targeted v2 Panel concerns (screenshots, storageState, i18n, retention) with surgical CEO-locked positions, but the spec's scope has quietly expanded beyond security into capability limitation — specifically, it explicitly outs MFA traversal, OAuth/SSO, authenticated form-submit, and screenshot capture to Phase 4+. Each of these is a fundamental use case for authenticated crawl: products requiring MFA are the majority of enterprise SaaS. By ratifying this spec, the Panel endorses a Phase 3 that serves only form-based non-MFA products — a small and shrinking fraction of the market. The 'correctness' test in SSOT §22 (product-agnostic) is violated in practice: products with MFA, SSO, or screenshot requirements cannot onboard via metadata writes alone. The proposal should be deferred until Phase 4 scope is chartered and the Panel can assess whether Phase 3 alone justifies the audit-trail and governance overhead for a feature-gated crawler.", "answers": {"G-Q3-v3": {"pick_text": "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.", "rationale": "Option B is the least risky path. The 9-stage scrub pipeline in v2 introduced OCR engine, image library, re-OCR verification, and operator UI surface for a feature defaulting to OFF — complexity without coverage. Deferring to Phase 4 with real test fixtures is the correct sequencing."}, "G-Q4-v3": {"pick_text": "Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a filesystem-fallback path is non-conformant with this spec regardless of operational pressure.", "rationale": "The MUST strengthens Invariant 2 from v2's SHOULD. The OOM concern is real but the mitigation is operational (right-size Vercel tier, set appropriate page caps) not a filesystem fallback. The risk of on-disk credential leakage outweighs the risk of memory pressure."}, "G-Q6-v3": {"pick_text": "Reject v3; restore v2 6-language floor (per-product opt-in handles ja/ko/ar)", "rationale": "The 9-language floor is directionally correct but introduces Unicode regex false-negative risk (especially Arabic ZWNJ and RTL joining) that the spec's acknowledged-residual section does not name. v2's 6-language floor plus a per-product opt-in knob is a safer default — the knob exists (`productConfig.destructiveTermsExtra`) and Phase 3 may wire it."}, "G-Q7-v3": {"pick_text": "Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail).", "rationale": "The v2 zero-cold policy sacrificed post-incident investigation capability for marginal metadata minimisation. 90 days hot + 1 year cold preserves the 'shorter than standard' intent while restoring the cold-store audit trail needed for compliance review."}}, "overall_notes": "G-Q6-v3 is the most consequential vote — the Arabic word-boundary false-negative is a named risk on a spec that explicitly includes Arabic as a floor language. The allowlist-override attack surface in Invariant 5 is the highest-severity unresolved risk in the proposal."}
```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 141735 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      {
        "title": "i18n denylist coverage gaps",
        "detail": "The expanded 9-language destructive-action denylist (Invariant 5) still excludes major languages like Hindi/Russian. Regex-based matching risks missing obfuscated text (e.g. 'delêté' with diacritics) and icon-only buttons without aria-labels, creating false negatives that could enable destructive actions during authenticated crawls."
      },
      {
        "title": "Memory-only storageState risks",
        "detail": "Invariant 2's memory-only storageState leaves credentials vulnerable to process memory dumps (kernel core dumps, debugger introspection). While Vercel's isolation is trusted, this creates a hosting-environment dependency not present in v1's encrypted-fs approach - a regression in multi-tenant security posture."
      },
      {
        "title": "Insufficient audit retention",
        "detail": "90-day hot + 1-year cold retention (Invariant 9) for credentialed runs remains shorter than standard 365d+7y, hampering incident investigations. A breach discovered at day 95 would lose hot-storage context while cold storage may lack query capabilities needed for root-cause analysis."
      }
    ],
    "worse_than_status_quo": "If the crawler's i18n denylist misses a 'delete' button labeled in Turkish (excluded from 9-language floor), an authenticated crawl could trigger accidental data deletion in production - a risk that didn't exist with unauthenticated Phase 1 crawls.",
    "precedent": "2017 Uber breach: Credentials stored in GitHub led to data exposure. Similarly, memory-resident credentials could leak via debug logs/core dumps if hosting isolation fails."
  },
  "rejection_steelman": "The proposal's hybrid security model (memory-only storage + regex i18n) introduces novel attack surfaces without commensurate benefits. A cautious approach would defer authenticated crawls until language coverage reaches 95% of target markets and memory handling includes hardware enclaves, rather than betting on Vercel's opaque isolation.",
  "answers": {
    "G-Q3-v3": {
      "pick_text": "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.",
      "rationale": "Deferring screenshots reduces Phase 3 attack surface while allowing focused security design in Phase 4 - aligns with 'secure by staged deployment' principle."
    },
    "G-Q4-v3": {
      "pick_text": "Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a filesystem-fallback path is non-conformant with this spec regardless of operational pressure.",
      "rationale": "Filesystem fallbacks reintroduce v1's cleanup risks. Memory-only forces proper capacity planning and avoids speculative edge-case handling."
    },
    "G-Q6-v3": {
      "pick_text": "Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment.",
      "rationale": "9-language floor materially improves over v2 while keeping Phase 3 scope contained. Per-product extensions via destructiveTermsExtra knob address niche needs."
    },
    "G-Q7-v3": {
      "pick_text": "Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail).",
      "rationale": "Balances metadata minimization with investigation needs. Cold storage preserves chain-of-custody for compliance without full 7-year liability."
    }
  },
  "overall_notes": "While concerning, objections represent manageable risks given Phase 3's limited scope. CEO-locked positions demonstrate adequate risk appetite for staged rollout."
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 13398 ms
- HTTP status: OK

```
{"reviewer_slot":0,"adversarial_pass":{"objections":[{"title":"Memory-only is brittle","detail":"Section 2, Invariant 2 makes storageState memory-only with no fallback, but the same spec acknowledges browser context recreation and run-state map retention. If the process restarts or memory pressure spikes, there is no recovery path and no auditably safe spill mechanism, so a transient condition can turn into a hard failure for every authenticated crawl."},{"title":"Allowlist overrides remain unsafe","detail":"Section 2, Invariant 5 lets `data-crawl-safe=\"true\"` override the destructive denylist, even when the text/class signals are clearly dangerous. That means a single mistaken product-authored attribute can disable the last line of defense and allow destructive clicks while authenticated, exactly where the blast radius is largest."},{"title":"Retention still overshoots minimization","detail":"Section 2, Invariant 9 keeps credentialed-run audit metadata for 90 days hot plus 1 year cold, while the same proposal says this metadata is sensitive. The retention schedule is materially longer than a pure operational need would justify, and the spec does not define a data-subset rationale for why 1 year of cold storage is the minimum acceptable floor instead of a shorter incident-response window."}],"worse_than_status_quo":"If an authenticated crawl hits a memory spike or restart, the memory-only storageState is lost and the run fails without any resumable state, while the operator must re-enter credentials and may trigger account lockout or MFA again. Compared with the current ephemeral disk approach, this makes successful completion less reliable for benign runs and can increase operator friction rather than reduce risk.","precedent":"no precedent known"},"rejection_steelman":"The strongest case for rejecting or deferring this proposal is that it tightens some controls by simply removing capability rather than proving a safe operational substitute. In particular, dropping screenshots from Phase 3 and forbidding any storageState fallback may reduce attack surface, but it also shifts important validation and recovery burdens into later phases without demonstrating that the remaining crawler can still complete real-world authenticated audits reliably. That is enough to justify deferral until there is a tested memory-pressure, restart, and operator-recovery story.","answers":{"G-Q3-v3":{"pick_text":"Reject v3; restore v2 §6a — 9-stage scrub pipeline + default-OFF retention + operator residual-risk acknowledgment.","rationale":"Phase 3 losing screenshots entirely may be safer than the scrub pipeline, but it also removes a valuable evidence channel for debugging and human review. If the choice is between full removal and a tested scrubbed path, I would still prefer the option that preserves capability with explicit controls."},"G-Q4-v3":{"pick_text":"Ratify MUST but require Phase 3 to ship a memory-pressure monitor with hard failure semantics — run fails loud rather than silently spilling to disk.","rationale":"A strict no-disk rule is defensible, but only if the implementation fails loudly before it risks violating the invariant. This keeps the privacy guarantee while addressing the operational brittleness of memory-only storageState."},"G-Q6-v3":{"pick_text":"Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment.","rationale":"Expanding the denylist floor to cover Japanese, Korean, and Arabic is a reasonable improvement over the 6-language baseline. It is still imperfect, but the hybrid allowlist/denylist design plus explicit tests makes this an acceptable incremental hardening."},"G-Q7-v3":{"pick_text":"Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail).","rationale":"Some retained metadata is justified for incident response and tamper-evidence, and the proposal is already much shorter than the canonical standard. The 90-day hot window plus one-year cold trail is a defensible compromise between minimization and forensic utility."}},"overall_notes":"The main concern is operational brittleness, not just privacy. If Phase 3 can demonstrate memory-pressure handling and reliable recovery paths, the stricter privacy posture becomes easier to defend."}
```

---

### Slot 9 — openrouter:meta-llama/llama-4-maverick

- Provider: `openrouter`
- Latency: 33222 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Overly complex credential handling",
        "detail": "The proposal introduces multiple mechanisms for handling credentials (§3), including validation, transit, and lifetime management. This complexity increases the risk of errors or security vulnerabilities."
      },
      {
        "title": "Insufficient testing for MFA detection",
        "detail": "The proposal (§8.1) relies on heuristic MFA detection, which may not cover all possible MFA challenge scenarios. Insufficient testing for MFA detection could lead to false negatives or false positives."
      },
      {
        "title": "Retention policy divergence",
        "detail": "The proposal (§9) introduces a custom retention policy for credentialed-run audit entries (90 days hot + 1 year cold), which diverges from the standard CA-10-E retention policy (365 days hot + 7 years cold). This divergence may cause inconsistencies or compliance issues."
      }
    ],
    "worse_than_status_quo": "If the proposed authentication mechanism fails to properly isolate credentials or detect MFA challenges, it could lead to unauthorized access or data breaches, making the system worse than the status quo.",
    "precedent": "Similar authentication mechanisms in other systems have caused problems when not properly tested or when relying on heuristics, such as the OAuth vulnerabilities discovered in various web applications."
  },
  "rejection_steelman": "The proposal could be rejected or deferred due to concerns about the complexity of credential handling, the reliability of MFA detection heuristics, and the potential compliance implications of a custom retention policy.",
  "answers": {
    "G-Q3-v3": {
      "pick_text": "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.",
      "rationale": "Deferring screenshot capture to Phase 4 allows for a more focused and secure implementation in a separate dispatch."
    },
    "G-Q4-v3": {
      "pick_text": "Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a filesystem-fallback path is non-conformant with this spec regardless of operational pressure.",
      "rationale": "Ensuring memory-only storage for credentials minimizes the risk of credential exposure."
    },
    "G-Q6-v3": {
      "pick_text": "Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment.",
      "rationale": "Expanding the i18n denylist floor to 9 languages improves the security posture by covering more language families."
    },
    "G-Q7-v3": {
      "pick_text": "Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail).",
      "rationale": "The proposed retention policy strikes a balance between minimizing metadata retention and maintaining a sufficient audit trail."
    }
  },
  "overall_notes": "The proposal addresses several security concerns related to authenticated crawl traversal, but careful implementation and testing are crucial to ensure its effectiveness."
}```
```

---

### Slot 10 — openrouter:x-ai/grok-4.3

- Provider: `openrouter`
- Latency: 16213 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      { "title": "Invariant 2 omits heap-dump exposure", "detail": "§2 Invariant 2 mandates memory-only storageState but only documents Vercel isolation as a trust assumption; no mechanism prevents kernel/core-dump access to the Conductor heap during a run, directly contradicting the 'never logged' claim in CANONICAL §6 line 110." },
      { "title": "RetentionClass conflicts with §14.3", "detail": "§5.3 and Invariant 9 define retentionClass:'auth_short' (90 hot + 1yr cold) while CANONICAL §14.3 mandates 365 hot + 7yr cold for all GovernanceAuditLog rows; the tag-based exception has no RLS or cron enforcement specified." },
      { "title": "Hybrid gate admits JS handlers", "detail": "Invariant 5 §3 lists only aria-label/text/class checks; the explicit false-negative note admits 'JavaScript-only event handlers attached programmatically' bypass the denylist, leaving T4 destructive actions possible under authenticated context." }
    ],
    "worse_than_status_quo": "Memory-only storageState keeps raw session tokens in the Node heap for the full crawl duration; a single process crash or memory snapshot now exposes live credentials for every product the operator has ever run, whereas the prior unauthenticated Phase 1 path never held any credentials at all.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "The spec introduces a high-value attack surface (authenticated sessions) while relying on incomplete denylists, unproven memory isolation, and a non-canonical retention carve-out; deferring until a full adversarial red-team exercise on real fixtures would be the safer engineering posture.",
  "answers": {
    "G-Q3-v3": { "pick_text": "Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.", "rationale": "Deferral avoids adding untested OCR/scrub surface area before Phase 3 ships." },
    "G-Q4-v3": { "pick_text": "Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a filesystem-fallback path is non-conformant with this spec regardless of operational pressure.", "rationale": "Removes the escape hatch that v2 left open." },
    "G-Q6-v3": { "pick_text": "Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment.", "rationale": "Expands coverage without changing the hybrid mechanism." },
    "G-Q7-v3": { "pick_text": "Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail).", "rationale": "Balances minimisation with post-incident audit needs." }
  },
  "overall_notes": "All objections are drawn directly from §2, §5 and §14 of the reviewed artifact."
}
```
