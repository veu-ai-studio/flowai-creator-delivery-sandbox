import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * runSingleApp — runs the full generate→deploy→validate→fix loop for ONE app.
 * Called once per app to avoid 504 timeouts from running all 5 in one request.
 */

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const VERCEL_API = 'https://api.vercel.com';

const COST_PER_1K = {
  'gpt-4o': 0.005,
  'gpt-4o-mini': 0.00015,
};

const MODE_CONFIG = {
  light:    { model: 'gpt-4o-mini', maxIterations: 1, maxTokens: 4000, smartFix: false, skipFormCheck: true,  temperature: 0.2  },
  standard: { model: 'gpt-4o-mini', maxIterations: 2, maxTokens: 6000, smartFix: true,  skipFormCheck: false, temperature: 0.25 },
  full:     { model: 'gpt-4o',      maxIterations: 3, maxTokens: 10000, smartFix: false, skipFormCheck: false, temperature: 0.3  },
};

function encodeFile(content) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function costOf(model, tokens) {
  return (tokens / 1000) * (COST_PER_1K[model] || 0.001);
}

async function generateCode(openaiKey, app, config, failedChecks = [], previousHtml = null) {
  const isSmartFix = config.smartFix && failedChecks.length > 0 && previousHtml;

  let systemPrompt, userPrompt;

  if (isSmartFix) {
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

${failedChecks.some(f => f.name === 'hasForm') ? `CRITICAL: The page is MISSING a <form> element. You MUST add a <form id="contact-form"> element containing at minimum an <input type="text"> and a <button type="submit"> somewhere visible in the page body.` : ''}

CURRENT HTML (patch this):
${previousHtml ? previousHtml.slice(0, 3000) : '(not available)'}

Fix every issue listed and return complete corrected files.`;

  } else {
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
- MANDATORY: Must contain a <form id="contact-form"> element with at least one <input> and a <button type="submit">
- frontend/script.js: handles form submit on #contact-form, calls POST /api/run, updates #api-result, uses localStorage
- Return ONLY the JSON object. No code fences, no explanation.`;

    userPrompt = `App: ${app.name}
Description: ${app.description}
Components: ${(app.components || []).join(', ')}${fixContext}

Generate a complete, functional, dark-themed single-page application.`;
  }

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
  const raw = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(raw);
  if (!parsed.files?.length) throw new Error('OpenAI returned no files');
  return { files: parsed.files, tokens, costUsd: costOf(config.model, tokens) };
}

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

async function deployToVercel(vercelToken, appName, files) {
  const projectName = (appName || 'app')
    .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 28)
    + '-' + Date.now().toString(36).slice(-5);

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
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}`, { headers: { 'Authorization': `Bearer ${vercelToken}` } });
      const pollData = await poll.json();
      const state = pollData.readyState;
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
  return url;
}

async function validateApp(url, config) {
  const results = {
    pageLoad: { passed: false },
    hasHtml:  { passed: false },
    getApi:   { passed: false },
    postApiRun: { passed: false },
  };
  if (!config.skipFormCheck) results.hasForm = { passed: false };

  let htmlSnapshot = null;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    results.pageLoad = { passed: res.ok, status: res.status };
    if (res.ok) {
      const html = await res.text();
      const lower = html.toLowerCase();
      results.hasHtml = { passed: lower.includes('<html') || lower.includes('<!doctype') };
      htmlSnapshot = html;
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

  return { passed: allPassed, results, failedChecks, htmlSnapshot };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

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
    const { app, mode = 'standard' } = body;

    if (!app || !app.name) {
      return Response.json({ error: 'app object with name is required' }, { status: 400 });
    }

    const config = MODE_CONFIG[mode] || MODE_CONFIG.standard;

    console.log(`\n[runSingleApp] ${app.name} [${config.model}, max ${config.maxIterations} iter]`);

    const iterationLog = [];
    let currentUrl = null;
    let passed = false;
    let totalTokens = 0;
    let totalCostUsd = 0;
    let lastFailedChecks = [];
    let lastHtml = null;

    for (let iteration = 1; iteration <= config.maxIterations; iteration++) {
      console.log(`[${app.name}] Iteration ${iteration}/${config.maxIterations}`);

      try {
        const genResult = await generateCode(openaiKey, app, config, lastFailedChecks, lastHtml);
        totalTokens += genResult.tokens;
        totalCostUsd += genResult.costUsd;

        currentUrl = await deployToVercel(vercelToken, app.name, genResult.files);
        console.log(`[${app.name}] Deployed: ${currentUrl}. Waiting 6s...`);
        await new Promise(r => setTimeout(r, 6000));

        const validation = await validateApp(currentUrl, config);
        lastFailedChecks = validation.failedChecks;
        lastHtml = validation.htmlSnapshot;

        iterationLog.push({
          iteration,
          url: currentUrl,
          passed: validation.passed,
          failedChecks: validation.failedChecks,
          tokens: genResult.tokens,
          costUsd: parseFloat(totalCostUsd.toFixed(6)),
          timestamp: new Date().toISOString(),
        });

        if (validation.passed) {
          passed = true;
          console.log(`[${app.name}] ✓ PASSED on iteration ${iteration}`);
          break;
        }

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

    return Response.json({
      appName: app.name,
      passed,
      finalUrl: currentUrl,
      iteration: iterationLog.length,
      iterationLog,
      appCost: parseFloat(totalCostUsd.toFixed(6)),
      appTokens: totalTokens,
    });

  } catch (error) {
    console.error('[runSingleApp] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});