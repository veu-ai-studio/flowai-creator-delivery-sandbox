import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runMigration } from '../../src/lib/migration/migrationOrchestrator.js';

let tmpRoot;
let sourceRepoPath;
let targetRepoPath;

async function writeFixture(relativeFile, content) {
  const fullPath = path.join(targetRepoPath, relativeFile);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
}

function createHooks({ failBuildFor = [], failLintFor = [] } = {}) {
  const writes = [];
  const restores = [];
  return {
    writes,
    restores,
    readFile: vi.fn((filePath, encoding) => fs.readFile(filePath, encoding)),
    writeFile: vi.fn(async (filePath, content) => {
      writes.push({ filePath, content });
    }),
    restoreFile: vi.fn(async (filePath) => {
      restores.push(filePath);
    }),
    verifyBuild: vi.fn(async ({ file }) => ({ ok: !failBuildFor.includes(file), output: '' })),
    verifyLint: vi.fn(async ({ file }) => ({ ok: !failLintFor.includes(file), output: '' })),
    runFocusedTests: vi.fn(async () => ({ ok: true, passed: 3 })),
  };
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flowai-migration-'));
  sourceRepoPath = path.join(tmpRoot, 'source');
  targetRepoPath = path.join(tmpRoot, 'target');
  await fs.mkdir(sourceRepoPath, { recursive: true });
  await fs.mkdir(targetRepoPath, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('migrationOrchestrator', () => {
  it('runs end-to-end on a synthetic Base44 fixture', async () => {
    await writeFixture('src/app.js', "import { base44Client } from './base44Client';\nexport const api = base44Client;\n");
    const hooks = createHooks();

    const summary = await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(summary).toMatchObject({
      totalFiles: 1,
      migrated: 1,
      skipped: 0,
      blocked: 0,
      buildPassed: true,
      testsPassed: true,
    });
    expect(summary.dependenciesRemoved.length).toBeGreaterThan(0);
    expect(hooks.writeFile).toHaveBeenCalledTimes(1);
    expect(hooks.writes[0].filePath).toContain(path.join('target', 'src', 'app.js'));
    expect(hooks.writes[0].content).toContain('createStandalonePlatformClient');
  });

  it('rolls back a single file when build verification fails', async () => {
    await writeFixture('src/app.js', "import sdk from '@base44/sdk';\n");
    const hooks = createHooks({ failBuildFor: ['src/app.js'] });

    const summary = await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(summary.migrated).toBe(0);
    expect(summary.blocked).toBe(1);
    expect(summary.blockers).toContainEqual({ file: 'src/app.js', reason: 'BUILD_FAILED' });
    expect(hooks.restoreFile).toHaveBeenCalledTimes(1);
    expect(hooks.restores[0]).toContain(path.join('target', 'src', 'app.js'));
  });

  it('continues after one file fails verification', async () => {
    await writeFixture('src/a.js', "import sdk from '@base44/sdk';\n");
    await writeFixture('src/b.js', "const id = import.meta.env.VITE_BASE44_APP_ID;\n");
    const hooks = createHooks({ failLintFor: ['src/a.js'] });

    const summary = await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(summary.totalFiles).toBe(2);
    expect(summary.migrated).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.blockers).toContainEqual({ file: 'src/a.js', reason: 'LINT_FAILED' });
    expect(hooks.verifyBuild).toHaveBeenCalledTimes(2);
  });

  it('never writes to sourceRepoPath', async () => {
    await writeFixture('src/app.js', "import sdk from '@base44/sdk';\n");
    const hooks = createHooks();

    await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(hooks.writes.every((write) => !write.filePath.startsWith(sourceRepoPath))).toBe(true);
    expect(hooks.writes.every((write) => write.filePath.startsWith(targetRepoPath))).toBe(true);
  });

  it('skips human-review files and returns the expected summary shape', async () => {
    await writeFixture('src/routes.js', "import sdk from '@base44/sdk';\nexport const route = { requiresAuth: true };\n");
    const hooks = createHooks();

    const summary = await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(summary).toEqual({
      totalFiles: 1,
      migrated: 0,
      skipped: 1,
      blocked: 0,
      dependenciesRemoved: [],
      blockers: [{ file: 'src/routes.js', reason: 'AUTH_GATE_REQUIRES_HUMAN_REVIEW' }],
      buildPassed: true,
      testsPassed: true,
    });
    expect(hooks.writeFile).not.toHaveBeenCalled();
  });

  it('does not write package-lock.json when lockfile metadata references a platform SDK', async () => {
    await writeFixture('package-lock.json', '{"packages":{"node_modules/@base44/sdk":{"version":"1.0.0"}}}\n');
    const hooks = createHooks();

    const summary = await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(summary.totalFiles).toBe(0);
    expect(summary.migrated).toBe(0);
    expect(summary.blocked).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(hooks.writeFile).not.toHaveBeenCalled();
  });

  it('keeps package.json dependency changes in human review instead of auto-writing manifests', async () => {
    await writeFixture('package.json', '{"dependencies":{"@base44/sdk":"^1.0.0"}}\n');
    const hooks = createHooks();

    const summary = await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(summary.totalFiles).toBe(1);
    expect(summary.migrated).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(summary.blockers).toContainEqual({
      file: 'package.json',
      reason: 'DEPENDENCY_MANIFEST_REQUIRES_HUMAN_REVIEW',
    });
    expect(hooks.writeFile).not.toHaveBeenCalled();
  });

  it('supports virtual repo files from GitHub-backed hooks', async () => {
    const files = [{ file: 'src/app.js' }];
    const writes = [];
    const summary = await runMigration({
      sourceRepoPath: 'github://veu-ai-studio/saige',
      targetRepoPath: 'github://veu-ai-studio/saige-v2/flowai/migration-saige-1-run12345',
      scanFiles: vi.fn(async () => files),
      readFile: vi.fn(async (filePath) => {
        expect(filePath).toBe('src/app.js');
        return "import sdk from '@base44/sdk';\n";
      }),
      writeFile: vi.fn(async (filePath, content) => {
        writes.push({ filePath, content });
      }),
      restoreFile: vi.fn(),
      verifyBuild: vi.fn(async () => ({ ok: true, output: '' })),
      verifyLint: vi.fn(async () => ({ ok: true, output: '' })),
      runFocusedTests: vi.fn(async () => ({ ok: true, passed: 1 })),
    });

    expect(summary.migrated).toBe(1);
    expect(writes).toHaveLength(1);
    expect(writes[0].filePath).toBe('src/app.js');
    expect(writes[0].content).toContain('createStandalonePlatformClient');
  });

  it('converts GitHub write failures into sanitized migration blockers', async () => {
    const summary = await runMigration({
      sourceRepoPath: 'github://veu-ai-studio/saige',
      targetRepoPath: 'github://veu-ai-studio/saige-v2/flowai/migration-saige-1-run12345',
      scanFiles: vi.fn(async () => [{ file: 'src/app.js' }]),
      readFile: vi.fn(async () => "import sdk from '@base44/sdk';\n"),
      writeFile: vi.fn(async () => {
        const error = new Error('Unable to write src/app.js');
        error.code = 'GITHUB_API_ERROR';
        error.status = 422;
        error.statusText = 'Unprocessable Entity';
        error.githubMessage = 'Invalid request';
        error.githubErrors = [{ field: 'sha', code: 'missing_field' }];
        error.Authorization = 'Bearer ghp_do_not_leak';
        error.token = 'ghp_do_not_leak';
        throw error;
      }),
      restoreFile: vi.fn(),
      verifyBuild: vi.fn(async () => ({ ok: true, output: '' })),
      verifyLint: vi.fn(async () => ({ ok: true, output: '' })),
      runFocusedTests: vi.fn(async () => ({ ok: true, passed: 1 })),
    });

    expect(summary.migrated).toBe(0);
    expect(summary.blocked).toBe(1);
    expect(summary.blockers[0]).toMatchObject({
      file: 'src/app.js',
      reason: 'MIGRATION_BLOCKED',
      code: 'GITHUB_API_ERROR',
      status: 422,
      statusText: 'Unprocessable Entity',
      githubMessage: 'Invalid request',
      githubErrors: [{ field: 'sha', code: 'missing_field' }],
    });
    const serialized = JSON.stringify(summary.blockers);
    expect(serialized).not.toContain('ghp_do_not_leak');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('Authorization');
  });
});
