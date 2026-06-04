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

export function formatDeployEvidence(deployOutput) {
  const sections = Array.isArray(deployOutput?.sections) ? deployOutput.sections : [];
  return [
    `# ${deployOutput.productId ?? 'Unknown'} Step 5 Deploy Evidence`,
    `Date: ${deployOutput.completedAt}`,
    `DeployScore: ${deployOutput.deployScore}%`,
    `DeployComplete: ${deployOutput.deployComplete}`,
    `ReadyForSelfRenewal: ${deployOutput.readyForSelfRenewal}`,
    `OutputUrl: ${deployOutput.outputUrl ?? 'NONE'}`,
    `DeploymentId: ${deployOutput.deploymentId ?? 'NONE'}`,
    `CommitSha: ${deployOutput.commitSha ?? 'NONE'}`,
    `Flag: ${deployOutput.flag ?? 'NONE'}`,
    '',
    '## Auto evidence',
    sectionList(sections, 'auto'),
    '',
    '## Manual gates',
    sectionList(sections, 'manual'),
    '',
  ].join('\n');
}

export function logDeployEvidence(deployOutput, opts = {}) {
  const evidencePath = opts.evidencePath ?? defaultEvidencePath(deployOutput?.productId, 'step5-deploy');
  const absolutePath = path.resolve(opts.cwd ?? process.cwd(), evidencePath);
  const markdown = formatDeployEvidence(deployOutput);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, markdown, { encoding: 'utf8' });
  return Object.freeze({
    evidencePath,
    absolutePath,
    markdown,
  });
}
