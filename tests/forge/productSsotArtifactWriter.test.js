import { describe, expect, it } from 'vitest';

import {
  buildForgeStepArtifactEntry,
  persistForgeStepArtifact,
  sha256Hex,
} from '../../src/lib/forge/productSsotArtifactWriter.js';

function makeSupabaseFake({ initialRow, failVersionInsert = false, failPointerUpdate = false }) {
  const state = {
    row: initialRow ? { ...initialRow } : null,
    versions: [],
    calls: [],
  };

  function makeQuery(table) {
    const q = {
      _table: table,
      _filters: [],
      _update: null,
      _insert: null,
      _delete: false,
      _select: '*',
      select(cols) {
        if (q._update !== null) {
          const row = state.row;
          if (!row || table !== 'product_ssot') return Promise.resolve({ data: [], error: null });
          for (const f of q._filters) {
            if (row[f.k] !== f.v) return Promise.resolve({ data: [], error: null });
          }
          if (failPointerUpdate && Object.prototype.hasOwnProperty.call(q._update, 'audit_hash_chain_pointer')) {
            return Promise.resolve({ data: null, error: { message: 'forced pointer failure' } });
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
      delete() {
        q._delete = true;
        return q;
      },
      eq(k, v) {
        q._filters.push({ k, v });
        if (q._delete && table === 'product_ssot_version' && k === 'id') {
          state.versions = state.versions.filter((row) => row.id !== v);
          state.calls.push({ table, op: 'delete', id: v });
          return Promise.resolve({ error: null });
        }
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

describe('buildForgeStepArtifactEntry', () => {
  it('records guided offline forge artifacts as Tier B behavioral evidence', () => {
    const entry = buildForgeStepArtifactEntry({
      productId: 'product-a',
      runId: 'run-1',
      stepKey: 'research',
      artifact: { complete: true },
      now: () => '2026-06-04T00:00:00.000Z',
    });

    expect(entry).toMatchObject({
      kind: 'forge.step_artifact.v1',
      productId: 'product-a',
      environment: 'prd',
      runId: 'run-1',
      stepKey: 'research',
      mode: 'GUIDED',
      runtime: 'offline',
      evidenceTier: 'B',
      proofLabel: 'UNIT',
      persistedState: 'pending',
    });
  });
});

describe('persistForgeStepArtifact', () => {
  it('appends governance_record and inserts a ProductSSOT version row', async () => {
    const supabase = makeSupabaseFake({
      initialRow: {
        id: 'ssot-1',
        product_id: 'product-a',
        environment: 'prd',
        governance_record: [{ kind: 'existing' }],
        version: 3,
        audit_hash_chain_pointer: 'prev-hash',
        updated_at: 'T0',
      },
    });

    const result = await persistForgeStepArtifact({
      productId: 'product-a',
      environment: 'prd',
      runId: 'run-1',
      stepKey: 'research',
      artifact: { summary: 'done' },
      supabase,
      writtenBy: 'operator-1',
      now: () => '2026-06-04T00:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    expect(result.persisted).toBe(true);
    expect(result.version).toBe(4);
    expect(result.prevHash).toBe('prev-hash');
    expect(result.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(supabase._state.row.governance_record).toHaveLength(2);
    expect(supabase._state.row.governance_record[1]).toMatchObject({
      kind: 'forge.step_artifact.v1',
      productId: 'product-a',
      stepKey: 'research',
      mode: 'GUIDED',
      runtime: 'offline',
      evidenceTier: 'B',
    });
    expect(supabase._state.versions).toHaveLength(1);
    expect(supabase._state.versions[0]).toMatchObject({
      product_ssot_id: 'ssot-1',
      version: 4,
      write_kind: 'forge.step_artifact.v1',
      written_by: 'operator-1',
      prev_hash: 'prev-hash',
    });
  });

  it('rolls governance_record back when product_ssot_version insert fails', async () => {
    const prior = [{ kind: 'existing' }];
    const supabase = makeSupabaseFake({
      initialRow: {
        id: 'ssot-1',
        product_id: 'product-a',
        environment: 'prd',
        governance_record: prior,
        version: 1,
        audit_hash_chain_pointer: null,
        updated_at: 'T0',
      },
      failVersionInsert: true,
    });

    const result = await persistForgeStepArtifact({
      productId: 'product-a',
      environment: 'prd',
      runId: 'run-1',
      stepKey: 'research',
      artifact: { summary: 'done' },
      supabase,
      writtenBy: 'operator-1',
      now: () => '2026-06-04T00:00:00.000Z',
    });

    expect(result.ok).toBe(false);
    expect(result.persisted).toBe(false);
    expect(result.state).toBe('failed');
    expect(result.reason).toMatch(/^version_insert_failed:/);
    expect(result.rollback).toEqual({ rolled: true });
    expect(supabase._state.row.governance_record).toEqual(prior);
    expect(supabase._state.versions).toHaveLength(0);
  });

  it('rolls back governance and version row when hash pointer update fails', async () => {
    const prior = [{ kind: 'existing' }];
    const supabase = makeSupabaseFake({
      initialRow: {
        id: 'ssot-1',
        product_id: 'product-a',
        environment: 'prd',
        governance_record: prior,
        version: 1,
        audit_hash_chain_pointer: null,
        updated_at: 'T0',
      },
      failPointerUpdate: true,
    });

    const result = await persistForgeStepArtifact({
      productId: 'product-a',
      environment: 'prd',
      runId: 'run-1',
      stepKey: 'research',
      artifact: { summary: 'done' },
      supabase,
      writtenBy: 'operator-1',
      now: () => '2026-06-04T00:00:00.000Z',
    });

    expect(result.ok).toBe(false);
    expect(result.persisted).toBe(false);
    expect(result.state).toBe('failed');
    expect(result.reason).toMatch(/^hash_pointer_update_failed:/);
    expect(result.rollback).toEqual({ rolled: true });
    expect(result.versionRollback).toEqual({ ok: true });
    expect(supabase._state.row.governance_record).toEqual(prior);
    expect(supabase._state.versions).toHaveLength(0);
  });

  it('returns an honest skip when Supabase is unavailable', async () => {
    const result = await persistForgeStepArtifact({
      productId: 'product-a',
      stepKey: 'research',
      artifact: {},
      supabase: null,
    });

    expect(result).toMatchObject({
      ok: false,
      persisted: false,
      state: 'skipped_supabase_unavailable',
      reason: 'supabase_unavailable',
    });
  });

  it('hashes canonical JSON deterministically', () => {
    expect(sha256Hex({ b: 2, a: 1 })).toBe(sha256Hex({ a: 1, b: 2 }));
  });
});
