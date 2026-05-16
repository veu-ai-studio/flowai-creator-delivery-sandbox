// Markdown report generator — §6.1 + §11.3.
// Usage: node scripts/adversarial/generate-md-report.mjs [<date>] [<environment>]

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadFindings, summarize } from './lib/load-findings.mjs';

const argDate = process.argv[2];
const argEnv  = process.argv[3] || process.env.FLOWAI_DEV_SUT_URL ? 'dev-SUT' : 'dev-SUT';

const DATE = argDate || process.env.FLOWAI_REPORT_DATE || new Date().toISOString().slice(0, 10);
const RUN_ID = process.env.FLOWAI_RUN_ID || crypto.randomUUID();
const SUITE_COMMIT = process.env.FLOWAI_SUITE_COMMIT || '';

const META_FILE = path.resolve('tests/adversarial/.findings/run-meta.json');
let meta = {};
if (existsSync(META_FILE)) {
  try { meta = JSON.parse(readFileSync(META_FILE, 'utf8')); } catch {}
}

const findings = loadFindings();
const { sev, status, total } = summarize(findings);

const out = path.resolve(`docs/audits/FLOWAI_SELF_ADVERSARIAL_TEST_RESULTS_${DATE}.md`);

function fenceBlock(f) {
  return `### ${f.finding_id} — [${f.severity}] ${f.surface} · ${f.test_id}

**Category:** ${f.category}
**Status:** ${f.status}
**Reproducer:**
${(f.reproducer_steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Expected:** ${f.expected_behavior}
**Actual:** ${f.actual_behavior}
**Latency (recorded only — no threshold):** ${f.latency_ms ?? 'n/a'} ms
**Evidence:** ${(f.evidence_paths || []).join(' · ') || '—'}
**First seen:** ${f.first_seen_commit || 'n/a'}
**Owner:** ${f.owner?.team ? `team ${f.owner.team}` : f.owner?.agentId ? `Agent #${f.owner.agentId}` : 'platform'}
**Recommended fix:** ${f.recommended_fix || '—'}
**Status:** OPEN
`;
}

function groupBySeverity(level) {
  return findings.filter((f) => f.severity === level)
    .sort((a, b) => a.finding_id.localeCompare(b.finding_id));
}

const md = `# FlowAI Self-Adversarial Test Results — ${DATE} (run ${RUN_ID})

**Environment:** ${meta.environment || argEnv}
**Suite commit:** ${SUITE_COMMIT || meta.suiteCommit || 'n/a'}
**Runner:** Playwright + Vitest

## Summary

| Severity | Count |
|---|---:|
| critical | ${sev.critical} |
| high | ${sev.high} |
| medium | ${sev.medium} |
| low | ${sev.low} |
| **Total findings** | ${total} |

| Status | Count |
|---|---:|
| Tests run (target) | 446 |
| Tests recorded | ${total} |
| Passed | ${status.PASS} |
| Failed | ${status.FAIL} |
| Errored | ${status.ERROR} |
| Skipped | ${status.SKIP} |
| Duration (ms) | ${meta.durationMs ?? 'n/a'} |

## Findings (severity-grouped, descending)

### Critical (${sev.critical})

${groupBySeverity('critical').map(fenceBlock).join('\n') || '_None._'}

### High (${sev.high})

${groupBySeverity('high').map(fenceBlock).join('\n') || '_None._'}

### Medium (${sev.medium})

${groupBySeverity('medium').map(fenceBlock).join('\n') || '_None._'}

### Low (${sev.low})

${groupBySeverity('low').map(fenceBlock).join('\n') || '_None._'}

## Trend (last 7 nightly runs)

_First execution — no historical trend to graph yet._

## Final summary

\`\`\`
runId:        ${RUN_ID}
environment:  ${meta.environment || argEnv}
testsRun:     ${total}
testsTarget:  446
passed:       ${status.PASS}
failed:       ${status.FAIL}
errored:      ${status.ERROR}
skipped:      ${status.SKIP}
durationMs:   ${meta.durationMs ?? 'n/a'}
startedAt:    ${meta.startedAt ?? 'n/a'}
completedAt:  ${meta.completedAt ?? new Date().toISOString()}
\`\`\`
`;

writeFileSync(out, md, 'utf8');
process.stdout.write(`md-report: wrote ${out} (${findings.length} findings)\n`);
