// src/lib/security/selfProtection.js
//
// Self-Protection request middleware. Wires the X-Test-Bypass-Token
// contract (§9.1 of FLOWAI_SELF_ADVERSARIAL_TEST_PLAN; §20 of
// CANONICAL_REFERENCE Rev-2.1) onto every incoming HTTP request.
//
// Contract:
//   - If `X-Test-Bypass-Token` header is present AND verifies under the
//     environment's public key (verifyToken result valid=true), the
//     middleware annotates `req.selfProtection = { bypass: true,
//     claims }` and emits an audit event of topic
//     'self-protection.test-bypass' with the verified claims. Downstream
//     handlers / bot-detection layers MUST consult `req.selfProtection`
//     before applying WAF / rate-limit / fingerprint checks.
//   - If the header is present BUT invalid, the middleware emits the
//     same audit topic with `result='invalid'` and the verifier error,
//     and returns HTTP 401 with a minimal JSON body. NEVER echoes the
//     token back.
//   - If the header is absent, `req.selfProtection = { bypass: false,
//     reason: 'no_header' }` and the request passes through unchanged
//     (prod traffic is not affected).
//
// What the bypass DOES bypass: bot-detection rate limits, headless
// fingerprint rejection, Cloudflare-managed challenge (when present).
// What the bypass NEVER bypasses: authentication, RLS, role gates,
// 95/95 governance. These remain enforced on every request regardless
// of token presence.
//
// Audit logging:
//   - The middleware accepts an `auditLog` callable as a DI dependency.
//     The callable is invoked with a single argument: a frozen event
//     object {topic, at, outcome, claims?, error?, requestId?,
//     env, ipHash?, uaHash?}. The callable MUST NOT throw — if a sink
//     can't accept the event, it should swallow the failure. The
//     middleware itself never throws on audit-log failure.
//   - Production wires `auditLog` to `GovernanceAuditLog` per Rev-2.1
//     §14. Tests inject a spy.
//
// Environment resolution:
//   - The middleware resolves the active environment via the existing
//     anti-tamper-gate inputs (VERCEL_ENV → 'prod' for 'production',
//     'dev-SUT' otherwise) so the verifier loads the matching public
//     key. Callers can override via `opts.env` for tests.
//
// Browser-safety:
//   - This module imports node:crypto via testBypassToken.js. It is
//     NOT browser-safe. Use only in server-side request handlers
//     (api/*) or in the Vite dev-server middleware chain — never in
//     bundled client code.

import { verifyToken } from './testBypassToken.js';

const HEADER_NAME = 'x-test-bypass-token';
const AUDIT_TOPIC = 'self-protection.test-bypass';

function resolveEnv(procEnv = process.env, override) {
  if (override === 'prod' || override === 'dev-SUT') return override;
  const vEnv = procEnv.VERCEL_ENV;
  if (vEnv === 'production') return 'prod';
  if (vEnv === 'preview' || vEnv === 'development') return 'dev-SUT';
  if (procEnv.NODE_ENV === 'production') return 'prod';
  return 'dev-SUT';
}

function getHeader(req, name) {
  if (!req || typeof req !== 'object' || !req.headers) return null;
  // Express / Vercel: headers are lowercased; Node http server: same.
  // Be defensive about case + array values.
  const raw = req.headers[name] ?? req.headers[name.toLowerCase()] ?? req.headers[name.toUpperCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === 'string' ? raw : null;
}

function emitAudit(auditLog, event) {
  if (typeof auditLog !== 'function') return;
  try {
    auditLog(Object.freeze({ ...event, at: event.at ?? Date.now() }));
  } catch {
    // Audit-log sinks must never break request handling.
  }
}

/**
 * Build a Self-Protection middleware bound to its dependencies.
 *
 * @param {object} deps
 * @param {function} [deps.auditLog]    — async or sync; invoked with
 *                                        the audit event. Never expected
 *                                        to throw.
 * @param {object}   [deps.procEnv]     — defaults to process.env.
 * @param {function} [deps.verifyToken] — defaults to the real verifier.
 *                                        Tests inject a spy.
 * @param {string}   [deps.envOverride] — override the env resolver.
 * @param {function} [deps.requestId]   — (req) → string requestId for
 *                                        the audit event; optional.
 * @returns {function(req, res, next): void|Promise<void>}
 */
export function makeSelfProtectionMiddleware(deps = {}) {
  const auditLog    = typeof deps.auditLog === 'function'   ? deps.auditLog   : null;
  const procEnv     = deps.procEnv ?? process.env;
  const verifierFn  = typeof deps.verifyToken === 'function' ? deps.verifyToken : verifyToken;
  const envOverride = deps.envOverride;
  const requestIdFn = typeof deps.requestId === 'function'  ? deps.requestId  : (() => undefined);

  return function selfProtectionMiddleware(req, res, next) {
    const env = resolveEnv(procEnv, envOverride);
    const headerVal = getHeader(req, HEADER_NAME);
    const requestId = requestIdFn(req);

    if (!headerVal) {
      // Passthrough — no bypass attempted.
      req.selfProtection = Object.freeze({ bypass: false, reason: 'no_header', env });
      return typeof next === 'function' ? next() : undefined;
    }

    const result = verifierFn(headerVal, env);
    if (result.valid === true) {
      req.selfProtection = Object.freeze({ bypass: true, claims: result.claims, env });
      emitAudit(auditLog, {
        topic:     AUDIT_TOPIC,
        outcome:   'bypass_granted',
        env,
        requestId,
        claims:    {
          iss:         result.claims.iss,
          sub:         result.claims.sub,
          testSuiteId: result.claims.testSuiteId,
          runId:       result.claims.runId,
          env:         result.claims.env,
          iat:         result.claims.iat,
          exp:         result.claims.exp,
          scope:       result.claims.scope,
          fingerprint: result.claims.fingerprint,
          // NB: full claims only — no derived secrets or raw token.
        },
      });
      return typeof next === 'function' ? next() : undefined;
    }

    // Invalid token.
    req.selfProtection = Object.freeze({ bypass: false, reason: 'invalid_token', env, error: result.error });
    emitAudit(auditLog, {
      topic:    AUDIT_TOPIC,
      outcome:  'invalid_token',
      env,
      requestId,
      error:    result.error,
      // NEVER include the raw token bytes in the audit event.
    });

    if (res && typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(401).json({ error: 'invalid_test_bypass_token' });
      return;
    }
    if (res && typeof res.statusCode !== 'undefined' && typeof res.end === 'function') {
      res.statusCode = 401;
      res.setHeader?.('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'invalid_test_bypass_token' }));
      return;
    }
    // No usable response object — let downstream handle it. This branch
    // is reached only in non-HTTP test contexts.
    return typeof next === 'function' ? next() : undefined;
  };
}

/**
 * Convenience wrapper for the common Vercel serverless-function shape
 * (`export default handler`). Returns a wrapped handler that runs the
 * middleware before delegating to the original handler.
 */
export function withSelfProtection(handler, deps = {}) {
  if (typeof handler !== 'function') {
    throw new TypeError('withSelfProtection: handler must be a function');
  }
  const middleware = makeSelfProtectionMiddleware(deps);
  return function wrappedHandler(req, res) {
    return new Promise((resolve, reject) => {
      try {
        middleware(req, res, (err) => {
          if (err) return reject(err);
          if (req.selfProtection && req.selfProtection.bypass === false && req.selfProtection.reason === 'invalid_token') {
            // The middleware already wrote the 401 response.
            return resolve();
          }
          Promise.resolve(handler(req, res)).then(resolve, reject);
        });
      } catch (e) {
        reject(e);
      }
    });
  };
}

export const __test_only__ = Object.freeze({ HEADER_NAME, AUDIT_TOPIC, resolveEnv });
