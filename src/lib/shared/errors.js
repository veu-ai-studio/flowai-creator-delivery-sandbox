/**
 * Shared error hierarchy — W5 job 08.
 * Spec:  specs/w5-design/08-error-hierarchy.md
 * Tests: tests/shared-errors.test.js
 *
 * Class tree:
 *   Error
 *   └── FlowAiError                       (base; { code, details, cause })
 *       ├── ConfigError                   CFG_*    constructor / setup
 *       ├── ValidationError               VAL_*    input shape / format
 *       ├── PayloadError                  MSG_*    MessageSchema validation
 *       ├── CharterError                  CHARTER_* BaseAgent charter
 *       ├── AuthorityError                AUTH_*   plan vs charter authority
 *       ├── DependencyError               DEP_*    missing/invalid deps
 *       ├── NotImplementedError           NIY_*    abstract method called
 *       ├── ChainError                    CHAIN_*  audit-chain integrity
 *       └── EvaluatorError                EVAL_*   rubric / scoring
 *
 * Catchers branch on subclass (`instanceof`) rather than message text.
 * `details` is frozen; `cause` is the native ES2022 Error.cause.
 *
 * ESM only.
 */

'use strict';

/**
 * Base class for every FlowAI domain error.
 *
 * @param {string} message
 * @param {object} [opts]
 * @param {string} [opts.code]    — short stable code (default: 'FLOWAI_ERROR')
 * @param {object} [opts.details] — structured fields (frozen on the instance)
 * @param {Error}  [opts.cause]   — wrapped lower-level error (ES2022 cause)
 */
export class FlowAiError extends Error {
  constructor(message, { code, details, cause } = {}) {
    super(message, cause !== undefined ? { cause } : undefined);
    // Use new.target so subclasses get their own class name automatically.
    this.name = new.target?.name ?? 'FlowAiError';
    this.code = typeof code === 'string' && code.length > 0 ? code : 'FLOWAI_ERROR';
    this.details = Object.freeze({ ...(details ?? {}) });
  }

  /**
   * Serialize-safe representation for logger / audit emission.
   *
   * @param {object} [opts]
   * @param {boolean} [opts.stack=false] — include `.stack` (default: omit)
   * @returns {object}
   */
  toJSON({ stack = false } = {}) {
    const out = {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
    if (this.cause !== undefined) {
      out.cause = this.cause instanceof FlowAiError
        ? this.cause.toJSON({ stack })
        : { name: this.cause?.name ?? 'Error', message: String(this.cause?.message ?? this.cause) };
    }
    if (stack && this.stack) out.stack = this.stack;
    return out;
  }
}

// ─────────────────────────────────────────────────────────────────
// Subclasses — each gets its own class name + default code prefix
// ─────────────────────────────────────────────────────────────────

function _withDefaultCode(opts, prefix) {
  if (opts && typeof opts.code === 'string' && opts.code.length > 0) return opts;
  return { ...(opts ?? {}), code: `${prefix}_UNSPECIFIED` };
}

export class ConfigError extends FlowAiError {
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'CFG')); }
}

export class ValidationError extends FlowAiError {
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'VAL')); }
}

export class PayloadError extends ValidationError {
  // PayloadError is a specialization of ValidationError per spec § class tree.
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'MSG')); }
}

export class CharterError extends ValidationError {
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'CHARTER')); }
}

export class AuthorityError extends FlowAiError {
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'AUTH')); }
}

export class DependencyError extends FlowAiError {
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'DEP')); }
}

export class NotImplementedError extends FlowAiError {
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'NIY')); }
}

export class ChainError extends FlowAiError {
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'CHAIN')); }
}

export class EvaluatorError extends FlowAiError {
  constructor(message, opts) { super(message, _withDefaultCode(opts, 'EVAL')); }
}
