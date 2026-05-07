# 08 — Error Class Hierarchy Audit

**Generated:** 2026-05-07 · **Goal:** Catalog throw patterns; recommend a shared error hierarchy.

## Inventory

### `src/lib/agents/BaseAgent.js`
17 `throw new Error(...)` sites. All plain `Error`. Categories:

| Category | Lines | Example |
| --- | --- | --- |
| Roster invariant | 45-46 | `Roster partition invalid: expected 20 unique IDs` |
| Missing dependency | 86 | `BaseAgent: missing dependency "${k}"` |
| Charter shape | 91, 225-250 | `${this.constructor.name}: static charter() not implemented` |
| Scope/env mismatch | 96-98, 104-107 | `Agent #${id} is FlowAI-only but constructed with productScope=...` |
| Plan shape | 137 | `Agent #${id}: plan() must return an object` |
| Authority guard | 199-200, 207-209 | `Agent #${id} (${name}): plan requested authority "${need}" but charter only grants [...]` |
| Pubsub args | 176, 187-188 | `emit: topic required`, `subscribe: handler must be a function` |
| Not-implemented | 214-215 | `${name}: plan() not implemented` |

### `src/lib/agents/MessageSchema.js`
13 `throw new Error(...)` sites. Categories:

| Category | Lines | Example |
| --- | --- | --- |
| Payload validation | 110, 116, 122, 141, 147, 150, 157 | `payload missing required field "${f}"` |
| Envelope shape | 162, 165, 168, 170, 174, 178, 181 | `envelope.from.agentId invalid: ${id}` |

### `src/lib/governance/ScoreEvaluator.js`
13 `throw new Error(...)` sites. Categories:

| Category | Lines | Example |
| --- | --- | --- |
| Rubric weight invariant | 142 | `Rubric ${version} weights sum to ${sum}, expected 100` |
| Constructor deps | 148, 150, 154, 158 | `deps must include logger, clock, messageBus` |
| Target shape | 168, 170 | `target must have type and id` |
| Self-audit | 178 | `Agent #8 cannot be audited by the primary evaluator. Use the auditor-of-auditor instance (W3 territory).` |
| Criterion result shape | 257-266 | `Result.score for ${id} must be in [0,100]` |
| Cross-eval mismatch | 276 | `clearanceDecision: target mismatch between evaluations` |

### `src/lib/shared/CredentialAdapter.js`
13 `throw new Error(...)` sites. Categories:

| Category | Lines | Example |
| --- | --- | --- |
| Constructor opts | 40-41, 43, 47-50 | `CredentialAdapter: project required` |
| Get-args | 67, 112, 124, 128-131, 137, 140-142 | `CredentialAdapter: subkey="${value}" must contain only alphanumeric, underscore, or hyphen.` |
| Default-singleton | 180-184, 188 | `No default CredentialAdapter set. Call setDefaultCredentialAdapter(adapter) at startup.` |

### W4 (out-of-scope but relevant for redesign)
Same plain-`Error` pattern in `flowStore.jsx`, `OrchestrationContext.jsx`, `AuthContext.jsx`, `operationsEngine.js`, `jobRunners.js`. No subclasses anywhere.

## Findings

1. **Zero subclasses.** Nothing in `src/` extends `Error`. Catchers cannot type-check; they can only string-match the message. This breaks the moment messages are translated, logged, or wrapped.
2. **No error metadata.** Every error is a plain string. No `code`, no `cause`, no `details` object. So callers can't programmatically branch on cause.
3. **Module prefix in message** is the de-facto namespacing convention (`'CredentialAdapter: ...'`, `'BaseAgent: ...'`, `'envelope.from.agentId invalid: ...'`). Useful for humans, useless for code.
4. **Duplicate categories across modules.** Constructor-deps validation, payload shape validation, and slug/format validation all appear repeatedly. Same shape of error, different module prefix.
5. **Some errors are recoverable, some aren't, and there's no signal.** A `dopplerClient.fetchSecret` throw is logged and swallowed (`CredentialAdapter.js:157-161`); a missing constructor dep is fatal. Both surface as `Error`. Catchers have no way to tell.

## Recommended hierarchy — `src/lib/shared/errors.js`

### Class tree

```
Error
└── FlowAiError                      # base; carries { code, details, cause }
    ├── ConfigError                  # constructor opts / module setup
    ├── ValidationError              # input shape / format / slug-safety
    │   ├── PayloadError             # message-envelope payload validation
    │   └── CharterError             # agent charter validation
    ├── AuthorityError               # plan exceeded charter authority
    ├── DependencyError              # missing or invalid injected dep
    ├── NotImplementedError          # abstract method called
    ├── ChainError                   # audit chain integrity (X-005)
    └── EvaluatorError               # rubric / criterion / clearance-decision
```

### Base class shape

```js
export class FlowAiError extends Error {
  constructor(message, { code, details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = new.target.name;
    this.code = code ?? 'FLOWAI_ERROR';
    this.details = Object.freeze(details ?? {});
  }
}
```

- `code`: short stable string (`'CRED_INVALID_PROJECT'`, `'AGENT_AUTHORITY_VIOLATION'`, `'CHAIN_HASH_MISMATCH'`). Stable across messages.
- `details`: object of structured fields (`{ provider: 'flowai', env: 'demo' }`). Frozen.
- `cause`: native ES2022 `Error.cause`. For wrapping a lower-level throw.
- `toJSON()`: serialize-safe form for logger/audit emission. Strips stack by default; opt-in via `{ stack: true }`.

### Per-subclass conventions

| Subclass | Code prefix | When to throw |
| --- | --- | --- |
| `ConfigError` | `CFG_*` | Wrong opts to a constructor or factory. |
| `ValidationError` | `VAL_*` | Caller-supplied input has wrong shape/type/format. |
| `PayloadError` | `MSG_*` | `MessageSchema` envelope/payload validation. |
| `CharterError` | `CHARTER_*` | `BaseAgent._validateCharter` failures. |
| `AuthorityError` | `AUTH_*` | Plan asked for authority not granted by charter. |
| `DependencyError` | `DEP_*` | Required `deps.{logger,clock,messageBus,auditLog}` missing or wrong shape. |
| `NotImplementedError` | `NIY_*` | Abstract `plan()` / `act()` not overridden. |
| `ChainError` | `CHAIN_*` | Audit chain integrity (`prevHash` mismatch, replayed seq, malformed entry). |
| `EvaluatorError` | `EVAL_*` | ScoreEvaluator setup or criterion-result shape problems. |

### Migration table (selection)

| Site | Today | Replacement |
| --- | --- | --- |
| `BaseAgent.js:86` | `throw new Error(`BaseAgent: missing dependency "${k}"`)` | `throw new DependencyError(`missing dependency "${k}"`, { code: 'DEP_MISSING', details: { dep: k } })` |
| `BaseAgent.js:200` | `throw new Error(`Agent #${id}: plan requested authority...`)` | `throw new AuthorityError(`agent #${id} requested authority "${need}"`, { code: 'AUTH_EXCEEDED', details: { agentId: id, requested: need, granted: [...declared] } })` |
| `MessageSchema.js:150` | `throw new Error(`payload missing required field "${f}"`)` | `throw new PayloadError(`missing required field "${f}"`, { code: 'MSG_FIELD_MISSING', details: { field: f } })` |
| `CredentialAdapter.js:67` | `throw new Error('CredentialAdapter.get: key must be non-empty string')` | `throw new ValidationError('key must be non-empty string', { code: 'VAL_KEY_EMPTY' })` |
| `ScoreEvaluator.js:178` | `throw new Error('Agent #8 cannot be audited by the primary evaluator...')` | `throw new EvaluatorError('agent #8 self-audit forbidden', { code: 'EVAL_SELF_AUDIT' })` |

## Tests catch on subclass, not message

Today:
```js
expect(() => new Adapter(...)).toThrow(/invalid for project/);   // brittle
```

After:
```js
expect(() => new Adapter(...)).toThrow(ConfigError);
expect.objectContaining({ code: 'CFG_INVALID_PROJECT' });
```

This makes message edits non-breaking.

## Out of scope

- I18n / message templating. Messages stay English-only.
- Telemetry hooks (auto-report errors to Sentry). Add when telemetry exists.
- Retry-classification (transient vs permanent). Add as a `retryable: boolean` field on subclass details when retry policy lands.
