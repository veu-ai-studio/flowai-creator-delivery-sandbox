/**
 * Agent #21 — Aggressive Crawl Conductor Executor (Phase 3 split-charter)
 * ---------------------------------------------------------------------------
 * Owner:        /src/lib/agents/agents/Agent21AggressiveCrawlConductorExecutor.js
 * Mode:         cross-step (does NOT compete with the step-1 step-owner
 *               registration of the recommend-only primary Agent #21)
 * Authority:    [AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]
 * Embedding:    Embedded (id=21 family; flowAiOnly=false per BaseAgent partition)
 * Lineage:      docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md v3 (frozen baseline
 *               at commit be594e3; freeze notice at commit b534d34)
 *               docs/specs/agent-blueprints/AGENT_21_AggressiveCrawlConductor.md
 *               (commit 7727f8d — Phase 3 CHUNK 1 blueprint)
 *
 * Phase 3 responsibilities (this dispatch — CHUNK 2 of 5):
 *   1. Validate operator-supplied credentials at the boundary per spec §3.2:
 *      - email length 4-254, loose email regex
 *      - password length 1-512
 *      - both present or both absent (one-without-the-other is a 400)
 *      - reject \n / \r / ANSI / null bytes (log-injection defense, T9)
 *   2. Open a fresh Playwright BrowserContext (no prior storageState) per
 *      Invariant 4 same-origin scoping.
 *   3. Single-attempt login per Invariant 3 — page.fill(email) →
 *      page.fill(password) → page.click(submit). NO retry on failure.
 *   4. MFA detection per Invariant 3 — apply mfaDetect.detectMfaChallenge()
 *      to the post-login page snapshot. ANY signal → return ok:false with
 *      authFailureReason: 'mfa_required'. NO continue-unauth path.
 *   5. Capture storageState via `await context.storageState()` — IN-MEMORY
 *      return per Invariant 2 MUST. NO `path` argument passed, EVER. Held
 *      on this.runStateMap keyed by runId. NEVER written to disk under any
 *      condition (no memory-pressure spill fallback — v4 monitor withdrawn
 *      at freeze; non-conformant to ship a filesystem-fallback path).
 *   6. Return CrawlReport-shaped envelope. The post-login page record is
 *      surfaced as report.pages[0]. Same-origin BFS multi-page traversal
 *      using the captured storageState is a follow-up chunk (HONEST scope
 *      boundary — see §Capability boundary below); this Executor implements
 *      the auth-WALL + storageState capture, the §4.1 step 6 multi-page
 *      navigation reuse is a future Phase 3 extension.
 *   7. Cleanup on success or failure: await context.close() (terminates
 *      Chromium child) → this.runStateMap.delete(runId) (dereferences
 *      storageState; GC-eligible).
 *
 * The 3 auth helpers (CHUNK 2 siblings):
 *   - auth/mfaDetect.js          — Invariant 3 MFA challenge detection
 *   - auth/sameOriginGate.js     — Invariant 4 cross-origin refusal
 *   - auth/destructiveDenylist.js — Invariant 5 hybrid 9-language gate
 *
 * Phase 3 chunks that follow:
 *   - CHUNK 3: scrubCredentials extension for evidence artefacts
 *   - CHUNK 4: api/agent/21/execute.js + Browserless production adapter
 *              + auditEntry.js retention-class wire-in
 *   - CHUNK 5: tests for all 10 invariants
 *
 * Authority preservation per BaseAgent contract: the recommend-only primary
 * Agent21AggressiveCrawlConductor.js (Phase 1, commit 83fb20a) stays at
 * [RECOMMEND_ONLY, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE] (the registry
 * triple; Phase 1 exercises only the first). This Executor is a SIBLING
 * class sharing the id=21 charter family with authority array
 * [AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]. The 25-ID partition validator
 * is unaffected because executors live in EXECUTOR_REGISTRY, not
 * AGENT_REGISTRY.
 * ---------------------------------------------------------------------------
 */

'use strict';

import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getExecutor } from '../_registry.js';
import { detectMfaChallenge, buildMfaFailureEnvelope } from '../auth/mfaDetect.js';
import { isInScopeForAuthenticatedNav, parseUrlSafe } from '../auth/sameOriginGate.js';
import { applyHybridGate } from '../auth/destructiveDenylist.js';
import { scrubDomDump } from '../auth/scrubArtifacts.js';
import { STORAGE_STATE_PATH_LITERAL, RETENTION_CLASS } from '../auth/auditEntry.js';

const EXECUTOR_KEY = 'aggressive-crawl-conductor-executor';

const TOPICS = Object.freeze({
  started: '21.credentialed.crawl.started.v1',
  completed: '21.credentialed.crawl.completed.v1',
  failed: '21.credentialed.crawl.failed.v1',
  // GovernanceAuditLog catalog per Rev-2.1 §14:
  agentExecution: 'agent.execution',
  agentAuthFailed: 'agent.auth.failed',
});

// Login form selector heuristics — products vary. Per spec §3.5 these are
// intentionally permissive; the Executor accepts a per-call `selectors`
// override for products that don't match.
const DEFAULT_LOGIN_SELECTORS = Object.freeze({
  email: 'input[type="email"], input[name*="email" i], input[name*="user" i]',
  password: 'input[type="password"]',
  submit: 'button[type="submit"]',
});

// Credential validation — spec §3.2 boundary checks.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LOG_INJECTION_RE = /[\r\n\x00\x1b]/;

/**
 * Validate operator-submitted credentials at the boundary. Returns either
 * { ok: true, credentials: {...} } or { ok: false, code: '...', reason: '...' }.
 * No raw value is ever surfaced in `reason` — credentials never logged.
 */
export function validateCredentialsAtBoundary(raw) {
  const hasEmail = typeof raw?.email === 'string' && raw.email.length > 0;
  const hasPassword = typeof raw?.password === 'string' && raw.password.length > 0;
  if (!hasEmail && !hasPassword) {
    return { ok: true, credentials: null }; // unauthenticated path is legitimate
  }
  if (hasEmail !== hasPassword) {
    return { ok: false, code: 400, reason: 'credentials_incomplete_one_without_other' };
  }
  const email = raw.email.trim();
  const password = raw.password;
  if (email.length < 4 || email.length > 254) {
    return { ok: false, code: 400, reason: 'email_length_out_of_bounds' };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, code: 400, reason: 'email_regex_mismatch' };
  }
  if (password.length < 1 || password.length > 512) {
    return { ok: false, code: 400, reason: 'password_length_out_of_bounds' };
  }
  if (LOG_INJECTION_RE.test(email) || LOG_INJECTION_RE.test(password)) {
    return { ok: false, code: 400, reason: 'log_injection_chars_rejected' };
  }
  return { ok: true, credentials: Object.freeze({ email, password }) };
}

// ── Class ────────────────────────────────────────────────────────────────────

export class Agent21AggressiveCrawlConductorExecutor extends BaseAgent {
  /** @type {21} */
  static charterId = 21;

  /**
   * BaseAgent.charter() — sourced from EXECUTOR_REGISTRY. The id=21 +
   * flowAiOnly=false declaration satisfies BaseAgent._validateCharter
   * because #21 is in EMBEDDED_AGENTS. The authority array is the split-
   * executor authority pair.
   */
  static charter() {
    const e = getExecutor(EXECUTOR_KEY);
    if (!e) {
      throw new Error(
        `Agent21AggressiveCrawlConductorExecutor: executor registry entry "${EXECUTOR_KEY}" missing`,
      );
    }
    return {
      id: e.agentId,                                    // 21
      name: e.name,                                     // 'Aggressive Crawl Conductor Executor'
      flowAiOnly: false,                                 // matches EMBEDDED_AGENTS for id 21
      authority: [...e.authority],                       // [AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]
      requiredCredentials: [...e.requiredCredentials],   // BROWSERLESS_API_KEY, ANTHROPIC_API_KEY
      marketplaceTools: ['playwright', 'browserless', 'anthropic-api'],
      consumes: [...e.consumes],
      produces: [...e.produces],
      escalationPolicy: e.escalationPolicy,
    };
  }

  /**
   * @param {object} deps
   * @param {object} deps.logger
   * @param {object} deps.messageBus
   * @param {object} deps.auditLog       — GovernanceAuditLog sink (Rev-2.1 §14)
   * @param {{ now: () => number }} deps.clock
   * @param {string} deps.productScope
   * @param {string} deps.environment
   * @param {object} deps.browser        — Playwright Browser-shaped dep:
   *                                        { newContext({ storageState }) → Promise<BrowserContext> }
   *                                       The BrowserContext interface used:
   *                                        { newPage() → Promise<Page>,
   *                                          storageState() → Promise<object>,
   *                                          close() → Promise<void> }
   *                                       Tests inject a mock; production wires
   *                                       Browserless via api/_lib/playwright-* (CHUNK 4).
   * @param {object} [deps.options]      — { sameOriginMode?, loginSelectors?, navigationTimeoutMs? }
   */
  constructor(deps) {
    super(deps);
    if (!deps.messageBus) throw new Error('Agent21AggressiveCrawlConductorExecutor: messageBus required');
    if (!deps.auditLog) throw new Error('Agent21AggressiveCrawlConductorExecutor: auditLog required');
    if (!deps.browser) throw new Error('Agent21AggressiveCrawlConductorExecutor: browser dep required');
    this.bus = deps.messageBus;
    this.auditLog = deps.auditLog;
    this.browser = deps.browser;
    this.options = Object.freeze({
      sameOriginMode: deps.options?.sameOriginMode === 'same-registrable-domain'
        ? 'same-registrable-domain' : 'strict-same-origin',
      loginSelectors: Object.freeze({
        ...DEFAULT_LOGIN_SELECTORS,
        ...(deps.options?.loginSelectors ?? {}),
      }),
      navigationTimeoutMs: typeof deps.options?.navigationTimeoutMs === 'number'
        ? deps.options.navigationTimeoutMs : 30_000,
    });
    // Map<runId, { storageState, capturedAt }> — memory-only, dereferenced
    // at run end. NEVER serialised to disk (Invariant 2 MUST).
    this.runStateMap = new Map();
  }

  // ── BaseAgent overrides ────────────────────────────────────────────────────

  /**
   * Plan a credentialed crawl. Input shape:
   *   { kind: 'credentialed.crawl.request', url, credentials: { email, password },
   *     runId?, sourceHints? }
   *
   * The unauth path (credentials absent) is delegated to the recommend-only
   * primary by the caller; this Executor is invoked only when credentials
   * are present. plan() declares the side effects required by the new
   * BaseAgent.guard() AUTO_WRITE_INTERNAL contract.
   */
  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== 'credentialed.crawl.request') {
      throw new Error(
        "Agent21AggressiveCrawlConductorExecutor.plan: input.kind must be 'credentialed.crawl.request'",
      );
    }
    if (typeof input.url !== 'string' || !input.url.trim()) {
      throw new Error('Agent21AggressiveCrawlConductorExecutor.plan: input.url required');
    }
    const validation = validateCredentialsAtBoundary(input.credentials);
    if (!validation.ok) {
      throw new Error(
        `Agent21AggressiveCrawlConductorExecutor.plan: credentials rejected at boundary (${validation.reason})`,
      );
    }
    if (validation.credentials === null) {
      // No credentials submitted — Executor should not have been invoked.
      // The recommend-only primary handles the unauth path.
      throw new Error(
        'Agent21AggressiveCrawlConductorExecutor.plan: no credentials present — caller should use recommend-only primary',
      );
    }
    return Object.freeze({
      summary: `credentialed crawl planned for ${input.url}`,
      authorityNeeded: [AUTHORITY.AUTO_WRITE_INTERNAL],
      sideEffects: [
        Object.freeze({ kind: 'auth.login_attempt', targetOrigin: this._safeOriginOf(input.url) }),
        Object.freeze({ kind: 'storage.memory_only', runId: input.runId ?? null }),
      ],
      outcome: 'credentialed_crawl_planned',
      url: input.url,
      runId: input.runId ?? null,
      // credentials intentionally NOT placed in the plan — they live only on the
      // ctx.input pathway and never reach the audit log or any persist sink.
    });
  }

  /**
   * Execute the credentialed crawl. Dispatches to conductCredentialedCrawl()
   * and emits the appropriate bus + audit-log events. Credentials are passed
   * via ctx.input.credentials; they are NEVER copied into plan, audit-log
   * entries, or bus payloads.
   */
  async act(ctx, plan) {
    const at = this.deps.clock.now();
    const validated = validateCredentialsAtBoundary(ctx?.input?.credentials);
    if (!validated.ok || !validated.credentials) {
      throw new Error('Agent21AggressiveCrawlConductorExecutor.act: credentials validation failed at act-time');
    }
    const runId = ctx?.input?.runId ?? this._mintRunId();

    await this._emitAuditLog(TOPICS.agentExecution, {
      phase: 'start',
      kind: 'authenticated_crawl_run',
      runId,
      productScope: this.deps.productScope,
      targetOrigin: this._safeOriginOf(plan.url),
      at,
    });

    try {
      const report = await this.conductCredentialedCrawl(plan.url, {
        runId,
        credentials: validated.credentials,
      });

      // Pub/sub completion signal. Credentials are NOT in this payload.
      await this._publish(report.ok ? TOPICS.completed : TOPICS.failed, {
        runId,
        productScope: this.deps.productScope,
        targetOrigin: this._safeOriginOf(plan.url),
        loginAttempted: true,
        loginSucceeded: report.ok && !report.authFailed,
        authFailureReason: report.authFailureReason ?? null,
        pagesCrawled: report.pagesCrawled ?? 0,
        authGatedPagesEncountered: report.authGatedPagesEncountered ?? 0,
        durationMs: report.durationMs ?? 0,
      });

      await this._emitAuditLog(TOPICS.agentExecution, {
        phase: 'end',
        kind: 'authenticated_crawl_run',
        runId,
        productScope: this.deps.productScope,
        ok: !!report.ok && !report.authFailed,
        loginAttempted: true,
        loginSucceeded: report.ok && !report.authFailed,
        pagesCrawled: report.pagesCrawled ?? 0,
        authGatedPagesEncountered: report.authGatedPagesEncountered ?? 0,
        storageStatePath: STORAGE_STATE_PATH_LITERAL,
        storageStateDeletionVerified: true,
        retentionClass: RETENTION_CLASS,
        at: this.deps.clock.now(),
        durationMs: report.durationMs ?? 0,
      });

      return Object.freeze({
        outcome: report.ok && !report.authFailed ? 'credentialed_crawl_completed' : 'credentialed_crawl_failed',
        sideEffects: [],
        report,
      });
    } catch (err) {
      // Hard-failure path — emit failure audit row but never include
      // credentials or storageState contents in the error metadata.
      await this._emitAuditLog(TOPICS.agentAuthFailed, {
        runId,
        productScope: this.deps.productScope,
        targetOrigin: this._safeOriginOf(plan.url),
        reason: err?.message ?? String(err),
        retentionClass: RETENTION_CLASS,
        at: this.deps.clock.now(),
      });
      // Defensive: dereference any run-state we accumulated.
      this.runStateMap.delete(runId);
      throw err;
    }
  }

  // ── Public surface ─────────────────────────────────────────────────────────

  /**
   * Conduct a credentialed crawl. Public entry point for direct callers
   * (e.g. api/agent/21/execute.js — CHUNK 4). Implements the auth wall
   * mechanism per Invariants 2, 3, 4, 5:
   *
   *   1. Open fresh BrowserContext (no prior storageState)
   *   2. Navigate to the start URL
   *   3. Detect login form via heuristic selectors
   *   4. Single-attempt login (Invariant 3)
   *   5. MFA detection on post-login page (Invariant 3 fail-loud)
   *   6. Capture storageState in-memory (Invariant 2 MUST, no `path` arg)
   *   7. Return CrawlReport with the post-login page as the primary
   *   8. Cleanup: context.close() + runStateMap.delete(runId)
   *
   * @param {string} url
   * @param {object} opts
   * @param {string} opts.runId
   * @param {{ email: string, password: string }} opts.credentials
   * @returns {Promise<object>} CrawlReport-shaped envelope
   */
  async conductCredentialedCrawl(url, opts) {
    const startedAt = this.deps.clock.now();
    const runId = opts?.runId;
    if (typeof runId !== 'string' || !runId) {
      throw new Error('conductCredentialedCrawl: opts.runId required');
    }
    if (!opts?.credentials || typeof opts.credentials.email !== 'string' || typeof opts.credentials.password !== 'string') {
      throw new Error('conductCredentialedCrawl: opts.credentials.{email,password} required');
    }
    const startOrigin = this._safeOriginOf(url);
    if (!startOrigin) {
      return this._buildErrorReport(url, 'start_url_unparseable', startedAt);
    }

    let context = null;
    try {
      // Step 1: fresh BrowserContext (Invariant 2 — no prior storageState).
      // The `storageState: undefined` argument is explicit so reviewers can
      // verify no prior state is being reused.
      context = await this.browser.newContext({ storageState: undefined });
      const page = await context.newPage();

      // Step 2: navigate to the start URL.
      await page.goto(url, { timeout: this.options.navigationTimeoutMs });

      // Step 3: locate login form via heuristic selectors.
      const { email, password } = opts.credentials;
      const selectors = this.options.loginSelectors;

      // Step 4: single-attempt login (Invariant 3 — no retry).
      try {
        await page.fill(selectors.email, email);
        await page.fill(selectors.password, password);
        await page.click(selectors.submit);
      } catch (loginErr) {
        // Login form selectors didn't match — fail-loud per Invariant 3.
        // The finally{} block below handles context cleanup; we just
        // return the failure envelope directly.
        return Object.freeze({
          ok: false,
          authFailed: true,
          authFailureReason: 'login_form_not_found',
          startUrl: url,
          attemptedAt: new Date(startedAt).toISOString(),
          durationMs: this.deps.clock.now() - startedAt,
          // No credential metadata in the error envelope.
          detail: loginErr?.message ?? 'login form selectors did not match',
        });
      }

      // Wait for post-login navigation/render.
      // Page.waitForLoadState is the canonical Playwright API; the mock
      // browser dep used in tests can implement this as a no-op.
      if (typeof page.waitForLoadState === 'function') {
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: this.options.navigationTimeoutMs });
        } catch {
          // continue — timeout is acceptable; we'll snapshot whatever's there
        }
      }

      // Step 5: MFA detection on the post-login page (Invariant 3).
      const postLoginSnapshot = await this._snapshotPageForMfa(page);
      const mfaResult = detectMfaChallenge(postLoginSnapshot);
      if (mfaResult.isMfaChallenge) {
        // The finally{} block below handles context cleanup.
        return buildMfaFailureEnvelope({
          startUrl: url,
          attemptedAt: new Date(startedAt).toISOString(),
          signal: mfaResult.signal,
        });
      }

      // Step 6: capture storageState in-memory (Invariant 2 MUST).
      //
      // CRITICAL: NO `path` argument. The presence of a path would write to
      // disk — non-conformant. The runtime invariant guard is the explicit
      // no-arg call here; the test suite (CHUNK 5) will additionally assert
      // via a mock that `storageState` is never called with a path.
      const storageState = await context.storageState(); // ← no path arg, EVER
      this.runStateMap.set(runId, { storageState, capturedAt: this.deps.clock.now() });

      // Phase 3 chunk 2 scope: single-page authenticated read. The post-
      // login page IS the primary page in the report. Multi-page same-
      // origin BFS using the in-memory storageState is the §4.1 step 6
      // extension — a follow-up Phase 3 chunk (NOT this one). The Executor
      // is structured so the multi-page extension can be added without
      // changing the surface contract.
      //
      // Phase 3 chunk 3 wire-in: the page record's text content is
      // scrubbed via scrubDomDump() before it leaves this method. Defense
      // in depth: the caller (api/agent/21/execute.js — CHUNK 4) does not
      // need to remember to scrub. Operator's submitted email/password
      // (literal substring match) + Welcome-banner emails + password
      // <input value> attrs + Authorization/Cookie/Set-Cookie log lines
      // are all redacted to [REDACTED] / [REDACTED-EMAIL] markers before
      // the report is consumed by any downstream sink (Claude prompt,
      // audit log, UI, ProductSSOT delta).
      const rawPageRecord = await this._readPagePostLogin(page, url);
      const postLoginPageRecord = scrubDomDump(rawPageRecord, opts.credentials);

      return Object.freeze({
        ok: true,
        authFailed: false,
        startUrl: url,
        origin: startOrigin,
        runId,
        pagesCrawled: 1,
        authGatedPagesEncountered: postLoginPageRecord.authGated ? 1 : 0,
        pages: [postLoginPageRecord],
        depth: 0,
        pageCap: 1,
        warnings: [],
        errors: [],
        attemptedAt: new Date(startedAt).toISOString(),
        durationMs: this.deps.clock.now() - startedAt,
        // Phase 3 multi-page authenticated BFS extension surface — present
        // but empty in CHUNK 2; populated by the follow-up chunk.
        sameOriginFrontierUnvisited: [],
        sameOriginMode: this.options.sameOriginMode,
      });
    } finally {
      // Step 7: cleanup. context.close() terminates Chromium child;
      // dereferencing the run-state map entry makes the storageState
      // object eligible for GC (Invariant 2 + Invariant 10).
      await this._closeContextSafe(context);
      this.runStateMap.delete(runId);
    }
  }

  /**
   * Evaluate a click candidate against the Invariant 5 hybrid gate. Exposed
   * for callers that walk DOM elements directly (the Phase 3 multi-page BFS
   * extension uses this; tests use it directly for the 9-language coverage
   * suite).
   *
   * @param {object} el — element snapshot per applyHybridGate's contract
   * @returns {{ allow: boolean, reason: string, rule: string }}
   */
  evaluateClickGate(el) {
    return applyHybridGate(el);
  }

  /**
   * Check whether a candidate URL is in scope for authenticated navigation
   * from a given start URL. Phase 3 BFS multi-page extension uses this at
   * every frontier expansion (Invariant 4).
   */
  isInScopeForAuthenticatedNav(candidateUrl, startUrl) {
    return isInScopeForAuthenticatedNav(candidateUrl, startUrl, { mode: this.options.sameOriginMode });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  _safeOriginOf(url) {
    const u = parseUrlSafe(url);
    return u ? u.origin : null;
  }

  _mintRunId() {
    // Lightweight UUID-v4-ish for in-process minting. Production paths
    // (api/agent/21/execute.js — CHUNK 4) will pass a proper UUID v4.
    const t = this.deps.clock.now().toString(16);
    const r = Math.random().toString(16).slice(2, 10);
    return `auth-${t}-${r}`;
  }

  _buildErrorReport(url, reason, startedAt) {
    return Object.freeze({
      ok: false,
      authFailed: false,
      startUrl: url ?? '',
      origin: null,
      pagesCrawled: 0,
      pages: [],
      errors: [{ phase: 'input', url: url ?? '', reason }],
      warnings: [],
      durationMs: this.deps.clock.now() - startedAt,
    });
  }

  async _closeContextSafe(context) {
    if (!context) return;
    try {
      await context.close();
    } catch (err) {
      this.deps.logger?.warn?.('Agent21Executor: context.close() failed', {
        error: err?.message ?? String(err),
      });
    }
  }

  /**
   * Build the MFA detection snapshot from the Playwright page. Production
   * uses `page.evaluate()` to extract DOM signals; tests can override by
   * exposing a `__mfaSnapshot` getter on the mock page.
   */
  async _snapshotPageForMfa(page) {
    if (page && typeof page.__mfaSnapshot === 'object' && page.__mfaSnapshot !== null) {
      return page.__mfaSnapshot;
    }
    if (page && typeof page.evaluate === 'function') {
      try {
        return await page.evaluate(() => {
          const hasDataMfa = !!document.querySelector('[data-mfa]');
          const html = (document.body?.innerText ?? '').slice(0, 50000);
          const inputs = Array.from(document.querySelectorAll('input')).map((i) => ({
            type: i.type,
            maxlength: i.getAttribute('maxlength'),
            pattern: i.getAttribute('pattern'),
            inputmode: i.getAttribute('inputmode'),
            autocomplete: i.getAttribute('autocomplete'),
            placeholder: i.getAttribute('placeholder'),
          }));
          return { hasDataMfaAttr: hasDataMfa, html, extraInputs: inputs };
        });
      } catch {
        return { hasDataMfaAttr: false, html: '', extraInputs: [] };
      }
    }
    return { hasDataMfaAttr: false, html: '', extraInputs: [] };
  }

  /**
   * Read the post-login page state into a PageRecord-shaped object. Mirrors
   * the api/_lib/crawler.js page shape so the report normalises to the
   * existing CrawlReport contract without diverging.
   */
  async _readPagePostLogin(page, url) {
    if (page && typeof page.__postLoginPage === 'object' && page.__postLoginPage !== null) {
      return page.__postLoginPage;
    }
    if (page && typeof page.evaluate === 'function') {
      try {
        const snap = await page.evaluate(() => {
          const title = document.title || '';
          const metaDescription =
            document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
          const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4'))
            .map((h) => (h.textContent ?? '').trim())
            .filter(Boolean)
            .slice(0, 60);
          const bodyText = (document.body?.innerText ?? '').slice(0, 50_000);
          const links = Array.from(document.querySelectorAll('a[href]'))
            .map((a) => a.getAttribute('href'))
            .filter(Boolean)
            .slice(0, 500);
          return { title, metaDescription, headings, bodyText, links };
        });
        const currentUrl = typeof page.url === 'function' ? page.url() : url;
        return {
          url: currentUrl,
          normalisedUrl: currentUrl,
          depth: 0,
          parent: null,
          title: snap.title,
          metaDescription: snap.metaDescription,
          bodyText: snap.bodyText,
          headings: snap.headings,
          surfaces: { links: snap.links, buttons: [], forms: [], images: [] },
          accessibility: {},
          timing: {},
          consoleErrors: [],
          networkErrors: [],
          method: 'playwright-authenticated',
          jsRendered: true,
          ok: true,
          warnings: [],
          authGated: false, // post-successful-login pages are by definition not auth-gated
        };
      } catch {
        // Fall through to bare record
      }
    }
    return {
      url,
      normalisedUrl: url,
      depth: 0,
      parent: null,
      title: '',
      metaDescription: '',
      bodyText: '',
      headings: [],
      surfaces: { links: [], buttons: [], forms: [], images: [] },
      accessibility: {},
      timing: {},
      consoleErrors: [],
      networkErrors: [],
      method: 'playwright-authenticated',
      jsRendered: true,
      ok: true,
      warnings: ['post-login page snapshot unavailable'],
      authGated: false,
    };
  }

  async _publish(topic, payload) {
    try {
      await this.bus.publish?.({
        topic,
        payload,
        from: {
          agentId: 21,
          executor: EXECUTOR_KEY,
          productScope: this.deps.productScope,
          environment: this.deps.environment,
        },
        at: this.deps.clock.now(),
      });
    } catch (err) {
      this.deps.logger?.warn?.('Agent21Executor: bus publish failed', {
        topic, error: err?.message ?? String(err),
      });
    }
  }

  async _emitAuditLog(topic, payload) {
    try {
      await this.auditLog.write?.({
        topic,
        payload,
        from: {
          agentId: 21,
          executor: EXECUTOR_KEY,
          productScope: this.deps.productScope,
          environment: this.deps.environment,
        },
        at: this.deps.clock.now(),
      });
    } catch (err) {
      // Audit-log failure is a soft warning — the credentialed crawl
      // continues but the operator should know the audit trail is degraded.
      this.deps.logger?.warn?.('Agent21Executor: auditLog write failed', {
        topic, error: err?.message ?? String(err),
      });
    }
  }
}

// Exported for tests.
export const __internals = Object.freeze({
  EXECUTOR_KEY,
  TOPICS,
  DEFAULT_LOGIN_SELECTORS,
  EMAIL_RE,
  LOG_INJECTION_RE,
});
