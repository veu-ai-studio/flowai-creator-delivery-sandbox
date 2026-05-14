// Findings sink — collects per-test rows from both Vitest and Playwright
// runs into a single file the report generators read.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SINK_DIR = path.resolve(process.cwd(), 'tests', 'adversarial', '.findings');

function ensureDir() {
  if (!existsSync(SINK_DIR)) mkdirSync(SINK_DIR, { recursive: true });
}

export function appendFinding(finding) {
  ensureDir();
  const file = path.join(SINK_DIR, 'findings.ndjson');
  writeFileSync(file, JSON.stringify(finding) + '\n', { flag: 'a' });
}

export function appendCounter(name, delta = 1) {
  ensureDir();
  const file = path.join(SINK_DIR, 'counters.json');
  let cur = {};
  if (existsSync(file)) {
    try { cur = JSON.parse(readFileSync(file, 'utf8')); } catch { cur = {}; }
  }
  cur[name] = (cur[name] || 0) + delta;
  writeFileSync(file, JSON.stringify(cur, null, 2));
}

export function resetSink() {
  ensureDir();
  writeFileSync(path.join(SINK_DIR, 'findings.ndjson'), '');
  writeFileSync(path.join(SINK_DIR, 'counters.json'), '{}');
}

export function readAllFindings() {
  const file = path.join(SINK_DIR, 'findings.ndjson');
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

export function readCounters() {
  const file = path.join(SINK_DIR, 'counters.json');
  if (!existsSync(file)) return {};
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
}
