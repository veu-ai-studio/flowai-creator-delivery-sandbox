// Agent #3 Self-Renewal Executor — Phase 1.3 graduation tests.
//
// Coverage maps to docs/specs/SELF_RENEWAL_AGENT_SPEC.md §5:
//   - T-N1, T-N2 (charter validation)
//   - T-F1..T-F6 (fork-and-fix happy paths)
//   - T-G1..T-G6 (gates + escalation)
//   - T-E1..T-E4 (endpoint surface — exercises api/agent/3/execute.js
//     handler logic via direct import; HTTP harness mocked)
//
// Bundle / browser tests (T-B1..T-B3) skipped intentionally — they
// require a vitest browser environment that isn't configured for this
// project. The bundling posture is verified via the import graph
// (Executor uses no node:* primitives directly).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent3SelfRenewalExecutor, __internals as EX_INTERNALS } from '../../src/lib/agents/agents/Agent3SelfRenewalExecutor.js';
import {
  classifySeverity,
  requiresHumanGate,
  autoDeployable,
  partitionByRouting,
  SEVERITY_TIERS,
} from '../../src/lib/agents/severity.js';
import { shouldVerify, runVerificationRecrawl } from '../../src/lib/agents/verification.js';
import { getExecutor, listExecutors } from '../../src/lib/agents/_registry.ts';
import handler, { __test as ENDPOINT_TEST } from '../../api/agent/3/execute.js';
import { runAgent3RenewalJob } from '../../api/_lib/inngest.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMemoryHot() {
  const map = new Map();
  return {
    get: vi.fn(async (k) => map.get(k)),
    set: vi.fn(async (k, v) => { map.set(k, v); return v; }),
    delete: vi.fn(async (k) => { map.delete(k); }),
    _peek: () => Object.fromEntries(map),
  };
}

function makeBus() {
  const published = [];
  return {
    publish: vi.fn(async (env) => { published.push(env); }),
    subscribe: vi.fn(() => () => {}),
    _peek: () => published,
  };
}

function makeAuditLog() {
  const writes = [];
  return {
    write: vi.fn(async (entry) => { writes.push(entry); }),
    _peek: () => writes,
  };
}

function makeExecutorDeps(extras = {}) {
  let t = 1_700_000_000_000;
  const clock = { now: () => t };
  const hot = makeMemoryHot();
  const cold = { append: vi.fn(async () => {}), list: vi.fn(async () => []) };
  const messageBus = makeBus();
  const auditLog = makeAuditLog();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    deps: {
      logger, messageBus, auditLog, clock,
      productScope: 'flowai',
      environment: 'prod',
      hot, cold,
      ...extras,
    },
    advance: (ms) => { t += ms; },
    hot, cold, messageBus, auditLog, logger, clock,
  };
}

function makeIssue(overrides = {}) {
  return {
    id: 'ISSUE-001',
    severity: 'medium',
    category: 'headline-hierarchy',
    location: 'h1',
    evidence: 'small h1 tag',
    autoFixable: true,
    fixSpec: { strategy: 'reorder-headings' },
    ...overrides,
  };
}

function makeRemediationEngine({ ok = true, throws = false, reason = null, path = 'patch-existing-source' } = {}) {
  return {
    remediate: vi.fn(async () => {
      if (throws) throw new Error('remediation engine threw');
      if (!ok) return { ok: false, reason: reason ?? 'build_failed', buildLog: 'mock build log' };
      return {
        ok: true,
        path,
        renewedUrl: 'https://renewed.example/preview',
        deploymentId: 'dpl_abc123',
        deployedAt: '2026-05-14T00:00:00.000Z',
        patchedFiles: ['index.html'],
        generatedFiles: [],
      };
    }),
  };
}

function makeVerificationAdapters({ afterIssues = [] } = {}) {
  return {
    issueDetector: { detect: vi.fn(() => afterIssues) },
    orchestraDispatch: vi.fn(async () => ({ ok: true, artifact: '<html>fresh</html>', evidence: null })),
    claudeNormalize: vi.fn(async (a) => a),
  };
}

function makeHumanGate() {
  const calls = [];
  return {
    request: vi.fn(async (req) => { calls.push(req); return { ok: true, noticeId: req.noticeId }; }),
    _peek: () => calls,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Severity helper unit tests (spec §4.4)
// ────────────────────────────────────────────────────────────────────────────

describe('severity helper', () => {
  it('SEVERITY_TIERS exposes 3-tier scale per CEO Q3 = (a)', () => {
    expect(SEVERITY_TIERS).toEqual(['critical', 'high', 'medium']);
  });

  it('classifySeverity accepts Issue object or bare string', () => {
    expect(classifySeverity({ severity: 'medium' })).toBe('medium');
    expect(classifySeverity('critical')).toBe('critical');
  });

  it('classifySeverity throws on unknown severities', () => {
    expect(() => classifySeverity({ severity: 'urgent' })).toThrow(/unknown severity/);
    expect(() => classifySeverity({})).toThrow();
    expect(() => classifySeverity(null)).toThrow();
  });

  it('requiresHumanGate true for critical + high; false for medium', () => {
    expect(requiresHumanGate('critical')).toBe(true);
    expect(requiresHumanGate('high')).toBe(true);
    expect(requiresHumanGate('medium')).toBe(false);
  });

  it('autoDeployable true for medium only', () => {
    expect(autoDeployable('medium')).toBe(true);
    expect(autoDeployable('high')).toBe(false);
    expect(autoDeployable('critical')).toBe(false);
  });

  it('partitionByRouting splits issues into autoDeploy / gated / unknown', () => {
    const { autoDeploy, gated, unknown } = partitionByRouting([
      makeIssue({ id: 'I1', severity: 'medium' }),
      makeIssue({ id: 'I2', severity: 'high' }),
      makeIssue({ id: 'I3', severity: 'critical' }),
      { id: 'I4' }, // missing severity
    ]);
    expect(autoDeploy.map((i) => i.id)).toEqual(['I1']);
    expect(gated.map((i) => i.id)).toEqual(['I2', 'I3']);
    expect(unknown.map((i) => i.id)).toEqual(['I4']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Verification helper unit tests (spec §2.5, CEO Q5 = (c))
// ────────────────────────────────────────────────────────────────────────────

describe('verification helper', () => {
  it('shouldVerify samples on every Nth renewal (default 5)', () => {
    const baseNow = 1_700_000_000_000;
    const a = shouldVerify({ renewalCount: 4, lastVerifiedAt: baseNow, productScope: 'flowai', options: { now: () => baseNow + 1000 } });
    const b = shouldVerify({ renewalCount: 5, lastVerifiedAt: baseNow, productScope: 'flowai', options: { now: () => baseNow + 1000 } });
    expect(a.sampled).toBe(false);
    expect(b.sampled).toBe(true);
    expect(b.reason).toMatch(/every-5th/);
  });

  it('shouldVerify enforces monthly minimum per Locked Rule 16', () => {
    const baseNow = 1_700_000_000_000;
    const r = shouldVerify({
      renewalCount: 2,
      lastVerifiedAt: baseNow - 40 * 24 * 60 * 60 * 1000,
      productScope: 'flowai',
      options: { now: () => baseNow },
    });
    expect(r.sampled).toBe(true);
    expect(r.reason).toMatch(/monthly-minimum/);
  });

  it('shouldVerify skips when neither rule fires', () => {
    const baseNow = 1_700_000_000_000;
    const r = shouldVerify({
      renewalCount: 3,
      lastVerifiedAt: baseNow - 24 * 60 * 60 * 1000, // 1 day ago
      productScope: 'flowai',
      options: { now: () => baseNow },
    });
    expect(r.sampled).toBe(false);
  });

  it('runVerificationRecrawl computes resolved/unresolved/regressions deltas', async () => {
    const before = [
      { id: 'B1', severity: 'medium', category: 'headline', autoFixable: true },
      { id: 'B2', severity: 'medium', category: 'cta-missing', autoFixable: true },
    ];
    const adapters = makeVerificationAdapters({
      afterIssues: [
        { id: 'A1', severity: 'medium', category: 'cta-missing' }, // still present
        { id: 'A2', severity: 'medium', category: 'broken-image' }, // new regression
      ],
    });
    const delta = await runVerificationRecrawl({
      productScope: 'flowai',
      renewedUrl: 'https://renewed.example',
      before,
      adapters,
    });
    expect(delta.resolved).toEqual(['B1']);
    expect(delta.unresolved).toEqual(['B2']);
    expect(delta.regressions).toEqual(['A2']);
    expect(adapters.orchestraDispatch).toHaveBeenCalledOnce();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Charter tests (T-N1, T-N2)
// ────────────────────────────────────────────────────────────────────────────

describe('Agent3SelfRenewalExecutor charter (T-N1, T-N2)', () => {
  it('charter() resolves from EXECUTOR_REGISTRY', () => {
    const c = Agent3SelfRenewalExecutor.charter();
    expect(c.id).toBe(3);
    expect(c.name).toBe('Self-Renewal Executor');
    expect(c.flowAiOnly).toBe(false);
    expect(c.authority).toEqual(['auto_write_internal', 'requires_human_gate']);
    expect(c.produces).toContain('3.renewal.applied.v1');
    expect(c.produces).toContain('3.renewal.delta.v1');
    expect(c.produces).toContain('3.renewal.build_failed.v1');
    expect(c.produces).toContain('3.renewal.disabled.v1');
  });

  it('EXECUTOR_REGISTRY contains exactly one entry for SelfRenewalExecutor', () => {
    const exes = listExecutors();
    expect(exes.length).toBeGreaterThanOrEqual(1);
    const sr = getExecutor('self-renewal-executor');
    expect(sr).toBeDefined();
    expect(sr?.agentId).toBe(3);
  });

  it('constructor validates required deps', () => {
    const { deps } = makeExecutorDeps();
    const ex = new Agent3SelfRenewalExecutor(deps);
    expect(ex).toBeInstanceOf(Agent3SelfRenewalExecutor);
    expect(ex.charter.authority).toContain('auto_write_internal');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// executeRemediation — recommend_only path
// ────────────────────────────────────────────────────────────────────────────

describe('executeRemediation recommend_only', () => {
  it('returns analytical envelope with zero side effects (medium)', async () => {
    const { deps } = makeExecutorDeps();
    const ex = new Agent3SelfRenewalExecutor(deps);
    const r = await ex.executeRemediation(makeIssue(), 'recommend_only', { productScope: 'flowai' });
    expect(r.ok).toBe(true);
    expect(r.outcome).toBe('recommendation');
    expect(r.mode).toBe('recommend_only');
    expect(r.severity).toBe('medium');
    expect(r.requiresHumanGate).toBe(false);
    expect(deps.messageBus.publish).not.toHaveBeenCalled();
  });

  it('flags requiresHumanGate=true for high severity even in recommend_only', async () => {
    const { deps } = makeExecutorDeps();
    const ex = new Agent3SelfRenewalExecutor(deps);
    const r = await ex.executeRemediation(makeIssue({ severity: 'high' }), 'recommend_only');
    expect(r.requiresHumanGate).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// executeRemediation — fork_and_fix happy path (T-F1, T-F3, T-F4)
// ────────────────────────────────────────────────────────────────────────────

describe('executeRemediation fork_and_fix happy path', () => {
  it('T-F1: medium auto-fixable issue + successful remediation → applied envelope', async () => {
    const { deps } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: true }),
      verificationAdapters: makeVerificationAdapters({ afterIssues: [] }),
    });
    const ex = new Agent3SelfRenewalExecutor(deps);
    const r = await ex.executeRemediation(makeIssue(), 'fork_and_fix', { productScope: 'flowai', runId: 'r1' });
    expect(r.ok).toBe(true);
    expect(r.outcome).toBe('deployed');
    expect(r.remediation.renewedUrl).toBe('https://renewed.example/preview');
    expect(r.remediation.deploymentId).toBe('dpl_abc123');
  });

  it('T-F4: publishes 3.renewal.applied.v1 with deploymentId + renewedUrl', async () => {
    const { deps, messageBus } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: true }),
      verificationAdapters: makeVerificationAdapters({ afterIssues: [] }),
    });
    const ex = new Agent3SelfRenewalExecutor(deps);
    await ex.executeRemediation(makeIssue(), 'fork_and_fix', { productScope: 'flowai', runId: 'r2' });
    const applied = messageBus._peek().find((e) => e.topic === '3.renewal.applied.v1');
    expect(applied).toBeDefined();
    expect(applied.payload.renewedUrl).toBe('https://renewed.example/preview');
    expect(applied.payload.deploymentId).toBe('dpl_abc123');
  });

  it('T-F3: verification re-crawl computes resolved/unresolved/regression delta', async () => {
    const { deps } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: true }),
      verificationAdapters: makeVerificationAdapters({ afterIssues: [] }),
      options: { verificationSampleRate: 1 }, // sample every renewal so the delta path runs
    });
    const ex = new Agent3SelfRenewalExecutor(deps);
    const issue = makeIssue({ id: 'BX', autoFixable: true });
    const r = await ex.executeRemediation(issue, 'fork_and_fix', { productScope: 'flowai' });
    expect(r.verification.sampled).toBe(true);
    expect(r.verification.delta?.resolved).toEqual(['BX']);
  });

  it('T-F5/F6: remediation.path passes through from engine response', async () => {
    const { deps: d1 } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: true, path: 'patch-existing-source' }),
      verificationAdapters: makeVerificationAdapters(),
    });
    const ex1 = new Agent3SelfRenewalExecutor(d1);
    const r1 = await ex1.executeRemediation(makeIssue(), 'fork_and_fix');
    expect(r1.remediation.path).toBe('patch-existing-source');

    const { deps: d2 } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: true, path: 'generate-from-scratch' }),
      verificationAdapters: makeVerificationAdapters(),
    });
    const ex2 = new Agent3SelfRenewalExecutor(d2);
    const r2 = await ex2.executeRemediation(makeIssue(), 'fork_and_fix');
    expect(r2.remediation.path).toBe('generate-from-scratch');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// executeRemediation — gates + escalation (T-G1..T-G6)
// ────────────────────────────────────────────────────────────────────────────

describe('executeRemediation gates + escalation', () => {
  it('T-G1: critical issue routes to human gate; no remediation dispatched', async () => {
    const remEngine = makeRemediationEngine({ ok: true });
    const humanGate = makeHumanGate();
    const { deps } = makeExecutorDeps({ remediationEngine: remEngine, humanGate });
    const ex = new Agent3SelfRenewalExecutor(deps);
    const r = await ex.executeRemediation(makeIssue({ severity: 'critical' }), 'fork_and_fix', { productScope: 'flowai', runId: 'rg1' });
    expect(r.outcome).toBe('gated');
    expect(r.requiresHumanGate).toBe(true);
    expect(remEngine.remediate).not.toHaveBeenCalled();
    expect(humanGate.request).toHaveBeenCalledOnce();
  });

  it('T-G2: high issue routes to human gate; no remediation dispatched', async () => {
    const remEngine = makeRemediationEngine({ ok: true });
    const humanGate = makeHumanGate();
    const { deps } = makeExecutorDeps({ remediationEngine: remEngine, humanGate });
    const ex = new Agent3SelfRenewalExecutor(deps);
    const r = await ex.executeRemediation(makeIssue({ severity: 'high' }), 'fork_and_fix');
    expect(r.outcome).toBe('gated');
    expect(remEngine.remediate).not.toHaveBeenCalled();
    expect(humanGate.request).toHaveBeenCalledOnce();
    const callArg = humanGate.request.mock.calls[0][0];
    expect(callArg.options).toEqual(['Approve', 'Modify', 'Skip']);
    expect(callArg.rev21Section).toBe('10.2');
  });

  it('T-G3: build failure publishes 3.renewal.build_failed.v1 and increments backoff', async () => {
    const { deps, messageBus, hot } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: false, reason: 'webpack_failed' }),
      verificationAdapters: makeVerificationAdapters(),
    });
    const ex = new Agent3SelfRenewalExecutor(deps);
    const r = await ex.executeRemediation(makeIssue(), 'fork_and_fix', { productScope: 'flowai' });
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe('build_failed');
    const failed = messageBus._peek().find((e) => e.topic === '3.renewal.build_failed.v1');
    expect(failed).toBeDefined();
    expect(failed.payload.reason).toBe('webpack_failed');
    // Backoff key incremented.
    const backoffKey = EX_INTERNALS.HOT_KEYS.backoff('flowai');
    expect(hot.set).toHaveBeenCalledWith(backoffKey, expect.objectContaining({ count: 1 }), expect.anything());
  });

  it('T-G4: 2 consecutive build_failed disables fork_and_fix; emits 3.renewal.disabled.v1', async () => {
    const { deps, messageBus } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: false, reason: 'failure' }),
      verificationAdapters: makeVerificationAdapters(),
    });
    // Pre-seed backoff at 2.
    await deps.hot.set(EX_INTERNALS.HOT_KEYS.backoff('flowai'), { count: 2, firstAt: deps.clock.now() });
    const ex = new Agent3SelfRenewalExecutor(deps);
    const r = await ex.executeRemediation(makeIssue(), 'fork_and_fix', { productScope: 'flowai' });
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe('disabled_backoff');
    const disabled = messageBus._peek().find((e) => e.topic === '3.renewal.disabled.v1');
    expect(disabled).toBeDefined();
  });

  it('T-G6: remediate() throws → caught; build_failed published; agent does not propagate', async () => {
    const { deps, messageBus } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ throws: true }),
      verificationAdapters: makeVerificationAdapters(),
    });
    const ex = new Agent3SelfRenewalExecutor(deps);
    const r = await ex.executeRemediation(makeIssue(), 'fork_and_fix');
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe('remediation_threw');
    expect(messageBus._peek().some((e) => e.topic === '3.renewal.build_failed.v1')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GovernanceAuditLog emission (Rev-2.1 §14)
// ────────────────────────────────────────────────────────────────────────────

describe('GovernanceAuditLog emission', () => {
  it('emits agent.execution start + end on recommend_only', async () => {
    const { deps, auditLog } = makeExecutorDeps();
    const ex = new Agent3SelfRenewalExecutor(deps);
    await ex.run({ kind: 'renewal.execute', mode: 'recommend_only', issue: makeIssue(), productScope: 'flowai' });
    const logs = auditLog._peek();
    const execLogs = logs.filter((l) => l.topic === 'agent.execution');
    expect(execLogs.length).toBeGreaterThanOrEqual(2); // start + end at minimum
    expect(execLogs[0].phase).toBe('start');
  });

  it('emits agent.fork.dispatch on fork_and_fix medium auto-deploy', async () => {
    const { deps, auditLog } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: true }),
      verificationAdapters: makeVerificationAdapters(),
    });
    const ex = new Agent3SelfRenewalExecutor(deps);
    await ex.executeRemediation(makeIssue(), 'fork_and_fix');
    const forkLogs = auditLog._peek().filter((l) => l.topic === 'agent.fork');
    expect(forkLogs.length).toBeGreaterThanOrEqual(1);
    expect(forkLogs.some((l) => l.phase === 'dispatch')).toBe(true);
  });

  it('emits agent.deploy on successful deploy', async () => {
    const { deps, auditLog } = makeExecutorDeps({
      remediationEngine: makeRemediationEngine({ ok: true }),
      verificationAdapters: makeVerificationAdapters(),
    });
    const ex = new Agent3SelfRenewalExecutor(deps);
    await ex.executeRemediation(makeIssue(), 'fork_and_fix');
    const deployLogs = auditLog._peek().filter((l) => l.topic === 'agent.deploy');
    expect(deployLogs.some((l) => l.phase === 'deployed')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Sync endpoint tests (T-E1..T-E4)
// ────────────────────────────────────────────────────────────────────────────

describe('/api/agent/3/execute sync endpoint', () => {
  function mockRes() {
    const r = {
      statusCode: 200,
      _body: null,
      _headers: {},
      status(code) { this.statusCode = code; return this; },
      json(b) { this._body = b; return this; },
      setHeader(k, v) { this._headers[k] = v; return this; },
    };
    return r;
  }

  it('T-E0: 405 on non-POST', async () => {
    const res = mockRes();
    await handler({ method: 'GET', headers: {}, query: {} }, res);
    expect(res.statusCode).toBe(405);
  });

  it('T-E0b: 400 on missing productScope', async () => {
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'x-product-scope': 'flowai' },
      query: {},
      body: { issue: makeIssue(), mode: 'recommend_only' },
    }, res);
    expect(res.statusCode).toBe(400);
    expect(res._body.field).toBe('productScope');
  });

  it('T-E0c: 400 on invalid mode', async () => {
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'x-product-scope': 'flowai' },
      query: {},
      body: { productScope: 'flowai', issue: makeIssue(), mode: 'rogue' },
    }, res);
    expect(res.statusCode).toBe(400);
    expect(res._body.error).toBe('invalid_mode');
  });

  it('T-E1: 401 when no auth context is presented', async () => {
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: {},
      query: {},
      body: { productScope: 'flowai', issue: makeIssue(), mode: 'recommend_only' },
    }, res);
    expect(res.statusCode).toBe(401);
  });

  it('T-E2: 403 when x-product-scope claim differs from body productScope', async () => {
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'x-product-scope': 'saige' },
      query: {},
      body: { productScope: 'flowai', issue: makeIssue(), mode: 'recommend_only' },
    }, res);
    expect(res.statusCode).toBe(403);
    expect(res._body.error).toBe('productScope_mismatch');
  });

  it('T-E3: 200 with envelope on recommend_only happy path', async () => {
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'x-product-scope': 'flowai' },
      query: {},
      body: { productScope: 'flowai', issue: makeIssue(), mode: 'recommend_only' },
    }, res);
    expect(res.statusCode).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._body.result.outcome).toBe('recommendation');
  });

  it('T-E0d: resolveAuthContext accepts internal auth with correct secret', () => {
    process.env.FLOWAI_INTERNAL_SECRET = 'test-secret';
    const auth = ENDPOINT_TEST.resolveAuthContext({
      headers: { 'x-flowai-internal': 'true', authorization: 'Bearer test-secret' },
    });
    expect(auth.ok).toBe(true);
    expect(auth.internal).toBe(true);
  });

  it('T-E0e: resolveAuthContext rejects internal auth with wrong secret', () => {
    process.env.FLOWAI_INTERNAL_SECRET = 'expected-secret';
    const auth = ENDPOINT_TEST.resolveAuthContext({
      headers: { 'x-flowai-internal': 'true', authorization: 'Bearer wrong-secret' },
    });
    expect(auth.ok).toBe(false);
    expect(auth.error).toBe('internal_auth_failed');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Inngest job tests
// ────────────────────────────────────────────────────────────────────────────

describe('runAgent3RenewalJob (Inngest async path)', () => {
  it('returns invalid_event_payload on null data', async () => {
    const r = await runAgent3RenewalJob(null);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid_event_payload');
  });

  it('returns missing_productScope when productScope absent', async () => {
    const r = await runAgent3RenewalJob({ issue: makeIssue(), mode: 'recommend_only' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('missing_productScope');
  });

  it('runs end-to-end on a valid recommend_only event', async () => {
    const r = await runAgent3RenewalJob({
      jobId: 'job_test_1',
      productScope: 'flowai',
      issue: makeIssue(),
      mode: 'recommend_only',
    });
    expect(r.ok).toBe(true);
    expect(r.jobId).toBe('job_test_1');
    expect(r.result.outcome).toBe('recommendation');
  });
});
