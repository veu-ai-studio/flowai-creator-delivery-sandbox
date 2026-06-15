import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'https://flowai-dun.vercel.app';
const targetUrl = 'https://saigeplatform.com';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const evidenceDir = path.resolve('docs/cto/ct2-saige-product-card-score-postdeploy-evidence-20260615');
const screenshotDir = path.join(evidenceDir, 'screenshots');

await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});

async function inspectPage(pagePath, options = {}) {
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  const responseErrors = [];
  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text().slice(0, 1000),
      location: msg.location(),
    });
  });
  page.on('pageerror', (error) => {
    pageErrors.push(String(error?.message || error).slice(0, 1000));
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      responseErrors.push({
        status,
        url: response.url(),
      });
    }
  });

  const url = `${baseUrl}${pagePath}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(options.waitMs ?? 3500);

  if (options.fillSaige) {
    const input = page.locator('input').filter({ hasText: '' }).first();
    const inputs = await page.locator('input').count();
    if (inputs > 0) {
      await page.locator('input').first().fill(targetUrl).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }

  const screenshotName = `${pagePath.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root'}-${stamp}.png`;
  const screenshotPath = path.join(screenshotDir, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const text = await page.locator('body').innerText({ timeout: 15000 }).catch(() => '');
  const buttons = await page.locator('button').evaluateAll((nodes) => nodes.map((node) => ({
    text: node.innerText,
    disabled: node.disabled,
    ariaDisabled: node.getAttribute('aria-disabled'),
  })).slice(0, 80)).catch(() => []);
  const links = await page.locator('a').evaluateAll((nodes) => nodes.map((node) => ({
    text: node.innerText,
    href: node.href,
  })).slice(0, 80)).catch(() => []);

  await page.close();
  return {
    path: pagePath,
    url,
    screenshotPath,
    text,
    containsSaige: /saige/i.test(text),
    numericScoreMatches: Array.from(text.matchAll(/\b\d+(?:\.\d+)?\s*\/\s*(?:10|100)\b/g)).map((match) => match[0]),
    consoleMessages,
    pageErrors,
    responseErrors,
    hasGFilterError: consoleMessages.some((item) => /g\.filter is not a function/i.test(item.text))
      || pageErrors.some((item) => /g\.filter is not a function/i.test(item)),
    buttons,
    links,
  };
}

const apiProducts = await fetch(`${baseUrl}/api/products`)
  .then(async (response) => ({
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  }))
  .catch((error) => ({ ok: false, status: null, body: String(error?.message || error) }));

const apiVersion = await fetch(`${baseUrl}/api/version`).then((response) => response.json());
const apiHealth = await fetch(`${baseUrl}/api/health`).then((response) => response.json());

const pages = [];
for (const item of [
  ['/portfolio', {}],
  ['/dashboard', {}],
  ['/products', {}],
  ['/flow-hub/production', { waitMs: 3500 }],
  ['/flowai', { fillSaige: true, waitMs: 3500 }],
]) {
  pages.push(await inspectPage(item[0], item[1]));
}

const result = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  targetUrl,
  apiVersion,
  apiHealth: {
    ok: apiHealth.ok,
    status: apiHealth.status,
    commitFull: apiHealth.checks?.build?.commitFull,
    branch: apiHealth.checks?.build?.branch,
    clerkReady: apiHealth.clerkReady,
    githubAppReady: apiHealth.githubAppReady,
    inngestReady: apiHealth.inngestReady,
  },
  apiProducts: {
    ok: apiProducts.ok,
    status: apiProducts.status,
    bodySnippet: apiProducts.body.slice(0, 4000),
    hasSaige: /saige/i.test(apiProducts.body),
    numericScoreMatches: Array.from(apiProducts.body.matchAll(/\b\d+(?:\.\d+)?\b/g)).map((match) => match[0]).slice(0, 40),
  },
  pages,
};

await fs.writeFile(
  path.join(evidenceDir, `ct2-saige-product-card-score-postdeploy-raw-${stamp}.json`),
  JSON.stringify(result, null, 2),
);

console.log(JSON.stringify({
  checkedAt: result.checkedAt,
  commitFull: result.apiVersion.commitFull,
  apiProducts: result.apiProducts,
  pages: result.pages.map((page) => ({
    path: page.path,
    containsSaige: page.containsSaige,
    numericScoreMatches: page.numericScoreMatches,
    hasGFilterError: page.hasGFilterError,
    responseErrors: page.responseErrors,
    screenshotPath: page.screenshotPath,
    textSnippet: page.text.slice(0, 1200),
    launchForgeButtons: page.buttons.filter((button) => /launch forge|forge/i.test(button.text)),
  })),
}, null, 2));

await browser.close();
