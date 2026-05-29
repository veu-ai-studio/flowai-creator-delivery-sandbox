// tests/construction/ConstructionEngine.test.js
//
// CA-17 §4 conformance — full S1→S2→S6→GENERATE→S4→S5 gate chain.
// Mocks the WireUpConstructor AI call so the test is deterministic.

import { describe, it, expect, vi } from 'vitest';
import {
  runConstruction,
  runWireUpConstruction,
  shouldRunConstruction,
  CONSTRUCTION_CLASS_KIND,
} from '../../src/lib/construction/ConstructionEngine.js';

const WIRE_UP_FINDING = {
  id: 'f1',
  severity: 'high',
  category: 'engine-error',
  location: '/settings:transfer-button',
  evidence: 'click handler is a no-op',
  description: 'Dead button',
  recommendation: 'Wire to new /api/wire/transfer endpoint',
};

const PRE_SCORE = { score: 72, layers: { ui_ux: 80, api: 75, logic: 70, business_value: 68, security_posture: 78 } };

function makeStubGenerateWireUp({ endpointSource = "export default function h(req, res) { res.json({ ok: true }); }", framePatchDiff = '@@ -1 +1 @@\n-old\n+new' } = {}) {
  return vi.fn(async () => ({
    candidate: {
      endpointHandler: { path: 'api/wire/settings-transfer-button.js', source: endpointSource },
      framePatch: { path: 'src/pages/Settings.jsx', diff: framePatchDiff },
      summary: 'Wired transfer button',
    },
    response: { model: 'claude-sonnet-4-6', stopReason: 'end_turn' },
  }));
}

function originPageResolver() {
  return { path: 'src/pages/Settings.jsx', content: 'export default function Settings() { return <button onClick={() => {}}>Transfer</button>; }' };
}

describe('shouldRunConstruction — eligibility gate', () => {
  it('refuses when construction_eligible !== true', () => {
    const r = shouldRunConstruction({
      product: { product_id: 'reltwin', construction_eligible: false },
      phaseBFindings: [WIRE_UP_FINDING],
      appendGovernanceEntry: vi.fn(),
    });
    expect(r.shouldRun).toBe(false);
    expect(r.reason).toMatch(/construction_eligible/);
  });

  it('refuses when no wire_up candidates in Phase B findings', () => {
    const r = shouldRunConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      phaseBFindings: [{ severity: 'low', category: 'rendering' }],
      appendGovernanceEntry: vi.fn(),
    });
    expect(r.shouldRun).toBe(false);
    expect(r.reason).toBe('no_wire_up_candidates_in_phase_b_findings');
  });

  it('refuses when no governance audit hook', () => {
    const r = shouldRunConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      phaseBFindings: [WIRE_UP_FINDING],
      appendGovernanceEntry: null,
    });
    expect(r.shouldRun).toBe(false);
    expect(r.reason).toBe('no_governance_audit_hook');
  });

  it('runs when all preconditions hold', () => {
    const r = shouldRunConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      phaseBFindings: [WIRE_UP_FINDING],
      appendGovernanceEntry: vi.fn(),
    });
    expect(r.shouldRun).toBe(true);
    expect(r.candidates).toHaveLength(1);
  });
});

describe('runWireUpConstruction — S1→S2→S6→GENERATE→S4→S5 chain', () => {
  it('happy path: emits construction_class + S1 + S2 + S6 + S5 envelopes in order', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    const generateWireUp = makeStubGenerateWireUp();
    const result = await runWireUpConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      environment: 'prd',
      candidate: WIRE_UP_FINDING,
      baselineArgs: {
        preScore: PRE_SCORE,
        pages: [{ url: 'https://reltwin.example/settings', dom: '<settings/>' }],
        endpoints: [],
      },
      knownPackages: {},
      originPageResolver,
      registryConfig: { s6AutoApproveInTestMode: true },
      appendGovernanceEntry: append,
      deps: { generateWireUp, aiOpts: { apiKey: 'sk-test' } },
    });
    expect(result.ok).toBe(true);
    expect(result.candidate_id).toBe('f1');
    expect(result.construction_class).toBe('wire_up');
    expect(result.candidateFiles).toHaveLength(2);

    const kinds = writes.map((e) => e.kind);
    expect(kinds[0]).toBe(CONSTRUCTION_CLASS_KIND);
    expect(kinds).toContain('construction_pre_baseline.v1');
    expect(kinds).toContain('construction_scope_caps.v1');
    expect(kinds).toContain('construction_pre_approval.v1');
    expect(kinds).toContain('construction_security_pre_write.v1');
    expect(kinds).toContain('construction_rollback.v1');
  });

  it('aborts at S2 when generated endpoint exceeds 100-line density ceiling', async () => {
    const append = vi.fn(async () => {});
    const longSource = Array.from({ length: 110 }, (_, i) => `// line ${i}`).join('\n');
    const generateWireUp = makeStubGenerateWireUp({ endpointSource: longSource });
    await expect(runWireUpConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      environment: 'prd',
      candidate: WIRE_UP_FINDING,
      baselineArgs: { preScore: PRE_SCORE, pages: [], endpoints: [] },
      knownPackages: {},
      originPageResolver,
      registryConfig: { s6AutoApproveInTestMode: true },
      appendGovernanceEntry: append,
      deps: { generateWireUp, aiOpts: { apiKey: 'sk-test' } },
    })).rejects.toMatchObject({ code: 'construction_scope_violation.v1' });
  });

  it('skips cleanly when constructor returns empty wire_up (no candidate)', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    const generateWireUp = makeStubGenerateWireUp({ endpointSource: '', framePatchDiff: '' });
    const result = await runWireUpConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      environment: 'prd',
      candidate: WIRE_UP_FINDING,
      baselineArgs: { preScore: PRE_SCORE, pages: [], endpoints: [] },
      knownPackages: {},
      originPageResolver,
      registryConfig: { s6AutoApproveInTestMode: true },
      appendGovernanceEntry: append,
      deps: { generateWireUp, aiOpts: { apiKey: 'sk-test' } },
    });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('empty_wire_up');
    expect(writes.map((e) => e.kind)).toContain('construction_wire_up_no_candidate.v1');
  });

  it('aborts at S4 when generated source imports unknown packages', async () => {
    const append = vi.fn(async () => {});
    const sourceWithBadImport = `import _ from 'fictional-lib';\nexport default function() {}`;
    const generateWireUp = makeStubGenerateWireUp({ endpointSource: sourceWithBadImport });
    await expect(runWireUpConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      environment: 'prd',
      candidate: WIRE_UP_FINDING,
      baselineArgs: { preScore: PRE_SCORE, pages: [], endpoints: [] },
      knownPackages: {}, // empty = nothing is allowed
      originPageResolver,
      registryConfig: { s6AutoApproveInTestMode: true },
      appendGovernanceEntry: append,
      deps: { generateWireUp, aiOpts: { apiKey: 'sk-test' } },
    })).rejects.toMatchObject({
      code: 'construction_security_pre_write_failure.v1',
      failure_class: 'dependency_expansion',
    });
  });

  it('S6 stale rejection bubbles up from runWireUpConstruction', async () => {
    const append = vi.fn(async () => {});
    const generateWireUp = makeStubGenerateWireUp();
    await expect(runWireUpConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      environment: 'prd',
      candidate: WIRE_UP_FINDING,
      baselineArgs: { preScore: PRE_SCORE, pages: [], endpoints: [] },
      knownPackages: {},
      originPageResolver,
      registryConfig: {
        approval: {
          operator: 'admin-1',
          role: 'admin',
          rationale: 'Phase 1 wire_up construction proof-of-concept test mode auto-approval — audit trail preserved for downstream review.',
          granted_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
        },
      },
      appendGovernanceEntry: append,
      deps: { generateWireUp, aiOpts: { apiKey: 'sk-test' } },
    })).rejects.toMatchObject({ code: 'construction_approval_stale.v1' });
  });
});

describe('runConstruction — top-level fallthrough', () => {
  it('returns ran:false when product not eligible', async () => {
    const r = await runConstruction({
      product: { product_id: 'reltwin', construction_eligible: false },
      phaseBFindings: [WIRE_UP_FINDING],
      appendGovernanceEntry: vi.fn(),
    });
    expect(r.ok).toBe(true);
    expect(r.ran).toBe(false);
  });

  it('first-candidate-success path returns ok with result', async () => {
    const append = vi.fn(async () => {});
    const generateWireUp = makeStubGenerateWireUp();
    const r = await runConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      environment: 'prd',
      phaseBFindings: [WIRE_UP_FINDING],
      baselineArgs: { preScore: PRE_SCORE, pages: [], endpoints: [] },
      knownPackages: {},
      originPageResolver,
      registryConfig: { s6AutoApproveInTestMode: true },
      appendGovernanceEntry: append,
      deps: { generateWireUp, aiOpts: { apiKey: 'sk-test' } },
    });
    expect(r.ok).toBe(true);
    expect(r.ran).toBe(true);
    expect(r.result.candidateFiles).toHaveLength(2);
  });

  it('all-candidates-fail → ok:false ran:true with failures detail', async () => {
    const append = vi.fn(async () => {});
    // S2 will reject this (110-line source > density 100).
    const longSource = Array.from({ length: 110 }, () => 'x').join('\n');
    const generateWireUp = makeStubGenerateWireUp({ endpointSource: longSource });
    const r = await runConstruction({
      product: { product_id: 'reltwin', construction_eligible: true },
      environment: 'prd',
      phaseBFindings: [WIRE_UP_FINDING],
      baselineArgs: { preScore: PRE_SCORE, pages: [], endpoints: [] },
      knownPackages: {},
      originPageResolver,
      registryConfig: { s6AutoApproveInTestMode: true },
      appendGovernanceEntry: append,
      deps: { generateWireUp, aiOpts: { apiKey: 'sk-test' } },
    });
    expect(r.ok).toBe(false);
    expect(r.ran).toBe(true);
    expect(r.failures.length).toBeGreaterThanOrEqual(1);
    expect(r.failures[0].code).toBe('construction_scope_violation.v1');
    expect(r.failures[0].gate).toBe('S2');
  });
});
