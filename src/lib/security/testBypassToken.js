// src/lib/security/testBypassToken.js
//
// X-Test-Bypass-Token issuance + verification per the FlowAI
// self-adversarial test plan §9.1.
//
// JWT-style token signed with ECDSA P-256 (alg = ES256). Private key is
// loaded from process.env per environment:
//   env='dev'  → TEST_BYPASS_PRIVATE_KEY_DEV (issuance) /
//                TEST_BYPASS_PUBLIC_KEY_DEV  (verification)
//   env='prod' → TEST_BYPASS_PRIVATE_KEY_PROD /
//                TEST_BYPASS_PUBLIC_KEY_PROD
// Keys are PKCS8 (private) and SPKI (public) PEM strings, exactly as
// produced by scripts/setup-test-bypass-keys.mjs.
//
// Claim schema (per §9.1):
//   {
//     iss:         'flowai-adversarial-suite',
//     sub:         'test-runner',
//     testSuiteId: 'flowai-adversarial',
//     runId:       '<uuid v4>',
//     env:         'prod' | 'dev-SUT',
//     iat:         <unix seconds>,
//     exp:         <unix seconds, max iat + 3600>,
//     scope:       ['bot-detection-bypass', 'agent13-allowlist'],
//     fingerprint: '<sha256 of expected User-Agent + IP CIDR>',
//   }
//
// Spec constraints honored:
//   - exp must be ≤ iat + 3600 (1-hour cap).
//   - runId must be a valid UUID v4.
//   - env claim must match the verification-time environment param
//     (prod token verified with dev key → rejected).
//   - Tampered signatures → rejected.
//   - Missing required claims → rejected.
//
// Implementation notes:
//   - Uses Node's built-in `crypto` module — no jose / jsonwebtoken
//     dependency, keeps the surface tight and CI fast.
//   - Signature is the raw IEEE-P1363 ECDSA encoding (r||s, 64 bytes
//     for P-256), as JWA RFC 7518 §3.4 specifies for ES256. Node
//     crypto.sign emits DER by default; we convert to raw.
//   - Base64url encoding per RFC 4648 §5 (no padding).
//
// Public surface:
//   issueToken({ testSuiteId, runId, env, scope, fingerprint, ...overrides })
//     → string token
//   verifyToken(token, env, { now? } = {})
//     → { valid: boolean, claims?: object, error?: string }

import { createSign, createVerify, createPrivateKey, createPublicKey } from 'node:crypto';

const ALG = 'ES256';
const ALG_HEADER = Object.freeze({ alg: ALG, typ: 'JWT' });
const ALG_HEADER_B64 = base64urlEncode(JSON.stringify(ALG_HEADER));

const MAX_TTL_SECONDS = 3600;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED_CLAIMS = Object.freeze([
  'iss', 'sub', 'testSuiteId', 'runId', 'env', 'iat', 'exp', 'scope', 'fingerprint',
]);
const VALID_ENVS = Object.freeze(new Set(['prod', 'dev-SUT']));
const SUPPORTED_SCOPES = Object.freeze(new Set(['bot-detection-bypass', 'agent13-allowlist']));

// ─────────────────────────────────────────────────────────────────────
// Base64url (RFC 4648 §5, no padding) helpers
// ─────────────────────────────────────────────────────────────────────

function base64urlEncode(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(s) {
  if (typeof s !== 'string') throw new TypeError('base64urlDecode: string required');
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const std = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(std, 'base64');
}

// ─────────────────────────────────────────────────────────────────────
// ECDSA signature conversion: DER ↔ JOSE raw (r||s)
// ─────────────────────────────────────────────────────────────────────
//
// Node's crypto.sign('SHA256', ...) on a P-256 key emits a DER-encoded
// ECDSA signature (ASN.1 SEQUENCE { r INTEGER, s INTEGER }). JWA ES256
// requires the raw IEEE-P1363 encoding: r and s as 32-byte big-endian
// unsigned integers, concatenated. We translate both ways.

const P256_R_S_BYTES = 32;
const JOSE_SIG_LEN = P256_R_S_BYTES * 2;

function derToJose(derSig) {
  if (!Buffer.isBuffer(derSig) || derSig[0] !== 0x30) {
    throw new Error('invalid ECDSA DER signature');
  }
  let offset = 2;
  if (derSig[1] & 0x80) offset = 2 + (derSig[1] & 0x7f);
  if (derSig[offset] !== 0x02) throw new Error('invalid ECDSA DER (r tag)');
  const rLen = derSig[offset + 1];
  let r = derSig.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (derSig[offset] !== 0x02) throw new Error('invalid ECDSA DER (s tag)');
  const sLen = derSig[offset + 1];
  let s = derSig.slice(offset + 2, offset + 2 + sLen);
  // Strip leading 0x00 padding inserted by DER for "positive integers".
  if (r.length > P256_R_S_BYTES && r[0] === 0x00) r = r.slice(1);
  if (s.length > P256_R_S_BYTES && s[0] === 0x00) s = s.slice(1);
  // Left-pad to fixed width.
  const rPadded = Buffer.concat([Buffer.alloc(P256_R_S_BYTES - r.length), r]);
  const sPadded = Buffer.concat([Buffer.alloc(P256_R_S_BYTES - s.length), s]);
  return Buffer.concat([rPadded, sPadded]);
}

function joseToDer(joseSig) {
  if (!Buffer.isBuffer(joseSig) || joseSig.length !== JOSE_SIG_LEN) {
    throw new Error(`invalid ECDSA JOSE signature length: ${joseSig?.length}`);
  }
  const r = stripLeadingZeros(joseSig.slice(0, P256_R_S_BYTES));
  const s = stripLeadingZeros(joseSig.slice(P256_R_S_BYTES));
  // Re-introduce 0x00 prefix if high bit is set (DER positive-int rule).
  const rDer = (r[0] & 0x80) ? Buffer.concat([Buffer.from([0x00]), r]) : r;
  const sDer = (s[0] & 0x80) ? Buffer.concat([Buffer.from([0x00]), s]) : s;
  const seqBody = Buffer.concat([
    Buffer.from([0x02, rDer.length]), rDer,
    Buffer.from([0x02, sDer.length]), sDer,
  ]);
  return Buffer.concat([Buffer.from([0x30, seqBody.length]), seqBody]);
}

function stripLeadingZeros(buf) {
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0x00) i += 1;
  return buf.slice(i);
}

// ─────────────────────────────────────────────────────────────────────
// Key resolution
// ─────────────────────────────────────────────────────────────────────

function envSuffix(env) {
  // Caller passes 'prod' or 'dev-SUT'; Doppler env names follow the
  // dispatch convention DEV / PROD.
  if (env === 'prod') return 'PROD';
  if (env === 'dev-SUT' || env === 'dev') return 'DEV';
  throw new Error(`unsupported env: ${env}`);
}

function loadPrivateKey(env) {
  const suffix = envSuffix(env);
  const pem = process.env[`TEST_BYPASS_PRIVATE_KEY_${suffix}`];
  if (!pem || pem.trim().length === 0) {
    throw new Error(`TEST_BYPASS_PRIVATE_KEY_${suffix} not present in env`);
  }
  return createPrivateKey({ key: pem, format: 'pem' });
}

function loadPublicKey(env) {
  const suffix = envSuffix(env);
  const pem = process.env[`TEST_BYPASS_PUBLIC_KEY_${suffix}`];
  if (!pem || pem.trim().length === 0) {
    throw new Error(`TEST_BYPASS_PUBLIC_KEY_${suffix} not present in env`);
  }
  return createPublicKey({ key: pem, format: 'pem' });
}

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

/**
 * Mint a new X-Test-Bypass-Token.
 *
 * @param {object} args
 * @param {string} args.testSuiteId — required, e.g. 'flowai-adversarial'.
 * @param {string} args.runId       — required, UUID v4.
 * @param {'prod'|'dev-SUT'} args.env — required.
 * @param {string[]} args.scope     — required, subset of SUPPORTED_SCOPES.
 * @param {string} args.fingerprint — required, sha256 hex of expected UA + IP CIDR.
 * @param {object} [opts]
 * @param {string} [opts.iss='flowai-adversarial-suite']
 * @param {string} [opts.sub='test-runner']
 * @param {number} [opts.ttlSeconds=3600] — capped at 3600 by spec.
 * @param {number} [opts.now]            — override iat, in unix seconds (testing).
 * @param {object} [opts.keyOverride]    — KeyObject to sign with (testing).
 * @returns {string} The compact JWT-style token.
 */
export function issueToken({ testSuiteId, runId, env, scope, fingerprint }, opts = {}) {
  if (typeof testSuiteId !== 'string' || testSuiteId.length === 0) {
    throw new Error('issueToken: testSuiteId required');
  }
  if (typeof runId !== 'string' || !UUID_V4_RE.test(runId)) {
    throw new Error('issueToken: runId must be a UUID v4');
  }
  if (!VALID_ENVS.has(env)) {
    throw new Error(`issueToken: env must be one of ${[...VALID_ENVS].join(', ')}`);
  }
  if (!Array.isArray(scope) || scope.length === 0) {
    throw new Error('issueToken: scope must be a non-empty array');
  }
  for (const s of scope) {
    if (!SUPPORTED_SCOPES.has(s)) throw new Error(`issueToken: unsupported scope "${s}"`);
  }
  if (typeof fingerprint !== 'string' || !/^[0-9a-f]{64}$/i.test(fingerprint)) {
    throw new Error('issueToken: fingerprint must be 64 hex chars (sha256)');
  }
  const now = typeof opts.now === 'number' ? opts.now : Math.floor(Date.now() / 1000);
  const ttl = Math.min(typeof opts.ttlSeconds === 'number' ? opts.ttlSeconds : MAX_TTL_SECONDS, MAX_TTL_SECONDS);
  if (ttl <= 0) throw new Error('issueToken: ttlSeconds must be > 0');

  const claims = {
    iss:         typeof opts.iss === 'string' ? opts.iss : 'flowai-adversarial-suite',
    sub:         typeof opts.sub === 'string' ? opts.sub : 'test-runner',
    testSuiteId,
    runId,
    env,
    iat:         now,
    exp:         now + ttl,
    scope:       [...scope],
    fingerprint,
  };

  const payloadB64 = base64urlEncode(JSON.stringify(claims));
  const signingInput = `${ALG_HEADER_B64}.${payloadB64}`;
  const key = opts.keyOverride ?? loadPrivateKey(env);
  const sigDer = createSign('SHA256').update(signingInput).sign(key);
  const sigJose = derToJose(sigDer);
  const sigB64 = base64urlEncode(sigJose);
  return `${signingInput}.${sigB64}`;
}

/**
 * Verify an X-Test-Bypass-Token.
 *
 * @param {string} token
 * @param {'prod'|'dev-SUT'} env — the environment doing the verification.
 * @param {object} [opts]
 * @param {number} [opts.now]         — override "now" for testing.
 * @param {object} [opts.keyOverride] — KeyObject to verify with (testing).
 * @returns {{ valid: boolean, claims?: object, error?: string }}
 */
export function verifyToken(token, env, opts = {}) {
  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, error: 'token: must be a non-empty string' };
  }
  if (!VALID_ENVS.has(env)) {
    return { valid: false, error: `env: must be one of ${[...VALID_ENVS].join(', ')}` };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'token: not a 3-part compact JWT' };
  }
  const [headerB64, payloadB64, sigB64] = parts;

  // Header check — must be ES256 / JWT.
  let header;
  try { header = JSON.parse(base64urlDecode(headerB64).toString('utf8')); }
  catch { return { valid: false, error: 'header: malformed' }; }
  if (header.alg !== ALG || header.typ !== 'JWT') {
    return { valid: false, error: `header: alg/typ unsupported (alg=${header.alg}, typ=${header.typ})` };
  }

  // Parse claims first so we can reject obvious-missing before doing crypto.
  let claims;
  try { claims = JSON.parse(base64urlDecode(payloadB64).toString('utf8')); }
  catch { return { valid: false, error: 'payload: malformed' }; }

  for (const k of REQUIRED_CLAIMS) {
    if (claims[k] === undefined || claims[k] === null) {
      return { valid: false, error: `claims.${k}: missing` };
    }
  }
  if (claims.env !== env) {
    // Prod token used in dev (or vice versa) — reject.
    return { valid: false, error: `claims.env mismatch: token says "${claims.env}", verifier is "${env}"` };
  }
  if (typeof claims.iat !== 'number' || typeof claims.exp !== 'number') {
    return { valid: false, error: 'claims.iat/exp must be numeric' };
  }
  if (claims.exp - claims.iat > MAX_TTL_SECONDS) {
    return { valid: false, error: `claims.exp exceeds max TTL (${MAX_TTL_SECONDS}s)` };
  }
  const now = typeof opts.now === 'number' ? opts.now : Math.floor(Date.now() / 1000);
  if (now >= claims.exp) {
    return { valid: false, error: 'claims.exp: token expired' };
  }
  if (now + 60 < claims.iat) {
    // 60s clock-skew tolerance — reject tokens claiming to be issued
    // more than a minute in the future.
    return { valid: false, error: 'claims.iat: token issued in the future' };
  }
  if (typeof claims.runId !== 'string' || !UUID_V4_RE.test(claims.runId)) {
    return { valid: false, error: 'claims.runId: must be a UUID v4' };
  }
  if (!Array.isArray(claims.scope) || claims.scope.length === 0) {
    return { valid: false, error: 'claims.scope: must be a non-empty array' };
  }
  for (const s of claims.scope) {
    if (!SUPPORTED_SCOPES.has(s)) {
      return { valid: false, error: `claims.scope: unsupported scope "${s}"` };
    }
  }
  if (typeof claims.fingerprint !== 'string' || !/^[0-9a-f]{64}$/i.test(claims.fingerprint)) {
    return { valid: false, error: 'claims.fingerprint: must be 64 hex chars (sha256)' };
  }

  // Signature check.
  let key;
  try { key = opts.keyOverride ?? loadPublicKey(env); }
  catch (e) { return { valid: false, error: `verify: ${e.message}` }; }

  let sigDer;
  try { sigDer = joseToDer(base64urlDecode(sigB64)); }
  catch (e) { return { valid: false, error: `signature: ${e.message}` }; }

  const signingInput = `${headerB64}.${payloadB64}`;
  const ok = createVerify('SHA256').update(signingInput).verify(key, sigDer);
  if (!ok) return { valid: false, error: 'signature: invalid' };

  return { valid: true, claims };
}

// Exported for unit tests (avoids re-implementing the conversion logic).
export const __test_only__ = Object.freeze({
  base64urlEncode,
  base64urlDecode,
  derToJose,
  joseToDer,
  MAX_TTL_SECONDS,
  UUID_V4_RE,
});
