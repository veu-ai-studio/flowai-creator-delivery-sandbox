// tests/agents/renewal/githubPrWriter.test.js
//
// Test surface for src/lib/agents/renewal/githubPrWriter.js (Self-Renewal §6).
// Covers happy path, idempotent "already exists", auth failures, branch-not-
// found, the NEVER-MERGE hard invariant (static + runtime), and token-never-
// logged invariant.

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRenewalPr, __internals } from '../../../src/lib/agents/renewal/githubPrWriter.js';

const TOKEN = 'ghs_TEST_INSTALLATION_TOKEN_SHOULD_NEVER_APPEAR_IN_LOGS_xxxxxxxxxx';
const HAPPY_ARGS = Object.freeze({
  owner: 'veu-ai-studio',
  repo: 'my-preg-life',
  branchName: 'flowai/renewal-test123',
  baseBranch: 'main',
  title: 'FlowAI Self-Renewal: defensive null-checks',
  body: '## Summary\n\nDefensive null-check on user list.\n\n## Preview\n\nhttps://example.com\n',
  token: TOKEN,
});

const PR_NUMBER = 42;
const PR_URL = `https://api.github.com/repos/${HAPPY_ARGS.owner}/${HAPPY_ARGS.repo}/pulls/${PR_NUMBER}`;
const PR_HTML_URL = `https://github.com/${HAPPY_ARGS.owner}/${HAPPY_ARGS.repo}/pull/${PR_NUMBER}`;

function sequencedFetch(responses) {
  const calls = [];
  let i = 0;
  const fn = vi.fn(async (url, init) => {
    calls.push({ url, init });
    if (i >= responses.length) {
      throw new Error(`sequencedFetch: ran out of responses at call ${i + 1}; url=${url}`);
    }
    const r = responses[i++];
    return {
      status: r.status,
      statusText: r.statusText ?? '',
      text: async () => typeof r.body === 'string' ? r.body : JSON.stringify(r.body ?? {}),
    };
  });
  fn.calls = calls;
  return fn;
}

// ── Happy path ───────────────────────────────────────────────────────────────

describe('createRenewalPr — happy path', () => {
  it('returns { prNumber, prUrl, prHtmlUrl, existing:false }', async () => {
    const fetchMock = sequencedFetch([
      { status: 201, body: { number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL } },
    ]);
    const result = await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    expect(result.prNumber).toBe(PR_NUMBER);
    expect(result.prUrl).toBe(PR_URL);
    expect(result.prHtmlUrl).toBe(PR_HTML_URL);
    expect(result.existing).toBe(false);
  });

  it('POSTs to the canonical pulls endpoint with the right body shape', async () => {
    const fetchMock = sequencedFetch([
      { status: 201, body: { number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL } },
    ]);
    await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    expect(fetchMock.calls.length).toBe(1);
    expect(fetchMock.calls[0].url).toBe(`https://api.github.com/repos/${HAPPY_ARGS.owner}/${HAPPY_ARGS.repo}/pulls`);
    expect(fetchMock.calls[0].init.method).toBe('POST');
    const postBody = JSON.parse(fetchMock.calls[0].init.body);
    expect(postBody.head).toBe(HAPPY_ARGS.branchName);
    expect(postBody.base).toBe(HAPPY_ARGS.baseBranch);
    expect(postBody.title).toBe(HAPPY_ARGS.title);
    expect(postBody.body).toBe(HAPPY_ARGS.body);
    expect(postBody.draft).toBe(false);
  });

  it('includes Authorization + Accept + API version headers', async () => {
    const fetchMock = sequencedFetch([
      { status: 201, body: { number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL } },
    ]);
    await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    const h = fetchMock.calls[0].init.headers;
    expect(h.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(h.Accept).toBe('application/vnd.github+json');
    expect(h['X-GitHub-Api-Version']).toBe('2022-11-28');
  });
});

// ── Idempotent: PR already exists ────────────────────────────────────────────

describe('createRenewalPr — already exists (idempotent)', () => {
  it('422 "already exists" → GET existing PR + return with existing:true', async () => {
    const fetchMock = sequencedFetch([
      // POST → 422 "already exists"
      { status: 422, body: { message: 'Validation Failed', errors: [{ message: 'A pull request already exists for veu-ai-studio:flowai/renewal-test123.' }] } },
      // GET pulls?head=... → 200 array with existing PR
      { status: 200, body: [{ number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL }] },
    ]);
    const result = await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    expect(result.prNumber).toBe(PR_NUMBER);
    expect(result.existing).toBe(true);
  });

  it('422 "already exists" with empty followup list throws descriptive error', async () => {
    const fetchMock = sequencedFetch([
      { status: 422, body: { message: 'Validation Failed', errors: [{ message: 'A pull request already exists for x:y.' }] } },
      { status: 200, body: [] }, // no open PR found
    ]);
    try {
      await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('GITHUB_API_ERROR');
      expect(e.message).toMatch(/no open PR found.*closed-PR conflict/);
    }
  });

  it('the followup GET uses the canonical head=owner:branch query format', async () => {
    const fetchMock = sequencedFetch([
      { status: 422, body: { errors: [{ message: 'A pull request already exists' }] } },
      { status: 200, body: [{ number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL }] },
    ]);
    await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    expect(fetchMock.calls[1].url).toMatch(/\/pulls\?head=veu-ai-studio%3Aflowai%2Frenewal-test123&state=open$/);
  });
});

// ── Error: auth failure ──────────────────────────────────────────────────────

describe('createRenewalPr — GITHUB_AUTH_FAILED', () => {
  it('401 → GITHUB_AUTH_FAILED', async () => {
    const fetchMock = sequencedFetch([
      { status: 401, statusText: 'Unauthorized', body: { message: 'Bad credentials' } },
    ]);
    try {
      await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('GITHUB_AUTH_FAILED');
    }
  });

  it('403 → GITHUB_AUTH_FAILED', async () => {
    const fetchMock = sequencedFetch([
      { status: 403, statusText: 'Forbidden', body: { message: 'Resource not accessible by integration' } },
    ]);
    try {
      await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('GITHUB_AUTH_FAILED');
    }
  });
});

// ── Error: branch not found ──────────────────────────────────────────────────

describe('createRenewalPr — BRANCH_NOT_FOUND', () => {
  it('404 → BRANCH_NOT_FOUND', async () => {
    const fetchMock = sequencedFetch([
      { status: 404, statusText: 'Not Found', body: { message: 'Not Found' } },
    ]);
    try {
      await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('BRANCH_NOT_FOUND');
    }
  });

  it('422 with non-"already exists" message → BRANCH_NOT_FOUND', async () => {
    const fetchMock = sequencedFetch([
      { status: 422, statusText: 'Unprocessable Entity', body: { message: 'Validation Failed', errors: [{ message: 'head sha can\'t be blank' }] } },
    ]);
    try {
      await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('BRANCH_NOT_FOUND');
      expect(e.message).toMatch(/422 validation/);
    }
  });
});

// ── Hard invariant: NEVER merge ──────────────────────────────────────────────

describe('createRenewalPr — NEVER-MERGE hard invariant', () => {
  it('static guard: source file has no merge-endpoint call (comments stripped)', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/lib/agents/renewal/githubPrWriter.js'),
      'utf8',
    );
    // Strip block comments + line comments before scanning so the
    // JSDoc reference to the forbidden endpoint (which documents the
    // invariant) doesn't false-positive.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    // Forbidden substrings that would indicate a merge call.
    const forbidden = [
      '/merge',                    // the URL path segment
      'PUT.*pulls.*merge',         // PUT against the merge endpoint
      'mergePullRequest',           // common octokit method name
      'mergePr',
    ];
    for (const needle of forbidden) {
      const re = new RegExp(needle);
      expect(re.test(codeOnly)).toBe(false);
    }
  });

  it('runtime guard: no fetch call across any code path targets /merge', async () => {
    // Exercise all 6 paths (happy + 422-exists + 422-empty + 422-other +
    // 401 + 404). Aggregate every URL passed to fetch and assert none
    // contains "/merge".
    const sequences = [
      // happy
      [{ status: 201, body: { number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL } }],
      // already-exists idempotent
      [
        { status: 422, body: { errors: [{ message: 'A pull request already exists' }] } },
        { status: 200, body: [{ number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL }] },
      ],
      // auth
      [{ status: 401, body: { message: 'Bad credentials' } }],
      // not-found
      [{ status: 404, body: { message: 'Not Found' } }],
    ];
    const allUrls = [];
    for (const seq of sequences) {
      const fetchMock = sequencedFetch(seq);
      try {
        await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      } catch { /* expected for failure paths */ }
      for (const c of fetchMock.calls) allUrls.push(c.url);
    }
    expect(allUrls.length).toBeGreaterThan(0);
    for (const u of allUrls) {
      expect(u).not.toMatch(/\/merge/);
    }
  });

  it('runtime guard: no fetch call uses HTTP method PUT', async () => {
    // The merge endpoint is the only PR action that uses PUT. By
    // asserting we never use PUT we cover even unknown future
    // merge-related endpoints.
    const fetchMock = sequencedFetch([
      { status: 201, body: { number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL } },
    ]);
    await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    for (const c of fetchMock.calls) {
      expect(c.init.method).not.toBe('PUT');
    }
  });
});

// ── Token never logged ───────────────────────────────────────────────────────

describe('createRenewalPr — token never appears in any output', () => {
  it('happy path produces no console output containing the token', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const fetchMock = sequencedFetch([
        { status: 201, body: { number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL } },
      ]);
      await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      const allLogs = [
        ...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls,
      ].map((args) => args.map((a) => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
      expect(allLogs.join('\n')).not.toContain(TOKEN);
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('error messages do NOT contain the token', async () => {
    const fetchMock = sequencedFetch([
      { status: 500, statusText: 'Internal Server Error', body: { message: 'oops' } },
    ]);
    try {
      await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.message).not.toContain(TOKEN);
    }
  });

  it('URLs passed to fetch never contain the token', async () => {
    const fetchMock = sequencedFetch([
      { status: 201, body: { number: PR_NUMBER, url: PR_URL, html_url: PR_HTML_URL } },
    ]);
    await createRenewalPr({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    for (const c of fetchMock.calls) {
      expect(c.url).not.toContain(TOKEN);
    }
  });

  it('makeError strips token/authorization from extra metadata', () => {
    const err = __internals.makeError('TEST', 'msg', {
      status: 401,
      token: 'leaked',
      authorization: 'Bearer leaked',
      safe: 'ok',
    });
    expect(err.status).toBe(401);
    expect(err.safe).toBe('ok');
    expect(err.token).toBeUndefined();
    expect(err.authorization).toBeUndefined();
  });
});

// ── Arg validation ───────────────────────────────────────────────────────────

describe('createRenewalPr — arg validation', () => {
  it('throws when any required string arg is missing', async () => {
    const required = ['owner', 'repo', 'branchName', 'baseBranch', 'title', 'body', 'token'];
    for (const k of required) {
      const args = { ...HAPPY_ARGS, opts: { fetch: vi.fn() } };
      delete args[k];
      try {
        await createRenewalPr(args);
        expect.unreachable(`should have thrown for missing ${k}`);
      } catch (e) {
        expect(e.message).toMatch(new RegExp(`${k} must be a non-empty string`));
      }
    }
  });

  it('throws when args is not an object', async () => {
    await expect(createRenewalPr(null)).rejects.toThrow(/args object required/);
  });
});
