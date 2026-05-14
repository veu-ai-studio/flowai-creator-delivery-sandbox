// Shared finding loader for the three report generators.
// Reads tests/adversarial/.findings/findings.ndjson and assigns
// stable finding_id (FND-NNNN, ascending by suite + test_id).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FINDINGS_FILE = path.resolve('tests/adversarial/.findings/findings.ndjson');
const COUNTERS_FILE = path.resolve('tests/adversarial/.findings/counters.json');

export function loadFindings() {
  if (!existsSync(FINDINGS_FILE)) return [];
  const lines = readFileSync(FINDINGS_FILE, 'utf8').split('\n').filter(Boolean);
  const rows = lines.map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  // Sort by suite then test_id for stable IDs.
  rows.sort((a, b) => {
    const sA = String(a.suite ?? '');
    const sB = String(b.suite ?? '');
    if (sA !== sB) return sA < sB ? -1 : 1;
    const tA = String(a.test_id ?? '');
    const tB = String(b.test_id ?? '');
    return tA < tB ? -1 : tA > tB ? 1 : 0;
  });
  return rows.map((r, i) => ({
    finding_id: `FND-${String(i + 1).padStart(4, '0')}`,
    ...r,
  }));
}

export function loadCounters() {
  if (!existsSync(COUNTERS_FILE)) return {};
  try { return JSON.parse(readFileSync(COUNTERS_FILE, 'utf8')); } catch { return {}; }
}

export function summarize(findings) {
  const sev = { critical: 0, high: 0, medium: 0, low: 0 };
  const status = { PASS: 0, FAIL: 0, SKIP: 0, ERROR: 0 };
  for (const f of findings) {
    if (sev[f.severity] !== undefined) sev[f.severity] += 1;
    if (status[f.status] !== undefined) status[f.status] += 1;
  }
  return { sev, status, total: findings.length };
}
