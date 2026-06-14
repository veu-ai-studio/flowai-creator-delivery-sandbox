import { describe, expect, it, vi } from 'vitest';
import {
  probePreviewAccess,
  parseGitHubRepoUrl,
  resolveGitHubWriteTokenCandidates,
  writeGeneratedCodebaseToUpgradeRepo,
} from '../../src/lib/freshBuild/freshBuildDeploymentAdapter.js';

function generatedCodebase(overrides = {}) {
  return {
    status: 'READY',
    files: [
      { path: 'package.json', content: JSON.stringify({ scripts: { build: 'vite build' }, dependencies: { react: '^18.2.0' } }) },
      { path: 'src/App.jsx', content: 'export default function App() { return <main>Fresh Build</main>; }' },
      { path: 'vercel.json', content: JSON.stringify({ framework: 'vite' }) },
    ],
    platformDependencies: [],
    ...overrides,
  };
}

function browserClearProbe() {
  return vi.fn(async ({ previewUrl, deploymentId }) => ({
    previewUrl,
    deploymentId,
    previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
    httpStatus: 200,
    reason: null,
  }));
}

function githubJsonResponse(status, body) {
  return {
    status,
    text: vi.fn(async () => JSON.stringify(body)),
  };
}

describe('Fresh Build deployment adapter', () => {
  it('parses supported GitHub repo URL forms', () => {
    expect(parseGitHubRepoUrl('https://github.com/veu-ai-studio/saige-v2')).toEqual({
      owner: 'veu-ai-studio',
      repo: 'saige-v2',
    });
    expect(parseGitHubRepoUrl('git@github.com:veu-ai-studio/saige-v2.git')).toEqual({
      owner: 'veu-ai-studio',
      repo: 'saige-v2',
    });
    expect(parseGitHubRepoUrl('veu-ai-studio/saige-v2')).toEqual({
      owner: 'veu-ai-studio',
      repo: 'saige-v2',
    });
  });

  it('prefers explicit write credentials before ambient GitHub tokens', () => {
    const candidates = resolveGitHubWriteTokenCandidates({
      GITHUB_TOKEN: 'ambient-read-token',
      GITHUB_PAT: 'pat-write-token',
      GITHUB_OPERATOR_TOKEN: 'operator-write-token',
    });

    expect(candidates.map((candidate) => candidate.source)).toEqual([
      'GITHUB_OPERATOR_TOKEN',
      'GITHUB_PAT',
      'GITHUB_TOKEN',
    ]);
  });

  it('deduplicates identical GitHub write token values without exposing them', () => {
    const candidates = resolveGitHubWriteTokenCandidates({
      GITHUB_OPERATOR_TOKEN: 'same-token',
      GITHUB_PAT: 'same-token',
      GITHUB_TOKEN: 'ambient-token',
    });

    expect(candidates).toEqual([
      { source: 'GITHUB_OPERATOR_TOKEN', token: 'same-token' },
      { source: 'GITHUB_TOKEN', token: 'ambient-token' },
    ]);
  });

  it('requires an authorized upgrade repo before writing', async () => {
    const githubClient = { createCommit: vi.fn() };

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productConfig: { name: 'SAIGE', repo: 'https://github.com/veu-ai-studio/saige' },
      githubClient,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'BLOCKED',
      reason: 'UPGRADE_REPO_REQUIRED',
      filesWritten: 0,
      previewUrl: null,
    });
    expect(githubClient.createCommit).not.toHaveBeenCalled();
  });

  it('blocks invalid generated code before any GitHub write or Vercel deploy call', async () => {
    const githubClient = { createCommit: vi.fn() };
    const deployPreviewImpl = vi.fn();

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase({
        files: [
          {
            path: 'src/components/ListListXlrmdf.jsx',
            content: 'export default function ListListXlrmdf() { return (<div>Broken</div>; }\n',
          },
        ],
      }),
      productConfig: {
        name: 'Generic Product',
        upgrade_repo: 'https://github.com/acme/generated-product',
      },
      githubClient,
      deployPreviewImpl,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'BLOCKED',
      reason: 'GENERATED_CODEBASE_INVALID',
      previewUrl: null,
      filesWritten: 0,
      validationErrors: [
        'src/components/ListListXlrmdf.jsx has unbalanced ()',
      ],
    });
    expect(githubClient.createCommit).not.toHaveBeenCalled();
    expect(deployPreviewImpl).not.toHaveBeenCalled();
  });

  it('blocks writes to the original repo', async () => {
    const githubClient = { createCommit: vi.fn() };

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productConfig: {
        name: 'SAIGE',
        original_repo: 'https://github.com/veu-ai-studio/saige',
        upgrade_repo: 'https://github.com/veu-ai-studio/saige',
      },
      githubClient,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'ORIGINAL_REPO_WRITE_BLOCKED',
    });
    expect(githubClient.createCommit).not.toHaveBeenCalled();
  });

  it('blocks main and master writes unless Victor explicitly approves', async () => {
    const githubClient = { createCommit: vi.fn() };

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productConfig: {
        name: 'SAIGE',
        original_repo: 'https://github.com/veu-ai-studio/saige',
        upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      },
      branchName: 'main',
      githubClient,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'MAIN_BRANCH_WRITE_BLOCKED',
      branchName: 'main',
    });
    expect(githubClient.createCommit).not.toHaveBeenCalled();
  });

  it('writes generated files to an upgrade repo branch and captures Vercel preview URL', async () => {
    const githubClient = {
      createCommit: vi.fn(async () => ({
        commitSha: 'abc123',
        filesWritten: 3,
        branchUrl: 'https://github.com/veu-ai-studio/saige-v2/tree/flowai/fresh-build-run-1',
      })),
    };
    const deployPreviewImpl = vi.fn(async () => ({
      deploymentId: 'dep_123',
      previewUrl: 'https://saige-v2-fresh-build.vercel.app',
      inspectorUrl: 'https://vercel.com/inspect/dep_123',
    }));
    const probePreviewAccessImpl = browserClearProbe();

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productName: 'SAIGE',
      runId: 'run-1',
      productConfig: {
        name: 'SAIGE',
        original_repo: 'https://github.com/veu-ai-studio/saige',
        upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
        branch: 'main',
        vercel_project_id: 'prj_123',
        vercel_org_id: 'team_123',
      },
      env: { VERCEL_TOKEN: 'vercel-token' },
      now: '2026-05-26T00:00:00.000Z',
      githubClient,
      deployPreviewImpl,
      probePreviewAccessImpl,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'WRITTEN_AND_DEPLOYED',
      owner: 'veu-ai-studio',
      repo: 'saige-v2',
      branchName: 'flowai/fresh-build-saige-run-1',
      baseBranch: 'main',
      filesWritten: 3,
      commitSha: 'abc123',
      deploymentId: 'dep_123',
      previewUrl: 'https://saige-v2-fresh-build.vercel.app',
      previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
    });
    expect(githubClient.createCommit).toHaveBeenCalledWith(expect.objectContaining({
      owner: 'veu-ai-studio',
      repo: 'saige-v2',
      baseBranch: 'main',
      branchName: 'flowai/fresh-build-saige-run-1',
      files: expect.arrayContaining([
        expect.objectContaining({ path: 'package.json' }),
        expect.objectContaining({ path: 'src/App.jsx' }),
      ]),
    }));
    expect(deployPreviewImpl).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'prj_123',
      orgId: 'team_123',
      owner: 'veu-ai-studio',
      repo: 'saige-v2',
      branchName: 'flowai/fresh-build-saige-run-1',
      token: 'vercel-token',
    }));
    expect(probePreviewAccessImpl).toHaveBeenCalledWith(expect.objectContaining({
      previewUrl: 'https://saige-v2-fresh-build.vercel.app',
      deploymentId: 'dep_123',
    }));
  });

  it('accepts product_registry github_repo_url as the Fresh Build upgrade target', async () => {
    const githubClient = {
      createCommit: vi.fn(async () => ({
        commitSha: 'registry123',
        filesWritten: 3,
        branchUrl: 'https://github.com/victor2081new-cloud/flowai/tree/flowai/fresh-build-veusite-run-1',
      })),
    };
    const deployPreviewImpl = vi.fn(async () => ({
      deploymentId: 'dep_registry',
      previewUrl: 'https://flowai-veusite-preview.vercel.app',
    }));
    const probePreviewAccessImpl = browserClearProbe();

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productName: 'VEU AI Studio Website',
      runId: 'veusite-run-1',
      productConfig: {
        product_id: 'url-416b941ffbc3b7d5',
        product_url: 'https://victorudo.com',
        github_repo_url: 'https://github.com/victor2081new-cloud/flowai',
      },
      env: {
        VERCEL_TOKEN: 'standard-token',
        VERCEL_PROJECT_ID: 'prj_flowai',
        VERCEL_ORG_ID: 'team_flowai',
      },
      githubClient,
      deployPreviewImpl,
      probePreviewAccessImpl,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'WRITTEN_AND_DEPLOYED',
      owner: 'victor2081new-cloud',
      repo: 'flowai',
      previewUrl: 'https://flowai-veusite-preview.vercel.app',
    });
    expect(githubClient.createCommit).toHaveBeenCalledWith(expect.objectContaining({
      owner: 'victor2081new-cloud',
      repo: 'flowai',
      branchName: 'flowai/fresh-build-veu-ai-studio-website-veusite-run-1',
    }));
  });

  it('retries Fresh Build GitHub writes with PAT when an earlier token is rejected', async () => {
    const originalFetch = globalThis.fetch;
    const fetchCalls = [];
    const fetchImpl = vi.fn(async (url, options = {}) => {
      const auth = options.headers?.Authorization || '';
      fetchCalls.push({ url: String(url), auth });
      if (auth === 'Bearer rejected-token') {
        return githubJsonResponse(403, { message: 'Bad credentials' });
      }
      if (String(url).includes('/git/ref/heads/main')) {
        return githubJsonResponse(200, { object: { sha: 'base_sha' } });
      }
      if (String(url).includes('/git/commits/base_sha')) {
        return githubJsonResponse(200, { tree: { sha: 'base_tree_sha' } });
      }
      if (String(url).includes('/git/blobs')) {
        return githubJsonResponse(201, { sha: `blob_${fetchCalls.length}` });
      }
      if (String(url).includes('/git/trees')) {
        return githubJsonResponse(201, { sha: 'tree_sha' });
      }
      if (String(url).includes('/git/commits')) {
        return githubJsonResponse(201, { sha: 'commit_sha' });
      }
      if (String(url).includes('/git/refs')) {
        return githubJsonResponse(201, { ref: 'refs/heads/flowai/fresh-build-veu-run' });
      }
      return githubJsonResponse(404, { message: 'unexpected path' });
    });
    globalThis.fetch = fetchImpl;
    const deployPreviewImpl = vi.fn(async () => ({
      deploymentId: 'dep_retry',
      previewUrl: 'https://flowai-retry.vercel.app',
    }));
    const probePreviewAccessImpl = browserClearProbe();

    try {
      const result = await writeGeneratedCodebaseToUpgradeRepo({
        generatedCodebase: generatedCodebase(),
        productName: 'VEU AI Studio Website',
        runId: 'run-token-retry',
        productConfig: {
          product_id: 'url-416b941ffbc3b7d5',
          product_url: 'https://victorudo.com',
          github_repo_url: 'https://github.com/victor2081new-cloud/flowai',
          vercel_project_id: 'prj_flowai',
          vercel_org_id: 'team_flowai',
        },
        env: {
          GITHUB_OPERATOR_TOKEN: 'rejected-token',
          GITHUB_PAT: 'working-pat-token',
          VERCEL_OPERATOR_TOKEN: 'vercel-token',
        },
        deployPreviewImpl,
        probePreviewAccessImpl,
      });

      expect(result).toMatchObject({
        ok: true,
        status: 'WRITTEN_AND_DEPLOYED',
        credentialSource: 'GITHUB_PAT',
        commitSha: 'commit_sha',
        previewUrl: 'https://flowai-retry.vercel.app',
      });
      expect(fetchCalls.some((call) => call.auth === 'Bearer rejected-token')).toBe(true);
      expect(fetchCalls.some((call) => call.auth === 'Bearer working-pat-token')).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('uses a single create-tree request with inline file content instead of per-file blob writes', async () => {
    const originalFetch = globalThis.fetch;
    const fetchCalls = [];
    const fetchImpl = vi.fn(async (url, options = {}) => {
      fetchCalls.push({
        url: String(url),
        body: options.body || null,
      });
      if (String(url).includes('/git/blobs')) {
        return githubJsonResponse(403, { message: 'secondary rate limit' });
      }
      if (String(url).includes('/git/ref/heads/main')) {
        return githubJsonResponse(200, { object: { sha: 'base_sha' } });
      }
      if (String(url).includes('/git/commits/base_sha')) {
        return githubJsonResponse(200, { tree: { sha: 'base_tree_sha' } });
      }
      if (String(url).includes('/git/trees')) {
        return githubJsonResponse(201, { sha: 'tree_sha' });
      }
      if (String(url).includes('/git/commits')) {
        return githubJsonResponse(201, { sha: 'commit_sha' });
      }
      if (String(url).includes('/git/refs')) {
        return githubJsonResponse(201, { ref: 'refs/heads/flowai/fresh-build-tree-batch' });
      }
      return githubJsonResponse(404, { message: 'unexpected path' });
    });
    globalThis.fetch = fetchImpl;
    const deployPreviewImpl = vi.fn(async () => ({
      deploymentId: 'dep_tree',
      previewUrl: 'https://flowai-tree.vercel.app',
    }));
    const probePreviewAccessImpl = browserClearProbe();

    try {
      const result = await writeGeneratedCodebaseToUpgradeRepo({
        generatedCodebase: generatedCodebase(),
        productName: 'VEU AI Studio Website',
        runId: 'run-tree-batch',
        productConfig: {
          github_repo_url: 'https://github.com/victor2081new-cloud/flowai',
          vercel_project_id: 'prj_flowai',
          vercel_org_id: 'team_flowai',
        },
        env: {
          GITHUB_PAT: 'working-pat-token',
          VERCEL_OPERATOR_TOKEN: 'vercel-token',
        },
        deployPreviewImpl,
        probePreviewAccessImpl,
      });
      const blobCall = fetchCalls.find((call) => call.url.includes('/git/blobs'));
      const treeCall = fetchCalls.find((call) => call.url.includes('/git/trees'));
      const commitCall = fetchCalls.find((call) => call.url.includes('/git/commits') && call.body);
      const treeBody = JSON.parse(treeCall.body);
      const commitBody = JSON.parse(commitCall.body);

      expect(result).toMatchObject({
        ok: true,
        status: 'WRITTEN_AND_DEPLOYED',
        credentialSource: 'GITHUB_PAT',
      });
      expect(blobCall).toBeUndefined();
      expect(treeBody.base_tree).toBe('base_tree_sha');
      expect(treeBody.tree).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: 'src/App.jsx',
          type: 'blob',
          content: expect.stringContaining('Fresh Build'),
        }),
      ]));
      expect(commitBody.parents).toEqual(['base_sha']);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns non-secret GitHub diagnostics when every write credential fails', async () => {
    const githubError = new Error('GitHub POST /repos/acme/app/git/blobs failed with 403');
    githubError.code = 'GITHUB_AUTH_FAILED';
    githubError.status = 403;
    githubError.githubError = 'Resource not accessible by personal access token';
    const githubClient = {
      createCommit: vi.fn(async () => { throw githubError; }),
    };

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productName: 'VEU AI Studio Website',
      runId: 'run-token-failure',
      productConfig: {
        product_id: 'url-416b941ffbc3b7d5',
        github_repo_url: 'https://github.com/victor2081new-cloud/flowai',
      },
      githubClient,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'WRITE_FAILED',
      reason: 'GITHUB_AUTH_FAILED',
      credentialSource: 'injected_github_client',
      failure: {
        githubStatus: 403,
        githubError: 'Resource not accessible by personal access token',
        credentialSource: 'injected_github_client',
      },
    });
    expect(JSON.stringify(result)).not.toContain('ghp_');
    expect(JSON.stringify(result)).not.toContain('github_pat_');
  });

  it('resolves Vercel args from existing operator envs without Fresh Build-specific env vars', async () => {
    const githubClient = {
      createCommit: vi.fn(async () => ({
        commitSha: 'abc123',
        filesWritten: 3,
        branchUrl: 'https://github.com/veu-ai-studio/saige-v2/tree/flowai/fresh-build-run-operator-envs',
      })),
    };
    const deployPreviewImpl = vi.fn(async () => ({
      deploymentId: 'dep_operator',
      previewUrl: 'https://saige-v2-operator-envs.vercel.app',
    }));
    const probePreviewAccessImpl = browserClearProbe();

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productName: 'SAIGE',
      runId: 'run-operator-envs',
      productConfig: {
        name: 'SAIGE',
        original_repo: 'https://github.com/veu-ai-studio/saige',
        upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      },
      env: {
        VERCEL_OPERATOR_TOKEN: 'operator-token',
        VERCEL_PROJECT_ID_SAIGE: 'prj_saige_existing',
        VERCEL_ORG_ID: 'team_existing',
      },
      githubClient,
      deployPreviewImpl,
      probePreviewAccessImpl,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'WRITTEN_AND_DEPLOYED',
      previewUrl: 'https://saige-v2-operator-envs.vercel.app',
    });
    expect(deployPreviewImpl).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'prj_saige_existing',
      orgId: 'team_existing',
      token: 'operator-token',
    }));
  });

  it('falls back to standard Vercel envs for products without per-product project envs', async () => {
    const githubClient = {
      createCommit: vi.fn(async () => ({
        commitSha: 'def456',
        filesWritten: 3,
        branchUrl: 'https://github.com/veu-ai-studio/generic-v2/tree/flowai/fresh-build-run-standard-envs',
      })),
    };
    const deployPreviewImpl = vi.fn(async () => ({
      deploymentId: 'dep_standard',
      previewUrl: 'https://generic-v2-standard-envs.vercel.app',
    }));
    const probePreviewAccessImpl = browserClearProbe();

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productName: 'Generic Product',
      runId: 'run-standard-envs',
      productConfig: {
        name: 'Generic Product',
        original_repo: 'https://github.com/veu-ai-studio/generic',
        upgrade_repo: 'https://github.com/veu-ai-studio/generic-v2',
      },
      env: {
        VERCEL_TOKEN: 'standard-token',
        VERCEL_PROJECT_ID: 'prj_standard',
        VERCEL_TEAM_ID: 'team_standard',
      },
      githubClient,
      deployPreviewImpl,
      probePreviewAccessImpl,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'WRITTEN_AND_DEPLOYED',
      previewUrl: 'https://generic-v2-standard-envs.vercel.app',
    });
    expect(deployPreviewImpl).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'prj_standard',
      orgId: 'team_standard',
      token: 'standard-token',
    }));
  });

  it('returns write evidence when Vercel deployment fails after branch write', async () => {
    const githubClient = {
      createCommit: vi.fn(async () => ({
        commitSha: 'ghi789',
        filesWritten: 3,
        branchUrl: 'https://github.com/veu-ai-studio/saige-v2/tree/flowai/fresh-build-run-deploy-error',
      })),
    };
    const deployError = new Error('vercelBranchDeploy: deployment dpl_failed entered readyState=ERROR');
    deployError.code = 'DEPLOY_ERROR';
    deployError.deploymentId = 'dpl_failed';
    deployError.readyState = 'ERROR';
    deployError.attempts = 3;
    const deployPreviewImpl = vi.fn(async () => { throw deployError; });

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productName: 'SAIGE',
      runId: 'run-deploy-error',
      productConfig: {
        name: 'SAIGE',
        original_repo: 'https://github.com/veu-ai-studio/saige',
        upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
        vercel_project_id: 'prj_123',
        vercel_org_id: 'team_123',
      },
      env: { VERCEL_TOKEN: 'standard-token' },
      githubClient,
      deployPreviewImpl,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'WRITTEN_DEPLOY_FAILED',
      reason: 'DEPLOY_ERROR',
      filesWritten: 3,
      commitSha: 'ghi789',
      branchUrl: 'https://github.com/veu-ai-studio/saige-v2/tree/flowai/fresh-build-run-deploy-error',
      previewUrl: null,
      deploymentId: 'dpl_failed',
      failureStage: 'vercel_deploy',
      failure: {
        stage: 'vercel_deploy',
        code: 'DEPLOY_ERROR',
        deploymentId: 'dpl_failed',
        readyState: 'ERROR',
        attempts: 3,
      },
    });
  });

  it('does not count a Vercel-auth protected preview as browser-clear', async () => {
    const githubClient = {
      createCommit: vi.fn(async () => ({
        commitSha: 'auth123',
        filesWritten: 3,
        branchUrl: 'https://github.com/veu-ai-studio/saige-v2/tree/flowai/fresh-build-run-auth',
      })),
    };
    const deployPreviewImpl = vi.fn(async () => ({
      deploymentId: 'dep_auth',
      previewUrl: 'https://saige-v2-auth.vercel.app',
    }));
    const probePreviewAccessImpl = vi.fn(async ({ previewUrl, deploymentId }) => ({
      previewUrl,
      deploymentId,
      previewAccessStatus: 'PREVIEW_AUTH_REQUIRED',
      httpStatus: 401,
      reason: 'VERCEL_AUTH_REQUIRED',
    }));

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productName: 'SAIGE',
      runId: 'run-auth',
      productConfig: {
        name: 'SAIGE',
        original_repo: 'https://github.com/veu-ai-studio/saige',
        upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
        vercel_project_id: 'prj_123',
        vercel_org_id: 'team_123',
      },
      env: { VERCEL_TOKEN: 'standard-token' },
      githubClient,
      deployPreviewImpl,
      probePreviewAccessImpl,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'WRITTEN_PREVIEW_NOT_BROWSER_CLEAR',
      reason: 'PREVIEW_AUTH_REQUIRED',
      deploymentId: 'dep_auth',
      previewUrl: 'https://saige-v2-auth.vercel.app',
      previewAccessStatus: 'PREVIEW_AUTH_REQUIRED',
      previewAccess: {
        httpStatus: 401,
        reason: 'VERCEL_AUTH_REQUIRED',
      },
    });
  });

  it('classifies HTTP 401 preview probes as PREVIEW_AUTH_REQUIRED without reading HTML', async () => {
    const fetchImpl = vi.fn(async () => ({
      status: 401,
      headers: { get: (name) => name.toLowerCase() === 'set-cookie' ? '_vercel_sso_nonce=1' : null },
      text: vi.fn(),
    }));

    const result = await probePreviewAccess({
      previewUrl: 'saige-v2-auth.vercel.app',
      deploymentId: 'dep_auth',
      fetchImpl,
    });

    expect(result).toMatchObject({
      previewUrl: 'https://saige-v2-auth.vercel.app',
      deploymentId: 'dep_auth',
      previewAccessStatus: 'PREVIEW_AUTH_REQUIRED',
      httpStatus: 401,
      reason: 'VERCEL_AUTH_REQUIRED',
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://saige-v2-auth.vercel.app', expect.objectContaining({
      method: 'GET',
      redirect: 'manual',
    }));
  });

  it('returns deployment configuration required after a successful safe branch write when Vercel is not configured', async () => {
    const githubClient = {
      createCommit: vi.fn(async () => ({
        commitSha: 'abc123',
        filesWritten: 3,
        branchUrl: 'https://github.com/veu-ai-studio/saige-v2/tree/flowai/fresh-build-run-2',
      })),
    };
    const deployPreviewImpl = vi.fn();

    const result = await writeGeneratedCodebaseToUpgradeRepo({
      generatedCodebase: generatedCodebase(),
      productConfig: {
        name: 'SAIGE',
        original_repo: 'https://github.com/veu-ai-studio/saige',
        upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      },
      runId: 'run-2',
      githubClient,
      deployPreviewImpl,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'WRITTEN_DEPLOY_CONFIGURATION_REQUIRED',
      reason: 'VERCEL_CONFIGURATION_REQUIRED',
      filesWritten: 3,
      previewUrl: null,
    });
    expect(deployPreviewImpl).not.toHaveBeenCalled();
  });
});
