import { expect, test } from '@playwright/test';

const RUN_ID = 'run_nonprod_stop_proof';
const URL = 'https://example.com';

const authContext = {
  authenticated: true,
  userId: 'user_nonprod',
  orgId: 'org_nonprod',
  productId: 'flowai',
  authMode: 'test',
  config: { authRequired: true },
};

function eightStepEvidence() {
  return ['research', 'design', 'build', 'qa_audit', 'deploy', 'self_renewal', 'gtm', 'monitor']
    .reduce((acc, key) => ({ ...acc, [key]: { status: 'complete', summary: `${key} evidence` } }), {});
}

async function mockAuth(page) {
  await page.route('**/api/me', (route) => route.fulfill({ status: 200, json: authContext }));
  await page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'degraded' } }));
}

test('legacy Auto Runner route cannot replay stored work on direct navigation or remount', async ({ page }) => {
  await mockAuth(page);
  let executeCalls = 0;
  await page.route('**/api/runs', (route) => route.fulfill({ status: 200, json: { runs: [] } }));
  await page.route('**/api/agent/3/execute', (route) => {
    executeCalls += 1;
    return route.fulfill({ status: 500, json: { ok: false, error: 'unexpected_dispatch' } });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('flowai_session_config', JSON.stringify({
      launchNonce: 'stale-legacy-nonce',
      inputs: [{ id: 1, type: 'url', value: 'https://example.com', name: 'Input A' }],
      objective: 'Stale legacy configuration must not execute',
    }));
  });

  await page.goto('/auto-runner', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/flowai\?mode=auto$/);
  await expect(page.getByRole('button', { name: 'START NEW RUN', exact: true })).toBeDisabled();
  expect(executeCalls).toBe(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/flowai\?mode=auto$/);
  await expect(page.getByRole('button', { name: 'START NEW RUN', exact: true })).toBeDisabled();
  expect(executeCalls).toBe(0);
});

test('Run A: active controls rehydrate and Stop remains durable after remount and refresh', async ({ page }) => {
  await mockAuth(page);
  let status = 'running';
  let stopCalls = 0;
  const row = () => ({
    id: RUN_ID,
    status,
    product: 'Non-production Stop Proof',
    url: URL,
    createdAt: '2026-08-04T10:00:00.000Z',
    startedAt: '2026-08-04T10:00:01.000Z',
    completedAt: status === 'cancelled' ? '2026-08-04T10:01:00.000Z' : null,
    progressLabel: status === 'cancelled' ? 'Cancelled by operator' : 'Research running',
    stepResults: { research: { status: 'running', summary: 'Research running' } },
    stepCount: 1,
    verdict: status === 'cancelled' ? 'USER_STOPPED' : null,
  });
  await page.route('**/api/runs', (route) => route.fulfill({ status: 200, json: { runs: [row()] } }));
  await page.route('**/api/agent/3/control', async (route) => {
    const body = route.request().postDataJSON();
    if (body.runId === RUN_ID && body.command === 'stop') {
      stopCalls += 1;
      status = 'cancelled';
      return route.fulfill({ status: 200, json: { ok: true, runId: RUN_ID, command: 'stop', applied: 'queued' } });
    }
    return route.fulfill({ status: 400, json: { ok: false } });
  });

  await page.goto(`/flowai?url=${encodeURIComponent(URL)}&mode=auto`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(`runId: ${RUN_ID}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'STOP', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PAUSE', exact: true })).toBeVisible();

  await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
  await page.goto(`/flowai?url=${encodeURIComponent(URL)}&mode=auto`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(`runId: ${RUN_ID}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'STOP', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText(`runId: ${RUN_ID}`)).toBeVisible();
  await page.getByRole('button', { name: 'STOP', exact: true }).click();
  await expect.poll(() => stopCalls).toBe(1);
  await expect(page.getByRole('button', { name: 'STOP', exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('button', { name: 'STOP', exact: true })).toHaveCount(0);
  expect(stopCalls).toBe(1);

  await page.goto('/runs', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Non-production Stop Proof', { exact: true })).toBeVisible();
  await expect(page.getByText('0', { exact: true }).nth(1)).toBeVisible();
});

test('Run B: terminal blocker is useful, clearance-first, and non-fabricated', async ({ page }) => {
  await mockAuth(page);
  await page.route('**/api/runs', (route) => route.fulfill({ status: 200, json: { runs: [{
    id: 'run_nonprod_blocked_proof',
    status: 'failed',
    product: 'Non-production Golden Path',
    url: URL,
    createdAt: '2026-08-04T11:00:00.000Z',
    startedAt: '2026-08-04T11:00:01.000Z',
    completedAt: '2026-08-04T11:02:00.000Z',
    score: null,
    verdict: 'NOT CLEARED',
    branchCreated: null,
    previewUrl: null,
    stepResults: eightStepEvidence(),
    stepCount: 8,
    error: {
      code: 'NO_DEPLOYED_ARTIFACT',
      message: 'Run ended without a durable deployed preview artifact.',
      failedStage: 'deploy',
      missingPrerequisite: 'An absolute browser-accessible HTTP(S) preview URL',
      whyBlocked: 'External usability cannot be verified without an artifact.',
      resolutionOwner: 'Authorized deployment operator',
      resolutionAction: 'Configure isolated preview delivery.',
      retrySafe: true,
      retryInstruction: 'Restart as a new non-production run after verification.',
      artifactConfirmation: 'No branch, preview, deployment, or public artifact is claimed for this run.',
    },
  }] } }));

  await page.goto('/runs');
  await page.getByText('Non-production Golden Path', { exact: true }).click();
  await expect(page.getByText('NOT CLEARED', { exact: true })).toBeVisible();
  await expect(page.getByText('NO_DEPLOYED_ARTIFACT', { exact: true })).toBeVisible();
  await expect(page.getByText(/Failed stage:\s*deploy/)).toBeVisible();
  await expect(page.getByText(/Missing prerequisite:/)).toBeVisible();
  await expect(page.getByText(/Resolution owner:/)).toBeVisible();
  await expect(page.getByText(/No branch, preview, deployment, or public artifact is claimed/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open deployed preview' })).toHaveCount(0);
  await expect(page.getByText('100/100', { exact: true })).toHaveCount(0);

  await page.reload();
  await page.getByText('Non-production Golden Path', { exact: true }).click();
  await expect(page.getByText('NO_DEPLOYED_ARTIFACT', { exact: true })).toBeVisible();
});

test('failed Stop reservation keeps controls live until one durable retry succeeds', async ({ page }) => {
  await mockAuth(page);
  let status = 'running';
  let attempts = 0;
  let durableReservations = 0;
  const row = () => ({
    id: 'run_nonprod_stop_retry',
    status,
    product: 'Non-production Stop Retry',
    url: URL,
    createdAt: '2026-08-04T12:00:00.000Z',
    startedAt: '2026-08-04T12:00:01.000Z',
    progressLabel: status === 'cancelled' ? 'Cancelled by operator' : 'Research running',
    stepResults: { research: { status: 'running', summary: 'Research running' } },
    stepCount: 1,
  });
  await page.route('**/api/runs', (route) => route.fulfill({ status: 200, json: { runs: [row()] } }));
  await page.route('**/api/agent/3/control', (route) => {
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 503, json: { ok: false, error: 'RUN_STORE_NOT_LIVE' } });
    durableReservations += 1;
    status = 'cancelled';
    return route.fulfill({ status: 200, json: { ok: true, command: 'stop', applied: 'queued' } });
  });

  await page.goto(`/flowai?url=${encodeURIComponent(URL)}&mode=auto`, { waitUntil: 'domcontentloaded' });
  const stop = page.getByRole('button', { name: 'STOP', exact: true });
  await expect(stop).toBeVisible();
  await stop.click();
  await expect(page.getByText(/Control failed \(HTTP 503\)/)).toBeVisible();
  await expect(stop).toBeVisible();
  expect(durableReservations).toBe(0);

  await stop.click();
  await expect.poll(() => durableReservations).toBe(1);
  await expect(stop).toHaveCount(0);
  expect(attempts).toBe(2);
});

test('unauthorized identity cannot view durable run history', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({
    status: 200,
    json: { authenticated: false, config: { authRequired: true } },
  }));
  let historyCalls = 0;
  await page.route('**/api/runs', (route) => {
    historyCalls += 1;
    return route.fulfill({ status: 401, json: { error: 'authentication_required' } });
  });
  await page.goto('/runs', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=/);
  expect(historyCalls).toBe(0);
});
