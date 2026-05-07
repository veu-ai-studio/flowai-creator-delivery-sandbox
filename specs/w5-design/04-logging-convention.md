# 04 — Logging Convention Audit

**Generated:** 2026-05-07 · **Scope:** `src/lib/agents/`, `src/lib/governance/`, `src/lib/audits/` (the last is missing).

## Inventory of logging call sites in scope

### `src/lib/agents/BaseAgent.js`
- Receives `deps.logger` as a required dependency (line 84).
- Never directly calls `logger.info` / `.warn` / `.error` anywhere in the file.
- Uses `auditLog.write(...)` for structured run-phase records — distinct from logging.
- **Convention used: structured audit-log only. No human-readable logger emission.**

### `src/lib/agents/MessageSchema.js`
- Pure validation/construction module. No logger references at all.
- Errors raise via `throw new Error(...)`.

### `src/lib/governance/ScoreEvaluator.js`
- Requires `deps.logger` (line 157-159), but the file body never invokes it.
- Catches criterion-evaluator errors and converts them into `evidence: [{ kind: 'evaluator_error', error: ... }]` (line 191-198) — i.e., logs *into* the evaluation output rather than via a logger.
- **Convention used: errors-as-data, no logger emission.**

### `src/lib/audits/`
- Directory does not exist. No call sites.

### Out-of-scope cross-checks (for context only)

| File | Logger style |
| --- | --- |
| `src/lib/shared/CredentialAdapter.js:62,158` | Optional logger via `this.logger?.warn?.(...)`. Stores `null` if not provided. Single `warn` call site. **Structured object payload** with `{ path, error }`. |
| `src/lib/AuthContext.jsx:52,83,104` | Direct `console.error('App state check failed:', appError)` — string + object positional. |
| `src/lib/auditLogger.js` | Silent — `try { ... } catch {}`. Comment: *"audit logging must never break the UI"*. |
| `src/lib/contentProtection.js:71,127` | Same silent pattern. No `console` calls at all. |

## Patterns observed

| Pattern | Where | Stance |
| --- | --- | --- |
| **Inject `deps.logger`, never call** | BaseAgent, ScoreEvaluator | Latent — required dep with no consumer; obvious smell |
| **Inject optional logger, call with `?.`** | CredentialAdapter | Defensive — works whether logger is present or not |
| **`console.*` directly** | AuthContext (W4) | Quick path; no structured fields, no level filtering |
| **Silent swallow** | auditLogger, contentProtection (W4) | Deliberate UX choice for browser code; loses observability |
| **Errors-as-data** | ScoreEvaluator | Folds error into the rubric output; arguably the right call for an evaluator |

## Findings

1. **Phantom dependency.** `BaseAgent` and `ScoreEvaluator` *require* `deps.logger` but never invoke it. Either start using it (which the structured audit log mostly obviates for BaseAgent) or drop it from the required list. Recommendation: drop from required, accept as optional, attach a noop default. Keeps the door open without forcing consumers to inject something they don't yet need.
2. **No level discipline anywhere.** No file in scope distinguishes `debug` / `info` / `warn` / `error`. CredentialAdapter only uses `warn`. Structured logging in production needs at minimum `info` for normal-path events and `warn` / `error` for problems.
3. **No correlation ID convention.** When BaseAgent eventually does log, the `runId` already minted in `_mintRunId` is the natural correlation key. Same for `traceId` in MessageSchema envelopes. Neither is currently woven into a logger call.
4. **No PII / credential redaction.** A logger called with `{ apiKey: 'sk-...' }` will print the secret. `gov.secrets_hygiene` (rubric weight 10) requires "No credentials in logs". A redactor is needed before any logger ships.

## Recommended shared logging convention

Single shared module: **`src/lib/shared/logger.js`** — interface only here, implementation deferred.

### Interface

```js
export function makeLogger(opts = {}): Logger
export const NOOP_LOGGER: Logger
export function bindLogger(logger, baseFields): Logger   // returns a child logger with merged fields

// Logger surface
type Logger = {
  debug(msg: string, fields?: object): void,
  info (msg: string, fields?: object): void,
  warn (msg: string, fields?: object): void,
  error(msg: string, fields?: object): void,
  child(baseFields: object): Logger,                     // alias for bindLogger
}
```

### Conventions

1. **Always structured.** Two args: a short human message and a fields object. Never positional `console.error('x', y, z)`.
2. **Always level-tagged.** `debug` / `info` / `warn` / `error`. No `log` alias.
3. **Correlation fields are first-class.** Required in all entries that occur inside a run: `runId`, `agentId`, `productScope`, `environment`. Use `bindLogger` once at run start so callers don't have to thread them.
4. **Redaction is centralized.** `makeLogger({ redact: ['apiKey', 'value', 'secret', 'password'] })` strips matching keys at any depth before emit. Default redact list is non-empty.
5. **Default backend is `NOOP_LOGGER`.** Production wires Pino / console / Sentry; tests get noop. CredentialAdapter's `this.logger?.warn?.(...)` pattern goes away because `NOOP_LOGGER.warn` exists.
6. **No `console` in `src/lib/`.** Lint rule (W4 ticket) forbids direct `console.*` outside `src/lib/shared/logger.js` itself. Existing W4 `console.error` calls migrated as a follow-up.
7. **Level for thrown errors.** Don't double-log: if a function throws, the catcher logs. The thrower does not.

## Migration order

1. Add `src/lib/shared/logger.js` with `NOOP_LOGGER` and `makeLogger` (W5).
2. `BaseAgent` / `ScoreEvaluator` change `deps.logger` from required to optional, default `NOOP_LOGGER`. (W2 follow-up.)
3. `CredentialAdapter` switches `this.logger?.warn?.(...)` → `this.logger.warn(...)` once default is `NOOP_LOGGER`. (W5/W1.)
4. `AuthContext.jsx` and other W4 `console.*` calls migrate when W4 lint rule lands.

## Out of scope

- Choosing a backend (Pino vs Bunyan vs custom). Interface lets us defer.
- Log shipping / aggregation. Infrastructure ticket, not W5.
- Sampling / rate limiting. Ship without; add when needed.
