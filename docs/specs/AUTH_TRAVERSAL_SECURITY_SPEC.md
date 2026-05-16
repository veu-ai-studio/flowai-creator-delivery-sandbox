# Authenticated Crawl Traversal — Security Spec

**Status:** DRAFT v4 (Phase 2 of Master Phased Build, Panel ruling `30e5edb`). NOT canonical SSOT. NOT yet engineering-ready — requires W6 adversarial Panel **re-ratification** before Phase 3 implementation. v1 was `NOT_RATIFIED` at commit `556a751` with 5 conditions; v2 (commit `b782e2f`) addressed 5 conditions per CEO disposition; v3 (commit `be594e3`) addressed 4 targeted concerns from the v2 Panel re-ratification per CEO-locked decisions on Q3/Q4/Q6/Q7; the v3 Panel re-ratification carried Q3-v3 (Option B screenshots) at supermajority but surfaced 3 sub-quorum positions on Q4 / Q6 / Q7. v4 (this commit) applies 3 condition-closer edits identified by the v3 Panel to push those 3 questions to supermajority.
**Author:** W5a, 2026-05-16 (v4 revision).
**v3 → v4 changelog (3 surgical condition-closers — no redesign, no new sections):**
- Cond 1 (Q4 storageState — memory-pressure monitor): converts 3 MONITOR votes from the v3 Panel into MUST votes. §13 Engineering Scope and §11 acceptance criteria now require Phase 3 to ship a memory-pressure monitor as a non-negotiable deliverable. Monitor tracks `process.memoryUsage()` heap consumption during storageState operations; when usage exceeds a configurable threshold (default 80% of available heap) the crawl run FAILS LOUDLY (`ok:false, reason: 'memory_pressure_abort'`) and NEVER spills storageState to disk. Hard-fail semantic is explicit: memory pressure aborts the run, it does not trigger a filesystem fallback. Reinforces Invariant 2 MUST without weakening it.
- Cond 2 (Q6 i18n denylist — language-expansion process): converts 2 MORE-LANGUAGES votes from the v3 Panel into 9-FLOOR votes. Invariant 5 and §11 acceptance criteria now codify an explicit expansion path: additional language families (hi, ru, vi, tr, th, and others) are added via a per-product opt-in to the FlowAI denylist registry with native-speaker review attestation; W5a reviews and merges; no Panel re-ratification is required for floor expansions beyond 9 — the process itself is the control.
- Cond 3 (Q7 retention — rationale): converts 3 DIFFERENT-RETENTION votes from the v3 Panel into 90-1yr votes (target 9/9 alignment). §5 audit-log surface gains a rationale paragraph explaining why 90 hot + 1yr cold is the correct point — naming the 30/0 compliance dead-zone the Panel rejected, the 365/7yr over-retention liability, the quarterly enterprise security review cycle the 90-day hot window covers, and the annual compliance review the 1-year cold window covers. No new retention values; only the why.

**v3 positions UNCHANGED in v4 (carried forward as RATIFIED):** Q3-v3 (Option B — screenshots deferred to Phase 4) was ratified by the v3 Panel; v4 does not re-open it. G-Q1 (cross-origin refuse), G-Q2-v2 (MFA fail-loud), and G-Q5 (strict same-origin subdomains) remain SUPERMAJORITY-ratified from earlier rounds.
**Lineage:** Closes Panel ruling `30e5edb` Q5 (auth-traversal security is the dominant risk in moving from single-page to multi-page authenticated crawl). Operationalises CANONICAL_REFERENCE.md §6 line 110 credential handling. Builds on Aggressive Crawl Engine spec (`docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md`) §A.5 authenticated-vs-unauthenticated paths.
**Anchor canonical:** CANONICAL_REFERENCE.md §6 + §13 (Auth + Role Model) + §14 (GovernanceAuditLog credential-handling rules).
**Phase 1 dependency (already shipped, commit `83fb20a`):** Agent #21 Aggressive Crawl Conductor routes the assessment path through `aggressiveCrawl()`. Phase 1 marks auth-gated pages with `authGated: true` and CONTINUES the crawl WITHOUT attempting login. This spec is the contract for the Phase 3 implementation that brings actual authentication online.
**Scope:** read-only spec authoring. No code changes in Phase 2. No canonical SSOT changes in Phase 2. Phase 3 (implementation, separate dispatch + separate gate) writes the code per this spec verbatim once Panel ratifies.

---

## 1. Threat model (what this spec protects against)

Authenticated crawl traversal multiplies the blast radius of the simpler unauthenticated crawler by introducing three new attack/leak surfaces:

| Threat | Concrete failure mode | Why it matters |
|---|---|---|
| **T1. Credential exfiltration** | Operator's product credentials appear in a log file, audit row, error message, Sentry trace, AI prompt, screenshot, or Panel transcript. | An operator submitting credentials for one product cannot have those credentials end up in the audit trail of ANOTHER product, in a Claude API request, in a Vercel build log, or in any persistent store. SSOT §6 line 110 is unambiguous: credentials NEVER logged. |
| **T2. Session bleed across crawl targets** | A logged-in `storageState` for product A is reused (deliberately or by bug) when crawling product B → product B sees product A's session. | Multi-tenant correctness: every credentialed crawl session MUST be isolated to a single `(productId, environment, runId)` triple. Cookies / tokens / localStorage from one target NEVER leak into another. |
| **T3. Unauthorized scope expansion** | Authenticated crawl follows a link OFF the target origin and submits the operator's session there. | Same-origin policy applies to the BROWSER; this is about applying it to the CRAWLER. An authenticated Playwright context navigating to `https://attacker.example` sends the target product's session cookies to a third party. |
| **T4. Destructive action via crawl** | A "click everything" pass clicks a Delete / Logout / Submit button while authenticated → mutates the target product. | The Conductor SHALL NOT perform destructive actions while authenticated. Allowlist of safe DOM events only; reject form submissions outside the §6 line 102-104 XSS opt-in (which is dev/staging only). |
| **T5. Storage residue after run end** | Playwright `storageState` JSON file remains on disk after the run ends → next run / next operator / process restart can read it. | Ephemeral storage with auto-delete is mandatory per SSOT §6 line 110. This spec defines what "auto-delete" means concretely: when, by whom, with what verification. |
| **T6. Credentials in evidence artifacts** | Screenshots / network logs / DOM dumps capture the credentials as part of the page state (e.g. a password field that didn't get autofilled showing the password value, or a "Welcome ${email}" greeting). | Evidence artifacts (screenshots, HTML dumps, network logs) must be scrubbed for credential patterns BEFORE persistence. |
| **T7. CAPTCHA / MFA / rate-limit blowback** | The Conductor's repeated login attempts trip a CAPTCHA, MFA challenge, or rate limiter on the target product → operator's real account gets locked. | Single-attempt-per-run rule. No retry-on-fail. No bypass attempt. |
| **T8. Cross-run credential reuse** | An operator submits credentials for run N; run N+1 (different run, different runId) silently reuses them. | One-shot credentials: scoped to a single runId only. Re-supply required for every run. |
| **T9. Audit-log injection** | Operator-supplied credential values that happen to contain log-format-breaking characters (newlines, ANSI escape codes) corrupt the audit log. | Even though credentials are scrubbed BEFORE logging, the scrubbing path itself must be safe — log-injection-resistant string handling. |
| **T10. Memory-resident credential lifetime** | Credentials sit in JS heap longer than necessary; a memory dump / debugger / crash report exposes them. | Short JS-heap residency: credentials read once, passed through to Playwright, immediately overwritten in any caller-side variable that's not needed for the active crawl. |

---

## 2. Invariants (non-negotiable contracts the Phase 3 implementation MUST satisfy)

The Phase 3 implementation is conformant only when ALL of the following invariants hold. Any violation is a Phase-3-blocking bug.

### Invariant 1 — Credentials never logged, ever.

For every log sink in the system (`console.log`, structured logger, Sentry, Vercel build log, audit trail, Panel transcript, Claude prompt, OpenRouter request, GovernanceAuditLog entry), the implementation guarantees by construction that `loginEmail` and `loginPassword` field values do NOT appear in any payload sent to that sink. The mechanism is `scrubCredentials()` (already shipped at `src/lib/renewal/inputArtifact.js:146`) applied at every persist / log / external-send boundary.

**Test surface (Phase 3 acceptance):** a deliberate negative test that:
- Submits known-canary credentials (`canary-EMAIL-FLOWAI-CANARY-${runId}@test.invalid`, `canary-PASSWORD-FLOWAI-CANARY-${runId}-NONCE`).
- Runs a full authenticated crawl.
- Greps every persistent artifact (Supabase rows, log files, Sentry sample, ProductSSOT JSON, audit-chain entries, screenshots' EXIF + alt-text, network log dumps, Claude prompt history) for the canary strings.
- Asserts zero hits.

### Invariant 2 — `storageState` is memory-only; NO filesystem persistence (MUST).

**v3 revision** (Panel Q4-v3): memory-only is **MUST**, not SHOULD. No encrypted-fs fallback is codified in this spec. No "if memory pressure becomes a concern" carve-out. The Phase 3 implementation MUST hold storageState in process memory only and MUST NOT write it to disk under any condition; a Phase 3 implementation that ships a filesystem-fallback path is non-conformant with this spec regardless of operational pressure.

**v2 revision** (Panel condition 3, G-Q4=GQ4-MEMORY): the on-disk `tmp/playwright-state-<runId>/` path used by v1 is eliminated entirely. Playwright's `BrowserContext.storageState()` returns a JSON object; the Conductor holds that object in process memory only and passes it back as `browserContext({ storageState: <object> })` for subsequent context construction within the same run. The cleanup-verification race condition that motivated 4 Panel slots' GQ4-MEMORY vote is eliminated by eliminating the filesystem step.

Concretely the storageState for an authenticated run:

- Lives ONLY as a JavaScript object on the Conductor's heap, keyed by `runId`.
- Is captured AFTER successful login via `await context.storageState()` (in-memory return; no `path` parameter passed).
- Is re-applied to fresh contexts within the SAME run via `browser.newContext({ storageState: storageStateObject })`.
- Is dereferenced (set to `null`) and the Conductor's run state is discarded at run end. The JS heap GC reclaims the object when no further references hold it.
- Is NEVER written to disk (no `tmp/`, no temp file, no swap-eligible page beyond JS heap defaults).
- Is NEVER persisted to Supabase, Vercel KV, Vercel Blob, git, log files, audit chain, or any other store.
- Is NEVER serialised in a Claude / OpenRouter prompt payload (the storageState object is excluded from prompt-construction by virtue of never reaching the prompt builder's input).

**Playwright API note:** the Playwright Node API supports both `await context.storageState({ path: '<file>' })` (writes to disk) AND `await context.storageState()` (returns an in-memory `StorageState` object). v2 mandates the second form exclusively. The cleanup-sweep helper (`scripts/cleanup-orphaned-storage-state.mjs`) from v1 is removed from scope — no orphaned files can exist when no files are ever written.

**Acknowledged residual:** the JS heap is process-resident memory; a process memory dump (kernel core dump, debugger attach, hostile container introspection) could in principle observe the storageState object. The Vercel runtime does not expose process memory to other tenants (per Vercel's isolation model). This is a hosting-environment trust assumption, documented as a known limitation but materially smaller surface than v1's on-disk approach.

**Test surface:**
- Post-run inspection asserting `tmp/playwright-state-*` directory does not exist after the run (regression guard against re-introducing the v1 path).
- Mock the Playwright `context.storageState({ path })` call and assert it is NEVER called with a `path` argument — only the in-memory form.
- Heap-reference check: after the Conductor's `runEnd` cleanup, assert the storageState object reference held on the Conductor's run-state map is `null` (no dangling reference; GC-eligible).

### Invariant 3 — Single-attempt login per run; MFA → fail-loud, stop.

**v2 revision** (Panel condition 1, G-Q2=GQ2-LOUD): when MFA is required by the target product, the Conductor MUST stop the auth attempt immediately and return `ok:false` on the entire run. The v1 "fail silently and continue unauthenticated" semantics are removed — the operator must know the auth path was blocked.

The Conductor performs AT MOST ONE login attempt per run, regardless of crawl-page count. If the login fails:

- The Conductor MUST NOT retry with the same credentials.
- The Conductor MUST NOT try a "forgot password" or "magic link" path.
- The Conductor MUST NOT escalate to a CAPTCHA solver.

**MFA detection (Panel condition 1):** if the post-login response heuristically matches an MFA challenge — page contains any of `[data-mfa]`, text matching `/\b(two[\s-]?factor|2fa|verification code|authenticator|sms code|email code|one[\s-]?time password|otp)\b/i`, OR an additional input element requesting a 6-digit numeric code — the Conductor MUST:

- IMMEDIATELY stop the auth attempt.
- Return the CrawlReport with `ok: false, authFailed: true, authFailureReason: 'mfa_required'`.
- Do NOT continue with unauthenticated crawl. The whole run terminates at the MFA wall.
- Do NOT submit any code, do NOT attempt to bypass MFA.

**Other auth failures (non-MFA: 401, 403, invalid-credentials):** still fail-loud per v2 — return `ok: false, authFailed: true, authFailureReason: '<reason>'`. The operator-visible signal is consistent: an auth-protected run that cannot authenticate is a FAILED run, not a downgraded run. This removes the v1 ambiguity where an operator could submit credentials, get back a successful unauthenticated crawl, and not realise their credentials were never used.

**Test surface:**
- Mock an MFA challenge response (page containing `enter your 6-digit code`); assert run returns `ok:false, authFailureReason: 'mfa_required'`.
- Mock a 401 response; assert run returns `ok:false, authFailureReason: 'invalid_credentials'`.
- Assert in both cases that NO subsequent crawl pages were fetched after the auth-fail signal.
- Mock a successful login (post-login page has no MFA markers); assert run continues with authenticated crawl.

### Invariant 4 — Same-origin restriction on the authenticated context.

The Playwright authenticated context navigates ONLY to URLs whose origin equals the start-URL origin. Cross-origin navigation:

- Drops the storageState BEFORE navigation (a fresh, anonymous context for cross-origin).
- Returns to the authenticated context for the next same-origin URL.
- OR (simpler implementation choice — Phase 3 dispatch picks) refuses cross-origin navigation entirely and records the URL as `out_of_scope`.

Either implementation is conformant; the spec mandates SOME mechanism that prevents the authenticated session cookies from being sent to a non-target origin. The simpler "refuse cross-origin" approach is the W5a recommendation.

**Test surface:** stub the target product with a link to `https://attacker.example`; assert that no Playwright request to `attacker.example` carries the storageState cookies.

### Invariant 5 — Non-destructive action gate: hybrid allowlist + i18n denylist.

**v2 revision** (Panel condition 4, G-Q6=REJECT-Slot-7-hybrid): v1's pure-denylist English-only heuristic is replaced by a hybrid: an explicit allowlist path (`data-crawl-safe="true"`) PLUS a broader i18n-aware denylist. Slot 7's Panel rationale: "All options have critical flaws: denylists miss edge cases, allowlists break functionality, and i18n extensions are incomplete. A hybrid approach with both safe-action attributes AND comprehensive denylists is needed." v2 adopts that hybrid.

While authenticated, the Conductor executes ONLY these DOM events on the target product:

- `click` on `<a href>` links (navigation only).
- `click` on `<button>` elements that pass the hybrid gate (see below).
- `hover` / `focus` / `scroll` (passive).
- Reading `document.cookie` / `localStorage` / `sessionStorage` for state inspection (not modification).

**Hybrid gate decision flow per button:**

1. **Explicit allowlist (highest priority).** If the element carries `data-crawl-safe="true"`, the click is allowed regardless of any denylist match. This is the product author's explicit opt-in marker — a button the product team has audited as safe for crawler interaction.
2. **Form-submit denylist (always-on guard).** If the element is `type="submit"` on a `<form>`, the click is BLOCKED (unless the XSS opt-in flag is on per SSOT §6 line 104 — dev/staging only, never prd, never under authenticated session).
3. **Destructive denylist (i18n-aware).** Block if ANY match:
   - `aria-label` or text content matching the **i18n destructive regex** (see §below).
   - `data-action="destructive"` or `data-destructive="true"` attribute.
   - `class` containing `btn-danger`, `destructive`, `delete-btn`, `cancel-btn`, `logout-btn`, `signout-btn`, `remove-btn`, `terminate-btn`.
   - Any element inside a `<form method="post|put|patch|delete">`.
4. **Otherwise → allow click.**

**i18n destructive regex (Panel condition 4 — v3: 9 named language families):**

```
/\b(
  // English
  delete|remove|cancel|sign\s*out|log\s*out|terminate|destroy|wipe|reset|purge|deactivate|disable|unsubscribe
  // Spanish
  | eliminar|borrar|cancelar|cerrar\s*sesión|terminar|destruir|restablecer|desactivar
  // French
  | supprimer|effacer|annuler|déconnecter|terminer|détruire|réinitialiser|désactiver
  // Portuguese
  | excluir|apagar|cancelar|sair|encerrar|terminar|destruir|redefinir|desativar
  // German
  | löschen|entfernen|abbrechen|abmelden|beenden|zerstören|zurücksetzen|deaktivieren
  // Chinese (Simplified)
  | 删除|移除|取消|退出|登出|终止|重置|禁用|注销
  // Japanese (v3 — Panel Q6-v3 expansion)
  | 削除|消去|キャンセル|サインアウト|ログアウト|終了|無効化|解除
  // Korean (v3 — Panel Q6-v3 expansion)
  | 삭제|제거|취소|로그아웃|사인아웃|종료|비활성화|해지
  // Arabic (v3 — Panel Q6-v3 expansion)
  | حذف|إزالة|إلغاء|تسجيل\s*الخروج|إنهاء|تعطيل|إلغاء\s*الاشتراك
)\b/iu
```

The regex matches the Unicode `u` flag so non-Latin scripts (Chinese ideographs, Japanese kanji/kana, Korean Hangul, Arabic) match correctly. **v3 expansion (Panel Q6-v3):** the floor is now 9 language families (en/es/fr/pt/de/zh-CN, +ja, +ko, +ar). Per-product i18n configuration may still extend with additional locales at product registration (Phase 3 implementation may expose a `productConfig.destructiveTermsExtra: string[]` knob).

**Honest false-negative acknowledgment.** This list does NOT cover:
- Custom CSS class names that don't match the convention (e.g. `bg-red-500` styling a delete button via Tailwind without any class-name signal).
- Obfuscated text content (e.g. button text "Continue" with `onclick='deleteAccount()'`).
- JavaScript-only event handlers attached programmatically.
- Languages outside the 9-family floor (Hindi, Russian, Turkish, Vietnamese, Thai, etc. — Phase 3 dispatch may extend; per-product opt-in for additional languages).
- Glyph-style buttons (e.g. trash-can icon with no aria-label).

The hybrid gate's safety story is **defence in depth**, not perfection:
- Invariant 4 (same-origin) prevents the click from sending session cookies to a third-party origin even if a destructive button slips past detection.
- Invariant 8 (one-shot credentials) prevents the credential context from persisting beyond a single run.
- The explicit allowlist (`data-crawl-safe="true"`) lets product authors mark known-safe buttons for unambiguous crawler interaction.

**Test surface (v3 — 9-language commitment):**
- `<button class="btn-danger">Delete Account</button>` (English denylist match) → click BLOCKED.
- `<button>Eliminar</button>` (Spanish denylist match) → click BLOCKED.
- `<button>Supprimer</button>` (French denylist match) → click BLOCKED.
- `<button>Excluir</button>` (Portuguese denylist match) → click BLOCKED.
- `<button>Löschen</button>` (German denylist match, no class) → click BLOCKED.
- `<button>删除</button>` (Chinese Simplified ideograph denylist match) → click BLOCKED.
- `<button>削除</button>` (Japanese kanji denylist match, v3 expansion) → click BLOCKED.
- `<button>삭제</button>` (Korean Hangul denylist match, v3 expansion) → click BLOCKED.
- `<button>حذف</button>` (Arabic denylist match, v3 expansion) → click BLOCKED.
- `<button data-crawl-safe="true" class="btn-danger">Delete</button>` (allowlist overrides denylist) → click ALLOWED.
- `<form method="post"><button>Save</button></form>` (form-submit method gate) → click BLOCKED.
- `<button>Continue</button>` (benign text; no class; no data-* markers) → click ALLOWED, and the false-negative caveat is documented per §10 acknowledged-residual.

Each of the 9 language families MUST have ≥1 passing test in the Phase 3 implementation; partial coverage is non-conformant.

**Language expansion process (v4 — Panel Q6-v4 condition-closer):** the 9-language floor is the Phase 3 minimum. Additional language families (hi, ru, vi, tr, th, and others) are added via a per-product opt-in mechanism: operator submits a pull request to the FlowAI denylist registry adding the language's destructive-action terms with native-speaker review attestation. W5a reviews + merges. No Panel re-ratification is required for floor expansions beyond 9 — the process itself is the control. This codifies the path the v2 § (`productConfig.destructiveTermsExtra`) gestured at without committing to a review surface; v4 names the surface (denylist registry pull-request + W5a merge gate + native-speaker attestation) so the expansion path is unambiguous and auditable.

### Invariant 6 — Evidence artifact scrubbing.

**v3 revision (Q3-v3 Option B):** Phase 3 does NOT capture screenshots, so the screenshot-scrub clause that v2 added is no longer in scope. Phase 3 evidence artifacts are DOM dumps and network logs only.

Before any DOM dump / network-log artifact is persisted, the Conductor applies a content-scrubber that:

- Replaces any string matching the operator's submitted email or password with the `[REDACTED]` marker (literal string comparison + word-boundary regex).
- Replaces common credential-leak patterns: `Welcome,? .+@.+\.(com|net|org|io|...)` → `Welcome, [REDACTED-EMAIL]`; password fields' `value` attribute in HTML dumps → `value="[REDACTED]"`.

Screenshot capture is deferred to Phase 4 (separate dispatch, separate ratification gate, real test fixtures). Phase 3 ships with NO PNG retention, NO scrub pipeline, NO operator residual-risk-ack UI.

**Test surface:** capture a DOM dump from a page that displays the canary email; assert it contains `[REDACTED-EMAIL]`. Assert that the Conductor does NOT call any screenshot API (`page.screenshot`, Browserless screenshot endpoint) during a Phase 3 authenticated run — a regression guard against accidentally reintroducing PNG retention before Phase 4.

### Invariant 7 — One-shot credential lifetime.

**v2 revision:** removed the on-disk `tmp/playwright-state-<runId>/storageState.json` location from the lifetime list. v2 storageState is memory-only per Invariant 2.

Credentials submitted by the operator on the LandingPage / Renewal page exist in:

1. The HTTP request body to `/api/research-url` or `/api/renew` (TLS-encrypted in transit).
2. The Node.js handler's local variables (`raw.description.loginEmail/loginPassword`).
3. The Playwright `page.fill()` calls during login (passed by value into Playwright's IPC, then into the Chromium process memory; lives in Chromium DOM state until post-login navigation).
4. The in-memory Playwright `storageState` object (cookies + localStorage AFTER post-login navigation; raw email/password are NOT in the storageState object — only session tokens / cookies set by the target product's login response). Held on Conductor heap for the run duration only.

Credentials do NOT exist in:
- Any filesystem path (no `tmp/`, no temp file). **v2 elimination per Invariant 2.**
- Any Supabase row.
- Any Vercel KV entry.
- Any Vercel Blob object.
- Any Sentry / pino / Axiom log line.
- Any GovernanceAuditLog entry.
- Any Claude / OpenRouter API request payload.
- Any AI prompt / response (the Claude prompt that produces the research brief sees ONLY the page content AFTER scrubbing, never the credentials).
- Any git-committed file.
- Any DOM dump or network log (per §6.2). **v3:** screenshots are not captured at all in Phase 3 (Option B), so they cannot leak credentials.

**Test surface:** static grep on the entire src/ and api/ trees for the canary credential pattern post-run. Static grep on the audit-chain DB rows. Static grep on a sampled day's worth of Sentry events. **v2 addition:** assert no file at any path matching `tmp/playwright-state-*` exists at any point during or after the run.

### Invariant 8 — Operator-supplied credentials are session-only.

The Phase 3 implementation MUST NOT introduce any persistence mechanism that retains credentials across runs:

- No "save credentials for next time" checkbox.
- No "remember me" affordance.
- No environment-variable-based credential injection for arbitrary product crawls (Doppler-stored credentials for FlowAI's OWN target apps — saigedemo etc. — are an acknowledged future facility; spec is explicit that those would be FlowAI-owned products, not operator-submitted third-party products).
- No browser-extension hand-off.

Phase 3 graduates the existing one-shot pattern from `inputArtifact.raw.description.loginEmail/loginPassword`; it does NOT introduce new credential surfaces.

### Invariant 9 — Audit-log surface (what IS logged about credentialed runs).

The audit log SHALL record about every credentialed run:

```
{
  kind: 'authenticated_crawl_run',
  runId: <uuid>,
  productId: <string or null>,
  targetOrigin: <string>,
  loginAttempted: <bool>,
  loginSucceeded: <bool>,
  pagesCrawled: <number>,
  authGatedPagesEncountered: <number>,
  storageStatePath: '[EPHEMERAL — deleted at runEnd]',
  storageStateDeletionVerified: <bool>,
  at: <ISO-8601>,
  durationMs: <number>,
}
```

NEVER logged: `loginEmail` value, `loginPassword` value, `storageStateContent`, cookies, Authorization headers, any localStorage / sessionStorage values that contain tokens.

The audit-log entry uses GovernanceAuditLog's existing hash-chain (§14.2) so post-hoc tampering of the credentialed-run record is detectable.

**Retention (v3 revision — Panel Q7-v3):** credentialed-run audit records get **90 days hot storage + 1 year cold storage** — still divergent from (and shorter than) the CA-10-E standard `365 days hot + 7 years cold` for ordinary GovernanceAuditLog entries, but with a non-zero cold-store audit trail. Rationale: even though credentials themselves are NEVER logged (Invariant 1 / T1), the CONTEXT of a credentialed run (URLs visited, timing, product structure, response shapes) is itself sensitive metadata that warrants minimised retention. The 90+1yr window preserves the "shorter than standard" intent (one quarter on hot + one year on cold vs. one year on hot + seven years on cold) while keeping enough cold-store audit trail to support post-incident investigation and compliance review.

**v2 → v3 retention delta:** v2 specified `30 days hot, 0 cold`. The v2 Panel surfaced concern that zero cold retention sacrificed audit-trail availability for marginal metadata-minimisation gain. v3 restores a cold-store audit trail (1 year) and triples the hot window (30 → 90 days) — both still materially below the CA-10-E standard.

The retention divergence is implemented by tagging credentialed-run audit entries with `retentionClass: 'auth_short'`; the GovernanceAuditLog cold-archival cron MUST migrate entries with this tag to cold storage after 90 days (not exclude them from cold migration as v2 had it) and MUST purge them from cold storage after 1 year (i.e. 90 days hot + ~275 days cold = ~365 days total). Other audit categories (95/95 scores, clearance steps, panel decisions, customer signals, governance records) retain the canonical CA-10-E retention.

### Invariant 10 — Crash / abort safety.

**v2 revision:** the v1 orphaned-`tmp/playwright-state-*/` cleanup logic is removed — no filesystem path is created in v2 (Invariant 2 memory-only). When the Conductor's process crashes or is killed mid-run, there is NO disk-resident credential context to clean up. The Playwright Chromium child process is terminated by OS cleanup; its in-process memory is reclaimed. The Conductor's JS heap is reclaimed by the Node runtime exit.

Concretely:

- **Graceful abort (SIGTERM / signal handler):** the Conductor's `finally` block closes the Playwright `browserContext` (which terminates the Chromium child process). The Conductor's run-state map entry is dereferenced. An audit-log entry `{ kind: 'crawl_aborted', runId, reason }` is written (subject to the §5 retention class).
- **Hard crash (OOM / SIGKILL / segfault):** the OS reclaims all process memory and child processes by default. No disk artefacts to sweep. The next start of the Conductor process has zero residue from the previous run.
- The in-flight CrawlReport is NOT persisted (a partial run is a failed run; no half-results recorded).

The v1 `scripts/cleanup-orphaned-storage-state.mjs` helper is REMOVED from Phase 3 scope — there is no orphan class to sweep.

**Test surface:**
- Send SIGTERM to a mid-run Conductor; assert the `browserContext.close()` was called in the `finally` block; assert no disk path `tmp/playwright-state-*` ever existed during the run lifetime.
- Simulate OOM via Node `--max-old-space-size=64`; assert the process exits without writing any `tmp/` path.

---

## 3. Credential intake — concrete contract

### 3.1 What the operator submits

Existing channels (per `InputArtifact.raw.description` shape, file `src/lib/renewal/inputArtifact.js:24-25`):

- `loginEmail` (string, optional)
- `loginPassword` (string, optional)

These are session-only by the existing module's contract. Phase 3 does NOT add new credential fields; it only adds the consumer (Playwright login) at the Conductor.

### 3.2 Validation at the boundary

Before any Playwright invocation:

- `loginEmail`: must be a string, length 4-254, matching the loose email regex `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`. Whitespace trimmed.
- `loginPassword`: must be a string, length 1-512. No content validation (passwords can be anything).
- Both present OR both absent — supplying only one is a 400.
- If either contains `\n`, `\r`, ANSI escape sequences, or null bytes → 400 reject (log-injection defense — Invariant T9).

### 3.3 Transit

- TLS to `/api/research-url` or `/api/renew` (already enforced by Vercel).
- HTTP body parsed once; the parsed object's credential fields are accessible only inside the handler's local scope.

### 3.4 Lifetime in the Node handler

The Node handler:

1. Reads `loginEmail` + `loginPassword` from `req.body.description`.
2. Passes them by value to the Conductor's `conductCrawl(url, { credentials: { email, password }, ... })` invocation.
3. The handler's local variables are NOT cleared explicitly (JS doesn't expose memory zeroing) — but the handler's scope ends when the response is sent, making the variables eligible for GC.
4. The `scrubCredentials()` function is applied to the InputArtifact BEFORE any persist / log / external send within the handler.

### 3.5 Playwright invocation

The Conductor calls Playwright with:

```
await page.fill('input[type="email"], input[name*="email" i], input[name*="user" i]', credentials.email);
await page.fill('input[type="password"]', credentials.password);
await page.click('button[type="submit"], button:has-text(/sign\s*in/i), button:has-text(/log\s*in/i)');
```

(Heuristic selectors are intentional — products vary. Phase 3 dispatch may refine.)

After Playwright submits the form, the credential strings remain in:

- The Playwright IPC channel (Node ↔ Chromium) for the lifetime of the `page.fill()` calls.
- The Chromium process memory (form field DOM state) until the page navigates away from the login form.
- The in-memory `storageState` object captured AFTER navigation succeeds via `await context.storageState()` (no `path` argument; in-memory return only per Invariant 2). The object contains cookies + localStorage values set by the target product, NOT the raw email/password credentials.

---

## 4. Session-bleed prevention — concrete contract

### 4.1 Per-run Playwright context (memory-only)

**v2 revision** (Panel condition 3): the on-disk capture-and-reload step is removed. Every authenticated crawl gets a fresh `browserContext`. Sequence:

1. Conductor receives `conductCrawl(url, { credentials, ... })`.
2. Conductor mints a fresh `runId` (UUID v4) if one is not supplied.
3. Conductor opens a new Playwright `browserContext({ storageState: undefined })` (no prior state).
4. Conductor performs the login (Invariant 3, single-attempt; MFA detection → fail-loud).
5. Conductor captures `storageState` via `await context.storageState()` (in-memory return; **no `path` argument passed**). The returned object is held on the Conductor's run-state map keyed by `runId`.
6. All subsequent same-origin page navigations within this run reuse this `browserContext` directly — no need to re-instantiate from storageState within the same run, since the context already carries the post-login cookies/storage.
7. If a sub-step needs a fresh context (e.g. mobile viewport re-render in Phase 3+ feature work), it can be constructed as `browser.newContext({ storageState: <in-memory object> })`.
8. At run end (success or failure): `await context.close()` to terminate the Chromium child; dereference the run-state map entry (`runStateMap.delete(runId)`); GC reclaims the storageState object. **No filesystem cleanup needed — there was no filesystem write.**

### 4.2 No context reuse across runs

The Conductor's instance state SHALL NOT cache `browserContext` objects, `storageState` files, or login cookies across `conductCrawl()` calls. Each invocation is a clean slate.

**Test surface:** call `conductCrawl()` twice in a single Conductor instance with different credentials → assert run 2's authenticated requests do NOT carry run 1's cookies.

### 4.3 Cross-origin → fresh anonymous context

Per Invariant 4, the recommended implementation is "refuse cross-origin" — discover that a link is cross-origin and mark its target as `out_of_scope: true` in the PageRecord, without ever navigating there. If a future Phase 3+ dispatch wants cross-origin crawl, the implementation MUST open a NEW anonymous (no storageState) context for the cross-origin navigation.

---

## 5. Audit-log surface — what IS recorded, what ISN'T

### 5.1 Recorded (per Invariant 9)

| Field | Type | Notes |
|---|---|---|
| `kind` | string | Always `'authenticated_crawl_run'` for credentialed runs; `'unauthenticated_crawl_run'` otherwise. |
| `runId` | UUID v4 | The canonical run identifier. |
| `productId` | string \| null | The target product's id (if registered in ProductRegistry); null for ad-hoc URLs. |
| `targetOrigin` | string | The start-URL's origin only. The full URL (which may contain query-string params that hint at internal routes) is NOT logged at the top level — but it IS logged inside the per-page record below. |
| `loginAttempted` | boolean | true iff credentials were submitted. |
| `loginSucceeded` | boolean | true iff the post-login page is NOT auth-gated per the §A.5 / Phase 1 heuristic. |
| `pagesCrawled` | number | Total pages, including auth-gated ones. |
| `authGatedPagesEncountered` | number | Subset where the heuristic flagged the page as auth-gated despite credentialed context. |
| `storageStatePath` | literal `'[EPHEMERAL — deleted at runEnd]'` | Always this exact string; the actual path is NEVER logged. |
| `storageStateDeletionVerified` | boolean | true iff the cleanup fs.access throw ENOENT verification succeeded. |
| `at` | ISO-8601 | Run end timestamp. |
| `durationMs` | number | Wall-clock duration. |

### 5.2 NEVER recorded

- `loginEmail` value
- `loginPassword` value
- `storageState` contents (cookies, localStorage, sessionStorage values)
- Authorization headers from network logs
- `Set-Cookie` response headers from network logs (these are stripped to `[REDACTED]` before logging)
- Any DOM state from a logged-in page (page content goes to the Claude prompt — see §6 below — but not to the audit log)

### 5.3 Hash chain

The audit-log entry per credentialed run gets the standard GovernanceAuditLog hash-chain treatment (§14.2 of CANONICAL_REFERENCE.md) — same chain, same tamper-evidence, no special-casing. The chain demonstrates that the credentialed-run record was written at the claimed time and hasn't been altered.

### 5.4 Retention rationale (v4 — Panel Q7-v4 condition-closer)

Why 90 days hot + 1 year cold is the correct point for `retentionClass: 'auth_short'`:

- **30-day hot + 0-cold (v2) was rejected by Panel as creating a compliance dead-zone for post-incident investigation.** A security event surfaced 45 or 90 days after the credentialed run would have no audit trail to reconstruct what was accessed — the metadata necessary to scope the incident would already be gone.
- **365-day hot + 7-year cold (the CA-10-E standard) was rejected as over-retaining sensitive credential-context records.** Even though credentials themselves are never logged, the CONTEXT of a credentialed run (URLs visited, timing, product structure, response shapes) is sensitive metadata. Retaining it for 7 years extends the liability window for breach-disclosure, subpoena, and discovery scope past what the operational value justifies.
- **90-day hot provides a full incident-response window covering one calendar quarter — the standard enterprise security review cycle.** Most security incidents surface within 90 days of the underlying event; the hot window covers that interval at the latency / queryability level operational investigation needs.
- **1-year cold provides an audit trail for annual compliance reviews without the 7-year liability window of standard retention.** External auditors, SOC 2 reviewers, and internal annual security reviews can pull the cold-store records during their once-a-year cadence; after one calendar year, the records are purged.

**This is the minimum retention that satisfies both incident-response and annual-audit requirements while respecting the sensitivity of credentialed-run records.** The exact transition behaviour is unchanged from Invariant 9: tag entries `retentionClass: 'auth_short'`; cron migrates to cold after 90 days hot; purges from cold after 1 year. Total record lifetime ≈ 365 days.

---

## 6. Data exfiltration controls — concrete contract

### 6.1 Claude / OpenRouter prompt construction

The research-brief prompt (`api/research-url.js` lines 50-74) takes the multi-page CrawlReport from Agent #21 and constructs a Claude prompt. Phase 3 MUST:

- Apply `scrubCredentials` to any free-text content (page bodies, headings, alt-text) before inclusion in the prompt.
- Strip `<input type="password" ...>` elements' `value` attributes entirely.
- Strip any `Authorization:` headers from any captured network log entry.
- Strip any `Set-Cookie:` response headers from any captured network log entry.

The prompt is sent over TLS to Anthropic / OpenRouter. The third-party provider's data retention policy (Anthropic: 30 days for abuse review by default) is a known limitation — credentials never reach the prompt, so this is acceptable per Invariant 1.

### 6.2 Screenshot handling — DEFERRED TO PHASE 4

**v3 revision (Q3-v3 Option B, CEO-locked):** Screenshot capture is deferred to Phase 4. Phase 3 authenticated crawl captures text/DOM content only — NO screenshot capture, NO PNG retention, NO scrub pipeline in Phase 3. Phase 4 will be a dedicated dispatch reviewed against real test fixtures.

The v2 9-stage scrub pipeline (formerly §6a) is removed in full. The v2 operator residual-risk acknowledgment surface, default-OFF retention flag, and Stage-7 re-OCR verification are all out of scope for Phase 3.

**Phase 3 implementation MUST:**
- NOT call `page.screenshot()`, Browserless `/screenshot` endpoint, or any equivalent PNG-capture API during an authenticated run.
- A regression test asserts the screenshot API surface is untouched in Phase 3 authenticated-crawl code paths.

**Why Option B over Option A (build the scrub pipeline):** the v2 9-stage pipeline added meaningful surface area (OCR engine, image library, re-OCR verification harness, operator residual-risk-ack UI, audit log subtype for scrub failures) for a feature whose default posture is OFF. Phase 3 ships faster and smaller without it; Phase 4 can add screenshot capture as a separate, fully-scoped dispatch with its own test fixtures and Panel ratification.

### 6.3 ProductSSOT writes

Per CANONICAL §7.5, `delta_log_entry.issue.evidence` may contain customer-facing strings. PII-scrub per CA-10-E.2 already applies. This spec extends the scrub to also cover the operator's submitted credentials (Invariant 7) — `scrubCredentials` is applied to every `delta_log_entry` before write.

---

## 7. Scope limiting — concrete contract

### 7.1 Same-origin enforcement at the BFS frontier

`aggressiveCrawl()` already filters internal links via `isSameOriginUrl(href, origin)`. Phase 3 inherits this filter unchanged. The authenticated session by construction cannot reach a non-target origin via the BFS frontier.

### 7.2 Explicit URL allowlist (per SSOT §13 URL Whitelist)

Phase 3 SHALL check the operator's target URL against `URL Whitelist entity` per §13 — admins specify which URLs operators can run pipelines against. Authenticated crawl is REJECTED at the boundary if the target origin is not on the operator's whitelist.

### 7.3 Subdomain handling

Within the same eTLD+1 (e.g. `app.example.com` and `www.example.com`), Phase 3 treats different subdomains as DIFFERENT origins by default (strict same-origin). An operator can opt in to same-eTLD-1 crawl via an explicit flag in the run options; the flag requires admin role per §13.1.

---

## 8. Failure / abort behavior — concrete contract

### 8.1 Login failure — FAIL-LOUD (v2)

**v2 revision** (Panel condition 1, G-Q2=GQ2-LOUD): authentication failure of ANY kind returns `ok:false` and STOPS the run. The v1 "continue unauthenticated" path is removed.

Per Invariant 3 — single attempt, no retry. The CrawlReport returns:

```
{
  ok: false,
  authFailed: true,
  authFailureReason:
    'mfa_required'           // post-login response heuristically matched an MFA challenge per Invariant 3
  | 'invalid_credentials'    // 401 / 403 / "incorrect password" page text
  | 'captcha_required'        // CAPTCHA element detected in login flow
  | 'login_form_not_found'    // selector heuristics couldn't locate the form
  | 'login_timeout'           // login POST exceeded the per-stage timeout
  | 'unknown_auth_failure',
  startUrl: <url>,
  attemptedAt: <ISO-8601>,
  // NO pagesCrawled — the run did NOT proceed past the auth wall.
}
```

The operator-visible signal is unambiguous: an auth-protected run that cannot authenticate is a FAILED run. No silent downgrade to unauthenticated coverage. This removes the v1 ambiguity that 5 Panel slots flagged in G-Q2.

### 8.2 Mid-run process crash

Per Invariant 10 (v2): no orphaned filesystem state to clean up since storageState is memory-only. The OS reclaims process memory + child Chromium on exit. No partial CrawlReport is persisted. The audit log gets a `crawl_aborted` entry if the abort was graceful (signal handler); a hard crash leaves no on-disk credential context to recover.

### 8.3 Operator abort mid-crawl

**v2 revision:** §8.3 in v1 covered "cleanup verification failure" for the on-disk storageState path. v2 eliminates that path → §8.3 is renumbered to cover operator abort.

If the operator cancels mid-crawl (Phase 3 dispatch defines the cancel mechanism — possibly a `DELETE /api/agent/21/run/:runId` endpoint):

- The Conductor's `AbortController` fires; Playwright `browserContext.close()` terminates the Chromium child.
- In-memory storageState object is dereferenced (GC-eligible).
- A partial CrawlReport is returned with `aborted: true`.
- Audit log entry `{ kind: 'crawl_aborted', runId, reason: 'operator_abort' }` is written (subject to §5 retention class `auth_short`).

---

## 9. Alignment to SSOT §6 line 110 (verbatim)

Quoting CANONICAL_REFERENCE.md §6 line 110:

> **Credential handling for authenticated crawls (gap from Panel Q3):** session-only credentials per `src/lib/renewal/inputArtifact.js` `raw.description.loginEmail/loginPassword`. **Scrubbed before any persist / log / external send** via `scrubCredentials()`. Never written to the audit log. Never embedded in renewed output. Playwright `storageState` JSON persisted only in ephemeral `tmp/playwright-state-<runId>/`; auto-deleted at run end.

This spec's invariants map 1:1 to that line:

| SSOT §6 line 110 clause | This spec |
|---|---|
| "session-only credentials" | Invariant 8 (one-shot lifetime) |
| "Scrubbed before any persist / log / external send via `scrubCredentials()`" | Invariant 1 (never logged) + §6 (Claude prompt + screenshot + ProductSSOT scrubbing) |
| "Never written to the audit log" | Invariant 9 (audit-log surface) + §5.2 (NEVER recorded list) |
| "Never embedded in renewed output" | §6.1 (Claude prompt scrubbing) |
| "Playwright `storageState` JSON persisted only in ephemeral `tmp/playwright-state-<runId>/`" | **v2 STRENGTHENED:** Invariant 2 mandates memory-only — no filesystem persistence at all. The SSOT line's "ephemeral `tmp/`" was the v1 weaker form; v2 eliminates the path entirely. |
| "auto-deleted at run end" | **v2 STRENGTHENED:** trivially satisfied because there is no on-disk artefact to delete. The in-memory object is dereferenced + GC-reclaimed at run end per Invariant 2. |

---

## 10. Out of scope for Phase 3 (explicit non-goals)

- **OAuth / SSO / SAML login flows.** Phase 3 implements form-based username+password login only. OAuth providers (Google, GitHub, etc.) require provider-specific consent flows that operator credentials don't authorize. Defer to Phase 4+ or a separate dispatch with explicit auth-provider charter.
- **MFA / 2FA traversal.** Phase 3 detects MFA challenges and fails LOUD per Invariant 3 (v2) — returns `ok:false` with `authFailureReason: 'mfa_required'`. The run terminates at the MFA wall. Active MFA traversal (e.g. accepting a TOTP code or magic-link from the operator) is out of scope.
- **CAPTCHA solving.** The Conductor never attempts to bypass CAPTCHAs. Detection → fail-loud per §8.1 (`authFailureReason: 'captcha_required'`).
- **Credential vault integration.** No Doppler-stored arbitrary-third-party credentials, no 1Password integration, no AWS Secrets Manager. Operator-supplied per-run only.
- **Long-lived session reuse.** Sessions are one-run-only by design. A future "remember this session for 1 hour to save Browserless costs" feature would require a separate spec + dispatch + Panel ratification.
- **Authenticated POST / form-submit traversal.** Per Invariant 5 — Phase 3 authenticated crawl is READ-ONLY (clicks on links + safe buttons per hybrid gate, no form submissions except per the dev/staging XSS opt-in already in §6 line 104). Authenticated form-submit assessment is a future capability behind a separate dispatch + Panel ratification + per-product opt-in.
- **Screenshot capture during authenticated runs (v3 — Q3-v3 Option B).** Phase 3 ships with NO screenshot capture, NO PNG retention, NO scrub pipeline. The full screenshot-capture + scrub feature is deferred to Phase 4, a dedicated dispatch with its own real test fixtures, OCR engine integration, and Panel ratification gate.
- **i18n denylist coverage beyond 9 named language families.** v3 covers en/es/fr/pt/de/zh-CN/ja/ko/ar (the floor; expansion from v2's 6 per Panel Q6-v3). Additional locales (hi, ru, tr, vi, th, etc.) are deferred to per-product opt-in via `productConfig.destructiveTermsExtra` (Phase 3 may wire the knob; the locale dictionaries beyond the 9-language floor are out of scope for v3).

---

## 11. Phase 3 acceptance criteria

**v3 revision:** removed v2's screenshot-scrub test suite criterion (former #5) and v2's operator residual-risk acknowledgment UI criterion (former #13) per Q3-v3 Option B (screenshots deferred to Phase 4). Updated destructive-denylist coverage to 9 languages (former #6) and retention class enforcement to 90 days hot + 1 year cold (former #7). The Phase 3 implementation dispatch is acceptance-ready only when ALL of:

1. **All 10 invariants in §2 have a passing test in `tests/agents/agent-21-auth-traversal.test.js` (or split files).** Each invariant maps to ≥1 named test.
2. **Canary-credential negative test** (Invariant 1 test surface) executes end-to-end against a stub login page; greps every persistent artifact for the canary; passes.
3. **storageState memory-only verification** (Cond Q4-v3 MUST): a test asserts that `await context.storageState({ path })` is NEVER called with a `path` argument during the run; a filesystem watcher asserts no file matching `tmp/playwright-state-*` is created at any point. No encrypted-fs-fallback test is required since no such path is conformant per Invariant 2 MUST.
4. **MFA fail-loud verification** (Cond Q2-v2 carried forward): a test mocks an MFA-challenge post-login response; asserts the CrawlReport returns `ok:false, authFailureReason: 'mfa_required'` AND that NO subsequent page fetch occurred after the MFA wall.
5. **No-screenshot-capture verification** (NEW per Q3-v3 Option B): a regression test asserts that the Phase 3 authenticated-crawl code path does NOT call `page.screenshot()`, Browserless `/screenshot` endpoint, or any equivalent PNG-capture API at any point during an authenticated run. Reintroduction of screenshot capture in Phase 3 is non-conformant; Phase 4 will re-enable it under its own dispatch.
6. **Destructive-action denylist i18n coverage — 9 languages** (Cond Q6-v3): tests assert blocking on each of the 9 floor language families: (a) English `btn-danger`, (b) Spanish `Eliminar`, (c) French `Supprimer`, (d) Portuguese `Excluir`, (e) German `Löschen`, (f) Chinese Simplified `删除`, (g) Japanese `削除`, (h) Korean `삭제`, (i) Arabic `حذف`. Plus a test asserts the `data-crawl-safe="true"` allowlist overrides a denylist match. Partial coverage (less than 9) is non-conformant.
7. **Retention class enforcement — 90 days hot + 1 year cold** (Cond Q7-v3): a test asserts that audit entries tagged `retentionClass: 'auth_short'` are MIGRATED to cold storage after 90 days hot AND PURGED from cold storage after 1 year. (Phase 3 dispatch wires the cron; this test may be a deferred integration test if Supabase cron is wired separately.)
8. **Audit log conformance**: a smoke test asserts the credentialed-run audit-log entry shape matches §5.1 exactly and contains none of §5.2's NEVER-recorded fields. The entry MUST carry `retentionClass: 'auth_short'`.
9. **Cross-origin refusal verification** (per supermajority-ratified G-Q1): a test asserts that a same-origin BFS frontier with one cross-origin link present does NOT navigate to the cross-origin target with the storageState attached. (G-Q1 supermajority-ratified by Panel; carried forward unchanged through v2 and v3.)
10. **No regressions** in the full vitest suite.
11. **W2 boundary respected**: zero W2-locked files staged (computeMonitorClearance, formatMonitorClearanceFooter, monitor-clearance tests, per-layer scoring prompt, crawler truncation fix).
12. **Capability boundary documented**: the §8 capability boundary block in `docs/specs/agent-blueprints/AGENT_21_AggressiveCrawlConductor.md` (Phase 3 will add this blueprint, mirroring AGENT_03_SelfRenewal.md) names what Phase 3 CAN and CANNOT do — no overclaim. The blueprint MUST explicitly disclaim screenshot capture (deferred to Phase 4) so operators cannot mistakenly believe authenticated screenshots are available.
13. **Phase 3 dispatch gate**: HARD GATE 3 in the Master Phased Build sequence — Phase 4 (validate scoring on multi-page input) cannot start until CEO confirms Phase 3 passed.
14. **Memory-pressure monitor present + hard-fail on threshold breach** (NEW per Q4-v4 condition-closer): Phase 3 ships a memory-pressure monitor that tracks `process.memoryUsage()` heap consumption during storageState operations. Threshold breach (default 80% of available heap) MUST fail the run loudly with `ok:false, reason: 'memory_pressure_abort'` and MUST NOT spill storageState to disk. Verified by test: mock heap exhaustion → assert `ok:false` + `reason: 'memory_pressure_abort'` + zero filesystem writes during the abort path. The hard-fail-not-fallback semantic is a Phase 3 acceptance gate, not an implementation choice.
15. **Language-expansion process documented and exercised** (NEW per Q6-v4 condition-closer): the FlowAI denylist registry expansion path described in Invariant 5 ("v4 — Panel Q6-v4 condition-closer") is documented and at least one non-floor language (e.g. Hindi) can be added via the process without a spec amendment. A test or a one-shot script demonstrates the path end-to-end: new language entry → native-speaker attestation field → W5a merge → denylist regex picks it up at runtime. The expansion path itself is the control surface; new language additions are operational, not spec-amendment work.

---

## 12. Open Questions for W6 adversarial Panel (Phase 2 v4 → HARD GATE 2 re-ratification)

**v4 question set (3 re-votes only):** the v3 Panel re-ratification carried G-Q3-v3 (Option B — screenshots deferred to Phase 4) at supermajority. G-Q1, G-Q2-v2, and G-Q5 also remain SUPERMAJORITY-ratified from earlier rounds. The remaining v3 questions — G-Q4-v3 (storageState MUST), G-Q6-v3 (9-language floor), G-Q7-v3 (90 hot + 1yr cold retention) — landed sub-quorum with specific condition-closer signals from the Panel: 3 MONITOR votes on Q4 (asked for a memory-pressure monitor with hard-fail semantics), 2 MORE-LANGUAGES votes on Q6 (asked for an explicit expansion-path mechanism), 3 DIFFERENT-RETENTION votes on Q7 (asked for a rationale paragraph anchoring the 90/1yr choice). v4 applies those 3 condition-closers and asks the Panel to ratify the refined v4 positions. **No re-vote needed on G-Q1, G-Q2-v2, G-Q3-v3, G-Q5** — those are RATIFIED and carried.

### G-Q1 — Cross-origin handling (RATIFIED IN V1; CARRIED THROUGH V2/V3/V4)

v1 Panel verdict: `SUPERMAJORITY_GQ1-REFUSE` (8 of 9). v4 keeps this position verbatim — refuse cross-origin entirely. **No re-vote needed.**

### G-Q2-v2 — MFA handling (RATIFIED IN V2; CARRIED THROUGH V3/V4)

v2 Panel verdict: `SUPERMAJORITY_GQ2-LOUD` (8 of 9). v4 keeps this position verbatim — MFA challenge → return `ok:false, authFailureReason: 'mfa_required'`, STOP, do NOT continue unauthenticated. **No re-vote needed.**

### G-Q3-v3 — Screenshot capture in Phase 3 (RATIFIED IN V3; CARRIED THROUGH V4)

v3 Panel verdict: SUPERMAJORITY on Option B (screenshots deferred to Phase 4). v4 keeps this position verbatim — Phase 3 ships with NO screenshot capture, NO scrub pipeline, NO operator residual-risk-ack UI; Phase 4 re-introduces screenshots with its own scrub design and ratification gate. **No re-vote needed.**

### G-Q4-v4 — storageState memory-only MUST + memory-pressure monitor (refined)

v3 position: memory-only is MUST; no encrypted-fs fallback codified. v3 Panel surfaced 3 MONITOR votes asking for an explicit memory-pressure monitor with hard-fail semantics — operators wanted assurance that memory pressure under load would not silently degrade the MUST into a SHOULD via an undocumented filesystem fallback.

**v4 condition-closer position:** memory-only MUST is preserved verbatim from v3. v4 adds an explicit Phase-3 deliverable: a memory-pressure monitor that tracks `process.memoryUsage()` heap consumption during storageState operations. Threshold breach (default 80% of available heap) MUST fail the run loudly with `ok:false, reason: 'memory_pressure_abort'` and MUST NOT spill storageState to disk. §13 lists the monitor as a required Phase-3 surface; §11 #14 makes the hard-fail-not-fallback semantic a Phase 3 acceptance gate. The honest heap-dump residual (a hostile process memory dump could in principle observe the storageState object) is retained as a documented hosting-environment trust assumption.

Panel re-ratification question — is the v4 memory-only-MUST + memory-pressure-monitor with hard-fail position acceptable?

- (a) Ratify v4 as proposed (memory-only MUST + memory-pressure monitor with hard-fail + no filesystem fallback under any condition)
- (b) Reject v4; restore v3 memory-only MUST without the explicit monitor (operators trust runtime defaults rather than codify a monitor as a Phase 3 must-ship)
- (c) Ratify the MUST + monitor but raise/lower the default threshold from 80% — specify
- (d) Different — specify
- (INSUFFICIENT_INFORMATION)

### G-Q5 — Same-eTLD+1 subdomains (RATIFIED IN V1; CARRIED THROUGH V2/V3/V4)

v1 Panel verdict: `SUPERMAJORITY_GQ5-STRICT` (8 of 9). v4 keeps this position verbatim — strict same-origin by default; admin-role flag to opt in to same-eTLD-1. **No re-vote needed.**

### G-Q6-v4 — i18n denylist 9-language floor + explicit expansion process (refined)

v3 position: 9-language floor (en/es/fr/pt/de/zh-CN/ja/ko/ar) with per-test coverage commitment. v3 Panel surfaced 2 MORE-LANGUAGES votes asking how the floor would expand beyond 9 — operators wanted assurance that adding Hindi, Russian, Vietnamese, Turkish, Thai, etc. would not require another full Panel re-ratification cycle, while also wanting confidence that arbitrary additions could not bypass review.

**v4 condition-closer position:** the 9-language floor is preserved verbatim from v3. v4 codifies the expansion path: additional language families are added via per-product opt-in to the FlowAI denylist registry — operator submits a pull request adding the language's destructive-action terms with native-speaker review attestation; W5a reviews + merges; no Panel re-ratification is required for floor expansions beyond 9. The process itself is the control: native-speaker attestation + W5a merge gate replaces spec-amendment friction for legitimate locale additions, while preventing unattested additions. §11 #15 requires the expansion path to be documented + exercised end-to-end (e.g. Hindi added through the path without a spec amendment).

Panel re-ratification question — is the v4 9-language floor + denylist-registry expansion process acceptable?

- (a) Ratify v4 as proposed (9-language floor + denylist-registry PR path + W5a merge gate + native-speaker attestation + no Panel re-ratification for additions beyond 9)
- (b) Ratify floor but require Panel re-ratification for each language addition beyond 9 (heavier review, slower expansion)
- (c) Ratify floor but require a broader-than-W5a review surface for each addition (e.g. Panel sub-quorum sign-off, or product-owner sign-off in addition to W5a)
- (d) Different — specify
- (INSUFFICIENT_INFORMATION)

### G-Q7-v4 — Audit retention 90 hot + 1yr cold + rationale (refined)

v3 position: 90 days hot + 1 year cold for `retentionClass: 'auth_short'`. v3 Panel surfaced 3 DIFFERENT-RETENTION votes — slots were not opposed to the 90/1yr split per se but wanted the spec to anchor *why* 90/1yr (rather than 30/0, 365/7yr, or some intermediate hybrid). Without that anchor, the choice read as arbitrary.

**v4 condition-closer position:** the 90 hot + 1 year cold retention values are preserved verbatim from v3. v4 adds §5.4 — a rationale paragraph naming: (i) the v2 30/0 was rejected as a compliance dead-zone for post-incident investigation; (ii) the CA-10-E 365/7yr standard was rejected as over-retaining sensitive credentialed-run context; (iii) 90-day hot covers the quarterly enterprise security review cycle most incidents surface within; (iv) 1-year cold covers annual external/internal compliance reviews without extending the 7-year liability window. This is the minimum retention that satisfies both incident-response and annual-audit requirements while respecting the sensitivity of credentialed-run metadata.

Panel re-ratification question — is the v4 90-hot + 1-yr-cold retention + rationale acceptable?

- (a) Ratify v4 as proposed (90 hot + 1yr cold + the §5.4 rationale anchoring quarterly-review + annual-audit + minimised-liability triangulation)
- (b) Reject v4; restore v2 short retention (30 hot + 0 cold) — the rationale doesn't justify the cold-store liability window
- (c) Reject v4; restore CA-10-E canonical retention (365 hot + 7yr cold) for credentialed-run entries — the rationale's "shorter than standard" intent isn't compelling enough to diverge
- (d) Different — specify (e.g. 90 hot + 6-month cold; or 180 hot + 1yr cold; or other hybrid)
- (INSUFFICIENT_INFORMATION)

---

## 13. Engineering scope estimate (Phase 3, post-ratification — v4)

| Surface | Effort (W-days) |
|---|---:|
| Conductor extension: login pass + memory-only storageState handling + same-origin gate | 2 |
| **Memory-pressure monitor (REQUIRED v4 deliverable — Q4-v4 condition-closer)**: `process.memoryUsage()` heap-consumption sampler invoked at every storageState read/write boundary; configurable threshold (default 80% of `heapTotal`); breach raises `MemoryPressureAbort` which the Conductor catches and surfaces as `ok:false, reason: 'memory_pressure_abort'`. NEVER triggers a filesystem fallback. Hard-fail semantic is non-negotiable: memory pressure aborts the run, it does not spill storageState to disk under any condition. | 0.5 |
| `scrubCredentials` extension for evidence artifacts (DOM dumps, network logs, ProductSSOT delta entries) | 1 |
| Audit-log integration for credentialed runs (§5.1 entry shape) + retention class wire-in (90 hot + 1yr cold cron behaviour) | 0.75 |
| All 10 invariants → test surface (canary-credential negative test, memory-only verification, same-origin enforcement, 9-language destructive-denylist coverage, no-screenshot-capture regression test, memory-pressure hard-fail verification, etc.) | 2.25 |
| Language-expansion-process documentation + one non-floor language exercise (e.g. Hindi added via the registry path) | 0.25 |
| Documentation: AGENT_21_AggressiveCrawlConductor blueprint + capability boundary §8 (explicit screenshot-deferred-to-Phase-4 disclaimer) | 0.5 |
| **TOTAL** | **~7.25 W-days** |

**Memory-pressure monitor — Phase 3 MUST-SHIP contract (v4 detail):** Phase 3 ships a memory-pressure monitor as a required deliverable alongside the auth-traversal implementation. The monitor MUST:

- Track Node.js `process.memoryUsage()` heap consumption during storageState operations (sample at minimum at every `await context.storageState()` read and at every `browser.newContext({ storageState: ... })` apply).
- If heap usage exceeds a configurable threshold (default: 80% of available heap — `heapUsed / heapTotal > 0.8`), the crawl run FAILS LOUDLY — returns `ok:false` with `reason: 'memory_pressure_abort'` — NEVER silently spills storageState to disk.
- The hard-fail semantic is non-negotiable: memory pressure aborts the run, it does not trigger a filesystem fallback. There is no `tmp/playwright-state-*` escape valve on memory pressure (consistent with Invariant 2 MUST).

**v4 scope delta vs. v3 estimate:** the v4 condition-closers add ~1.0 W-day of scope: ~0.5 for the memory-pressure monitor implementation, ~0.25 for its test surface, ~0.25 for the language-expansion-process documentation + non-floor exercise. The retention rationale (Q7-v4) is documentation-only and adds zero engineering effort. Net: Phase 3 v4 ≈ 7.25 W-days, up from v3's 6.25.

**Phase 4 (deferred, separate dispatch):** screenshot capture + scrub pipeline. Estimate: ~3 W-days for the engine work + ~1 W-day for operator residual-risk-ack UI + ~1 W-day for the test fixture suite. Total Phase 4 ~5 W-days, fully scoped in its own dispatch with its own Panel ratification gate.

Depends on: Phase 2 v3 ratification by W6 (this spec); Phase 1 Agent #21 already shipped at commit `83fb20a`; W2 boundary respected throughout.

---

## 14. Related canonical references

| Section | Why referenced |
|---|---|
| CANONICAL_REFERENCE.md §6 line 110 | The anchor — this spec operationalises that line verbatim. |
| CANONICAL_REFERENCE.md §13 (Auth + Role Model + URL Whitelist) | §7.2 admin/operator boundary; §7.3 admin-role opt-in flag. |
| CANONICAL_REFERENCE.md §14 (GovernanceAuditLog hash chain) | §5.3 chain integration; §10 retention. |
| CANONICAL_REFERENCE.md §7.5 (ProductSSOT) | §6.3 delta_log scrub extension. |
| `docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md` §A.5 | Source for the auth-traversal-vs-unauth design. |
| `docs/specs/agent-blueprints/AGENT_03_SelfRenewal.md` §8 | Template for the AGENT_21 capability-boundary section Phase 3 will author. |
| Phase 1 commit `83fb20a` | The Agent #21 Conductor that this spec graduates with auth-handling in Phase 3. |
| Panel ruling `30e5edb` | The phased-build authority (7/8 STAGED, dissent-floor VALID). |
| `src/lib/renewal/inputArtifact.js:146` | Existing `scrubCredentials()` implementation that this spec extends. |

---

*End of Authenticated Crawl Traversal Security Spec v4. PENDING W6 adversarial Panel **re-ratification** per HARD GATE 2 of the Master Phased Build (Panel ruling `30e5edb`). v1 NOT_RATIFIED at commit `556a751` with 5 conditions; v2 (commit `b782e2f`) addressed all 5 per CEO disposition + Slot-7 hybrid rationale; v3 (commit `be594e3`) addressed 4 targeted v2 Panel concerns per CEO-locked decisions on Q3/Q4/Q6/Q7; v4 (this commit) applies 3 surgical condition-closers identified by the v3 Panel on Q4 (memory-pressure monitor with hard-fail), Q6 (denylist-registry expansion process), and Q7 (retention rationale). G-Q1, G-Q2-v2, G-Q3-v3, and G-Q5 carry forward RATIFIED — no re-vote required on those four.*
