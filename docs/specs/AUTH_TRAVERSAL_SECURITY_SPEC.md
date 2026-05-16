# Authenticated Crawl Traversal — Security Spec

**Status:** DRAFT (Phase 2 of Master Phased Build, Panel ruling `30e5edb`). NOT canonical SSOT. NOT yet engineering-ready — requires W6 adversarial Panel ratification before Phase 3 implementation.
**Author:** W5a, 2026-05-16.
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

### Invariant 2 — `storageState` JSON is ephemeral, scoped, auto-deleted.

The Playwright `storageState` for an authenticated run lives ONLY at:
```
<repo-root>/tmp/playwright-state-<runId>/storageState.json
```
where `<runId>` is the canonical run identifier (UUID v4). The file:

- Is created at run start, after a successful login.
- Is readable ONLY by the Node.js process that owns the run (POSIX `chmod 600` on creation; on Windows, restricted ACL).
- Is DELETED at run end, by the Conductor's `finally` block, with:
  - `fs.rm` recursive on the `tmp/playwright-state-<runId>/` directory
  - Verification: a follow-up `fs.access` that MUST throw `ENOENT`
  - If verification fails (file still present), an audit-log entry of `{ kind: 'storage_state_cleanup_failed', runId }` is written AND the process emits a structured error. The run is still reported as completed if the crawl succeeded; the cleanup-failure is a separate signal.
- Is NEVER reused across runs. The path itself encodes the runId, so by construction a second run would write to a different path.
- Is NEVER persisted to Supabase, Vercel KV, Vercel Blob, git, or any other store beyond the ephemeral `tmp/` directory.

**Test surface:** post-run filesystem check asserting `tmp/playwright-state-<runId>/` is gone; deliberate crash-test asserting that if the Conductor crashes mid-run, the next process start (or a separate cleanup sweep helper) removes orphaned `tmp/playwright-state-*/` directories older than 1 hour.

### Invariant 3 — Single-attempt login per run.

The Conductor performs AT MOST ONE login attempt per run, regardless of crawl-page count. If the login fails:

- The Conductor MUST NOT retry with the same credentials.
- The Conductor MUST NOT try a "forgot password" or "magic link" path.
- The Conductor MUST NOT escalate to a CAPTCHA solver.
- The Conductor MUST mark the run as `authFailed: true` and continue with UNAUTHENTICATED crawl only.
- Auth-gated pages discovered subsequently remain marked `authGated: true` per Phase 1 contract.

**Test surface:** mock a 401 response on login; assert exactly one POST to the login endpoint observed; assert run continues unauthenticated; assert `authFailed: true` in the CrawlReport.

### Invariant 4 — Same-origin restriction on the authenticated context.

The Playwright authenticated context navigates ONLY to URLs whose origin equals the start-URL origin. Cross-origin navigation:

- Drops the storageState BEFORE navigation (a fresh, anonymous context for cross-origin).
- Returns to the authenticated context for the next same-origin URL.
- OR (simpler implementation choice — Phase 3 dispatch picks) refuses cross-origin navigation entirely and records the URL as `out_of_scope`.

Either implementation is conformant; the spec mandates SOME mechanism that prevents the authenticated session cookies from being sent to a non-target origin. The simpler "refuse cross-origin" approach is the W5a recommendation.

**Test surface:** stub the target product with a link to `https://attacker.example`; assert that no Playwright request to `attacker.example` carries the storageState cookies.

### Invariant 5 — Non-destructive action allowlist.

While authenticated, the Conductor executes ONLY these DOM events on the target product:

- `click` on `<a href>` links (navigation only).
- `click` on `<button>` elements whose attributes do NOT match the destructive denylist (see below).
- `hover` / `focus` / `scroll` (passive).
- Reading `document.cookie` / `localStorage` / `sessionStorage` for state inspection (not modification).

**Destructive denylist** (button rejected if ANY match):
- `type="submit"` on a `<form>` (unless the XSS opt-in flag is on per SSOT §6 line 104 — dev/staging only).
- `aria-label` or text content matching `/\b(delete|remove|cancel|sign out|log\s*out|terminate|destroy|wipe|reset|purge|deactivate)\b/i`.
- `data-action="destructive"` or `data-destructive="true"` attribute.
- `class` containing `btn-danger`, `destructive`, `delete-btn`, `cancel-btn`, `logout-btn`, `signout-btn`.
- Any element inside a `<form method="post|put|patch|delete">` (form-submit gating).

This list is conservative and false-positives are acceptable — the Conductor's job is observation, not action.

**Test surface:** stub a page with a `<button class="btn-danger">Delete Account</button>`; assert click never fires.

### Invariant 6 — Evidence artifact scrubbing.

Before any screenshot / DOM dump / network-log artifact is persisted, the Conductor applies a content-scrubber that:

- Replaces any string matching the operator's submitted email or password with the `[REDACTED]` marker (literal string comparison + word-boundary regex).
- Replaces common credential-leak patterns: `Welcome,? .+@.+\.(com|net|org|io|...)` → `Welcome, [REDACTED-EMAIL]`; password fields' `value` attribute in HTML dumps → `value="[REDACTED]"`.
- For screenshots: skips the scrub (it's a PNG, not text) BUT the post-screenshot DOM dump is scrubbed. The screenshot itself is reviewed by the operator before sharing; this is a documented caveat (Phase 3 may add OCR-based scrubbing later).

**Test surface:** screenshot a page that displays the canary email; assert the DOM dump alongside has `[REDACTED-EMAIL]`; document that the PNG itself is NOT scrubbed (operator review required).

### Invariant 7 — One-shot credential lifetime.

Credentials submitted by the operator on the LandingPage / Renewal page exist in:

1. The HTTP request body to `/api/research-url` or `/api/renew` (TLS-encrypted in transit).
2. The Node.js handler's local variables (`raw.description.loginEmail/loginPassword`).
3. The Playwright `page.fill()` calls during login (passed by value into Playwright's IPC, then into the Chromium process memory).
4. The on-disk `tmp/playwright-state-<runId>/storageState.json` (encrypted-at-rest only if the underlying filesystem is encrypted; Vercel runtime filesystems are ephemeral but NOT individually encrypted — this is a known limitation acknowledged here).

Credentials do NOT exist in:
- Any Supabase row.
- Any Vercel KV entry.
- Any Vercel Blob object.
- Any Sentry / pino / Axiom log line.
- Any GovernanceAuditLog entry.
- Any Claude / OpenRouter API request payload.
- Any AI prompt / response (the Claude prompt that produces the research brief sees ONLY the page content AFTER scrubbing, never the credentials).
- Any git-committed file.

**Test surface:** static grep on the entire src/ and api/ trees for the canary credential pattern post-run. Static grep on the audit-chain DB rows. Static grep on a sampled day's worth of Sentry events.

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

### Invariant 10 — Crash / abort safety.

If the Conductor's process crashes or is killed mid-run:

- The orphaned `tmp/playwright-state-<runId>/` directory MUST be cleaned up by:
  - (a) A cleanup sweep helper (`scripts/cleanup-orphaned-storage-state.mjs`, to be authored in Phase 3) that runs at process start AND on a 1-hour schedule, deleting any `tmp/playwright-state-*` directory older than 1 hour.
  - (b) An OS-level temp-directory expiration policy IF deployed on a host where this is configurable (Vercel runtime resets the FS between invocations, so this is effectively automatic for serverless).
- The in-flight CrawlReport is NOT persisted (a partial run is a failed run; no half-results recorded).
- An audit-log entry `{ kind: 'crawl_aborted', runId, reason }` is written if the abort is graceful (signal handler); if not (hard crash), the next sweep entry records the orphan cleanup.

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
- The `storageState` file is captured AFTER navigation succeeds and contains cookies + localStorage, NOT the raw credentials.

---

## 4. Session-bleed prevention — concrete contract

### 4.1 Per-run Playwright context

Every authenticated crawl gets a fresh `browserContext`. Sequence:

1. Conductor receives `conductCrawl(url, { credentials, ... })`.
2. Conductor mints a fresh `runId` (UUID v4) if one is not supplied.
3. Conductor opens a new Playwright `browserContext({ storageState: undefined })` (no prior state).
4. Conductor performs the login (Invariant 3, single-attempt).
5. Conductor extracts `storageState` from the context and writes it to `tmp/playwright-state-<runId>/storageState.json`.
6. All subsequent same-origin page navigations within this run reuse this `browserContext`.
7. At run end (success or failure): close the context, delete the `storageState` file, verify deletion.

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

### 6.2 Screenshot retention

Browserless screenshots are PNG binary blobs. Phase 3:

- Screenshots are stored in `tmp/playwright-state-<runId>/screenshots/` alongside the storageState file.
- Same auto-deletion contract per Invariant 5.
- If a screenshot needs to be shared with the operator (e.g. in the BeforeAfterReport), it is uploaded to Vercel Blob with a one-time signed URL valid for 24h, with NO authentication-bypass possible. Phase 3 dispatch can choose to defer screenshot sharing entirely (NOT-FIXABLE in Phase 3; acceptable).

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

### 8.1 Login failure

Per Invariant 3 — single attempt, no retry. The CrawlReport returns:

```
{
  ok: true,                       // the CRAWL didn't fail; the login did
  authFailed: true,
  authFailureReason: '<short reason from Playwright>',
  pagesCrawled: <number>,         // pages crawled UNAUTHENTICATED after login fail
  authGatedPagesEncountered: <number>,
  ...
}
```

### 8.2 Mid-run process crash

Per Invariant 10 — cleanup sweep handles orphaned storageState files. No partial CrawlReport is persisted. The audit log gets a `crawl_aborted` entry if the abort was graceful; otherwise the next sweep records orphan cleanup.

### 8.3 Cleanup verification failure

If `fs.rm` of `tmp/playwright-state-<runId>/` succeeds but the follow-up `fs.access` does NOT throw ENOENT (i.e., the file still exists after attempted deletion):

- Audit log entry `{ kind: 'storage_state_cleanup_failed', runId, errno: <code> }`.
- Process emits a structured error to Sentry.
- The run is STILL reported as completed if the crawl itself succeeded — but the cleanup-failure flag MUST propagate to the operator-facing report so they can manually verify.

### 8.4 Operator abort mid-crawl

If the operator cancels mid-crawl (Phase 3 dispatch defines the cancel mechanism — possibly a `DELETE /api/agent/21/run/:runId` endpoint):

- The Conductor's `AbortController` fires; Playwright contexts are closed.
- `storageState` file is deleted per Invariant 5.
- A partial CrawlReport is returned with `aborted: true`.
- Audit log entry `{ kind: 'crawl_aborted', runId, reason: 'operator_abort' }`.

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
| "Playwright `storageState` JSON persisted only in ephemeral `tmp/playwright-state-<runId>/`" | Invariant 2 (storageState ephemeral + scoped) |
| "auto-deleted at run end" | Invariant 2 (auto-delete) + §8.3 (cleanup verification failure handling) |

---

## 10. Out of scope for Phase 3 (explicit non-goals)

- **OAuth / SSO / SAML login flows.** Phase 3 implements form-based username+password login only. OAuth providers (Google, GitHub, etc.) require provider-specific consent flows that operator credentials don't authorize. Defer to Phase 4+ or a separate dispatch with explicit auth-provider charter.
- **MFA / 2FA.** Phase 3 single-attempt login fails when MFA is required; the run continues UNAUTHENTICATED. MFA support is out of scope.
- **CAPTCHA solving.** Per Invariant 7. The Conductor never attempts to bypass CAPTCHAs.
- **Credential vault integration.** No Doppler-stored arbitrary-third-party credentials, no 1Password integration, no AWS Secrets Manager. Operator-supplied per-run only.
- **Long-lived session reuse.** Sessions are one-run-only by design. A future "remember this session for 1 hour to save Browserless costs" feature would require a separate spec + dispatch + Panel ratification.
- **Authenticated POST / form-submit traversal.** Per Invariant 5 — Phase 3 authenticated crawl is READ-ONLY (clicks on links only, no form submissions except per the dev/staging XSS opt-in already in §6 line 104). Authenticated form-submit assessment is a future capability behind a separate dispatch + Panel ratification + per-product opt-in.
- **OCR-based screenshot credential scrubbing.** Per §6.2. Operator review of screenshots is the Phase 3 mitigation; OCR scrubbing is a future enhancement.

---

## 11. Phase 3 acceptance criteria

The Phase 3 implementation dispatch is acceptance-ready only when ALL of:

1. **All 10 invariants in §2 have a passing test in `tests/agents/agent-21-auth-traversal.test.js` (or split files).** Each invariant maps to ≥1 named test.
2. **Canary-credential negative test** (Invariant 1 test surface) executes end-to-end against a stub login page; greps every persistent artifact for the canary; passes.
3. **Cleanup sweep helper** (`scripts/cleanup-orphaned-storage-state.mjs`) exists and is exercised by tests for both the "run completes cleanly" and "process crashed mid-run" paths.
4. **Audit log conformance**: a smoke test asserts the credentialed-run audit-log entry shape matches §5.1 exactly and contains none of §5.2's NEVER-recorded fields.
5. **No regressions** in the full vitest suite.
6. **W2 boundary respected**: zero W2-locked files staged (computeMonitorClearance, formatMonitorClearanceFooter, monitor-clearance tests, per-layer scoring prompt, crawler truncation fix).
7. **Capability boundary documented**: the §8 capability boundary block in `docs/specs/agent-blueprints/AGENT_21_AggressiveCrawlConductor.md` (Phase 3 will add this blueprint, mirroring AGENT_03_SelfRenewal.md) names what Phase 3 CAN and CANNOT do — no overclaim.
8. **Phase 3 dispatch gate**: HARD GATE 3 in the Master Phased Build sequence — Phase 4 (validate scoring on multi-page input) cannot start until CEO confirms Phase 3 passed.

---

## 12. Open Questions for W6 adversarial Panel (Phase 2 → HARD GATE 2 ratification)

Before Phase 3 can begin, W6 adversarial Panel reviews this spec and rules on each Open Question. Standard 4-option + INSUFFICIENT_INFORMATION format.

### G-Q1 — Cross-origin handling

§4.3 + Invariant 4 recommend "refuse cross-origin entirely; mark as out_of_scope." An alternative is "open fresh anonymous context for cross-origin." The simpler refuse-cross-origin choice loses information about external linking; the fresh-anonymous-context choice adds implementation complexity.

- (a) Refuse cross-origin entirely (W5a recommendation; simplest; consistent with same-origin policy as a hard boundary)
- (b) Fresh anonymous context for cross-origin (richer signal; harder to verify correctness)
- (c) Mixed: refuse by default, allow operator opt-in (auditable via per-run flag; per-product whitelist)
- (d) Different — specify in rationale

### G-Q2 — MFA handling

Invariant 3 / §10 declares MFA out of scope (single-attempt login fails → run continues unauthenticated). Is "fails silently and continues" the right operator UX?

- (a) Fail silently → continue unauthenticated (W5a recommendation; matches single-attempt rule)
- (b) Fail loudly → return ok:false on the entire run with `authFailureReason: 'mfa_required'`; operator must rerun without MFA on the target product
- (c) Configurable per run — operator picks the failure semantic at launch
- (d) Different — specify

### G-Q3 — Screenshot scrub

§6.2 documents that PNG screenshots are NOT scrubbed (only the accompanying DOM dump is). Operator review is the mitigation. Is that acceptable?

- (a) Accept as proposed (operator review; defer OCR scrub to future)
- (b) Reject screenshots from the artifact set entirely until OCR scrub lands (Phase 3 ships without screenshots)
- (c) Watermark PNGs with a "AUTHENTICATED CRAWL — DO NOT SHARE" overlay
- (d) Different — specify

### G-Q4 — Storage-state filesystem encryption

§2 T5 + Invariant 7 note that Vercel runtime filesystems are ephemeral but NOT individually encrypted. The `storageState.json` file is at rest on a shared host filesystem for the duration of the run (≤20 minutes per ACE wall-clock cap). Is this acceptable?

- (a) Accept (Vercel ephemerality is sufficient; <20-min window; auto-delete on run end is verified)
- (b) Require encryption-at-rest (Phase 3 dispatch adds a Node-side encrypt-before-write + decrypt-on-Playwright-load — adds ~50 LOC + key management)
- (c) Move storageState into memory-only (no file at all; Playwright supports in-memory storageState as an object) — eliminates §8.3 cleanup-verification path entirely
- (d) Different — specify

### G-Q5 — Same-eTLD+1 subdomains

§7.3 treats different subdomains as different origins by default (strict same-origin). Many real products have content on `www.example.com` AND `app.example.com` AND `docs.example.com`. Strict same-origin means the assessment misses cross-subdomain content.

- (a) Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 (W5a recommendation; safest)
- (b) Same-eTLD-1 by default; admin-role flag to tighten to strict same-origin (richer crawl by default; weaker isolation)
- (c) Per-product whitelist of allowed subdomain wildcards (specified at product registration)
- (d) Different — specify

### G-Q6 — Destructive-action denylist completeness

Invariant 5's denylist is conservative but heuristic. Real products have non-English UIs, non-standard CSS class names, custom data-attributes. False negatives (a destructive button slips past the denylist) are the failure mode.

- (a) Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-shot credentials) to bound blast radius
- (b) Extend denylist with i18n: localized "delete / cancel / sign out" in 5 most common languages (en, es, fr, de, ja)
- (c) Pure allowlist instead — Conductor clicks ONLY elements explicitly tagged `data-crawl-safe="true"`, refuses to click anything else (zero false negatives, near-total loss of click-everything coverage)
- (d) Different — specify

### G-Q7 — Audit-log retention for credentialed runs

§5 audit log entries for credentialed runs follow the standard GovernanceAuditLog hash-chain. CA-10-E retention is 365 days hot + 7 years cold. Is that the right retention for credentialed-run records?

- (a) Standard retention (365 + 7); same as other audit records
- (b) Shorter retention for credentialed-run records (30 days hot, no cold) — minimizes window where an old record could surface
- (c) Longer / segregated retention with restricted access (admin-only, separate Supabase table with stricter RLS)
- (d) Different — specify

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

*End of Authenticated Crawl Traversal Security Spec. PENDING W6 adversarial Panel ratification per HARD GATE 2 of the Master Phased Build (Panel ruling `30e5edb`).*
