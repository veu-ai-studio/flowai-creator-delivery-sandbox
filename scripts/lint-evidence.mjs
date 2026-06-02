#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const artifactPath = path.join(repoRoot, 'src/lib/orchestratorFramework/matrixArtifact.json');

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

function entriesFor(artifact) {
  return [
    ...(Array.isArray(artifact?.layer1) ? artifact.layer1 : []),
    ...(Array.isArray(artifact?.layer2) ? artifact.layer2 : []),
  ];
}

const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
const failures = [];

for (const entry of entriesFor(artifact)) {
  if (entry?.status !== 'VERIFIED') continue;
  const missing = [];
  if (isBlank(entry.evidenceUrl)) missing.push('evidenceUrl');
  if (isBlank(entry.verifiedAt)) missing.push('verifiedAt');
  if (isBlank(entry.verifiedBy)) missing.push('verifiedBy');
  if (missing.length > 0) {
    failures.push(`${entry.surfaceId ?? '(unknown)'} status=VERIFIED missing=${missing.join(',')}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`lint:evidence FAILED\n${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('lint:evidence PASS\n');
}
