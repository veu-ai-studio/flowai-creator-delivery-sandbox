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
import { conductStructuredCrawl } from './crawlOutputAdapter.js';
import { remediate as remediationEngine } from '../../../../api/_lib/remediationEngine.js';
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

// ── Product-agnostic helpers (DISPATCH 24) ───────────────────────────────────
//
// FlowAI is product-agnostic: any URL must work, registered or not. Two
// resolution paths:
//   PATH A — Known product (URL matches a product_registry row). Loads the
//            operator's full config and uses the operator's GitHub repo +
//            Vercel project for the branch-deploy path.
//   PATH B — Unknown URL (no registry hit). Synthesizes a default config,
//            attempts to detect a GitHub repo from the page (well-known
//            file, meta tag, page content), and routes deployment through
//            api/_lib/remediationEngine.js (file-tree upload to FlowAI's
//            own Vercel account) instead of the operator's branch-deploy
//            path. PATH B never throws on a "not registered" URL — that's
//            the whole point.

const PATH_B_DEFAULT_CONFIG = Object.freeze({
  self_renewal_max_per_day: 3,
  self_renewal_minimum_delta: 1,
  self_renewal_substantial_threshold: 5,
  self_renewal_negative_delta_policy: 'ALWAYS_OPEN',
});

function sanitizeHostname(hostname) {
  if (typeof hostname !== 'string' || hostname.length === 0) return 'unknown';
  return hostname.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);
}

function synthesizePathBProduct({ url, runId, detectedRepoUrl = null }) {
  let hostname = 'unknown';
  try { hostname = new URL(url).hostname; } catch { /* leave default */ }
  const sanitized = sanitizeHostname(hostname);
  const runShort = (runId || '').slice(0, 8) || 'norun';
  return {
    product_id: `flowai-upgraded-${sanitized}-${runShort}`,
    org_id: 'flowai-self-hosted',
    github_repo_url: detectedRepoUrl,   // may be null — score-only mode
    self_renewal_enabled: true,
    environment: 'prd',
    // PATH B marker — downstream steps switch routing on this.
    __pathB: true,
    __sourceUrl: url,
    __detectedRepoUrl: detectedRepoUrl,
    // PATH B defaults per DISPATCH 24 spec.
    ...PATH_B_DEFAULT_CONFIG,
  };
}

/**
 * Best-effort detection of a GitHub repo URL for an arbitrary live URL.
 * Tried in order; first hit wins; any failure is silent → returns null
 * (PATH B then runs in score-only mode without a GitHub destination).
 *
 *   1. GET {origin}/.well-known/flowai.json — operator opt-in JSON:
 *      { "github_repo": "https://github.com/owner/repo" }
 *   2. Parse the page HTML for <meta name="github-repo" content="...">
 *   3. Grep the page HTML for a github.com/<owner>/<repo> URL (last-resort)
 *
 * @param {object} args
 * @param {string} args.url
 * @param {function} [args.fetch]  — overridable for tests
 * @param {number}   [args.timeoutMs=5000]
 * @returns {Promise<string|null>}  the GitHub URL or null
 */
export async function detectGithubRepoFromUrl({ url, fetch: fetchOverride, timeoutMs = 5_000 } = {}) {
  if (typeof url !== 'string' || url.length === 0) return null;
  const fetchImpl = typeof fetchOverride === 'function' ? fetchOverride : globalThis.fetch;
  if (typeof fetchImpl !== 'function') return null;

  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  const origin = `${parsed.protocol}//${parsed.host}`;

  const withTimeout = async (target) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetchImpl(target, { signal: ac.signal, redirect: 'follow' });
      return r;
    } catch { return null; }
    finally { clearTimeout(t); }
  };

  // 1. .well-known/flowai.json (operator opt-in, structured JSON).
  try {
    const res = await withTimeout(`${origin}/.well-known/flowai.json`);
    if (res && res.ok) {
      const text = await res.text();
      const json = JSON.parse(text);
      const candidate = typeof json?.github_repo === 'string' ? json.github_repo
                       : typeof json?.githubRepo === 'string' ? json.githubRepo
                       : null;
      if (candidate && /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i.test(candidate)) {
        return candidate.replace(/\.git$/i, '').replace(/\/+$/, '');
      }
    }
  } catch { /* fall through */ }

  // 2. Page HTML — <meta name="github-repo" content="...">
  let pageHtml = null;
  try {
    const res = await withTimeout(url);
    if (res && res.ok) {
      pageHtml = await res.text();
      const metaMatch = pageHtml.match(/<meta[^>]+name=["']github-repo["'][^>]+content=["']([^"']+)["']/i);
      if (metaMatch) {
        const candidate = metaMatch[1].trim();
        if (/^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i.test(candidate)) {
          return candidate.replace(/\.git$/i, '').replace(/\/+$/, '');
        }
      }
    }
  } catch { /* fall through */ }

  // 3. Grep the page HTML for any github.com/owner/repo URL (last resort).
  // Bounded to the page text already fetched; we don't make extra requests
  // for robots.txt / package.json here to keep this fast and predictable.
  if (typeof pageHtml === 'string' && pageHtml.length > 0) {
    const match = pageHtml.match(/https?:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/);
    if (match) {
      return match[0].replace(/\.git$/i, '').replace(/\/+$/, '');
    }
  }

  return null;
}

/**
 * Fetch the real repo file list via GitHub Trees API (DISPATCH 27).
 *
 * Solves the W5a #26 residual #2: Claude's prioritizer was guessing typical
 * Vite+React paths that didn't exist in the actual repo, causing STEP 7 to
 * 404-skip 4 of 5 suggestions. With a real file list passed into the
 * prioritization prompt, Claude is constrained to existing paths.
 *
 * Sequence:
 *   1. GET /repos/{owner}/{repo}/git/ref/heads/{baseBranch} → root commit SHA
 *   2. GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1 → flat tree
 *   3. Filter to blob (file) entries; return paths as a flat string array
 *
 * Returns [] (empty array, NOT null) on any failure so the caller can
 * distinguish "fetched a real but empty list" from "fetch errored." The
 * prioritizer falls back to the guessed-paths hint when the list is empty.
 *
 * @param {object} args
 * @param {string} args.owner
 * @param {string} args.repo
 * @param {string} [args.ref='main']
 * @param {string} args.token
 * @param {object} [args.opts]   — { fetch? } overridable for tests
 * @returns {Promise<{ files: string[], truncated: boolean, sha: string|null, error: string|null }>}
 */
export async function fetchRepoFileList({ owner, repo, ref = 'main', token, opts = {} }) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { files: [], truncated: false, sha: null, error: 'fetch_unavailable' };
  }
  if (typeof owner !== 'string' || !owner || typeof repo !== 'string' || !repo) {
    return { files: [], truncated: false, sha: null, error: 'bad_args' };
  }
  if (typeof token !== 'string' || !token) {
    return { files: [], truncated: false, sha: null, error: 'no_token' };
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const enc = (s) => encodeURIComponent(s);

  let refRes;
  try {
    refRes = await fetchImpl(
      `https://api.github.com/repos/${enc(owner)}/${enc(repo)}/git/ref/heads/${enc(ref)}`,
      { method: 'GET', headers },
    );
  } catch (e) {
    return { files: [], truncated: false, sha: null, error: `ref_network:${e?.message ?? String(e)}` };
  }
  if (!refRes.ok) {
    return { files: [], truncated: false, sha: null, error: `ref_${refRes.status}` };
  }
  let refBody;
  try { refBody = await refRes.json(); } catch { return { files: [], truncated: false, sha: null, error: 'ref_parse' }; }
  const sha = refBody?.object?.sha;
  if (typeof sha !== 'string' || !sha) {
    return { files: [], truncated: false, sha: null, error: 'ref_no_sha' };
  }

  let treeRes;
  try {
    treeRes = await fetchImpl(
      `https://api.github.com/repos/${enc(owner)}/${enc(repo)}/git/trees/${enc(sha)}?recursive=1`,
      { method: 'GET', headers },
    );
  } catch (e) {
    return { files: [], truncated: false, sha, error: `tree_network:${e?.message ?? String(e)}` };
  }
  if (!treeRes.ok) {
    return { files: [], truncated: false, sha, error: `tree_${treeRes.status}` };
  }
  let treeBody;
  try { treeBody = await treeRes.json(); } catch { return { files: [], truncated: false, sha, error: 'tree_parse' }; }
  const entries = Array.isArray(treeBody?.tree) ? treeBody.tree : [];
  const files = entries
    .filter((e) => e && e.type === 'blob' && typeof e.path === 'string')
    .map((e) => e.path);
  const truncated = !!treeBody?.truncated;
  return { files, truncated, sha, error: null };
}

/**
 * Resolve a target product. NEVER returns null in DISPATCH 24+: the result
 * is either a PATH A registry row (operator-known product) OR a PATH B
 * synthesized config (FlowAI universal mode for any URL).
 */
async function discoverProduct({ url, supabase, runId, detectGithubFn = detectGithubRepoFromUrl }) {
  // ── PATH A: try registry hit ───────────────────────────────────────────────
  if (supabase && typeof supabase.from === 'function') {
    if (url) {
      const { data } = await supabase
        .from('product_registry')
        .select('*')
        .or(`github_repo_url.ilike.%${url}%,product_id.ilike.%${url}%`)
        .maybeSingle();
      if (data) return data;
    } else {
      const { data } = await supabase
        .from('product_registry')
        .select('*')
        .eq('self_renewal_enabled', true)
        .order('product_id', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) return data;
    }
  } else if (url && url.includes('mypreglife')) {
    // Test/dev convenience without a Supabase client: keep the historical
    // mypreglife fast-path so existing AUTO-mode tests still resolve to a
    // PATH A row.
    return {
      product_id: 'mypreglife',
      org_id: 'veu-ai-studio',
      github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life',
      self_renewal_enabled: true,
    };
  }

  // ── PATH B: no registry hit (or no DB) — synthesize a universal-mode product
  // No URL at all → can't proceed; return null and let caller fail gracefully.
  if (!url) return null;
  const detectedRepoUrl = await detectGithubFn({ url }).catch(() => null);
  return synthesizePathBProduct({ url, runId, detectedRepoUrl });
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
  const _aggressiveCrawl          = deps.aggressiveCrawl          || aggressiveCrawl;
  const _conductStructuredCrawl   = deps.conductStructuredCrawl   || conductStructuredCrawl;
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
  const _remediationEngine      = deps.remediationEngine      || remediationEngine;

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
  //
  // DISPATCH 24 (product-agnostic URL handling): discoverProduct never
  // throws or returns null when a URL is supplied. It returns either a
  // PATH A registry row (operator-known product, existing flow) or a
  // PATH B synthesized config (FlowAI universal mode — any URL works,
  // no pre-registration needed). PATH B routes deployment through the
  // remediationEngine.js file-tree upload instead of the operator's
  // branch-deploy path; STEPS 7-9 and 13 are skipped for PATH B because
  // there's no GitHub repo to commit to or PR against (unless a repo was
  // auto-detected from the page).
  let product;
  let pathB = false;
  try {
    const t0 = Date.now();
    product = await _discoverProduct({ url: args.url, supabase, runId });
    if (!product) {
      // Only true failure: no URL AND no DB AND no registry hit. Nothing
      // to operate on.
      const failLog = makeStepLog({
        iteration: 0, step: 1, status: 'failed',
        tool: 'product_registry lookup',
        why: 'check if this URL is a known registered product',
        result: { error: 'no_url_supplied_and_no_enabled_product', url: args.url },
        durationMs: Date.now() - t0, mode: state.mode, canInterrupt: false,
      });
      emit(failLog);
      return buildFailureReturn({
        runId, mode: state.mode, product: null, orchestrationLog, iterations,
        failedStep: 'STEP_1', error: 'no_url_supplied_and_no_enabled_product',
        code: 'PRODUCT_NOT_FOUND',
      });
    }
    pathB = product.__pathB === true;
    emit(makeStepLog({
      iteration: 0, step: 1, status: 'complete',
      tool: 'product_registry lookup',
      why: 'check if this URL is a known registered product',
      result: pathB
        ? {
            path: 'PATH B (unknown — proceeding in universal mode)',
            productId: product.product_id,
            sourceUrl: product.__sourceUrl,
            detectedRepoUrl: product.__detectedRepoUrl,        // null → score-only mode
            note: product.__detectedRepoUrl
              ? 'GitHub repo auto-detected; deploy via remediationEngine'
              : 'no GitHub repo detected; score-only mode (no PR will be opened)',
          }
        : {
            path: 'PATH A (known)',
            productId: product.product_id,
            githubRepoUrl: product.github_repo_url,
          },
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

    // STEP 3 — Deep Crawl (Agent #21 multi-page BFS, structured adapter).
    // DISPATCH 7: routed through conductStructuredCrawl() so the rest of
    // the pipeline (scoring, monitor producer) gets the canonical
    // crawlOutput shape rather than the raw Agent #21 CrawlReport.
    let crawlOutput;
    try {
      const t0 = Date.now();
      crawlOutput = await _conductStructuredCrawl({
        url: currentUrl,
        maxPages: 50,
        depth: 5,
        productId,
        runId,
      });
      state.crawlOutput = crawlOutput;
      const log = makeStepLog({
        iteration: iterationNumber, step: 3, status: 'complete',
        tool: 'Agent #21 AggressiveCrawlConductor → crawlOutputAdapter',
        why: 'structured crawl output for downstream scoring + monitor producer',
        result: {
          pagesCrawled: crawlOutput.pagesCrawled,
          depth: crawlOutput.depth,
          forms: crawlOutput.forms.length,
          brokenLinks: crawlOutput.brokenLinks.length,
          interactiveElements: crawlOutput.interactiveElements.length,
          totalTextLength: crawlOutput.totalTextLength,
          errors: crawlOutput.errors.length,
        },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      emit(makeStepLog({ iteration: iterationNumber, step: 3, status: 'failed',
        tool: 'Agent #21 → crawlOutputAdapter', why: 'deep crawl', result: { error: e?.message }, mode: state.mode }));
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
    // DISPATCH 6: pass githubRepoUrl + token (when available) so the
    // producer enriches the monitor prompt with real source code. On
    // iteration 1, token is null until STEP 8 mints it — the producer
    // gracefully falls back to URL-only scoring in that case. From
    // iteration 2 onward (or post-rework where token persists), the
    // enriched path runs and pre-scores reflect real code signal.
    //
    // DISPATCH 24: crawlReport is now passed through to produceMonitorText
    // so scoring can leverage the real multi-page crawl (titles, headings,
    // links, forms, error states) rather than the producer's independent
    // single-URL fetch. The producer currently ignores fields it doesn't
    // destructure, so the wire is in place pending the producer-side
    // enhancement that consumes it.
    let preScoreEnvelope;
    try {
      const t0 = Date.now();
      const monitor = await _produceMonitorText({
        url: currentUrl, productId, runId,
        githubRepoUrl: githubRepoUrl || undefined,
        token: token || undefined,
        crawlReport: crawlOutput,
      });
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

    // DISPATCH 27: For PATH A, mint the GitHub App token BEFORE STEP 6 so
    // we can call the Trees API to fetch the real repo file list and feed
    // it into the Claude prioritizer prompt. STEP 8's numbered position
    // (after STEP 6) is preserved in the log envelope, but execution
    // order hoists the token mint for PATH A. PATH B skips this since it
    // has no operator repo to read.
    //
    // The token acquired here is REUSED by STEP 8/STEP 7/STEP 9 below —
    // no duplicate mints. STEP 8's log entry still emits (as 'complete')
    // when the hoisted mint succeeds.
    const _fetchRepoFileList = deps.fetchRepoFileList || fetchRepoFileList;
    let repoFileList = null; // null = no list available; array = real list (may be empty)
    if (!pathB && githubRepoUrl) {
      const parsed = parseGithubRepoUrl(githubRepoUrl);
      if (parsed) {
        try {
          const minted = await _getInstallationToken();
          token = minted.token;
          const treeResult = await _fetchRepoFileList({
            owner: parsed.owner, repo: parsed.repo, ref: 'main', token,
          });
          if (treeResult && treeResult.files && treeResult.files.length > 0) {
            repoFileList = treeResult.files;
          }
        } catch {
          // Hoisted token mint or trees fetch failed — the regular STEP 8
          // block below will retry the token mint and log its outcome.
          // Prioritizer falls back to the guessed-paths hint.
        }
      }
    }

    // STEP 6 — Issue Prioritization. Claude-powered (DISPATCH 23): given the
    // Five-Layer scores + product context + monitor text, Claude returns up
    // to 5 ranked issues with specific filePath/issue/fix/estimatedImpact.
    // Falls back to the score-derived heuristic if Claude fails or returns
    // unparseable output — never blocks the pipeline on prioritization.
    //
    // DISPATCH 27: when repoFileList is non-null (PATH A with successful
    // hoisted token + Trees API fetch), the prioritizer constrains Claude
    // to ONLY propose files that actually exist in the repo. Eliminates
    // the DISPATCH 26 "guessed paths 404 on fetch" failure mode.
    let prioritizedIssues;
    try {
      const t0 = Date.now();
      const claudeIssues = await prioritizeIssuesWithClaude({
        preScore: preScoreEnvelope, product, suppliedIssue: args.issue,
        fileList: repoFileList,
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
          ? (repoFileList
              ? 'Claude-powered prioritization (file-list-constrained, DISPATCH 27)'
              : 'Claude-powered prioritization (DISPATCH 23 upgrade)')
          : 'score-derived heuristic (Claude fallback failed)',
        why: 'rank issues by Five-Layer impact for max score improvement per iteration',
        result: {
          issueCount: prioritizedIssues.length,
          topIssue: prioritizedIssues[0]?.title ?? prioritizedIssues[0]?.issue,
          files: prioritizedIssues.map((i) => i.filePath).filter(Boolean),
          source: claudeIssues ? 'claude' : 'heuristic',
          repoFileListSize: repoFileList ? repoFileList.length : 0,
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

    // ── STEP 8 + STEP 7 + STEP 9 — PATH A only ───────────────────────────────
    //
    // PATH B has no operator GitHub repo to commit to, so STEPS 7-9 are
    // skipped: the remediationEngine in STEP 10 generates the patched
    // file tree internally from the issues + crawl data and deploys it
    // to FlowAI's own Vercel account. STEP 13 (PR) is also skipped for
    // PATH B (no upstream repo to PR against).
    //
    // STEP 7 numerically precedes STEP 8 in the spec, but generating
    // fixes requires the GitHub token to fetch file content — execution
    // order is STEP 8 → STEP 7; logs preserve the numbered semantic.
    let owner = null;
    let repo = null;
    const branchName = `flowai/renewal-${runId}-iter${iterationNumber}`;
    const fileChanges = []; // { filePath, fileContent (new) } — PATH A only
    if (pathB) {
      // Log skipped steps so the orchestrator log is honest about what ran.
      emit(makeStepLog({
        iteration: iterationNumber, step: 8, status: 'skipped',
        tool: 'githubApp.js',
        why: 'short-lived installation token (~9 min) for branch + PR writes',
        result: { skipped: 'PATH B — no operator GitHub repo; remediationEngine handles fix+deploy' },
        mode: state.mode,
      }));
      emit(makeStepLog({
        iteration: iterationNumber, step: 7, status: 'skipped',
        tool: 'fixGenerator.js (Claude API)',
        why: 'generate concrete fixes for prioritized issues',
        result: { skipped: 'PATH B — remediationEngine produces patched file tree internally' },
        mode: state.mode,
      }));
      emit(makeStepLog({
        iteration: iterationNumber, step: 9, status: 'skipped',
        tool: 'githubBranchWriter.js',
        why: 'all fixes on isolated branch for review + rollback',
        result: { skipped: 'PATH B — no operator GitHub repo for branch + commits' },
        mode: state.mode,
      }));
      await state.checkpoint(onCheckpoint, { lastStep: 9, iteration: iterationNumber });
    } else {
      // ── PATH A: existing flow ──────────────────────────────────────────────
      // DISPATCH 27: if the hoisted token mint above already succeeded (for
      // Trees API access during STEP 6), reuse that token here instead of
      // minting again. Log as 'complete' either way so the step envelope
      // is honest. Only re-mint if `token` is still null (hoist failed).
      try {
        const t0 = Date.now();
        let mintedNow = false;
        let expiresAt = null;
        if (!token) {
          const minted = await _getInstallationToken();
          token = minted.token;
          expiresAt = minted.expiresAt;
          mintedNow = true;
        }
        const log = makeStepLog({
          iteration: iterationNumber, step: 8, status: 'complete',
          tool: 'githubApp.js',
          why: 'short-lived installation token (~9 min) for branch + PR writes',
          result: {
            tokenAcquired: true,
            expiresAt,
            reusedFromHoist: !mintedNow,
          },
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

      const repoParsed = parseGithubRepoUrl(githubRepoUrl);
      if (!repoParsed) {
        return buildFailureReturn({ runId, mode: state.mode, product,
          orchestrationLog, iterations, failedStep: 'STEP_7',
          error: `unparseable githubRepoUrl: ${githubRepoUrl}`, code: 'BAD_REPO_URL' });
      }
      owner = repoParsed.owner;
      repo = repoParsed.repo;

      // STEP 7 — Multi-File Fix Generation (PATH A only).
      try {
        const t0 = Date.now();
        for (const issue of prioritizedIssues) {
          const filePath = issue.filePath || 'README.md';
          let current;
          try {
            current = await _fetchFileContent({ owner, repo, filePath, ref: 'main', token });
          } catch (fetchErr) {
            continue;  // Skip files we can't fetch (e.g. doesn't exist on main)
          }
          try {
            const fix = await _generateFix({
              filePath, fileContent: current,
              issue: issue.issue || issue.description || issue.title,
              fix: issue.fix || null,
              findings: [issue],
              productId, runId,
            });
            fileChanges.push({ filePath, fileContent: fix.fixedContent });
          } catch (fixErr) {
            continue;  // FIX_NO_CHANGE or FIX_GENERATION_EMPTY — skip
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
        exitReason = 'NO_FIXES_GENERATED';
        break;
      }

      // STEP 9 — Branch + multi-file commits (PATH A only).
      try {
        const t0 = Date.now();
        const first = fileChanges[0];
        await _createRenewalBranch({
          owner, repo, baseBranch: 'main', branchName,
          filePath: first.filePath, fileContent: first.fileContent,
          commitMessage: `FlowAI Self-Renewal iter${iterationNumber} fix: ${first.filePath}`,
          token,
        });
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
          result: { branchName, filesCommitted: fileChanges.length },
          durationMs: Date.now() - t0, mode: state.mode,
        });
        emit(log); iterLog.steps.push(log);
      } catch (e) {
        return buildFailureReturn({ runId, mode: state.mode, product,
          orchestrationLog, iterations, failedStep: 'STEP_9',
          error: e?.message ?? String(e), code: e?.code ?? 'GITHUB_API_ERROR' });
      }
    }

    // STEP 10 — Preview deploy. PATH A uses the operator's Vercel branch-
    // deploy path (vercelBranchDeploy.js). PATH B routes through
    // api/_lib/remediationEngine.js which generates a fresh file tree from
    // the issues + crawl signal and uploads it to FlowAI's own Vercel
    // account as a brand-new project.
    //
    // DISPATCH 26 (PATH B graceful timeout): the remediationEngine path
    // can take 60-120s+ to build (it generates a brand-new Vercel project
    // from scratch and waits for the build). When the build genuinely
    // times out (state=TIMEOUT or our hard 120s wrapper expires), we do
    // NOT fail the pipeline. Instead we mark STEP 10 as 'degraded',
    // set previewUrl=null, and continue to STEP 11 scoring the ORIGINAL
    // URL (no preview to score). STEP 13 then opens a PR with a note
    // explaining the deploy timeout — the operator can deploy manually.
    let previewUrl = null;
    let deployDegraded = false;
    {
      const t0 = Date.now();
      try {
        if (pathB) {
          const PATH_B_DEPLOY_TIMEOUT_MS = 120_000;
          let timer;
          const timeoutPromise = new Promise((resolve) => {
            timer = setTimeout(() => resolve({ __timeout: true }), PATH_B_DEPLOY_TIMEOUT_MS);
          });
          const remediationPromise = _remediationEngine({
            productScope: product.product_id,
            issues: prioritizedIssues,
            sourceHints: product.__detectedRepoUrl ? { gitUrl: product.__detectedRepoUrl } : {},
            requestOrigin: currentUrl,
          });
          const raced = await Promise.race([remediationPromise, timeoutPromise]).catch((e) => ({
            __error: e?.message ?? String(e),
          }));
          clearTimeout(timer);
          if (raced && raced.__timeout) {
            // 120s wrapper expired. Degrade gracefully.
            deployDegraded = true;
            previewUrl = null;
            const log = makeStepLog({
              iteration: iterationNumber, step: 10, status: 'degraded',
              tool: 'remediationEngine.js (PATH B file-tree upload)',
              why: 'PATH B universal-mode deploy — FlowAI Vercel account, no operator repo required',
              result: {
                previewUrl: null,
                reason: 'deploy_timeout',
                detail: `PATH B deploy exceeded ${PATH_B_DEPLOY_TIMEOUT_MS / 1000}s wrapper timeout — continuing to STEP 11 against the original URL`,
              },
              durationMs: Date.now() - t0, mode: state.mode,
            });
            emit(log); iterLog.steps.push(log);
          } else if (raced && raced.__error) {
            // Hard error from remediationEngine — also degrade rather than fail.
            deployDegraded = true;
            previewUrl = null;
            const log = makeStepLog({
              iteration: iterationNumber, step: 10, status: 'degraded',
              tool: 'remediationEngine.js (PATH B file-tree upload)',
              why: 'PATH B universal-mode deploy — FlowAI Vercel account, no operator repo required',
              result: {
                previewUrl: null,
                reason: 'deploy_error',
                detail: raced.__error,
              },
              durationMs: Date.now() - t0, mode: state.mode,
            });
            emit(log); iterLog.steps.push(log);
          } else if (!raced || !raced.ok || !raced.renewedUrl) {
            // remediationEngine returned a non-ok envelope (e.g. Vercel
            // returned READY=ERROR/CANCELED/TIMEOUT). Degrade gracefully.
            deployDegraded = true;
            previewUrl = null;
            const log = makeStepLog({
              iteration: iterationNumber, step: 10, status: 'degraded',
              tool: 'remediationEngine.js (PATH B file-tree upload)',
              why: 'PATH B universal-mode deploy — FlowAI Vercel account, no operator repo required',
              result: {
                previewUrl: null,
                reason: raced?.reason || 'deploy_failed',
                detail: raced?.error || raced?.reason || 'remediationEngine returned non-ok envelope',
              },
              durationMs: Date.now() - t0, mode: state.mode,
            });
            emit(log); iterLog.steps.push(log);
          } else {
            // Happy path.
            previewUrl = raced.renewedUrl;
            finalPreviewUrl = previewUrl;
            const log = makeStepLog({
              iteration: iterationNumber, step: 10, status: 'complete',
              tool: 'remediationEngine.js (PATH B file-tree upload)',
              why: 'PATH B universal-mode deploy — FlowAI Vercel account, no operator repo required',
              result: { previewUrl, path: raced.path, deploymentId: raced.deploymentId ?? null },
              durationMs: Date.now() - t0, mode: state.mode,
            });
            emit(log); iterLog.steps.push(log);
          }
        } else {
          // PATH A — operator branch deploy. No graceful-timeout wrapper here;
          // PATH A keeps the existing fail-fast semantic since operators expect
          // a clear failure when their branch build doesn't deploy.
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
          // DISPATCH 26: Vercel's deployments API returns the host without a
          // protocol prefix (e.g. "app-xyz.vercel.app"). Downstream
          // produceMonitorText → fetchUrlContent calls `new URL(url)` which
          // throws "Failed to parse URL" without a scheme. Normalise here so
          // STEP 11 doesn't crash on the deploy adapter's bare-host output.
          previewUrl = typeof deployment.previewUrl === 'string'
            && deployment.previewUrl.length > 0
            && !/^https?:\/\//i.test(deployment.previewUrl)
              ? `https://${deployment.previewUrl}`
              : deployment.previewUrl;
          finalPreviewUrl = previewUrl;
          const log = makeStepLog({
            iteration: iterationNumber, step: 10, status: 'complete',
            tool: 'vercelBranchDeploy.js (PATH A operator branch deploy)',
            why: 'live preview for score verification before PR',
            result: { previewUrl, deploymentId: deployment.deploymentId },
            durationMs: Date.now() - t0, mode: state.mode,
          });
          emit(log); iterLog.steps.push(log);
        }
      } catch (e) {
        // PATH A errors still fail the pipeline (operator path expects failure
        // semantics). PATH B errors are caught above and degrade gracefully.
        return buildFailureReturn({ runId, mode: state.mode, product,
          orchestrationLog, iterations, failedStep: 'STEP_10',
          error: e?.message ?? String(e), code: e?.code ?? 'DEPLOY_FAILED' });
      }
    }
    await state.checkpoint(onCheckpoint, { lastStep: 10, iteration: iterationNumber });

    // DISPATCH 26: when PATH B deploy degraded, score the ORIGINAL URL
    // instead of the (non-existent) preview URL. STEP 11 needs a URL to
    // score; substituting the original keeps the pipeline progressing.
    const postFixUrl = (deployDegraded || !previewUrl) ? currentUrl : previewUrl;

    // STEP 11 — Five-Layer Scoring (Post-Fix).
    // DISPATCH 6: token was minted in STEP 8 and is always available
    // here. Pass githubRepoUrl + token so the post-score reflects the
    // newly-deployed branch's source (the source on disk is what STEP 7
    // just edited, so the GitHub enrichment captures the post-fix
    // state of the codebase, not just the rendered URL).
    //
    // DISPATCH 24: crawlReport is passed through to produceMonitorText
    // here too — same rationale as STEP 5 above. The post-fix score
    // benefits from the same crawl signal.
    let postScoreEnvelope;
    try {
      const t0 = Date.now();
      // DISPATCH 26: on deploy-degraded (PATH B timeout/error), `postFixUrl`
      // falls back to the original URL so STEP 11 still has something to
      // score. On the happy path postFixUrl === previewUrl.
      const postMonitor = await _produceMonitorText({
        url: postFixUrl, productId, runId,
        githubRepoUrl: githubRepoUrl || undefined,
        token: token || undefined,
        crawlReport: crawlOutput,
      });
      postScoreEnvelope = await _computeScore({
        productId, url: postFixUrl, runId, monitorText: postMonitor.monitorText,
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
    // PATH B uses the universal-mode defaults synthesized into product;
    // PATH A uses the loaded registry policy; both fall back to ALWAYS_OPEN
    // with conservative thresholds when neither is set.
    const decisionPolicy = policy ?? (pathB ? {
      selfRenewalNegativeDeltaPolicy: product.self_renewal_negative_delta_policy ?? 'ALWAYS_OPEN',
      selfRenewalMinimumDelta:        product.self_renewal_minimum_delta ?? 1,
      selfRenewalSubstantialThreshold: product.self_renewal_substantial_threshold ?? 5,
    } : {
      selfRenewalNegativeDeltaPolicy: 'ALWAYS_OPEN',
      selfRenewalMinimumDelta: 0,
      selfRenewalSubstantialThreshold: 5,
    });
    const decision = _evaluateDelta({
      preScore: preScoreEnvelope, postScore: postScoreEnvelope,
      policy: decisionPolicy, runId, productId,
    });
    iterLog.preScore = preScoreEnvelope.total;
    iterLog.postScore = postScoreEnvelope.total;
    iterLog.delta = delta;
    iterLog.totalImprovement = totalImprovement;
    iterLog.gtmReady = postScoreEnvelope.total >= gtmTarget;
    iterLog.branchName = pathB ? null : branchName;
    iterLog.previewUrl = previewUrl;
    iterLog.decision = decision.action;
    iterLog.path = pathB ? 'B' : 'A';
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

  // STEP 13 — Final PR Creation. PATH A only (PATH B has no upstream
  // GitHub repo to PR against; preview URL is the deliverable).
  const lastIter = iterations[iterations.length - 1] || {};
  if (pathB) {
    emit(makeStepLog({
      iteration: iterations.length, step: 13, status: 'skipped',
      tool: 'githubPrWriter.js',
      why: 'human review gate — NEVER auto-merge',
      result: { skipped: 'PATH B — no operator GitHub repo; preview URL is the deliverable' },
      mode: state.mode, canInterrupt: false,
    }));
  } else if (lastIter.branchName && token) {
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
export async function prioritizeIssuesWithClaude({ preScore, product, suppliedIssue, fileList = null, opts = {} }) {
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

  // DISPATCH 27: when a real fileList is provided (from GitHub Trees API),
  // Claude is told to choose ONLY from that list — eliminates the "guessed
  // paths that 404 on fetch" failure mode from DISPATCH 26's live run.
  // Falls back to the "likely Vite+React paths" hint when no fileList is
  // available (Claude unavailable for tree fetch, PATH B with no repo, etc.).
  const hasRealFileList = Array.isArray(fileList) && fileList.length > 0;
  // Cap the file list in the prompt to keep token budget bounded. The Trees
  // API can return thousands of entries on large monorepos; we filter to
  // source-shaped files and cap at 200.
  const filteredFileList = hasRealFileList
    ? fileList
        .filter((p) => typeof p === 'string' && /\.(js|jsx|ts|tsx|md|json|html|css|scss|vue|svelte|mjs|cjs)$/i.test(p))
        .slice(0, 200)
    : null;

  const fileListSection = (filteredFileList && filteredFileList.length > 0)
    ? [
        'REAL repo file list (use ONLY these paths — do NOT invent paths that are not in this list):',
        ...filteredFileList.map((p) => `  - ${p}`),
        '',
        'CRITICAL: if you propose a `filePath` that is NOT in the list above, your suggestion will be discarded. Choose only from the list.',
      ]
    : [
        'No repo file list provided. Assume this is a Vite + React app. Likely source files:',
        '  - README.md',
        '  - package.json',
        '  - index.html',
        '  - src/App.jsx',
        '  - src/main.jsx',
        '  - src/pages/Home.jsx',
        '  - src/components/Hero.jsx',
        '  - src/components/Pricing.jsx',
        '  - src/components/Footer.jsx',
      ];

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
    ...fileListSection,
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
  fetchRepoFileList,
  buildPrBody,
  OrchestrationState,
});
