// tests/agents/renewal/orchestrator.test.js
//
// Test surface for src/lib/agents/renewal/orchestrator.js — the 14-step
// FlowAI orchestrator. Every external dep is injected via `deps` so the
// tests exercise the framework (mode control, repeat loop, exit
// conditions, onStep/onIteration callbacks) without real network calls.

import { describe, it, expect, vi } from 'vitest';
import { runOrchestration, GTM_READY_SCORE, STEP_NAMES, __internals }
  from '../../../src/lib/agents/renewal/orchestrator.js';

const PRODUCT = Object.freeze({
  product_id: 'mypreglife',
  org_id: 'veu-ai-studio',
  github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life',
  self_renewal_enabled: true,
});

const VERCEL_ENV = {
  VERCEL_PROJECT_ID_MYPREGLIFE: 'prj_fake',
  VERCEL_ORG_ID: 'team_fake',
  VERCEL_TOKEN: 'vercel_fake',
};

function withVercelEnv() {
  Object.assign(process.env, VERCEL_ENV);
}
function clearVercelEnv() {
  for (const k of Object.keys(VERCEL_ENV)) delete process.env[k];
}

function makeScoreEnvelope(total) {
  return {
    productId: 'mypreglife', url: 'https://x', runId: 'r',
    total, l1: total / 5, l2: total / 5, l3: total / 5, l4: total / 5, l5: total / 5,
    label: total >= 95 ? 'pass' : 'poor',
  };
}

function happyDeps({ preScoreSequence = [60], postScoreSequence = [72] } = {}) {
  // The orchestrator alternates pre/post calls within each iteration.
  // Iteration N call order: pre (STEP 5) → post (STEP 11).
  // We interleave the sequences so call i returns
  //   call 0 = pre[0], call 1 = post[0], call 2 = pre[1], call 3 = post[1], ...
  const sequence = [];
  const max = Math.max(preScoreSequence.length, postScoreSequence.length);
  for (let i = 0; i < max; i += 1) {
    if (i < preScoreSequence.length) sequence.push(preScoreSequence[i]);
    if (i < postScoreSequence.length) sequence.push(postScoreSequence[i]);
  }
  let scoreIdx = 0;
  // DISPATCH 28: the canonical §7.6 GTM gate uses scoreCrawlOutput()
  // instead of the Five-Layer total. Reuse the same interleaved
  // pre/post sequence so existing test expectations (originalScore /
  // finalScore / GTM_READY trigger) keep working — the sequence drives
  // both Five-Layer (computeScore) AND the canonical gate.
  let gtmIdx = 0;
  const synthGtm = (n) => ({
    score: n,
    counts: { critical: 0, high: 0, medium: 0, low: 0 },
    band: n >= 90 ? 'showcase-ready' : n >= 75 ? 'demo-ready' : n >= 60 ? 'internal-only' : 'not-demo-ready',
    label: 'synthetic',
    penalty: 100 - n,
    formula: 'synthetic',
    issues: [],
  });
  return {
    discoverProduct: vi.fn(async () => PRODUCT),
    checkRateCap: vi.fn(async () => ({ allowed: true, runsInWindow: 0, cap: 1 })),
    checkRunawayDetector: vi.fn(async () => ({ tripped: false })),
    aggressiveCrawl: vi.fn(async () => ({ pagesCrawled: 5, depth: 2, pages: [], ok: true })),
    // DISPATCH 7 added conductStructuredCrawl to STEP 3 — mock returns
    // the canonical crawlOutput shape that downstream steps consume so
    // the orchestrator doesn't fall through to the real Agent #21
    // CrawlConductor in unit tests.
    conductStructuredCrawl: vi.fn(async ({ url }) => ({
      pagesCrawled: 5, depth: 2,
      pages: [{ url, title: 'demo', headings: [], text: 'page text', links: [], forms: [],
                hasModal: false, hasChatbot: false, hasAIAgent: false, statusCode: 200, loadTimeMs: 50 }],
      brokenLinks: [], forms: [], interactiveElements: [], errors: [],
      totalTextLength: 9,
    })),
    produceMonitorText: vi.fn(async ({ url }) => ({
      monitorText: `[L1] 6/10 [L2] 6/10 [L3] 6/10 [L4] 6/10 [L5] 6/10`,
      rawContent: 'page text', url, fetchedAt: 'now', wordCount: 100, pageTitle: 'demo',
      model: 'claude-sonnet-4-6', usage: {},
    })),
    computeScore: vi.fn(async () => {
      const v = sequence[scoreIdx] ?? sequence[sequence.length - 1] ?? 50;
      scoreIdx += 1;
      return makeScoreEnvelope(v);
    }),
    // DISPATCH 28: parallel sequence drives the canonical §7.6 gate.
    // Synchronous (matches the real scoreCrawlOutput signature).
    scoreCrawlOutput: vi.fn(() => {
      const v = sequence[gtmIdx] ?? sequence[sequence.length - 1] ?? 50;
      gtmIdx += 1;
      return synthGtm(v);
    }),
    generateFix: vi.fn(async () => ({
      fixedContent: 'fixed-content', model: 'claude', promptTokens: 10, completionTokens: 5,
    })),
    getInstallationToken: vi.fn(async () => ({ token: 'ghs_fake', expiresAt: '2099-01-01T00:00:00Z' })),
    fetchFileContent: vi.fn(async () => 'original-content'),
    createRenewalBranch: vi.fn(async ({ branchName }) => ({
      branchName, commitSha: 'abc123',
      branchUrl: `https://github.com/veu-ai-studio/my-preg-life/tree/${branchName}`,
    })),
    commitFileToBranch: vi.fn(async ({ branchName, filePath }) => ({
      branchName, commitSha: 'def456', filePath,
    })),
    deployBranchPreview: vi.fn(async ({ branchName }) => ({
      deploymentId: 'dpl_fake', previewUrl: `https://demo-${branchName}.vercel.app`, inspectorUrl: '',
    })),
    evaluateDelta: vi.fn(({ preScore, postScore, policy, runId, productId }) => ({
      action: 'open_pr',
      delta: postScore.total - preScore.total,
      preScore: preScore.total, postScore: postScore.total,
      isSubstantial: postScore.total - preScore.total >= 5,
      prBanner: '✅',
      auditEntry: { kind: 'self_renewal.delta_evaluated.v1', runId, productId, delta: postScore.total - preScore.total, at: 'now' },
    })),
    createRenewalPr: vi.fn(async ({ branchName }) => ({
      prNumber: 42, prUrl: 'api', prHtmlUrl: `https://github.com/x/y/pull/42`, existing: false,
    })),
    readProductPolicy: vi.fn(async () => ({
      selfRenewalNegativeDeltaPolicy: 'ALWAYS_OPEN',
      selfRenewalMinimumDelta: 0,
      selfRenewalSubstantialThreshold: 5,
      selfRenewalMaxPerDay: 1,
      selfRenewalRunawayThreshold: 3,
    })),
    appendGovernanceEntry: vi.fn(async () => ({ written: true })),
  };
}

// ── AUTO mode happy path ────────────────────────────────────────────────────

describe('runOrchestration — AUTO mode', () => {
  it('GTM_READY exits when postScore reaches target on first iteration', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({ preScoreSequence: [50], postScoreSequence: [96] });
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'run-1', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 10, deps,
      });
      expect(result.ok).toBe(true);
      expect(result.gtmReady).toBe(true);
      expect(result.exitReason).toBe('GTM_READY');
      expect(result.iterationsCompleted).toBe(1);
      expect(result.originalScore).toBe(50);
      expect(result.finalScore).toBe(96);
      expect(result.totalDelta).toBe(46);
      expect(result.previewUrl).toMatch(/vercel\.app/);
      expect(result.prUrl).toMatch(/github\.com.*\/pull\/42/);
    } finally { clearVercelEnv(); }
  });

  it('repeats iterations until GTM_READY: 60 → 72 → 85 → 96 (4 iterations)', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({
        preScoreSequence:  [50, 72, 85, 90], // iter 1 starts at 50
        postScoreSequence: [72, 85, 90, 96],
      });
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'run-loop', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 10, deps,
      });
      expect(result.gtmReady).toBe(true);
      expect(result.iterationsCompleted).toBe(4);
      expect(result.originalScore).toBe(50);
      expect(result.finalScore).toBe(96);
      expect(result.exitReason).toBe('GTM_READY');
      expect(result.iterations.length).toBe(4);
      expect(result.iterations.map((i) => i.postScore)).toEqual([72, 85, 90, 96]);
    } finally { clearVercelEnv(); }
  });

  it('MAX_ITERATIONS exits after maxIterations without reaching target', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({
        preScoreSequence:  [40, 45, 50],
        postScoreSequence: [45, 50, 55], // never reaches 95
      });
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'run-max', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 3, deps,
      });
      expect(result.gtmReady).toBe(false);
      expect(result.exitReason).toBe('MAX_ITERATIONS');
      expect(result.iterationsCompleted).toBe(3);
      expect(result.finalScore).toBe(55);
    } finally { clearVercelEnv(); }
  });

  it('NO_IMPROVEMENT exits early when delta = 0', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({
        preScoreSequence:  [60, 70],
        postScoreSequence: [70, 70], // iter 2 doesn't improve
      });
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'run-noimp', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 10, deps,
      });
      expect(result.gtmReady).toBe(false);
      expect(result.exitReason).toBe('NO_IMPROVEMENT');
      expect(result.iterationsCompleted).toBe(2);
    } finally { clearVercelEnv(); }
  });
});

// ── GUIDED mode pauses at checkpoints ───────────────────────────────────────

describe('runOrchestration — GUIDED mode', () => {
  it('pauses at checkpoints; resume() continues', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({ preScoreSequence: [50], postScoreSequence: [96] });
      let stateRef = null;
      deps.__exposeState = (s) => { stateRef = s; };
      const onCheckpoint = vi.fn(() => {
        // Auto-resume after each checkpoint so the test completes.
        if (stateRef) setTimeout(() => stateRef.resume(), 0);
      });
      const result = await runOrchestration({
        url: null, mode: 'guided', runId: 'run-guided', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 10, deps, onCheckpoint,
      });
      expect(result.gtmReady).toBe(true);
      expect(onCheckpoint.mock.calls.length).toBeGreaterThan(0);
    } finally { clearVercelEnv(); }
  });

  it('stop() halts before the next iteration', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({
        preScoreSequence:  [40, 50],
        postScoreSequence: [50, 60],
      });
      let stateRef = null;
      deps.__exposeState = (s) => { stateRef = s; };
      const onCheckpoint = vi.fn(() => {
        if (stateRef) setTimeout(() => stateRef.resume(), 0);
      });
      const onIteration = vi.fn(() => {
        // After iteration 1, request stop. The outer loop should then exit.
        if (stateRef) stateRef.stop();
      });
      const result = await runOrchestration({
        url: null, mode: 'guided', runId: 'run-stop', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 10, deps,
        onCheckpoint, onIteration,
      });
      expect(['USER_STOPPED', 'GTM_READY', 'NO_IMPROVEMENT']).toContain(result.exitReason);
      expect(result.iterationsCompleted).toBeLessThanOrEqual(2);
    } finally { clearVercelEnv(); }
  });
});

// ── switchMode mid-run ──────────────────────────────────────────────────────

describe('runOrchestration — switchMode', () => {
  it('switching auto → guided takes effect at next checkpoint', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({ preScoreSequence: [50], postScoreSequence: [96] });
      let stateRef = null;
      deps.__exposeState = (s) => { stateRef = s; };
      const onStep = vi.fn(() => {
        // After the first step in iter 1, switch to guided.
        if (stateRef && stateRef.mode === 'auto') {
          stateRef.switchMode('guided');
        }
      });
      const onCheckpoint = vi.fn(() => {
        if (stateRef) setTimeout(() => stateRef.resume(), 0);
      });
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'run-switch', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 10, deps, onStep, onCheckpoint,
      });
      expect(result.gtmReady).toBe(true);
      expect(stateRef.mode).toBe('guided');
    } finally { clearVercelEnv(); }
  });

  it('rejects invalid mode', () => {
    const s = new __internals.OrchestrationState({});
    expect(s.switchMode('invalid')).toBe(false);
    expect(s.switchMode('auto')).toBe(true);
  });
});

// ── onStep + onIteration callbacks ──────────────────────────────────────────

describe('runOrchestration — callbacks', () => {
  it('onStep fires for every step with required envelope shape', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({ preScoreSequence: [50], postScoreSequence: [96] });
      const onStep = vi.fn();
      await runOrchestration({
        url: null, mode: 'auto', runId: 'run-cb', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 10, deps, onStep,
      });
      expect(onStep.mock.calls.length).toBeGreaterThan(0);
      const log = onStep.mock.calls[0][0];
      expect(log).toHaveProperty('iteration');
      expect(log).toHaveProperty('step');
      expect(log).toHaveProperty('stepName');
      expect(log).toHaveProperty('tool');
      expect(log).toHaveProperty('why');
      expect(log).toHaveProperty('status');
      expect(log).toHaveProperty('mode');
      expect(log).toHaveProperty('at');
    } finally { clearVercelEnv(); }
  });

  it('onIteration fires after each completed iteration with score data', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({
        preScoreSequence:  [40, 60],
        postScoreSequence: [60, 96],
      });
      const onIteration = vi.fn();
      await runOrchestration({
        url: null, mode: 'auto', runId: 'run-onit', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 10, deps, onIteration,
      });
      expect(onIteration.mock.calls.length).toBe(2);
      const i1 = onIteration.mock.calls[0][0];
      expect(i1.number).toBe(1);
      expect(i1.preScore).toBe(40);
      expect(i1.postScore).toBe(60);
      expect(i1.delta).toBe(20);
    } finally { clearVercelEnv(); }
  });
});

// ── Failure handling ────────────────────────────────────────────────────────

describe('runOrchestration — failure handling', () => {
  it('returns failure shape when product cannot be resolved', async () => {
    const deps = happyDeps();
    deps.discoverProduct = vi.fn(async () => null);
    const result = await runOrchestration({
      url: null, mode: 'auto', runId: 'r', supabase: null, deps,
    });
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('STEP_1');
    expect(result.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns failure shape when token mint fails', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({ preScoreSequence: [50] });
      deps.getInstallationToken = vi.fn(async () => {
        throw Object.assign(new Error('401 bad credentials'), { code: 'GITHUB_AUTH_FAILED' });
      });
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'r', supabase: null, deps,
      });
      expect(result.ok).toBe(false);
      expect(result.failedStep).toBe('STEP_8');
      expect(result.code).toBe('GITHUB_AUTH_FAILED');
    } finally { clearVercelEnv(); }
  });

  it('returns failure shape when scoring fails', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps();
      deps.produceMonitorText = vi.fn(async () => {
        throw Object.assign(new Error('SPA shell, no SSR'), { code: 'MONITOR_FETCH_FAILED' });
      });
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'r', supabase: null, deps,
      });
      expect(result.ok).toBe(false);
      expect(result.failedStep).toBe('STEP_5');
    } finally { clearVercelEnv(); }
  });
});

// ── Multi-file commit behaviour ─────────────────────────────────────────────

describe('runOrchestration — branch + commit pattern', () => {
  it('first file uses createRenewalBranch; subsequent files use commitFileToBranch', async () => {
    withVercelEnv();
    try {
      const deps = happyDeps({ preScoreSequence: [50], postScoreSequence: [96] });
      // Inject an issue object so prioritizer returns just that one.
      await runOrchestration({
        url: null, mode: 'auto', runId: 'r', supabase: null,
        issue: { severity: 'medium', title: 'x', filePath: 'README.md' },
        environment: 'prd', deps,
      });
      expect(deps.createRenewalBranch).toHaveBeenCalledTimes(1);
      // Phase A's score-derived prioritizer returns 1 issue → only branch creation, no commitFileToBranch.
      expect(deps.commitFileToBranch).not.toHaveBeenCalled();
    } finally { clearVercelEnv(); }
  });
});

// ── Internals + helpers ─────────────────────────────────────────────────────

describe('STEP_NAMES + GTM_READY_SCORE', () => {
  it('STEP_NAMES has 14 entries in canonical order', () => {
    expect(STEP_NAMES.length).toBe(14);
    expect(STEP_NAMES[0]).toBe('Product Discovery');
    expect(STEP_NAMES[13]).toBe('Audit Record');
  });
  it('GTM_READY_SCORE is 95', () => {
    expect(GTM_READY_SCORE).toBe(95);
  });
});

describe('computeProgress', () => {
  it('returns 0 when no progress', () => {
    expect(__internals.computeProgress({ originalScore: 50, currentScore: 50, target: 95 })).toBe(0);
  });
  it('returns 100 when at target', () => {
    expect(__internals.computeProgress({ originalScore: 50, currentScore: 95, target: 95 })).toBe(100);
  });
  it('caps at 100 when exceeded', () => {
    expect(__internals.computeProgress({ originalScore: 50, currentScore: 100, target: 95 })).toBe(100);
  });
  it('handles target === original gracefully', () => {
    expect(__internals.computeProgress({ originalScore: 95, currentScore: 95, target: 95 })).toBe(100);
  });
});

// ── DISPATCH 24 — product-agnostic PATH A / PATH B ─────────────────────────

describe('runOrchestration — DISPATCH 24 PATH A (known URL)', () => {
  it('PATH A: known URL loads from registry; deploys via operator branch path', async () => {
    withVercelEnv();
    try {
      // discoverProduct returns a registry row (PATH A — same as today).
      const deps = happyDeps({ preScoreSequence: [50], postScoreSequence: [96] });
      // Sanity: the default PRODUCT used by happyDeps has __pathB undefined
      // (i.e. PATH A). We explicitly assert this by tracking which deploy
      // path was used.
      const result = await runOrchestration({
        url: 'https://mypreglife-platform.vercel.app', mode: 'auto', runId: 'pathA-1',
        supabase: null, environment: 'prd', gtmTarget: 95, maxIterations: 10, deps,
      });
      expect(result.ok).toBe(true);
      // PATH A took the operator branch-deploy path → deployBranchPreview was called.
      expect(deps.deployBranchPreview).toHaveBeenCalledTimes(1);
      // PATH A invokes the GitHub-write path (token mint + branch + commit).
      expect(deps.getInstallationToken).toHaveBeenCalled();
      expect(deps.createRenewalBranch).toHaveBeenCalled();
      // Iteration log carries path='A'.
      expect(result.iterations[0].path).toBe('A');
      // STEP 1 log mentions PATH A.
      const step1 = result.orchestrationLog.find((l) => l.step === 1);
      expect(step1.status).toBe('complete');
      expect(JSON.stringify(step1.result)).toMatch(/PATH A \(known\)/);
    } finally { clearVercelEnv(); }
  });
});

describe('runOrchestration — DISPATCH 24 PATH B (unknown URL)', () => {
  it('PATH B: unknown URL proceeds with synthesized defaults — does not throw PRODUCT_NOT_FOUND', async () => {
    const deps = happyDeps({ preScoreSequence: [40], postScoreSequence: [96] });
    // Override discoverProduct to return a synthesized PATH B product
    // (no registry hit → universal mode).
    deps.discoverProduct = vi.fn(async ({ url, runId }) => ({
      product_id: `flowai-upgraded-newsite-com-${(runId || '').slice(0, 8)}`,
      org_id: 'flowai-self-hosted',
      github_repo_url: null,                // score-only mode (no repo detected)
      self_renewal_enabled: true,
      environment: 'prd',
      __pathB: true,
      __sourceUrl: url,
      __detectedRepoUrl: null,
      self_renewal_max_per_day: 3,
      self_renewal_minimum_delta: 1,
      self_renewal_substantial_threshold: 5,
      self_renewal_negative_delta_policy: 'ALWAYS_OPEN',
    }));
    deps.remediationEngine = vi.fn(async () => ({
      ok: true, renewedUrl: 'https://flowai-upgraded-newsite-com-runid24-abc.vercel.app',
      path: 'generate-from-scratch', deploymentId: 'dpl_pathB_fake',
      deployedAt: '2099-01-01T00:00:00Z',
    }));
    const result = await runOrchestration({
      url: 'https://newsite.com', mode: 'auto', runId: 'runid24-pathB-1',
      supabase: null, environment: 'prd', gtmTarget: 95, maxIterations: 10, deps,
    });
    // PRODUCT_NOT_FOUND must NOT be the outcome.
    expect(result.code).not.toBe('PRODUCT_NOT_FOUND');
    expect(result.failedStep).not.toBe('STEP_1');
    expect(result.ok).toBe(true);
    // STEP 1 result should mention PATH B.
    const step1 = result.orchestrationLog.find((l) => l.step === 1);
    expect(step1.status).toBe('complete');
    expect(JSON.stringify(step1.result)).toMatch(/PATH B \(unknown — proceeding in universal mode\)/);
    // Iteration log records path='B'.
    expect(result.iterations[0].path).toBe('B');
  });

  it('PATH B: deployment uses remediationEngine (not the operator branch-deploy path)', async () => {
    const deps = happyDeps({ preScoreSequence: [40], postScoreSequence: [96] });
    deps.discoverProduct = vi.fn(async ({ url, runId }) => ({
      product_id: `flowai-upgraded-example-${(runId || '').slice(0, 8)}`,
      org_id: 'flowai-self-hosted',
      github_repo_url: null,
      self_renewal_enabled: true, __pathB: true,
      __sourceUrl: url, __detectedRepoUrl: null,
      self_renewal_max_per_day: 3, self_renewal_minimum_delta: 1,
      self_renewal_substantial_threshold: 5,
    }));
    deps.remediationEngine = vi.fn(async () => ({
      ok: true, renewedUrl: 'https://flowai-upgraded-example-x-y.vercel.app',
      path: 'generate-from-scratch', deploymentId: 'dpl_pathB',
    }));
    const result = await runOrchestration({
      url: 'https://example.com', mode: 'auto', runId: 'pathB-deploy-1',
      supabase: null, environment: 'prd', gtmTarget: 95, maxIterations: 10, deps,
    });
    expect(result.ok).toBe(true);
    // remediationEngine called exactly once per iteration; branch-deploy NEVER.
    expect(deps.remediationEngine).toHaveBeenCalledTimes(1);
    expect(deps.deployBranchPreview).not.toHaveBeenCalled();
    // GitHub-write path skipped: no token mint, no branch, no commit, no PR.
    expect(deps.getInstallationToken).not.toHaveBeenCalled();
    expect(deps.createRenewalBranch).not.toHaveBeenCalled();
    expect(deps.commitFileToBranch).not.toHaveBeenCalled();
    expect(deps.createRenewalPr).not.toHaveBeenCalled();
    // STEP 7/8/9/13 logs should be 'skipped' with explicit PATH B rationale.
    const log = (n) => result.orchestrationLog.find((l) => l.step === n && l.iteration > 0);
    expect(log(7).status).toBe('skipped');
    expect(JSON.stringify(log(7).result)).toMatch(/PATH B/);
    expect(log(8).status).toBe('skipped');
    expect(log(9).status).toBe('skipped');
    // STEP 10 uses the remediationEngine tool label.
    const step10 = log(10);
    expect(step10.status).toBe('complete');
    expect(step10.tool).toMatch(/remediationEngine/);
    expect(step10.result.previewUrl).toMatch(/flowai-upgraded/);
    // STEP 13 (PR creation) skipped — no upstream repo.
    const step13 = result.orchestrationLog.find((l) => l.step === 13);
    expect(step13.status).toBe('skipped');
  });
});

describe('detectGithubRepoFromUrl', () => {
  // Imported lazily so the test file's top-of-file import set stays clean.
  it('finds repo from .well-known/flowai.json', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/.well-known/flowai.json')) {
        return {
          ok: true, status: 200,
          text: async () => JSON.stringify({ github_repo: 'https://github.com/op/repo' }),
        };
      }
      return { ok: false, status: 404, text: async () => '' };
    });
    const repo = await mod.detectGithubRepoFromUrl({ url: 'https://example.com', fetch: fetchMock });
    expect(repo).toBe('https://github.com/op/repo');
  });

  it('finds repo from <meta name="github-repo"> when well-known not present', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/.well-known/flowai.json')) {
        return { ok: false, status: 404, text: async () => '' };
      }
      return {
        ok: true, status: 200,
        text: async () => '<html><head><meta name="github-repo" content="https://github.com/op2/repo2"></head></html>',
      };
    });
    const repo = await mod.detectGithubRepoFromUrl({ url: 'https://example.com', fetch: fetchMock });
    expect(repo).toBe('https://github.com/op2/repo2');
  });

  it('falls back to github.com URL grep in page HTML', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/.well-known/flowai.json')) {
        return { ok: false, status: 404, text: async () => '' };
      }
      return {
        ok: true, status: 200,
        text: async () => '<html><body>see source <a href="https://github.com/op3/repo3">here</a></body></html>',
      };
    });
    const repo = await mod.detectGithubRepoFromUrl({ url: 'https://example.com', fetch: fetchMock });
    expect(repo).toBe('https://github.com/op3/repo3');
  });

  it('returns null when no signal is present', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = vi.fn(async () => ({
      ok: true, status: 200, text: async () => '<html><body>nothing here</body></html>',
    }));
    const repo = await mod.detectGithubRepoFromUrl({ url: 'https://example.com', fetch: fetchMock });
    expect(repo).toBeNull();
  });

  it('returns null on fetch failure (silent — never throws)', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = vi.fn(async () => { throw new Error('net down'); });
    const repo = await mod.detectGithubRepoFromUrl({ url: 'https://example.com', fetch: fetchMock });
    expect(repo).toBeNull();
  });
});

describe('derivePrioritizedIssuesFromScore', () => {
  it('returns supplied issue verbatim when provided', () => {
    const supplied = { severity: 'high', title: 'x', filePath: 'a.js' };
    const out = __internals.derivePrioritizedIssuesFromScore({ total: 50, l1: 5, l2: 5, l3: 5, l4: 5, l5: 5 }, PRODUCT, supplied);
    expect(out).toEqual([supplied]);
  });
  it('derives 1 issue targeting the weakest layer', () => {
    const out = __internals.derivePrioritizedIssuesFromScore({ total: 50, l1: 15, l2: 10, l3: 3, l4: 15, l5: 7 }, PRODUCT, null);
    expect(out.length).toBe(1);
    expect(out[0].layer).toBe('l3'); // l3 is weakest at 3
  });
});

// ── DISPATCH 27 — fetchRepoFileList (GitHub Trees API) ─────────────────────

describe('fetchRepoFileList (DISPATCH 27)', () => {
  const SAMPLE_TREE_RESPONSE = {
    sha: 'tree-sha',
    tree: [
      { path: 'README.md', mode: '100644', type: 'blob', sha: 'b1' },
      { path: 'package.json', mode: '100644', type: 'blob', sha: 'b2' },
      { path: 'src', mode: '040000', type: 'tree', sha: 't1' },
      { path: 'src/App.jsx', mode: '100644', type: 'blob', sha: 'b3' },
      { path: 'src/pages/Home.jsx', mode: '100644', type: 'blob', sha: 'b4' },
      { path: 'src/components/Hero.jsx', mode: '100644', type: 'blob', sha: 'b5' },
    ],
    truncated: false,
  };

  function sequencedFetch(...responses) {
    let i = 0;
    return vi.fn(async () => {
      const r = responses[i++];
      if (!r) throw new Error('mock ran out of responses');
      return {
        ok: r.ok !== false,
        status: r.status ?? 200,
        statusText: r.statusText ?? 'OK',
        json: async () => r.body,
        text: async () => JSON.stringify(r.body),
      };
    });
  }

  it('returns { files, truncated, sha, error: null } on happy path', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = sequencedFetch(
      { body: { object: { sha: 'tree-sha', type: 'commit' } } },
      { body: SAMPLE_TREE_RESPONSE },
    );
    const r = await mod.fetchRepoFileList({
      owner: 'veu-ai-studio', repo: 'my-preg-life', ref: 'main', token: 'ghs_fake',
      opts: { fetch: fetchMock },
    });
    expect(r.error).toBeNull();
    expect(r.sha).toBe('tree-sha');
    expect(r.truncated).toBe(false);
    // Only blob entries — the directory tree entry is filtered out.
    expect(r.files).toEqual([
      'README.md', 'package.json', 'src/App.jsx', 'src/pages/Home.jsx', 'src/components/Hero.jsx',
    ]);
  });

  it('returns truncated=true when GitHub flags the tree as truncated', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = sequencedFetch(
      { body: { object: { sha: 'sha2', type: 'commit' } } },
      { body: { sha: 'sha2', tree: [{ path: 'a.js', type: 'blob' }], truncated: true } },
    );
    const r = await mod.fetchRepoFileList({
      owner: 'o', repo: 'r', token: 't', opts: { fetch: fetchMock },
    });
    expect(r.truncated).toBe(true);
    expect(r.files).toEqual(['a.js']);
  });

  it('returns error: "ref_404" when the ref does not exist', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = sequencedFetch(
      { ok: false, status: 404, statusText: 'Not Found', body: { message: 'Not Found' } },
    );
    const r = await mod.fetchRepoFileList({
      owner: 'o', repo: 'r', token: 't', opts: { fetch: fetchMock },
    });
    expect(r.files).toEqual([]);
    expect(r.error).toBe('ref_404');
  });

  it('returns error: "tree_404" when the tree fetch fails', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = sequencedFetch(
      { body: { object: { sha: 'sha3', type: 'commit' } } },
      { ok: false, status: 404, statusText: 'Not Found', body: { message: 'Not Found' } },
    );
    const r = await mod.fetchRepoFileList({
      owner: 'o', repo: 'r', token: 't', opts: { fetch: fetchMock },
    });
    expect(r.files).toEqual([]);
    expect(r.error).toBe('tree_404');
  });

  it('returns "bad_args" / "no_token" for missing required args', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = vi.fn();
    expect((await mod.fetchRepoFileList({ owner: '', repo: 'r', token: 't', opts: { fetch: fetchMock } })).error).toBe('bad_args');
    expect((await mod.fetchRepoFileList({ owner: 'o', repo: '', token: 't', opts: { fetch: fetchMock } })).error).toBe('bad_args');
    expect((await mod.fetchRepoFileList({ owner: 'o', repo: 'r', token: '', opts: { fetch: fetchMock } })).error).toBe('no_token');
  });

  it('NEVER throws on network error — returns the envelope shape', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
    const r = await mod.fetchRepoFileList({
      owner: 'o', repo: 'r', token: 't', opts: { fetch: fetchMock },
    });
    expect(r.files).toEqual([]);
    expect(r.error).toMatch(/^ref_network:.*ECONNREFUSED/);
  });

  it('sends Authorization: Bearer <token> + the GitHub API version header', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = sequencedFetch(
      { body: { object: { sha: 's', type: 'commit' } } },
      { body: SAMPLE_TREE_RESPONSE },
    );
    await mod.fetchRepoFileList({
      owner: 'o', repo: 'r', token: 'ghs_xyz', opts: { fetch: fetchMock },
    });
    for (const call of fetchMock.mock.calls) {
      const init = call[1];
      expect(init.headers.Authorization).toBe('Bearer ghs_xyz');
      expect(init.headers.Accept).toBe('application/vnd.github+json');
      expect(init.headers['X-GitHub-Api-Version']).toBe('2022-11-28');
    }
  });

  it('uses recursive=1 on the tree endpoint', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = sequencedFetch(
      { body: { object: { sha: 's', type: 'commit' } } },
      { body: SAMPLE_TREE_RESPONSE },
    );
    await mod.fetchRepoFileList({
      owner: 'o', repo: 'r', token: 't', opts: { fetch: fetchMock },
    });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/git\/trees\/s\?recursive=1$/);
  });
});

describe('prioritizeIssuesWithClaude — fileList constraint (DISPATCH 27)', () => {
  const PRESCORE = { l1: 4, l2: 4, l3: 2, l4: 6, l5: 4, total: 20 };
  const PRODUCT_ROW = { product_id: 'mypreglife', github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life' };

  function captureAnthropic() {
    const captured = { prompt: '' };
    const fn = vi.fn(async (_url, init) => {
      captured.prompt = JSON.parse(init.body).messages[0].content;
      return {
        ok: true, status: 200,
        json: async () => ({
          content: [{ type: 'text', text: JSON.stringify({ issues: [
            { filePath: 'src/App.jsx', issue: 'x', fix: 'y',
              estimatedImpact: { layer: 'L1', delta: 5 },
              severity: 'medium', title: 't' },
          ] }) }],
          model: 'claude-sonnet-4-6', usage: {},
        }),
        text: async () => '{}',
      };
    });
    fn.captured = captured;
    return fn;
  }

  it('includes the REAL file list in the prompt when fileList is provided', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = captureAnthropic();
    await mod.prioritizeIssuesWithClaude({
      preScore: PRESCORE,
      product: PRODUCT_ROW,
      fileList: ['README.md', 'package.json', 'src/App.jsx', 'src/components/Hero.jsx'],
      opts: { fetch: fetchMock, apiKey: 'sk-ant-test' },
    });
    const p = fetchMock.captured.prompt;
    expect(p).toMatch(/REAL repo file list/);
    expect(p).toContain('  - README.md');
    expect(p).toContain('  - src/App.jsx');
    expect(p).toContain('  - src/components/Hero.jsx');
    expect(p).toMatch(/CRITICAL: if you propose a `filePath` that is NOT in the list above/);
    // The fallback "Likely source files" hint must NOT be present.
    expect(p).not.toMatch(/Likely source files/);
  });

  it('falls back to the guessed-paths hint when fileList is null/empty', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = captureAnthropic();
    await mod.prioritizeIssuesWithClaude({
      preScore: PRESCORE,
      product: PRODUCT_ROW,
      fileList: null,
      opts: { fetch: fetchMock, apiKey: 'sk-ant-test' },
    });
    const p = fetchMock.captured.prompt;
    expect(p).toMatch(/Likely source files/);
    expect(p).not.toMatch(/REAL repo file list/);
  });

  it('filters fileList to source-shaped extensions (drops binaries, gitignore, etc.)', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = captureAnthropic();
    await mod.prioritizeIssuesWithClaude({
      preScore: PRESCORE,
      product: PRODUCT_ROW,
      fileList: [
        'src/App.jsx',
        'public/logo.png',           // binary → dropped
        'package-lock.json',          // .json → kept
        'src/styles/main.css',        // kept
        'docs/diagram.pdf',           // dropped
        'README.md',
        '.gitignore',                 // no recognized ext → dropped
      ],
      opts: { fetch: fetchMock, apiKey: 'sk-ant-test' },
    });
    const p = fetchMock.captured.prompt;
    expect(p).toContain('src/App.jsx');
    expect(p).toContain('package-lock.json');
    expect(p).toContain('src/styles/main.css');
    expect(p).toContain('README.md');
    expect(p).not.toContain('logo.png');
    expect(p).not.toContain('diagram.pdf');
  });

  it('caps file list at 200 entries to keep prompt budget bounded', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = captureAnthropic();
    const huge = Array.from({ length: 500 }, (_, i) => `src/component-${i}.jsx`);
    await mod.prioritizeIssuesWithClaude({
      preScore: PRESCORE,
      product: PRODUCT_ROW,
      fileList: huge,
      opts: { fetch: fetchMock, apiKey: 'sk-ant-test' },
    });
    const p = fetchMock.captured.prompt;
    expect(p).toContain('src/component-0.jsx');
    expect(p).toContain('src/component-199.jsx');
    expect(p).not.toContain('src/component-200.jsx');
    expect(p).not.toContain('src/component-499.jsx');
  });

  it('suppliedIssue still short-circuits past Claude (file-list ignored)', async () => {
    const mod = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const fetchMock = vi.fn();
    const supplied = { severity: 'high', title: 'explicit issue', filePath: 'src/A.jsx' };
    const r = await mod.prioritizeIssuesWithClaude({
      preScore: PRESCORE, product: PRODUCT_ROW,
      suppliedIssue: supplied,
      fileList: ['src/A.jsx'],
      opts: { fetch: fetchMock, apiKey: 'sk-ant-test' },
    });
    expect(r).toEqual([supplied]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── DISPATCH 29 — pre-deploy parse gate + non-fatal Vercel failure ─────

describe('orchestrator — pre-deploy parse gate (DISPATCH 29)', () => {
  it('runs parse-check on every generated file before STEP 9 commit', async () => {
    withVercelEnv();
    try {
      const generateFix = vi.fn(async ({ filePath }) => ({
        fixedContent: `export const a = 1;\n// patched in ${filePath}\n`,
        model: 'claude', promptTokens: 0, completionTokens: 0,
      }));
      const commitFileToBranch = vi.fn(async ({ filePath }) => ({ filePath, commitSha: 'sha', branchName: 'b' }));
      const parseCheckContent = vi.fn(async () => ({ ok: true }));
      const deps = {
        ...happyDeps({ preScoreSequence: [50], postScoreSequence: [50] }),
        generateFix, commitFileToBranch, parseCheckContent,
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd29-pdg-pass', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
        issue: { filePath: 'src/good.js', issue: 'x', fix: 'y', severity: 'medium', title: 'a' },
      });
      // The pre-deploy gate log surfaces in orchestrationLog with status:'complete'.
      const gateLogs = result.orchestrationLog.filter((l) =>
        l.tool === 'pre-deploy parse gate (esbuild)',
      );
      expect(gateLogs).toHaveLength(1);
      expect(gateLogs[0].status).toBe('complete');
      expect(gateLogs[0].result.filesIn).toBe(1);
      expect(gateLogs[0].result.filesPassed).toBe(1);
      expect(gateLogs[0].result.filesRejected).toBe(0);
      expect(parseCheckContent).toHaveBeenCalledTimes(1);
    } finally { clearVercelEnv(); }
  });

  it('rejects a file that fails parse-check; log surfaces reason verbatim', async () => {
    withVercelEnv();
    try {
      const generateFix = vi.fn(async () => ({
        fixedContent: 'export const a = \'unterminated',
        model: 'claude', promptTokens: 0, completionTokens: 0,
      }));
      const commitFileToBranch = vi.fn();
      const deployBranchPreview = vi.fn();
      const parseCheckContent = vi.fn(async () => ({
        ok: false, reason: 'parse_error', detail: 'Unterminated string literal at line 1',
      }));
      const deps = {
        ...happyDeps({ preScoreSequence: [50], postScoreSequence: [50] }),
        generateFix, commitFileToBranch, deployBranchPreview, parseCheckContent,
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd29-pdg-1', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
        issue: { filePath: 'src/bad.js', issue: 'x', fix: 'y', severity: 'medium', title: 'b' },
      });
      expect(parseCheckContent).toHaveBeenCalledTimes(1);
      // The bad file never gets committed or deployed.
      expect(commitFileToBranch).not.toHaveBeenCalled();
      expect(deployBranchPreview).not.toHaveBeenCalled();
      // Gate log surfaces the rejection with the verbatim reason from the parser.
      const gateLogs = result.orchestrationLog.filter((l) =>
        l.tool === 'pre-deploy parse gate (esbuild)',
      );
      expect(gateLogs).toHaveLength(1);
      expect(gateLogs[0].status).toBe('degraded');
      expect(gateLogs[0].result.filesRejected).toBe(1);
      expect(gateLogs[0].result.rejected[0].filePath).toBe('src/bad.js');
      expect(gateLogs[0].result.rejected[0].reason).toBe('parse_error');
      expect(gateLogs[0].result.rejected[0].detail).toMatch(/Unterminated/);
    } finally { clearVercelEnv(); }
  });

  it('exits NO_FIXES_GENERATED when ALL files fail the parse gate', async () => {
    withVercelEnv();
    try {
      const generateFix = vi.fn(async () => ({
        fixedContent: 'const x = \'unterminated',
        model: 'claude', promptTokens: 0, completionTokens: 0,
      }));
      const parseCheckContent = vi.fn(async () => ({
        ok: false, reason: 'parse_error', detail: 'Unterminated string literal',
      }));
      const commitFileToBranch = vi.fn();
      const deployBranchPreview = vi.fn();
      const deps = {
        ...happyDeps({ preScoreSequence: [50], postScoreSequence: [50] }),
        generateFix,
        commitFileToBranch,
        deployBranchPreview,
        parseCheckContent,
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd29-pdg-2', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
        issue: { filePath: 'src/bad.js', issue: 'x', fix: 'y', severity: 'medium', title: 'b' },
      });
      expect(commitFileToBranch).not.toHaveBeenCalled();
      expect(deployBranchPreview).not.toHaveBeenCalled();
      // No iterations completed → finalScore stays at originalScore (no postScore).
      expect(result.exitReason).toBe('NO_FIXES_GENERATED');
    } finally { clearVercelEnv(); }
  });
});

describe('orchestrator — STEP 10 Vercel failure non-fatal (DISPATCH 29)', () => {
  it('PATH A: Vercel deploy throws → STEP 10 degraded, loop continues', async () => {
    withVercelEnv();
    try {
      const deployBranchPreview = vi.fn(async () => {
        throw new Error('deployment dpl_FAKE entered readyState=ERROR after 3 poll(s)');
      });
      const deps = {
        ...happyDeps({ preScoreSequence: [50, 60], postScoreSequence: [50, 50] }),
        deployBranchPreview,
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd29-step10-1', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 2, deps,
      });
      // No fatal failure — the run completes; deploy failure is degraded.
      expect(result.ok).toBe(true);
      expect(result.failedStep).toBeUndefined();
      // STEP 10 was logged as degraded with the Vercel error verbatim in the reason.
      const step10Logs = result.orchestrationLog.filter((l) => l.step === 10);
      expect(step10Logs.length).toBeGreaterThan(0);
      const degraded = step10Logs.find((l) => l.status === 'degraded');
      expect(degraded).toBeDefined();
      expect(degraded.result.reason).toMatch(/readyState=ERROR/);
      expect(degraded.result.degraded).toBe(true);
      // previewUrl is null at run completion (no successful deploy).
      expect(result.previewUrl).toBeNull();
    } finally { clearVercelEnv(); }
  });

  it('PATH A: degraded deploy still emits STEP 11 score against original URL', async () => {
    withVercelEnv();
    try {
      const deployBranchPreview = vi.fn(async () => { throw new Error('build_error'); });
      const deps = {
        ...happyDeps({ preScoreSequence: [50], postScoreSequence: [50] }),
        deployBranchPreview,
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd29-step10-2', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
      });
      // STEP 11 ran (post-score computed).
      const step11Logs = result.orchestrationLog.filter((l) => l.step === 11);
      expect(step11Logs.length).toBeGreaterThan(0);
      expect(step11Logs[0].status).toBe('complete');
    } finally { clearVercelEnv(); }
  });
});

// ── DISPATCH 30 — post-deploy regression guard ──────────────────────────

describe('orchestrator — post-deploy regression guard (DISPATCH 30)', () => {
  // Drive the canonical §7.6 gate via the scoreCrawlOutput DI hook. We
  // craft an alternating sequence so iter 1 produces a regression
  // (pre=88, post=83 with new high findings); STEP 13 must NOT open a PR.
  function regressionDeps(opts = {}) {
    const base = happyDeps({ preScoreSequence: [50], postScoreSequence: [50] });
    const scoreSequence = [
      // pre: 88 with all medium/low
      { score: 88, counts: { critical: 0, high: 0, medium: 5, low: 4 }, band: 'demo-ready', label: 'Demo-ready', penalty: 12, formula: 'synth', issues: [] },
      // post: 83 with NEW high findings → regression
      { score: 83, counts: { critical: 0, high: 3, medium: 1, low: 0 }, band: 'demo-ready', label: 'Demo-ready', penalty: 17, formula: 'synth', issues: [] },
      // iter 2 (if reached): same — keeps loop honest
      { score: 88, counts: { critical: 0, high: 0, medium: 5, low: 4 }, band: 'demo-ready', label: 'Demo-ready', penalty: 12, formula: 'synth', issues: [] },
      { score: 88, counts: { critical: 0, high: 0, medium: 5, low: 4 }, band: 'demo-ready', label: 'Demo-ready', penalty: 12, formula: 'synth', issues: [] },
    ];
    let i = 0;
    return {
      ...base,
      scoreCrawlOutput: vi.fn(() => scoreSequence[i++] ?? scoreSequence[scoreSequence.length - 1]),
      ...opts,
    };
  }

  it('flags iteration as regressed when post-score is lower than pre-score', async () => {
    withVercelEnv();
    try {
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd30-rg-1', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps: regressionDeps(),
      });
      const iter1 = result.iterations[0];
      expect(iter1.regressed).toBe(true);
      expect(iter1.regressionDetail).toBeTruthy();
      expect(iter1.regressionDetail.preScore).toBe(88);
      expect(iter1.regressionDetail.postScore).toBe(83);
      expect(iter1.regressionDetail.scoreDelta).toBe(-5);
      expect(iter1.regressionDetail.newHigh).toBe(3);
      expect(iter1.regressionDetail.newCritical).toBe(0);
    } finally { clearVercelEnv(); }
  });

  it('emits a regression-guard log entry verbatim with before/after counts', async () => {
    withVercelEnv();
    try {
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd30-rg-2', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps: regressionDeps(),
      });
      const guardLogs = result.orchestrationLog.filter((l) =>
        l.tool === 'post-deploy regression guard (D30)',
      );
      expect(guardLogs).toHaveLength(1);
      expect(guardLogs[0].status).toBe('degraded');
      expect(guardLogs[0].result.regressed).toBe(true);
      expect(guardLogs[0].result.detail.preCounts).toEqual({ critical: 0, high: 0, medium: 5, low: 4 });
      expect(guardLogs[0].result.detail.postCounts).toEqual({ critical: 0, high: 3, medium: 1, low: 0 });
    } finally { clearVercelEnv(); }
  });

  it('skips PR creation when final iteration regressed (never accepts fix into PR)', async () => {
    withVercelEnv();
    try {
      const createRenewalPr = vi.fn(async () => ({ prNumber: 999, prHtmlUrl: 'https://example/pr' }));
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd30-rg-3', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1,
        deps: regressionDeps({ createRenewalPr }),
      });
      expect(createRenewalPr).not.toHaveBeenCalled();
      expect(result.prUrl).toBeNull();
      const step13 = result.orchestrationLog.filter((l) => l.step === 13);
      expect(step13).toHaveLength(1);
      expect(step13[0].status).toBe('skipped');
      expect(step13[0].result.skipped).toBe('regression_guard');
      expect(step13[0].result.detail).toBeTruthy();
    } finally { clearVercelEnv(); }
  });

  it('flags regression when only critical count increases (score unchanged)', async () => {
    withVercelEnv();
    try {
      const scoreSeq = [
        { score: 80, counts: { critical: 0, high: 4, medium: 0, low: 0 }, band: 'demo-ready', label: 'x', penalty: 20, formula: 'x', issues: [] },
        { score: 80, counts: { critical: 1, high: 3, medium: 1, low: 0 }, band: 'demo-ready', label: 'x', penalty: 20, formula: 'x', issues: [] },
      ];
      let i = 0;
      const deps = {
        ...happyDeps({ preScoreSequence: [50], postScoreSequence: [50] }),
        scoreCrawlOutput: vi.fn(() => scoreSeq[i++] ?? scoreSeq[scoreSeq.length - 1]),
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd30-rg-4', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
      });
      expect(result.iterations[0].regressed).toBe(true);
      expect(result.iterations[0].regressionDetail.newCritical).toBe(1);
    } finally { clearVercelEnv(); }
  });

  it('does NOT flag regression when score improves and no new high/critical opened', async () => {
    withVercelEnv();
    try {
      const scoreSeq = [
        { score: 88, counts: { critical: 0, high: 0, medium: 5, low: 4 }, band: 'demo-ready', label: 'x', penalty: 12, formula: 'x', issues: [] },
        { score: 95, counts: { critical: 0, high: 0, medium: 2, low: 2 }, band: 'showcase-ready', label: 'x', penalty: 5, formula: 'x', issues: [] },
      ];
      let i = 0;
      const createRenewalPr = vi.fn(async () => ({ prNumber: 42, prHtmlUrl: 'https://example/pr/42' }));
      const deps = {
        ...happyDeps({ preScoreSequence: [50], postScoreSequence: [50] }),
        scoreCrawlOutput: vi.fn(() => scoreSeq[i++] ?? scoreSeq[scoreSeq.length - 1]),
        createRenewalPr,
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd30-rg-5', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
      });
      expect(result.iterations[0].regressed).toBe(false);
      expect(result.iterations[0].regressionDetail).toBeNull();
      // Reached GTM target → PR opened normally.
      expect(createRenewalPr).toHaveBeenCalledOnce();
      expect(result.prUrl).toMatch(/\/pr\/42$/);
    } finally { clearVercelEnv(); }
  });
});
