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
  return {
    discoverProduct: vi.fn(async () => PRODUCT),
    checkRateCap: vi.fn(async () => ({ allowed: true, runsInWindow: 0, cap: 1 })),
    checkRunawayDetector: vi.fn(async () => ({ tripped: false })),
    aggressiveCrawl: vi.fn(async () => ({ pagesCrawled: 5, depth: 2, pages: [], ok: true })),
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
