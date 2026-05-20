import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, hasValidCronSecret, getClientIp, __test } from '../src/api/_lib/rateLimit.js';

function mkReq(headers = {}) {
  // Normalize header keys to lowercase to match Node's req.headers shape.
  const lower = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return { headers: lower };
}

beforeEach(() => {
  __test.memoryBuckets.clear();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.CRON_SECRET;
});

describe('getClientIp', () => {
  it('extracts first hop from x-forwarded-for', () => {
    expect(getClientIp(mkReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIp(mkReq({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
  });

  it('returns "anonymous" when no IP headers present', () => {
    expect(getClientIp(mkReq())).toBe('anonymous');
  });
});

describe('hasValidCronSecret', () => {
  it('returns false when CRON_SECRET unset', () => {
    expect(hasValidCronSecret(mkReq({ authorization: 'Bearer anything' }))).toBe(false);
  });

  it('accepts matching Authorization: Bearer header', () => {
    process.env.CRON_SECRET = 'super-secret-token';
    expect(hasValidCronSecret(mkReq({ authorization: 'Bearer super-secret-token' }))).toBe(true);
  });

  it('accepts x-cron-secret header', () => {
    process.env.CRON_SECRET = 'super-secret-token';
    expect(hasValidCronSecret(mkReq({ 'x-cron-secret': 'super-secret-token' }))).toBe(true);
  });

  it('rejects wrong token', () => {
    process.env.CRON_SECRET = 'super-secret-token';
    expect(hasValidCronSecret(mkReq({ authorization: 'Bearer wrong-token-same-len' }))).toBe(false);
  });

  it('rejects short CRON_SECRET (config error guard)', () => {
    process.env.CRON_SECRET = 'short';
    expect(hasValidCronSecret(mkReq({ authorization: 'Bearer short' }))).toBe(false);
  });
});

describe('rateLimit — in-memory sliding window', () => {
  it('allows up to capacity, blocks the (capacity+1)th', async () => {
    const req = mkReq({ 'x-forwarded-for': '10.0.0.1' });
    const opts = { capacity: 3, windowMs: 60_000, bucket: 't' };

    const v1 = await rateLimit(req, opts);
    const v2 = await rateLimit(req, opts);
    const v3 = await rateLimit(req, opts);
    const v4 = await rateLimit(req, opts);

    expect(v1.allowed).toBe(true);
    expect(v1.remaining).toBe(2);
    expect(v2.allowed).toBe(true);
    expect(v3.allowed).toBe(true);
    expect(v3.remaining).toBe(0);
    expect(v4.allowed).toBe(false);
    expect(v4.retryAfterSec).toBeGreaterThan(0);
    expect(v4.limit).toBe(3);
  });

  it('isolates buckets per IP', async () => {
    const opts = { capacity: 1, windowMs: 60_000, bucket: 't' };
    const a = await rateLimit(mkReq({ 'x-forwarded-for': '10.0.0.1' }), opts);
    const b = await rateLimit(mkReq({ 'x-forwarded-for': '10.0.0.2' }), opts);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it('CRON_SECRET bypasses limit even past capacity', async () => {
    process.env.CRON_SECRET = 'super-secret-token';
    const opts = { capacity: 1, windowMs: 60_000, bucket: 't' };
    const req = mkReq({ 'x-forwarded-for': '10.0.0.5', authorization: 'Bearer super-secret-token' });

    const v1 = await rateLimit(req, opts);
    const v2 = await rateLimit(req, opts);
    expect(v1.allowed).toBe(true);
    expect(v1.bypassed).toBe(true);
    expect(v2.allowed).toBe(true);
    expect(v2.bypassed).toBe(true);
  });

  it('Retry-After approximates window length on first denial', async () => {
    const req = mkReq({ 'x-forwarded-for': '10.0.0.9' });
    const opts = { capacity: 1, windowMs: 60_000, bucket: 't' };
    await rateLimit(req, opts);
    const denied = await rateLimit(req, opts);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBeLessThanOrEqual(60);
    expect(denied.retryAfterSec).toBeGreaterThan(58);
  });
});
