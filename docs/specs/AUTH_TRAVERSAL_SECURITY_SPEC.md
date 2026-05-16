# Authenticated Crawl Traversal — Security Spec

**Status:** DRAFT v2 (Phase 2 of Master Phased Build, Panel ruling `30e5edb`). NOT canonical SSOT. NOT yet engineering-ready — requires W6 adversarial Panel **re-ratification** before Phase 3 implementation. v1 was `NOT_RATIFIED` at commit `556a751` with 5 conditions. v2 addresses all 5 per CEO disposition + the Slot-7 hybrid recommendation for the denylist question.
**Author:** W5a, 2026-05-16 (v2 revision).
**v1 → v2 changelog:**
- Cond 1 (G-Q2 MFA): fail silently → continue unauth → **fail loud**, return `ok:false`, stop auth attempt.
- Cond 2 (G-Q3 screenshots): operator-review-only → **build real PII scrub pipeline (new §6a)** per CEO Decision 1 (Option B); scrub-then-redact-then-persist; default-OFF for auth screenshot retention; explicit residual-risk acknowledgment.
- Cond 3 (G-Q4 storageState): on-disk `tmp/playwright-state-<runId>/` with cleanup verification → **memory-only** Playwright `storageState` object; filesystem path eliminated entirely; race condition removed by removing the race.
- Cond 4 (G-Q6 destructive denylist): pure denylist (English-only) → **hybrid: denylist + explicit `data-crawl-safe="true"` allowlist + i18n (en/es/fr/pt/de/zh-CN)** per Slot-7 hybrid recommendation.
- Cond 5 (G-Q7 retention): standard 365 hot + 7yr cold → **30 days hot, NO cold** for credentialed-run records.
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

### Invariant 2 — `storageState` is memory-only; NO filesystem persistence.

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

**i18n destructive regex (Panel condition 4 — 6 named language families):**

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
)\b/iu
```

The regex matches the Unicode `u` flag so non-Latin scripts (Chinese ideographs) match correctly. The 6 language families per dispatch are the floor; per-product i18n configuration can extend with additional locales at product registration (Phase 3 implementation may expose a `productConfig.destructiveTermsExtra: string[]` knob).

**Honest false-negative acknowledgment.** This list does NOT cover:
- Custom CSS class names that don't match the convention (e.g. `bg-red-500` styling a delete button via Tailwind without any class-name signal).
- Obfuscated text content (e.g. button text "Continue" with `onclick='deleteAccount()'`).
- JavaScript-only event handlers attached programmatically.
- Languages outside the 6-family floor (Japanese, Korean, Arabic, Hindi, Russian, etc. — Phase 3 dispatch may extend; per-product opt-in for additional languages).
- Glyph-style buttons (e.g. trash-can icon with no aria-label).

The hybrid gate's safety story is **defence in depth**, not perfection:
- Invariant 4 (same-origin) prevents the click from sending session cookies to a third-party origin even if a destructive button slips past detection.
- Invariant 8 (one-shot credentials) prevents the credential context from persisting beyond a single run.
- The explicit allowlist (`data-crawl-safe="true"`) lets product authors mark known-safe buttons for unambiguous crawler interaction.

**Test surface:**
- `<button class="btn-danger">Delete Account</button>` (English denylist match) → click BLOCKED.
- `<button>Löschen</button>` (German denylist match, no class) → click BLOCKED.
- `<button>删除</button>` (Chinese ideograph denylist match) → click BLOCKED.
- `<button data-crawl-safe="true" class="btn-danger">Delete</button>` (allowlist overrides denylist) → click ALLOWED.
- `<form method="post"><button>Save</button></form>` (form-submit method gate) → click BLOCKED.
- `<button>Continue</button>` (benign text; no class; no data-* markers) → click ALLOWED, and the false-negative caveat is documented per §10 acknowledged-residual.

### Invariant 6 — Evidence artifact scrubbing.

Before any screenshot / DOM dump / network-log artifact is persisted, the Conductor applies a content-scrubber that:

- Replaces any string matching the operator's submitted email or password with the `[REDACTED]` marker (literal string comparison + word-boundary regex).
- Replaces common credential-leak patterns: `Welcome,? .+@.+\.(com|net|org|io|...)` → `Welcome, [REDACTED-EMAIL]`; password fields' `value` attribute in HTML dumps → `value="[REDACTED]"`.
- For screenshots: skips the scrub (it's a PNG, not text) BUT the post-screenshot DOM dump is scrubbed. The screenshot itself is reviewed by the operator before sharing; this is a documented caveat (Phase 3 may add OCR-based scrubbing later).

**Test surface:** screenshot a page that displays the canary email; assert the DOM dump alongside has `[REDACTED-EMAIL]`; document that the PNG itself is NOT scrubbed (operator review required).

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
- Any screenshot or DOM dump (per §6.2 + new §6a Screenshot Scrub Pipeline).

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

**Retention (v2 revision — Panel condition 5, G-Q7=GQ7-SHORT):** credentialed-run audit records get **30 days hot storage, NO cold storage** — divergent from the CA-10-E standard `365 days hot + 7 years cold` for ordinary GovernanceAuditLog entries. Rationale per Panel rationale + Slot 10 objection 30: even though credentials themselves are NEVER logged (Invariant 1 / T1), the CONTEXT of a credentialed run (URLs visited, timing, product structure, response shapes) is itself sensitive metadata that warrants minimised retention. The shorter window reduces the surface for an old credentialed-run record to surface in a future investigation, breach disclosure, or subpoena scope.

The retention divergence is implemented by tagging credentialed-run audit entries with `retentionClass: 'auth_short'`; the GovernanceAuditLog cold-archival cron MUST exclude entries with this tag from cold migration and MUST purge them from hot storage after 30 days. Other audit categories (95/95 scores, clearance steps, panel decisions, customer signals, governance records) retain the canonical CA-10-E retention.

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

---

## 6. Data exfiltration controls — concrete contract

### 6.1 Claude / OpenRouter prompt construction

The research-brief prompt (`api/research-url.js` lines 50-74) takes the multi-page CrawlReport from Agent #21 and constructs a Claude prompt. Phase 3 MUST:

- Apply `scrubCredentials` to any free-text content (page bodies, headings, alt-text) before inclusion in the prompt.
- Strip `<input type="password" ...>` elements' `value` attributes entirely.
- Strip any `Authorization:` headers from any captured network log entry.
- Strip any `Set-Cookie:` response headers from any captured network log entry.

The prompt is sent over TLS to Anthropic / OpenRouter. The third-party provider's data retention policy (Anthropic: 30 days for abuse review by default) is a known limitation — credentials never reach the prompt, so this is acceptable per Invariant 1.

### 6.2 Screenshot handling — see §6a

**v2 revision** (Panel condition 2, G-Q3=REJECT-v1 + CEO Decision 1 Option B): v1's "operator-review-only, screenshots not scrubbed" approach is rejected. v2 builds a real PII/credential scrub pipeline before screenshots persist anywhere. See **§6a Screenshot Scrub Pipeline** below for the full contract.

Key v2 changes from v1:
- Default for authenticated-session screenshot retention is **OFF**. The operator must explicitly enable it AND acknowledge residual risk before any authenticated screenshot is retained.
- When enabled, EVERY authenticated-session screenshot passes the §6a scrub pipeline before ANY persistence (memory beyond the immediate scrub buffer, disk, log, prompt, external send).
- Scrub failure → screenshot is DISCARDED entirely. Never persisted in unscrubbable state.
- Scope is auth-screenshots only; unauthenticated public-page screenshots are not subject to scrub (no credential context to leak).

### 6.3 ProductSSOT writes

Per CANONICAL §7.5, `delta_log_entry.issue.evidence` may contain customer-facing strings. PII-scrub per CA-10-E.2 already applies. This spec extends the scrub to also cover the operator's submitted credentials (Invariant 7) — `scrubCredentials` is applied to every `delta_log_entry` before write.

---

---

## 6a. Screenshot Scrub Pipeline — concrete contract

**v2 NEW SECTION** addressing Panel condition 2 per CEO Decision 1 Option B (build real PII scrub, not drop screenshots). Replaces v1's "operator-review-only" mitigation — that approach was Panel-rejected (G-Q3 = `PLURALITY_REJECT`, 4 of 9 Panel slots).

### 6a.1 Scope of this pipeline

Applies to **authenticated-session screenshots only.** Unauthenticated public-page screenshots bypass the scrub (no credential context to leak; standard image artefact handling per ACE spec §A).

A screenshot is "authenticated-session" iff it is captured AFTER the Invariant 3 single-attempt login has succeeded AND BEFORE the Conductor's run end. Screenshots captured during the login form interaction (pre-submit) are also authenticated-session-eligible since the form may already contain credential values.

### 6a.2 Default posture: retention OFF

The default for authenticated-session screenshot retention is **OFF**. The Conductor MUST NOT persist any authenticated-session screenshot beyond the immediate scrub-pipeline buffer unless ALL of the following hold:

1. The operator has explicitly enabled authenticated-screenshot retention via a per-run flag (e.g. `runOpts.retainAuthScreenshots: true` — Phase 3 dispatch defines the exact flag surface).
2. The operator has acknowledged residual risk in writing — an acknowledgment record stored alongside the run that the operator has read and accepted §6a.7 below (the residual-risk disclosure).
3. The target product is in a `dev` or `staging` environment per §13.1 environment role-gate. Authenticated-screenshot retention in `prd` requires admin role + explicit per-product override (the gate is admin-only; operator role cannot enable it for prd).

If ANY of these three preconditions fails, the screenshot is discarded after the scrub pipeline produces its analytical signal (e.g. visible-element counts, layout dimensions) — but the redacted image itself is NOT persisted.

### 6a.3 Pipeline stages

For every authenticated-session screenshot, the pipeline runs in this order (each stage gates the next; failure at any stage discards the screenshot):

```
Stage 1 — Capture
  Browserless / Playwright returns the PNG buffer in memory.
  Buffer never written to disk in this stage.

Stage 2 — DOM-state snapshot
  Concurrent with screenshot capture, the Conductor reads:
    a. The full HTML innerText of the page (for OCR cross-reference).
    b. All input[type="password"] field values (always treated as
       credential candidates regardless of OCR signal).
    c. The operator's submitted loginEmail + loginPassword strings.
    d. The current storageState cookies + localStorage keys (token-
       shaped values).

Stage 3 — OCR pass
  Run an OCR engine (Tesseract.js or equivalent — engineering dispatch
  picks) on the PNG buffer to extract recognised text + bounding boxes
  per recognised token. Output: { text, bbox: {x,y,w,h} } pairs.

Stage 4 — Pattern matching
  For each OCR-extracted token AND each DOM-state credential candidate
  from Stage 2, apply the patterns in §6a.4 below. Any token matching
  any pattern is marked for redaction with its bounding box.

Stage 5 — Cross-reference: operator's exact credentials
  Literal-string-match the operator's loginEmail + loginPassword
  strings against the OCR-extracted text. Any exact match (case-
  insensitive, whitespace-trimmed) is marked for redaction even if it
  does not also match a structural pattern.

Stage 6 — Redaction
  For every bounding box marked in stages 4-5, draw a solid black
  rectangle on the PNG using a server-side image library (sharp /
  jimp / equivalent). The redacted PNG retains all structural
  evidence (layout, non-sensitive text, surface shapes) but the
  sensitive regions are visually obliterated.

Stage 7 — Verification
  Re-OCR the redacted PNG. If any of the original sensitive tokens
  (passwords, the operator's exact email, the operator's exact
  password, recognisable token patterns from §6a.4) appear in the
  re-OCR output, the redaction has FAILED. Discard the screenshot
  entirely (Stage 8 short-circuit to DISCARD).

Stage 8 — Persistence decision
  If verification passes (no sensitive tokens detected post-redaction),
  the redacted PNG is persisted per the §6.2 / per-run flag policy.
  Otherwise the PNG is DISCARDED and an audit-log entry
  `{ kind: 'screenshot_scrub_failed', runId, reason }` is written
  (subject to §5 retention class 'auth_short').

Stage 9 — Scrub pipeline failure handling
  If any stage 1-7 throws an exception (OCR engine crash, image
  library failure, OOM during processing), the screenshot is
  DISCARDED. NEVER persisted in unscrubbable state. Audit-log
  entry `{ kind: 'screenshot_scrub_pipeline_error', runId,
  stage, error }` is written.
```

### 6a.4 Patterns matched in Stage 4

The scrub pattern set is **conservative**: false-positives (extra-redacted regions) are acceptable; false-negatives (un-redacted sensitive tokens) are the failure mode the pipeline minimises.

| Category | Pattern | Bounding-box behaviour |
|---|---|---|
| Password DOM values | Always treated as credential candidates — all `input[type="password"]` fields' `value` attributes are marked for redaction at their rendered bounding box | DOM-derived; bypass OCR uncertainty |
| Operator's exact email | Literal-string-match against `loginEmail` from `InputArtifact.raw.description` | Redacted even if email is also non-sensitive elsewhere — false-positive accepted |
| Operator's exact password | Literal-string-match against `loginPassword` | Same — false-positive accepted |
| Email-address pattern (generic) | `/[^\s@]+@[^\s@]+\.[a-z]{2,}/i` | Catches user emails in "Welcome, alice@example.com" banners |
| API key — OpenAI-style | `/\bsk-[A-Za-z0-9]{20,}\b/` | sk-abc123... format |
| API key — Anthropic-style | `/\bsk-ant-[A-Za-z0-9-_]{20,}\b/` | |
| API key — Stripe-style | `/\b(sk\|pk)_(live\|test)_[A-Za-z0-9]{16,}\b/` | |
| API key — GitHub | `/\b(ghp\|gho\|ghu\|ghs\|ghr)_[A-Za-z0-9]{36,}\b/` | |
| Generic bearer token | `/\b(Bearer\s+)?[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}\b/` | JWT-like 3-segment pattern |
| Credit-card-shape (Luhn-validated) | `/\b(?:\d{4}[\s-]?){3}\d{4}\b/` plus Luhn checksum | False-positives acceptable; we redact even non-CC 16-digit strings |
| Session cookie value visible in DOM | Cross-reference token-shaped values from storageState cookies against OCR output | Catches a cookie value leaked into page text |
| US SSN pattern | `/\b\d{3}-\d{2}-\d{4}\b/` | |
| Phone — E.164 | `/\+\d{7,15}\b/` | |
| QR code / barcode regions | Detected via image-processing edge analysis | Whole QR region redacted (MFA QR codes leak TOTP seed) |

Engineering dispatch may extend with additional patterns; the floor list above is the minimum for v2.

### 6a.5 Redaction visual contract

- Redaction rectangles are **solid black** (`#000000`), no transparency, drawn over the bounding box plus a 4px padding on each side.
- The redacted PNG retains its original dimensions + EXIF orientation. No metadata-stripping is required at this stage (PNGs typically have no sensitive EXIF) but Phase 3 dispatch may add a defensive strip pass.
- A small "REDACTED" badge is overlaid in the top-left corner of any image where ≥1 redaction occurred — operator-visible signal that the image has been scrubbed (not original).

### 6a.6 What this pipeline does NOT catch (honest residual risk)

Per CEO Decision 1: this pipeline is REAL but not PERFECT. Documented residuals:

- **Custom CSS-styled credential displays.** A target product that renders a password using `letter-spacing: -100px` to overlap glyphs OR uses background-image to display a password string would defeat OCR. The DOM-state cross-reference (Stage 2b — reading `input[type="password"]` values) catches the canonical password-input case but not these exotic renderings.
- **Obfuscated tokens.** A token displayed as `sk -• • • • • • -live-1234567890` with intentional spacing / unicode dots would not match the regex patterns. The literal-string-match against the operator's submitted credentials would still catch their specific value.
- **OCR engine errors.** Tesseract.js misreads characters (`O` vs `0`, `l` vs `1`); a misread sensitive token might be both unmatched at scrub time AND illegible to a human reviewer. Stage 7 (re-OCR verification) catches the case where the original-OCR succeeded but the redaction failed; it does NOT catch the case where original-OCR misread the sensitive token and so didn't mark it for redaction in the first place.
- **Tokens introduced via JS after screenshot.** If the page contains JavaScript that injects token-shaped content into the DOM AFTER the screenshot was captured but BEFORE Stage 2 reads the DOM state, the DOM-state snapshot has the token but the screenshot does not. Inverse case (screenshot has it; DOM doesn't yet) — the OCR pass catches it; the DOM-cross-reference doesn't.
- **Non-text credentials.** A QR code embedding a TOTP secret IS detected by the QR-region redaction. A photograph of a sticky-note password is NOT detected (no OCR-text match, no DOM cross-reference). Phase 3+ may add CV-model-based content classification; v2 does not.
- **Hosting-environment exposure.** Once a redacted PNG is persisted to Vercel Blob with a signed URL, the host's logs / CDN cache / network operator have observability of the request. The pipeline cannot defend against compromise of the hosting infrastructure itself.

### 6a.7 Operator residual-risk acknowledgment

Before authenticated-screenshot retention can be enabled on any run, the operator MUST be presented with this disclosure verbatim and acknowledge it in writing (the acknowledgment is stored alongside the run record with `kind: 'auth_screenshot_residual_risk_ack'`):

> **AUTHENTICATED CRAWL SCREENSHOT RETENTION — RESIDUAL RISK NOTICE (v2)**
>
> When you enable retention of screenshots captured during an authenticated crawl, FlowAI runs an automated scrub pipeline (§6a.3) over every screenshot before it persists anywhere. The scrub pipeline:
>
> - Detects and redacts: password fields' DOM values, your exact submitted credentials, common API-key patterns (OpenAI/Anthropic/Stripe/GitHub), JWT-shaped tokens, credit-card-shaped 16-digit strings, US SSN patterns, phone numbers (E.164), QR/barcode regions, generic email-address patterns. Verifies redaction by re-OCRing the redacted image.
> - Does NOT detect: tokens rendered with exotic CSS that defeats OCR; obfuscated tokens (e.g. `sk -• • • -• • •`); custom credential displays not matching the canonical password-input element; non-text credentials embedded in raster images (photo of a sticky note).
> - DISCARDS the screenshot entirely if any stage of the scrub pipeline fails, rather than persisting in unscrubbable state.
>
> By enabling authenticated-screenshot retention you accept that:
>
> 1. The scrub pipeline reduces but does not eliminate the risk that a sensitive token visible in your authenticated session could appear in a retained screenshot.
> 2. You are responsible for visually reviewing retained screenshots before sharing them outside your organisation. The "REDACTED" badge indicates the scrub ran, not that the screenshot is guaranteed free of all sensitive content.
> 3. The retention window for authenticated-crawl artefacts is 30 days hot, no cold storage (per §5 retention class `auth_short`).
> 4. By default this feature is OFF. You are explicitly opting in for this run.
>
> Acknowledged by: `<operator userId>` at `<ISO-8601 timestamp>`. Run id: `<runId>`. Product: `<productId>`. Environment: `<dev|staging|prd>`.

Phase 3 implementation MUST present this disclosure verbatim and gate the per-run flag on an explicit user action (e.g. a checkbox + "Acknowledge and enable" button). No silent default enable; no "remember my choice" override.

### 6a.8 Honest panel-ratification question for the screenshot pipeline

The scrub-then-redact + residual-risk-disclosure + default-OFF approach is the W5a / CEO-Decision-1 proposal. The alternative the Panel originally voted on (G-Q3=`PLURALITY_REJECT`, 4 of 9 slots) was "reject screenshots entirely until OCR scrub lands; ship Phase 3 without screenshots." The Panel's re-ratification question (now §12 G-Q3-v2) is whether the v2 scrub-then-redact pipeline + residual-risk-disclosure + default-OFF is acceptable, OR whether the residual-risk-disclosure requirement makes it operationally impractical and the Panel still prefers "no auth screenshots at all" in Phase 3.

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
- **CV-model-based screenshot content classification.** Per §6a.6, the v2 OCR + pattern-matching pipeline catches the canonical categories but not all exotic CSS-defeating renderings or photograph-of-credentials cases. A future enhancement could add a CV model trained on credential-display patterns; v2 ships with OCR + pattern matching only.
- **i18n denylist coverage beyond 6 named language families.** v2 covers en/es/fr/pt/de/zh-CN per Panel condition 4. Additional locales (ja, ko, ar, hi, ru, etc.) are deferred to per-product opt-in via `productConfig.destructiveTermsExtra` (Phase 3 may wire the knob; the locale dictionaries are out of scope for v2).

---

## 11. Phase 3 acceptance criteria

**v2 revision:** 8 v1 criteria retained (with the cleanup-sweep helper criterion removed — no orphan class to sweep per Invariant 2 v2) + 3 NEW criteria addressing the v2 Panel conditions. The Phase 3 implementation dispatch is acceptance-ready only when ALL of:

1. **All 10 invariants in §2 have a passing test in `tests/agents/agent-21-auth-traversal.test.js` (or split files).** Each invariant maps to ≥1 named test.
2. **Canary-credential negative test** (Invariant 1 test surface) executes end-to-end against a stub login page; greps every persistent artifact for the canary; passes.
3. **storageState memory-only verification** (NEW per Cond 3): a test asserts that `await context.storageState({ path })` is NEVER called with a `path` argument during the run; a filesystem watcher asserts no file matching `tmp/playwright-state-*` is created at any point.
4. **MFA fail-loud verification** (NEW per Cond 1): a test mocks an MFA-challenge post-login response; asserts the CrawlReport returns `ok:false, authFailureReason: 'mfa_required'` AND that NO subsequent page fetch occurred after the MFA wall.
5. **Screenshot scrub pipeline test suite** (NEW per Cond 2): tests cover (a) password-DOM redaction, (b) operator-credential literal-match redaction, (c) API-key pattern (OpenAI/Anthropic/Stripe/GitHub) redaction, (d) JWT-shape token redaction, (e) Luhn-validated CC redaction, (f) QR region redaction, (g) Stage-7 re-OCR verification failure → DISCARD, (h) Stage-9 pipeline exception → DISCARD with audit log entry. Each test uses synthetic PNG fixtures + a stubbed OCR engine.
6. **Destructive-action denylist i18n coverage** (NEW per Cond 4): tests assert blocking on (a) English `btn-danger`, (b) Spanish `Eliminar`, (c) French `Supprimer`, (d) Portuguese `Excluir`, (e) German `Löschen`, (f) Chinese `删除`. Plus a test asserts the `data-crawl-safe="true"` allowlist overrides a denylist match.
7. **Retention class enforcement** (NEW per Cond 5): a test asserts that audit entries tagged `retentionClass: 'auth_short'` are excluded from cold-archival cron AND purged from hot storage after 30 days. (Phase 3 dispatch wires the cron; this test may be a deferred integration test if Supabase cron is wired separately.)
8. **Audit log conformance**: a smoke test asserts the credentialed-run audit-log entry shape matches §5.1 exactly and contains none of §5.2's NEVER-recorded fields. v2 addition: the entry MUST carry `retentionClass: 'auth_short'`.
9. **Cross-origin refusal verification** (per supermajority-ratified G-Q1): a test asserts that a same-origin BFS frontier with one cross-origin link present does NOT navigate to the cross-origin target with the storageState attached. (G-Q1 supermajority-ratified by Panel; reaffirmed in v2.)
10. **No regressions** in the full vitest suite.
11. **W2 boundary respected**: zero W2-locked files staged (computeMonitorClearance, formatMonitorClearanceFooter, monitor-clearance tests, per-layer scoring prompt, crawler truncation fix).
12. **Capability boundary documented**: the §8 capability boundary block in `docs/specs/agent-blueprints/AGENT_21_AggressiveCrawlConductor.md` (Phase 3 will add this blueprint, mirroring AGENT_03_SelfRenewal.md) names what Phase 3 CAN and CANNOT do — no overclaim.
13. **Operator residual-risk acknowledgment UI present** (NEW per Cond 2): the UI for enabling authenticated-screenshot retention presents the §6a.7 disclosure verbatim and gates the per-run flag on explicit checkbox + button action. No silent default-enable; no "remember my choice".
14. **Phase 3 dispatch gate**: HARD GATE 3 in the Master Phased Build sequence — Phase 4 (validate scoring on multi-page input) cannot start until CEO confirms Phase 3 passed.

---

## 12. Open Questions for W6 adversarial Panel (Phase 2 v2 → HARD GATE 2 re-ratification)

**v2 question set:** G-Q1 and G-Q5 were SUPERMAJORITY-ratified in the v1 Panel (commit `556a751`); the v2 spec position on those two is unchanged from v1 and the questions are retained verbatim for record-keeping. G-Q2, G-Q3, G-Q4, G-Q6, G-Q7 were the 5 NOT_RATIFIED questions; v2 has changed positions on all five per CEO disposition + Slot-7 hybrid rationale. The questions below ask the Panel to re-ratify the v2 positions.

### G-Q1 — Cross-origin handling (RATIFIED IN V1; UNCHANGED IN V2)

v1 Panel verdict: `SUPERMAJORITY_GQ1-REFUSE` (8 of 9). v2 keeps this position verbatim — refuse cross-origin entirely. No re-vote needed; included here for completeness.

### G-Q2-v2 — MFA handling (revised)

v1 Panel verdict: `PLURALITY_GQ2-LOUD` (5 of 9, below 7/10 quorum). CEO disposition: **adopt fail-loud per the plurality**. v2 Invariant 3 + §8.1 implement fail-loud: MFA challenge → return `ok:false, authFailureReason: 'mfa_required'`, STOP, do NOT continue unauthenticated. The "continue unauthenticated" v1 path is removed.

Panel re-ratification question — is the v2 fail-loud position acceptable?

- (a) Ratify v2 fail-loud (W5a position per CEO disposition + plurality intent)
- (b) Reject v2 fail-loud; revert to v1 continue-unauthenticated (the previously rejected position)
- (c) Configurable per run — operator picks fail-loud vs continue-unauth at launch
- (d) Different — specify
- (INSUFFICIENT_INFORMATION)

### G-Q3-v2 — Screenshot scrub pipeline (revised + new §6a)

v1 Panel verdict: `PLURALITY_REJECT` (4 of 9). CEO Decision 1: **build real PII scrub pipeline (Option B), not drop**. v2 §6a writes a 9-stage scrub-then-redact-then-verify pipeline with default-OFF retention, explicit residual-risk operator acknowledgment, and DISCARD-on-scrub-failure semantics. Detection patterns cover: password DOM values, operator's exact submitted credentials (literal match), API-key patterns (OpenAI/Anthropic/Stripe/GitHub), JWT-shape tokens, Luhn-validated CC, US SSN, phone E.164, QR/barcode regions, generic email addresses.

Panel re-ratification question — is the v2 scrub-then-redact + residual-risk-disclosure + default-OFF approach acceptable, or does the residual-risk-disclosure requirement make it operationally impractical?

- (a) Ratify v2 §6a as proposed (scrub-then-redact, default-OFF, operator acks residual risk per §6a.7)
- (b) Reject v2; revert to v1 GQ3-NO-PNG ship-without-screenshots position (Phase 3 has no screenshot retention at all)
- (c) Ratify scrub pipeline but harden the default — default-OFF + admin-role-only enable (operator cannot self-enable even in dev/staging)
- (d) Different — specify (e.g. additional patterns required; specific residual-risk language change)
- (INSUFFICIENT_INFORMATION)

### G-Q4-v2 — storageState memory-only (revised)

v1 Panel verdict: `PLURALITY_GQ4-MEMORY` (4 of 9, below 7/10 quorum). v2 Invariant 2: storageState is memory-only; the v1 `tmp/playwright-state-<runId>/` filesystem path is eliminated entirely. The cleanup-verification race condition that 4 Panel slots flagged is eliminated by elimination. Playwright API supports `await context.storageState()` (in-memory return) which v2 mandates exclusively over `await context.storageState({ path })`.

Panel re-ratification question — is the v2 memory-only position acceptable?

- (a) Ratify v2 memory-only (eliminates race; eliminates fs surface; W5a position per CEO disposition + plurality intent)
- (b) Reject v2 memory-only; reinstate v1 fs path with cleanup-verification fix
- (c) Accept memory-only as primary but allow opt-in encrypted fs fallback if memory pressure becomes a Phase 3 concern (separate per-run flag, admin-role-only)
- (d) Different — specify
- (INSUFFICIENT_INFORMATION)

### G-Q5 — Same-eTLD+1 subdomains (RATIFIED IN V1; UNCHANGED IN V2)

v1 Panel verdict: `SUPERMAJORITY_GQ5-STRICT` (8 of 9). v2 keeps this position verbatim — strict same-origin by default; admin-role flag to opt in to same-eTLD-1. No re-vote needed; included for completeness.

### G-Q6-v2 — Destructive-action gate: hybrid allowlist + i18n denylist (revised)

v1 Panel verdict: `PLURALITY_REJECT` (4 of 9). Slot 7's rationale: "All options have critical flaws... A hybrid approach with both safe-action attributes AND comprehensive denylists is needed." v2 Invariant 5 adopts the Slot-7 hybrid: explicit `data-crawl-safe="true"` allowlist (highest priority) + form-submit denylist (always-on guard) + i18n-aware destructive denylist (English, Spanish, French, Portuguese, German, Chinese Simplified). False-negative risk acknowledged explicitly with Invariant 4 (same-origin) + Invariant 8 (one-shot credentials) as backstops.

Panel re-ratification question — is the v2 hybrid + 6-language i18n position acceptable?

- (a) Ratify v2 hybrid + 6 languages as proposed (W5a position per Slot-7 rationale)
- (b) Ratify hybrid but require additional language families in v2 floor — specify which (e.g. ja, ko, ar must also be in floor before Phase 3 ships)
- (c) Ratify hybrid but require allowlist-only path (no denylist; only `data-crawl-safe="true"` is clickable — accepts dramatic loss of click-everything coverage in exchange for zero false negatives)
- (d) Different — specify
- (INSUFFICIENT_INFORMATION)

### G-Q7-v2 — Audit retention for credentialed runs (revised)

v1 Panel verdict: `PLURALITY_GQ7-SHORT` (5 of 9, below 7/10 quorum). CEO disposition: **adopt short retention per the plurality**. v2 §5 (audit-log surface) implements `retentionClass: 'auth_short'` → 30 days hot, NO cold storage. Rationale per Slot-10 objection 30: even though credentials themselves are never logged, the CONTEXT of a credentialed run (URLs visited, timing, product structure) is sensitive metadata that warrants shorter retention.

Panel re-ratification question — is the v2 short-retention position acceptable?

- (a) Ratify v2 short-retention as proposed (30 hot, 0 cold)
- (b) Reject v2 short-retention; revert to v1 standard retention (365 hot + 7yr cold)
- (c) Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all
- (d) Different — specify
- (INSUFFICIENT_INFORMATION)

---

## 13. Engineering scope estimate (Phase 3, post-ratification)

| Surface | Effort (W-days) |
|---|---:|
| Conductor extension: login pass + storageState handling + same-origin gate | 2 |
| Cleanup sweep helper (`scripts/cleanup-orphaned-storage-state.mjs`) + scheduled trigger | 1 |
| `scrubCredentials` extension for evidence artifacts (DOM dumps, network logs, ProductSSOT delta entries) | 1 |
| Audit-log integration for credentialed runs (§5.1 entry shape) | 0.5 |
| All 10 invariants → test surface (canary-credential negative test, cleanup verification, same-origin enforcement, destructive-denylist coverage, etc.) | 2 |
| Documentation: AGENT_21_AggressiveCrawlConductor blueprint + capability boundary §8 | 0.5 |
| **TOTAL** | **~7 W-days** |

Depends on: Phase 2 ratification by W6 (this spec); Phase 1 Agent #21 already shipped at commit `83fb20a`; W2 boundary respected throughout.

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

*End of Authenticated Crawl Traversal Security Spec v2. PENDING W6 adversarial Panel **re-ratification** per HARD GATE 2 of the Master Phased Build (Panel ruling `30e5edb`). v1 NOT_RATIFIED at commit `556a751` with 5 conditions; v2 addresses all 5 per CEO disposition + Slot-7 hybrid rationale.*
