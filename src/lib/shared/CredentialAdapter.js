/**
 * CredentialAdapter — Doppler-backed credential interface
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/shared/CredentialAdapter.js  (W5 territory)
 * Status:      Authored by W2, ratified by W0, placed by W5.
 * Hotfix A:    Removed process.env reference. Browser-safe by construction.
 *
 * Path resolution per W1 Doppler vault architecture:
 *   Static keys (embedded agents):   <productScope>/<environment>/<key>
 *   Static keys (FlowAI-only):       flowai/<environment>/<key>
 *   Provider-scoped:                 flowai/<environment>/PROVIDERS_<providerId>_<subkey>
 *   Customer-scoped:                 flowai/<environment>/CUSTOMERS_<providerId>_<customerId>_<subkey>
 *   Stripe Connect:                  flowai/<environment>/STRIPE_CONNECT_<providerId>
 *
 * provider_id and customer_id MUST be slug-safe (no underscores).
 * Subkeys may contain underscores (API_KEY, WEBHOOK_SECRET, etc.).
 *
 * BROWSER SAFETY (Hotfix A)
 *   This file is imported by browser-side ESM in Base44. There is no Node
 *   `process` global. The `envFallback` parameter still exists for callers
 *   that explicitly inject a fallback object (server-side use, test harnesses,
 *   future Node-side use). The default is an empty object — never
 *   `process.env`.
 * ---------------------------------------------------------------------------
 */

const FLOWAI_PROJECT = 'flowai';

const ID_SLUG_RE = /^[a-zA-Z0-9-]+$/;
const SUBKEY_RE  = /^[a-zA-Z0-9_-]+$/;

// Environment whitelist.
// Canonical production name is `prd` — matches the actual Doppler workspace
// config name. `prod` is retained as a backwards-compat alias so existing
// callers (registry seed data, tests, server-side env injection) keep
// working through the migration window. See docs/operations/credential-adapter-naming.md.
const VALID_FLOWAI_ENVS  = new Set(['prd', 'prod', 'staging']);
const VALID_PRODUCT_ENVS = new Set(['prd', 'prod', 'staging', 'demo', 'live-demo', 'sales-demo']);
const VALID_PRODUCT_PROJECTS = new Set([
  'flowai', 'saige', 'reltwin', 'reachsms', 'pressai', 'mypreglife',
]);

export class CredentialAdapter {
  constructor(opts = {}) {
    if (!opts.project) throw new Error('CredentialAdapter: project required');
    if (!opts.environment) throw new Error('CredentialAdapter: environment required');
    if (!VALID_PRODUCT_PROJECTS.has(opts.project)) {
      throw new Error(`CredentialAdapter: unknown project "${opts.project}"`);
    }
    const validEnvs = opts.project === FLOWAI_PROJECT ? VALID_FLOWAI_ENVS : VALID_PRODUCT_ENVS;
    if (!validEnvs.has(opts.environment)) {
      throw new Error(
        `CredentialAdapter: environment "${opts.environment}" invalid for project "${opts.project}". ` +
        `Valid: [${[...validEnvs].join(', ')}]`
      );
    }

    this.project = opts.project;
    this.environment = opts.environment;
    this.dopplerClient = opts.dopplerClient ?? null;
    this.expectedKeys = new Set(opts.expectedKeys ?? []);
    // Hotfix A: default to empty object. Callers may inject an explicit fallback
    // (e.g. server-side env vars, test stubs) but the default no longer
    // references the global `process` — that does not exist in browser ESM.
    this.envFallback = opts.envFallback ?? {};
    this.clock = opts.clock ?? { now: () => Date.now() };
    this.logger = opts.logger ?? null;
  }

  async get(key) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('CredentialAdapter.get: key must be non-empty string');
    }
    const path = { project: this.project, config: this.environment, secret: key };
    return this._resolve(path);
  }

  async getProviderSecret(providerId, subkey) {
    this._assertId('providerId', providerId);
    this._assertSubkey(subkey);
    const path = {
      project: FLOWAI_PROJECT,
      config: this.environment,
      secret: `PROVIDERS_${providerId}_${subkey}`,
    };
    return this._resolve(path);
  }

  async getCustomerSecret(providerId, customerId, subkey) {
    this._assertId('providerId', providerId);
    this._assertId('customerId', customerId);
    this._assertSubkey(subkey);
    const path = {
      project: FLOWAI_PROJECT,
      config: this.environment,
      secret: `CUSTOMERS_${providerId}_${customerId}_${subkey}`,
    };
    return this._resolve(path);
  }

  async getStripeConnect(providerId) {
    this._assertId('providerId', providerId);
    const path = {
      project: FLOWAI_PROJECT,
      config: this.environment,
      secret: `STRIPE_CONNECT_${providerId}`,
    };
    return this._resolve(path);
  }

  async probe(key) {
    const r = await this.get(key);
    return r.status;
  }

  async getAll(keys) {
    if (!Array.isArray(keys)) throw new Error('getAll: keys must be array');
    const out = {};
    for (const k of keys) out[k] = await this.get(k);
    return out;
  }

  declareExpected(keys) {
    for (const k of keys ?? []) this.expectedKeys.add(k);
  }

  _assertId(label, value) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`CredentialAdapter: ${label} must be non-empty string`);
    }
    if (!ID_SLUG_RE.test(value)) {
      throw new Error(
        `CredentialAdapter: ${label}="${value}" is not slug-safe. ` +
        `Allowed: alphanumeric and hyphens. Underscores forbidden in IDs ` +
        `(would create ambiguous Doppler secret names).`
      );
    }
  }

  _assertSubkey(value) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error('CredentialAdapter: subkey must be non-empty string');
    }
    if (!SUBKEY_RE.test(value)) {
      throw new Error(
        `CredentialAdapter: subkey="${value}" must contain only alphanumeric, underscore, or hyphen.`
      );
    }
  }

  async _resolve(path) {
    const at = this.clock.now();

    if (this.dopplerClient && typeof this.dopplerClient.fetchSecret === 'function') {
      try {
        const value = await this.dopplerClient.fetchSecret({
          project: path.project, config: path.config, name: path.secret,
        });
        if (typeof value === 'string' && value.length > 0) {
          return Object.freeze({ status: 'present', value, path, source: 'doppler', fetchedAt: at });
        }
      } catch (err) {
        this.logger?.warn?.('[CredentialAdapter] doppler fetch error', {
          path, error: String(err?.message ?? err),
        });
      }
    }

    const envValue = this.envFallback[path.secret];
    if (typeof envValue === 'string' && envValue.length > 0) {
      return Object.freeze({ status: 'present', value: envValue, path, source: 'env_fallback', fetchedAt: at });
    }

    if (this.expectedKeys.has(path.secret)) {
      return Object.freeze({ status: 'expected', value: null, path, source: 'placeholder', fetchedAt: at });
    }

    return Object.freeze({ status: 'missing', value: null, path, source: 'placeholder', fetchedAt: at });
  }
}

let _default = null;
export function getDefaultCredentialAdapter() {
  if (!_default) {
    throw new Error(
      'No default CredentialAdapter set. Call setDefaultCredentialAdapter(adapter) at startup.'
    );
  }
  return _default;
}
export function setDefaultCredentialAdapter(adapter) {
  if (!(adapter instanceof CredentialAdapter)) {
    throw new Error('setDefaultCredentialAdapter: must be a CredentialAdapter instance');
  }
  _default = adapter;
}
export function _resetDefaultCredentialAdapter() { _default = null; }