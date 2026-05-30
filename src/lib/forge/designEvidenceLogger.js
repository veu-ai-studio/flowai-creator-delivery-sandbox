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

export function formatDesignEvidence(designOutput) {
  const sections = Array.isArray(designOutput?.sections) ? designOutput.sections : [];
  return [
    `# ${designOutput.productId ?? 'Unknown'} Step 2 Design Evidence`,
    `Date: ${designOutput.completedAt}`,
    `MatrixArtifactVersion: ${designOutput.matrixArtifactVersion}`,
    `DesignScore: ${designOutput.designScore}%`,
    `DesignComplete: ${designOutput.designComplete}`,
    `ReadyForBuild: ${designOutput.readyForBuild}`,
    `Flag: ${designOutput.flag ?? 'NONE'}`,
    `ToolSelection: ${stringifyInput(designOutput.toolSelection ?? null)}`,
    `UnderservedAccessWarning: ${designOutput.undServedAccessWarning === true}`,
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
  const evidencePath = opts.evidencePath ?? defaultEvidencePath(designOutput?.productId, 'step2-design');
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
