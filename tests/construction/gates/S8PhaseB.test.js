// tests/construction/gates/S8PhaseB.test.js
//
// CA-17 §3.8 conformance — S8 pre-PR Phase B (PANEL-RATIFIABLE).

import { describe, it, expect, vi } from 'vitest';
import {
  evaluatePhaseBResult,
  runS8PhaseB,
  PHASE_B_KIND,
  PHASE_B_FAILURE_KIND,
} from '../../../src/lib/construction/gates/S8PhaseB.js';

describe('S8 — evaluatePhaseBResult', () => {
  it('returns ok when probe ok + no new high findings', () => {
    const probe = { ok: true, findings: [{ severity: 'medium', category: 'rendering', location: '/' }] };
    const r = evaluatePhaseBResult({ probe, baselineFindings: [], constructionClass: 'wire_up' });
    expect(r.ok).toBe(true);
  });

  it('wire_up: new high-severity finding fails Phase B (S8-CT-1)', () => {
    const probe = {
      ok: true,
      findings: [{ severity: 'high', category: 'engine-error', location: '/settings:transfer-button' }],
    };
    const r = evaluatePhaseBResult({ probe, baselineFindings: [], constructionClass: 'wire_up' });
    expect(r.ok).toBe(false);
    expect(r.newHighFindings).toHaveLength(1);
  });

  it('high findings already present in baseline are NOT counted as new', () => {
    const finding = { severity: 'high', category: 'engine-error', location: '/x' };
    const r = evaluatePhaseBResult({
      probe: { ok: true, findings: [finding] },
      baselineFindings: [finding],
      constructionClass: 'wire_up',
    });
    expect(r.ok).toBe(true);
  });

  it('probe.ok === false fails immediately', () => {
    const r = evaluatePhaseBResult({ probe: { ok: false, reason: 'timeout' }, baselineFindings: [], constructionClass: 'wire_up' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('timeout');
  });
});

describe('S8 — runS8PhaseB', () => {
  it('happy path: persists construction_phase_b.v1 + returns probe', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    const probe = vi.fn(async () => ({ ok: true, findings: [], summary: { interactivesTested: 12 } }));
    const result = await runS8PhaseB({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      previewUrl: 'https://reltwin-flowai-renewal.vercel.app',
      baselineFindings: [],
      probeAdversarialSurface: probe,
      appendGovernanceEntry: append,
    });
    expect(result.ok).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0].kind).toBe(PHASE_B_KIND);
    expect(writes[0].decision.ok).toBe(true);
    expect(writes[0].summary.interactives_tested).toBe(12);
  });

  it('S8-CT-1: pre-PR Phase B failure aborts PR with construction_phase_b_failure.v1', async () => {
    const append = vi.fn(async () => {});
    const probe = vi.fn(async () => ({
      ok: true,
      findings: [{ severity: 'high', category: 'engine-error', location: '/new-wireup' }],
    }));
    await expect(runS8PhaseB({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      previewUrl: 'https://reltwin-preview.example',
      baselineFindings: [],
      probeAdversarialSurface: probe,
      appendGovernanceEntry: append,
    })).rejects.toMatchObject({ code: PHASE_B_FAILURE_KIND });
  });

  it('uses probeAllPages when provided', async () => {
    const probeAllPages = vi.fn(async () => ({ ok: true, findings: [], pagesProbed: 1 }));
    const result = await runS8PhaseB({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      previewUrl: 'https://x',
      baselineFindings: [],
      probeAdversarialSurface: null,
      probeAllPages,
      appendGovernanceEntry: vi.fn(),
    });
    expect(result.ok).toBe(true);
    expect(probeAllPages).toHaveBeenCalledOnce();
  });

  it('throws when neither probe is supplied', async () => {
    await expect(runS8PhaseB({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      previewUrl: 'https://x',
      baselineFindings: [],
      appendGovernanceEntry: vi.fn(),
    })).rejects.toThrowError(/probe/);
  });

  it('rejects empty previewUrl', async () => {
    await expect(runS8PhaseB({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      previewUrl: '',
      baselineFindings: [],
      probeAdversarialSurface: vi.fn(),
      appendGovernanceEntry: vi.fn(),
    })).rejects.toThrowError(/previewUrl/);
  });
});
