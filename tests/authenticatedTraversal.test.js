// tests/authenticatedTraversal.test.js
//
// DISPATCH 28 P0-1 — conductWithAuthFlow composer + Agent21
// conductCrawlWithAuth wire-in. The composer is pure; the auth flow
// itself is fully delegated to the Phase 3 Executor (covered by its
// own existing test surface).

import { describe, it, expect, vi } from 'vitest';
import {
  conductWithAuthFlow,
  __internals,
} from '../src/lib/agents/auth/authenticatedTraversal.js';

const CREDS = Object.freeze({ email: 'op@example.com', password: 'hunter2' });

function unauthReportWith({ pages = [], errors = [], warnings = [], extras = {} } = {}) {
  return {
    ok: true,
    pages,
    pagesCrawled: pages.length,
    errors,
    warnings,
    authGatedCount: pages.filter((p) => p?.authGated === true).length,
    ...extras,
  };
}

describe('validateCredentials (composer boundary)', () => {
  it('null/undefined credentials → ok with null', () => {
    expect(__internals.validateCredentials(null)).toEqual({ ok: true, credentials: null });
    expect(__internals.validateCredentials(undefined)).toEqual({ ok: true, credentials: null });
  });

  it('email+password both present → ok with frozen object', () => {
    const r = __internals.validateCredentials({ email: 'a@b.com', password: 'p' });
    expect(r.ok).toBe(true);
    expect(r.credentials.email).toBe('a@b.com');
    expect(Object.isFrozen(r.credentials)).toBe(true);
  });

  it('incomplete (only email or only password) → rejected', () => {
    expect(__internals.validateCredentials({ email: 'a@b.com' }).ok).toBe(false);
    expect(__internals.validateCredentials({ password: 'p' }).ok).toBe(false);
  });

  it('empty strings on both → treated as unauthenticated', () => {
    expect(__internals.validateCredentials({ email: '', password: '' }).credentials).toBeNull();
  });

  it('non-object credentials → rejected', () => {
    expect(__internals.validateCredentials('a string').ok).toBe(false);
    expect(__internals.validateCredentials(42).ok).toBe(false);
  });
});

describe('conductWithAuthFlow — no credentials path', () => {
  it('returns the unauth report verbatim + authPass: null', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [{ url: 'https://x/', authGated: false }],
    }));
    const r = await conductWithAuthFlow({ unauthCrawl, url: 'https://x/' });
    expect(r.pages).toHaveLength(1);
    expect(r.authPass).toBeNull();
  });

  it('credentials present but no auth-gated pages → no auth pass attempted', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [{ url: 'https://x/', authGated: false }],
    }));
    const r = await conductWithAuthFlow({ unauthCrawl, url: 'https://x/', credentials: CREDS });
    expect(r.authPass).toEqual(expect.objectContaining({
      ok: true, reason: 'no_auth_gated_pages', pagesAdded: 0, pagesAttempted: 0,
    }));
  });
});

describe('conductWithAuthFlow — credentialed pass', () => {
  it('invokes credentialedCrawlFn for each auth-gated page and merges pages', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [
        { url: 'https://x/', authGated: false, bodyText: 'public' },
        { url: 'https://x/dashboard', authGated: true, bodyText: '' },
      ],
    }));
    const credentialedCrawlFn = vi.fn(async (u, o) => ({
      ok: true, authFailed: false, pages: [
        { url: 'https://x/dashboard', authGated: false, bodyText: 'welcome', source: 'authed' },
      ],
    }));
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn, url: 'https://x/', credentials: CREDS,
    });
    expect(credentialedCrawlFn).toHaveBeenCalledOnce();
    expect(credentialedCrawlFn.mock.calls[0][0]).toBe('https://x/dashboard');
    expect(credentialedCrawlFn.mock.calls[0][1].credentials).toEqual(CREDS);
    expect(r.pages).toHaveLength(3);
    expect(r.pages[2].source).toBe('authed');
    expect(r.authPass.ok).toBe(true);
    expect(r.authPass.pagesAdded).toBe(1);
    expect(r.authGatedCount).toBe(0);
  });

  it('invokes credentialedCrawlFn for multiple auth-gated pages', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [
        { url: 'https://x/dashboard', authGated: true },
        { url: 'https://x/settings', authGated: true },
      ],
    }));
    const credentialedCrawlFn = vi.fn(async (u) => ({
      ok: true, authFailed: false, pages: [{ url: u, authGated: false, bodyText: 'ok' }],
    }));
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn, url: 'https://x/', credentials: CREDS,
    });
    expect(credentialedCrawlFn).toHaveBeenCalledTimes(2);
    expect(r.authPass.pagesAttempted).toBe(2);
    expect(r.authPass.pagesAdded).toBe(2);
  });

  it('MFA challenge → FAIL-LOUD (authPass.ok:false, reason starts with mfa_challenge)', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [{ url: 'https://x/dashboard', authGated: true }],
    }));
    const credentialedCrawlFn = vi.fn(async () => ({
      ok: false, authFailed: true, authFailureReason: 'mfa_challenge_detected',
    }));
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn, url: 'https://x/', credentials: CREDS,
    });
    expect(r.authPass.ok).toBe(false);
    expect(r.authPass.reason).toMatch(/^mfa_challenge:/);
    expect(r.warnings.some((w) => /mfa_challenge_detected/.test(w))).toBe(true);
  });

  it('login_form_not_found → warning, continues to next page', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [
        { url: 'https://x/dashboard', authGated: true },
        { url: 'https://x/settings', authGated: true },
      ],
    }));
    let calls = 0;
    const credentialedCrawlFn = vi.fn(async (u) => {
      calls += 1;
      if (calls === 1) {
        return { ok: false, authFailed: true, authFailureReason: 'login_form_not_found' };
      }
      return { ok: true, authFailed: false, pages: [{ url: u, authGated: false, bodyText: 'ok' }] };
    });
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn, url: 'https://x/', credentials: CREDS,
    });
    expect(credentialedCrawlFn).toHaveBeenCalledTimes(2);
    expect(r.authPass.pagesAdded).toBe(1);                          // second page succeeded
    expect(r.warnings.some((w) => /login_form_not_found/.test(w))).toBe(true);
  });

  it('credentialedCrawlFn throws → warning, continues', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [
        { url: 'https://x/a', authGated: true },
        { url: 'https://x/b', authGated: true },
      ],
    }));
    let calls = 0;
    const credentialedCrawlFn = vi.fn(async (u) => {
      calls += 1;
      if (calls === 1) throw new Error('connection refused');
      return { ok: true, authFailed: false, pages: [{ url: u, authGated: false }] };
    });
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn, url: 'https://x/', credentials: CREDS,
    });
    expect(r.warnings.some((w) => /connection refused/.test(w))).toBe(true);
    expect(r.authPass.pagesAdded).toBe(1);
  });

  it('no credentialedCrawlFn wired → authPass surfaces "no_executor_wired"', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [{ url: 'https://x/dashboard', authGated: true }],
    }));
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn: null, url: 'https://x/', credentials: CREDS,
    });
    expect(r.authPass.ok).toBe(false);
    expect(r.authPass.reason).toBe('no_executor_wired');
    expect(r.warnings.some((w) => /authenticated_traversal_skipped/.test(w))).toBe(true);
  });
});

describe('conductWithAuthFlow — credential scrub discipline', () => {
  it('scrubs credentials from warnings before return', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [{ url: 'https://x/dashboard', authGated: true }],
    }));
    const credentialedCrawlFn = vi.fn(async () => {
      throw new Error(`unexpected token: ${CREDS.password}`);
    });
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn, url: 'https://x/', credentials: CREDS,
    });
    // Credentials must not appear verbatim in any warning string.
    for (const w of r.warnings) {
      expect(typeof w === 'string' && w.includes(CREDS.password)).toBe(false);
      expect(typeof w === 'string' && w.includes(CREDS.email)).toBe(false);
    }
  });

  it('scrubs credentials from MFA-failure warnings', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [{ url: 'https://x/dashboard', authGated: true }],
    }));
    const credentialedCrawlFn = vi.fn(async () => ({
      ok: false, authFailed: true,
      authFailureReason: `mfa: prompted ${CREDS.email}`,
    }));
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn, url: 'https://x/', credentials: CREDS,
    });
    for (const w of r.warnings) {
      if (typeof w !== 'string') continue;
      expect(w.includes(CREDS.email)).toBe(false);
    }
  });

  it('scrubs credentials embedded in added page records', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith({
      pages: [{ url: 'https://x/dashboard', authGated: true }],
    }));
    const credentialedCrawlFn = vi.fn(async () => ({
      ok: true, authFailed: false,
      pages: [{
        url: 'https://x/dashboard', authGated: false,
        bodyText: `Welcome ${CREDS.email}!`,
        title: `Hello ${CREDS.email}`,
      }],
    }));
    const r = await conductWithAuthFlow({
      unauthCrawl, credentialedCrawlFn, url: 'https://x/', credentials: CREDS,
    });
    const authedPage = r.pages.find((p) => p.url === 'https://x/dashboard' && !p.authGated);
    expect(authedPage.bodyText.includes(CREDS.email)).toBe(false);
    expect(authedPage.title.includes(CREDS.email)).toBe(false);
  });
});

describe('conductWithAuthFlow — boundary errors', () => {
  it('rejects malformed credentials at the boundary', async () => {
    const unauthCrawl = vi.fn(async () => unauthReportWith());
    const r = await conductWithAuthFlow({
      unauthCrawl, url: 'https://x/',
      credentials: { email: 'only-email' },
    });
    expect(r.authPass.ok).toBe(false);
    expect(r.authPass.reason).toMatch(/credentials_invalid:/);
  });

  it('missing unauthCrawl → returns explicit error envelope (no throw)', async () => {
    const r = await conductWithAuthFlow({ url: 'https://x/' });
    expect(r.ok).toBe(false);
    expect(r.errors[0].reason).toBe('unauthCrawl_required');
  });

  it('handles unauthCrawl returning non-object gracefully', async () => {
    const r = await conductWithAuthFlow({
      unauthCrawl: async () => null, url: 'https://x/',
    });
    expect(r.ok).toBe(false);
  });
});

// ── Agent21.conductCrawlWithAuth wire-in ─────────────────────────────────

describe('Agent21AggressiveCrawlConductor.conductCrawlWithAuth (wire-in)', () => {
  it('exposes conductCrawlWithAuth on the prototype', async () => {
    const mod = await import('../src/lib/agents/agents/Agent21AggressiveCrawlConductor.js');
    expect(typeof mod.Agent21AggressiveCrawlConductor.prototype.conductCrawlWithAuth)
      .toBe('function');
  });

  it('routes the unauth pass through conductCrawl + applies authPass shape', async () => {
    const mod = await import('../src/lib/agents/agents/Agent21AggressiveCrawlConductor.js');
    const conductor = Object.create(mod.Agent21AggressiveCrawlConductor.prototype);
    conductor.conductCrawl = vi.fn(async () => ({
      ok: true,
      pages: [{ url: 'https://x/dashboard', authGated: true }],
      pagesCrawled: 1,
      authGatedCount: 1,
      warnings: [], errors: [],
    }));
    const credentialedCrawlFn = vi.fn(async (u) => ({
      ok: true, authFailed: false,
      pages: [{ url: u, authGated: false, bodyText: 'inside' }],
    }));
    const r = await conductor.conductCrawlWithAuth('https://x/', {
      credentials: CREDS, credentialedCrawlFn,
    });
    expect(conductor.conductCrawl).toHaveBeenCalledOnce();
    expect(r.authPass.ok).toBe(true);
    expect(r.authPass.pagesAdded).toBe(1);
    expect(r.pages).toHaveLength(2);
  });

  it('passes depth / maxPages / force through to conductCrawl', async () => {
    const mod = await import('../src/lib/agents/agents/Agent21AggressiveCrawlConductor.js');
    const conductor = Object.create(mod.Agent21AggressiveCrawlConductor.prototype);
    conductor.conductCrawl = vi.fn(async () => ({ ok: true, pages: [], pagesCrawled: 0, authGatedCount: 0 }));
    await conductor.conductCrawlWithAuth('https://x/', {
      depth: 4, maxPages: 17, force: 'browserless',
    });
    const callOpts = conductor.conductCrawl.mock.calls[0][1];
    expect(callOpts).toEqual({ depth: 4, maxPages: 17, force: 'browserless' });
  });

  it('without credentials falls through to plain unauth crawl', async () => {
    const mod = await import('../src/lib/agents/agents/Agent21AggressiveCrawlConductor.js');
    const conductor = Object.create(mod.Agent21AggressiveCrawlConductor.prototype);
    conductor.conductCrawl = vi.fn(async () => ({
      ok: true, pages: [{ url: 'https://x/', authGated: false }],
      pagesCrawled: 1, authGatedCount: 0, warnings: [], errors: [],
    }));
    const r = await conductor.conductCrawlWithAuth('https://x/', {});
    expect(r.authPass).toBeNull();
  });
});
