import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { __test } from '../../src/api/run-construction.js';

describe('run-construction Migration Mode hook wiring', () => {
  let tmpRoot;
  let sourceRepoPath;
  let targetRepoPath;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flowai-run-construction-migration-'));
    sourceRepoPath = path.join(tmpRoot, 'source');
    targetRepoPath = path.join(tmpRoot, 'target');
    await fs.mkdir(path.join(sourceRepoPath, 'src'), { recursive: true });
    await fs.mkdir(path.join(targetRepoPath, 'src'), { recursive: true });
  });

  afterEach(async () => {
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when source and target repo paths are not configured', async () => {
    const result = await __test.createMigrationRuntimeHooks({
      url: 'https://unregistered.example.com',
      env: {},
    });

    expect(result.ok).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      { field: 'sourceRepoPath', reason: 'missing_migration_hook' },
      { field: 'targetRepoPath', reason: 'missing_migration_hook' },
    ]));
  });

  it('wires all production hooks from env paths', async () => {
    const result = await __test.createMigrationRuntimeHooks({
      url: 'https://saigeplatform.com',
      env: {
        FLOWAI_MIGRATION_SOURCE_REPO_PATH: sourceRepoPath,
        FLOWAI_MIGRATION_TARGET_REPO_PATH: targetRepoPath,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.deps).toMatchObject({
      sourceRepoPath: path.resolve(sourceRepoPath),
      targetRepoPath: path.resolve(targetRepoPath),
    });
    expect(typeof result.deps.readFile).toBe('function');
    expect(typeof result.deps.writeFile).toBe('function');
    expect(typeof result.deps.restoreFile).toBe('function');
    expect(typeof result.deps.verifyBuild).toBe('function');
    expect(typeof result.deps.verifyLint).toBe('function');
    expect(typeof result.deps.runFocusedTests).toBe('function');
  });

  it('writes only to targetRepoPath and restores from the last known good state', async () => {
    const filePath = path.join(targetRepoPath, 'src', 'app.js');
    await fs.writeFile(filePath, 'old content', 'utf8');
    const result = await __test.createMigrationRuntimeHooks({
      url: 'https://saigeplatform.com',
      env: {
        FLOWAI_MIGRATION_SOURCE_REPO_PATH: sourceRepoPath,
        FLOWAI_MIGRATION_TARGET_REPO_PATH: targetRepoPath,
      },
    });

    await result.deps.writeFile(filePath, 'new content');
    await expect(result.deps.readFile(filePath, 'utf8')).resolves.toBe('new content');

    await result.deps.restoreFile(filePath);
    await expect(result.deps.readFile(filePath, 'utf8')).resolves.toBe('old content');

    await expect(result.deps.writeFile(path.join(sourceRepoPath, 'src', 'app.js'), 'bad')).rejects.toThrow(/source repo write/);
    await expect(result.deps.writeFile(path.join(tmpRoot, 'outside.js'), 'bad')).rejects.toThrow(/escapes targetRepoPath/);
  });

  it('rejects target repos nested inside the read-only source repo', async () => {
    const nestedTarget = path.join(sourceRepoPath, 'nested-target');
    await fs.mkdir(nestedTarget, { recursive: true });

    const result = await __test.createMigrationRuntimeHooks({
      url: 'https://saigeplatform.com',
      env: {
        FLOWAI_MIGRATION_SOURCE_REPO_PATH: sourceRepoPath,
        FLOWAI_MIGRATION_TARGET_REPO_PATH: nestedTarget,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContainEqual({
      field: 'targetRepoPath',
      reason: 'target_repo_must_not_be_inside_source_repo',
    });
  });
});
