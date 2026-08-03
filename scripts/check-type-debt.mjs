#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_BASELINE = path.join(ROOT, 'scripts', 'typecheck-debt-baseline.json');
const DIAGNOSTIC = /^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const GLOBAL_DIAGNOSTIC = /^error (TS\d+): (.*)$/;

export function parseDiagnostics(output) {
  return String(output).split(/\r?\n/).flatMap((line) => {
    const located = line.match(DIAGNOSTIC);
    if (located) return [{
      file: located[1].replaceAll('\\', '/'),
      line: Number(located[2]),
      column: Number(located[3]),
      code: located[4],
      message: located[5],
    }];
    const global = line.match(GLOBAL_DIAGNOSTIC);
    if (global) return [{ file: null, line: null, column: null, code: global[1], message: global[2] }];
    if (/error TS\d+:/.test(line)) throw new Error(`Unparsed TypeScript diagnostic: ${line}`);
    return [];
  });
}

export function fingerprint(diagnostic) {
  const location = diagnostic.file
    ? `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}`
    : '<global>';
  return `${location}:${diagnostic.code}:${diagnostic.message}`;
}

export function compareDiagnostics(current, baseline) {
  const count = (items) => items.reduce((map, item) => {
    const key = fingerprint(item);
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
  const allowed = count(baseline);
  const present = count(current);
  const remainingAllowed = new Map(allowed);
  const additions = current.filter((item) => {
    const key = fingerprint(item);
    const remaining = remainingAllowed.get(key) || 0;
    if (remaining === 0) return true;
    remainingAllowed.set(key, remaining - 1);
    return false;
  });
  const remainingPresent = new Map(present);
  const resolved = baseline.filter((item) => {
    const key = fingerprint(item);
    const remaining = remainingPresent.get(key) || 0;
    if (remaining === 0) return true;
    remainingPresent.set(key, remaining - 1);
    return false;
  });
  return {
    additions,
    resolved,
  };
}

export function runTypeScript({ spawnImpl = spawnSync } = {}) {
  const cli = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  return spawnImpl(process.execPath, [cli, '-p', './jsconfig.json', '--pretty', 'false'], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
  });
}

export function evaluateTypeDebt({ current, baseline }) {
  const comparison = compareDiagnostics(current, baseline);
  return {
    ok: comparison.additions.length === 0 && comparison.resolved.length === 0,
    currentCount: current.length,
    baselineCount: baseline.length,
    ...comparison,
  };
}

function loadBaseline(filename) {
  const value = JSON.parse(readFileSync(filename, 'utf8'));
  if (value.schemaVersion !== 1 || !Array.isArray(value.diagnostics)) {
    throw new Error(`Unsupported type-debt baseline schema: ${filename}`);
  }
  return value;
}

export function main(argv = process.argv.slice(2)) {
  const writeBaseline = argv.includes('--write-baseline');
  const result = runTypeScript();
  if (result.error) throw result.error;
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const current = parseDiagnostics(output);

  if (writeBaseline) {
    const reviewRef = String(process.env.TYPE_DEBT_BASELINE_REVIEW_REF || '').trim();
    if (!reviewRef) {
      throw new Error('TYPE_DEBT_BASELINE_REVIEW_REF is required to create or ratchet the baseline.');
    }
    const expectedStrictExit = current.length === 0 ? 0 : 2;
    if (result.status !== expectedStrictExit) {
      throw new Error(`Refusing baseline write: TypeScript exited ${result.status}; expected ${expectedStrictExit}.`);
    }
    const payload = {
      schemaVersion: 1,
      policy: 'Existing diagnostics are explicit debt. Any addition fails; any resolution requires a reviewed baseline ratchet before release.',
      strictCommand: 'npm run typecheck:strict',
      reviewRef,
      diagnostics: current,
    };
    writeFileSync(DEFAULT_BASELINE, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`Recorded ${current.length} existing diagnostics in ${path.relative(ROOT, DEFAULT_BASELINE)}.`);
    return 0;
  }

  const baseline = loadBaseline(DEFAULT_BASELINE);
  const evaluation = evaluateTypeDebt({ current, baseline: baseline.diagnostics });
  const expectedStrictExit = current.length === 0 ? 0 : 2;
  console.log(JSON.stringify({
    event: 'type_debt_checked',
    current: evaluation.currentCount,
    baseline: evaluation.baselineCount,
    resolved: evaluation.resolved.length,
    additions: evaluation.additions.length,
    strictExitCode: result.status,
  }));
  if (result.status !== expectedStrictExit) {
    console.error(`TypeScript exited ${result.status}; expected ${expectedStrictExit} for ${current.length} parsed diagnostics.`);
    return 1;
  }
  if (!evaluation.ok) {
    if (evaluation.additions.length > 0) {
      console.error('New TypeScript diagnostics are not permitted:');
      evaluation.additions.slice(0, 50).forEach((item) => console.error(fingerprint(item)));
      if (evaluation.additions.length > 50) console.error(`...and ${evaluation.additions.length - 50} more.`);
    }
    if (evaluation.resolved.length > 0) {
      console.error(`${evaluation.resolved.length} diagnostics were resolved. Ratchet the reviewed baseline before release.`);
    }
    return 1;
  }
  console.log(`Type-debt gate passed: ${current.length} known diagnostics, ${evaluation.resolved.length} resolved, 0 new.`);
  return 0;
}

const invokedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase();

if (invokedDirectly) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error?.stack || error);
    process.exitCode = 1;
  }
}
