// No headless drivers currently registered. Slots 8 and 9 reassigned
// to OpenRouter API reviewers as of 2026-05-13. Headless adapter
// shells preserved for potential future use; see scripts/lib/headless/
// archive/.
//
// scripts/lib/headless-reviewer.mjs
//
// Adapter shell for headless (browser-driven) panel reviewers.
//
// PUBLIC SHAPE (single export):
//
//   await callHeadlessReviewer({
//     slotId,         // numeric panel slot
//     model,          // string driver key (none registered as of 2026-05-13)
//     prompt,         // string — full system+user text to send
//     timeoutMs,      // number — per-call wall-clock budget
//   })
//   → { ok: boolean, response: string|null, latencyMs: number,
//       error: string|null }
//
// Routing: this shell dispatches by `model` to a per-slot driver under
// scripts/lib/headless/<driver>.mjs. With the empty registry below, every
// model name resolves to 'not_configured'; the shell + dispatch wiring
// stay in place so a future headless reviewer can be added without
// re-introducing this file.
//
// Retirement record (2026-05-13):
//   - base44_chat   retired earlier (role conflict with FlowAI UI platform)
//   - lovable_chat  retired (surface mismatch — app-builder dashboard, not chat)
//   - replit_agent  retired (Cloudflare WAF blocks headless Chromium fingerprint)
//   All four archived under scripts/lib/headless/archive/ with banners.
//
// If a future model is added to DRIVER_REGISTRY but its driver file is
// missing on disk OR cannot be imported, the shell returns
// { ok: false, error: 'not_configured' } so the panel runner keeps
// going on a partial-driver machine.
//
// Constraints:
//   - ESM only.
//   - Never log credentials, cookies, or storage-state contents.
//   - All real browser launches happen inside the driver — the shell is
//     pure routing + envelope normalization.

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const DRIVER_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'headless',
);

// model → driver file (relative to DRIVER_DIR) + named export to call.
// New drivers MUST register here. If a model is missing from this map the
// shell short-circuits to not_configured without touching disk.
//
// Empty as of 2026-05-13 — see retirement record in the header above.
const DRIVER_REGISTRY = Object.freeze({});

/**
 * Route a headless call to the matching driver.
 *
 * Always resolves; never throws. Driver-level exceptions are normalized
 * into the { ok:false, error:<message> } envelope.
 */
export async function callHeadlessReviewer({
  slotId,
  model,
  prompt,
  timeoutMs,
}) {
  const t0 = Date.now();

  if (typeof model !== 'string' || model.length === 0) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: 'invalid_request: model required',
    };
  }
  if (typeof prompt !== 'string' || prompt.length === 0) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: 'invalid_request: prompt required',
    };
  }
  if (typeof timeoutMs !== 'number' || timeoutMs < 1000) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: 'invalid_request: timeoutMs must be a number >= 1000',
    };
  }

  const entry = DRIVER_REGISTRY[model];
  if (!entry) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: `not_configured: no driver registered for model "${model}"`,
    };
  }

  const driverPath = path.join(DRIVER_DIR, entry.file);
  if (!existsSync(driverPath)) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: `not_configured: driver file missing at ${entry.file}`,
    };
  }

  let driverModule;
  try {
    driverModule = await import(pathToFileURL(driverPath).href);
  } catch (e) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: `driver_load_failed: ${e?.message ?? String(e)}`,
    };
  }

  const fn = driverModule?.[entry.exportName];
  if (typeof fn !== 'function') {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error:
        `driver_export_missing: "${entry.exportName}" not exported from ` +
        `${entry.file}`,
    };
  }

  // Hand off to the driver. The driver owns its own timeout enforcement
  // (Playwright actions take their own timeouts) but we also wrap it so a
  // hung driver cannot block the panel forever.
  let result;
  try {
    result = await Promise.race([
      fn({ prompt, timeoutMs, slotId }),
      new Promise((resolve) =>
        setTimeout(
          () => resolve({
            ok: false,
            response: null,
            latencyMs: Date.now() - t0,
            error: `shell_timeout: driver did not return within ${timeoutMs} ms`,
          }),
          timeoutMs + 5_000, // small grace so the driver's own timeout wins
        ),
      ),
    ]);
  } catch (e) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: `driver_threw: ${e?.message ?? String(e)}`,
    };
  }

  // Normalize: every driver MUST return the public envelope shape. If a
  // driver returns something off-spec, coerce + flag rather than crash.
  if (!result || typeof result !== 'object') {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: 'driver_bad_envelope: driver returned non-object',
    };
  }
  return {
    ok: result.ok === true,
    response: typeof result.response === 'string' ? result.response : null,
    latencyMs:
      typeof result.latencyMs === 'number'
        ? result.latencyMs
        : Date.now() - t0,
    error:
      typeof result.error === 'string'
        ? result.error
        : result.ok === true
          ? null
          : 'unknown',
  };
}

/**
 * Lightweight inventory — used by the report-back to declare which headless
 * drivers are wired vs not. Pure registry read; no I/O on the driver
 * files themselves beyond an existsSync probe.
 */
export function listHeadlessDrivers() {
  return Object.entries(DRIVER_REGISTRY).map(([model, entry]) => ({
    model,
    file: entry.file,
    present: existsSync(path.join(DRIVER_DIR, entry.file)),
  }));
}
