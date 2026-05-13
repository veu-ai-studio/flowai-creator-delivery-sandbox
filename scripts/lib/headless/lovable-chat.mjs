// scripts/lib/headless/lovable-chat.mjs
//
// Slot 8 driver — Lovable.dev chat via Playwright.
//
// Replaces the archived Base44 driver (2026-05-13). Same path-8a pattern:
// reuse the CEO's authenticated Lovable.dev session by loading a
// pre-saved Playwright storageState file. The one-time setup that
// generates the storageState file is scripts/setup-lovable-session.mjs.
//
// Public shape (single export):
//
//   await callLovableChat({ prompt, timeoutMs })
//   → { ok: boolean, response: string|null, latencyMs: number,
//       error: string|null }
//
// Failure modes (all return ok:false, never throw):
//   - storage_state_missing — env points to a path that doesn't exist
//   - browser_launch_failed — Playwright can't start (binary missing, etc.)
//   - selector_drift — none of the heuristic input/output selectors match
//   - response_timeout — response stability never reached within timeoutMs
//   - <error.message>    — any other thrown error
//
// Constraints:
//   - Headless: true (always — visible browser is reserved for the
//     manual setup script).
//   - Never log credentials, cookies, storageState contents, or the
//     prompt body. Errors include selector names and timings only.
//
// Selectors below are HEURISTIC and will need pinning on first real
// roundtrip — capture which one actually matched and promote it to the
// top of the list. The Slot 8 (Base44) post-mortem showed that the
// post-login landing surface is the bigger risk than the selectors
// themselves; if Lovable lands on a project-builder rather than a
// general chat, this driver will see the same kind of "input submits
// but no conversational reply" failure mode.

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const DEFAULT_STORAGE_STATE_PATH = path.join(
  homedir(),
  '.flowai',
  'lovable-storage-state.json',
);

const LOVABLE_PROBE_URL = 'https://lovable.dev';

// Heuristic input selectors. Prefer the ones the dispatch listed first
// — placeholder-keyword textareas, then focused role=textbox, then any
// contenteditable. We narrow once the first real run pins a stable
// selector.
const INPUT_SELECTOR_HEURISTICS = [
  'textarea[placeholder*="ask" i]',
  'textarea[placeholder*="build" i]',
  'textarea[placeholder*="describe" i]',
  'textarea[placeholder*="message" i]',
  'textarea[placeholder*="what" i]',
  '[role="textbox"][autofocus]',
  '[role="textbox"]:focus',
  '[contenteditable="true"][placeholder]',
  '[contenteditable="true"][data-placeholder]',
  '[contenteditable="true"]:not([aria-hidden])',
];

// Streaming indicators. If any are visible, the response is still
// rendering and we should keep polling.
const STREAMING_SELECTOR_HEURISTICS = [
  'button[aria-label*="Stop" i]',
  'button[aria-label*="stop generating" i]',
  '[data-state="streaming"]',
  '[data-streaming="true"]',
  '.streaming-indicator',
  '.typing-indicator',
];

// Assistant-bubble extraction. We grab the LAST matching element and
// return its innerText.
const ASSISTANT_BUBBLE_HEURISTICS = [
  '[data-role="assistant"]',
  '[data-message-role="assistant"]',
  '[data-author="assistant"]',
  '[data-author-role="assistant"]',
  '[class*="assistant-message" i]',
  '[class*="message-assistant" i]',
  '[class*="message"] [class*="markdown" i]',
  '[class*="message-content" i]',
  '[class*="prose" i]',
];

const POLL_INTERVAL_MS = 1_000;
const STABILITY_REQUIRED_POLLS = 3;
const DEFAULT_TIMEOUT_MS = 90_000;

export async function callLovableChat({ prompt, timeoutMs } = {}) {
  const t0 = Date.now();
  const budgetMs =
    typeof timeoutMs === 'number' && timeoutMs >= 1_000
      ? timeoutMs
      : DEFAULT_TIMEOUT_MS;
  const storageStatePath =
    process.env.LOVABLE_STORAGE_STATE_PATH || DEFAULT_STORAGE_STATE_PATH;

  if (!existsSync(storageStatePath)) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: 'storage_state_missing — run scripts/setup-lovable-session.mjs first',
    };
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (e) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: `browser_launch_failed: playwright import — ${e?.message ?? e}`,
    };
  }

  let browser = null;
  let context = null;
  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      storageState: storageStatePath,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.goto(LOVABLE_PROBE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: Math.min(30_000, Math.floor(budgetMs / 3)),
    });
    await page.waitForLoadState('networkidle', {
      timeout: Math.min(20_000, Math.floor(budgetMs / 3)),
    }).catch(() => { /* not fatal */ });

    const inputBudgetMs = Math.min(15_000, Math.floor(budgetMs / 4));
    const matchedInputSelector = await findFirstVisible(
      page,
      INPUT_SELECTOR_HEURISTICS,
      inputBudgetMs,
    );
    if (!matchedInputSelector) {
      return {
        ok: false,
        response: null,
        latencyMs: Date.now() - t0,
        error:
          'selector_drift: no chat input matched the heuristic set ' +
          '(session expired, landed on wrong surface, or UI changed)',
      };
    }

    const inputHandle = page.locator(matchedInputSelector).first();
    try {
      await inputHandle.click({ timeout: 5_000 });
      await inputHandle.fill(prompt, { timeout: 5_000 });
    } catch {
      await inputHandle.click({ timeout: 5_000 }).catch(() => { /* try anyway */ });
      await page.keyboard.type(prompt, { delay: 5 });
    }
    await page.keyboard.press('Enter');

    const responseDeadline = t0 + budgetMs;
    let lastText = '';
    let stableCount = 0;
    let captured = null;

    while (Date.now() < responseDeadline) {
      await page.waitForTimeout(POLL_INTERVAL_MS);
      const streaming = await isStillStreaming(page);
      const bubble = await scrapeLatestAssistantBubble(page);
      if (bubble == null) {
        continue;
      }
      if (bubble === lastText && !streaming) {
        stableCount += 1;
        if (stableCount >= STABILITY_REQUIRED_POLLS) {
          captured = bubble;
          break;
        }
      } else {
        stableCount = 0;
        lastText = bubble;
      }
    }

    if (captured == null) {
      if (lastText) {
        return {
          ok: false,
          response: lastText,
          latencyMs: Date.now() - t0,
          error: 'response_timeout: response did not stabilize within timeoutMs',
        };
      }
      return {
        ok: false,
        response: null,
        latencyMs: Date.now() - t0,
        error:
          'selector_drift: no assistant bubble matched the heuristic set ' +
          '(UI changed or response never started)',
      };
    }

    return {
      ok: true,
      response: captured,
      latencyMs: Date.now() - t0,
      error: null,
    };
  } catch (e) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: e?.message ?? String(e),
    };
  } finally {
    if (context) await context.close().catch(() => { /* ignore */ });
    if (browser) await browser.close().catch(() => { /* ignore */ });
  }
}

async function findFirstVisible(page, selectors, budgetMs) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      const handle = page.locator(sel).first();
      try {
        if (await handle.isVisible({ timeout: 250 })) return sel;
      } catch { /* keep iterating */ }
    }
    await page.waitForTimeout(250);
  }
  return null;
}

async function isStillStreaming(page) {
  for (const sel of STREAMING_SELECTOR_HEURISTICS) {
    try {
      if (await page.locator(sel).first().isVisible({ timeout: 100 })) {
        return true;
      }
    } catch { /* selector missing → not streaming via this signal */ }
  }
  return false;
}

async function scrapeLatestAssistantBubble(page) {
  for (const sel of ASSISTANT_BUBBLE_HEURISTICS) {
    try {
      const matches = page.locator(sel);
      const count = await matches.count();
      if (count === 0) continue;
      const last = matches.nth(count - 1);
      const text = (await last.innerText({ timeout: 1_000 })).trim();
      if (text.length > 0) return text;
    } catch { /* try next heuristic */ }
  }
  return null;
}

// Setup script imports these to write storageState to the same default
// location the driver reads. Single source of truth for the path.
export { DEFAULT_STORAGE_STATE_PATH };

export async function ensureStorageStateParentDir(target = DEFAULT_STORAGE_STATE_PATH) {
  const dir = path.dirname(target);
  await mkdir(dir, { recursive: true });
  return dir;
}
