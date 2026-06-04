import { describe, expect, it } from 'vitest';

import {
  assertPublicHttpUrl,
  createSsrGuardedLookup,
} from '../api/_lib/crawler.js';

describe('api/_lib/crawler SSRF guard', () => {
  it('blocks localhost before crawl dispatch', async () => {
    const verdict = await assertPublicHttpUrl('http://localhost:3000');
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/localhost/);
  });

  it('blocks link-local metadata IP before crawl dispatch', async () => {
    const verdict = await assertPublicHttpUrl('http://169.254.169.254');
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
      resolver: async () => ({ address: '93.184.216.34', family: 4 }),
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

  it('blocks transport retry DNS when the resolved address is private', async () => {
    const lookup = createSsrGuardedLookup({
      hostname: 'private.example',
      resolver: async () => ({ address: '10.0.0.5', family: 4 }),
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
});
