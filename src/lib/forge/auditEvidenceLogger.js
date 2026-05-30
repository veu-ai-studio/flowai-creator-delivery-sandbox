import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { defaultEvidencePath } from './_shared.js';

function stringifyInput(input) {
  if (typeof input === 'string') return input;
  return JSON.stringify(input, null, 2);
}

function sectionList(sections, source) {
  return sections
    .filter(section => section.source === source)
    .map(section => `### ${section.label}\n${stringifyInput(section.input)}`)
    .join('\n\n');
}

export function formatAuditEvidence(auditOutput) {
  const sections = Array.isArray(auditOutput?.sections) ? auditOutput.sections : [];
  return [
    `# ${auditOutput.productId ?? 'Unknown'} Step 4 Quality Audit Evidence`,
    `Date: ${auditOutput.completedAt}`,
    `MatrixArtifactVersion: ${auditOutput.matrixArtifactVersion}`,
    `AuditScore: ${auditOutput.auditScore}%`,
    `AuditComplete: ${auditOutput.auditComplete}`,
    `ReadyForDeploy: ${auditOutput.readyForDeploy}`,
    `Flag: ${auditOutput.flag ?? 'NONE'}`,
    `AdvisoryItems: ${auditOutput.evidenceSummary?.advisoryItems ?? 0}`,
    `NotApplicableItems: ${auditOutput.evidenceSummary?.notApplicableItems ?? 0}`,
    `ToolSelection: ${stringifyInput(auditOutput.toolSelection ?? null)}`,
    `ToolSelectionAdvisory: ${auditOutput.toolSelectionAdvisory === true}`,
    `PipelineNullAt: ${stringifyInput(auditOutput.pipelineNullAt ?? [])}`,
    `UnderservedAccessWarning: ${auditOutput.undServedAccessWarning === true}`,
    '',
    '## Auto checks',
    sectionList(sections, 'auto'),
    '',
    '## Derived findings',
    sectionList(sections, 'derived'),
    '',
    '## Manual decisions',
    sectionList(sections, 'manual'),
    '',
  ].join('\n');
}

export function logAuditEvidence(auditOutput, opts = {}) {
  const evidencePath = opts.evidencePath ?? defaultEvidencePath(auditOutput?.productId, 'step4-audit');
  const absolutePath = path.resolve(opts.cwd ?? process.cwd(), evidencePath);
  const markdown = formatAuditEvidence(auditOutput);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, markdown, { encoding: 'utf8' });
  return Object.freeze({
    evidencePath,
    absolutePath,
    markdown,
  });
}
