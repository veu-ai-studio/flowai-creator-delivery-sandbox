import { describe, expect, it } from 'vitest';

import {
  assertPublicHttpUrl,
  createSsrGuardedLookup,
  selectPinnedPublicAddress,
} from '../api/_lib/crawler.js';

describe('api/_lib/crawler SSRF guard', () => {
  it('prefers public IPv4 when DNS returns IPv6 first', () => {
    expect(selectPinnedPublicAddress([
      { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
      { address: '93.184.216.34', family: 4 },
    ])).toBe('93.184.216.34');
  });

  it('blocks localhost before crawl dispatch', async () => {
    const verdict = await assertPublicHttpUrl('http://localhost:3000');
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/localhost/);
  });

  it.each([
    ['link-local metadata IP', 'http://169.254.169.254'],
    ['10/8 private IP', 'http://10.0.0.1'],
    ['172.16/12 private IP', 'http://172.16.0.1'],
    ['192.168/16 private IP', 'http://192.168.1.10'],
    ['100.64/10 carrier-grade NAT IP', 'http://100.64.0.1'],
  ])('blocks %s before crawl dispatch', async (_label, url) => {
    const verdict = await assertPublicHttpUrl(url);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain('blocked_private_ip');
  });

  it('blocks IPv6 loopback before crawl dispatch', async () => {
    const verdict = await assertPublicHttpUrl('http://[::1]/');
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain('blocked_private_ip');
  });

  it('allows neutral .example fixtures in tests without live DNS', async () => {
    const verdict = await assertPublicHttpUrl('https://neutral.example/');
    expect(verdict.ok).toBe(true);
    expect(verdict.pinnedAddress).toBe('93.184.216.34');
  });

  it('does not SSRF-block transient DNS lookup failures', async () => {
    const verdict = await assertPublicHttpUrl('https://flowai-dns-transient.invalid/');
    expect(verdict.ok).toBe(true);
    expect(verdict.pinnedAddress).toBeNull();
    expect(verdict.dnsWarning).toMatch(/^dns_lookup_failed:/);
  });

  it('allows transport retry DNS only when the resolved address is public', async () => {
    const lookup = createSsrGuardedLookup({
      hostname: 'public.example',
      resolver: async () => [{ address: '93.184.216.34', family: 4 }],
    });
    await new Promise((resolve, reject) => {
      lookup('public.example', {}, (error, address, family) => {
        if (error) {
          reject(error);
          return;
        }
        expect(address).toBe('93.184.216.34');
        expect(family).toBe(4);
        resolve();
      });
    });
  });

  it('keeps the successful pinned-address path on the validated public address', async () => {
    const lookup = createSsrGuardedLookup({
      hostname: 'public.example',
      pinnedAddress: '93.184.216.34',
      resolver: async () => {
        throw new Error('resolver should not run for pinned precheck address');
      },
    });
    await new Promise((resolve, reject) => {
      lookup('public.example', {}, (error, address, family) => {
        if (error) {
          reject(error);
          return;
        }
        expect(address).toBe('93.184.216.34');
        expect(family).toBe(4);
        resolve();
      });
    });
  });

  it('blocks transport retry DNS when any resolved address is private', async () => {
    const lookup = createSsrGuardedLookup({
      hostname: 'private.example',
      resolver: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.5', family: 4 },
      ],
    });
    await new Promise((resolve) => {
      lookup('private.example', {}, (error) => {
        expect(error).toBeTruthy();
        expect(error.code).toBe('ERR_FLOWAI_SSRF_BLOCKED');
        expect(error.message).toContain('blocked_private_ip:10.0.0.5');
        resolve();
      });
    });
  });

  it.each([
    ['IPv6 unique-local', 'fc00::1'],
    ['IPv4-mapped IPv6', '::ffff:93.184.216.34'],
  ])('blocks transport retry DNS for %s candidates', async (_label, address) => {
    const lookup = createSsrGuardedLookup({
      hostname: 'ipv6.example',
      resolver: async () => [{ address, family: 6 }],
    });
    await new Promise((resolve) => {
      lookup('ipv6.example', {}, (error) => {
        expect(error).toBeTruthy();
        expect(error.code).toBe('ERR_FLOWAI_SSRF_BLOCKED');
        expect(error.message).toContain(`blocked_private_ip:${address}`);
        resolve();
      });
    });
  });
});
