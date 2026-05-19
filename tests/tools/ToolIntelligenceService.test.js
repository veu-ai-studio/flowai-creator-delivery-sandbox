import { describe, it, expect, vi } from 'vitest';
import {
  createToolIntelligenceService,
  selectToolForStep,
  MODES,
  STEP_KEYS,
} from '../../src/lib/tools/ToolIntelligenceService.js';
import {
  OrchestratorHub,
  createMemoryHotStore,
  createMemoryColdStore,
} from '../../src/lib/agents/orchestrator/OrchestratorHub.ts';

// ─── Test fixtures + a small Supabase-shaped query stub ─────────────────────

function makeRow({ step = 'research', rank = 1, name = 'Perplexity AI', type = 'ai_research',
                  perf = 9, cost = 7, speed = 9, rel = 9,
                  classes = ['web', 'SaaS', 'agentic_ai', 'generic_url'] } = {}) {
  return {
    step_name: step,
    rank,
    platform_name: name,
    platform_type: type,
    performance_score: perf,
    cost_score: cost,
    speed_score: speed,
    reliability_score: rel,
    target_classes: classes,
    last_updated: '2026-05-19T00:00:00.000Z',
    notes: null,
  };
}

function makeClient(initialRows = []) {
  const rows = [...initialRows];
  const calls = { from: 0, select: 0, insert: 0, update: 0, delete: 0 };
  function makeBuilder(table, op, opPayload) {
    const filters = [];
    let containsFilter = null;
    let orderField = null;
    let orderAsc = true;
    let limitN = Infinity;
    let updatePayload = opPayload ?? null;
    const builder = {
      eq(col, val) { filters.push({ col, val }); return builder; },
      contains(col, vals) { containsFilter = { col, vals }; return builder; },
      order(col, opts) { orderField = col; orderAsc = !!(opts && opts.ascending); return builder; },
      limit(n) { limitN = n; return builder; },
      then(resolve, reject) { return execute().then(resolve, reject); },
    };
    async function execute() {
      function matches(r) {
        for (const f of filters) if (r[f.col] !== f.val) return false;
        if (containsFilter) {
          const arr = r[containsFilter.col] || [];
          for (const v of containsFilter.vals) if (!arr.includes(v)) return false;
        }
        return true;
      }
      if (op === 'select') {
        let out = rows.filter(matches);
        if (orderField) {
          out = [...out].sort((a, b) => orderAsc ? a[orderField] - b[orderField] : b[orderField] - a[orderField]);
        }
        if (Number.isFinite(limitN)) out = out.slice(0, limitN);
        return { data: out, error: null };
      }
      if (op === 'delete') {
        for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i])) rows.splice(i, 1);
        return { data: null, error: null };
      }
      if (op === 'update') {
        for (const r of rows) if (matches(r)) Object.assign(r, updatePayload);
        return { data: null, error: null };
      }
      if (op === 'insert') {
        if (Array.isArray(updatePayload)) rows.push(...updatePayload);
        else rows.push(updatePayload);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }
    return builder;
  }
  const client = {
    _rows: rows,
    _calls: calls,
    from(table) {
      calls.from++;
      return {
        select(_cols) { calls.select++; return makeBuilder(table, 'select'); },
        insert(payload) { calls.insert++; return makeBuilder(table, 'insert', payload); },
        update(payload) { calls.update++; return makeBuilder(table, 'update', payload); },
        delete() { calls.delete++; return makeBuilder(table, 'delete'); },
      };
    },
  };
  return client;
}

// ─── createToolIntelligenceService — construction ───────────────────────────

describe('createToolIntelligenceService — construction', () => {
  it('throws when no client is provided', () => {
    expect(() => createToolIntelligenceService({})).toThrow(/client required/);
  });

  it('exposes the canonical step keys and modes', () => {
    const svc = createToolIntelligenceService({ client: makeClient() });
    expect(svc.STEP_KEYS).toEqual([
      'research', 'design', 'build', 'qa_audit',
      'deploy', 'monitor', 'govern', 'gtm',
    ]);
    expect(svc.MODES.AUTOMATIC).toBe('AUTOMATIC');
    expect(svc.MODES.GUIDED).toBe('GUIDED');
    expect(svc.MODES.MANUAL).toBe('MANUAL');
  });
});

// ─── getTopTool / getRankings ───────────────────────────────────────────────

describe('ToolIntelligenceService.getTopTool', () => {
  it('AUTOMATIC mode returns the rank-1 platform object', async () => {
    const rows = [
      makeRow({ rank: 1, name: 'Perplexity AI' }),
      makeRow({ rank: 2, name: 'Tavily' }),
      makeRow({ rank: 3, name: 'Exa' }),
    ];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    const top = await svc.getTopTool('research', null, MODES.AUTOMATIC);
    expect(top.platform_name).toBe('Perplexity AI');
    expect(top.rank).toBe(1);
    expect(top.performance_score).toBe(9);
  });

  it('defaults to AUTOMATIC when mode is omitted', async () => {
    const rows = [makeRow({ rank: 1, name: 'Perplexity AI' })];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    const top = await svc.getTopTool('research');
    expect(top.platform_name).toBe('Perplexity AI');
  });

  it('GUIDED mode returns the full top-5 list sorted by rank', async () => {
    const rows = [
      makeRow({ rank: 3, name: 'C' }),
      makeRow({ rank: 1, name: 'A' }),
      makeRow({ rank: 5, name: 'E' }),
      makeRow({ rank: 2, name: 'B' }),
      makeRow({ rank: 4, name: 'D' }),
    ];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    const list = await svc.getTopTool('research', null, MODES.GUIDED);
    expect(Array.isArray(list)).toBe(true);
    expect(list.map((p) => p.platform_name)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('MANUAL mode returns null (passthrough)', async () => {
    const rows = [makeRow({ rank: 1, name: 'Perplexity AI' })];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    const out = await svc.getTopTool('research', null, MODES.MANUAL);
    expect(out).toBeNull();
  });

  it('returns null in AUTOMATIC mode when no rows match', async () => {
    const svc = createToolIntelligenceService({ client: makeClient([]) });
    const out = await svc.getTopTool('research', null, MODES.AUTOMATIC);
    expect(out).toBeNull();
  });

  it('targetClass filters to platforms that include the class', async () => {
    const rows = [
      makeRow({ rank: 1, name: 'Web Only', classes: ['web'] }),
      makeRow({ rank: 2, name: 'Mobile Only', classes: ['mobile_app'] }),
      makeRow({ rank: 3, name: 'Both', classes: ['web', 'mobile_app'] }),
    ];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    const list = await svc.getTopTool('research', 'mobile_app', MODES.GUIDED);
    expect(list.map((p) => p.platform_name)).toEqual(['Mobile Only', 'Both']);
  });

  it('rejects unknown step names', async () => {
    const svc = createToolIntelligenceService({ client: makeClient() });
    await expect(svc.getTopTool('not_a_step')).rejects.toThrow(/unknown step/);
  });

  it('rejects unknown modes', async () => {
    const svc = createToolIntelligenceService({ client: makeClient() });
    await expect(svc.getTopTool('research', null, 'NOPE')).rejects.toThrow(/unknown mode/);
  });

  it('rejects unknown target classes', async () => {
    const svc = createToolIntelligenceService({ client: makeClient() });
    await expect(svc.getTopTool('research', 'spaceship', MODES.AUTOMATIC)).rejects.toThrow(/unknown targetClass/);
  });
});

// ─── refreshRankings ────────────────────────────────────────────────────────

describe('ToolIntelligenceService.refreshRankings', () => {
  it('replaces all rows for a step with the fresh ranking', async () => {
    const rows = [
      makeRow({ rank: 1, name: 'Old1' }),
      makeRow({ rank: 2, name: 'Old2' }),
    ];
    const client = makeClient(rows);
    const svc = createToolIntelligenceService({ client });
    const fresh = [
      { rank: 1, platform_name: 'New1', platform_type: 'ai_research', performance_score: 10, cost_score: 8, speed_score: 9, reliability_score: 9, target_classes: ['web'] },
      { rank: 2, platform_name: 'New2', platform_type: 'ai_research', performance_score: 9, cost_score: 7, speed_score: 8, reliability_score: 8, target_classes: ['web'] },
    ];
    const n = await svc.refreshRankings('research', fresh);
    expect(n).toBe(2);
    expect(client._rows.map((r) => r.platform_name).sort()).toEqual(['New1', 'New2']);
    expect(client._rows.every((r) => r.step_name === 'research')).toBe(true);
  });

  it('rejects empty fresh-row arrays', async () => {
    const svc = createToolIntelligenceService({ client: makeClient() });
    await expect(svc.refreshRankings('research', [])).rejects.toThrow(/non-empty/);
  });

  it('rejects more than 5 fresh rows', async () => {
    const svc = createToolIntelligenceService({ client: makeClient() });
    const six = Array.from({ length: 6 }, (_, i) => ({
      rank: i + 1, platform_name: `P${i}`, platform_type: 't',
      performance_score: 5, cost_score: 5, speed_score: 5, reliability_score: 5,
    }));
    await expect(svc.refreshRankings('research', six)).rejects.toThrow(/at most 5/);
  });

  it('clamps out-of-range scores into [0,10]', async () => {
    const client = makeClient();
    const svc = createToolIntelligenceService({ client });
    await svc.refreshRankings('research', [
      { rank: 1, platform_name: 'X', platform_type: 't', performance_score: 99, cost_score: -3, speed_score: 5, reliability_score: 5 },
    ]);
    const r = client._rows[0];
    expect(r.performance_score).toBe(10);
    expect(r.cost_score).toBe(0);
  });
});

// ─── recordUsage (symbiotic feedback loop) ──────────────────────────────────

describe('ToolIntelligenceService.recordUsage', () => {
  it('blends observed scores into the current row using EMA', async () => {
    const rows = [makeRow({ rank: 1, name: 'Tool', perf: 8, cost: 6, speed: 7, rel: 9 })];
    const client = makeClient(rows);
    const svc = createToolIntelligenceService({ client });
    const updated = await svc.recordUsage('research', 'Tool', {
      success: true,
      performance_observed: 10,
      cost_observed: 10,
      speed_observed: 9,
    }, { alpha: 0.5 });
    // perf: 8*0.5 + 10*0.5 = 9; cost: 6*0.5 + 10*0.5 = 8; speed: 7*0.5 + 9*0.5 = 8
    expect(updated.performance_score).toBe(9);
    expect(updated.cost_score).toBe(8);
    expect(updated.speed_score).toBe(8);
    // reliability: 9*0.5 + 9*0.5 = 9 + 0.2 success adj = 9.2
    expect(updated.reliability_score).toBeCloseTo(9.2, 5);
  });

  it('failure outcome decrements reliability', async () => {
    const rows = [makeRow({ rank: 1, name: 'Tool', perf: 5, cost: 5, speed: 5, rel: 8 })];
    const client = makeClient(rows);
    const svc = createToolIntelligenceService({ client });
    const updated = await svc.recordUsage('research', 'Tool', { success: false });
    // No observed scores, so perf/cost/speed unchanged. Reliability: 8 - 0.5 = 7.5
    expect(updated.performance_score).toBe(5);
    expect(updated.reliability_score).toBe(7.5);
  });

  it('returns null when the platform is not found', async () => {
    const svc = createToolIntelligenceService({ client: makeClient([]) });
    const out = await svc.recordUsage('research', 'GhostTool', { success: true });
    expect(out).toBeNull();
  });

  it('writes a tool.usage_recorded lineage row when a coldStore is attached', async () => {
    const rows = [makeRow({ rank: 1, name: 'Tool' })];
    const client = makeClient(rows);
    const coldStore = createMemoryColdStore();
    const svc = createToolIntelligenceService({ client, coldStore });
    await svc.recordUsage('research', 'Tool', { success: true, performance_observed: 10 }, { runId: 'r1' });
    const lineage = coldStore.entries.filter((e) => e.phase === 'tool.usage_recorded');
    expect(lineage).toHaveLength(1);
    expect(lineage[0].meta.platform_name).toBe('Tool');
    expect(lineage[0].meta.success).toBe(true);
  });

  it('rejects missing platformName or outcome', async () => {
    const svc = createToolIntelligenceService({ client: makeClient() });
    await expect(svc.recordUsage('research', '', { success: true })).rejects.toThrow(/platformName/);
    await expect(svc.recordUsage('research', 'X', null)).rejects.toThrow(/outcome/);
  });
});

// ─── selectToolForStep helper ───────────────────────────────────────────────

describe('selectToolForStep', () => {
  it('reads mode from product_registry and writes tool.selection lineage', async () => {
    const rows = [makeRow({ rank: 1, name: 'Perplexity AI' })];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    const productClient = {
      from: () => ({
        select: () => ({
          eq: () => ({ limit: async () => ({ data: [{ tool_intelligence_mode: 'GUIDED' }], error: null }) }),
        }),
      }),
    };
    const coldStore = createMemoryColdStore();
    const { mode, selection, recorded } = await selectToolForStep({
      service: svc, coldStore, productClient,
      runId: 'r1', productId: 'mypreglife', stepKey: 'research',
    });
    expect(mode).toBe('GUIDED');
    expect(Array.isArray(selection)).toBe(true);
    expect(recorded).toBe(true);
    const lineage = coldStore.entries.find((e) => e.phase === 'tool.selection');
    expect(lineage).toBeTruthy();
    expect(lineage.meta.mode).toBe('GUIDED');
    expect(lineage.meta.product_id).toBe('mypreglife');
  });

  it('defaults to AUTOMATIC when product_registry read errors', async () => {
    const rows = [makeRow({ rank: 1, name: 'Perplexity AI' })];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    const productClient = {
      from: () => ({
        select: () => ({ eq: () => ({ limit: async () => ({ data: null, error: { message: 'boom' } }) }) }),
      }),
    };
    const coldStore = createMemoryColdStore();
    const { mode, selection } = await selectToolForStep({
      service: svc, coldStore, productClient,
      runId: 'r1', productId: 'mypreglife', stepKey: 'research',
      logger: { warn: () => {} },
    });
    expect(mode).toBe('AUTOMATIC');
    expect(selection.platform_name).toBe('Perplexity AI');
  });

  it('honors modeOverride above all', async () => {
    const rows = [makeRow({ rank: 1, name: 'Perplexity AI' })];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    const coldStore = createMemoryColdStore();
    const { mode, selection } = await selectToolForStep({
      service: svc, coldStore,
      runId: 'r1', stepKey: 'research', modeOverride: 'MANUAL',
    });
    expect(mode).toBe('MANUAL');
    expect(selection).toBeNull();
  });
});

// ─── OrchestratorHub integration ────────────────────────────────────────────

describe('OrchestratorHub × ToolIntelligenceService', () => {
  function makeHub() {
    const hot = createMemoryHotStore();
    const cold = createMemoryColdStore();
    const hub = new OrchestratorHub({ hot, cold, maxAttempts: 1, baseBackoffMs: 10 });
    return { hub, cold };
  }

  it('emits tool.selection before step.start when a service is attached', async () => {
    const { hub, cold } = makeHub();
    const rows = [makeRow({ rank: 1, name: 'Perplexity AI' })];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    hub.attachToolIntelligenceService(svc, { mode: MODES.AUTOMATIC, targetClass: null, productId: 'mypreglife' });
    await hub.executeStep({
      runId: 'run_x', stepKey: 'research',
      work: async () => ({ ok: true }),
    });
    const phases = cold.entries.map((e) => e.phase);
    const toolIdx = phases.indexOf('tool.selection');
    const startIdx = phases.indexOf('step.start');
    expect(toolIdx).toBeGreaterThanOrEqual(0);
    expect(startIdx).toBeGreaterThan(toolIdx);
    const toolEntry = cold.entries[toolIdx];
    expect(toolEntry.meta.selected).toBe('Perplexity AI');
    expect(toolEntry.meta.mode).toBe('AUTOMATIC');
    expect(toolEntry.meta.product_id).toBe('mypreglife');
  });

  it('GUIDED mode logs the full platform_name list', async () => {
    const { hub, cold } = makeHub();
    const rows = [
      makeRow({ rank: 1, name: 'A' }),
      makeRow({ rank: 2, name: 'B' }),
      makeRow({ rank: 3, name: 'C' }),
    ];
    const svc = createToolIntelligenceService({ client: makeClient(rows) });
    hub.attachToolIntelligenceService(svc, { mode: MODES.GUIDED, productId: 'mypreglife' });
    await hub.executeStep({
      runId: 'run_y', stepKey: 'research',
      work: async () => ({ ok: true }),
    });
    const tool = cold.entries.find((e) => e.phase === 'tool.selection');
    expect(Array.isArray(tool.meta.selected)).toBe(true);
    expect(tool.meta.selected).toEqual(['A', 'B', 'C']);
  });

  it('does NOT block step execution if the service throws', async () => {
    const { hub, cold } = makeHub();
    const brokenSvc = { getTopTool: vi.fn(async () => { throw new Error('research api down'); }) };
    hub.attachToolIntelligenceService(brokenSvc, { mode: MODES.AUTOMATIC });
    const out = await hub.executeStep({
      runId: 'run_z', stepKey: 'research',
      work: async () => ({ ok: true, value: 42 }),
    });
    expect(out.value).toBe(42);
    const tool = cold.entries.find((e) => e.phase === 'tool.selection');
    expect(tool.error).toMatch(/research api down/);
    expect(cold.entries.some((e) => e.phase === 'step.success')).toBe(true);
  });

  it('emits no tool.selection when no service is attached', async () => {
    const { hub, cold } = makeHub();
    await hub.executeStep({
      runId: 'run_q', stepKey: 'research',
      work: async () => ({ ok: true }),
    });
    expect(cold.entries.some((e) => e.phase === 'tool.selection')).toBe(false);
  });

  it('rejects attaching a different service over an existing one', () => {
    const { hub } = makeHub();
    const a = { getTopTool: async () => null };
    const b = { getTopTool: async () => null };
    hub.attachToolIntelligenceService(a);
    expect(() => hub.attachToolIntelligenceService(b)).toThrow(/already attached/);
    // Same service is idempotent.
    expect(() => hub.attachToolIntelligenceService(a)).not.toThrow();
    // Null detaches.
    expect(() => hub.attachToolIntelligenceService(null)).not.toThrow();
    expect(hub.getToolIntelligenceService()).toBeNull();
  });
});

// ─── Sanity: STEP_KEYS coverage ─────────────────────────────────────────────

describe('STEP_KEYS coverage', () => {
  it('exposes exactly the 8 canonical FlowAI pipeline step keys', () => {
    expect(new Set(STEP_KEYS)).toEqual(new Set([
      'research', 'design', 'build', 'qa_audit',
      'deploy', 'monitor', 'govern', 'gtm',
    ]));
  });
});
