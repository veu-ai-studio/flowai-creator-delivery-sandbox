// scripts/w1-bypass-git-sequence.mjs
// Run the acquireLock → stage → commit → push → releaseLock sequence
// for the Vercel bypass dispatch.

import { spawn } from 'node:child_process';
import { acquireLock, releaseLock } from './lib/wx-stage-lock.mjs';

function run(cmd, args) {
  return new Promise((resolve) => {
    const c = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    c.stdout.on('data', (b) => out += b.toString());
    c.stderr.on('data', (b) => err += b.toString());
    c.on('error', (e) => { console.error('spawn err:', e.message); resolve({ code: 127, out, err }); });
    c.on('close', (code) => resolve({ code, out, err }));
  });
}

async function main() {
  await acquireLock('W1');
  let pushed = false;
  try {
    console.log('--- git add ---');
    const add = await run('git', [
      'add',
      'docs/operations/vercel-deployment-protection-bypass.md',
      'scripts/w1-bypass-diag-and-verify.mjs',
      'scripts/w1-bypass-doppler-sync.mjs',
      'scripts/w1-bypass-git-sequence.mjs',
      'scripts/w1-vercel-bypass-setup.mjs',
    ]);
    if (add.code !== 0) { console.error('add failed:', add.err); process.exitCode = 1; return; }

    console.log('--- git diff --cached --stat ---');
    const stat = await run('git', ['diff', '--cached', '--stat']);
    process.stdout.write(stat.out);

    console.log('--- git commit ---');
    const msg = [
      'feat: Vercel Deployment Protection bypass live; operations doc + verification [W1]',
      '',
      'Vercel Protection Bypass for Automation was generated via dashboard',
      '(CEO action) and saved to Doppler flowai/prd. Vercel auto-synced it',
      'to the project as System Environment Variable VERCEL_AUTOMATION_BYPASS_SECRET.',
      '',
      'W1 verified end-to-end:',
      '  - Doppler matches Vercel (sha8=9cc181d3, 32 bytes)',
      '  - Positive smoke via header form: HTTP 200 (latest READY preview URL)',
      '  - Negative control without bypass: HTTP 401 (gate still active)',
      '  - Production gate (ssoProtection=all_except_custom_domains) unchanged',
      '',
      'Drift surfaced + corrected: initial Doppler value was a 148-byte',
      'paste that did not match Vercel\'s 32-byte canonical. Re-synced via',
      'scripts/w1-bypass-doppler-sync.mjs which reads the canonical from',
      'Vercel\'s protectionBypass project property and writes to Doppler',
      'via stdin (never echoes the value).',
      '',
      'Files:',
      '  - docs/operations/vercel-deployment-protection-bypass.md (operations runbook)',
      '  - scripts/w1-bypass-diag-and-verify.mjs (Doppler↔Vercel match + smoke; sha8 only, no value echo)',
      '  - scripts/w1-bypass-doppler-sync.mjs (post-rotation Doppler correction; stdin-based, no value echo)',
      '  - scripts/w1-vercel-bypass-setup.mjs (retained: REST-API creation script, currently unused — Vercel public REST does not expose the endpoint on Pro plan)',
      '',
      'Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>',
    ].join('\n');
    const commit = await run('git', ['commit', '-m', msg]);
    if (commit.code !== 0) {
      console.error('commit failed code', commit.code, ':\n', commit.out, commit.err);
      process.exitCode = 2; return;
    }
    process.stdout.write(commit.out);

    console.log('--- git push ---');
    const push = await run('git', ['push', 'origin', 'flowai-v0.1']);
    process.stdout.write(push.out);
    process.stderr.write(push.err);
    if (push.code !== 0) { console.error('push failed:', push.code); process.exitCode = 3; return; }
    pushed = true;

    console.log('--- git log --oneline -1 ---');
    const log = await run('git', ['log', '--oneline', '-1']);
    process.stdout.write(log.out);
  } finally {
    await releaseLock();
    console.log(`lock released. pushed=${pushed}`);
  }
}

await main();
