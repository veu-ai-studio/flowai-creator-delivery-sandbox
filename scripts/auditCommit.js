#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export const PROTECTED_FILES = Object.freeze([
  'src/lib/audits/scoringEngine.js',
  'src/api/base44Client.js',
  'docs/specs/SSOT_TRACEABILITY_MATRIX.md',
]);

const ALLOWED_SCOPE_PREFIXES = Object.freeze([
  'src/',
  'tests/',
  'scripts/',
  '.github/',
]);

const SCOPE_BOUNDARY_EXCLUSIONS = Object.freeze([
  'src/lib/orchestratorFramework/matrixArtifact.json',
]);

const PLATFORM_ADAPTER_PREFIX = 'src/lib/agents/orchestrator/adapters/';
const APP_ROUTE_FILE = 'src/App.jsx';
const PAGE_FILE_RE = /^src\/pages\/.*\.(jsx|tsx|js|ts)$/;
const UI_COMPONENT_RE = /^src\/(components|pages)\/.*\.(jsx|tsx|js|ts)$/;
const WRITE_OP_RE = /\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|rmSync|unlinkSync|renameSync)\b/;

function defaultGit(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

function lines(value) {
  return String(value ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function normalizePath(value) {
  return String(value ?? '').replace(/\\/g, '/');
}

function parseArgs(argv) {
  const get = name => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : null;
  };
  return {
    base: get('--base'),
    head: get('--head') ?? 'HEAD',
  };
}

function changedFiles(git, base, head) {
  return lines(git(['diff', '--name-only', `${base}..${head}`])).map(normalizePath);
}

function headCommitFiles(git, head) {
  return lines(git(['diff', '--name-only', `${head}^`, head])).map(normalizePath);
}

function newFiles(git, base, head) {
  return lines(git(['diff', '--name-only', '--diff-filter=A', `${base}..${head}`])).map(normalizePath);
}

function commitRange(git, base, head) {
  return lines(git(['rev-list', '--reverse', `${base}..${head}`]));
}

function filesForCommit(git, commit) {
  return lines(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit])).map(normalizePath);
}

function fileAt(git, head, file) {
  try {
    return git(['show', `${head}:${file}`]);
  } catch {
    return '';
  }
}

function addedSrcDiff(git, base, head) {
  try {
    return git(['diff', '--unified=0', `${base}..${head}`, '--', 'src/'])
      .split(/\r?\n/)
      .filter(line => line.startsWith('+') && !line.startsWith('+++'))
      .join('\n');
  } catch {
    return '';
  }
}

function statusLine(name, result) {
  return `${name} ${result.status}`;
}

function checkProtectedFiles(git, base, head, rangeFiles) {
  const details = [];
  const commits = commitRange(git, base, head);

  if (commits.length > 0) {
    for (const commit of commits) {
      const files = filesForCommit(git, commit);
      const protectedTouched = files.filter(file => PROTECTED_FILES.includes(file));
      const codeLaneTouched = files.some(file =>
        file.startsWith('src/') ||
        file.startsWith('tests/') ||
        file.startsWith('scripts/') ||
        file.startsWith('.github/')
      );
      if (protectedTouched.length > 0 && codeLaneTouched) {
        details.push(`Protected file touched in code-lane commit ${commit.slice(0, 7)}: ${protectedTouched.join(', ')}`);
      }
    }
  } else {
    const touched = rangeFiles.filter(file => PROTECTED_FILES.includes(file));
    details.push(...touched.map(file => `Protected file touched: ${file}`));
  }

  return {
    status: details.length === 0 ? 'PASS' : 'FAIL',
    details,
  };
}

function checkLaneDiscipline(git, base, head, rangeFiles) {
  const details = [];
  for (const commit of commitRange(git, base, head)) {
    const files = filesForCommit(git, commit);
    const hasSrcChange = files.some(file => file.startsWith('src/'));
    const docsSpecChanges = files.filter(file => file.startsWith('docs/specs/'));
    if (hasSrcChange && docsSpecChanges.length > 0) {
      details.push(`Commit ${commit.slice(0, 7)} mixes src/ and docs/specs/: ${docsSpecChanges.join(', ')}`);
    }
  }

  for (const file of rangeFiles.filter(file => UI_COMPONENT_RE.test(file))) {
    const source = fileAt(git, head, file);
    if (/matrixIngestion\.js|orchestratorFramework\/matrixIngestion|orchestratorFramework'\s*;/.test(source) && /parseMatrix|matrixIngestion/.test(source)) {
      details.push(`UI component imports or consumes matrix ingestion directly: ${file}`);
    }
  }

  return {
    status: details.length === 0 ? 'PASS' : 'FAIL',
    details,
  };
}

function checkCaAbsence(git, base, head) {
  const added = newFiles(git, base, head).filter(file => file.startsWith('src/'));
  const details = [];
  for (const file of added) {
    const source = fileAt(git, head, file);
    if (/\bCA-?19\b|\bCA-?25\b/i.test(source)) {
      details.push(`CA-19/CA-25 implementation marker found in new src file: ${file}`);
    }
  }
  return {
    status: details.length === 0 ? 'PASS' : 'FAIL',
    details,
  };
}

function checkScopeBoundary(files, addedFiles = []) {
  const details = [];
  const addedPageFiles = addedFiles.filter(file => PAGE_FILE_RE.test(file));
  const expectedAppRouteUpdate = files.includes(APP_ROUTE_FILE) && addedPageFiles.length > 0;
  if (expectedAppRouteUpdate) {
    details.push(`INFO: ${APP_ROUTE_FILE} route update expected because new page file added: ${addedPageFiles.join(', ')}`);
  }

  const outOfScope = files.filter(file =>
    !SCOPE_BOUNDARY_EXCLUSIONS.includes(file) &&
    !(file === APP_ROUTE_FILE && expectedAppRouteUpdate) &&
    !ALLOWED_SCOPE_PREFIXES.some(prefix => file.startsWith(prefix))
  );
  details.push(...outOfScope.map(file => `Out-of-scope file changed in head commit: ${file}`));

  return {
    status: outOfScope.length === 0 ? 'PASS' : 'WARNING',
    details,
  };
}

function checkHotStoreBoundary(git, base, head) {
  const addedAdapters = newFiles(git, base, head).filter(file => file.startsWith(PLATFORM_ADAPTER_PREFIX));
  const details = addedAdapters.map(file => `New platform adapter file created: ${file}`);
  const addedDiff = addedSrcDiff(git, base, head);
  if (/\bbase44Client\b/.test(addedDiff)) {
    details.push('base44Client import/reference added in src diff');
  }
  const matrixAuthority = fileAt(git, head, 'src/lib/orchestratorFramework/matrixAuthority.js');
  if (matrixAuthority && WRITE_OP_RE.test(matrixAuthority)) {
    details.push('matrixAuthority.js contains file write operation');
  }
  return {
    status: details.length === 0 ? 'PASS' : 'FAIL',
    details,
  };
}

export function runAudit({ base, head = 'HEAD', git = defaultGit } = {}) {
  if (!base) throw new Error('auditCommit requires --base <commit>');
  const rangeFiles = changedFiles(git, base, head);
  const headFiles = headCommitFiles(git, head);
  const addedFiles = newFiles(git, base, head);
  const checks = {
    protectedFiles: checkProtectedFiles(git, base, head, rangeFiles),
    laneDiscipline: checkLaneDiscipline(git, base, head, rangeFiles),
    caAbsence: checkCaAbsence(git, base, head),
    scopeBoundary: checkScopeBoundary(headFiles, addedFiles),
    hotStoreBoundary: checkHotStoreBoundary(git, base, head),
  };
  const mechanicalVerdict = Object.values(checks).some(check => check.status === 'FAIL') ? 'FAIL' : 'PASS';
  return Object.freeze({
    base,
    head,
    timestamp: new Date().toISOString(),
    checks,
    changedFiles: Object.freeze(headFiles),
    mechanicalVerdict,
  });
}

export function formatAuditReport(result) {
  const details = Object.values(result.checks).flatMap(check => check.details);
  return [
    '═══════════════════════════════════════════════',
    'AUTOMATED AUDIT REPORT',
    `Base: ${result.base}  Head: ${result.head}`,
    `Date: ${result.timestamp}`,
    '═══════════════════════════════════════════════',
    statusLine('CHECK 1 PROTECTED FILES:', result.checks.protectedFiles),
    statusLine('CHECK 2 LANE DISCIPLINE:', result.checks.laneDiscipline),
    statusLine('CHECK 3 CA-19/25 ABSENCE:', result.checks.caAbsence),
    statusLine('CHECK 4 SCOPE BOUNDARY:', result.checks.scopeBoundary),
    statusLine('CHECK 5 HOT-STORE BOUNDARY:', result.checks.hotStoreBoundary),
    '───────────────────────────────────────────────',
    `MECHANICAL VERDICT: ${result.mechanicalVerdict}`,
    '───────────────────────────────────────────────',
    ...(details.length > 0 ? details : ['No FAIL or WARNING detail lines.']),
    '═══════════════════════════════════════════════',
  ].join('\n');
}

function main() {
  try {
    const result = runAudit(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${formatAuditReport(result)}\n`);
    process.exitCode = result.mechanicalVerdict === 'PASS' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
