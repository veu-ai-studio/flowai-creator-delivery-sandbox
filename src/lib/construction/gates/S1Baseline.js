// src/lib/construction/gates/S1Baseline.js
//
// S1 — Pre-construction baseline gate (PANEL-RATIFIABLE per CA-17 §3.1).
//
// Captures the 6 MANDATORY baseline fields required before any
// construction-class operation begins:
//
//   1. §7.6 score + finding inventory
//   2. §10.1 5-dim audit snapshot (UI/UX, API, Logic, Business Value, Security Posture)
//   3. Per-page DOM hashes
//   4. Per-endpoint response hashes
//   5. Schema fingerprint
//   6. Dependency-graph fingerprint
//
// When product_registry.construction_extended_baseline_enabled === true
// an additional 4 optional fields are captured (runtime-config,
// feature-flag, background-job, external-contract). Otherwise the
// baseline persists with only the 6 mandatory fields and `extended: false`.
//
// Persists as governance_record_entry kind:'construction_pre_baseline.v1'
// via the caller-supplied appendGovernanceEntry hook. The hook is the
// existing optionCPipeline.appendGovernanceEntry — same path as the
// renewal orchestrator uses.
//
// All envelope shapes are frozen so callers cannot mutate them.

'use strict';

import { createHash } from 'node:crypto';

export const BASELINE_KIND = 'construction_pre_baseline.v1';
export const BASELINE_MISSING_KIND = 'construction_pre_baseline_missing.v1';
export const EXTENDED_DISABLED_KIND = 'construction_pre_baseline_extended_disabled.v1';

const FIVE_DIMS = Object.freeze(['ui_ux', 'api', 'logic', 'business_value', 'security_posture']);

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function sha256(input) {
  return createHash('sha256').update(typeof input === 'string' ? input : stableStringify(input)).digest('hex');
}

function hashPages(pages) {
  if (!Array.isArray(pages)) return {};
  const out = {};
  for (const p of pages) {
    if (!p || typeof p.url !== 'string') continue;
    const dom = typeof p.dom === 'string' ? p.dom : stableStringify(p);
    out[p.url] = sha256(dom).slice(0, 16);
  }
  return Object.freeze(out);
}

function hashEndpoints(endpoints) {
  if (!Array.isArray(endpoints)) return {};
  const out = {};
  for (const e of endpoints) {
    if (!e || typeof e.path !== 'string') continue;
    const body = typeof e.response === 'string' ? e.response : stableStringify(e.response ?? {});
    out[e.path] = sha256(body).slice(0, 16);
  }
  return Object.freeze(out);
}

function buildFiveDimSnapshot(scoreLayers) {
  if (!scoreLayers || typeof scoreLayers !== 'object') {
    return Object.freeze(FIVE_DIMS.reduce((acc, k) => ({ ...acc, [k]: null }), {}));
  }
  const out = {};
  for (const dim of FIVE_DIMS) {
    out[dim] = (scoreLayers[dim] !== undefined && scoreLayers[dim] !== null)
      ? scoreLayers[dim]
      : null;
  }
  return Object.freeze(out);
}

/**
 * Capture the S1 baseline envelope.
 *
 * @param {object} args
 * @param {object} args.preScore        — { score, layers, findings? } from §7.6 scorer
 * @param {Array}  args.findings        — finding inventory (may overlap with preScore.findings)
 * @param {Array}  args.pages           — crawled pages with { url, dom } shape
 * @param {Array}  args.endpoints       — { path, response } pairs
 * @param {object} [args.schema]        — schema/migration fingerprint source (string or object)
 * @param {object} [args.dependencyGraph] — deps fingerprint source
 * @param {object} [args.extended]      — optional { runtimeConfig, featureFlags, backgroundJobs, externalContracts }
 * @param {boolean} [args.extendedEnabled] — registry toggle value
 * @returns {{ envelope: object, extendedEmittedDisabled: boolean }}
 */
export function buildBaseline(args) {
  if (!args || typeof args !== 'object') {
    throw makeS1Error(BASELINE_MISSING_KIND, 'S1Baseline.buildBaseline: args required');
  }
  if (!args.preScore || typeof args.preScore.score !== 'number') {
    throw makeS1Error(BASELINE_MISSING_KIND, 'S1Baseline.buildBaseline: preScore.score (number) required');
  }
  const inventory = Array.isArray(args.findings) ? args.findings : (Array.isArray(args.preScore.findings) ? args.preScore.findings : []);

  const mandatory = {
    field_1_score_inventory: Object.freeze({
      score: args.preScore.score,
      finding_count: inventory.length,
      findings_digest: sha256(stableStringify(inventory)).slice(0, 16),
    }),
    field_2_five_dim_snapshot: buildFiveDimSnapshot(args.preScore.layers),
    field_3_page_dom_hashes: hashPages(args.pages),
    field_4_endpoint_response_hashes: hashEndpoints(args.endpoints),
    field_5_schema_fingerprint: sha256(args.schema ?? '').slice(0, 16),
    field_6_dependency_graph_fingerprint: sha256(args.dependencyGraph ?? '').slice(0, 16),
  };

  const extendedEnabled = args.extendedEnabled === true;
  let extendedEmittedDisabled = false;
  let extendedBlock = null;

  if (extendedEnabled) {
    extendedBlock = Object.freeze({
      field_7_runtime_config_fingerprint: sha256(args.extended?.runtimeConfig ?? '').slice(0, 16),
      field_8_feature_flag_state: Object.freeze({ ...(args.extended?.featureFlags ?? {}) }),
      field_9_background_job_inventory: Object.freeze([...(args.extended?.backgroundJobs ?? [])]),
      field_10_external_contract_checksums: Object.freeze({ ...(args.extended?.externalContracts ?? {}) }),
    });
  } else if (args.extended && Object.keys(args.extended).length > 0) {
    extendedEmittedDisabled = true;
  }

  const envelope = Object.freeze({
    kind: BASELINE_KIND,
    extended: extendedEnabled,
    captured_at: new Date().toISOString(),
    mandatory: Object.freeze(mandatory),
    extended_fields: extendedBlock,
  });

  return { envelope, extendedEmittedDisabled };
}

export function validateBaselineEnvelope(envelope) {
  if (!envelope || envelope.kind !== BASELINE_KIND) {
    return { ok: false, reason: 'wrong_kind' };
  }
  if (!envelope.mandatory) return { ok: false, reason: 'missing_mandatory' };
  for (let i = 1; i <= 6; i += 1) {
    const k = `field_${i}_${[
      'score_inventory',
      'five_dim_snapshot',
      'page_dom_hashes',
      'endpoint_response_hashes',
      'schema_fingerprint',
      'dependency_graph_fingerprint',
    ][i - 1]}`;
    if (envelope.mandatory[k] === undefined) {
      return { ok: false, reason: `missing_${k}` };
    }
  }
  if (envelope.extended === true && !envelope.extended_fields) {
    return { ok: false, reason: 'missing_extended_fields' };
  }
  return { ok: true };
}

/**
 * Run S1 end-to-end: build envelope, validate, persist via hook.
 * Returns { ok, envelope, baselineHash } on success, or throws.
 */
export async function runS1Baseline({ productId, environment, args, appendGovernanceEntry, supabase, logger }) {
  if (typeof productId !== 'string' || productId.length === 0) {
    throw makeS1Error(BASELINE_MISSING_KIND, 'runS1Baseline: productId required');
  }
  const { envelope, extendedEmittedDisabled } = buildBaseline(args);
  const validation = validateBaselineEnvelope(envelope);
  if (!validation.ok) {
    throw makeS1Error(BASELINE_MISSING_KIND, `runS1Baseline: invalid baseline envelope — ${validation.reason}`);
  }
  const baselineHash = sha256(stableStringify(envelope.mandatory));

  if (typeof appendGovernanceEntry === 'function') {
    await appendGovernanceEntry({
      productId,
      environment: environment ?? 'prd',
      entry: { ...envelope, phase_a_baseline_hash: baselineHash },
      supabase,
    });
    if (extendedEmittedDisabled) {
      await appendGovernanceEntry({
        productId,
        environment: environment ?? 'prd',
        entry: Object.freeze({
          kind: EXTENDED_DISABLED_KIND,
          captured_at: new Date().toISOString(),
          phase_a_baseline_hash: baselineHash,
          note: 'extended baseline fields supplied while construction_extended_baseline_enabled = false; persisted with 6 mandatory only',
        }),
        supabase,
      });
    }
  }

  if (logger?.info) logger.info('S1 baseline captured', { productId, baselineHash, extended: envelope.extended });
  return Object.freeze({ ok: true, envelope, baselineHash });
}

function makeS1Error(code, message) {
  const err = new Error(message);
  err.code = code;
  err.gate = 'S1';
  return err;
}

export const __internals = Object.freeze({ stableStringify, sha256, hashPages, hashEndpoints, FIVE_DIMS });
