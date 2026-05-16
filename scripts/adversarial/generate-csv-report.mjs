// CSV report generator — §6.2.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadFindings } from './lib/load-findings.mjs';

const DATE = process.argv[2] || process.env.FLOWAI_REPORT_DATE || new Date().toISOString().slice(0, 10);
const findings = loadFindings();
const out = path.resolve(`docs/audits/FLOWAI_SELF_ADVERSARIAL_TEST_RESULTS_${DATE}.csv`);

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const HEADER = [
  'finding_id','severity','surface','test_id','category',
  'reproducer_steps','expected_behavior','actual_behavior',
  'latency_ms','evidence_paths','first_seen_commit','owner_agent_id_or_team',
  'recommended_fix','status',
];

const BOM = '﻿';
const lines = [HEADER.join(',')];

for (const f of findings) {
  const owner = f.owner?.team ? `team:${f.owner.team}` : f.owner?.agentId ? `agent:${f.owner.agentId}` : '';
  lines.push([
    f.finding_id, f.severity, f.surface, f.test_id, f.category,
    (f.reproducer_steps || []).join(' | '),
    f.expected_behavior, f.actual_behavior,
    f.latency_ms ?? '',
    (f.evidence_paths || []).join(' | '),
    f.first_seen_commit || '',
    owner,
    f.recommended_fix || '',
    f.status,
  ].map(csvEscape).join(','));
}

writeFileSync(out, BOM + lines.join('\n') + '\n', 'utf8');
process.stdout.write(`csv-report: wrote ${out} (${findings.length} findings)\n`);
