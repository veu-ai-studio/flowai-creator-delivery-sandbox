import { describe, expect, it } from 'vitest';

import { parseMatrix } from '../../src/lib/orchestratorFramework/matrixIngestion.js';

function captureLogger() {
  const records = [];
  const logger = {
    warn: (event, payload) => records.push({ level: 'WARN', event, payload }),
    error: (event, payload) => records.push({ level: 'ERROR', event, payload }),
  };
  return { logger, records };
}

describe('v0.2A matrix ingestion', () => {
  it('parses Layer 1 entries correctly', () => {
    const result = parseMatrix({
      version: 'abc123',
      layer1: [{ layer: 1, surfaceId: 'claim-a', status: 'VERIFIED', tier: 'A' }],
      layer2: [],
    });

    expect(result.error).toBeUndefined();
    expect(result.layer1).toHaveLength(1);
    expect(result.layer1[0]).toMatchObject({ layer: 1, surfaceId: 'claim-a', status: 'VERIFIED', tier: 'A' });
  });

  it('parses Layer 2 entries correctly', () => {
    const result = parseMatrix({
      version: 'abc123',
      layer1: [],
      layer2: [{ layer: 2, surfaceId: 'capability-b', status: 'IN_PROGRESS', tier: 'B' }],
    });

    expect(result.error).toBeUndefined();
    expect(result.layer2).toHaveLength(1);
    expect(result.layer2[0]).toMatchObject({ layer: 2, surfaceId: 'capability-b', status: 'IN_PROGRESS', tier: 'B' });
  });

  it('maps surfaces to correct declared Tiers', () => {
    const result = parseMatrix({
      version: 'abc123',
      layer1: [{ layer: 1, surfaceId: 'claim-a', status: 'VERIFIED', tier: 'A' }],
      layer2: [{ layer: 2, surfaceId: 'capability-b', status: 'CURRENT', tier: 'B' }],
    });

    expect(result.surfaceTierMap).toEqual({ 'claim-a': 'A', 'capability-b': 'B' });
  });

  it('applies the default-tier rule to rows without a Tier column', () => {
    const { logger } = captureLogger();
    const result = parseMatrix({
      version: 'abc123',
      layer1: [{ layer: 1, surfaceId: 'persisted-record', status: 'PARTIAL', description: 'Supabase persisted record' }],
      layer2: [{ layer: 2, surfaceId: 'planning-only', status: 'ROADMAP', description: 'planning capability' }],
    }, { logger });

    expect(result.surfaceTierMap['persisted-record']).toBe('A');
    expect(result.surfaceTierMap['planning-only']).toBe('B');
  });

  it('logs WARN per defaulted row', () => {
    const { logger, records } = captureLogger();
    parseMatrix({
      version: 'abc123',
      layer1: [{ layer: 1, surfaceId: 'claim-a', status: 'PARTIAL' }],
      layer2: [{ layer: 2, surfaceId: 'capability-b', status: 'ROADMAP' }],
    }, { logger });

    expect(records.filter(record => record.level === 'WARN' && record.event === 'matrix.default_tier_applied')).toHaveLength(2);
  });

  it('returns ErrorResult on malformed/corrupted input', () => {
    const result = parseMatrix('{not json');

    expect(result).toMatchObject({ error: true });
    expect(result.reason).toContain('malformed_matrix_artifact');
  });

  it('returns ErrorResult on empty/missing content', () => {
    expect(parseMatrix('')).toMatchObject({ error: true, reason: 'empty_or_missing_content' });
    expect(parseMatrix(null)).toMatchObject({ error: true, reason: 'empty_or_missing_content' });
  });

  it('includes matrixArtifactVersion in output', () => {
    const result = parseMatrix({
      version: 'abc123',
      layer1: [{ layer: 1, surfaceId: 'claim-a', status: 'VERIFIED', tier: 'A' }],
      layer2: [],
    });

    expect(result.matrixArtifactVersion).toBe('abc123');
  });
});
