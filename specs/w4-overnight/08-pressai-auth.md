# 08 — PressAI auth hardening audit

**Generated:** 2026-05-07.

## Search for JWT / auth / password handling

Patterns searched: `jsonwebtoken`, `jwt.sign`, `jwtSign`, `JWT_SECRET`, `jose`.

### Matches

**Zero in `api/` or `src/`.** No JWT library is imported anywhere.
`package.json` contains no `jsonwebtoken`, no `jose`, no other JWT package.

## Auth stack inventory

There are two parallel auth paths in this repo:

### Path A — Local stack (active backend)

`api/auth/sign-up.js`, `api/auth/sign-in.js`, `api/auth/session.js` →
`api/_lib/authBackend.js`.

- **Password hashing:** `scrypt` via Node's built-in `crypto`. Format:
  `scrypt$<N>$<saltHex>$<keyHex>` (versioned for rotation). `N=16384`.
  16-byte random salt per password, 64-byte derived key.
- **Verification:** `verifyPassword` runs `scryptSync` with the stored salt
  and `timingSafeEqual` against the stored hash. Length-mismatch short-circuit
  also goes through a comparison path (the explicit `length !== length`
  branch returns `false` without calling `timingSafeEqual` — see
  `authBackend.js:44`; non-trivial inputs always reach the constant-time
  compare).
- **Session tokens:** opaque, **not JWT.** `randomBytes(32).toString('hex')`
  → 64-char hex string, 30-day TTL. Stored in an in-process `SESSIONS` Map.
  No signing, no claims, no audience.
- **Rate limiting:** per-IP, per-endpoint. Sign-up 5/min. Sign-in 10/min.
  Lead-capture 8/min. Stored in an in-process `RATE_LIMITS` Map (memory
  backend; not persisted across cold starts — known V1 limitation).
- **Audit log:** every sign-up / sign-in / sign-in-failed writes a row via
  `appendAuditEntry`. Failed sign-in writes `auth.sign_in.failed` with
  `{email, ip, reason}` (reason is uniform `invalid_credentials`).
- **Uniform error on bad credentials:** `sign-in.js:55` returns
  `{ ok: false, reason: 'invalid_credentials' }` whether the email is
  unknown or the password is wrong. The header comment notes this is
  "timing-safe by design" and avoids disclosure.

### Path B — Clerk + service-key stack (passthrough today)

`api/_lib/auth.js`. Activated by `AUTH_REQUIRED=true` env. Verifies a Clerk
session token via dynamic import of `@clerk/clerk-sdk-node`. Falls back to a
service-key short-circuit for cron / Inngest. When `AUTH_REQUIRED=false`
(default), every request resolves to
`{ authenticated: false, authMode: 'anonymous' }` and downstream is
expected to fail open.

`/api/me` returns the current request context — used by the UI to decide
whether to render the auth flow at all.

### Path C — Base44 SDK (UI-side, today's actual auth)

`src/lib/AuthContext.jsx` calls `base44.auth.me()` and
`base44.auth.redirectToLogin()`. The Base44 SDK ships its own session token
(distinct from Path A and Path B). The local `/api/auth/*` routes are not yet
wired into the UI — see `docs/audits/pressai-2026-05-05/CODE_FIX_REPORT.md:75-86`
("What Base44 needs to do").

## Cross-reference: PA-AUTH-05 (fail-closed JWT secret signing)

The user-supplied ID `PA-AUTH-05` does not appear anywhere in the codebase
or docs. There is no `specs/w4-pressai/` and no PA-AUTH-* identifier in any
audit file. Best inference: this references a hardening rule that the JWT
signing function must "fail closed" — i.e., refuse to sign when the secret
is missing/empty rather than emit an unsigned or weakly-signed token.

### Status

**N/A — no JWT signing path exists.** Path A uses opaque random tokens, not
JWTs; Path B delegates to Clerk's SDK (Clerk's own JWT verification refuses
unsigned tokens by construction); Path C is third-party (Base44).

If a JWT path is added (e.g., for cross-service tokens between FlowAI and
PressAI), the fail-closed pattern is:

```js
import { sign as hmacSign } from '../api/_lib/authBackend.js';

export function signJwt(payload, secretEnvKey = 'JWT_SECRET') {
  const secret = process.env[secretEnvKey];
  if (typeof secret !== 'string' || secret.length < 32) {
    // FAIL CLOSED — refuse to issue a token that can't be verified.
    throw new Error(`auth.signJwt: ${secretEnvKey} is missing or too short`);
  }
  // ... encode header + payload, hmac-sha256 with the secret
}
```

The pattern aligns with how `api/_lib/auth.js` handles missing
`CLERK_SECRET_KEY`: when missing, `loadClerkClient()` returns `null`, and
`verifySession` returns `null`, and `requireAuth` returns 401 (when
`AUTH_REQUIRED=true`). Today this is fail-closed only when
`AUTH_REQUIRED=true` is set — the default `false` setting is fail-open by
design (passthrough).

## Hardening checklist

| Item | Status | Notes |
|---|---|---|
| Passwords stored hashed | ✅ | scrypt N=16384, per-password salt |
| Passwords verified in constant time | ✅ | `timingSafeEqual` on equal-length keys |
| Min password length enforced | ✅ | `>= 8` chars enforced in `hashPassword` and `sign-up.js:40` |
| Uniform sign-in error (no enumeration) | ✅ | `'invalid_credentials'` regardless of cause |
| Sign-up rate-limited | ✅ | 5/min per IP |
| Sign-in rate-limited | ✅ | 10/min per IP (stricter on credential-stuffing target) |
| Failed sign-in audit-logged | ✅ | `auth.sign_in.failed` with IP + uniform reason |
| Successful sign-up / sign-in audit-logged | ✅ | `auth.sign_up`, `auth.sign_in` |
| Session token entropy | ✅ | 256 bits (`randomBytes(32)`) |
| Session TTL bounded | ✅ | 30 days |
| Session revocation supported | ✅ | `DELETE /api/auth/session` |
| Auth gate fail-closed when `AUTH_REQUIRED=true` | ✅ | `requireAuth` returns 401 on anonymous when env on |
| Cross-instance session persistence | ❌ | Memory Map only; flips to Supabase via `DB_BACKEND` (per `authBackend.js` header). Cross-instance demo on Vercel today fails because two function instances don't share a Map. (Already noted in `docs/audits/pressai-2026-05-05/CODE_FIX_REPORT.md:71`.) |
| Email verification flow | ❌ | `email_verified: false` field exists on user record but no verification email is sent / no `/api/auth/verify-email` endpoint. |
| Password reset flow | ❌ | No `/api/auth/forgot-password` or `/api/auth/reset-password` route. |
| Magic-link sign-in | ❌ | Not implemented. |
| 2FA / MFA | ❌ | Not implemented. |
| Account lockout after N failures | ⚠️ | Not implemented; relies on rate-limiting alone. |
| JWT issuer | n/a | No JWT in use. |
| JWT fail-closed signing (PA-AUTH-05) | n/a | No JWT in use; pattern documented above for future use. |

## Verdict

The local auth stack is reasonably hardened for a V1 (scrypt, uniform
errors, audit logging, rate limits, opaque tokens). Cross-instance session
persistence flips on once Supabase activates. Reset / verification / MFA /
JWT are unimplemented but **not flagged in any existing audit**.

**`PA-AUTH-05` is N/A under the current architecture.** When (if) JWT
signing is added, the fail-closed pattern above is the canonical
implementation.
