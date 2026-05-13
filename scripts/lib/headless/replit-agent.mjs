// scripts/lib/headless/replit-agent.mjs
//
// Slot 9 driver — Replit Agent via Playwright.
//
// Path 9a: reuse the CEO's authenticated Replit session by loading a
// pre-saved Playwright storageState file. The one-time setup that
// generates the storageState file is scripts/setup-replit-session.mjs.
//
// Public shape (single export):
//
//   await callReplitAgent({ prompt, timeoutMs })
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
// Differences from Slot 8 (Base44):
//   - Replit agent responses are MUCH longer (multi-paragraph reasoning,
//     code blocks) and stream over 30–90 s. We poll every 1000 ms and
//     require 3 consecutive stable polls (≈3 s of quiet) before
//     declaring the response complete. Base44 uses 500 ms × 2.
//   - Replit emits reasoning + code as separate blocks in some flows.
//     The assistant-bubble extractor collects ALL text descendants of
//     the last response container and concatenates them with newlines
//     instead of returning a single .innerText.
//   - Default per-call timeout budget should be ≥ 120_000 ms (caller
//     responsibility — this driver honors whatever timeoutMs it gets).

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const DEFAULT_STORAGE_STATE_PATH = path.join(
  homedir(),
  '.flowai',
  'replit-storage-state.json',
);

// Probe targets, tried in order. We start at the agent-direct URL and
// fall back to the workspace shell + marketing root.
const REPLIT_PROBE_URLS = [
  'https://replit.com/agent',
  'https://replit.com/~',
  'https://replit.com',
];

// Heuristic input selectors, tried in order. Replit's Agent prompt input
// is a contenteditable / textarea — the placeholders below match the
// observed patterns on the agent landing surface.
const INPUT_SELECTOR_HEURISTICS = [
  'textarea[placeholder*="ask" i]',
  'textarea[placeholder*="build" i]',
  'textarea[placeholder*="describe" i]',
  'textarea[placeholder*="agent" i]',
  '[contenteditable="true"][aria-label*="ask" i]',
  '[contenteditable="true"][aria-label*="build" i]',
  '[contenteditable="true"][aria-label*="describe" i]',
  '[contenteditable="true"][aria-label*="agent" i]',
  '[contenteditable="true"][data-placeholder*="ask" i]',
  '[contenteditable="true"][data-placeholder*="build" i]',
  '[role="textbox"][autofocus]',
  '[role="textbox"]:focus',
  '[contenteditable="true"]:not([aria-hidden])',
];

// Selectors that, if visible, mean a response is still streaming. When
// they ALL disappear AND the assistant-bubble text is stable across
// STABILITY_REQUIRED_POLLS, we consider the response complete.
const STREAMING_SELECTOR_HEURISTICS = [
  'button[aria-label*="Stop" i]',
  'button[aria-label*="stop generating" i]',
  'button:has-text("Stop")',
  '[data-state="streaming"]',
  '[data-streaming="true"]',
  '[aria-live="polite"] [data-streaming="true"]',
  '.streaming-indicator',
  '.typing-indicator',
  '.cursor-blink',
];

// Assistant-response containers, tried in order. We collect the LAST
// matching container and concatenate text descendants — Replit may emit
// reasoning prose + code blocks as separate children.
const ASSISTANT_CONTAINER_HEURISTICS = [
  '[data-role="assistant"]',
  '[data-message-role="assistant"]',
  '[data-author="assistant"]',
  '[role="article"][data-author-role="assistant"]',
  '[class*="assistant-message" i]',
  '[class*="agent-response" i]',
  '[class*="message"][class*="assistant" i]',
  '[class*="message-content" i]',
];

const PROBE_NAVIGATION_BUDGET_MS = 30_000;
const NETWORK_IDLE_BUDGET_MS = 20_000;
const POLL_INTERVAL_MS = 1_000;
const STABILITY_REQUIRED_POLLS = 3;

export async function callReplitAgent({ prompt, timeoutMs }) {
  const t0 = Date.now();
  const storageStatePath =
    process.env.REPLIT_STORAGE_STATE_PATH || DEFAULT_STORAGE_STATE_PATH;

  if (!existsSync(storageStatePath)) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - t0,
      error: 'storage_state_missing — run scripts/setup-replit-session.mjs first',
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

    // Probe candidate URLs in order. Stop at the first that loads + reveals
    // an input selector within its budget.
    const inputBudgetMs = Math.min(15_000, Math.floor(timeoutMs / 4));
    let matchedInputSelector = null;
    let matchedProbeUrl = null;
    for (const probeUrl of REPLIT_PROBE_URLS) {
      try {
        await page.goto(probeUrl, {
          waitUntil: 'domcontentloaded',
          timeout: Math.min(
            PROBE_NAVIGATION_BUDGET_MS,
            Math.floor(timeoutMs / 3),
          ),
        });
      } catch {
        continue; // try next probe url
      }
      await page
        .waitForLoadState('networkidle', {
          timeout: Math.min(NETWORK_IDLE_BUDGET_MS, Math.floor(timeoutMs / 4)),
        })
        .catch(() => { /* not fatal */ });

      matchedInputSelector = await findFirstVisible(
        page,
        INPUT_SELECTOR_HEURISTICS,
        inputBudgetMs,
      );
      if (matchedInputSelector) {
        matchedProbeUrl = probeUrl;
        break;
      }
    }

    if (!matchedInputSelector) {
      return {
        ok: false,
        response: null,
        latencyMs: Date.now() - t0,
        error:
          'selector_drift: no agent prompt input matched the heuristic set ' +
          'across all probe URLs (session expired or UI changed)',
      };
    }

    // Type + submit. Try contenteditable-friendly fill first; fall back to
    // direct keyboard input if .fill() rejects (some contenteditables do).
    const inputHandle = page.locator(matchedInputSelector).first();
    try {
      await inputHandle.click({ timeout: 5_000 });
      await inputHandle.fill(prompt, { timeout: 5_000 });
    } catch {
      await inputHandle.click({ timeout: 5_000 }).catch(() => { /* try anyway */ });
      await page.keyboard.type(prompt, { delay: 5 });
    }

    // Prefer the visible submit button if present (Replit sometimes
    // ignores bare Enter on contenteditable). Fall back to Enter.
    const submitSelectors = [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[type="submit"]',
    ];
    let submitted = false;
    for (const sel of submitSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 200 })) {
          await btn.click({ timeout: 3_000 });
          submitted = true;
          break;
        }
      } catch { /* try next */ }
    }
    if (!submitted) {
      await page.keyboard.press('Enter');
    }

    // Poll for response stability. Replit can stream 30–90 s; the caller's
    // timeoutMs gates us. We require STABILITY_REQUIRED_POLLS quiet polls
    // AND no streaming indicator.
    const responseDeadline = t0 + timeoutMs;
    let lastText = '';
    let stableCount = 0;
    let captured = null;

    while (Date.now() < responseDeadline) {
      await page.waitForTimeout(POLL_INTERVAL_MS);
      const streaming = await isStillStreaming(page);
      const text = await scrapeLatestAssistantContainer(page);
      if (text == null) {
        // No container yet — keep waiting; the agent may still be
        // rendering its first token.
        continue;
      }
      if (text === lastText && !streaming) {
        stableCount += 1;
        if (stableCount >= STABILITY_REQUIRED_POLLS) {
          captured = text;
          break;
        }
      } else {
        stableCount = 0;
        lastText = text;
      }
    }

    if (captured == null) {
      if (lastText) {
        // Return the last non-stable text rather than dropping it.
        // Truncation is more useful than nothing, but flag it.
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
          'selector_drift: no assistant response matched the heuristic set ' +
          `(probe=${matchedProbeUrl}; UI changed or response never started)`,
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

// Replit may render reasoning prose + code blocks as separate children of
// the assistant container. We grab the LAST matching container and join
// the innerText of each direct + indirect child with newlines so neither
// prose nor code is lost. If no container matches, return null.
async function scrapeLatestAssistantContainer(page) {
  for (const sel of ASSISTANT_CONTAINER_HEURISTICS) {
    try {
      const matches = page.locator(sel);
      const count = await matches.count();
      if (count === 0) continue;
      const last = matches.nth(count - 1);
      // .innerText already concatenates descendants in DOM order with
      // line breaks for block elements, which is exactly what we want
      // for prose + code-block extraction. Trim and reject empties.
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
