/**
 * Products Registry — client-side helper for /api/products.
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/products/registry.js  (W5 territory)
 * ESM only.
 *
 * Single canonical access path used by PortfolioDashboard (UX-2). Future
 * surfaces (MainDashboard, ProductRegistryPanel migrations) import from
 * this module so consumers stop dual-writing or hardcoding products.
 *
 * Discriminated-union return shape (per peer review R6):
 *   { ok: true,  items: Product[] }                  // listProducts
 *   { ok: true,  item:  Product   }                  // createProduct
 *   { ok: false, error: string, status?: number }    // either, on failure
 *
 * Why discriminated union: distinguishing "load succeeded with zero items"
 * from "load failed" matters at the UI boundary. The empty-state UI must
 * only render on `{ok: true, items: []}` — never on `{ok: false}`. A
 * silently-failed network call must NOT masquerade as "no products
 * registered".
 *
 * Score normalization (per peer S7): server-side `last_audit_score` is a
 * raw numeric in the `products` table (no fixed scale). UI shows 0-10.
 * `normalizeScore` is the canonical rescale point — single source of truth
 * for the read boundary.
 *
 * Slug derivation (per peer R4): `deriveSlug` is the canonical rule.
 * Identical implementation must be used everywhere a slug is needed
 * client-side until the schema gets a generated `slug` column.
 *
 * Pagination defaults (per peer R3): default `limit = 100` for dashboard
 * loads. Callers that need more pass an explicit `limit`.
 */

const DEFAULT_LIMIT = 100;

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} org_id
 * @property {string} name
 * @property {string} url
 * @property {string} description
 * @property {string} type
 * @property {string} status
 * @property {string[]} tags
 * @property {string|null} last_audit_at
 * @property {number|null} last_audit_score   raw, server-side scale
 * @property {number} cost_to_date_usd
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {{ ok: true, items: Product[], total?: number }
 *         | { ok: false, error: string, status?: number }} ListResult
 *
 * @typedef {{ ok: true, item: Product }
 *         | { ok: false, error: string, status?: number }} CreateResult
 */

/**
 * GET /api/products with org_id-scoped filtering.
 * @param {{
 *   status?: string,
 *   q?: string,
 *   sort?: string,
 *   limit?: number,
 *   offset?: number,
 *   fetcher?: typeof fetch,
 * }} [opts]
 * @returns {Promise<ListResult>}
 */
export async function listProducts(opts = {}) {
  const fetcher = opts.fetcher ?? globalFetch();
  if (!fetcher) {
    return { ok: false, error: 'no fetch implementation available' };
  }
  const params = new URLSearchParams();
  if (opts.status) params.set('status', String(opts.status));
  if (opts.q) params.set('q', String(opts.q));
  if (opts.sort) params.set('sort', String(opts.sort));
  params.set('limit', String(opts.limit ?? DEFAULT_LIMIT));
  // Use != null so explicit offset=0 is forwarded (truthy check would skip
  // it); per impl-diff peer review (2026-05-09 nice-to-have #1).
  if (opts.offset != null) params.set('offset', String(opts.offset));

  let res;
  try {
    res = await fetcher(`/api/products?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    return { ok: false, error: networkErrorMessage(e) };
  }
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}`, status: res.status };
  }
  const body = await safeJson(res);
  if (!body || !Array.isArray(body.items)) {
    return { ok: false, error: 'malformed response (missing items[])', status: res.status };
  }
  return {
    ok: true,
    items: body.items,
    total: typeof body.total === 'number' ? body.total : body.items.length,
  };
}

/**
 * POST /api/products to create one product. The server resolves `org_id`
 * from the auth context; callers MUST NOT send `org` or `org_id` in the
 * body or the server will silently drop / overwrite them. Pass only the
 * fields the schema accepts.
 *
 * @param {{
 *   name: string,
 *   url?: string,
 *   description?: string,
 *   type?: string,
 *   status?: string,
 *   tags?: string[],
 * }} input
 * @param {{ fetcher?: typeof fetch }} [opts]
 * @returns {Promise<CreateResult>}
 */
export async function createProduct(input, opts = {}) {
  if (!input || typeof input.name !== 'string' || input.name.trim().length === 0) {
    return { ok: false, error: 'name required' };
  }
  const fetcher = opts.fetcher ?? globalFetch();
  if (!fetcher) {
    return { ok: false, error: 'no fetch implementation available' };
  }
  const body = {
    name: input.name.trim(),
    url: typeof input.url === 'string' ? input.url.trim() : '',
    description: typeof input.description === 'string' ? input.description : '',
    type: typeof input.type === 'string' ? input.type : 'web',
    status: typeof input.status === 'string' ? input.status : 'draft',
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
  };
  let res;
  try {
    res = await fetcher('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: networkErrorMessage(e) };
  }
  if (!res.ok) {
    const errBody = await safeJson(res);
    const msg = errBody?.error || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status };
  }
  const created = await safeJson(res);
  if (!created || !created.item || typeof created.item.id !== 'string') {
    return { ok: false, error: 'malformed response (missing item.id)', status: res.status };
  }
  return { ok: true, item: created.item };
}

/**
 * Rescale a raw `last_audit_score` to the 0–10 UI scale. Returns null when
 * the input is null / undefined / non-finite.
 *
 * Contract (locked at the read boundary):
 *   - input >= 100 → 10
 *   - input <= 0   → 0
 *   - else         → round(input / 10)
 *
 * @param {number|null|undefined} raw
 * @returns {number|null}
 */
export function normalizeScore(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  if (raw >= 100) return 10;
  if (raw <= 0) return 0;
  return Math.round(raw / 10);
}

/**
 * Canonical client-side slug derivation. Must be byte-identical wherever
 * a slug is needed. When the schema gets a generated `slug` column,
 * generate using the same rule.
 *
 * @param {string} name
 * @returns {string}
 */
export function deriveSlug(name) {
  if (typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Internals ────────────────────────────────────────────────────────────

function globalFetch() {
  if (typeof fetch === 'function') return fetch;
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  return null;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function networkErrorMessage(e) {
  if (!e) return 'network error';
  if (typeof e === 'string') return e;
  if (e.name === 'AbortError') return 'request aborted';
  return e.message || 'network error';
}
