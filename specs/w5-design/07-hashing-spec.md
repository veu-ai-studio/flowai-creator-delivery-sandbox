# 07 — Hashing Utility — Interface Spec

**Owner:** W5 · **Drives:** D-014 (Critical) and X-005 (`prevHash` audit-chain helper) · **Status:** Not started.

This is an **interface design only**. No implementation written.

## Why

The `prevHash` audit-chain helper (`03-prevhash-helper-spec.md`) requires a deterministic hash function. Hashing is also useful for build-artifact pinning (D-003: "Agent #2 Code Builder: build artifacts not signed or hash-pinned"). Both consumers need:

- **Deterministic** — same input bytes always produce same digest.
- **Browser-safe** — must run in Base44 ESM (no `node:crypto`).
- **Hex output** — fixed-width, easy to compare, log-friendly.

A single shared hashing module covers both. The defect register confirms the helper is owed by W5; nothing exists today (verified: zero matches for `crypto.subtle`, `sha256`, `sha-256`, or any hash library import in `src/lib/`).

## Proposed module — `src/lib/shared/hashing.js`

### Exports

```js
export async function sha256Hex(input: string | Uint8Array): Promise<string>
export async function sha256OfJson(value: JsonValue): Promise<string>     // canonicalizes then hashes
export function canonicalJson(value: JsonValue): string                   // deterministic stringify (key-sort, no whitespace)
export const SHA256_HEX_RE: RegExp                                        // /^[0-9a-f]{64}$/
export const SHA256_GENESIS: string                                       // 64 zeros
export function isSha256Hex(value: unknown): boolean
```

### Why async

`crypto.subtle.digest` is async. Synchronous JS sha256 would work but adds ~150 lines to ship. The async surface is consistent across browser and Node (Node 15+ exposes `crypto.subtle` as well). Callers must `await`. Documented loud and clear.

### Inputs

`sha256Hex(input)`:
- `string` → UTF-8 encoded, then hashed.
- `Uint8Array` → hashed directly.
- Any other type → throw `ValidationError('sha256Hex: input must be string or Uint8Array')`.

`sha256OfJson(value)`:
- Any JSON-serializable plain value (object, array, number, string, boolean, null).
- Sorts object keys recursively. Strings hashed as their JSON representation (so `'"a"'` not `'a'` — quoting matters).
- Rejects: `undefined`, `function`, `BigInt`, `Symbol`, circular refs, `Date`. Caller must convert these to representable types first (typically `Date.toISOString()`, `BigInt.toString()`).

`canonicalJson(value)`:
- Same input rules as above.
- Output is a deterministic UTF-8 string. Used internally by `sha256OfJson` and exported for tests and for the audit chain helper to inspect what it's hashing.

### Outputs

- `sha256Hex` and `sha256OfJson` resolve to a 64-character lowercase hex string.
- `canonicalJson` returns a string with no whitespace, sorted object keys, JSON literals.
- `SHA256_GENESIS` is the literal string `'0'.repeat(64)` — used as the seed `prevHash` for the first entry of any chain.
- `isSha256Hex` returns `true` iff input is a string of 64 hex characters in `[0-9a-f]` (lowercase).

### Edge cases

| # | Edge case | Required behavior |
| --- | --- | --- |
| 1 | Empty string `''` | Hashes to `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (canonical SHA-256 of empty). |
| 2 | Empty `Uint8Array` | Same as empty string — sha256 of zero bytes. |
| 3 | Empty object `{}` | `canonicalJson({})` → `'{}'`. Hashes to a deterministic, non-zero value. |
| 4 | `null` | `canonicalJson(null)` → `'null'`. Allowed; hashes deterministically. |
| 5 | Object with same keys in different insertion order | Same hash output (key sort guarantees this). |
| 6 | Object with `__proto__` / prototype keys | Treated as own-enumerable strings only. Inherited keys ignored. |
| 7 | Numbers: integer `1` vs float `1.0` | Both serialize to `"1"`. Same hash. Documented. |
| 8 | Numbers: `NaN`, `Infinity` | Reject. JSON cannot represent them. Throw `ValidationError`. |
| 9 | String containing surrogate pairs / unpaired surrogates | UTF-8 encode rejects unpaired surrogates (per WHATWG); we surface that error. Documented. |
| 10 | Non-ASCII strings | Hashed as UTF-8 bytes. Identical results across browser and Node. |
| 11 | Deep nesting (>1000 levels) | Allowed. Throws `RangeError` only if the JS stack genuinely overflows in canonicalize step. |
| 12 | Cyclic object | Detected during canonicalize; throw `ValidationError('cyclic reference at <path>')`. |
| 13 | `Map` / `Set` / `Date` / typed-array values | Reject. Caller must convert. |
| 14 | Mixed string/number keys (`{ 1: 'a', '1': 'b' }`) | JS coerces to one key; canonicalize uses `Object.keys`. Document the coercion behavior. |
| 15 | `crypto.subtle` unavailable | Throw `Error('hashing.sha256Hex: crypto.subtle is required')`. (Vitest in Node 18+ has it. Older runtimes are unsupported.) |

## Integration with `auditChain.js`

```js
import { sha256OfJson, SHA256_GENESIS, isSha256Hex } from './hashing.js';
import { canonicalJson } from './hashing.js';

async function appendChained(entry, { prevHash = SHA256_GENESIS, seq = 0, hash = sha256OfJson } = {}) {
  if ('hash' in entry || 'prevHash' in entry || 'seq' in entry) {
    throw new ChainError('entry already chained');
  }
  if (!isSha256Hex(prevHash)) {
    throw new ChainError('prevHash must be 64-char lowercase hex');
  }
  const body = { ...entry, seq, prevHash };
  const h = await hash(body);
  if (!isSha256Hex(h)) throw new ChainError('hash backend returned non-hex digest');
  return Object.freeze({ ...body, hash: h });
}
```

(That's pseudocode for the integration. Implementation is not part of this job.)

## Build-artifact pinning (D-003) integration

`Agent #2 Code Builder` wants to publish `2.build.completed.v1` envelopes containing a SHA-256 of the artifact. Same module:

```js
const artifactHash = await sha256Hex(artifactBytes);   // Uint8Array path
envelope.payload = { ..., artifactSha256: artifactHash };
```

No additional surface needed. D-003 fix is unblocked by shipping `hashing.js`.

## Out of scope

- HMAC. Different primitive; add later if needed for signed audit logs.
- Asymmetric signing (RSA / Ed25519). Document as future extension.
- Streaming hashing of large blobs. v1 hashes whole input. Build artifacts up to ~50 MB are fine.
- Algorithm agility. v1 is SHA-256 only. If we ever need to upgrade, an `algoVersion` field in chained entries lets us migrate without breaking history.

## TDD scaffold

Failing tests live at `tests/shared-hashing.test.js`.
