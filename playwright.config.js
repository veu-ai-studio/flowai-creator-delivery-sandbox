// Playwright config — FlowAI Self-Adversarial Test Plan §11.1
//
// Three viewports per LD-5 (mobile 375×667, tablet 768×1024, desktop 1440×900;
// note the plan §4.3 uses 1920×1080 desktop — kept as the canonical width in spec,
// but Playwright project widths reflect what the harness actually drives).
// LD-1: high-risk adversarial cases target dev-SUT only; non-high-risk also
// run against dev-SUT on the first execution per dispatch direction.

import { defineConfig, devices } from '@playwright/test';

const DEV_SUT_URL = process.env.FLOWAI_DEV_SUT_URL || 'http://localhost:5173';
const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const E2E_LIFECYCLE_EVENTS = new Set(['test:e2e', 'test:e2e:ci']);
const shouldStartE2eServer = E2E_LIFECYCLE_EVENTS.has(process.env.npm_lifecycle_event || '');

export default defineConfig({
  testDir: './tests/adversarial',
  testMatch: ['**/*.spec.js'],
  fullyParallel: false,
  reporter: [
    ['list'],
    ['json', { outputFile: 'tests/adversarial/.run-results.json' }],
  ],
  use: {
    baseURL: DEV_SUT_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: process.env.X_TEST_BYPASS_TOKEN
      ? { 'X-Test-Bypass-Token': process.env.X_TEST_BYPASS_TOKEN }
      : {},
  },
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  webServer: shouldStartE2eServer
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: E2E_BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      testMatch: ['**/*.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: E2E_BASE_URL,
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: process.env.X_TEST_BYPASS_TOKEN
          ? { 'X-Test-Bypass-Token': process.env.X_TEST_BYPASS_TOKEN }
          : {},
      },
    },
  ],
});
