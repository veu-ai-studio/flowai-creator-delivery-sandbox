import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), update: vi.fn(), run: vi.fn() }));
vi.mock('../../api/_lib/auth.js', () => ({ requireAuthHard: mocks.auth }));
vi.mock('../../api/_lib/operationalRuns.js', () => ({ createOperationalRun: mocks.create, updateOperationalRun: mocks.update }));
vi.mock('../../api/_lib/supabase.js', () => ({ getSupabase: () => null }));
vi.mock('../../src/lib/orchestra/index.js', () => ({ dispatch: vi.fn() }));
vi.mock('../../src/lib/forge/independentStageRunner.js', async (original) => ({ ...(await original()), runIndependentStage: mocks.run }));
import handler from '../../api/forge/stage.js';

function response() {
  return { statusCode: 200, payload: null, setHeader: vi.fn(), status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; } };
}

describe('POST /api/forge/stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ replayed: false, run: { id: 'run-independent' } });
    mocks.update.mockImplementation(async (_id, _owner, patch) => ({ id: 'run-independent', ...patch }));
    mocks.run.mockResolvedValue({ artifact: { id: 'artifact-1', fingerprint: 'a'.repeat(64), provenance: {} } });
  });

  it('denies requests without verified tenant membership', async () => {
    mocks.auth.mockImplementation(async (_req, res) => { res.status(401).json({ error: 'Authentication required' }); return null; });
    const res = response();
    await handler({ method: 'POST', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('persists requested stage, provenance, artifact, and clearance-first boundaries for an authenticated tenant member', async () => {
    mocks.auth.mockResolvedValue({ authenticated: true, authMode: 'clerk', orgId: 'veu-ai-studio', userId: 'founder-1' });
    const res = response();
    await handler({ method: 'POST', headers: { 'idempotency-key': 'independent-research-1' }, body: { stage: 'research', productId: 'flowai', environment: 'staging', productionPromotionAuthorized: false } }, res);
    expect(res.statusCode).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'veu-ai-studio', userId: 'founder-1', input: expect.objectContaining({ mode: 'independent_stage', requestedStage: 'research' }) }));
    expect(mocks.update).toHaveBeenLastCalledWith('run-independent', { orgId: 'veu-ai-studio', userId: 'founder-1' }, expect.objectContaining({ status: 'completed', requestedStage: 'research', clearanceAllowed: false, productionPromotionAuthorized: false }));
    expect(res.payload).toMatchObject({ ok: true, requestedStage: 'research', clearanceAllowed: false, productionPromotionAuthorized: false });
  });

  it('fails closed before creating a run for non-staging or promotion-authorized requests', async () => {
    mocks.auth.mockResolvedValue({ authenticated: true, authMode: 'service', orgId: 'veu-ai-studio', userId: 'operator-1' });
    for (const body of [{ environment: 'production' }, { environment: 'staging', productionPromotionAuthorized: true }]) {
      const res = response();
      await handler({ method: 'POST', headers: {}, body }, res);
      expect(res.statusCode).toBe(409);
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('returns and persists redacted ranked-provider failure reasons', async () => {
    mocks.auth.mockResolvedValue({ authenticated: true, authMode: 'clerk', orgId: 'veu-ai-studio', userId: 'founder-1' });
    const failure = new Error('P2 live execution STOP: analyze exhausted ranked tool candidates');
    failure.details = {
      exhaustionKind: 'provider_exhausted',
      attemptHistory: [
        { tool: 'Claude Code', memberId: 'claude-code', state: 'failed', reason: 'Anthropic returned 404', result: { rawText: 'must not escape' } },
        { tool: 'Fallback', memberId: null, state: 'unavailable', reason: 'credential missing' },
      ],
    };
    mocks.run.mockRejectedValue(failure);
    const res = response();
    await handler({ method: 'POST', headers: { 'idempotency-key': 'provider-failure-1' }, body: { stage: 'research', productId: 'flowai', environment: 'staging', productionPromotionAuthorized: false } }, res);
    expect(res.statusCode).toBe(500);
    expect(res.payload.details).toEqual({
      exhaustionKind: 'provider_exhausted',
      attempts: [
        { tool: 'Claude Code', memberId: 'claude-code', state: 'failed', reason: 'Anthropic returned 404' },
        { tool: 'Fallback', memberId: null, state: 'unavailable', reason: 'credential missing' },
      ],
    });
    expect(JSON.stringify(res.payload)).not.toContain('must not escape');
    expect(mocks.update).toHaveBeenLastCalledWith('run-independent', { orgId: 'veu-ai-studio', userId: 'founder-1' }, expect.objectContaining({
      status: 'failed',
      error: expect.objectContaining({ details: res.payload.details }),
    }));
  });
});
