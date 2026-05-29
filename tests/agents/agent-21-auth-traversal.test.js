// tests/agents/agent-21-auth-traversal.test.js
//
// Phase 3 (AUTH_TRAVERSAL_SECURITY_SPEC v3 — frozen baseline at commit be594e3,
// freeze notice at b534d34) coverage. Each of the 10 invariants from spec §2
// maps to ≥1 named test below. Plus the §5.1 audit-log shape conformance per
// Invariant 9, and the §3.2 credential-boundary validation per Invariants 1
// and 8.
//
// All tests use a mock browser dep — no live Playwright / Browserless calls.
// The mock records call shapes so we can assert e.g. context.storageState()
// is NEVER called with a `path` argument (Invariant 2 MUST).
//
// Companion test files:
//   - agent-21-i18n-9-language.test.js (Invariant 5 9-family coverage)
//   - agent-21-no-screenshot-regression.test.js (Invariant 6 v3 Option B)

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  Agent21AggressiveCrawlConductorExecutor,
  validateCredentialsAtBoundary,
  __internals as EX_INTERNALS,
} from '../../src/lib/agents/agents/Agent21AggressiveCrawlConductorExecutor.js';
import {
  buildAuthCrawlAuditEntry,
  buildAuthCrawlFailureAuditEntry,
  assertNoForbiddenFields,
  STORAGE_STATE_PATH_LITERAL,
  RETENTION_CLASS,
  FORBIDDEN_FIELDS,
} from '../../src/lib/agents/auth/auditEntry.js';
import { scrubTextForCredentials, scrubDomDump } from '../../src/lib/agents/auth/scrubArtifacts.js';
import { isInScopeForAuthenticatedNav } from '../../src/lib/agents/auth/sameOriginGate.js';

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeBus() {
  const published = [];
  return {
    publish: vi.fn(async (env) => { published.push(env); return undefined; }),
    subscribe: vi.fn(() => () => {}),
    _peek: () => published,
  };
}

function makeAuditLog() {
  const written = [];
  return {
    write: vi.fn(async (env) => { written.push(env); return undefined; }),
    _peek: () => written,
  };
}

/**
 * Mock browser/context/page tree. Records call shapes so tests can assert:
 *   - storageState called WITHOUT a `path` argument (Invariant 2)
 *   - close() called in finally (Invariant 10)
 *   - page.screenshot / Browserless screenshot endpoint NEVER called (Inv 6)
 */
function makeMockBrowser({
  postLoginPage = null,
  mfaSnapshot = null,
  loginShouldFail = false,
  goToUrl = null,
} = {}) {
  const calls = {
    newContext: [],
    storageState: [],
    contextClose: 0,
    pageGoto: [],
    pageFill: [],
    pageClick: [],
    pageWaitForLoadState: [],
    pageScreenshot: 0,
    pageEvaluate: 0,
  };
  const page = {
    goto: vi.fn(async (url, opts) => {
      calls.pageGoto.push({ url, opts });
      return null;
    }),
    fill: vi.fn(async (selector, value) => {
      calls.pageFill.push({ selector, valueLen: typeof value === 'string' ? value.length : 0 });
      if (loginShouldFail) throw new Error('selector not found');
      return null;
    }),
    click: vi.fn(async (selector) => {
      calls.pageClick.push({ selector });
      if (loginShouldFail) throw new Error('click target not found');
      return null;
    }),
    waitForLoadState: vi.fn(async (state, opts) => {
      calls.pageWaitForLoadState.push({ state, opts });
      return null;
    }),
    url: vi.fn(() => goToUrl || 'https://app.example.com/dashboard'),
    evaluate: vi.fn(async () => {
      calls.pageEvaluate += 1;
      // Default: return whatever postLoginPage / mfaSnapshot was passed.
      return null;
    }),
    // Test hooks per the Executor's documented test surface — bypasses
    // page.evaluate so we don't have to simulate a full DOM.
    __mfaSnapshot: mfaSnapshot,
    __postLoginPage: postLoginPage,
  };
  // IMPORTANT: page.screenshot is INTENTIONALLY ABSENT here. The
  // no-screenshot regression test asserts the Executor never tries to
  // call it; if a future change adds an unguarded page.screenshot() call,
  // the test will fail with "screenshot is not a function" rather than
  // silently succeeding.
  const context = {
    newPage: vi.fn(async () => page),
    storageState: vi.fn(async (opts) => {
      // CRITICAL: record EXACTLY what was passed so Invariant 2 can
      // assert no `path` argument is ever supplied.
      calls.storageState.push({ opts, argsLen: arguments.length });
      return Object.freeze({ cookies: [], origins: [] });
    }),
    close: vi.fn(async () => { calls.contextClose += 1; return null; }),
  };
  const browser = {
    newContext: vi.fn(async (opts) => {
      calls.newContext.push({ opts });
      return context;
    }),
    close: vi.fn(async () => null),
  };
  return { browser, context, page, calls };
}

function makeExecutor({ browser, options = {} } = {}) {
  let t = 1_800_000_000_000;
  const bus = makeBus();
  const auditLog = makeAuditLog();
  const executor = new Agent21AggressiveCrawlConductorExecutor({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    messageBus: bus,
    auditLog,
    clock: { now: () => t },
    productScope: 'flowai',
    environment: 'staging',
    browser,
    options,
  });
  return {
    executor,
    bus,
    auditLog,
    advance: (ms) => { t += ms; },
  };
}

const VALID_CREDS = Object.freeze({
  email: 'alice@example.com',
  password: 'CorrectHorseBatteryStaple-2026',
});

const START_URL = 'https://app.example.com/login';

// ── Invariant 1 — Credentials never logged, ever ─────────────────────────────

describe('Invariant 1 — Credentials never logged', () => {
  it('audit-log forbidden-field guard rejects loginEmail in args', () => {
    expect(() => buildAuthCrawlAuditEntry({
      runId: 'r1',
      productId: 'flowai',
      targetOrigin: 'https://app.example.com',
      loginAttempted: true,
      loginSucceeded: true,
      pagesCrawled: 1,
      authGatedPagesEncountered: 0,
      at: '2026-05-16T20:00:00.000Z',
      durationMs: 100,
      loginEmail: VALID_CREDS.email,   // <-- forbidden
    })).toThrow(/forbidden field "loginEmail"/);
  });

  it('audit-log forbidden-field guard rejects nested storageState', () => {
    expect(() => buildAuthCrawlAuditEntry({
      runId: 'r1',
      productId: 'flowai',
      targetOrigin: 'https://app.example.com',
      loginAttempted: true,
      loginSucceeded: true,
      pagesCrawled: 1,
      authGatedPagesEncountered: 0,
      at: '2026-05-16T20:00:00.000Z',
      durationMs: 100,
      metadata: { storageState: { cookies: [{ name: 'session', value: 'XYZ' }] } },
    })).toThrow(/forbidden field "storageState"/);
  });

  it('FORBIDDEN_FIELDS contains every §5.2 NEVER-recorded item', () => {
    for (const k of ['loginemail', 'loginpassword', 'storagestate', 'authorization', 'set-cookie', 'cookie']) {
      expect(FORBIDDEN_FIELDS.has(k)).toBe(true);
    }
  });

  it('canary credentials NEVER appear in audit-log entries even when surfaced by the report', async () => {
    const { browser, calls } = makeMockBrowser({
      postLoginPage: {
        url: 'https://app.example.com/dashboard',
        title: 'Welcome, alice@example.com',
        metaDescription: '',
        bodyText: 'Hello alice@example.com — password was CorrectHorseBatteryStaple-2026 visible in DOM',
        headings: ['Welcome'],
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        accessibility: {}, timing: {}, consoleErrors: [], networkErrors: [],
        method: 'playwright-authenticated', jsRendered: true, ok: true,
        warnings: [], authGated: false,
      },
    });
    const { executor, auditLog } = makeExecutor({ browser });
    const report = await executor.conductCredentialedCrawl(START_URL, {
      runId: 'canary-run',
      credentials: VALID_CREDS,
    });
    // The DOM contained the email + password; assert scrubbing redacted both.
    expect(report.ok).toBe(true);
    const bodyText = report.pages[0].bodyText;
    expect(bodyText).not.toContain(VALID_CREDS.email);
    expect(bodyText).not.toContain(VALID_CREDS.password);
    expect(bodyText).toContain('[REDACTED-EMAIL]');
    expect(bodyText).toContain('[REDACTED]');
    // Audit entries — no credential bytes anywhere.
    const auditSerialized = JSON.stringify(auditLog._peek());
    expect(auditSerialized).not.toContain(VALID_CREDS.email);
    expect(auditSerialized).not.toContain(VALID_CREDS.password);
  });
});

// ── Invariant 2 — storageState memory-only (MUST) ────────────────────────────

describe('Invariant 2 — storageState memory-only (MUST)', () => {
  it('context.storageState() is called with NO arguments (no `path`)', async () => {
    const { browser, calls } = makeMockBrowser({
      postLoginPage: { url: START_URL, title: '', metaDescription: '', bodyText: '', headings: [],
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        accessibility: {}, timing: {}, consoleErrors: [], networkErrors: [],
        method: 'playwright-authenticated', jsRendered: true, ok: true, warnings: [], authGated: false },
    });
    const { executor } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-mem-only', credentials: VALID_CREDS });
    // The Executor must call storageState() exactly once, with NO arguments.
    expect(calls.storageState.length).toBe(1);
    expect(calls.storageState[0].opts).toBeUndefined();
  });

  it('storageState mock asserts: if a path arg were ever passed, the test would fail', async () => {
    // Negative control: prove the assertion has teeth by manually invoking
    // storageState with a path and asserting the mock records it.
    const { context, calls } = makeMockBrowser();
    await context.storageState({ path: '/tmp/leak.json' });
    expect(calls.storageState[0].opts).toEqual({ path: '/tmp/leak.json' });
    // (This is a guard against the test itself becoming a no-op if the
    // production code accidentally drops the storageState call entirely.)
  });

  it('newContext is called with storageState: undefined (no prior state)', async () => {
    const { browser, calls } = makeMockBrowser({
      postLoginPage: { url: START_URL, title: '', metaDescription: '', bodyText: '', headings: [],
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        accessibility: {}, timing: {}, consoleErrors: [], networkErrors: [],
        method: 'playwright-authenticated', jsRendered: true, ok: true, warnings: [], authGated: false },
    });
    const { executor } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-clean-start', credentials: VALID_CREDS });
    expect(calls.newContext[0].opts).toEqual({ storageState: undefined });
  });

  it('runStateMap is dereferenced at run end (GC-eligible)', async () => {
    const { browser } = makeMockBrowser({
      postLoginPage: { url: START_URL, title: '', metaDescription: '', bodyText: '', headings: [],
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        accessibility: {}, timing: {}, consoleErrors: [], networkErrors: [],
        method: 'playwright-authenticated', jsRendered: true, ok: true, warnings: [], authGated: false },
    });
    const { executor } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-dereferenced', credentials: VALID_CREDS });
    expect(executor.runStateMap.has('r-dereferenced')).toBe(false);
  });
});

// ── Invariant 3 — Single-attempt login + MFA fail-loud ───────────────────────

describe('Invariant 3 — Single-attempt login + MFA fail-loud', () => {
  it('MFA challenge (data-mfa attribute) → ok:false, authFailureReason: mfa_required', async () => {
    const { browser } = makeMockBrowser({
      mfaSnapshot: { hasDataMfaAttr: true, html: '', extraInputs: [] },
    });
    const { executor } = makeExecutor({ browser });
    const report = await executor.conductCredentialedCrawl(START_URL, { runId: 'r-mfa', credentials: VALID_CREDS });
    expect(report.ok).toBe(false);
    expect(report.authFailed).toBe(true);
    expect(report.authFailureReason).toBe('mfa_required');
    expect(report.detectionSignal).toBe('data_mfa_attribute');
  });

  it('MFA challenge (text regex) → ok:false', async () => {
    const { browser } = makeMockBrowser({
      mfaSnapshot: { hasDataMfaAttr: false, html: 'Enter your 6-digit verification code', extraInputs: [] },
    });
    const { executor } = makeExecutor({ browser });
    const report = await executor.conductCredentialedCrawl(START_URL, { runId: 'r-mfa-text', credentials: VALID_CREDS });
    expect(report.authFailureReason).toBe('mfa_required');
    expect(report.detectionSignal).toBe('text_regex');
  });

  it('MFA challenge (autocomplete=one-time-code) → ok:false', async () => {
    const { browser } = makeMockBrowser({
      mfaSnapshot: {
        hasDataMfaAttr: false,
        html: '',
        extraInputs: [{ type: 'text', autocomplete: 'one-time-code' }],
      },
    });
    const { executor } = makeExecutor({ browser });
    const report = await executor.conductCredentialedCrawl(START_URL, { runId: 'r-mfa-auto', credentials: VALID_CREDS });
    expect(report.authFailureReason).toBe('mfa_required');
    expect(report.detectionSignal).toBe('autocomplete_one_time_code');
  });

  it('login form selectors not matched → fail-loud with login_form_not_found', async () => {
    const { browser } = makeMockBrowser({ loginShouldFail: true });
    const { executor } = makeExecutor({ browser });
    const report = await executor.conductCredentialedCrawl(START_URL, { runId: 'r-noform', credentials: VALID_CREDS });
    expect(report.ok).toBe(false);
    expect(report.authFailureReason).toBe('login_form_not_found');
  });

  it('single-attempt only: no retry on login failure', async () => {
    const { browser, calls } = makeMockBrowser({ loginShouldFail: true });
    const { executor } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-noretry', credentials: VALID_CREDS });
    // Exactly one fill attempt for email; click is not reached because fill threw.
    expect(calls.pageFill.length).toBe(1);
    expect(calls.pageClick.length).toBe(0);
  });

  it('successful login + no MFA → run continues to storageState capture', async () => {
    const { browser, calls } = makeMockBrowser({
      mfaSnapshot: { hasDataMfaAttr: false, html: 'Welcome dashboard', extraInputs: [] },
      postLoginPage: { url: START_URL, title: '', metaDescription: '', bodyText: '', headings: [],
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        accessibility: {}, timing: {}, consoleErrors: [], networkErrors: [],
        method: 'playwright-authenticated', jsRendered: true, ok: true, warnings: [], authGated: false },
    });
    const { executor } = makeExecutor({ browser });
    const report = await executor.conductCredentialedCrawl(START_URL, { runId: 'r-happy', credentials: VALID_CREDS });
    expect(report.ok).toBe(true);
    expect(report.authFailed).toBe(false);
    expect(calls.storageState.length).toBe(1);
  });
});

// ── Invariant 4 — Same-origin restriction ────────────────────────────────────

describe('Invariant 4 — Same-origin restriction (cross-origin REFUSE)', () => {
  it('same-origin URL is in scope (strict mode default)', () => {
    const r = isInScopeForAuthenticatedNav(
      'https://app.example.com/inner',
      'https://app.example.com/login',
    );
    expect(r.inScope).toBe(true);
  });

  it('cross-origin URL is REFUSED with a recorded reason', () => {
    const r = isInScopeForAuthenticatedNav(
      'https://attacker.example/steal',
      'https://app.example.com/login',
    );
    expect(r.inScope).toBe(false);
    expect(r.reason).toMatch(/host_mismatch/);
  });

  it('cross-subdomain is REFUSED by default (strict same-origin)', () => {
    const r = isInScopeForAuthenticatedNav(
      'https://www.example.com/',
      'https://app.example.com/login',
    );
    expect(r.inScope).toBe(false);
    expect(r.mode).toBe('strict-same-origin');
  });

  it('same-eTLD+1 mode (admin opt-in) accepts cross-subdomain', () => {
    const r = isInScopeForAuthenticatedNav(
      'https://www.example.com/',
      'https://app.example.com/login',
      { mode: 'same-registrable-domain' },
    );
    expect(r.inScope).toBe(true);
  });

  it('protocol mismatch (http vs https) is REFUSED', () => {
    const r = isInScopeForAuthenticatedNav(
      'http://app.example.com/',
      'https://app.example.com/',
    );
    expect(r.inScope).toBe(false);
    expect(r.reason).toMatch(/protocol_mismatch/);
  });

  it('Executor.isInScopeForAuthenticatedNav delegates to the helper with its mode', async () => {
    const { browser } = makeMockBrowser();
    const { executor } = makeExecutor({ browser });
    expect(executor.isInScopeForAuthenticatedNav(
      'https://attacker.example/',
      'https://app.example.com/',
    ).inScope).toBe(false);
  });
});

// ── Invariant 5 — Non-destructive action gate ────────────────────────────────
// (Detailed 9-language coverage in agent-21-i18n-9-language.test.js)

describe('Invariant 5 — Non-destructive action gate (allowlist + denylist)', () => {
  it('data-crawl-safe="true" overrides a destructive class', () => {
    const { browser } = makeMockBrowser();
    const { executor } = makeExecutor({ browser });
    const r = executor.evaluateClickGate({
      tagName: 'BUTTON', textContent: 'Delete', className: 'btn-danger',
      dataset: { crawlSafe: 'true' },
    });
    expect(r.allow).toBe(true);
    expect(r.rule).toBe('allowlist_data_crawl_safe');
  });

  it('type="submit" is BLOCKED regardless of text', () => {
    const { browser } = makeMockBrowser();
    const { executor } = makeExecutor({ browser });
    const r = executor.evaluateClickGate({ tagName: 'BUTTON', type: 'submit', textContent: 'OK' });
    expect(r.allow).toBe(false);
    expect(r.rule).toBe('denylist_form_submit_type');
  });

  it('ancestor <form method="post"> is BLOCKED', () => {
    const { browser } = makeMockBrowser();
    const { executor } = makeExecutor({ browser });
    const r = executor.evaluateClickGate({
      tagName: 'BUTTON', textContent: 'Save', ancestorForm: { method: 'post' },
    });
    expect(r.allow).toBe(false);
    expect(r.rule).toBe('denylist_form_method');
  });

  it('benign button (no class, no denylist match) is ALLOWED', () => {
    const { browser } = makeMockBrowser();
    const { executor } = makeExecutor({ browser });
    const r = executor.evaluateClickGate({ tagName: 'BUTTON', textContent: 'Continue' });
    expect(r.allow).toBe(true);
    expect(r.rule).toBe('allow_default');
  });
});

// ── Invariant 6 — Evidence-artefact scrubbing (no screenshots in Phase 3) ────
// (Detailed regression in agent-21-no-screenshot-regression.test.js)

describe('Invariant 6 — Evidence-artefact scrubbing', () => {
  it('scrubTextForCredentials redacts literal email substring', () => {
    const out = scrubTextForCredentials(
      'Hello alice@example.com — your account is active',
      VALID_CREDS,
    );
    expect(out).not.toContain('alice@example.com');
    expect(out).toContain('[REDACTED-EMAIL]');
  });

  it('scrubTextForCredentials redacts Welcome-banner email pattern', () => {
    const out = scrubTextForCredentials('Welcome, bob@other.com!', VALID_CREDS);
    expect(out).not.toContain('bob@other.com');
  });

  it('scrubTextForCredentials redacts <input type="password" value="...">', () => {
    const out = scrubTextForCredentials(
      '<input type="password" name="p" value="leaked-via-html">',
      VALID_CREDS,
    );
    expect(out).not.toContain('leaked-via-html');
    expect(out).toContain('value="[REDACTED]"');
  });

  it('scrubTextForCredentials redacts Authorization: log lines', () => {
    const out = scrubTextForCredentials('Authorization: Bearer sk-12345-abc', VALID_CREDS);
    expect(out).not.toContain('sk-12345-abc');
    expect(out).toContain('Authorization: [REDACTED]');
  });

  it('scrubDomDump scrubs all string fields including headings', () => {
    const dom = {
      title: 'Welcome, alice@example.com',
      metaDescription: 'Logged in as alice@example.com',
      bodyText: 'Email: alice@example.com',
      headings: ['Hello alice@example.com'],
      surfaces: { links: ['https://x.com/?u=alice@example.com'] },
    };
    const out = scrubDomDump(dom, VALID_CREDS);
    expect(out.title).not.toContain('alice@example.com');
    expect(out.bodyText).not.toContain('alice@example.com');
    expect(out.headings[0]).not.toContain('alice@example.com');
  });
});

// ── Invariant 7 — One-shot credential lifetime ───────────────────────────────

describe('Invariant 7 — One-shot credential lifetime', () => {
  it('Executor does not retain credentials after the run completes', async () => {
    const { browser } = makeMockBrowser({
      postLoginPage: { url: START_URL, title: '', metaDescription: '', bodyText: '', headings: [],
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        accessibility: {}, timing: {}, consoleErrors: [], networkErrors: [],
        method: 'playwright-authenticated', jsRendered: true, ok: true, warnings: [], authGated: false },
    });
    const { executor, auditLog } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-shortlived', credentials: VALID_CREDS });
    // runStateMap is the only Executor-instance state — must be empty.
    expect(executor.runStateMap.size).toBe(0);
    // Audit-log entries — credentials must not appear.
    const ser = JSON.stringify(auditLog._peek());
    expect(ser).not.toContain(VALID_CREDS.password);
  });
});

// ── Invariant 8 — Credentials are session-only (boundary validation) ─────────

describe('Invariant 8 — Operator-supplied credentials are session-only', () => {
  it('validateCredentialsAtBoundary accepts a well-formed pair', () => {
    const r = validateCredentialsAtBoundary({ email: 'a@b.co', password: 'pw' });
    expect(r.ok).toBe(true);
    expect(r.credentials).toEqual({ email: 'a@b.co', password: 'pw' });
  });

  it('validateCredentialsAtBoundary rejects email-without-password', () => {
    const r = validateCredentialsAtBoundary({ email: 'a@b.co' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('credentials_incomplete_one_without_other');
  });

  it('validateCredentialsAtBoundary rejects email length out of bounds', () => {
    const r = validateCredentialsAtBoundary({ email: 'a@b', password: 'pw' });
    expect(r.ok).toBe(false);
  });

  it('validateCredentialsAtBoundary rejects log-injection characters in email (caught at email_regex stage — \\s)', () => {
    // Newlines in email fail at the email regex stage (the regex's [^@\s]
    // class already excludes \s, which includes \n). The log-injection
    // check is the second-line defense for chars that PASS the email
    // regex; for newlines specifically the email regex catches it first.
    const r = validateCredentialsAtBoundary({ email: 'a\n@b.co', password: 'pw' });
    expect(r.ok).toBe(false);
    expect(['email_regex_mismatch', 'log_injection_chars_rejected']).toContain(r.reason);
  });

  it('validateCredentialsAtBoundary rejects log-injection characters in password (CR)', () => {
    const r = validateCredentialsAtBoundary({ email: 'a@b.co', password: 'pw\rxx' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('log_injection_chars_rejected');
  });

  it('validateCredentialsAtBoundary rejects log-injection characters in password (NUL)', () => {
    const r = validateCredentialsAtBoundary({ email: 'a@b.co', password: 'pw\x00xx' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('log_injection_chars_rejected');
  });

  it('validateCredentialsAtBoundary returns credentials:null when both absent (legitimate unauth path)', () => {
    const r = validateCredentialsAtBoundary({});
    expect(r.ok).toBe(true);
    expect(r.credentials).toBeNull();
  });
});

// ── Invariant 9 — Audit-log surface ──────────────────────────────────────────

describe('Invariant 9 — Audit-log surface conformance', () => {
  it('happy-path entry has exactly the §5.1 fields + retentionClass', () => {
    const entry = buildAuthCrawlAuditEntry({
      runId: 'r1', productId: 'flowai', targetOrigin: 'https://app.example.com',
      loginAttempted: true, loginSucceeded: true, pagesCrawled: 1,
      authGatedPagesEncountered: 0, at: '2026-05-16T20:00:00.000Z', durationMs: 1234,
    });
    expect(entry.kind).toBe('authenticated_crawl_run');
    expect(entry.storageStatePath).toBe(STORAGE_STATE_PATH_LITERAL);
    expect(entry.retentionClass).toBe(RETENTION_CLASS);
    expect(entry.retentionClass).toBe('auth_short');
    expect(entry.runId).toBe('r1');
    expect(entry.loginSucceeded).toBe(true);
  });

  it('storageStatePath is the literal "[EPHEMERAL — deleted at runEnd]" per spec §5.1', () => {
    const entry = buildAuthCrawlAuditEntry({
      runId: 'r2', productId: null, targetOrigin: 'https://x',
      loginAttempted: true, loginSucceeded: true, pagesCrawled: 0,
      authGatedPagesEncountered: 0, at: '2026-05-16T20:00:00.000Z', durationMs: 0,
    });
    expect(entry.storageStatePath).toBe('[EPHEMERAL — deleted at runEnd]');
  });

  it('failure-path entry preserves retentionClass and adds authFailureReason', () => {
    const entry = buildAuthCrawlFailureAuditEntry({
      runId: 'r3', productId: 'flowai', targetOrigin: 'https://x',
      authFailureReason: 'mfa_required', at: '2026-05-16T20:00:00.000Z', durationMs: 50,
    });
    expect(entry.retentionClass).toBe('auth_short');
    expect(entry.loginSucceeded).toBe(false);
    expect(entry.authFailureReason).toBe('mfa_required');
    expect(entry.pagesCrawled).toBe(0);
  });

  it('forbidden-field guard catches loginPassword at top level', () => {
    expect(() => buildAuthCrawlAuditEntry({
      runId: 'r4', productId: 'x', targetOrigin: 'https://x',
      loginAttempted: true, loginSucceeded: true, pagesCrawled: 0,
      authGatedPagesEncountered: 0, at: '2026-05-16T20:00:00.000Z', durationMs: 0,
      loginPassword: 'never-should-be-here',
    })).toThrow(/forbidden field "loginPassword"/);
  });

  it('forbidden-field guard catches Authorization in nested metadata', () => {
    expect(() => assertNoForbiddenFields({
      runId: 'r5',
      metadata: { headers: { authorization: 'Bearer xyz' } },
    })).toThrow(/forbidden field "authorization"/);
  });
});

// ── Invariant 10 — Crash / abort safety ──────────────────────────────────────

describe('Invariant 10 — Crash / abort safety', () => {
  it('context.close() is called in finally{} even when login throws', async () => {
    const { browser, calls } = makeMockBrowser({ loginShouldFail: true });
    const { executor } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-fault', credentials: VALID_CREDS });
    expect(calls.contextClose).toBe(1);
  });

  it('context.close() is called in finally{} even when MFA detected', async () => {
    const { browser, calls } = makeMockBrowser({
      mfaSnapshot: { hasDataMfaAttr: true, html: '', extraInputs: [] },
    });
    const { executor } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-mfa-cleanup', credentials: VALID_CREDS });
    expect(calls.contextClose).toBe(1);
  });

  it('runStateMap is cleared even on hard failure', async () => {
    const { browser } = makeMockBrowser({ loginShouldFail: true });
    const { executor } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-clear-after-fail', credentials: VALID_CREDS });
    expect(executor.runStateMap.size).toBe(0);
  });

  it('no filesystem path is ever created (memory-only Invariant 2 implies no orphans)', async () => {
    // Verified by absence: the Executor module's source contains zero
    // references to fs.writeFile / fs.mkdir / path.join('tmp/' (the v1
    // filesystem-state pattern). This is a static guarantee covered by
    // grep at build time; here we assert the mock context.storageState
    // was called WITHOUT a path (the runtime invariant).
    const { browser, calls } = makeMockBrowser({
      postLoginPage: { url: START_URL, title: '', metaDescription: '', bodyText: '', headings: [],
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        accessibility: {}, timing: {}, consoleErrors: [], networkErrors: [],
        method: 'playwright-authenticated', jsRendered: true, ok: true, warnings: [], authGated: false },
    });
    const { executor } = makeExecutor({ browser });
    await executor.conductCredentialedCrawl(START_URL, { runId: 'r-no-fs', credentials: VALID_CREDS });
    for (const c of calls.storageState) {
      expect(c.opts).toBeUndefined();
    }
  });
});

// ── Executor charter integrity ───────────────────────────────────────────────

describe('Executor charter integrity', () => {
  it('Executor.charter() returns the EXECUTOR_REGISTRY entry', () => {
    const c = Agent21AggressiveCrawlConductorExecutor.charter();
    expect(c.id).toBe(21);
    expect(c.name).toMatch(/Aggressive Crawl Conductor Executor/i);
    expect(c.authority).toEqual(['auto_write_internal', 'requires_human_gate']);
    expect(c.requiredCredentials).toContain('BROWSERLESS_API_KEY');
  });

  it('Executor constructor requires browser, messageBus, auditLog deps', () => {
    expect(() => new Agent21AggressiveCrawlConductorExecutor({
      logger: {}, clock: { now: () => 0 }, productScope: 'x', environment: 'staging',
    })).toThrow();
  });
});
