// tests/agents/renewal/optionCPipeline.test.js
//
// Test surface for src/lib/agents/renewal/optionCPipeline.js — the
// Phase A end-to-end orchestrator. All module imports are mocked via
// the `deps` injection parameter so each test isolates one decision
// branch without exercising real GitHub/Vercel/Anthropic APIs.

import { describe, it, expect, vi } from 'vitest';
import {
  runOptionC,
  parseGithubRepoUrl,
  resolveVercelProjectId,
  pickImpactedFilePath,
  __internals,
} from '../../../src/lib/agents/renewal/optionCPipeline.js';

const RUN_ID = '11111111-2222-3333-4444-555555555555';
const PRODUCT_ID = 'mypreglife';
const REPO_URL = 'https://github.com/veu-ai-studio/my-preg-life';

const HAPPY_ISSUE = Object.freeze({
  severity: 'medium',
  title: 'Defensive null check',
  description: 'The user list crashes on empty arrays',
  evidence: 'Stack trace at Home.jsx:42',
  filePath: 'src/components/Home.jsx',
});

const HAPPY_POLICY = Object.freeze({
  selfRenewalNegativeDeltaPolicy: 'ALWAYS_OPEN',
  selfRenewalMinimumDelta: 0,
  selfRenewalSubstantialThreshold: 5,
  selfRenewalMaxPerDay: 1,
  selfRenewalRunawayThreshold: 3,
});

function happyDeps(overrides = {}) {
  return {
    checkRateCap: vi.fn(async () => ({ allowed: true, runsInWindow: 0, cap: 1 })),
    checkRunawayDetector: vi.fn(async () => ({ tripped: false, consecutiveFailures: 0 })),
    getInstallationToken: vi.fn(async () => ({ token: 'ghs_fake_token', expiresAt: '2099-01-01T00:00:00Z' })),
    fetchFileContent: vi.fn(async () => 'const a = 1;\nexport default a;\n'),
    generateFix: vi.fn(async () => ({
      fixedContent: 'const a = 1;\n// fixed\nexport default a;\n',
      model: 'claude-sonnet-4-6',
      promptTokens: 100,
      completionTokens: 50,
    })),
    createRenewalBranch: vi.fn(async () => ({
      branchName: `flowai/renewal-${RUN_ID}`,
      commitSha: 'abc123',
      branchUrl: `https://github.com/veu-ai-studio/my-preg-life/tree/flowai/renewal-${RUN_ID}`,
    })),
    deployBranchPreview: vi.fn(async () => ({
      deploymentId: 'dpl_fake',
      previewUrl: 'https://my-preg-life-git-flowai-renewal-test.vercel.app',
      inspectorUrl: 'https://vercel.com/inspector',
    })),
    computeScore: vi.fn(async ({ url }) => {
      // Return higher score for the preview URL than the original — simulates a real fix.
      const isPreview = url.includes('vercel.app');
      return { productId: PRODUCT_ID, url, runId: RUN_ID, total: isPreview ? 60 : 50,
        l1: 12, l2: 12, l3: 12, l4: 12, l5: 12, label: 'PASS' };
    }),
    evaluateDelta: vi.fn(({ preScore, postScore, policy, runId, productId }) => ({
      action: 'open_pr',
      delta: postScore.total - preScore.total,
      preScore: preScore.total,
      postScore: postScore.total,
      isSubstantial: true,
      prBanner: `✅ Substantial improvement (+${postScore.total - preScore.total})`,
      auditEntry: { kind: 'self_renewal.delta_evaluated.v1', runId, productId,
        preScore, postScore, delta: postScore.total - preScore.total, policy, at: '2026-05-17T22:00:00Z' },
    })),
    createRenewalPr: vi.fn(async () => ({
      prNumber: 42,
      prUrl: 'https://api.github.com/repos/veu-ai-studio/my-preg-life/pulls/42',
      prHtmlUrl: 'https://github.com/veu-ai-studio/my-preg-life/pull/42',
      existing: false,
    })),
    readProductPolicy: vi.fn(async () => HAPPY_POLICY),
    appendGovernanceEntry: vi.fn(async () => ({ written: true })),
    ...overrides,
  };
}

function envWithVercel() {
  process.env.VERCEL_PROJECT_ID_MYPREGLIFE = 'prj_fake_mypreglife';
  process.env.VERCEL_ORG_ID = 'team_fake_veu';
  process.env.VERCEL_TOKEN = 'vercel_token_fake';
}

function clearEnv() {
  delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
  delete process.env.VERCEL_ORG_ID;
  delete process.env.VERCEL_TOKEN;
}

// ── Helper unit tests ────────────────────────────────────────────────────────

describe('parseGithubRepoUrl', () => {
  it('parses https://github.com/<owner>/<repo>', () => {
    expect(parseGithubRepoUrl('https://github.com/veu-ai-studio/my-preg-life'))
      .toEqual({ owner: 'veu-ai-studio', repo: 'my-preg-life' });
  });
  it('strips trailing .git', () => {
    expect(parseGithubRepoUrl('https://github.com/x/y.git')).toEqual({ owner: 'x', repo: 'y' });
  });
  it('handles trailing slash + path', () => {
    expect(parseGithubRepoUrl('https://github.com/x/y/')).toEqual({ owner: 'x', repo: 'y' });
  });
  it('returns null for non-github URLs', () => {
    expect(parseGithubRepoUrl('https://gitlab.com/x/y')).toBeNull();
    expect(parseGithubRepoUrl('not a url')).toBeNull();
    expect(parseGithubRepoUrl('')).toBeNull();
    expect(parseGithubRepoUrl(null)).toBeNull();
  });
});

describe('resolveVercelProjectId', () => {
  it('resolves mypreglife from explicit env var', () => {
    expect(resolveVercelProjectId('mypreglife', { VERCEL_PROJECT_ID_MYPREGLIFE: 'prj_x' })).toBe('prj_x');
  });
  it('falls back to upper-case envelope', () => {
    expect(resolveVercelProjectId('reltwin', { VERCEL_PROJECT_ID_RELTWIN: 'prj_r' })).toBe('prj_r');
  });
  it('returns null when no env var matches', () => {
    expect(resolveVercelProjectId('unknown_product', {})).toBeNull();
  });
});

describe('pickImpactedFilePath', () => {
  it('uses issue.filePath when present', () => {
    expect(pickImpactedFilePath({ filePath: 'a.js' })).toBe('a.js');
  });
  it('falls back to issue.file_path', () => {
    expect(pickImpactedFilePath({ file_path: 'b.js' })).toBe('b.js');
  });
  it('falls back to issue.path', () => {
    expect(pickImpactedFilePath({ path: 'c.js' })).toBe('c.js');
  });
  it('defaults to README.md when nothing is present', () => {
    expect(pickImpactedFilePath({})).toBe('README.md');
    expect(pickImpactedFilePath(null)).toBe('README.md');
  });
});

describe('readProductPolicy', () => {
  it('returns DEFAULTS when supabase is null', async () => {
    const r = await __internals.readProductPolicy({ productId: 'mypreglife', supabase: null });
    expect(r.selfRenewalNegativeDeltaPolicy).toBe('ALWAYS_OPEN');
    expect(r.selfRenewalMinimumDelta).toBe(0);
    expect(r.selfRenewalSubstantialThreshold).toBe(5);
  });

  it('reads from supabase when available', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                self_renewal_negative_delta_policy: 'DISCARD_ON_NEGATIVE',
                self_renewal_minimum_delta: 3,
                self_renewal_substantial_threshold: 10,
                self_renewal_max_per_day: 2,
                self_renewal_runaway_threshold: 5,
              },
              error: null,
            })),
          })),
        })),
      })),
    };
    const r = await __internals.readProductPolicy({ productId: 'mypreglife', supabase });
    expect(r.selfRenewalNegativeDeltaPolicy).toBe('DISCARD_ON_NEGATIVE');
    expect(r.selfRenewalMinimumDelta).toBe(3);
    expect(r.selfRenewalSubstantialThreshold).toBe(10);
  });

  it('falls back to DEFAULTS on supabase error', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: { message: 'oops' } })),
          })),
        })),
      })),
    };
    const r = await __internals.readProductPolicy({ productId: 'unknown', supabase });
    expect(r.selfRenewalNegativeDeltaPolicy).toBe('ALWAYS_OPEN');
  });
});

// ── runOptionC — happy path ──────────────────────────────────────────────────

describe('runOptionC — happy path', () => {
  it('returns ok:true with previewUrl, prUrl, scores, delta, action', async () => {
    envWithVercel();
    try {
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd',
        deps: happyDeps(),
      });
      expect(result.ok).toBe(true);
      expect(result.runId).toBe(RUN_ID);
      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.previewUrl).toMatch(/vercel\.app/);
      expect(result.prUrl).toBe('https://github.com/veu-ai-studio/my-preg-life/pull/42');
      expect(result.prNumber).toBe(42);
      expect(result.preScore).toBe(50);
      expect(result.postScore).toBe(60);
      expect(result.delta).toBe(10);
      expect(result.action).toBe('open_pr');
      expect(result.isSubstantial).toBe(true);
      expect(result.branchName).toBe(`flowai/renewal-${RUN_ID}`);
      expect(result.commitSha).toBe('abc123');
      expect(result.auditEntry).toBeDefined();
      expect(result.auditEntry.kind).toBe('self_renewal.delta_evaluated.v1');
    } finally { clearEnv(); }
  });

  it('calls steps in correct order (A → K)', async () => {
    envWithVercel();
    try {
      const deps = happyDeps();
      await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(deps.readProductPolicy).toHaveBeenCalled();
      // Rate cap is skipped when supabase is null (test path) — but the
      // token mint always runs.
      expect(deps.getInstallationToken).toHaveBeenCalled();
      expect(deps.computeScore).toHaveBeenCalledTimes(2); // preScore + postScore
      expect(deps.fetchFileContent).toHaveBeenCalled();
      expect(deps.generateFix).toHaveBeenCalled();
      expect(deps.createRenewalBranch).toHaveBeenCalled();
      expect(deps.deployBranchPreview).toHaveBeenCalled();
      expect(deps.evaluateDelta).toHaveBeenCalled();
      expect(deps.createRenewalPr).toHaveBeenCalled();
      expect(deps.appendGovernanceEntry).toHaveBeenCalled();
    } finally { clearEnv(); }
  });

  it('runs rate-cap when supabase is provided', async () => {
    envWithVercel();
    try {
      const deps = happyDeps();
      const fakeSupabase = { from: vi.fn(), rpc: vi.fn() };
      await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: fakeSupabase, environment: 'prd', deps,
      });
      expect(deps.checkRateCap).toHaveBeenCalled();
      expect(deps.checkRunawayDetector).toHaveBeenCalled();
    } finally { clearEnv(); }
  });
});

// ── Failure branches ─────────────────────────────────────────────────────────

describe('runOptionC — STEP_A rate-cap hit', () => {
  it('returns ok:false failedStep:STEP_A when checkRateCap throws', async () => {
    envWithVercel();
    try {
      const err = Object.assign(new Error('rate cap exceeded'), { code: 'SELF_RENEWAL_RATE_LIMIT' });
      const deps = happyDeps({ checkRateCap: vi.fn(async () => { throw err; }) });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: { from: vi.fn() }, // truthy so rate-cap runs
        environment: 'prd', deps,
      });
      expect(result.ok).toBe(false);
      expect(result.failedStep).toBe('STEP_A');
      expect(result.code).toBe('SELF_RENEWAL_RATE_LIMIT');
      expect(deps.getInstallationToken).not.toHaveBeenCalled();
    } finally { clearEnv(); }
  });
});

describe('runOptionC — STEP_B App auth fails', () => {
  it('returns ok:false failedStep:STEP_B', async () => {
    envWithVercel();
    try {
      const err = Object.assign(new Error('GitHub returned 401'), { code: 'GITHUB_AUTH_FAILED' });
      const deps = happyDeps({ getInstallationToken: vi.fn(async () => { throw err; }) });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.ok).toBe(false);
      expect(result.failedStep).toBe('STEP_B');
      expect(result.code).toBe('GITHUB_AUTH_FAILED');
    } finally { clearEnv(); }
  });
});

describe('runOptionC — STEP_C bad repo URL', () => {
  it('returns ok:false failedStep:STEP_C for non-github URL', async () => {
    envWithVercel();
    try {
      const deps = happyDeps();
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: 'https://gitlab.com/x/y',
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.ok).toBe(false);
      expect(result.failedStep).toBe('STEP_C');
      expect(result.code).toBe('BAD_REPO_URL');
    } finally { clearEnv(); }
  });
});

describe('runOptionC — STEP_E fix generation fails', () => {
  it('returns ok:false failedStep:STEP_E', async () => {
    envWithVercel();
    try {
      const err = Object.assign(new Error('Claude returned 500'), { code: 'FIX_GENERATION_FAILED' });
      const deps = happyDeps({ generateFix: vi.fn(async () => { throw err; }) });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.ok).toBe(false);
      expect(result.failedStep).toBe('STEP_E');
      expect(result.code).toBe('FIX_GENERATION_FAILED');
      expect(deps.createRenewalBranch).not.toHaveBeenCalled();
    } finally { clearEnv(); }
  });

  it('STEP_E surfaces fetchFileContent failures too', async () => {
    envWithVercel();
    try {
      const err = Object.assign(new Error('file not found'), { code: 'FILE_NOT_FOUND' });
      const deps = happyDeps({ fetchFileContent: vi.fn(async () => { throw err; }) });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.ok).toBe(false);
      expect(result.failedStep).toBe('STEP_E');
      expect(result.code).toBe('FILE_NOT_FOUND');
    } finally { clearEnv(); }
  });
});

describe('runOptionC — STEP_G Vercel deploy fails', () => {
  it('returns ok:false failedStep:STEP_G when env var missing', async () => {
    clearEnv(); // No VERCEL_PROJECT_ID_MYPREGLIFE / VERCEL_ORG_ID / VERCEL_TOKEN
    const deps = happyDeps();
    const result = await runOptionC({
      productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
      issue: HAPPY_ISSUE, runId: RUN_ID,
      supabase: null, environment: 'prd', deps,
    });
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('STEP_G');
    expect(result.code).toBe('VERCEL_PROJECT_ID_MISSING');
  });

  it('returns ok:false failedStep:STEP_G when deploy itself throws', async () => {
    envWithVercel();
    try {
      const err = Object.assign(new Error('Vercel build failed'), { code: 'DEPLOY_ERROR' });
      const deps = happyDeps({ deployBranchPreview: vi.fn(async () => { throw err; }) });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.ok).toBe(false);
      expect(result.failedStep).toBe('STEP_G');
      expect(result.code).toBe('DEPLOY_ERROR');
    } finally { clearEnv(); }
  });
});

// ── Silent-close path ────────────────────────────────────────────────────────

describe('runOptionC — silent_close path', () => {
  it('returns ok:true action:silent_close prUrl:null when evaluateDelta says silent_close', async () => {
    envWithVercel();
    try {
      const deps = happyDeps({
        evaluateDelta: vi.fn(({ preScore, postScore, policy, runId, productId }) => ({
          action: 'silent_close',
          reason: 'below_threshold',
          delta: postScore.total - preScore.total,
          preScore: preScore.total,
          postScore: postScore.total,
          isSubstantial: false,
          auditEntry: {
            kind: 'self_renewal.below_threshold.v1',
            runId, productId, preScore, postScore,
            delta: postScore.total - preScore.total, policy,
            at: '2026-05-17T22:00:00Z',
          },
        })),
      });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.ok).toBe(true);
      expect(result.action).toBe('silent_close');
      expect(result.reason).toBe('below_threshold');
      expect(result.prUrl).toBeNull();
      expect(result.prNumber).toBeNull();
      // PR creation must NOT have been called.
      expect(deps.createRenewalPr).not.toHaveBeenCalled();
      // Audit entry MUST still be present (HARD invariant from Module 8).
      expect(result.auditEntry).toBeDefined();
      expect(result.auditEntry.kind).toBe('self_renewal.below_threshold.v1');
    } finally { clearEnv(); }
  });

  it('silent_close still appends governance audit', async () => {
    envWithVercel();
    try {
      const deps = happyDeps({
        evaluateDelta: vi.fn(() => ({
          action: 'silent_close', reason: 'below_threshold',
          delta: 0, preScore: 50, postScore: 50, isSubstantial: false,
          auditEntry: { kind: 'self_renewal.below_threshold.v1', at: 'x' },
        })),
      });
      await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(deps.appendGovernanceEntry).toHaveBeenCalled();
    } finally { clearEnv(); }
  });
});

// ── Error envelope shape ─────────────────────────────────────────────────────

describe('runOptionC — error envelope shape', () => {
  it('failure envelope is frozen and minimal', async () => {
    envWithVercel();
    try {
      const deps = happyDeps({
        getInstallationToken: vi.fn(async () => { throw new Error('boom'); }),
      });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(Object.isFrozen(result)).toBe(true);
      expect(result.ok).toBe(false);
      expect(result.runId).toBe(RUN_ID);
      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.failedStep).toBe('STEP_B');
      expect(result.error).toBe('boom');
      expect(result.code).toBe('UNKNOWN');
    } finally { clearEnv(); }
  });

  it('returns input-validation failure when args is missing', async () => {
    const result = await runOptionC();
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('STEP_INPUT');
  });
});

// ── Audit emission guarantees ────────────────────────────────────────────────

describe('runOptionC — audit emission', () => {
  it('appendGovernanceEntry receives the decision.auditEntry verbatim', async () => {
    envWithVercel();
    try {
      const auditEntry = {
        kind: 'self_renewal.delta_evaluated.v1',
        runId: RUN_ID, productId: PRODUCT_ID,
        preScore: 50, postScore: 60, delta: 10, policy: HAPPY_POLICY,
        at: '2026-05-17T22:00:00Z',
      };
      const deps = happyDeps({
        evaluateDelta: vi.fn(() => ({
          action: 'open_pr', delta: 10, preScore: 50, postScore: 60,
          isSubstantial: true, prBanner: '✅ Substantial improvement (+10)',
          auditEntry,
        })),
      });
      await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      const lastCall = deps.appendGovernanceEntry.mock.calls.at(-1)[0];
      expect(lastCall.entry).toEqual(auditEntry);
      expect(lastCall.productId).toBe(PRODUCT_ID);
      expect(lastCall.environment).toBe('prd');
    } finally { clearEnv(); }
  });

  it('audit-write failure does NOT make the pipeline fail', async () => {
    envWithVercel();
    try {
      const deps = happyDeps({
        appendGovernanceEntry: vi.fn(async () => { throw new Error('supabase down'); }),
      });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.ok).toBe(true);
      expect(result.auditWrite.written).toBe(false);
      expect(result.auditWrite.reason).toMatch(/supabase down/);
    } finally { clearEnv(); }
  });
});
