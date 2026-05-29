// Pure validator for the lead-capture payload.
//
// Returns { ok: true } or { ok: false, errors: [string,...] }. Never throws.
//
// Hard limits:
//   email              required, RFC-loose pattern, ≤ 254 chars (RFC 5321)
//   product_id         required, slug-safe ([a-zA-Z0-9_-]+), ≤ 64 chars
//   source_page        optional, string, ≤ 2048 chars
//   org_id             optional, slug-safe, ≤ 64 chars
//   metadata           optional, plain object (NOT array, NOT string),
//                      shallow string leaves ≤ 4000 chars
//   metadata.message   no <script tags / javascript: / inline event handlers
//   metadata.name      ≤ 200 chars
//   metadata.company   ≤ 200 chars
//
// The XSS guard on metadata.message is intentionally minimal — defence in
// depth, not a substitute for output-side escaping. CRMs and email tools
// re-render this content in unpredictable contexts, so we reject the most
// obvious vectors at ingest.

export const LIMITS = Object.freeze({
  EMAIL_MAX:         254,
  PRODUCT_ID_MAX:    64,
  ORG_ID_MAX:        64,
  SOURCE_PAGE_MAX:   2048,
  METADATA_LEAF_MAX: 4000,
  NAME_MAX:          200,
  COMPANY_MAX:       200,
});

const EMAIL_RE       = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SLUG_RE        = /^[a-zA-Z0-9_-]+$/;
const SCRIPT_INJ_RE  = /<script\b|javascript:|on\w+\s*=/i;

export function validateLead(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['payload required'] };
  }

  const errors = [];

  // ── email ──────────────────────────────────────────────────────────────
  if (typeof payload.email !== 'string' || payload.email.length === 0) {
    errors.push('email required');
  } else if (payload.email.length > LIMITS.EMAIL_MAX) {
    errors.push('email too long');
  } else if (!EMAIL_RE.test(payload.email)) {
    errors.push('email invalid');
  }

  // ── product_id ─────────────────────────────────────────────────────────
  if (typeof payload.product_id !== 'string' || payload.product_id.length === 0) {
    errors.push('product_id required');
  } else if (payload.product_id.length > LIMITS.PRODUCT_ID_MAX) {
    errors.push('product_id too long');
  } else if (!SLUG_RE.test(payload.product_id)) {
    errors.push('product_id must be slug-safe');
  }

  // ── source_page (optional) ─────────────────────────────────────────────
  if (payload.source_page !== undefined && payload.source_page !== null) {
    if (typeof payload.source_page !== 'string') {
      errors.push('source_page must be string');
    } else if (payload.source_page.length > LIMITS.SOURCE_PAGE_MAX) {
      errors.push('source_page too long');
    }
  }

  // ── org_id (optional) ──────────────────────────────────────────────────
  if (payload.org_id !== undefined && payload.org_id !== null) {
    if (typeof payload.org_id !== 'string') {
      errors.push('org_id must be string');
    } else if (payload.org_id.length > LIMITS.ORG_ID_MAX) {
      errors.push('org_id too long');
    } else if (!SLUG_RE.test(payload.org_id)) {
      errors.push('org_id must be slug-safe');
    }
  }

  // ── metadata (optional) ────────────────────────────────────────────────
  if (payload.metadata !== undefined && payload.metadata !== null) {
    if (typeof payload.metadata !== 'object' || Array.isArray(payload.metadata)) {
      errors.push('metadata must be object');
    } else {
      // Per-leaf length cap (string leaves only — non-string values are passed through)
      for (const [k, v] of Object.entries(payload.metadata)) {
        if (typeof v === 'string' && v.length > LIMITS.METADATA_LEAF_MAX) {
          errors.push(`metadata.${k} too long`);
        }
      }
      if (typeof payload.metadata.name === 'string' && payload.metadata.name.length > LIMITS.NAME_MAX) {
        errors.push('metadata.name too long');
      }
      if (typeof payload.metadata.company === 'string' && payload.metadata.company.length > LIMITS.COMPANY_MAX) {
        errors.push('metadata.company too long');
      }
      if (typeof payload.metadata.message === 'string' && SCRIPT_INJ_RE.test(payload.metadata.message)) {
        errors.push('metadata.message contains disallowed content');
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export const SCHEMA_VERSION = 'v1';
