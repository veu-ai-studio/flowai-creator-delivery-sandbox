// tests/construction/resolvers/originPageResolver.test.js
//
// W5a — default originPageResolver coverage.

import { describe, it, expect, vi } from 'vitest';
import {
  extractToken,
  scoreFileAgainstToken,
  createOriginPageResolver,
} from '../../../src/lib/construction/resolvers/originPageResolver.js';

describe('extractToken', () => {
  it('extracts last path segment from a URL', () => {
    expect(extractToken('https://reltwin-platform.vercel.app/settings')).toBe('settings');
  });

  it('drops selector after colon', () => {
    expect(extractToken('https://reltwin.com/settings:transfer-button')).toBe('settings');
    expect(extractToken('Settings:transfer-button')).toBe('settings');
  });

  it('drops query string and hash', () => {
    expect(extractToken('https://x.com/profile?id=1')).toBe('profile');
    expect(extractToken('https://x.com/profile#section')).toBe('profile');
  });

  it('drops file extension', () => {
    expect(extractToken('/pages/Settings.jsx')).toBe('settings');
  });

  it('returns empty for empty / non-string input', () => {
    expect(extractToken('')).toBe('');
    expect(extractToken(null)).toBe('');
    expect(extractToken(undefined)).toBe('');
  });

  it('handles bare paths', () => {
    expect(extractToken('/api/wire/transfer')).toBe('transfer');
  });

  it('lowercases the token', () => {
    expect(extractToken('https://x.com/Profile')).toBe('profile');
  });
});

describe('scoreFileAgainstToken', () => {
  it('scores 0 when no substring match', () => {
    expect(scoreFileAgainstToken('src/utils/api.ts', 'settings')).toBe(0);
  });

  it('scores 1 on path-only substring match', () => {
    expect(scoreFileAgainstToken('src/pages/SomePage.jsx', 'page')).toBeGreaterThanOrEqual(1);
  });

  it('scores higher on exact basename match', () => {
    const exact = scoreFileAgainstToken('src/pages/settings.jsx', 'settings');
    const partial = scoreFileAgainstToken('src/pages/account-settings-old.jsx', 'settings');
    expect(exact).toBeGreaterThan(partial);
  });

  it('scores 0 for empty token', () => {
    expect(scoreFileAgainstToken('any.jsx', '')).toBe(0);
  });
});

describe('createOriginPageResolver', () => {
  const REPO_FILES = [
    'package.json',
    'README.md',
    'src/Layout.jsx',
    'src/pages/Settings.jsx',
    'src/pages/Profile.jsx',
    'src/pages/account-settings.jsx',
    'src/components/Button.tsx',
    'src/utils/api.ts',
    'src/index.js',
  ];

  function makeDeps({ files = REPO_FILES, contents = {} } = {}) {
    return {
      repoFileList: vi.fn(async () => files),
      fetchFileContent: vi.fn(async (path) => contents[path] ?? `// stub content for ${path}\n`),
    };
  }

  it('rejects when deps are missing', () => {
    expect(() => createOriginPageResolver({})).toThrowError(/repoFileList/);
    expect(() => createOriginPageResolver({ repoFileList: () => {} })).toThrowError(/fetchFileContent/);
  });

  it('selects the highest-scoring file (exact basename match wins)', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({
      candidate: { location: 'https://reltwin.com/settings:transfer-button' },
    });
    expect(r.repoRelativePath).toBe('src/pages/Settings.jsx');
    expect(r.path).toBe('src/pages/Settings.jsx'); // back-compat alias
    expect(r.currentContent).toContain('Settings.jsx');
    expect(r.matchToken).toBe('settings');
  });

  it('throws when no source file matches the token', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    await expect(resolver({
      candidate: { location: 'https://reltwin.com/nonexistent-route' },
    })).rejects.toThrowError(/no source file matched/);
  });

  it('throws when extractToken returns empty', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    await expect(resolver({ candidate: { location: '' } }))
      .rejects.toThrowError(/could not extract token/);
  });

  it('uses candidate.selector when candidate.location is absent', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({ candidate: { selector: '/profile' } });
    expect(r.repoRelativePath).toBe('src/pages/Profile.jsx');
  });

  it('accepts BOTH { candidate } and bare-candidate calling shapes', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    const r1 = await resolver({ candidate: { location: '/settings' } });
    const r2 = await resolver({ location: '/settings' });
    expect(r1.repoRelativePath).toBe(r2.repoRelativePath);
  });

  it('returns content via fetchFileContent', async () => {
    const deps = makeDeps({
      contents: { 'src/pages/Settings.jsx': 'export default function Settings() { return null; }' },
    });
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({ candidate: { location: '/settings' } });
    expect(r.currentContent).toBe('export default function Settings() { return null; }');
    expect(deps.fetchFileContent).toHaveBeenCalledWith('src/pages/Settings.jsx');
  });

  it('throws when fetchFileContent returns non-string', async () => {
    const deps = {
      repoFileList: async () => REPO_FILES,
      fetchFileContent: async () => null,
    };
    const resolver = createOriginPageResolver(deps);
    await expect(resolver({ candidate: { location: '/settings' } }))
      .rejects.toThrowError(/non-string/);
  });

  it('throws when repoFileList returns empty', async () => {
    const resolver = createOriginPageResolver({
      repoFileList: async () => [],
      fetchFileContent: async () => '',
    });
    await expect(resolver({ candidate: { location: '/settings' } }))
      .rejects.toThrowError(/empty/);
  });

  it('only matches .js/.jsx/.ts/.tsx files (skips other extensions)', async () => {
    const deps = makeDeps({
      files: ['README.md', 'src/pages/settings.md', 'src/pages/Settings.jsx'],
    });
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({ candidate: { location: '/settings' } });
    expect(r.repoRelativePath).toBe('src/pages/Settings.jsx');
  });
});
