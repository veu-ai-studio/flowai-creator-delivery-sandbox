// scripts/w1-bypass-diag-and-verify.mjs
//
// Diagnoses whether Doppler's VERCEL_AUTOMATION_BYPASS_SECRET matches
// Vercel's project-level bypass entry, and smoke-tests the canonical
// Vercel value against the latest READY preview URL.
//
// Never echoes either secret value. Logs only:
//   - SHA-256 first-8 char comparison (to confirm match/mismatch)
//   - Byte lengths
//   - HTTP status codes from smoke tests
//
// Run under `doppler run` so VERCEL_TOKEN + VERCEL_AUTOMATION_BYPASS_SECRET
// are injected.

import { createHash } from 'node:crypto';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const DOPPLER_BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const TEAM = 'team_5ETNaLpTdaXrNj3bRhOJG3Jt';
const PROJ = 'prj_5ekolTZZmKCyorR8mOIVL6qtduji';

function sha8(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 8);
}

if (!VERCEL_TOKEN || !DOPPLER_BYPASS) {
  console.error('FAIL: missing VERCEL_TOKEN or VERCEL_AUTOMATION_BYPASS_SECRET in env');
  process.exitCode = 1;
} else {
  await main();
}

async function main() {
  console.log('=== W1 bypass diag + verify ===\n');

  // 1. Fetch Vercel project and extract canonical bypass key.
  const projUrl = `https://api.vercel.com/v9/projects/${PROJ}?teamId=${TEAM}`;
  const r1 = await fetch(projUrl, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  if (!r1.ok) {
    console.error('FAIL: project fetch', r1.status);
    process.exitCode = 2; return;
  }
  const project = await r1.json();
  const bypassMap = project.protectionBypass || {};
  const bypassKeys = Object.keys(bypassMap);
  console.log('[1/4] Vercel project protectionBypass entries:', bypassKeys.length);
  if (bypassKeys.length === 0) {
    console.error('FAIL: project has no bypass entry');
    process.exitCode = 3; return;
  }
  const VERCEL_BYPASS = bypassKeys[bypassKeys.length - 1]; // newest

  console.log(`     Vercel  bypass: bytes=${VERCEL_BYPASS.length}  sha8=${sha8(VERCEL_BYPASS)}  prefix3=${'X'.repeat(3)}`);
  console.log(`     Doppler bypass: bytes=${DOPPLER_BYPASS.length}  sha8=${sha8(DOPPLER_BYPASS)}  prefix3=${'X'.repeat(3)}`);
  const match = (VERCEL_BYPASS === DOPPLER_BYPASS);
  console.log(`     match: ${match}`);

  // Also: check if Doppler value CONTAINS the Vercel value (CEO pasted with surrounding text)
  if (!match) {
    const contains = DOPPLER_BYPASS.includes(VERCEL_BYPASS);
    console.log(`     doppler-contains-vercel: ${contains}`);
    if (contains) {
      const idx = DOPPLER_BYPASS.indexOf(VERCEL_BYPASS);
      const before = idx;
      const after = DOPPLER_BYPASS.length - idx - VERCEL_BYPASS.length;
      console.log(`     -> Doppler has ${before} bytes BEFORE the Vercel value and ${after} bytes AFTER`);
    }
  }

  // 2. Find latest READY preview deployment URL.
  console.log('\n[2/4] Latest READY preview deployment:');
  const dpUrl =
    `https://api.vercel.com/v6/deployments?projectId=${PROJ}&teamId=${TEAM}&state=READY&limit=10`;
  const r2 = await fetch(dpUrl, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  const dps = (await r2.json()).deployments || [];
  // Filter to non-production (preview): target !== 'production'
  const previews = dps.filter((d) => d.target !== 'production');
  if (previews.length === 0) {
    console.error('FAIL: no READY preview deployments');
    process.exitCode = 4; return;
  }
  const PREVIEW_URL = `https://${previews[0].url}`;
  console.log('     url:', PREVIEW_URL);

  // 3. Positive smoke with the canonical Vercel value (header form).
  console.log('\n[3/4] Positive smoke — header form, canonical Vercel value:');
  const posHeader = await fetchStatus(PREVIEW_URL + '/', {
    method: 'HEAD',
    headers: { 'x-vercel-protection-bypass': VERCEL_BYPASS },
    redirect: 'follow',
  });
  console.log('     status:', posHeader);

  // Positive: query-param form, URL-encoded
  const qpUrl = `${PREVIEW_URL}/?x-vercel-protection-bypass=${encodeURIComponent(VERCEL_BYPASS)}&x-vercel-set-bypass-cookie=true`;
  const posQp = await fetchStatus(qpUrl, { method: 'HEAD', redirect: 'follow' });
  console.log('     status (query-param form):', posQp);

  // 4. Negative control: no bypass.
  console.log('\n[4/4] Negative control — no bypass:');
  const neg = await fetchStatus(PREVIEW_URL + '/', { method: 'HEAD', redirect: 'manual' });
  console.log('     status:', neg);

  console.log('\nSummary:');
  console.log(`  doppler-matches-vercel: ${match}`);
  console.log(`  positive (header):      ${posHeader}`);
  console.log(`  positive (query-param): ${posQp}`);
  console.log(`  negative (no bypass):   ${neg}`);

  const pass =
    (posHeader === 200 || posHeader === 308) &&
    (neg === 401 || neg === 403);
  console.log(`\nOverall smoke verdict: ${pass ? 'PASS' : 'FAIL'}`);
  process.exitCode = pass ? 0 : 5;
}

async function fetchStatus(url, opts) {
  try {
    const r = await fetch(url, opts);
    return r.status;
  } catch (e) {
    return `ERR:${(e?.message ?? String(e)).slice(0, 80)}`;
  }
}
