// W4 auth-flow tests.
//
// Coverage:
//   1. authBackend primitives (createUser, findUser, authenticateUser,
//      createSession, getSession, revokeSession, sign, userToPublic).
//   2. /api/auth/sign-up handler  — happy + duplicate + 400 cases.
//   3. /api/auth/sign-in handler  — happy + bad-password + uniform error.
//   4. /api/auth/session handler  — GET verifies, DELETE revokes, 401 on
//      missing/invalid token.
//   5. Password reset flow         — asserts the reset endpoint DOES NOT
//      exist today (W4 readiness signal). Pinning the absence prevents drift
//      until a reset endpoint is shipped, at which point this test should be
//      flipped to a positive assertion.
//   6. Magic link flow             — same pattern: asserts absence today.
//   7. JWT signing                 — asserts no JWT library / secret is
//      currently used. Includes a fail-closed reference signer that future
//      code can adopt; the test pins the contract that a missing secret
//      throws rather than emitting an unsigned/weak token (per PA-AUTH-05
//      pattern).
//
// All network is stubbed: globalThis.fetch throws if called.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  hashPassword,
  verifyPassword,
  createUser,
  findUser,
  authenticateUser,
  userToPublic,
  createSession,
  getSession,
  revokeSession,
  sign as hmacSign,
  rateLimitOk,
  isValidEmail,
} from '../api/_lib/authBackend.js';

import {
  getRequestContext,
  isOperatorContext,
  requireOperatorAuth,
} from '../api/_lib/auth.js';

import signUpHandler from '../api/auth/sign-up.js';
import signInHandler from '../api/auth/sign-in.js';
import sessionHandler from '../api/auth/session.js';

// ─── Outbound-network guard ──────────────────────────────────────────────

const _origFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = () => {
    throw new Error('Network call attempted in unit test (fetch is mocked)');
  };
});
afterAll(() => {
  globalThis.fetch = _origFetch;
});

// ─── Mock req/res helpers ────────────────────────────────────────────────

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; this.ended = true; return this; },
    send(obj) { this.body = obj; this.ended = true; return this; },
    end() { this.ended = true; return this; },
  };
}

function makeReq({ method = 'GET', headers = {}, body, query } = {}) {
  return {
    method,
    headers: { 'user-agent': 'vitest-auth', ...headers },
    body,
    query: query || {},
    socket: { remoteAddress: '127.0.0.1' },
  };
}

// Each test that mutates the in-memory user store must use a unique email.
function uniqEmail() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.test`;
}

// Bypass per-IP rate limits across tests by using a unique IP per call.
function uniqIp() {
  const a = 100 + Math.floor(Math.random() * 100);
  const b = Math.floor(Math.random() * 256);
  const c = Math.floor(Math.random() * 256);
  const d = Math.floor(Math.random() * 256);
  return `${a}.${b}.${c}.${d}`;
}

// ─── authBackend primitives ──────────────────────────────────────────────

describe('authBackend / user store + sessions', () => {
  it('createUser persists, findUser retrieves, authenticateUser checks pwd', () => {
    const email = uniqEmail();
    const u = createUser({ email, password: 'correct horse battery', productId: 'pressai', orgId: 'veu-ai-studio' });
    expect(u.id).toMatch(/^usr_/);
    expect(u.email).toBe(email.toLowerCase().trim());
    expect(u.org_id).toBe('veu-ai-studio');
    expect(u.product_id).toBe('pressai');
    expect(u.email_verified).toBe(false);
    expect(u.password_hash).toMatch(/^scrypt\$/);

    const found = findUser({ email, productId: 'pressai', orgId: 'veu-ai-studio' });
    expect(found).toBe(u);

    expect(authenticateUser({ email, password: 'correct horse battery', productId: 'pressai', orgId: 'veu-ai-studio' })).toMatchObject({ ok: true });
    expect(authenticateUser({ email, password: 'wrong', productId: 'pressai', orgId: 'veu-ai-studio' })).toEqual({ ok: false, reason: 'invalid_credentials' });
    // Unknown email → same uniform error
    expect(authenticateUser({ email: 'nobody@nowhere.tld', password: 'anything', productId: 'pressai', orgId: 'veu-ai-studio' })).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  it('createUser rejects duplicate (org, product, email)', () => {
    const email = uniqEmail();
    createUser({ email, password: 'longenough', productId: 'pressai', orgId: 'veu-ai-studio' });
    expect(() => createUser({ email, password: 'longenough', productId: 'pressai', orgId: 'veu-ai-studio' })).toThrow(/already exists/);
  });

  it('createUser allows the same email to exist under a different (org, product) tuple', () => {
    const email = uniqEmail();
    const a = createUser({ email, password: 'longenough', productId: 'pressai', orgId: 'veu-ai-studio' });
    const b = createUser({ email, password: 'longenough', productId: 'saige',   orgId: 'veu-ai-studio' });
    expect(a.id).not.toBe(b.id);
  });

  it('userToPublic strips password_hash', () => {
    const u = createUser({ email: uniqEmail(), password: 'longenough', productId: 'pressai', orgId: 'veu-ai-studio' });
    const pub = userToPublic(u);
    expect(pub).not.toHaveProperty('password_hash');
    expect(pub.email).toBe(u.email);
  });

  it('createSession + getSession + revokeSession round-trip', () => {
    const sess = createSession({ userId: 'usr_x', productId: 'pressai', orgId: 'veu-ai-studio', ttlMs: 60_000 });
    expect(sess.token).toMatch(/^[0-9a-f]{64}$/);
    expect(getSession(sess.token)).toBe(sess);
    expect(revokeSession(sess.token)).toBe(true);
    expect(getSession(sess.token)).toBeNull();
  });

  it('getSession returns null for expired sessions and removes them', () => {
    const sess = createSession({ userId: 'usr_y', productId: 'pressai', orgId: 'veu-ai-studio', ttlMs: -1 });
    expect(getSession(sess.token)).toBeNull();
  });

  it('hmacSign is deterministic for the same (value, secret)', () => {
    const a = hmacSign('hello', 'secret');
    const b = hmacSign('hello', 'secret');
    const c = hmacSign('hello', 'different');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    // Match Node's built-in HMAC for the same inputs
    expect(a).toBe(createHmac('sha256', 'secret').update('hello').digest('hex'));
  });
});

// ─── /api/auth/sign-up ────────────────────────────────────────────────────

describe('operator proof auth', () => {
  it('accepts FLOWAI_INTERNAL_SECRET via x-flowai-operator-secret without a Clerk session', async () => {
    const oldOperator = process.env.FLOWAI_OPERATOR_SECRET;
    const oldInternal = process.env.FLOWAI_INTERNAL_SECRET;
    const oldService = process.env.FLOWAI_SERVICE_KEY;
    delete process.env.FLOWAI_OPERATOR_SECRET;
    delete process.env.FLOWAI_SERVICE_KEY;
    process.env.FLOWAI_INTERNAL_SECRET = 'internal-proof-secret';
    try {
      const req = makeReq({
        headers: {
          'x-flowai-operator-secret': 'internal-proof-secret',
          'x-flowai-org-id': 'veu-ai-studio',
        },
        body: { productId: 'm3-upgrader-proof' },
      });
      const res = makeRes();
      const ctx = await requireOperatorAuth(req, res);

      expect(res.ended).toBe(false);
      expect(ctx).toMatchObject({
        authenticated: true,
        authMode: 'operator-secret',
        orgId: 'veu-ai-studio',
        productId: 'm3-upgrader-proof',
      });
      expect(isOperatorContext(await getRequestContext(req))).toBe(false);
    } finally {
      if (oldOperator === undefined) delete process.env.FLOWAI_OPERATOR_SECRET;
      else process.env.FLOWAI_OPERATOR_SECRET = oldOperator;
      if (oldInternal === undefined) delete process.env.FLOWAI_INTERNAL_SECRET;
      else process.env.FLOWAI_INTERNAL_SECRET = oldInternal;
      if (oldService === undefined) delete process.env.FLOWAI_SERVICE_KEY;
      else process.env.FLOWAI_SERVICE_KEY = oldService;
    }
  });
});

describe('/api/auth/sign-up handler', () => {
  it('OPTIONS returns 204', async () => {
    const req = makeReq({ method: 'OPTIONS' });
    const res = makeRes();
    await signUpHandler(req, res);
    expect(res.statusCode).toBe(204);
  });

  it('rejects non-POST with 405', async () => {
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    await signUpHandler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('400 when product_id is missing', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: uniqEmail(), password: 'longenough' },
    });
    const res = makeRes();
    await signUpHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/product_id/);
  });

  it('400 on invalid email', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: 'not-an-email', password: 'longenough', product_id: 'pressai' },
    });
    const res = makeRes();
    await signUpHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('400 on too-short password', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: uniqEmail(), password: 'short', product_id: 'pressai' },
    });
    const res = makeRes();
    await signUpHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  it('201 on valid sign-up; returns user + session', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: uniqEmail(), password: 'longenough', product_id: 'pressai' },
    });
    const res = makeRes();
    await signUpHandler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.id).toMatch(/^usr_/);
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.body.session.token).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.session.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('409 on duplicate sign-up under same (org, product, email)', async () => {
    const email = uniqEmail();
    const ip = uniqIp();
    const reqBase = { email, password: 'longenough', product_id: 'pressai' };

    const r1 = makeRes();
    await signUpHandler(makeReq({ method: 'POST', headers: { 'x-forwarded-for': ip }, body: reqBase }), r1);
    expect(r1.statusCode).toBe(201);

    // Second signup with the same email — different IP so we don't trip the
    // 5/min rate limit on the same IP.
    const r2 = makeRes();
    await signUpHandler(makeReq({ method: 'POST', headers: { 'x-forwarded-for': uniqIp() }, body: reqBase }), r2);
    expect(r2.statusCode).toBe(409);
  });

  it('429 once the per-IP rate limit (5/min) is exceeded', async () => {
    const ip = uniqIp();
    const lastStatuses = [];
    for (let i = 0; i < 6; i++) {
      const res = makeRes();
      await signUpHandler(makeReq({
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
        body: { email: uniqEmail(), password: 'longenough', product_id: 'pressai' },
      }), res);
      lastStatuses.push(res.statusCode);
    }
    // First 5 should be 201; 6th should be 429.
    expect(lastStatuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(lastStatuses[5]).toBe(429);
  });
});

// ─── /api/auth/sign-in ────────────────────────────────────────────────────

describe('/api/auth/sign-in handler', () => {
  // Set up a known user to log in with
  const KNOWN_EMAIL = uniqEmail();
  const KNOWN_PASSWORD = 'correct horse battery';

  beforeAll(() => {
    createUser({
      email: KNOWN_EMAIL,
      password: KNOWN_PASSWORD,
      productId: 'pressai',
      orgId: 'veu-ai-studio',
    });
  });

  it('200 on correct password; returns user + session', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: KNOWN_EMAIL, password: KNOWN_PASSWORD, product_id: 'pressai' },
    });
    const res = makeRes();
    await signInHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.email).toBe(KNOWN_EMAIL);
    expect(res.body.session.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('401 with uniform error on wrong password', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: KNOWN_EMAIL, password: 'wrong', product_id: 'pressai' },
    });
    const res = makeRes();
    await signInHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  it('401 with same uniform error on unknown email (no enumeration)', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: 'nobody@nowhere.tld', password: 'whatever', product_id: 'pressai' },
    });
    const res = makeRes();
    await signInHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  it('400 when product_id is missing', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: KNOWN_EMAIL, password: KNOWN_PASSWORD },
    });
    const res = makeRes();
    await signInHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/product_id/);
  });

  it('400 on invalid email', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email: 'no-at', password: KNOWN_PASSWORD, product_id: 'pressai' },
    });
    const res = makeRes();
    await signInHandler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('429 once the per-IP rate limit (10/min) is exceeded', async () => {
    const ip = uniqIp();
    let last = 0;
    for (let i = 0; i < 11; i++) {
      const res = makeRes();
      await signInHandler(makeReq({
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
        body: { email: KNOWN_EMAIL, password: 'wrong', product_id: 'pressai' },
      }), res);
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });
});

// ─── /api/auth/session ────────────────────────────────────────────────────

describe('/api/auth/session handler', () => {
  // Set up a user, sign in, then exercise the session endpoint with the token.
  let TOKEN;
  beforeAll(async () => {
    const email = uniqEmail();
    createUser({ email, password: 'longenough', productId: 'pressai', orgId: 'veu-ai-studio' });
    const res = makeRes();
    await signInHandler(makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email, password: 'longenough', product_id: 'pressai' },
    }), res);
    expect(res.statusCode).toBe(200);
    TOKEN = res.body.session.token;
  });

  it('GET without token returns 401', async () => {
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    await sessionHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.reason).toBe('no_token');
  });

  it('GET with invalid token returns 401', async () => {
    const req = makeReq({
      method: 'GET',
      headers: { authorization: 'Bearer 0123456789abcdef'.repeat(4) },
    });
    const res = makeRes();
    await sessionHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.reason).toBe('invalid_or_expired');
  });

  it('GET with valid Bearer token returns the session payload', async () => {
    const req = makeReq({
      method: 'GET',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    const res = makeRes();
    await sessionHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.session.product_id).toBe('pressai');
  });

  it('GET via ?token=… also works', async () => {
    const req = makeReq({ method: 'GET', query: { token: TOKEN } });
    const res = makeRes();
    await sessionHandler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it('DELETE revokes the session; subsequent GET returns 401', async () => {
    const reqDel = makeReq({ method: 'DELETE', headers: { authorization: `Bearer ${TOKEN}` } });
    const resDel = makeRes();
    await sessionHandler(reqDel, resDel);
    expect(resDel.statusCode).toBe(200);
    expect(resDel.body.ok).toBe(true);

    const reqGet = makeReq({ method: 'GET', headers: { authorization: `Bearer ${TOKEN}` } });
    const resGet = makeRes();
    await sessionHandler(reqGet, resGet);
    expect(resGet.statusCode).toBe(401);
  });

  it('Other methods return 405', async () => {
    // Need a fresh valid token for this assertion since the previous test revoked it
    const email = uniqEmail();
    createUser({ email, password: 'longenough', productId: 'pressai', orgId: 'veu-ai-studio' });
    const sIn = makeRes();
    await signInHandler(makeReq({
      method: 'POST',
      headers: { 'x-forwarded-for': uniqIp() },
      body: { email, password: 'longenough', product_id: 'pressai' },
    }), sIn);
    const newToken = sIn.body.session.token;

    const req = makeReq({ method: 'POST', headers: { authorization: `Bearer ${newToken}` } });
    const res = makeRes();
    await sessionHandler(req, res);
    expect(res.statusCode).toBe(405);
  });
});

// ─── Password reset / magic link / JWT — absence pinning ─────────────────

describe('password reset flow', () => {
  it('no /api/auth/forgot-password handler exists yet (pin until shipped)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const p = resolve(here, '..', 'api', 'auth', 'forgot-password.js');
    expect(existsSync(p)).toBe(false);
  });

  it('no /api/auth/reset-password handler exists yet (pin until shipped)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const p = resolve(here, '..', 'api', 'auth', 'reset-password.js');
    expect(existsSync(p)).toBe(false);
  });
});

describe('magic-link sign-in flow', () => {
  it('no /api/auth/magic-link handler exists yet (pin until shipped)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const name of ['magic-link.js', 'magic.js', 'send-magic-link.js']) {
      expect(existsSync(resolve(here, '..', 'api', 'auth', name))).toBe(false);
    }
  });
});

describe('JWT signing (PA-AUTH-05 fail-closed pattern)', () => {
  it('no JWT library is installed in package.json (pin until adopted)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      // eslint-disable-next-line no-undef
      require('node:fs').readFileSync(resolve(here, '..', 'package.json'), 'utf8'),
    );
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    expect(all.jsonwebtoken).toBeUndefined();
    expect(all.jose).toBeUndefined();
  });

  // Reference fail-closed signer that the test pins. When a JWT path lands,
  // import the real signer from api/_lib/auth.js (or equivalent) and replace
  // this stand-in.
  function failClosedJwtSign(payload, { secretEnv = 'JWT_SECRET', env = process.env } = {}) {
    const secret = env[secretEnv];
    if (typeof secret !== 'string' || secret.length < 32) {
      throw new Error(`auth.signJwt: ${secretEnv} is missing or too short`);
    }
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }

  it('throws when secret env var is missing (fail closed)', () => {
    expect(() => failClosedJwtSign({ sub: 'u' }, { secretEnv: 'JWT_SECRET_NEVER_SET', env: {} })).toThrow(/missing or too short/);
  });

  it('throws when secret is too short (<32 chars) — fail closed', () => {
    expect(() => failClosedJwtSign({ sub: 'u' }, { secretEnv: 'JWT_SECRET', env: { JWT_SECRET: 'short' } })).toThrow(/missing or too short/);
  });

  it('emits a 3-segment JWT when the secret is well-formed', () => {
    const token = failClosedJwtSign({ sub: 'u' }, { secretEnv: 'JWT_SECRET', env: { JWT_SECRET: 'a'.repeat(48) } });
    expect(token.split('.').length).toBe(3);
  });
});

// ─── Sanity: imported handlers + lib are real callable units ─────────────

describe('module shape', () => {
  it('handlers and lib functions are callable', () => {
    expect(typeof signUpHandler).toBe('function');
    expect(typeof signInHandler).toBe('function');
    expect(typeof sessionHandler).toBe('function');
    expect(typeof createUser).toBe('function');
    expect(typeof authenticateUser).toBe('function');
    expect(typeof isValidEmail).toBe('function');
    expect(typeof rateLimitOk).toBe('function');
  });
});
