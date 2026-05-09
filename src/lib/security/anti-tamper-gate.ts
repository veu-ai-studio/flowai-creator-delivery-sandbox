/**
 * Anti-tamper Env Gate (PA #2.5a)
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/security/anti-tamper-gate.ts (W5 territory)
 *
 * Single canonical helper that decides whether anti-tamper protections
 * (right-click block, DevTools detection, console suppression, etc.) should
 * activate. All anti-tamper modules MUST consult this helper — never
 * inline their own env check.
 *
 * Resolution order (per W0 dispatch):
 *   1. process.env.VERCEL_ENV
 *        'production' → enabled
 *        'preview' or 'development' → disabled
 *        anything else → fall through to step 2
 *   2. import.meta.env.VITE_VERCEL_ENV  (Vite-exposed mirror; same rules)
 *   3. process.env.NODE_ENV === 'production' → enabled
 *   4. import.meta.env.PROD === true && import.meta.env.MODE === 'production'
 *        → enabled (covers `vite build` without any Vercel signal)
 *   5. otherwise → disabled (safe default for unknown environments)
 *
 * Browser-vs-server seams:
 *   - Server-side (api/* serverless funcs, vitest in 'node' env):
 *        process.env is real; VERCEL_ENV is auto-injected by Vercel.
 *   - Browser-side (Vite-bundled client code):
 *        process.env.VERCEL_ENV is inlined at build time via vite define.
 *        See vite.config.js. import.meta.env.PROD is also available.
 *
 * Tests inject `getEnv` overrides via the `envGateOverride` param so each
 * env state is exercised deterministically.
 * ---------------------------------------------------------------------------
 */

export interface AntiTamperGateInputs {
  /** Server-side env bag. Defaults to `process.env` when present, else {}. */
  readonly procEnv?: Record<string, string | undefined>;
  /** Vite browser-side env bag. Defaults to import.meta.env when present. */
  readonly metaEnv?: Record<string, string | boolean | undefined>;
}

function safeProcEnv(): Record<string, string | undefined> {
  if (typeof process !== 'undefined' && process && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return {};
}

function safeMetaEnv(): Record<string, string | boolean | undefined> {
  // import.meta.env is provided by Vite/Vitest at runtime. We use a runtime
  // probe instead of a top-level reference so the file still parses cleanly
  // in environments that don't define it.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (import.meta as unknown as { env?: Record<string, unknown> });
    return (m && m.env ? (m.env as Record<string, string | boolean | undefined>) : {});
  } catch {
    return {};
  }
}

/**
 * Returns true iff anti-tamper protections should activate. False for
 * preview / development / unknown environments.
 */
export function isAntiTamperEnabled(opts: AntiTamperGateInputs = {}): boolean {
  const proc = opts.procEnv ?? safeProcEnv();
  const meta = opts.metaEnv ?? safeMetaEnv();

  // 1. process.env.VERCEL_ENV — the canonical Vercel signal.
  const procVercel = proc.VERCEL_ENV;
  if (procVercel === 'production') return true;
  if (procVercel === 'preview' || procVercel === 'development') return false;

  // 2. Vite-exposed mirror, in case the deploy pipeline exposes it that way.
  const metaVercel = meta.VITE_VERCEL_ENV;
  if (metaVercel === 'production') return true;
  if (metaVercel === 'preview' || metaVercel === 'development') return false;

  // 3. NODE_ENV fallback. Note: Vite's `vite build` sets NODE_ENV='production'
  //    even on preview deploys, so this fallback can over-enable on Vercel.
  //    The vite.config.js `define` block inlines VERCEL_ENV exactly to make
  //    rule (1) authoritative on real Vercel deploys.
  if (proc.NODE_ENV === 'production') return true;

  // 4. Vite-side production hint when no other signal is present.
  if (meta.PROD === true && meta.MODE === 'production') return true;

  // 5. Default off — safer for unknown environments (developer laptop,
  //    forks, sandbox CI).
  return false;
}

/**
 * Human-readable rationale for the current decision. Used by tests + by the
 * `secret` debug log surface so operators can confirm what the gate saw.
 */
export function antiTamperGateReason(opts: AntiTamperGateInputs = {}): {
  enabled: boolean;
  source: 'VERCEL_ENV' | 'VITE_VERCEL_ENV' | 'NODE_ENV' | 'import.meta.PROD' | 'default';
  value: string | boolean | undefined;
} {
  const proc = opts.procEnv ?? safeProcEnv();
  const meta = opts.metaEnv ?? safeMetaEnv();

  if (proc.VERCEL_ENV === 'production') return { enabled: true, source: 'VERCEL_ENV', value: 'production' };
  if (proc.VERCEL_ENV === 'preview' || proc.VERCEL_ENV === 'development') {
    return { enabled: false, source: 'VERCEL_ENV', value: proc.VERCEL_ENV };
  }
  if (meta.VITE_VERCEL_ENV === 'production') return { enabled: true, source: 'VITE_VERCEL_ENV', value: 'production' };
  if (meta.VITE_VERCEL_ENV === 'preview' || meta.VITE_VERCEL_ENV === 'development') {
    return { enabled: false, source: 'VITE_VERCEL_ENV', value: meta.VITE_VERCEL_ENV };
  }
  if (proc.NODE_ENV === 'production') return { enabled: true, source: 'NODE_ENV', value: 'production' };
  if (meta.PROD === true && meta.MODE === 'production') {
    return { enabled: true, source: 'import.meta.PROD', value: true };
  }
  return { enabled: false, source: 'default', value: undefined };
}
