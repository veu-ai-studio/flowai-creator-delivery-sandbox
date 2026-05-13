// scripts/lib/headless/base44-chat.mjs
//
// Slot 8 driver — Base44 web chat via Playwright.
//
// Path 8a: reuse the CEO's authenticated Base44 session by loading a
// pre-saved Playwright storageState file. The one-time setup that
// generates the storageState file is scripts/setup-base44-session.mjs.
//
// Public shape (single export):
//
//   await callBase44Chat({ prompt, timeoutMs })
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

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const DEFAULT_STORAGE_STATE_PATH = path.join(
  homedir(),
  '.flowai',
  'base44-storage-state.json',
);

// Probe targets in order. We start at the marketing/app root; if Base44
// redirects to a workspace-scoped chat URL we follow the redirect and
// proceed there.
const BASE44_PROBE_URL = 'https://app.base44.com';

// Heuristic input selectors, tried in order. Capture the first match.
// Base44's chat surface is currently undocumented externally — these are
// resilient guesses based on common ai-chat UI patterns. The set is
// intentionally wide; we narrow once the first real run captures the
// stable selector.
const INPUT_SELECTOR_HEURISTICS = [
  '[contenteditable="true"][aria-label*="Message" i]',
  '[contenteditable="true"][aria-label*="Ask" i]',
  '[contenteditable="true"][data-placeholder*="message" i]',
  '[contenteditable="true"][data-placeholder*="ask" i]',
  'textarea[placeholder*="message" i]',
  'textarea[placeholder*="ask" i]',
  'textarea[aria-label*="Message" i]',
  'textarea[aria-label*="Ask" i]',
  'input[type="text"][placeholder*="message" i]',
  '[contenteditable="true"]:not([aria-hidden])',
];

// Selectors that, if present, mean a response is still streaming. When
// they ALL disappear AND the assistant-bubble text is stable across two
// polls, we consider the response complete.
const STREAMING_SELECTOR_HEURISTICS = [
  'button[aria-label*="Stop" i]',
  'button[aria-label*="stop generating" i]',
  '[data-state="streaming"]',
  '[aria-live="polite"] [data-streaming="true"]',
  '.streaming-indicator',
  '.typing-indicator',
];

// Assistant-bubble extraction heuristics. We grab the LAST element that
// looks like an assistant message and return its innerText.
const ASSISTANT_BUBBLE_HEURISTICS = [
  '[data-role="assistant"]',
  '[data-message-role="assistant"]',
  '[data-author="assistant"]',
  '[role="article"][data-author-role="assistant"]',
  '[class*="assistant-message" i]',
  // Fallback: any markdown-rendered prose block in a chat thread.
  '[class*="message"] [class*="markdown" i]',
  '[class*="message-content" i]',
];

const POLL_INTERVAL_MS = 500;
const STABILITY_REQUIRED_POLLS = 2;

export async function callBase44Chat({ prompt, timeoutMs }) {
  const t0 = Date.now();
  const storageStatePath =
    process.env.BASE44_STORAGE_STATE_PATH || DEFAULT_STORAGE_STATE_PATH;

  if (!existsSync(storageStatePath)) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: 'storage_state_missing — run scripts/setup-base44-session.mjs first',
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

    // Probe + follow redirect. We don't try to detect "logged out" — if
    // the session is dead the input selectors will simply not appear
    // within their wait window, and we return selector_drift below.
    await page.goto(BASE44_PROBE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: Math.min(30_000, Math.floor(timeoutMs / 3)),
    });
    // Settle network so any redirect-then-app-shell render finishes.
    await page.waitForLoadState('networkidle', {
      timeout: Math.min(20_000, Math.floor(timeoutMs / 3)),
    }).catch(() => { /* not fatal */ });

    // Find a working input selector.
    const inputBudgetMs = Math.min(15_000, Math.floor(timeoutMs / 4));
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
          '(session expired or UI changed)',
      };
    }

    // Type the prompt + submit. We try a contenteditable-friendly fill
    // first; fall back to direct keyboard input if .fill() rejects.
    const inputHandle = page.locator(matchedInputSelector).first();
    try {
      await inputHandle.click({ timeout: 5_000 });
      await inputHandle.fill(prompt, { timeout: 5_000 });
    } catch {
      await inputHandle.click({ timeout: 5_000 }).catch(() => { /* try anyway */ });
      await page.keyboard.type(prompt, { delay: 5 });
    }
    await page.keyboard.press('Enter');

    // Poll for response stability.
    const responseDeadline = t0 + timeoutMs;
    let lastText = '';
    let stableCount = 0;
    let captured = null;

    while (Date.now() < responseDeadline) {
      await page.waitForTimeout(POLL_INTERVAL_MS);
      const streaming = await isStillStreaming(page);
      const bubble = await scrapeLatestAssistantBubble(page);
      if (bubble == null) {
        // No bubble yet — keep waiting; the assistant may still be
        // rendering its first token.
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
      // We saw text but never settled, OR we never saw a bubble.
      if (lastText) {
        // Return the last non-stable text rather than dropping it —
        // truncation is more useful than nothing, but flag it.
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

// Re-exported for ad-hoc setup work. Importing this from outside the
// driver is fine; the constant is just a path string with no secret
// content. The setup script uses it to write its output to a known
// default location.
export { DEFAULT_STORAGE_STATE_PATH };

// Tiny helper so the setup script (or future smoke harness) can ensure
// the parent dir exists before writing storageState. Kept here so the
// driver and the setup script share one source of truth for the path.
export async function ensureStorageStateParentDir(target = DEFAULT_STORAGE_STATE_PATH) {
  const dir = path.dirname(target);
  await mkdir(dir, { recursive: true });
  return dir;
}
