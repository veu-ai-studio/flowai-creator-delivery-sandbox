// scripts/lib/headless-reviewer.mjs
//
// Adapter shell for headless (browser-driven) panel reviewers.
//
// PUBLIC SHAPE (single export):
//
//   await callHeadlessReviewer({
//     slotId,         // numeric panel slot, e.g. 8
//     model,          // string driver key, e.g. 'base44_chat', 'replit_agent'
//     prompt,         // string — full system+user text to send
//     timeoutMs,      // number — per-call wall-clock budget
//   })
//   → { ok: boolean, response: string|null, latencyMs: number,
//       error: string|null }
//
// Routing: this shell dispatches by `model` to a per-slot driver under
// scripts/lib/headless/<driver>.mjs.
//
//   model='base44_chat'   → ./headless/base44-chat.mjs      (Slot 8)
//   model='replit_agent'  → ./headless/replit-agent.mjs     (Slot 9, DEFERRED)
//
// If the driver file does not exist on disk OR cannot be imported, the
// shell returns { ok: false, error: 'not_configured' } so the panel
// runner keeps going on a partial-driver machine. This preserves Slot 9's
// DEFERRED state until its driver is built.
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
const DRIVER_REGISTRY = Object.freeze({
  base44_chat: {
    file: 'base44-chat.mjs',
    exportName: 'callBase44Chat',
  },
  replit_agent: {
    file: 'replit-agent.mjs',     // not yet created — Slot 9 stays DEFERRED
    exportName: 'callReplitAgent',
  },
});

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
