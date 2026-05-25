import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import enableMigrationMode from '../../api/operator/enable-migration-mode.js';
import disableMigrationMode from '../../api/operator/disable-migration-mode.js';
import migrationModeStatus from '../../api/operator/migration-mode.js';
import {
  getMigrationModeFlag,
  resetRuntimeFeatureFlagsForTests,
} from '../../src/lib/runtimeFeatureFlags.js';

function createReq(method = 'POST') {
  return {
    method,
    headers: {},
    socket: {},
  };
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    writableEnded: false,
    headersSent: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      this.writableEnded = true;
      return this;
    },
    end(body) {
      this.body = body;
      this.headersSent = true;
      this.writableEnded = true;
      return this;
    },
  };
}

describe('operator Migration Mode runtime flag API', () => {
  const originalBypass = process.env.FLOWAI_AUTH_BYPASS;
  const originalEnvFlag = process.env.FLOWAI_ENABLE_MIGRATION_MODE;

  beforeEach(() => {
    resetRuntimeFeatureFlagsForTests();
    process.env.FLOWAI_AUTH_BYPASS = 'PROVE_INTERNAL_2026';
    delete process.env.FLOWAI_ENABLE_MIGRATION_MODE;
  });

  afterEach(() => {
    resetRuntimeFeatureFlagsForTests();
    if (originalBypass === undefined) delete process.env.FLOWAI_AUTH_BYPASS;
    else process.env.FLOWAI_AUTH_BYPASS = originalBypass;
    if (originalEnvFlag === undefined) delete process.env.FLOWAI_ENABLE_MIGRATION_MODE;
    else process.env.FLOWAI_ENABLE_MIGRATION_MODE = originalEnvFlag;
  });

  it('enables and disables Migration Mode in the runtime store', async () => {
    const enableRes = createRes();
    await enableMigrationMode(createReq('POST'), enableRes);
    expect(enableRes.statusCode).toBe(200);
    expect(enableRes.body).toMatchObject({ ok: true, enabled: true });
    await expect(getMigrationModeFlag()).resolves.toMatchObject({ enabled: true });

    const statusRes = createRes();
    await migrationModeStatus(createReq('GET'), statusRes);
    expect(statusRes.body).toMatchObject({ ok: true, enabled: true });

    const disableRes = createRes();
    await disableMigrationMode(createReq('POST'), disableRes);
    expect(disableRes.statusCode).toBe(200);
    expect(disableRes.body).toMatchObject({ ok: true, enabled: false });
    await expect(getMigrationModeFlag()).resolves.toMatchObject({ enabled: false });
  });
});
