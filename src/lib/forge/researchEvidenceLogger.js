import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_EVIDENCE_PATH = 'docs/forge/saige-step1-research-evidence.md';

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

export function formatResearchEvidence(researchOutput) {
  const sections = Array.isArray(researchOutput?.sections) ? researchOutput.sections : [];
  return [
    '# SAIGE Step 1 Research Evidence',
    `Date: ${researchOutput.completedAt}`,
    `MatrixArtifactVersion: ${researchOutput.matrixArtifactVersion}`,
    `CompletionPct: ${researchOutput.completionPct}%`,
    `ReadyForDesign: ${researchOutput.readyForDesign}`,
    '',
    '## Auto-populated',
    sectionList(sections, 'auto'),
    '',
    '## Manual inputs',
    sectionList(sections, 'manual'),
    '',
    '## Orchestrated research',
    sectionList(sections, 'orchestrated'),
    '',
  ].join('\n');
}

export function logResearchEvidence(researchOutput, opts = {}) {
  const evidencePath = opts.evidencePath ?? DEFAULT_EVIDENCE_PATH;
  const absolutePath = path.resolve(opts.cwd ?? process.cwd(), evidencePath);
  const markdown = formatResearchEvidence(researchOutput);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, markdown, { encoding: 'utf8' });
  return Object.freeze({
    evidencePath,
    absolutePath,
    markdown,
  });
}
