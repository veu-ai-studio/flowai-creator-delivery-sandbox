import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import * as clerkSdk from '@clerk/clerk-sdk-node';

const productionUrl = 'https://flowai-dun.vercel.app';
const freshBuildPublicUrl = 'https://flowai-fresh-veusite.vercel.app/';
const outDir = 'docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614';
const screenshotDir = `${outDir}/screenshots`;

mkdirSync(screenshotDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function screenshotPath(name) {
  return `${screenshotDir}/${name}-${stamp}.png`;
}

function getSecret(name) {
  const value = execFileSync(
    'doppler',
    ['secrets', 'get', name, '--project', 'flowai', '--config', 'prd', '--plain'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
  if (!value) throw new Error(`Doppler returned empty ${name}`);
  return value;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { parseError: true, text: text.slice(0, 1000) };
  }
  return { status: response.status, ok: response.ok, json };
}

async function pageSummary(page, max = 1600) {
  const title = await page.title().catch(() => '');
  const bodyText = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  return {
    title,
    url: page.url(),
    bodyText: bodyText.replace(/\s+/g, ' ').trim().slice(0, max),
  };
}

async function clickText(page, text) {
  await page.getByText(text, { exact: true }).first().click({ timeout: 10000 });
}

async function runAxisProof(browser, result) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const runRequests = [];

  page.on('request', (request) => {
    if (request.url().includes('/api/run-construction')) {
      let postData = null;
      try {
        postData = request.postDataJSON();
      } catch {
        postData = request.postData();
      }
      runRequests.push({
        url: request.url(),
        method: request.method(),
        postData,
      });
    }
  });

  const initialResponse = await page.goto(`${productionUrl}/flow-hub/production`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const initialText = await page.locator('body').innerText({ timeout: 10000 });
  const initialShot = screenshotPath('axis-production-initial');
  await page.screenshot({ path: initialShot, fullPage: true });

  await clickText(page, 'Controlled');
  await clickText(page, 'Manual');
  await clickText(page, 'Quick');
  await clickText(page, 'Production');
  await page.waitForTimeout(700);

  const selectedShot = screenshotPath('axis-selected-controlled-manual-quick');
  await page.screenshot({ path: selectedShot, fullPage: true });
  const selectedText = await page.locator('body').innerText({ timeout: 10000 });

  const urlInput = page.locator('input').filter({ hasText: '' }).first();
  const candidateInputs = await page.locator('input, textarea').count();
  let filled = false;
  for (let i = 0; i < candidateInputs; i += 1) {
    const input = page.locator('input, textarea').nth(i);
    const type = await input.getAttribute('type').catch(() => '');
    const visible = await input.isVisible().catch(() => false);
    if (!visible) continue;
    if (!type || ['text', 'url', 'search'].includes(type)) {
      await input.fill('https://saige-v2.vercel.app');
      filled = true;
      break;
    }
  }
  if (!filled) {
    await urlInput.fill('https://saige-v2.vercel.app');
  }

  const beforeRunShot = screenshotPath('axis-before-run-filled');
  await page.screenshot({ path: beforeRunShot, fullPage: true });

  const runButton = page.getByRole('button', { name: /Run FlowAI on this URL/i }).first();
  await runButton.click({ timeout: 10000 });
  await page.waitForTimeout(25000);

  const afterRunShot = screenshotPath('axis-after-run-wait');
  await page.screenshot({ path: afterRunShot, fullPage: true });
  const runText = await page.locator('body').innerText({ timeout: 10000 });

  result.axis = {
    status: initialResponse?.status() ?? null,
    visibleAxes: {
      structuralLayer: ['STRUCTURAL LAYER', 'Autonomous', 'Supervised', 'Controlled'].every((t) => initialText.includes(t)),
      operationalMode: ['OPERATIONAL MODE', 'Auto', 'Guided', 'Manual'].every((t) => initialText.includes(t)),
      analysisDepth: ['ANALYSIS DEPTH', 'Quick', 'Standard', 'Deep'].every((t) => initialText.includes(t)),
      flowHubPath: ['FLOW HUB PATH', 'Production', 'Migration', 'Fresh Build'].every((t) => initialText.includes(t)),
    },
    selectedUrl: page.url(),
    selectedSummary: {
      layerControlled: selectedText.includes('Layer: Controlled'),
      modeManual: selectedText.includes('Mode: Manual'),
      depthQuick: selectedText.includes('Depth: Quick'),
      pathProduction: selectedText.includes('Path: Production'),
    },
    runRequests,
    runLog: {
      hasAxisEnvelope: runText.includes('Flow Hub axis envelope'),
      hasAxisEnvelopeDetail: runText.includes('Flow Hub axes are normalized before execution'),
      hasFalseVerifiedClaim: /\bVERIFIED\b/.test(runText),
      hasPreviewUrlText: /preview url|deployed url|branch/i.test(runText),
      excerpt: runText.replace(/\s+/g, ' ').trim().slice(0, 4000),
    },
    screenshots: {
      initial: initialShot,
      selected: selectedShot,
      beforeRun: beforeRunShot,
      afterRun: afterRunShot,
    },
  };

  await context.close();
}

async function runFreshBuildPublicProof(browser, result) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const response = await page.goto(freshBuildPublicUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  const shot = screenshotPath('fresh-build-public-anonymous');
  await page.screenshot({ path: shot, fullPage: true });
  const summary = await pageSummary(page, 2500);
  result.freshBuildPublic = {
    status: response?.status() ?? null,
    ok: response?.ok() ?? false,
    ...summary,
    generatedSiteSignals: {
      victorUdo: /Victor Udo/i.test(summary.bodyText),
      veuAiStudio: /VEU AI Studio/i.test(summary.bodyText),
      flowAiPositioning: /FlowAI|AI Platform Builder|universal/i.test(summary.bodyText),
      vercelLogin: /Log in to Vercel|Continue with GitHub|Continue with SAML SSO/i.test(summary.bodyText),
      flowAiOperatorShell: /Flow Hub|Product-Agnostic AI Operating System|FLOW CONTROLS/i.test(summary.bodyText),
    },
    screenshot: shot,
  };
  await context.close();
}

function createClerkClient(secretKey) {
  if (typeof clerkSdk.createClerkClient === 'function') {
    return clerkSdk.createClerkClient({ secretKey });
  }
  if (clerkSdk.default?.createClerkClient) {
    return clerkSdk.default.createClerkClient({ secretKey });
  }
  return clerkSdk.clerkClient || clerkSdk.default || clerkSdk;
}

function redactApiMe(json) {
  if (!json || typeof json !== 'object') return json;
  return {
    ...json,
    userId: json.userId ? '[redacted-present]' : json.userId,
  };
}

async function runClerkProof(browser, result) {
  const secretKey = getSecret('CLERK_SECRET_KEY');
  const client = createClerkClient(secretKey);
  let rawUserId = null;
  let rawTicket = null;

  const anonymousBefore = await fetchJson(`${productionUrl}/api/me`);
  result.clerk = {
    anonymousBefore: {
      status: anonymousBefore.status,
      json: redactApiMe(anonymousBefore.json),
    },
    disposableUser: null,
    ticketRoute: null,
    clerkState: null,
    appOriginApiMe: null,
    anonymousAfter: null,
    cleanup: { attempted: false, userDeleted: false, error: null },
    secretHandling: {
      dopplerReadAttempted: true,
      clerkSecretPresentInProcess: true,
      hostedSignInTokenUrlOpened: false,
      rawTicketPrintedOrCommitted: false,
      secretPrintedOrCommitted: false,
      bearerTokenPrintedOrCommitted: false,
      authorizationHeaderValuePrintedOrCommitted: false,
      cookiesPrintedOrCommitted: false,
      passwordPrintedOrCommitted: false,
      rawClerkUserIdPrintedOrCommitted: false,
    },
  };

  try {
    const nonce = Date.now().toString(36);
    const email = `flowai.ct2.acceleration.${nonce}@example.com`;
    const password = `Ct2-${nonce}-redacted-proof-password!`;
    const user = await client.users.createUser({
      emailAddress: [email],
      password,
      skipPasswordChecks: true,
      skipPasswordRequirement: false,
      publicMetadata: { ct2Proof: 'acceleration-sweep-20260614' },
    });
    rawUserId = user.id;
    const token = await client.signInTokens.createSignInToken({
      userId: rawUserId,
      expiresInSeconds: 600,
    });
    rawTicket = token.token;
    result.clerk.disposableUser = {
      created: true,
      emailIdentifier: email.replace(`.${nonce}@`, '.[redacted]@'),
      rawUserIdPresent: Boolean(rawUserId),
      rawUserId: '[redacted]',
      rawTicketPresent: Boolean(rawTicket),
      hostedUrlPresentButNotOpened: Boolean(token.url),
    };

    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    const apiMeEventsRedacted = [];

    page.on('request', async (request) => {
      if (request.url().includes('/api/me')) {
        apiMeEventsRedacted.push({
          type: 'request',
          url: '/api/me',
          method: request.method(),
          authorizationHeaderPresent: Boolean(await request.headerValue('authorization')),
        });
      }
    });
    page.on('response', async (response) => {
      if (response.url().includes('/api/me')) {
        let redactedJson = null;
        try {
          redactedJson = redactApiMe(await response.json());
        } catch {}
        apiMeEventsRedacted.push({
          type: 'response',
          url: '/api/me',
          status: response.status(),
          redactedJson,
        });
      }
    });

    const ticketUrl = `${productionUrl}/sign-in-token?ticket=${encodeURIComponent(rawTicket)}&redirect_url=/flow-hub/production`;
    const routeResponse = await page.goto(ticketUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForURL(`${productionUrl}/flow-hub/production`, { timeout: 45000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const visibleText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    const finalUrl = page.url();
    const finalUrlHasTicket = finalUrl.includes(rawTicket) || /ticket=/.test(finalUrl);
    const visibleTextContainsTicket = visibleText.includes(rawTicket);
    const shot = screenshotPath('clerk-ticket-final-scrubbed-flow-hub');
    const screenshotSkipped = finalUrlHasTicket || visibleTextContainsTicket;
    if (!screenshotSkipped) {
      await page.screenshot({ path: shot, fullPage: true });
    }

    result.clerk.ticketRoute = {
      status: routeResponse?.status() ?? null,
      finalUrlClass: finalUrl.replace(rawTicket, '<redacted>'),
      sameOriginFinal: finalUrl.startsWith(productionUrl),
      finalPathIsFlowHub: finalUrl === `${productionUrl}/flow-hub/production`,
      finalUrlHasTicket,
      visibleTextContainsTicket,
      pageDoesNotExposeTicket: !finalUrlHasTicket && !visibleTextContainsTicket,
      addressBarScrubbed: !finalUrlHasTicket && !/ticket=/.test(finalUrl),
      flowHubLoaded: visibleText.includes('Flow Hub - Production') || visibleText.includes('FlowAI Ready'),
      visibleTextExcerpt: visibleText.replace(/\s+/g, ' ').trim().slice(0, 1800),
      screenshot: screenshotSkipped ? null : shot,
      screenshotSkipped,
      screenshotSkipReason: screenshotSkipped ? 'ticket visible in URL or page text' : null,
    };

    const clerkState = await page.evaluate(async () => {
      const clerk = window.Clerk;
      const session = clerk?.session || null;
      let tokenPresent = false;
      let tokenError = null;
      try {
        const token = session?.getToken ? await session.getToken() : null;
        tokenPresent = Boolean(token);
      } catch (error) {
        tokenError = error?.message || String(error);
      }
      return {
        clerkLoaded: Boolean(clerk?.loaded),
        signedIn: Boolean(clerk?.user && session),
        sessionPresent: Boolean(session),
        userPresent: Boolean(clerk?.user),
        tokenPresent,
        tokenError,
      };
    });
    result.clerk.clerkState = clerkState;

    const appOriginApiMe = await page.evaluate(async () => {
      const token = await window.Clerk?.session?.getToken?.();
      if (!token) {
        return { ok: false, status: null, tokenPresent: false, redactedJson: null };
      }
      const response = await fetch('/api/me', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        tokenPresent: true,
        redactedJson: {
          ...json,
          userId: json.userId ? '[redacted-present]' : json.userId,
        },
      };
    });
    result.clerk.appOriginApiMe = {
      approach: 'FlowAI app-origin JavaScript obtained Clerk session token and fetched /api/me with Authorization header; token value redacted and not stored',
      ...appOriginApiMe,
      apiMeEventsRedacted,
    };

    const appOriginShot = screenshotPath('clerk-after-app-origin-api-me');
    if (!screenshotSkipped) {
      await page.screenshot({ path: appOriginShot, fullPage: true });
      result.clerk.appOriginApiMe.screenshot = appOriginShot;
    }

    await context.close();
  } finally {
    if (rawUserId) {
      result.clerk.cleanup.attempted = true;
      try {
        await client.users.deleteUser(rawUserId);
        result.clerk.cleanup.userDeleted = true;
      } catch (error) {
        result.clerk.cleanup.error = error?.message || String(error);
      }
    }
    const anonymousAfter = await fetchJson(`${productionUrl}/api/me`);
    result.clerk.anonymousAfter = {
      status: anonymousAfter.status,
      json: redactApiMe(anonymousAfter.json),
    };
  }
}

async function run() {
  const result = {
    startedAt: new Date().toISOString(),
    method: 'Playwright Chromium fresh browser contexts; in-app Browser unavailable in local Windows sandbox',
    productionUrl,
    freshBuildPublicUrl,
    health: await fetchJson(`${productionUrl}/api/health`),
    version: await fetchJson(`${productionUrl}/api/version`),
  };

  const browser = await chromium.launch({ headless: true });
  try {
    await runAxisProof(browser, result);
    await runClerkProof(browser, result);
    await runFreshBuildPublicProof(browser, result);
  } finally {
    await browser.close();
  }

  result.completedAt = new Date().toISOString();
  result.verdictInputs = {
    healthVersionCoherent: result.health?.json?.commitFull && result.health?.json?.commitFull === result.version?.json?.commitFull,
    clerkReady: result.health?.json?.clerkReady === true || result.version?.json?.clerkReady === true,
    axesVisible: result.axis && Object.values(result.axis.visibleAxes).every(Boolean),
    axesSelected: result.axis && Object.values(result.axis.selectedSummary).every(Boolean),
    axisRunRequestEnvelope: result.axis?.runRequests?.some((request) => {
      const data = request.postData || {};
      return data.structuralLayer === 'controlled'
        && data.operationalMode === 'manual'
        && data.analysisDepth === 'quick'
        && data.flowHubPath === 'production';
    }),
    axisRunLogEnvelope: Boolean(result.axis?.runLog?.hasAxisEnvelope && result.axis?.runLog?.hasAxisEnvelopeDetail),
    noFalseRuntimeClaim: Boolean(result.axis && !result.axis.runLog.hasFalseVerifiedClaim && !result.axis.runLog.hasPreviewUrlText),
    clerkTicketPass: Boolean(
      result.clerk?.ticketRoute?.finalPathIsFlowHub
        && result.clerk?.ticketRoute?.pageDoesNotExposeTicket
        && result.clerk?.clerkState?.signedIn
        && result.clerk?.appOriginApiMe?.redactedJson?.authenticated === true
        && result.clerk?.appOriginApiMe?.redactedJson?.authMode === 'clerk'
        && result.clerk?.anonymousAfter?.json?.authenticated === false
        && result.clerk?.cleanup?.userDeleted
    ),
    freshBuildPublicPass: Boolean(
      result.freshBuildPublic?.status === 200
        && result.freshBuildPublic?.generatedSiteSignals?.victorUdo
        && result.freshBuildPublic?.generatedSiteSignals?.veuAiStudio
        && result.freshBuildPublic?.generatedSiteSignals?.flowAiPositioning
        && !result.freshBuildPublic?.generatedSiteSignals?.vercelLogin
        && !result.freshBuildPublic?.generatedSiteSignals?.flowAiOperatorShell
    ),
  };

  writeFileSync(`${outDir}/ct2-live-proof-sweep-acceleration-raw-20260614.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    health: { status: result.health.status, commitFull: result.health.json?.commitFull, clerkReady: result.health.json?.clerkReady },
    version: { status: result.version.status, commitFull: result.version.json?.commitFull, clerkReady: result.version.json?.clerkReady },
    axis: result.verdictInputs.axesVisible && result.verdictInputs.axesSelected && result.verdictInputs.axisRunRequestEnvelope && result.verdictInputs.axisRunLogEnvelope,
    clerk: result.verdictInputs.clerkTicketPass,
    freshBuildPublic: {
      pass: result.verdictInputs.freshBuildPublicPass,
      status: result.freshBuildPublic?.status,
      title: result.freshBuildPublic?.title,
      screenshot: result.freshBuildPublic?.screenshot,
    },
    rawEvidence: `${outDir}/ct2-live-proof-sweep-acceleration-raw-20260614.json`,
  }, null, 2));
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
