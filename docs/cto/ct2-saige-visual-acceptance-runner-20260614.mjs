import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const productionUrl = 'https://flowai-dun.vercel.app';
const outDir = 'docs/cto/ct2-saige-visual-acceptance-evidence-20260614';
const screenshotDir = `${outDir}/screenshots`;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

mkdirSync(screenshotDir, { recursive: true });

function screenshotPath(name) {
  return `${screenshotDir}/${name}-${stamp}.png`;
}

async function bodyText(page, max = 6000) {
  const text = await page.locator('body').innerText({ timeout: 15000 }).catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

async function visibleText(page, text) {
  return page.getByText(text, { exact: true }).first().isVisible({ timeout: 5000 }).catch(() => false);
}

async function gotoAndSummarize(page, path, shotName) {
  const response = await page.goto(`${productionUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const shot = screenshotPath(shotName);
  await page.screenshot({ path: shot, fullPage: true });
  return {
    path,
    url: page.url(),
    status: response?.status() ?? null,
    ok: response?.ok() ?? false,
    title: await page.title().catch(() => ''),
    text: await bodyText(page),
    screenshot: shot,
  };
}

function saigeNearbyScore(text) {
  const index = text.toLowerCase().indexOf('saige');
  if (index < 0) return { found: false, excerpt: '' };
  const excerpt = text.slice(Math.max(0, index - 250), index + 600);
  const scorePattern = /\b(?:Score|Health|Clearance|Verified CEO-95 score|Trust Score)\b.{0,160}?\b(?:\d+(?:\.\d+)?\s*\/\s*(?:10|100)|\d+(?:\.\d+)?%|\d+(?:\.\d+)?)\b/i;
  return {
    found: scorePattern.test(excerpt) && !/No score/i.test(excerpt),
    excerpt,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(String(error?.message ?? error).slice(0, 500));
  });

  const flowHub = await gotoAndSummarize(page, '/flow-hub/production', 'flow-hub-production');
  const stepLabels = [
    'Research Forge',
    'Design Forge',
    'Build Forge',
    'Quality Audit',
    'Deploy Forge',
    'Self-Renewal Forge',
    'GTM Forge',
    'Monitor Forge',
  ];
  const stepVisibility = {};
  for (const label of stepLabels) {
    stepVisibility[label] = await visibleText(page, label);
  }

  const flowai = await gotoAndSummarize(page, '/flowai', 'flowai-before-saige-fill');
  const urlInput = page.getByPlaceholder('Enter your product URL or select a registered product...');
  const inputVisible = await urlInput.isVisible({ timeout: 10000 }).catch(() => false);
  if (inputVisible) {
    await urlInput.fill('https://saigeplatform.com');
    await page.waitForTimeout(1000);
  }
  const flowaiAfterFillShot = screenshotPath('flowai-after-saige-fill');
  await page.screenshot({ path: flowaiAfterFillShot, fullPage: true });
  const flowaiAfterFillText = await bodyText(page);
  const launchButton = page.getByRole('button', { name: /^Launch Forge$/i }).first();
  const launchForgeVisible = await launchButton.isVisible({ timeout: 5000 }).catch(() => false);
  const launchForgeEnabled = launchForgeVisible
    ? await launchButton.isEnabled({ timeout: 5000 }).catch(() => false)
    : false;
  const saigeContextVisible = /SAIGE/i.test(flowaiAfterFillText)
    && /SAIGE upgrade architecture active|saige-v2|FlowAI upgrade target|SAIGE/i.test(flowaiAfterFillText);

  const portfolio = await gotoAndSummarize(page, '/portfolio', 'portfolio-dashboard');
  const dashboard = await gotoAndSummarize(page, '/dashboard', 'main-dashboard');
  const portfolioScore = saigeNearbyScore(portfolio.text);
  const dashboardScore = saigeNearbyScore(dashboard.text);

  const result = {
    productionUrl,
    checkedAt: new Date().toISOString(),
    verdict: 'PENDING',
    checks: {
      flowHubStatusOk: flowHub.ok,
      allEightSidebarStepsVisible: Object.values(stepVisibility).every(Boolean),
      launchForgeVisible,
      launchForgeEnabled,
      launchForgeSaigeContextVisible: launchForgeVisible && launchForgeEnabled && saigeContextVisible,
      saigeProductCardNumericScoreVisible: portfolioScore.found || dashboardScore.found,
    },
    pages: {
      flowHub: { ...flowHub, stepVisibility },
      flowai: {
        ...flowai,
        inputVisible,
        afterFillScreenshot: flowaiAfterFillShot,
        afterFillExcerpt: flowaiAfterFillText.slice(0, 2000),
      },
      portfolio: {
        ...portfolio,
        saigeScore: portfolioScore,
      },
      dashboard: {
        ...dashboard,
        saigeScore: dashboardScore,
      },
    },
    browserDiagnostics: {
      consoleMessages,
      pageErrors,
    },
  };

  result.verdict = Object.values(result.checks).every(Boolean) ? 'PASS' : 'BLOCK';

  writeFileSync(`${outDir}/ct2-saige-visual-acceptance-raw-20260614.json`, JSON.stringify(result, null, 2));
  await context.close();
  await browser.close();
  console.log(JSON.stringify({
    verdict: result.verdict,
    checks: result.checks,
    raw: `${outDir}/ct2-saige-visual-acceptance-raw-20260614.json`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

