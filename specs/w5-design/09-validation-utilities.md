# 09 — Validation Utility Audit

**Generated:** 2026-05-07 · **Goal:** Catalog regex / type / shape checks; recommend a shared validators module.

## Inventory

### Slug-safety regex

| Site | Regex | Purpose |
| --- | --- | --- |
| `src/lib/shared/CredentialAdapter.js:29` | `/^[a-zA-Z0-9-]+$/` | Provider/customer IDs (no underscores). |
| `src/lib/shared/CredentialAdapter.js:30` | `/^[a-zA-Z0-9_-]+$/` | Subkey names (underscores allowed). |

No other regex-based slug check in the codebase, but see `BaseAgent` charter checks below — they only do `typeof === 'string'` + length, no slug enforcement, even though charters likely should enforce slug-safe IDs for downstream Doppler interpolation.

### Non-empty string

| Site | Pattern |
| --- | --- |
| `BaseAgent.js:227` | `typeof c.name !== 'string' \|\| c.name.length === 0` |
| `BaseAgent.js:249` | `typeof c.escalationPolicy !== 'string'` (length not checked — likely a defect) |
| `MessageSchema.js:147, 162, 170` | `!payload \|\| typeof payload !== 'object'` (object guard — analog) |
| `ScoreEvaluator.js:265` | `typeof result.notes !== 'string'` |
| `CredentialAdapter.js:66, 123, 136` | `typeof x !== 'string' \|\| x.length === 0` (3 sites in one file alone) |
| `flowExecutor.js:66` | `!nodes \|\| nodes.length === 0` (array form) |
| `flowSimulator.js:138` | Same |
| `qaEngine.js:12, 36, 87` | `!crawlData.pages \|\| crawlData.pages.length === 0` etc. |
| `flowValidator.js:22, 29, 45, 74` | `nodes.length === 0` etc. |

### Non-empty array / required field

| Site | Pattern |
| --- | --- |
| `BaseAgent.js:239` | `!Array.isArray(c.authority) \|\| c.authority.length === 0` |
| `BaseAgent.js:247` | `if (!Array.isArray(c[k]))` (loop over required charter array fields) |
| `MessageSchema.js:121` | `!Array.isArray(p.affectedSurfaces) \|\| p.affectedSurfaces.length === 0` |
| `ScoreEvaluator.js:262` | `!Array.isArray(result.evidence) \|\| result.evidence.length === 0` |
| `CredentialAdapter.js:112` | `if (!Array.isArray(keys))` (no length check; getAll allows empty) |

### Required-fields / object-shape guard

| Site | Pattern |
| --- | --- |
| `MessageSchema.js:146-153` | `_required(payload, fields)` — local helper. Used by every payload validator + envelope validator. |

### Number-range / finite-number

| Site | Pattern |
| --- | --- |
| `MessageSchema.js:109-111` | `typeof p.value !== 'number' \|\| !Number.isFinite(p.value)` |
| `MessageSchema.js:156` | `typeof score !== 'number' \|\| score < 0 \|\| score > 100` |
| `MessageSchema.js:180-181` | `typeof env.at !== 'number' \|\| !Number.isFinite(env.at)` |
| `ScoreEvaluator.js:259` | `typeof result.score !== 'number' \|\| result.score < 0 \|\| result.score > 100` |

### Enum-membership

| Site | Pattern |
| --- | --- |
| `MessageSchema.js:115-117` | `if (!['low', 'medium', 'high'].includes(p.severity))` |
| `MessageSchema.js:140-142` | `if (!['CLEAR', 'DO_NOT_ACCEPT'].includes(p.decision))` |
| `BaseAgent.js:233-237` | charter.flowAiOnly contradicts canonical roster |
| `BaseAgent.js:242-244` | `if (!validAuthority.has(a))` |
| `CredentialAdapter.js:42-44, 45-50` | Project / env enum |
| `MessageSchema.js:177-179` | `productScope` enum |
| `ScoreEvaluator.js:169-171` | `target.type` enum |

### Integer-range

| Site | Pattern |
| --- | --- |
| `BaseAgent.js:224-226` | `if (!Number.isInteger(c.id) \|\| c.id < 1 \|\| c.id > 20)` |
| `MessageSchema.js:172-176` | `Number.isInteger(env.from.agentId) && agentId in [1,20]` (with system/portfolio escape) |

## Findings

1. **Same idioms repeat ~15+ times.** `typeof x !== 'string' \|\| x.length === 0` alone shows up at least seven times. Each site re-derives the same logic and produces a slightly different error message.
2. **Error messages are inconsistent.** Some say "must be non-empty string", others say "required", others "invalid". A shared validator can also unify the message format.
3. **`_required` is private to MessageSchema.** It's the closest existing analog to a shared validator. Promoting it costs nothing.
4. **Slug-safe regex is duplicated by intent only.** Only `CredentialAdapter` defines it. But every charter that names a `provider_id` or `customer_id` should validate against the same regex — the lack of a shared helper means BaseAgent's charter validator can let through a slug-unsafe ID that Doppler will then reject downstream.
5. **Score range `[0, 100]` is duplicated** between `MessageSchema._scoreRange` and `ScoreEvaluator._validateCriterionResult`. Same domain check, two implementations.

## Recommended shared module — `src/lib/shared/validators.js`

### Surface

```js
export function assertNonEmptyString(value, field): string
export function assertNonEmptyArray(value, field): unknown[]
export function assertObject(value, field): object
export function requireFields(obj, fields, ctx?): void           // throws PayloadError on missing
export function assertSlugSafe(value, field): string             // /^[a-zA-Z0-9-]+$/
export function assertSubkeySafe(value, field): string           // /^[a-zA-Z0-9_-]+$/
export function assertFiniteNumber(value, field): number
export function assertNumberInRange(value, min, max, field): number
export function assertIntegerInRange(value, min, max, field): number
export function assertEnumMember(value, allowed, field): string

// Regex constants
export const SLUG_RE: RegExp                                     // /^[a-zA-Z0-9-]+$/
export const SUBKEY_RE: RegExp                                   // /^[a-zA-Z0-9_-]+$/
```

### Conventions

- Each `assert*` returns the value on success (so `const id = assertSlugSafe(input, 'providerId');` doubles as a re-narrowed binding).
- Each `assert*` throws `ValidationError` (from `errors.js`, job 08) on failure with a stable `code` and `details: { field, actual }`.
- `field` parameter is the dotted path for the error message (`'envelope.from.agentId'`, `'charter.authority'`). Optional; default `'value'`.
- `ctx` (on `requireFields`) is an optional namespace prefix for the error message (`'10.metric.v1'`, etc.).

### Edge cases

| # | Edge case | Behavior |
| --- | --- | --- |
| 1 | `assertNonEmptyString(' ')` (whitespace) | Allowed by default. To trim, caller does it explicitly. Document. |
| 2 | `assertNonEmptyString('')` | Reject. |
| 3 | `assertNonEmptyArray([])` | Reject. |
| 4 | `assertNonEmptyArray('not-array')` | Reject with code `VAL_NOT_ARRAY`. |
| 5 | `assertObject(null)` | Reject (null is technically `typeof === 'object'`; the helper excludes it). |
| 6 | `assertObject([])` | Reject (we want plain objects, not arrays). |
| 7 | `requireFields(payload, ['a', 'b'])` with `payload = { a: null }` | Reject — null counts as missing (matches existing `_required` behavior). |
| 8 | `assertSlugSafe('a_b')` | Reject (underscore not allowed). |
| 9 | `assertSubkeySafe('a-b_c')` | Allow. |
| 10 | `assertSlugSafe('')` | Reject (empty). |
| 11 | `assertSlugSafe('café')` (Unicode) | Reject (regex is ASCII only). Documented. |
| 12 | `assertFiniteNumber(NaN)` / `Infinity` | Reject. |
| 13 | `assertFiniteNumber('1')` | Reject (string, not number). No coercion. |
| 14 | `assertNumberInRange(50, 0, 100)` | Allow. Inclusive on both ends. |
| 15 | `assertIntegerInRange(1.5, 1, 10)` | Reject (not integer). |
| 16 | `assertEnumMember('foo', ['a','b','c'])` | Reject with `details: { allowed: ['a','b','c'], actual: 'foo' }`. |

## Migration

| Site | Replacement |
| --- | --- |
| `CredentialAdapter._assertId` | `assertSlugSafe(value, label)` |
| `CredentialAdapter._assertSubkey` | `assertSubkeySafe(value, 'subkey')` |
| `CredentialAdapter.get` (line 66-68) | `assertNonEmptyString(key, 'CredentialAdapter.get.key')` |
| `BaseAgent._validateCharter` (lines 224-250) | Use `assertIntegerInRange`, `assertNonEmptyString`, `assertNonEmptyArray`, `assertEnumMember`. |
| `MessageSchema._required` | Replace local helper with import of `requireFields`. |
| `MessageSchema._scoreRange` | Replace with `assertNumberInRange(score, 0, 100, topic)`. |
| `ScoreEvaluator._validateCriterionResult` | Use `assertObject`, `assertNumberInRange`, `assertNonEmptyArray`. |
| `flowValidator.js` `nodes.length === 0` etc. | Use `assertNonEmptyArray` (W4 follow-up). |

## Out of scope

- Schema-driven validation (Zod, Ajv). Keep imperative for now; surface is small.
- Coercion (`assertNumber(string)` accepts `'1'`). The catalog argues for explicit, no-coercion validators. Coercion encourages bugs.
- Async validation (`assertExistsInDB`). Out of scope for utility module.
