// JSON report generator — §6.3.

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadFindings, summarize } from './lib/load-findings.mjs';

const DATE = process.argv[2] || process.env.FLOWAI_REPORT_DATE || new Date().toISOString().slice(0, 10);
const findings = loadFindings();
const { sev, status, total } = summarize(findings);
const RUN_ID = process.env.FLOWAI_RUN_ID || crypto.randomUUID();
const SUITE_COMMIT = process.env.FLOWAI_SUITE_COMMIT || '';

const META_FILE = path.resolve('tests/adversarial/.findings/run-meta.json');
let meta = {};
if (existsSync(META_FILE)) {
  try { meta = JSON.parse(readFileSync(META_FILE, 'utf8')); } catch {}
}

const out = path.resolve(`docs/audits/FLOWAI_SELF_ADVERSARIAL_TEST_RESULTS_${DATE}.json`);

const payload = {
  schemaVersion: '1',
  runMetadata: {
    runId: RUN_ID,
    startedAt: meta.startedAt ?? null,
    completedAt: meta.completedAt ?? new Date().toISOString(),
    environment: meta.environment ?? 'dev-SUT',
    suiteCommit: SUITE_COMMIT || meta.suiteCommit || null,
    testsTarget: 446,
    testsRun: total,
    passed: status.PASS,
    failed: status.FAIL,
    errored: status.ERROR,
    skipped: status.SKIP,
    durationMs: meta.durationMs ?? null,
    severityCounts: sev,
  },
  findings: findings.sort((a, b) => a.finding_id.localeCompare(b.finding_id)),
};

writeFileSync(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
process.stdout.write(`json-report: wrote ${out} (${findings.length} findings)\n`);
