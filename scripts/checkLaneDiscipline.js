#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const matrixAuthorityPath = path.join(repoRoot, 'src/lib/orchestratorFramework/matrixAuthority.js');

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

function changedFiles() {
  const base = process.argv.includes('--base')
    ? process.argv[process.argv.indexOf('--base') + 1]
    : 'origin/flowai-v0.1';
  try {
    return git(['diff', '--name-only', `${base}...HEAD`]).split(/\r?\n/).filter(Boolean);
  } catch {
    return git(['diff', '--name-only', 'HEAD']).split(/\r?\n/).filter(Boolean);
  }
}

function fail(reason) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    module: 'laneDiscipline',
    event: 'lane_discipline_failed',
    level: 'ERROR',
    payload: { reason },
  }));
  process.exit(1);
}

const files = changedFiles();
const hasSrcChange = files.some(file => file.startsWith('src/'));
const docsSpecChanges = files.filter(file => file.startsWith('docs/specs/'));

if (hasSrcChange && docsSpecChanges.length > 0) {
  fail(`src changes cannot share a commit range with docs/specs changes: ${docsSpecChanges.join(', ')}`);
}

if (existsSync(matrixAuthorityPath)) {
  const source = readFileSync(matrixAuthorityPath, 'utf8');
  if (/\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|rmSync|unlinkSync|renameSync)\b/.test(source)) {
    fail('matrixAuthority.js must remain read-only and cannot contain file write operations');
  }
}

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  module: 'laneDiscipline',
  event: 'lane_discipline_passed',
  level: 'INFO',
  payload: { checkedFiles: files.length },
}));
