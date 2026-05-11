/**
 * Audit-chain helper — W5 job 03 (X-005, blocks D-014 Critical).
 * Spec:  specs/w5-design/03-prevhash-helper-spec.md
 * Tests: tests/shared-auditChain.test.js
 *
 * Tamper-evidence chain for audit-log entries. Each entry carries:
 *   seq:      monotonic 0-based index
 *   prevHash: hash of the previous entry (genesis = 64 zeros)
 *   hash:     sha256-hex of canonical-JSON(entry + seq + prevHash)
 *
 * Surface:
 *   appendChained(entry, opts?)  -> Promise<ChainedEntry>
 *   verifyChain(entries, opts?)  -> Promise<VerifyResult>
 *   newChain(opts?)              -> ChainCursor
 *   GENESIS_PREV_HASH            -> 64 zeros (sha256-hex)
 *
 * Canonicalization: every object key path is sorted before JSON.stringify.
 * That is the *only* canonicalization step — callers must avoid types that
 * JSON.stringify drops or mangles (Date / BigInt / undefined / function /
 * cycles); appendChained throws ChainError when it spots one.
 *
 * Backend: Node `node:crypto` (createHash('sha256')) for portability across
 * Node 18+. Browser builds would substitute `crypto.subtle.digest('SHA-256',
 * ...)` here; the public surface is async so the swap is non-breaking.
 *
 * ESM only.
 */

'use strict';

import { createHash } from 'node:crypto';
import { ChainError } from './errors.js';

export const GENESIS_PREV_HASH = '0'.repeat(64);
const HEX64_RE = /^[0-9a-f]{64}$/;
const RESERVED_KEYS = Object.freeze(['seq', 'prevHash', 'hash']);

// ─────────────────────────────────────────────────────────────────
// Canonicalization + hashing
// ─────────────────────────────────────────────────────────────────

function _canonicalize(value, seen) {
  if (value === undefined) {
    throw new ChainError('entry not json-serializable: undefined value', { code: 'CHAIN_NOT_SERIALIZABLE' });
  }
  if (typeof value === 'function') {
    throw new ChainError('entry not json-serializable: function value', { code: 'CHAIN_NOT_SERIALIZABLE' });
  }
  if (typeof value === 'bigint') {
    throw new ChainError('entry not json-serializable: bigint value', { code: 'CHAIN_NOT_SERIALIZABLE' });
  }
  if (value instanceof Date) {
    throw new ChainError('entry not json-serializable: Date value (callers must pre-serialize)', { code: 'CHAIN_NOT_SERIALIZABLE' });
  }
  if (value === null) return null;
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new ChainError('entry not json-serializable: circular reference', { code: 'CHAIN_NOT_SERIALIZABLE' });
    }
    seen.add(value);
    const out = value.map((v) => _canonicalize(v, seen));
    seen.delete(value);
    return out;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      throw new ChainError('entry not json-serializable: circular reference', { code: 'CHAIN_NOT_SERIALIZABLE' });
    }
    seen.add(value);
    const keys = Object.keys(value).sort();
    const out = {};
    for (const k of keys) out[k] = _canonicalize(value[k], seen);
    seen.delete(value);
    return out;
  }
  // primitives: string, number, boolean
  return value;
}

function _canonicalJson(entry, seq, prevHash) {
  const wrapped = _canonicalize({ entry, seq, prevHash }, new WeakSet());
  return JSON.stringify(wrapped);
}

async function _sha256Hex(input, hashFnOverride) {
  if (typeof hashFnOverride === 'function') {
    const out = await hashFnOverride(input);
    if (typeof out !== 'string' || !HEX64_RE.test(out)) {
      throw new ChainError('hash must be 64-char lowercase hex', { code: 'CHAIN_BAD_HASH', details: { actual: out } });
    }
    return out;
  }
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// ─────────────────────────────────────────────────────────────────
// Entry validation
// ─────────────────────────────────────────────────────────────────

function _assertNotAlreadyChained(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new ChainError('entry must be a plain object', { code: 'CHAIN_BAD_ENTRY', details: { actual: entry } });
  }
  for (const k of RESERVED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(entry, k)) {
      throw new ChainError(
        `entry already chained: contains reserved key "${k}"`,
        { code: 'CHAIN_DOUBLE_CHAIN', details: { field: k } },
      );
    }
  }
}

function _assertPrevHash(prevHash) {
  if (typeof prevHash !== 'string' || !HEX64_RE.test(prevHash)) {
    throw new ChainError(
      'prevHash must be 64-char lowercase hex',
      { code: 'CHAIN_BAD_PREV_HASH', details: { actual: prevHash } },
    );
  }
}

function _assertSeq(seq) {
  if (!Number.isInteger(seq) || seq < 0) {
    throw new ChainError(
      'seq must be a non-negative integer',
      { code: 'CHAIN_BAD_SEQ', details: { actual: seq } },
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Public surface
// ─────────────────────────────────────────────────────────────────

/**
 * Compute and attach { seq, prevHash, hash } to `entry`.
 *
 * @param {object} entry — plain object without seq/prevHash/hash keys
 * @param {object} [opts]
 * @param {string} [opts.prevHash=GENESIS_PREV_HASH]
 * @param {number} [opts.seq=0]
 * @param {(canonicalJson: string) => string|Promise<string>} [opts.hash]
 * @returns {Promise<Readonly<object>>} frozen chained entry
 */
export async function appendChained(entry, opts = {}) {
  _assertNotAlreadyChained(entry);
  const prevHash = opts.prevHash === undefined ? GENESIS_PREV_HASH : opts.prevHash;
  _assertPrevHash(prevHash);
  const seq = opts.seq === undefined ? 0 : opts.seq;
  _assertSeq(seq);
  const canon = _canonicalJson(entry, seq, prevHash);
  const hash = await _sha256Hex(canon, opts.hash);
  return Object.freeze({ ...entry, seq, prevHash, hash });
}

/**
 * @param {object} [opts]
 * @param {string} [opts.prevHash=GENESIS_PREV_HASH] — resume from this prev
 * @param {number} [opts.seq=0]                      — next seq to assign
 * @param {function} [opts.hash]                     — hash override
 * @returns {ChainCursor}
 */
export function newChain(opts = {}) {
  const startPrev = opts.prevHash === undefined ? GENESIS_PREV_HASH : opts.prevHash;
  _assertPrevHash(startPrev);
  const startSeq = opts.seq === undefined ? 0 : opts.seq;
  _assertSeq(startSeq);
  const hashFn = typeof opts.hash === 'function' ? opts.hash : undefined;

  let prevHash = startPrev;
  let seq = startSeq;

  const cursor = {
    get prevHash() { return prevHash; },
    get seq() { return seq; },
    async appendChained(entry) {
      const chained = await appendChained(entry, { prevHash, seq, hash: hashFn });
      prevHash = chained.hash;
      seq = seq + 1;
      return chained;
    },
  };
  return cursor;
}

/**
 * Verify that `entries` form a contiguous chain.
 *
 * @param {ChainedEntry[]} entries
 * @param {object} [opts]
 * @param {function} [opts.hash]              — hash override (must match the
 *                                              one used at append time)
 * @param {string}   [opts.expectedTailHash]  — optional pin on the final hash
 * @returns {Promise<Readonly<{ok, brokenAtSeq, reason, details}>>}
 */
export async function verifyChain(entries, opts = {}) {
  if (!Array.isArray(entries)) {
    return Object.freeze({
      ok: false,
      brokenAtSeq: null,
      reason: 'shape_invalid',
      details: 'entries must be an array',
    });
  }
  if (entries.length === 0) {
    return Object.freeze({ ok: true, brokenAtSeq: null, reason: 'empty', details: 'no entries' });
  }
  const hashFn = typeof opts.hash === 'function' ? opts.hash : undefined;

  let expectedSeq = entries[0].seq ?? 0;
  let expectedPrev = entries[0].prevHash;
  if (entries[0].prevHash !== GENESIS_PREV_HASH && entries[0].seq === 0) {
    // First entry but prevHash is not genesis — explicit genesis_mismatch.
    return Object.freeze({
      ok: false,
      brokenAtSeq: 0,
      reason: 'genesis_mismatch',
      details: `entries[0].prevHash="${entries[0].prevHash}" but expected GENESIS_PREV_HASH`,
    });
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e || typeof e !== 'object' || Array.isArray(e)) {
      return Object.freeze({
        ok: false,
        brokenAtSeq: i,
        reason: 'shape_invalid',
        details: `entries[${i}] not a plain object`,
      });
    }
    if (typeof e.seq !== 'number' || typeof e.prevHash !== 'string' || typeof e.hash !== 'string') {
      return Object.freeze({
        ok: false,
        brokenAtSeq: typeof e.seq === 'number' ? e.seq : i,
        reason: 'shape_invalid',
        details: `entries[${i}] missing seq/prevHash/hash`,
      });
    }
    if (e.seq !== expectedSeq) {
      return Object.freeze({
        ok: false,
        brokenAtSeq: e.seq,
        reason: 'seq_skip',
        details: `entries[${i}].seq=${e.seq} but expected ${expectedSeq}`,
      });
    }
    if (e.prevHash !== expectedPrev) {
      return Object.freeze({
        ok: false,
        brokenAtSeq: e.seq,
        reason: 'hash_mismatch',
        details: `entries[${i}].prevHash does not match prior hash`,
      });
    }
    // Recompute hash over the stripped payload + seq + prevHash.
    const { seq, prevHash, hash, ...payload } = e;  // eslint-disable-line no-unused-vars
    const canon = _canonicalJson(payload, seq, prevHash);
    let recomputed;
    try {
      recomputed = await _sha256Hex(canon, hashFn);
    } catch (err) {
      return Object.freeze({
        ok: false,
        brokenAtSeq: seq,
        reason: 'shape_invalid',
        details: `recompute failed: ${err?.message ?? err}`,
      });
    }
    if (recomputed !== e.hash) {
      return Object.freeze({
        ok: false,
        brokenAtSeq: seq,
        reason: 'hash_mismatch',
        details: `entries[${i}].hash does not match recomputed canonical-JSON hash`,
      });
    }
    expectedSeq = seq + 1;
    expectedPrev = e.hash;
  }

  if (opts.expectedTailHash !== undefined) {
    const tail = entries[entries.length - 1].hash;
    if (tail !== opts.expectedTailHash) {
      return Object.freeze({
        ok: false,
        brokenAtSeq: entries[entries.length - 1].seq,
        reason: 'hash_mismatch',
        details: `tail hash "${tail}" does not match expectedTailHash "${opts.expectedTailHash}"`,
      });
    }
  }

  return Object.freeze({ ok: true, brokenAtSeq: null, reason: 'ok', details: `${entries.length} entries verified` });
}

// Exported for unit tests.
export const __test = Object.freeze({
  HEX64_RE,
  RESERVED_KEYS,
  _canonicalJson,
});
