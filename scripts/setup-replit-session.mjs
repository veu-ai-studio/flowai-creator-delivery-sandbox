// scripts/setup-replit-session.mjs
//
// ONE-TIME interactive setup for Slot 9 (Replit Agent headless adapter).
//
// What this does:
//   1. Prints a Google-OAuth warning (Replit-controlled browsers cannot
//      always complete Google sign-in).
//   2. Launches a visible (headless: false) Chromium window.
//   3. Navigates to https://replit.com/login.
//   4. Waits for you to sign in manually and land on the Agent prompt
//      screen (or your default workspace).
//   5. On Enter in this terminal, saves the browser context's
//      storageState JSON to
//      %USERPROFILE%\.flowai\replit-storage-state.json
//      (creates ~/.flowai if missing).
//   6. Closes the browser.
//
// Why:
//   Replit Agent has no public chat API. Slot 9 reuses your authenticated
//   session by loading this storageState file. Future panel runs use the
//   saved state without prompting until it expires.
//
// To re-run setup: just run this script again — it overwrites the file.
//
// Constraints:
//   - This is one of two scripts that may use headless: false (the other
//     is setup-base44-session.mjs).
//   - Never log credentials, cookies, or storageState contents.
//   - On any failure, leave the existing storageState file (if any)
//     untouched.

import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import {
  DEFAULT_STORAGE_STATE_PATH,
  ensureStorageStateParentDir,
} from './lib/headless/replit-agent.mjs';

const SETUP_URL = 'https://replit.com/login';

function waitForEnter(promptText) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    process.stdout.write(promptText);
    rl.once('line', () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const target =
    process.env.REPLIT_STORAGE_STATE_PATH || DEFAULT_STORAGE_STATE_PATH;

  // Google-OAuth warning — print BEFORE launching the browser so the
  // operator can abort if email/password isn't an option for them.
  process.stdout.write(
    '\n' +
    '┌─────────────────────────── WARNING ───────────────────────────┐\n' +
    '│ If your Replit account uses Google sign-in, this setup MAY     │\n' +
    '│ fail at the Google OAuth step. Google blocks sign-in from      │\n' +
    '│ automation-controlled browsers (Playwright triggers the block).│\n' +
    '│                                                                │\n' +
    '│ Recommended path: use Replit email/password login if available │\n' +
    '│ — link an email/password to your account via                   │\n' +
    '│   https://replit.com/account → Connected Services.             │\n' +
    '│                                                                │\n' +
    '│ Fallback options if email/password is unavailable:             │\n' +
    '│  (a) Use GitHub sign-in instead (no automation block as of     │\n' +
    '│      2026-05); GitHub login screen will accept Playwright.     │\n' +
    '│  (b) Capture the session manually in your normal browser and   │\n' +
    '│      copy cookies into a storageState file. Contact W03 for    │\n' +
    '│      the manual-cookie-export procedure (mirrors the 8b path   │\n' +
    '│      for Base44).                                              │\n' +
    '│  (c) Defer Slot 9 entirely and run the Panel at 9/10.          │\n' +
    '└────────────────────────────────────────────────────────────────┘\n' +
    '\n',
  );

  process.stdout.write(
    `setup-replit-session: storageState will be saved to:\n  ${target}\n`,
  );
  if (existsSync(target)) {
    process.stdout.write(
      '  (an existing storageState file is present and will be overwritten ' +
      'on success)\n',
    );
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (e) {
    process.stderr.write(
      `setup-replit-session: failed to import playwright — ${e?.message ?? e}\n`,
    );
    process.exit(1);
  }

  process.stdout.write(
    '\nLaunching a visible Chromium window. Sign into Replit and navigate ' +
    'to Replit Agent (or your default workspace).\n',
  );

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(SETUP_URL, { waitUntil: 'domcontentloaded' });

  await waitForEnter(
    'Log into Replit in the browser window. Navigate to Replit Agent (or ' +
    "your default workspace). Press Enter in this terminal when you're " +
    'logged in and at the agent prompt screen: ',
  );

  try {
    await ensureStorageStateParentDir(target);
    // Playwright's storageState() returns a JSON-serializable object that
    // contains cookies + origins + localStorage. Persist via writeFile so
    // we control the path.
    const state = await context.storageState();
    await writeFile(target, JSON.stringify(state, null, 2) + '\n', {
      encoding: 'utf8',
    });
    process.stdout.write(
      '\nStorage state saved. Slot 9 should now be able to authenticate. ' +
      'Run scripts/run-panel-smoke.mjs to verify.\n',
    );
  } catch (e) {
    process.stderr.write(
      `setup-replit-session: failed to save storageState — ${e?.message ?? e}\n`,
    );
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => { /* ignore */ });
    await browser.close().catch(() => { /* ignore */ });
  }
}

main().catch((e) => {
  process.stderr.write(
    `setup-replit-session: unexpected error — ${e?.message ?? e}\n`,
  );
  process.exit(1);
});
