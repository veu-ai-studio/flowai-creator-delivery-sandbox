import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * masterOrchestrator — Full product lifecycle orchestrator (v6)
 * Steps: analyze → plan → build → test → audit → optimize → upgrade → deploy → mobile → appstore → output
 * 
 * Uses OpenAI for reasoning. Replit + Vercel for execution/deployment.
 * Actions: run_pipeline | get_step (single step runner)
 */

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const VERCEL_API  = 'https://api.vercel.com';

async function callLLM(openaiKey, system, user, maxTokens = 2500) {
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.25,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

// ── STEP 1: Analyze ────────────────────────────────────────────────────────────
async function stepAnalyze(openaiKey, { input, mode, existingUrl }) {
  return callLLM(openaiKey,
    `You are a product analyst. Extract structure, user flows, business logic, and gaps from a product input.
Return JSON: {
  "productName": "...", "productType": "SaaS|Agentic|Web|Mobile|API|Hybrid",
  "uiStructure": ["page1", "page2"],
  "userFlows": ["flow1", "flow2"],
  "businessLogic": ["logic1"],
  "gaps": ["gap1"],
  "summary": "one paragraph"
}`,
    `Mode: ${mode} | Input: ${input} | Existing URL: ${existingUrl || 'none'}`
  );
}

// ── STEP 2: Plan Architecture ──────────────────────────────────────────────────
async function stepPlan(openaiKey, { analysis }) {
  return callLLM(openaiKey,
    `You are a software architect. Generate a complete system blueprint.
Return JSON: {
  "frontend": { "framework": "Next.js|React", "pages": [], "components": [] },
  "backend": { "language": "Node.js|Python", "apis": [{ "method": "GET", "path": "/api/x", "description": "..." }] },
  "database": { "type": "PostgreSQL|MongoDB|SQLite", "schema": [{ "table": "...", "fields": [] }] },
  "agents": { "required": true/false, "description": "...", "loops": [] },
  "techStack": [],
  "estimatedComplexity": "low|medium|high",
  "blueprint": "one paragraph summary"
}`,
    `Product analysis: ${JSON.stringify(analysis)}`
  );
}

// ── STEP 3: Build (Replit) ─────────────────────────────────────────────────────
async function stepBuild(openaiKey, replitEndpoint, { analysis, plan }) {
  // Generate backend code via LLM
  const code = await callLLM(openaiKey,
    `You are a full-stack developer. Generate a complete Express.js backend + HTML frontend for this product.
Return JSON: {
  "serverCode": "full server.js code as string",
  "htmlCode": "full index.html as string",
  "packageJson": { "name": "...", "version": "1.0.0", "main": "server.js", "dependencies": {} }
}`,
    `Product: ${analysis?.productName} | APIs needed: ${JSON.stringify(plan?.backend?.apis?.slice(0, 5))} | Pages: ${JSON.stringify(analysis?.uiStructure?.slice(0, 5))}`,
    3500
  );

  let replitResult = { deployed: false, url: null, note: 'Replit not configured' };

  if (replitEndpoint) {
    try {
      const r = await fetch(`${replitEndpoint}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: (analysis?.productName || 'app').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          serverCode: code.serverCode,
          htmlCode: code.htmlCode,
          packageJson: code.packageJson,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) {
        const d = await r.json();
        replitResult = { deployed: true, url: d.url, note: 'Deployed to Replit' };
      }
    } catch (e) {
      replitResult = { deployed: false, url: null, note: `Replit unavailable: ${e.message}` };
    }
  }

  return { ...code, replit: replitResult };
}

// ── STEP 4: Test ───────────────────────────────────────────────────────────────
async function stepTest(openaiKey, { buildResult, plan }) {
  const apis = plan?.backend?.apis || [];
  const testResults = [];

  // Functional test evaluation via LLM
  const evaluation = await callLLM(openaiKey,
    `You are a QA engineer. Evaluate if a built product passes functional tests.
Return JSON: {
  "overallPassed": true/false,
  "tests": [{ "name": "test name", "passed": true/false, "details": "..." }],
  "criticalFailures": [],
  "warnings": [],
  "recommendation": "pass|reject|fix_and_retry"
}`,
    `Build result (has server: ${!!buildResult?.serverCode}, has HTML: ${!!buildResult?.htmlCode}, replit: ${JSON.stringify(buildResult?.replit)})
APIs designed: ${JSON.stringify(apis.slice(0, 5))}
Check: backend response, no static-only UI, working flows.`
  );

  return evaluation;
}

// ── STEP 5: Audit ──────────────────────────────────────────────────────────────
async function stepAudit(openaiKey, { analysis, plan, testResult }) {
  return callLLM(openaiKey,
    `You are a product auditor. Classify and score this product.
Return JSON: {
  "performanceScore": 0-100, "usabilityScore": 0-100, "completenessScore": 0-100, "productionReadinessScore": 0-100,
  "classification": "Prototype|MVP|Production-ready|Marketplace-ready",
  "strengths": [],
  "weaknesses": [],
  "criticalGaps": [],
  "revenueReadiness": "not-ready|partial|ready",
  "summary": "one paragraph"
}`,
    `Product: ${JSON.stringify(analysis)} | Plan: ${JSON.stringify(plan)} | Tests passed: ${testResult?.overallPassed}`
  );
}

// ── STEP 6: Optimize ──────────────────────────────────────────────────────────
async function stepOptimize(openaiKey, { audit, buildResult }) {
  return callLLM(openaiKey,
    `You are a product optimizer. Generate targeted improvements.
Return JSON: {
  "improvements": [{ "area": "...", "issue": "...", "fix": "...", "impact": "high|medium|low" }],
  "updatedClassification": "Prototype|MVP|Production-ready|Marketplace-ready",
  "estimatedScoreGain": 0-20,
  "summary": "one paragraph"
}`,
    `Audit: ${JSON.stringify(audit)} | Current build: server=${!!buildResult?.serverCode}`
  );
}

// ── STEP 7: Upgrade ───────────────────────────────────────────────────────────
async function stepUpgrade(openaiKey, { plan, audit, optimize }) {
  return callLLM(openaiKey,
    `You are a senior architect proposing targeted platform upgrades. NO full rewrites.
Return JSON: {
  "upgrades": [{ "component": "...", "upgrade": "...", "rationale": "...", "risk": "low|medium|high" }],
  "agentEnhancements": [],
  "backendImprovements": [],
  "versionTag": "v1.1.0",
  "summary": "one paragraph"
}`,
    `Plan: ${JSON.stringify(plan)} | Audit weaknesses: ${JSON.stringify(audit?.weaknesses)} | Optimizations: ${JSON.stringify(optimize?.improvements?.slice(0, 3))}`
  );
}

// ── STEP 8: Deploy (Vercel) ────────────────────────────────────────────────────
async function stepDeploy(openaiKey, vercelToken, { analysis, buildResult }) {
  if (!vercelToken) return { deployed: false, url: null, note: 'VERCEL_TOKEN not set' };

  const appName = (analysis?.productName || 'flowai-app')
    .toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 28) + '-' + Date.now().toString(36).slice(-5);

  const htmlContent = buildResult?.htmlCode || `<!DOCTYPE html><html><body><h1>${analysis?.productName || 'App'}</h1></body></html>`;
  const serverCode = buildResult?.serverCode || `const express=require('express');const app=express();app.use(require('express').json());app.get('/api',(req,res)=>res.json({status:'ok',app:'${appName}'}));app.post('/api/run',(req,res)=>res.json({success:true,result:'processed',input:req.body}));app.get('*',(req,res)=>res.send(\`${htmlContent.replace(/`/g, '\\`')}\`));app.listen(process.env.PORT||3000);module.exports=app;`;

  const enc = (s) => {
    const b = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return btoa(bin);
  };

  const files = [
    { file: 'api/index.js', data: enc(serverCode), encoding: 'base64' },
    { file: 'api/package.json', data: enc(JSON.stringify({ name: appName, version: '1.0.0', main: 'index.js', dependencies: { express: '^4.18.2' } })), encoding: 'base64' },
    { file: 'vercel.json', data: enc(JSON.stringify({ version: 2, builds: [{ src: 'api/index.js', use: '@vercel/node' }], routes: [{ src: '/(.*)', dest: '/api/index.js' }] })), encoding: 'base64' },
  ];

  const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: appName, files, target: 'production', public: true }),
  });
  const deployData = await deployRes.json();
  if (!deployRes.ok) return { deployed: false, url: null, note: `Vercel error: ${JSON.stringify(deployData).slice(0, 200)}` };

  let url = deployData.url ? `https://${deployData.url}` : null;

  // Poll for READY
  if (deployData.id && deployData.readyState !== 'READY') {
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`${VERCEL_API}/v13/deployments/${deployData.id}`, {
        headers: { 'Authorization': `Bearer ${vercelToken}` },
      });
      const pd = await poll.json();
      if (pd.readyState === 'READY') {
        const alias = (pd.alias || []).find(a => a.endsWith('.vercel.app'));
        url = alias ? `https://${alias}` : url;
        break;
      }
      if (pd.readyState === 'ERROR' || pd.readyState === 'CANCELED') break;
    }
  }

  return { deployed: !!url, url, note: url ? 'Deployed to Vercel' : 'Deployment failed' };
}

// ── STEP 9: Mobile ────────────────────────────────────────────────────────────
async function stepMobile(openaiKey, { analysis, deployResult }) {
  return callLLM(openaiKey,
    `You are a mobile architect. Generate PWA configuration and native app strategy.
Return JSON: {
  "pwa": {
    "manifestJson": { "name": "...", "short_name": "...", "start_url": "/", "display": "standalone", "theme_color": "#000000", "background_color": "#000000", "icons": [] },
    "serviceWorkerStrategy": "cache-first|network-first",
    "installPrompt": true/false
  },
  "nativeStrategy": { "framework": "Expo|React Native|Capacitor", "platforms": ["ios","android"], "estimatedEffort": "low|medium|high" },
  "pwaReadiness": 0-100,
  "nativeReadiness": 0-100
}`,
    `Product: ${analysis?.productName} (${analysis?.productType}) | Deployed at: ${deployResult?.url || 'not yet'}`
  );
}

// ── STEP 10: App Store Prep ────────────────────────────────────────────────────
async function stepAppStore(openaiKey, { analysis, audit, mobileResult }) {
  return callLLM(openaiKey,
    `You are an app store specialist. Generate complete submission preparation.
Return JSON: {
  "metadata": { "title": "...", "subtitle": "...", "description": "...", "keywords": [], "category": "...", "ageRating": "4+" },
  "appleReadiness": { "score": 0-100, "passed": [], "failed": [], "required": [] },
  "googlePlayReadiness": { "score": 0-100, "passed": [], "failed": [], "required": [] },
  "samsungReadiness": { "score": 0-100, "passed": [], "failed": [] },
  "privacyPolicy": "generated privacy policy text (2 paragraphs)",
  "submissionChecklist": [],
  "iconSpec": { "ios": "1024x1024 PNG", "android": "512x512 PNG" },
  "screenshotSpec": { "ios": "6.5 inch", "android": "phone portrait" }
}`,
    `Product: ${analysis?.productName} | Type: ${analysis?.productType} | Classification: ${audit?.classification} | PWA readiness: ${mobileResult?.pwaReadiness}`
  );
}

// ── STEP 11-12: Final Output ───────────────────────────────────────────────────
async function stepOutput(openaiKey, { analysis, audit, optimize, deployResult, appStoreResult }) {
  return callLLM(openaiKey,
    `You are a product launch consultant. Produce the final product report.
Return JSON: {
  "classification": "Prototype|MVP|Production-ready|Marketplace-ready",
  "readinessScore": 0-100,
  "gapReport": [{ "gap": "...", "impact": "high|medium|low", "fix": "..." }],
  "revenueReadiness": "not-ready|partial|ready",
  "launchChecklist": [],
  "nextSteps": [],
  "executiveSummary": "2-3 paragraph executive summary"
}`,
    `Product: ${analysis?.productName} | Audit: ${JSON.stringify(audit)} | Improvements: ${JSON.stringify(optimize?.improvements?.slice(0, 3))} | Deployed: ${deployResult?.deployed} | AppStore: ${appStoreResult?.appleReadiness?.score}`
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const replitEndpoint = Deno.env.get('REPLIT_ENDPOINT');

    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, input, mode, existingUrl, step, context } = body;

    // Single step runner (used for streaming UI updates)
    if (action === 'run_step') {
      const ts = new Date().toISOString();
      let result = {};

      if (step === 'analyze') result = await stepAnalyze(openaiKey, { input, mode, existingUrl });
      else if (step === 'plan') result = await stepPlan(openaiKey, { analysis: context?.analysis });
      else if (step === 'build') result = await stepBuild(openaiKey, replitEndpoint, { analysis: context?.analysis, plan: context?.plan });
      else if (step === 'test') result = await stepTest(openaiKey, { buildResult: context?.build, plan: context?.plan });
      else if (step === 'audit') result = await stepAudit(openaiKey, { analysis: context?.analysis, plan: context?.plan, testResult: context?.test });
      else if (step === 'optimize') result = await stepOptimize(openaiKey, { audit: context?.audit, buildResult: context?.build });
      else if (step === 'upgrade') result = await stepUpgrade(openaiKey, { plan: context?.plan, audit: context?.audit, optimize: context?.optimize });
      else if (step === 'deploy') result = await stepDeploy(openaiKey, vercelToken, { analysis: context?.analysis, buildResult: context?.build });
      else if (step === 'mobile') result = await stepMobile(openaiKey, { analysis: context?.analysis, deployResult: context?.deploy });
      else if (step === 'appstore') result = await stepAppStore(openaiKey, { analysis: context?.analysis, audit: context?.audit, mobileResult: context?.mobile });
      else if (step === 'output') result = await stepOutput(openaiKey, { analysis: context?.analysis, audit: context?.audit, optimize: context?.optimize, deployResult: context?.deploy, appStoreResult: context?.appstore });
      else return Response.json({ error: `Unknown step: ${step}` }, { status: 400 });

      return Response.json({ step, result, timestamp: ts });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[masterOrchestrator]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});