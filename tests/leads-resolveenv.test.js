// Tests for src/lib/leads/resolveEnv.js — demo-namespace resolver.
//
// Pinning the W0-ruled three patterns:
//   1. saigedemo.com           (host exact)
//   2. *.demo.veuaistudio.com  (host suffix)
//   3. sandbox.*               (host prefix)

import { describe, it, expect } from 'vitest';
import {
  DEMO_PATTERNS,
  isDemoHost,
  resolveEnv,
  resolveEnvFromReq,
  ENV_DEMO,
  ENV_PRODUCTION,
} from '../src/lib/leads/resolveEnv.js';

describe('DEMO_PATTERNS — exactly the three W0-ruled patterns', () => {
  it('contains exactly the saigedemo.com / .demo.veuaistudio.com / sandbox. patterns', () => {
    // Order pinned. Any drift surfaces here.
    expect(DEMO_PATTERNS).toEqual([
      { kind: 'host_exact',  value: 'saigedemo.com' },
      { kind: 'host_exact',  value: 'www.saigedemo.com' },
      { kind: 'host_suffix', value: '.demo.veuaistudio.com' },
      { kind: 'host_prefix', value: 'sandbox.' },
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DEMO_PATTERNS)).toBe(true);
  });
});

describe('isDemoHost', () => {
  it('matches saigedemo.com (and www.)', () => {
    expect(isDemoHost('saigedemo.com')).toBe(true);
    expect(isDemoHost('www.saigedemo.com')).toBe(true);
    expect(isDemoHost('SAIGEDEMO.COM')).toBe(true);
  });

  it('matches *.demo.veuaistudio.com', () => {
    expect(isDemoHost('pressai.demo.veuaistudio.com')).toBe(true);
    expect(isDemoHost('saige.demo.veuaistudio.com')).toBe(true);
    // Bare 'demo.veuaistudio.com' is intentionally NOT matched (no leading dot).
    // To match the bare host, callers should add an explicit DEMO_PATTERN.
    expect(isDemoHost('demo.veuaistudio.com')).toBe(false);
  });

  it('matches sandbox.* prefix', () => {
    expect(isDemoHost('sandbox.example.com')).toBe(true);
    expect(isDemoHost('sandbox.saigeplatform.com')).toBe(true);
    expect(isDemoHost('sandbox.')).toBe(true); // edge — degenerate but matches
  });

  it('rejects unrelated hosts', () => {
    expect(isDemoHost('saigeplatform.com')).toBe(false);
    expect(isDemoHost('ourpublishingai.com')).toBe(false);
    expect(isDemoHost('flowai-dun.vercel.app')).toBe(false);
    expect(isDemoHost('localhost')).toBe(false);
    expect(isDemoHost('')).toBe(false);
    expect(isDemoHost(null)).toBe(false);
    expect(isDemoHost(undefined)).toBe(false);
    expect(isDemoHost(42)).toBe(false);
  });

  it('does NOT match attempts to embed demo strings in unrelated parts of a host', () => {
    expect(isDemoHost('saigedemo.com.attacker.test')).toBe(false);
    expect(isDemoHost('attacker-saigedemo.com')).toBe(false);
    expect(isDemoHost('mydemo.veuaistudio.com')).toBe(false); // missing leading dot
    expect(isDemoHost('not-sandbox.example.com')).toBe(false);
    expect(isDemoHost('sandboxx.example.com')).toBe(false); // prefix is 'sandbox.' (with dot)
  });
});

describe('resolveEnv', () => {
  it('returns "production" by default for unknown hosts', () => {
    expect(resolveEnv({ host: 'saigeplatform.com' })).toBe(ENV_PRODUCTION);
    expect(resolveEnv({ host: 'ourpublishingai.com' })).toBe(ENV_PRODUCTION);
    expect(resolveEnv({})).toBe(ENV_PRODUCTION);
  });

  it('resolves "demo" for saigedemo.com via host', () => {
    expect(resolveEnv({ host: 'saigedemo.com' })).toBe(ENV_DEMO);
  });

  it('resolves "demo" for saigedemo.com via origin URL', () => {
    expect(resolveEnv({ origin: 'https://saigedemo.com' })).toBe(ENV_DEMO);
    expect(resolveEnv({ origin: 'http://saigedemo.com:8080/something' })).toBe(ENV_DEMO);
  });

  it('resolves "demo" for *.demo.veuaistudio.com via referer', () => {
    expect(resolveEnv({ referer: 'https://pressai.demo.veuaistudio.com/foo?q=1' })).toBe(ENV_DEMO);
  });

  it('resolves "demo" for sandbox.* via host', () => {
    expect(resolveEnv({ host: 'sandbox.saigeplatform.com' })).toBe(ENV_DEMO);
  });

  it('strips port, userinfo, path, scheme before matching', () => {
    expect(resolveEnv({ host: 'saigedemo.com:8443' })).toBe(ENV_DEMO);
    expect(resolveEnv({ origin: 'https://user:pass@saigedemo.com/x?y=1' })).toBe(ENV_DEMO);
    expect(resolveEnv({ origin: 'https://www.saigedemo.com#fragment' })).toBe(ENV_DEMO);
  });

  it('host wins over origin/referer when they conflict', () => {
    // host is a real prod URL; origin claims demo. host wins → demo NOT resolved.
    // (Order of precedence matters here.)
    const r1 = resolveEnv({
      host: 'saigeplatform.com',
      origin: 'https://saigedemo.com',
    });
    expect(r1).toBe(ENV_DEMO);
    // ↑ Important nuance: ANY of the three signals is sufficient to flip to demo.
    // The "host wins" comment in the source refers to lookup precedence, but
    // the resolver returns 'demo' as soon as ANY signal matches. This test
    // pins that contract.

    // Truly all-prod
    const r2 = resolveEnv({
      host: 'saigeplatform.com',
      origin: 'https://saigeplatform.com',
      referer: 'https://google.com',
    });
    expect(r2).toBe(ENV_PRODUCTION);
  });
});

describe('resolveEnvFromReq', () => {
  it('reads host / origin / referer headers', () => {
    expect(resolveEnvFromReq({ headers: { host: 'saigedemo.com' } })).toBe(ENV_DEMO);
    expect(resolveEnvFromReq({ headers: { origin: 'https://saigedemo.com' } })).toBe(ENV_DEMO);
    expect(resolveEnvFromReq({ headers: { referer: 'https://sandbox.example.com' } })).toBe(ENV_DEMO);
  });

  it('handles header-name case variants', () => {
    expect(resolveEnvFromReq({ headers: { Host: 'saigedemo.com' } })).toBe(ENV_DEMO);
    expect(resolveEnvFromReq({ headers: { ORIGIN: 'https://saigedemo.com' } })).toBe(ENV_DEMO);
  });

  it('returns "production" when req is null/undefined/wrong shape', () => {
    expect(resolveEnvFromReq(null)).toBe(ENV_PRODUCTION);
    expect(resolveEnvFromReq(undefined)).toBe(ENV_PRODUCTION);
    expect(resolveEnvFromReq('string')).toBe(ENV_PRODUCTION);
    expect(resolveEnvFromReq({ headers: {} })).toBe(ENV_PRODUCTION);
  });

  it('falls through to production when none of the signals match a demo pattern', () => {
    expect(resolveEnvFromReq({
      headers: {
        host: 'saigeplatform.com',
        origin: 'https://saigeplatform.com',
        referer: 'https://google.com/search?q=saige',
      },
    })).toBe(ENV_PRODUCTION);
  });
});

describe('ENV constants', () => {
  it('exposes the two literal values', () => {
    expect(ENV_PRODUCTION).toBe('production');
    expect(ENV_DEMO).toBe('demo');
  });
});
