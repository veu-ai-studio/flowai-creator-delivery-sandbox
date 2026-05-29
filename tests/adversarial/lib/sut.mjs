// SUT (System Under Test) base URL + preflight helpers — §11.1.
//
// Resolution order (highest priority first):
//   1. FLOWAI_DEV_SUT_URL env (explicit override)
//   2. http://localhost:5173 (default local Vite)
//
// LD-1: high-risk adversarial cases run against dev-SUT only; first
// execution per dispatch direction runs ALL cases against dev-SUT
// (prod execution deferred until X-Test-Bypass-Token keypair is
// provisioned by W1/W5x). The harness emits SKIP findings for tests
// whose preconditions are unmet rather than fabricating results.

export const SUT_URL =
  process.env.FLOWAI_DEV_SUT_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  'http://localhost:5173';

export const PROD_URL = 'https://truthful-flow-logic-lab.vercel.app';

export const PRODUCT_SCOPE_TEST = '_test';

const BYPASS_TOKEN = process.env.X_TEST_BYPASS_TOKEN || null;

export function bypassHeaders() {
  return BYPASS_TOKEN ? { 'X-Test-Bypass-Token': BYPASS_TOKEN } : {};
}

/**
 * Returns a discriminator describing the preconditions that are present
 * or missing for the run. Each test consults this and SKIPs with a
 * documented reason when the slice it needs is unavailable.
 */
export function preconditions() {
  return {
    sutUrl: SUT_URL,
    hasBypassToken: Boolean(BYPASS_TOKEN),
    hasClaudeKey: Boolean(process.env.ANTHROPIC_API_KEY),
    hasStripeSandbox: Boolean(process.env.STRIPE_SANDBOX_SECRET_KEY),
    hasSupabaseService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasClerkSession: Boolean(process.env.PLAYWRIGHT_CLERK_SESSION),
  };
}

/**
 * One-shot reachability probe with a tight timeout.
 * Returns { ok, status, durationMs, error? }.
 */
export async function probeSut(path = '/api/health', timeoutMs = 5_000) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${SUT_URL}${path}`, {
      method: 'GET',
      headers: bypassHeaders(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { ok: r.ok, status: r.status, durationMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, durationMs: Date.now() - t0, error: e?.message ?? String(e) };
  }
}

/**
 * Build a finding row per §6 schema. Used by every adversarial test.
 */
export function makeFinding({
  testId,
  suite,
  surface,
  category,
  severity,
  status,
  reproducer,
  expected,
  actual,
  durationMs,
  evidencePaths = [],
  metadata = {},
}) {
  return {
    test_id: testId,
    suite,
    surface,
    category,
    severity,
    status,
    reproducer_steps: Array.isArray(reproducer) ? reproducer : [String(reproducer)],
    expected_behavior: expected,
    actual_behavior: actual,
    latency_ms: typeof durationMs === 'number' ? durationMs : null,
    evidence_paths: evidencePaths,
    first_seen_commit: process.env.FLOWAI_SUITE_COMMIT || null,
    owner: { type: 'team', team: 'W4', agentId: null },
    recommended_fix: null,
    metadata,
  };
}
