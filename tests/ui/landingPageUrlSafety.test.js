import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync('src/pages/LandingPage.jsx', 'utf8');
const testFetchBlock = src.slice(
  src.indexOf('const testFetch ='),
  src.indexOf('// ── Objective voice')
);

describe('LandingPage URL safety and live fetch screen', () => {
  it('runs client URL safety before the authenticated live fetch endpoint', () => {
    expect(src).toContain('export function evaluateClientUrlSafety');
    expect(testFetchBlock).not.toContain("fetch('/api/research-url'");
    expect(testFetchBlock).not.toContain('fetch("/api/research-url"');
    expect(testFetchBlock).not.toContain('sessionStorage.setItem');
    expect(testFetchBlock).toContain("fetch('/api/fetch-url'");
    expect(testFetchBlock).toContain("credentials: 'include'");
    expect(testFetchBlock).toContain("force: 'simple-fetch'");
    expect(testFetchBlock).toContain("setFetchStatus('ok')");
    expect(testFetchBlock).toContain("setFetchStatus('warning')");
  });

  it('keeps a format-valid public URL launch-enabled while reporting live fetch separately', () => {
    expect(src).toContain('URL format valid — forge will attempt live crawl and stop if unreachable.');
    expect(src).toContain("return { status: 'valid'");
    expect(src).toContain('launchBlocked: false');
    expect(src).toContain("shownStatus === 'valid'");
  });

  it('hard blocks localhost and link-local URLs from launch', () => {
    expect(src).toContain("host === 'localhost'");
    expect(src).toContain('a === 127');
    expect(src).toContain('a === 169 && b === 254');
    expect(src).toContain("return { status: 'blocked'");
    expect(src).toContain('launchBlocked: true');
    expect(src).toContain('!isUrlLaunchBlocked');
  });

  it('blocks common private IPv4 ranges and zero-address input', () => {
    expect(src).toContain('a === 10');
    expect(src).toContain('a === 0');
    expect(src).toContain('a === 172 && b >= 16 && b <= 31');
    expect(src).toContain('a === 192 && b === 168');
  });

  it('surfaces invalid schemes without treating them as live reachability failures', () => {
    expect(src).toContain("!['http:', 'https:'].includes(parsed.protocol)");
    expect(src).toContain('Invalid scheme — enter an http(s) URL.');
    expect(src).toContain("shownStatus === 'invalid'");
  });

  it('auto-starts the run panel after URL launch without widening the API surface', () => {
    expect(src).toContain('<RunConstructionPanel');
    expect(src).toContain('autoStart');
    expect(src).toContain("fetch('/api/fetch-url'");
    expect(src).not.toContain('requireAuthHard');
  });
});
