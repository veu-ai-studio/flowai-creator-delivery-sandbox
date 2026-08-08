// tests/agents/renewal/vercelBranchDeploy.test.js
//
// Test surface for src/lib/agents/renewal/vercelBranchDeploy.js
// (Self-Renewal Module 6 — Vercel branch deploy).
//
// All tests inject a mock fetch + mock sleep so the 5 s × 60-poll
// (300 s) budget short-circuits to milliseconds. Mocks record the URLs +
// Authorization headers so the suite can verify the token never leaks
// into URL strings AND is sent correctly on every call.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deployBranchPreview, __internals } from '../../../src/lib/agents/renewal/vercelBranchDeploy.js';

const TOKEN = 'vrcl_TEST_DEPLOY_TOKEN_SHOULD_NEVER_APPEAR_IN_LOGS_xxxxxxxxxxxxxx';
const HAPPY_ARGS = Object.freeze({
  projectId: 'prj_TEST_PROJECT_ID',
  orgId: 'team_TEST_ORG_ID',
  owner: 'veu-ai-studio',
  repo: 'my-preg-life',
  branchName: 'flowai/renewal-test123',
  token: TOKEN,
});

const DEPLOYMENT_ID = 'dpl_TEST_DEPLOYMENT_ID_1234567890';
const PREVIEW_URL = 'my-preg-life-flowai-renewal-test123-veu-ai-studio.vercel.app';
const INSPECTOR_URL = `https://vercel.com/${HAPPY_ARGS.owner}/${HAPPY_ARGS.repo}/${DEPLOYMENT_ID}`;

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

/** No-op sleep so poll loops run synchronously in tests. The mock is
 *  module-level for convenience but reset in beforeEach so per-test
 *  call-count assertions are accurate. */
const fastSleep = vi.fn(async () => undefined);

beforeEach(() => {
  fastSleep.mockClear();
});

const deploymentResponse = (state, extra = {}) => ({
  id: DEPLOYMENT_ID,
  url: PREVIEW_URL,
  inspectorUrl: INSPECTOR_URL,
  readyState: state,
  ...extra,
});

// ── Happy path ───────────────────────────────────────────────────────────────

describe('deployBranchPreview — happy path', () => {
  it('aborts a long polling deployment immediately without another network boundary', async () => {
    const controller = new AbortController();
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('BUILDING') },
    ]);
    const abortingSleep = vi.fn(async (_ms, signal) => {
      expect(signal).toBe(controller.signal);
      controller.abort();
    });

    await expect(deployBranchPreview({
      ...HAPPY_ARGS,
      signal: controller.signal,
      opts: { fetch: fetchMock, sleep: abortingSleep },
    })).rejects.toMatchObject({ code: 'RUN_CANCELLED', stage: 'vercel_deploy' });
    expect(fetchMock.calls).toHaveLength(1);
    expect(fetchMock.calls[0].init.signal).toBe(controller.signal);
  });

  it('returns { deploymentId, previewUrl, inspectorUrl } when deployment reaches READY via polling', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('INITIALIZING') },  // POST create
      { status: 200, body: deploymentResponse('BUILDING') },       // 1st poll
      { status: 200, body: deploymentResponse('BUILDING') },       // 2nd poll
      { status: 200, body: deploymentResponse('READY') },          // 3rd poll → success
    ]);
    const result = await deployBranchPreview({
      ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep },
    });
    expect(result.deploymentId).toBe(DEPLOYMENT_ID);
    expect(result.previewUrl).toBe(`https://${PREVIEW_URL}`);
    expect(result.inspectorUrl).toBe(INSPECTOR_URL);
    expect(fetchMock.calls.length).toBe(4);  // 1 create + 3 polls
  });

  it('returns immediately if creation returns readyState=READY (no polls needed)', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('READY') },
    ]);
    const result = await deployBranchPreview({
      ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep },
    });
    expect(result.deploymentId).toBe(DEPLOYMENT_ID);
    expect(result.previewUrl).toBe(`https://${PREVIEW_URL}`);
    expect(fetchMock.calls.length).toBe(1);  // POST only — no polls
    expect(fastSleep).not.toHaveBeenCalled();
  });

  it('POSTs to /v13/deployments?teamId=<orgId> with correct body shape', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('READY') },
    ]);
    await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
    expect(fetchMock.calls[0].url).toBe(`https://api.vercel.com/v13/deployments?teamId=${HAPPY_ARGS.orgId}`);
    expect(fetchMock.calls[0].init.method).toBe('POST');
    const postBody = JSON.parse(fetchMock.calls[0].init.body);
    // NOTE: NO `target` field — Vercel /v13/deployments rejects
    // `target: 'preview'` with a 400; preview is inferred from absence.
    // Fixed 2026-05-18 (W5b dispatch #12, source commit 6ea928a).
    expect(postBody).toEqual({
      name: HAPPY_ARGS.repo,
      project: HAPPY_ARGS.projectId,
      gitSource: {
        type: 'github',
        org: HAPPY_ARGS.owner,
        repo: HAPPY_ARGS.repo,
        ref: HAPPY_ARGS.branchName,
      },
    });
    expect(postBody.target).toBeUndefined();
  });

  it('uploads an inline build artifact to the bound preview project without gitSource', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('READY') },
    ]);
    await deployBranchPreview({
      ...HAPPY_ARGS,
      files: [{ path: 'index.html', content: '<h1>accepted build</h1>' }],
      opts: { fetch: fetchMock, sleep: fastSleep },
    });
    const postBody = JSON.parse(fetchMock.calls[0].init.body);
    expect(postBody.project).toBe(HAPPY_ARGS.projectId);
    expect(postBody.gitSource).toBeUndefined();
    expect(postBody.target).toBeUndefined();
    expect(postBody.files).toEqual([{
      file: 'index.html',
      data: Buffer.from('<h1>accepted build</h1>').toString('base64'),
      encoding: 'base64',
    }]);
  });

  it('rejects production targeting for inline artifacts', async () => {
    await expect(deployBranchPreview({
      ...HAPPY_ARGS,
      target: 'production',
      files: [{ path: 'index.html', content: 'safe preview only' }],
    })).rejects.toMatchObject({ code: 'DEPLOY_FAILED' });
  });

  it('can request production target and returns the stable production alias as previewUrl', async () => {
    const fetchMock = sequencedFetch([
      {
        status: 200,
        body: deploymentResponse('READY', {
          url: 'my-preg-life-abc123-veu-ai-studio.vercel.app',
          alias: [
            'my-preg-life-git-flowai-renewal-test123-veu-ai-studio.vercel.app',
            'my-preg-life-veu-ai-studio.vercel.app',
            'my-preg-life.vercel.app',
          ],
        }),
      },
    ]);
    const result = await deployBranchPreview({
      ...HAPPY_ARGS,
      target: 'production',
      opts: { fetch: fetchMock, sleep: fastSleep },
    });
    const postBody = JSON.parse(fetchMock.calls[0].init.body);
    expect(postBody.target).toBe('production');
    expect(result).toMatchObject({
      deploymentId: DEPLOYMENT_ID,
      previewUrl: 'https://my-preg-life.vercel.app',
      deploymentUrl: 'https://my-preg-life-abc123-veu-ai-studio.vercel.app',
      aliases: [
        'https://my-preg-life-git-flowai-renewal-test123-veu-ai-studio.vercel.app',
        'https://my-preg-life-veu-ai-studio.vercel.app',
        'https://my-preg-life.vercel.app',
      ],
      target: 'production',
    });
  });

  it('returns an absolute preview alias when Vercel omits the deployment url field', async () => {
    const fetchMock = sequencedFetch([{
      status: 200,
      body: deploymentResponse('READY', {
        url: '',
        alias: ['flowai-git-safe-preview-veu-ai-studio.vercel.app'],
      }),
    }]);
    const result = await deployBranchPreview({
      ...HAPPY_ARGS,
      opts: { fetch: fetchMock, sleep: fastSleep },
    });
    expect(result.previewUrl).toBe('https://flowai-git-safe-preview-veu-ai-studio.vercel.app');
  });

  it('GET polls hit /v13/deployments/{id}?teamId=<orgId> with no body', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('BUILDING') },
      { status: 200, body: deploymentResponse('READY') },
    ]);
    await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
    expect(fetchMock.calls[1].url).toBe(
      `https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${HAPPY_ARGS.orgId}`,
    );
    expect(fetchMock.calls[1].init.method).toBe('GET');
    expect(fetchMock.calls[1].init.body).toBeUndefined();
  });

  it('includes Authorization: Bearer <token> on every call', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('BUILDING') },
      { status: 200, body: deploymentResponse('READY') },
    ]);
    await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
    for (const c of fetchMock.calls) {
      expect(c.init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    }
  });

  it('sleeps 5000 ms between polls', async () => {
    const sleepMock = vi.fn(async () => undefined);
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('BUILDING') },
      { status: 200, body: deploymentResponse('BUILDING') },
      { status: 200, body: deploymentResponse('READY') },
    ]);
    await deployBranchPreview({
      ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: sleepMock },
    });
    expect(sleepMock).toHaveBeenCalledTimes(2);  // 2 polls before READY
    expect(sleepMock).toHaveBeenCalledWith(5_000);
  });
});

// ── Error: DEPLOY_ERROR (readyState ERROR or CANCELED) ──────────────────────

describe('deployBranchPreview — DEPLOY_ERROR', () => {
  it('throws DEPLOY_ERROR when poll returns readyState=ERROR', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('BUILDING') },
      { status: 200, body: deploymentResponse('ERROR') },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown DEPLOY_ERROR');
    } catch (e) {
      expect(e.code).toBe('DEPLOY_ERROR');
      expect(e.readyState).toBe('ERROR');
      expect(e.deploymentId).toBe(DEPLOYMENT_ID);
      expect(e.message).toMatch(/readyState=ERROR/);
    }
  });

  it('throws DEPLOY_ERROR when poll returns readyState=CANCELED', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('QUEUED') },
      { status: 200, body: deploymentResponse('CANCELED') },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown DEPLOY_ERROR');
    } catch (e) {
      expect(e.code).toBe('DEPLOY_ERROR');
      expect(e.readyState).toBe('CANCELED');
    }
  });

  it('throws DEPLOY_ERROR when creation itself returns readyState=ERROR', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('ERROR') },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown DEPLOY_ERROR');
    } catch (e) {
      expect(e.code).toBe('DEPLOY_ERROR');
      expect(e.readyState).toBe('ERROR');
    }
  });
});

// ── Error: DEPLOY_TIMEOUT ────────────────────────────────────────────────────

describe('deployBranchPreview — DEPLOY_TIMEOUT', () => {
  it('throws DEPLOY_TIMEOUT after 60 polls without reaching READY', async () => {
    // 1 POST + 60 polls = 61 fetches, all in non-terminal states.
    const responses = [{ status: 200, body: deploymentResponse('BUILDING') }];
    for (let i = 0; i < 60; i += 1) {
      responses.push({ status: 200, body: deploymentResponse('BUILDING') });
    }
    const fetchMock = sequencedFetch(responses);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown DEPLOY_TIMEOUT');
    } catch (e) {
      expect(e.code).toBe('DEPLOY_TIMEOUT');
      expect(e.deploymentId).toBe(DEPLOYMENT_ID);
      expect(e.attempts).toBe(60);
      expect(e.lastReadyState).toBe('BUILDING');
      expect(e.message).toMatch(/did not reach READY within 300000 ms/);
    }
  });

  it('poll count is bounded at max 60 — does NOT exceed even with unbounded mock', async () => {
    // Provide many more responses than 60 — the function must stop polling.
    const responses = [{ status: 200, body: deploymentResponse('BUILDING') }];
    for (let i = 0; i < 200; i += 1) {
      responses.push({ status: 200, body: deploymentResponse('BUILDING') });
    }
    const fetchMock = sequencedFetch(responses);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown DEPLOY_TIMEOUT');
    } catch (e) {
      expect(e.code).toBe('DEPLOY_TIMEOUT');
    }
    // 1 POST + 60 polls — caller must not have issued the 62nd request.
    expect(fetchMock.calls.length).toBe(61);
    expect(fastSleep).toHaveBeenCalledTimes(60);
  });
});

// ── Error: VERCEL_AUTH_FAILED (401 / 403) ───────────────────────────────────

describe('deployBranchPreview — VERCEL_AUTH_FAILED', () => {
  it('throws VERCEL_AUTH_FAILED on 401 from POST', async () => {
    const fetchMock = sequencedFetch([
      { status: 401, statusText: 'Unauthorized', body: { error: { message: 'Bad token' } } },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('VERCEL_AUTH_FAILED');
    }
  });

  it('throws VERCEL_AUTH_FAILED on 403 from POST', async () => {
    const fetchMock = sequencedFetch([
      { status: 403, statusText: 'Forbidden', body: { error: { message: 'Not a member of team' } } },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('VERCEL_AUTH_FAILED');
    }
  });

  it('throws VERCEL_AUTH_FAILED on 401 from poll GET', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('BUILDING') },
      { status: 401, statusText: 'Unauthorized', body: { error: { message: 'Token revoked mid-poll' } } },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('VERCEL_AUTH_FAILED');
    }
  });
});

// ── Error: DEPLOY_FAILED (creation non-2xx not 401/403) ─────────────────────

describe('deployBranchPreview — DEPLOY_FAILED', () => {
  it('throws DEPLOY_FAILED on 500 from POST', async () => {
    const fetchMock = sequencedFetch([
      { status: 500, statusText: 'Internal Server Error', body: { error: { message: 'oops' } } },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('DEPLOY_FAILED');
      expect(e.status).toBe(500);
    }
  });

  it('throws DEPLOY_FAILED on 400 (bad request)', async () => {
    const fetchMock = sequencedFetch([
      { status: 400, statusText: 'Bad Request', body: { error: { message: 'project not found' } } },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('DEPLOY_FAILED');
      expect(e.status).toBe(400);
    }
  });

  it('throws DEPLOY_FAILED when POST returns 200 without an id field', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: { readyState: 'BUILDING' /* no id */ } },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('DEPLOY_FAILED');
      expect(e.message).toMatch(/lacks deployment id/);
    }
  });
});

// ── Critical security invariant: token never logged or surfaced ─────────────

describe('deployBranchPreview — token never appears in any output', () => {
  it('happy path produces no console output containing the token', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const fetchMock = sequencedFetch([
        { status: 200, body: deploymentResponse('READY') },
      ]);
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
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
      { status: 500, statusText: 'ISE', body: { error: { message: 'oops' } } },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.message).not.toContain(TOKEN);
      expect(JSON.stringify(e)).not.toContain(TOKEN);
    }
  });

  it('URL strings (built into error metadata) do NOT contain the token', async () => {
    const fetchMock = sequencedFetch([
      { status: 200, body: deploymentResponse('READY') },
    ]);
    await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
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

  it('auth-failure error path still does not contain the token', async () => {
    const fetchMock = sequencedFetch([
      { status: 401, statusText: 'Unauthorized', body: { error: { message: 'Bad token' } } },
    ]);
    try {
      await deployBranchPreview({ ...HAPPY_ARGS, opts: { fetch: fetchMock, sleep: fastSleep } });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.message).not.toContain(TOKEN);
      expect(JSON.stringify(e)).not.toContain(TOKEN);
    }
  });
});

// ── Arg validation ──────────────────────────────────────────────────────────

describe('deployBranchPreview — arg validation', () => {
  it('throws when any required string arg is missing', async () => {
    const required = ['projectId', 'orgId', 'owner', 'repo', 'branchName', 'token'];
    for (const k of required) {
      const args = { ...HAPPY_ARGS, opts: { fetch: vi.fn(), sleep: fastSleep } };
      delete args[k];
      try {
        await deployBranchPreview(args);
        expect.unreachable(`should have thrown for missing ${k}`);
      } catch (e) {
        expect(e.code).toBe('DEPLOY_FAILED');
        expect(e.message).toMatch(new RegExp(`${k} must be a non-empty string`));
      }
    }
  });

  it('throws when args is not an object', async () => {
    await expect(deployBranchPreview(null)).rejects.toThrow(/args object required/);
    await expect(deployBranchPreview('string')).rejects.toThrow(/args object required/);
  });
});

// ── Internal helper coverage ────────────────────────────────────────────────

describe('classifyStatus', () => {
  it('maps 401 → VERCEL_AUTH_FAILED', () => {
    expect(__internals.classifyStatus(401, 'OTHER')).toBe('VERCEL_AUTH_FAILED');
  });
  it('maps 403 → VERCEL_AUTH_FAILED', () => {
    expect(__internals.classifyStatus(403, 'OTHER')).toBe('VERCEL_AUTH_FAILED');
  });
  it('passes other statuses through to the fallback', () => {
    expect(__internals.classifyStatus(500, 'DEPLOY_FAILED')).toBe('DEPLOY_FAILED');
    expect(__internals.classifyStatus(400, 'DEPLOY_FAILED')).toBe('DEPLOY_FAILED');
  });
});

describe('module constants', () => {
  it('exposes the 5 s × 60-poll budget the dispatch spec named', () => {
    expect(__internals.DEPLOY_POLL_INTERVAL_MS).toBe(5_000);
    expect(__internals.DEPLOY_POLL_MAX_ATTEMPTS).toBe(60);
    expect(__internals.DEPLOY_POLL_TIMEOUT_MS).toBe(300_000);
  });
  it('uses the canonical Vercel API base', () => {
    expect(__internals.VERCEL_API_BASE).toBe('https://api.vercel.com');
  });
});
