// tests/agents/agent-21-no-screenshot-regression.test.js
//
// Phase 3 — Invariant 6 v3 (Q3-v3 Option B) regression guard.
//
// Per AUTH_TRAVERSAL_SECURITY_SPEC v3 §11 #5:
//   "No-screenshot-capture verification": a regression test asserts that
//   the Phase 3 authenticated-crawl code path does NOT call
//   page.screenshot(), Browserless /screenshot endpoint, or any
//   equivalent PNG-capture API at any point during an authenticated run.
//   Reintroduction of screenshot capture in Phase 3 is non-conformant;
//   Phase 4 will re-enable it under its own dispatch.
//
// This file uses TWO complementary guards:
//
//   1. RUNTIME GUARD: a mock browser whose Page object intentionally
//      does NOT expose page.screenshot. If a future change adds a
//      page.screenshot() call to the Executor's auth path, the call
//      will throw "page.screenshot is not a function" and the test
//      fails loudly.
//
//   2. STATIC GUARD: a grep over the Phase 3 Executor + the auth helper
//      modules + the endpoint, asserting that the substrings
//      'page.screenshot', '/screenshot', 'takeScreenshot' do not appear
//      anywhere in their source. This catches the case where a future
//      change adds the call but mocks-the-mock to avoid runtime detection.

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Agent21AggressiveCrawlConductorExecutor }
  from '../../src/lib/agents/agents/Agent21AggressiveCrawlConductorExecutor.js';

const VALID_CREDS = Object.freeze({ email: 'a@b.co', password: 'pw-1234' });
const START_URL = 'https://app.example.com/login';

// ── Runtime guard ────────────────────────────────────────────────────────────

describe('Invariant 6 v3 — no screenshot capture (runtime guard)', () => {
  it('mock page intentionally lacks page.screenshot — Executor must never call it', async () => {
    const calls = { storageState: [], screenshotAttempted: false };
    const page = {
      goto: vi.fn(async () => null),
      fill: vi.fn(async () => null),
      click: vi.fn(async () => null),
      waitForLoadState: vi.fn(async () => null),
      url: vi.fn(() => 'https://app.example.com/dashboard'),
      evaluate: vi.fn(async () => null),
      // CRITICAL: page.screenshot is INTENTIONALLY ABSENT.
      // If the Executor's auth path ever calls page.screenshot, the
      // resulting "page.screenshot is not a function" throw will fail
      // this test — which is the desired regression behaviour.
      __mfaSnapshot: { hasDataMfaAttr: false, html: 'OK', extraInputs: [] },
      __postLoginPage: {
        url: START_URL, title: '', metaDescription: '', bodyText: '', headings: [],
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        accessibility: {}, timing: {}, consoleErrors: [], networkErrors: [],
        method: 'playwright-authenticated', jsRendered: true, ok: true,
        warnings: [], authGated: false,
      },
    };
    const context = {
      newPage: vi.fn(async () => page),
      storageState: vi.fn(async (opts) => {
        calls.storageState.push({ opts });
        return { cookies: [], origins: [] };
      }),
      close: vi.fn(async () => null),
    };
    const browser = {
      newContext: vi.fn(async () => context),
      close: vi.fn(async () => null),
    };
    const executor = new Agent21AggressiveCrawlConductorExecutor({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      messageBus: { publish: vi.fn(async () => {}), subscribe: vi.fn(() => () => {}) },
      auditLog: { write: vi.fn(async () => {}) },
      clock: { now: () => 1_800_000_000_000 },
      productScope: 'flowai',
      environment: 'staging',
      browser,
    });
    const report = await executor.conductCredentialedCrawl(START_URL, {
      runId: 'r-no-screenshot',
      credentials: VALID_CREDS,
    });
    expect(report.ok).toBe(true);
    // If we reached here without "page.screenshot is not a function", the
    // Executor did not attempt screenshot capture.
  });
});

// ── Static guard ─────────────────────────────────────────────────────────────

describe('Invariant 6 v3 — no screenshot capture (static guard)', () => {
  const PHASE_3_AUTH_FILES = [
    'src/lib/agents/agents/Agent21AggressiveCrawlConductorExecutor.js',
    'src/lib/agents/auth/mfaDetect.js',
    'src/lib/agents/auth/sameOriginGate.js',
    'src/lib/agents/auth/destructiveDenylist.js',
    'src/lib/agents/auth/scrubArtifacts.js',
    'src/lib/agents/auth/auditEntry.js',
    'src/lib/agents/auth/browserlessAdapter.js',
    'api/agent/21/execute.js',
  ];

  // Substrings that would indicate a screenshot capture path. The list is
  // conservative: any false-positive surface (e.g. a comment referencing
  // "page.screenshot" in a disclaimer) trips the test, forcing reviewers
  // to acknowledge and explain. The whole point of v3 Option B is "no
  // screenshot surface AT ALL"; even commented-out code is suspect.
  //
  // Exception: comments that NAME the forbidden surface for the explicit
  // purpose of disclaiming it. We strip C-style comments before scanning
  // so the negative-space documentation in the source files doesn't
  // false-positive.
  const FORBIDDEN_SUBSTRINGS = [
    'page.screenshot',
    '/screenshot',
    'takeScreenshot',
    'browserless.io/screenshot',
  ];

  function stripCommentsForStaticScan(src) {
    // Remove /* ... */ block comments (incl. JSDoc) — these legitimately
    // discuss "screenshots not captured in Phase 3" without violating
    // the invariant.
    let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove // line comments.
    out = out.replace(/\/\/[^\n]*/g, '');
    return out;
  }

  for (const rel of PHASE_3_AUTH_FILES) {
    it(`${rel} contains no screenshot-capture surface`, () => {
      const abs = resolve(process.cwd(), rel);
      const src = readFileSync(abs, 'utf8');
      const codeOnly = stripCommentsForStaticScan(src);
      for (const needle of FORBIDDEN_SUBSTRINGS) {
        expect(codeOnly).not.toContain(needle);
      }
    });
  }

  it('Browserless adapter does not import any screenshot-only Playwright API', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/lib/agents/auth/browserlessAdapter.js'),
      'utf8',
    );
    // The adapter imports playwright.chromium for connectOverCDP only.
    // Any explicit screenshot import would be a regression.
    expect(src).not.toMatch(/playwright\/screenshot/);
    expect(src).not.toMatch(/screenshot\s*:\s*true/i);
  });

  it('Executor file does not reference page.screenshot in any form', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/lib/agents/agents/Agent21AggressiveCrawlConductorExecutor.js'),
      'utf8',
    );
    const codeOnly = stripCommentsForStaticScan(src);
    // Pattern-match: any property access named screenshot.
    expect(codeOnly).not.toMatch(/\.screenshot\s*\(/);
  });
});

// ── Affirmative regression guard ─────────────────────────────────────────────

describe('Invariant 6 v3 — affirmative scope assertion', () => {
  it('Phase 3 spec freeze decision is preserved: screenshots deferred to Phase 4', () => {
    // The freeze notice in docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md states:
    //   "Phase 3 builds against the 4 supermajority-ratified positions:
    //    cross-origin REFUSE, strict same-origin, MFA fail-loud, no
    //    screenshots (Phase 4)."
    // This test reads the spec and asserts the freeze notice is intact.
    const spec = readFileSync(
      resolve(process.cwd(), 'docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md'),
      'utf8',
    );
    expect(spec).toMatch(/PHASE 3 BASELINE — FROZEN AT v3/);
    expect(spec).toMatch(/no screenshots \(Phase 4\)/);
    // Negative assertion: the freeze MUST NOT have been rolled back.
    expect(spec).not.toMatch(/screenshot capture is now enabled in Phase 3/i);
  });
});
