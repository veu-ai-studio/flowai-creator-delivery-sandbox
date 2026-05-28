#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'docs/specs/task-verification-manifest.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    args[key] = next && !next.startsWith('--') ? argv[++i] : 'true';
  }
  return args;
}

function run(command) {
  const result = spawnSync(command, {
    cwd: repoRoot,
    shell: process.platform === 'win32' ? 'powershell.exe' : true,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  return {
    command,
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runManifestCommand(command) {
  if (process.platform !== 'win32') return run(command);

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'flowai-verify-'));
  const stdoutPath = path.join(tempDir, 'stdout.txt');
  const stderrPath = path.join(tempDir, 'stderr.txt');
  const ps = [
    `$out = ${psQuote(stdoutPath)}`,
    `$err = ${psQuote(stderrPath)}`,
    `$work = ${psQuote(repoRoot)}`,
    `$command = ${psQuote(command)}`,
    '$p = Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/s", "/c", $command) -WorkingDirectory $work -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err',
    'if (Test-Path $out) { Get-Content -LiteralPath $out -Raw }',
    'if (Test-Path $err) { [Console]::Error.Write((Get-Content -LiteralPath $err -Raw)) }',
    'exit $p.ExitCode',
  ].join('\n');

  const result = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: 1000 * 60 * 15,
  });

  let stdout = result.stdout || '';
  let stderr = result.stderr || '';
  try {
    if (!stdout && existsSync(stdoutPath)) stdout = readFileSync(stdoutPath, 'utf8');
    if (!stderr && existsSync(stderrPath)) stderr = readFileSync(stderrPath, 'utf8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  return {
    command,
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout,
    stderr,
  };
}

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function loadManifest() {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function commitExists(commit) {
  return run(`git cat-file -e "${commit}^{commit}"`).ok;
}

function changedFilesForCommit(commit) {
  const result = run(`git show --name-only --format= "${commit}"`);
  return result.stdout
    .split(/\r?\n/)
    .map((line) => normalizeSlash(line.trim()))
    .filter(Boolean);
}

function fileContains(file, pattern) {
  const absolute = path.join(repoRoot, file);
  return existsSync(absolute) && readFileSync(absolute, 'utf8').includes(pattern);
}

function testCount(output) {
  const match = output.match(/Tests\s+(\d+)\s+passed/i)
    || output.match(/(\d+)\s+passed(?:\s+\|\s+\d+\s+skipped)?/i);
  return match ? Number(match[1]) : null;
}

function workingTreeSummary(allowHistoricalUntracked) {
  const status = run('git status --short');
  const lines = status.stdout.split(/\r?\n/).filter(Boolean);
  const tracked = lines.filter((line) => !line.startsWith('?? '));
  const untracked = lines.filter((line) => line.startsWith('?? '));
  return {
    ok: tracked.length === 0 && (allowHistoricalUntracked || untracked.length === 0),
    tracked,
    untrackedCount: untracked.length,
  };
}

function box(lines) {
  const width = Math.max(48, ...lines.map((line) => line.length));
  return [
    `┌${'─'.repeat(width + 2)}┐`,
    ...lines.map((line) => `│ ${line.padEnd(width)} │`),
    `└${'─'.repeat(width + 2)}┘`,
  ].join('\n');
}

export function verifyTask({ taskId, commit }) {
  const manifest = loadManifest();
  const task = manifest.tasks?.[taskId];
  if (!task) throw new Error(`Unknown task id: ${taskId}`);
  if (!commit) throw new Error('--commit is required');
  if (!commitExists(commit)) throw new Error(`Commit not found: ${commit}`);

  const failures = [];
  const evidence = [];
  const changed = changedFilesForCommit(commit);
  const expected = (task.expectedChangedFiles || []).map(normalizeSlash);
  const unexpected = changed.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !changed.includes(file));

  if (unexpected.length) failures.push(`Unexpected changed files: ${unexpected.join(', ')}`);
  if (missing.length) failures.push(`Expected files not changed: ${missing.join(', ')}`);
  evidence.push(`Changed files: ${changed.length}`);

  const protectedFiles = (manifest.policy?.protectedFiles || []).map(normalizeSlash);
  const protectedHits = changed.filter((file) => protectedFiles.includes(file));
  if (protectedHits.length) failures.push(`Protected files changed: ${protectedHits.join(', ')}`);
  evidence.push(`Protected files touched: ${protectedHits.length}`);

  for (const check of task.requiredPresent || []) {
    if (!fileContains(check.file, check.pattern)) {
      failures.push(`Missing required pattern in ${check.file}: ${check.pattern}`);
    }
  }
  for (const check of task.requiredAbsent || []) {
    if (fileContains(check.file, check.pattern)) {
      failures.push(`Forbidden pattern present in ${check.file}: ${check.pattern}`);
    }
  }
  evidence.push(`Pattern checks: ${(task.requiredPresent || []).length} present, ${(task.requiredAbsent || []).length} absent`);

  if (task.powershellAuthoritative === true) {
    evidence.push('Command gates: DEFERRED_TO_POWERSHELL');
    evidence.push(`PowerShell reason: ${task.powershellAuthoritativeReason || 'PowerShell is authoritative for this task'}`);
  } else {
    for (const [name, command] of Object.entries(task.commands || manifest.policy?.defaultCommands || {})) {
      const result = runManifestCommand(command);
      if (!result.ok) failures.push(`${name} failed: ${command}`);
      if (name === 'tests') {
        const count = testCount(`${result.stdout}\n${result.stderr}`);
        evidence.push(`Tests passed: ${count ?? 'unknown'}`);
        if (typeof task.minimumTestsPassed === 'number' && (count ?? 0) < task.minimumTestsPassed) {
          failures.push(`Tests passed below minimum: ${count ?? 'unknown'} < ${task.minimumTestsPassed}`);
        }
      } else {
        evidence.push(`${name}: ${result.ok ? 'PASS' : 'FAIL'}`);
      }
    }
  }

  const tree = workingTreeSummary(task.allowHistoricalUntracked === true);
  if (!tree.ok) failures.push(`Working tree has tracked modifications: ${tree.tracked.join(', ')}`);
  evidence.push(`Working tree tracked modifications: ${tree.tracked.length}`);
  evidence.push(`Historical untracked entries: ${tree.untrackedCount}`);

  return {
    ok: failures.length === 0,
    taskId,
    commit,
    highRisk: task.highRisk === true,
    failures,
    evidence,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const result = verifyTask({ taskId: args.task, commit: args.commit });
  console.log(box([
    'FLOWAI TASK VERIFICATION',
    `Task: ${result.taskId}`,
    `Commit: ${result.commit}`,
    `High risk: ${result.highRisk ? 'YES' : 'NO'}`,
    `Verdict: ${result.ok ? 'PASS' : 'FAIL'}`,
    ...result.evidence,
    ...(result.failures.length ? ['Failures:', ...result.failures.map((failure) => `- ${failure}`)] : []),
  ]));
  process.exit(result.ok ? 0 : 1);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  try {
    main();
  } catch (error) {
    console.error(box([
      'FLOWAI TASK VERIFICATION',
      'Verdict: FAIL',
      `Error: ${error.message}`,
    ]));
    process.exit(1);
  }
}
