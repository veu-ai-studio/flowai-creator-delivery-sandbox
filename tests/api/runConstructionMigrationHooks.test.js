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

  it('fails closed when the submitted URL is not registered', async () => {
    const result = await __test.createMigrationRuntimeHooks({
      url: 'https://unregistered.example.com',
      env: {},
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Product not found in registry - register product before migrating');
    expect(result.blockers).toContainEqual({
      field: 'productRegistry',
      reason: 'product_not_found',
      message: 'Product not found in registry - register product before migrating',
    });
  });

  it('fails closed when a registered product has no upgrade repo configured', async () => {
    const result = await __test.createMigrationRuntimeHooks({
      url: 'https://reltwin.com',
      env: {},
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('No upgrade repo configured for this product');
    expect(result.blockers).toContainEqual({
      field: 'targetRepoPath',
      reason: 'missing_upgrade_repo',
      message: 'No upgrade repo configured for this product',
    });
  });

  it('resolves SAIGE source and target repos from the registered product config', async () => {
    const cloned = [];
    const result = await __test.createMigrationRuntimeHooks({
      url: 'https://saigeplatform.com',
      env: {},
      cloneRepo: async ({ repoUrl, role }) => {
        cloned.push({ repoUrl, role });
        return {
          ok: true,
          repoPath: role === 'source' ? sourceRepoPath : targetRepoPath,
        };
      },
    });

    expect(result.ok).toBe(true);
    expect(cloned).toEqual([
      { repoUrl: 'https://github.com/veu-ai-studio/saige', role: 'source' },
      { repoUrl: 'https://github.com/veu-ai-studio/saige-v2', role: 'target' },
    ]);
    expect(result.deps).toMatchObject({
      sourceRepoPath: path.resolve(sourceRepoPath),
      targetRepoPath: path.resolve(targetRepoPath),
      sourceRepoUrl: 'https://github.com/veu-ai-studio/saige',
      targetRepoUrl: 'https://github.com/veu-ai-studio/saige-v2',
    });
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
