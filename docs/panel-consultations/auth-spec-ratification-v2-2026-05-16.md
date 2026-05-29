# Panel Consultation — Phase 2 Auth-Traversal Security Spec v2 — ADVERSARIAL RE-RATIFICATION (2026-05-16)

**Mode:** ADVERSARIAL — locked W5b format (precondition: `b1cd827` / `ad2ab28` / `3f9dede` MET).

**Spec under re-ratification:** `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` (v2, commit `b782e2f`, 784 lines).

**Carried questions from v1 (NOT re-voted):** G-Q1 SUPERMAJORITY_GQ1-REFUSE (8/9), G-Q5 SUPERMAJORITY_GQ5-STRICT (8/9). v2 keeps both verbatim.

**Re-vote questions in this run:** 5 (G-Q2-v2, G-Q3-v2, G-Q4-v2, G-Q6-v2, G-Q7-v2) — the 5 questions that did not clear quorum in v1.

**Started:** 2026-05-16T21:11:44.626Z
**Finished:** 2026-05-16T21:15:56.972Z
**Bundle size:** 89636 chars (compact §6+§13+§14+§22+§25 canonical excerpt + full v2 spec).
**Panel audit:** {"providerCounts":{"openai":1,"anthropic":1,"meta-llama":2,"mistralai":1,"cohere":1,"minimax":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"auditPass":true}
**Seed:** `auth-spec-v2-ratification-2026-05-16`

---

## 🚨 PLAIN RATIFICATION VERDICT

**Status:** `NOT_RATIFIED`

Spec v2 NOT ratified — 4 re-vote question(s) still lack a clear Panel majority. W5a must address each before Phase 3 may proceed.

**Re-vote conditions still outstanding:**
1. **G-Q3-v2** — Screenshot scrub pipeline + residual-risk disclosure + default-OFF retention (new §6a)
   - Verdict: `PLURALITY_GQ3v2-ADMIN`. v2 spec position (key `GQ3v2-PIPE`, "Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, operator acknowledges residual risk; DISCARD-on-scrub…") did NOT reach Panel quorum. 4 of 9 on GQ3v2-ADMIN (below 7/10 quorum).

2. **G-Q4-v2** — storageState memory-only (v2 mandates Playwright in-memory return; eliminates filesystem path)
   - Verdict: `PLURALITY_GQ4v2-MEM`. v2 spec position (key `GQ4v2-MEM`, "Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` returns object o…") did NOT reach Panel quorum. 6 of 9 on GQ4v2-MEM (below 7/10 quorum).

3. **G-Q6-v2** — Destructive-action gate: hybrid allowlist + i18n-aware denylist in 6 languages
   - Verdict: `SPLIT`. v2 spec position (key `GQ6v2-HYBRID`, "Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe="true" allowlist (highest priority) + form-submit denyl…") did NOT reach Panel quorum. top tie at 3 between GQ6v2-HYBRID / GQ6v2-MORE.

4. **G-Q7-v2** — Audit retention for credentialed runs: auth_short class (30 hot, 0 cold)
   - Verdict: `PLURALITY_GQ7v2-MID`. v2 spec position (key `GQ7v2-SHORT`, "Ratify v2 short-retention as proposed — retentionClass:"auth_short" = 30 days hot, NO cold storage.…") did NOT reach Panel quorum. 4 of 9 on GQ7v2-MID (below 7/10 quorum).



---

## DISSENT-FLOOR EVALUATION (Control 4)

Drafted-direction alignment across 5 re-vote questions:
  Aligned: **23 of 45** ENGAGED votes  (51.1 %)
  Distinct substantive objections: **30**

**✅ Dissent floor PASSED — verdict valid.** alignment 51.1 %, distinct objections 30.

---

## Slot status

| Slot | Provider | Model | Region/Role | Backup? | Status | Adv state | Invalid reason |
|------|----------|-------|-------------|---------|--------|-----------|----------------|
| 1 | openrouter | `anthropic/claude-opus-4` | US · frontier reasoning | YES → openrouter:anthropic/claude-opus-4 | LIVE-OK | `ENGAGED` | — |
| 2 | openrouter | `anthropic/claude-opus-4` | US · reasoning | — | LIVE-OK | `ENGAGED` | — |
| 3 | openrouter | `meta-llama/llama-3.3-70b-instruct` | US · frontier reasoning (post-Gemini-demote 2026-05-16) | — | LIVE-OK | `ENGAGED` | — |
| 4 | openrouter | `mistralai/mistral-large-2411` | Europe · European frontier | — | LIVE-OK | `TANGENTIAL` | 4/5 votes parsed |
| 5 | openrouter | `mistralai/mistral-large-2411` | Europe/CA · European RAG-tuned | YES → openrouter:mistralai/mistral-large-2411 | LIVE-OK | `ENGAGED` | — |
| 6 | openrouter | `minimax/minimax-m2.7` | Asia · Asia generalist | — | LIVE-OK | `ENGAGED` | — |
| 7 | openrouter | `deepseek/deepseek-r1` | Asia · Asia reasoning | — | LIVE-OK | `ENGAGED` | — |
| 8 | openrouter | `perplexity/sonar` | US web-grounded · web-grounded research | — | LIVE-OK | `ENGAGED` | — |
| 9 | openrouter | `meta-llama/llama-4-maverick` | Asia (Beijing → US/Meta after swap) · frontier coding + agentic | — | LIVE-OK | `ENGAGED` | — |
| 10 | openrouter | `x-ai/grok-4.3` | US · real-time web-aware reasoning | — | LIVE-OK | `ENGAGED` | — |

LIVE-OK: 10/10. Backups applied: 2. Quorum met (≥7 LIVE-OK): true.
Adversarial classification: ENGAGED=9, TANGENTIAL=1, INVALID=0, SILENT=0.

---

## Per-question tally

| Q | Topic | Top key | Top count | Verdict |
|---|---|---|---:|---|
| **G-Q2-v2** | MFA handling (v2 fail-loud adopted per CEO + v1 plurali | `GQ2v2-LOUD` | 8 / 9 | `SUPERMAJORITY_GQ2v2-LOUD` |
| **G-Q3-v2** | Screenshot scrub pipeline + residual-risk disclosure +  | `GQ3v2-ADMIN` | 4 / 9 | `PLURALITY_GQ3v2-ADMIN` |
| **G-Q4-v2** | storageState memory-only (v2 mandates Playwright in-mem | `GQ4v2-MEM` | 6 / 9 | `PLURALITY_GQ4v2-MEM` |
| **G-Q6-v2** | Destructive-action gate: hybrid allowlist + i18n-aware  | `GQ6v2-HYBRID` | 3 / 9 | `SPLIT` |
| **G-Q7-v2** | Audit retention for credentialed runs: auth_short class | `GQ7v2-MID` | 4 / 9 | `PLURALITY_GQ7v2-MID` |

### Per-question detail

### G-Q2-v2 — MFA handling (v2 fail-loud adopted per CEO + v1 plurality intent)

Tally (ENGAGED-only, 9):
  - `GQ2v2-LOUD` "Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"; run STOPS; no continue-unauthenticated"  →  **8**
  - `GQ2v2-V1` "Reject v2 fail-loud; revert to v1 "continue unauthenticated" silent path (the previously rejected position)."  →  **0**
  - `GQ2v2-CONFIG` "Configurable per run — operator picks fail-loud vs continue-unauth at launch."  →  **0**
  - `GQ2v2-OTHER` "Different — describe in rationale."  →  **0**
  - `REJECT` (free-text REJECT bucket) → 1

**Verdict:** `SUPERMAJORITY_GQ2v2-LOUD` — 8 of 9 on GQ2v2-LOUD (≥ 8/10).

### G-Q3-v2 — Screenshot scrub pipeline + residual-risk disclosure + default-OFF retention (new §6a)

Tally (ENGAGED-only, 9):
  - `GQ3v2-PIPE` "Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, operator acknowledges residual risk; DISCAR"  →  **3**
  - `GQ3v2-NOPNG` "Reject v2; revert to v1 GQ3-NO-PNG (Phase 3 ships with NO screenshot retention at all)."  →  **0**
  - `GQ3v2-ADMIN` "Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operator cannot self-enable even in dev/staging"  →  **4**
  - `GQ3v2-OTHER` "Different — describe in rationale (e.g. additional detection patterns required; specific residual-risk language change)."  →  **0**
  - `REJECT` (free-text REJECT bucket) → 2

**Verdict:** `PLURALITY_GQ3v2-ADMIN` — 4 of 9 on GQ3v2-ADMIN (below 7/10 quorum).

### G-Q4-v2 — storageState memory-only (v2 mandates Playwright in-memory return; eliminates filesystem path)

Tally (ENGAGED-only, 9):
  - `GQ4v2-MEM` "Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` return"  →  **6**
  - `GQ4v2-FS` "Reject v2 memory-only; reinstate v1 filesystem path with cleanup-verification fix."  →  **0**
  - `GQ4v2-FB` "Accept memory-only as primary; allow opt-in encrypted-fs fallback if memory pressure becomes a Phase 3 concern (per-run flag, admi"  →  **2**
  - `GQ4v2-OTHER` "Different — describe in rationale."  →  **0**
  - `REJECT` (free-text REJECT bucket) → 1

**Verdict:** `PLURALITY_GQ4v2-MEM` — 6 of 9 on GQ4v2-MEM (below 7/10 quorum).

### G-Q6-v2 — Destructive-action gate: hybrid allowlist + i18n-aware denylist in 6 languages

Tally (ENGAGED-only, 9):
  - `GQ6v2-HYBRID` "Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe="true" allowlist (highest priority) + form-su"  →  **3**
  - `GQ6v2-MORE` "Ratify hybrid but require additional language families in floor — specify which (e.g. ja, ko, ar must be in Phase 3 floor too)."  →  **3**
  - `GQ6v2-ALLOW` "Ratify hybrid but require allowlist-only path — only data-crawl-safe="true" is clickable; accept dramatic loss of click-everything"  →  **0**
  - `GQ6v2-OTHER` "Different — describe in rationale."  →  **1**
  - `REJECT` (free-text REJECT bucket) → 2

**Verdict:** `SPLIT` — top tie at 3 between GQ6v2-HYBRID / GQ6v2-MORE.

### G-Q7-v2 — Audit retention for credentialed runs: auth_short class (30 hot, 0 cold)

Tally (ENGAGED-only, 9):
  - `GQ7v2-SHORT` "Ratify v2 short-retention as proposed — retentionClass:"auth_short" = 30 days hot, NO cold storage."  →  **3**
  - `GQ7v2-STD` "Reject v2 short-retention; revert to v1 standard (365 hot + 7yr cold)."  →  **0**
  - `GQ7v2-MID` "Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all."  →  **4**
  - `GQ7v2-OTHER` "Different — describe in rationale."  →  **0**
  - `REJECT` (free-text REJECT bucket) → 2

**Verdict:** `PLURALITY_GQ7v2-MID` — 4 of 9 on GQ7v2-MID (below 7/10 quorum).


---

## All distinct substantive objections (verbatim)

Total distinct: **30**

**01. [Slot 1] Memory-only storageState creates OOM risk**

> §2 Invariant 2 mandates holding all authenticated session states in JS heap memory with no filesystem fallback. For concurrent authenticated crawls or large session data (extensive localStorage/cookies), this creates memory pressure that could crash the Conductor process, losing ALL in-flight authenticated sessions.

**02. [Slot 1] Screenshot scrub pipeline false negatives**

> §6a.4 OCR-based pattern matching will miss credentials rendered as images, CSS-obfuscated text, or canvas-rendered content. The 'REDACTED badge' in §6a.5 gives false confidence when the pipeline cannot detect non-text credential displays that §6a.6 explicitly acknowledges.

**03. [Slot 1] 30-day audit retention breaks compliance**

> §5 Invariant 9 specifies 30-day hot retention with NO cold storage for authenticated crawls. This violates standard audit practices and could fail regulatory requirements that mandate longer retention for security-relevant events, creating legal exposure.

**04. [Slot 1] Hybrid denylist scales poorly internationally**

> §2 Invariant 5's i18n regex covers only 6 languages but §10 explicitly defers ja/ko/ar/hi/ru coverage. Products serving Asian/Middle Eastern markets will have undetected destructive buttons, making the authenticated crawler unsafe for global deployment.

**05. [Slot 3] Insufficient MFA Handling**

> The proposal does not provide a comprehensive solution for handling Multi-Factor Authentication (MFA) challenges. It simply fails loud and stops the run when an MFA challenge is encountered, which may not be sufficient for all use cases.

**06. [Slot 3] Potential for Credential Exposure**

> The use of a memory-only storageState object may not be enough to prevent credential exposure, especially in the event of a process crash or memory dump. Additional measures should be taken to ensure the security of credentials.

**07. [Slot 3] Inadequate Screenshot Scrubbing**

> The screenshot scrubbing pipeline may not be able to detect and redact all sensitive information, such as custom CSS-styled credential displays or obfuscated tokens. This could lead to unintended exposure of sensitive data.

**08. [Slot 4] Unclear Screenshot Scrubbing**

> The screenshot scrubbing pipeline, while extensive, does not cover all edge cases. For example, it may miss credentials rendered using unconventional methods such as CSS-styled credential displays or obfuscated tokens. This could lead to sensitive information being inadvertently retained. §6a.6 acknowledges some of these limitations but does not provide a complete solution.

**09. [Slot 4] Complexity of Hybrid Allowlist**

> The hybrid allowlist and denylist approach for destructive actions adds complexity to the system. This complexity could introduce new bugs or make the system harder to maintain. The denylist, while comprehensive, may still miss edge cases, especially in languages not covered by the initial 6 language families. §6a and §10 outline the limitations but do not fully mitigate the risks.

**10. [Slot 4] StorageState Memory Management**

> While the memory-only approach for storageState eliminates the filesystem cleanup issues, it introduces new risks. For example, if the process crashes or is killed mid-run, the in-memory storageState could be lost, leading to incomplete or inconsistent states. This is acknowledged in §10 but not fully addressed. Additionally, the memory-only approach does not account for potential memory pressure issues that could arise during high-load scenarios.

**11. [Slot 5] Invariant 3 non-compliance**

> The proposal to fail-loud on MFA detection may not cover all MFA scenarios, especially adaptive MFA which might not present a clear challenge on the first login attempt. This could lead to false negatives where MFA is not detected, and the system erroneously proceeds with authentication.

**12. [Slot 5] Incomplete destructive action gate**

> The hybrid gate for destructive actions relies heavily on heuristics and may not cover all edge cases, especially for non-standard UI elements. This could lead to unintended destructive actions being performed during the crawl.

**13. [Slot 5] Screenshot scrub pipeline limitations**

> The screenshot scrub pipeline, while comprehensive, may still miss certain types of sensitive information, especially those rendered in non-standard ways. This could lead to sensitive data being retained in screenshots despite the scrubbing process.

**14. [Slot 6] §6a Stage 7 re-OCR verification is logically broken**

> The Stage 7 verification step claims that re-OCRing the redacted PNG and checking for 'original sensitive tokens' proves redaction succeeded. This is false: if the Stage 3 OCR misread a character (e.g., 'O' vs '0', 'l' vs '1'), the redaction was applied to the wrong location, and re-OCR will also misread it — producing a 'pass' that is actually a failure. The verification only catches the case where original-OCR succeeded but redaction failed; it cannot catch the case where original-OCR itself failed. This creates a false confidence interval around the scrub pipeline's effectiveness.

**15. [Slot 6] §6a.4 API-key pattern floor is dangerously incomplete**

> The scrub pipeline covers OpenAI sk-, Anthropic sk-ant-, Stripe sk_live/test_, and GitHub ghp/gho/ghu/ghs/ghr patterns. It omits AWS AKIA*, Google Cloud, Azure, Twilio, SendGrid, Mapbox, and dozens of other common API-key formats that appear in authenticated-session screenshots. A product that uses Google Cloud service-account credentials or AWS keys in its UI would have those keys pass through the scrub pipeline undetected. The 'floor list above is the minimum for v2' disclaimer in §6a.4 does not fix the operational risk — it documents it.

**16. [Slot 6] §5 retention 'auth_short' creates compliance dead zone**

> Invariant 9 / §5 specifies 30 days hot + NO cold storage for credentialed-run audit records. The spec acknowledges these records contain sensitive metadata (URLs visited, timing, product structure). If a security incident, breach disclosure, or subpoena arrives at day 31, those records are gone — permanently. The cold snapshot exclusion means there is no recovery path. This is worse than the standard 365-day retention: a breach investigation requiring historical credentialed-run context has no data to analyze.

**17. [Slot 6] Invariant 5 allowlist override trusts product authors without verification**

> The hybrid gate grants `data-crawl-safe='true'` the highest priority — it overrides the destructive denylist entirely. The spec assumes product authors are trusted to self-audit their own buttons. There is no mechanism to verify that a button marked safe has actually been audited, nor any revocation path if a product author marks a destructive button as safe. A malicious or careless product author can cause the authenticated crawler to click a delete/logout/terminate button and the denylist provides zero protection.

**18. [Slot 6] §13 engineering scope contradicts Invariant 2**

> Invariant 2 mandates memory-only storageState with no filesystem path, and explicitly states 'The cleanup-sweep helper (scripts/cleanup-orphaned-storage-state.mjs) from v1 is removed from scope.' Yet the Phase 3 engineering scope estimate in §13 lists 'Cleanup sweep helper (scripts/cleanup-orphaned-storage-state.mjs) + scheduled trigger' at 1 W-day. This is a direct contradiction — either the cleanup helper is in scope or it is not. The spec cannot simultaneously claim filesystem elimination and include filesystem cleanup work.

**19. [Slot 7] MFA detection heuristics**

> Invariant 3's MFA detection relies on DOM selectors and regex patterns that could miss non-standard MFA implementations (e.g., biometric prompts or proprietary 2FA widgets). This creates false negatives where crawlers hit unhandled MFA walls without proper detection.

**20. [Slot 7] i18n denylist coverage gaps**

> The 6-language destructive-action denylist in §Invariant5 leaves Japanese, Arabic, and other common languages uncovered. A product using '削除' (Japanese 'delete') or 'حذف' (Arabic 'remove') would bypass detection, enabling destructive actions during authenticated crawls.

**21. [Slot 7] OCR scrub residual risk**

> §6a's screenshot scrub pipeline cannot detect credentials rendered via CSS-obfuscated text (e.g., negative letter-spacing) or background-image text. This creates undetectable PII leakage vectors even with operator acknowledgment.

**22. [Slot 8] Memory-only is overstated**

> §4.1 and §2 Invariant 2 treat Playwright `storageState` as memory-only and dismiss the filesystem race entirely, but the proposal still depends on Chromium/Node process memory and IPC. A crash dump, debugger attach, container escape, or hosting introspection could still expose the session object, so the claimed elimination of the storage residue problem is stronger than the mechanism warrants.

**23. [Slot 8] Screenshot scrub has blind spots**

> §6a.3–§6a.6 rely on OCR plus regex redaction, but the spec itself admits custom CSS, obfuscated tokens, and non-text credentials can slip through. That means the system may persist retained authenticated screenshots that look scrubbed yet still contain secrets in pixels, which is a direct confidentiality regression if operators trust the redaction badge.

**24. [Slot 8] Hybrid denylist can click destructive UI**

> §2 Invariant 5 allows any element with `data-crawl-safe="true"` to bypass the destructive denylist, and also allows clicks on buttons not matched by the regex. In a real product, a malicious or mistaken developer could mark a dangerous control safe, or use an unrecognized locale/class, causing the crawler to invoke state-changing actions while authenticated.

**25. [Slot 9] MFA handling ambiguity**

> The proposal's MFA handling (G-Q2-v2) does not specify how the system determines an MFA challenge. The heuristic (presence of 'data-mfa' or specific text patterns) may not cover all MFA implementations.

**26. [Slot 9] Screenshot scrub pipeline limitations**

> The proposed 9-stage scrub pipeline (§6a) has acknowledged residual risks, including custom CSS-styled credential displays and obfuscated tokens, which could lead to sensitive information leakage.

**27. [Slot 9] Destructive-action gate false negatives**

> The hybrid gate (§6a.3) for destructive actions has a denylist that may not be comprehensive across all languages and implementations, potentially allowing harmful actions to be executed.

**28. [Slot 10] Incomplete i18n denylist coverage**

> Invariant 5's hybrid gate in §2 only defines a 6-language regex (en/es/fr/pt/de/zh-CN) plus data-crawl-safe allowlist; §10 explicitly defers ja/ko/ar/hi/ru and acknowledges custom CSS or JS handlers as false-negative vectors, leaving destructive clicks possible on non-covered locales.

**29. [Slot 10] OCR-dependent screenshot scrub flaws**

> §6a.3 Stage 7 re-OCR verification only catches post-redaction failures; §6a.6 lists OCR misreads (O/0, l/1), exotic CSS letter-spacing, and post-capture JS injection as uncaught residuals, yet still permits persistence after operator ack in dev/staging.

**30. [Slot 10] Retention divergence from canonical**

> Invariant 9 tags credentialed runs with retentionClass:'auth_short' (30 hot, 0 cold) in §5, conflicting with CANONICAL_REFERENCE.md §14.3's mandatory 365+7yr GovernanceAuditLog pattern without an explicit override or RLS carve-out mechanism.


---

## Strongest single argument AGAINST v2 spec (longest rejection steelman)

**From Slot 6 (openrouter:minimax/minimax-m2.7):**

> The proposal addresses 5 v1 NOT_RATIFIED conditions but introduces compounding complexity that makes the Phase 3 implementation harder to verify and audit. The 9-stage scrub pipeline adds a new attack surface (OCR engine, image processing, re-OCR verification logic) that itself requires security review. The hybrid allowlist/denylist requires i18n maintenance across 6 language families with documented false-negative gaps. The memory-only storageState, while eliminating the filesystem race, shifts risk to process-memory exposure without a defined threat model for that vector. A simpler v1 that ships authenticated crawl WITHOUT screenshots and WITHOUT persistent storageState would be safer and faster to ratify — the scrub pipeline can be added in Phase 4 once the core auth traversal is proven stable. Deferring the proposal to a Phase 4 scrub pipeline dispatch allows the Panel to review the scrub implementation in isolation against real test fixtures rather than against a spec.

---

## Per-reviewer adversarial pass + steelman + votes

## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Memory-only storageState creates OOM risk**

> §2 Invariant 2 mandates holding all authenticated session states in JS heap memory with no filesystem fallback. For concurrent authenticated crawls or large session data (extensive localStorage/cookies), this creates memory pressure that could crash the Conductor process, losing ALL in-flight authenticated sessions.

**Objection 2 — Screenshot scrub pipeline false negatives**

> §6a.4 OCR-based pattern matching will miss credentials rendered as images, CSS-obfuscated text, or canvas-rendered content. The 'REDACTED badge' in §6a.5 gives false confidence when the pipeline cannot detect non-text credential displays that §6a.6 explicitly acknowledges.

**Objection 3 — 30-day audit retention breaks compliance**

> §5 Invariant 9 specifies 30-day hot retention with NO cold storage for authenticated crawls. This violates standard audit practices and could fail regulatory requirements that mandate longer retention for security-relevant events, creating legal exposure.

**Objection 4 — Hybrid denylist scales poorly internationally**

> §2 Invariant 5's i18n regex covers only 6 languages but §10 explicitly defers ja/ko/ar/hi/ru coverage. Products serving Asian/Middle Eastern markets will have undetected destructive buttons, making the authenticated crawler unsafe for global deployment.

**Worse-than-status-quo scenario:** The v2 memory-only storageState approach eliminates the filesystem cleanup race but introduces a worse failure mode: under memory pressure, ALL concurrent authenticated sessions crash together, whereas v1's filesystem approach would have isolated failures.

**Precedent:** Puppeteer's memory leak issues with large numbers of browser contexts (github.com/puppeteer/puppeteer/issues/1223) caused production outages when teams migrated from disk-based to memory-only session management without proper memory limits.

### Rejection steelman

> This spec should be rejected because it trades one set of security risks (filesystem exposure) for operational risks (memory exhaustion) while providing incomplete protection via OCR-based screenshot scrubbing that cannot detect modern credential rendering techniques. The 30-day audit retention violates both the canonical 365-day standard and likely compliance requirements, and the 6-language denylist leaves most of the world's destructive UI patterns undetected.

### Votes

- **G-Q2-v2** = `GQ2v2-LOUD` — Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"
  > Fail-loud eliminates ambiguity about whether credentials were actually used, which is critical for security auditing and operator awareness.
- **G-Q3-v2** = `GQ3v2-ADMIN` — Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operato
  > The OCR-based scrubbing has too many acknowledged blind spots in §6a.6; requiring admin approval adds a human review gate for the residual risk.
- **G-Q4-v2** = `GQ4v2-FB` — Accept memory-only as primary; allow opt-in encrypted-fs fallback if memory pressure becom
  > Pure memory-only will hit scaling limits; an encrypted filesystem escape hatch preserves the security benefits while allowing operational flexibility.
- **G-Q6-v2** = `GQ6v2-MORE` — Ratify hybrid but require additional language families in floor — specify which (e.g. ja, 
  > The 6-language floor excludes major markets; at minimum Japanese, Korean, and Arabic must be included to avoid creating geographic security gaps.
- **G-Q7-v2** = `GQ7v2-MID` — Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all.
  > Zero cold storage for security-relevant audit events violates standard compliance practices; a 1-year cold compromise balances privacy with audit requirements.

Overall: The spec makes reasonable security/usability tradeoffs but underestimates operational risks from memory pressure and international coverage gaps.

---

## Slot 2 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Memory-only storageState creates OOM risk**

> §2 Invariant 2 mandates holding all authenticated session states in JS heap memory with no filesystem fallback. For concurrent authenticated crawls or large session data (extensive localStorage/cookies), this creates memory pressure that could crash the Conductor process, losing ALL in-flight authenticated sessions.

**Objection 2 — Screenshot scrub pipeline false negatives**

> §6a.4 OCR-based pattern matching will miss credentials rendered as images, CSS-obfuscated text, or canvas-rendered content. The 'REDACTED badge' in §6a.5 gives false confidence when the pipeline cannot detect non-text credential displays that §6a.6 explicitly acknowledges.

**Objection 3 — 30-day audit retention breaks compliance**

> §5 Invariant 9 specifies 30-day hot retention with NO cold storage for authenticated crawls. This violates standard audit practices and could fail regulatory requirements that mandate longer retention for security-relevant events, creating legal exposure.

**Objection 4 — Hybrid denylist scales poorly internationally**

> §2 Invariant 5's i18n regex covers only 6 languages but §10 explicitly defers ja/ko/ar/hi/ru coverage. Products serving Asian/Middle Eastern markets will have undetected destructive buttons, making the authenticated crawler unsafe for global deployment.

**Worse-than-status-quo scenario:** The v2 memory-only storageState approach eliminates the filesystem cleanup race but introduces a worse failure mode: under memory pressure, ALL concurrent authenticated sessions crash together, whereas v1's filesystem approach would have isolated failures.

**Precedent:** Puppeteer's memory leak issues with large numbers of browser contexts (github.com/puppeteer/puppeteer/issues/1223) caused production outages when teams migrated from disk-based to memory-only session management without proper memory limits.

### Rejection steelman

> This spec should be rejected because it trades one set of security risks (filesystem exposure) for operational risks (memory exhaustion) while providing incomplete protection via OCR-based screenshot scrubbing that cannot detect modern credential rendering techniques. The 30-day audit retention violates both the canonical 365-day standard and likely compliance requirements, and the 6-language denylist leaves most of the world's destructive UI patterns undetected.

### Votes

- **G-Q2-v2** = `GQ2v2-LOUD` — Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"
  > Fail-loud eliminates ambiguity about whether credentials were actually used, which is critical for security auditing and operator awareness.
- **G-Q3-v2** = `GQ3v2-ADMIN` — Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operato
  > The OCR-based scrubbing has too many acknowledged blind spots in §6a.6; requiring admin approval adds a human review gate for the residual risk.
- **G-Q4-v2** = `GQ4v2-FB` — Accept memory-only as primary; allow opt-in encrypted-fs fallback if memory pressure becom
  > Pure memory-only will hit scaling limits; an encrypted filesystem escape hatch preserves the security benefits while allowing operational flexibility.
- **G-Q6-v2** = `GQ6v2-MORE` — Ratify hybrid but require additional language families in floor — specify which (e.g. ja, 
  > The 6-language floor excludes major markets; at minimum Japanese, Korean, and Arabic must be included to avoid creating geographic security gaps.
- **G-Q7-v2** = `GQ7v2-MID` — Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all.
  > Zero cold storage for security-relevant audit events violates standard compliance practices; a 1-year cold compromise balances privacy with audit requirements.

Overall: The spec makes reasonable security/usability tradeoffs but underestimates operational risks from memory pressure and international coverage gaps.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Insufficient MFA Handling**

> The proposal does not provide a comprehensive solution for handling Multi-Factor Authentication (MFA) challenges. It simply fails loud and stops the run when an MFA challenge is encountered, which may not be sufficient for all use cases.

**Objection 2 — Potential for Credential Exposure**

> The use of a memory-only storageState object may not be enough to prevent credential exposure, especially in the event of a process crash or memory dump. Additional measures should be taken to ensure the security of credentials.

**Objection 3 — Inadequate Screenshot Scrubbing**

> The screenshot scrubbing pipeline may not be able to detect and redact all sensitive information, such as custom CSS-styled credential displays or obfuscated tokens. This could lead to unintended exposure of sensitive data.

**Worse-than-status-quo scenario:** The proposal's handling of MFA challenges and potential for credential exposure could lead to a worse security posture than the current status quo, where no authenticated crawl is performed.

**Precedent:** The Heartbleed bug in OpenSSL is an example of a similar design flaw that caused widespread security issues. In this case, the proposal's handling of credentials and MFA challenges could lead to similar security vulnerabilities.

### Rejection steelman

> The proposal should be rejected or deferred due to its inadequate handling of MFA challenges and potential for credential exposure. These issues could lead to significant security risks and undermine the overall security posture of the system.

### Votes

- **G-Q2-v2** = `GQ2v2-LOUD` — Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"
  > This option is the most secure, as it prevents the system from attempting to bypass MFA challenges and potentially exposing credentials.
- **G-Q3-v2** = `GQ3v2-PIPE` — Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, ope
  > This option provides a comprehensive solution for screenshot scrubbing and residual risk management, which is essential for maintaining the security and privacy of sensitive information.
- **G-Q4-v2** = `GQ4v2-MEM` — Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Pl
  > This option eliminates the potential for credential exposure through filesystem storage and reduces the risk of credential leakage.
- **G-Q6-v2** = `GQ6v2-HYBRID` — Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe="true
  > This option provides a comprehensive solution for handling destructive actions and reduces the risk of unintended data modification or exposure.
- **G-Q7-v2** = `GQ7v2-SHORT` — Ratify v2 short-retention as proposed — retentionClass:"auth_short" = 30 days hot, NO cold
  > This option reduces the risk of sensitive information being stored for an extended period and minimizes the potential for data breaches.

Overall: The proposal has some significant security concerns that need to be addressed before it can be considered for implementation. The handling of MFA challenges and credential exposure are particularly concerning and require more comprehensive solutions.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `TANGENTIAL`

**Invalid reason:** 4/5 votes parsed

### Adversarial pass

**Objection 1 — Unclear Screenshot Scrubbing**

> The screenshot scrubbing pipeline, while extensive, does not cover all edge cases. For example, it may miss credentials rendered using unconventional methods such as CSS-styled credential displays or obfuscated tokens. This could lead to sensitive information being inadvertently retained. §6a.6 acknowledges some of these limitations but does not provide a complete solution.

**Objection 2 — Complexity of Hybrid Allowlist**

> The hybrid allowlist and denylist approach for destructive actions adds complexity to the system. This complexity could introduce new bugs or make the system harder to maintain. The denylist, while comprehensive, may still miss edge cases, especially in languages not covered by the initial 6 language families. §6a and §10 outline the limitations but do not fully mitigate the risks.

**Objection 3 — StorageState Memory Management**

> While the memory-only approach for storageState eliminates the filesystem cleanup issues, it introduces new risks. For example, if the process crashes or is killed mid-run, the in-memory storageState could be lost, leading to incomplete or inconsistent states. This is acknowledged in §10 but not fully addressed. Additionally, the memory-only approach does not account for potential memory pressure issues that could arise during high-load scenarios.

**Worse-than-status-quo scenario:** The proposal's complexity and potential for missed edge cases in screenshot scrubbing and destructive action gating could lead to more frequent and severe security incidents compared to the current simpler, albeit less feature-rich, system.

**Precedent:** No precedent known

### Rejection steelman

> The proposal introduces significant complexity with the hybrid allowlist and denylist approach, as well as the screenshot scrubbing pipeline. This complexity could lead to increased maintenance difficulties and potential security risks due to missed edge cases. The memory-only approach for storageState, while addressing some issues, introduces new risks related to process crashes and memory pressure. Given these concerns, it may be prudent to defer the proposal until these issues can be fully addressed.

### Votes

- **G-Q2-v2** = `REJECT` — REJECT
  > The fail-loud approach for MFA handling is too rigid and does not provide enough flexibility for operators who may want to continue unauthenticated crawls in certain scenarios.
- **G-Q3-v2** = `UNMATCHED` — Different — describe in rationale.
  > The screenshot scrubbing pipeline should be further enhanced to cover more edge cases, such as CSS-styled credential displays and obfuscated tokens. Additionally, the residual-risk disclosure should be more prominently presented to operators.
- **G-Q4-v2** = `GQ4v2-OTHER` — Different — describe in rationale.
  > While the memory-only approach for storageState is a step in the right direction, it should include a fallback mechanism for high memory pressure scenarios. Additionally, the proposal should address the potential risks of in-memory storageState being lost during process crashes.
- **G-Q6-v2** = `GQ6v2-OTHER` — Different — describe in rationale.
  > The hybrid allowlist and denylist approach is too complex and may still miss edge cases. A simpler, more maintainable approach should be considered, such as an allowlist-only path with clear guidelines for operators on how to mark safe actions.
- **G-Q7-v2** = `GQ7v2-OTHER` — Different — describe in rationale.
  > The short retention policy for credentialed runs should be reconsidered. A compromise approach, such as 90 days hot + 1 year cold storage, may provide a better balance between security and operational needs.

Overall: The proposal introduces significant complexity and potential security risks that need to be carefully considered before implementation.

---

## Slot 5 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Invariant 3 non-compliance**

> The proposal to fail-loud on MFA detection may not cover all MFA scenarios, especially adaptive MFA which might not present a clear challenge on the first login attempt. This could lead to false negatives where MFA is not detected, and the system erroneously proceeds with authentication.

**Objection 2 — Incomplete destructive action gate**

> The hybrid gate for destructive actions relies heavily on heuristics and may not cover all edge cases, especially for non-standard UI elements. This could lead to unintended destructive actions being performed during the crawl.

**Objection 3 — Screenshot scrub pipeline limitations**

> The screenshot scrub pipeline, while comprehensive, may still miss certain types of sensitive information, especially those rendered in non-standard ways. This could lead to sensitive data being retained in screenshots despite the scrubbing process.

**Worse-than-status-quo scenario:** The proposal introduces a fail-loud mechanism for MFA detection, which could lead to increased false positives where legitimate login attempts are blocked due to perceived MFA challenges, making the system less reliable than the current status quo.

**Precedent:** In a similar scenario, a financial institution implemented a strict MFA detection system that resulted in numerous false positives, leading to user frustration and decreased system reliability.

### Rejection steelman

> The proposal should be rejected or deferred until a more robust MFA detection mechanism is developed. The current fail-loud approach may lead to an unacceptable number of false positives, making the system less reliable and user-friendly.

### Votes

- **G-Q2-v2** = `REJECT` — REJECT
  > The current fail-loud mechanism for MFA detection is not robust enough and may lead to false positives, making the system less reliable.
- **G-Q3-v2** = `REJECT` — REJECT
  > The screenshot scrub pipeline, while comprehensive, may still miss certain types of sensitive information, especially those rendered in non-standard ways.
- **G-Q4-v2** = `REJECT` — REJECT
  > The memory-only approach for storageState may lead to memory pressure issues, which could impact system performance.
- **G-Q6-v2** = `REJECT` — REJECT
  > The hybrid gate for destructive actions relies heavily on heuristics and may not cover all edge cases, especially for non-standard UI elements.
- **G-Q7-v2** = `REJECT` — REJECT
  > The short retention period for audit logs may not be sufficient to cover all regulatory and compliance requirements.

Overall: The proposal introduces several robust mechanisms but fails to address potential edge cases and reliability issues, especially regarding MFA detection and the destructive action gate.

---

## Slot 6 — openrouter:minimax/minimax-m2.7 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — §6a Stage 7 re-OCR verification is logically broken**

> The Stage 7 verification step claims that re-OCRing the redacted PNG and checking for 'original sensitive tokens' proves redaction succeeded. This is false: if the Stage 3 OCR misread a character (e.g., 'O' vs '0', 'l' vs '1'), the redaction was applied to the wrong location, and re-OCR will also misread it — producing a 'pass' that is actually a failure. The verification only catches the case where original-OCR succeeded but redaction failed; it cannot catch the case where original-OCR itself failed. This creates a false confidence interval around the scrub pipeline's effectiveness.

**Objection 2 — §6a.4 API-key pattern floor is dangerously incomplete**

> The scrub pipeline covers OpenAI sk-, Anthropic sk-ant-, Stripe sk_live/test_, and GitHub ghp/gho/ghu/ghs/ghr patterns. It omits AWS AKIA*, Google Cloud, Azure, Twilio, SendGrid, Mapbox, and dozens of other common API-key formats that appear in authenticated-session screenshots. A product that uses Google Cloud service-account credentials or AWS keys in its UI would have those keys pass through the scrub pipeline undetected. The 'floor list above is the minimum for v2' disclaimer in §6a.4 does not fix the operational risk — it documents it.

**Objection 3 — §5 retention 'auth_short' creates compliance dead zone**

> Invariant 9 / §5 specifies 30 days hot + NO cold storage for credentialed-run audit records. The spec acknowledges these records contain sensitive metadata (URLs visited, timing, product structure). If a security incident, breach disclosure, or subpoena arrives at day 31, those records are gone — permanently. The cold snapshot exclusion means there is no recovery path. This is worse than the standard 365-day retention: a breach investigation requiring historical credentialed-run context has no data to analyze.

**Objection 4 — Invariant 5 allowlist override trusts product authors without verification**

> The hybrid gate grants `data-crawl-safe='true'` the highest priority — it overrides the destructive denylist entirely. The spec assumes product authors are trusted to self-audit their own buttons. There is no mechanism to verify that a button marked safe has actually been audited, nor any revocation path if a product author marks a destructive button as safe. A malicious or careless product author can cause the authenticated crawler to click a delete/logout/terminate button and the denylist provides zero protection.

**Objection 5 — §13 engineering scope contradicts Invariant 2**

> Invariant 2 mandates memory-only storageState with no filesystem path, and explicitly states 'The cleanup-sweep helper (scripts/cleanup-orphaned-storage-state.mjs) from v1 is removed from scope.' Yet the Phase 3 engineering scope estimate in §13 lists 'Cleanup sweep helper (scripts/cleanup-orphaned-storage-state.mjs) + scheduled trigger' at 1 W-day. This is a direct contradiction — either the cleanup helper is in scope or it is not. The spec cannot simultaneously claim filesystem elimination and include filesystem cleanup work.

**Worse-than-status-quo scenario:** A product uses a non-standard MFA implementation whose UI text does not match any of the §6a.4 MFA-detection heuristics (e.g., a custom 2FA flow using 'Enter your security code' without the keyword 'two-factor' or 'mfa'). The crawler detects a successful login (no 401/403) and proceeds with the authenticated session. The same-origin link on page 3 redirects to an attacker-controlled subdomain that captures the session cookies. Because the crawler is authenticated, it sends real session tokens to the attacker. The fail-loud MFA detection would have stopped this; the heuristic-based detection misses it. The operator receives a successful crawl report while their session has been exfiltrated.

**Precedent:** The 2019 Capital One breach (SSRF via WAF misconfiguration, 100M records exposed) demonstrates that authenticated-session data exfiltration via same-origin traversal is a real attack class. Capital One's WAF allowed requests to internal AWS metadata service — analogous to a crawler that follows same-origin links without verifying the destination is not an internal/attacker-controlled endpoint. The lesson: same-origin enforcement alone does not prevent credential exfiltration if the same-origin contains untrusted subdomains.

### Rejection steelman

> The proposal addresses 5 v1 NOT_RATIFIED conditions but introduces compounding complexity that makes the Phase 3 implementation harder to verify and audit. The 9-stage scrub pipeline adds a new attack surface (OCR engine, image processing, re-OCR verification logic) that itself requires security review. The hybrid allowlist/denylist requires i18n maintenance across 6 language families with documented false-negative gaps. The memory-only storageState, while eliminating the filesystem race, shifts risk to process-memory exposure without a defined threat model for that vector. A simpler v1 that ships authenticated crawl WITHOUT screenshots and WITHOUT persistent storageState would be safer and faster to ratify — the scrub pipeline can be added in Phase 4 once the core auth traversal is proven stable. Deferring the proposal to a Phase 4 scrub pipeline dispatch allows the Panel to review the scrub implementation in isolation against real test fixtures rather than against a spec.

### Votes

- **G-Q2-v2** = `GQ2v2-LOUD` — Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"
  > Fail-loud is the correct posture: an authenticated run that cannot authenticate is a failed run, not a degraded one. The v1 silent-continue path created operator confusion (credentials submitted but crawl proceeded unauthenticated without notification). The heuristic-based MFA detection has false-negative risk (see objection 1), but fail-loud is still safer than silent continuation because it forces the operator to re-evaluate the auth path rather than proceeding with incomplete coverage.
- **G-Q3-v2** = `GQ3v2-ADMIN` — Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operato
  > The scrub pipeline is technically sound but the operator self-enable option in the base proposal is too permissive. An operator under time pressure or without security training will enable auth screenshot retention without reading §6a.7. Admin-role-only enforces a second pair of eyes. The re-OCR verification flaw (objection 1) is a concern but does not justify rejecting the pipeline entirely — the pipeline still catches the canonical credential-leak cases; the verification gap is a known residual documented in §6a.6.
- **G-Q4-v2** = `GQ4v2-MEM` — Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Pl
  > Memory-only is the correct direction. The filesystem path in v1 created a real race condition (cleanup verification could fail if the process crashed before cleanup ran). Eliminating the path eliminates the class of failure. The process-memory exposure residual is a hosting-environment trust assumption that is documented and materially smaller than on-disk credential storage. The engineering scope contradiction (§13 cleanup helper vs Invariant 2 removal) must be resolved in Phase 3 dispatch before implementation.
- **G-Q6-v2** = `GQ6v2-OTHER` — Different — describe in rationale.
  > The hybrid approach is directionally correct but the allowlist override is a trust-model gap. I would ratify the hybrid structure with one modification: the data-crawl-safe='true' attribute must be admin-role-only to set (not operator-settable), and the ProductSSOT overrides table (§13.1) must record every allowlist override with rationale. This prevents an operator from marking a destructive button as safe without an audit trail. Without this modification, the allowlist override is exploitable by a malicious or careless product author.
- **G-Q7-v2** = `GQ7v2-MID` — Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all.
  > The 'no cold' position creates a compliance dead zone: a security incident or regulatory investigation requiring historical credentialed-run context at day 31 has no data to analyze. The Slot-10 rationale (sensitive metadata warrants shorter retention) is valid, but 30 days hot + 0 cold is an overcorrection. 90 days hot + 1 year cold balances the sensitivity concern against the legitimate need for historical access during incident response. The cold storage can be access-controlled (admin-only, separate audit log) rather than eliminated entirely.

Overall: The spec is substantially improved over v1 on the storageState and MFA conditions. The screenshot scrub pipeline is the weakest remaining component — the Stage 7 re-OCR verification logic is flawed and should be replaced with a deterministic DOM-bounding-box verification (verify the black rectangle covers the expected pixel region) rather than a heuristic re-OCR pass. The engineering scope contradiction in §13 must be resolved before Phase 3 dispatch gates.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — MFA detection heuristics**

> Invariant 3's MFA detection relies on DOM selectors and regex patterns that could miss non-standard MFA implementations (e.g., biometric prompts or proprietary 2FA widgets). This creates false negatives where crawlers hit unhandled MFA walls without proper detection.

**Objection 2 — i18n denylist coverage gaps**

> The 6-language destructive-action denylist in §Invariant5 leaves Japanese, Arabic, and other common languages uncovered. A product using '削除' (Japanese 'delete') or 'حذف' (Arabic 'remove') would bypass detection, enabling destructive actions during authenticated crawls.

**Objection 3 — OCR scrub residual risk**

> §6a's screenshot scrub pipeline cannot detect credentials rendered via CSS-obfuscated text (e.g., negative letter-spacing) or background-image text. This creates undetectable PII leakage vectors even with operator acknowledgment.

**Worse-than-status-quo scenario:** The hybrid allowlist/denylist approach could block legitimate UI interactions in multilingual products while missing truly destructive actions in uncovered languages, reducing crawl coverage accuracy below the pre-auth status quo's predictable limitations.

**Precedent:** 2018 Facebook/Cambridge Analytica: Third-party data collection systems failing to properly scrub sensitive session data from crawled information, despite layered safeguards, mirrors risks in §6a's scrub pipeline.

### Rejection steelman

> This proposal introduces multiple novel attack surfaces (MFA heuristic bypass, i18n denylist gaps, OCR false negatives) without commensurate validation mechanisms. The operational burden of residual risk management for credentialed crawls may exceed the value gained, warranting deferral until MFA detection achieves 99% recall across top 10 language families and scrub pipelines implement CV-based credential detection.

### Votes

- **G-Q2-v2** = `GQ2v2-LOUD` — Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"
  > Fail-loud improves on silent degradation, though MFA detection gaps remain an unresolved risk.
- **G-Q3-v2** = `GQ3v2-PIPE` — Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, ope
  > Residual risks are acknowledged and mitigated through discard-on-failure, making this preferable to eliminating screenshots entirely.
- **G-Q4-v2** = `GQ4v2-MEM` — Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Pl
  > Memory-only storageState properly addresses v1's filesystem risks without introducing new attack surfaces.
- **G-Q6-v2** = `GQ6v2-HYBRID` — Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe="true
  > Hybrid approach balances safety and coverage better than alternatives, though language coverage should expand in future phases.
- **G-Q7-v2** = `GQ7v2-SHORT` — Ratify v2 short-retention as proposed — retentionClass:"auth_short" = 30 days hot, NO cold
  > Reduced retention window appropriately limits exposure of sensitive metadata without compromising core audit needs.

Overall: While the proposal makes meaningful improvements, Panel should mandate follow-up dispatches to address i18n coverage gaps and MFA detection robustness before full production rollout.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Memory-only is overstated**

> §4.1 and §2 Invariant 2 treat Playwright `storageState` as memory-only and dismiss the filesystem race entirely, but the proposal still depends on Chromium/Node process memory and IPC. A crash dump, debugger attach, container escape, or hosting introspection could still expose the session object, so the claimed elimination of the storage residue problem is stronger than the mechanism warrants.

**Objection 2 — Screenshot scrub has blind spots**

> §6a.3–§6a.6 rely on OCR plus regex redaction, but the spec itself admits custom CSS, obfuscated tokens, and non-text credentials can slip through. That means the system may persist retained authenticated screenshots that look scrubbed yet still contain secrets in pixels, which is a direct confidentiality regression if operators trust the redaction badge.

**Objection 3 — Hybrid denylist can click destructive UI**

> §2 Invariant 5 allows any element with `data-crawl-safe="true"` to bypass the destructive denylist, and also allows clicks on buttons not matched by the regex. In a real product, a malicious or mistaken developer could mark a dangerous control safe, or use an unrecognized locale/class, causing the crawler to invoke state-changing actions while authenticated.

**Worse-than-status-quo scenario:** If authenticated crawling is enabled and the login succeeds, the crawler can now traverse deeper into privileged UI while still having a false sense of safety from the allowlist/denylist and screenshot scrub pipeline. In the worst case, it could expose more sensitive surfaces than the current unauthenticated-only crawl, persist sanitized-but-still-sensitive screenshots, and create a stronger audit trail of sensitive product structure without actually improving safety.

**Precedent:** GitHub issue trackers and security tooling around browser automation have repeatedly run into secrets leaking through logs and screenshots despite redaction attempts; no single precedent fully matches this exact design. A close real-world analogue is browser-based RPA systems that captured credentials in screenshots or traces and later required emergency scrubbing guidance after leaks.

### Rejection steelman

> The strongest case for rejecting or deferring this proposal is that it adds authenticated access, screenshot retention, and broader crawl reach all at once while relying on heuristic guards that are explicitly incomplete. The spec acknowledges multiple residual risks, but then still proposes persistence, audit logging, and cross-origin/session handling that substantially increase operational and legal exposure. A safer path would be to ship the authenticated crawl as fail-loud/no-retention/no-persistence first, then reintroduce screenshots and any allowlist exceptions only after field evidence shows the guards are robust.

### Votes

- **G-Q2-v2** = `GQ2v2-LOUD` — Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"
  > Fail-loud is preferable to silently downgrading coverage after the operator provided credentials. It avoids false assurance and prevents the system from masking authentication failures as successful crawls.
- **G-Q3-v2** = `GQ3v2-ADMIN` — Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operato
  > The scrub pipeline is better than no screenshots, but operator self-enablement of authenticated screenshots expands risk too much. Requiring admin-only enable preserves the benefit while reducing accidental or unauthorized retention.
- **G-Q4-v2** = `GQ4v2-MEM` — Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Pl
  > Eliminating filesystem persistence is a real security improvement over path-based state handling. The memory-residency risk remains, but it is materially narrower than leaving credentialed session material on disk.
- **G-Q6-v2** = `REJECT` — REJECT
  > The hybrid gate is still too easy to bypass via `data-crawl-safe="true"`, and the proposed language floor is still incomplete for a global product surface. I would defer until there is a strictly audited allowlist or a formally verified action classification scheme.
- **G-Q7-v2** = `REJECT` — REJECT
  > Thirty-day hot-only retention is a major departure from the canonical log policy and may undermine incident response, forensics, and compliance workflows. I would prefer a narrower retention reduction tied to redaction quality and access controls rather than a blanket no-cold policy.

Overall: I am not comfortable ratifying the whole package as drafted because the proposal combines multiple incomplete safety mechanisms with expanded privileged access. If forced to choose, the fail-loud auth stance is the cleanest part; the retention and destructive-action controls remain too heuristic.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `ENGAGED`

### Adversarial pass

**Objection 1 — MFA handling ambiguity**

> The proposal's MFA handling (G-Q2-v2) does not specify how the system determines an MFA challenge. The heuristic (presence of 'data-mfa' or specific text patterns) may not cover all MFA implementations.

**Objection 2 — Screenshot scrub pipeline limitations**

> The proposed 9-stage scrub pipeline (§6a) has acknowledged residual risks, including custom CSS-styled credential displays and obfuscated tokens, which could lead to sensitive information leakage.

**Objection 3 — Destructive-action gate false negatives**

> The hybrid gate (§6a.3) for destructive actions has a denylist that may not be comprehensive across all languages and implementations, potentially allowing harmful actions to be executed.

**Worse-than-status-quo scenario:** If the MFA handling fails to detect MFA challenges correctly, it could lead to repeated login attempts, potentially locking out operator accounts or triggering additional security measures, making the system worse than the status quo.

**Precedent:** Similar authentication traversal mechanisms in other web application security testing tools have faced challenges with MFA handling and destructive action prevention, such as Burp Suite's handling of complex login flows.

### Rejection steelman

> The proposal could be rejected or deferred due to the complexity and potential risks associated with the authenticated crawl traversal, particularly around MFA handling, screenshot scrubbing, and destructive action prevention. These areas require significant testing and validation to ensure they do not introduce unacceptable risks.

### Votes

- **G-Q2-v2** = `GQ2v2-LOUD` — Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"
  > Failing loud on MFA challenges is a safer approach as it prevents potential account lockouts or security measure triggers due to repeated login attempts.
- **G-Q3-v2** = `GQ3v2-PIPE` — Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, ope
  > The proposed scrub pipeline is comprehensive and the default-OFF retention with operator acknowledgment of residual risk is a balanced approach.
- **G-Q4-v2** = `GQ4v2-MEM` — Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Pl
  > Memory-only storageState eliminates the risk of filesystem persistence and associated cleanup issues.
- **G-Q6-v2** = `GQ6v2-HYBRID` — Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe="true
  > The hybrid approach with both allowlist and denylist provides a defence-in-depth strategy against destructive actions.
- **G-Q7-v2** = `GQ7v2-SHORT` — Ratify v2 short-retention as proposed — retentionClass:"auth_short" = 30 days hot, NO cold
  > Shorter retention for credentialed runs reduces the risk of sensitive metadata exposure in case of a future breach or subpoena.

Overall: The proposal addresses several critical security concerns around authenticated crawl traversal, but careful implementation and testing are necessary to mitigate the identified risks.

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Incomplete i18n denylist coverage**

> Invariant 5's hybrid gate in §2 only defines a 6-language regex (en/es/fr/pt/de/zh-CN) plus data-crawl-safe allowlist; §10 explicitly defers ja/ko/ar/hi/ru and acknowledges custom CSS or JS handlers as false-negative vectors, leaving destructive clicks possible on non-covered locales.

**Objection 2 — OCR-dependent screenshot scrub flaws**

> §6a.3 Stage 7 re-OCR verification only catches post-redaction failures; §6a.6 lists OCR misreads (O/0, l/1), exotic CSS letter-spacing, and post-capture JS injection as uncaught residuals, yet still permits persistence after operator ack in dev/staging.

**Objection 3 — Retention divergence from canonical**

> Invariant 9 tags credentialed runs with retentionClass:'auth_short' (30 hot, 0 cold) in §5, conflicting with CANONICAL_REFERENCE.md §14.3's mandatory 365+7yr GovernanceAuditLog pattern without an explicit override or RLS carve-out mechanism.

**Worse-than-status-quo scenario:** Introducing authenticated crawl with memory-only storageState and acknowledged OCR false-negatives creates a new credential-exfiltration surface that unauthenticated Phase 1 never had; a single heap-dump or OCR miss now leaks live sessions across tenants where the status-quo crawler exposed nothing.

**Precedent:** The 2019 Facebook 'View As' session-leak incident where insufficient context isolation in internal tooling allowed admin sessions to bleed across accounts, exactly the T2 session-bleed threat modeled in §1.

### Rejection steelman

> The proposal layers 10 invariants, a 9-stage OCR pipeline, and a hybrid denylist whose own §6a.6 and §10 sections enumerate multiple unfixable false-negative classes, all while diverging from canonical retention and role-gate rules. Deferring until a CV-based classifier and full i18n floor are specified would avoid shipping a system whose safety guarantees are explicitly caveated in the same document that asks for ratification.

### Votes

- **G-Q2-v2** = `GQ2v2-LOUD` — Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"
  > Forces explicit failure signaling but still leaves single-attempt brittleness unaddressed.
- **G-Q3-v2** = `REJECT` — REJECT
  > Residual risks listed in §6a.6 remain too high for any retention path.
- **G-Q4-v2** = `GQ4v2-MEM` — Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Pl
  > Removes the filesystem surface but still exposes heap-dump risk acknowledged in Invariant 2.
- **G-Q6-v2** = `GQ6v2-MORE` — Ratify hybrid but require additional language families in floor — specify which (e.g. ja, 
  > Hybrid is better than pure denylist yet §10's deferral leaves obvious coverage gaps.
- **G-Q7-v2** = `GQ7v2-MID` — Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all.
  > 30-day cutoff is too aggressive versus canonical §14.3 without demonstrated need.

Overall: Multiple sections explicitly document the exact failure modes the spec claims to mitigate, weakening the ratification case.


---

## Raw reviewer responses (first 8K each)

### Slot 1 [BACKUP FIRED] — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 67902 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:openai/gpt-5` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 7,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Memory-only storageState creates OOM risk",
        "detail": "§2 Invariant 2 mandates holding all authenticated session states in JS heap memory with no filesystem fallback. For concurrent authenticated crawls or large session data (extensive localStorage/cookies), this creates memory pressure that could crash the Conductor process, losing ALL in-flight authenticated sessions."
      },
      {
        "title": "Screenshot scrub pipeline false negatives",
        "detail": "§6a.4 OCR-based pattern matching will miss credentials rendered as images, CSS-obfuscated text, or canvas-rendered content. The 'REDACTED badge' in §6a.5 gives false confidence when the pipeline cannot detect non-text credential displays that §6a.6 explicitly acknowledges."
      },
      {
        "title": "30-day audit retention breaks compliance",
        "detail": "§5 Invariant 9 specifies 30-day hot retention with NO cold storage for authenticated crawls. This violates standard audit practices and could fail regulatory requirements that mandate longer retention for security-relevant events, creating legal exposure."
      },
      {
        "title": "Hybrid denylist scales poorly internationally",
        "detail": "§2 Invariant 5's i18n regex covers only 6 languages but §10 explicitly defers ja/ko/ar/hi/ru coverage. Products serving Asian/Middle Eastern markets will have undetected destructive buttons, making the authenticated crawler unsafe for global deployment."
      }
    ],
    "worse_than_status_quo": "The v2 memory-only storageState approach eliminates the filesystem cleanup race but introduces a worse failure mode: under memory pressure, ALL concurrent authenticated sessions crash together, whereas v1's filesystem approach would have isolated failures.",
    "precedent": "Puppeteer's memory leak issues with large numbers of browser contexts (github.com/puppeteer/puppeteer/issues/1223) caused production outages when teams migrated from disk-based to memory-only session management without proper memory limits."
  },
  "rejection_steelman": "This spec should be rejected because it trades one set of security risks (filesystem exposure) for operational risks (memory exhaustion) while providing incomplete protection via OCR-based screenshot scrubbing that cannot detect modern credential rendering techniques. The 30-day audit retention violates both the canonical 365-day standard and likely compliance requirements, and the 6-language denylist leaves most of the world's destructive UI patterns undetected.",
  "answers": {
    "G-Q2-v2": {
      "pick_text": "Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:\"mfa_required\"; run STOPS; no continue-unauthenticated path.",
      "rationale": "Fail-loud eliminates ambiguity about whether credentials were actually used, which is critical for security auditing and operator awareness."
    },
    "G-Q3-v2": {
      "pick_text": "Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operator cannot self-enable even in dev/staging).",
      "rationale": "The OCR-based scrubbing has too many acknowledged blind spots in §6a.6; requiring admin approval adds a human review gate for the residual risk."
    },
    "G-Q4-v2": {
      "pick_text": "Accept memory-only as primary; allow opt-in encrypted-fs fallback if memory pressure becomes a Phase 3 concern (per-run flag, admin-only).",
      "rationale": "Pure memory-only will hit scaling limits; an encrypted filesystem escape hatch preserves the security benefits while allowing operational flexibility."
    },
    "G-Q6-v2": {
      "pick_text": "Ratify hybrid but require additional language families in floor — specify which (e.g. ja, ko, ar must be in Phase 3 floor too).",
      "rationale": "The 6-language floor excludes major markets; at minimum Japanese, Korean, and Arabic must be included to avoid creating geographic security gaps."
    },
    "G-Q7-v2": {
      "pick_text": "Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all.",
      "rationale": "Zero cold storage for security-relevant audit events violates standard compliance practices; a 1-year cold compromise balances privacy with audit requirements."
    }
  },
  "overall_notes": "The spec makes reasonable security/usability tradeoffs but underestimates operational risks from memory pressure and international coverage gaps."
}
```

---

### Slot 2 — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 70371 ms
- HTTP status: OK

```
{
  "reviewer_slot": 7,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Memory-only storageState creates OOM risk",
        "detail": "§2 Invariant 2 mandates holding all authenticated session states in JS heap memory with no filesystem fallback. For concurrent authenticated crawls or large session data (extensive localStorage/cookies), this creates memory pressure that could crash the Conductor process, losing ALL in-flight authenticated sessions."
      },
      {
        "title": "Screenshot scrub pipeline false negatives",
        "detail": "§6a.4 OCR-based pattern matching will miss credentials rendered as images, CSS-obfuscated text, or canvas-rendered content. The 'REDACTED badge' in §6a.5 gives false confidence when the pipeline cannot detect non-text credential displays that §6a.6 explicitly acknowledges."
      },
      {
        "title": "30-day audit retention breaks compliance",
        "detail": "§5 Invariant 9 specifies 30-day hot retention with NO cold storage for authenticated crawls. This violates standard audit practices and could fail regulatory requirements that mandate longer retention for security-relevant events, creating legal exposure."
      },
      {
        "title": "Hybrid denylist scales poorly internationally",
        "detail": "§2 Invariant 5's i18n regex covers only 6 languages but §10 explicitly defers ja/ko/ar/hi/ru coverage. Products serving Asian/Middle Eastern markets will have undetected destructive buttons, making the authenticated crawler unsafe for global deployment."
      }
    ],
    "worse_than_status_quo": "The v2 memory-only storageState approach eliminates the filesystem cleanup race but introduces a worse failure mode: under memory pressure, ALL concurrent authenticated sessions crash together, whereas v1's filesystem approach would have isolated failures.",
    "precedent": "Puppeteer's memory leak issues with large numbers of browser contexts (github.com/puppeteer/puppeteer/issues/1223) caused production outages when teams migrated from disk-based to memory-only session management without proper memory limits."
  },
  "rejection_steelman": "This spec should be rejected because it trades one set of security risks (filesystem exposure) for operational risks (memory exhaustion) while providing incomplete protection via OCR-based screenshot scrubbing that cannot detect modern credential rendering techniques. The 30-day audit retention violates both the canonical 365-day standard and likely compliance requirements, and the 6-language denylist leaves most of the world's destructive UI patterns undetected.",
  "answers": {
    "G-Q2-v2": {
      "pick_text": "Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:\"mfa_required\"; run STOPS; no continue-unauthenticated path.",
      "rationale": "Fail-loud eliminates ambiguity about whether credentials were actually used, which is critical for security auditing and operator awareness."
    },
    "G-Q3-v2": {
      "pick_text": "Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operator cannot self-enable even in dev/staging).",
      "rationale": "The OCR-based scrubbing has too many acknowledged blind spots in §6a.6; requiring admin approval adds a human review gate for the residual risk."
    },
    "G-Q4-v2": {
      "pick_text": "Accept memory-only as primary; allow opt-in encrypted-fs fallback if memory pressure becomes a Phase 3 concern (per-run flag, admin-only).",
      "rationale": "Pure memory-only will hit scaling limits; an encrypted filesystem escape hatch preserves the security benefits while allowing operational flexibility."
    },
    "G-Q6-v2": {
      "pick_text": "Ratify hybrid but require additional language families in floor — specify which (e.g. ja, ko, ar must be in Phase 3 floor too).",
      "rationale": "The 6-language floor excludes major markets; at minimum Japanese, Korean, and Arabic must be included to avoid creating geographic security gaps."
    },
    "G-Q7-v2": {
      "pick_text": "Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all.",
      "rationale": "Zero cold storage for security-relevant audit events violates standard compliance practices; a 1-year cold compromise balances privacy with audit requirements."
    }
  },
  "overall_notes": "The spec makes reasonable security/usability tradeoffs but underestimates operational risks from memory pressure and international coverage gaps."
}
```

---

### Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct

- Provider: `openrouter`
- Latency: 14903 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Insufficient MFA Handling", "detail": "The proposal does not provide a comprehensive solution for handling Multi-Factor Authentication (MFA) challenges. It simply fails loud and stops the run when an MFA challenge is encountered, which may not be sufficient for all use cases." },
      { "title": "Potential for Credential Exposure", "detail": "The use of a memory-only storageState object may not be enough to prevent credential exposure, especially in the event of a process crash or memory dump. Additional measures should be taken to ensure the security of credentials." },
      { "title": "Inadequate Screenshot Scrubbing", "detail": "The screenshot scrubbing pipeline may not be able to detect and redact all sensitive information, such as custom CSS-styled credential displays or obfuscated tokens. This could lead to unintended exposure of sensitive data." }
    ],
    "worse_than_status_quo": "The proposal's handling of MFA challenges and potential for credential exposure could lead to a worse security posture than the current status quo, where no authenticated crawl is performed.",
    "precedent": "The Heartbleed bug in OpenSSL is an example of a similar design flaw that caused widespread security issues. In this case, the proposal's handling of credentials and MFA challenges could lead to similar security vulnerabilities."
  },
  "rejection_steelman": "The proposal should be rejected or deferred due to its inadequate handling of MFA challenges and potential for credential exposure. These issues could lead to significant security risks and undermine the overall security posture of the system.",
  "answers": {
    "G-Q2-v2": { "pick_text": "Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:\"mfa_required\"; run STOPS; no continue-unauthenticated path.", "rationale": "This option is the most secure, as it prevents the system from attempting to bypass MFA challenges and potentially exposing credentials." },
    "G-Q3-v2": { "pick_text": "Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, operator acknowledges residual risk; DISCARD-on-scrub-failure.", "rationale": "This option provides a comprehensive solution for screenshot scrubbing and residual risk management, which is essential for maintaining the security and privacy of sensitive information." },
    "G-Q4-v2": { "pick_text": "Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` returns object only.", "rationale": "This option eliminates the potential for credential exposure through filesystem storage and reduces the risk of credential leakage." },
    "G-Q6-v2": { "pick_text": "Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe=\"true\" allowlist (highest priority) + form-submit denylist + i18n-aware destructive denylist.", "rationale": "This option provides a comprehensive solution for handling destructive actions and reduces the risk of unintended data modification or exposure." },
    "G-Q7-v2": { "pick_text": "Ratify v2 short-retention as proposed — retentionClass:\"auth_short\" = 30 days hot, NO cold storage.", "rationale": "This option reduces the risk of sensitive information being stored for an extended period and minimizes the potential for data breaches." }
  },
  "overall_notes": "The proposal has some significant security concerns that need to be addressed before it can be considered for implementation. The handling of MFA challenges and credential exposure are particularly concerning and require more comprehensive solutions."
}
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 36657 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Unclear Screenshot Scrubbing",
        "detail": "The screenshot scrubbing pipeline, while extensive, does not cover all edge cases. For example, it may miss credentials rendered using unconventional methods such as CSS-styled credential displays or obfuscated tokens. This could lead to sensitive information being inadvertently retained. §6a.6 acknowledges some of these limitations but does not provide a complete solution."
      },
      {
        "title": "Complexity of Hybrid Allowlist",
        "detail": "The hybrid allowlist and denylist approach for destructive actions adds complexity to the system. This complexity could introduce new bugs or make the system harder to maintain. The denylist, while comprehensive, may still miss edge cases, especially in languages not covered by the initial 6 language families. §6a and §10 outline the limitations but do not fully mitigate the risks."
      },
      {
        "title": "StorageState Memory Management",
        "detail": "While the memory-only approach for storageState eliminates the filesystem cleanup issues, it introduces new risks. For example, if the process crashes or is killed mid-run, the in-memory storageState could be lost, leading to incomplete or inconsistent states. This is acknowledged in §10 but not fully addressed. Additionally, the memory-only approach does not account for potential memory pressure issues that could arise during high-load scenarios."
      }
    ],
    "worse_than_status_quo": "The proposal's complexity and potential for missed edge cases in screenshot scrubbing and destructive action gating could lead to more frequent and severe security incidents compared to the current simpler, albeit less feature-rich, system.",
    "precedent": "No precedent known"
  },
  "rejection_steelman": "The proposal introduces significant complexity with the hybrid allowlist and denylist approach, as well as the screenshot scrubbing pipeline. This complexity could lead to increased maintenance difficulties and potential security risks due to missed edge cases. The memory-only approach for storageState, while addressing some issues, introduces new risks related to process crashes and memory pressure. Given these concerns, it may be prudent to defer the proposal until these issues can be fully addressed.",
  "answers": {
    "G-Q2-v2": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "The fail-loud approach for MFA handling is too rigid and does not provide enough flexibility for operators who may want to continue unauthenticated crawls in certain scenarios."
    },
    "G-Q3-v2": {
      "pick_text": "Different — describe in rationale.",
      "rationale": "The screenshot scrubbing pipeline should be further enhanced to cover more edge cases, such as CSS-styled credential displays and obfuscated tokens. Additionally, the residual-risk disclosure should be more prominently presented to operators."
    },
    "G-Q4-v2": {
      "pick_text": "Different — describe in rationale.",
      "rationale": "While the memory-only approach for storageState is a step in the right direction, it should include a fallback mechanism for high memory pressure scenarios. Additionally, the proposal should address the potential risks of in-memory storageState being lost during process crashes."
    },
    "G-Q6-v2": {
      "pick_text": "Different — describe in rationale.",
      "rationale": "The hybrid allowlist and denylist approach is too complex and may still miss edge cases. A simpler, more maintainable approach should be considered, such as an allowlist-only path with clear guidelines for operators on how to mark safe actions."
    },
    "G-Q7-v2": {
      "pick_text": "Different — describe in rationale.",
      "rationale": "The short retention policy for credentialed runs should be reconsidered. A compromise approach, such as 90 days hot + 1 year cold storage, may provide a better balance between security and operational needs."
    }
  },
  "overall_notes": "The proposal introduces significant complexity and potential security risks that need to be carefully considered before implementation."
}
```
```

---

### Slot 5 [BACKUP FIRED] — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 29097 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:cohere/command-r-plus-08-2024` (error: unparseable JSON envelope)

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Invariant 3 non-compliance",
        "detail": "The proposal to fail-loud on MFA detection may not cover all MFA scenarios, especially adaptive MFA which might not present a clear challenge on the first login attempt. This could lead to false negatives where MFA is not detected, and the system erroneously proceeds with authentication."
      },
      {
        "title": "Incomplete destructive action gate",
        "detail": "The hybrid gate for destructive actions relies heavily on heuristics and may not cover all edge cases, especially for non-standard UI elements. This could lead to unintended destructive actions being performed during the crawl."
      },
      {
        "title": "Screenshot scrub pipeline limitations",
        "detail": "The screenshot scrub pipeline, while comprehensive, may still miss certain types of sensitive information, especially those rendered in non-standard ways. This could lead to sensitive data being retained in screenshots despite the scrubbing process."
      }
    ],
    "worse_than_status_quo": "The proposal introduces a fail-loud mechanism for MFA detection, which could lead to increased false positives where legitimate login attempts are blocked due to perceived MFA challenges, making the system less reliable than the current status quo.",
    "precedent": "In a similar scenario, a financial institution implemented a strict MFA detection system that resulted in numerous false positives, leading to user frustration and decreased system reliability."
  },
  "rejection_steelman": "The proposal should be rejected or deferred until a more robust MFA detection mechanism is developed. The current fail-loud approach may lead to an unacceptable number of false positives, making the system less reliable and user-friendly.",
  "answers": {
    "G-Q2-v2": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "The current fail-loud mechanism for MFA detection is not robust enough and may lead to false positives, making the system less reliable."
    },
    "G-Q3-v2": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "The screenshot scrub pipeline, while comprehensive, may still miss certain types of sensitive information, especially those rendered in non-standard ways."
    },
    "G-Q4-v2": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "The memory-only approach for storageState may lead to memory pressure issues, which could impact system performance."
    },
    "G-Q6-v2": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "The hybrid gate for destructive actions relies heavily on heuristics and may not cover all edge cases, especially for non-standard UI elements."
    },
    "G-Q7-v2": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "The short retention period for audit logs may not be sufficient to cover all regulatory and compliance requirements."
    }
  },
  "overall_notes": "The proposal introduces several robust mechanisms but fails to address potential edge cases and reliability issues, especially regarding MFA detection and the destructive action gate."
}
```
```

---

### Slot 6 — openrouter:minimax/minimax-m2.7

- Provider: `openrouter`
- Latency: 65267 ms
- HTTP status: OK

```
{
  "reviewer_slot": 11,
  "adversarial_pass": {
    "objections": [
      {
        "title": "§6a Stage 7 re-OCR verification is logically broken",
        "detail": "The Stage 7 verification step claims that re-OCRing the redacted PNG and checking for 'original sensitive tokens' proves redaction succeeded. This is false: if the Stage 3 OCR misread a character (e.g., 'O' vs '0', 'l' vs '1'), the redaction was applied to the wrong location, and re-OCR will also misread it — producing a 'pass' that is actually a failure. The verification only catches the case where original-OCR succeeded but redaction failed; it cannot catch the case where original-OCR itself failed. This creates a false confidence interval around the scrub pipeline's effectiveness."
      },
      {
        "title": "§6a.4 API-key pattern floor is dangerously incomplete",
        "detail": "The scrub pipeline covers OpenAI sk-, Anthropic sk-ant-, Stripe sk_live/test_, and GitHub ghp/gho/ghu/ghs/ghr patterns. It omits AWS AKIA*, Google Cloud, Azure, Twilio, SendGrid, Mapbox, and dozens of other common API-key formats that appear in authenticated-session screenshots. A product that uses Google Cloud service-account credentials or AWS keys in its UI would have those keys pass through the scrub pipeline undetected. The 'floor list above is the minimum for v2' disclaimer in §6a.4 does not fix the operational risk — it documents it."
      },
      {
        "title": "§5 retention 'auth_short' creates compliance dead zone",
        "detail": "Invariant 9 / §5 specifies 30 days hot + NO cold storage for credentialed-run audit records. The spec acknowledges these records contain sensitive metadata (URLs visited, timing, product structure). If a security incident, breach disclosure, or subpoena arrives at day 31, those records are gone — permanently. The cold snapshot exclusion means there is no recovery path. This is worse than the standard 365-day retention: a breach investigation requiring historical credentialed-run context has no data to analyze."
      },
      {
        "title": "Invariant 5 allowlist override trusts product authors without verification",
        "detail": "The hybrid gate grants `data-crawl-safe='true'` the highest priority — it overrides the destructive denylist entirely. The spec assumes product authors are trusted to self-audit their own buttons. There is no mechanism to verify that a button marked safe has actually been audited, nor any revocation path if a product author marks a destructive button as safe. A malicious or careless product author can cause the authenticated crawler to click a delete/logout/terminate button and the denylist provides zero protection."
      },
      {
        "title": "§13 engineering scope contradicts Invariant 2",
        "detail": "Invariant 2 mandates memory-only storageState with no filesystem path, and explicitly states 'The cleanup-sweep helper (scripts/cleanup-orphaned-storage-state.mjs) from v1 is removed from scope.' Yet the Phase 3 engineering scope estimate in §13 lists 'Cleanup sweep helper (scripts/cleanup-orphaned-storage-state.mjs) + scheduled trigger' at 1 W-day. This is a direct contradiction — either the cleanup helper is in scope or it is not. The spec cannot simultaneously claim filesystem elimination and include filesystem cleanup work."
      }
    ],
    "worse_than_status_quo": "A product uses a non-standard MFA implementation whose UI text does not match any of the §6a.4 MFA-detection heuristics (e.g., a custom 2FA flow using 'Enter your security code' without the keyword 'two-factor' or 'mfa'). The crawler detects a successful login (no 401/403) and proceeds with the authenticated session. The same-origin link on page 3 redirects to an attacker-controlled subdomain that captures the session cookies. Because the crawler is authenticated, it sends real session tokens to the attacker. The fail-loud MFA detection would have stopped this; the heuristic-based detection misses it. The operator receives a successful crawl report while their session has been exfiltrated.",
    "precedent": "The 2019 Capital One breach (SSRF via WAF misconfiguration, 100M records exposed) demonstrates that authenticated-session data exfiltration via same-origin traversal is a real attack class. Capital One's WAF allowed requests to internal AWS metadata service — analogous to a crawler that follows same-origin links without verifying the destination is not an internal/attacker-controlled endpoint. The lesson: same-origin enforcement alone does not prevent credential exfiltration if the same-origin contains untrusted subdomains."
  },
  "rejection_steelman": "The proposal addresses 5 v1 NOT_RATIFIED conditions but introduces compounding complexity that makes the Phase 3 implementation harder to verify and audit. The 9-stage scrub pipeline adds a new attack surface (OCR engine, image processing, re-OCR verification logic) that itself requires security review. The hybrid allowlist/denylist requires i18n maintenance across 6 language families with documented false-negative gaps. The memory-only storageState, while eliminating the filesystem race, shifts risk to process-memory exposure without a defined threat model for that vector. A simpler v1 that ships authenticated crawl WITHOUT screenshots and WITHOUT persistent storageState would be safer and faster to ratify — the scrub pipeline can be added in Phase 4 once the core auth traversal is proven stable. Deferring the proposal to a Phase 4 scrub pipeline dispatch allows the Panel to review the scrub implementation in isolation against real test fixtures rather than against a spec.",
  "answers": {
    "G-Q2-v2": {
      "pick_text": "Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:\"mfa_required\"; run STOPS; no continue-unauthenticated path.",
      "rationale": "Fail-loud is the correct posture: an authenticated run that cannot authenticate is a failed run, not a degraded one. The v1 silent-continue path created operator confusion (credentials submitted but crawl proceeded unauthenticated without notification). The heuristic-based MFA detection has false-negative risk (see objection 1), but fail-loud is still safer than silent continuation because it forces the operator to re-evaluate the auth path rather than proceeding with incomplete coverage."
    },
    "G-Q3-v2": {
      "pick_text": "Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operator cannot self-enable even in dev/staging).",
      "rationale": "The scrub pipeline is technically sound but the operator self-enable option in the base proposal is too permissive. An operator under time pressure or without security training will enable auth screenshot retention without reading §6a.7. Admin-role-only enforces a second pair of eyes. The re-OCR verification flaw (objection 1) is a concern but does not justify rejecting the pipeline entirely — the pipeline still catches the canonical credential-leak cases; the verification gap is a known residual documented in §6a.6."
    },
    "G-Q4-v2": {
      "pick_text": "Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` returns object only.",
      "rationale": "Memory-only is the correct direction. The filesystem path in v1 created a real race condition (cleanup verification could fail if the process crashed before cleanup ran). Eliminating the path eliminates the class of failure. The process-memory exposure residual is a hosting-environment trust assumption that is documented and materially smaller than on-disk credential storage. The engineering scope contradiction (§13 cleanup helper vs Invariant 2 removal) must be resolved in Phase 3 dispatch before implementation."
    },
    "G-Q6-v2": {
      "pick_text": "Different — describe in rationale.",
      "rationale": "The hybrid approach is directionally correct but the allowlist override is a trust-m
```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 150901 ms
- HTTP status: OK

```
{
  "reviewer_slot": 7,
  "adversarial_pass": {
    "objections": [
      {
        "title": "MFA detection heuristics",
        "detail": "Invariant 3's MFA detection relies on DOM selectors and regex patterns that could miss non-standard MFA implementations (e.g., biometric prompts or proprietary 2FA widgets). This creates false negatives where crawlers hit unhandled MFA walls without proper detection."
      },
      {
        "title": "i18n denylist coverage gaps",
        "detail": "The 6-language destructive-action denylist in §Invariant5 leaves Japanese, Arabic, and other common languages uncovered. A product using '削除' (Japanese 'delete') or 'حذف' (Arabic 'remove') would bypass detection, enabling destructive actions during authenticated crawls."
      },
      {
        "title": "OCR scrub residual risk",
        "detail": "§6a's screenshot scrub pipeline cannot detect credentials rendered via CSS-obfuscated text (e.g., negative letter-spacing) or background-image text. This creates undetectable PII leakage vectors even with operator acknowledgment."
      }
    ],
    "worse_than_status_quo": "The hybrid allowlist/denylist approach could block legitimate UI interactions in multilingual products while missing truly destructive actions in uncovered languages, reducing crawl coverage accuracy below the pre-auth status quo's predictable limitations.",
    "precedent": "2018 Facebook/Cambridge Analytica: Third-party data collection systems failing to properly scrub sensitive session data from crawled information, despite layered safeguards, mirrors risks in §6a's scrub pipeline."
  },
  "rejection_steelman": "This proposal introduces multiple novel attack surfaces (MFA heuristic bypass, i18n denylist gaps, OCR false negatives) without commensurate validation mechanisms. The operational burden of residual risk management for credentialed crawls may exceed the value gained, warranting deferral until MFA detection achieves 99% recall across top 10 language families and scrub pipelines implement CV-based credential detection.",
  "answers": {
    "G-Q2-v2": {
      "pick_text": "Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:\"mfa_required\"; run STOPS; no continue-unauthenticated path.",
      "rationale": "Fail-loud improves on silent degradation, though MFA detection gaps remain an unresolved risk."
    },
    "G-Q3-v2": {
      "pick_text": "Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, operator acknowledges residual risk; DISCARD-on-scrub-failure.",
      "rationale": "Residual risks are acknowledged and mitigated through discard-on-failure, making this preferable to eliminating screenshots entirely."
    },
    "G-Q4-v2": {
      "pick_text": "Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` returns object only.",
      "rationale": "Memory-only storageState properly addresses v1's filesystem risks without introducing new attack surfaces."
    },
    "G-Q6-v2": {
      "pick_text": "Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe=\"true\" allowlist (highest priority) + form-submit denylist + i18n-aware destructive denylist.",
      "rationale": "Hybrid approach balances safety and coverage better than alternatives, though language coverage should expand in future phases."
    },
    "G-Q7-v2": {
      "pick_text": "Ratify v2 short-retention as proposed — retentionClass:\"auth_short\" = 30 days hot, NO cold storage.",
      "rationale": "Reduced retention window appropriately limits exposure of sensitive metadata without compromising core audit needs."
    }
  },
  "overall_notes": "While the proposal makes meaningful improvements, Panel should mandate follow-up dispatches to address i18n coverage gaps and MFA detection robustness before full production rollout."
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 11997 ms
- HTTP status: OK

```
{"reviewer_slot":0,"adversarial_pass":{"objections":[{"title":"Memory-only is overstated","detail":"§4.1 and §2 Invariant 2 treat Playwright `storageState` as memory-only and dismiss the filesystem race entirely, but the proposal still depends on Chromium/Node process memory and IPC. A crash dump, debugger attach, container escape, or hosting introspection could still expose the session object, so the claimed elimination of the storage residue problem is stronger than the mechanism warrants."},{"title":"Screenshot scrub has blind spots","detail":"§6a.3–§6a.6 rely on OCR plus regex redaction, but the spec itself admits custom CSS, obfuscated tokens, and non-text credentials can slip through. That means the system may persist retained authenticated screenshots that look scrubbed yet still contain secrets in pixels, which is a direct confidentiality regression if operators trust the redaction badge."},{"title":"Hybrid denylist can click destructive UI","detail":"§2 Invariant 5 allows any element with `data-crawl-safe=\"true\"` to bypass the destructive denylist, and also allows clicks on buttons not matched by the regex. In a real product, a malicious or mistaken developer could mark a dangerous control safe, or use an unrecognized locale/class, causing the crawler to invoke state-changing actions while authenticated."}],"worse_than_status_quo":"If authenticated crawling is enabled and the login succeeds, the crawler can now traverse deeper into privileged UI while still having a false sense of safety from the allowlist/denylist and screenshot scrub pipeline. In the worst case, it could expose more sensitive surfaces than the current unauthenticated-only crawl, persist sanitized-but-still-sensitive screenshots, and create a stronger audit trail of sensitive product structure without actually improving safety.","precedent":"GitHub issue trackers and security tooling around browser automation have repeatedly run into secrets leaking through logs and screenshots despite redaction attempts; no single precedent fully matches this exact design. A close real-world analogue is browser-based RPA systems that captured credentials in screenshots or traces and later required emergency scrubbing guidance after leaks."},"rejection_steelman":"The strongest case for rejecting or deferring this proposal is that it adds authenticated access, screenshot retention, and broader crawl reach all at once while relying on heuristic guards that are explicitly incomplete. The spec acknowledges multiple residual risks, but then still proposes persistence, audit logging, and cross-origin/session handling that substantially increase operational and legal exposure. A safer path would be to ship the authenticated crawl as fail-loud/no-retention/no-persistence first, then reintroduce screenshots and any allowlist exceptions only after field evidence shows the guards are robust.","answers":{"G-Q2-v2":{"pick_text":"Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:\"mfa_required\"; run STOPS; no continue-unauthenticated path.","rationale":"Fail-loud is preferable to silently downgrading coverage after the operator provided credentials. It avoids false assurance and prevents the system from masking authentication failures as successful crawls."},"G-Q3-v2":{"pick_text":"Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operator cannot self-enable even in dev/staging).","rationale":"The scrub pipeline is better than no screenshots, but operator self-enablement of authenticated screenshots expands risk too much. Requiring admin-only enable preserves the benefit while reducing accidental or unauthorized retention."},"G-Q4-v2":{"pick_text":"Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` returns object only.","rationale":"Eliminating filesystem persistence is a real security improvement over path-based state handling. The memory-residency risk remains, but it is materially narrower than leaving credentialed session material on disk."},"G-Q6-v2":{"pick_text":"REJECT — none of the listed options is acceptable as specified","rationale":"The hybrid gate is still too easy to bypass via `data-crawl-safe=\"true\"`, and the proposed language floor is still incomplete for a global product surface. I would defer until there is a strictly audited allowlist or a formally verified action classification scheme."},"G-Q7-v2":{"pick_text":"REJECT — none of the listed options is acceptable as specified","rationale":"Thirty-day hot-only retention is a major departure from the canonical log policy and may undermine incident response, forensics, and compliance workflows. I would prefer a narrower retention reduction tied to redaction quality and access controls rather than a blanket no-cold policy."}},"overall_notes":"I am not comfortable ratifying the whole package as drafted because the proposal combines multiple incomplete safety mechanisms with expanded privileged access. If forced to choose, the fail-loud auth stance is the cleanest part; the retention and destructive-action controls remain too heuristic."}
```

---

### Slot 9 — openrouter:meta-llama/llama-4-maverick

- Provider: `openrouter`
- Latency: 17179 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "MFA handling ambiguity", "detail": "The proposal's MFA handling (G-Q2-v2) does not specify how the system determines an MFA challenge. The heuristic (presence of 'data-mfa' or specific text patterns) may not cover all MFA implementations." },
      { "title": "Screenshot scrub pipeline limitations", "detail": "The proposed 9-stage scrub pipeline (§6a) has acknowledged residual risks, including custom CSS-styled credential displays and obfuscated tokens, which could lead to sensitive information leakage." },
      { "title": "Destructive-action gate false negatives", "detail": "The hybrid gate (§6a.3) for destructive actions has a denylist that may not be comprehensive across all languages and implementations, potentially allowing harmful actions to be executed." }
    ],
    "worse_than_status_quo": "If the MFA handling fails to detect MFA challenges correctly, it could lead to repeated login attempts, potentially locking out operator accounts or triggering additional security measures, making the system worse than the status quo.",
    "precedent": "Similar authentication traversal mechanisms in other web application security testing tools have faced challenges with MFA handling and destructive action prevention, such as Burp Suite's handling of complex login flows."
  },
  "rejection_steelman": "The proposal could be rejected or deferred due to the complexity and potential risks associated with the authenticated crawl traversal, particularly around MFA handling, screenshot scrubbing, and destructive action prevention. These areas require significant testing and validation to ensure they do not introduce unacceptable risks.",
  "answers": {
    "G-Q2-v2": { "pick_text": "Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:\"mfa_required\"; run STOPS; no continue-unauthenticated path.", "rationale": "Failing loud on MFA challenges is a safer approach as it prevents potential account lockouts or security measure triggers due to repeated login attempts." },
    "G-Q3-v2": { "pick_text": "Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, operator acknowledges residual risk; DISCARD-on-scrub-failure.", "rationale": "The proposed scrub pipeline is comprehensive and the default-OFF retention with operator acknowledgment of residual risk is a balanced approach." },
    "G-Q4-v2": { "pick_text": "Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` returns object only.", "rationale": "Memory-only storageState eliminates the risk of filesystem persistence and associated cleanup issues." },
    "G-Q6-v2": { "pick_text": "Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe=\"true\" allowlist (highest priority) + form-submit denylist + i18n-aware destructive denylist.", "rationale": "The hybrid approach with both allowlist and denylist provides a defence-in-depth strategy against destructive actions." },
    "G-Q7-v2": { "pick_text": "Ratify v2 short-retention as proposed — retentionClass:\"auth_short\" = 30 days hot, NO cold storage.", "rationale": "Shorter retention for credentialed runs reduces the risk of sensitive metadata exposure in case of a future breach or subpoena." }
  },
  "overall_notes": "The proposal addresses several critical security concerns around authenticated crawl traversal, but careful implementation and testing are necessary to mitigate the identified risks."
}
```
```

---

### Slot 10 — openrouter:x-ai/grok-4.3

- Provider: `openrouter`
- Latency: 15186 ms
- HTTP status: OK

```
{
  "reviewer_slot": 2,
  "adversarial_pass": {
    "objections": [
      { "title": "Incomplete i18n denylist coverage", "detail": "Invariant 5's hybrid gate in §2 only defines a 6-language regex (en/es/fr/pt/de/zh-CN) plus data-crawl-safe allowlist; §10 explicitly defers ja/ko/ar/hi/ru and acknowledges custom CSS or JS handlers as false-negative vectors, leaving destructive clicks possible on non-covered locales." },
      { "title": "OCR-dependent screenshot scrub flaws", "detail": "§6a.3 Stage 7 re-OCR verification only catches post-redaction failures; §6a.6 lists OCR misreads (O/0, l/1), exotic CSS letter-spacing, and post-capture JS injection as uncaught residuals, yet still permits persistence after operator ack in dev/staging." },
      { "title": "Retention divergence from canonical", "detail": "Invariant 9 tags credentialed runs with retentionClass:'auth_short' (30 hot, 0 cold) in §5, conflicting with CANONICAL_REFERENCE.md §14.3's mandatory 365+7yr GovernanceAuditLog pattern without an explicit override or RLS carve-out mechanism." }
    ],
    "worse_than_status_quo": "Introducing authenticated crawl with memory-only storageState and acknowledged OCR false-negatives creates a new credential-exfiltration surface that unauthenticated Phase 1 never had; a single heap-dump or OCR miss now leaks live sessions across tenants where the status-quo crawler exposed nothing.",
    "precedent": "The 2019 Facebook 'View As' session-leak incident where insufficient context isolation in internal tooling allowed admin sessions to bleed across accounts, exactly the T2 session-bleed threat modeled in §1."
  },
  "rejection_steelman": "The proposal layers 10 invariants, a 9-stage OCR pipeline, and a hybrid denylist whose own §6a.6 and §10 sections enumerate multiple unfixable false-negative classes, all while diverging from canonical retention and role-gate rules. Deferring until a CV-based classifier and full i18n floor are specified would avoid shipping a system whose safety guarantees are explicitly caveated in the same document that asks for ratification.",
  "answers": {
    "G-Q2-v2": { "pick_text": "Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:\"mfa_required\"; run STOPS; no continue-unauthenticated path.", "rationale": "Forces explicit failure signaling but still leaves single-attempt brittleness unaddressed." },
    "G-Q3-v2": { "pick_text": "Reject v2; revert to v1 GQ3-NO-PNG (Phase 3 ships with NO screenshot retention at all).", "rationale": "Residual risks listed in §6a.6 remain too high for any retention path." },
    "G-Q4-v2": { "pick_text": "Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` returns object only.", "rationale": "Removes the filesystem surface but still exposes heap-dump risk acknowledged in Invariant 2." },
    "G-Q6-v2": { "pick_text": "Ratify hybrid but require additional language families in floor — specify which (e.g. ja, ko, ar must be in Phase 3 floor too).", "rationale": "Hybrid is better than pure denylist yet §10's deferral leaves obvious coverage gaps." },
    "G-Q7-v2": { "pick_text": "Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all.", "rationale": "30-day cutoff is too aggressive versus canonical §14.3 without demonstrated need." }
  },
  "overall_notes": "Multiple sections explicitly document the exact failure modes the spec claims to mitigate, weakening the ratification case."
}
```
