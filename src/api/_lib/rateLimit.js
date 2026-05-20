/* eslint-env node */
/* global process */

// src/api/_lib/rateLimit.js — TRACK-E PR2
//
// Sliding-window rate limiter for public POST endpoints. Two backends:
//
//   1. Upstash (preferred) — when UPSTASH_REDIS_REST_URL +
//      UPSTASH_REDIS_REST_TOKEN are set (Doppler), uses @upstash/ratelimit
//      for a globally-consistent distributed sliding window.
//
//   2. In-memory (fallback) — when Upstash isn't provisioned, uses a
//      per-instance Map<ip, timestamps[]>. NOT globally consistent across
//      Vercel function instances, but acceptable for the demo until
//      Upstash is wired. Each instance enforces the same cap independently,
//      so the effective ceiling is (cap × instance count).
//
// Bypass: requests carrying a valid internal CRON_SECRET skip rate-limit
// entirely (Vercel Cron and internal callers). The secret arrives as
// `Authorization: Bearer <CRON_SECRET>` per Vercel cron convention; we
// also accept `x-cron-secret: <CRON_SECRET>` for non-cron internal use.
//
// IP extraction: `x-forwarded-for` (first hop) → `x-real-ip` → `'anonymous'`.
// On Vercel, x-forwarded-for is set by the edge and trustworthy; on localhost
// dev there's no header so all requests share the 'anonymous' bucket
// (intentional — local dev isn't the threat model).
//
// Usage:
//   import { rateLimit } from './_lib/rateLimit.js';
//   const verdict = await rateLimit(req, { capacity: 10, windowMs: 3_600_000 });
//   if (!verdict.allowed) { ... 429 with Retry-After: verdict.retryAfterSec ... }

const DEFAULT_CAPACITY = 10;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ─── Upstash backend (lazy) ─────────────────────────────────────────────

let upstashLimiter = null;
let upstashInitState = 'pending'; // 'pending' | 'ready' | 'disabled'

async function getUpstashLimiter({ capacity, windowMs }) {
  if (upstashInitState === 'disabled') return null;
  if (upstashLimiter) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashInitState = 'disabled';
    return null;
  }

  try {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ]);
    const redis = new Redis({ url, token });
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(capacity, `${Math.round(windowMs / 1000)} s`),
      analytics: false,
      prefix: 'flowai:rl:run-construction',
    });
    upstashInitState = 'ready';
    return upstashLimiter;
  } catch (e) {
    // @upstash/* not installed or constructor failed — degrade.
    console.warn('[rateLimit] Upstash unavailable, falling back to in-memory:', e?.message ?? e);
    upstashInitState = 'disabled';
    return null;
  }
}

// ─── In-memory sliding-window fallback ──────────────────────────────────

const memoryBuckets = new Map(); // ip → [timestamps]

function memoryRateLimit(ip, { capacity, windowMs, now }) {
  const cutoff = now - windowMs;
  let timestamps = memoryBuckets.get(ip) ?? [];
  // Drop entries older than the window.
  let firstValid = 0;
  while (firstValid < timestamps.length && timestamps[firstValid] <= cutoff) firstValid++;
  if (firstValid > 0) timestamps = timestamps.slice(firstValid);

  if (timestamps.length >= capacity) {
    const oldest = timestamps[0];
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    memoryBuckets.set(ip, timestamps);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
      limit: capacity,
      backend: 'memory',
    };
  }

  timestamps.push(now);
  memoryBuckets.set(ip, timestamps);
  return {
    allowed: true,
    remaining: capacity - timestamps.length,
    retryAfterSec: 0,
    limit: capacity,
    backend: 'memory',
  };
}

// ─── IP + CRON_SECRET helpers ───────────────────────────────────────────

export function getClientIp(req) {
  const xff = headerValue(req, 'x-forwarded-for');
  if (xff) {
    // x-forwarded-for is a comma-separated list; the leftmost entry is the
    // original client. Strip whitespace and any port suffix.
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const xri = headerValue(req, 'x-real-ip');
  if (xri) return xri.trim();
  return 'anonymous';
}

export function hasValidCronSecret(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected || typeof expected !== 'string' || expected.length < 8) return false;

  const auth = headerValue(req, 'authorization');
  if (auth && typeof auth === 'string') {
    const match = /^bearer\s+(.+)$/i.exec(auth);
    if (match && constantTimeEqual(match[1].trim(), expected)) return true;
  }
  const custom = headerValue(req, 'x-cron-secret');
  if (custom && typeof custom === 'string' && constantTimeEqual(custom.trim(), expected)) {
    return true;
  }
  return false;
}

function headerValue(req, name) {
  if (!req?.headers) return null;
  // Both Node http (lowercased keys) and Web Fetch (Headers.get) styles.
  if (typeof req.headers.get === 'function') return req.headers.get(name);
  const v = req.headers[name] ?? req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * @param {object} req      — Node/Vercel request (.headers map)
 * @param {object} opts
 * @param {number} opts.capacity   — max requests per window per IP (default 10)
 * @param {number} opts.windowMs   — window in ms (default 1h)
 * @param {string} opts.bucket     — namespace label for memory buckets
 * @returns {Promise<{allowed:boolean,remaining:number,retryAfterSec:number,limit:number,backend:string,ip:string,bypassed?:boolean}>}
 */
export async function rateLimit(req, opts = {}) {
  const capacity = Number.isFinite(opts.capacity) ? opts.capacity : DEFAULT_CAPACITY;
  const windowMs = Number.isFinite(opts.windowMs) ? opts.windowMs : DEFAULT_WINDOW_MS;
  const now = Date.now();
  const ip = getClientIp(req);

  if (hasValidCronSecret(req)) {
    return { allowed: true, remaining: capacity, retryAfterSec: 0, limit: capacity, backend: 'cron_bypass', ip, bypassed: true };
  }

  const upstash = await getUpstashLimiter({ capacity, windowMs });
  if (upstash) {
    try {
      const { success, limit, remaining, reset } = await upstash.limit(`${opts.bucket ?? 'default'}:${ip}`);
      const retryAfterSec = success ? 0 : Math.max(0, Math.ceil((reset - now) / 1000));
      return { allowed: success, remaining, retryAfterSec, limit, backend: 'upstash', ip };
    } catch (e) {
      console.warn('[rateLimit] Upstash limit() failed, falling back to memory:', e?.message ?? e);
      // fall through to memory backend
    }
  }

  return { ...memoryRateLimit(`${opts.bucket ?? 'default'}:${ip}`, { capacity, windowMs, now }), ip };
}

// Test seam.
export const __test = Object.freeze({
  memoryBuckets,
  memoryRateLimit,
  constantTimeEqual,
  headerValue,
});
