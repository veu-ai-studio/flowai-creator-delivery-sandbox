import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * auditDeployment — Phase 4 Audit Engine
 *
 * Analyzes a deployed app across 4 dimensions:
 *   1. UI/UX — structure, sections, accessibility basics
 *   2. API — GET /api + POST /api/run health + response quality
 *   3. Performance — response timing
 *   4. Deployment health — overall reachability + content checks
 *
 * Returns a structured report with issues[], severity, recommendations[].
 */

async function timedFetch(url, options = {}, timeoutMs = 15000) {
  const start = Date.now();
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  const duration = Date.now() - start;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, text, json, duration, status: res.status, ok: res.ok };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { url } = body;
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    console.log(`[auditDeployment] auditing: ${url}`);

    const issues = [];
    const recommendations = [];
    const metrics = {};

    // ── 1. Deployment health + UI/UX ──────────────────────────────────────
    let htmlText = '';
    let uiCheck = { reachable: false, hasHtml: false, hasSections: false, hasNav: false, hasFooter: false, hasForm: false, duration: 0, status: 0 };
    try {
      const { text, duration, status, ok } = await timedFetch(url);
      htmlText = text;
      const lower = text.toLowerCase();
      uiCheck.reachable = ok;
      uiCheck.status = status;
      uiCheck.duration = duration;
      uiCheck.hasHtml = lower.includes('<html') || lower.includes('<!doctype');
      uiCheck.hasSections = (lower.match(/<section|<main|<article/g) || []).length >= 1;
      uiCheck.hasNav = lower.includes('<nav');
      uiCheck.hasFooter = lower.includes('<footer');
      uiCheck.hasForm = lower.includes('<form');
      uiCheck.hasH1 = lower.includes('<h1');
      uiCheck.hasH2 = lower.includes('<h2');
      uiCheck.hasTailwind = lower.includes('tailwind') || lower.includes('cdn.tailwindcss');
      uiCheck.textLength = text.length;
      uiCheck.hasDashboard = lower.includes('dashboard') || lower.includes('data') && lower.includes('display');
      uiCheck.hasInputOutput = lower.includes('input') && lower.includes('output');
      uiCheck.hasAuth = lower.includes('login') || lower.includes('signup') || lower.includes('auth');
      uiCheck.hasMobileLayout = lower.includes('mobile') || lower.includes('bottom-nav');

      metrics.page_load_ms = duration;

      if (!ok) {
        issues.push({ id: 'ui_unreachable', layer: 'deployment', severity: 'critical', title: 'Deployment Unreachable', detail: `HTTP ${status}` });
      }
      if (!uiCheck.hasHtml) {
        issues.push({ id: 'ui_no_html', layer: 'ui_ux', severity: 'critical', title: 'No HTML Document', detail: 'Response does not contain HTML markup' });
        recommendations.push('Ensure index.html is properly served at the root route');
      }
      if (!uiCheck.hasNav) {
        issues.push({ id: 'ui_no_nav', layer: 'ui_ux', severity: 'warning', title: 'Missing Navigation', detail: 'No <nav> element found — users may have trouble navigating' });
        recommendations.push('Add a navigation bar with clear links to page sections');
      }
      if (!uiCheck.hasH1) {
        issues.push({ id: 'ui_no_h1', layer: 'ui_ux', severity: 'critical', title: 'Missing H1 Heading', detail: 'No primary heading found — critical for SEO and user experience' });
        recommendations.push('Add an <h1> tag with a clear product headline');
      }
      if (!uiCheck.hasFooter) {
        issues.push({ id: 'ui_no_footer', layer: 'ui_ux', severity: 'warning', title: 'Missing Footer', detail: 'No footer section found' });
        recommendations.push('Add a footer with contact info and copyright');
      }
      if (!uiCheck.hasForm) {
        issues.push({ id: 'ui_no_form', layer: 'ui_ux', severity: 'warning', title: 'No Contact Form', detail: 'No <form> element found — no user input mechanism' });
        recommendations.push('Add a contact or signup form');
      }
      if (uiCheck.textLength < 200) {
        issues.push({ id: 'ui_thin_content', layer: 'ui_ux', severity: 'critical', title: 'Critically Thin Content', detail: `Page content is only ${uiCheck.textLength} chars — app appears empty or broken` });
        recommendations.push('Add substantial content: hero section, features, pricing, contact form');
      } else if (uiCheck.textLength < 500) {
        issues.push({ id: 'ui_sparse_content', layer: 'ui_ux', severity: 'warning', title: 'Sparse Content', detail: `Page content is only ${uiCheck.textLength} chars — appears sparse` });
        recommendations.push('Add more content sections: features, pricing, testimonials');
      }
      if (duration > 3000) {
        issues.push({ id: 'perf_slow_page', layer: 'performance', severity: 'warning', title: 'Slow Page Load', detail: `Page loaded in ${duration}ms (target: <3000ms)` });
        recommendations.push('Optimize page load — reduce blocking resources');
      }
    } catch (e) {
      issues.push({ id: 'ui_fetch_error', layer: 'deployment', severity: 'critical', title: 'Page Fetch Failed', detail: e.message });
      recommendations.push('Verify deployment URL is publicly accessible');
    }

    // ── 2. API Health ────────────────────────────────────────────────────
    let apiGetCheck = { ok: false, isJson: false, duration: 0, status: 0 };
    try {
      const { ok, isJson: _, json, duration, status, text } = await timedFetch(`${url}/api`);
      apiGetCheck.ok = ok;
      apiGetCheck.status = status;
      apiGetCheck.duration = duration;
      apiGetCheck.isJson = json !== null;
      apiGetCheck.hasStatus = json?.status !== undefined;
      metrics.api_get_ms = duration;

      if (!ok || !apiGetCheck.isJson) {
        issues.push({ id: 'api_get_fail', layer: 'api', severity: 'critical', title: 'GET /api Failed', detail: `HTTP ${status} — response is ${apiGetCheck.isJson ? 'JSON' : 'not JSON'}` });
        recommendations.push('Ensure GET /api returns { status: "ok" } JSON response');
      }
      if (duration > 2000) {
        issues.push({ id: 'api_get_slow', layer: 'performance', severity: 'warning', title: 'Slow API Response (GET /api)', detail: `${duration}ms — target <2000ms` });
      }
    } catch (e) {
      issues.push({ id: 'api_get_error', layer: 'api', severity: 'critical', title: 'GET /api Unreachable', detail: e.message });
      recommendations.push('Check Vercel function deployment for api/index.js');
    }

    let apiRunCheck = { ok: false, isJson: false, hasSuccess: false, duration: 0, status: 0 };
    try {
      const { ok, json, duration, status } = await timedFetch(`${url}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, source: 'phase4-audit' }),
      });
      apiRunCheck.ok = ok;
      apiRunCheck.status = status;
      apiRunCheck.duration = duration;
      apiRunCheck.isJson = json !== null;
      apiRunCheck.hasSuccess = json?.success === true;
      metrics.api_run_ms = duration;

      if (!ok || !apiRunCheck.isJson) {
        issues.push({ id: 'api_run_fail', layer: 'api', severity: 'critical', title: 'POST /api/run Failed', detail: `HTTP ${status} — response is ${apiRunCheck.isJson ? 'JSON' : 'not JSON'}` });
        recommendations.push('Ensure POST /api/run returns { success: true, result: "..." }');
      }
      if (apiRunCheck.isJson && !apiRunCheck.hasSuccess) {
        issues.push({ id: 'api_run_no_success', layer: 'api', severity: 'warning', title: 'POST /api/run Missing success field', detail: 'Response JSON does not include success: true' });
        recommendations.push('Add success: true to the POST /api/run response body');
      }
    } catch (e) {
      issues.push({ id: 'api_run_error', layer: 'api', severity: 'critical', title: 'POST /api/run Unreachable', detail: e.message });
    }

    // ── 3. Detect functional workflows and interactions ───────────────────────
    let hasWorkingForm = false;
    let hasStateManagement = false;
    let hasListView = false;
    let hasInteractiveButtons = false;
    let hasPersistence = false;
    let hasDOMUpdates = false;
    let hasEditDelete = false;
    
    const lower = htmlText.toLowerCase();
    
    // ─ Form submission: addEventListener with submit OR form + preventdefault
    hasWorkingForm = (lower.includes('addeventlistener') && lower.includes('submit') && lower.includes('preventdefault')) ||
                     (lower.includes('form') && lower.includes('preventdefault')) ||
                     (lower.includes('formsubmit') || lower.includes('post-form'));
    
    // ─ State management: variable holding array + operations on it
    hasStateManagement = (lower.includes('localstorage') && (lower.includes('setitem') || lower.includes('getitem'))) ||
                         (lower.match(/let\s+\w+\s*=\s*\[/) || lower.match(/const\s+\w+\s*=\s*\[/)) ||
                         (lower.includes('json.parse') && lower.includes('json.stringify'));
    
    // ─ Persistence: localStorage with JSON serialization (for saving state)
    hasPersistence = (lower.includes('localstorage.setitem') && lower.includes('json.stringify')) ||
                     (lower.includes('localstorage.getitem') && lower.includes('json.parse'));
    
    // ─ List rendering: .map() or forEach() in template/DOM context, or .map( in JS
    hasListView = lower.includes('.map(') || lower.includes('foreach(') ||
                  lower.match(/\.map\s*\(\s*/) || // .map( with spaces
                  (lower.includes('posts') && lower.includes('.join'));
    
    // ─ DOM updates: innerHTML or textContent used to update display
    hasDOMUpdates = (lower.includes('.innerhtml') || lower.includes('.textcontent')) &&
                    (lower.includes('queryselector') || lower.includes('getelementbyid') ||
                     lower.includes('.classlist'));
    
    // ─ Interactive buttons: onclick attributes in HTML OR addEventListener('click')
    hasInteractiveButtons = (lower.includes('onclick=') || lower.includes('onclick =')) ||
                            (lower.includes('addeventlistener') && lower.includes('click') && lower.includes('function'));
    
    // ─ Edit/Delete workflow: deletepost/editpost functions OR delete buttons with onclick
    hasEditDelete = (lower.includes('deletepost') || lower.includes('editpost') ||
                     (lower.includes('onclick=') && lower.includes('delete'))) &&
                    (lower.includes('filter(') || lower.includes('splice(') || lower.includes('.filter'));
    
    // ─ Complete workflow: form → persist → display → edit/delete → repersist
    const hasCompleteWorkflow = hasWorkingForm && hasPersistence && hasListView && hasEditDelete;

    // ── 4. Scores ────────────────────────────────────────────────────────
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    // Dual-dimension scoring
    let productFit = 5;  // 0-20
    let deliveryFit = 5; // 0-20

    // Product fit: check for expected features based on product type
    // (detected from context but used as generic check)
    if (uiCheck.hasDashboard) productFit += 4;
    if (uiCheck.hasAuth) productFit += 3;
    if (uiCheck.hasInputOutput) productFit += 4;
    if (uiCheck.hasForm) productFit += 3;
    // Bonus for functional workflows
    if (hasWorkingForm) productFit += 2;
    if (hasStateManagement) productFit += 1;

    // Delivery fit: check for interface patterns
    if (uiCheck.hasNav) deliveryFit += 4;
    if (uiCheck.hasFooter) deliveryFit += 3;
    if (uiCheck.hasMobileLayout) deliveryFit += 4;
    if (uiCheck.hasSections) deliveryFit += 3;
    // Bonus for interactive elements
    if (hasInteractiveButtons) deliveryFit += 1;
    if (hasListView) deliveryFit += 1;

    // ── 4. v2 5-Dimensional Scoring System ────────────────────────────────
    // Each dimension 0-20, total 0-100
    
    // 1. UX Quality (0-20): structure, accessibility, navigation, form quality
    let uxQuality = 0;
    if (uiCheck.hasHtml) uxQuality += 2;
    if (uiCheck.hasNav) uxQuality += 4;
    if (uiCheck.hasSections) uxQuality += 3;
    if (uiCheck.hasH1) uxQuality += 3;
    if (uiCheck.hasH2) uxQuality += 2;
    if (uiCheck.hasFooter) uxQuality += 3;
    if (uiCheck.hasTailwind) uxQuality += 1;
    if (uiCheck.textLength > 2000) uxQuality += 2;
    if (uiCheck.textLength > 1000) uxQuality += 1;
    uxQuality = Math.min(20, uxQuality);
    
    // 2. Feature Depth (0-20): forms, input/output, auth, dashboard, functional workflows
    let featureDepth = 0;
    if (uiCheck.hasForm) featureDepth += 5;
    if (uiCheck.hasInputOutput) featureDepth += 5;
    if (uiCheck.hasDashboard) featureDepth += 5;
    if (uiCheck.hasAuth) featureDepth += 2;
    if (uiCheck.hasMobileLayout) featureDepth += 2;
    // CRITICAL: Functional workflows boost feature depth
    if (hasWorkingForm) featureDepth += 3;
    if (hasStateManagement) featureDepth += 2;
    if (hasListView) featureDepth += 1;
    featureDepth = Math.min(20, featureDepth);
    
    // 3. Conversion Readiness (0-20): CTA, form quality, clarity, trust signals
    let conversionReady = 0;
    if (uiCheck.hasForm) conversionReady += 6;
    if (uiCheck.hasH1) conversionReady += 4;
    if (uiCheck.hasSections) conversionReady += 4;
    if (uiCheck.textLength > 500) conversionReady += 3;
    if (uiCheck.hasNav) conversionReady += 3;
    conversionReady = Math.min(20, conversionReady);
    
    // API health directly impacts feature depth and conversion
    const apiHealthScore = (apiGetCheck.ok && apiRunCheck.ok) ? 1 : 0;
    
    // 4. Product Fit (0-20): matches intended product type
    productFit = Math.min(20, productFit);
    
    // 5. Delivery Fit (0-20): matches delivery mechanism
    deliveryFit = Math.min(20, deliveryFit);
    
    // Calculate overall: sum of all dimensions
    const overall = uxQuality + featureDepth + conversionReady + productFit + deliveryFit;

    const report = {
      url,
      audited_at: new Date().toISOString(),
      scores: {
        overall: Math.min(100, overall),
        uxQuality,
        featureDepth,
        conversionReady,
        productFit: Math.min(20, productFit),
        deliveryFit: Math.min(20, deliveryFit),
      },
      issues,
      recommendations: [...new Set(recommendations)],
      metrics,
      summary: { critical: criticalCount, warnings: warningCount, total: issues.length },
      checks: { ui: uiCheck, api_get: apiGetCheck, api_run: apiRunCheck },
      passed: criticalCount === 0,
      functional_workflows: {
        hasWorkingForm,
        hasStateManagement,
        hasPersistence,
        hasDOMUpdates,
        hasListView,
        hasInteractiveButtons,
        hasEditDelete,
        hasCompleteWorkflow,
        total_functional_features: [hasWorkingForm, hasStateManagement, hasPersistence, hasDOMUpdates, hasListView, hasInteractiveButtons, hasEditDelete].filter(Boolean).length,
      },
    };

    // Record audit ToolMetric
    await base44.asServiceRole.entities.ToolMetrics.create({
      tool_id: 'base44', tool_name: 'Base44 Audit', capability: 'auditing',
      success: criticalCount === 0,
      latency_ms: (metrics.page_load_ms || 0) + (metrics.api_get_ms || 0) + (metrics.api_run_ms || 0),
      cost_usd: 0.002,
      task_type: 'audit',
      error_message: criticalCount > 0 ? `${criticalCount} critical issues found` : null,
      user_email: user.email,
    }).catch(() => {});

    // Record playwright as crawling metric
    await base44.asServiceRole.entities.ToolMetrics.create({
      tool_id: 'playwright', tool_name: 'Playwright Crawler', capability: 'crawling',
      success: uiCheck.reachable,
      latency_ms: metrics.page_load_ms || 0,
      cost_usd: 0.001,
      task_type: 'crawl',
      error_message: uiCheck.reachable ? null : 'Page unreachable',
      user_email: user.email,
    }).catch(() => {});

    console.log(`[auditDeployment] done — overall=${overall} critical=${criticalCount} warnings=${warningCount}`);
    return Response.json(report);
  } catch (error) {
    console.error('[auditDeployment] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});