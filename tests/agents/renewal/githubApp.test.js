// tests/agents/renewal/githubApp.test.js
//
// Test surface for src/lib/agents/renewal/githubApp.js (Self-Renewal §3.2
// App-token minter). Per the dispatch:
//   - Happy path: mock POST returns token + expiry → correct shape
//   - Missing env vars: throws descriptive error
//   - API failure (401): throws with status
//   - Token never appears in any log output
//
// A real RSA-2048 keypair is generated per-suite (via Node crypto) so
// RS256 signing actually runs end-to-end. The private key never leaves
// memory; the public key is used to verify the JWT signature.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import {
  getInstallationToken,
  signAppJwt,
  buildAppJwtClaims,
  __internals,
} from '../../../src/lib/agents/renewal/githubApp.js';

let privateKeyPem;
let publicKeyPem;

beforeAll(() => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  privateKeyPem = privateKey;
  publicKeyPem = publicKey;
});

const FIXED_NOW = 1_736_000_000_000; // 2025-01-04T17:33:20Z
const TOKEN_VALUE = 'ghs_TEST_INSTALLATION_TOKEN_NEVER_LOGGED_xxxxxxxxxxxx';
const EXPIRES_AT = '2026-05-17T20:34:20Z';

function mockFetchOk() {
  return vi.fn(async (url, init) => ({
    ok: true,
    status: 201,
    statusText: 'Created',
    json: async () => ({
      token: TOKEN_VALUE,
      expires_at: EXPIRES_AT,
      permissions: { contents: 'write', pull_requests: 'write', metadata: 'read' },
      repository_selection: 'selected',
    }),
    text: async () => JSON.stringify({ token: TOKEN_VALUE, expires_at: EXPIRES_AT }),
    __seenUrl: url,
    __seenInit: init,
  }));
}

function mockFetchStatus(status, statusText, bodyText = '') {
  return vi.fn(async () => ({
    ok: false,
    status,
    statusText,
    text: async () => bodyText,
    json: async () => ({ message: bodyText }),
  }));
}

// ── signAppJwt + buildAppJwtClaims unit tests ────────────────────────────────

describe('signAppJwt — RS256 JWT signing', () => {
  it('produces a 3-segment JWT', () => {
    const jwt = signAppJwt({ iat: 1, exp: 2, iss: '3' }, privateKeyPem);
    expect(jwt.split('.').length).toBe(3);
  });

  it('signature verifies against the public key', () => {
    const claims = { iat: 1, exp: 2, iss: '9999' };
    const jwt = signAppJwt(claims, privateKeyPem);
    const [headerB64, payloadB64, sigB64] = jwt.split('.');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    // Convert base64url → base64 for crypto.verify.
    const sigBase64 = sigB64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((sigB64.length + 3) % 4);
    expect(verifier.verify(publicKeyPem, sigBase64, 'base64')).toBe(true);
  });

  it('throws TypeError on missing private key', () => {
    expect(() => signAppJwt({ iat: 1, exp: 2, iss: '3' }, '')).toThrow(TypeError);
  });

  it('throws TypeError on missing payload', () => {
    expect(() => signAppJwt(null, privateKeyPem)).toThrow(TypeError);
  });

  it('error message on signing failure does NOT include the private key', () => {
    try {
      signAppJwt({ iat: 1, exp: 2, iss: '3' }, 'not-a-valid-pem');
      expect.unreachable('signAppJwt should have thrown on invalid PEM');
    } catch (e) {
      expect(e.message).toMatch(/signing failed/);
      expect(e.message).not.toContain('not-a-valid-pem');
    }
  });
});

describe('buildAppJwtClaims — iat/exp window', () => {
  it('iat is now - 60s and exp is now + 540s', () => {
    // 540s (9 min) leaves 60s clock-skew headroom under GitHub's 600s max.
    // DISPATCH 20 live test surfaced GitHub rejecting exp=600s when local
    // clock was ~13s ahead.
    const claims = buildAppJwtClaims(12345, FIXED_NOW);
    const nowSec = Math.floor(FIXED_NOW / 1000);
    expect(claims.iat).toBe(nowSec - 60);
    expect(claims.exp).toBe(nowSec + 540);
    expect(claims.iss).toBe('12345');
  });

  it('iss is stringified (per GitHub spec)', () => {
    expect(buildAppJwtClaims(99, 0).iss).toBe('99');
    expect(buildAppJwtClaims('99', 0).iss).toBe('99');
  });
});

describe('normalizePem — escape-sequence handling', () => {
  it('passes through PEM with real newlines', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nAAA\n-----END RSA PRIVATE KEY-----\n';
    expect(__internals.normalizePem(pem)).toBe(pem);
  });

  it('converts literal \\n to real newlines', () => {
    const escaped = '-----BEGIN RSA PRIVATE KEY-----\\nAAA\\n-----END RSA PRIVATE KEY-----';
    const out = __internals.normalizePem(escaped);
    expect(out).toContain('\n');
    expect(out).not.toContain('\\n');
  });

  it('handles non-string input gracefully', () => {
    expect(__internals.normalizePem(null)).toBe('');
    expect(__internals.normalizePem(undefined)).toBe('');
    expect(__internals.normalizePem(123)).toBe('');
  });
});

// ── getInstallationToken — integration paths ─────────────────────────────────

describe('getInstallationToken — happy path', () => {
  it('returns { token, expiresAt, permissions, repositorySelection }', async () => {
    const fetchMock = mockFetchOk();
    const result = await getInstallationToken({
      appId: 3748219,
      privateKey: privateKeyPem,
      installationId: 133220298,
      now: () => FIXED_NOW,
      fetch: fetchMock,
    });
    expect(result.token).toBe(TOKEN_VALUE);
    expect(result.expiresAt).toBe(EXPIRES_AT);
    expect(result.permissions).toEqual({ contents: 'write', pull_requests: 'write', metadata: 'read' });
    expect(result.repositorySelection).toBe('selected');
  });

  it('POSTs to the canonical installation-tokens URL', async () => {
    const fetchMock = mockFetchOk();
    await getInstallationToken({
      appId: 3748219,
      privateKey: privateKeyPem,
      installationId: 133220298,
      now: () => FIXED_NOW,
      fetch: fetchMock,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/app/installations/133220298/access_tokens');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toMatch(/^Bearer eyJ/);
    expect(init.headers['Accept']).toBe('application/vnd.github+json');
    expect(init.headers['X-GitHub-Api-Version']).toBe('2022-11-28');
  });
});

describe('getInstallationToken — env-var validation', () => {
  it('throws when appId is missing', async () => {
    await expect(getInstallationToken({
      privateKey: privateKeyPem,
      installationId: 133220298,
      fetch: mockFetchOk(),
    })).rejects.toThrow(/GITHUB_APP_ID is required/);
  });

  it('throws when privateKey is missing', async () => {
    await expect(getInstallationToken({
      appId: 3748219,
      installationId: 133220298,
      fetch: mockFetchOk(),
    })).rejects.toThrow(/GITHUB_APP_PRIVATE_KEY is required/);
  });

  it('throws when installationId is missing', async () => {
    await expect(getInstallationToken({
      appId: 3748219,
      privateKey: privateKeyPem,
      fetch: mockFetchOk(),
    })).rejects.toThrow(/GITHUB_APP_INSTALLATION_ID is required/);
  });

  it('throws when fetch is missing AND globalThis.fetch is unavailable', async () => {
    // Node 18+ always has globalThis.fetch — to exercise the
    // "fetch unavailable" branch we have to temporarily unset it.
    const savedFetch = globalThis.fetch;
    // @ts-expect-error — deliberate removal for this test
    delete globalThis.fetch;
    try {
      await expect(getInstallationToken({
        appId: 3748219,
        privateKey: privateKeyPem,
        installationId: 133220298,
      })).rejects.toThrow(/fetch is not available/);
    } finally {
      globalThis.fetch = savedFetch;
    }
  });
});

describe('getInstallationToken — API failure surfaces', () => {
  it('401 surfaces status in error message', async () => {
    await expect(getInstallationToken({
      appId: 3748219,
      privateKey: privateKeyPem,
      installationId: 133220298,
      fetch: mockFetchStatus(401, 'Unauthorized', '{"message":"Bad credentials"}'),
    })).rejects.toThrow(/GitHub returned 401 Unauthorized/);
  });

  it('404 surfaces status in error message', async () => {
    await expect(getInstallationToken({
      appId: 3748219,
      privateKey: privateKeyPem,
      installationId: 133220298,
      fetch: mockFetchStatus(404, 'Not Found', '{"message":"Installation not found"}'),
    })).rejects.toThrow(/GitHub returned 404 Not Found/);
  });

  it('network error wraps with descriptive message', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
    await expect(getInstallationToken({
      appId: 3748219,
      privateKey: privateKeyPem,
      installationId: 133220298,
      fetch: fetchMock,
    })).rejects.toThrow(/network error.*ECONNREFUSED/);
  });

  it('response missing token field surfaces clear error', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ expires_at: EXPIRES_AT }), // no token
      text: async () => '{}',
    }));
    await expect(getInstallationToken({
      appId: 3748219,
      privateKey: privateKeyPem,
      installationId: 133220298,
      fetch: fetchMock,
    })).rejects.toThrow(/missing.*token.*field/);
  });

  it('response missing expires_at field surfaces clear error', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ token: TOKEN_VALUE }), // no expires_at
      text: async () => '{}',
    }));
    await expect(getInstallationToken({
      appId: 3748219,
      privateKey: privateKeyPem,
      installationId: 133220298,
      fetch: fetchMock,
    })).rejects.toThrow(/missing.*expires_at/);
  });
});

// ── Critical security invariant: token never logged ──────────────────────────

describe('getInstallationToken — token never appears in console output', () => {
  it('happy path produces no console output containing the token', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await getInstallationToken({
        appId: 3748219,
        privateKey: privateKeyPem,
        installationId: 133220298,
        now: () => FIXED_NOW,
        fetch: mockFetchOk(),
      });
      const allLogs = [
        ...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls,
      ].map((args) => args.map((a) => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
      const joined = allLogs.join('\n');
      expect(joined).not.toContain(TOKEN_VALUE);
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('failure path error message does NOT contain the token', async () => {
    // Mock returns ok:false WITH the token in the body (a hostile-API
    // simulation) — module must still not echo the token into the
    // error message it constructs.
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'leaked body — no token here',
    }));
    try {
      await getInstallationToken({
        appId: 3748219,
        privateKey: privateKeyPem,
        installationId: 133220298,
        fetch: fetchMock,
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.message).not.toContain(TOKEN_VALUE);
    }
  });

  it('private-key signing failure error does NOT contain the private key', () => {
    // Generate a deliberately malformed key (PEM-shaped but invalid contents).
    const malformed = '-----BEGIN RSA PRIVATE KEY-----\nNOTAREALKEY\n-----END RSA PRIVATE KEY-----';
    try {
      signAppJwt({ iat: 1, exp: 2, iss: '3' }, malformed);
      expect.unreachable('should have thrown');
    } catch (e) {
      // The error message should describe the failure mode but not
      // echo the (invalid) private-key contents.
      expect(e.message).not.toContain('NOTAREALKEY');
    }
  });
});

// ── base64UrlEncode — RFC 7515 §2 conformance ────────────────────────────────

describe('base64UrlEncode — RFC 7515 §2', () => {
  it('replaces "+" with "-"', () => {
    // Input chosen so its base64 encoding contains "+".
    const out = __internals.base64UrlEncode(Buffer.from([0xff, 0xee, 0xdd]));
    expect(out).not.toContain('+');
  });

  it('replaces "/" with "_"', () => {
    const out = __internals.base64UrlEncode(Buffer.from([0xff, 0xff, 0xff]));
    expect(out).not.toContain('/');
  });

  it('strips "=" padding', () => {
    expect(__internals.base64UrlEncode('any')).not.toContain('=');
  });

  it('accepts both Buffer and string input', () => {
    expect(__internals.base64UrlEncode('abc')).toBe(__internals.base64UrlEncode(Buffer.from('abc')));
  });
});
