/**
 * FlowAI Orchestrator — 14-step Self-Renewal pipeline with repeat-until-
 * GTM-ready outer loop, auto/guided/manual modes, and stop/resume/
 * switchMode controls.
 *
 * Drives the full Phase A loop:
 *   crawl → score → fix → branch → preview → re-score → decide → repeat
 *
 * Real scoring path enabled by:
 *   - monitorTextProducer.js (DISPATCH 22 FIX 2) — produces real Monitor text
 *   - JWT TTL = 540s (DISPATCH 22 FIX 1) — token mint reliable
 *   - commitFileToBranch (DISPATCH 22 FIX 3) — multi-file commits to one branch
 *
 * Exit conditions (outer loop):
 *   - postScore.total >= gtmTarget                → GTM_READY
 *   - iterationNumber >= maxIterations            → MAX_ITERATIONS
 *   - delta <= 0 (no improvement this iteration)  → NO_IMPROVEMENT
 *   - user called stop() before next iteration    → USER_STOPPED
 *   - any step throws unrecoverably               → STEP_FAILED
 */

'use strict';

import { checkRateCap, checkRunawayDetector } from './rateCap.js';
import { getInstallationToken } from './githubApp.js';
import { produceMonitorText } from './monitorTextProducer.js';
import { computeScore } from './preScoreAdapter.js';
import { generateFix } from './fixGenerator.js';
import { createRenewalBranch, commitFileToBranch } from './githubBranchWriter.js';
import { deployBranchPreview } from './vercelBranchDeploy.js';
import { evaluateDelta } from './deltaPolicy.js';
import { createRenewalPr } from './githubPrWriter.js';
import {
  parseGithubRepoUrl,
  resolveVercelProjectId,
  fetchFileContent,
  readProductPolicy,
  appendGovernanceEntry,
} from './optionCPipeline.js';
import { aggressiveCrawl } from '../../../../api/_lib/crawler.js';
import { randomUUID } from 'node:crypto';

export const GTM_READY_SCORE = 95;
export const DEFAULT_MAX_ITERATIONS = 10;
export const STEP_NAMES = Object.freeze([
  'Product Discovery',
  'Rate Cap + Runaway Check',
  'Deep Crawl',
  'Adversarial Surface Testing',
  'Five-Layer Scoring (Pre-Fix)',
  'Issue Prioritization',
  'Multi-File Fix Generation',
  'Credential Acquisition',
  'Branch Creation + All Commits',
  'Vercel Preview Deploy',
  'Five-Layer Scoring (Post-Fix)',
  'GTM Readiness Decision',
  'Final PR Creation',
  'Audit Record',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStepLog({ iteration, step, status, tool, why, result, durationMs, scores, mode, canInterrupt }) {
  return Object.freeze({
    iteration,
    step,
    stepName: STEP_NAMES[step - 1] || `step_${step}`,
    tool,
    why,
    status,
    result: result ?? null,
    durationMs: durationMs ?? 0,
    canInterrupt: canInterrupt !== false,
    mode,
    scores: scores ?? null,
    at: new Date().toISOString(),
  });
}

function computeProgress({ originalScore, currentScore, target }) {
  if (!Number.isFinite(currentScore) || !Number.isFinite(originalScore)) return 0;
  // If already at or above target, progress is complete.
  if (currentScore >= target) return 100;
  const span = Math.max(1, target - originalScore);
  const moved = Math.max(0, currentScore - originalScore);
  return Math.min(100, Math.round((moved / span) * 100));
}

/**
 * Resolve the live (deployed) URL for a product. Phase A maps product_id
 * to the canonical Vercel preview URL. Phase B should store this in
 * product_registry.live_url; for now this is a static lookup matching
 * the 5 VEU products that have Vercel deployments.
 */
export function resolveLiveUrl(productId) {
  const MAP = {
    mypreglife: 'https://mypreglife-platform.vercel.app',
    reltwin:    'https://reltwin-platform.vercel.app',
    saige:      'https://saige-platform.vercel.app',
    reachsms:   'https://reachsms-platform.vercel.app',
    pressai:    'https://pressai-platform.vercel.app',
  };
  return MAP[productId] ?? null;
}

/**
 * Resolve a target product from product_registry by URL OR by picking the
 * single enabled product when url is null. Returns the registry row.
 */
async function discoverProduct({ url, supabase }) {
  if (!supabase || typeof supabase.from !== 'function') {
    // No DB — fallback to a sensible default (mypreglife is the Phase A target).
    if (url && url.includes('mypreglife')) {
      return {
        product_id: 'mypreglife',
        org_id: 'veu-ai-studio',
        github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life',
        self_renewal_enabled: true,
      };
    }
    return null;
  }
  // If a URL is provided, try to match by github_repo_url substring.
  if (url) {
    const { data } = await supabase
      .from('product_registry')
      .select('*')
      .or(`github_repo_url.ilike.%${url}%,product_id.ilike.%${url}%`)
      .maybeSingle();
    if (data) return data;
  }
  // No URL or no match — pick the first enabled product.
  const { data } = await supabase
    .from('product_registry')
    .select('*')
    .eq('self_renewal_enabled', true)
    .order('product_id', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ── Orchestrator class (encapsulates mode + stop/resume/switchMode state) ───

class OrchestrationState {
  constructor({ mode = 'auto', maxIterations = DEFAULT_MAX_ITERATIONS, gtmTarget = GTM_READY_SCORE }) {
    this.mode = mode;
    this.maxIterations = maxIterations;
    this.gtmTarget = gtmTarget;
    this._stopRequested = false;
    this._resumeResolver = null;
  }
  stop() { this._stopRequested = true; if (this._resumeResolver) this._resumeResolver(); }
  switchMode(newMode) {
    if (!['auto', 'guided', 'manual'].includes(newMode)) return false;
    this.mode = newMode;
    if (this._resumeResolver) this._resumeResolver();
    return true;
  }
  resume() { if (this._resumeResolver) this._resumeResolver(); }
  /** Wait at a checkpoint based on mode. AUTO continues; GUIDED + MANUAL pause until resume(). */
  async checkpoint(onCheckpoint, state) {
    if (typeof onCheckpoint === 'function') {
      try { onCheckpoint(state); } catch { /* swallow callback errors */ }
    }
    if (this.mode === 'auto') return;
    // GUIDED or MANUAL — wait for explicit resume.
    await new Promise((resolve) => { this._resumeResolver = resolve; });
    this._resumeResolver = null;
  }
}

// ── runOrchestration — the public entry point ───────────────────────────────

/**
 * @param {object} args
 * @param {string|null} args.url       — any URL; null → pick from product_registry
 * @param {'auto'|'guided'|'manual'} [args.mode='auto']
 * @param {string} [args.runId]        — UUID; auto-generated if absent
 * @param {object|null} [args.supabase]
 * @param {string} [args.environment='prd']
 * @param {number} [args.gtmTarget=95]
 * @param {number} [args.maxIterations=10]
 * @param {(log) => void} [args.onStep]
 * @param {(state) => void} [args.onCheckpoint]
 * @param {(iter) => void} [args.onIteration]
 * @param {object} [args.deps]         — overridable injection point for tests
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   gtmReady: boolean,
 *   exitReason: string,
 *   originalScore: number, finalScore: number, totalDelta: number,
 *   iterationsCompleted: number,
 *   previewUrl: string|null, prUrl: string|null, prNumber: number|null,
 *   orchestrationLog: Array<object>,
 *   iterations: Array<object>,
 *   product: object|null, runId: string, mode: string,
 *   failedStep?: string, error?: string, code?: string,
 * }>}
 */
export async function runOrchestration(args = {}) {
  const mode = args.mode ?? 'auto';
  const gtmTarget = Number.isFinite(args.gtmTarget) ? args.gtmTarget : GTM_READY_SCORE;
  const maxIterations = Number.isFinite(args.maxIterations) ? args.maxIterations : DEFAULT_MAX_ITERATIONS;
  const runId = args.runId || randomUUID();
  const supabase = args.supabase ?? null;
  const environment = args.environment ?? 'prd';
  const onStep = typeof args.onStep === 'function' ? args.onStep : () => {};
  const onCheckpoint = typeof args.onCheckpoint === 'function' ? args.onCheckpoint : () => {};
  const onIteration = typeof args.onIteration === 'function' ? args.onIteration : () => {};
  const deps = args.deps || {};

  // Dep resolution (mockable for tests).
  const _discoverProduct        = deps.discoverProduct        || discoverProduct;
  const _checkRateCap           = deps.checkRateCap           || checkRateCap;
  const _checkRunawayDetector   = deps.checkRunawayDetector   || checkRunawayDetector;
  const _aggressiveCrawl        = deps.aggressiveCrawl        || aggressiveCrawl;
  const _produceMonitorText     = deps.produceMonitorText     || produceMonitorText;
  const _computeScore           = deps.computeScore           || computeScore;
  const _generateFix            = deps.generateFix            || generateFix;
  const _getInstallationToken   = deps.getInstallationToken   || getInstallationToken;
  const _fetchFileContent       = deps.fetchFileContent       || fetchFileContent;
  const _createRenewalBranch    = deps.createRenewalBranch    || createRenewalBranch;
  const _commitFileToBranch     = deps.commitFileToBranch     || commitFileToBranch;
  const _deployBranchPreview    = deps.deployBranchPreview    || deployBranchPreview;
  const _evaluateDelta          = deps.evaluateDelta          || evaluateDelta;
  const _createRenewalPr        = deps.createRenewalPr        || createRenewalPr;
  const _readProductPolicy      = deps.readProductPolicy      || readProductPolicy;
  const _appendGovernanceEntry  = deps.appendGovernanceEntry  || appendGovernanceEntry;

  const state = new OrchestrationState({ mode, maxIterations, gtmTarget });
  const orchestrationLog = [];
  const iterations = [];

  // Expose mutation surface back to the caller via the deps proxy.
  if (deps.__exposeState) deps.__exposeState(state);

  const emit = (log) => {
    orchestrationLog.push(log);
    try { onStep(log); } catch { /* swallow */ }
  };

  // ── STEP 1 — Product Discovery (iteration 1 only, then carry forward) ─────
  let product;
  try {
    const t0 = Date.now();
    product = await _discoverProduct({ url: args.url, supabase });
    if (!product || !product.github_repo_url) {
      const failLog = makeStepLog({
        iteration: 0, step: 1, status: 'failed',
        tool: 'product_registry + URL parser',
        why: 'identify which product this URL belongs to and load its configuration',
        result: { error: 'no_product_resolved', url: args.url },
        durationMs: Date.now() - t0, mode: state.mode, canInterrupt: false,
      });
      emit(failLog);
      return buildFailureReturn({
        runId, mode: state.mode, product, orchestrationLog, iterations,
        failedStep: 'STEP_1', error: 'no_product_resolved_from_url_or_registry',
        code: 'PRODUCT_NOT_FOUND',
      });
    }
    emit(makeStepLog({
      iteration: 0, step: 1, status: 'complete',
      tool: 'product_registry + URL parser',
      why: 'identify which product this URL belongs to and load its configuration',
      result: { productId: product.product_id, githubRepoUrl: product.github_repo_url },
      durationMs: Date.now() - t0, mode: state.mode,
    }));
  } catch (e) {
    return buildFailureReturn({ runId, mode: state.mode, product: null,
      orchestrationLog, iterations, failedStep: 'STEP_1',
      error: e?.message ?? String(e), code: e?.code ?? 'UNKNOWN' });
  }

  const productId = product.product_id;
  const githubRepoUrl = product.github_repo_url;
  // Prefer the explicit URL caller passed in; otherwise the LIVE deployed
  // URL (NOT the GitHub repo URL, which 404s on direct fetch). Falling
  // back to the repo URL is a last resort and almost certainly fails.
  const initialUrl = args.url || resolveLiveUrl(productId) || githubRepoUrl;

  const policy = await _readProductPolicy({ productId, supabase }).catch(() => null);

  // ── STEP 2 — Rate cap (iteration 1 only) ──────────────────────────────────
  try {
    const t0 = Date.now();
    if (supabase && typeof supabase.from === 'function' && policy) {
      await _checkRateCap({ productId, maxPerDay: policy.selfRenewalMaxPerDay, supabase });
      await _checkRunawayDetector({ productId, runawayThreshold: policy.selfRenewalRunawayThreshold, supabase });
    }
    emit(makeStepLog({
      iteration: 0, step: 2, status: supabase ? 'complete' : 'skipped',
      tool: 'rateCap.js',
      why: 'verify product has not exceeded daily renewal limit (iteration 1 only)',
      result: supabase ? { allowed: true } : { skipped: 'no_supabase_in_test_mode' },
      durationMs: Date.now() - t0, mode: state.mode,
    }));
  } catch (e) {
    emit(makeStepLog({
      iteration: 0, step: 2, status: 'failed',
      tool: 'rateCap.js', why: 'verify daily rate cap',
      result: { error: e?.message }, mode: state.mode,
    }));
    return buildFailureReturn({ runId, mode: state.mode, product,
      orchestrationLog, iterations, failedStep: 'STEP_2',
      error: e?.message ?? String(e), code: e?.code ?? 'RATE_LIMIT' });
  }

  // ── OUTER LOOP: repeat until GTM-ready / max iter / no improvement / stop ─
  let iterationNumber = 1;
  let currentUrl = initialUrl;
  let originalScore = null;
  let lastPostScore = null;
  let finalPreviewUrl = null;
  let pr = null;
  let exitReason = 'UNKNOWN';
  let token = null;

  outerLoop: while (iterationNumber <= maxIterations) {
    if (state._stopRequested) { exitReason = 'USER_STOPPED'; break; }

    const iterLog = { number: iterationNumber, steps: [] };

    // STEP 3 — Deep Crawl (Agent #21 multi-page BFS).
    let crawlReport;
    try {
      const t0 = Date.now();
      crawlReport = await _aggressiveCrawl(currentUrl, { depth: 3, maxPages: 50 });
      const log = makeStepLog({
        iteration: iterationNumber, step: 3, status: 'complete',
        tool: 'Agent #21 AggressiveCrawlConductor',
        why: 'comprehensive surface coverage: all pages, links, JS-rendered content',
        result: { pagesCrawled: crawlReport?.pagesCrawled ?? 0, depth: crawlReport?.depth ?? 0 },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      emit(makeStepLog({ iteration: iterationNumber, step: 3, status: 'failed',
        tool: 'Agent #21', why: 'deep crawl', result: { error: e?.message }, mode: state.mode }));
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_3',
        error: e?.message ?? String(e), code: e?.code ?? 'CRAWL_FAILED' });
    }
    await state.checkpoint(onCheckpoint, { lastStep: 3, iteration: iterationNumber });

    // STEP 4 — Adversarial Surface Testing (Phase A: stub — Phase B+ work).
    {
      const t0 = Date.now();
      const log = makeStepLog({
        iteration: iterationNumber, step: 4, status: 'skipped',
        tool: 'Agent #21 Phase 3 auth traversal',
        why: 'Phase A scope: surface testing (modals/chatbots/AI-agents/workspaces) deferred to Phase B Browserless wiring',
        result: { skipped: 'phase_b_capability' },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    }
    await state.checkpoint(onCheckpoint, { lastStep: 4, iteration: iterationNumber });

    // STEP 5 — Five-Layer Scoring (Pre-Fix).
    let preScoreEnvelope;
    try {
      const t0 = Date.now();
      const monitor = await _produceMonitorText({ url: currentUrl, productId, runId });
      preScoreEnvelope = await _computeScore({
        productId, url: currentUrl, runId, monitorText: monitor.monitorText,
      });
      if (originalScore === null) originalScore = preScoreEnvelope.total;
      const log = makeStepLog({
        iteration: iterationNumber, step: 5, status: 'complete',
        tool: 'monitorTextProducer + preScoreAdapter',
        why: 'establish current score before fixes — measures improvement',
        result: { preScore: preScoreEnvelope.total, layers: {
          l1: preScoreEnvelope.l1, l2: preScoreEnvelope.l2, l3: preScoreEnvelope.l3,
          l4: preScoreEnvelope.l4, l5: preScoreEnvelope.l5,
        }, label: preScoreEnvelope.label },
        durationMs: Date.now() - t0, mode: state.mode,
        scores: {
          original: originalScore, current: preScoreEnvelope.total,
          target: gtmTarget, progressPct: computeProgress({ originalScore, currentScore: preScoreEnvelope.total, target: gtmTarget }),
        },
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      emit(makeStepLog({ iteration: iterationNumber, step: 5, status: 'failed',
        tool: 'preScoreAdapter', why: 'pre-score', result: { error: e?.message }, mode: state.mode }));
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_5',
        error: e?.message ?? String(e), code: e?.code ?? 'SCORING_FAILED' });
    }
    await state.checkpoint(onCheckpoint, { lastStep: 5, iteration: iterationNumber });

    // STEP 6 — Issue Prioritization. Claude-powered (DISPATCH 23): given the
    // Five-Layer scores + product context + monitor text, Claude returns up
    // to 5 ranked issues with specific filePath/issue/fix/estimatedImpact.
    // Falls back to the score-derived heuristic if Claude fails or returns
    // unparseable output — never blocks the pipeline on prioritization.
    let prioritizedIssues;
    try {
      const t0 = Date.now();
      const claudeIssues = await prioritizeIssuesWithClaude({
        preScore: preScoreEnvelope, product, suppliedIssue: args.issue,
      }).catch(() => null);
      if (claudeIssues && claudeIssues.length > 0) {
        prioritizedIssues = claudeIssues;
      } else {
        // Fallback: heuristic single-issue
        prioritizedIssues = derivePrioritizedIssuesFromScore(preScoreEnvelope, product, args.issue);
      }
      const log = makeStepLog({
        iteration: iterationNumber, step: 6, status: 'complete',
        tool: claudeIssues
          ? 'Claude-powered prioritization (DISPATCH 23 upgrade)'
          : 'score-derived heuristic (Claude fallback failed)',
        why: 'rank issues by Five-Layer impact for max score improvement per iteration',
        result: {
          issueCount: prioritizedIssues.length,
          topIssue: prioritizedIssues[0]?.title ?? prioritizedIssues[0]?.issue,
          files: prioritizedIssues.map((i) => i.filePath).filter(Boolean),
          source: claudeIssues ? 'claude' : 'heuristic',
        },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      emit(makeStepLog({ iteration: iterationNumber, step: 6, status: 'failed',
        tool: 'prioritization', why: 'rank issues', result: { error: e?.message }, mode: state.mode }));
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_6',
        error: e?.message ?? String(e), code: 'PRIORITIZATION_FAILED' });
    }
    await state.checkpoint(onCheckpoint, { lastStep: 6, iteration: iterationNumber });

    // STEP 8 — Credential Acquisition (mint App token for this iteration).
    try {
      const t0 = Date.now();
      const minted = await _getInstallationToken();
      token = minted.token;
      const log = makeStepLog({
        iteration: iterationNumber, step: 8, status: 'complete',
        tool: 'githubApp.js',
        why: 'short-lived installation token (~9 min) for branch + PR writes',
        result: { tokenAcquired: true, expiresAt: minted.expiresAt },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      emit(makeStepLog({ iteration: iterationNumber, step: 8, status: 'failed',
        tool: 'githubApp', why: 'mint token', result: { error: e?.message }, mode: state.mode }));
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_8',
        error: e?.message ?? String(e), code: e?.code ?? 'GITHUB_AUTH_FAILED' });
    }

    // STEP 7 — Multi-File Fix Generation (uses token from STEP 8).
    // Note: dispatch lists STEP 7 before STEP 8 numerically, but generating
    // fixes requires the GitHub token to fetch file content. Order is
    // STEP 8 → STEP 7 in execution; logs preserve the numbered semantic.
    const repoParsed = parseGithubRepoUrl(githubRepoUrl);
    if (!repoParsed) {
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_7',
        error: `unparseable githubRepoUrl: ${githubRepoUrl}`, code: 'BAD_REPO_URL' });
    }
    const { owner, repo } = repoParsed;

    const fileChanges = []; // { filePath, fileContent (new) }
    try {
      const t0 = Date.now();
      for (const issue of prioritizedIssues) {
        const filePath = issue.filePath || 'README.md';
        let current;
        try {
          current = await _fetchFileContent({ owner, repo, filePath, ref: 'main', token });
        } catch (fetchErr) {
          // Skip files we can't fetch (e.g. doesn't exist on main)
          continue;
        }
        try {
          const fix = await _generateFix({
            filePath, fileContent: current,
            // DISPATCH 23: pass through the precise fix instruction when
            // available (from Claude prioritization). fixGenerator falls
            // back to the findings-based prompt when `fix` is absent.
            issue: issue.issue || issue.description || issue.title,
            fix: issue.fix || null,
            findings: [issue],
            productId, runId,
          });
          fileChanges.push({ filePath, fileContent: fix.fixedContent });
        } catch (fixErr) {
          // FIX_NO_CHANGE or FIX_GENERATION_EMPTY — skip this file
          continue;
        }
      }
      const log = makeStepLog({
        iteration: iterationNumber, step: 7, status: fileChanges.length > 0 ? 'complete' : 'skipped',
        tool: 'fixGenerator.js (Claude API)',
        why: 'generate concrete fixes for prioritized issues',
        result: { filesFixed: fileChanges.length, files: fileChanges.map((c) => c.filePath) },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_7',
        error: e?.message ?? String(e), code: e?.code ?? 'FIX_GENERATION_FAILED' });
    }
    await state.checkpoint(onCheckpoint, { lastStep: 7, iteration: iterationNumber });

    if (fileChanges.length === 0) {
      // Nothing to commit; exit loop honestly.
      exitReason = 'NO_FIXES_GENERATED';
      break;
    }

    // STEP 9 — Branch + multi-file commits.
    const branchName = `flowai/renewal-${runId}-iter${iterationNumber}`;
    let commitInfo;
    try {
      const t0 = Date.now();
      // First file creates the branch.
      const first = fileChanges[0];
      commitInfo = await _createRenewalBranch({
        owner, repo, baseBranch: 'main', branchName,
        filePath: first.filePath, fileContent: first.fileContent,
        commitMessage: `FlowAI Self-Renewal iter${iterationNumber} fix: ${first.filePath}`,
        token,
      });
      // Subsequent files commit to the same branch.
      for (let i = 1; i < fileChanges.length; i += 1) {
        const f = fileChanges[i];
        await _commitFileToBranch({
          owner, repo, branchName, filePath: f.filePath, fileContent: f.fileContent,
          commitMessage: `FlowAI Self-Renewal iter${iterationNumber} fix: ${f.filePath}`,
          token,
        });
      }
      const log = makeStepLog({
        iteration: iterationNumber, step: 9, status: 'complete',
        tool: 'githubBranchWriter.js (createRenewalBranch + commitFileToBranch)',
        why: 'all fixes on isolated branch for review + rollback',
        result: { branchName, filesCommitted: fileChanges.length, branchUrl: commitInfo.branchUrl },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_9',
        error: e?.message ?? String(e), code: e?.code ?? 'GITHUB_API_ERROR' });
    }

    // STEP 10 — Vercel preview deploy.
    let previewUrl;
    try {
      const t0 = Date.now();
      const projectId = resolveVercelProjectId(productId);
      if (!projectId) {
        throw new Error(`no Vercel project ID for ${productId} (env VERCEL_PROJECT_ID_${productId.toUpperCase()})`);
      }
      const orgId = process.env.VERCEL_ORG_ID;
      const vercelToken = process.env.VERCEL_TOKEN;
      if (!orgId || !vercelToken) {
        throw new Error('VERCEL_ORG_ID or VERCEL_TOKEN missing from env');
      }
      const deployment = await _deployBranchPreview({
        projectId, orgId, owner, repo, branchName, token: vercelToken,
      });
      previewUrl = deployment.previewUrl;
      finalPreviewUrl = previewUrl;
      const log = makeStepLog({
        iteration: iterationNumber, step: 10, status: 'complete',
        tool: 'vercelBranchDeploy.js',
        why: 'live preview for score verification before PR',
        result: { previewUrl, deploymentId: deployment.deploymentId },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_10',
        error: e?.message ?? String(e), code: e?.code ?? 'DEPLOY_FAILED' });
    }
    await state.checkpoint(onCheckpoint, { lastStep: 10, iteration: iterationNumber });

    // STEP 11 — Five-Layer Scoring (Post-Fix).
    let postScoreEnvelope;
    try {
      const t0 = Date.now();
      const postMonitor = await _produceMonitorText({ url: previewUrl, productId, runId });
      postScoreEnvelope = await _computeScore({
        productId, url: previewUrl, runId, monitorText: postMonitor.monitorText,
      });
      lastPostScore = postScoreEnvelope.total;
      const log = makeStepLog({
        iteration: iterationNumber, step: 11, status: 'complete',
        tool: 'monitorTextProducer + preScoreAdapter',
        why: 'measure actual improvement from this iteration\'s fixes',
        result: { postScore: postScoreEnvelope.total, layers: {
          l1: postScoreEnvelope.l1, l2: postScoreEnvelope.l2, l3: postScoreEnvelope.l3,
          l4: postScoreEnvelope.l4, l5: postScoreEnvelope.l5,
        } },
        durationMs: Date.now() - t0, mode: state.mode,
        scores: {
          original: originalScore, current: postScoreEnvelope.total,
          target: gtmTarget, progressPct: computeProgress({ originalScore, currentScore: postScoreEnvelope.total, target: gtmTarget }),
        },
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      return buildFailureReturn({ runId, mode: state.mode, product,
        orchestrationLog, iterations, failedStep: 'STEP_11',
        error: e?.message ?? String(e), code: e?.code ?? 'SCORING_FAILED' });
    }
    await state.checkpoint(onCheckpoint, { lastStep: 11, iteration: iterationNumber });

    // STEP 12 — GTM Readiness Decision.
    const delta = postScoreEnvelope.total - preScoreEnvelope.total;
    const totalImprovement = postScoreEnvelope.total - (originalScore ?? 0);
    const decisionPolicy = policy ?? {
      selfRenewalNegativeDeltaPolicy: 'ALWAYS_OPEN',
      selfRenewalMinimumDelta: 0,
      selfRenewalSubstantialThreshold: 5,
    };
    const decision = _evaluateDelta({
      preScore: preScoreEnvelope, postScore: postScoreEnvelope,
      policy: decisionPolicy, runId, productId,
    });
    iterLog.preScore = preScoreEnvelope.total;
    iterLog.postScore = postScoreEnvelope.total;
    iterLog.delta = delta;
    iterLog.totalImprovement = totalImprovement;
    iterLog.gtmReady = postScoreEnvelope.total >= gtmTarget;
    iterLog.branchName = branchName;
    iterLog.previewUrl = previewUrl;
    iterLog.decision = decision.action;
    iterations.push(iterLog);

    let iterExit = null;
    if (postScoreEnvelope.total >= gtmTarget) {
      iterExit = 'GTM_READY';
    } else if (iterationNumber >= maxIterations) {
      iterExit = 'MAX_ITERATIONS';
    } else if (delta <= 0) {
      iterExit = 'NO_IMPROVEMENT';
    }
    const decisionLog = makeStepLog({
      iteration: iterationNumber, step: 12,
      status: iterExit ? 'complete' : 'complete',
      tool: 'deltaPolicy.js + orchestrator logic',
      why: 'decide whether to open PR now or run another iteration',
      result: { delta, postScore: postScoreEnvelope.total, gtmReady: iterLog.gtmReady, exitTrigger: iterExit, action: decision.action },
      mode: state.mode,
      scores: {
        original: originalScore, current: postScoreEnvelope.total,
        target: gtmTarget, progressPct: computeProgress({ originalScore, currentScore: postScoreEnvelope.total, target: gtmTarget }),
      },
    });
    emit(decisionLog); iterLog.steps.push(decisionLog);
    try { onIteration({ ...iterLog }); } catch { /* swallow */ }
    await state.checkpoint(onCheckpoint, { lastStep: 12, iteration: iterationNumber, decision: iterExit ?? 'CONTINUE' });

    if (iterExit) {
      exitReason = iterExit;
      break outerLoop;
    }
    if (state._stopRequested) { exitReason = 'USER_STOPPED'; break outerLoop; }

    // Continue: next iteration scores against this iteration's preview URL.
    currentUrl = previewUrl;
    iterationNumber += 1;
  }

  // STEP 13 — Final PR Creation.
  const lastIter = iterations[iterations.length - 1] || {};
  if (lastIter.branchName && token) {
    try {
      const t0 = Date.now();
      pr = await _createRenewalPr({
        owner: parseGithubRepoUrl(githubRepoUrl).owner,
        repo: parseGithubRepoUrl(githubRepoUrl).repo,
        branchName: lastIter.branchName,
        baseBranch: 'main',
        title: `FlowAI Self-Renewal: ${runId.slice(0, 8)} (${exitReason})`,
        body: buildPrBody({
          runId, mode, exitReason, originalScore,
          finalScore: lastPostScore, totalDelta: (lastPostScore ?? 0) - (originalScore ?? 0),
          iterations, finalPreviewUrl, gtmTarget,
        }),
        token,
      });
      emit(makeStepLog({
        iteration: iterations.length, step: 13, status: 'complete',
        tool: 'githubPrWriter.js',
        why: 'human review gate — NEVER auto-merge',
        result: { prNumber: pr.prNumber, prHtmlUrl: pr.prHtmlUrl },
        durationMs: Date.now() - t0, mode: state.mode, canInterrupt: false,
      }));
    } catch (e) {
      emit(makeStepLog({
        iteration: iterations.length, step: 13, status: 'failed',
        tool: 'githubPrWriter', why: 'open PR',
        result: { error: e?.message }, mode: state.mode,
      }));
      // Continue to STEP 14 even if PR failed.
    }
  }

  // STEP 14 — Audit Record.
  let auditWrite = { written: false, reason: 'not_attempted' };
  try {
    auditWrite = await _appendGovernanceEntry({
      productId, environment,
      entry: {
        kind: 'self_renewal.orchestration_complete.v1',
        runId, productId, mode, exitReason,
        originalScore, finalScore: lastPostScore,
        totalDelta: (lastPostScore ?? 0) - (originalScore ?? 0),
        iterationsCompleted: iterations.length,
        gtmReady: (lastPostScore ?? 0) >= gtmTarget,
        previewUrl: finalPreviewUrl,
        prUrl: pr?.prHtmlUrl ?? null,
        at: new Date().toISOString(),
      },
      supabase,
    });
    emit(makeStepLog({
      iteration: iterations.length, step: 14, status: 'complete',
      tool: 'product_ssot.governance_record',
      why: 'permanent immutable record of all FlowAI actions',
      result: auditWrite, mode: state.mode, canInterrupt: false,
    }));
  } catch (e) {
    emit(makeStepLog({
      iteration: iterations.length, step: 14, status: 'failed',
      tool: 'governance_record', why: 'audit write',
      result: { error: e?.message }, mode: state.mode,
    }));
  }

  return Object.freeze({
    ok: true,
    gtmReady: (lastPostScore ?? 0) >= gtmTarget,
    exitReason,
    originalScore: originalScore ?? 0,
    finalScore: lastPostScore ?? originalScore ?? 0,
    totalDelta: (lastPostScore ?? originalScore ?? 0) - (originalScore ?? 0),
    iterationsCompleted: iterations.length,
    previewUrl: finalPreviewUrl,
    prUrl: pr?.prHtmlUrl ?? null,
    prNumber: pr?.prNumber ?? null,
    orchestrationLog,
    iterations,
    product,
    runId,
    mode: state.mode,
    auditWrite,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Claude-powered issue prioritization (DISPATCH 23 STEP 6 upgrade).
 *
 * Sends the Five-Layer scores + product context to Claude and asks for up
 * to 5 ranked issues with specific filePath/issue/fix/estimatedImpact.
 * Returns an array of issue objects, or null on failure (caller falls
 * back to the score-derived heuristic).
 *
 * Honest residual: this module does NOT have access to the full repo file
 * tree from monitorTextProducer (which fetches one URL's content, not the
 * source tree). Claude is asked to suggest LIKELY paths for a typical
 * React/Vite app; STEP 7 then attempts to fetch each file via GitHub
 * Contents API and skips on 404. Phase B should pass a real file tree.
 *
 * @param {object} args
 * @param {object} args.preScore           — scoring envelope (l1..l5, total)
 * @param {object} args.product            — registry row
 * @param {object} [args.suppliedIssue]    — if caller provides an explicit
 *                                            issue, return it verbatim (skip Claude)
 * @param {object} [args.opts]             — { fetch?, apiKey?, model? }
 * @returns {Promise<Array<{ filePath, issue, fix, estimatedImpact, severity, title }>|null>}
 */
export async function prioritizeIssuesWithClaude({ preScore, product, suppliedIssue, opts = {} }) {
  if (suppliedIssue && typeof suppliedIssue === 'object') {
    return [suppliedIssue];
  }
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') return null;
  const model = typeof opts.model === 'string' && opts.model ? opts.model : 'claude-sonnet-4-6';

  const productId = product?.product_id ?? 'unknown';
  const githubRepoUrl = product?.github_repo_url ?? '';

  const prompt = [
    'You are a code quality analyst. Given Five-Layer scores for a deployed product and the product\'s GitHub repo, identify the top 5 SPECIFIC issues causing low scores.',
    '',
    `Product: ${productId}`,
    `GitHub repo: ${githubRepoUrl}`,
    '',
    'Five-Layer scores (each layer is /20, total is /100):',
    `  L1 Functionality: ${preScore.l1}/20`,
    `  L2 Operational:   ${preScore.l2}/20`,
    `  L3 Financial:     ${preScore.l3}/20`,
    `  L4 Business:      ${preScore.l4}/20`,
    `  L5 GTM:           ${preScore.l5}/20`,
    `  Total:            ${preScore.total}/100`,
    '',
    'Layer rubric:',
    '  L1 Functionality — Does the product work? Broken interactions, missing features.',
    '  L2 Operational  — Monitoring, error tracking, uptime signals, infrastructure readiness.',
    '  L3 Financial    — Pricing clarity, monetization model, payment flow.',
    '  L4 Business     — Competitive positioning, defensible moat, partnerships.',
    '  L5 GTM          — ICP clarity, value proposition, CTAs, sales motion.',
    '',
    'Assume this is a Vite + React app. Likely source files:',
    '  - README.md',
    '  - package.json',
    '  - index.html',
    '  - src/App.jsx',
    '  - src/main.jsx',
    '  - src/pages/Home.jsx',
    '  - src/components/Hero.jsx',
    '  - src/components/Pricing.jsx',
    '  - src/components/Footer.jsx',
    '',
    'Return STRICTLY valid JSON with this shape (no markdown code fences, no prose, just JSON):',
    '{"issues": [',
    '  {',
    '    "filePath": "<exact path>",',
    '    "issue": "<specific problem description>",',
    '    "fix": "<exactly what change to make>",',
    '    "estimatedImpact": { "layer": "L1|L2|L3|L4|L5", "delta": <integer> },',
    '    "severity": "critical|high|medium|low",',
    '    "title": "<short title>"',
    '  }',
    '  ... up to 5 entries, ranked by descending estimatedImpact.delta',
    ']}',
    '',
    'Focus on real functional / content issues that would move the score; skip purely cosmetic ones.',
  ].join('\n');

  let response;
  try {
    response = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let parsed;
  try { parsed = await response.json(); } catch { return null; }
  const text = Array.isArray(parsed.content)
    ? parsed.content.filter((b) => b && b.type === 'text').map((b) => b.text ?? '').join('')
    : '';
  if (!text) return null;

  // Tolerate ```json fences and leading prose; extract the JSON object.
  let jsonText = text.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  // Find first `{` and last `}` as a fallback bracket-extraction.
  const firstBrace = jsonText.indexOf('{');
  const lastBrace = jsonText.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1);
  }
  let parsedJson;
  try { parsedJson = JSON.parse(jsonText); } catch { return null; }
  const arr = Array.isArray(parsedJson?.issues) ? parsedJson.issues : null;
  if (!arr || arr.length === 0) return null;
  // Normalize to the orchestrator's expected issue shape.
  return arr.slice(0, 5).map((it, idx) => ({
    severity: it.severity || 'medium',
    title: it.title || `Fix issue ${idx + 1}`,
    filePath: typeof it.filePath === 'string' && it.filePath ? it.filePath : 'README.md',
    issue: it.issue || it.description || '',
    fix: it.fix || '',
    description: it.issue || '',
    evidence: it.evidence || `Claude prioritization for ${productId}`,
    estimatedImpact: it.estimatedImpact || null,
    layer: it.estimatedImpact?.layer || null,
  }));
}

function derivePrioritizedIssuesFromScore(scoreEnvelope, product, suppliedIssue) {
  if (suppliedIssue && typeof suppliedIssue === 'object') return [suppliedIssue];
  // Phase A: find the weakest layer + propose a README-level brand/clarity fix.
  // Multi-issue Claude-ranked prioritization is Phase B.
  const layers = [
    { key: 'l1', label: 'Functionality', focus: 'clarify product functionality + fix broken interactions' },
    { key: 'l2', label: 'Operational',   focus: 'add operational readiness signals (monitoring, status page)' },
    { key: 'l3', label: 'Financial',     focus: 'clarify pricing + monetization in visible content' },
    { key: 'l4', label: 'Business',      focus: 'sharpen competitive positioning + differentiation' },
    { key: 'l5', label: 'GTM',           focus: 'tighten ICP + value proposition + CTAs' },
  ];
  const weakest = layers
    .map((l) => ({ ...l, score: scoreEnvelope[l.key] ?? 0 }))
    .sort((a, b) => a.score - b.score)[0];
  return [{
    severity: 'medium',
    title: `Strengthen Layer ${weakest.key.toUpperCase()} (${weakest.label})`,
    description: `Layer ${weakest.key.toUpperCase()} (${weakest.label}) scored ${weakest.score}/20. ${weakest.focus}.`,
    evidence: `Five-Layer assessment: ${weakest.label}=${weakest.score}/20`,
    filePath: 'README.md',
    layer: weakest.key,
  }];
}

function buildPrBody({ runId, mode, exitReason, originalScore, finalScore, totalDelta, iterations, finalPreviewUrl, gtmTarget }) {
  const tableRows = iterations.map((i) =>
    `| ${i.number} | ${i.preScore ?? '-'} | ${i.postScore ?? '-'} | ${i.delta >= 0 ? '+' : ''}${i.delta ?? '-'} |`,
  ).join('\n');
  return [
    '## FlowAI Self-Renewal Report',
    '',
    `**Run ID:** \`${runId}\``,
    `**Mode:** ${mode}`,
    `**Iterations completed:** ${iterations.length}`,
    `**Exit reason:** ${exitReason}`,
    `**Original score:** ${originalScore}/100`,
    `**Final score:** ${finalScore}/100`,
    `**Total improvement:** ${totalDelta >= 0 ? '+' : ''}${totalDelta} points`,
    `**GTM Ready (target ${gtmTarget}/100):** ${finalScore >= gtmTarget ? '✅ YES' : '⚠️ NOT YET'}`,
    '',
    '### Score Progression',
    '',
    '| Iteration | Pre | Post | Delta |',
    '|---|---:|---:|---:|',
    tableRows,
    '',
    `### Preview URL`,
    finalPreviewUrl || '(no preview produced)',
    '',
    '### How to verify',
    '1. Open the preview URL above',
    '2. Confirm the Five-Layer score improved as reported',
    '3. Review the file changes in this PR',
    '4. Merge when satisfied',
    '',
    `🤖 Generated by FlowAI Self-Renewal Phase A (run ${runId})`,
  ].join('\n');
}

function buildFailureReturn({ runId, mode, product, orchestrationLog, iterations, failedStep, error, code }) {
  return Object.freeze({
    ok: false,
    gtmReady: false,
    exitReason: 'STEP_FAILED',
    originalScore: 0, finalScore: 0, totalDelta: 0,
    iterationsCompleted: iterations.length,
    previewUrl: null, prUrl: null, prNumber: null,
    orchestrationLog, iterations,
    product, runId, mode,
    failedStep, error, code,
  });
}

export const __internals = Object.freeze({
  STEP_NAMES,
  makeStepLog,
  computeProgress,
  discoverProduct,
  derivePrioritizedIssuesFromScore,
  prioritizeIssuesWithClaude,
  buildPrBody,
  OrchestrationState,
});
