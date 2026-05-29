const MEMORY_FLAGS = new Map();
const MIGRATION_MODE_KEY = 'flowai:feature:migration-mode';

let kvClient = null;
let kvUnavailable = false;

async function getKvClient() {
  if (kvClient) return kvClient;
  if (kvUnavailable) return null;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    kvUnavailable = true;
    return null;
  }
  try {
    const mod = await import('@vercel/kv');
    kvClient = mod.kv;
    return kvClient;
  } catch {
    kvUnavailable = true;
    return null;
  }
}

function envFlagEnabled(env = process.env) {
  return String(env?.FLOWAI_ENABLE_MIGRATION_MODE || '').toLowerCase() === 'true';
}

function normalizeBoolean(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

export async function getMigrationModeFlag({ env = process.env } = {}) {
  const kv = await getKvClient();
  if (kv) {
    try {
      const stored = normalizeBoolean(await kv.get(MIGRATION_MODE_KEY));
      if (stored !== null) {
        return { enabled: stored, source: 'kv' };
      }
    } catch {
      // Fall through to memory/env so a transient KV error does not crash.
    }
  }

  if (MEMORY_FLAGS.has(MIGRATION_MODE_KEY)) {
    return { enabled: MEMORY_FLAGS.get(MIGRATION_MODE_KEY) === true, source: 'memory' };
  }

  return { enabled: envFlagEnabled(env), source: 'env' };
}

export async function setMigrationModeFlag(enabled) {
  const normalized = enabled === true;
  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.set(MIGRATION_MODE_KEY, normalized);
      MEMORY_FLAGS.set(MIGRATION_MODE_KEY, normalized);
      return { ok: true, enabled: normalized, transport: 'kv' };
    } catch {
      // Fall through to memory for local/dev continuity.
    }
  }

  MEMORY_FLAGS.set(MIGRATION_MODE_KEY, normalized);
  return { ok: true, enabled: normalized, transport: 'memory' };
}

export function resetRuntimeFeatureFlagsForTests() {
  MEMORY_FLAGS.clear();
  kvClient = null;
  kvUnavailable = false;
}

export const __runtimeFeatureFlagInternals = Object.freeze({
  MIGRATION_MODE_KEY,
  MEMORY_FLAGS,
  envFlagEnabled,
  normalizeBoolean,
});
