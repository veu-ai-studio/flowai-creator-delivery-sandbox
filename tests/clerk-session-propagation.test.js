import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function makeRes() {
  const headers = {};
  let statusCode = 200;
  let body = null;
  return {
    setHeader: vi.fn((k, v) => { headers[k] = v; }),
    status: vi.fn(function (code) { statusCode = code; return this; }),
    json: vi.fn(function (data) { body = data; return this; }),
    end: vi.fn(function () { return this; }),
    _get: () => ({ headers, statusCode, body }),
  };
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@clerk/clerk-sdk-node');
  vi.restoreAllMocks();
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.AUTH_REQUIRED;
});

describe('Clerk session propagation frontend contract', () => {
  it('builds /api/me fetch options without a bearer token by default', async () => {
    const { buildRequestContextFetchInit } = await import('../src/lib/AuthContext.jsx');
    const init = buildRequestContextFetchInit();
    expect(init).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
    expect(init.headers).toEqual({ accept: 'application/json' });
  });

  it('attaches a bearer header only when Clerk returns a session token', async () => {
    const { buildRequestContextFetchInit } = await import('../src/lib/AuthContext.jsx');
    const init = buildRequestContextFetchInit({ token: '<redacted-clerk-session-token>' });
    expect(init.headers).toEqual({
      accept: 'application/json',
      Authorization: 'Bearer <redacted-clerk-session-token>',
    });
  });

  it('does not ask Clerk for a token while Clerk is unloaded or signed out', async () => {
    const { resolveClerkBearerToken } = await import('../src/lib/AuthContext.jsx');
    const getToken = vi.fn(async () => '<redacted-clerk-session-token>');

    await expect(resolveClerkBearerToken(null)).resolves.toBeNull();
    await expect(resolveClerkBearerToken({ isLoaded: false, isSignedIn: true, getToken })).resolves.toBeNull();
    await expect(resolveClerkBearerToken({ isLoaded: true, isSignedIn: false, getToken })).resolves.toBeNull();
    expect(getToken).not.toHaveBeenCalled();
  });

  it('asks Clerk for a token only when Clerk is loaded and signed in', async () => {
    const { resolveClerkBearerToken } = await import('../src/lib/AuthContext.jsx');
    const getToken = vi.fn(async () => '<redacted-clerk-session-token>');

    await expect(resolveClerkBearerToken({ isLoaded: true, isSignedIn: true, getToken })).resolves.toBe('<redacted-clerk-session-token>');
    expect(getToken).toHaveBeenCalledOnce();
  });

  it('keeps Clerk hooks inside the Clerk-provider branch only', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/AuthContext.jsx'), 'utf8');

    expect(appSource).toContain('if (!publishableKey)');
    expect(appSource).toContain('<AuthProvider>{children}</AuthProvider>');
    expect(appSource).toContain('<ClerkProvider');
    expect(appSource).toContain('<ClerkAwareAuthProvider>{children}</ClerkAwareAuthProvider>');
    expect(authSource).toContain('import { useAuth as useClerkAuth }');
    expect(authSource).toContain('const clerkAuth = useClerkAuth();');
  });
});

describe('GET /api/me Clerk bearer path', () => {
  it('returns Clerk-authenticated context when the bearer token verifies', async () => {
    const verifyToken = vi.fn(async () => ({
      sub: 'redacted-user-id-for-test',
      org_id: 'redacted-org-id-for-test',
    }));
    vi.doMock('@clerk/clerk-sdk-node', () => ({
      createClerkClient: vi.fn(() => ({ verifyToken })),
    }));
    process.env.CLERK_SECRET_KEY = 'sk_test_redacted_for_unit';
    delete process.env.AUTH_REQUIRED;

    const { default: handler } = await import('../api/me.js');
    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer <redacted-clerk-session-token>',
      },
      query: {},
    };
    const res = makeRes();

    await handler(req, res);

    const out = res._get();
    expect(out.statusCode).toBe(200);
    expect(out.body).toMatchObject({
      authenticated: true,
      authMode: 'clerk',
      config: {
        authRequired: false,
        clerkConfigured: true,
      },
    });
    expect(typeof out.body.userId).toBe('string');
    expect(verifyToken).toHaveBeenCalledWith('<redacted-clerk-session-token>');
  });

  it('preserves anonymous /api/me behavior when no bearer token is present', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_redacted_for_unit';
    delete process.env.AUTH_REQUIRED;

    const { default: handler } = await import('../api/me.js');
    const req = { method: 'GET', headers: {}, query: {} };
    const res = makeRes();

    await handler(req, res);

    expect(res._get()).toMatchObject({
      statusCode: 200,
      body: {
        authenticated: false,
        authMode: 'anonymous',
        config: {
          authRequired: false,
          clerkConfigured: true,
        },
      },
    });
  });
});
