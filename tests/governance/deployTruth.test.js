import { describe, expect, it, vi } from 'vitest';
import {
  buildDeployTruthArtifact,
  fetchProductionVersion,
  persistDeployTruthArtifact,
  summarizeDeployTruth,
} from '../../src/lib/governance/deployTruth.js';
import { appendGovernanceEntryLight } from '../../src/lib/governance/appendGovernanceEntry.light.js';
import { runDeployTruthCheck } from '../../api/deploy-truth-check.js';

describe('deploy truth governance artifact', () => {
  it('classifies matching production and local commits as MATCH', () => {
    const artifact = buildDeployTruthArtifact({
      checkedAt: '2026-05-25T00:00:00.000Z',
      productionVersion: {
        commitFull: 'abc123def4567890',
        branch: 'flowai-v0.1',
        deployUrl: 'flowai-dun.vercel.app',
      },
      localHeadCommit: 'abc123def4567890',
    });

    expect(artifact).toMatchObject({
      kind: 'deploy_truth.drift_check.v1',
      checkedAt: '2026-05-25T00:00:00.000Z',
      productionCommit: 'abc123def4567890',
      localHeadCommit: 'abc123def4567890',
      branch: 'flowai-v0.1',
      status: 'MATCH',
    });
    expect(artifact).not.toHaveProperty('driftDetails');
  });

  it('classifies mismatched commits as DRIFT and includes commits ahead of production', () => {
    const artifact = buildDeployTruthArtifact({
      productionVersion: { commitFull: 'old1111111111111', branch: 'flowai-v0.1' },
      localHeadCommit: 'new2222222222222',
      driftDetails: [
        'new222222222 feat: latest local work',
        'mid333333333 fix: prior commit',
      ],
    });

    expect(artifact.status).toBe('DRIFT');
    expect(artifact.driftDetails).toEqual([
      'new222222222 feat: latest local work',
      'mid333333333 fix: prior commit',
    ]);
  });

  it('classifies missing version data as BLOCKED without fabricating success', () => {
    const artifact = buildDeployTruthArtifact({
      productionVersion: null,
      localHeadCommit: 'abc123',
      branch: 'flowai-v0.1',
      blockedReason: 'version_endpoint_http_404',
    });

    expect(artifact.status).toBe('BLOCKED');
    expect(artifact.blockers).toEqual([
      'production_commit_missing',
      'version_endpoint_http_404',
    ]);
  });

  it('fetches /api/version from the production URL', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      json: async () => ({ commitFull: 'abc123', branch: 'flowai-v0.1', requested: url }),
    }));

    const result = await fetchProductionVersion({
      productionUrl: 'https://flowai-dun.vercel.app/',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://flowai-dun.vercel.app/api/version', {
      headers: { Accept: 'application/json' },
    });
    expect(result).toMatchObject({
      ok: true,
      version: { commitFull: 'abc123', branch: 'flowai-v0.1' },
    });
  });

  it('falls back to public health build identity when /api/version is authenticated', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.endsWith('/api/version')) return { ok: false, status: 401 };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          env: 'production',
          commit: 'abc123',
          checks: {
            build: {
              commitFull: 'abc123def456',
              branch: 'codex/release',
              deploymentUrl: 'https://flowai-preview.vercel.app',
            },
          },
        }),
      };
    });

    const result = await fetchProductionVersion({
      productionUrl: 'https://flowai.flowaiplatform.com',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(2, 'https://flowai.flowaiplatform.com/api/health', {
      headers: { Accept: 'application/json' },
    });
    expect(result).toEqual({
      ok: true,
      version: {
        commitFull: 'abc123def456',
        commit: 'abc123',
        branch: 'codex/release',
        deployUrl: 'https://flowai-preview.vercel.app',
        env: 'production',
      },
    });
  });

  it('persists deploy truth artifacts to Supabase governance_record via appendGovernanceEntry', async () => {
    const artifact = buildDeployTruthArtifact({
      productionVersion: { commitFull: 'abc123', branch: 'flowai-v0.1' },
      localHeadCommit: 'abc123',
    });
    const appendGovernanceEntry = vi.fn(async () => ({ written: true }));
    const supabase = { from: vi.fn() };

    const persistence = await persistDeployTruthArtifact({
      artifact,
      supabase,
      appendGovernanceEntry,
    });

    expect(persistence).toMatchObject({ written: true, transport: 'supabase' });
    expect(appendGovernanceEntry).toHaveBeenCalledWith({
      productId: 'flowai',
      environment: 'prd',
      entry: artifact,
      supabase,
    });
  });

  it('falls back to KV governance storage when Supabase is unavailable', async () => {
    const artifact = buildDeployTruthArtifact({
      checkedAt: '2026-05-25T00:00:00.000Z',
      productionVersion: { commitFull: 'abc123', branch: 'flowai-v0.1' },
      localHeadCommit: 'abc123',
    });
    const kv = { set: vi.fn(async () => true) };

    const persistence = await persistDeployTruthArtifact({ artifact, kv });

    expect(persistence).toMatchObject({
      written: true,
      transport: 'kv',
      key: 'flowai:governance:deploy-truth:2026-05-25T00:00:00.000Z',
    });
    expect(kv.set).toHaveBeenCalledWith(
      'flowai:governance:deploy-truth:2026-05-25T00:00:00.000Z',
      artifact,
    );
  });

  it('summarizes persisted MATCH checks as ok and all other cases honestly', () => {
    const artifact = buildDeployTruthArtifact({
      productionVersion: { commitFull: 'abc123', branch: 'flowai-v0.1' },
      localHeadCommit: 'abc123',
    });

    expect(summarizeDeployTruth({
      artifact,
      persistence: { written: true, transport: 'supabase' },
    })).toMatchObject({ ok: true });

    expect(summarizeDeployTruth({
      artifact: { ...artifact, status: 'DRIFT' },
      persistence: { written: true, transport: 'supabase' },
    })).toMatchObject({ ok: false });
  });

  it('light governance writer appends to Supabase without importing renewal modules', async () => {
    const artifact = buildDeployTruthArtifact({
      productionVersion: { commitFull: 'abc123', branch: 'flowai-v0.1' },
      localHeadCommit: 'abc123',
    });
    const calls = [];
    const supabase = {
      from(table) {
        calls.push(['from', table]);
        return {
          select(cols) {
            calls.push(['select', cols]);
            return {
              eq() { return this; },
              async maybeSingle() {
                return { data: { id: 'row-1', governance_record: [{ kind: 'existing' }] }, error: null };
              },
            };
          },
          update(payload) {
            calls.push(['update', payload]);
            return {
              eq() { return { error: null }; },
            };
          },
        };
      },
    };

    const persistence = await appendGovernanceEntryLight({ entry: artifact, supabase });

    expect(persistence).toMatchObject({ written: true, transport: 'supabase', rowId: 'row-1' });
    expect(calls).toContainEqual(['from', 'product_ssot']);
    const update = calls.find(([kind]) => kind === 'update')?.[1];
    expect(update.governance_record).toEqual([{ kind: 'existing' }, artifact]);
  });

  it('light governance writer falls back to KV when Supabase is unavailable', async () => {
    const artifact = buildDeployTruthArtifact({
      checkedAt: '2026-05-25T00:00:00.000Z',
      productionVersion: { commitFull: 'abc123', branch: 'flowai-v0.1' },
      localHeadCommit: 'abc123',
    });
    const kv = { set: vi.fn(async () => true) };

    const persistence = await appendGovernanceEntryLight({ entry: artifact, kv });

    expect(persistence).toMatchObject({
      written: true,
      transport: 'kv',
      key: 'flowai:governance:deploy-truth:2026-05-25T00:00:00.000Z',
    });
    expect(kv.set).toHaveBeenCalledWith(
      'flowai:governance:deploy-truth:2026-05-25T00:00:00.000Z',
      artifact,
    );
  });

  it('light governance writer emits console fallback when no store is available', async () => {
    const artifact = buildDeployTruthArtifact({
      productionVersion: { commitFull: 'abc123', branch: 'flowai-v0.1' },
      localHeadCommit: 'abc123',
    });
    const consoleImpl = { log: vi.fn() };

    const persistence = await appendGovernanceEntryLight({ entry: artifact, consoleImpl });

    expect(persistence).toMatchObject({
      written: false,
      transport: 'console',
      reason: 'governance_store_unavailable',
    });
    expect(consoleImpl.log).toHaveBeenCalledWith(expect.stringContaining('deploy_truth.drift_check.v1'));
  });

  it('API checker compares /api/version against expected head and persists with light writer', async () => {
    const persist = vi.fn(async () => ({ written: true, transport: 'supabase' }));
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      json: async () => ({
        commitFull: 'abc123',
        branch: 'flowai-v0.1',
        deployUrl: 'flowai.example',
        requested: url,
      }),
    }));

    const summary = await runDeployTruthCheck({
      productionUrl: 'https://flowai.example',
      expectedCommit: 'abc123',
      branch: 'flowai-v0.1',
      fetchImpl,
      persist,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://flowai.example/api/version', {
      headers: { Accept: 'application/json' },
    });
    expect(summary.ok).toBe(true);
    expect(summary.artifact.status).toBe('MATCH');
    expect(persist).toHaveBeenCalledWith({
      entry: expect.objectContaining({
        kind: 'deploy_truth.drift_check.v1',
        status: 'MATCH',
        productionCommit: 'abc123',
        localHeadCommit: 'abc123',
      }),
    });
  });

  it('API checker is read-only by default and still reports MATCH as ok', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      json: async () => ({
        commitFull: 'abc123',
        branch: 'main',
        deployUrl: 'flowai.example',
        requested: url,
      }),
    }));

    const summary = await runDeployTruthCheck({
      productionUrl: 'https://flowai.example',
      expectedCommit: 'abc123',
      branch: 'main',
      fetchImpl,
    });

    expect(summary.ok).toBe(true);
    expect(summary.artifact.status).toBe('MATCH');
    expect(summary.artifact.branch).toBe('main');
    expect(summary.persistence).toMatchObject({
      written: false,
      reason: 'read_only_check',
    });
  });

  it('API checker reports DRIFT when expected head differs from production', async () => {
    const summary = await runDeployTruthCheck({
      productionUrl: 'https://flowai.example',
      expectedCommit: 'new456',
      branch: 'flowai-v0.1',
      fetchImpl: vi.fn(async () => ({
        ok: true,
        json: async () => ({ commitFull: 'old123', branch: 'flowai-v0.1' }),
      })),
      persist: vi.fn(async () => ({ written: true, transport: 'kv' })),
    });

    expect(summary.ok).toBe(false);
    expect(summary.artifact.status).toBe('DRIFT');
    expect(summary.artifact.driftDetails).toEqual([
      'production=old123',
      'expected=new456',
    ]);
  });
});
