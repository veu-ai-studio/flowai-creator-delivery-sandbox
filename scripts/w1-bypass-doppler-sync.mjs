// scripts/w1-bypass-doppler-sync.mjs
//
// Corrects Doppler's VERCEL_AUTOMATION_BYPASS_SECRET to match Vercel's
// canonical bypass entry (the actual secret Vercel's edge checks against).
//
// Required env (provided by `doppler run --project flowai --config prd`):
//   VERCEL_TOKEN
// Required env (from caller):
//   DOPPLER_CLI_DIR    e.g. /c/Users/victo/doppler-cli
//
// Never logs the secret value. Logs only:
//   - byte counts + sha8 to confirm before/after state
//   - doppler set exit code

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const DOPPLER_DIR = process.env.DOPPLER_CLI_DIR || '';
const TEAM = 'team_5ETNaLpTdaXrNj3bRhOJG3Jt';
const PROJ = 'prj_5ekolTZZmKCyorR8mOIVL6qtduji';

function sha8(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 8);
}

if (!VERCEL_TOKEN) {
  console.error('FAIL: VERCEL_TOKEN missing');
  process.exitCode = 1;
} else {
  await main();
}

async function main() {
  console.log('=== W1 Doppler sync — correct VERCEL_AUTOMATION_BYPASS_SECRET to canonical value ===');

  const r = await fetch(`https://api.vercel.com/v9/projects/${PROJ}?teamId=${TEAM}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
  if (!r.ok) {
    console.error('FAIL: project fetch', r.status);
    process.exitCode = 2; return;
  }
  const proj = await r.json();
  const bypassKeys = Object.keys(proj.protectionBypass || {});
  if (bypassKeys.length === 0) {
    console.error('FAIL: no bypass entries at Vercel');
    process.exitCode = 3; return;
  }
  const canonical = bypassKeys[bypassKeys.length - 1];
  console.log(`canonical from Vercel: bytes=${canonical.length} sha8=${sha8(canonical)}`);

  // Spawn doppler secrets set with stdin (avoids putting value on argv).
  const exe = DOPPLER_DIR ? `${DOPPLER_DIR.replace(/\/$/, '')}/doppler` : 'doppler';
  const rc = await new Promise((resolve) => {
    const c = spawn(exe, ['secrets', 'set', 'VERCEL_AUTOMATION_BYPASS_SECRET',
      '--project', 'flowai', '--config', 'prd', '--silent'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    c.stdout.on('data', () => {});
    c.stderr.on('data', (b) => { err += b.toString(); });
    c.on('error', (e) => { console.error('spawn error:', e.message); resolve(127); });
    c.on('close', (code) => {
      if (code !== 0 && err) {
        const safe = err.slice(0, 200).replace(/[A-Za-z0-9]{16,}/g, '<redacted>');
        console.error('doppler stderr (redacted):', safe);
      }
      resolve(code ?? -1);
    });
    c.stdin.write(canonical);
    c.stdin.end();
  });

  if (rc !== 0) {
    console.error('FAIL: doppler set exit', rc);
    process.exitCode = 4; return;
  }
  console.log('doppler set: ok');
  console.log('Doppler now stores the canonical 32-byte Vercel bypass value.');
}
