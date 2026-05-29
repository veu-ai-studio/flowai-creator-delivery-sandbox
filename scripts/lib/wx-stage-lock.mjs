// scripts/lib/wx-stage-lock.mjs
//
// Advisory staging lock for parallel Wx workstream commits.
// Background: Phase 1.0 (W5b dispatch) lost staged files when W5c
// re-staged the index between W5b's `git add` and `git commit`.
// This module gives every Wx worker a co-operative checkpoint so
// that only one worker is mid-stage-and-commit at a time.
//
// ── CONTRACT ─────────────────────────────────────────────────────
//   await acquireLock('W5b');
//   // run: git add ...; git commit ...; git push
//   await releaseLock();
//
// The lock is ADVISORY — there is no kernel-level mutex, no git
// hook enforcement. Workers cooperate by calling acquireLock() and
// releaseLock() at the right places. Any worker that bypasses the
// protocol can still clobber the index; that is a discipline issue.
//
// ── BEHAVIOR ─────────────────────────────────────────────────────
//   File: <repo_root>/.wx-staging.lock
//   Contents: { "owner": "<wx_id>", "ts": "<ISO timestamp>" }
//
//   acquireLock(wx_id):
//     - If file ABSENT     : create file with {owner: wx_id, ts: now}, return
//     - If file PRESENT
//         age <  120s      : print "LOCK HELD BY <owner> since <ts> — waiting"
//                            poll every POLL_INTERVAL_MS up to MAX_WAIT_MS
//                            on free  : acquire as above and return
//                            on stale : overwrite and return
//                            on still-held after MAX_WAIT_MS : throw
//         age >= 120s      : treat as STALE; overwrite, return
//                            (prints a stale-takeover notice)
//     - Re-acquiring while WE already own the lock is a no-op.
//
//   releaseLock():
//     - If file ABSENT     : no-op (idempotent)
//     - If file owned by US: delete it
//     - If file owned by SOMEONE ELSE: leave it alone, print a warning
//
// ── DESIGN NOTES ─────────────────────────────────────────────────
//   1. File creation is best-effort atomic: we use `fs.writeFile`
//      with the `wx` (exclusive create) flag to avoid a TOCTOU
//      between existence-check and write. If two workers race on
//      acquireLock at the same instant, only one's `wx` write wins;
//      the other falls through to the polling branch.
//   2. The 120s stale window is a safety hatch for crashed workers
//      that never released their lock. If a healthy commit takes
//      longer than 120s, that worker should heartbeat the lock by
//      re-calling acquireLock() periodically (renews ts).
//   3. POLL_INTERVAL_MS = 3000 / MAX_WAIT_MS = 120000 → up to 40
//      polls before giving up. These are TUNABLE via the options
//      bag on acquireLock for tests that want a faster failure.
//
// ── CONSTRAINTS ──────────────────────────────────────────────────
//   - ESM only.
//   - Node >= 18 (uses fs/promises).
//   - Never log/echo credentials. The lock file contains only the
//     worker id (e.g. "W5b") and a timestamp.

import { writeFile, readFile, unlink, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const LOCK_FILENAME = '.wx-staging.lock';
const STALE_AGE_MS = 120_000;       // 120 seconds per dispatch
const POLL_INTERVAL_MS = 3_000;     // 3 seconds per dispatch
const MAX_WAIT_MS = 120_000;        // up to 2 minutes of polling

function repoRoot() {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return process.cwd();
}

function lockPath() {
  return path.join(repoRoot(), LOCK_FILENAME);
}

function nowIso() {
  return new Date().toISOString();
}

async function readLockSafely(filePath) {
  // Returns the parsed { owner, ts } or null if the file is gone /
  // unreadable / unparseable. Distinguishing those three cases buys
  // nothing for the caller — they all mean "treat as no usable lock".
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.owner === 'string' && typeof parsed.ts === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function lockAgeMs(filePath) {
  try {
    const st = await stat(filePath);
    return Date.now() - st.mtimeMs;
  } catch {
    return Infinity;
  }
}

async function writeLockExclusive(filePath, payload) {
  // `wx` = open for write, fail if exists. Atomic create.
  // Throws EEXIST if another worker beat us to it; the caller
  // distinguishes that from real I/O errors.
  await writeFile(filePath, JSON.stringify(payload, null, 2) + '\n', {
    encoding: 'utf8',
    flag: 'wx',
  });
}

async function overwriteLock(filePath, payload) {
  await writeFile(filePath, JSON.stringify(payload, null, 2) + '\n', {
    encoding: 'utf8',
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Acquire the advisory staging lock.
 *
 * @param {string} wxId — short owner id, e.g. "W5b", "W5c". Required.
 * @param {object} [opts]
 * @param {number} [opts.staleAgeMs=120000]  — lock older than this is stale
 * @param {number} [opts.pollIntervalMs=3000] — poll cadence while waiting
 * @param {number} [opts.maxWaitMs=120000]    — give up after this long
 * @param {function(string):void} [opts.log=console.log] — log sink
 * @returns {Promise<{ owner: string, ts: string, takenOver: boolean }>}
 * @throws  if the lock is still held by another worker after maxWaitMs
 */
export async function acquireLock(wxId, opts = {}) {
  if (typeof wxId !== 'string' || wxId.trim().length === 0) {
    throw new TypeError('acquireLock: wxId must be a non-empty string');
  }
  const staleAgeMs = typeof opts.staleAgeMs === 'number' ? opts.staleAgeMs : STALE_AGE_MS;
  const pollIntervalMs = typeof opts.pollIntervalMs === 'number' ? opts.pollIntervalMs : POLL_INTERVAL_MS;
  const maxWaitMs = typeof opts.maxWaitMs === 'number' ? opts.maxWaitMs : MAX_WAIT_MS;
  const log = typeof opts.log === 'function' ? opts.log : (msg) => process.stdout.write(`${msg}\n`);

  const filePath = lockPath();
  const payload = { owner: wxId, ts: nowIso() };

  // Fast path: try exclusive create. If we win, we own the lock.
  try {
    await writeLockExclusive(filePath, payload);
    return { ...payload, takenOver: false };
  } catch (e) {
    if (e && e.code !== 'EEXIST') throw e;
    // Fall through to the contended path.
  }

  // Contended path. Read the existing lock; decide held-by-us /
  // stale / wait.
  const existing = await readLockSafely(filePath);
  if (existing && existing.owner === wxId) {
    // Re-acquire by the same owner is a heartbeat: refresh the ts.
    await overwriteLock(filePath, payload);
    return { ...payload, takenOver: false };
  }

  const age = await lockAgeMs(filePath);
  if (age >= staleAgeMs) {
    log(
      `wx-stage-lock: STALE LOCK from "${existing?.owner ?? 'unknown'}" ` +
      `(age ${Math.round(age / 1000)}s >= ${Math.round(staleAgeMs / 1000)}s) — taking over for "${wxId}"`,
    );
    await overwriteLock(filePath, payload);
    return { ...payload, takenOver: true };
  }

  log(
    `wx-stage-lock: LOCK HELD BY "${existing?.owner ?? 'unknown'}" since ${existing?.ts ?? '?'} — waiting`,
  );

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);

    // Try exclusive create again — the holder may have released.
    try {
      await writeLockExclusive(filePath, { owner: wxId, ts: nowIso() });
      return { owner: wxId, ts: nowIso(), takenOver: false };
    } catch (e) {
      if (e && e.code !== 'EEXIST') throw e;
    }

    // Still held — check for staleness one more time.
    const current = await readLockSafely(filePath);
    const currentAge = await lockAgeMs(filePath);
    if (currentAge >= staleAgeMs) {
      log(
        `wx-stage-lock: STALE LOCK from "${current?.owner ?? 'unknown'}" ` +
        `(age ${Math.round(currentAge / 1000)}s) — taking over for "${wxId}"`,
      );
      const ts = nowIso();
      await overwriteLock(filePath, { owner: wxId, ts });
      return { owner: wxId, ts, takenOver: true };
    }
  }

  // Timed out without acquiring. Surface a fail-fast so the caller
  // can decide whether to retry or escalate.
  const finalHolder = await readLockSafely(filePath);
  throw new Error(
    `wx-stage-lock: could not acquire lock for "${wxId}" within ${maxWaitMs} ms ` +
    `(currently held by "${finalHolder?.owner ?? 'unknown'}" since ${finalHolder?.ts ?? '?'})`,
  );
}

/**
 * Release the advisory staging lock.
 *
 * If we don't own it (or it's already gone), this is a no-op.
 * Callers should ALWAYS call this in a finally block after their
 * commit/push sequence, even on failure paths.
 *
 * @param {string} [wxId] — if provided, only releases if we own it.
 *                          Omit to force-release (avoid in normal flow).
 * @param {object} [opts]
 * @param {function(string):void} [opts.log=console.log] — log sink
 * @returns {Promise<{ released: boolean, reason: string }>}
 */
export async function releaseLock(wxId, opts = {}) {
  const log = typeof opts.log === 'function' ? opts.log : (msg) => process.stdout.write(`${msg}\n`);
  const filePath = lockPath();

  const existing = await readLockSafely(filePath);
  if (!existing) {
    return { released: false, reason: 'no_lock_file' };
  }

  if (typeof wxId === 'string' && existing.owner !== wxId) {
    log(
      `wx-stage-lock: refusing to release — lock owned by "${existing.owner}", not "${wxId}"`,
    );
    return { released: false, reason: 'owned_by_other' };
  }

  try {
    await unlink(filePath);
    return { released: true, reason: 'unlinked' };
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      // Race: someone else released between our read and our unlink.
      return { released: false, reason: 'already_gone' };
    }
    throw e;
  }
}

/**
 * Inspect the current lock without acquiring/releasing.
 * Returns null if no lock present.
 */
export async function inspectLock() {
  const filePath = lockPath();
  const existing = await readLockSafely(filePath);
  if (!existing) return null;
  const age = await lockAgeMs(filePath);
  return {
    owner: existing.owner,
    ts: existing.ts,
    ageMs: age,
    stale: age >= STALE_AGE_MS,
    path: filePath,
  };
}

// Exported for tests / smoke runners.
export const __internals = Object.freeze({
  LOCK_FILENAME,
  STALE_AGE_MS,
  POLL_INTERVAL_MS,
  MAX_WAIT_MS,
  lockPath,
});
