/**
 * Shared logger — W5 job 04.
 * Spec:  specs/w5-design/04-logging-convention.md
 * Tests: tests/shared-logger.test.js
 *
 * Interface:
 *   makeLogger({ sink?, redact?, baseFields? }) -> Logger
 *   NOOP_LOGGER                                  — frozen no-op for tests / defaults
 *   bindLogger(logger, baseFields)               — non-method form of logger.child(...)
 *
 * Logger surface:
 *   debug(msg, fields?)   info(msg, fields?)
 *   warn (msg, fields?)   error(msg, fields?)
 *   child(baseFields)                            — returns a logger with merged base fields
 *
 * Convention (per spec § Conventions):
 *   - Structured: two args — short string message and a fields object.
 *   - Level-tagged: four levels, no `log` alias.
 *   - Redaction is centralised. Default redact list is non-empty and
 *     covers the obvious credential-shaped keys.
 *   - The thrower does not log; the catcher does — prevents double-emit.
 *   - Default backend is NOOP_LOGGER. Real backend (pino/console/Sentry)
 *     is wired by the caller via `sink`.
 *
 * ESM only.
 */

'use strict';

const LEVELS = Object.freeze(['debug', 'info', 'warn', 'error']);

const DEFAULT_REDACT_KEYS = Object.freeze([
  'apiKey',
  'api_key',
  'secret',
  'password',
  'token',
  'value',                    // credential-record "value" field per spec example
  'authorization',
  'cookie',
  'sessionToken',
]);

const REDACTED_PLACEHOLDER = '[REDACTED]';

function _isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Walk `value` (object or array) and return a deep-redacted clone where
 * any key in `redactSet` is replaced with `[REDACTED]`. Non-objects are
 * returned as-is. Cycles are broken by returning the placeholder string.
 */
function _redact(value, redactSet, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return REDACTED_PLACEHOLDER;
    seen.add(value);
    return value.map((v) => _redact(v, redactSet, seen));
  }
  if (_isPlainObject(value)) {
    if (seen.has(value)) return REDACTED_PLACEHOLDER;
    seen.add(value);
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (redactSet.has(k)) {
        out[k] = REDACTED_PLACEHOLDER;
      } else {
        out[k] = _redact(v, redactSet, seen);
      }
    }
    return out;
  }
  return value;
}

function _normalizeFields(fields) {
  if (fields === null || fields === undefined) return {};
  if (!_isPlainObject(fields)) return { value: fields };
  return fields;
}

/**
 * Create a logger.
 *
 * @param {object} [opts]
 * @param {(record: { level, msg, fields, ts }) => void} [opts.sink]
 *        Backend that receives each emitted record. Default: noop.
 * @param {string[]} [opts.redact]
 *        Field-name allowlist for redaction. Defaults to DEFAULT_REDACT_KEYS.
 *        Provide the empty array to disable redaction entirely.
 * @param {object} [opts.baseFields]
 *        Fields merged into every emit (correlation IDs etc.).
 * @returns {Logger}
 */
export function makeLogger(opts = {}) {
  const sink = typeof opts.sink === 'function' ? opts.sink : () => {};
  const redactKeys = Array.isArray(opts.redact) ? opts.redact : DEFAULT_REDACT_KEYS;
  const redactSet = new Set(redactKeys.filter((k) => typeof k === 'string' && k.length > 0));
  const baseFields = _isPlainObject(opts.baseFields) ? { ...opts.baseFields } : {};

  const emit = (level, msg, fields) => {
    const merged = { ...baseFields, ..._normalizeFields(fields) };
    const safe = _redact(merged, redactSet);
    sink({
      level,
      msg: typeof msg === 'string' ? msg : String(msg ?? ''),
      fields: safe,
      ts: Date.now(),
    });
  };

  const logger = {
    debug: (msg, fields) => emit('debug', msg, fields),
    info:  (msg, fields) => emit('info',  msg, fields),
    warn:  (msg, fields) => emit('warn',  msg, fields),
    error: (msg, fields) => emit('error', msg, fields),
    child: (childFields) => makeLogger({
      sink: opts.sink,
      redact: redactKeys,
      baseFields: { ...baseFields, ...(_isPlainObject(childFields) ? childFields : {}) },
    }),
  };
  return logger;
}

/** Non-method form of `logger.child(baseFields)`. */
export function bindLogger(logger, baseFields) {
  if (!logger || typeof logger.child !== 'function') {
    throw new TypeError('bindLogger: logger.child is not a function');
  }
  return logger.child(_isPlainObject(baseFields) ? baseFields : {});
}

/**
 * Frozen no-op logger. The default for any consumer that doesn't wire a
 * real backend. Every method is a function (so call sites don't need
 * `?.` guards). `child(...)` returns the same NOOP_LOGGER.
 */
function _noop() { /* intentionally empty */ }

export const NOOP_LOGGER = Object.freeze({
  debug: _noop,
  info: _noop,
  warn: _noop,
  error: _noop,
  child: () => NOOP_LOGGER,
});

// Exported for tests.
export const __test = Object.freeze({
  LEVELS,
  DEFAULT_REDACT_KEYS,
  REDACTED_PLACEHOLDER,
  _redact,
});
