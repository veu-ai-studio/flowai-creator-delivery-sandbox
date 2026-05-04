import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * runVerification — Cost-optimized autonomous app factory loop.
 *
 * Execution Modes:
 *   light    — gpt-4o-mini, max 1 iteration, no redeploy on failure, skip form check
 *   standard — gpt-4o-mini, max 2 iterations, targeted patch fix on retry
 *   full     — gpt-4o,      max 3 iterations, full regen on retry
 *
 * Cost Guardrails:
 *   maxCostPerRun  — abort entire run if exceeded
 *   maxCostPerApp  — skip app if its budget is exceeded before deploying
 *
 * Cost Tracking:
 *   tokens tracked per LLM call, costs estimated and accumulated
 */

const VERCEL_API = 'https://api.vercel.com';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

// Pricing per 1K tokens (input+output blended estimate)
const COST_PER_1K = {
  'gpt-4o': 0.005,
  'gpt-4o-mini': 0.00015,
};

const MODE_CONFIG = {
  light: {
    model: 'gpt-4o-mini',
    maxIterations: 1,
    maxTokens: 4000,
    smartFix: false,        // no retry
    skipFormCheck: true,    // lighter validation
    temperature: 0.2,
  },
  standard: {
    model: 'gpt-4o-mini',
    maxIterations: 2,
    maxTokens: 6000,
    smartFix: true,         // patch only failed parts
    skipFormCheck: false,
    temperature: 0.25,
  },
  full: {
    model: 'gpt-4o',
    maxIterations: 3,
    maxTokens: 10000,
    smartFix: false,        // full regen with context
    skipFormCheck: false,
    temperature: 0.3,
  },
};

// ─── Cost Tracker ─────────────────────────────────────────────────────────────

function createCostTracker() {
  return {
    totalTokens: 0,
    totalCostUsd: 0,
    appCosts: {},
    llmCalls: 0,
    deployments: 0,

    addLlmCall(model, tokens, appName) {
      const cost = (tokens / 1000) * (COST_PER_1K[model] || 0.001);
      this.totalTokens += tokens;
      this.totalCostUsd += cost;
      this.llmCalls++;
      if (appName) {
        if (!this.appCosts[appName]) this.appCosts[appName] = { tokens: 0, costUsd: 0, deployments: 0 };
        this.appCosts[appName].tokens += tokens;
        this.appCosts[appName].costUsd += cost;
      }
      console.log(`[cost] LLM ${model} ${tokens} tokens → $${cost.toFixed(5)} | run total: $${this.totalCostUsd.toFixed(5)}`);
      return cost;
    },

    addDeployment(appName) {
      this.deployments++;
      // Vercel free tier — no direct cost, but track count
      if (appName && this.appCosts[appName]) this.appCosts[appName].deployments++;
      console.log(`[cost] Deployment #${this.deployments} for ${appName}`);
    },

    summary() {
      return {
        totalTokens: this.totalTokens,
        totalCostUsd: parseFloat(this.totalCostUsd.toFixed(6)),
        llmCalls: this.llmCalls,
        deployments: this.deployments,
        appCosts: Object.fromEntries(
          Object.entries(this.appCosts).map(([k, v]) => [k, {
            tokens: v.tokens,
            costUsd: parseFloat(v.costUsd.toFixed(6)),
            deployments: v.deployments,
          }])
        ),
      };
    },
  };
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

function encodeFile(content) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ─── Code Generation ─────────────────────────────────────────────────────────

async function generateCode(openaiKey, app, config, costTracker, failedChecks = [], previousHtml = null) {
  const isSmartFix = config.smartFix && failedChecks.length > 0 && previousHtml;

  let systemPrompt, userPrompt;

  if (isSmartFix) {
    // Smart fix: ask LLM to patch ONLY the broken parts
    systemPrompt = `You are a web developer fixing specific bugs in an HTML app.

REQUIRED OUTPUT FORMAT (raw JSON, no markdown):
{
  "files": [
    { "path": "frontend/index.html", "content": "FULL FIXED HTML" },
    { "path": "frontend/script.js", "content": "FULL FIXED JS" }
  ]
}

Rules:
- Fix ALL listed issues completely.
- If hasForm is listed: you MUST add a visible <form> element with at least one <input> and a <button type="submit"> inside the page body. This is mandatory.
- Return complete files (not diffs).
- Return ONLY the JSON object.`;

    userPrompt = `App: ${app.name}

ISSUES TO FIX:
${failedChecks.map(f => `- ${f.name}: ${f.details}`).join('\n')}

${failedChecks.some(f => f.name === 'hasForm') ? `CRITICAL: The page is MISSING a <form> element. You MUST add a <form id="contact-form"> element containing at minimum an <input type="text"> and a <button type="submit"> somewhere visible in the page body. Do NOT skip this.` : ''}

CURRENT HTML (patch this):
${previousHtml ? previousHtml.slice(0, 3000) : '(not available)'}

Fix every issue listed and return complete corrected files.`;

  } else {
    // Full generation
    const fixContext = failedChecks.length > 0
      ? `\n\nPREVIOUS BUILD FAILED. Fix these: ${failedChecks.map(f => f.name).join(', ')}`
      : '';

    systemPrompt = `You are an expert full-stack developer. Generate a complete, deployable web application.

REQUIRED OUTPUT FORMAT (raw JSON only, no markdown):
{
  "files": [
    { "path": "frontend/index.html", "content": "FULL HTML" },
    { "path": "frontend/script.js", "content": "FULL JS" }
  ]
}

RULES:
- frontend/index.html: full HTML5 doc, <!DOCTYPE html>, Tailwind CSS CDN, dark theme (bg-gray-950)
- MANDATORY: Must contain <nav>, <main>, <footer> semantic tags
- MANDATORY: Must contain a <form id="contact-form"> element with at least one <input> and a <button type="submit">. This is required even for apps that don't primarily use forms — add it as a contact/input section.
- frontend/script.js: handles form submit on #contact-form, calls POST /api/run, updates #api-result, uses localStorage
- Return ONLY the JSON object. No code fences, no explanation.`;

    userPrompt = `App: ${app.name}
Description: ${app.description}
Components: ${(app.components || []).join(', ')}${fixContext}

Generate a complete, functional, dark-themed single-page application.`;
  }

  console.log(`[runVerification:${app.name}] ${isSmartFix ? 'Smart-fix patch' : 'Full generation'} with ${config.model}...`);

  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err).slice(0, 200)}`);
  }

  const data = await res.json();
  const tokens = data.usage?.total_tokens || 0;
  costTracker.addLlmCall(config.model, tokens, app.name);

  const raw = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(raw);
  if (!parsed.files?.length) throw new Error('OpenAI returned no files');

  console.log(`[runVerification:${app.name}] Generated ${parsed.files.length} files (${tokens} tokens)`);
  return { files: parsed.files, tokens };
}

// ─── Vercel Deployment ────────────────────────────────────────────────────────

function buildVercelPackage(files, appName) {
  let htmlContent = '';
  let scriptContent = '';

  for (const f of files) {
    if (f.path === 'frontend/index.html') htmlContent = f.content;
    else if (f.path === 'frontend/script.js') scriptContent = f.content;
  }

  const safeName = (appName || 'FlowAI App').replace(/'/g, "\\'").replace(/`/g, '\\`');
  const htmlEscaped = htmlContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const scriptEscaped = scriptContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  const server = `'use strict';
const express = require('express');
const app = express();
const HTML = \`${htmlEscaped}\`;
const SCRIPT = \`${scriptEscaped}\`;
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});
app.get('/api', (req, res) => res.json({ status: 'ok', service: '${safeName} API', timestamp: new Date().toISOString() }));
app.post('/api/run', (req, res) => res.json({ success: true, result: 'Processed by ${safeName}', input: req.body, timestamp: new Date().toISOString() }));
app.get('/script.js', (req, res) => { res.setHeader('Content-Type', 'application/javascript'); res.send(SCRIPT); });
app.get('*', (req, res) => { res.setHeader('Content-Type', 'text/html'); res.send(HTML); });
if (require.main === module) app.listen(process.env.PORT || 3000);
module.exports = app;
`;

  const pkg = JSON.stringify({ name: (appName || 'app').toLowerCase().replace(/[^a-z0-9-]/g, '-'), version: '1.0.0', main: 'index.js', dependencies: { express: '^4.18.2' } }, null, 2);
  const vercelConf = JSON.stringify({ version: 2, builds: [{ src: 'api/index.js', use: '@vercel/node' }], routes: [{ src: '/(.*)', dest: '/api/index.js' }] }, null, 2);

  return [
    { file: 'api/index.js', data: encodeFile(server), encoding: 'base64' },
    { file: 'api/package.json', data: encodeFile(pkg), encoding: 'base64' },
    { file: 'vercel.json', data: encodeFile(vercelConf), encoding: 'base64' },
  ];
}

async function deployToVercel(vercelToken, appName, files, costTracker) {
  const projectName = (appName || 'app')
    .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 28)
    + '-' + Date.now().toString(36).slice(-5);

  console.log(`[runVerification:${appName}] Deploying → ${projectName}`);
  costTracker.addDeployment(appName);

  const deployFiles = buildVercelPackage(files, appName);
  const res = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: projectName, files: deployFiles, target: 'production', projectSettings: { framework: null }, public: true }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Vercel deploy error ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);

  const deploymentId = data.id;
  let url = data.url ? `https://${data.url}` : null;

  if (deploymentId && data.readyState !== 'READY') {
    console.log(`[runVerification:${appName}] Polling for READY...`);
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}`, { headers: { 'Authorization': `Bearer ${vercelToken}` } });
      const pollData = await poll.json();
      const state = pollData.readyState;
      console.log(`[runVerification:${appName}] state: ${state}`);
      if (state === 'READY') {
        const aliases = pollData.alias || [];
        const cleanAlias = aliases.find(a => !a.includes('-veu-ai-studio') && a.endsWith('.vercel.app'));
        url = cleanAlias ? `https://${cleanAlias}` : (pollData.url ? `https://${pollData.url}` : url);
        break;
      }
      if (state === 'ERROR' || state === 'CANCELED') throw new Error(`Deployment failed with state: ${state}`);
    }
  }

  if (!url) throw new Error('No URL returned from deployment');
  console.log(`[runVerification:${appName}] Deployed: ${url}`);
  return url;
}

// ─── Validation ───────────────────────────────────────────────────────────────

async function validateApp(url, appName, config) {
  console.log(`[runVerification:${appName}] Validating ${url}...`);

  const results = {
    pageLoad: { passed: false },
    hasHtml: { passed: false },
    getApi: { passed: false },
    postApiRun: { passed: false },
  };
  if (!config.skipFormCheck) results.hasForm = { passed: false };

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    results.pageLoad = { passed: res.ok, status: res.status };
    if (res.ok) {
      const html = await res.text();
      const lower = html.toLowerCase();
      results.hasHtml = { passed: lower.includes('<html') || lower.includes('<!doctype'), html };
      if (!config.skipFormCheck) results.hasForm = { passed: lower.includes('<form') };
    }
  } catch (e) {
    results.pageLoad = { passed: false, error: e.message };
  }

  try {
    const res = await fetch(`${url}/api`, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    results.getApi = { passed: res.ok && json !== null, status: res.status };
  } catch (e) {
    results.getApi = { passed: false, error: e.message };
  }

  try {
    const res = await fetch(`${url}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    results.postApiRun = { passed: res.ok && json !== null, status: res.status };
  } catch (e) {
    results.postApiRun = { passed: false, error: e.message };
  }

  const allPassed = Object.values(results).every(v => v.passed);
  const failedChecks = Object.entries(results)
    .filter(([, v]) => !v.passed)
    .map(([k, v]) => ({ name: k, details: v.error || `HTTP ${v.status ?? 'N/A'}` }));

  // Extract HTML for smart fix use on retry
  const htmlSnapshot = results.hasHtml?.html || null;
  // Clean up large data from results before returning
  if (results.hasHtml) delete results.hasHtml.html;

  console.log(`[runVerification:${appName}] ${allPassed ? '✓ PASSED' : `✗ FAILED: ${failedChecks.map(f => f.name).join(', ')}`}`);
  return { passed: allPassed, results, failedChecks, htmlSnapshot };
}

// ─── App Loop ─────────────────────────────────────────────────────────────────

async function runAppLoop(openaiKey, vercelToken, app, config, costTracker, guardrails) {
  console.log(`\n${'='.repeat(60)}\n[runVerification] ${app.name} [${config.model}, max ${config.maxIterations} iter]\n${'='.repeat(60)}`);

  const iterationLog = [];
  let currentUrl = null;
  let currentFiles = null;
  let passed = false;
  let iteration = 0;
  let lastFailedChecks = [];
  let lastHtml = null;
  let skipped = false;
  let skipReason = null;

  for (iteration = 1; iteration <= config.maxIterations; iteration++) {
    console.log(`\n[${app.name}] ── Iteration ${iteration}/${config.maxIterations} ──`);

    // Per-app cost guardrail
    const appCost = costTracker.appCosts[app.name]?.costUsd || 0;
    if (guardrails.maxCostPerApp && appCost >= guardrails.maxCostPerApp) {
      console.warn(`[${app.name}] App cost limit $${guardrails.maxCostPerApp} reached ($${appCost.toFixed(5)}). Skipping.`);
      skipped = true;
      skipReason = `App cost limit $${guardrails.maxCostPerApp} reached`;
      break;
    }

    // Run-level cost guardrail
    if (guardrails.maxCostPerRun && costTracker.totalCostUsd >= guardrails.maxCostPerRun) {
      console.warn(`[runVerification] Run cost limit $${guardrails.maxCostPerRun} reached. Aborting.`);
      skipped = true;
      skipReason = `Run cost limit $${guardrails.maxCostPerRun} exceeded`;
      break;
    }

    try {
      const genResult = await generateCode(openaiKey, app, config, costTracker, lastFailedChecks, lastHtml);
      currentFiles = genResult.files;

      // Always redeploy when new files were generated — a fix is only valid when deployed
      currentUrl = await deployToVercel(vercelToken, app.name, currentFiles, costTracker);
      console.log(`[${app.name}] Waiting 6s for cold start...`);
      await new Promise(r => setTimeout(r, 6000));

      const validation = await validateApp(currentUrl, app.name, config);
      lastFailedChecks = validation.failedChecks;
      lastHtml = validation.htmlSnapshot;

      iterationLog.push({
        iteration,
        url: currentUrl,
        passed: validation.passed,
        failedChecks: validation.failedChecks,
        tokens: genResult.tokens,
        costUsd: parseFloat((costTracker.appCosts[app.name]?.costUsd || 0).toFixed(6)),
        timestamp: new Date().toISOString(),
      });

      if (validation.passed) {
        passed = true;
        console.log(`[${app.name}] ✓ PASSED on iteration ${iteration}`);
        break;
      }

      // Light mode: don't retry
      if (config.maxIterations === 1) break;

    } catch (err) {
      console.error(`[${app.name}] Iteration ${iteration} error: ${err.message}`);
      iterationLog.push({
        iteration,
        passed: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      lastFailedChecks = [{ name: 'system_error', details: err.message }];
    }
  }

  return {
    appName: app.name,
    passed,
    skipped,
    skipReason,
    finalUrl: currentUrl,
    iteration: Math.min(iteration, config.maxIterations),
    iterationLog,
    appCost: parseFloat((costTracker.appCosts[app.name]?.costUsd || 0).toFixed(6)),
    appTokens: costTracker.appCosts[app.name]?.tokens || 0,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    if (!vercelToken) return Response.json({ error: 'VERCEL_TOKEN not set' }, { status: 500 });

    const body = await req.json();
    const {
      apps,
      mode = 'standard',                 // light | standard | full
      maxCostPerRun = null,               // e.g. 0.10 = $0.10 hard limit
      maxCostPerApp = null,               // e.g. 0.05 = $0.05 per app
    } = body;

    if (!apps || !Array.isArray(apps) || apps.length === 0) {
      return Response.json({ error: 'apps array is required' }, { status: 400 });
    }

    const config = MODE_CONFIG[mode] || MODE_CONFIG.standard;
    const guardrails = { maxCostPerRun, maxCostPerApp };
    const costTracker = createCostTracker();

    console.log(`[runVerification] Mode: ${mode} | Model: ${config.model} | MaxIter: ${config.maxIterations} | Apps: ${apps.length}`);
    if (maxCostPerRun) console.log(`[runVerification] Cost guardrail: $${maxCostPerRun}/run`);
    if (maxCostPerApp) console.log(`[runVerification] Cost guardrail: $${maxCostPerApp}/app`);

    const appResults = [];
    let totalPassed = 0;
    let abortedByGuardrail = false;

    for (const app of apps) {
      // Run-level cost check before even starting an app
      if (guardrails.maxCostPerRun && costTracker.totalCostUsd >= guardrails.maxCostPerRun) {
        console.warn(`[runVerification] Run cost limit hit before starting ${app.name}. Skipping remaining apps.`);
        appResults.push({
          appName: app.name,
          passed: false,
          skipped: true,
          skipReason: `Run cost limit $${maxCostPerRun} hit`,
          finalUrl: null,
          iteration: 0,
          iterationLog: [],
          appCost: 0,
          appTokens: 0,
        });
        abortedByGuardrail = true;
        continue;
      }

      const result = await runAppLoop(openaiKey, vercelToken, app, config, costTracker, guardrails);
      appResults.push(result);
      if (result.passed) totalPassed++;
    }

    const costs = costTracker.summary();
    console.log(`[runVerification] Complete: ${totalPassed}/${apps.length} passed | Total cost: $${costs.totalCostUsd} | Tokens: ${costs.totalTokens}`);

    return Response.json({
      timestamp: new Date().toISOString(),
      mode,
      apps: appResults,
      summary: {
        total: apps.length,
        passed: totalPassed,
        failed: apps.length - totalPassed - appResults.filter(a => a.skipped).length,
        skipped: appResults.filter(a => a.skipped).length,
        abortedByGuardrail,
      },
      costs,
    });

  } catch (error) {
    console.error('[runVerification] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});