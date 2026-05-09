// PA #2.5b — Verify the configurable proxy URL resolver in
// PlatformHealthWidget. We import only the named helper (no JSX render),
// so this test runs in vitest's default 'node' environment.

import { describe, it, expect } from 'vitest';
import {
  resolveProxyBaseUrl,
  DEFAULT_PROXY_FALLBACK,
} from '../src/lib/platform-health/proxy-url.js';

describe('PlatformHealthWidget — resolveProxyBaseUrl', () => {
  it("uses VITE_FLOWAI_FETCH_PROXY_URL when set to '/api'", () => {
    expect(resolveProxyBaseUrl({ VITE_FLOWAI_FETCH_PROXY_URL: '/api' })).toBe('/api');
  });

  it('uses a fully-qualified URL when configured', () => {
    expect(
      resolveProxyBaseUrl({ VITE_FLOWAI_FETCH_PROXY_URL: 'https://proxy.example.com' }),
    ).toBe('https://proxy.example.com');
  });

  it('strips a trailing slash from the configured URL', () => {
    expect(
      resolveProxyBaseUrl({ VITE_FLOWAI_FETCH_PROXY_URL: 'https://proxy.example.com/' }),
    ).toBe('https://proxy.example.com');
  });

  it('falls back to DEFAULT_PROXY_FALLBACK when env is unset', () => {
    expect(resolveProxyBaseUrl({})).toBe(DEFAULT_PROXY_FALLBACK);
  });

  it('falls back when env is empty string', () => {
    expect(resolveProxyBaseUrl({ VITE_FLOWAI_FETCH_PROXY_URL: '' })).toBe(DEFAULT_PROXY_FALLBACK);
  });

  it('falls back when env is whitespace-only', () => {
    expect(resolveProxyBaseUrl({ VITE_FLOWAI_FETCH_PROXY_URL: '   ' })).toBe(DEFAULT_PROXY_FALLBACK);
  });

  it('falls back when env is non-string', () => {
    expect(resolveProxyBaseUrl({ VITE_FLOWAI_FETCH_PROXY_URL: 42 })).toBe(DEFAULT_PROXY_FALLBACK);
  });

  it('called with no arg uses runtime import.meta.env (does not throw)', () => {
    const v = resolveProxyBaseUrl();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('PlatformHealthWidget — DEFAULT_PROXY_FALLBACK', () => {
  it('is the legacy Replit proxy URL pending infra migration', () => {
    expect(DEFAULT_PROXY_FALLBACK).toBe('https://attached-assets-victor2081new.replit.app');
  });
});
