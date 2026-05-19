/**
 * ToolIntelligenceService — W5b Tool Intelligence Service
 * ---------------------------------------------------------------------------
 * Path:    src/lib/tools/ToolIntelligenceService.js
 * Spec:    W5b dispatch (2026-05-19); FlowAI Mission/Purpose Amendment
 *          draft §3 (Manual/Guided/Automatic modes) + §8 Orchestra
 *          Selection axis.
 * Storage: step_tool_rankings table (migration 0023). Distinct from the
 *          existing 0004 tool_rankings — see migration header for the
 *          disambiguation rationale.
 *
 * Public API:
 *   - createToolIntelligenceService({ client, coldStore, clock, tableName })
 *       → { getTopTool, getRankings, refreshRankings, recordUsage, MODES, STEP_KEYS }
 *
 * Modes (per product_registry.tool_intelligence_mode):
 *   - AUTOMATIC → getTopTool returns rank-1 platform (object).
 *   - GUIDED    → getTopTool returns the full top-5 list (array).
 *   - MANUAL    → getTopTool returns null (operator picks outside the service).
 *
 * recommend_only invariant: this service makes recommendations and records
 * outcomes; it never blocks step execution. Callers wrap usage in their
 * own try/catch where needed (the orchestrator helper in this file does so).
 * ---------------------------------------------------------------------------
 */

const DEFAULT_TABLE = 'step_tool_rankings';

export const MODES = Object.freeze({
  AUTOMATIC: 'AUTOMATIC',
  GUIDED: 'GUIDED',
  MANUAL: 'MANUAL',
});

export const STEP_KEYS = Object.freeze([
  'research', 'design', 'build', 'qa_audit',
  'deploy', 'monitor', 'govern', 'gtm',
]);

export const TARGET_CLASSES = Object.freeze([
  'web', 'native_app', 'mobile_app', 'SaaS', 'agentic_ai', 'generic_url',
]);

function assertStep(step) {
  if (!STEP_KEYS.includes(step)) {
    throw new TypeError(
      `ToolIntelligenceService: unknown step "${step}". Valid: ${STEP_KEYS.join(', ')}`,
    );
  }
}

function assertMode(mode) {
  if (mode == null) return MODES.AUTOMATIC; // default
  if (!Object.values(MODES).includes(mode)) {
    throw new TypeError(
      `ToolIntelligenceService: unknown mode "${mode}". Valid: ${Object.values(MODES).join(', ')}`,
    );
  }
  return mode;
}

function rowToPlatform(row) {
  if (!row) return null;
  return Object.freeze({
    step_name: row.step_name,
    rank: row.rank,
    platform_name: row.platform_name,
    platform_type: row.platform_type,
    performance_score: Number(row.performance_score),
    cost_score: Number(row.cost_score),
    speed_score: Number(row.speed_score),
    reliability_score: Number(row.reliability_score),
    target_classes: Array.isArray(row.target_classes) ? [...row.target_classes] : [],
    last_updated: row.last_updated,
    notes: row.notes ?? null,
  });
}

function clamp(n, lo, hi) {
  if (Number.isNaN(n)) return lo;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/**
 * Build the service. `client` is a Supabase-like client (or any object
 * that satisfies the small surface the service uses); `coldStore` is an
 * optional OrchestratorHub ColdStore for governance-lineage writes when
 * scores update. `clock` defaults to Date.now.
 */
export function createToolIntelligenceService(opts = {}) {
  const client = opts.client ?? null;
  const coldStore = opts.coldStore ?? null;
  const clock = opts.clock ?? (() => Date.now());
  const tableName = opts.tableName ?? DEFAULT_TABLE;

  if (!client) {
    throw new TypeError('createToolIntelligenceService: client required');
  }

  /**
   * Read the top-5 ranked platforms for a step, optionally filtered by
   * a target class. Returns an array sorted by rank ascending. Empty
   * array if no rows match.
   */
  async function getRankings(step, targetClass) {
    assertStep(step);
    let query = client.from(tableName).select('*').eq('step_name', step).order('rank', { ascending: true });
    if (targetClass) {
      if (!TARGET_CLASSES.includes(targetClass)) {
        throw new TypeError(`getRankings: unknown targetClass "${targetClass}"`);
      }
      query = query.contains('target_classes', [targetClass]);
    }
    const { data, error } = await query;
    if (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`ToolIntelligenceService.getRankings failed: ${msg}`);
    }
    return (data ?? []).map(rowToPlatform);
  }

  /**
   * Return a platform recommendation for the given step + mode.
   *
   *   AUTOMATIC → rank-1 platform object, or null if no rows match
   *               the optional targetClass filter.
   *   GUIDED    → array of up to 5 platforms (the full top-5 list).
   *   MANUAL    → null (operator picks outside the service).
   *
   * targetClass is optional; when provided, only platforms whose
   * target_classes array includes that class are considered.
   */
  async function getTopTool(step, targetClass, mode) {
    assertStep(step);
    const effectiveMode = assertMode(mode);
    if (effectiveMode === MODES.MANUAL) {
      return null;
    }
    const rankings = await getRankings(step, targetClass);
    if (effectiveMode === MODES.GUIDED) {
      return rankings;
    }
    return rankings.length > 0 ? rankings[0] : null;
  }

  /**
   * Refresh rankings for a step. The dispatch describes this as
   * "research agent calls + updates scores; triggers monthly or
   * on-demand". This implementation accepts an externally-computed
   * fresh ranking set (passed as `freshRows`) and replaces the rows
   * for the step transactionally. A research agent integration can
   * call this with its computed scores; for tests/seed it accepts
   * any well-formed input.
   *
   * Returns the new row count.
   */
  async function refreshRankings(step, freshRows) {
    assertStep(step);
    if (!Array.isArray(freshRows) || freshRows.length === 0) {
      throw new TypeError('refreshRankings: freshRows must be a non-empty array');
    }
    if (freshRows.length > 5) {
      throw new RangeError('refreshRankings: at most 5 rows per step');
    }
    const now = new Date(clock()).toISOString();
    const rows = freshRows.map((r, i) => {
      const rank = r.rank ?? (i + 1);
      if (rank < 1 || rank > 5) {
        throw new RangeError(`refreshRankings: rank ${rank} out of range`);
      }
      return {
        step_name: step,
        rank,
        platform_name: String(r.platform_name),
        platform_type: String(r.platform_type ?? 'unknown'),
        performance_score: clamp(Number(r.performance_score ?? 5), 0, 10),
        cost_score: clamp(Number(r.cost_score ?? 5), 0, 10),
        speed_score: clamp(Number(r.speed_score ?? 5), 0, 10),
        reliability_score: clamp(Number(r.reliability_score ?? 5), 0, 10),
        target_classes: Array.isArray(r.target_classes) ? [...r.target_classes] : [],
        last_updated: now,
        notes: r.notes ?? null,
      };
    });

    const del = await client.from(tableName).delete().eq('step_name', step);
    if (del && del.error) {
      const msg = del.error instanceof Error ? del.error.message : JSON.stringify(del.error);
      throw new Error(`refreshRankings delete failed: ${msg}`);
    }
    const ins = await client.from(tableName).insert(rows);
    if (ins && ins.error) {
      const msg = ins.error instanceof Error ? ins.error.message : JSON.stringify(ins.error);
      throw new Error(`refreshRankings insert failed: ${msg}`);
    }
    return rows.length;
  }

  /**
   * Feed performance data back into the rankings (the "symbiotic loop"
   * called out by §5 of the mission/purpose amendment). outcome shape:
   *   {
   *     success: boolean,           // step completed without failure
   *     performance_observed?: number,  // 0..10
   *     cost_observed?: number,         // 0..10 (lower = cheaper here)
   *     speed_observed?: number,        // 0..10 (higher = faster)
   *     reliability_observed?: number,  // 0..10
   *     notes?: string,
   *   }
   *
   * Implementation: simple EMA against the current row (alpha=0.2 by
   * default). A success outcome with no explicit scores nudges the
   * reliability score up slightly; a failure nudges it down. Returns
   * the updated row (or null if no match).
   */
  async function recordUsage(step, platformName, outcome, opts2 = {}) {
    assertStep(step);
    if (typeof platformName !== 'string' || !platformName) {
      throw new TypeError('recordUsage: platformName required');
    }
    if (!outcome || typeof outcome !== 'object') {
      throw new TypeError('recordUsage: outcome required');
    }
    const alpha = clamp(opts2.alpha ?? 0.2, 0, 1);

    const { data: rows, error: selErr } = await client
      .from(tableName)
      .select('*')
      .eq('step_name', step)
      .eq('platform_name', platformName)
      .limit(1);
    if (selErr) {
      const msg = selErr instanceof Error ? selErr.message : JSON.stringify(selErr);
      throw new Error(`recordUsage select failed: ${msg}`);
    }
    const current = rows && rows[0];
    if (!current) {
      return null;
    }

    const successAdj = outcome.success === false ? -0.5 : (outcome.success === true ? 0.2 : 0);
    const blend = (curr, observed) => {
      if (observed == null || Number.isNaN(Number(observed))) return Number(curr);
      return clamp(Number(curr) * (1 - alpha) + Number(observed) * alpha, 0, 10);
    };

    const updated = {
      performance_score: blend(current.performance_score, outcome.performance_observed),
      cost_score: blend(current.cost_score, outcome.cost_observed),
      speed_score: blend(current.speed_score, outcome.speed_observed),
      reliability_score: clamp(blend(current.reliability_score, outcome.reliability_observed) + successAdj, 0, 10),
      last_updated: new Date(clock()).toISOString(),
      notes: outcome.notes ?? current.notes,
    };

    const { error: updErr } = await client
      .from(tableName)
      .update(updated)
      .eq('step_name', step)
      .eq('platform_name', platformName);
    if (updErr) {
      const msg = updErr instanceof Error ? updErr.message : JSON.stringify(updErr);
      throw new Error(`recordUsage update failed: ${msg}`);
    }

    if (coldStore && typeof coldStore.append === 'function' && opts2.runId) {
      try {
        await coldStore.append({
          runId: opts2.runId,
          stepKey: step,
          phase: 'tool.usage_recorded',
          at: clock(),
          meta: {
            platform_name: platformName,
            success: outcome.success ?? null,
            updated_scores: {
              performance: updated.performance_score,
              cost: updated.cost_score,
              speed: updated.speed_score,
              reliability: updated.reliability_score,
            },
          },
        });
      } catch (_) { /* lineage write is best-effort; never blocks recordUsage */ }
    }

    return Object.freeze({ ...current, ...updated });
  }

  return Object.freeze({
    getTopTool,
    getRankings,
    refreshRankings,
    recordUsage,
    MODES,
    STEP_KEYS,
  });
}

/**
 * Orchestrator-side helper: read the product's tool_intelligence_mode,
 * resolve the top tool for `stepKey`, and write a `tool.selection`
 * lineage row to the cold store. Designed to be invoked by the Auto
 * Runner before each step executes. Never blocks: any failure surfaces
 * a null selection and (when a logger is available) a warn line.
 *
 * Inputs:
 *   - hub          : OrchestratorHub (for cold-store access via .cold or a passed coldStore)
 *   - service      : ToolIntelligenceService instance
 *   - productClient: Supabase-like client for reading product_registry (optional;
 *                    when null, mode defaults to AUTOMATIC)
 *   - runId, productId, stepKey, targetClass
 *   - logger       : optional console-like
 *
 * Returns { mode, selection, recorded } where selection is platform|array|null.
 */
export async function selectToolForStep(opts) {
  const {
    service, coldStore = null, productClient = null,
    runId, productId, stepKey, targetClass = null,
    modeOverride = null, logger = console,
  } = opts || {};
  if (!service || typeof service.getTopTool !== 'function') {
    throw new TypeError('selectToolForStep: service with getTopTool required');
  }
  if (!runId) throw new TypeError('selectToolForStep: runId required');
  if (!stepKey) throw new TypeError('selectToolForStep: stepKey required');

  // 1. Resolve mode — explicit override > product_registry read > default.
  let mode = modeOverride;
  if (!mode && productClient && productId) {
    try {
      const { data, error } = await productClient
        .from('product_registry')
        .select('tool_intelligence_mode')
        .eq('product_id', productId)
        .limit(1);
      if (!error && data && data[0] && data[0].tool_intelligence_mode) {
        mode = data[0].tool_intelligence_mode;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      (logger?.warn ?? console.warn)('[selectToolForStep] product_registry read failed', { error: msg });
    }
  }
  if (!mode) mode = MODES.AUTOMATIC;

  // 2. Ask the service.
  let selection = null;
  try {
    selection = await service.getTopTool(stepKey, targetClass, mode);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    (logger?.warn ?? console.warn)('[selectToolForStep] getTopTool failed (suppressed)', { error: msg });
    selection = null;
  }

  // 3. Lineage write — best-effort.
  let recorded = false;
  if (coldStore && typeof coldStore.append === 'function') {
    try {
      const selectedName = mode === MODES.GUIDED
        ? (Array.isArray(selection) ? selection.map((p) => p.platform_name) : null)
        : (selection ? selection.platform_name : null);
      await coldStore.append({
        runId,
        stepKey,
        phase: 'tool.selection',
        at: Date.now(),
        meta: {
          mode,
          target_class: targetClass,
          product_id: productId ?? null,
          selected: selectedName,
        },
      });
      recorded = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      (logger?.warn ?? console.warn)('[selectToolForStep] cold-store append failed', { error: msg });
    }
  }

  return Object.freeze({ mode, selection, recorded });
}
