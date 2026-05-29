// tests/construction/resolvers/originPageResolver.test.js
//
// W5a — default originPageResolver coverage.
//
// extractToken behavior (per dispatch):
//   1. Full URL with path     → lowercased last pathname segment (ext stripped)
//   2. URL+selector concat    → CSS-tag of last selector segment (with id fallback)
//   3. Bare/empty/unparseable → 'layout' (root-page fallback marker)

import { describe, it, expect, vi } from 'vitest';
import {
  extractToken,
  scoreFileAgainstToken,
  createOriginPageResolver,
  ROOT_PAGE_FALLBACK_PATHS,
} from '../../../src/lib/construction/resolvers/originPageResolver.js';

describe('extractToken', () => {
  it('extracts last path segment from a URL', () => {
    expect(extractToken('https://reltwin-platform.vercel.app/settings')).toBe('settings');
  });

  it('returns lowercased path segment', () => {
    expect(extractToken('https://x.com/Profile')).toBe('profile');
  });

  it('drops file extension from final path segment', () => {
    expect(extractToken('https://x.com/pages/Settings.jsx')).toBe('settings');
  });

  it('ignores query string and hash', () => {
    expect(extractToken('https://x.com/profile?id=1')).toBe('profile');
    expect(extractToken('https://x.com/profile#section')).toBe('profile');
  });

  it('returns "layout" for empty / null / non-string input', () => {
    expect(extractToken('')).toBe('layout');
    expect(extractToken(null)).toBe('layout');
    expect(extractToken(undefined)).toBe('layout');
  });

  it('URL+selector concat with no URL pathname → uses CSS tag', () => {
    // Real Phase B emit: "<url><space><css-selector>"
    expect(extractToken('https://reltwin-platform.vercel.app button#submit-btn')).toBe('button');
  });

  it('URL+selector with nested ">" → uses last selector tag', () => {
    expect(extractToken('https://x.com div#main > div > button')).toBe('button');
  });

  it('URL+selector where tag is a layout-container → falls to id', () => {
    expect(extractToken('https://x.com div#user-profile')).toBe('userprofile');
  });

  it('URL+selector with only containers and no id → "layout"', () => {
    expect(extractToken('https://x.com div > section > main')).toBe('layout');
  });

  it('id extraction strips non-alphanumerics + truncates to 20 chars', () => {
    expect(extractToken('https://x.com #radix-:r3:'))
      .toBe('radix'); // "radix-:r3:" → after strip → "radixr3" → matches 'radix' first? actually let me trace:
    // selectorPart = "#radix-:r3:"
    // tag = "#radix-:r3:".split('>').pop()?.trim() = "#radix-:r3:"
    //   .split(/[#.\s:[]/) = ['', 'radix-', 'r3', '']
    //   [0] = '' → falsy → skip tag branch
    // idMatch = match(/#([\w-]+)/) → '#radix-' → captured 'radix-'
    //   .replace(/[^a-z0-9]/gi,'').toLowerCase() = 'radix'
    // truncated to 20 → 'radix'
  });

  it('bare path with no scheme → "layout" (not a parseable URL)', () => {
    // new URL('/api/wire/transfer') throws (no scheme); selectorPart='' → 'layout'.
    expect(extractToken('/api/wire/transfer')).toBe('layout');
  });

  it('lowercases the returned token', () => {
    expect(extractToken('https://x.com/SETTINGS')).toBe('settings');
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

describe('ROOT_PAGE_FALLBACK_PATHS', () => {
  it('contains the canonical four root-page paths', () => {
    expect(ROOT_PAGE_FALLBACK_PATHS).toEqual([
      'src/Layout.jsx',
      'src/App.jsx',
      'src/pages/index.tsx',
      'src/pages/index.jsx',
    ]);
  });
});

describe('createOriginPageResolver', () => {
  const REPO_FILES = [
    'package.json',
    'README.md',
    'src/Layout.jsx',
    'src/App.jsx',
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
      candidate: { location: 'https://reltwin.com/settings' },
    });
    expect(r.repoRelativePath).toBe('src/pages/Settings.jsx');
    expect(r.path).toBe('src/pages/Settings.jsx');
    expect(r.matchToken).toBe('settings');
    expect(r.usedFallback).toBe(false);
  });

  it('uses root-page fallback when no source file matches the token', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({
      candidate: { location: 'https://reltwin.com/nonexistent-route' },
    });
    expect(r.repoRelativePath).toBe('src/Layout.jsx');
    expect(r.usedFallback).toBe(true);
  });

  it('uses root-page fallback when extractToken returns "layout" (empty location)', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({ candidate: { location: '' } });
    expect(r.repoRelativePath).toBe('src/Layout.jsx');
    expect(r.matchToken).toBe('layout');
    expect(r.usedFallback).toBe(true);
  });

  it('honors fallback order: Layout.jsx beats App.jsx', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({ candidate: { location: '/no-such-path' } });
    expect(r.repoRelativePath).toBe('src/Layout.jsx');
  });

  it('falls through to App.jsx when Layout.jsx is absent', async () => {
    const deps = makeDeps({
      files: REPO_FILES.filter((f) => f !== 'src/Layout.jsx'),
    });
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({ candidate: { location: '/no-such-path' } });
    expect(r.repoRelativePath).toBe('src/App.jsx');
  });

  it('throws when no scored file AND no root-page fallback exists in repo', async () => {
    const deps = makeDeps({
      files: ['package.json', 'src/utils/api.ts'], // none of the fallback paths
    });
    const resolver = createOriginPageResolver(deps);
    await expect(resolver({ candidate: { location: '/no-match' } }))
      .rejects.toThrowError(/no root-page fallback/);
  });

  it('handles Phase B URL+selector format and finds Button.tsx for "button" token', async () => {
    const deps = makeDeps();
    const resolver = createOriginPageResolver(deps);
    const r = await resolver({
      candidate: { location: 'https://reltwin-platform.vercel.app button#submit' },
    });
    // tag='button' → matches src/components/Button.tsx (exact basename)
    expect(r.repoRelativePath).toBe('src/components/Button.tsx');
    expect(r.matchToken).toBe('button');
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
    const r = await resolver({ candidate: { location: 'https://x.com/settings' } });
    expect(r.currentContent).toBe('export default function Settings() { return null; }');
    expect(deps.fetchFileContent).toHaveBeenCalledWith('src/pages/Settings.jsx');
  });

  it('throws when fetchFileContent returns non-string', async () => {
    const deps = {
      repoFileList: async () => REPO_FILES,
      fetchFileContent: async () => null,
    };
    const resolver = createOriginPageResolver(deps);
    await expect(resolver({ candidate: { location: 'https://x.com/settings' } }))
      .rejects.toThrowError(/non-string/);
  });

  it('throws when repoFileList returns empty', async () => {
    const resolver = createOriginPageResolver({
      repoFileList: async () => [],
      fetchFileContent: async () => '',
    });
    await expect(resolver({ candidate: { location: 'https://x.com/settings' } }))
      .rejects.toThrowError(/empty/);
  });
});
