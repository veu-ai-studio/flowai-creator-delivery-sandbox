// scripts/w1-vercel-bypass-setup.mjs
//
// W1 — Vercel Protection Bypass for Automation: create + persist to Doppler.
//
// Invocation (run under `doppler run` so VERCEL_TOKEN is in the env):
//   doppler run --project flowai --config prd -- node scripts/w1-vercel-bypass-setup.mjs
//
// Required env vars (read at start):
//   VERCEL_TOKEN              — Vercel API bearer (from Doppler)
//   VERCEL_PROJECT_ID         — e.g. prj_5ekolTZZmKCyorR8mOIVL6qtduji
//   VERCEL_TEAM_ID            — e.g. team_5ETNaLpTdaXrNj3bRhOJG3Jt
//   DOPPLER_CLI_DIR           — optional: path containing the doppler executable
//                               (needed only when not already on PATH)
//
// Never logs the bypass secret value. Logs only:
//   - HTTP status code from Vercel API
//   - Response field names / shape diagnostics
//   - Byte length of secret (for sanity)
//   - exit code from doppler secrets set
//
// Uses process.exitCode + return (Defect 5 fix pattern). ESM only.

import { spawn } from 'node:child_process';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJ = process.env.VERCEL_PROJECT_ID;
const TEAM = process.env.VERCEL_TEAM_ID;
const DOPPLER_DIR = process.env.DOPPLER_CLI_DIR || '';

if (!VERCEL_TOKEN || !PROJ || !TEAM) {
  console.error('FAIL: missing required env (VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID)');
  process.exitCode = 1;
} else {
  await main();
}

async function main() {
  console.log('=== W1 Vercel Protection Bypass Setup ===');
  console.log(`project: ${PROJ}`);
  console.log(`team:    ${TEAM}`);

  // 1. Create the bypass via Vercel REST API
  console.log('\n[1/3] POST /v1/projects/{id}/protection-bypass ...');
  const url = `https://api.vercel.com/v1/projects/${PROJ}/protection-bypass?teamId=${TEAM}`;
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
  } catch (err) {
    console.error('FAIL: fetch error:', err?.message ?? String(err));
    process.exitCode = 2;
    return;
  }

  const text = await resp.text();
  console.log(`  status: ${resp.status} ${resp.statusText}`);

  if (!resp.ok) {
    // Log error body only — error responses don't contain the secret.
    console.error('FAIL: Vercel API error body (truncated):');
    console.error(`  ${text.slice(0, 400)}`);
    process.exitCode = 3;
    return;
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    console.error('FAIL: response is not valid JSON');
    process.exitCode = 4;
    return;
  }

  // 2. Extract the secret. The response shape from Vercel can be either:
  //    (a) { secret: { value: "...", createdAt: ..., scope: "automation-bypass" } }
  //    (b) { secret: "..." }  (older docs)
  //    (c) { protectionBypass: { "<secret>": { createdAt, scope } } }
  //    Probe defensively.
  console.log('\n[2/3] Parsing response for secret value (not logged)...');
  let secret = null;
  let secretMeta = {};
  if (typeof body?.secret === 'string') {
    secret = body.secret;
    secretMeta = { shape: 'top-level-string' };
  } else if (typeof body?.secret?.value === 'string') {
    secret = body.secret.value;
    secretMeta = {
      shape: 'top-level-object',
      createdAt: body.secret.createdAt,
      scope: body.secret.scope,
    };
  } else if (body?.protectionBypass && typeof body.protectionBypass === 'object') {
    const keys = Object.keys(body.protectionBypass);
    if (keys.length > 0) {
      secret = keys[keys.length - 1]; // newest entry; secret is the key itself
      secretMeta = {
        shape: 'protectionBypass-map',
        createdAt: body.protectionBypass[secret]?.createdAt,
        scope: body.protectionBypass[secret]?.scope,
      };
    }
  }

  if (!secret || typeof secret !== 'string' || secret.length < 16) {
    console.error('FAIL: could not extract bypass secret from response.');
    console.error('  top-level keys:', Object.keys(body));
    process.exitCode = 5;
    return;
  }
  console.log(`  shape:     ${secretMeta.shape}`);
  console.log(`  bytes:     ${secret.length}`);
  if (secretMeta.createdAt) console.log(`  createdAt: ${secretMeta.createdAt}`);
  if (secretMeta.scope) console.log(`  scope:     ${secretMeta.scope}`);

  // 3. Persist to Doppler flowai/prd via spawn with stdin (avoids putting
  //    the secret on the command line where `ps` might catch it).
  console.log('\n[3/3] Persisting to Doppler flowai/prd ...');
  const dopplerExec = DOPPLER_DIR ? `${DOPPLER_DIR.replace(/\/$/, '')}/doppler` : 'doppler';
  const rc = await runDoppler(dopplerExec, [
    'secrets', 'set',
    'VERCEL_AUTOMATION_BYPASS_SECRET',
    '--project', 'flowai',
    '--config',  'prd',
    '--silent',
  ], secret);

  if (rc !== 0) {
    console.error(`FAIL: doppler secrets set exited ${rc}`);
    process.exitCode = 6;
    return;
  }
  console.log('  doppler secrets set: ok');

  console.log('\nDONE. Bypass created and persisted to Doppler.');
  // process.exitCode defaults to 0
}

function runDoppler(exe, args, stdinValue) {
  return new Promise((resolve) => {
    const child = spawn(exe, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stdout.on('data', (b) => { /* swallow stdout */ void b; });
    child.stderr.on('data', (b) => { stderr += b.toString(); });
    child.on('error', (err) => {
      console.error('  doppler spawn error:', err.message);
      resolve(127);
    });
    child.on('close', (code) => {
      if (code !== 0 && stderr) {
        // Doppler's stderr may include the secret value if it echoes set values;
        // truncate aggressively to be safe. (Empirically --silent suppresses.)
        const safe = stderr.slice(0, 200).replace(/[A-Za-z0-9]{16,}/g, '<redacted>');
        console.error('  doppler stderr (redacted):', safe);
      }
      resolve(code ?? -1);
    });
    // Pipe secret via stdin; close stdin so Doppler completes.
    child.stdin.write(stdinValue);
    child.stdin.end();
  });
}
