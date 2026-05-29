// scripts/daily-digest/build.mjs
//
// Trigger entry-point. Composes collect.mjs + render.mjs, writes the
// digest to docs/digests/<YYYY-MM-DD>.md, updates the delta marker.
//
// Usage:
//   npm run digest
//   node scripts/daily-digest/build.mjs
//
// Output:
//   docs/digests/<YYYY-MM-DD>.md            (the digest)
//   .w03-cache/last-digest-marker.txt       (delta-tracking marker)

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { collect } from './collect.mjs';
import { render } from './render.mjs';

const execFileP = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DIGEST_DIR = path.join(REPO_ROOT, 'docs', 'digests');
const CACHE_DIR  = path.join(REPO_ROOT, '.w03-cache');
const MARKER_PATH = path.join(CACHE_DIR, 'last-digest-marker.txt');

async function ensureDir(p) {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

async function writeMarker(headCommit, ts) {
  await ensureDir(CACHE_DIR);
  const body = [
    `commit=${headCommit ?? ''}`,
    `timestamp=${ts}`,
    '',
  ].join('\n');
  await writeFile(MARKER_PATH, body, 'utf8');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[daily-digest] started ${startedAt}\n`);
  const state = await collect();
  const md = render(state);
  await ensureDir(DIGEST_DIR);
  const out = path.join(DIGEST_DIR, `${state.date}.md`);
  await writeFile(out, md, 'utf8');
  await writeMarker(state.headCommit, state.ts);
  process.stdout.write(`[daily-digest] wrote ${path.relative(REPO_ROOT, out)}\n`);
  process.stdout.write(`[daily-digest] marker updated → ${path.relative(REPO_ROOT, MARKER_PATH)} (commit=${(state.headCommit || '').slice(0, 8)})\n`);
  // Brief stdout summary for human eyes.
  process.stdout.write('\n--- DIGEST PREVIEW (first 30 lines) ---\n');
  process.stdout.write(md.split(/\r?\n/).slice(0, 30).join('\n'));
  process.stdout.write('\n--- END PREVIEW ---\n');
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[daily-digest] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
