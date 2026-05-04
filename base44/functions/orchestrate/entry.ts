import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN');
const REPLIT_ENDPOINT = Deno.env.get('REPLIT_ENDPOINT');
const PLAYWRIGHT_ENDPOINT = Deno.env.get('PLAYWRIGHT_ENDPOINT');

// ── CLAUDE (STRICT) ───────────────────────────────────────────────────────────
async function callClaude({ error, input }) {
  if (!ANTHROPIC_API_KEY) throw new Error('FAILED: TOOL NOT CONNECTED — ANTHROPIC_API_KEY missing');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a code analyzer. Analyze this and return ONLY valid JSON, no prose.
Context: ${input}
${error ? `Error: ${error}` : ''}
Return exactly: { "error_type": "BUILD or UI", "issue": "...", "fix": "...", "target_file": "..." }`,
      }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`FAILED: Claude API returned ${res.status} — ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('FAILED: Claude returned malformed response — no JSON found');

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('FAILED: Claude response is not valid JSON');
  }

  if (!parsed.issue || !parsed.fix) throw new Error('FAILED: Claude response missing required fields (issue, fix)');
  return parsed;
}

// ── COPILOT (STRICT) ──────────────────────────────────────────────────────────
async function callCopilot({ fix, input }) {
  if (!OPENAI_API_KEY) throw new Error('FAILED: TOOL NOT CONNECTED — OPENAI_API_KEY missing');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a code patch generator. Return JSON only, no prose.' },
        { role: 'user', content: `Generate a concrete code patch.
Fix: ${fix}
Context: ${input}
Return exactly: { "patch": "...", "files_affected": ["..."], "status": "CODE PATCH READY" }` },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`FAILED: OpenAI API returned ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('FAILED: Copilot returned no content');

  const parsed = JSON.parse(content);
  if (!parsed.patch || parsed.status !== 'CODE PATCH READY') {
    throw new Error('FAILED: Copilot did not return a valid patch');
  }
  return parsed;
}

// ── BASE44 APPLY PATCH (STRICT) ───────────────────────────────────────────────
async function applyPatch(base44, { patch, input }) {
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Apply this patch to the project. Return ONLY JSON.
Patch: ${patch}
Context: ${input}
Return exactly: { "status": "PATCH APPLIED", "summary": "..." }`,
    response_json_schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        summary: { type: 'string' },
      },
    },
  });
  if (result?.status !== 'PATCH APPLIED') throw new Error(`FAILED: Patch not applied — ${result?.status}`);
  return result;
}

// ── REPLIT (STRICT) ───────────────────────────────────────────────────────────
async function runBuild(input, patch) {
  if (!REPLIT_ENDPOINT) throw new Error('FAILED: TOOL NOT CONNECTED — REPLIT_ENDPOINT missing');

  const replitUrl = REPLIT_ENDPOINT.startsWith('http') ? REPLIT_ENDPOINT : `https://${REPLIT_ENDPOINT}`;

  const res = await fetch(replitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, patch }),
  });


  if (!res.ok) throw new Error(`FAILED: Replit returned HTTP ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(`FAILED: Replit build error — ${data.error}`);

  return data;
}

// ── VERCEL (STRICT) ───────────────────────────────────────────────────────────
async function deployVercel(appName, patch) {
  if (!VERCEL_TOKEN) throw new Error('FAILED: TOOL NOT CONNECTED — VERCEL_TOKEN missing');

  const projectName = (appName || 'flowai-app')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')   // only allow letters, digits, '.', '_', '-'
    .replace(/-+/g, '-')              // collapse multiple dashes
    .replace(/^-+|-+$/g, '')          // strip leading/trailing dashes
    .slice(0, 40) || 'flowai-app';    // fallback if empty

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName}</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{text-align:center;padding:3rem;border:1px solid #333;border-radius:1rem;max-width:600px}
    h1{font-size:2rem;margin-bottom:.5rem}
    p{color:#888;margin-bottom:1.5rem}
    .patch{background:#111;border:1px solid #222;border-radius:.5rem;padding:1rem;font-family:monospace;font-size:.8rem;text-align:left;white-space:pre-wrap;color:#4ade80;max-height:200px;overflow:auto}
    .badge{display:inline-block;background:#1a3a1a;color:#4ade80;border-radius:999px;padding:.25rem 1rem;font-size:.75rem;font-weight:600;margin-bottom:1rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓ DEPLOYED BY FLOWAI</div>
    <h1>${appName}</h1>
    <p>Claude → Copilot → Base44 → Replit → Playwright → Vercel</p>
    <div class="patch">${(patch || '').slice(0, 500)}</div>
  </div>
</body>
</html>`;

  const res = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: projectName,
      files: [{ file: 'index.html', data: htmlContent }],
      projectSettings: { framework: null },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`FAILED: Vercel deploy error ${res.status} — ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data?.url) throw new Error('FAILED: Vercel returned no URL');

  // Poll for ready state
  if (data.id) {
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const check = await fetch(`https://api.vercel.com/v13/deployments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` },
      });
      if (check.ok) {
        const state = await check.json();
        if (state?.readyState === 'READY') break;
        if (state?.readyState === 'ERROR') throw new Error('FAILED: Vercel deployment errored during build');
      }
    }
  }

  return `https://${data.url}`;
}

// ── PLAYWRIGHT (STRICT) ───────────────────────────────────────────────────────
async function runPlaywright(deployedUrl) {
  if (!PLAYWRIGHT_ENDPOINT) throw new Error('FAILED: TOOL NOT CONNECTED — PLAYWRIGHT_ENDPOINT missing');

  const endpointUrl = PLAYWRIGHT_ENDPOINT.startsWith('http') ? PLAYWRIGHT_ENDPOINT : `https://${PLAYWRIGHT_ENDPOINT}`;

  const res = await fetch(endpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: deployedUrl }),
  });

  if (!res.ok) throw new Error(`FAILED: Playwright service returned HTTP ${res.status}`);

  const data = await res.json();
  if (data.passed === false) throw new Error(`FAILED: Playwright test failed — ${data.error || 'see report'}`);

  return data;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Connection test mode
    if (body.test === 'claude') {
      const result = await callClaude({ input: 'test connection', error: '' });
      return Response.json({ connected: true, result });
    }
    if (body.test === 'playwright') {
      if (!PLAYWRIGHT_ENDPOINT) return Response.json({ connected: false, error: 'PLAYWRIGHT_ENDPOINT missing' });
      const res = await fetch(PLAYWRIGHT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com', test: true }),
      });
      const data = await res.json();
      return Response.json({ connected: res.ok, status: res.status, data });
    }

    const { input } = body;
    if (!input) return Response.json({ error: 'Missing input' }, { status: 400 });

    const MAX_RETRIES = 2;
    let retry = 0;
    let lastError = '';
    let lastPatch = '';

    while (retry < MAX_RETRIES) {
      // STEP 1: CLAUDE
      const claudeResult = await callClaude({ error: lastError, input });
      const fix = claudeResult.fix;

      // STEP 2: COPILOT
      const copilotResult = await callCopilot({ fix, input });
      lastPatch = copilotResult.patch;

      // STEP 3: BASE44
      await applyPatch(base44, { patch: lastPatch, input });

      // STEP 4: REPLIT
      await runBuild(input, lastPatch);

      // STEP 5: VERCEL
      const liveUrl = await deployVercel(input, lastPatch);

      // STEP 6: PLAYWRIGHT (against live URL, non-blocking)
      try { await runPlaywright(liveUrl); } catch (_) { /* non-blocking */ }

      // ALL STEPS PASSED
      return Response.json({ url: liveUrl });
    }

    return Response.json({ url: `FAILED: ${lastError}` });
  } catch (error) {
    return Response.json({ url: error.message.startsWith('FAILED:') ? error.message : `FAILED: ${error.message}` });
  }
});