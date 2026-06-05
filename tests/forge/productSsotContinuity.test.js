import { describe, expect, it } from 'vitest';

import {
  buildProductSsotRunContext,
  buildSymbioticRunSummary,
  persistSymbioticRunSummary,
  readProductSsotRunContext,
} from '../../src/lib/forge/productSsotContinuity.js';

function makeSupabaseFake({ initialRow, failVersionInsert = false }) {
  const state = {
    row: initialRow ? { ...initialRow } : null,
    versions: [],
    calls: [],
  };

  function makeQuery(table) {
    const q = {
      _filters: [],
      _update: null,
      _insert: null,
      _select: '*',
      select(cols) {
        if (q._update !== null) {
          const row = state.row;
          if (!row || table !== 'product_ssot') return Promise.resolve({ data: [], error: null });
          for (const f of q._filters) {
            if (row[f.k] !== f.v) return Promise.resolve({ data: [], error: null });
          }
          Object.assign(state.row, q._update);
          state.calls.push({ table, op: 'update', fields: q._update });
          return Promise.resolve({ data: [{ id: row.id }], error: null });
        }
        q._select = cols;
        return q;
      },
      update(fields) {
        q._update = fields;
        return q;
      },
      insert(fields) {
        q._insert = fields;
        return q;
      },
      eq(k, v) {
        q._filters.push({ k, v });
        return q;
      },
      async maybeSingle() {
        const row = state.row;
        if (!row || table !== 'product_ssot') return { data: null, error: null };
        for (const f of q._filters) {
          if (row[f.k] !== f.v) return { data: null, error: null };
        }
        return { data: { ...row }, error: null };
      },
      async single() {
        if (table !== 'product_ssot_version') return { data: null, error: { message: 'bad table' } };
        if (failVersionInsert) return { data: null, error: { message: 'forced version failure' } };
        const id = `version-${state.versions.length + 1}`;
        state.versions.push({ id, ...q._insert });
        state.calls.push({ table, op: 'insert', fields: q._insert });
        return { data: { id }, error: null };
      },
    };
    return q;
  }

  return {
    _state: state,
    from(table) {
      return makeQuery(table);
    },
  };
}

const priorGovernance = [
  {
    kind: 'forge.step_artifact.v1',
    productId: 'product-a',
    runId: 'run-N',
    stepKey: 'deploy',
    stepLabel: 'Deploy',
    artifact: { outputUrl: 'https://example.com', commitSha: 'abc123' },
    evidenceTier: 'B',
    proofLabel: 'LIVE_PRODUCTION',
    recordedAt: '2026-06-04T00:00:00.000Z',
  },
  {
    kind: 'forge.step_artifact.v1',
    productId: 'product-a',
    runId: 'run-N',
    stepKey: 'monitor',
    stepLabel: 'Monitor',
    artifact: { monitorStatus: 'attention_required' },
    evidenceTier: 'B',
    proofLabel: 'LIVE_PRODUCTION',
    recordedAt: '2026-06-04T00:01:00.000Z',
  },
];

describe('ProductSSOT continuity context', () => {
  it('builds a run-N-plus-1 context from prior forge artifacts', () => {
    const context = buildProductSsotRunContext({
      productId: 'product-a',
      row: {
        version: 7,
        audit_hash_chain_pointer: 'prev-hash',
        updated_at: '2026-06-04T00:02:00.000Z',
        governance_record: priorGovernance,
      },
      now: () => '2026-06-04T00:03:00.000Z',
    });

    expect(context).toMatchObject({
      kind: 'product_ssot.symbiotic_context.v1',
      productId: 'product-a',
      hasPriorRun: true,
      priorRunCount: 1,
      sourceVersion: 7,
      sourceHash: 'prev-hash',
      latestDeliveryArtifactUrl: 'https://example.com',
      latestMonitorStatus: 'attention_required',
    });
    expect(context.latestArtifactsByStep.deploy.artifact.commitSha).toBe('abc123');
  });

  it('reads ProductSSOT context from Supabase for run-to-run continuity', async () => {
    const supabase = makeSupabaseFake({
      initialRow: {
        id: 'ssot-1',
        product_id: 'product-a',
        environment: 'prd',
        version: 7,
        audit_hash_chain_pointer: 'prev-hash',
        governance_record: priorGovernance,
        updated_at: '2026-06-04T00:02:00.000Z',
      },
    });

    const result = await readProductSsotRunContext({
      productId: 'product-a',
      environment: 'prd',
      supabase,
    });

    expect(result.ok).toBe(true);
    expect(result.productSsotId).toBe('ssot-1');
    expect(result.context.priorRunIds).toEqual(['run-N']);
  });

  it('persists a symbiotic run summary so run N output can seed run N+1', async () => {
    const supabase = makeSupabaseFake({
      initialRow: {
        id: 'ssot-1',
        product_id: 'product-a',
        environment: 'prd',
        version: 7,
        audit_hash_chain_pointer: 'prev-hash',
        governance_record: priorGovernance,
        updated_at: '2026-06-04T00:02:00.000Z',
      },
    });

    const result = await persistSymbioticRunSummary({
      productId: 'product-a',
      environment: 'prd',
      runId: 'run-N-plus-1',
      url: 'https://example.com',
      priorContext: buildProductSsotRunContext({
        productId: 'product-a',
        row: {
          version: 7,
          audit_hash_chain_pointer: 'prev-hash',
          governance_record: priorGovernance,
        },
      }),
      result: { exitReason: 'COMPLETE', finalScore: 88, gtmReady: false, iterationsCompleted: 1 },
      supabase,
      writtenBy: 'operator-1',
      proofLabel: 'LIVE_PREVIEW',
      now: () => '2026-06-04T00:03:00.000Z',
    });

    expect(result.ok).toBe(true);
    expect(result.version).toBe(8);
    expect(supabase._state.row.governance_record.at(-1)).toMatchObject({
      kind: 'forge.step_artifact.v1',
      stepKey: 'symbiotic_loop',
      mode: 'AUTOMATIC',
      runtime: 'live',
      proofLabel: 'LIVE_PREVIEW',
      artifact: {
        kind: 'product_ssot.symbiotic_run.v1',
        priorContextLoaded: true,
        priorRunCount: 1,
        priorSourceVersion: 7,
        exitReason: 'COMPLETE',
      },
    });
    expect(supabase._state.versions[0]).toMatchObject({
      write_kind: 'product_ssot.symbiotic_run.v1',
      prev_hash: 'prev-hash',
    });
  });

  it('rolls back the summary append if the version row write fails', async () => {
    const supabase = makeSupabaseFake({
      initialRow: {
        id: 'ssot-1',
        product_id: 'product-a',
        environment: 'prd',
        version: 7,
        audit_hash_chain_pointer: 'prev-hash',
        governance_record: priorGovernance,
        updated_at: '2026-06-04T00:02:00.000Z',
      },
      failVersionInsert: true,
    });

    const result = await persistSymbioticRunSummary({
      productId: 'product-a',
      environment: 'prd',
      runId: 'run-N-plus-1',
      url: 'https://example.com',
      priorContext: null,
      result: { exitReason: 'COMPLETE' },
      supabase,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/^version_insert_failed:/);
    expect(supabase._state.row.governance_record).toEqual(priorGovernance);
    expect(supabase._state.versions).toHaveLength(0);
  });
});

describe('Symbiotic run summary', () => {
  it('captures the prior context and current result without marking VERIFIED', () => {
    const summary = buildSymbioticRunSummary({
      productId: 'product-a',
      runId: 'run-N-plus-1',
      url: 'https://example.com',
      priorContext: { hasPriorRun: true, priorRunCount: 2, sourceVersion: 9, sourceHash: 'hash-9' },
      result: { exitReason: 'COMPLETE', finalScore: 91, gtmReady: true, iterationsCompleted: 2 },
      now: () => '2026-06-04T00:03:00.000Z',
    });

    expect(summary).toMatchObject({
      kind: 'product_ssot.symbiotic_run.v1',
      priorContextLoaded: true,
      priorRunCount: 2,
      priorSourceVersion: 9,
      priorSourceHash: 'hash-9',
      finalScore: 91,
      gtmReady: true,
    });
    expect(JSON.stringify(summary)).not.toMatch(/VERIFIED/);
  });
});
