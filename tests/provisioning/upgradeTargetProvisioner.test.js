import { describe, expect, it, vi } from 'vitest';
import {
  ensureUpgradeRepo,
  ensureVercelProject,
  provisionDeliveryWorkspace,
  provisionUpgradeTarget,
} from '../../src/lib/provisioning/upgradeTargetProvisioner.js';

function response(status, body = {}) {
  return {
    status,
    text: async () => JSON.stringify(body),
  };
}

describe('upgrade target provisioner', () => {
  it('classifies missing GitHub token as ACCESS_BLOCKED without throwing', async () => {
    await expect(ensureUpgradeRepo({ product: { name: 'Demo' }, org: 'acme' })).resolves.toMatchObject({
      ok: false,
      status: 'access_blocked',
      code: 'ACCESS_BLOCKED',
    });
  });

  it('checks for an existing upgrade repo before creating one', async () => {
    const fetch = vi.fn(async () => response(200, { html_url: 'https://github.com/acme/demo-v2' }));
    const result = await ensureUpgradeRepo({
      product: { name: 'Demo' },
      org: 'acme',
      token: 'secret',
      opts: { fetch },
    });
    expect(result).toMatchObject({
      ok: true,
      status: 'provisioned',
      upgrade_repo_url: 'https://github.com/acme/demo-v2',
      created: false,
    });
    expect(fetch.mock.calls[0][0]).toContain('/repos/acme/demo-v2');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('creates a Vercel project when it is missing', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(404, { error: { message: 'not found' } }))
      .mockResolvedValueOnce(response(200, { id: 'prj_123' }));
    const result = await ensureVercelProject({
      product: { name: 'Demo' },
      owner: 'acme',
      repo: 'demo-v2',
      token: 'vercel-secret',
      opts: { fetch },
    });
    expect(result).toMatchObject({
      ok: true,
      status: 'deployed',
      projectId: 'prj_123',
      created: true,
    });
    expect(fetch.mock.calls[1][0]).toContain('/v11/projects');
    expect(fetch.mock.calls[1][1].body).toContain('"framework":"vite"');
  });

  it('reports provisioning recommendation and token availability without exposing tokens', async () => {
    const result = await provisionUpgradeTarget({
      product: { original_url: 'https://example.com' },
      env: { GITHUB_OPERATOR_TOKEN: 'gh_secret', VERCEL_OPERATOR_TOKEN: 'vc_secret' },
    });
    expect(result).toMatchObject({
      ok: true,
      recommendation: 'provisioning_required',
      tokenAvailability: { github: true, vercel: true },
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('refuses delivery workspace repo creation outside the configured FlowAI owner', async () => {
    const result = await provisionDeliveryWorkspace({
      runId: 'run-123',
      productName: 'Demo',
      product: { owner: 'outside-org' },
      env: {
        FLOWAI_DELIVERY_GITHUB_OWNER: 'flowai-owned',
        VERCEL_OPERATOR_TOKEN: 'vercel-secret',
        VERCEL_ORG_ID: 'team_123',
      },
      opts: {
        getInstallationToken: vi.fn(async () => ({
          token: 'github-secret',
          permissions: { administration: 'write', contents: 'write' },
          repositorySelection: 'all',
        })),
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'DELIVERY_OWNER_OUTSIDE_FLOWAI_ORG',
      allowedOwner: 'flowai-owned',
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('blocks GitHub App delivery workspaces without admin, contents, and all-repo permission evidence', async () => {
    const result = await provisionDeliveryWorkspace({
      runId: 'run-123',
      productName: 'Demo',
      env: {
        FLOWAI_DELIVERY_GITHUB_OWNER: 'flowai-owned',
        VERCEL_OPERATOR_TOKEN: 'vercel-secret',
        VERCEL_ORG_ID: 'team_123',
        GITHUB_APP_ID: '1',
        GITHUB_APP_PRIVATE_KEY: 'pem',
        GITHUB_APP_INSTALLATION_ID: '2',
      },
      opts: {
        getInstallationToken: vi.fn(async () => ({
          token: 'github-secret',
          permissions: { administration: 'read', contents: 'write' },
          repositorySelection: 'selected',
        })),
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'GITHUB_APP_PERMISSION_REQUIRED',
      credentialSource: 'github_app',
      permissionEvidence: {
        ok: false,
        repositorySelection: 'selected',
      },
    });
    expect(result.detail).toContain('Administration: write');
    expect(result.detail).toContain('all-repository access');
    expect(JSON.stringify(result)).not.toContain('github-secret');
  });

  it('uses explicitly enabled operator fallback when GitHub App permission evidence is insufficient', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(404, { message: 'not found' }))
      .mockResolvedValueOnce(response(201, { html_url: 'https://github.com/flowai-owned/flowai-demo-run-123' }))
      .mockResolvedValueOnce(response(404, { error: { message: 'not found' } }))
      .mockResolvedValueOnce(response(200, { id: 'prj_workspace' }));

    const result = await provisionDeliveryWorkspace({
      runId: 'run-123',
      productName: 'Demo',
      env: {
        FLOWAI_DELIVERY_GITHUB_OWNER: 'flowai-owned',
        FLOWAI_ALLOW_GITHUB_OPERATOR_FALLBACK_FOR_DELIVERY: 'true',
        VERCEL_OPERATOR_TOKEN: 'vercel-secret',
        VERCEL_ORG_ID: 'team_123',
        GITHUB_PAT: 'github-pat-secret',
        GITHUB_APP_ID: '1',
        GITHUB_APP_PRIVATE_KEY: 'pem',
        GITHUB_APP_INSTALLATION_ID: '2',
      },
      opts: {
        fetch,
        getInstallationToken: vi.fn(async () => ({
          token: 'github-app-secret',
          permissions: { administration: 'read', contents: 'write' },
          repositorySelection: 'selected',
        })),
      },
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'ready',
      github: {
        owner: 'flowai-owned',
        credentialSource: 'operator_token',
        permissionEvidence: {
          fallback: true,
          reason: 'github_app_permission_insufficient',
          appPermissionEvidence: {
            ok: false,
            repositorySelection: 'selected',
          },
        },
      },
      vercel: {
        projectId: 'prj_workspace',
      },
    });
    expect(JSON.stringify(result)).not.toContain('github-pat-secret');
    expect(JSON.stringify(result)).not.toContain('github-app-secret');
    expect(JSON.stringify(result)).not.toContain('vercel-secret');
    expect(result.credentials.githubToken).toBe('github-pat-secret');
  });

  it('creates a redacted delivery workspace with GitHub App and Vercel project metadata', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(404, { message: 'not found' }))
      .mockResolvedValueOnce(response(201, { html_url: 'https://github.com/flowai-owned/flowai-demo-run-123' }))
      .mockResolvedValueOnce(response(404, { error: { message: 'not found' } }))
      .mockResolvedValueOnce(response(200, { id: 'prj_workspace' }));

    const getInstallationToken = vi.fn(async () => ({
      token: 'github-secret',
      permissions: { administration: 'write', contents: 'write' },
      repositorySelection: 'all',
    }));

    const result = await provisionDeliveryWorkspace({
      runId: 'run-123',
      productName: 'Demo',
      env: {
        FLOWAI_DELIVERY_GITHUB_OWNER: 'flowai-owned',
        VERCEL_OPERATOR_TOKEN: 'vercel-secret',
        VERCEL_ORG_ID: 'team_123',
        GITHUB_PAT: 'pat-should-not-short-circuit-app',
        GITHUB_APP_ID: '1',
        GITHUB_APP_PRIVATE_KEY: 'pem',
        GITHUB_APP_INSTALLATION_ID: '2',
      },
      opts: {
        fetch,
        getInstallationToken,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'ready',
      github: {
        owner: 'flowai-owned',
        credentialSource: 'github_app',
        private: true,
      },
      vercel: {
        projectId: 'prj_workspace',
        credentialSource: 'operator_token',
      },
    });
    expect(getInstallationToken).toHaveBeenCalledWith(expect.objectContaining({
      pat: '',
    }));
    expect(fetch.mock.calls[1][1].body).toContain('"private":true');
    expect(fetch.mock.calls[3][0]).toContain('/v11/projects');
    expect(JSON.stringify(result)).not.toContain('github-secret');
    expect(JSON.stringify(result)).not.toContain('vercel-secret');
    expect(JSON.stringify(result)).not.toContain('pat-should-not-short-circuit-app');
    expect(result.credentials.githubToken).toBe('github-secret');
  });

  it('blocks generated-product backend provisioning before network work when Supabase credentials are missing', async () => {
    const fetch = vi.fn();
    const getInstallationToken = vi.fn();

    const result = await provisionDeliveryWorkspace({
      runId: 'run-123',
      productName: 'Demo',
      product: { backendPersistenceRequired: true },
      env: {
        FLOWAI_DELIVERY_GITHUB_OWNER: 'flowai-owned',
        VERCEL_OPERATOR_TOKEN: 'vercel-secret',
        VERCEL_ORG_ID: 'team_123',
        GITHUB_APP_ID: '1',
        GITHUB_APP_PRIVATE_KEY: 'pem',
        GITHUB_APP_INSTALLATION_ID: '2',
      },
      opts: {
        fetch,
        getInstallationToken,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'blocked',
      code: 'GENERATED_BACKEND_CREDENTIALS_REQUIRED',
      missing: {
        supabaseUrl: true,
        supabaseServiceRoleKey: true,
      },
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(getInstallationToken).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('vercel-secret');
  });

  it('sets redacted generated-product backend env vars on the delivery Vercel project', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(404, { message: 'not found' }))
      .mockResolvedValueOnce(response(201, { html_url: 'https://github.com/flowai-owned/flowai-demo-run-123' }))
      .mockResolvedValueOnce(response(404, { error: { message: 'not found' } }))
      .mockResolvedValueOnce(response(200, { id: 'prj_workspace' }))
      .mockResolvedValueOnce(response(200, { id: 'env_supabase_url' }))
      .mockResolvedValueOnce(response(409, { error: { message: 'Environment Variable already exists' } }))
      .mockResolvedValueOnce(response(200, { id: 'env_product_id' }));

    const result = await provisionDeliveryWorkspace({
      runId: 'run-123',
      productName: 'Demo',
      product: { backendPersistenceRequired: true },
      env: {
        FLOWAI_DELIVERY_GITHUB_OWNER: 'flowai-owned',
        VERCEL_OPERATOR_TOKEN: 'vercel-secret',
        VERCEL_ORG_ID: 'team_123',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'supabase-service-role-secret',
        GITHUB_APP_ID: '1',
        GITHUB_APP_PRIVATE_KEY: 'pem',
        GITHUB_APP_INSTALLATION_ID: '2',
      },
      opts: {
        fetch,
        getInstallationToken: vi.fn(async () => ({
          token: 'github-secret',
          permissions: { administration: 'write', contents: 'write' },
          repositorySelection: 'all',
        })),
      },
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'ready',
      vercel: {
        projectId: 'prj_workspace',
        backendEnv: [
          { key: 'FLOWAI_GENERATED_SUPABASE_URL', status: 'created' },
          { key: 'FLOWAI_GENERATED_SUPABASE_SERVICE_ROLE_KEY', status: 'already_exists' },
          { key: 'FLOWAI_GENERATED_PRODUCT_ID', status: 'created' },
        ],
      },
    });
    const envBodies = fetch.mock.calls.slice(4).map(([, options]) => options.body).join('\n');
    expect(fetch.mock.calls[4][0]).toContain('/v10/projects/prj_workspace/env');
    expect(envBodies).toContain('FLOWAI_GENERATED_SUPABASE_URL');
    expect(envBodies).toContain('FLOWAI_GENERATED_SUPABASE_SERVICE_ROLE_KEY');
    expect(envBodies).toContain('FLOWAI_GENERATED_PRODUCT_ID');
    expect(JSON.stringify(result)).not.toContain('supabase-service-role-secret');
    expect(JSON.stringify(result)).not.toContain('github-secret');
    expect(JSON.stringify(result)).not.toContain('vercel-secret');
  });

  it('creates a redacted delivery workspace in a configured user-owned namespace', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(404, { message: 'not found' }))
      .mockResolvedValueOnce(response(201, { html_url: 'https://github.com/flowai-user/flowai-demo-run-123' }))
      .mockResolvedValueOnce(response(404, { error: { message: 'not found' } }))
      .mockResolvedValueOnce(response(200, { id: 'prj_workspace' }));

    const result = await provisionDeliveryWorkspace({
      runId: 'run-123',
      productName: 'Demo',
      env: {
        FLOWAI_DELIVERY_GITHUB_OWNER: 'flowai-user',
        FLOWAI_DELIVERY_GITHUB_OWNER_TYPE: 'user',
        VERCEL_OPERATOR_TOKEN: 'vercel-secret',
        VERCEL_ORG_ID: 'team_123',
        GITHUB_PAT: 'github-pat-secret',
      },
      opts: {
        fetch,
        getInstallationToken: vi.fn(async () => {
          throw Object.assign(new Error('app unavailable'), { code: 'APP_UNAVAILABLE' });
        }),
      },
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'ready',
      github: {
        owner: 'flowai-user',
        ownerType: 'user',
        repoUrl: 'https://github.com/flowai-user/flowai-demo-run-123',
        credentialSource: 'operator_token',
      },
      vercel: {
        projectId: 'prj_workspace',
      },
    });
    expect(fetch.mock.calls[1][0]).toBe('https://api.github.com/user/repos');
    expect(JSON.stringify(result)).not.toContain('github-pat-secret');
    expect(JSON.stringify(result)).not.toContain('vercel-secret');
  });
});
