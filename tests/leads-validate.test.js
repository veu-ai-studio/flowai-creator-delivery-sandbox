// Tests for src/lib/leads/validate.js — pure validator.

import { describe, it, expect } from 'vitest';
import { validateLead, LIMITS, SCHEMA_VERSION } from '../src/lib/leads/validate.js';

describe('SCHEMA_VERSION + LIMITS', () => {
  it('exposes a schema version string', () => {
    expect(SCHEMA_VERSION).toBe('v1');
  });

  it('LIMITS is frozen and has the expected keys', () => {
    expect(Object.isFrozen(LIMITS)).toBe(true);
    expect(LIMITS).toMatchObject({
      EMAIL_MAX:         254,
      PRODUCT_ID_MAX:    64,
      ORG_ID_MAX:        64,
      SOURCE_PAGE_MAX:   2048,
      METADATA_LEAF_MAX: 4000,
      NAME_MAX:          200,
      COMPANY_MAX:       200,
    });
  });
});

describe('validateLead — happy path', () => {
  it('accepts a minimal valid payload', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'saige' })).toEqual({ ok: true });
  });

  it('accepts a full valid payload', () => {
    expect(validateLead({
      email: 'a@b.co',
      product_id: 'saige',
      source_page: '/',
      org_id: 'veu-ai-studio',
      metadata: { utm_source: 'g', message: 'hello there', name: 'A', company: 'X' },
    })).toEqual({ ok: true });
  });

  it('accepts dashes and underscores in slug fields', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'saige_v1-test' }).ok).toBe(true);
    expect(validateLead({ email: 'a@b.co', product_id: 'x', org_id: 'veu-ai-studio_2' }).ok).toBe(true);
  });
});

describe('validateLead — payload shape', () => {
  it('rejects null and undefined', () => {
    expect(validateLead(null).ok).toBe(false);
    expect(validateLead(undefined).ok).toBe(false);
  });

  it('rejects array payload', () => {
    expect(validateLead([]).ok).toBe(false);
  });

  it('rejects string payload', () => {
    expect(validateLead('email@x.com').ok).toBe(false);
  });

  it('rejects number payload', () => {
    expect(validateLead(42).ok).toBe(false);
  });

  it('returns the payload-required error verbatim for empty objects', () => {
    // Empty object → fails on missing fields, NOT on payload-required
    const r = validateLead({});
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('email required');
    expect(r.errors).toContain('product_id required');
  });
});

describe('validateLead — email', () => {
  it('rejects missing email', () => {
    const r = validateLead({ product_id: 'saige' });
    expect(r.errors).toContain('email required');
  });

  it('rejects empty email', () => {
    const r = validateLead({ email: '', product_id: 'saige' });
    expect(r.errors).toContain('email required');
  });

  it('rejects non-string email', () => {
    const r = validateLead({ email: 42, product_id: 'saige' });
    expect(r.errors).toContain('email required');
  });

  it('rejects invalid email format', () => {
    expect(validateLead({ email: 'no-at-sign', product_id: 'saige' }).errors).toContain('email invalid');
    expect(validateLead({ email: 'a@b', product_id: 'saige' }).errors).toContain('email invalid');
    expect(validateLead({ email: 'a @b.co', product_id: 'saige' }).errors).toContain('email invalid');
  });

  it('rejects too-long email (> 254)', () => {
    const long = 'a'.repeat(250) + '@b.co'; // 256 chars
    const r = validateLead({ email: long, product_id: 'saige' });
    expect(r.errors).toContain('email too long');
  });
});

describe('validateLead — product_id', () => {
  it('rejects missing product_id', () => {
    expect(validateLead({ email: 'a@b.co' }).errors).toContain('product_id required');
  });

  it('rejects non-slug product_id', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'with space' }).errors).toContain('product_id must be slug-safe');
    expect(validateLead({ email: 'a@b.co', product_id: 'with/slash' }).errors).toContain('product_id must be slug-safe');
    expect(validateLead({ email: 'a@b.co', product_id: 'with.dot' }).errors).toContain('product_id must be slug-safe');
  });

  it('rejects too-long product_id (> 64)', () => {
    const r = validateLead({ email: 'a@b.co', product_id: 'x'.repeat(LIMITS.PRODUCT_ID_MAX + 1) });
    expect(r.errors).toContain('product_id too long');
  });
});

describe('validateLead — source_page', () => {
  it('accepts when omitted', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'x' }).ok).toBe(true);
  });

  it('accepts null', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'x', source_page: null }).ok).toBe(true);
  });

  it('rejects non-string', () => {
    const r = validateLead({ email: 'a@b.co', product_id: 'x', source_page: 42 });
    expect(r.errors).toContain('source_page must be string');
  });

  it('rejects too-long source_page', () => {
    const r = validateLead({ email: 'a@b.co', product_id: 'x', source_page: 'y'.repeat(LIMITS.SOURCE_PAGE_MAX + 1) });
    expect(r.errors).toContain('source_page too long');
  });
});

describe('validateLead — org_id', () => {
  it('accepts when omitted', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'x' }).ok).toBe(true);
  });

  it('rejects non-slug org_id', () => {
    const r = validateLead({ email: 'a@b.co', product_id: 'x', org_id: 'has space' });
    expect(r.errors).toContain('org_id must be slug-safe');
  });

  it('rejects too-long org_id', () => {
    const r = validateLead({ email: 'a@b.co', product_id: 'x', org_id: 'x'.repeat(LIMITS.ORG_ID_MAX + 1) });
    expect(r.errors).toContain('org_id too long');
  });
});

describe('validateLead — metadata', () => {
  it('rejects non-object metadata (string)', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'x', metadata: 'string' }).errors).toContain('metadata must be object');
  });

  it('rejects array metadata', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'x', metadata: [] }).errors).toContain('metadata must be object');
  });

  it('accepts null metadata (treats as absent)', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'x', metadata: null }).ok).toBe(true);
  });

  it('accepts empty object metadata', () => {
    expect(validateLead({ email: 'a@b.co', product_id: 'x', metadata: {} }).ok).toBe(true);
  });

  it('rejects too-long arbitrary metadata leaf', () => {
    const r = validateLead({
      email: 'a@b.co',
      product_id: 'x',
      metadata: { campaign: 'a'.repeat(LIMITS.METADATA_LEAF_MAX + 1) },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/metadata\.campaign too long/);
  });

  it('rejects too-long metadata.name', () => {
    const r = validateLead({
      email: 'a@b.co', product_id: 'x',
      metadata: { name: 'x'.repeat(LIMITS.NAME_MAX + 1) },
    });
    expect(r.errors).toContain('metadata.name too long');
  });

  it('rejects too-long metadata.company', () => {
    const r = validateLead({
      email: 'a@b.co', product_id: 'x',
      metadata: { company: 'x'.repeat(LIMITS.COMPANY_MAX + 1) },
    });
    expect(r.errors).toContain('metadata.company too long');
  });

  it('passes non-string metadata values through (numbers, booleans)', () => {
    expect(validateLead({
      email: 'a@b.co', product_id: 'x',
      metadata: { tier: 2, demo_requested: true },
    }).ok).toBe(true);
  });
});

describe('validateLead — XSS guard on metadata.message', () => {
  const base = { email: 'a@b.co', product_id: 'saige' };

  it('rejects <script tag', () => {
    expect(validateLead({ ...base, metadata: { message: '<script>alert(1)</script>' } }).errors)
      .toContain('metadata.message contains disallowed content');
  });

  it('rejects <SCRIPT (case-insensitive)', () => {
    expect(validateLead({ ...base, metadata: { message: '<SCRIPT src=x.js></SCRIPT>' } }).ok).toBe(false);
  });

  it('rejects javascript: URL', () => {
    expect(validateLead({ ...base, metadata: { message: 'click javascript:alert(1)' } }).ok).toBe(false);
  });

  it('rejects on* event-handler attribute', () => {
    expect(validateLead({ ...base, metadata: { message: 'hi onclick=alert(1)' } }).ok).toBe(false);
    expect(validateLead({ ...base, metadata: { message: 'hi onerror = alert(1)' } }).ok).toBe(false);
  });

  it('accepts plain text', () => {
    expect(validateLead({ ...base, metadata: { message: 'Please call me on Tuesday afternoon. Regards.' } }).ok).toBe(true);
  });

  it('accepts text containing the literal word "script" in a non-HTML context', () => {
    expect(validateLead({ ...base, metadata: { message: 'I read the script of the play.' } }).ok).toBe(true);
  });
});

describe('validateLead — multi-error aggregation', () => {
  it('returns ALL errors at once, not just the first', () => {
    const r = validateLead({ email: 'bad', product_id: 'has space' });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('email invalid');
    expect(r.errors).toContain('product_id must be slug-safe');
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});
