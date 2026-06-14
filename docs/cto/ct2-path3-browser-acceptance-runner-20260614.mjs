import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const targetUrl = 'https://flowai-qia5zr2ag-veu-ai-studio.vercel.app';
const outDir = 'docs/cto/ct2-path3-fresh-build-clean-tree-acceptance-screenshots-20260614';

mkdirSync(outDir, { recursive: true });

function getBypassSecret() {
  const value = execFileSync(
    'doppler',
    ['secrets', 'get', 'VERCEL_AUTOMATION_BYPASS_SECRET', '--project', 'flowai', '--config', 'prd', '--plain'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
  if (!value) {
    throw new Error('Doppler returned an empty bypass secret');
  }
  return value;
}

async function snapshotPage(page, label) {
  await page.screenshot({ path: `${outDir}/${label}.png`, fullPage: true });
  const title = await page.title().catch(() => '');
  const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
  return {
    title,
    url: page.url(),
    bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 1500),
    screenshot: `${outDir}/${label}.png`,
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const result = {
    targetUrl,
    checkedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 1000 },
  };

  const anonymousContext = await browser.newContext({ viewport: result.viewport });
  const anonymousPage = await anonymousContext.newPage();
  const anonymousResponse = await anonymousPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await anonymousPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  result.anonymous = {
    status: anonymousResponse?.status() ?? null,
    ...(await snapshotPage(anonymousPage, 'anonymous-negative')),
  };
  await anonymousContext.close();

  const bypassSecret = getBypassSecret();
  const bypassContext = await browser.newContext({
    viewport: result.viewport,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': bypassSecret,
    },
  });
  const bypassPage = await bypassContext.newPage();
  const bypassResponse = await bypassPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await bypassPage.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  result.bypass = {
    status: bypassResponse?.status() ?? null,
    ...(await snapshotPage(bypassPage, 'bypass-positive')),
  };
  await bypassContext.close();

  await browser.close();

  writeFileSync(
    `${outDir}/browser-result.json`,
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );

  console.log(JSON.stringify({
    targetUrl: result.targetUrl,
    checkedAt: result.checkedAt,
    anonymous: {
      status: result.anonymous.status,
      title: result.anonymous.title,
      screenshot: result.anonymous.screenshot,
      bodyText: result.anonymous.bodyText,
    },
    bypass: {
      status: result.bypass.status,
      title: result.bypass.title,
      screenshot: result.bypass.screenshot,
      bodyText: result.bypass.bodyText,
    },
  }, null, 2));
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
