import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runOrchestration } from '../../src/lib/agents/renewal/orchestrator.js';
import { resetRuntimeFeatureFlagsForTests } from '../../src/lib/runtimeFeatureFlags.js';

const orchestratorSource = readFileSync(
  new URL('../../src/lib/agents/renewal/orchestrator.js', import.meta.url),
  'utf8',
);

function migrationProduct() {
  return {
    product_id: 'migration-product',
    org_id: 'veu-ai-studio',
    github_repo_url: null,
    self_renewal_enabled: true,
    environment: 'prd',
    __pathB: true,
    __sourceUrl: 'https://example.com',
    __detectedRepoUrl: null,
    self_renewal_max_per_day: 1000,
    self_renewal_minimum_delta: 1,
    self_renewal_substantial_threshold: 5,
    self_renewal_negative_delta_policy: 'ALWAYS_OPEN',
  };
}

describe('Migration Mode pipeline integration', () => {
  beforeEach(() => {
    resetRuntimeFeatureFlagsForTests();
  });

  it('returns MIGRATION_MODE_DISABLED before pipeline steps when the feature flag is off', async () => {
    const onStep = vi.fn();
    const result = await runOrchestration({
      url: 'https://example.com',
      mode: 'migration',
      onStep,
      deps: { env: { FLOWAI_ENABLE_MIGRATION_MODE: 'false' } },
    });

    expect(result.exitReason).toBe('MIGRATION_MODE_DISABLED');
    expect(result.migrationModeDisabled).toBe(true);
    expect(result.orchestrationLog).toEqual([]);
    expect(onStep).not.toHaveBeenCalled();
  });

  it('runs the injected migration orchestrator when the feature flag is enabled', async () => {
    const runMigration = vi.fn(async () => ({
      totalFiles: 1,
      migrated: 1,
      skipped: 0,
      blocked: 0,
      dependenciesRemoved: ['src/app.js:1:SDK_IMPORT:base44'],
      skippedFiles: [],
      verification: [],
      blockers: [],
      buildPassed: true,
      testsPassed: true,
    }));
    const appendGovernanceEntry = vi.fn(async () => ({ written: true }));

    const result = await runOrchestration({
      url: 'https://example.com',
      mode: 'migration',
      deps: {
        env: { FLOWAI_ENABLE_MIGRATION_MODE: 'true' },
        discoverProduct: vi.fn(async () => migrationProduct()),
        runMigration,
        appendGovernanceEntry,
        sourceRepoPath: 'C:/source',
        targetRepoPath: 'C:/target',
        verifyBuild: vi.fn(async () => ({ ok: true, output: '' })),
        verifyLint: vi.fn(async () => ({ ok: true, output: '' })),
        runFocusedTests: vi.fn(async () => ({ ok: true, passed: 1 })),
        readFile: vi.fn(async () => ''),
        writeFile: vi.fn(async () => undefined),
        restoreFile: vi.fn(async () => undefined),
      },
    });

    expect(runMigration).toHaveBeenCalledTimes(1);
    expect(result.exitReason).toBe('MIGRATION_COMPLETED');
    expect(result.migration).toMatchObject({
      status: 'MIGRATION_COMPLETED',
      filesMigrated: 1,
      previewCreated: false,
      upgradeUrlLabel: 'Current upgrade URL',
    });
    expect(appendGovernanceEntry).toHaveBeenCalledWith(expect.objectContaining({
      entry: expect.objectContaining({ kind: 'self_renewal.migration_run.v1' }),
    }));
  });

  it('classifies migrated files with only degraded verification as completed with degraded verification', async () => {
    const result = await runOrchestration({
      url: 'https://example.com',
      mode: 'migration',
      deps: {
        env: { FLOWAI_ENABLE_MIGRATION_MODE: 'true' },
        discoverProduct: vi.fn(async () => migrationProduct()),
        runMigration: vi.fn(async () => ({
          totalFiles: 3,
          migrated: 2,
          skipped: 1,
          blocked: 0,
          dependenciesRemoved: ['src/app.js:1:SDK_IMPORT:base44'],
          skippedFiles: [{ file: 'README.md', reason: 'NOT_IN_MIGRATION_WRITE_ALLOWLIST' }],
          verification: [{ file: 'src/app.js', reason: 'VERIFICATION_DEGRADED', message: 'GITHUB_ACTIONS_CHECK_NOT_WIRED' }],
          blockers: [],
          buildPassed: true,
          testsPassed: false,
        })),
        appendGovernanceEntry: vi.fn(async () => ({ written: true })),
        sourceRepoPath: 'C:/source',
        targetRepoPath: 'C:/target',
        verifyBuild: vi.fn(async () => ({ ok: true, output: '' })),
        verifyLint: vi.fn(async () => ({ ok: true, output: '' })),
        runFocusedTests: vi.fn(async () => ({ ok: true, passed: 1 })),
        readFile: vi.fn(async () => ''),
        writeFile: vi.fn(async () => undefined),
        restoreFile: vi.fn(async () => undefined),
      },
    });

    expect(result.exitReason).toBe('MIGRATION_COMPLETED_VERIFICATION_DEGRADED');
    expect(result.finalScore).toBeNull();
    expect(result.migration).toMatchObject({
      status: 'MIGRATION_COMPLETED_VERIFICATION_DEGRADED',
      filesMigrated: 2,
      skippedFiles: [{ file: 'README.md', reason: 'NOT_IN_MIGRATION_WRITE_ALLOWLIST' }],
      blockers: [],
    });
  });

  it('keeps the migration platform-boundary transition isolated to migration mode', () => {
    expect(orchestratorSource).toContain("const migrationFlag = mode === 'migration'");
    expect(orchestratorSource).toContain("if (mode === 'migration' && !migrationFlag.enabled)");
    expect(orchestratorSource).toContain("if (state.mode === 'migration')");
    expect(orchestratorSource).not.toContain("state.mode !== 'migration' &&");
  });
});
