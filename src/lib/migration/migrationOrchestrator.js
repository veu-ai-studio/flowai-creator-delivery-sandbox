import path from 'node:path';
import { scanPlatformDependencies } from './platformDependencyMapper.js';
import { generateDirectReplacements } from './directReplacementGenerator.js';

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function defaultOkResult() {
  return { ok: true, output: '' };
}

function isPathInside(parentPath, childPath) {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function groupByFile(manifest) {
  const grouped = new Map();
  for (const finding of manifest) {
    const file = normalizeSlash(finding.file);
    const existing = grouped.get(file) || [];
    existing.push(finding);
    grouped.set(file, existing);
  }
  return grouped;
}

function createPlan(manifest) {
  return Array.from(groupByFile(manifest).entries())
    .map(([file, findings]) => ({
      file,
      dependencyCount: findings.length,
      findings,
    }))
    .sort((left, right) => right.dependencyCount - left.dependencyCount || left.file.localeCompare(right.file));
}

function targetFilePath(targetRepoPath, relativeFile) {
  return path.resolve(targetRepoPath, relativeFile);
}

async function readTargetFile({ targetRepoPath, readFile, relativeFile }) {
  const fullPath = targetFilePath(targetRepoPath, relativeFile);
  return readFile(fullPath, 'utf8');
}

async function restoreTargetFile({ targetRepoPath, restoreFile, relativeFile }) {
  const fullPath = targetFilePath(targetRepoPath, relativeFile);
  await restoreFile(fullPath);
}

async function writeTargetFile({ targetRepoPath, sourceRepoPath, writeFile, relativeFile, content }) {
  const fullPath = targetFilePath(targetRepoPath, relativeFile);
  if (!isPathInside(targetRepoPath, fullPath)) {
    throw new Error(`MIGRATION_BLOCKED: target path escapes targetRepoPath (${relativeFile})`);
  }
  if (sourceRepoPath && isPathInside(sourceRepoPath, fullPath)) {
    throw new Error(`MIGRATION_BLOCKED: attempted source repo write (${relativeFile})`);
  }
  await writeFile(fullPath, content);
}

function dependenciesForFile(findings) {
  return findings.map((finding) => `${finding.file}:${finding.line}:${finding.type}:${finding.platform}`);
}

export async function runMigration({
  sourceRepoPath,
  targetRepoPath,
  verifyBuild = async () => defaultOkResult(),
  verifyLint = async () => defaultOkResult(),
  runFocusedTests = async () => ({ ok: true, passed: 0 }),
  readFile,
  writeFile,
  restoreFile,
} = {}) {
  if (!sourceRepoPath || !targetRepoPath) {
    throw new Error('sourceRepoPath and targetRepoPath are required');
  }
  if (!readFile || !writeFile || !restoreFile) {
    throw new Error('readFile, writeFile, and restoreFile hooks are required');
  }

  const manifest = await scanPlatformDependencies({ repoPath: targetRepoPath, readFile });
  const plan = createPlan(manifest);
  const summary = {
    totalFiles: plan.length,
    migrated: 0,
    skipped: 0,
    blocked: 0,
    dependenciesRemoved: [],
    blockers: [],
    buildPassed: true,
    testsPassed: false,
  };

  for (const planItem of plan) {
    const originalContent = await readTargetFile({ targetRepoPath, readFile, relativeFile: planItem.file });
    const [replacement] = generateDirectReplacements({
      manifest: planItem.findings,
      files: [{ file: planItem.file, content: originalContent }],
    });

    if (!replacement || replacement.requiresHumanReview || replacement.replacementContent === null) {
      summary.skipped += 1;
      summary.blockers.push({
        file: planItem.file,
        reason: replacement?.reason || 'REQUIRES_HUMAN_REVIEW',
      });
      continue;
    }

    await writeTargetFile({
      targetRepoPath,
      sourceRepoPath,
      writeFile,
      relativeFile: planItem.file,
      content: replacement.replacementContent,
    });

    const buildResult = await verifyBuild({ file: planItem.file });
    const lintResult = buildResult?.ok ? await verifyLint({ file: planItem.file }) : { ok: false, output: 'build failed' };

    if (!buildResult?.ok || !lintResult?.ok) {
      await restoreTargetFile({ targetRepoPath, restoreFile, relativeFile: planItem.file });
      summary.blocked += 1;
      summary.buildPassed = summary.buildPassed && Boolean(buildResult?.ok);
      summary.blockers.push({
        file: planItem.file,
        reason: !buildResult?.ok ? 'BUILD_FAILED' : 'LINT_FAILED',
      });
      continue;
    }

    summary.migrated += 1;
    summary.dependenciesRemoved.push(...dependenciesForFile(planItem.findings));
  }

  const testResult = await runFocusedTests({ migrated: summary.migrated });
  summary.testsPassed = Boolean(testResult?.ok);
  return summary;
}

export const __migrationOrchestratorInternals = {
  createPlan,
  isPathInside,
};
