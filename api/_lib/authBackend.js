// Auth backend primitives — generic, multi-tenant, product-scoped.
//
// Used by /api/auth/sign-up, /api/auth/sign-in, and any future product
// auth flow (PressAI, SAIGE, etc.). Each user record is keyed by
// (org_id, product_id, email) so the same email can register with
// multiple VEU products independently.
//
// V1 storage: in-process Map. V2: switches to Supabase when DB_BACKEND
// flips. Schema mirrors the future Postgres `users` + `product_users` tables.
//
// Password storage: scrypt (Node built-in crypto, no native deps).
// Format: `scrypt$<N>$<saltHex>$<keyHex>` — versioned so we can rotate.

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';

const USERS = new Map();              // key → user
const SESSIONS = new Map();           // session_token → session
const RATE_LIMITS = new Map();        // ip+endpoint → { count, windowStart }

const SCRYPT_N = 16384;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

// ─── Password hashing ─────────────────────────────────────────────────

export function hashPassword(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = randomBytes(16);
  const key = scryptSync(plaintext, salt, 64, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(plaintext, stored) {
  if (typeof plaintext !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const N = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  const candidate = scryptSync(plaintext, salt, expected.length, { N });
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// ─── User store ────────────────────────────────────────────────────────

function userKey({ orgId, productId, email }) {
  return `${orgId || 'default'}::${productId || 'default'}::${(email || '').toLowerCase().trim()}`;
}

export function createUser({ email, password, productId, orgId, metadata = {} }) {
  if (!email || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Valid email required');
  }
  const key = userKey({ orgId, productId, email });
  if (USERS.has(key)) throw new Error('User already exists');
  const user = {
    id: 'usr_' + Date.now().toString(36) + '_' + randomBytes(4).toString('hex'),
    email: email.toLowerCase().trim(),
    password_hash: hashPassword(password),
    org_id: orgId || null,
    product_id: productId || null,
    metadata,
    email_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null,
  };
  USERS.set(key, user);
  return user;
}

export function findUser({ email, productId, orgId }) {
  return USERS.get(userKey({ orgId, productId, email })) || null;
}

export function authenticateUser({ email, password, productId, orgId }) {
  const user = findUser({ email, productId, orgId });
  if (!user) return { ok: false, reason: 'invalid_credentials' };
  if (!verifyPassword(password, user.password_hash)) return { ok: false, reason: 'invalid_credentials' };
  user.last_login_at = new Date().toISOString();
  return { ok: true, user };
}

export function userToPublic(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

// ─── Sessions ──────────────────────────────────────────────────────────

export function createSession({ userId, productId, orgId, ttlMs = SESSION_TTL_MS }) {
  const token = randomBytes(32).toString('hex');
  const session = {
    token,
    user_id: userId,
    product_id: productId || null,
    org_id: orgId || null,
    issued_at: Date.now(),
    expires_at: Date.now() + ttlMs,
  };
  SESSIONS.set(token, session);
  return session;
}

export function getSession(token) {
  if (!token) return null;
  const s = SESSIONS.get(token);
  if (!s) return null;
  if (s.expires_at < Date.now()) { SESSIONS.delete(token); return null; }
  return s;
}

export function revokeSession(token) {
  return SESSIONS.delete(token);
}

// ─── Rate limiting (per-IP, per-endpoint) ─────────────────────────────

export function rateLimitOk({ ip, endpoint, max = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS }) {
  if (!ip) return true;
  const key = `${ip}::${endpoint}`;
  const now = Date.now();
  const cur = RATE_LIMITS.get(key);
  if (!cur || (now - cur.windowStart) > windowMs) {
    RATE_LIMITS.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}

export function clientIp(req) {
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers?.['x-real-ip'] ||
    req.socket?.remoteAddress ||
    null
  );
}

// ─── Email validation ─────────────────────────────────────────────────

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// ─── HMAC for webhook + token signing ─────────────────────────────────

export function sign(value, secret) {
  return createHmac('sha256', secret).update(String(value)).digest('hex');
}

// ─── Stats (for admin endpoints) ──────────────────────────────────────

export function userStats({ orgId, productId } = {}) {
  let total = 0, verified = 0;
  for (const u of USERS.values()) {
    if (orgId && u.org_id !== orgId) continue;
    if (productId && u.product_id !== productId) continue;
    total += 1;
    if (u.email_verified) verified += 1;
  }
  return { total, verified, active_sessions: SESSIONS.size };
}
