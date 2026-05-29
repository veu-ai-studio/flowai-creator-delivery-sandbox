import { describe, it, expect } from 'vitest';
import { __internals } from '../../api/_lib/sourceAcquisition.js';

describe('sourceAcquisition — URL parsing', () => {
  it('parses owner/repo shorthand', () => {
    expect(__internals.parseGitHubUrl('owner/repo')).toEqual({ owner: 'owner', repo: 'repo', ref: null });
  });
  it('parses owner/repo@ref shorthand', () => {
    expect(__internals.parseGitHubUrl('owner/repo@main')).toEqual({ owner: 'owner', repo: 'repo', ref: 'main' });
  });
  it('parses https://github.com/owner/repo[.git]', () => {
    expect(__internals.parseGitHubUrl('https://github.com/owner/repo')).toEqual({ owner: 'owner', repo: 'repo', ref: null });
    expect(__internals.parseGitHubUrl('https://github.com/owner/repo.git')).toEqual({ owner: 'owner', repo: 'repo', ref: null });
  });
  it('rejects non-GitHub hosts', () => {
    expect(__internals.parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
  });
  it('rejects garbage input', () => {
    expect(__internals.parseGitHubUrl('')).toBeNull();
    expect(__internals.parseGitHubUrl(null)).toBeNull();
    expect(__internals.parseGitHubUrl(123)).toBeNull();
  });
});

describe('sourceAcquisition — framework detection', () => {
  it('detects vite when package.json has vite dependency', () => {
    const files = [{ path: 'package.json', content: JSON.stringify({ dependencies: {}, devDependencies: { vite: '^5' } }) }];
    expect(__internals.detectFramework(files)).toBe('vite');
  });
  it('detects next when package.json has next dependency', () => {
    const files = [{ path: 'package.json', content: JSON.stringify({ dependencies: { next: '^14' } }) }];
    expect(__internals.detectFramework(files)).toBe('next');
  });
  it('returns unknown for a missing/unparseable package.json', () => {
    expect(__internals.detectFramework([])).toBe('unknown');
    expect(__internals.detectFramework([{ path: 'package.json', content: 'not json' }])).toBe('unknown');
  });
});

describe('sourceAcquisition — tar utilities', () => {
  it('stripTopDir removes the leading github-prepended directory', () => {
    expect(__internals.stripTopDir('owner-repo-abc123/src/App.jsx')).toBe('src/App.jsx');
    expect(__internals.stripTopDir('no-slash')).toBeNull();
  });
});
