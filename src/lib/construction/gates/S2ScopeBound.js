// src/lib/construction/gates/S2ScopeBound.js
//
// S2 — Bounded scope gate (NON-OVERRIDABLE per CA-17 §3.2 v3-final).
//
// System caps (max):  15 files / 1500 lines total / 3 new deps / 4 dep-radius
// Density ceiling (NEW v3-final): 100 lines per single file
//
// Per-class defaults:
//   wire_up                  : ≤5 files,  ≤200 total, 0 new deps, 0 endpoints (uses existing handlers)
//                              v3-final dispatch override allows ≤3 generated endpoints for wire_up that
//                              must create real backend handlers to replace stubs.
//   endpoint_generation      : ≤10 files, ≤500 total, ≤2 new deps
//   schema_migration         : ≤3 files,  ≤200 total, 0 new deps
//   redesign_implementation  : operator-declared (clamped at system cap)
//
// Caps enforced at the fix-generator boundary; exceeding any cap aborts
// with construction_scope_violation.v1 BEFORE any code is written.
//
// Per CA-17 §3.2 redesign_implementation operator overrides ABOVE the
// system cap are CLAMPED (with system_cap_clamp.v1) — not rejected.

'use strict';

export const SCOPE_VIOLATION_KIND = 'construction_scope_violation.v1';
export const SCOPE_DECLARED_KIND = 'construction_scope_caps.v1';
export const SYSTEM_CAP_CLAMP_KIND = 'system_cap_clamp.v1';

export const SYSTEM_CAPS = Object.freeze({
  file_count_cap: 15,
  line_count_cap: 1500,
  new_dependency_cap: 3,
  dependency_graph_radius: 4,
  per_file_density_ceiling: 100,
});

export const PER_CLASS_DEFAULTS = Object.freeze({
  wire_up: Object.freeze({
    file_count_cap: 5,
    line_count_cap: 200,
    new_dependency_cap: 0,
    new_endpoint_cap: 3,
    per_file_density_ceiling: 100,
    dependency_graph_radius: SYSTEM_CAPS.dependency_graph_radius,
  }),
  endpoint_generation: Object.freeze({
    file_count_cap: 10,
    line_count_cap: 500,
    new_dependency_cap: 2,
    new_endpoint_cap: 5,
    per_file_density_ceiling: 100,
    dependency_graph_radius: SYSTEM_CAPS.dependency_graph_radius,
  }),
  schema_migration: Object.freeze({
    file_count_cap: 3,
    line_count_cap: 200,
    new_dependency_cap: 0,
    new_endpoint_cap: 0,
    per_file_density_ceiling: 100,
    dependency_graph_radius: SYSTEM_CAPS.dependency_graph_radius,
  }),
  redesign_implementation: Object.freeze({
    file_count_cap: SYSTEM_CAPS.file_count_cap,
    line_count_cap: SYSTEM_CAPS.line_count_cap,
    new_dependency_cap: SYSTEM_CAPS.new_dependency_cap,
    new_endpoint_cap: 5,
    per_file_density_ceiling: SYSTEM_CAPS.per_file_density_ceiling,
    dependency_graph_radius: SYSTEM_CAPS.dependency_graph_radius,
  }),
});

function makeS2Error(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  err.gate = 'S2';
  for (const [k, v] of Object.entries(extra)) err[k] = v;
  return err;
}

/**
 * Declare construction scope caps. Returns the resolved cap envelope
 * (defaults + operator overrides), with clamps applied. Throws when
 * operator overrides exceed the system cap for any non-redesign class
 * (only redesign_implementation accepts clamp-from-above; everything
 * else REJECTS out-of-bounds).
 *
 * @param {object} args
 * @param {string} args.constructionClass   — 'wire_up' | 'endpoint_generation' | 'schema_migration' | 'redesign_implementation'
 * @param {object} [args.operatorOverrides] — per-cap operator overrides
 * @returns {{ caps: object, clamps: Array }}
 */
export function declareScopeCaps(args) {
  if (!args || typeof args !== 'object') {
    throw makeS2Error(SCOPE_VIOLATION_KIND, 'S2ScopeBound.declareScopeCaps: args required');
  }
  const cls = args.constructionClass;
  const defaults = PER_CLASS_DEFAULTS[cls];
  if (!defaults) {
    throw makeS2Error(SCOPE_VIOLATION_KIND, `S2ScopeBound.declareScopeCaps: unknown construction class "${cls}"`);
  }
  const overrides = args.operatorOverrides ?? {};
  const caps = { ...defaults };
  const clamps = [];

  for (const key of Object.keys(SYSTEM_CAPS)) {
    if (overrides[key] === undefined || overrides[key] === null) continue;
    const requested = Number(overrides[key]);
    if (!Number.isFinite(requested) || requested < 0) {
      throw makeS2Error(SCOPE_VIOLATION_KIND,
        `S2ScopeBound: invalid override for ${key} — must be finite number ≥ 0`);
    }
    const systemMax = SYSTEM_CAPS[key];
    if (requested > systemMax) {
      if (cls === 'redesign_implementation') {
        caps[key] = systemMax;
        clamps.push(Object.freeze({
          kind: SYSTEM_CAP_CLAMP_KIND,
          cap: key,
          requested,
          clamped_to: systemMax,
          reason: 'redesign_implementation_operator_override_above_system_cap',
        }));
      } else {
        throw makeS2Error(SCOPE_VIOLATION_KIND,
          `S2ScopeBound: ${cls} override for ${key} (${requested}) exceeds system cap (${systemMax}) — only redesign_implementation accepts clamp-from-above; everything else REJECTS`,
          { cap: key, requested, systemMax });
      }
    } else {
      caps[key] = requested;
    }
  }

  return { caps: Object.freeze(caps), clamps: Object.freeze(clamps) };
}

/**
 * Validate a candidate fix set against the declared scope caps.
 * Aborts with construction_scope_violation.v1 if any cap is violated.
 *
 * @param {object} args
 * @param {object} args.caps           — resolved caps from declareScopeCaps
 * @param {Array}  args.files          — [{ path, lineCount }] candidate writes
 * @param {Array}  [args.newDependencies] — package names being added
 * @param {number} [args.newEndpointCount] — generated endpoint count
 * @param {number} [args.dependencyGraphRadius] — measured radius for the touched fileset
 * @returns {{ ok: true }}              — on pass; throws on violation
 */
export function validateAgainstCaps(args) {
  if (!args || !args.caps || !Array.isArray(args.files)) {
    throw makeS2Error(SCOPE_VIOLATION_KIND, 'S2ScopeBound.validateAgainstCaps: caps + files[] required');
  }
  const { caps, files } = args;
  const fileCount = files.length;
  let totalLines = 0;
  for (const f of files) {
    if (!f || typeof f.path !== 'string' || !Number.isFinite(f.lineCount)) {
      throw makeS2Error(SCOPE_VIOLATION_KIND, 'S2ScopeBound: each file must have { path:string, lineCount:number }');
    }
    if (f.lineCount > caps.per_file_density_ceiling) {
      throw makeS2Error(SCOPE_VIOLATION_KIND,
        `S2ScopeBound: per-file density ceiling violated — ${f.path} has ${f.lineCount} lines (cap ${caps.per_file_density_ceiling})`,
        { cap_violated: 'file_density_ceiling', filePath: f.path, lineCount: f.lineCount });
    }
    totalLines += f.lineCount;
  }
  if (fileCount > caps.file_count_cap) {
    throw makeS2Error(SCOPE_VIOLATION_KIND,
      `S2ScopeBound: file_count ${fileCount} exceeds cap ${caps.file_count_cap}`,
      { cap_violated: 'file_count' });
  }
  if (totalLines > caps.line_count_cap) {
    throw makeS2Error(SCOPE_VIOLATION_KIND,
      `S2ScopeBound: line_count ${totalLines} exceeds cap ${caps.line_count_cap}`,
      { cap_violated: 'line_count' });
  }
  const newDeps = Array.isArray(args.newDependencies) ? args.newDependencies : [];
  if (newDeps.length > caps.new_dependency_cap) {
    throw makeS2Error(SCOPE_VIOLATION_KIND,
      `S2ScopeBound: new_dependency_count ${newDeps.length} exceeds cap ${caps.new_dependency_cap}`,
      { cap_violated: 'new_dependencies', newDependencies: newDeps });
  }
  const newEndpoints = Number.isFinite(args.newEndpointCount) ? args.newEndpointCount : 0;
  if (caps.new_endpoint_cap !== undefined && newEndpoints > caps.new_endpoint_cap) {
    throw makeS2Error(SCOPE_VIOLATION_KIND,
      `S2ScopeBound: new_endpoint_count ${newEndpoints} exceeds cap ${caps.new_endpoint_cap}`,
      { cap_violated: 'new_endpoints' });
  }
  const radius = Number.isFinite(args.dependencyGraphRadius) ? args.dependencyGraphRadius : 0;
  if (radius > caps.dependency_graph_radius) {
    throw makeS2Error(SCOPE_VIOLATION_KIND,
      `S2ScopeBound: dependency_graph_radius ${radius} exceeds cap ${caps.dependency_graph_radius}`,
      { cap_violated: 'dependency_graph_radius' });
  }
  return { ok: true, fileCount, totalLines, newDependencyCount: newDeps.length, newEndpointCount: newEndpoints };
}

/**
 * Run S2 end-to-end. Declares scope caps + validates the candidate set.
 * On success returns the caps envelope + summary; on violation throws.
 */
export async function runS2ScopeBound({ productId, environment, constructionClass, operatorOverrides, candidate, appendGovernanceEntry, supabase, logger }) {
  const { caps, clamps } = declareScopeCaps({ constructionClass, operatorOverrides });
  const summary = validateAgainstCaps({
    caps,
    files: candidate.files ?? [],
    newDependencies: candidate.newDependencies ?? [],
    newEndpointCount: candidate.newEndpointCount ?? 0,
    dependencyGraphRadius: candidate.dependencyGraphRadius ?? 0,
  });

  const envelope = Object.freeze({
    kind: SCOPE_DECLARED_KIND,
    construction_class: constructionClass,
    caps,
    summary: Object.freeze(summary),
    clamps,
    captured_at: new Date().toISOString(),
  });

  if (typeof appendGovernanceEntry === 'function') {
    await appendGovernanceEntry({
      productId,
      environment: environment ?? 'prd',
      entry: envelope,
      supabase,
    });
    for (const clamp of clamps) {
      await appendGovernanceEntry({
        productId,
        environment: environment ?? 'prd',
        entry: clamp,
        supabase,
      });
    }
  }

  if (logger?.info) logger.info('S2 scope caps declared', { productId, constructionClass, caps, summary });
  return Object.freeze({ ok: true, envelope, caps, summary });
}
