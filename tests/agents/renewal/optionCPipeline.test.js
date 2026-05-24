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
  it('resolves any productId from uniform UPPER_SNAKE env var (zero hardcoded names — D40)', () => {
    expect(resolveVercelProjectId('mypreglife', { VERCEL_PROJECT_ID_MYPREGLIFE: 'prj_x' })).toBe('prj_x');
    expect(resolveVercelProjectId('saige',      { VERCEL_PROJECT_ID_SAIGE: 'prj_s' })).toBe('prj_s');
    expect(resolveVercelProjectId('reltwin',    { VERCEL_PROJECT_ID_RELTWIN: 'prj_r' })).toBe('prj_r');
    expect(resolveVercelProjectId('reachsms',   { VERCEL_PROJECT_ID_REACHSMS: 'prj_rs' })).toBe('prj_rs');
    expect(resolveVercelProjectId('pressai',    { VERCEL_PROJECT_ID_PRESSAI: 'prj_p' })).toBe('prj_p');
    expect(resolveVercelProjectId('flowai',     { VERCEL_PROJECT_ID_FLOWAI: 'prj_f' })).toBe('prj_f');
    // Brand-new product — works without any code change.
    expect(resolveVercelProjectId('brand-new', { VERCEL_PROJECT_ID_BRAND_NEW: 'prj_n' })).toBe('prj_n');
  });
  it('returns null when no env var matches', () => {
    expect(resolveVercelProjectId('unknown_product', {})).toBeNull();
  });
  // D40 — registry row takes precedence over env-var fallback.
  it('product.vercel_project_id takes precedence over env-var fallback', () => {
    expect(resolveVercelProjectId('any', { VERCEL_PROJECT_ID_ANY: 'env_value' },
      { vercel_project_id: 'registry_value' },
    )).toBe('registry_value');
  });
  it('falls through to env when registry row has empty vercel_project_id', () => {
    expect(resolveVercelProjectId('mypreglife', { VERCEL_PROJECT_ID_MYPREGLIFE: 'env_v' },
      { vercel_project_id: '' },
    )).toBe('env_v');
  });
  it('falls through to env when product arg is null', () => {
    expect(resolveVercelProjectId('mypreglife', { VERCEL_PROJECT_ID_MYPREGLIFE: 'env_v' }, null)).toBe('env_v');
  });
});

// D40 — generic onboarding helper.
describe('ensureProductSsotRow (D40 generic onboarding)', () => {
  function makeFake({ rows = [] } = {}) {
    const state = { rows: [...rows], inserts: [] };
    const fake = {
      _state: state,
      from: () => {
        const q = {
          _filters: [], _insertBody: null,
          select: vi.fn(() => q),
          eq(k, v) { q._filters.push({ k, v }); return q; },
          async maybeSingle() {
            const found = state.rows.find((r) => q._filters.every((f) => r[f.k] === f.v));
            return { data: found ?? null, error: null };
          },
          insert(body) { q._insertBody = body; return q; },
          single: vi.fn(async () => {
            if (q._insertBody) {
              const row = { id: `id-${state.rows.length + 1}`, ...q._insertBody };
              state.rows.push(row);
              state.inserts.push(q._insertBody);
              return { data: row, error: null };
            }
            return { data: null, error: { message: 'no_insert' } };
          }),
        };
        return q;
      },
    };
    return fake;
  }

  it('returns reason:supabase_unavailable when supabase null', async () => {
    const r = await __internals.ensureProductSsotRow({ productId: 'p', environment: 'prd', supabase: null });
    expect(r.created).toBe(false);
    expect(r.reason).toBe('supabase_unavailable');
  });

  it('returns reason:bad_args on missing productId or environment', async () => {
    const fake = makeFake();
    expect((await __internals.ensureProductSsotRow({ productId: '', environment: 'prd', supabase: fake })).reason).toBe('bad_args');
    expect((await __internals.ensureProductSsotRow({ productId: 'p', environment: '', supabase: fake })).reason).toBe('bad_args');
  });

  it('returns created:false reason:already_exists when row is present', async () => {
    const fake = makeFake({ rows: [{ id: 'existing-1', product_id: 'p', environment: 'prd' }] });
    const r = await __internals.ensureProductSsotRow({ productId: 'p', environment: 'prd', supabase: fake });
    expect(r.created).toBe(false);
    expect(r.reason).toBe('already_exists');
    expect(r.id).toBe('existing-1');
    // No insert was made.
    expect(fake._state.inserts).toHaveLength(0);
  });

  it('auto-creates the row when absent — first-run flow', async () => {
    const fake = makeFake({ rows: [] });
    const r = await __internals.ensureProductSsotRow({
      productId: 'brand-new', environment: 'prd', supabase: fake,
      identity: { productName: 'Brand New', productUrl: 'https://x', ownerProviderOrgId: 'org' },
    });
    expect(r.created).toBe(true);
    expect(typeof r.id).toBe('string');
    expect(fake._state.inserts).toHaveLength(1);
    const payload = fake._state.inserts[0];
    expect(payload.product_id).toBe('brand-new');
    expect(payload.environment).toBe('prd');
    expect(payload.identity_block.productName).toBe('Brand New');
    expect(payload.identity_block.productUrl).toBe('https://x');
    expect(payload.identity_block.ownerProviderOrgId).toBe('org');
    expect(payload.identity_block.createdBy.userId).toBe('system');
  });

  it('defaults productName to productId + nulls when identity overlay omitted', async () => {
    const fake = makeFake({ rows: [] });
    const r = await __internals.ensureProductSsotRow({ productId: 'minimal', environment: 'prd', supabase: fake });
    expect(r.created).toBe(true);
    const payload = fake._state.inserts[0];
    expect(payload.identity_block.productName).toBe('minimal');
    expect(payload.identity_block.productUrl).toBe(null);
    expect(payload.identity_block.ownerProviderOrgId).toBe(null);
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
    expect(r.selfRenewalMaxPerDay).toBe(1000);
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

  // DISPATCH 28 P0-5: §7 Output Contract #5 incompleteness signal.
  it('exposes runIncomplete signal when audit-write fails (§7 #5)', async () => {
    envWithVercel();
    try {
      const deps = happyDeps({
        appendGovernanceEntry: vi.fn(async () => ({
          written: false, reason: 'cas_conflict', attempts: 3,
          rollback: async () => ({ rolled: true }),
        })),
      });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.ok).toBe(true);                              // existing contract preserved
      expect(result.runIncomplete).not.toBeNull();
      expect(result.runIncomplete.reason).toBe('cas_conflict');
      expect(typeof result.runIncomplete.rollback).toBe('function');
    } finally { clearEnv(); }
  });

  it('runIncomplete is null when audit-write succeeds', async () => {
    envWithVercel();
    try {
      const deps = happyDeps({
        appendGovernanceEntry: vi.fn(async () => ({ written: true, attempts: 1 })),
      });
      const result = await runOptionC({
        productId: PRODUCT_ID, githubRepoUrl: REPO_URL,
        issue: HAPPY_ISSUE, runId: RUN_ID,
        supabase: null, environment: 'prd', deps,
      });
      expect(result.runIncomplete).toBeNull();
    } finally { clearEnv(); }
  });
});

// ── DISPATCH 28 P0-5: atomic ProductSSOT write primitive ────────────────

describe('withAtomicSsotWrite — snapshot + CAS + rollback', () => {
  // Lightweight in-memory Supabase fake that supports the exact query
  // chain the primitive uses: from(table).select(cols).eq(k,v).eq(k,v).maybeSingle()
  // and from(table).update(fields).eq(k,v).eq(k,v).select(cols).
  function makeFake({ initialRow }) {
    const state = { row: { ...initialRow } };
    return {
      _state: state,
      from: () => makeQuery(state),
    };
  }
  function makeQuery(state) {
    const q = {
      _filters: [],
      _select: '*',
      _update: null,
      _selectAfter: null,
      select(cols) { q._select = cols; return q; },
      update(fields) { q._update = fields; return q; },
      eq(k, v) { q._filters.push({ k, v }); return q; },
      async maybeSingle() {
        const r = state.row;
        if (!r) return { data: null, error: null };
        for (const f of q._filters) {
          if (r[f.k] !== f.v) return { data: null, error: null };
        }
        return { data: { ...r }, error: null };
      },
    };
    // Chain finalizers — calling `select(cols)` after update returns the affected rows.
    const origSelect = q.select;
    q.select = function(cols) {
      if (q._update !== null) {
        // Apply update with the accumulated filters and return affected rows.
        const r = state.row;
        if (!r) return Promise.resolve({ data: [], error: null });
        for (const f of q._filters) {
          if (r[f.k] !== f.v) return Promise.resolve({ data: [], error: null });
        }
        Object.assign(state.row, q._update);
        return Promise.resolve({ data: [{ id: r.id }], error: null });
      }
      return origSelect.call(q, cols);
    };
    return q;
  }

  it('happy path: snapshot → mutate → CAS update succeeds', async () => {
    const fake = makeFake({
      initialRow: {
        id: 1, product_id: 'mypreglife', environment: 'prd',
        governance_record: [{ a: 1 }], updated_at: 'T0',
      },
    });
    const res = await __internals.withAtomicSsotWrite({
      productId: 'mypreglife', environment: 'prd', supabase: fake,
      fields: ['governance_record'],
      mutate: (prior) => ({ governance_record: [...prior.governance_record, { a: 2 }] }),
    });
    expect(res.written).toBe(true);
    expect(res.attempts).toBe(1);
    expect(res.snapshot).toEqual({ governance_record: [{ a: 1 }] });
    expect(fake._state.row.governance_record).toEqual([{ a: 1 }, { a: 2 }]);
    expect(fake._state.row.updated_at).not.toBe('T0');           // CAS bumped updated_at
    expect(typeof res.rollback).toBe('function');
  });

  it('rollback restores the snapshot state', async () => {
    const fake = makeFake({
      initialRow: {
        id: 1, product_id: 'mypreglife', environment: 'prd',
        governance_record: [{ a: 1 }], updated_at: 'T0',
      },
    });
    const res = await __internals.withAtomicSsotWrite({
      productId: 'mypreglife', environment: 'prd', supabase: fake,
      fields: ['governance_record'],
      mutate: (prior) => ({ governance_record: [...prior.governance_record, { a: 99 }] }),
    });
    expect(res.written).toBe(true);
    expect(fake._state.row.governance_record).toEqual([{ a: 1 }, { a: 99 }]);
    const r = await res.rollback();
    expect(r.rolled).toBe(true);
    expect(fake._state.row.governance_record).toEqual([{ a: 1 }]);
  });

  it('CAS conflict: stale updated_at triggers retry with fresh snapshot', async () => {
    // First .update returns 0 rows (CAS conflict); second succeeds.
    const fake = makeFake({
      initialRow: {
        id: 1, product_id: 'mypreglife', environment: 'prd',
        governance_record: [{ a: 1 }], updated_at: 'T0',
      },
    });
    let casCalls = 0;
    const origFrom = fake.from;
    fake.from = () => {
      const q = origFrom();
      const origSelect = q.select;
      q.select = function(cols) {
        if (this._update !== null) {
          casCalls += 1;
          if (casCalls === 1) {
            return Promise.resolve({ data: [], error: null }); // CAS conflict
          }
        }
        return origSelect.call(this, cols);
      };
      return q;
    };
    const res = await __internals.withAtomicSsotWrite({
      productId: 'mypreglife', environment: 'prd', supabase: fake,
      fields: ['governance_record'],
      mutate: (prior) => ({ governance_record: [...prior.governance_record, { a: 2 }] }),
      options: { maxRetries: 3, backoffMs: 0 },
    });
    expect(res.written).toBe(true);
    expect(res.attempts).toBe(2);                                  // 1 conflict + 1 success
  });

  it('CAS conflict beyond maxRetries → written:false, reason:"cas_conflict"', async () => {
    const fake = makeFake({
      initialRow: {
        id: 1, product_id: 'mypreglife', environment: 'prd',
        governance_record: [], updated_at: 'T0',
      },
    });
    const origFrom = fake.from;
    fake.from = () => {
      const q = origFrom();
      const origSelect = q.select;
      q.select = function(cols) {
        if (this._update !== null) {
          return Promise.resolve({ data: [], error: null }); // always conflicts
        }
        return origSelect.call(this, cols);
      };
      return q;
    };
    const res = await __internals.withAtomicSsotWrite({
      productId: 'mypreglife', environment: 'prd', supabase: fake,
      fields: ['governance_record'],
      mutate: (prior) => ({ governance_record: [...(prior.governance_record ?? []), { a: 1 }] }),
      options: { maxRetries: 2, backoffMs: 0 },
    });
    expect(res.written).toBe(false);
    expect(res.reason).toBe('cas_conflict');
    expect(res.attempts).toBe(2);
    expect(typeof res.rollback).toBe('function');
  });

  it('returns "no_product_ssot_row" when the row is absent', async () => {
    const fake = makeFake({ initialRow: null });
    const res = await __internals.withAtomicSsotWrite({
      productId: 'unknown', environment: 'prd', supabase: fake,
      mutate: () => ({ governance_record: [] }),
    });
    expect(res.written).toBe(false);
    expect(res.reason).toBe('no_product_ssot_row');
    expect(res.attempts).toBe(1);
  });

  it('returns "supabase_unavailable" when supabase is null', async () => {
    const res = await __internals.withAtomicSsotWrite({
      productId: 'mypreglife', environment: 'prd', supabase: null,
      mutate: () => ({ governance_record: [] }),
    });
    expect(res.written).toBe(false);
    expect(res.reason).toBe('supabase_unavailable');
  });

  it('returns "bad_mutate_fn" when mutate is missing', async () => {
    const fake = makeFake({ initialRow: { id: 1, product_id: 'p', environment: 'prd', updated_at: 'T0' } });
    const res = await __internals.withAtomicSsotWrite({
      productId: 'p', environment: 'prd', supabase: fake,
    });
    expect(res.written).toBe(false);
    expect(res.reason).toBe('bad_mutate_fn');
  });

  it('mutate throwing → written:false with reason captured', async () => {
    const fake = makeFake({
      initialRow: { id: 1, product_id: 'p', environment: 'prd', governance_record: [], updated_at: 'T0' },
    });
    const res = await __internals.withAtomicSsotWrite({
      productId: 'p', environment: 'prd', supabase: fake,
      fields: ['governance_record'],
      mutate: () => { throw new Error('boom'); },
    });
    expect(res.written).toBe(false);
    expect(res.reason).toMatch(/^mutate_threw:.*boom/);
  });

  it('captures multiple jsonb fields when requested', async () => {
    const fake = makeFake({
      initialRow: {
        id: 1, product_id: 'p', environment: 'prd',
        governance_record: [{ g: 1 }], delta_log: [{ d: 1 }],
        updated_at: 'T0',
      },
    });
    const res = await __internals.withAtomicSsotWrite({
      productId: 'p', environment: 'prd', supabase: fake,
      fields: ['governance_record', 'delta_log'],
      mutate: (prior) => ({
        governance_record: [...prior.governance_record, { g: 2 }],
        delta_log: [...prior.delta_log, { d: 2 }],
      }),
    });
    expect(res.written).toBe(true);
    expect(res.snapshot).toEqual({ governance_record: [{ g: 1 }], delta_log: [{ d: 1 }] });
    expect(fake._state.row.governance_record).toEqual([{ g: 1 }, { g: 2 }]);
    expect(fake._state.row.delta_log).toEqual([{ d: 1 }, { d: 2 }]);
  });

  it('fires onCommit hook after a successful CAS', async () => {
    const fake = makeFake({
      initialRow: { id: 1, product_id: 'p', environment: 'prd', governance_record: [], updated_at: 'T0' },
    });
    const onCommit = vi.fn(async () => undefined);
    const res = await __internals.withAtomicSsotWrite({
      productId: 'p', environment: 'prd', supabase: fake,
      fields: ['governance_record'],
      mutate: () => ({ governance_record: [{ a: 1 }] }),
      options: { onCommit },
    });
    expect(res.written).toBe(true);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit.mock.calls[0][0].rowId).toBe(1);
  });
});

describe('appendGovernanceEntry — atomic write via primitive', () => {
  function makeFake({ initialRow }) {
    const state = { row: { ...initialRow } };
    return {
      _state: state,
      from: () => {
        const q = {
          _filters: [], _select: '*', _update: null,
          select(cols) {
            if (q._update !== null) {
              const r = state.row;
              if (!r) return Promise.resolve({ data: [], error: null });
              for (const f of q._filters) {
                if (r[f.k] !== f.v) return Promise.resolve({ data: [], error: null });
              }
              Object.assign(state.row, q._update);
              return Promise.resolve({ data: [{ id: r.id }], error: null });
            }
            q._select = cols; return q;
          },
          update(fields) { q._update = fields; return q; },
          eq(k, v) { q._filters.push({ k, v }); return q; },
          async maybeSingle() {
            const r = state.row;
            if (!r) return { data: null, error: null };
            for (const f of q._filters) {
              if (r[f.k] !== f.v) return { data: null, error: null };
            }
            return { data: { ...r }, error: null };
          },
        };
        return q;
      },
    };
  }

  it('appends an entry atomically to governance_record', async () => {
    const fake = makeFake({
      initialRow: {
        id: 1, product_id: 'mypreglife', environment: 'prd',
        governance_record: [{ kind: 'old' }], updated_at: 'T0',
      },
    });
    const result = await __internals.appendGovernanceEntry({
      productId: 'mypreglife', environment: 'prd', supabase: fake,
      entry: { kind: 'new' },
    });
    expect(result.written).toBe(true);
    expect(fake._state.row.governance_record).toEqual([{ kind: 'old' }, { kind: 'new' }]);
  });

  it('returns supabase_unavailable when supabase is null', async () => {
    const result = await __internals.appendGovernanceEntry({
      productId: 'mypreglife', environment: 'prd', supabase: null,
      entry: { kind: 'x' },
    });
    expect(result.written).toBe(false);
    expect(result.reason).toBe('supabase_unavailable');
    expect(typeof result.rollback).toBe('function');
  });
});

describe('appendDeltaLogEntry — atomic write to delta_log (§7.5)', () => {
  function makeFake({ initialRow }) {
    const state = { row: { ...initialRow } };
    return {
      _state: state,
      from: () => {
        const q = {
          _filters: [], _select: '*', _update: null,
          select(cols) {
            if (q._update !== null) {
              const r = state.row;
              if (!r) return Promise.resolve({ data: [], error: null });
              for (const f of q._filters) {
                if (r[f.k] !== f.v) return Promise.resolve({ data: [], error: null });
              }
              Object.assign(state.row, q._update);
              return Promise.resolve({ data: [{ id: r.id }], error: null });
            }
            q._select = cols; return q;
          },
          update(fields) { q._update = fields; return q; },
          eq(k, v) { q._filters.push({ k, v }); return q; },
          async maybeSingle() {
            const r = state.row;
            if (!r) return { data: null, error: null };
            for (const f of q._filters) {
              if (r[f.k] !== f.v) return { data: null, error: null };
            }
            return { data: { ...r }, error: null };
          },
        };
        return q;
      },
    };
  }

  it('appends an entry atomically to delta_log', async () => {
    const fake = makeFake({
      initialRow: {
        id: 1, product_id: 'mypreglife', environment: 'prd',
        delta_log: [], updated_at: 'T0',
      },
    });
    const result = await __internals.appendDeltaLogEntry({
      productId: 'mypreglife', environment: 'prd', supabase: fake,
      entry: { entryId: 'e1', at: 'now', triggeredBy: 'agent3_self_renewal' },
    });
    expect(result.written).toBe(true);
    expect(fake._state.row.delta_log).toHaveLength(1);
    expect(fake._state.row.delta_log[0].triggeredBy).toBe('agent3_self_renewal');
  });

  it('returns supabase_unavailable when supabase is null', async () => {
    const result = await __internals.appendDeltaLogEntry({
      productId: 'p', environment: 'prd', supabase: null,
      entry: { entryId: 'x' },
    });
    expect(result.written).toBe(false);
    expect(result.reason).toBe('supabase_unavailable');
  });
});
