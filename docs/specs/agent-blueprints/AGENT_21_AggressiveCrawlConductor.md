# Agent #21 — Aggressive Crawl Conductor — Build Blueprint

**Status:** PHASE 1 SHIPPED-GREEN at commit `83fb20a`; PHASE 3 IN PROGRESS (this blueprint authored 2026-05-16 as the spec-to-implementation translation layer per AUTH_TRAVERSAL_SECURITY_SPEC v3 §11 #12 — frozen baseline at commit `be594e3`, freeze notice at commit `b534d34`). Reflects Phase 1 code as it stands today; specifies what Phase 3 extends.
**Author:** W5a, 2026-05-16.
**Template:** mirrors `AGENT_03_SelfRenewal.md` structure (W5a blueprint pattern, 2026-05-16).
**Anchor canonical:** CANONICAL_REFERENCE.md §6 (Aggressive Crawling Contract), §15.1 row 21, §15.5 EXECUTOR_REGISTRY, §13 (Auth + Role Model + URL Whitelist), §14 (GovernanceAuditLog). Phase 2 contract: `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` v3 (frozen).
**Lineage:** Panel ruling `30e5edb` (7/8 STAGED phased build); CEO freeze decision 2026-05-16 (commit `b534d34`).

---

## 1. Agent identity — split charter (planned for Phase 3)

Following the CA-7 §15.5 EXECUTOR_REGISTRY pattern established by Agent #3 (commits `68a0c75` + `176d870`), Agent #21 is planned to be realised as **two sibling classes** sharing charter id `21` once Phase 3 lands. Phase 1 ships only the recommend_only primary; Phase 3 adds the Executor.

### 1.1 Recommend-only primary (`Agent21AggressiveCrawlConductor`) — SHIPPED Phase 1

| Field | Value |
|---|---|
| ID | `21` |
| Name | `Ops Runner Alpha — Aggressive Crawl Conductor` |
| Mode | `step-owner` (cross-step within step 1 research + step 8 monitor) |
| Step | **1 — `research`** (Phase 1 routes via `api/research-url.js`) |
| Embedding | `embedded` (id 21 is in `EMBEDDED_AGENTS` per `BaseAgent.js`) |
| Phase 1 authority exercised | `[RECOMMEND_ONLY]` |
| Charter authority on file | `[RECOMMEND_ONLY, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` (registry row 21; Phase 1 does not exercise the elevated pair) |
| File | `src/lib/agents/agents/Agent21AggressiveCrawlConductor.js` (commit `83fb20a`, 383 LOC) |
| OrchestratorHub `CROSS_STEP_OWNERS` mapping | `crawl: 21` |

The recommend-only primary is what `api/research-url.js` routes to — it calls `conductCrawl(url, opts)` directly outside the BaseAgent plan/act cycle so the response shape stays UI-compatible. The primary marks auth-gated pages with `authGated: true` but **DOES NOT attempt login** in Phase 1. Phase 3 elevates the auth path via the sibling Executor (§1.2 below).

### 1.2 Executor sibling (`Agent21AggressiveCrawlConductorExecutor`) — PHASE 3 PLAN

| Field | Value |
|---|---|
| `agentId` | `21` (same charter family) |
| EXECUTOR_REGISTRY key | `aggressive-crawl-conductor-executor` (planned) |
| Name | `Aggressive Crawl Conductor Executor` |
| Mode | `cross-step` (does NOT compete with step-1 step-owner registration) |
| Embedding | `embedded` (id 21 is in `EMBEDDED_AGENTS`) |
| Authority | `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` (planned — to mirror Agent #3 Executor pattern) |
| File | `src/lib/agents/agents/Agent21AggressiveCrawlConductorExecutor.js` (Phase 3 deliverable) |
| Required credentials | `BROWSERLESS_API_KEY`, `ANTHROPIC_API_KEY` |
| Marketplace tools | `playwright`, `browserless`, `anthropic-api` |

The Executor is the auth-traversal-capable surface. Invocation paths planned:

- `api/agent/21/execute.js` — sync HTTP endpoint (mirrors `api/agent/3/execute.js`)
- `src/pages/AutoRunner.jsx` step-1 toggle when an operator supplies `loginEmail` + `loginPassword` (the existing channels per `inputArtifact.raw.description.loginEmail/loginPassword`)
- `api/_lib/inngest.js` async Inngest path (Phase 3 dispatch may add `runAgent21CredentialedCrawlJob` mirroring `runAgent3RenewalJob`)

Authority preservation per BaseAgent contract: each class declares ONE authority array. The recommend-only primary's array stays `[RECOMMEND_ONLY]`; the Executor's is `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. Both classes pass `BaseAgent._validateCharter()` independently because both have `flowAiOnly: false` (matching `EMBEDDED_AGENTS` membership for id 21). The 25-ID partition validator is unaffected because executors live in `EXECUTOR_REGISTRY`, not `AGENT_REGISTRY`.

---

## 2. Perceive → Decide → Execute → Emit cycle

### 2.1 Recommend-only primary (Phase 1)

- **Perceive:** receives `{ kind: 'crawl.request', url, depth?, maxPages?, force? }` via `plan(ctx)`. Public `conductCrawl(url, opts)` is also exported for server-side direct callers (`api/research-url.js`).
- **Decide:** `plan()` returns `{ authorityNeeded: [], sideEffects: [], outcome: 'crawl_planned' }` — recommend_only with no auth elevation requested. Inputs validated (url must be non-empty string; kind must be 'crawl.request').
- **Execute:** `act()` calls `conductCrawl(url, opts)` → `aggressiveCrawl()` from `api/_lib/crawler.js` (W2 territory — not modified here) → multi-page CrawlReport at §6 caps (depth=8/cap12, pages=200/cap2000). Auth-gated pages marked but no login attempted. Single-page `crawl()` fallback when `aggressiveCrawl` returns zero rendered pages.
- **Emit:** `21.crawl.completed.v1` on MessageBus (pub/sub signal only; no HotStore / no ProductSSOT writes in Phase 1). Returns `{ outcome, sideEffects: [], report }` envelope.

### 2.2 Executor sibling (Phase 3 plan, per v3 spec)

- **Perceive:** receives `{ kind: 'credentialed.crawl.request', url, credentials: { email, password }, runId?, sourceHints? }`. Credentials validated at the boundary per spec §3.2 (email length 4-254 + loose email regex; password length 1-512; both present or both absent; no `\n`/`\r`/ANSI/null bytes — log-injection defense).
- **Decide:** routes by auth strategy:
  - `mode = 'unauthenticated'` (credentials absent) → delegates to recommend-only primary's `conductCrawl()` — no auth path, no elevation
  - `mode = 'credentialed'` (credentials present) → routes through the auth-traversal path with **memory-only storageState** per Invariant 2 MUST
- **Execute (credentialed path — the 10 invariants):**
  1. Mint fresh `runId` (UUID v4) if absent.
  2. Open Playwright `browserContext({ storageState: undefined })` — fresh state (Invariant 4 same-origin scoped).
  3. Single-attempt login per Invariant 3: `page.fill(email)` → `page.fill(password)` → `page.click(submit)`. MFA detection (heuristic regex per spec §85) → fail-loud return `{ ok:false, authFailureReason: 'mfa_required' }` and STOP (no continue-unauth).
  4. Capture `await context.storageState()` (in-memory return; **no `path` argument** per Invariant 2).
  5. Same-origin BFS frontier per `aggressiveCrawl()` (Invariant 4); cross-origin links recorded as `out_of_scope: true` and never navigated with storageState attached.
  6. Per-page click gate per Invariant 5: hybrid `data-crawl-safe="true"` allowlist + form-submit denylist + 9-language i18n destructive regex (en/es/fr/pt/de/zh-CN/ja/ko/ar).
  7. Evidence artefact scrubbing per Invariant 6: DOM dumps + network logs scrubbed via `scrubCredentials` extension. **NO screenshots** in Phase 3 (Invariant 6 v3 — Option B; deferred to Phase 4).
  8. At run end: `await context.close()` → `runStateMap.delete(runId)` → in-memory storageState GC-eligible.
- **Emit (GovernanceAuditLog per Rev-2.1 §14 + spec §5.1):** `authenticated_crawl_run` audit entry with `retentionClass: 'auth_short'` (90 days hot + 1 year cold per Invariant 9). Never logged: `loginEmail`, `loginPassword`, storageState contents, Authorization headers, Set-Cookie headers, any DOM state from a logged-in page.

---

## 3. MessageBus topics

**Consumes (recommend-only primary, Phase 1):**
- `1.crawl.request.v1` — research-step trigger (when wired by Phase 2-3 step orchestration)
- `10.ssot.updated.v1` — re-crawl trigger when ProductSSOT updates (Phase 3+)

**Consumes (Executor, Phase 3 plan):**
- `21.crawl.completed.v1` — primary's unauth completion is a viable input for the Executor's credentialed re-crawl path

**Produces:**

| Topic | Producer | Phase | Payload (key fields) |
|---|---|---|---|
| `21.crawl.completed.v1` | primary | Phase 1 SHIPPED | `{ url, ok, pagesCrawled, depth, pageCap, authGatedCount, fallbackUsed, durationMs }` |
| `21.issues.detected.v1` | Executor | Phase 3 | `{ runId, productScope, issues, severity, at }` |
| `21.gtm.readiness.v1` | Executor | Phase 3+ (deferred) | `{ productScope, runId, readinessScore, blockers }` |
| `21.credentialed.crawl.started.v1` | Executor | Phase 3 | `{ runId, targetOrigin, at }` (NEVER includes credentials) |
| `21.credentialed.crawl.completed.v1` | Executor | Phase 3 | `{ runId, productScope, loginSucceeded, pagesCrawled, authGatedPagesEncountered, durationMs }` |
| `21.credentialed.crawl.failed.v1` | Executor on `authFailed: true` | Phase 3 | `{ runId, authFailureReason, at }` |

Topic schemas registered in `src/lib/agents/MessageSchema.js`.

---

## 4. Orchestra dispatch usage (per §15.4)

Phase 1 does NOT use Orchestra — `aggressiveCrawl()` is a direct module import from `api/_lib/crawler.js` (W2 territory). Phase 3's Executor remains in the same pattern: Playwright is invoked via `browserless` capability (config via `BROWSERLESS_API_KEY`), not via an Orchestra dispatch.

```js
// Phase 3 Executor — direct Playwright/Browserless invocation
const context = await browser.newContext({ storageState: undefined });
const page = await context.newPage();
await page.goto(url);
// ... login per Invariant 3 ...
const storageState = await context.storageState();  // in-memory; no path arg per Invariant 2
```

The Executor does NOT add an Orchestra capability layer over Playwright in Phase 3; that abstraction is deferred to a future dispatch if the auth-traversal mechanic needs to be portable across multiple browser providers.

---

## 5. ToolMenu (per CA-11-B.2)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Browserless | `browserless` | low | `crawl`, `authenticated-crawl` (Phase 3) |
| 2 | Playwright | `playwright` | low | `authenticated-crawl` (Phase 3 — via Browserless `playwright-endpoint`) |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze` (research brief from CrawlReport — already wired) |

Phase 1 uses tools 1 + 3 only. Phase 3 adds the Playwright auth path (tool 2 — Browserless's `playwright-endpoint` mode rather than a separate Playwright runtime).

---

## 6. Implementation file structure

### Phase 1 SHIPPED at commit `83fb20a`:

```
src/lib/agents/agents/Agent21AggressiveCrawlConductor.js  # 383 LOC — recommend_only primary
src/lib/agents/_registry.ts (row 21)                      # canonical registry entry
src/lib/agents/orchestrator/OrchestratorHub.ts            # CROSS_STEP_OWNERS = { crawl: 21 }
api/research-url.js                                       # routes through Agent21 Conductor
api/_lib/crawler.js                                       # aggressiveCrawl() — W2 territory, not modified
tests/agents/agent-21-aggressive-crawl-conductor.test.js  # Phase 1 charter + behaviour tests
tests/api/urlAdapter.test.js                              # asserts api/research-url.js routes correctly
```

### Phase 3 PLANNED additions (this dispatch + follow-up chunks):

```
docs/specs/agent-blueprints/AGENT_21_AggressiveCrawlConductor.md   # this file — CHUNK 1
src/lib/agents/agents/Agent21AggressiveCrawlConductorExecutor.js   # CHUNK 2 — credentialed crawl Executor
src/lib/agents/_registry.ts (EXECUTOR_REGISTRY section)            # CHUNK 2 — 'aggressive-crawl-conductor-executor' entry
src/lib/renewal/inputArtifact.js (scrubCredentials extension)      # CHUNK 3 — DOM/network-log scrubbing
src/lib/agents/auth/sameOriginGate.js                              # CHUNK 2 — Invariant 4 same-origin enforcement helper
src/lib/agents/auth/mfaDetect.js                                   # CHUNK 2 — Invariant 3 MFA challenge heuristic
src/lib/agents/auth/destructiveDenylist.js                         # CHUNK 2 — Invariant 5 9-language hybrid gate
api/agent/21/execute.js                                            # CHUNK 4 — sync credentialed-crawl endpoint
src/lib/agents/auth/auditEntry.js                                  # CHUNK 4 — §5.1 entry shape + retention class wire-in
tests/agents/agent-21-auth-traversal.test.js                       # CHUNK 5 — all 10 invariants
tests/agents/agent-21-no-screenshot-regression.test.js             # CHUNK 5 — Invariant 6 v3 regression guard
tests/agents/agent-21-i18n-9-language.test.js                      # CHUNK 5 — Invariant 5 9-family coverage
```

W2-locked files NOT modified by any chunk: `api/_lib/crawler.js` (aggressiveCrawl + ACE_DEFAULTS + truncation cap), `src/lib/operationsEngine.js` (computeMonitorClearance, formatMonitorClearanceFooter, per-layer scoring prompt), `tests/runner/monitor-clearance.test.js`. The Phase 3 implementation extends Agent #21 around `aggressiveCrawl()` without modifying its internals.

---

## 7. v3 spec contract surface (the 10 invariants → file mapping)

Each invariant from `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` v3 maps to a concrete Phase 3 file or constraint:

| Invariant | Concrete enforcement |
|---|---|
| 1. Credentials never logged | `scrubCredentials` extension (CHUNK 3) applied at every persist / log / external-send boundary in the Executor |
| 2. storageState memory-only (MUST) | Executor never passes a `path` arg to `context.storageState()`; runtime test asserts the mock call is path-less |
| 3. Single-attempt login + MFA fail-loud | `mfaDetect.js` (CHUNK 2) + Executor's auth-routing returns `{ ok:false, authFailureReason: 'mfa_required' }` on MFA detection |
| 4. Same-origin restriction | `sameOriginGate.js` (CHUNK 2) — refuses cross-origin navigation; storageState never sent off-origin |
| 5. Non-destructive action gate (9-language hybrid) | `destructiveDenylist.js` (CHUNK 2) — `data-crawl-safe="true"` allowlist + form-submit denylist + 9-language i18n regex |
| 6. Evidence artefact scrubbing (DOM/network only — no screenshots) | `scrubCredentials` extension (CHUNK 3); Executor never calls `page.screenshot()` or Browserless `/screenshot`; regression test in CHUNK 5 |
| 7. One-shot credential lifetime | Executor's `runStateMap.delete(runId)` at run end; no persistence mechanism added |
| 8. Operator-supplied credentials are session-only | Existing `inputArtifact.raw.description.loginEmail/loginPassword` contract unchanged; Executor doesn't introduce new credential surfaces |
| 9. Audit-log surface | `auditEntry.js` (CHUNK 4) — §5.1 shape + `retentionClass: 'auth_short'` tag |
| 10. Crash / abort safety | Memory-only Invariant 2 means no orphaned fs state; Executor's `finally` block closes context + dereferences run-state map |

### v3 carry-forward positions (codified, will be re-ratified post-implementation evidence):

- **Q4 storageState memory-only MUST** — Invariant 2 + spec §4.1 (no encrypted-fs fallback codified)
- **Q6 9-language i18n floor** — Invariant 5 + 9-family regex (`destructiveDenylist.js`)
- **Q7 90-day hot + 1-year cold retention** — Invariant 9 + `retentionClass: 'auth_short'` (`auditEntry.js`)

### 4 supermajority-ratified positions (immutable for Phase 3):

- **G-Q1 cross-origin REFUSE** — Invariant 4 + `sameOriginGate.js`
- **G-Q5 strict same-origin subdomains** — spec §7.3 + URL Whitelist boundary check
- **G-Q2-v2 MFA fail-loud** — Invariant 3 + `mfaDetect.js`
- **G-Q3-v3 no screenshots in Phase 3** — Invariant 6 v3 + CHUNK 5 regression test

---

## 8. Capability boundary (the HONEST scope)

### What Agent #21 + auth-traversal CAN do per Phase 3 (when CHUNKS 2-5 land):

- **Multi-page authenticated crawl** of a target product when the operator supplies `loginEmail` + `loginPassword`, against the v3 spec invariants
- **Memory-only `storageState`** — no filesystem credential context, no orphan-cleanup needed
- **Single-attempt login** with MFA fail-loud: an MFA-protected product produces an honest `{ ok:false, authFailureReason: 'mfa_required' }` rather than a silent downgrade to unauthenticated coverage
- **Same-origin BFS frontier** — authenticated session cookies never sent to a third-party origin even if a target page links off-site
- **Hybrid 9-language destructive-action gate** — explicit `data-crawl-safe="true"` allowlist + i18n denylist (en/es/fr/pt/de/zh-CN/ja/ko/ar) + form-submit denylist for `<form method="post|put|patch|delete">`
- **DOM + network log evidence artefacts**, scrubbed via `scrubCredentials` extension
- **Audit-trail entry** with `retentionClass: 'auth_short'` (90 hot + 1yr cold) — sensitive metadata minimised vs. the CA-10-E standard retention

### What Agent #21 CANNOT do in Phase 3 (explicit non-goals; deferred to later phases):

- **Capture screenshots during authenticated runs.** Phase 3 ships with NO screenshot capture, NO PNG retention, NO scrub pipeline. The §6a 9-stage scrub pipeline that existed in v2 was removed in v3 per CEO Option B. **Screenshot capture is deferred to Phase 4** — a dedicated dispatch with its own scrub design, test fixtures, and Panel ratification gate. The Phase 3 acceptance test surface includes an explicit regression test asserting that `page.screenshot()` and Browserless `/screenshot` are never called during an authenticated run.
- **Traverse MFA / 2FA challenges.** Detection is in scope (Invariant 3); active traversal (accepting an operator-supplied TOTP code, magic-link handoff) is NOT. Detection → fail-loud → stop.
- **Solve CAPTCHAs.** CAPTCHA detection → `authFailureReason: 'captcha_required'` → fail-loud → stop. No bypass attempt.
- **Authenticate via OAuth / SSO / SAML.** Phase 3 implements form-based username+password login only. Provider-specific consent flows are out of scope; a future dispatch with auth-provider charter can add them.
- **Reuse sessions across runs.** One-shot credentials per Invariant 8; no "save credentials for next time", no "remember me", no Doppler-stored arbitrary-third-party credentials. Each authenticated run is a clean slate.
- **POST / form-submit while authenticated.** Phase 3 authenticated crawl is READ-ONLY per Invariant 5 (clicks on links + safe buttons per hybrid gate). Authenticated form-submit assessment is a future capability behind a separate dispatch + Panel ratification + per-product opt-in.
- **Operate cross-origin with session cookies attached.** Invariant 4 refuses cross-origin navigation entirely; cross-origin links are recorded as `out_of_scope: true` without ever following them.
- **Cross-subdomain crawl by default.** Per Invariant 5 in spec §7.3: `app.example.com` and `www.example.com` are treated as DIFFERENT origins by default. An operator can opt in to same-eTLD+1 crawl via an explicit admin-role flag.
- **Memory-pressure fallback to disk.** Per Invariant 2 v3 (Q4 carry-forward), there is NO encrypted-fs fallback codified. Under memory pressure the conformant behaviour is to fail the run loudly; a Phase 3 implementation that silently spills storageState to disk would be non-conformant with the spec.
- **Language-floor expansion via spec amendment.** Per the v4 path that was withdrawn at the freeze: post-Phase-3 implementation evidence will inform whether a denylist-registry expansion process or per-product opt-in is the right shape. Phase 3 ships with the 9-language floor; expansion mechanism is Phase 3+ evaluation work.
- **CV-model-based screenshot content classification.** Out of scope until Phase 4 lands screenshot capture.
- **Override the W2 scoring engine.** The Conductor produces a CrawlReport; W2's `computeMonitorClearance` + `formatMonitorClearanceFooter` + per-layer scoring prompt consume it. Phase 3 does NOT touch any W2-locked file.

---

## 9. Test surface

### Phase 1 SHIPPED tests (commit `83fb20a`):

- `tests/agents/agent-21-aggressive-crawl-conductor.test.js` — charter integrity, recommend_only conformance, `conductCrawl` fallback path, auth-gated marking heuristic, MessageBus publish on `21.crawl.completed.v1`
- `tests/api/urlAdapter.test.js` — `api/research-url.js` routes through the Conductor; CrawlReport normalisation to the legacy `page.*` shape; sidecar `crawlSummary` fields

### Phase 3 PLANNED tests (CHUNK 5):

- `tests/agents/agent-21-auth-traversal.test.js` — all 10 invariants → ≥1 named test each:
  - Inv 1: canary-credential negative test (`canary-EMAIL-FLOWAI-CANARY-${runId}@test.invalid` greps every persistent artefact)
  - Inv 2: assert `context.storageState({ path })` NEVER called with a `path` arg + filesystem watcher asserts no `tmp/playwright-state-*` ever exists
  - Inv 3: MFA challenge mock → `ok:false, authFailureReason: 'mfa_required'` + zero subsequent page fetches
  - Inv 4: cross-origin link in BFS frontier → no navigation with storageState attached
  - Inv 5: 9-language denylist test (one per family) + allowlist override + form-submit gate
  - Inv 6: DOM dump scrubbing + screenshot-API-NEVER-called regression
  - Inv 7: post-run static grep on src/ + api/ trees for canary credential pattern
  - Inv 8: `inputArtifact.raw.description.loginEmail/loginPassword` is the only credential surface; no new fields introduced
  - Inv 9: audit-log entry shape conformance + `retentionClass: 'auth_short'` present
  - Inv 10: SIGTERM mid-run → `browserContext.close()` called in `finally` + no orphaned fs state
- `tests/agents/agent-21-no-screenshot-regression.test.js` — Invariant 6 v3 guard: regression test asserts `page.screenshot()` + Browserless `/screenshot` endpoint never called in Phase 3 authenticated path
- `tests/agents/agent-21-i18n-9-language.test.js` — one named test per language family (en/es/fr/pt/de/zh-CN/ja/ko/ar); partial coverage is non-conformant per spec §11 #6
- `tests/api/agent-21-execute-endpoint.test.js` — `api/agent/21/execute.js` validates credentials at the boundary; rejects log-injection attempts; rejects email-only / password-only submissions

---

## 10. Open extensions (NOT in current scope; named for traceability)

- **Phase 4: Screenshot capture + scrub pipeline.** Per CEO Option B (commit `b534d34` freeze notice), screenshot capture is deferred to a dedicated Phase 4 dispatch. The v2 9-stage scrub pipeline design exists in commit history (`b782e2f`) and can be revived against real test fixtures in Phase 4.
- **Phase 3+: Authenticated form-submit assessment.** Currently out of scope per Invariant 5 (read-only auth). A future dispatch can add per-product opt-in for form-submit traversal under admin-role + explicit dev/staging environment gate.
- **Phase 3+: OAuth / SSO / SAML login flows.** Currently out of scope; form-based username+password only.
- **Phase 3+: Re-Panel on Q4/Q6/Q7 with implementation evidence.** Per the freeze notice: the three v3 sub-quorum positions (memory-only MUST, 9-lang floor, 90+1yr retention) will be re-ratified post-Phase-3 production evidence. The Phase 3 audit-log + canary-credential data collected during early use is the evidence base.
- **Cross-step Monitor integration.** §8 monitor consumes `21.*` topics — wiring is Phase 3+ when the GTM Readiness Report emission lands.
- **`21.gtm.readiness.v1` emission.** Currently in the registry `produces` list but not yet emitted by Phase 1 code; Phase 3+ when GTM readiness scoring is wired.
- **Inngest async credentialed-crawl job (`runAgent21CredentialedCrawlJob`).** Sync HTTP path is Phase 3; async Inngest path mirrors Agent #3 Executor's Path Y and may be a separate Phase 3 chunk if dispatch chunking calls for it.

---

*End of Agent #21 Aggressive Crawl Conductor blueprint. Reflects Phase 1 SHIPPED state (commit `83fb20a`) + Phase 3 contract per AUTH_TRAVERSAL_SECURITY_SPEC v3 (frozen baseline at `be594e3`, freeze notice at `b534d34`). Phase 3 implementation chunks 2-5 will reference this blueprint as the authoritative spec-to-code translation layer.*
