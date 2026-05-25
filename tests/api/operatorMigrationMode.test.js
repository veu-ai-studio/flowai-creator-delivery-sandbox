import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import enableMigrationMode from '../../api/operator/enable-migration-mode.js';
import disableMigrationMode from '../../api/operator/disable-migration-mode.js';
import migrationModeStatus from '../../api/operator/migration-mode.js';
import {
  getMigrationModeFlag,
  resetRuntimeFeatureFlagsForTests,
} from '../../src/lib/runtimeFeatureFlags.js';

function createReq(method = 'POST', headers = {}) {
  return {
    method,
    headers,
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
  const originalOperatorSecret = process.env.FLOWAI_OPERATOR_SECRET;
  const secret = 'test-operator-secret-123';

  beforeEach(() => {
    resetRuntimeFeatureFlagsForTests();
    delete process.env.FLOWAI_AUTH_BYPASS;
    delete process.env.FLOWAI_ENABLE_MIGRATION_MODE;
    process.env.FLOWAI_OPERATOR_SECRET = secret;
  });

  afterEach(() => {
    resetRuntimeFeatureFlagsForTests();
    if (originalBypass === undefined) delete process.env.FLOWAI_AUTH_BYPASS;
    else process.env.FLOWAI_AUTH_BYPASS = originalBypass;
    if (originalEnvFlag === undefined) delete process.env.FLOWAI_ENABLE_MIGRATION_MODE;
    else process.env.FLOWAI_ENABLE_MIGRATION_MODE = originalEnvFlag;
    if (originalOperatorSecret === undefined) delete process.env.FLOWAI_OPERATOR_SECRET;
    else process.env.FLOWAI_OPERATOR_SECRET = originalOperatorSecret;
  });

  it('returns 401 without session or operator secret', async () => {
    const enableRes = createRes();
    await enableMigrationMode(createReq('POST'), enableRes);
    expect(enableRes.statusCode).toBe(401);
    expect(JSON.stringify(enableRes.body)).not.toContain(secret);

    const disableRes = createRes();
    await disableMigrationMode(createReq('POST'), disableRes);
    expect(disableRes.statusCode).toBe(401);
    expect(JSON.stringify(disableRes.body)).not.toContain(secret);
  });

  it('rejects invalid operator secret for enable and disable', async () => {
    const req = createReq('POST', { 'x-flowai-operator-secret': 'wrong-secret' });

    const enableRes = createRes();
    await enableMigrationMode(req, enableRes);
    expect(enableRes.statusCode).toBe(401);
    expect(JSON.stringify(enableRes.body)).not.toContain(secret);
    expect(JSON.stringify(enableRes.body)).not.toContain('wrong-secret');

    const disableRes = createRes();
    await disableMigrationMode(req, disableRes);
    expect(disableRes.statusCode).toBe(401);
    expect(JSON.stringify(disableRes.body)).not.toContain(secret);
    expect(JSON.stringify(disableRes.body)).not.toContain('wrong-secret');
  });

  it('returns 401 when FLOWAI_OPERATOR_SECRET is absent', async () => {
    delete process.env.FLOWAI_OPERATOR_SECRET;
    const req = createReq('POST', { 'x-flowai-operator-secret': secret });

    const enableRes = createRes();
    await enableMigrationMode(req, enableRes);
    expect(enableRes.statusCode).toBe(401);

    const disableRes = createRes();
    await disableMigrationMode(req, disableRes);
    expect(disableRes.statusCode).toBe(401);
  });

  it('enables and disables Migration Mode with valid operator-secret header', async () => {
    const headers = { 'x-flowai-operator-secret': secret };

    const enableRes = createRes();
    await enableMigrationMode(createReq('POST', headers), enableRes);
    expect(enableRes.statusCode).toBe(200);
    expect(enableRes.body).toMatchObject({ ok: true, enabled: true });
    expect(JSON.stringify(enableRes.body)).not.toContain(secret);
    await expect(getMigrationModeFlag()).resolves.toMatchObject({ enabled: true });

    const statusRes = createRes();
    await migrationModeStatus(createReq('GET'), statusRes);
    expect(statusRes.body).toMatchObject({ ok: true, enabled: true });

    const disableRes = createRes();
    await disableMigrationMode(createReq('POST', headers), disableRes);
    expect(disableRes.statusCode).toBe(200);
    expect(disableRes.body).toMatchObject({ ok: true, enabled: false });
    expect(JSON.stringify(disableRes.body)).not.toContain(secret);
    await expect(getMigrationModeFlag()).resolves.toMatchObject({ enabled: false });
  });
});
