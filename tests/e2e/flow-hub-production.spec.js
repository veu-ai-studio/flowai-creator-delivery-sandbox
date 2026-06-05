import { expect, test } from '@playwright/test';

const PRODUCT_URL = 'https://example.com';

function sseFrame(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function constructionSseBody() {
  return [
    sseFrame({ type: 'start', runId: 'e2e-run', url: PRODUCT_URL, mode: 'FOREGROUND' }),
    sseFrame({
      type: 'step',
      log: {
        iteration: 1,
        step: 1,
        stepName: 'Research',
        status: 'complete',
        tool: 'Research log for example.com',
      },
    }),
    sseFrame({
      type: 'step',
      log: {
        iteration: 1,
        step: 7,
        stepName: 'Build',
        status: 'complete',
        tool: 'Build output ready from mock payload',
      },
    }),
    sseFrame({
      type: 'step',
      log: {
        iteration: 1,
        step: 12,
        stepName: 'Quality Audit',
        status: 'complete',
        tool: 'Quality Audit output ready from mock payload',
      },
    }),
    sseFrame({ type: 'final', ok: true, runId: 'e2e-run', finalScore: 91 }),
    'data: [DONE]\n\n',
  ].join('');
}

async function gotoProduction(page) {
  await page.goto('/flow-hub/production', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('Enter your product URL...')).toBeVisible();
}

async function enterUrl(page, value = PRODUCT_URL) {
  const input = page.getByPlaceholder('Enter your product URL...');
  await input.fill(value);
}

function launchButton(page) {
  return page.getByRole('button', {
    name: /Run FlowAI on this URL|Launch Auto Run|Start Guided Session/i,
  });
}

test('E2E-1: Test Fetch is neutral and non-blocking for public URL format', async ({ page }) => {
  let researchUrlCalls = 0;
  await page.route('**/api/research-url', (route) => {
    researchUrlCalls += 1;
    return route.abort();
  });

  await gotoProduction(page);
  await enterUrl(page);
  await page.getByRole('button', { name: /Test Fetch/i }).click();

  await expect(page.getByText('URL format valid — forge will attempt live crawl and stop if unreachable.')).toBeVisible();
  await expect(launchButton(page)).toBeEnabled();
  expect(researchUrlCalls).toBe(0);
});

test('E2E-2: Launch starts the pipeline and propagates example.com into research output', async ({ page }) => {
  await page.route('**/api/run-construction', (route) => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8' },
    body: constructionSseBody(),
  }));

  await gotoProduction(page);
  await enterUrl(page);
  await launchButton(page).click();

  await expect(page.getByText('8-step progress')).toBeVisible();
  await expect(page.getByText(/Research log for example\.com/i)).toBeVisible();
});

test('E2E-3: Build and Quality Audit step output areas render mocked SSE output', async ({ page }) => {
  await page.route('**/api/run-construction', (route) => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8' },
    body: constructionSseBody(),
  }));

  await gotoProduction(page);
  await enterUrl(page);
  await launchButton(page).click();

  await expect(page.getByText(/Build output ready from mock payload/i)).toBeVisible();
  await expect(page.getByText(/Quality Audit output ready from mock payload/i)).toBeVisible();
});

test('E2E-4: localhost URL is hard-blocked in the UI before launch', async ({ page }) => {
  await gotoProduction(page);
  await enterUrl(page, 'http://localhost:3000');

  await expect(page.getByText(/Hard block — this URL is not allowed by the client-side URL safety screen/i)).toBeVisible();
  await expect(launchButton(page)).toBeDisabled();
});

test('E2E-5: GUIDED mode stores session config and does not call run-construction', async ({ page }) => {
  let runConstructionCalls = 0;
  await page.route('**/api/run-construction', (route) => {
    runConstructionCalls += 1;
    return route.abort();
  });

  await gotoProduction(page);
  await enterUrl(page);
  await page.getByText('Guided', { exact: true }).click();
  await launchButton(page).click();

  await expect(page).toHaveURL(/\/guided\/research/);
  const storedConfig = await page.evaluate(() => JSON.parse(sessionStorage.getItem('flowai_session_config') || 'null'));
  expect(storedConfig?.opsMode).toBe('guided');
  expect(storedConfig?.inputs?.[0]?.value).toBe(PRODUCT_URL);
  expect(runConstructionCalls).toBe(0);
});

test('E2E-6: Deploy Forge route renders the operator-gated Step 5 surface', async ({ page }) => {
  await page.goto('/forge/deploy?productId=example-product&productName=Example%20Product', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Deploy Forge/i })).toBeVisible();
  await expect(page.getByText(/Processing: Example Product/i)).toBeVisible();
  await expect(page.getByText(/Authorized operator approval is required before deploy\/submission/i).first()).toBeVisible();
});

test('E2E-7: Self-Renewal Forge route renders the operator-gated Step 6 surface', async ({ page }) => {
  await page.goto('/forge/self-renewal?productId=example-product&productName=Example%20Product&outputUrl=https%3A%2F%2Fexample.com&auditIssuesCount=2', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Self-Renewal Forge/i })).toBeVisible();
  await expect(page.getByText(/Processing: Example Product/i)).toBeVisible();
  await expect(page.getByText(/Authorized operator approval is required before applying any renewal fix/i)).toBeVisible();
});

test('E2E-8: GTM Forge route renders the human-decision-gated Step 7 surface', async ({ page }) => {
  await page.goto('/forge/gtm?productId=example-product&productName=Example%20Product&outputUrl=https%3A%2F%2Fexample.com', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /GTM Forge/i })).toBeVisible();
  await expect(page.getByText(/Processing: Example Product/i)).toBeVisible();
  await expect(page.getByText(/Human decision log required before GTM readiness/i).first()).toBeVisible();
});

test('E2E-9: Monitor Forge route renders Step 8 and blocks healthy status before live check', async ({ page }) => {
  await page.goto('/forge/monitor?productId=example-product&productName=Example%20Product&outputUrl=https%3A%2F%2Fexample.com', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Monitor Forge/i })).toBeVisible();
  await expect(page.getByText(/Processing: Example Product/i)).toBeVisible();
  await expect(page.getByText(/Monitor cannot report healthy without a real live check/i)).toBeVisible();
});
