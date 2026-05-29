// tests/security/test-bypass-token.test.js
//
// Verifies the X-Test-Bypass-Token issuance / verification module
// (src/lib/security/testBypassToken.js) and the Self-Protection
// middleware (src/lib/security/selfProtection.js) per FlowAI
// self-adversarial test plan §9.1.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { generateKeyPairSync, createHash, randomUUID, createSign } from 'node:crypto';
import {
  issueToken,
  verifyToken,
  __test_only__ as tokenInternals,
} from '../../src/lib/security/testBypassToken.js';
import {
  makeSelfProtectionMiddleware,
  __test_only__ as mwInternals,
} from '../../src/lib/security/selfProtection.js';

// ─────────────────────────────────────────────────────────────────────
// Keypair fixtures — generated once per suite so tests share them.
// ─────────────────────────────────────────────────────────────────────

let devKeys; let prodKeys;

beforeAll(() => {
  devKeys = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  prodKeys = generateKeyPairSync('ec', { namedCurve: 'P-256' });

  // Wire PEMs into process.env so the module's default key-loader path
  // is exercised by the happy-path tests.
  process.env.TEST_BYPASS_PRIVATE_KEY_DEV  = devKeys.privateKey.export({ type: 'pkcs8', format: 'pem' });
  process.env.TEST_BYPASS_PUBLIC_KEY_DEV   = devKeys.publicKey.export({ type: 'spki',  format: 'pem' });
  process.env.TEST_BYPASS_PRIVATE_KEY_PROD = prodKeys.privateKey.export({ type: 'pkcs8', format: 'pem' });
  process.env.TEST_BYPASS_PUBLIC_KEY_PROD  = prodKeys.publicKey.export({ type: 'spki',  format: 'pem' });
});

function fp(text = 'fixture-ua + 192.0.2.0/24') {
  return createHash('sha256').update(text).digest('hex');
}

function freshArgs(overrides = {}) {
  return {
    testSuiteId: 'flowai-adversarial',
    runId:       randomUUID(),
    env:         'prod',
    scope:       ['bot-detection-bypass', 'agent13-allowlist'],
    fingerprint: fp(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Issuance + verification roundtrip
// ─────────────────────────────────────────────────────────────────────

describe('testBypassToken — roundtrip', () => {
  it('issues a token that verifies under the matching public key', () => {
    const token = issueToken(freshArgs({ env: 'prod' }));
    const v = verifyToken(token, 'prod');
    expect(v.valid).toBe(true);
    expect(v.error).toBeUndefined();
    expect(v.claims.testSuiteId).toBe('flowai-adversarial');
    expect(v.claims.env).toBe('prod');
    expect(v.claims.scope).toEqual(['bot-detection-bypass', 'agent13-allowlist']);
  });

  it('issues and verifies for both prod and dev-SUT environments', () => {
    for (const env of ['prod', 'dev-SUT']) {
      const token = issueToken(freshArgs({ env }));
      const v = verifyToken(token, env);
      expect(v.valid, `env=${env}`).toBe(true);
    }
  });

  it('encodes the JWT as three base64url segments separated by dots', () => {
    const token = issueToken(freshArgs());
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    for (const p of parts) expect(p).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('caps exp - iat at 3600 seconds (1 hour) per §9.1', () => {
    const now = 1_700_000_000;
    const token = issueToken(freshArgs(), { now, ttlSeconds: 9999 });
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    expect(claims.exp - claims.iat).toBe(3600);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Expired token rejection
// ─────────────────────────────────────────────────────────────────────

describe('testBypassToken — expiry', () => {
  it('rejects a token whose exp has passed', () => {
    const issuedAt = 1_700_000_000;
    const token = issueToken(freshArgs(), { now: issuedAt, ttlSeconds: 60 });
    const v = verifyToken(token, 'prod', { now: issuedAt + 61 });
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/exp.*expired/i);
  });

  it('accepts a token issued at "now" with non-zero TTL', () => {
    const issuedAt = 1_700_000_000;
    const token = issueToken(freshArgs(), { now: issuedAt, ttlSeconds: 60 });
    const v = verifyToken(token, 'prod', { now: issuedAt + 30 });
    expect(v.valid).toBe(true);
  });

  it('rejects a token whose iat is more than 60s in the future (skew guard)', () => {
    const issuedAt = 1_700_000_000;
    const token = issueToken(freshArgs(), { now: issuedAt });
    const v = verifyToken(token, 'prod', { now: issuedAt - 120 });
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/iat.*future/i);
  });

  it('rejects when claims.exp - iat exceeds the 3600s cap (handcrafted)', () => {
    const issuedAt = 1_700_000_000;
    // Hand-build a token whose exp is too far out, then sign with the
    // real private key so signature passes but TTL-cap check fails.
    const claims = {
      iss:         'flowai-adversarial-suite',
      sub:         'test-runner',
      testSuiteId: 'flowai-adversarial',
      runId:       randomUUID(),
      env:         'prod',
      iat:         issuedAt,
      exp:         issuedAt + 7200, // > 3600
      scope:       ['bot-detection-bypass'],
      fingerprint: fp(),
    };
    const header = tokenInternals.base64urlEncode(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
    const payload = tokenInternals.base64urlEncode(JSON.stringify(claims));
    const signingInput = `${header}.${payload}`;
    const sigDer = createSign('SHA256').update(signingInput).sign(prodKeys.privateKey);
    const sigJose = tokenInternals.derToJose(sigDer);
    const token = `${signingInput}.${tokenInternals.base64urlEncode(sigJose)}`;
    const v = verifyToken(token, 'prod', { now: issuedAt + 100 });
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/max TTL/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Wrong-env rejection
// ─────────────────────────────────────────────────────────────────────

describe('testBypassToken — wrong-env rejection', () => {
  it('rejects a prod-issued token when verified as dev-SUT (key mismatch)', () => {
    const token = issueToken(freshArgs({ env: 'prod' }));
    const v = verifyToken(token, 'dev-SUT');
    expect(v.valid).toBe(false);
    // Either env-claim mismatch OR signature-mismatch — both are
    // legitimate rejections for this case (depending on which check
    // fires first). Both signal "wrong env" to the operator.
    expect(v.error).toMatch(/env mismatch|signature/i);
  });

  it('rejects a dev-issued token when verified as prod', () => {
    const token = issueToken(freshArgs({ env: 'dev-SUT' }));
    const v = verifyToken(token, 'prod');
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/env mismatch|signature/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Tampered signature rejection
// ─────────────────────────────────────────────────────────────────────

describe('testBypassToken — tampered signature', () => {
  it('rejects a token whose signature bytes are flipped', () => {
    const token = issueToken(freshArgs());
    const [h, p, s] = token.split('.');
    // Flip the middle byte of the signature decisively so it can't
    // coincidentally remain a valid ECDSA signature. We decode the
    // base64url, XOR a known offset by 0xff, then re-encode.
    const sigBuf = tokenInternals.base64urlDecode(s);
    sigBuf[Math.floor(sigBuf.length / 2)] ^= 0xff;
    const tampered = tokenInternals.base64urlEncode(sigBuf);
    const v = verifyToken(`${h}.${p}.${tampered}`, 'prod');
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/signature/i);
  });

  it('rejects a token whose payload is mutated (signature stays)', () => {
    const token = issueToken(freshArgs());
    const [h, p, s] = token.split('.');
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    claims.scope = ['bot-detection-bypass', 'agent13-allowlist', 'EXTRA-EVIL-SCOPE'];
    // The extra scope will be rejected pre-crypto by the scope check;
    // verify that path. (Tamper-to-include-only-valid-scopes would
    // instead trip the signature check, also covered.)
    const tamperedPayload = tokenInternals.base64urlEncode(JSON.stringify(claims));
    const v = verifyToken(`${h}.${tamperedPayload}.${s}`, 'prod');
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/scope.*unsupported|signature/i);
  });

  it('rejects a token whose header.alg is downgraded to HS256', () => {
    const token = issueToken(freshArgs());
    const [, p, s] = token.split('.');
    const evilHeader = tokenInternals.base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const v = verifyToken(`${evilHeader}.${p}.${s}`, 'prod');
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/header.*alg/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Missing-claim rejection
// ─────────────────────────────────────────────────────────────────────

describe('testBypassToken — claim hygiene', () => {
  it('refuses to issue when runId is not a UUID v4', () => {
    expect(() => issueToken(freshArgs({ runId: 'not-a-uuid' }))).toThrow(/runId.*UUID v4/i);
  });

  it('refuses to issue when fingerprint is not 64 hex chars', () => {
    expect(() => issueToken(freshArgs({ fingerprint: 'short' }))).toThrow(/fingerprint/i);
  });

  it('refuses to issue when scope contains an unsupported value', () => {
    expect(() => issueToken(freshArgs({ scope: ['totally-fake-scope'] }))).toThrow(/scope/i);
  });

  it('rejects a verification when a required claim is missing', () => {
    const token = issueToken(freshArgs());
    const [h, p, s] = token.split('.');
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    delete claims.fingerprint;
    const tamperedPayload = tokenInternals.base64urlEncode(JSON.stringify(claims));
    const v = verifyToken(`${h}.${tamperedPayload}.${s}`, 'prod');
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/fingerprint.*missing|signature/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Self-Protection middleware
// ─────────────────────────────────────────────────────────────────────

describe('selfProtection middleware — request annotation + audit', () => {
  let audit;

  beforeEach(() => { audit = vi.fn(); });

  function buildReq({ token } = {}) {
    return {
      headers: token ? { 'x-test-bypass-token': token } : {},
    };
  }
  function buildRes(onDone) {
    const res = {
      statusCode: 200,
      _headers: {},
      _body: null,
      _done: false,
      status(c) { this.statusCode = c; return this; },
      setHeader(k, v) { this._headers[k.toLowerCase()] = v; },
      json(b) {
        this._body = b;
        if (!this._done) { this._done = true; onDone && onDone(); }
        return this;
      },
      end(b) {
        this._body = b;
        if (!this._done) { this._done = true; onDone && onDone(); }
        return this;
      },
    };
    return res;
  }

  // Helper that resolves on either next() invocation OR response write.
  function runMw(mw, req, makeRes = buildRes) {
    return new Promise((resolve) => {
      const res = makeRes(() => resolve(res));
      mw(req, res, () => resolve(res));
    });
  }

  it('passes through when no X-Test-Bypass-Token header is present', async () => {
    const mw = makeSelfProtectionMiddleware({ auditLog: audit, envOverride: 'prod' });
    const req = buildReq();
    const res = await runMw(mw, req);
    expect(req.selfProtection.bypass).toBe(false);
    expect(req.selfProtection.reason).toBe('no_header');
    expect(audit).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('annotates req.selfProtection={bypass:true,claims} on a valid token + emits audit', async () => {
    const token = issueToken(freshArgs({ env: 'prod' }));
    const mw = makeSelfProtectionMiddleware({ auditLog: audit, envOverride: 'prod' });
    const req = buildReq({ token });
    await runMw(mw, req);
    expect(req.selfProtection.bypass).toBe(true);
    expect(req.selfProtection.claims.testSuiteId).toBe('flowai-adversarial');
    expect(audit).toHaveBeenCalledTimes(1);
    const event = audit.mock.calls[0][0];
    expect(event.topic).toBe(mwInternals.AUDIT_TOPIC);
    expect(event.outcome).toBe('bypass_granted');
    expect(event.env).toBe('prod');
    expect(event.claims.runId).toBe(req.selfProtection.claims.runId);
    // CRITICAL: the audit event MUST NOT include the raw token bytes.
    expect(JSON.stringify(event)).not.toContain(token);
  });

  it('returns 401 + emits audit on an invalid token', async () => {
    const mw = makeSelfProtectionMiddleware({ auditLog: audit, envOverride: 'prod' });
    const req = buildReq({ token: 'totally.bogus.token' });
    const res = await runMw(mw, req);
    expect(req.selfProtection.bypass).toBe(false);
    expect(req.selfProtection.reason).toBe('invalid_token');
    expect(res.statusCode).toBe(401);
    expect(res._body).toEqual({ error: 'invalid_test_bypass_token' });
    expect(audit).toHaveBeenCalledTimes(1);
    const event = audit.mock.calls[0][0];
    expect(event.outcome).toBe('invalid_token');
    expect(typeof event.error).toBe('string');
    // CRITICAL: audit event MUST NOT include the raw token bytes.
    expect(JSON.stringify(event)).not.toContain('totally.bogus.token');
  });

  it('does not throw if auditLog throws (sink failures must not break request handling)', async () => {
    const throwingAudit = vi.fn(() => { throw new Error('audit sink down'); });
    const mw = makeSelfProtectionMiddleware({ auditLog: throwingAudit, envOverride: 'prod' });
    const token = issueToken(freshArgs({ env: 'prod' }));
    const req = buildReq({ token });
    await runMw(mw, req);
    expect(req.selfProtection.bypass).toBe(true);
  });

  it('resolves env=prod from VERCEL_ENV=production', () => {
    expect(mwInternals.resolveEnv({ VERCEL_ENV: 'production' })).toBe('prod');
    expect(mwInternals.resolveEnv({ VERCEL_ENV: 'preview' })).toBe('dev-SUT');
    expect(mwInternals.resolveEnv({ VERCEL_ENV: 'development' })).toBe('dev-SUT');
    expect(mwInternals.resolveEnv({ NODE_ENV: 'production' })).toBe('prod');
    expect(mwInternals.resolveEnv({})).toBe('dev-SUT');
  });
});
