import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_EVIDENCE_PATH = 'docs/forge/saige-step3-build-evidence.md';

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

export function formatBuildEvidence(buildOutput) {
  const sections = Array.isArray(buildOutput?.sections) ? buildOutput.sections : [];
  return [
    '# SAIGE Step 3 Build Evidence',
    `Date: ${buildOutput.completedAt}`,
    `MatrixArtifactVersion: ${buildOutput.matrixArtifactVersion}`,
    `BuildScore: ${buildOutput.buildScore}%`,
    `BuildComplete: ${buildOutput.buildComplete}`,
    `ReadyForQualityAudit: ${buildOutput.readyForQualityAudit}`,
    `Flag: ${buildOutput.flag ?? 'NONE'}`,
    `EntryPath: ${buildOutput.entryPath?.path ?? 'UNKNOWN'}`,
    `Base44BatchPlanStatus: ${buildOutput.base44BatchPlan?.status ?? 'UNKNOWN'}`,
    '',
    '## Auto-populated',
    sectionList(sections, 'auto'),
    '',
    '## Code task dispatches',
    sectionList(sections, 'orchestrated'),
    '',
    '## Build risks',
    sectionList(sections, 'derived'),
    '',
    '## Manual decisions',
    sectionList(sections, 'manual'),
    '',
  ].join('\n');
}

export function logBuildEvidence(buildOutput, opts = {}) {
  const evidencePath = opts.evidencePath ?? DEFAULT_EVIDENCE_PATH;
  const absolutePath = path.resolve(opts.cwd ?? process.cwd(), evidencePath);
  const markdown = formatBuildEvidence(buildOutput);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, markdown, { encoding: 'utf8' });
  return Object.freeze({
    evidencePath,
    absolutePath,
    markdown,
  });
}
