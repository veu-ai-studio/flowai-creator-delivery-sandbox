// Typed contracts for every agent payload. These are the I/O shapes the
// orchestrator enforces; every registered agent must adhere to them.
//
// Tomorrow these become Zod schemas with runtime validation. Today they are
// lightweight checker functions returning { ok, error } so the orchestrator
// can refuse malformed payloads without adding zod as a dep.

// ─── Generic error envelope ───────────────────────────────────────────────
// All agent failures return this shape.
//
//   { ok:false, agent, code, message, retriable, details? }
//
// `code` taxonomy:
//   AGENT_DISABLED    — agent is registered but env-vars missing
//   INVALID_INPUT     — caller-provided payload didn't match schema
//   UPSTREAM_ERROR    — provider returned non-2xx
//   TIMEOUT           — request exceeded retry budget
//   RATE_LIMITED      — provider 429
//   UNKNOWN           — fall-through

export const ErrorCodes = Object.freeze({
  AGENT_DISABLED: 'AGENT_DISABLED',
  INVALID_INPUT: 'INVALID_INPUT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  UNKNOWN: 'UNKNOWN',
});

export function envelope({ agent, code = ErrorCodes.UNKNOWN, message, retriable = false, details }) {
  return { ok: false, agent, code, message: message || code, retriable: !!retriable, details: details || null };
}

// ─── Validators ───────────────────────────────────────────────────────────

function isString(v) { return typeof v === 'string' && v.length > 0; }
function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function check(name, ok, hint) {
  return ok ? null : { ok: false, error: `${name} ${hint || 'invalid'}` };
}

// User context passed into every agent (so agent fn doesn't need to re-read req).
export function validateContext(ctx) {
  if (!isObject(ctx)) return check('ctx', false, 'must be object');
  // orgId/productId can be null; userId can be null. Just shape-check.
  return null;
}

// Claude (text generation) input.
export function validateClaudeInput(input) {
  const r = validateContext(input?.ctx); if (r) return r;
  if (!isString(input?.prompt)) return check('input.prompt', false);
  return null;
}

// Browserless / crawler input.
export function validateCrawlerInput(input) {
  const r = validateContext(input?.ctx); if (r) return r;
  if (!isString(input?.url)) return check('input.url', false);
  return null;
}

// Embeddings input.
export function validateEmbeddingsInput(input) {
  const r = validateContext(input?.ctx); if (r) return r;
  if (!isString(input?.text) && !Array.isArray(input?.texts)) {
    return check('input.text or input.texts', false, 'one is required');
  }
  return null;
}

// Email input.
export function validateEmailInput(input) {
  const r = validateContext(input?.ctx); if (r) return r;
  if (!isString(input?.to) && !(Array.isArray(input?.to) && input.to.every(isString))) {
    return check('input.to', false);
  }
  if (!isString(input?.subject)) return check('input.subject', false);
  return null;
}

// Generic DB write input.
export function validateDbWriteInput(input) {
  const r = validateContext(input?.ctx); if (r) return r;
  if (!isString(input?.table)) return check('input.table', false);
  if (!isObject(input?.row)) return check('input.row', false);
  return null;
}

// Inngest event dispatch.
export function validateInngestInput(input) {
  const r = validateContext(input?.ctx); if (r) return r;
  if (!isString(input?.eventName)) return check('input.eventName', false);
  return null;
}

// Auth lookup.
export function validateAuthInput(input) {
  if (!isObject(input?.req)) return check('input.req', false);
  return null;
}

// Logger payload.
export function validateLoggerInput(input) {
  if (!isString(input?.level) && !isString(input?.msg)) return check('input.level + input.msg', false);
  return null;
}

// ─── Output shape ─────────────────────────────────────────────────────────
// Every agent.run() resolves to either a success envelope:
//   { ok: true, agent, output: <agent-specific>, meta? }
// or the error envelope above.

export function successEnvelope({ agent, output, meta }) {
  return { ok: true, agent, output, meta: meta || null };
}
