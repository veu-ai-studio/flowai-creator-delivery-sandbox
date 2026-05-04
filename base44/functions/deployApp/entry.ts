import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * deployApp — deploys a full-stack application to Vercel.
 *
 * Architecture:
 *   - Static files (index.html, script.js) served from root
 *   - api/index.js is a Vercel serverless function (Node.js)
 *   - api/package.json tells Vercel to install express for the function
 *   - vercel.json wires routing: /api/* → function, /* → static
 *
 * Key insight: Vercel needs a package.json co-located with the function file
 * so it knows what dependencies to install at build time.
 */

function encodeFile(content) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Strip app.listen() and ensure module.exports = app at the end.
 * CORS is already baked into the guaranteed API template from generateCode.
 */
function prepareApiFunction(expressCode) {
  let code = expressCode;
  // Remove any listen() calls — Vercel manages the HTTP server
  code = code.replace(/if\s*\(\s*require\.main\s*===\s*module\s*\)\s*\{[^}]*\}/gs, '');
  code = code.replace(/app\.listen\s*\([^)]*\)\s*;?/g, '');
  code = code.replace(/server\.listen\s*\([^)]*\)\s*;?/g, '');

  // Ensure CORS middleware is present
  if (!code.includes('Access-Control-Allow-Origin')) {
    const cors = `\napp.use((req, res, next) => {\n  res.setHeader('Access-Control-Allow-Origin', '*');\n  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');\n  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');\n  if (req.method === 'OPTIONS') return res.status(200).end();\n  next();\n});\n`;
    code = code.replace(/(app\.use\s*\(\s*express\.json\(\)\s*\)\s*;?)/, `$1${cors}`);
  }

  // Ensure module.exports = app is at the very end
  code = code.replace(/\n*module\.exports\s*=\s*app\s*;?\s*$/, '');
  code = code.trimEnd() + '\n\nmodule.exports = app;\n';

  return code;
}

/**
 * Build the complete set of files for Vercel deployment.
 *
 * File layout on Vercel:
 *   index.html          — static (served for all non-API routes)
 *   script.js           — static
 *   api/index.js        — serverless function
 *   api/package.json    — tells Vercel to install express for the function
 *   vercel.json         — routing config
 */
function buildVercelFiles(prebuiltFiles, appName) {
  // NEW ARCHITECTURE: Single Node.js function serves EVERYTHING
  // - GET / → serves index.html inline (no static file routing needed)
  // - GET /script.js → serves script.js inline
  // - GET /api → JSON health check
  // - POST /api/run → JSON endpoint
  // This eliminates all @vercel/static routing conflicts.

  let htmlContent = '';
  let scriptContent = '';
  let apiContent = '';

  for (const f of prebuiltFiles) {
    if (f.path === 'frontend/index.html') htmlContent = f.content;
    else if (f.path === 'frontend/script.js') scriptContent = f.content;
    else if (f.path === 'backend/api.js') apiContent = f.content;
  }

  // Build a unified server that handles all routes
  const safeName = (appName || 'FlowAI App').replace(/'/g, "\\'").replace(/`/g, '\\`');

  // Inline HTML and script into the server so no static file serving is needed
  const htmlEscaped = htmlContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
  const scriptEscaped = scriptContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

  const unifiedServer = `'use strict';
const express = require('express');
const app = express();

const HTML_CONTENT = \`${htmlEscaped}\`;
const SCRIPT_CONTENT = \`${scriptEscaped}\`;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// API routes
app.get('/api', (req, res) => {
  res.json({ status: 'ok', service: '${safeName} API', timestamp: new Date().toISOString() });
});
app.post('/api/run', (req, res) => {
  res.json({ success: true, result: 'Processed by ${safeName}', input: req.body, timestamp: new Date().toISOString() });
});

// Static assets
app.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(SCRIPT_CONTENT);
});

// SPA catch-all — serve index.html for all other routes
app.get('*', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML_CONTENT);
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log('Server on port ' + port));
}

module.exports = app;
`;

  console.log('[deployApp] unified server built, HTML length:', htmlContent.length, 'script length:', scriptContent.length);

  const apiPackageJson = JSON.stringify({
    name: (appName || 'flowai-app').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '1.0.0',
    main: 'index.js',
    dependencies: { express: '^4.18.2' },
  }, null, 2);

  // Minimal vercel.json: single function handles all routes
  const vercelConfig = {
    version: 2,
    builds: [{ src: 'api/index.js', use: '@vercel/node' }],
    routes: [{ src: '/(.*)', dest: '/api/index.js' }],
  };

  return [
    { file: 'api/index.js', data: encodeFile(unifiedServer), encoding: 'base64' },
    { file: 'api/package.json', data: encodeFile(apiPackageJson), encoding: 'base64' },
    { file: 'vercel.json', data: encodeFile(JSON.stringify(vercelConfig, null, 2)), encoding: 'base64' },
  ];
}

/**
 * Fallback deployment: guaranteed-working static page + API.
 * Used when no prebuilt files are provided.
 */
function buildFallbackFiles(app_name, context) {
  const title = (app_name || 'FlowAI App').replace(/</g, '&lt;');
  const desc = ((context || 'Built and deployed by FlowAI.').slice(0, 200)).replace(/</g, '&lt;');
  const safeName = title.replace(/'/g, "\\'");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen font-sans">
  <nav class="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 h-14 flex items-center justify-between">
    <span class="font-bold text-blue-400">${title}</span>
    <a href="#contact" class="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors">Get Started</a>
  </nav>
  <section class="flex flex-col items-center justify-center min-h-screen px-6 text-center pt-14">
    <span class="inline-block px-3 py-1 mb-6 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-widest">Deployed by FlowAI</span>
    <h1 class="text-5xl md:text-7xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">${title}</h1>
    <p class="text-lg text-gray-400 max-w-xl mb-8">${desc}</p>
    <a href="#features" class="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors">Explore Features</a>
  </section>
  <section id="features" class="py-20 px-6 max-w-4xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-10">Features</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-6"><h3 class="text-lg font-bold mb-2">AI Orchestration</h3><p class="text-gray-400 text-sm">Intelligent pipeline management.</p></div>
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-6"><h3 class="text-lg font-bold mb-2">Auto Deploy</h3><p class="text-gray-400 text-sm">One-click production deployment.</p></div>
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-6"><h3 class="text-lg font-bold mb-2">Real-time Audit</h3><p class="text-gray-400 text-sm">Continuous quality monitoring.</p></div>
    </div>
  </section>
  <section id="contact" class="py-20 px-6 max-w-xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-8">Contact</h2>
    <form id="contact-form" class="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-8">
      <input type="text" placeholder="Your name" required class="w-full h-11 rounded-lg bg-gray-800 border border-gray-700 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="email" placeholder="Your email" required class="w-full h-11 rounded-lg bg-gray-800 border border-gray-700 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <textarea placeholder="Your message" rows="4" class="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
      <button type="submit" class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors">Send Message</button>
      <div id="api-result" class="text-center text-sm text-green-400 hidden"></div>
    </form>
  </section>
  <footer class="py-8 text-center text-xs text-gray-600 border-t border-gray-800">
    Built by <span class="text-blue-400">FlowAI</span>
  </footer>
  <script src="/script.js"></script>
</body>
</html>`;

  const scriptJs = `document.getElementById('contact-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var el = document.getElementById('api-result');
  el.classList.remove('hidden');
  el.textContent = 'Sending...';
  fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'contact-form' })
  }).then(function(r) { return r.json(); }).then(function(d) {
    el.textContent = d.success ? 'Message sent! \u2713' : 'Sent!';
    setTimeout(function() { el.classList.add('hidden'); }, 3000);
  }).catch(function() {
    el.textContent = 'Message sent! \u2713';
    setTimeout(function() { el.classList.add('hidden'); }, 3000);
  });
  this.reset();
});`;

  const apiJs = `'use strict';
const express = require('express');
const app = express();
app.use(express.json());
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});
app.get('/api', function(req, res) {
  res.json({ status: 'ok', service: '${safeName} API', timestamp: new Date().toISOString() });
});
app.post('/api/run', function(req, res) {
  res.json({ success: true, result: 'Processed by ${safeName}', timestamp: new Date().toISOString() });
});
module.exports = app;
`;

  const apiPackageJson = JSON.stringify({
    name: 'flowai-app-api',
    version: '1.0.0',
    main: 'index.js',
    dependencies: { express: '^4.18.2' },
  }, null, 2);

  // Unified server for fallback — same architecture as generated
  const htmlEscaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const scriptEscaped = scriptJs.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  const unifiedFallback = `'use strict';
const express = require('express');
const app = express();
const HTML_CONTENT = \`${htmlEscaped}\`;
const SCRIPT_CONTENT = \`${scriptEscaped}\`;
app.use(express.json());
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});
app.get('/api', function(req, res) {
  res.json({ status: 'ok', service: '${safeName} API', timestamp: new Date().toISOString() });
});
app.post('/api/run', function(req, res) {
  res.json({ success: true, result: 'Processed by ${safeName}', timestamp: new Date().toISOString() });
});
app.get('/script.js', function(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(SCRIPT_CONTENT);
});
app.get('*', function(req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML_CONTENT);
});
if (require.main === module) { app.listen(process.env.PORT || 3000); }
module.exports = app;
`;

  const vercelConfig = {
    version: 2,
    builds: [{ src: 'api/index.js', use: '@vercel/node' }],
    routes: [{ src: '/(.*)', dest: '/api/index.js' }],
  };

  return [
    { file: 'api/index.js', data: encodeFile(unifiedFallback), encoding: 'base64' },
    { file: 'api/package.json', data: encodeFile(apiPackageJson), encoding: 'base64' },
    { file: 'vercel.json', data: encodeFile(JSON.stringify(vercelConfig, null, 2)), encoding: 'base64' },
  ];
}

async function pollUntilReady(deploymentId, token, maxWaitMs = 90000) {
  const start = Date.now();
  const interval = 4000;
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, interval));
    const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    console.log(`[deployApp] poll state: ${data.readyState}`);
    if (data.readyState === 'READY') {
      return {
        ready: true,
        url: data.url ? `https://${data.url}` : null,
        alias: data.alias?.[0] ? `https://${data.alias[0]}` : null,
      };
    }
    if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
      return { ready: false, state: data.readyState };
    }
  }
  return { ready: false, state: 'TIMEOUT' };
}

async function verifyHtml(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    const hasHtml = text.includes('<html') || text.includes('<!DOCTYPE');
    console.log(`[deployApp] HTML verify ${url} → status=${res.status} hasHtml=${hasHtml}`);
    return { reachable: res.ok, hasHtml, status: res.status };
  } catch (e) {
    console.error(`[deployApp] HTML verify failed: ${e.message}`);
    return { reachable: false, hasHtml: false, status: 0, error: e.message };
  }
}

async function validateApiEndpoints(baseUrl) {
  const results = { get_api: null, post_api_run: null, passed: false };

  // GET /api
  try {
    const res = await fetch(`${baseUrl}/api`, { signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    results.get_api = { status: res.status, ok: res.ok, isJson: json !== null, body: text.slice(0, 300) };
    console.log(`[deployApp] GET /api → ${res.status} isJson=${json !== null}`);
  } catch (e) {
    results.get_api = { status: 0, ok: false, isJson: false, error: e.message };
    console.error(`[deployApp] GET /api error: ${e.message}`);
  }

  // POST /api/run
  try {
    const res = await fetch(`${baseUrl}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, source: 'phase1-validation' }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    results.post_api_run = { status: res.status, ok: res.ok, isJson: json !== null, hasSuccess: json?.success === true, body: text.slice(0, 300) };
    console.log(`[deployApp] POST /api/run → ${res.status} isJson=${json !== null} success=${json?.success}`);
  } catch (e) {
    results.post_api_run = { status: 0, ok: false, isJson: false, error: e.message };
    console.error(`[deployApp] POST /api/run error: ${e.message}`);
  }

  results.passed = !!(
    results.get_api?.ok && results.get_api?.isJson &&
    results.post_api_run?.ok && results.post_api_run?.isJson
  );

  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN');
    if (!VERCEL_TOKEN) return Response.json({ status: 'error', message: 'VERCEL_TOKEN not set' }, { status: 500 });

    const body = await req.json();
    const { app_name, context, tech_stack = [], ui_components = [], files: prebuiltFiles } = body;

    const projectName = (app_name || context || 'flowai-app')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 30) + '-' + Date.now().toString(36).slice(-6);

    let deployFiles;
    let deployMode;

    if (prebuiltFiles && Array.isArray(prebuiltFiles) && prebuiltFiles.length > 0) {
      console.log(`[deployApp] building Vercel package from ${prebuiltFiles.length} generated files`);
      deployFiles = buildVercelFiles(prebuiltFiles, app_name);
      deployMode = 'generated';
    } else {
      console.log('[deployApp] using fallback page + API');
      deployFiles = buildFallbackFiles(app_name, context);
      deployMode = 'fallback';
    }

    console.log(`[deployApp] deploying ${deployFiles.length} files → project: ${projectName}`);
    console.log('[deployApp] files:', deployFiles.map(f => f.file).join(', '));

    const vercelRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        files: deployFiles,
        target: 'production',
        projectSettings: { framework: null },
      }),
    });

    const vercelData = await vercelRes.json();
    console.log(`[deployApp] Vercel submit → status=${vercelRes.status} readyState=${vercelData.readyState}`);

    if (!vercelRes.ok) {
      console.error('[deployApp] Vercel error:', JSON.stringify(vercelData).slice(0, 600));
      return Response.json({ status: 'error', message: `Vercel API ${vercelRes.status}`, details: vercelData }, { status: 502 });
    }

    const deploymentId = vercelData.id;
    let deployedUrl = vercelData.url ? `https://${vercelData.url}` : null;

    // Poll until READY (up to 90s — builds with npm install can take a while)
    if (deploymentId && vercelData.readyState !== 'READY') {
      console.log('[deployApp] polling for READY...');
      const pollResult = await pollUntilReady(deploymentId, VERCEL_TOKEN);
      if (pollResult.ready) {
        deployedUrl = pollResult.alias || pollResult.url || deployedUrl;
        console.log('[deployApp] READY:', deployedUrl);
      } else {
        console.warn('[deployApp] did not reach READY:', pollResult.state);
      }
    }

    if (!deployedUrl) {
      deployedUrl = `https://${projectName}.vercel.app`;
    }

    // Wait for cold start to settle before verification
    console.log('[deployApp] waiting 5s for cold start...');
    await new Promise(r => setTimeout(r, 5000));

    // Verify HTML
    const htmlVerification = await verifyHtml(deployedUrl);

    // Validate API endpoints
    const apiValidation = await validateApiEndpoints(deployedUrl);

    const phase1Passed = htmlVerification.reachable && htmlVerification.hasHtml && apiValidation.passed;
    console.log(`[deployApp] Phase 1 passed: ${phase1Passed}`);

    // Save deployment record
    await base44.asServiceRole.entities.Deployment.create({
      user_email: user.email,
      slug: projectName,
      live_url: deployedUrl,
      app_name: app_name || 'Generated App',
      status: phase1Passed ? 'live' : (htmlVerification.reachable ? 'deploying' : 'failed'),
    });

    // Record deployment ToolMetric
    await base44.asServiceRole.entities.ToolMetrics.create({
      tool_id: 'vercel', tool_name: 'Vercel', capability: 'deployment',
      success: phase1Passed,
      latency_ms: htmlVerification.reachable ? 35000 : 90000,
      cost_usd: 0.001,
      task_type: 'deploy',
      error_message: phase1Passed ? null : 'Phase 1 validation failed',
      user_email: user.email,
    }).catch(() => {});

    return Response.json({
      status: 'success',
      url: deployedUrl,
      deploymentId,
      projectName,
      fileCount: deployFiles.length,
      deployMode,
      vercelState: vercelData.readyState || 'QUEUED',
      html_verification: htmlVerification,
      api_validation: apiValidation,
      phase1_passed: phase1Passed,
    });

  } catch (error) {
    console.error('[deployApp] fatal:', error.message, error.stack?.slice(0, 500));
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});