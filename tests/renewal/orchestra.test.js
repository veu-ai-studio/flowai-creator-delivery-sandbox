import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notYetWired, memberOk, memberError, isWiredOk } from '../../src/lib/orchestra/member.js';
import { listMembers, getMember, dispatch } from '../../src/lib/orchestra/index.js';
import { __internals as claudeInternals, safeJson } from '../../src/lib/orchestra/claudeCode.js';
import { __internals as vercelInternals } from '../../src/lib/orchestra/vercel.js';
import * as stubs from '../../src/lib/orchestra/stubs.js';

describe('OrchestraMember interface', () => {
  it('notYetWired() shapes a deferred error result', () => {
    const r = notYetWired('foo', 'code-patch', 'placeholder');
    expect(r.ok).toBe(false);
    expect(r.deferred).toBe(true);
    expect(r.error).toMatch(/placeholder/);
    expect(r.member).toBe('foo');
  });
  it('isWiredOk() recognises only ok:true + non-deferred', () => {
    expect(isWiredOk(memberOk('x', 'y', {}))).toBe(true);
    expect(isWiredOk({ ok: true, deferred: true })).toBe(false);
    expect(isWiredOk(memberError('x', 'y', 'no'))).toBe(false);
    expect(isWiredOk(null)).toBe(false);
  });
});

describe('Orchestra registry', () => {
  it('lists 12 members including 6 wired (codex + claudeCode + vercel + browserless + playwright + perplexity)', () => {
    const members = listMembers();
    expect(members.length).toBe(12);
    const wired = members.filter((m) => m.wired).map((m) => m.id);
    expect(wired).toContain('codex');
    expect(wired).toContain('claude-code');
    expect(wired).toContain('vercel');
    expect(wired).toContain('browserless');
    expect(wired).toContain('playwright');
    expect(wired).toContain('perplexity');
    const notWired = members.filter((m) => !m.wired).map((m) => m.id);
    expect(notWired).toEqual(expect.arrayContaining(['base44', 'lovable', 'v0', 'cursor', 'replit', 'openrouter']));
  });
  it('getMember resolves by id', () => {
    expect(getMember('codex').wired).toBe(true);
    expect(getMember('claude-code').wired).toBe(true);
    expect(getMember('base44').wired).toBe(false);
    expect(getMember('does-not-exist')).toBeNull();
  });
});

describe('Stub adapters return deferred:true predictably', () => {
  const stubModules = [
    ['base44', stubs.base44, 'source-retrieval'],
    ['lovable', stubs.lovable, 'generate-from-scratch'],
    ['v0', stubs.v0, 'code-patch'],
    ['cursor', stubs.cursor, 'code-patch'],
    ['replit', stubs.replit, 'deploy'],
    ['openrouter', stubs.openrouter, 'generate-from-scratch'],
  ];
  for (const [id, stub, action] of stubModules) {
    it(`${id} stub returns deferred:true with "not yet wired"`, async () => {
      const r = await stub.invoke(action, {});
      expect(r.ok).toBe(false);
      expect(r.deferred).toBe(true);
      expect(r.error).toMatch(/not yet wired/);
    });
  }
});

describe('claudeCode adapter — helper internals', () => {
  it('safeJson parses plain + fenced + recovered JSON', () => {
    expect(safeJson('{"a":1}')).toEqual({ a: 1 });
    expect(safeJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(safeJson('intro {"x":2} trailing')).toEqual({ x: 2 });
    expect(safeJson('no json here')).toBeNull();
  });
  it('ensureRequiredFiles backfills the canonical Vite-React skeleton', () => {
    const files = claudeInternals.ensureRequiredFiles([], { productConcept: 'My App', productName: 'My App' });
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(['index.html', 'package.json', 'src/App.jsx', 'src/index.css', 'src/main.jsx', 'vite.config.js']);
    const pkg = JSON.parse(files.find((f) => f.path === 'package.json').content);
    expect(pkg.dependencies.react).toBeDefined();
    expect(pkg.devDependencies.vite).toBeDefined();
    expect(pkg.scripts.build).toBe('vite build');
    expect(files.find((f) => f.path === 'index.html').content).toMatch(/<script type="module" src="\/src\/main\.jsx"><\/script>/);
  });
  it('sanitizeName produces a valid project slug', () => {
    expect(claudeInternals.sanitizeName('My App!!')).toBe('my-app');
    expect(claudeInternals.sanitizeName('')).toBe('flowai-renewed');
  });
});

describe('vercel adapter — sanitization + encoding', () => {
  it('sanitizeProjectName lowercases, replaces non-allowed chars, suffixes with timestamp', () => {
    const a = vercelInternals.sanitizeProjectName('My Renewal #42');
    expect(a).toMatch(/^my-renewal-42-[a-z0-9]+$/);
  });
  it('sanitizeProjectSlug lowercases without appending a suffix', () => {
    expect(vercelInternals.sanitizeProjectSlug('FlowAI M2 Proof!!')).toBe('flowai-m2-proof');
  });
  it('encodeBase64Utf8 round-trips a string', () => {
    const enc = vercelInternals.encodeBase64Utf8('hello world');
    expect(Buffer.from(enc, 'base64').toString('utf8')).toBe('hello world');
  });
  it('omits preview target from inline deployment request bodies', () => {
    expect(vercelInternals.buildDeploymentSubmitBody({
      projectName: 'flowai-m2-proof',
      encodedFiles: [],
      target: 'preview',
      framework: 'vite',
    })).toEqual({
      name: 'flowai-m2-proof',
      files: [],
      projectSettings: { framework: 'vite' },
    });
    expect(vercelInternals.buildDeploymentSubmitBody({
      projectName: 'flowai-prod-proof',
      encodedFiles: [],
      target: 'production',
      framework: 'vite',
    })).toMatchObject({ target: 'production' });
  });
});

describe('Orchestra dispatcher routing', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('routes code-patch to codex by default', async () => {
    const codex = await import('../../src/lib/orchestra/codex.js');
    const spy = vi.spyOn(codex, 'invoke').mockResolvedValueOnce({ ok: true, member: 'codex', action: 'code-patch', data: { patchedContent: '// patched' } });
    const r = await dispatch('code-patch', { filePath: 'x.js', sourceContent: '// x', issueSpec: { category: 'missing-cta' } });
    expect(spy).toHaveBeenCalledWith('code-patch', expect.any(Object));
    expect(r.member).toBe('codex');
  });

  it('routes code-patch → claudeCode invoke', async () => {
    // Spy on the claudeCode module's invoke via a fresh import.
    const claudeCode = await import('../../src/lib/orchestra/claudeCode.js');
    const spy = vi.spyOn(claudeCode, 'invoke').mockResolvedValueOnce({ ok: true, member: 'claude-code', action: 'code-patch', data: { patchedContent: '// patched' } });
    const r = await dispatch('code-patch', { filePath: 'x.js', sourceContent: '// x', issueSpec: { category: 'missing-cta' } }, { memberId: 'claude-code' });
    expect(spy).toHaveBeenCalledWith('code-patch', expect.any(Object));
    expect(r.member).toBe('claude-code');
  });

  it('routes deploy → vercel invoke', async () => {
    const vercel = await import('../../src/lib/orchestra/vercel.js');
    const spy = vi.spyOn(vercel, 'invoke').mockResolvedValueOnce({ ok: true, member: 'vercel', action: 'deploy', data: { url: 'https://x.vercel.app' } });
    const r = await dispatch('deploy', { files: [{ path: 'index.html', content: '<html></html>' }] });
    expect(spy).toHaveBeenCalledWith('deploy', expect.any(Object));
    expect(r.member).toBe('vercel');
  });

  it('returns an error result for an unknown action', async () => {
    const r = await dispatch('not-a-real-action', {});
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no member supports/);
  });
});
