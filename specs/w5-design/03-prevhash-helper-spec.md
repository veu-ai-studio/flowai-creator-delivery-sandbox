# 03 — `prevHash` Audit-Chain Helper — Interface Spec

**Defect:** X-005 (Owner W5, blocking D-014 Critical) · **Status:** Not started · **Out:** `src/lib/shared/auditChain.js`

This is an **interface design only**. No implementation written.

## Why

`BaseAgent.run()` writes 7 unchained entries per agent run (`BaseAgent.js:123,132,139,144,147,157,165`). Without a hash chain, an entry can be edited or deleted with no tamper trail. `GOVERNANCE_RUBRIC_V1.gov.audit_completeness` (`ScoreEvaluator.js:33-43`, weight 15) explicitly requires "Tamper-evidence chain (hash of prior entry) intact" — but no helper exists. Until it does, every agent fails this rubric criterion automatically and so cannot reach the 95-point clearance threshold.

## Existing call sites the helper must support

From `BaseAgent.js`:
```js
await this.deps.auditLog.write({
  runId, agentId, phase: 'run.start',
  productScope, environment, input, at: startedAt,
});
await this.deps.auditLog.write({ runId, phase: 'preflight.ok', at: ... });
await this.deps.auditLog.write({ runId, phase: 'plan.ok', planSummary, at: ... });
await this.deps.auditLog.write({ runId, phase: 'guard.ok', at: ... });
await this.deps.auditLog.write({ runId, phase: 'act.ok', outcome, sideEffects, at: ... });
await this.deps.auditLog.write({ runId, phase: 'postflight.error', error, at: ... });
await this.deps.auditLog.write({ runId, phase: 'run.error', error, stack, at: ... });
```

Common shape: `{ runId, phase, at, ...phaseSpecific }`.

## Proposed module — `src/lib/shared/auditChain.js`

### Exports

```js
export function appendChained(entry, opts = {}): ChainedEntry
export function verifyChain(entries, opts = {}): VerifyResult
export function newChain(opts = {}): ChainCursor
export const GENESIS_PREV_HASH: string  // 64 zeros (sha256-hex)
```

### Types (informal — JSDoc, no TS)

```
ChainedEntry = entry & {
  seq:      number,        // 0-based, monotonic per chain
  prevHash: string,        // 64-char lowercase hex (or GENESIS_PREV_HASH for seq=0)
  hash:     string,        // 64-char lowercase hex; sha256 of canonical JSON of (entry + seq + prevHash)
}

ChainCursor = {
  appendChained(entry): ChainedEntry,   // mutates internal seq + prevHash
  prevHash: string,                     // current tail hash, read-only
  seq: number,                          // next seq to assign
}

VerifyResult = {
  ok:           boolean,
  brokenAtSeq:  number | null,
  reason:       'ok' | 'seq_skip' | 'hash_mismatch' | 'genesis_mismatch' | 'empty' | 'shape_invalid',
  details:      string,
}
```

### Inputs

`appendChained(entry, opts)`:
- `entry` — any JSON-serializable plain object. Must NOT already contain `seq`, `prevHash`, or `hash` keys (rejected if present, to avoid silent overwrite).
- `opts.prevHash` — string. If absent, treated as `GENESIS_PREV_HASH`.
- `opts.seq` — number. If absent, defaults to 0 (caller is constructing a single-shot append).
- `opts.hash` — function override (`(canonicalJsonString) => Promise<string> | string`). Defaults to internal sha256 hex.

`verifyChain(entries, opts)`:
- `entries` — array of `ChainedEntry`. Empty array → `{ ok: true, reason: 'empty' }` (vacuously valid; no chain to break).
- `opts.hash` — same override as above.
- `opts.expectedTailHash` — optional pin; if provided, the last entry's `hash` must equal it.

`newChain(opts)`:
- `opts.prevHash` — bootstrap prev (defaults to genesis). Used when resuming an existing chain after process restart.
- `opts.seq` — bootstrap seq (defaults to 0).
- `opts.hash` — function override.

### Outputs

- `appendChained` → `Object.freeze`-d `ChainedEntry`. The returned object is what gets handed to `auditLog.write`.
- `verifyChain` → frozen `VerifyResult`.
- `newChain` → cursor object whose `.appendChained(entry)` is the per-call helper.

### Edge cases — required behaviors

| # | Edge case | Required behavior |
| --- | --- | --- |
| 1 | First entry of a chain | `prevHash === GENESIS_PREV_HASH` (64 zeros). |
| 2 | Entry already has `hash` / `prevHash` / `seq` field | Throw `ChainError('entry already chained')` — no silent overwrite. |
| 3 | Entry contains a `Date`, `BigInt`, `undefined`, `function`, or circular ref | Throw `ChainError('entry not json-serializable: <reason>')`. Hashing requires deterministic canonical JSON. |
| 4 | Entry has key ordering that differs between writers | Canonicalize: sort object keys recursively before hashing. Documented in spec. |
| 5 | Number precision (`123.0` vs `123`) | Canonicalize via `JSON.stringify` after key-sort. Document that callers must not rely on integer-vs-float distinction in hashed payloads. |
| 6 | Unicode in entry strings (e.g. agent name in another script) | Canonical JSON uses NFC by convention; helper does NOT re-normalize. Document that callers must normalize before passing in. |
| 7 | Empty entry `{}` | Allowed; chain still advances. The hash differentiates entries by `seq + prevHash` even when payload is empty. |
| 8 | `verifyChain` on tampered payload | Detect via `hash_mismatch`; report `brokenAtSeq` as the first non-matching index. |
| 9 | `verifyChain` on out-of-order seq | Detect via `seq_skip`; report `brokenAtSeq` at the gap. |
| 10 | `verifyChain` on a wrong genesis | Detect via `genesis_mismatch` if `entries[0].prevHash !== GENESIS_PREV_HASH`. |
| 11 | Browser/Node duality | Helper must work in both. Use `globalThis.crypto?.subtle` if available, else fall back to a small JS sha256. (Implementation concern — spec only flags it.) Async-safe surface: `appendChained` returns Promise-or-value depending on hash backend; callers should `await`. |
| 12 | Concurrent writers on same chain | Out of scope. The cursor is single-writer. Multi-writer is a sequencer problem the audit log layer owns, not this helper. |
| 13 | Resume after crash | `newChain({ prevHash: lastSavedHash, seq: lastSavedSeq + 1 })` — caller responsibility to persist the cursor state. |
| 14 | Genesis defaults vs caller-supplied `prevHash` of `''` | Empty string is rejected. Force-genesis is `undefined` or explicit `GENESIS_PREV_HASH`. |
| 15 | Hash-function override returns non-hex / wrong length | Reject with `ChainError('hash must be 64-char lowercase hex')`. |
| 16 | Replay attack (re-submitting an old entry to extend the chain) | Helper cannot detect this alone — `seq` would mismatch. `verifyChain` catches it as `seq_skip` or `hash_mismatch`. |

## Integration sketch (NOT implemented in this job)

```js
// in BaseAgent.run()
import { newChain } from '../shared/auditChain.js';

const chain = newChain();
async function audit(entry) {
  const chained = await chain.appendChained(entry);
  return this.deps.auditLog.write(chained);
}

await audit({ runId, agentId: ctx.agentId, phase: 'run.start', ... });
// ... etc.
```

`chain.prevHash` after the run is the cursor for the next run if cross-run chaining is desired. (Per-run vs cross-run chain is a W2 decision; helper supports both.)

## Out of scope

- Persistence. Helper is in-memory.
- Storage encoding (JSON vs CBOR vs protobuf). Helper canonicalizes via JSON.
- Authority to modify entries. The chain detects modification; it does not prevent it.
- Encryption at rest. Hashing ≠ encryption.
- Signing (asymmetric). Optional future extension; not in v1.

## TDD scaffold

Failing tests for this interface live at `tests/shared-auditChain.test.js` (job 11). When the helper is implemented, those tests should pass without modification.
