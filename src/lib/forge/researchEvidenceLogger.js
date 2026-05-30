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

export function formatResearchEvidence(researchOutput) {
  const sections = Array.isArray(researchOutput?.sections) ? researchOutput.sections : [];
  return [
    `# ${researchOutput.productId ?? 'Unknown'} Step 1 Research Evidence`,
    `Date: ${researchOutput.completedAt}`,
    `MatrixArtifactVersion: ${researchOutput.matrixArtifactVersion}`,
    `CompletionPct: ${researchOutput.completionPct}%`,
    `ReadyForDesign: ${researchOutput.readyForDesign}`,
    `ToolSelection: ${stringifyInput(researchOutput.toolSelection ?? null)}`,
    `UnderservedAccessWarning: ${researchOutput.undServedAccessWarning === true}`,
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
  const evidencePath = opts.evidencePath ?? defaultEvidencePath(researchOutput?.productId, 'step1-research');
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
