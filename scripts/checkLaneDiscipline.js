#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const matrixAuthorityPath = path.join(repoRoot, 'src/lib/orchestratorFramework/matrixAuthority.js');
const GENERATED_SRC_ARTIFACTS = new Set([
  'src/lib/orchestratorFramework/matrixArtifact.json',
]);

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

function commitRange() {
  const base = process.argv.includes('--base')
    ? process.argv[process.argv.indexOf('--base') + 1]
    : 'origin/flowai-v0.1';
  try {
    return git(['rev-list', '--reverse', `${base}..HEAD`]).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function changedFilesForCommit(commit) {
  return git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).filter(Boolean);
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
const commits = commitRange();

for (const commit of commits) {
  const commitFiles = changedFilesForCommit(commit);
  const hasSrcChange = commitFiles.some(file => file.startsWith('src/') && !GENERATED_SRC_ARTIFACTS.has(file));
  const docsSpecChanges = commitFiles.filter(file => file.startsWith('docs/specs/'));

  if (hasSrcChange && docsSpecChanges.length > 0) {
    fail(`src changes cannot share commit ${commit.slice(0, 7)} with docs/specs changes: ${docsSpecChanges.join(', ')}`);
  }
}

if (commits.length === 0) {
  const hasSrcChange = files.some(file => file.startsWith('src/') && !GENERATED_SRC_ARTIFACTS.has(file));
  const docsSpecChanges = files.filter(file => file.startsWith('docs/specs/'));

  if (hasSrcChange && docsSpecChanges.length > 0) {
    fail(`src changes cannot share a working diff with docs/specs changes: ${docsSpecChanges.join(', ')}`);
  }
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
  payload: { checkedFiles: files.length, checkedCommits: commits.length },
}));
