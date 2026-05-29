import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_EVIDENCE_PATH = 'docs/forge/saige-step2-design-evidence.md';

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

export function formatDesignEvidence(designOutput) {
  const sections = Array.isArray(designOutput?.sections) ? designOutput.sections : [];
  return [
    '# SAIGE Step 2 Design Evidence',
    `Date: ${designOutput.completedAt}`,
    `MatrixArtifactVersion: ${designOutput.matrixArtifactVersion}`,
    `DesignScore: ${designOutput.designScore}%`,
    `DesignComplete: ${designOutput.designComplete}`,
    `ReadyForBuild: ${designOutput.readyForBuild}`,
    `Flag: ${designOutput.flag ?? 'NONE'}`,
    '',
    '## Auto-populated',
    sectionList(sections, 'auto'),
    '',
    '## Orchestrated design',
    sectionList(sections, 'orchestrated'),
    '',
    '## Derived gaps',
    sectionList(sections, 'derived'),
    '',
    '## Manual decisions',
    sectionList(sections, 'manual'),
    '',
  ].join('\n');
}

export function logDesignEvidence(designOutput, opts = {}) {
  const evidencePath = opts.evidencePath ?? DEFAULT_EVIDENCE_PATH;
  const absolutePath = path.resolve(opts.cwd ?? process.cwd(), evidencePath);
  const markdown = formatDesignEvidence(designOutput);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, markdown, { encoding: 'utf8' });
  return Object.freeze({
    evidencePath,
    absolutePath,
    markdown,
  });
}
