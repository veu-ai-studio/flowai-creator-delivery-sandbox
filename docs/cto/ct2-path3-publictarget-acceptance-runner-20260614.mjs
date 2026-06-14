import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const targetUrl = 'https://flowai-fresh-public-veusite.vercel.app';
const outDir = 'docs/cto/ct2-path3-publictarget-acceptance-evidence-20260614';
const screenshotDir = `${outDir}/screenshots`;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

mkdirSync(screenshotDir, { recursive: true });

function pathFor(name) {
  return `${screenshotDir}/${name}-${stamp}.png`;
}

async function bodyText(page, max = 3000) {
  const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  const result = {
    targetUrl,
    checkedAt: new Date().toISOString(),
    method: 'Fresh anonymous Playwright Chromium context; no Vercel bypass header; no cookies/tokens/secrets supplied.',
    requestHeaders: {
      vercelBypassHeaderUsed: false,
    },
  };

  const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

  const initialScreenshot = pathFor('publictarget-initial');
  await page.screenshot({ path: initialScreenshot, fullPage: true });
  const initialText = await bodyText(page);

  result.initial = {
    status: response?.status() ?? null,
    ok: response?.ok() ?? false,
    title: await page.title().catch(() => ''),
    finalUrl: page.url(),
    bodyText: initialText,
    signals: {
      victorUdo: /Victor Udo/i.test(initialText),
      veuAiStudio: /VEU AI Studio/i.test(initialText),
      flowAiPositioning: /FlowAI|universal AI product upgrade engine|AI Platform Builder/i.test(initialText),
      vercelProtection: /Log in to Vercel|Continue with GitHub|Continue with SAML SSO|Vercel Authentication/i.test(initialText),
      operatorShell: /Product-Agnostic AI Operating System|FLOW CONTROLS|Flow Hub - Production|STRUCTURAL LAYER|OPERATIONAL MODE/i.test(initialText),
      blankViteShell: initialText.length < 80 || /Vite \+ React/i.test(initialText),
    },
    screenshot: initialScreenshot,
  };

  const clicked = [];
  const linkLocators = [
    page.getByRole('link', { name: /VEU AI Studio/i }).first(),
    page.getByRole('link', { name: /About/i }).first(),
    page.getByRole('link', { name: /Contact/i }).first(),
  ];

  for (let index = 0; index < linkLocators.length; index += 1) {
    const locator = linkLocators[index];
    const visible = await locator.isVisible().catch(() => false);
    if (!visible) {
      clicked.push({ index, attempted: false, reason: 'link not visible' });
      continue;
    }
    const before = page.url();
    let error = null;
    try {
      await locator.click({ timeout: 7000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
    } catch (err) {
      error = err?.message || String(err);
    }
    const text = await bodyText(page, 1200);
    clicked.push({
      index,
      attempted: true,
      before,
      after: page.url(),
      error,
      pageStillRendered: text.length > 80,
      operatorShellAfterClick: /Product-Agnostic AI Operating System|FLOW CONTROLS|Flow Hub - Production/i.test(text),
      vercelProtectionAfterClick: /Log in to Vercel|Continue with GitHub|Continue with SAML SSO/i.test(text),
    });
  }

  const afterClicksScreenshot = pathFor('publictarget-after-route-clicks');
  await page.screenshot({ path: afterClicksScreenshot, fullPage: true });

  result.routeClicks = {
    clicked,
    screenshot: afterClicksScreenshot,
  };

  await context.close();
  await browser.close();

  writeFileSync(`${outDir}/ct2-path3-publictarget-browser-raw-20260614.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    status: result.initial.status,
    title: result.initial.title,
    finalUrl: result.initial.finalUrl,
    passSignals: result.initial.signals,
    initialScreenshot,
    rawEvidence: `${outDir}/ct2-path3-publictarget-browser-raw-20260614.json`,
  }, null, 2));
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
