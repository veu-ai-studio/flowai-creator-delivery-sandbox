// tests/construction/gates/S1Baseline.test.js
//
// CA-17 §3.1 conformance — S1 pre-construction baseline.
// Covers S1-CT-1..S1-CT-4 (with v3-final reframing of CT-4 as
// admin-opt-in extended baseline validation).

import { describe, it, expect, vi } from 'vitest';
import {
  buildBaseline,
  validateBaselineEnvelope,
  runS1Baseline,
  BASELINE_KIND,
  BASELINE_MISSING_KIND,
  EXTENDED_DISABLED_KIND,
  __internals,
} from '../../../src/lib/construction/gates/S1Baseline.js';

const SAMPLE_PRE_SCORE = {
  score: 72,
  layers: {
    ui_ux: 80,
    api: 75,
    logic: 70,
    business_value: 68,
    security_posture: 78,
  },
  findings: [{ severity: 'high', category: 'engine-error', location: '/settings' }],
};

const SAMPLE_PAGES = [
  { url: 'https://example.com/', dom: '<html><body>home</body></html>' },
  { url: 'https://example.com/settings', dom: '<html><body>settings</body></html>' },
];

const SAMPLE_ENDPOINTS = [
  { path: '/api/health', response: { ok: true } },
  { path: '/api/profile', response: 'unauth' },
];

describe('S1 Baseline — buildBaseline + 6 mandatory fields', () => {
  it('S1-CT-1: refuses construction without preScore.score → throws BASELINE_MISSING', () => {
    expect(() => buildBaseline({}))
      .toThrowError(/preScore\.score/);
    expect(() => buildBaseline({ preScore: { layers: {} } }))
      .toThrowError(/preScore\.score/);
  });

  it('S1-CT-2: baseline with extended OFF persists exactly 6 mandatory fields', () => {
    const { envelope } = buildBaseline({
      preScore: SAMPLE_PRE_SCORE,
      findings: SAMPLE_PRE_SCORE.findings,
      pages: SAMPLE_PAGES,
      endpoints: SAMPLE_ENDPOINTS,
      schema: { tables: ['user', 'session'] },
      dependencyGraph: { react: '18', vite: '5' },
      extendedEnabled: false,
    });
    expect(envelope.kind).toBe(BASELINE_KIND);
    expect(envelope.extended).toBe(false);
    expect(envelope.extended_fields).toBe(null);
    expect(envelope.mandatory.field_1_score_inventory.score).toBe(72);
    expect(envelope.mandatory.field_1_score_inventory.finding_count).toBe(1);
    expect(envelope.mandatory.field_2_five_dim_snapshot.ui_ux).toBe(80);
    expect(envelope.mandatory.field_3_page_dom_hashes['https://example.com/']).toMatch(/^[a-f0-9]{16}$/);
    expect(envelope.mandatory.field_4_endpoint_response_hashes['/api/health']).toMatch(/^[a-f0-9]{16}$/);
    expect(envelope.mandatory.field_5_schema_fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(envelope.mandatory.field_6_dependency_graph_fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(validateBaselineEnvelope(envelope)).toEqual({ ok: true });
  });

  it('S1-CT-3: baseline envelope is frozen → immutable per CA-17', () => {
    const { envelope } = buildBaseline({
      preScore: SAMPLE_PRE_SCORE,
      pages: SAMPLE_PAGES,
      endpoints: SAMPLE_ENDPOINTS,
    });
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.mandatory)).toBe(true);
  });

  it('S1-CT-4 (v3-final): extended=true persists 10 fields + extended flag', () => {
    const { envelope, extendedEmittedDisabled } = buildBaseline({
      preScore: SAMPLE_PRE_SCORE,
      pages: SAMPLE_PAGES,
      endpoints: SAMPLE_ENDPOINTS,
      extendedEnabled: true,
      extended: {
        runtimeConfig: { node: '20' },
        featureFlags: { newOnboarding: true },
        backgroundJobs: ['cron:nightly-rollup'],
        externalContracts: { stripe: 'v2' },
      },
    });
    expect(envelope.extended).toBe(true);
    expect(envelope.extended_fields.field_7_runtime_config_fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(envelope.extended_fields.field_8_feature_flag_state.newOnboarding).toBe(true);
    expect(envelope.extended_fields.field_9_background_job_inventory).toEqual(['cron:nightly-rollup']);
    expect(envelope.extended_fields.field_10_external_contract_checksums.stripe).toBe('v2');
    expect(extendedEmittedDisabled).toBe(false);
  });

  it('S1-CT-4 (v3-final): extended fields supplied when extendedEnabled=false emits informational disabled envelope', () => {
    const { envelope, extendedEmittedDisabled } = buildBaseline({
      preScore: SAMPLE_PRE_SCORE,
      pages: SAMPLE_PAGES,
      endpoints: SAMPLE_ENDPOINTS,
      extendedEnabled: false,
      extended: { runtimeConfig: { node: '20' } },
    });
    expect(envelope.extended).toBe(false);
    expect(envelope.extended_fields).toBe(null);
    expect(extendedEmittedDisabled).toBe(true);
  });

  it('field hashes are deterministic across builds', () => {
    const a = buildBaseline({ preScore: SAMPLE_PRE_SCORE, pages: SAMPLE_PAGES, endpoints: SAMPLE_ENDPOINTS, schema: 'X' }).envelope;
    const b = buildBaseline({ preScore: SAMPLE_PRE_SCORE, pages: SAMPLE_PAGES, endpoints: SAMPLE_ENDPOINTS, schema: 'X' }).envelope;
    expect(a.mandatory.field_5_schema_fingerprint).toBe(b.mandatory.field_5_schema_fingerprint);
    expect(a.mandatory.field_3_page_dom_hashes['https://example.com/']).toBe(b.mandatory.field_3_page_dom_hashes['https://example.com/']);
  });
});

describe('S1 Baseline — runS1Baseline persistence', () => {
  it('persists envelope + baselineHash via appendGovernanceEntry', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    const result = await runS1Baseline({
      productId: 'reltwin', environment: 'prd',
      args: {
        preScore: SAMPLE_PRE_SCORE,
        pages: SAMPLE_PAGES,
        endpoints: SAMPLE_ENDPOINTS,
      },
      appendGovernanceEntry: append,
    });
    expect(result.ok).toBe(true);
    expect(result.baselineHash).toMatch(/^[a-f0-9]{64}$/);
    expect(append).toHaveBeenCalledTimes(1);
    expect(writes[0].kind).toBe(BASELINE_KIND);
    expect(writes[0].phase_a_baseline_hash).toBe(result.baselineHash);
  });

  it('also persists extended-disabled informational envelope when extended fields supplied with toggle off', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    await runS1Baseline({
      productId: 'reltwin', environment: 'prd',
      args: {
        preScore: SAMPLE_PRE_SCORE,
        pages: SAMPLE_PAGES,
        endpoints: SAMPLE_ENDPOINTS,
        extended: { runtimeConfig: 'x' },
      },
      appendGovernanceEntry: append,
    });
    expect(writes).toHaveLength(2);
    expect(writes[1].kind).toBe(EXTENDED_DISABLED_KIND);
  });

  it('throws BASELINE_MISSING when productId is missing', async () => {
    await expect(runS1Baseline({
      args: { preScore: SAMPLE_PRE_SCORE, pages: SAMPLE_PAGES, endpoints: SAMPLE_ENDPOINTS },
    })).rejects.toThrowError(/productId/);
  });
});
