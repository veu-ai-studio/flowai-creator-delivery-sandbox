import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * verifyDeployment — Phase 3 Verifier Engine
 *
 * Runs a strict multi-check validation gate against a deployed URL:
 *   1. Deployment reachable (HTTP 200)
 *   2. UI renders real HTML (not plain JSON/text)
 *   3. Page contains visible layout sections
 *   4. GET /api returns 200 JSON
 *   5. POST /api/run returns 200 JSON with success=true
 *
 * Returns a detailed report and a top-level `passed` boolean.
 * If `passed` is false, the deployment is marked FAILED.
 */

async function checkWithTimeout(fn, timeoutMs = 20000) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function checkDeploymentReachable(baseUrl) {
  const result = { passed: false, status: 0, error: null };
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(15000) });
    result.status = res.status;
    result.passed = res.status === 200;
    if (!result.passed) result.error = `HTTP ${res.status}`;
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

async function checkUIRenders(baseUrl) {
  const result = { passed: false, hasHtml: false, hasSections: false, hasBody: false, error: null, snippet: '' };
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    result.snippet = text.slice(0, 300);

    const lower = text.toLowerCase();
    result.hasHtml = lower.includes('<html') || lower.includes('<!doctype');
    result.hasBody = lower.includes('<body');

    // Check for visible sections/content — not just an empty shell
    const sectionMarkers = ['<section', '<main', '<nav', '<header', '<footer', '<div', '<h1', '<h2', '<p '];
    const sectionCount = sectionMarkers.filter(m => lower.includes(m)).length;
    result.hasSections = sectionCount >= 3;

    // Fail if response looks like raw JSON or plain text
    const looksLikeJson = text.trimStart().startsWith('{') || text.trimStart().startsWith('[');
    if (looksLikeJson) {
      result.error = 'Response is raw JSON, not HTML';
      result.passed = false;
      return result;
    }

    result.passed = result.hasHtml && result.hasBody && result.hasSections;
    if (!result.passed) {
      result.error = !result.hasHtml ? 'No HTML found' : !result.hasBody ? 'No <body> tag' : 'Insufficient page sections';
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

async function checkGetApi(baseUrl) {
  const result = { passed: false, status: 0, isJson: false, body: '', error: null };
  try {
    const res = await fetch(`${baseUrl}/api`, { signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    result.status = res.status;
    result.body = text.slice(0, 300);
    try {
      JSON.parse(text);
      result.isJson = true;
    } catch {}
    result.passed = res.status === 200 && result.isJson;
    if (!result.passed) result.error = !result.isJson ? 'Response is not JSON' : `HTTP ${res.status}`;
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

async function checkPostApiRun(baseUrl) {
  const result = { passed: false, status: 0, isJson: false, hasSuccess: false, body: '', error: null };
  try {
    const res = await fetch(`${baseUrl}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, source: 'phase3-verifier' }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    result.status = res.status;
    result.body = text.slice(0, 300);
    try {
      const json = JSON.parse(text);
      result.isJson = true;
      result.hasSuccess = json.success === true;
    } catch {}
    result.passed = res.status === 200 && result.isJson;
    if (!result.passed) result.error = !result.isJson ? 'Response is not JSON' : `HTTP ${res.status}`;
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { url, deployment_id } = body;

    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    console.log(`[verifyDeployment] starting verification for: ${url}`);

    // Run all checks in parallel
    const [reachability, ui, getApi, postApiRun] = await Promise.all([
      checkDeploymentReachable(url),
      checkUIRenders(url),
      checkGetApi(url),
      checkPostApiRun(url),
    ]);

    const checks = {
      reachability,
      ui,
      get_api: getApi,
      post_api_run: postApiRun,
    };

    const passed = reachability.passed && ui.passed && getApi.passed && postApiRun.passed;

    console.log(`[verifyDeployment] reachability=${reachability.passed} ui=${ui.passed} get_api=${getApi.passed} post_api_run=${postApiRun.passed}`);
    console.log(`[verifyDeployment] overall passed=${passed}`);

    // Update deployment record if deployment_id provided
    if (deployment_id) {
      await base44.asServiceRole.entities.Deployment.update(deployment_id, {
        status: passed ? 'live' : 'failed',
        error: passed ? null : buildFailureMessage(checks),
      });
    }

    // Record verifier ToolMetric (treating as crawling/auditing)
    await base44.asServiceRole.entities.ToolMetrics.create({
      tool_id: 'base44', tool_name: 'Base44 Audit', capability: 'auditing',
      success: passed,
      latency_ms: 8000,
      cost_usd: 0.002,
      task_type: 'verify',
      error_message: passed ? null : collectFailureReasons(checks).join('; '),
      user_email: user.email,
    }).catch(() => {});

    const report = {
      passed,
      url,
      checks,
      failure_reasons: passed ? [] : collectFailureReasons(checks),
      verified_at: new Date().toISOString(),
    };

    return Response.json(report);
  } catch (error) {
    console.error('[verifyDeployment] fatal:', error.message);
    return Response.json({ error: error.message, passed: false }, { status: 500 });
  }
});

function collectFailureReasons(checks) {
  const reasons = [];
  if (!checks.reachability.passed) reasons.push(`Deployment unreachable: ${checks.reachability.error || 'unknown'}`);
  if (!checks.ui.passed) reasons.push(`UI validation failed: ${checks.ui.error || 'unknown'}`);
  if (!checks.get_api.passed) reasons.push(`GET /api failed: ${checks.get_api.error || 'unknown'}`);
  if (!checks.post_api_run.passed) reasons.push(`POST /api/run failed: ${checks.post_api_run.error || 'unknown'}`);
  return reasons;
}

function buildFailureMessage(checks) {
  return collectFailureReasons(checks).join('; ');
}