/**
 * W1 Credential Schema — 26-agent coverage layer
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/credentials/CredentialAdapter.ts (W1 territory)
 * Status:   Pre-agent foundation. Schema-only — runtime resolution lives in
 *           /src/lib/shared/CredentialAdapter.js (W5 territory) and is
 *           re-exported from here so consumers have a single import point.
 *
 * What this module owns:
 *   1. CREDENTIAL_CATALOG — frozen map of every credential key any of the
 *      26 agents can declare, with purpose + which agents need it.
 *   2. REGISTRY_KEY_ALIASES — normalization map for known cross-workstream
 *      naming drift between the W5 _registry.ts and the W1 inventory in
 *      docs/ENV_VARS.md. Lets W1 validate consistency without modifying
 *      W5 files.
 *   3. listRequiredCredentialsForAgent / listAllRequiredCredentials —
 *      derived views over the registry, normalized through aliases.
 *   4. bindAgentCredentials — at-runtime binding helper. Given an agent id
 *      and a constructed runtime adapter, returns a frozen
 *      AgentCredentialBinding: { present[], expected[], missing[],
 *      records{} }.
 *   5. validateCredentialSchema — module-load self-check. Every credential
 *      a registry agent declares must be in the catalog (after alias
 *      normalization); every catalog entry's required_for_agents must point
 *      to a real agent id and that agent must declare the credential.
 *   6. assertNoHardcodedSecrets — utility that callers can use to refuse
 *      values that look like committed secrets.
 *
 * Design constraints (per W1 dispatch):
 *   - No hardcoded secrets. Catalog values name env vars; never embed values.
 *   - Validation runs at module load and throws on drift — fail-fast contract.
 *   - This file does not modify any existing source. The W5 runtime adapter
 *     and the W5 _registry.ts are read-only inputs.
 * ---------------------------------------------------------------------------
 */

import {
  CredentialAdapter as RuntimeCredentialAdapter,
  getDefaultCredentialAdapter,
  setDefaultCredentialAdapter,
  _resetDefaultCredentialAdapter,
} from '../shared/CredentialAdapter.js';
import { AGENT_REGISTRY, type AgentRecord } from '../agents/_registry.js';

// ── Catalog of all credential keys used across the 26-agent roster ───────────

/**
 * Every credential key any of the 26 agents can declare. Catalog is the
 * single source of truth for W1; the registry's per-agent
 * `requiredCredentials` array must contain only keys present here (after
 * alias normalization).
 *
 * Keys are env-var-shape names (UPPER_SNAKE_CASE). They are also the names
 * that end up at the Doppler path `flowai/<env>/<KEY>` for embedded agents
 * or `<scope>/<env>/<KEY>` for product-scoped runs.
 */
export interface CredentialDescriptor {
  /** Canonical credential key. Matches the Doppler secret name. */
  readonly key: string;
  /** Plain-English description of what this credential is for. */
  readonly purpose: string;
  /** Optional/required by which agents (subset of 1..26). */
  readonly requiredForAgents: readonly number[];
  /** Where the W5 runtime adapter looks: 'doppler' first, 'env_fallback' as backup. */
  readonly source: 'doppler' | 'env_fallback';
  /** Notes on rotation, scope, or constraints. */
  readonly notes?: string;
}

/**
 * Catalog map. Keys MUST match `CredentialDescriptor.key` exactly so that
 * `CREDENTIAL_CATALOG[key]` always lines up with the descriptor's own .key.
 *
 * `requiredForAgents` is the AUTHORITATIVE inverse-index — it is the
 * source of truth W1 owns; the W5 registry's per-agent
 * `requiredCredentials` array is the forward index. The two must agree
 * (modulo aliases) or `validateCredentialSchema()` throws.
 */
export const CREDENTIAL_CATALOG: Readonly<Record<string, CredentialDescriptor>> = Object.freeze({
  ANTHROPIC_API_KEY: Object.freeze({
    key: 'ANTHROPIC_API_KEY',
    purpose: 'Claude (Anthropic) LLM API access for research, design, audit, GTM, and policy briefs.',
    requiredForAgents: Object.freeze([6, 7, 8, 9, 11, 14, 15, 17, 18, 19]),
    source: 'doppler',
    notes: 'Live in production today. Rotation cadence: 180 days per W1 rotation runbook.',
  }),
  BROWSERLESS_API_KEY: Object.freeze({
    key: 'BROWSERLESS_API_KEY',
    purpose: 'Headless browser rendering for Research crawls of JS-heavy SPAs.',
    requiredForAgents: Object.freeze([6]),
    source: 'doppler',
    notes:
      'Registry _registry.ts uses the legacy alias "BROWSERLESS_TOKEN" — see ' +
      'REGISTRY_KEY_ALIASES. Canonical name is BROWSERLESS_API_KEY (matches ' +
      'docs/ENV_VARS.md and api/_lib/crawler.js).',
  }),
  CLOUDFLARE_API_TOKEN: Object.freeze({
    key: 'CLOUDFLARE_API_TOKEN',
    purpose: 'Cloudflare WAF / Bot Management rule updates from #13 Self-Protection.',
    requiredForAgents: Object.freeze([13]),
    source: 'doppler',
    notes: 'Required when Agent #13 ships. Procurement currently in W1 vendor queue.',
  }),
  OPENAI_API_KEY: Object.freeze({
    key: 'OPENAI_API_KEY',
    purpose: 'GPT model access for code generation, deployment fix flow, and orchestration.',
    requiredForAgents: Object.freeze([]),
    source: 'doppler',
    notes:
      'Used by the Auto Runner build/fix paths (api/, base44/) — not declared by any of the ' +
      'current 26-agent registry entries. Listed here for inventory completeness; W1 inventory ' +
      'expansion (specs/w1-overnight/12-inventory-expansion.md) tracks this gap.',
  }),
  VERCEL_TOKEN: Object.freeze({
    key: 'VERCEL_TOKEN',
    purpose: 'Vercel deployment + redeploy operations.',
    requiredForAgents: Object.freeze([]),
    source: 'doppler',
    notes: 'Currently consumed by Auto Runner; out of agent scope.',
  }),
  STRIPE_SECRET_KEY: Object.freeze({
    key: 'STRIPE_SECRET_KEY',
    purpose: 'Stripe Connect platform — Checkout Sessions, application_fee_amount, payouts.',
    requiredForAgents: Object.freeze([]),
    source: 'doppler',
    notes:
      'Reserved for the Stripe Connect implementation per ' +
      'specs/w1-overnight/10-stripe-status.md. Not yet read by any agent.',
  }),
  STRIPE_WEBHOOK_SECRET: Object.freeze({
    key: 'STRIPE_WEBHOOK_SECRET',
    purpose: 'Stripe webhook signature verification.',
    requiredForAgents: Object.freeze([]),
    source: 'doppler',
    notes: 'See STRIPE_SECRET_KEY notes.',
  }),
  ADMIN_SEED_KEY: Object.freeze({
    key: 'ADMIN_SEED_KEY',
    purpose: 'x-flowai-admin-key gate for /api/admin/* and admin-only endpoints.',
    requiredForAgents: Object.freeze([]),
    source: 'doppler',
    notes: 'Currently consumed by api/admin/seed.js etc.; out of agent scope.',
  }),
  WEBHOOK_SECRET: Object.freeze({
    key: 'WEBHOOK_SECRET',
    purpose: 'Inbound webhook header validation for /webhookHandler.',
    requiredForAgents: Object.freeze([]),
    source: 'doppler',
    notes:
      'Currently has a committed plaintext default that must be removed per ' +
      'specs/w1-overnight/11-plaintext-remediation.md before rotation has meaning.',
  }),
} as const);

/**
 * Cross-workstream key drift. The W5 _registry.ts uses some legacy / shorthand
 * names that don't match the canonical CREDENTIAL_CATALOG keys. We normalize
 * here rather than modifying the W5 file.
 */
export const REGISTRY_KEY_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  BROWSERLESS_TOKEN: 'BROWSERLESS_API_KEY',
});

/** Apply aliases. Returns the canonical key unchanged if no alias applies. */
export function normalizeCredentialKey(key: string): string {
  return REGISTRY_KEY_ALIASES[key] ?? key;
}

// ── Derived views over the registry, normalized through aliases ──────────────

/**
 * Return the canonical credential keys an agent declares. Aliased registry
 * names are normalized to the catalog's canonical names. Result is frozen.
 *
 * Throws if the agent id is not in the registry.
 */
export function listRequiredCredentialsForAgent(agentId: number): readonly string[] {
  const agent: AgentRecord | undefined = AGENT_REGISTRY.find((a) => a.id === agentId);
  if (!agent) {
    throw new Error(`listRequiredCredentialsForAgent: unknown agent id ${agentId}`);
  }
  const out = agent.requiredCredentials.map(normalizeCredentialKey);
  return Object.freeze(out) as readonly string[];
}

/**
 * Return the deduplicated, sorted union of canonical credential keys
 * required across the entire 26-agent roster.
 */
export function listAllRequiredCredentials(): readonly string[] {
  const set = new Set<string>();
  for (const a of AGENT_REGISTRY) {
    for (const k of a.requiredCredentials) {
      set.add(normalizeCredentialKey(k));
    }
  }
  return Object.freeze([...set].sort()) as readonly string[];
}

// ── Runtime binding ──────────────────────────────────────────────────────────

/**
 * The shape returned per-credential by bindAgentCredentials.
 */
export interface CredentialBindingRecord {
  readonly key: string;
  readonly status: 'present' | 'expected' | 'missing';
  readonly source: 'doppler' | 'env_fallback' | 'placeholder';
  /** Present only when status === 'present'. */
  readonly value: string | null;
}

/**
 * What an agent receives when its required credentials are resolved.
 */
export interface AgentCredentialBinding {
  readonly agentId: number;
  readonly required: readonly string[];
  /** Map of canonical key -> resolved record. */
  readonly records: Readonly<Record<string, CredentialBindingRecord>>;
  /** Subset of `required` whose status is 'present'. */
  readonly present: readonly string[];
  /** Subset of `required` whose status is 'expected' (declared but unset). */
  readonly expected: readonly string[];
  /** Subset of `required` whose status is 'missing' (undeclared and unset). */
  readonly missing: readonly string[];
  readonly resolvedAt: number;
}

/**
 * The minimum surface we need from the W5 runtime adapter. This is a
 * structural type, so any object with a compatible `get()` works — the
 * production adapter at /src/lib/shared/CredentialAdapter.js implements it
 * exactly, and tests can pass stubs without instantiating the real class.
 */
export interface RuntimeCredentialResolver {
  get(
    key: string,
  ): Promise<{
    status: 'present' | 'expected' | 'missing';
    source: 'doppler' | 'env_fallback' | 'placeholder';
    value: string | null;
    fetchedAt: number;
    path: { project: string; config: string; secret: string };
  }>;
  declareExpected?(keys: readonly string[]): void;
}

/**
 * Resolve every credential an agent declares against the runtime adapter,
 * returning a frozen AgentCredentialBinding. Auto-declares the agent's
 * required keys as `expectedKeys` on the adapter so they report as
 * `expected` (not `missing`) when the vault doesn't have them — this is
 * the "expected vs missing" distinction the W5 docblock describes.
 *
 * Idempotent: calling twice does not produce different results when the
 * underlying adapter state hasn't changed.
 */
export async function bindAgentCredentials(
  agentId: number,
  adapter: RuntimeCredentialResolver,
): Promise<AgentCredentialBinding> {
  if (!Number.isInteger(agentId) || agentId < 1 || agentId > 26) {
    throw new Error(`bindAgentCredentials: agentId must be an integer 1..26, got ${agentId}`);
  }
  if (!adapter || typeof adapter.get !== 'function') {
    throw new Error('bindAgentCredentials: adapter must implement get(key)');
  }
  const required = listRequiredCredentialsForAgent(agentId);

  // Mark declared-but-unresolved as 'expected' so the runtime distinguishes
  // intentional declarations from typos. No-op if not supported by adapter.
  if (typeof adapter.declareExpected === 'function' && required.length > 0) {
    adapter.declareExpected(required);
  }

  const records: Record<string, CredentialBindingRecord> = {};
  const present: string[] = [];
  const expected: string[] = [];
  const missing: string[] = [];
  let lastFetched = 0;

  for (const key of required) {
    const r = await adapter.get(key);
    if (r.fetchedAt > lastFetched) lastFetched = r.fetchedAt;
    const rec: CredentialBindingRecord = Object.freeze({
      key,
      status: r.status,
      source: r.source,
      value: r.status === 'present' ? r.value : null,
    });
    records[key] = rec;
    if (rec.status === 'present') present.push(key);
    else if (rec.status === 'expected') expected.push(key);
    else missing.push(key);
  }

  return Object.freeze({
    agentId,
    required,
    records: Object.freeze(records),
    present: Object.freeze([...present].sort()) as readonly string[],
    expected: Object.freeze([...expected].sort()) as readonly string[],
    missing: Object.freeze([...missing].sort()) as readonly string[],
    resolvedAt: lastFetched,
  });
}

// ── Schema consistency check ─────────────────────────────────────────────────

/**
 * Module-load self-check. Throws on drift between the W5 registry and the
 * W1 catalog. Specifically:
 *
 *   1. Every credential key declared in any agent's `requiredCredentials`
 *      (after alias normalization) MUST exist in CREDENTIAL_CATALOG.
 *   2. Every catalog entry's `requiredForAgents` MUST reference valid agent
 *      ids in 1..26 and the corresponding agent MUST declare that credential
 *      (after alias normalization).
 *   3. Every catalog descriptor's `key` field MUST match its catalog map key.
 *
 * Returns void on success; throws Error on any failure.
 */
export function validateCredentialSchema(): void {
  // Rule 3: descriptor.key === catalog map key
  for (const [mapKey, descriptor] of Object.entries(CREDENTIAL_CATALOG)) {
    if (descriptor.key !== mapKey) {
      throw new Error(
        `validateCredentialSchema: catalog descriptor mismatch — ` +
          `map key "${mapKey}" but descriptor.key="${descriptor.key}"`,
      );
    }
  }

  // Rule 1: registry-declared credentials are all in the catalog (post-alias)
  for (const agent of AGENT_REGISTRY) {
    for (const rawKey of agent.requiredCredentials) {
      const canonical = normalizeCredentialKey(rawKey);
      if (!Object.prototype.hasOwnProperty.call(CREDENTIAL_CATALOG, canonical)) {
        throw new Error(
          `validateCredentialSchema: agent #${agent.id} (${agent.name}) declares ` +
            `requiredCredentials="${rawKey}" (canonical "${canonical}") which is not in CREDENTIAL_CATALOG. ` +
            `Add a CredentialDescriptor for "${canonical}" or fix the registry.`,
        );
      }
    }
  }

  // Rule 2: catalog `requiredForAgents` is consistent with the registry
  for (const descriptor of Object.values(CREDENTIAL_CATALOG)) {
    for (const agentId of descriptor.requiredForAgents) {
      if (!Number.isInteger(agentId) || agentId < 1 || agentId > 26) {
        throw new Error(
          `validateCredentialSchema: catalog "${descriptor.key}" lists agent id ${agentId} ` +
            `which is out of range 1..26.`,
        );
      }
      const agent = AGENT_REGISTRY.find((a) => a.id === agentId);
      if (!agent) {
        throw new Error(
          `validateCredentialSchema: catalog "${descriptor.key}" references missing agent id ${agentId}.`,
        );
      }
      const declared = agent.requiredCredentials.map(normalizeCredentialKey);
      if (!declared.includes(descriptor.key)) {
        throw new Error(
          `validateCredentialSchema: catalog "${descriptor.key}" claims agent #${agent.id} ` +
            `(${agent.name}) requires it, but the registry says agent #${agent.id} declares ` +
            `[${declared.join(', ') || '(none)'}].`,
        );
      }
    }
  }
}

// Run the consistency check at module load. Failure here means the deploy is
// shipping a registry/catalog drift and should be aborted before any agent
// runs. This matches the AGENT_REGISTRY's own roster invariants validation.
validateCredentialSchema();

// ── Hardcoded-secret guard ───────────────────────────────────────────────────

/**
 * Heuristic check for committed secrets. Used by callers (e.g., test helpers,
 * lint rules) that want to refuse to accept a value that looks like a
 * committed credential rather than an env-var-sourced one.
 *
 * This is a heuristic — it cannot detect every leak, but it catches the
 * patterns that have appeared in this codebase historically (e.g., the
 * `'flowai-webhook-secret'` literal flagged in
 * specs/w1-overnight/11-plaintext-remediation.md).
 *
 * Throws Error on suspected hardcoded secret. Returns the value unchanged on
 * success so callers can chain.
 */
export function assertNoHardcodedSecrets(value: unknown, context = 'value'): unknown {
  if (typeof value !== 'string') return value;

  const KNOWN_BAD_LITERALS = ['flowai-webhook-secret'];
  for (const bad of KNOWN_BAD_LITERALS) {
    if (value === bad || value.includes(bad)) {
      throw new Error(
        `assertNoHardcodedSecrets: ${context} matches known-committed plaintext "${bad}". ` +
          `Replace with an env-var-sourced credential per the W1 rotation runbook.`,
      );
    }
  }

  // Cheap entropy heuristic: long uppercase tokens that look like keys.
  // Allow short identifiers (env-var names like ANTHROPIC_API_KEY) — those
  // are catalog keys, not values.
  // Reject sk_live_*, sk_test_*, AKIA*, ghp_*, and other vendor patterns.
  const VENDOR_PATTERNS: readonly RegExp[] = Object.freeze([
    /^sk_live_[A-Za-z0-9]{16,}$/,
    /^sk_test_[A-Za-z0-9]{16,}$/,
    /^rk_live_[A-Za-z0-9]{16,}$/,
    /^pk_live_[A-Za-z0-9]{16,}$/,
    /^AKIA[A-Z0-9]{16}$/,
    /^ghp_[A-Za-z0-9]{36}$/,
    /^ghs_[A-Za-z0-9]{36}$/,
    /^xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+$/,
  ]);
  for (const pattern of VENDOR_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error(
        `assertNoHardcodedSecrets: ${context} matches a known vendor secret pattern (${pattern}). ` +
          `Move the literal into a Doppler secret or env var; reference by name only.`,
      );
    }
  }

  return value;
}

// ── Re-exports of the W5 runtime adapter ─────────────────────────────────────
// Consumers that want a single import point can do:
//   import {
//     RuntimeCredentialAdapter,
//     bindAgentCredentials,
//     validateCredentialSchema,
//   } from '@/lib/credentials/CredentialAdapter';
//
// The W5 file is unchanged.
export {
  RuntimeCredentialAdapter,
  getDefaultCredentialAdapter,
  setDefaultCredentialAdapter,
  _resetDefaultCredentialAdapter,
};
