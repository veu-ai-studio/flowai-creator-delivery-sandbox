// Smoke test for scripts/lib/wx-stage-lock.mjs.
//
// Exercises:
//   1. acquire on a fresh slate
//   2. inspect while held
//   3. release by owner
//   4. release no-op when no lock present
//   5. acquire-then-acquire-by-same-owner (heartbeat)
//   6. acquire-by-other-owner times out fast (with short pollIntervalMs/maxWaitMs)
//   7. stale takeover when staleAgeMs is set to a tiny window
//   8. release no-op when called with the wrong owner
//
// Exit code 0 = all pass; 1 = any fail. Each step prints a one-line result.
//
// Usage:  node scripts/smoke-wx-stage-lock.mjs

import { acquireLock, releaseLock, inspectLock, __internals } from './lib/wx-stage-lock.mjs';
import { unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const lockPath = __internals.lockPath();
const failures = [];

function ok(name)            { process.stdout.write(`  ok    ${name}\n`); }
function bad(name, detail)   { process.stdout.write(`  FAIL  ${name}  — ${detail}\n`); failures.push(name); }

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function cleanSlate() {
  if (existsSync(lockPath)) {
    try { await unlink(lockPath); } catch { /* fine */ }
  }
}

async function backdateLock(ms) {
  // Make the on-disk mtime older than `ms` to simulate a stale lock.
  const past = new Date(Date.now() - ms);
  // fs.utimes via promises is convenient.
  const { utimes } = await import('node:fs/promises');
  await utimes(lockPath, past, past);
}

async function main() {
  process.stdout.write('Smoke: wx-stage-lock\n');

  // ── 1. Acquire on a fresh slate ────────────────────────────────
  await cleanSlate();
  const a1 = await acquireLock('W5b-smoke');
  if (a1.owner === 'W5b-smoke' && !a1.takenOver) ok('1. acquire on clean slate');
  else bad('1. acquire on clean slate', JSON.stringify(a1));

  // ── 2. Inspect while held ──────────────────────────────────────
  const inspected = await inspectLock();
  if (inspected && inspected.owner === 'W5b-smoke' && !inspected.stale) ok('2. inspect returns held lock');
  else bad('2. inspect returns held lock', JSON.stringify(inspected));

  // ── 3. Release by owner ────────────────────────────────────────
  const r1 = await releaseLock('W5b-smoke');
  if (r1.released && r1.reason === 'unlinked' && !existsSync(lockPath)) ok('3. release by owner removes lock');
  else bad('3. release by owner removes lock', JSON.stringify(r1));

  // ── 4. Release no-op when no lock present ──────────────────────
  const r2 = await releaseLock('W5b-smoke');
  if (!r2.released && r2.reason === 'no_lock_file') ok('4. release no-op when absent');
  else bad('4. release no-op when absent', JSON.stringify(r2));

  // ── 5. Re-acquire by same owner = heartbeat ────────────────────
  const a2 = await acquireLock('W5b-smoke');
  const a3 = await acquireLock('W5b-smoke'); // heartbeat
  if (a2.owner === 'W5b-smoke' && a3.owner === 'W5b-smoke' && !a3.takenOver) ok('5. heartbeat re-acquire by same owner');
  else bad('5. heartbeat re-acquire by same owner', `${JSON.stringify(a2)} | ${JSON.stringify(a3)}`);

  // ── 6. Acquire by other owner times out fast ───────────────────
  // Lock currently held by W5b-smoke. Try W5c-smoke with tight bounds.
  const t0 = Date.now();
  let timedOut = false;
  try {
    await acquireLock('W5c-smoke', {
      pollIntervalMs: 150,
      maxWaitMs: 600,
      staleAgeMs: 60_000,
      log: () => { /* silent */ },
    });
  } catch (e) {
    timedOut = /could not acquire lock/.test(e.message);
  }
  const elapsed = Date.now() - t0;
  if (timedOut && elapsed >= 500 && elapsed < 5_000) ok(`6. acquire-by-other times out fast (${elapsed} ms)`);
  else bad(`6. acquire-by-other times out fast`, `timedOut=${timedOut} elapsed=${elapsed}ms`);

  // ── 7. Stale takeover ──────────────────────────────────────────
  // Backdate the lock file's mtime so it looks 30s old, then ask
  // for the lock with a 10s stale window. We should take over.
  await backdateLock(30_000);
  const a4 = await acquireLock('W5c-smoke', {
    staleAgeMs: 10_000,
    pollIntervalMs: 50,
    maxWaitMs: 500,
    log: () => { /* silent */ },
  });
  if (a4.owner === 'W5c-smoke' && a4.takenOver === true) ok('7. stale takeover when staleAgeMs exceeded');
  else bad('7. stale takeover when staleAgeMs exceeded', JSON.stringify(a4));

  // ── 8. Release with wrong owner is a safe no-op ────────────────
  const r3 = await releaseLock('W5b-smoke', { log: () => {} });
  if (!r3.released && r3.reason === 'owned_by_other' && existsSync(lockPath)) ok('8. release with wrong owner is no-op');
  else bad('8. release with wrong owner is no-op', JSON.stringify(r3));

  // Final cleanup
  await releaseLock('W5c-smoke', { log: () => {} });
  await cleanSlate();

  process.stdout.write('\n');
  if (failures.length === 0) {
    process.stdout.write('All 8 smoke checks passed.\n');
    process.exit(0);
  } else {
    process.stdout.write(`${failures.length} smoke check(s) FAILED: ${failures.join(', ')}\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`smoke runner crashed: ${e?.stack ?? e?.message ?? e}\n`);
  process.exit(2);
});
