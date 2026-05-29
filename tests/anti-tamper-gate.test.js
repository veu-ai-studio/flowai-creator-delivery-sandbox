import { describe, it, expect } from 'vitest';
import {
  isAntiTamperEnabled,
  antiTamperGateReason,
} from '../src/lib/security/anti-tamper-gate.ts';

// ─── VERCEL_ENV (process.env) — primary signal ─────────────────────────────
describe('anti-tamper-gate — VERCEL_ENV (process.env)', () => {
  it('production → enabled', () => {
    expect(
      isAntiTamperEnabled({ procEnv: { VERCEL_ENV: 'production' }, metaEnv: {} }),
    ).toBe(true);
  });

  it('preview → disabled', () => {
    expect(
      isAntiTamperEnabled({ procEnv: { VERCEL_ENV: 'preview' }, metaEnv: {} }),
    ).toBe(false);
  });

  it('development → disabled', () => {
    expect(
      isAntiTamperEnabled({ procEnv: { VERCEL_ENV: 'development' }, metaEnv: {} }),
    ).toBe(false);
  });

  it('unknown VERCEL_ENV value falls through to next signal', () => {
    expect(
      isAntiTamperEnabled({ procEnv: { VERCEL_ENV: 'staging' }, metaEnv: {} }),
    ).toBe(false); // no other signal → default off
    expect(
      isAntiTamperEnabled({
        procEnv: { VERCEL_ENV: 'staging', NODE_ENV: 'production' },
        metaEnv: {},
      }),
    ).toBe(true);
  });
});

// ─── VITE_VERCEL_ENV (import.meta.env) — secondary signal ─────────────────
describe('anti-tamper-gate — VITE_VERCEL_ENV (import.meta.env)', () => {
  it('production → enabled (when proc has no VERCEL_ENV)', () => {
    expect(
      isAntiTamperEnabled({ procEnv: {}, metaEnv: { VITE_VERCEL_ENV: 'production' } }),
    ).toBe(true);
  });

  it('preview → disabled (when proc has no VERCEL_ENV)', () => {
    expect(
      isAntiTamperEnabled({ procEnv: {}, metaEnv: { VITE_VERCEL_ENV: 'preview' } }),
    ).toBe(false);
  });

  it('development → disabled (when proc has no VERCEL_ENV)', () => {
    expect(
      isAntiTamperEnabled({ procEnv: {}, metaEnv: { VITE_VERCEL_ENV: 'development' } }),
    ).toBe(false);
  });

  it('process.env.VERCEL_ENV beats import.meta.env when both set', () => {
    expect(
      isAntiTamperEnabled({
        procEnv: { VERCEL_ENV: 'preview' },
        metaEnv: { VITE_VERCEL_ENV: 'production' },
      }),
    ).toBe(false); // proc wins
  });
});

// ─── NODE_ENV fallback ────────────────────────────────────────────────────
describe('anti-tamper-gate — NODE_ENV fallback', () => {
  it("NODE_ENV='production' enables when no Vercel signal is present", () => {
    expect(
      isAntiTamperEnabled({ procEnv: { NODE_ENV: 'production' }, metaEnv: {} }),
    ).toBe(true);
  });

  it("NODE_ENV='development' does not enable (default off)", () => {
    expect(
      isAntiTamperEnabled({ procEnv: { NODE_ENV: 'development' }, metaEnv: {} }),
    ).toBe(false);
  });

  it("NODE_ENV='test' does not enable (default off)", () => {
    expect(
      isAntiTamperEnabled({ procEnv: { NODE_ENV: 'test' }, metaEnv: {} }),
    ).toBe(false);
  });

  it('VERCEL_ENV=preview overrides NODE_ENV=production (the bug we are fixing)', () => {
    expect(
      isAntiTamperEnabled({
        procEnv: { VERCEL_ENV: 'preview', NODE_ENV: 'production' },
        metaEnv: {},
      }),
    ).toBe(false);
  });
});

// ─── import.meta.env.PROD / MODE final fallback ───────────────────────────
describe('anti-tamper-gate — Vite PROD / MODE fallback', () => {
  it('PROD=true + MODE=production enables when no other signal', () => {
    expect(
      isAntiTamperEnabled({ procEnv: {}, metaEnv: { PROD: true, MODE: 'production' } }),
    ).toBe(true);
  });

  it('PROD=true alone (without MODE=production) does NOT enable', () => {
    expect(
      isAntiTamperEnabled({ procEnv: {}, metaEnv: { PROD: true, MODE: 'preview' } }),
    ).toBe(false);
  });

  it('PROD=false does not enable', () => {
    expect(
      isAntiTamperEnabled({ procEnv: {}, metaEnv: { PROD: false, MODE: 'development' } }),
    ).toBe(false);
  });
});

// ─── Default-off safety ───────────────────────────────────────────────────
describe('anti-tamper-gate — default off', () => {
  it('returns false when no env signal is present', () => {
    expect(isAntiTamperEnabled({ procEnv: {}, metaEnv: {} })).toBe(false);
  });
});

// ─── antiTamperGateReason — observability ─────────────────────────────────
describe('antiTamperGateReason', () => {
  it('reports VERCEL_ENV source for production', () => {
    const r = antiTamperGateReason({ procEnv: { VERCEL_ENV: 'production' }, metaEnv: {} });
    expect(r).toEqual({ enabled: true, source: 'VERCEL_ENV', value: 'production' });
  });

  it('reports VERCEL_ENV source for preview disabled', () => {
    const r = antiTamperGateReason({ procEnv: { VERCEL_ENV: 'preview' }, metaEnv: {} });
    expect(r).toEqual({ enabled: false, source: 'VERCEL_ENV', value: 'preview' });
  });

  it('reports VITE_VERCEL_ENV source when proc absent', () => {
    const r = antiTamperGateReason({ procEnv: {}, metaEnv: { VITE_VERCEL_ENV: 'preview' } });
    expect(r).toEqual({ enabled: false, source: 'VITE_VERCEL_ENV', value: 'preview' });
  });

  it('reports NODE_ENV source as last server-side fallback', () => {
    const r = antiTamperGateReason({ procEnv: { NODE_ENV: 'production' }, metaEnv: {} });
    expect(r).toEqual({ enabled: true, source: 'NODE_ENV', value: 'production' });
  });

  it('reports default source when nothing matches', () => {
    const r = antiTamperGateReason({ procEnv: {}, metaEnv: {} });
    expect(r).toEqual({ enabled: false, source: 'default', value: undefined });
  });

  it('reports import.meta.PROD source when only that signal is present', () => {
    const r = antiTamperGateReason({ procEnv: {}, metaEnv: { PROD: true, MODE: 'production' } });
    expect(r).toEqual({ enabled: true, source: 'import.meta.PROD', value: true });
  });
});

// ─── Real-environment smoke ───────────────────────────────────────────────
describe('anti-tamper-gate — runs in default vitest env', () => {
  it('with no overrides, returns a boolean (no throw)', () => {
    const v = isAntiTamperEnabled();
    expect(typeof v).toBe('boolean');
  });

  it('vitest tests run in NODE_ENV=test, so default-call should be false', () => {
    // sanity: in the test runner, NODE_ENV is 'test' (or undefined). Either
    // way the default call must NOT enable anti-tamper — we don't want F12
    // blocked when developers run `npm test`.
    expect(isAntiTamperEnabled()).toBe(false);
  });
});
