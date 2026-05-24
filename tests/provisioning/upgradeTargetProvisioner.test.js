import { describe, expect, it, vi } from 'vitest';
import {
  ensureUpgradeRepo,
  ensureVercelProject,
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
});
