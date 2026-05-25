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
    await writeFixture('src/pages/app.js', "import { base44Client } from './base44Client';\nexport const api = base44Client;\n");
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
    expect(hooks.writes[0].filePath).toContain(path.join('target', 'src', 'pages', 'app.js'));
    expect(hooks.writes[0].content).toContain('createStandalonePlatformClient');
  });

  it('rolls back a single file when build verification fails', async () => {
    await writeFixture('src/pages/app.js', "import sdk from '@base44/sdk';\n");
    const hooks = createHooks({ failBuildFor: ['src/pages/app.js'] });

    const summary = await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(summary.migrated).toBe(0);
    expect(summary.blocked).toBe(1);
    expect(summary.blockers).toContainEqual({ file: 'src/pages/app.js', reason: 'BUILD_FAILED' });
    expect(hooks.restoreFile).toHaveBeenCalledTimes(1);
    expect(hooks.restores[0]).toContain(path.join('target', 'src', 'pages', 'app.js'));
  });

  it('continues after one file fails verification', async () => {
    await writeFixture('src/pages/a.js', "import sdk from '@base44/sdk';\n");
    await writeFixture('src/components/b.js', "const id = import.meta.env.VITE_BASE44_APP_ID;\n");
    const hooks = createHooks({ failLintFor: ['src/pages/a.js'] });

    const summary = await runMigration({
      sourceRepoPath,
      targetRepoPath,
      ...hooks,
    });

    expect(summary.totalFiles).toBe(2);
    expect(summary.migrated).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.blockers).toContainEqual({ file: 'src/pages/a.js', reason: 'LINT_FAILED' });
    expect(hooks.verifyBuild).toHaveBeenCalledTimes(2);
  });

  it('never writes to sourceRepoPath', async () => {
    await writeFixture('src/pages/app.js', "import sdk from '@base44/sdk';\n");
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
    await writeFixture('src/pages/secureRoute.js', "import sdk from '@base44/sdk';\nexport const route = { requiresAuth: true };\n");
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
      blockers: [{ file: 'src/pages/secureRoute.js', reason: 'AUTH_GATE_REQUIRES_HUMAN_REVIEW' }],
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
      reason: 'PACKAGE_OR_LOCKFILE',
    });
    expect(hooks.writeFile).not.toHaveBeenCalled();
  });

  it('does not write auth context files during direct migration', async () => {
    await writeFixture('src/lib/AuthContext.jsx', "import sdk from '@base44/sdk';\nexport const AuthContext = null;\n");
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
      file: 'src/lib/AuthContext.jsx',
      reason: 'AUTH_SESSION_PROVIDER_FILE',
    });
    expect(hooks.writeFile).not.toHaveBeenCalled();
  });

  it('supports virtual repo files from GitHub-backed hooks', async () => {
    const files = [{ file: 'src/pages/app.js' }];
    const writes = [];
    const summary = await runMigration({
      sourceRepoPath: 'github://veu-ai-studio/saige',
      targetRepoPath: 'github://veu-ai-studio/saige-v2/flowai/migration-saige-1-run12345',
      scanFiles: vi.fn(async () => files),
      readFile: vi.fn(async (filePath) => {
        expect(filePath).toBe('src/pages/app.js');
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
    expect(writes[0].filePath).toBe('src/pages/app.js');
    expect(writes[0].content).toContain('createStandalonePlatformClient');
  });

  it('converts GitHub write failures into sanitized migration blockers', async () => {
    const summary = await runMigration({
      sourceRepoPath: 'github://veu-ai-studio/saige',
      targetRepoPath: 'github://veu-ai-studio/saige-v2/flowai/migration-saige-1-run12345',
      scanFiles: vi.fn(async () => [{ file: 'src/pages/app.js' }]),
      readFile: vi.fn(async () => "import sdk from '@base44/sdk';\n"),
      writeFile: vi.fn(async () => {
        const error = new Error('Unable to write src/pages/app.js');
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
      file: 'src/pages/app.js',
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

  it('converts restore failures into sanitized blockers instead of throwing a terminal error', async () => {
    const summary = await runMigration({
      sourceRepoPath: 'github://veu-ai-studio/saige',
      targetRepoPath: 'github://veu-ai-studio/saige-v2/flowai/migration-saige-1-run12345',
      scanFiles: vi.fn(async () => [{ file: 'src/pages/app.js' }]),
      readFile: vi.fn(async () => "import sdk from '@base44/sdk';\n"),
      writeFile: vi.fn(async () => {}),
      restoreFile: vi.fn(async () => {
        const error = new Error('Unable to restore src/pages/app.js');
        error.code = 'GITHUB_API_ERROR';
        error.status = 403;
        error.statusText = 'Forbidden';
        error.githubMessage = 'Resource not accessible by personal access token';
        throw error;
      }),
      verifyBuild: vi.fn(async () => ({ ok: false, output: 'build failed' })),
      verifyLint: vi.fn(async () => ({ ok: true, output: '' })),
      runFocusedTests: vi.fn(async () => ({ ok: true, passed: 1 })),
    });

    expect(summary.blocked).toBe(1);
    expect(summary.blockers).toContainEqual(expect.objectContaining({
      file: 'src/pages/app.js',
      reason: 'RESTORE_FAILED',
      code: 'GITHUB_API_ERROR',
      status: 403,
      githubMessage: 'Resource not accessible by personal access token',
    }));
    expect(summary.blockers).toContainEqual({ file: 'src/pages/app.js', reason: 'BUILD_FAILED' });
  });

  it('treats unavailable GitHub Actions verification as degraded evidence instead of rolling back writes', async () => {
    const restoreFile = vi.fn();
    const summary = await runMigration({
      sourceRepoPath: 'github://veu-ai-studio/saige',
      targetRepoPath: 'github://veu-ai-studio/saige-v2/flowai/migration-saige-1-run12345',
      scanFiles: vi.fn(async () => [{ file: 'src/pages/app.js' }]),
      readFile: vi.fn(async () => "import sdk from '@base44/sdk';\n"),
      writeFile: vi.fn(async () => {}),
      restoreFile,
      verifyBuild: vi.fn(async () => ({
        ok: false,
        output: 'GITHUB_ACTIONS_CHECK_NOT_WIRED',
        reason: 'GITHUB_ACTIONS_CHECK_NOT_WIRED',
        degraded: true,
      })),
      verifyLint: vi.fn(async () => ({ ok: true, output: '' })),
      runFocusedTests: vi.fn(async () => ({ ok: false, passed: 0, reason: 'GITHUB_ACTIONS_CHECK_NOT_WIRED', degraded: true })),
    });

    expect(summary.migrated).toBe(1);
    expect(summary.blocked).toBe(0);
    expect(summary.testsPassed).toBe(false);
    expect(summary.blockers).toContainEqual({
      file: 'src/pages/app.js',
      reason: 'VERIFICATION_DEGRADED',
      message: 'GITHUB_ACTIONS_CHECK_NOT_WIRED',
    });
    expect(restoreFile).not.toHaveBeenCalled();
  });

  it.each([
    ['base44 directory', 'base44/client.js', 'BASE44_DIRECTORY'],
    ['auth/session/provider file', 'src/components/AuthProvider.jsx', 'AUTH_SESSION_PROVIDER_FILE'],
    ['config file', 'src/utils/config.js', 'CONFIG_FILE'],
    ['env file', '.env.local', 'CONFIG_FILE'],
    ['package manifest', 'package.json', 'PACKAGE_OR_LOCKFILE'],
    ['lockfile', 'package-lock.json', 'PACKAGE_OR_LOCKFILE'],
    ['framework boundary file', 'src/App.jsx', 'FRAMEWORK_BOUNDARY_FILE'],
    ['generated file', 'src/components/Button.generated.jsx', 'GENERATED_FILE'],
    ['TypeScript declaration file', 'src/utils/platform.d.ts', 'TYPESCRIPT_DECLARATION_FILE'],
    ['entry point file', 'src/pages/entry.js', 'ENTRY_POINT_FILE'],
    ['non-allowlisted lib file', 'src/lib/app-params.js', 'NOT_IN_MIGRATION_WRITE_ALLOWLIST'],
  ])('skips %s before read or GitHub write', async (_label, file, reason) => {
    const readFile = vi.fn(async () => "import sdk from '@base44/sdk';\n");
    const writeFile = vi.fn();
    const verifyBuild = vi.fn(async () => ({ ok: true, output: '' }));
    const verifyLint = vi.fn(async () => ({ ok: true, output: '' }));

    const summary = await runMigration({
      sourceRepoPath: 'github://veu-ai-studio/saige',
      targetRepoPath: 'github://veu-ai-studio/saige-v2/flowai/migration-saige-1-run12345',
      scanFiles: vi.fn(async () => [{ file }]),
      readFile,
      writeFile,
      restoreFile: vi.fn(),
      verifyBuild,
      verifyLint,
      runFocusedTests: vi.fn(async () => ({ ok: true, passed: 1 })),
    });

    if (file === 'package-lock.json') {
      expect(summary).toMatchObject({
        totalFiles: 0,
        migrated: 0,
        skipped: 0,
        blocked: 0,
      });
    } else {
      expect(summary).toMatchObject({
        totalFiles: 1,
        migrated: 0,
        skipped: 1,
        blocked: 0,
      });
      expect(summary.blockers).toContainEqual({ file, reason });
    }
    expect(writeFile).not.toHaveBeenCalled();
    expect(verifyBuild).not.toHaveBeenCalled();
    expect(verifyLint).not.toHaveBeenCalled();
  });

  it.each([
    'src/components/Card.jsx',
    'src/pages/Home.jsx',
    'src/app/page.jsx',
    'src/styles/theme.css',
    'src/utils/format.js',
    'src/hooks/useThing.js',
  ])('allows app-layer migration writes for %s', async (file) => {
    const writeFile = vi.fn();

    const summary = await runMigration({
      sourceRepoPath: 'github://veu-ai-studio/saige',
      targetRepoPath: 'github://veu-ai-studio/saige-v2/flowai/migration-saige-1-run12345',
      scanFiles: vi.fn(async () => [{ file }]),
      readFile: vi.fn(async () => "import sdk from '@base44/sdk';\n"),
      writeFile,
      restoreFile: vi.fn(),
      verifyBuild: vi.fn(async () => ({ ok: true, output: '' })),
      verifyLint: vi.fn(async () => ({ ok: true, output: '' })),
      runFocusedTests: vi.fn(async () => ({ ok: true, passed: 1 })),
    });

    expect(summary.migrated).toBe(1);
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile.mock.calls[0][0]).toBe(file);
  });
});
