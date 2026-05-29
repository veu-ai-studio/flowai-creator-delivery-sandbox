# Panel Consultation — Phase 2 Auth-Traversal Security Spec — ADVERSARIAL RATIFICATION (2026-05-16)

**Mode:** ADVERSARIAL — locked W5b format (commits `b1cd827` / `ad2ab28` / `3f9dede` precondition MET). HARD GATE 2 of the master phased build (commit `30e5edb`).

**Spec under ratification:** `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` (commit `d8d1239`, 531 lines).

**Anti-rubber-stamp controls active:** anchor-phrase guard, mandatory adversarial pass (≥3 concrete objections + 1 worse-than-status-quo scenario + 1 precedent or honest "no precedent known"), mandatory rejection steelman, dissent floor (`> 80 %` drafted-direction alignment combined with `< 5` distinct objections triggers INVALID).

**Started:** 2026-05-16T19:18:26.945Z
**Finished:** 2026-05-16T19:25:27.917Z
**Bundle size:** 61762 chars (full CANONICAL_REFERENCE.md + spec body).
**Panel audit:** {"providerCounts":{"openai":1,"anthropic":1,"google":1,"mistralai":1,"cohere":1,"minimax":1,"deepseek":1,"perplexity":1,"meta-llama":1,"x-ai":1},"maxPerProvider":1,"slots":10}
**Seed:** `auth-spec-ratification-2026-05-16`

**W6 thresholds:** Quorum = 7/10 · Supermajority = 8/10 · Unanimous = all-ENGAGED on one option.

---

## 🚨 PLAIN RATIFICATION VERDICT

**Status:** `NOT_RATIFIED`

Spec NOT ratified — 5 question(s) returned no clear Panel majority. W5a must address each before Phase 3 may proceed.

**Conditions W5a MUST address before Phase 3 code may be written:**
1. **G-Q2** — MFA handling — Invariant 3 / §10 declares MFA out of scope
   - Verdict: `PLURALITY_GQ2-LOUD`. The spec-author's preferred position ("Fail silently — single-attempt login failure causes the run to continue unauthenticated; matches single-attempt rule.…") did not reach Panel quorum. 5 of 9 on GQ2-LOUD (below 7/10 quorum).
   - W5a action: either (a) re-Panel this question with revised options after engineering analysis, OR (b) adopt one of the dissenting alternatives, OR (c) take the question to CEO arbitration.

2. **G-Q3** — Screenshot scrub — §6.2 documents that PNG screenshots are NOT scrubbed (DOM dumps are)
   - Verdict: `PLURALITY_REJECT`. The spec-author's preferred position ("Accept as proposed — rely on operator review; defer OCR-scrub to a future phase.…") did not reach Panel quorum. 4 of 9 on REJECT (below 7/10 quorum).
   - W5a action: either (a) re-Panel this question with revised options after engineering analysis, OR (b) adopt one of the dissenting alternatives, OR (c) take the question to CEO arbitration.

3. **G-Q4** — storageState filesystem encryption (§2 T5 + Invariant 7)
   - Verdict: `PLURALITY_GQ4-MEMORY`. The spec-author's preferred position ("Accept Vercel ephemerality as sufficient — storageState.json on shared host filesystem for ≤ 20-min run window; auto-del…") did not reach Panel quorum. 4 of 9 on GQ4-MEMORY (below 7/10 quorum).
   - W5a action: either (a) re-Panel this question with revised options after engineering analysis, OR (b) adopt one of the dissenting alternatives, OR (c) take the question to CEO arbitration.

4. **G-Q6** — Destructive-action denylist completeness — Invariant 5 (conservative heuristic; i18n + custom CSS gaps)
   - Verdict: `PLURALITY_GQ6-ACCEPT`. The spec-author's preferred position ("Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-shot credent…") did not reach Panel quorum. 4 of 9 on GQ6-ACCEPT (below 7/10 quorum).
   - W5a action: either (a) re-Panel this question with revised options after engineering analysis, OR (b) adopt one of the dissenting alternatives, OR (c) take the question to CEO arbitration.

5. **G-Q7** — Audit-log retention for credentialed runs — §5 + CA-10-E retention (365 days hot + 7 years cold)
   - Verdict: `PLURALITY_GQ7-SHORT`. The spec-author's preferred position ("Standard retention (365 + 7) — same as other GovernanceAuditLog records.…") did not reach Panel quorum. 5 of 9 on GQ7-SHORT (below 7/10 quorum).
   - W5a action: either (a) re-Panel this question with revised options after engineering analysis, OR (b) adopt one of the dissenting alternatives, OR (c) take the question to CEO arbitration.



---

## DISSENT-FLOOR EVALUATION (Control 4)

Drafted-direction alignment across all 7 questions:
  Aligned: **31 of 63** ENGAGED votes = 49.2 %
  Distinct substantive objections: **30**
  Trigger: alignment > 80 % AND objections < 5

**✅ RESULT: Dissent floor PASSED — adversarial signal valid.** alignment 49.2 %, distinct objections 30.

---

## Slot status

| Slot | Provider | Model | Region/Role | Backup? | Status | Adv state | Invalid reason |
|------|----------|-------|-------------|---------|--------|-----------|----------------|
| 1 | openrouter | `anthropic/claude-opus-4` | US · frontier reasoning | YES → openrouter:anthropic/claude-opus-4 | LIVE-OK | `ENGAGED` | — |
| 2 | openrouter | `anthropic/claude-opus-4` | US · reasoning | — | LIVE-OK | `ENGAGED` | — |
| 3 | openrouter | `meta-llama/llama-3.3-70b-instruct` | US · frontier multimodal | YES → openrouter:meta-llama/llama-3.3-70b-instruct | LIVE-OK | `ENGAGED` | — |
| 4 | openrouter | `mistralai/mistral-large-2411` | Europe · European frontier | — | LIVE-OK | `ENGAGED` | — |
| 5 | openrouter | `mistralai/mistral-large-2411` | Europe/CA · European RAG-tuned | YES → openrouter:mistralai/mistral-large-2411 | LIVE-OK | `ENGAGED` | — |
| 6 | openrouter | `anthropic/claude-opus-4` | Asia · Asia generalist | YES → openrouter:anthropic/claude-opus-4 | LIVE-OK | `ENGAGED` | — |
| 7 | openrouter | `deepseek/deepseek-r1` | Asia · Asia reasoning | — | LIVE-OK | `ENGAGED` | — |
| 8 | openrouter | `perplexity/sonar` | US web-grounded · web-grounded research | — | LIVE-OK | `ENGAGED` | — |
| 9 | openrouter | `meta-llama/llama-4-maverick` | Asia (Beijing → US/Meta after swap) · frontier coding + agentic | — | LIVE-OK | `TANGENTIAL` | 6/7 votes parsed |
| 10 | openrouter | `x-ai/grok-4.3` | US · real-time web-aware reasoning | — | LIVE-OK | `ENGAGED` | — |

LIVE-OK: 10/10. Backups applied: 4. Quorum met (≥7 LIVE-OK): true.

Adversarial classification: **ENGAGED**=9, TANGENTIAL=1, INVALID (votes discarded)=0, SILENT=0

---

## Per-question tally

| Q | Topic | Top option key | Top count | Verdict |
|---|---|---|---:|---|
| **G-Q1** | Cross-origin handling (§4.3 + Invariant 4) | `GQ1-REFUSE` | 8 / 9 | `SUPERMAJORITY_GQ1-REFUSE` |
| **G-Q2** | MFA handling — Invariant 3 / §10 declares MFA out of sc | `GQ2-LOUD` | 5 / 9 | `PLURALITY_GQ2-LOUD` |
| **G-Q3** | Screenshot scrub — §6.2 documents that PNG screenshots  | `REJECT` | 4 / 9 | `PLURALITY_REJECT` |
| **G-Q4** | storageState filesystem encryption (§2 T5 + Invariant 7 | `GQ4-MEMORY` | 4 / 9 | `PLURALITY_GQ4-MEMORY` |
| **G-Q5** | Same-eTLD+1 subdomains — §7.3 default is strict same-or | `GQ5-STRICT` | 8 / 9 | `SUPERMAJORITY_GQ5-STRICT` |
| **G-Q6** | Destructive-action denylist completeness — Invariant 5  | `GQ6-ACCEPT` | 4 / 9 | `PLURALITY_GQ6-ACCEPT` |
| **G-Q7** | Audit-log retention for credentialed runs — §5 + CA-10- | `GQ7-SHORT` | 5 / 9 | `PLURALITY_GQ7-SHORT` |

### Per-question detail

### G-Q1 — Cross-origin handling (§4.3 + Invariant 4)

Tally (ENGAGED-only, 9 reviewers):
  - `GQ1-REFUSE` "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; "  →  **8**
  - `GQ1-FRESH` "Fresh anonymous context for cross-origin requests; richer signal; harder to verify correctness; additional imp"  →  **0**
  - `GQ1-MIXED` "Mixed: refuse by default, allow operator opt-in; auditable via per-run flag; per-product whitelist."  →  **1**
  - `GQ1-OTHER` "Different option — describe in rationale."  →  **0**

**Verdict:** `SUPERMAJORITY_GQ1-REFUSE` — 8 of 9 on GQ1-REFUSE (≥ 8/10).

### G-Q2 — MFA handling — Invariant 3 / §10 declares MFA out of scope

Tally (ENGAGED-only, 9 reviewers):
  - `GQ2-SILENT` "Fail silently — single-attempt login failure causes the run to continue unauthenticated; matches single-attemp"  →  **3**
  - `GQ2-LOUD` "Fail loudly — return ok:false on the entire run with authFailureReason:"mfa_required"; operator must rerun wit"  →  **5**
  - `GQ2-CONFIG` "Configurable per run — operator picks the failure semantic at launch."  →  **1**
  - `GQ2-OTHER` "Different option — describe in rationale."  →  **0**

**Verdict:** `PLURALITY_GQ2-LOUD` — 5 of 9 on GQ2-LOUD (below 7/10 quorum).

### G-Q3 — Screenshot scrub — §6.2 documents that PNG screenshots are NOT scrubbed (DOM dumps are)

Tally (ENGAGED-only, 9 reviewers):
  - `GQ3-ACCEPT` "Accept as proposed — rely on operator review; defer OCR-scrub to a future phase."  →  **3**
  - `GQ3-NO-PNG` "Reject screenshots from the artifact set entirely until OCR-scrub is implemented; Phase 3 ships without screen"  →  **0**
  - `GQ3-WATERMARK` "Watermark every PNG with an "AUTHENTICATED CRAWL — DO NOT SHARE" overlay before persistence."  →  **2**
  - `GQ3-OTHER` "Different option — describe in rationale."  →  **0**

**Verdict:** `PLURALITY_REJECT` — 4 of 9 on REJECT (below 7/10 quorum).

### G-Q4 — storageState filesystem encryption (§2 T5 + Invariant 7)

Tally (ENGAGED-only, 9 reviewers):
  - `GQ4-EPHEM` "Accept Vercel ephemerality as sufficient — storageState.json on shared host filesystem for ≤ 20-min run window"  →  **1**
  - `GQ4-ENCRYPT` "Require encryption-at-rest — Phase 3 dispatch adds Node-side encrypt-before-write + decrypt-on-Playwright-load"  →  **3**
  - `GQ4-MEMORY` "Move storageState into memory-only — Playwright supports in-memory storageState as an object; eliminates §8.3 "  →  **4**
  - `GQ4-OTHER` "Different option — describe in rationale."  →  **0**

**Verdict:** `PLURALITY_GQ4-MEMORY` — 4 of 9 on GQ4-MEMORY (below 7/10 quorum).

### G-Q5 — Same-eTLD+1 subdomains — §7.3 default is strict same-origin

Tally (ENGAGED-only, 9 reviewers):
  - `GQ5-STRICT` "Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance."  →  **8**
  - `GQ5-ETLD1` "Same-eTLD-1 by default; admin-role flag to tighten to strict same-origin; richer crawl by default, weaker isol"  →  **0**
  - `GQ5-WHITE` "Per-product whitelist of allowed subdomain wildcards specified at product registration."  →  **1**
  - `GQ5-OTHER` "Different option — describe in rationale."  →  **0**

**Verdict:** `SUPERMAJORITY_GQ5-STRICT` — 8 of 9 on GQ5-STRICT (≥ 8/10).

### G-Q6 — Destructive-action denylist completeness — Invariant 5 (conservative heuristic; i18n + custom CSS gaps)

Tally (ENGAGED-only, 9 reviewers):
  - `GQ6-ACCEPT` "Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-sh"  →  **4**
  - `GQ6-I18N` "Extend denylist with i18n: localised "delete / cancel / sign out" in the 5 most common languages (en, es, fr, "  →  **1**
  - `GQ6-ALLOW` "Pure allowlist — Conductor clicks ONLY elements explicitly tagged data-crawl-safe="true"; zero false negatives"  →  **1**
  - `GQ6-OTHER` "Different option — describe in rationale."  →  **0**

**Verdict:** `PLURALITY_GQ6-ACCEPT` — 4 of 9 on GQ6-ACCEPT (below 7/10 quorum).

### G-Q7 — Audit-log retention for credentialed runs — §5 + CA-10-E retention (365 days hot + 7 years cold)

Tally (ENGAGED-only, 9 reviewers):
  - `GQ7-STD` "Standard retention (365 + 7) — same as other GovernanceAuditLog records."  →  **4**
  - `GQ7-SHORT` "Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window where an old record c"  →  **5**
  - `GQ7-SEG` "Longer / segregated retention with restricted access (admin-only, separate Supabase table with stricter RLS)."  →  **0**
  - `GQ7-OTHER` "Different option — describe in rationale."  →  **0**

**Verdict:** `PLURALITY_GQ7-SHORT` — 5 of 9 on GQ7-SHORT (below 7/10 quorum).


---

## All distinct substantive objections (verbatim, deduplicated)

Total distinct: **30**

**01. [Slot 1] Credential memory residency gap**

> §3.4 acknowledges JS doesn't expose memory zeroing but provides no mitigation. Credentials remain in Node.js heap until GC, creating an unbounded window where heap dumps or memory inspection could expose them.

**02. [Slot 1] Playwright IPC credential exposure**

> §3.5 states credentials pass through Playwright IPC channel but provides no security analysis of this channel. If the IPC uses shared memory or filesystem sockets, credentials could be exposed to other processes on the same host.

**03. [Slot 1] Cleanup verification race condition**

> §8.3 performs fs.rm then fs.access to verify deletion, but this is not atomic. Another process could recreate the file between deletion and verification, causing false-positive cleanup failures.

**04. [Slot 1] Destructive action allowlist bypass**

> Invariant 5 allows clicking any button not matching the denylist, but §6.6 admits false negatives. A button with onclick='deleteAccount()' but benign text like 'Continue' would bypass all heuristics.

**05. [Slot 1] Cross-subdomain session fixation**

> §7.3 allows same-eTLD+1 crawl with admin flag, but provides no defense against session fixation attacks where app.example.com could set cookies for *.example.com that affect www.example.com authentication state.

**06. [Slot 3] Insufficient MFA Handling**

> The proposal does not adequately address Multi-Factor Authentication (MFA) handling, which could lead to authentication failures or security vulnerabilities. Section 10 of the proposal declares MFA out of scope, but this might not be sufficient for all use cases.

**07. [Slot 3] Potential for Credential Exposure**

> Despite the proposal's emphasis on scrubbing credentials from logs and storage, there is still a risk of credential exposure, particularly if the implementation of the scrubbing mechanism is flawed or if there are unforeseen edge cases. This is a concern in sections 3.4 and 6.1 of the proposal.

**08. [Slot 3] Inadequate Same-Origin Policy Enforcement**

> The proposal's reliance on same-origin policy for preventing cross-origin requests might not be sufficient, as it does not account for all possible scenarios where an authenticated session could be compromised. This is discussed in section 4.3 and Invariant 4 of the proposal.

**09. [Slot 4] Invariant 1 — Credentials never logged, ever**

> The proposal relies on `scrubCredentials()` to ensure credentials are never logged. However, this function must be applied consistently across all logging mechanisms. Any missed application or future changes in logging mechanisms could lead to credential leaks.

**10. [Slot 4] Invariant 5 — Non-destructive action allowlist**

> The denylist for destructive actions is heuristic and may not cover all possible destructive actions, especially in non-English or custom UI environments. This could lead to unintended destructive actions during authenticated crawls.

**11. [Slot 4] Invariant 7 — One-shot credential lifetime**

> The proposal mandates one-shot credentials, but this may be inconvenient for operators who need to run multiple crawls. This could lead to operators finding workarounds that compromise security.

**12. [Slot 5] Incomplete Credential Scrubbing**

> The proposal does not fully address the scrubbing of credentials from network logs and DOM dumps. The heuristic approach may miss certain patterns, leaving a risk of credential leakage. For example, §6.1 mentions scrubbing only specific fields but does not cover all potential credential exposure points.

**13. [Slot 5] Storage State Verification**

> The verification of storage state cleanup is limited to a simple file access check. This may not be sufficient to ensure that the file has been securely deleted, especially in environments where file deletion might not be immediate. The proposal should include a more robust verification mechanism.

**14. [Slot 5] Destructive Action Denylist**

> The denylist for destructive actions is heuristic and may not cover all potential destructive actions, especially in non-English UIs or custom CSS class names. This could lead to unintended destructive actions during the crawl, as outlined in Invariant 5.

**15. [Slot 5] Cross-Origin Handling**

> The proposal suggests refusing cross-origin navigation entirely, which simplifies implementation but loses information about external linking. This could limit the effectiveness of the crawl in identifying issues related to cross-origin navigation, as per §4.3 and Invariant 4.

**16. [Slot 5] Screenshot Scrubbing**

> The proposal acknowledges that PNG screenshots are not scrubbed for credentials, relying on operator review. This introduces a risk of credential exposure if the operator fails to review the screenshots thoroughly, as mentioned in §6.2.

**17. [Slot 7] Inadequate Denylist for Destructive Actions**

> Invariant 5's denylist relies on brittle heuristics (e.g., class names, aria-labels) that may miss non-English or custom UIs. A real product with a 'Terminate Session' button using unique CSS could bypass detection, triggering destructive actions. The proposal acknowledges false negatives but offers no fallback beyond same-origin containment.

**18. [Slot 7] Screenshot Credential Leak Risk**

> §6.2 admits PNG screenshots aren't scrubbed, relying solely on operator review. If credentials appear in a welcome banner (e.g., 'Welcome, user@company.com'), they persist in artifacts. Combined with Vercel Blob's 24h URL accessibility, this creates an undocumented exfiltration vector contradicting Invariant 1.

**19. [Slot 7] Insufficient Memory-Handling Guarantees**

> Threat T10 and §3.4 note credentials linger in Chromium/Node.js memory but propose no mitigations. During a Vercel cold start or heap dump, credentials could leak. The spec lacks memory-zeroing, process isolation, or encryption for in-flight credentials despite SSOT §6's 'never persisted' mandate.

**20. [Slot 7] Orphaned StorageState Cleanup Gaps**

> Invariant 10 relies on a cleanup sweep helper deleting dirs >1 hour old. A crash during the first run could leave credentials exposed for 60 minutes. Worse, if the helper fails, orphaned sessions persist indefinitely—violating §9's 'auto-deleted' SSOT alignment.

**21. [Slot 8] Screenshots still leak secrets**

> §6.2 explicitly allows PNG screenshots to remain unsanitized, and the mitigation is only operator review. In practice, screenshots can capture email addresses, session banners, QR/MFA prompts, or partial secrets in visible DOM, which defeats the stated promise in §1/Invariant 1 that credentials never reach persistent artifacts.

**22. [Slot 8] Cleanup is best-effort only**

> §2 Invariant 2 and §8.3 admit that deletion verification failure is tolerated and the run can still be reported as completed. That means `storageState.json` may survive on disk long enough for another process or a later forensic snapshot to recover cookies, directly contradicting the safety story around ephemeral state.

**23. [Slot 8] Cross-origin policy is under-specified**

> §4.3 and G-Q1 allow either refusal or fresh anonymous context, while §7.3 introduces an opt-in same-eTLD-1 mode. This creates a three-layer policy surface that is easy to misconfigure; a future implementation could accidentally preserve authenticated context across subdomains or treat a subdomain jump as safe when it is not.

**24. [Slot 8] Audit log retains sensitive context**

> §5 records targetOrigin, productId, pagesCrawled, authGatedPagesEncountered, and run timing for authenticated runs, and §14 keeps these rows for 365 days hot plus 7 years cold. Even without raw credentials, that metadata can expose which products use auth gates and when operators accessed them, which is a meaningful privacy and operational-security leak.

**25. [Slot 9] Overly broad click-everything pass**

> §1 T4 and Invariant 5 allow clicks on any non-destructive element. This could still lead to unintended side effects, such as triggering email notifications or other non-obvious actions.

**26. [Slot 9] Lack of explicit credential validation**

> §3.2 only checks for presence and basic formatting of credentials. It doesn't validate if the credentials are actually valid or if the login form exists.

**27. [Slot 9] Insufficient handling of non-standard login forms**

> §3.5 uses heuristic selectors for login form fields. This may not cover all possible login form implementations, potentially leading to login failures or incorrect credential handling.

**28. [Slot 10] Invariant 2 lacks crash-safety verification**

> §2 Invariant 2 requires fs.access verification after fs.rm but the cleanup sweep helper in §8.2 is only scheduled at process start and 1-hour intervals; a crash during the 1-hour window leaves storageState.json readable by subsequent processes on shared Vercel FS.

**29. [Slot 10] Denylist misses non-English buttons**

> Invariant 5's destructive denylist in §2 only matches English regex /\b(delete|remove|...)\b/i and class names like btn-danger; §10 explicitly scopes out i18n so a German 'Löschen' button on an authenticated page would still be clicked.

**30. [Slot 10] Audit log retention conflicts with T1**

> §5.1 records authenticated_crawl_run entries with 365-day hot + 7-year cold per CA-10-E while T1 threat model in §1 requires credentials never appear in any persistent store; a later breach of the cold snapshot would expose run metadata that could be correlated with credentialed sessions.


---

## Strongest single argument against the spec (longest rejection steelman)

**From Slot 8 (openrouter:perplexity/sonar):**

> The strongest case for rejecting or deferring this spec is that it adds high-risk authenticated behavior before the safety controls are fully closed: screenshots are knowingly unsanitized, storage-state deletion is not strictly fail-closed, and the cross-origin policy has multiple selectable modes. Because the design is intended for multi-tenant products and operator-supplied credentials, even one implementation slip can convert a read-only crawl into credential exposure or account-state mutation. Deferring until there is a stricter, simpler, auditable default would reduce the chance of shipping a security mechanism that expands attack surface faster than it shrinks it.

---

## Per-reviewer adversarial pass + steelman + votes

## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential memory residency gap**

> §3.4 acknowledges JS doesn't expose memory zeroing but provides no mitigation. Credentials remain in Node.js heap until GC, creating an unbounded window where heap dumps or memory inspection could expose them.

**Objection 2 — Playwright IPC credential exposure**

> §3.5 states credentials pass through Playwright IPC channel but provides no security analysis of this channel. If the IPC uses shared memory or filesystem sockets, credentials could be exposed to other processes on the same host.

**Objection 3 — Cleanup verification race condition**

> §8.3 performs fs.rm then fs.access to verify deletion, but this is not atomic. Another process could recreate the file between deletion and verification, causing false-positive cleanup failures.

**Objection 4 — Destructive action allowlist bypass**

> Invariant 5 allows clicking any button not matching the denylist, but §6.6 admits false negatives. A button with onclick='deleteAccount()' but benign text like 'Continue' would bypass all heuristics.

**Objection 5 — Cross-subdomain session fixation**

> §7.3 allows same-eTLD+1 crawl with admin flag, but provides no defense against session fixation attacks where app.example.com could set cookies for *.example.com that affect www.example.com authentication state.

**Worse-than-status-quo scenario:** The current Phase 1 implementation marks auth-gated pages and continues safely. This proposal introduces credential handling that, if compromised, could expose operator passwords across multiple products in a single breach.

**Precedent:** The 2019 Jenkins credential plugin vulnerability (CVE-2019-10320) exposed stored credentials through heap dumps during garbage collection, similar to the unmitigated JS heap residency issue in §3.4.

### Rejection steelman

> This spec introduces significant new attack surface by handling plaintext credentials in multiple system layers without adequate memory-safety guarantees. The credential scrubbing approach is reactive rather than preventive, and the single-attempt login design will cause poor operator experience when encountering common auth patterns like MFA or CAPTCHAs. The spec should be deferred until memory-safe credential handling and broader auth-flow support can be designed holistically.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > Given the credential exposure risks identified, the strictest same-origin enforcement minimizes attack surface while maintaining implementation clarity.
- **G-Q2** = `GQ2-LOUD` — Fail loudly — return ok:false on the entire run with authFailureReason:"mfa_required"; ope
  > Silent failure masks a security-critical event; operators need explicit notification when authentication cannot proceed to make informed decisions.
- **G-Q3** = `REJECT` — REJECT
  > Screenshots containing credentials are a permanent disclosure risk; operator review is insufficient given the audit-trail retention periods.
- **G-Q4** = `GQ4-MEMORY` — Move storageState into memory-only — Playwright supports in-memory storageState as an obje
  > Memory-only storage eliminates filesystem exposure entirely and removes the complex cleanup verification that has race conditions.
- **G-Q5** = `GQ5-STRICT` — Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest 
  > The session fixation risk across subdomains requires explicit opt-in with full awareness of the security implications.
- **G-Q6** = `REJECT` — REJECT
  > All options have critical flaws: denylists miss edge cases, allowlists break functionality, and i18n extensions are incomplete. A hybrid approach with both safe-action attributes AND comprehensive denylists is needed.
- **G-Q7** = `GQ7-SHORT` — Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window w
  > Credentialed run records have higher sensitivity than standard audit entries; 7-year retention creates unnecessary long-term exposure risk.

Overall: The spec's threat model is comprehensive but several mitigations are incomplete, particularly around memory safety and credential lifecycle management.

---

## Slot 2 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential memory residency gap**

> §3.4 acknowledges JS doesn't expose memory zeroing but provides no mitigation. Credentials remain in Node.js heap until GC, creating an unbounded window where heap dumps or memory inspection could expose them.

**Objection 2 — Playwright IPC credential exposure**

> §3.5 states credentials pass through Playwright IPC channel but provides no security analysis of this channel. If the IPC uses shared memory or filesystem sockets, credentials could be exposed to other processes on the same host.

**Objection 3 — Cleanup verification race condition**

> §8.3 performs fs.rm then fs.access to verify deletion, but this is not atomic. Another process could recreate the file between deletion and verification, causing false-positive cleanup failures.

**Objection 4 — Destructive action allowlist bypass**

> Invariant 5 allows clicking any button not matching the denylist, but §6.6 admits false negatives. A button with onclick='deleteAccount()' but benign text like 'Continue' would bypass all heuristics.

**Objection 5 — Cross-subdomain session fixation**

> §7.3 allows same-eTLD+1 crawl with admin flag, but provides no defense against session fixation attacks where app.example.com could set cookies for *.example.com that affect www.example.com authentication state.

**Worse-than-status-quo scenario:** The current Phase 1 implementation marks auth-gated pages and continues safely. This proposal introduces credential handling that, if compromised, could expose operator passwords across multiple products in a single breach.

**Precedent:** The 2019 Jenkins credential plugin vulnerability (CVE-2019-10320) exposed stored credentials through heap dumps during garbage collection, similar to the unmitigated JS heap residency issue in §3.4.

### Rejection steelman

> This spec introduces significant new attack surface by handling plaintext credentials in multiple system layers without adequate memory-safety guarantees. The credential scrubbing approach is reactive rather than preventive, and the single-attempt login restriction makes the feature unusable for most real-world products that use MFA. The engineering effort would be better spent on OAuth/SAML support that avoids password handling entirely.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > Given the credential exposure risks identified, the strictest same-origin enforcement minimizes the attack surface and prevents accidental credential leakage to third-party domains.
- **G-Q2** = `GQ2-LOUD` — Fail loudly — return ok:false on the entire run with authFailureReason:"mfa_required"; ope
  > Silent failure masks a critical limitation; operators need explicit notification that authentication failed so they can take corrective action rather than receiving incomplete crawl results.
- **G-Q3** = `REJECT` — REJECT
  > Screenshots containing credentials pose an unacceptable exfiltration risk; operator review is insufficient given the audit trail shows these artifacts can persist for 365 days.
- **G-Q4** = `GQ4-MEMORY` — Move storageState into memory-only — Playwright supports in-memory storageState as an obje
  > Memory-only storage eliminates the filesystem exposure entirely and removes the complex cleanup verification logic that has race condition vulnerabilities.
- **G-Q5** = `GQ5-STRICT` — Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest 
  > The subdomain session fixation risk requires explicit opt-in; defaulting to strict same-origin prevents accidental cross-subdomain credential exposure.
- **G-Q6** = `REJECT` — REJECT
  > All options have critical flaws: the denylist has admitted gaps, i18n extension is insufficient for global products, and the allowlist breaks core functionality. A hybrid approach with both allowlist and denylist is needed.
- **G-Q7** = `GQ7-SHORT` — Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window w
  > Credentialed run records have higher sensitivity than standard audit entries; 7-year retention creates unnecessary long-term exposure risk for security-critical events.

Overall: The spec's reactive scrubbing approach is fundamentally flawed compared to a preventive design that avoids credential handling entirely through OAuth/SAML delegation.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Insufficient MFA Handling**

> The proposal does not adequately address Multi-Factor Authentication (MFA) handling, which could lead to authentication failures or security vulnerabilities. Section 10 of the proposal declares MFA out of scope, but this might not be sufficient for all use cases.

**Objection 2 — Potential for Credential Exposure**

> Despite the proposal's emphasis on scrubbing credentials from logs and storage, there is still a risk of credential exposure, particularly if the implementation of the scrubbing mechanism is flawed or if there are unforeseen edge cases. This is a concern in sections 3.4 and 6.1 of the proposal.

**Objection 3 — Inadequate Same-Origin Policy Enforcement**

> The proposal's reliance on same-origin policy for preventing cross-origin requests might not be sufficient, as it does not account for all possible scenarios where an authenticated session could be compromised. This is discussed in section 4.3 and Invariant 4 of the proposal.

**Worse-than-status-quo scenario:** The proposal's handling of MFA and potential for credential exposure could lead to a situation where the system is less secure than the current status quo, particularly if the implementation does not fully address these concerns. This could result in more frequent authentication failures or security breaches.

**Precedent:** No precedent known for a similar design causing significant problems, but the lack of robust MFA handling and potential for credential exposure are reminiscent of past security vulnerabilities in other systems, such as the OAuth 2.0 authorization framework's weaknesses when not properly implemented.

### Rejection steelman

> The proposal should be rejected or deferred because it does not adequately address critical security concerns, such as MFA handling and the potential for credential exposure. These issues could lead to significant security vulnerabilities, and the proposal's current state does not provide sufficient guarantees for the security and integrity of the system.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > This option is chosen because it provides the simplest and most secure implementation by refusing cross-origin requests entirely, aligning with the same-origin policy as a hard boundary.
- **G-Q2** = `GQ2-LOUD` — Fail loudly — return ok:false on the entire run with authFailureReason:"mfa_required"; ope
  > This option is preferred because it explicitly handles MFA failures by requiring the operator to rerun without MFA, providing a clear and secure failure mode.
- **G-Q3** = `GQ3-ACCEPT` — Accept as proposed — rely on operator review; defer OCR-scrub to a future phase.
  > This option is selected because it balances the need for screenshot review with the complexity of implementing OCR scrubbing, which can be addressed in a future phase.
- **G-Q4** = `GQ4-ENCRYPT` — Require encryption-at-rest — Phase 3 dispatch adds Node-side encrypt-before-write + decryp
  > Encrypting storageState at rest provides an additional layer of security, protecting against unauthorized access to sensitive data.
- **G-Q5** = `GQ5-STRICT` — Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest 
  > This option prioritizes security by enforcing strict same-origin policy by default and allowing for opt-in to same-eTLD-1 traversal with admin permission, minimizing potential risks.
- **G-Q6** = `GQ6-ACCEPT` — Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) +
  > The current denylist, combined with the safeguards of same-origin policy and one-shot credentials, provides a reasonable balance between security and functionality, with the understanding that false negatives are a documented risk.
- **G-Q7** = `GQ7-STD` — Standard retention (365 + 7) — same as other GovernanceAuditLog records.
  > Aligning the retention policy for credentialed runs with the standard for other GovernanceAuditLog records ensures consistency and simplifies management, without introducing unnecessary complexity or security risks.

Overall: The proposal requires more comprehensive security considerations, particularly regarding MFA handling and credential exposure. Addressing these concerns is crucial for ensuring the security and integrity of the system.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Invariant 1 — Credentials never logged, ever**

> The proposal relies on `scrubCredentials()` to ensure credentials are never logged. However, this function must be applied consistently across all logging mechanisms. Any missed application or future changes in logging mechanisms could lead to credential leaks.

**Objection 2 — Invariant 5 — Non-destructive action allowlist**

> The denylist for destructive actions is heuristic and may not cover all possible destructive actions, especially in non-English or custom UI environments. This could lead to unintended destructive actions during authenticated crawls.

**Objection 3 — Invariant 7 — One-shot credential lifetime**

> The proposal mandates one-shot credentials, but this may be inconvenient for operators who need to run multiple crawls. This could lead to operators finding workarounds that compromise security.

**Worse-than-status-quo scenario:** The proposal's reliance on heuristic denylists and one-shot credentials could lead to more frequent crawl failures or unintended destructive actions, making the system less reliable than the current status quo.

**Precedent:** no precedent known

### Rejection steelman

> The proposal should be rejected because it introduces significant security risks through heuristic denylists and one-shot credentials, which could lead to crawl failures or unintended destructive actions. Additionally, the reliance on `scrubCredentials()` for logging may not be foolproof, leading to potential credential leaks.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > This option minimizes security risks by adhering to the same-origin policy strictly.
- **G-Q2** = `GQ2-SILENT` — Fail silently — single-attempt login failure causes the run to continue unauthenticated; m
  > This option aligns with the single-attempt rule and avoids disrupting the crawl process.
- **G-Q3** = `GQ3-ACCEPT` — Accept as proposed — rely on operator review; defer OCR-scrub to a future phase.
  > This option balances current capabilities with future improvements, relying on operator vigilance for now.
- **G-Q4** = `GQ4-EPHEM` — Accept Vercel ephemerality as sufficient — storageState.json on shared host filesystem for
  > This option accepts the current security measures as adequate, given the short lifespan and verified deletion of storageState files.
- **G-Q5** = `GQ5-STRICT` — Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest 
  > This option prioritizes security by default, with an admin-controlled opt-in for broader crawling.
- **G-Q6** = `GQ6-ACCEPT` — Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) +
  > This option acknowledges the risks and relies on existing invariants to mitigate them.
- **G-Q7** = `GQ7-STD` — Standard retention (365 + 7) — same as other GovernanceAuditLog records.
  > This option maintains consistency with existing retention policies, ensuring audit trails are preserved.

Overall: The proposal introduces significant security considerations that need to be carefully managed to avoid potential risks.

---

## Slot 5 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Incomplete Credential Scrubbing**

> The proposal does not fully address the scrubbing of credentials from network logs and DOM dumps. The heuristic approach may miss certain patterns, leaving a risk of credential leakage. For example, §6.1 mentions scrubbing only specific fields but does not cover all potential credential exposure points.

**Objection 2 — Storage State Verification**

> The verification of storage state cleanup is limited to a simple file access check. This may not be sufficient to ensure that the file has been securely deleted, especially in environments where file deletion might not be immediate. The proposal should include a more robust verification mechanism.

**Objection 3 — Destructive Action Denylist**

> The denylist for destructive actions is heuristic and may not cover all potential destructive actions, especially in non-English UIs or custom CSS class names. This could lead to unintended destructive actions during the crawl, as outlined in Invariant 5.

**Objection 4 — Cross-Origin Handling**

> The proposal suggests refusing cross-origin navigation entirely, which simplifies implementation but loses information about external linking. This could limit the effectiveness of the crawl in identifying issues related to cross-origin navigation, as per §4.3 and Invariant 4.

**Objection 5 — Screenshot Scrubbing**

> The proposal acknowledges that PNG screenshots are not scrubbed for credentials, relying on operator review. This introduces a risk of credential exposure if the operator fails to review the screenshots thoroughly, as mentioned in §6.2.

**Worse-than-status-quo scenario:** The proposal's reliance on heuristic denylists and incomplete credential scrubbing could lead to more frequent credential leaks and unintended destructive actions, making the system worse than the current status quo where such risks are more contained.

**Precedent:** The OWASP Top Ten 2021 highlights the risks of inadequate logging and monitoring, which have led to numerous security breaches. Similarly, the Equifax data breach in 2017 was partly due to incomplete scrubbing of sensitive data from logs.

### Rejection steelman

> The proposal should be rejected or deferred until it addresses the incomplete credential scrubbing, provides a more robust storage state verification mechanism, improves the destructive action denylist to cover all potential cases, and ensures that screenshots are adequately scrubbed for credentials.

### Votes

- **G-Q1** = `GQ1-MIXED` — Mixed: refuse by default, allow operator opt-in; auditable via per-run flag; per-product w
  > This option provides a balance between simplicity and richer signal, allowing operators to opt-in for cross-origin navigation while maintaining auditability.
- **G-Q2** = `GQ2-CONFIG` — Configurable per run — operator picks the failure semantic at launch.
  > This option gives operators the flexibility to choose the failure semantic that best suits their needs, whether failing silently or loudly.
- **G-Q3** = `GQ3-WATERMARK` — Watermark every PNG with an "AUTHENTICATED CRAWL — DO NOT SHARE" overlay before persistenc
  > This option provides a clear visual indicator that the screenshot contains sensitive information, reducing the risk of accidental sharing.
- **G-Q4** = `GQ4-ENCRYPT` — Require encryption-at-rest — Phase 3 dispatch adds Node-side encrypt-before-write + decryp
  > This option ensures that the storageState file is securely encrypted, adding an extra layer of protection against unauthorized access.
- **G-Q5** = `GQ5-WHITE` — Per-product whitelist of allowed subdomain wildcards specified at product registration.
  > This option allows for flexible and secure handling of subdomains, ensuring that only approved subdomains are crawled.
- **G-Q6** = `GQ6-I18N` — Extend denylist with i18n: localised "delete / cancel / sign out" in the 5 most common lan
  > This option improves the comprehensiveness of the denylist, reducing the risk of false negatives in non-English UIs.
- **G-Q7** = `GQ7-SHORT` — Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window w
  > This option reduces the risk of credential exposure by minimizing the retention period for credentialed-run records.

Overall: The proposal has several strong points but needs to address the identified objections to ensure robust security and effectiveness.

---

## Slot 6 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential memory residency gap**

> §3.4 acknowledges JS doesn't expose memory zeroing but provides no mitigation. Credentials remain in Node.js heap until GC, creating an unbounded window where heap dumps or memory inspection could expose them.

**Objection 2 — Playwright IPC credential exposure**

> §3.5 states credentials pass through Playwright IPC channel but provides no security analysis of this channel. If the IPC uses shared memory or filesystem sockets, credentials could be exposed to other processes on the same host.

**Objection 3 — Cleanup verification race condition**

> §8.3 performs fs.rm then fs.access to verify deletion, but this is not atomic. Another process could recreate the file between deletion and verification, causing false-positive cleanup failures.

**Objection 4 — Destructive action allowlist bypass**

> Invariant 5 allows clicking any button not matching the denylist, but §6.6 admits false negatives. A button with onclick='deleteAccount()' but benign text like 'Continue' would bypass all heuristics.

**Objection 5 — Cross-subdomain session fixation**

> §7.3 allows same-eTLD+1 crawl with admin flag, but provides no defense against session fixation attacks where app.example.com could set cookies for *.example.com that affect www.example.com authentication state.

**Worse-than-status-quo scenario:** The current Phase 1 implementation marks auth-gated pages and continues safely. This proposal introduces credential handling that, if compromised, could expose operator passwords across multiple products in a single breach.

**Precedent:** The 2019 Jenkins credential plugin vulnerability (CVE-2019-10320) exposed stored credentials through heap dumps during garbage collection, similar to the unmitigated JS heap residency issue in §3.4.

### Rejection steelman

> This spec introduces significant new attack surface by handling plaintext credentials in multiple system layers without adequate memory-safety guarantees. The credential scrubbing approach is reactive rather than preventive, and the single-attempt login design will cause poor operator experience when encountering common auth patterns like MFA or CAPTCHAs. The spec should be deferred until memory-safe credential handling and broader auth-flow support can be designed holistically.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > Given the credential exposure risks identified, the strictest same-origin enforcement minimizes attack surface while maintaining implementation clarity.
- **G-Q2** = `GQ2-LOUD` — Fail loudly — return ok:false on the entire run with authFailureReason:"mfa_required"; ope
  > Silent failure masks a security-critical event; operators need explicit notification when authentication cannot proceed to make informed decisions.
- **G-Q3** = `REJECT` — REJECT
  > Screenshots containing credentials are a permanent disclosure risk; operator review is insufficient given the audit-trail retention periods.
- **G-Q4** = `GQ4-MEMORY` — Move storageState into memory-only — Playwright supports in-memory storageState as an obje
  > Memory-only storage eliminates filesystem exposure entirely and removes the complex cleanup verification that has race conditions.
- **G-Q5** = `GQ5-STRICT` — Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest 
  > The session fixation risk across subdomains requires explicit opt-in with full awareness of the security implications.
- **G-Q6** = `REJECT` — REJECT
  > All options have critical flaws: denylists miss edge cases, allowlists break functionality, and i18n extensions are incomplete. A hybrid approach with both safe-action attributes AND comprehensive denylists is needed.
- **G-Q7** = `GQ7-SHORT` — Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window w
  > Credentialed run records have higher sensitivity than standard audit entries; 7-year retention creates unnecessary long-term exposure risk.

Overall: The spec's threat model is comprehensive but several mitigations are incomplete, particularly around memory safety and credential lifecycle management.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Inadequate Denylist for Destructive Actions**

> Invariant 5's denylist relies on brittle heuristics (e.g., class names, aria-labels) that may miss non-English or custom UIs. A real product with a 'Terminate Session' button using unique CSS could bypass detection, triggering destructive actions. The proposal acknowledges false negatives but offers no fallback beyond same-origin containment.

**Objection 2 — Screenshot Credential Leak Risk**

> §6.2 admits PNG screenshots aren't scrubbed, relying solely on operator review. If credentials appear in a welcome banner (e.g., 'Welcome, user@company.com'), they persist in artifacts. Combined with Vercel Blob's 24h URL accessibility, this creates an undocumented exfiltration vector contradicting Invariant 1.

**Objection 3 — Insufficient Memory-Handling Guarantees**

> Threat T10 and §3.4 note credentials linger in Chromium/Node.js memory but propose no mitigations. During a Vercel cold start or heap dump, credentials could leak. The spec lacks memory-zeroing, process isolation, or encryption for in-flight credentials despite SSOT §6's 'never persisted' mandate.

**Objection 4 — Orphaned StorageState Cleanup Gaps**

> Invariant 10 relies on a cleanup sweep helper deleting dirs >1 hour old. A crash during the first run could leave credentials exposed for 60 minutes. Worse, if the helper fails, orphaned sessions persist indefinitely—violating §9's 'auto-deleted' SSOT alignment.

**Worse-than-status-quo scenario:** If the denylist heuristic misses a 'Delete All Data' button (e.g., due to a custom CSS class), an authenticated crawl could trigger catastrophic data loss. Status quo unauthenticated crawls avoid this by design, making the new system riskier than the current safe-but-limited approach.

**Precedent:** The 2022 LastPass breach involved unscrubbed credentials in memory dumps during debugging—similar to T10. Attackers extracted vault data via a compromised dev's workstation, demonstrating memory-resident credential risks.

### Rejection steelman

> This proposal introduces credential handling and authenticated traversal without addressing fundamental risks: heuristic-based safety controls may fail destructively, memory exposure vectors lack mitigation, and critical paths like cleanup depend on untested helpers. Given Phase 1 already works unauthenticated, deferring until robust encryption, allowlist-based actions, and memory-hardening exist would prevent irreversible breaches.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > Minimizes attack surface; anonymous contexts add complexity without solving core credential risks.
- **G-Q2** = `GQ2-SILENT` — Fail silently — single-attempt login failure causes the run to continue unauthenticated; m
  > Aligns with Invariant 3's strict single-attempt design and avoids overcomplicating UX for out-of-scope MFA.
- **G-Q3** = `GQ3-WATERMARK` — Watermark every PNG with an "AUTHENTICATED CRAWL — DO NOT SHARE" overlay before persistenc
  > Mitigates sharing risks without removing evidence artifacts; balances practicality and caution.
- **G-Q4** = `GQ4-MEMORY` — Move storageState into memory-only — Playwright supports in-memory storageState as an obje
  > Avoids filesystem exposure entirely and simplifies compliance with SSOT §6's ephemeral mandate.
- **G-Q5** = `GQ5-STRICT` — Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest 
  > Prioritizes security isolation while allowing controlled expansion via auditable admin actions.
- **G-Q6** = `GQ6-ACCEPT` — Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) +
  > A allowlist would cripple coverage; i18n expansion is incomplete. Existing invariants contain fallout adequately.
- **G-Q7** = `GQ7-STD` — Standard retention (365 + 7) — same as other GovernanceAuditLog records.
  > Maintains consistency; scrubbing and minimal logging already reduce sensitivity below other entries.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Screenshots still leak secrets**

> §6.2 explicitly allows PNG screenshots to remain unsanitized, and the mitigation is only operator review. In practice, screenshots can capture email addresses, session banners, QR/MFA prompts, or partial secrets in visible DOM, which defeats the stated promise in §1/Invariant 1 that credentials never reach persistent artifacts.

**Objection 2 — Cleanup is best-effort only**

> §2 Invariant 2 and §8.3 admit that deletion verification failure is tolerated and the run can still be reported as completed. That means `storageState.json` may survive on disk long enough for another process or a later forensic snapshot to recover cookies, directly contradicting the safety story around ephemeral state.

**Objection 3 — Cross-origin policy is under-specified**

> §4.3 and G-Q1 allow either refusal or fresh anonymous context, while §7.3 introduces an opt-in same-eTLD-1 mode. This creates a three-layer policy surface that is easy to misconfigure; a future implementation could accidentally preserve authenticated context across subdomains or treat a subdomain jump as safe when it is not.

**Objection 4 — Audit log retains sensitive context**

> §5 records targetOrigin, productId, pagesCrawled, authGatedPagesEncountered, and run timing for authenticated runs, and §14 keeps these rows for 365 days hot plus 7 years cold. Even without raw credentials, that metadata can expose which products use auth gates and when operators accessed them, which is a meaningful privacy and operational-security leak.

**Worse-than-status-quo scenario:** A run logs into a customer tenant, navigates to a profile page showing an email and account name, and persists an untouched screenshot plus a long-lived audit record. If the cleanup verification is skipped because the run otherwise succeeded, an attacker with file-system or log access later reconstructs both the session cookie and the identity of the target account, making the authenticated crawler more dangerous than the current unauthenticated Phase 1 crawler that simply marks pages auth-gated.

**Precedent:** Crawl4AI issue reports and Aider's discussion of LLMs returning markdown-wrapped JSON both show that 'we'll sanitize later' often fails in real pipelines; more directly, browser automation systems like Playwright-based test harnesses have repeatedly leaked auth state via traces/snapshots when cleanup was not enforced. no precedent known

### Rejection steelman

> The strongest case for rejecting or deferring this spec is that it adds high-risk authenticated behavior before the safety controls are fully closed: screenshots are knowingly unsanitized, storage-state deletion is not strictly fail-closed, and the cross-origin policy has multiple selectable modes. Because the design is intended for multi-tenant products and operator-supplied credentials, even one implementation slip can convert a read-only crawl into credential exposure or account-state mutation. Deferring until there is a stricter, simpler, auditable default would reduce the chance of shipping a security mechanism that expands attack surface faster than it shrinks it.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > This is the safest default for authenticated sessions because it prevents cookie leakage to attacker-controlled origins. The spec already accepts information loss as a tradeoff, and the added complexity of mixed opt-ins increases misconfiguration risk.
- **G-Q2** = `GQ2-LOUD` — Fail loudly — return ok:false on the entire run with authFailureReason:"mfa_required"; ope
  > Failing loudly is operationally clearer than silently producing an unauthenticated crawl that may be mistaken for an authenticated assessment. It also avoids blending MFA-induced auth failure into ordinary auth-gated pages.
- **G-Q3** = `REJECT` — REJECT
  > This is the cleanest way to avoid persisting visible secrets before a real sanitization solution exists. Watermarking does not remove the underlying sensitive pixels, and operator review is too weak for a security control.
- **G-Q4** = `GQ4-ENCRYPT` — Require encryption-at-rest — Phase 3 dispatch adds Node-side encrypt-before-write + decryp
  > Ephemeral filesystem semantics are not a sufficient control for credentials-derived session state on a shared host. Encrypting before write reduces the blast radius if cleanup fails or the runtime is inspected.
- **G-Q5** = `GQ5-STRICT` — Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest 
  > Defaulting to strict same-origin minimizes the chance that auth cookies are reused across semi-related subdomains that are actually distinct trust domains. An explicit admin opt-in preserves the broader-crawl use case without weakening the baseline.
- **G-Q6** = `GQ6-ALLOW` — Pure allowlist — Conductor clicks ONLY elements explicitly tagged data-crawl-safe="true"; 
  > For authenticated crawling, the main risk is a destructive click slipping through the heuristic denylist. An allowlist sacrifices breadth, but it gives a much more defensible safety boundary for sensitive sessions.
- **G-Q7** = `GQ7-SHORT` — Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window w
  > Authenticated-run metadata has a different sensitivity profile than ordinary audit entries because it exposes when and where privileged sessions were attempted. Shorter retention is a reasonable privacy-preserving compromise that still leaves enough time for debugging and incident review.

Overall: The core issue is not the idea of authenticated crawling itself; it is that the current spec mixes strong claims with several explicitly soft controls. In security-sensitive paths, defaults should be narrower, simpler, and fail-closed.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `TANGENTIAL`

**Invalid reason:** 6/7 votes parsed

### Adversarial pass

**Objection 1 — Overly broad click-everything pass**

> §1 T4 and Invariant 5 allow clicks on any non-destructive element. This could still lead to unintended side effects, such as triggering email notifications or other non-obvious actions.

**Objection 2 — Lack of explicit credential validation**

> §3.2 only checks for presence and basic formatting of credentials. It doesn't validate if the credentials are actually valid or if the login form exists.

**Objection 3 — Insufficient handling of non-standard login forms**

> §3.5 uses heuristic selectors for login form fields. This may not cover all possible login form implementations, potentially leading to login failures or incorrect credential handling.

**Worse-than-status-quo scenario:** The proposal introduces a new attack surface by handling credentials and authenticated sessions, which could lead to credential leakage or session hijacking if not implemented correctly.

**Precedent:** Similar authenticated crawling mechanisms in other web security testing tools have faced issues with credential handling and session management, such as Burp Suite's session handling features.

### Rejection steelman

> The proposal introduces significant complexity in handling authenticated sessions and credentials, which may not be adequately mitigated by the proposed invariants and test surfaces. The risk of credential leakage or session bleed could outweigh the benefits of authenticated crawling.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > This option is the most secure and simplest to implement, aligning with the principle of least privilege.
- **G-Q2** = `GQ2-LOUD` — Fail loudly — return ok:false on the entire run with authFailureReason:"mfa_required"; ope
  > Failing loudly is more transparent to the operator and prevents silent failures that could lead to incomplete assessments.
- **G-Q3** = `GQ3-WATERMARK` — Watermark every PNG with an "AUTHENTICATED CRAWL — DO NOT SHARE" overlay before persistenc
  > This adds an additional layer of protection against accidental sharing of sensitive screenshots.
- **G-Q4** = `GQ4-MEMORY` — Move storageState into memory-only — Playwright supports in-memory storageState as an obje
  > This approach eliminates the risk of storageState persisting on disk, even temporarily.
- **G-Q5** = `UNMATCHED` — Strict same-origin by default; admin-role flag to opt in to same-eTLD+1 traversal; safest stance.
  > This balances security with the need to crawl related subdomains, while maintaining admin control over the opt-in.
- **G-Q6** = `GQ6-ACCEPT` — Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) +
  > The current denylist is conservative, and the additional invariants provide a safety net.
- **G-Q7** = `GQ7-STD` — Standard retention (365 + 7) — same as other GovernanceAuditLog records.
  > Consistency with existing retention policies is preferable unless there's a specific reason to deviate.

Overall: The proposal requires careful implementation to mitigate the identified risks, particularly around credential handling and session management.

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Invariant 2 lacks crash-safety verification**

> §2 Invariant 2 requires fs.access verification after fs.rm but the cleanup sweep helper in §8.2 is only scheduled at process start and 1-hour intervals; a crash during the 1-hour window leaves storageState.json readable by subsequent processes on shared Vercel FS.

**Objection 2 — Denylist misses non-English buttons**

> Invariant 5's destructive denylist in §2 only matches English regex /\b(delete|remove|...)\b/i and class names like btn-danger; §10 explicitly scopes out i18n so a German 'Löschen' button on an authenticated page would still be clicked.

**Objection 3 — Audit log retention conflicts with T1**

> §5.1 records authenticated_crawl_run entries with 365-day hot + 7-year cold per CA-10-E while T1 threat model in §1 requires credentials never appear in any persistent store; a later breach of the cold snapshot would expose run metadata that could be correlated with credentialed sessions.

**Worse-than-status-quo scenario:** If the single-attempt login rule in Invariant 3 is implemented, operators whose products require MFA will have their runs silently downgraded to unauthenticated crawls without notification, producing incomplete reports that are worse than the Phase 1 status quo which at least marked authGated pages explicitly.

**Precedent:** Similar credential-handling in the 2019 GitHub Actions runner cache poisoning incident where ephemeral secrets leaked across workflow runs due to insufficient isolation of storageState-like artifacts.

### Rejection steelman

> The spec's reliance on a single-attempt login plus heuristic denylist creates a silent downgrade path for real-world MFA-protected products while still exposing storageState artifacts on shared ephemeral filesystems for up to 20 minutes; combined with 7-year cold retention of run metadata, this increases rather than reduces the credential-exfiltration surface compared with the Phase 1 unauthenticated-only design.

### Votes

- **G-Q1** = `GQ1-REFUSE` — Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simpl
  > Matches the same-origin enforcement already present in aggressiveCrawl and avoids adding new anonymous contexts that could still leak timing or error signals.
- **G-Q2** = `GQ2-SILENT` — Fail silently — single-attempt login failure causes the run to continue unauthenticated; m
  > Preserves the single-attempt invariant and avoids introducing new failure modes that would require additional operator UX changes.
- **G-Q3** = `GQ3-ACCEPT` — Accept as proposed — rely on operator review; defer OCR-scrub to a future phase.
  > Keeps Phase 3 scope to the 7 W-day estimate while documenting the PNG limitation explicitly.
- **G-Q4** = `REJECT` — REJECT
  > None of the options addresses the fundamental shared-filesystem exposure window for storageState.json on Vercel.
- **G-Q5** = `GQ5-STRICT` — Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest 
  > Aligns with the conservative stance taken for cross-origin and keeps the admin gate per §13.1.
- **G-Q6** = `GQ6-ACCEPT` — Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) +
  > Avoids scope creep into i18n or pure-allowlist that would break click-everything coverage.
- **G-Q7** = `GQ7-STD` — Standard retention (365 + 7) — same as other GovernanceAuditLog records.
  > Maintains consistency with the existing hash-chained log and avoids creating a new segregated table.

Overall: The proposal is internally consistent with the quoted SSOT line but inherits several unaddressed operational risks from the underlying Vercel runtime model.


---

## Raw reviewer responses (first 8K chars each)

### Slot 1 [BACKUP FIRED] — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 98259 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:openai/gpt-5` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Credential memory residency gap", "detail": "§3.4 acknowledges JS doesn't expose memory zeroing but provides no mitigation. Credentials remain in Node.js heap until GC, creating an unbounded window where heap dumps or memory inspection could expose them." },
      { "title": "Playwright IPC credential exposure", "detail": "§3.5 states credentials pass through Playwright IPC channel but provides no security analysis of this channel. If the IPC uses shared memory or filesystem sockets, credentials could be exposed to other processes on the same host." },
      { "title": "Cleanup verification race condition", "detail": "§8.3 performs fs.rm then fs.access to verify deletion, but this is not atomic. Another process could recreate the file between deletion and verification, causing false-positive cleanup failures." },
      { "title": "Destructive action allowlist bypass", "detail": "Invariant 5 allows clicking any button not matching the denylist, but §6.6 admits false negatives. A button with onclick='deleteAccount()' but benign text like 'Continue' would bypass all heuristics." },
      { "title": "Cross-subdomain session fixation", "detail": "§7.3 allows same-eTLD+1 crawl with admin flag, but provides no defense against session fixation attacks where app.example.com could set cookies for *.example.com that affect www.example.com authentication state." }
    ],
    "worse_than_status_quo": "The current Phase 1 implementation marks auth-gated pages and continues safely. This proposal introduces credential handling that, if compromised, could expose operator passwords across multiple products in a single breach.",
    "precedent": "The 2019 Jenkins credential plugin vulnerability (CVE-2019-10320) exposed stored credentials through heap dumps during garbage collection, similar to the unmitigated JS heap residency issue in §3.4."
  },
  "rejection_steelman": "This spec introduces significant new attack surface by handling plaintext credentials in multiple system layers without adequate memory-safety guarantees. The credential scrubbing approach is reactive rather than preventive, and the single-attempt login design will cause poor operator experience when encountering common auth patterns like MFA or CAPTCHAs. The spec should be deferred until memory-safe credential handling and broader auth-flow support can be designed holistically.",
  "answers": {
    "G-Q1": { "pick_text": "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.", "rationale": "Given the credential exposure risks identified, the strictest same-origin enforcement minimizes attack surface while maintaining implementation clarity." },
    "G-Q2": { "pick_text": "Fail loudly — return ok:false on the entire run with authFailureReason:\"mfa_required\"; operator must rerun without MFA on the target product.", "rationale": "Silent failure masks a security-critical event; operators need explicit notification when authentication cannot proceed to make informed decisions." },
    "G-Q3": { "pick_text": "Reject screenshots from the artifact set entirely until OCR-scrub is implemented; Phase 3 ships without screenshots.", "rationale": "Screenshots containing credentials are a permanent disclosure risk; operator review is insufficient given the audit-trail retention periods." },
    "G-Q4": { "pick_text": "Move storageState into memory-only — Playwright supports in-memory storageState as an object; eliminates §8.3 cleanup-verification path entirely.", "rationale": "Memory-only storage eliminates filesystem exposure entirely and removes the complex cleanup verification that has race conditions." },
    "G-Q5": { "pick_text": "Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.", "rationale": "The session fixation risk across subdomains requires explicit opt-in with full awareness of the security implications." },
    "G-Q6": { "pick_text": "REJECT — none of the listed options is acceptable as specified", "rationale": "All options have critical flaws: denylists miss edge cases, allowlists break functionality, and i18n extensions are incomplete. A hybrid approach with both safe-action attributes AND comprehensive denylists is needed." },
    "G-Q7": { "pick_text": "Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window where an old record could surface.", "rationale": "Credentialed run records have higher sensitivity than standard audit entries; 7-year retention creates unnecessary long-term exposure risk." }
  },
  "overall_notes": "The spec's threat model is comprehensive but several mitigations are incomplete, particularly around memory safety and credential lifecycle management."
}
```

---

### Slot 2 — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 75173 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Credential memory residency gap", "detail": "§3.4 acknowledges JS doesn't expose memory zeroing but provides no mitigation. Credentials remain in Node.js heap until GC, creating an unbounded window where heap dumps or memory inspection could expose them." },
      { "title": "Playwright IPC credential exposure", "detail": "§3.5 states credentials pass through Playwright IPC channel but provides no security analysis of this channel. If the IPC uses shared memory or filesystem sockets, credentials could be exposed to other processes on the same host." },
      { "title": "Cleanup verification race condition", "detail": "§8.3 performs fs.rm then fs.access to verify deletion, but this is not atomic. Another process could recreate the file between deletion and verification, causing false-positive cleanup failures." },
      { "title": "Destructive action allowlist bypass", "detail": "Invariant 5 allows clicking any button not matching the denylist, but §6.6 admits false negatives. A button with onclick='deleteAccount()' but benign text like 'Continue' would bypass all heuristics." },
      { "title": "Cross-subdomain session fixation", "detail": "§7.3 allows same-eTLD+1 crawl with admin flag, but provides no defense against session fixation attacks where app.example.com could set cookies for *.example.com that affect www.example.com authentication state." }
    ],
    "worse_than_status_quo": "The current Phase 1 implementation marks auth-gated pages and continues safely. This proposal introduces credential handling that, if compromised, could expose operator passwords across multiple products in a single breach.",
    "precedent": "The 2019 Jenkins credential plugin vulnerability (CVE-2019-10320) exposed stored credentials through heap dumps during garbage collection, similar to the unmitigated JS heap residency issue in §3.4."
  },
  "rejection_steelman": "This spec introduces significant new attack surface by handling plaintext credentials in multiple system layers without adequate memory-safety guarantees. The credential scrubbing approach is reactive rather than preventive, and the single-attempt login restriction makes the feature unusable for most real-world products that use MFA. The engineering effort would be better spent on OAuth/SAML support that avoids password handling entirely.",
  "answers": {
    "G-Q1": { "pick_text": "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.", "rationale": "Given the credential exposure risks identified, the strictest same-origin enforcement minimizes the attack surface and prevents accidental credential leakage to third-party domains." },
    "G-Q2": { "pick_text": "Fail loudly — return ok:false on the entire run with authFailureReason:\"mfa_required\"; operator must rerun without MFA on the target product.", "rationale": "Silent failure masks a critical limitation; operators need explicit notification that authentication failed so they can take corrective action rather than receiving incomplete crawl results." },
    "G-Q3": { "pick_text": "Reject screenshots from the artifact set entirely until OCR-scrub is implemented; Phase 3 ships without screenshots.", "rationale": "Screenshots containing credentials pose an unacceptable exfiltration risk; operator review is insufficient given the audit trail shows these artifacts can persist for 365 days." },
    "G-Q4": { "pick_text": "Move storageState into memory-only — Playwright supports in-memory storageState as an object; eliminates §8.3 cleanup-verification path entirely.", "rationale": "Memory-only storage eliminates the filesystem exposure entirely and removes the complex cleanup verification logic that has race condition vulnerabilities." },
    "G-Q5": { "pick_text": "Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.", "rationale": "The subdomain session fixation risk requires explicit opt-in; defaulting to strict same-origin prevents accidental cross-subdomain credential exposure." },
    "G-Q6": { "pick_text": "REJECT — none of the listed options is acceptable as specified", "rationale": "All options have critical flaws: the denylist has admitted gaps, i18n extension is insufficient for global products, and the allowlist breaks core functionality. A hybrid approach with both allowlist and denylist is needed." },
    "G-Q7": { "pick_text": "Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window where an old record could surface.", "rationale": "Credentialed run records have higher sensitivity than standard audit entries; 7-year retention creates unnecessary long-term exposure risk for security-critical events." }
  },
  "overall_notes": "The spec's reactive scrubbing approach is fundamentally flawed compared to a preventive design that avoids credential handling entirely through OAuth/SAML delegation."
}
```

---

### Slot 3 [BACKUP FIRED] — openrouter:meta-llama/llama-3.3-70b-instruct

- Provider: `openrouter`
- Latency: 36492 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:google/gemini-2.5-pro` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Insufficient MFA Handling", "detail": "The proposal does not adequately address Multi-Factor Authentication (MFA) handling, which could lead to authentication failures or security vulnerabilities. Section 10 of the proposal declares MFA out of scope, but this might not be sufficient for all use cases." },
      { "title": "Potential for Credential Exposure", "detail": "Despite the proposal's emphasis on scrubbing credentials from logs and storage, there is still a risk of credential exposure, particularly if the implementation of the scrubbing mechanism is flawed or if there are unforeseen edge cases. This is a concern in sections 3.4 and 6.1 of the proposal." },
      { "title": "Inadequate Same-Origin Policy Enforcement", "detail": "The proposal's reliance on same-origin policy for preventing cross-origin requests might not be sufficient, as it does not account for all possible scenarios where an authenticated session could be compromised. This is discussed in section 4.3 and Invariant 4 of the proposal." }
    ],
    "worse_than_status_quo": "The proposal's handling of MFA and potential for credential exposure could lead to a situation where the system is less secure than the current status quo, particularly if the implementation does not fully address these concerns. This could result in more frequent authentication failures or security breaches.",
    "precedent": "No precedent known for a similar design causing significant problems, but the lack of robust MFA handling and potential for credential exposure are reminiscent of past security vulnerabilities in other systems, such as the OAuth 2.0 authorization framework's weaknesses when not properly implemented."
  },
  "rejection_steelman": "The proposal should be rejected or deferred because it does not adequately address critical security concerns, such as MFA handling and the potential for credential exposure. These issues could lead to significant security vulnerabilities, and the proposal's current state does not provide sufficient guarantees for the security and integrity of the system.",
  "answers": {
    "G-Q1": { "pick_text": "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.", "rationale": "This option is chosen because it provides the simplest and most secure implementation by refusing cross-origin requests entirely, aligning with the same-origin policy as a hard boundary." },
    "G-Q2": { "pick_text": "Fail loudly — return ok:false on the entire run with authFailureReason:\"mfa_required\"; operator must rerun without MFA on the target product.", "rationale": "This option is preferred because it explicitly handles MFA failures by requiring the operator to rerun without MFA, providing a clear and secure failure mode." },
    "G-Q3": { "pick_text": "Accept as proposed — rely on operator review; defer OCR-scrub to a future phase.", "rationale": "This option is selected because it balances the need for screenshot review with the complexity of implementing OCR scrubbing, which can be addressed in a future phase." },
    "G-Q4": { "pick_text": "Require encryption-at-rest — Phase 3 dispatch adds Node-side encrypt-before-write + decrypt-on-Playwright-load (~50 LOC + key management).", "rationale": "Encrypting storageState at rest provides an additional layer of security, protecting against unauthorized access to sensitive data." },
    "G-Q5": { "pick_text": "Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.", "rationale": "This option prioritizes security by enforcing strict same-origin policy by default and allowing for opt-in to same-eTLD-1 traversal with admin permission, minimizing potential risks." },
    "G-Q6": { "pick_text": "Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-shot credentials) to bound blast radius.", "rationale": "The current denylist, combined with the safeguards of same-origin policy and one-shot credentials, provides a reasonable balance between security and functionality, with the understanding that false negatives are a documented risk." },
    "G-Q7": { "pick_text": "Standard retention (365 + 7) — same as other GovernanceAuditLog records.", "rationale": "Aligning the retention policy for credentialed runs with the standard for other GovernanceAuditLog records ensures consistency and simplifies management, without introducing unnecessary complexity or security risks." }
  },
  "overall_notes": "The proposal requires more comprehensive security considerations, particularly regarding MFA handling and credential exposure. Addressing these concerns is crucial for ensuring the security and integrity of the system."
}
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 31413 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Invariant 1 — Credentials never logged, ever",
        "detail": "The proposal relies on `scrubCredentials()` to ensure credentials are never logged. However, this function must be applied consistently across all logging mechanisms. Any missed application or future changes in logging mechanisms could lead to credential leaks."
      },
      {
        "title": "Invariant 5 — Non-destructive action allowlist",
        "detail": "The denylist for destructive actions is heuristic and may not cover all possible destructive actions, especially in non-English or custom UI environments. This could lead to unintended destructive actions during authenticated crawls."
      },
      {
        "title": "Invariant 7 — One-shot credential lifetime",
        "detail": "The proposal mandates one-shot credentials, but this may be inconvenient for operators who need to run multiple crawls. This could lead to operators finding workarounds that compromise security."
      }
    ],
    "worse_than_status_quo": "The proposal's reliance on heuristic denylists and one-shot credentials could lead to more frequent crawl failures or unintended destructive actions, making the system less reliable than the current status quo.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "The proposal should be rejected because it introduces significant security risks through heuristic denylists and one-shot credentials, which could lead to crawl failures or unintended destructive actions. Additionally, the reliance on `scrubCredentials()` for logging may not be foolproof, leading to potential credential leaks.",
  "answers": {
    "G-Q1": { "pick_text": "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.", "rationale": "This option minimizes security risks by adhering to the same-origin policy strictly." },
    "G-Q2": { "pick_text": "Fail silently — single-attempt login failure causes the run to continue unauthenticated; matches single-attempt rule.", "rationale": "This option aligns with the single-attempt rule and avoids disrupting the crawl process." },
    "G-Q3": { "pick_text": "Accept as proposed — rely on operator review; defer OCR-scrub to a future phase.", "rationale": "This option balances current capabilities with future improvements, relying on operator vigilance for now." },
    "G-Q4": { "pick_text": "Accept Vercel ephemerality as sufficient — storageState.json on shared host filesystem for ≤ 20-min run window; auto-delete on run end is verified.", "rationale": "This option accepts the current security measures as adequate, given the short lifespan and verified deletion of storageState files." },
    "G-Q5": { "pick_text": "Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.", "rationale": "This option prioritizes security by default, with an admin-controlled opt-in for broader crawling." },
    "G-Q6": { "pick_text": "Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-shot credentials) to bound blast radius.", "rationale": "This option acknowledges the risks and relies on existing invariants to mitigate them." },
    "G-Q7": { "pick_text": "Standard retention (365 + 7) — same as other GovernanceAuditLog records.", "rationale": "This option maintains consistency with existing retention policies, ensuring audit trails are preserved." }
  },
  "overall_notes": "The proposal introduces significant security considerations that need to be carefully managed to avoid potential risks."
}
```

---

### Slot 5 [BACKUP FIRED] — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 34468 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:cohere/command-r-plus-08-2024` (error: timeout after 180000 ms)

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Incomplete Credential Scrubbing",
        "detail": "The proposal does not fully address the scrubbing of credentials from network logs and DOM dumps. The heuristic approach may miss certain patterns, leaving a risk of credential leakage. For example, §6.1 mentions scrubbing only specific fields but does not cover all potential credential exposure points."
      },
      {
        "title": "Storage State Verification",
        "detail": "The verification of storage state cleanup is limited to a simple file access check. This may not be sufficient to ensure that the file has been securely deleted, especially in environments where file deletion might not be immediate. The proposal should include a more robust verification mechanism."
      },
      {
        "title": "Destructive Action Denylist",
        "detail": "The denylist for destructive actions is heuristic and may not cover all potential destructive actions, especially in non-English UIs or custom CSS class names. This could lead to unintended destructive actions during the crawl, as outlined in Invariant 5."
      },
      {
        "title": "Cross-Origin Handling",
        "detail": "The proposal suggests refusing cross-origin navigation entirely, which simplifies implementation but loses information about external linking. This could limit the effectiveness of the crawl in identifying issues related to cross-origin navigation, as per §4.3 and Invariant 4."
      },
      {
        "title": "Screenshot Scrubbing",
        "detail": "The proposal acknowledges that PNG screenshots are not scrubbed for credentials, relying on operator review. This introduces a risk of credential exposure if the operator fails to review the screenshots thoroughly, as mentioned in §6.2."
      }
    ],
    "worse_than_status_quo": "The proposal's reliance on heuristic denylists and incomplete credential scrubbing could lead to more frequent credential leaks and unintended destructive actions, making the system worse than the current status quo where such risks are more contained.",
    "precedent": "The OWASP Top Ten 2021 highlights the risks of inadequate logging and monitoring, which have led to numerous security breaches. Similarly, the Equifax data breach in 2017 was partly due to incomplete scrubbing of sensitive data from logs."
  },
  "rejection_steelman": "The proposal should be rejected or deferred until it addresses the incomplete credential scrubbing, provides a more robust storage state verification mechanism, improves the destructive action denylist to cover all potential cases, and ensures that screenshots are adequately scrubbed for credentials.",
  "answers": {
    "G-Q1": {
      "pick_text": "Mixed: refuse by default, allow operator opt-in; auditable via per-run flag; per-product whitelist.",
      "rationale": "This option provides a balance between simplicity and richer signal, allowing operators to opt-in for cross-origin navigation while maintaining auditability."
    },
    "G-Q2": {
      "pick_text": "Configurable per run — operator picks the failure semantic at launch.",
      "rationale": "This option gives operators the flexibility to choose the failure semantic that best suits their needs, whether failing silently or loudly."
    },
    "G-Q3": {
      "pick_text": "Watermark every PNG with an \"AUTHENTICATED CRAWL — DO NOT SHARE\" overlay before persistence.",
      "rationale": "This option provides a clear visual indicator that the screenshot contains sensitive information, reducing the risk of accidental sharing."
    },
    "G-Q4": {
      "pick_text": "Require encryption-at-rest — Phase 3 dispatch adds Node-side encrypt-before-write + decrypt-on-Playwright-load (~50 LOC + key management).",
      "rationale": "This option ensures that the storageState file is securely encrypted, adding an extra layer of protection against unauthorized access."
    },
    "G-Q5": {
      "pick_text": "Per-product whitelist of allowed subdomain wildcards specified at product registration.",
      "rationale": "This option allows for flexible and secure handling of subdomains, ensuring that only approved subdomains are crawled."
    },
    "G-Q6": {
      "pick_text": "Extend denylist with i18n: localised \"delete / cancel / sign out\" in the 5 most common languages (en, es, fr, de, ja).",
      "rationale": "This option improves the comprehensiveness of the denylist, reducing the risk of false negatives in non-English UIs."
    },
    "G-Q7": {
      "pick_text": "Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window where an old record could surface.",
      "rationale": "This option reduces the risk of credential exposure by minimizing the retention period for credentialed-run records."
    }
  },
  "overall_notes": "The proposal has several strong points but needs to address the identified objections to ensure robust security and effectiveness."
}
```
```

---

### Slot 6 [BACKUP FIRED] — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 68925 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:minimax/minimax-m2.7` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Credential memory residency gap", "detail": "§3.4 acknowledges JS doesn't expose memory zeroing but provides no mitigation. Credentials remain in Node.js heap until GC, creating an unbounded window where heap dumps or memory inspection could expose them." },
      { "title": "Playwright IPC credential exposure", "detail": "§3.5 states credentials pass through Playwright IPC channel but provides no security analysis of this channel. If the IPC uses shared memory or filesystem sockets, credentials could be exposed to other processes on the same host." },
      { "title": "Cleanup verification race condition", "detail": "§8.3 performs fs.rm then fs.access to verify deletion, but this is not atomic. Another process could recreate the file between deletion and verification, causing false-positive cleanup failures." },
      { "title": "Destructive action allowlist bypass", "detail": "Invariant 5 allows clicking any button not matching the denylist, but §6.6 admits false negatives. A button with onclick='deleteAccount()' but benign text like 'Continue' would bypass all heuristics." },
      { "title": "Cross-subdomain session fixation", "detail": "§7.3 allows same-eTLD+1 crawl with admin flag, but provides no defense against session fixation attacks where app.example.com could set cookies for *.example.com that affect www.example.com authentication state." }
    ],
    "worse_than_status_quo": "The current Phase 1 implementation marks auth-gated pages and continues safely. This proposal introduces credential handling that, if compromised, could expose operator passwords across multiple products in a single breach.",
    "precedent": "The 2019 Jenkins credential plugin vulnerability (CVE-2019-10320) exposed stored credentials through heap dumps during garbage collection, similar to the unmitigated JS heap residency issue in §3.4."
  },
  "rejection_steelman": "This spec introduces significant new attack surface by handling plaintext credentials in multiple system layers without adequate memory-safety guarantees. The credential scrubbing approach is reactive rather than preventive, and the single-attempt login design will cause poor operator experience when encountering common auth patterns like MFA or CAPTCHAs. The spec should be deferred until memory-safe credential handling and broader auth-flow support can be designed holistically.",
  "answers": {
    "G-Q1": { "pick_text": "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.", "rationale": "Given the credential exposure risks identified, the strictest same-origin enforcement minimizes attack surface while maintaining implementation clarity." },
    "G-Q2": { "pick_text": "Fail loudly — return ok:false on the entire run with authFailureReason:\"mfa_required\"; operator must rerun without MFA on the target product.", "rationale": "Silent failure masks a security-critical event; operators need explicit notification when authentication cannot proceed to make informed decisions." },
    "G-Q3": { "pick_text": "Reject screenshots from the artifact set entirely until OCR-scrub is implemented; Phase 3 ships without screenshots.", "rationale": "Screenshots containing credentials are a permanent disclosure risk; operator review is insufficient given the audit-trail retention periods." },
    "G-Q4": { "pick_text": "Move storageState into memory-only — Playwright supports in-memory storageState as an object; eliminates §8.3 cleanup-verification path entirely.", "rationale": "Memory-only storage eliminates filesystem exposure entirely and removes the complex cleanup verification that has race conditions." },
    "G-Q5": { "pick_text": "Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.", "rationale": "The session fixation risk across subdomains requires explicit opt-in with full awareness of the security implications." },
    "G-Q6": { "pick_text": "REJECT — none of the listed options is acceptable as specified", "rationale": "All options have critical flaws: denylists miss edge cases, allowlists break functionality, and i18n extensions are incomplete. A hybrid approach with both safe-action attributes AND comprehensive denylists is needed." },
    "G-Q7": { "pick_text": "Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window where an old record could surface.", "rationale": "Credentialed run records have higher sensitivity than standard audit entries; 7-year retention creates unnecessary long-term exposure risk." }
  },
  "overall_notes": "The spec's threat model is comprehensive but several mitigations are incomplete, particularly around memory safety and credential lifecycle management."
}
```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 98854 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Inadequate Denylist for Destructive Actions",
        "detail": "Invariant 5's denylist relies on brittle heuristics (e.g., class names, aria-labels) that may miss non-English or custom UIs. A real product with a 'Terminate Session' button using unique CSS could bypass detection, triggering destructive actions. The proposal acknowledges false negatives but offers no fallback beyond same-origin containment."
      },
      {
        "title": "Screenshot Credential Leak Risk",
        "detail": "§6.2 admits PNG screenshots aren't scrubbed, relying solely on operator review. If credentials appear in a welcome banner (e.g., 'Welcome, user@company.com'), they persist in artifacts. Combined with Vercel Blob's 24h URL accessibility, this creates an undocumented exfiltration vector contradicting Invariant 1."
      },
      {
        "title": "Insufficient Memory-Handling Guarantees",
        "detail": "Threat T10 and §3.4 note credentials linger in Chromium/Node.js memory but propose no mitigations. During a Vercel cold start or heap dump, credentials could leak. The spec lacks memory-zeroing, process isolation, or encryption for in-flight credentials despite SSOT §6's 'never persisted' mandate."
      },
      {
        "title": "Orphaned StorageState Cleanup Gaps",
        "detail": "Invariant 10 relies on a cleanup sweep helper deleting dirs >1 hour old. A crash during the first run could leave credentials exposed for 60 minutes. Worse, if the helper fails, orphaned sessions persist indefinitely—violating §9's 'auto-deleted' SSOT alignment."
      }
    ],
    "worse_than_status_quo": "If the denylist heuristic misses a 'Delete All Data' button (e.g., due to a custom CSS class), an authenticated crawl could trigger catastrophic data loss. Status quo unauthenticated crawls avoid this by design, making the new system riskier than the current safe-but-limited approach.",
    "precedent": "The 2022 LastPass breach involved unscrubbed credentials in memory dumps during debugging—similar to T10. Attackers extracted vault data via a compromised dev's workstation, demonstrating memory-resident credential risks."
  },
  "rejection_steelman": "This proposal introduces credential handling and authenticated traversal without addressing fundamental risks: heuristic-based safety controls may fail destructively, memory exposure vectors lack mitigation, and critical paths like cleanup depend on untested helpers. Given Phase 1 already works unauthenticated, deferring until robust encryption, allowlist-based actions, and memory-hardening exist would prevent irreversible breaches.",
  "answers": {
    "G-Q1": {
      "pick_text": "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.",
      "rationale": "Minimizes attack surface; anonymous contexts add complexity without solving core credential risks."
    },
    "G-Q2": {
      "pick_text": "Fail silently — single-attempt login failure causes the run to continue unauthenticated; matches single-attempt rule.",
      "rationale": "Aligns with Invariant 3's strict single-attempt design and avoids overcomplicating UX for out-of-scope MFA."
    },
    "G-Q3": {
      "pick_text": "Watermark every PNG with an \"AUTHENTICATED CRAWL — DO NOT SHARE\" overlay before persistence.",
      "rationale": "Mitigates sharing risks without removing evidence artifacts; balances practicality and caution."
    },
    "G-Q4": {
      "pick_text": "Move storageState into memory-only — Playwright supports in-memory storageState as an object; eliminates §8.3 cleanup-verification path entirely.",
      "rationale": "Avoids filesystem exposure entirely and simplifies compliance with SSOT §6's ephemeral mandate."
    },
    "G-Q5": {
      "pick_text": "Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.",
      "rationale": "Prioritizes security isolation while allowing controlled expansion via auditable admin actions."
    },
    "G-Q6": {
      "pick_text": "Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-shot credentials) to bound blast radius.",
      "rationale": "A allowlist would cripple coverage; i18n expansion is incomplete. Existing invariants contain fallout adequately."
    },
    "G-Q7": {
      "pick_text": "Standard retention (365 + 7) — same as other GovernanceAuditLog records.",
      "rationale": "Maintains consistency; scrubbing and minimal logging already reduce sensitivity below other entries."
    }
  },
  "overall_notes": ""
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 12870 ms
- HTTP status: OK

```
{"reviewer_slot":0,"adversarial_pass":{"objections":[{"title":"Screenshots still leak secrets","detail":"§6.2 explicitly allows PNG screenshots to remain unsanitized, and the mitigation is only operator review. In practice, screenshots can capture email addresses, session banners, QR/MFA prompts, or partial secrets in visible DOM, which defeats the stated promise in §1/Invariant 1 that credentials never reach persistent artifacts."},{"title":"Cleanup is best-effort only","detail":"§2 Invariant 2 and §8.3 admit that deletion verification failure is tolerated and the run can still be reported as completed. That means `storageState.json` may survive on disk long enough for another process or a later forensic snapshot to recover cookies, directly contradicting the safety story around ephemeral state."},{"title":"Cross-origin policy is under-specified","detail":"§4.3 and G-Q1 allow either refusal or fresh anonymous context, while §7.3 introduces an opt-in same-eTLD-1 mode. This creates a three-layer policy surface that is easy to misconfigure; a future implementation could accidentally preserve authenticated context across subdomains or treat a subdomain jump as safe when it is not."},{"title":"Audit log retains sensitive context","detail":"§5 records targetOrigin, productId, pagesCrawled, authGatedPagesEncountered, and run timing for authenticated runs, and §14 keeps these rows for 365 days hot plus 7 years cold. Even without raw credentials, that metadata can expose which products use auth gates and when operators accessed them, which is a meaningful privacy and operational-security leak."}],"worse_than_status_quo":"A run logs into a customer tenant, navigates to a profile page showing an email and account name, and persists an untouched screenshot plus a long-lived audit record. If the cleanup verification is skipped because the run otherwise succeeded, an attacker with file-system or log access later reconstructs both the session cookie and the identity of the target account, making the authenticated crawler more dangerous than the current unauthenticated Phase 1 crawler that simply marks pages auth-gated.","precedent":"Crawl4AI issue reports and Aider's discussion of LLMs returning markdown-wrapped JSON both show that 'we'll sanitize later' often fails in real pipelines; more directly, browser automation systems like Playwright-based test harnesses have repeatedly leaked auth state via traces/snapshots when cleanup was not enforced. no precedent known"},"rejection_steelman":"The strongest case for rejecting or deferring this spec is that it adds high-risk authenticated behavior before the safety controls are fully closed: screenshots are knowingly unsanitized, storage-state deletion is not strictly fail-closed, and the cross-origin policy has multiple selectable modes. Because the design is intended for multi-tenant products and operator-supplied credentials, even one implementation slip can convert a read-only crawl into credential exposure or account-state mutation. Deferring until there is a stricter, simpler, auditable default would reduce the chance of shipping a security mechanism that expands attack surface faster than it shrinks it.","answers":{"G-Q1":{"pick_text":"Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.","rationale":"This is the safest default for authenticated sessions because it prevents cookie leakage to attacker-controlled origins. The spec already accepts information loss as a tradeoff, and the added complexity of mixed opt-ins increases misconfiguration risk."},"G-Q2":{"pick_text":"Fail loudly — return ok:false on the entire run with authFailureReason:\"mfa_required\"; operator must rerun without MFA on the target product.","rationale":"Failing loudly is operationally clearer than silently producing an unauthenticated crawl that may be mistaken for an authenticated assessment. It also avoids blending MFA-induced auth failure into ordinary auth-gated pages."},"G-Q3":{"pick_text":"Reject screenshots from the artifact set entirely until OCR-scrub is implemented; Phase 3 ships without screenshots.","rationale":"This is the cleanest way to avoid persisting visible secrets before a real sanitization solution exists. Watermarking does not remove the underlying sensitive pixels, and operator review is too weak for a security control."},"G-Q4":{"pick_text":"Require encryption-at-rest — Phase 3 dispatch adds Node-side encrypt-before-write + decrypt-on-Playwright-load (~50 LOC + key management).","rationale":"Ephemeral filesystem semantics are not a sufficient control for credentials-derived session state on a shared host. Encrypting before write reduces the blast radius if cleanup fails or the runtime is inspected."},"G-Q5":{"pick_text":"Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.","rationale":"Defaulting to strict same-origin minimizes the chance that auth cookies are reused across semi-related subdomains that are actually distinct trust domains. An explicit admin opt-in preserves the broader-crawl use case without weakening the baseline."},"G-Q6":{"pick_text":"Pure allowlist — Conductor clicks ONLY elements explicitly tagged data-crawl-safe=\"true\"; zero false negatives; near-total loss of click-everything coverage.","rationale":"For authenticated crawling, the main risk is a destructive click slipping through the heuristic denylist. An allowlist sacrifices breadth, but it gives a much more defensible safety boundary for sensitive sessions."},"G-Q7":{"pick_text":"Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window where an old record could surface.","rationale":"Authenticated-run metadata has a different sensitivity profile than ordinary audit entries because it exposes when and where privileged sessions were attempted. Shorter retention is a reasonable privacy-preserving compromise that still leaves enough time for debugging and incident review."}},"overall_notes":"The core issue is not the idea of authenticated crawling itself; it is that the current spec mixes strong claims with several explicitly soft controls. In security-sensitive paths, defaults should be narrower, simpler, and fail-closed."}
```

---

### Slot 9 — openrouter:meta-llama/llama-4-maverick

- Provider: `openrouter`
- Latency: 17598 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Overly broad click-everything pass",
        "detail": "§1 T4 and Invariant 5 allow clicks on any non-destructive element. This could still lead to unintended side effects, such as triggering email notifications or other non-obvious actions."
      },
      {
        "title": "Lack of explicit credential validation",
        "detail": "§3.2 only checks for presence and basic formatting of credentials. It doesn't validate if the credentials are actually valid or if the login form exists."
      },
      {
        "title": "Insufficient handling of non-standard login forms",
        "detail": "§3.5 uses heuristic selectors for login form fields. This may not cover all possible login form implementations, potentially leading to login failures or incorrect credential handling."
      }
    ],
    "worse_than_status_quo": "The proposal introduces a new attack surface by handling credentials and authenticated sessions, which could lead to credential leakage or session hijacking if not implemented correctly.",
    "precedent": "Similar authenticated crawling mechanisms in other web security testing tools have faced issues with credential handling and session management, such as Burp Suite's session handling features."
  },
  "rejection_steelman": "The proposal introduces significant complexity in handling authenticated sessions and credentials, which may not be adequately mitigated by the proposed invariants and test surfaces. The risk of credential leakage or session bleed could outweigh the benefits of authenticated crawling.",
  "answers": {
    "G-Q1": {
      "pick_text": "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.",
      "rationale": "This option is the most secure and simplest to implement, aligning with the principle of least privilege."
    },
    "G-Q2": {
      "pick_text": "Fail loudly — return ok:false on the entire run with authFailureReason:\"mfa_required\"; operator must rerun without MFA on the target product.",
      "rationale": "Failing loudly is more transparent to the operator and prevents silent failures that could lead to incomplete assessments."
    },
    "G-Q3": {
      "pick_text": "Watermark every PNG with an \"AUTHENTICATED CRAWL — DO NOT SHARE\" overlay before persistence.",
      "rationale": "This adds an additional layer of protection against accidental sharing of sensitive screenshots."
    },
    "G-Q4": {
      "pick_text": "Move storageState into memory-only — Playwright supports in-memory storageState as an object; eliminates §8.3 cleanup-verification path entirely.",
      "rationale": "This approach eliminates the risk of storageState persisting on disk, even temporarily."
    },
    "G-Q5": {
      "pick_text": "Strict same-origin by default; admin-role flag to opt in to same-eTLD+1 traversal; safest stance.",
      "rationale": "This balances security with the need to crawl related subdomains, while maintaining admin control over the opt-in."
    },
    "G-Q6": {
      "pick_text": "Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-shot credentials) to bound blast radius.",
      "rationale": "The current denylist is conservative, and the additional invariants provide a safety net."
    },
    "G-Q7": {
      "pick_text": "Standard retention (365 + 7) — same as other GovernanceAuditLog records.",
      "rationale": "Consistency with existing retention policies is preferable unless there's a specific reason to deviate."
    }
  },
  "overall_notes": "The proposal requires careful implementation to mitigate the identified risks, particularly around credential handling and session management."
}```
```

---

### Slot 10 — openrouter:x-ai/grok-4.3

- Provider: `openrouter`
- Latency: 22100 ms
- HTTP status: OK

```
{
  "reviewer_slot": 2,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Invariant 2 lacks crash-safety verification",
        "detail": "§2 Invariant 2 requires fs.access verification after fs.rm but the cleanup sweep helper in §8.2 is only scheduled at process start and 1-hour intervals; a crash during the 1-hour window leaves storageState.json readable by subsequent processes on shared Vercel FS."
      },
      {
        "title": "Denylist misses non-English buttons",
        "detail": "Invariant 5's destructive denylist in §2 only matches English regex /\\b(delete|remove|...)\\b/i and class names like btn-danger; §10 explicitly scopes out i18n so a German 'Löschen' button on an authenticated page would still be clicked."
      },
      {
        "title": "Audit log retention conflicts with T1",
        "detail": "§5.1 records authenticated_crawl_run entries with 365-day hot + 7-year cold per CA-10-E while T1 threat model in §1 requires credentials never appear in any persistent store; a later breach of the cold snapshot would expose run metadata that could be correlated with credentialed sessions."
      }
    ],
    "worse_than_status_quo": "If the single-attempt login rule in Invariant 3 is implemented, operators whose products require MFA will have their runs silently downgraded to unauthenticated crawls without notification, producing incomplete reports that are worse than the Phase 1 status quo which at least marked authGated pages explicitly.",
    "precedent": "Similar credential-handling in the 2019 GitHub Actions runner cache poisoning incident where ephemeral secrets leaked across workflow runs due to insufficient isolation of storageState-like artifacts."
  },
  "rejection_steelman": "The spec's reliance on a single-attempt login plus heuristic denylist creates a silent downgrade path for real-world MFA-protected products while still exposing storageState artifacts on shared ephemeral filesystems for up to 20 minutes; combined with 7-year cold retention of run metadata, this increases rather than reduces the credential-exfiltration surface compared with the Phase 1 unauthenticated-only design.",
  "answers": {
    "G-Q1": {
      "pick_text": "Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.",
      "rationale": "Matches the same-origin enforcement already present in aggressiveCrawl and avoids adding new anonymous contexts that could still leak timing or error signals."
    },
    "G-Q2": {
      "pick_text": "Fail silently — single-attempt login failure causes the run to continue unauthenticated; matches single-attempt rule.",
      "rationale": "Preserves the single-attempt invariant and avoids introducing new failure modes that would require additional operator UX changes."
    },
    "G-Q3": {
      "pick_text": "Accept as proposed — rely on operator review; defer OCR-scrub to a future phase.",
      "rationale": "Keeps Phase 3 scope to the 7 W-day estimate while documenting the PNG limitation explicitly."
    },
    "G-Q4": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "None of the options addresses the fundamental shared-filesystem exposure window for storageState.json on Vercel."
    },
    "G-Q5": {
      "pick_text": "Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.",
      "rationale": "Aligns with the conservative stance taken for cross-origin and keeps the admin gate per §13.1."
    },
    "G-Q6": {
      "pick_text": "Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-shot credentials) to bound blast radius.",
      "rationale": "Avoids scope creep into i18n or pure-allowlist that would break click-everything coverage."
    },
    "G-Q7": {
      "pick_text": "Standard retention (365 + 7) — same as other GovernanceAuditLog records.",
      "rationale": "Maintains consistency with the existing hash-chained log and avoids creating a new segregated table."
    }
  },
  "overall_notes": "The proposal is internally consistent with the quoted SSOT line but inherits several unaddressed operational risks from the underlying Vercel runtime model."
}
```
