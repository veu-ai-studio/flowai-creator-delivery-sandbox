// tests/agents/renewal/githubBranchWriter.test.js
//
// Test surface for src/lib/agents/renewal/githubBranchWriter.js
// (Self-Renewal §4.3 branch + single-file commit).
//
// All tests inject a mock fetch that responds in sequence to the 4
// GitHub API calls the module makes (GET ref → POST refs → GET contents
// → PUT contents). The mock records the URLs + Authorization headers
// so the test suite can verify the token never leaks into URL strings
// AND the token is sent correctly on every call.

import { describe, it, expect, vi } from 'vitest';
import { createRenewalBranch, __internals } from '../../../src/lib/agents/renewal/githubBranchWriter.js';

const TOKEN = 'ghs_TEST_INSTALLATION_TOKEN_SHOULD_NEVER_APPEAR_IN_LOGS_xxxxxxxxxx';
const HAPPY_ARGS = Object.freeze({
  owner: 'veu-ai-studio',
  repo: 'my-preg-life',
  baseBranch: 'main',
  branchName: 'flowai/renewal-test123',
  filePath: 'src/components/Home.jsx',
  fileContent: 'export default function Home() { return <div>Hello</div>; }\n',
  commitMessage: 'fix: defensive null-check on user list',
  token: TOKEN,
});

const BASE_SHA = 'abc123def4567890abc123def4567890abc12345';
const FILE_SHA = '999aaa111bbb222ccc333ddd444eee555fff6666';
const COMMIT_SHA = 'newcommit1234567890abcdef1234567890abcdef';

/**
 * Build a sequenced fetch mock. Each call returns the next entry from
 * `responses`. If the test runs out of entries the test fails loudly.
 */
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

const happyResponses = () => [
  // 1. GET ref
  { status: 200, statusText: 'OK', body: { object: { sha: BASE_SHA, type: 'commit' } } },
  // 2. POST refs
  { status: 201, statusText: 'Created', body: { ref: `refs/heads/${HAPPY_ARGS.branchName}` } },
  // 3. GET contents
  { status: 200, statusText: 'OK', body: { sha: FILE_SHA, path: HAPPY_ARGS.filePath, type: 'file' } },
  // 4. PUT contents
  { status: 200, statusText: 'OK', body: { commit: { sha: COMMIT_SHA } } },
];

// ── Happy path ───────────────────────────────────────────────────────────────

describe('createRenewalBranch — happy path', () => {
  it('returns { branchName, commitSha, branchUrl }', async () => {
    const fetchMock = sequencedFetch(happyResponses());
    const result = await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    expect(result.branchName).toBe(HAPPY_ARGS.branchName);
    expect(result.commitSha).toBe(COMMIT_SHA);
    expect(result.branchUrl).toBe(
      `https://github.com/${HAPPY_ARGS.owner}/${HAPPY_ARGS.repo}/tree/${HAPPY_ARGS.branchName}`,
    );
  });

  it('makes exactly 4 GitHub API calls in the correct order', async () => {
    const fetchMock = sequencedFetch(happyResponses());
    await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    expect(fetchMock.calls.length).toBe(4);
    expect(fetchMock.calls[0].url).toMatch(/\/git\/ref\/heads\/main$/);
    expect(fetchMock.calls[0].init.method).toBe('GET');
    expect(fetchMock.calls[1].url).toMatch(/\/git\/refs$/);
    expect(fetchMock.calls[1].init.method).toBe('POST');
    expect(fetchMock.calls[2].url).toMatch(/\/contents\/src\/components\/Home\.jsx\?ref=flowai%2Frenewal-test123$/);
    expect(fetchMock.calls[2].init.method).toBe('GET');
    expect(fetchMock.calls[3].url).toMatch(/\/contents\/src\/components\/Home\.jsx$/);
    expect(fetchMock.calls[3].init.method).toBe('PUT');
  });

  it('includes Authorization: Bearer <token> on every call', async () => {
    const fetchMock = sequencedFetch(happyResponses());
    await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    for (const c of fetchMock.calls) {
      expect(c.init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
      expect(c.init.headers['X-GitHub-Api-Version']).toBe('2022-11-28');
      expect(c.init.headers.Accept).toBe('application/vnd.github+json');
    }
  });

  it('sends new branch ref + base SHA on the POST refs call', async () => {
    const fetchMock = sequencedFetch(happyResponses());
    await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    const postBody = JSON.parse(fetchMock.calls[1].init.body);
    expect(postBody.ref).toBe(`refs/heads/${HAPPY_ARGS.branchName}`);
    expect(postBody.sha).toBe(BASE_SHA);
  });

  it('PUT contents includes base64 content, file SHA, branch, and commit message', async () => {
    const fetchMock = sequencedFetch(happyResponses());
    await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    const putBody = JSON.parse(fetchMock.calls[3].init.body);
    expect(putBody.message).toBe(HAPPY_ARGS.commitMessage);
    expect(putBody.sha).toBe(FILE_SHA);
    expect(putBody.branch).toBe(HAPPY_ARGS.branchName);
    expect(Buffer.from(putBody.content, 'base64').toString('utf8')).toBe(HAPPY_ARGS.fileContent);
    expect(putBody.committer).toEqual({ name: 'FlowAI Self-Renewal', email: 'self-renewal@flowai.local' });
  });
});

// ── Error: branch already exists ─────────────────────────────────────────────

describe('createRenewalBranch — BRANCH_EXISTS', () => {
  it('throws BRANCH_EXISTS when POST refs returns 422 "Reference already exists"', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: { object: { sha: BASE_SHA, type: 'commit' } } },
      { status: 422, statusText: 'Unprocessable Entity',
        body: { message: 'Reference already exists', documentation_url: '...' } },
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown BRANCH_EXISTS');
    } catch (e) {
      expect(e.code).toBe('BRANCH_EXISTS');
      expect(e.message).toMatch(/branch "flowai\/renewal-test123" already exists/);
    }
  });

  it('does NOT throw BRANCH_EXISTS for other 422 messages', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: { object: { sha: BASE_SHA, type: 'commit' } } },
      { status: 422, statusText: 'Unprocessable Entity', body: { message: 'Validation Failed: malformed ref' } },
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('GITHUB_API_ERROR');
      expect(e.code).not.toBe('BRANCH_EXISTS');
    }
  });
});

// ── Error: file not found ────────────────────────────────────────────────────

describe('createRenewalBranch — FILE_NOT_FOUND', () => {
  it('throws FILE_NOT_FOUND when GET contents returns 404', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: { object: { sha: BASE_SHA, type: 'commit' } } },
      { status: 201, body: { ref: 'refs/heads/flowai/renewal-test123' } },
      { status: 404, statusText: 'Not Found', body: { message: 'Not Found' } },
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown FILE_NOT_FOUND');
    } catch (e) {
      expect(e.code).toBe('FILE_NOT_FOUND');
      expect(e.message).toMatch(/file ".*Home\.jsx" not found/);
    }
  });

  it('throws FILE_NOT_FOUND when GET ref returns 404 (base branch missing)', async () => {
    const fetchMock = sequencedFetch([
      { status: 404, statusText: 'Not Found', body: { message: 'Branch not found' } },
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown FILE_NOT_FOUND');
    } catch (e) {
      expect(e.code).toBe('FILE_NOT_FOUND');
      expect(e.message).toMatch(/base branch "main" not found/);
    }
  });

  it('throws FILE_NOT_FOUND when GET contents returns a directory (array body)', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: { object: { sha: BASE_SHA, type: 'commit' } } },
      { status: 201, body: { ref: 'refs/heads/flowai/renewal-test123' } },
      { status: 200, body: [{ name: 'a.txt' }, { name: 'b.txt' }] }, // array = directory
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown FILE_NOT_FOUND');
    } catch (e) {
      expect(e.code).toBe('FILE_NOT_FOUND');
      expect(e.message).toMatch(/directory, not a file/);
    }
  });
});

// ── Error: auth failure ──────────────────────────────────────────────────────

describe('createRenewalBranch — GITHUB_AUTH_FAILED', () => {
  it('throws GITHUB_AUTH_FAILED on 401 from GET ref', async () => {
    const fetchMock = sequencedFetch([
      { status: 401, statusText: 'Unauthorized', body: { message: 'Bad credentials' } },
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('GITHUB_AUTH_FAILED');
    }
  });

  it('throws GITHUB_AUTH_FAILED on 403 from POST refs', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: { object: { sha: BASE_SHA, type: 'commit' } } },
      { status: 403, statusText: 'Forbidden', body: { message: 'Resource not accessible by integration' } },
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('GITHUB_AUTH_FAILED');
    }
  });

  it('throws GITHUB_AUTH_FAILED on 401 from PUT contents', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: { object: { sha: BASE_SHA, type: 'commit' } } },
      { status: 201, body: { ref: 'refs/heads/flowai/renewal-test123' } },
      { status: 200, body: { sha: FILE_SHA, path: 'src/components/Home.jsx', type: 'file' } },
      { status: 401, statusText: 'Unauthorized', body: { message: 'Bad credentials' } },
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('GITHUB_AUTH_FAILED');
    }
  });
});

// ── Error: arg validation ────────────────────────────────────────────────────

describe('createRenewalBranch — arg validation', () => {
  it('throws when any required string arg is missing', async () => {
    const required = ['owner', 'repo', 'baseBranch', 'branchName', 'filePath', 'fileContent', 'commitMessage', 'token'];
    for (const k of required) {
      const args = { ...HAPPY_ARGS, opts: { fetch: vi.fn() } };
      delete args[k];
      try {
        await createRenewalBranch(args);
        expect.unreachable(`should have thrown for missing ${k}`);
      } catch (e) {
        expect(e.message).toMatch(new RegExp(`${k} must be a non-empty string`));
      }
    }
  });

  it('rejects malformed branch names', async () => {
    try {
      await createRenewalBranch({
        ...HAPPY_ARGS,
        branchName: 'flowai/renewal with spaces',
        opts: { fetch: vi.fn() },
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.message).toMatch(/branchName.*contains characters outside/);
    }
  });

  it('throws when args is not an object', async () => {
    await expect(createRenewalBranch(null)).rejects.toThrow(/args object required/);
    await expect(createRenewalBranch('string')).rejects.toThrow(/args object required/);
  });
});

// ── Critical security invariant: token never logged or surfaced ──────────────

describe('createRenewalBranch — token never appears in any output', () => {
  it('happy path produces no console output containing the token', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const fetchMock = sequencedFetch(happyResponses());
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
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

  it('error path error messages do NOT contain the token', async () => {
    const fetchMock = sequencedFetch([
      { status: 500, statusText: 'Internal Server Error', body: { message: 'oops' } },
    ]);
    try {
      await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.message).not.toContain(TOKEN);
    }
  });

  it('URL strings (built into error metadata) do NOT contain the token', async () => {
    const fetchMock = sequencedFetch(happyResponses());
    await createRenewalBranch({ ...HAPPY_ARGS, opts: { fetch: fetchMock } });
    for (const c of fetchMock.calls) {
      expect(c.url).not.toContain(TOKEN);
    }
  });

  it('makeError strips token/authorization from extra metadata', () => {
    const err = __internals.makeError('TEST', 'test', {
      status: 401,
      token: 'leaked-token-value',
      authorization: 'Bearer leaked',
      safe: 'ok',
    });
    expect(err.status).toBe(401);
    expect(err.safe).toBe('ok');
    expect(err.token).toBeUndefined();
    expect(err.authorization).toBeUndefined();
  });
});

// ── Internal helper coverage ─────────────────────────────────────────────────

describe('classifyStatus', () => {
  it('maps 401 → GITHUB_AUTH_FAILED', () => {
    expect(__internals.classifyStatus(401, 'OTHER')).toBe('GITHUB_AUTH_FAILED');
  });
  it('maps 403 → GITHUB_AUTH_FAILED', () => {
    expect(__internals.classifyStatus(403, 'OTHER')).toBe('GITHUB_AUTH_FAILED');
  });
  it('passes other statuses through to the fallback', () => {
    expect(__internals.classifyStatus(500, 'GITHUB_API_ERROR')).toBe('GITHUB_API_ERROR');
    expect(__internals.classifyStatus(422, 'OTHER_CODE')).toBe('OTHER_CODE');
  });
});
