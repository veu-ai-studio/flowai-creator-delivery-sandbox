// Runtime loader for product synthetic-data prompts.
//
// Per W0 IP-hygiene ruling, the long-form synthetic prompts that encode
// each product's ICP / methodology / positioning are NOT stored in the
// public code repo. They live in a non-public source (env vars today,
// Supabase row or secret manager later) and are loaded at runtime.
//
// Lookup convention: `VITE_SYNTHETIC_PROMPT_<SLUG>` where SLUG is the
// product name uppercased and stripped of non-alphanumerics. Examples:
//   SAIGE      → VITE_SYNTHETIC_PROMPT_SAIGE
//   PressAI    → VITE_SYNTHETIC_PROMPT_PRESSAI
//   MyBirthSafe → VITE_SYNTHETIC_PROMPT_MYBIRTHSAFE
//
// API:
//   loadSyntheticPrompt(slug, opts?) → string | null
//     - returns the prompt string when the env var is set
//     - returns null when unset (caller decides how to degrade)
//     - opts.env: optional injected env source (used in tests; defaults
//       to import.meta.env in Vite, then process.env in Node)
//
// The loader is pure: no caching, no IO, no globals beyond reading env.

const KEY_PREFIX = 'VITE_SYNTHETIC_PROMPT_';

function readEnv(envOverride) {
  if (envOverride && typeof envOverride === 'object') return envOverride;
  // Vite-injected client env — present in browser and dev server
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      return import.meta.env;
    }
  } catch {
    // import.meta not available in this context
  }
  // Node / vitest-node fallback
  if (typeof process !== 'undefined' && process && process.env) return process.env;
  return {};
}

function normalizeSlug(slug) {
  if (typeof slug !== 'string') return '';
  return slug.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function loadSyntheticPrompt(slug, opts = {}) {
  const norm = normalizeSlug(slug);
  if (norm.length === 0) return null;
  const env = readEnv(opts.env);
  const value = env[KEY_PREFIX + norm];
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

export function syntheticPromptEnvKey(slug) {
  const norm = normalizeSlug(slug);
  return norm.length === 0 ? null : KEY_PREFIX + norm;
}

export const SYNTHETIC_PROMPT_KEY_PREFIX = KEY_PREFIX;
