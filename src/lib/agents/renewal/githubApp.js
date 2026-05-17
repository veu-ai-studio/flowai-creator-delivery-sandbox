/**
 * GitHub App installation token minter — Self-Renewal §3.2.
 *
 * Mints a short-lived (≤ 1 hour) installation access token by:
 *   1. Building a JWT signed with the App's private key (RS256)
 *   2. POSTing to /app/installations/{installationId}/access_tokens
 *   3. Returning { token, expiresAt }
 *
 * Per the spec, the token MUST NEVER be logged or persisted. The caller
 * uses it for the duration of one Self-Renewal run and discards it at
 * run end. No external JWT library is used — Node's built-in `crypto`
 * module is sufficient for RS256.
 *
 * Constructor envs (read from process.env unless `opts` overrides):
 *   - GITHUB_APP_ID                  (required)
 *   - GITHUB_APP_PRIVATE_KEY         (required; PEM, may contain literal \n)
 *   - GITHUB_APP_INSTALLATION_ID     (required)
 *
 * Honest scope: this module assumes a single FlowAI App + a single
 * default installation. Per-installation lookup (e.g. when multiple
 * operator orgs install the App separately) is a future extension —
 * for Phase A's "first product is mypreglife" milestone, the default
 * installation ID is sufficient.
 */

'use strict';

import { createSign } from 'node:crypto';

const GITHUB_API_BASE = 'https://api.github.com';

// JWT validity window:
//   iat: now - 60s   (clock skew tolerance — GitHub recommends this)
//   exp: now + 600s  (10 minutes — GitHub's maximum is 10 min)
const JWT_IAT_SKEW_SECONDS = 60;
const JWT_TTL_SECONDS = 600;

/**
 * Base64-url encode a Buffer or string. Per RFC 7515 §2: replace '+' with
 * '-', '/' with '_', and strip '=' padding.
 *
 * @param {Buffer|string} input
 * @returns {string}
 */
function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Normalize a PEM private key string. Env vars typically store the PEM
 * with literal "\n" escape sequences that need to become real newlines
 * before crypto can parse them. Already-normalized PEMs pass through
 * unchanged.
 *
 * @param {string} pem
 * @returns {string}
 */
function normalizePem(pem) {
  if (typeof pem !== 'string') return '';
  // If the string already contains real newlines, return as-is.
  if (pem.includes('\n')) return pem;
  // Otherwise replace literal `\n` with newlines.
  return pem.replace(/\\n/g, '\n');
}

/**
 * Sign a JWT payload with the App's private key (RS256).
 *
 * @param {object} payload — JWT claims (iat, exp, iss)
 * @param {string} privateKeyPem
 * @returns {string} the signed JWT (three base64url-encoded segments
 *   joined by '.')
 */
export function signAppJwt(payload, privateKeyPem) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('signAppJwt: payload must be an object');
  }
  if (typeof privateKeyPem !== 'string' || privateKeyPem.length === 0) {
    throw new TypeError('signAppJwt: privateKeyPem must be a non-empty string');
  }
  const header = { alg: 'RS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  let signatureBuf;
  try {
    signatureBuf = signer.sign(normalizePem(privateKeyPem));
  } catch (e) {
    // Re-throw with a descriptive message that DOES NOT include the
    // private-key contents (some crypto errors echo the input).
    throw new Error(
      `signAppJwt: RS256 signing failed — ${e?.message ?? String(e)}. ` +
      'Verify the App private key is a valid PEM-encoded RSA key.',
    );
  }
  return `${signingInput}.${base64UrlEncode(signatureBuf)}`;
}

/**
 * Build the App JWT claims object for a given App ID + clock reading.
 *
 * @param {string|number} appId
 * @param {number} nowMs — current epoch milliseconds
 * @returns {{ iat: number, exp: number, iss: string }}
 */
export function buildAppJwtClaims(appId, nowMs) {
  const nowSec = Math.floor(nowMs / 1000);
  return {
    iat: nowSec - JWT_IAT_SKEW_SECONDS,
    exp: nowSec + JWT_TTL_SECONDS,
    iss: String(appId),
  };
}

/**
 * Mint a GitHub App installation access token.
 *
 * @param {object} [opts]
 * @param {string|number} [opts.appId]          — default: process.env.GITHUB_APP_ID
 * @param {string} [opts.privateKey]            — default: process.env.GITHUB_APP_PRIVATE_KEY
 * @param {string|number} [opts.installationId] — default: process.env.GITHUB_APP_INSTALLATION_ID
 * @param {() => number} [opts.now]             — default: Date.now (overridable for tests)
 * @param {typeof globalThis.fetch} [opts.fetch] — default: globalThis.fetch (overridable for tests)
 *
 * @returns {Promise<{ token: string, expiresAt: string, permissions?: object, repositorySelection?: string }>}
 *   - token: the 1-hour installation access token. The caller MUST NOT
 *     log it; this module also refuses to log it in error paths.
 *   - expiresAt: ISO-8601 timestamp from GitHub's response.
 *   - permissions / repositorySelection: pass-through metadata GitHub
 *     returns; useful for debugging without leaking the token itself.
 */
export async function getInstallationToken(opts = {}) {
  const appId = opts.appId ?? process.env.GITHUB_APP_ID;
  const privateKey = opts.privateKey ?? process.env.GITHUB_APP_PRIVATE_KEY;
  const installationId = opts.installationId ?? process.env.GITHUB_APP_INSTALLATION_ID;
  const now = typeof opts.now === 'function' ? opts.now : Date.now;
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;

  if (!appId) {
    throw new Error(
      'getInstallationToken: GITHUB_APP_ID is required. ' +
      'Set process.env.GITHUB_APP_ID (Doppler key in production) or pass opts.appId.',
    );
  }
  if (!privateKey) {
    throw new Error(
      'getInstallationToken: GITHUB_APP_PRIVATE_KEY is required. ' +
      'Set process.env.GITHUB_APP_PRIVATE_KEY (Doppler key in production) or pass opts.privateKey. ' +
      'The value MUST be the full PEM (BEGIN/END RSA PRIVATE KEY).',
    );
  }
  if (!installationId) {
    throw new Error(
      'getInstallationToken: GITHUB_APP_INSTALLATION_ID is required. ' +
      'Set process.env.GITHUB_APP_INSTALLATION_ID (Doppler key in production) or pass opts.installationId.',
    );
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'getInstallationToken: fetch is not available on globalThis and no opts.fetch was provided. ' +
      'Node 18+ is required; older runtimes need a fetch polyfill.',
    );
  }

  const jwt = signAppJwt(buildAppJwtClaims(appId, now()), privateKey);
  const url = `${GITHUB_API_BASE}/app/installations/${encodeURIComponent(String(installationId))}/access_tokens`;

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        // No User-Agent override — GitHub requires one but fetch
        // provides a default. Vercel/Node fetch sets it automatically.
      },
    });
  } catch (e) {
    throw new Error(
      `getInstallationToken: network error calling GitHub installation-tokens endpoint — ${e?.message ?? String(e)}`,
    );
  }

  if (!response.ok) {
    let bodyText = '';
    try { bodyText = await response.text(); } catch { /* ignore */ }
    // Surface a descriptive error that names the status. The response
    // body may include hints (e.g. "Bad credentials" on 401), but it
    // does NOT contain the token — that's the point of a 4xx response.
    throw new Error(
      `getInstallationToken: GitHub returned ${response.status} ${response.statusText}. ` +
      `Body: ${bodyText.slice(0, 300)}`,
    );
  }

  let parsed;
  try {
    parsed = await response.json();
  } catch (e) {
    throw new Error(
      `getInstallationToken: GitHub response was not JSON — ${e?.message ?? String(e)}`,
    );
  }

  if (typeof parsed.token !== 'string' || !parsed.token) {
    throw new Error(
      'getInstallationToken: GitHub response missing `token` field — ' +
      'verify the App is installed on this installationId and has not been revoked.',
    );
  }
  if (typeof parsed.expires_at !== 'string') {
    throw new Error(
      'getInstallationToken: GitHub response missing `expires_at` field — unexpected shape.',
    );
  }

  // The token itself is the only secret value in `parsed`. Other fields
  // (expires_at, permissions, repository_selection) are non-sensitive
  // metadata safe to surface to the caller for observability.
  return {
    token: parsed.token,
    expiresAt: parsed.expires_at,
    permissions: parsed.permissions ?? null,
    repositorySelection: parsed.repository_selection ?? null,
  };
}

export const __internals = Object.freeze({
  GITHUB_API_BASE,
  JWT_IAT_SKEW_SECONDS,
  JWT_TTL_SECONDS,
  base64UrlEncode,
  normalizePem,
  buildAppJwtClaims,
});
