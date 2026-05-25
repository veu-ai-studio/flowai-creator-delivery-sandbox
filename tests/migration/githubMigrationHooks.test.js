import { describe, expect, it, vi } from 'vitest';
import {
  createGithubMigrationHooks,
  __githubMigrationHooksInternals,
} from '../../src/lib/migration/githubMigrationHooks.js';

function jsonResponse(body, status = 200) {
  return {
    status,
    statusText: status === 200 || status === 201 ? 'OK' : 'Error',
    text: async () => JSON.stringify(body),
  };
}

function createFetchMock() {
  const calls = [];
  const fetchImpl = vi.fn(async (url, options = {}) => {
    calls.push({ url, options });
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (options.method === 'GET' && path === '/repos/veu-ai-studio/saige-v2') {
      return jsonResponse({ default_branch: 'main' });
    }
    if (options.method === 'GET' && path === '/repos/veu-ai-studio/saige-v2/git/ref/heads/main') {
      return jsonResponse({ object: { sha: 'base-sha' } });
    }
    if (options.method === 'POST' && path === '/repos/veu-ai-studio/saige-v2/git/refs') {
      return jsonResponse({ ref: 'refs/heads/flowai/migration-saige-1700000000000-run12345' }, 201);
    }
    if (options.method === 'GET' && path === '/repos/veu-ai-studio/saige-v2/git/trees/flowai%2Fmigration-saige-1700000000000-run12345') {
      return jsonResponse({
        tree: [
          { type: 'blob', path: 'src/App.jsx' },
          { type: 'tree', path: 'src' },
          { type: 'blob', path: 'node_modules/bad.js' },
        ],
      });
    }
    if (options.method === 'GET' && path === '/repos/veu-ai-studio/saige-v2/contents/src/App.jsx') {
      return jsonResponse({
        sha: 'file-sha',
        content: Buffer.from('import sdk from "@base44/sdk";\n').toString('base64'),
      });
    }
    if (options.method === 'PUT' && path === '/repos/veu-ai-studio/saige-v2/contents/src/App.jsx') {
      return jsonResponse({ commit: { sha: 'commit-sha' } });
    }
    return jsonResponse({ message: `unhandled ${options.method} ${path}` }, 500);
  });
  return { fetchImpl, calls };
}

function createFailingPutFetchMock() {
  const { fetchImpl, calls } = createFetchMock();
  const wrapped = vi.fn(async (url, options = {}) => {
    const parsed = new URL(url);
    if (options.method === 'PUT' && parsed.pathname === '/repos/veu-ai-studio/saige-v2/contents/src/App.jsx') {
      calls.push({ url, options });
      return jsonResponse({
        message: 'Invalid request.\n\n"sha" was not supplied.',
        errors: [{ resource: 'Commit', field: 'sha', code: 'missing_field' }],
      }, 422);
    }
    return fetchImpl(url, options);
  });
  return { fetchImpl: wrapped, calls };
}

describe('githubMigrationHooks', () => {
  it('creates a target migration branch with idempotent naming metadata', async () => {
    const { fetchImpl, calls } = createFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'token',
      fetchImpl,
      now: () => 1700000000000,
    });

    expect(result.ok).toBe(true);
    expect(result.deps).toMatchObject({
      migrationBranch: 'flowai/migration-saige-1700000000000-run12345',
      targetRepoFullName: 'veu-ai-studio/saige-v2',
      branchUrl: 'https://github.com/veu-ai-studio/saige-v2/tree/flowai/migration-saige-1700000000000-run12345',
    });
    const branchCreate = calls.find((call) => call.options.method === 'POST');
    expect(branchCreate.url).toContain('/repos/veu-ai-studio/saige-v2/git/refs');
    expect(JSON.parse(branchCreate.options.body)).toEqual({
      ref: 'refs/heads/flowai/migration-saige-1700000000000-run12345',
      sha: 'base-sha',
    });
  });

  it('lists target repo files through the Trees API and omits forbidden paths', async () => {
    const { fetchImpl } = createFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'token',
      fetchImpl,
      now: () => 1700000000000,
    });

    await expect(result.deps.scanFiles()).resolves.toEqual([{ file: 'src/App.jsx' }]);
  });

  it('reads files with Contents API and decodes base64', async () => {
    const { fetchImpl } = createFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'token',
      fetchImpl,
      now: () => 1700000000000,
    });

    await expect(result.deps.readFile('src/App.jsx')).resolves.toBe('import sdk from "@base44/sdk";\n');
  });

  it('commits full replacement files only to the target migration branch', async () => {
    const { fetchImpl, calls } = createFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'token',
      fetchImpl,
      now: () => 1700000000000,
    });

    await result.deps.writeFile('src/App.jsx', 'replacement');
    const putCall = calls.find((call) => call.options.method === 'PUT');
    expect(putCall.url).toContain('/repos/veu-ai-studio/saige-v2/contents/src/App.jsx');
    expect(putCall.url).not.toContain('/repos/veu-ai-studio/saige/');
    expect(JSON.parse(putCall.options.body)).toMatchObject({
      branch: 'flowai/migration-saige-1700000000000-run12345',
      content: Buffer.from('replacement').toString('base64'),
      sha: 'file-sha',
    });
  });

  it('reuses the previously fetched file SHA in PUT body without a second read', async () => {
    const { fetchImpl, calls } = createFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'token',
      fetchImpl,
      now: () => 1700000000000,
    });

    await result.deps.writeFile('src/App.jsx', 'replacement');
    const fileReads = calls.filter((call) => (
      call.options.method === 'GET' &&
      new URL(call.url).pathname === '/repos/veu-ai-studio/saige-v2/contents/src/App.jsx'
    ));
    const putCall = calls.find((call) => call.options.method === 'PUT');

    expect(fileReads).toHaveLength(1);
    expect(JSON.parse(putCall.options.body).sha).toBe('file-sha');
  });

  it('surfaces sanitized GitHub PUT response details without leaking token values', async () => {
    const { fetchImpl } = createFailingPutFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'ghp_secret_token_value',
      fetchImpl,
      now: () => 1700000000000,
    });

    let thrown;
    try {
      await result.deps.writeFile('src/App.jsx', 'replacement');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: 'GITHUB_API_ERROR',
      status: 422,
      statusText: 'Error',
      githubMessage: 'Invalid request.\n\n"sha" was not supplied.',
      githubErrors: [{ resource: 'Commit', field: 'sha', code: 'missing_field' }],
    });
    const serialized = JSON.stringify({
      message: thrown.message,
      fields: Object.fromEntries(Object.entries(thrown)),
    });
    expect(serialized).not.toContain('ghp_secret_token_value');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('Authorization');
  });

  it('rejects path traversal and source-repo style writes', async () => {
    const { fetchImpl } = createFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'token',
      fetchImpl,
      now: () => 1700000000000,
    });

    await expect(result.deps.writeFile('../src/App.jsx', 'bad')).rejects.toMatchObject({ code: 'MIGRATION_PATH_REJECTED' });
    await expect(result.deps.writeFile('/src/App.jsx', 'bad')).rejects.toMatchObject({ code: 'MIGRATION_PATH_REJECTED' });
    await expect(result.deps.writeFile('.git/config', 'bad')).rejects.toMatchObject({ code: 'MIGRATION_PATH_REJECTED' });
    await expect(result.deps.writeFile('node_modules/pkg/index.js', 'bad')).rejects.toMatchObject({ code: 'MIGRATION_PATH_REJECTED' });
  });

  it('restores captured original content on the migration branch', async () => {
    const { fetchImpl, calls } = createFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'token',
      fetchImpl,
      now: () => 1700000000000,
    });

    await result.deps.writeFile('src/App.jsx', 'replacement');
    await result.deps.restoreFile('src/App.jsx');
    const putBodies = calls
      .filter((call) => call.options.method === 'PUT')
      .map((call) => JSON.parse(call.options.body));
    expect(Buffer.from(putBodies.at(-1).content, 'base64').toString('utf8')).toBe('import sdk from "@base44/sdk";\n');
  });

  it('returns GITHUB_AUTH_REQUIRED when token is missing and verification is honest when unwired', async () => {
    const missing = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: '',
    });
    expect(missing).toMatchObject({
      ok: false,
      message: 'GITHUB_AUTH_REQUIRED',
      blockers: [{ reason: 'GITHUB_AUTH_REQUIRED' }],
    });

    const { fetchImpl } = createFetchMock();
    const result = await createGithubMigrationHooks({
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
      productName: 'SAIGE',
      runId: 'run123456789',
      token: 'token',
      fetchImpl,
      now: () => 1700000000000,
    });
    await expect(result.deps.verifyBuild()).resolves.toMatchObject({
      ok: false,
      reason: 'GITHUB_ACTIONS_CHECK_NOT_WIRED',
      degraded: true,
    });
    await expect(result.deps.runFocusedTests()).resolves.toMatchObject({
      ok: false,
      passed: 0,
      reason: 'GITHUB_ACTIONS_CHECK_NOT_WIRED',
      degraded: true,
    });
  });

  it('exposes repo-relative validation internals for regression coverage', () => {
    expect(__githubMigrationHooksInternals.validateRepoRelativePath('src/App.jsx')).toBe('src/App.jsx');
    expect(() => __githubMigrationHooksInternals.validateRepoRelativePath('C:/repo/file.js')).toThrow(/repo-relative/);
  });
});
