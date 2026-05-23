import { describe, expect, it, vi } from 'vitest';
import { probeGithubOperatorRepoAccess } from '../../../src/lib/agents/renewal/githubOperatorRepoProbe.js';

const TOKEN = 'gho_OPERATOR_TOKEN_SHOULD_NOT_LEAK';

function response(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe('githubOperatorRepoProbe', () => {
  it('confirms read/write access from repo permissions and branch visibility', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, {
        default_branch: 'main',
        permissions: { pull: true, push: true, maintain: false, admin: false },
      }))
      .mockResolvedValueOnce(response(200, { object: { sha: 'abc' } }));

    const result = await probeGithubOperatorRepoAccess({
      owner: 'veu-ai-studio',
      repo: 'saige',
      branch: 'main',
      token: TOKEN,
      opts: { fetch: fetchMock },
    });

    expect(result).toMatchObject({
      kind: 'github_operator_repo_probe',
      ok: true,
      canRead: true,
      canWrite: true,
      tokenPresent: true,
      tokenRedacted: true,
      owner: 'veu-ai-studio',
      repo: 'saige',
      branch: 'main',
      reason: 'read_write_confirmed',
    });
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(fetchMock.mock.calls[0][0]).not.toContain(TOKEN);
    expect(fetchMock.mock.calls[1][0]).not.toContain(TOKEN);
  });

  it('degrades honestly when the token can read but no write permission is reported', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, {
        default_branch: 'main',
        permissions: { pull: true, push: false, maintain: false, admin: false },
      }))
      .mockResolvedValueOnce(response(200, { object: { sha: 'abc' } }));

    const result = await probeGithubOperatorRepoAccess({
      owner: 'veu-ai-studio',
      repo: 'saige',
      branch: 'main',
      token: TOKEN,
      opts: { fetch: fetchMock },
    });

    expect(result.ok).toBe(false);
    expect(result.canRead).toBe(true);
    expect(result.canWrite).toBe(false);
    expect(result.reason).toBe('read_only_or_permissions_not_reported');
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it('reports missing token without throwing', async () => {
    const result = await probeGithubOperatorRepoAccess({
      owner: 'veu-ai-studio',
      repo: 'saige',
      branch: 'main',
    });

    expect(result).toMatchObject({
      ok: false,
      canRead: false,
      canWrite: false,
      tokenPresent: false,
      reason: 'missing_token',
    });
  });
});
