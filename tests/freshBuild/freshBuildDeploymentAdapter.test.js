import { describe, expect, it, vi } from 'vitest';
import {
  parseGitHubRepoUrl,
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
