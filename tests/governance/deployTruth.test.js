import { describe, expect, it, vi } from 'vitest';
import {
  buildDeployTruthArtifact,
  fetchProductionVersion,
  persistDeployTruthArtifact,
  summarizeDeployTruth,
} from '../../src/lib/governance/deployTruth.js';

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
});
