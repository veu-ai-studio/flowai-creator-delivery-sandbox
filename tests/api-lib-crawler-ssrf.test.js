import { describe, expect, it } from 'vitest';

import { assertPublicHttpUrl } from '../api/_lib/crawler.js';

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
});
