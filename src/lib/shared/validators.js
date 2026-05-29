/**
 * Shared validation utilities — W5 job 09.
 * Spec: specs/w5-design/09-validation-utilities.md
 * Tests: tests/shared-validators.test.js
 *
 * Surface (all 10 assert* helpers + 2 regex constants):
 *   assertNonEmptyString  assertNonEmptyArray  assertObject
 *   requireFields         assertSlugSafe       assertSubkeySafe
 *   assertFiniteNumber    assertNumberInRange  assertIntegerInRange
 *   assertEnumMember      SLUG_RE              SUBKEY_RE
 *
 * Conventions (per spec § Conventions):
 *   - Each assert* returns the value on success so callers can do
 *     `const id = assertSlugSafe(input, 'providerId');`.
 *   - Each assert* throws on failure. The error carries `.code`
 *     (stable identifier, e.g. 'VAL_EMPTY_STRING') and `.details`
 *     ({ field, actual, ... extra }).
 *   - `field` defaults to `'value'` for the message; pass the
 *     dotted path you want surfaced ('envelope.from.agentId').
 *
 * Conventions (no coercion):
 *   - `'1'` is NOT a number. `1.5` is NOT an integer. `null` is
 *     NOT an object (despite typeof). `[]` is NOT a plain object.
 *
 * ESM only. Node >= 18.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Regex constants (per spec § Surface)
// ─────────────────────────────────────────────────────────────────

/** Slug-safe identifier: ASCII alphanumerics + hyphen, no underscore. */
export const SLUG_RE = /^[a-zA-Z0-9-]+$/;

/** Subkey-safe identifier: SLUG_RE + underscore. */
export const SUBKEY_RE = /^[a-zA-Z0-9_-]+$/;

// ─────────────────────────────────────────────────────────────────
// Error helper
// ─────────────────────────────────────────────────────────────────

function makeError(code, message, details) {
  const e = new Error(message);
  e.code = code;
  e.details = Object.freeze({ ...details });
  return e;
}

function labelOf(field) {
  return typeof field === 'string' && field.length > 0 ? field : 'value';
}

// ─────────────────────────────────────────────────────────────────
// String assertions
// ─────────────────────────────────────────────────────────────────

/**
 * Assert that `value` is a non-empty string. Whitespace-only strings
 * are allowed (matches existing call-site semantics; callers that
 * want trimming must do it explicitly per spec edge case #1).
 */
export function assertNonEmptyString(value, field) {
  const label = labelOf(field);
  if (typeof value !== 'string') {
    throw makeError(
      'VAL_NOT_STRING',
      `${label}: expected non-empty string, got ${typeof value}`,
      { field: label, actual: value },
    );
  }
  if (value.length === 0) {
    throw makeError(
      'VAL_EMPTY_STRING',
      `${label}: must be non-empty string`,
      { field: label, actual: value },
    );
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────
// Array / object assertions
// ─────────────────────────────────────────────────────────────────

/** Assert that `value` is an array with at least one element. */
export function assertNonEmptyArray(value, field) {
  const label = labelOf(field);
  if (!Array.isArray(value)) {
    throw makeError(
      'VAL_NOT_ARRAY',
      `${label}: expected non-empty array, got ${typeof value}`,
      { field: label, actual: value },
    );
  }
  if (value.length === 0) {
    throw makeError(
      'VAL_EMPTY_ARRAY',
      `${label}: must be non-empty array`,
      { field: label, actual: value },
    );
  }
  return value;
}

/**
 * Assert that `value` is a plain object (not null, not an array,
 * not a primitive). Matches spec edge cases #5 and #6.
 */
export function assertObject(value, field) {
  const label = labelOf(field);
  if (value === null) {
    throw makeError('VAL_NOT_OBJECT', `${label}: expected object, got null`, {
      field: label, actual: value,
    });
  }
  if (Array.isArray(value)) {
    throw makeError(
      'VAL_NOT_OBJECT',
      `${label}: expected plain object, got array`,
      { field: label, actual: value },
    );
  }
  if (typeof value !== 'object') {
    throw makeError(
      'VAL_NOT_OBJECT',
      `${label}: expected object, got ${typeof value}`,
      { field: label, actual: value },
    );
  }
  return value;
}

/**
 * Assert that `obj` contains every named field with a non-null,
 * defined value. Matches the existing `MessageSchema._required`
 * helper (spec edge case #7: null counts as missing).
 *
 * @param {object}   obj      — object under inspection
 * @param {string[]} fields   — required field names
 * @param {string}   [ctx]    — optional namespace prefix for the
 *                              error message ('10.metric.v1', etc.)
 */
export function requireFields(obj, fields, ctx) {
  const prefix = typeof ctx === 'string' && ctx.length > 0 ? `${ctx}: ` : '';
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw makeError(
      'VAL_NOT_OBJECT',
      `${prefix}requireFields: target must be a plain object`,
      { field: ctx ?? 'value', actual: obj },
    );
  }
  if (!Array.isArray(fields)) {
    throw makeError(
      'VAL_NOT_ARRAY',
      `${prefix}requireFields: fields must be an array of strings`,
      { field: 'fields', actual: fields },
    );
  }
  for (const f of fields) {
    if (typeof f !== 'string' || f.length === 0) {
      throw makeError(
        'VAL_BAD_FIELD',
        `${prefix}requireFields: every field name must be a non-empty string`,
        { actual: f },
      );
    }
    if (!Object.prototype.hasOwnProperty.call(obj, f) || obj[f] === undefined || obj[f] === null) {
      throw makeError(
        'VAL_MISSING_FIELD',
        `${prefix}missing required field "${f}"`,
        { field: f, actual: obj[f] },
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Slug / subkey assertions
// ─────────────────────────────────────────────────────────────────

export function assertSlugSafe(value, field) {
  const label = labelOf(field);
  if (typeof value !== 'string') {
    throw makeError(
      'VAL_NOT_STRING',
      `${label}: expected slug-safe string, got ${typeof value}`,
      { field: label, actual: value },
    );
  }
  if (value.length === 0) {
    throw makeError(
      'VAL_EMPTY_STRING',
      `${label}: slug-safe string must be non-empty`,
      { field: label, actual: value },
    );
  }
  if (!SLUG_RE.test(value)) {
    throw makeError(
      'VAL_SLUG_UNSAFE',
      `${label}: must match ${SLUG_RE} (ASCII alphanumerics + hyphen only; no underscore, no unicode)`,
      { field: label, actual: value, pattern: SLUG_RE.source },
    );
  }
  return value;
}

export function assertSubkeySafe(value, field) {
  const label = labelOf(field);
  if (typeof value !== 'string') {
    throw makeError(
      'VAL_NOT_STRING',
      `${label}: expected subkey-safe string, got ${typeof value}`,
      { field: label, actual: value },
    );
  }
  if (value.length === 0) {
    throw makeError(
      'VAL_EMPTY_STRING',
      `${label}: subkey-safe string must be non-empty`,
      { field: label, actual: value },
    );
  }
  if (!SUBKEY_RE.test(value)) {
    throw makeError(
      'VAL_SUBKEY_UNSAFE',
      `${label}: must match ${SUBKEY_RE} (ASCII alphanumerics, hyphen, underscore; no unicode)`,
      { field: label, actual: value, pattern: SUBKEY_RE.source },
    );
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────
// Number assertions (no coercion)
// ─────────────────────────────────────────────────────────────────

export function assertFiniteNumber(value, field) {
  const label = labelOf(field);
  if (typeof value !== 'number') {
    throw makeError(
      'VAL_NOT_NUMBER',
      `${label}: expected finite number, got ${typeof value}`,
      { field: label, actual: value },
    );
  }
  if (!Number.isFinite(value)) {
    throw makeError(
      'VAL_NOT_FINITE',
      `${label}: must be a finite number (got ${value})`,
      { field: label, actual: value },
    );
  }
  return value;
}

/** Inclusive on both ends per spec edge case #14. */
export function assertNumberInRange(value, min, max, field) {
  const label = labelOf(field);
  assertFiniteNumber(value, label);
  if (typeof min !== 'number' || !Number.isFinite(min)) {
    throw makeError('VAL_BAD_BOUND', `${label}: min must be finite number`, { field: label, actual: min });
  }
  if (typeof max !== 'number' || !Number.isFinite(max)) {
    throw makeError('VAL_BAD_BOUND', `${label}: max must be finite number`, { field: label, actual: max });
  }
  if (value < min || value > max) {
    throw makeError(
      'VAL_OUT_OF_RANGE',
      `${label}: must be in [${min}, ${max}] (got ${value})`,
      { field: label, actual: value, min, max },
    );
  }
  return value;
}

/** Inclusive on both ends; rejects non-integers per spec edge case #15. */
export function assertIntegerInRange(value, min, max, field) {
  const label = labelOf(field);
  assertNumberInRange(value, min, max, label);
  if (!Number.isInteger(value)) {
    throw makeError(
      'VAL_NOT_INTEGER',
      `${label}: must be an integer (got ${value})`,
      { field: label, actual: value },
    );
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────
// Enum membership
// ─────────────────────────────────────────────────────────────────

export function assertEnumMember(value, allowed, field) {
  const label = labelOf(field);
  if (!Array.isArray(allowed) || allowed.length === 0) {
    throw makeError(
      'VAL_BAD_ENUM',
      `${label}: assertEnumMember requires a non-empty allowed array`,
      { field: label, actual: allowed },
    );
  }
  if (!allowed.includes(value)) {
    throw makeError(
      'VAL_NOT_ENUM_MEMBER',
      `${label}: must be one of [${allowed.join(', ')}] (got ${JSON.stringify(value)})`,
      { field: label, actual: value, allowed: [...allowed] },
    );
  }
  return value;
}
