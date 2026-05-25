#!/usr/bin/env node

async function main() {
  const productionUrl = (process.env.FLOWAI_PRODUCTION_URL || 'https://flowai-dun.vercel.app').replace(/\/+$/, '');
  const endpoint = `${productionUrl}/api/deploy-truth-check`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { ok: false, status: 'BLOCKED', error: text || 'invalid_json_response' };
  }

  console.log(JSON.stringify(payload, null, 2));
  if (!response.ok || payload.status === 'BLOCKED') process.exitCode = 2;
  else if (payload.status === 'DRIFT') process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    status: 'BLOCKED',
    error: error?.message || String(error),
  }));
  process.exitCode = 2;
});
