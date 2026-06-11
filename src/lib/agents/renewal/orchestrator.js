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
 *   - iterationNumber >= maxIterations            → MAX_ITERATIONS (explicit operator/failsafe cap)
 *   - 3 consecutive delta <= 0 iterations         → NO_IMPROVEMENT
 *   - user called stop() before next iteration    → USER_STOPPED
 *   - any step throws unrecoverably               → STEP_FAILED
 */

'use strict';

import { checkRateCap, checkRunawayDetector } from './rateCap.js';
import { getInstallationToken } from './githubApp.js';
import { produceMonitorText } from './monitorTextProducer.js';
import { computeScore } from './preScoreAdapter.js';
import { scoreCrawlOutput } from './gtmReadinessScorer.js';
import { generateFix, __internals as fixGenInternals } from './fixGenerator.js';
import {
  LLM_FIX_BUDGET_EXCEEDED,
  LLM_FIX_FEATURE_DISABLED,
  enforceLlmFixBudget,
  isForbiddenLlmSourcePath,
  llmFixesEnabled,
  shouldUseDeterministicRepairFirst,
  summarizeLlmAttempt,
  validateLlmFixCandidate,
} from './llmFixSafeguards.js';
import { createRenewalBranch, commitFileToBranch } from './githubBranchWriter.js';
import { probeGithubOperatorRepoAccess } from './githubOperatorRepoProbe.js';
import { deployBranchPreview } from './vercelBranchDeploy.js';
import { evaluateDelta } from './deltaPolicy.js';
import { createRenewalPr } from './githubPrWriter.js';
import {
  parseGithubRepoUrl,
  resolveVercelProjectId,
  fetchFileContent,
  readProductPolicy,
  appendGovernanceEntry,
  ensureProductSsotRow,
} from './optionCPipeline.js';
import { aggressiveCrawl } from '../../../../api/_lib/crawler.js';
import { conductStructuredCrawl } from './crawlOutputAdapter.js';
import { probeAdversarialSurface, probeAllPages } from './adversarialSurface.js';
import { remediate as remediationEngine } from '../../../../api/_lib/remediationEngine.js';
import { runEvaluationPipeline } from '../../evaluation/evaluationPipeline.js';
import { runRemediation } from '../../remediation/runRemediation.js';
import { getMigrationModeFlag } from '../../runtimeFeatureFlags.js';
import {
  mapFindingsToSource,
  sourcePathForFinding,
} from '../../sourceMapping/registeredRepoSourceMapper.js';
import { generateSourceMappedFixProposals } from '../../sourceMapping/sourceMappedFixGenerator.js';
import { findRegisteredProductConfigForUrl } from '../../products/registeredProductConfig.js';
import { applyUpgradeTargetsToProduct, resolveProductUpgradeTargets } from '../../products/upgradeTargetResolver.js';
import { normalizeFlowAIInput, parseUserObjectives, summarizeFlowAIInputContext } from '../../flowai/unifiedRunInput.js';
import { buildFlowAIInputStepMatrix } from '../../flowai/inputStepMatrix.js';
import { buildSsotVocabularyContext, toSsotOrchestraExecutionMode } from '../../flowai/ssotVocabularyAdapters.js';
import { provisionUpgradeTarget } from '../../provisioning/upgradeTargetProvisioner.js';
import { captureBaselineSnapshot } from '../../verification/baselineSnapshot.js';
import { capturePostFixSnapshot } from '../../verification/postFixSnapshot.js';
import { calculateTransformationDelta } from '../../verification/deltaCalculator.js';
import { classifyPatchEffects } from '../../verification/patchEffectClassifier.js';
import { runRegressionGate } from '../../verification/regressionGate.js';
import { runMigration } from '../../migration/migrationOrchestrator.js';
import {
  computeCapabilityWeightedScore,
  decideGtmGate,
  MINIMUM_SCORED_DIMENSIONS_FOR_GTM,
} from '../../scoring/capabilityWeightedScore.js';
import { buildOperatorCredentialReadinessGovernanceEntry } from '../../operatorCredentialReadiness.js';
import { randomUUID } from 'node:crypto';

export const GTM_READY_SCORE = 95;
export const DEFAULT_MAX_ITERATIONS = 1000;
export const NO_IMPROVEMENT_STREAK_LIMIT = 3;
export const SMALL_SITE_PAGE_LIMIT = 10;
export const SMALL_SITE_EFFORT_PROFILE = Object.freeze({
  crawlMaxPages: 10,
  crawlDepth: 3,
  phaseBMaxPages: 5,
  phaseBProbeBudgetMs: 60_000,
  phaseBOverallBudgetMs: 90_000,
  phaseBPerPageBudgetMs: 18_000,
  phaseBMaxInteractives: 8,
  postFixReprobe: false,
});
export const PHASE_B_ENRICHMENT_TIMEOUT_MS = 45_000;
export const MAX_PHASE_B_ENRICHMENT_TIMEOUT_MS = 60_000;
export const FORGE_STEP5_TO_STEP6_TIMEOUTS_MS = Object.freeze({
  monitorText: 45_000,
  computeScore: 45_000,
  structuredCrawl: 30_000,
  probeAllPages: 45_000,
  probeAdversarialSurface: 45_000,
  runEvaluationPipeline: 60_000,
  getInstallationToken: 15_000,
  fetchRepoFileList: 15_000,
  fetchFileContent: 15_000,
  prioritizeIssuesWithClaude: 30_000,
  generateFix: 30_000,
  construction: 30_000,
  remediation: 30_000,
  createRenewalBranch: 15_000,
  commitFileToBranch: 15_000,
  deployBranchPreview: 60_000,
  postFixEvaluationPipeline: 45_000,
  postFixMonitorText: 45_000,
  postFixComputeScore: 45_000,
  postFixCrawl: 45_000,
  postFixProbeAllPages: 45_000,
  createRenewalPr: 20_000,
  governanceWrite: 20_000,
  toolSelections: 8_000,
});
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

function makeForgeUserStepLog({
  iteration,
  internalStep,
  userStep,
  key,
  label,
  status,
  why,
  result,
  mode,
}) {
  return makeStepLog({
    iteration,
    step: internalStep,
    status,
    tool: `Forge user step ${userStep}: ${label}`,
    why,
    result: {
      kind: 'forge.user_step.v1',
      userStep,
      key,
      label,
      ...(result && typeof result === 'object' ? result : {}),
    },
    durationMs: 0,
    mode,
    canInterrupt: false,
  });
}

function boundedTimeoutMs(value, fallback = PHASE_B_ENRICHMENT_TIMEOUT_MS) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.min(value, MAX_PHASE_B_ENRICHMENT_TIMEOUT_MS));
}

function boundedOperationTimeoutMs(value, fallback) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.min(value, fallback));
}

function withTimeout(promise, { timeoutMs, code, message }) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(message), { code }));
    }, timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeoutPromise])
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
}

function makeAbortableFetch({ timeoutMs, code, message, fetchImpl = globalThis.fetch }) {
  if (typeof fetchImpl !== 'function') return fetchImpl;
  return async (input, init = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(Object.assign(new Error(message), { code }));
    }, timeoutMs);
    timer.unref?.();
    try {
      return await fetchImpl(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}

function recordPipelineError(state, key, value) {
  state.pipelineErrors = {
    ...(state.pipelineErrors && typeof state.pipelineErrors === 'object' ? state.pipelineErrors : {}),
    [key]: value,
  };
}

function makeDegradedScoreEnvelope({ productId, url, runId, fallbackScore = 0, label = 'degraded-timeout-baseline' }) {
  const total = Number.isFinite(fallbackScore) ? Math.max(0, Math.min(100, fallbackScore)) : 0;
  const layer = total / 5;
  return Object.freeze({
    productId,
    url,
    runId,
    total,
    l1: layer,
    l2: layer,
    l3: layer,
    l4: layer,
    l5: layer,
    label,
    degraded: true,
  });
}

function hasDegradedScoreEvidence(record) {
  return record?.scoreEvidenceDegraded === true
    || record?.preScoreDegraded === true
    || record?.postScoreDegraded === true
    || record?.fiveLayerScoreDegraded === true
    || record?.scoreEnvelope?.degraded === true
    || record?.preScoreEnvelope?.degraded === true
    || record?.postScoreEnvelope?.degraded === true
    || record?.degraded === true;
}

function computeProgress({ originalScore, currentScore, target }) {
  if (!Number.isFinite(currentScore) || !Number.isFinite(originalScore)) return 0;
  // If already at or above target, progress is complete.
  if (currentScore >= target) return 100;
  const span = Math.max(1, target - originalScore);
  const moved = Math.max(0, currentScore - originalScore);
  return Math.min(100, Math.round((moved / span) * 100));
}

function resolveOriginalProductUrl({ product, initialUrl } = {}) {
  return product?.original_url
    ?? product?.__sourceUrl
    ?? product?.product_url
    ?? initialUrl
    ?? null;
}

function firstNonEmptyString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? null;
}

function resolveDeliveredUpgradeUrl({ iterations = [] } = {}) {
  for (let i = iterations.length - 1; i >= 0; i -= 1) {
    const previewUrl = iterations[i]?.previewUrl;
    if (typeof previewUrl === 'string' && previewUrl.length > 0) return previewUrl;
  }
  return null;
}

function resolveProductUpgradeFallback(product = {}) {
  const deploymentUrl = firstNonEmptyString(
    product?.deployment_url,
    product?.deploymentUrl,
    product?.upgrade_url,
    product?.upgradeUrl,
  );
  if (deploymentUrl && product?.deployment_status === 'deployed') {
    return Object.freeze({
      url: deploymentUrl,
      kind: 'deployment',
      status: 'deployed',
      reason: null,
      detail: null,
    });
  }

  const repoUrl = firstNonEmptyString(
    product?.upgrade_repo_url,
    product?.upgrade_repo,
    product?.upgradeRepo,
    product?.write_repo,
    product?.writeRepo,
  );
  if (repoUrl) {
    return Object.freeze({
      url: repoUrl,
      kind: 'repo',
      status: 'repo_available',
      reason: 'UPGRADE_REPO_AVAILABLE',
      detail: 'Upgrade repo exists, but no verified deployment URL is stored.',
    });
  }

  return Object.freeze({
    url: null,
    kind: 'missing',
    status: 'not_deployed',
    reason: null,
    detail: null,
  });
}

function pickSafeDiagnosticFields(value = {}) {
  const safe = {};
  for (const field of ['code', 'status', 'statusText', 'githubMessage', 'githubErrors']) {
    const entry = value?.[field];
    if (entry !== undefined && entry !== null) safe[field] = entry;
  }
  return safe;
}

function buildUpgradeDeliveryEnvelope({ product, initialUrl, iterations = [], skippedSteps = [] } = {}) {
  const originalUrl = resolveOriginalProductUrl({ product, initialUrl });
  const deliveredUrl = resolveDeliveredUpgradeUrl({ iterations });
  const fallback = resolveProductUpgradeFallback(product);
  const upgradedUrl = deliveredUrl ?? fallback.url;
  const deploySkip = Array.isArray(skippedSteps)
    ? [...skippedSteps].reverse().find((step) => Number(step?.step) === 10 && step?.autoFixSkippedReason)
    : null;
  const upgradeDeployed = Boolean(deliveredUrl) || fallback.status === 'deployed';
  return Object.freeze({
    originalUrl,
    upgradedUrl,
    upgradeDeployed,
    upgradeDeployStatus: upgradedUrl
      ? (upgradeDeployed ? 'deployed' : fallback.status)
      : (deploySkip ? 'blocked' : 'not_deployed'),
    upgradeDeployReason: upgradeDeployed
      ? null
      : (fallback.reason ?? deploySkip?.autoFixSkippedReason ?? null),
    upgradeDeployDetail: upgradeDeployed
      ? null
      : (fallback.detail ?? deploySkip?.detail ?? null),
  });
}

function siteSizeFromCrawl(crawlLike = {}) {
  const candidates = [
    crawlLike.pagesActuallyCrawled,
    crawlLike.pagesCrawled,
    Array.isArray(crawlLike.pages) ? crawlLike.pages.length : null,
    crawlLike.pagesDiscovered,
  ].filter((value) => Number.isFinite(value) && value > 0);
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

function buildPipelineEffortProfile({ args = {}, crawlSummary = null } = {}) {
  const detectedPages = siteSizeFromCrawl(crawlSummary ?? {});
  const smallSite = Number.isFinite(detectedPages) && detectedPages <= SMALL_SITE_PAGE_LIMIT;
  const profile = smallSite ? SMALL_SITE_EFFORT_PROFILE : {};
  return Object.freeze({
    detectedPages,
    smallSite,
    crawlMaxPages: Number.isFinite(args.crawlMaxPages)
      ? args.crawlMaxPages
      : (smallSite ? Math.max(detectedPages, profile.crawlMaxPages) : 50),
    crawlDepth: Number.isFinite(args.crawlMaxDepth)
      ? args.crawlMaxDepth
      : (smallSite ? profile.crawlDepth : 5),
    structuredCrawlMaxPages: Number.isFinite(args.structuredCrawlMaxPages)
      ? args.structuredCrawlMaxPages
      : (smallSite ? Math.max(detectedPages, profile.crawlMaxPages) : 50),
    structuredCrawlDepth: Number.isFinite(args.structuredCrawlDepth)
      ? args.structuredCrawlDepth
      : (smallSite ? profile.crawlDepth : 5),
    phaseBMaxPages: Number.isFinite(args.phaseBMaxPages)
      ? args.phaseBMaxPages
      : (smallSite ? profile.phaseBMaxPages : 25),
    phaseBProbeBudgetMs: Number.isFinite(args.phaseBProbeBudgetMs)
      ? args.phaseBProbeBudgetMs
      : (smallSite ? profile.phaseBProbeBudgetMs : undefined),
    phaseBOverallBudgetMs: Number.isFinite(args.phaseBOverallBudgetMs)
      ? args.phaseBOverallBudgetMs
      : (smallSite ? profile.phaseBOverallBudgetMs : undefined),
    phaseBPerPageBudgetMs: Number.isFinite(args.phaseBPerPageBudgetMs)
      ? args.phaseBPerPageBudgetMs
      : (smallSite ? profile.phaseBPerPageBudgetMs : undefined),
    phaseBMaxInteractives: Number.isFinite(args.phaseBMaxInteractives)
      ? args.phaseBMaxInteractives
      : (smallSite ? profile.phaseBMaxInteractives : undefined),
    postFixReprobe: typeof args.postFixReprobe === 'boolean'
      ? args.postFixReprobe
      : (smallSite ? profile.postFixReprobe : true),
  });
}

/**
 * Resolve the live (deployed) URL for a product. P12 product-agnostic
 * expansion: source is the product_registry row's product_url
 * column (added by migration 0021). No code fallback map is used;
 * environments where the column hasn't been
 * applied yet — those entries are scheduled for removal once all
 * environments are on 0021.
 *
 * @param {string} productId
 * @param {object} [product]   — optional registry row; if supplied,
 *                               product.product_url is the resolution source.
 * @returns {string|null}
 */
export function resolveLiveUrl(productId, product = null) {
  if (product && typeof product.product_url === 'string' && product.product_url.length > 0) {
    return product.product_url;
  }
  // Legacy fallback — kept ONLY for tests + back-compat with
  return null;
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
export const REGISTERED_OPERATOR_DAILY_RUN_CAP = 1000;

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

function productIdFromRegisteredConfig(config) {
  const source = config?.name || config?.domain || 'registered-product';
  return sanitizeHostname(source).replace(/-/g, '') || 'registeredproduct';
}

function synthesizeOperatorConnectedProduct({ url, config }) {
  return Object.freeze({
    ...PATH_B_DEFAULT_CONFIG,
    product_id: productIdFromRegisteredConfig(config),
    org_id: 'veu-ai-studio',
    github_repo_url: config.upgrade_repo ?? config.repo,
    product_url: config.upgrade_url ?? url,
    original_repo: config.original_repo ?? config.repo,
    original_url: config.original_url ?? url,
    original_status: config.original_status ?? 'read_only_baseline',
    upgrade_repo: config.upgrade_repo ?? config.repo,
    upgrade_url: config.upgrade_url ?? url,
    upgrade_status: config.upgrade_status ?? 'active_upgrade_target',
    upgrade_architecture: config.upgrade_architecture ?? 'fork_based_upgrade',
    self_renewal_enabled: true,
    self_renewal_max_per_day: Math.max(
      Number.isFinite(config.self_renewal_max_per_day) ? config.self_renewal_max_per_day : 0,
      REGISTERED_OPERATOR_DAILY_RUN_CAP,
    ),
    environment: 'prd',
    self_renewal_branch: config.upgrade_branch ?? config.branch ?? 'main',
    __operatorConnected: true,
    __sourceUrl: url,
  });
}

function mergeRegisteredOperatorConfig({ product = {}, url, config }) {
  const synthesized = synthesizeOperatorConnectedProduct({ url, config });
  const configuredCap = Number.isFinite(product.self_renewal_max_per_day)
    ? product.self_renewal_max_per_day
    : 0;
  return Object.freeze({
    ...product,
    original_repo: config.original_repo ?? product.original_repo ?? product.repo,
    original_url: config.original_url ?? product.original_url ?? url,
    original_status: config.original_status ?? product.original_status ?? 'read_only_baseline',
    upgrade_repo: config.upgrade_repo ?? config.repo ?? product.upgrade_repo ?? product.github_repo_url,
    upgrade_url: config.upgrade_url ?? product.upgrade_url ?? product.deployment_url,
    upgrade_status: config.upgrade_status ?? product.upgrade_status ?? 'active_upgrade_target',
    upgrade_repo_status: config.upgrade_repo_status ?? product.upgrade_repo_status,
    deployment_url: config.deployment_url ?? product.deployment_url ?? config.upgrade_url,
    deployment_status: config.deployment_status ?? product.deployment_status,
    upgrade_architecture: config.upgrade_architecture ?? product.upgrade_architecture ?? 'fork_based_upgrade',
    github_repo_url: config.upgrade_repo ?? config.repo ?? product.upgrade_repo ?? product.github_repo_url,
    self_renewal_enabled: true,
    self_renewal_branch: config.upgrade_branch ?? config.branch ?? product.self_renewal_branch ?? product.branch ?? 'main',
    self_renewal_max_per_day: Math.max(
      configuredCap,
      Number.isFinite(config.self_renewal_max_per_day) ? config.self_renewal_max_per_day : 0,
      REGISTERED_OPERATOR_DAILY_RUN_CAP,
    ),
    product_id: product.product_id ?? synthesized.product_id,
    org_id: product.org_id ?? synthesized.org_id,
    environment: product.environment ?? 'prd',
    __operatorConnected: true,
    __sourceUrl: url,
  });
}

function effectiveRateCapForRun({ policy, product, operatorContext } = {}) {
  const configuredCap = Number.isFinite(policy?.selfRenewalMaxPerDay)
    ? policy.selfRenewalMaxPerDay
    : null;
  const registeredOperatorRun = product?.__operatorConnected === true
    && operatorContext?.githubOperatorTokenPresent === true;
  if (registeredOperatorRun) {
    return Math.max(configuredCap ?? 0, REGISTERED_OPERATOR_DAILY_RUN_CAP);
  }
  return configuredCap;
}

function buildRateCapDegradedState(error = {}) {
  return Object.freeze({
    limited: true,
    code: error?.code ?? 'SELF_RENEWAL_RATE_LIMIT',
    allowed: false,
    degraded: true,
    productId: error?.productId ?? null,
    cap: Number.isFinite(error?.cap) ? error.cap : null,
    runsInWindow: Number.isFinite(error?.runsInWindow) ? error.runsInWindow : null,
    windowStart: error?.windowStart instanceof Date
      ? error.windowStart.toISOString()
      : (typeof error?.windowStart === 'string' ? error.windowStart : null),
    nextEligibleAt: error?.nextEligibleAt instanceof Date
      ? error.nextEligibleAt.toISOString()
      : (typeof error?.nextEligibleAt === 'string' ? error.nextEligibleAt : null),
    mutationPolicy: 'read_only_steps_continue; write/pr/deploy/success-governance blocked',
  });
}

function buildRateCapMutationBlock(state, action) {
  const rateCap = state?.rateCapDegraded ?? null;
  return Object.freeze({
    blocked: true,
    code: rateCap?.code ?? 'SELF_RENEWAL_RATE_LIMIT',
    action,
    rateCap,
    detail: 'Self-Renewal rate cap was hit at Step 2; read-only pipeline steps may continue, but mutation/write/PR/deploy actions are blocked.',
  });
}

function resolveGithubOperatorToken(deps = {}) {
  if (typeof deps.githubOperatorToken === 'string' && deps.githubOperatorToken.length > 0) {
    return deps.githubOperatorToken;
  }
  if (typeof process?.env?.GITHUB_OPERATOR_TOKEN === 'string' && process.env.GITHUB_OPERATOR_TOKEN.length > 0) {
    return process.env.GITHUB_OPERATOR_TOKEN;
  }
  if (typeof process?.env?.GITHUB_PAT === 'string' && process.env.GITHUB_PAT.length > 0) {
    return process.env.GITHUB_PAT;
  }
  return null;
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
  }
  // D40 — removed the hardcoded `mypreglife` test-convenience fast-path.
  // Tests that need a PATH-A row must now supply one via
  // deps.discoverProduct (the canonical DI seam) — the engine itself
  // carries zero per-product code paths.

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
    if (!['auto', 'guided', 'manual', 'migration'].includes(newMode)) return false;
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
 * @param {'auto'|'guided'|'manual'|'migration'} [args.mode='auto']
 * @param {string} [args.runId]        — UUID; auto-generated if absent
 * @param {object|null} [args.supabase]
 * @param {string} [args.environment='prd']
 * @param {number} [args.gtmTarget=95]
 * @param {number} [args.maxIterations=1000]
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
  const inputContext = normalizeFlowAIInput(args.input ?? {}, { url: args.url, mode });
  const inputSummary = summarizeFlowAIInputContext(inputContext);
  const userObjectives = parseUserObjectives(inputContext.description);
  const inputStepMatrix = buildFlowAIInputStepMatrix({ inputContext, mode });
  const onStep = typeof args.onStep === 'function' ? args.onStep : () => {};
  const onCheckpoint = typeof args.onCheckpoint === 'function' ? args.onCheckpoint : () => {};
  const onIteration = typeof args.onIteration === 'function' ? args.onIteration : () => {};
  const deps = args.deps || {};
  const phaseBEnrichmentTimeoutMs = boundedTimeoutMs(args.phaseBEnrichmentTimeoutMs);
  const step5ToStep6Timeouts = Object.freeze({
    monitorText: boundedOperationTimeoutMs(args.monitorTextTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.monitorText),
    computeScore: boundedOperationTimeoutMs(args.computeScoreTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.computeScore),
    structuredCrawl: boundedOperationTimeoutMs(args.structuredCrawlTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.structuredCrawl),
    probeAllPages: boundedOperationTimeoutMs(args.probeAllPagesTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.probeAllPages),
    probeAdversarialSurface: boundedOperationTimeoutMs(args.probeAdversarialSurfaceTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.probeAdversarialSurface),
    runEvaluationPipeline: boundedOperationTimeoutMs(args.runEvaluationPipelineTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.runEvaluationPipeline),
    getInstallationToken: boundedOperationTimeoutMs(args.getInstallationTokenTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.getInstallationToken),
    fetchRepoFileList: boundedOperationTimeoutMs(args.fetchRepoFileListTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.fetchRepoFileList),
    fetchFileContent: boundedOperationTimeoutMs(args.fetchFileContentTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.fetchFileContent),
    prioritizeIssuesWithClaude: boundedOperationTimeoutMs(args.prioritizeIssuesWithClaudeTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.prioritizeIssuesWithClaude),
    generateFix: boundedOperationTimeoutMs(args.generateFixTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.generateFix),
    construction: boundedOperationTimeoutMs(args.constructionTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.construction),
    remediation: boundedOperationTimeoutMs(args.remediationTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.remediation),
    createRenewalBranch: boundedOperationTimeoutMs(args.createRenewalBranchTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.createRenewalBranch),
    commitFileToBranch: boundedOperationTimeoutMs(args.commitFileToBranchTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.commitFileToBranch),
    deployBranchPreview: boundedOperationTimeoutMs(args.deployBranchPreviewTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.deployBranchPreview),
    postFixEvaluationPipeline: boundedOperationTimeoutMs(args.postFixEvaluationPipelineTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.postFixEvaluationPipeline),
    postFixMonitorText: boundedOperationTimeoutMs(args.postFixMonitorTextTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.postFixMonitorText),
    postFixComputeScore: boundedOperationTimeoutMs(args.postFixComputeScoreTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.postFixComputeScore),
    postFixCrawl: boundedOperationTimeoutMs(args.postFixCrawlTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.postFixCrawl),
    postFixProbeAllPages: boundedOperationTimeoutMs(args.postFixProbeAllPagesTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.postFixProbeAllPages),
    createRenewalPr: boundedOperationTimeoutMs(args.createRenewalPrTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.createRenewalPr),
    governanceWrite: boundedOperationTimeoutMs(args.governanceWriteTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.governanceWrite),
    toolSelections: boundedOperationTimeoutMs(args.toolSelectionsTimeoutMs, FORGE_STEP5_TO_STEP6_TIMEOUTS_MS.toolSelections),
  });
  const migrationFlag = mode === 'migration'
    ? await isMigrationModeExecutionEnabled(deps.env || process.env)
    : { enabled: false, source: 'not_checked' };
  if (mode === 'migration' && !migrationFlag.enabled) {
    return {
      runId,
      mode,
      runMode: 'MIGRATION_DISABLED',
      universalMode: false,
      autoFixAvailable: false,
      registerCTA: false,
      gtmReady: false,
      exitReason: 'MIGRATION_MODE_DISABLED',
      originalScore: 0,
      finalScore: 0,
      totalDelta: 0,
      iterationsCompleted: 0,
      iterations: [],
      orchestrationLog: [],
      previewUrl: null,
      prUrl: null,
      skippedSteps: [],
      migrationModeDisabled: true,
      migrationMessage: 'Migration Mode is currently disabled.',
      migrationFlagSource: migrationFlag.source,
    };
  }
  const githubOperatorToken = resolveGithubOperatorToken(deps);
  const operatorMode = githubOperatorToken ? 'github_connected' : 'universal';

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
  const _probeGithubOperatorRepoAccess = deps.probeGithubOperatorRepoAccess || probeGithubOperatorRepoAccess;
  const _deployBranchPreview    = deps.deployBranchPreview    || deployBranchPreview;
  const _evaluateDelta          = deps.evaluateDelta          || evaluateDelta;
  const _createRenewalPr        = deps.createRenewalPr        || createRenewalPr;
  const _readProductPolicy      = deps.readProductPolicy      || readProductPolicy;
  const _appendGovernanceEntry  = deps.appendGovernanceEntry  || appendGovernanceEntry;
  const _ensureProductSsotRow   = deps.ensureProductSsotRow   || ensureProductSsotRow;
  const _remediationEngine      = deps.remediationEngine      || remediationEngine;
  // CA-17 Phase 1 — Build/Wire ConstructionEngine hook (DI-only; default no-op).
  // When a product_registry row sets construction_eligible = true AND Phase B
  // findings carry wire_up candidates, the engine generates real endpoint code
  // + frontend wiring per CA-17 §4 (S1→S2→S6→GENERATE→S4→S5 envelopes). The
  // resulting files are merged into fileChanges before the existing
  // commit + deploy path. Default deps.runConstruction === null = standard
  // flow unchanged.
  const _runConstruction        = (typeof deps.runConstruction === 'function')
    ? deps.runConstruction
    : null;
  // DISPATCH 28: scoreCrawlOutput is DI-overridable so tests can drive
  // the §7.6 gate without having to construct issue-shaped crawl mocks.
  const _scoreCrawlOutput       = deps.scoreCrawlOutput       || scoreCrawlOutput;
  // PHASE B1 — Multi-engine evaluation pipeline (Lighthouse + axe-core +
  // runtimeDiagnostics, plus pass-through Phase B). DI-overridable so
  // tests can stub it with deterministic findings.
  const _runEvaluationPipeline  = deps.runEvaluationPipeline  || runEvaluationPipeline;
  // PHASE B2 — Rule-based remediation pipeline (classifier → budget →
  // patch generators → conflict detection). DI-overridable for tests.
  const _runRemediation         = deps.runRemediation         || runRemediation;
  const _captureBaselineSnapshot = deps.captureBaselineSnapshot || captureBaselineSnapshot;
  const _capturePostFixSnapshot = deps.capturePostFixSnapshot || capturePostFixSnapshot;
  const _calculateTransformationDelta = deps.calculateTransformationDelta || calculateTransformationDelta;
  const _classifyPatchEffects = deps.classifyPatchEffects || classifyPatchEffects;
  const _runRegressionGate = deps.runRegressionGate || runRegressionGate;
  const _runMigration = deps.runMigration || runMigration;
  const _mapFindingsToSource = deps.mapFindingsToSource || mapFindingsToSource;
  const _generateSourceMappedFixProposals = deps.generateSourceMappedFixProposals || generateSourceMappedFixProposals;
  const phaseBBudget = {
    probeBudgetMs: Number.isFinite(args.phaseBProbeBudgetMs) ? args.phaseBProbeBudgetMs : undefined,
    overallBudgetMs: Number.isFinite(args.phaseBOverallBudgetMs) ? args.phaseBOverallBudgetMs : undefined,
    perPageBudgetMs: Number.isFinite(args.phaseBPerPageBudgetMs) ? args.phaseBPerPageBudgetMs : undefined,
    maxInteractives: Number.isFinite(args.phaseBMaxInteractives) ? args.phaseBMaxInteractives : undefined,
  };
  const evaluationRuntimeOptions = {
    evaluationTier: typeof args.evaluationTier === 'string' ? args.evaluationTier : undefined,
    gotoTimeoutMs: Number.isFinite(args.evaluationGotoTimeoutMs) ? args.evaluationGotoTimeoutMs : undefined,
    postNavWaitMs: Number.isFinite(args.evaluationPostNavWaitMs) ? args.evaluationPostNavWaitMs : undefined,
  };
  let effortProfile = buildPipelineEffortProfile({ args });
  if (typeof deps.probeAllPages === 'function' && args.postFixReprobe !== false) {
    effortProfile = Object.freeze({ ...effortProfile, postFixReprobe: true });
  }

  const state = new OrchestrationState({ mode, maxIterations, gtmTarget });
  const ssotVocabulary = buildSsotVocabularyContext({
    orchestraMode: state.mode,
    systemOperationLevel: args.systemOperationLevel ?? args.agenticMode ?? null,
  });
  state.operatorMode = operatorMode;
  state.operatorContext = Object.freeze({
    operator_mode: operatorMode,
    githubOperatorTokenPresent: !!githubOperatorToken,
    tokenRedacted: true,
    repoAccess: null,
  });
  state.terminalFailure = null;
  state.llmFixCallsThisRun = 0;
  state.llmFixAttempts = [];
  const orchestrationLog = [];
  const iterations = [];

  // Expose mutation surface back to the caller via the deps proxy.
  if (deps.__exposeState) deps.__exposeState(state);

  const emit = (log) => {
    orchestrationLog.push(log);
    try { onStep(log); } catch { /* swallow */ }
  };

  const persistStepFailure = async ({ product: failureProduct, failedStep, error, code, diagnostics }) => {
    const productIdForFailure = failureProduct?.product_id ?? null;
    if (!productIdForFailure || typeof _appendGovernanceEntry !== 'function') {
      return { written: false, reason: 'no_product_context' };
    }
    const safeDiagnostics = pickSafeDiagnosticFields(diagnostics);
    try {
      return await withTimeout(_appendGovernanceEntry({
        productId: productIdForFailure,
        environment,
        entry: {
          kind: 'self_renewal.step_failed.v1',
          runId,
          productId: productIdForFailure,
          url: inputContext.url ?? args.url ?? null,
          product: failureProduct?.name ?? failureProduct?.product_name ?? failureProduct?.product_id ?? null,
          mode: state.mode,
          ssotVocabulary,
          failedStep,
          errorCode: code ?? safeDiagnostics.code ?? 'UNKNOWN',
          message: typeof error === 'string' ? error.slice(0, 500) : null,
          diagnostics: safeDiagnostics,
          commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
          branch: process.env.VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_BRANCH ?? null,
          at: new Date().toISOString(),
        },
        supabase,
      }), {
        timeoutMs: step5ToStep6Timeouts.governanceWrite,
        code: 'STEP_FAILURE_GOVERNANCE_WRITE_TIMEOUT',
        message: `step failure governance write exceeded ${step5ToStep6Timeouts.governanceWrite}ms`,
      });
    } catch (failureArtifactError) {
      return {
        written: false,
        reason: failureArtifactError?.message ?? String(failureArtifactError),
      };
    }
  };

  const failStep = async ({ product: failureProduct, failedStep, error, code, diagnostics }) => {
    const safeDiagnostics = pickSafeDiagnosticFields(diagnostics);
    const failureArtifact = await persistStepFailure({
      product: failureProduct,
      failedStep,
      error,
      code,
      diagnostics: { ...safeDiagnostics, code },
    });
    return buildFailureReturn({
      runId,
      mode: state.mode,
      product: failureProduct,
      orchestrationLog,
      iterations,
      failedStep,
      error,
      code,
      diagnostics: { ...safeDiagnostics, code },
      failureArtifact,
    });
  };

  const recordTerminalFailure = async ({ product: failureProduct, failedStep, error, code, diagnostics, remediation }) => {
    const safeDiagnostics = {
      ...pickSafeDiagnosticFields(diagnostics),
      code,
      remediation: remediation ?? null,
    };
    const failureArtifact = await persistStepFailure({
      product: failureProduct,
      failedStep,
      error,
      code,
      diagnostics: safeDiagnostics,
    });
    state.terminalFailure = Object.freeze({
      failedStep,
      error,
      code,
      diagnostics: safeDiagnostics,
      remediation: remediation ?? null,
      failureArtifact,
    });
    return state.terminalFailure;
  };

  emit(makeStepLog({
    iteration: 0, step: 0, status: 'complete',
    tool: 'GitHub operator credential mode',
    why: 'select repo-write capability mode from GITHUB_OPERATOR_TOKEN availability',
    result: {
      kind: 'operator_mode',
      operator_mode: operatorMode,
      githubOperatorTokenPresent: !!githubOperatorToken,
      tokenRedacted: true,
    },
    mode: state.mode,
  }));

  emit(makeStepLog({
    iteration: 0, step: 0, status: 'complete',
    tool: 'FlowAI unified input context',
    why: 'SSOT §10/§12 - every 8-step run receives the same URL, description, and attachment context with explicit usage accounting',
    result: {
      inputSummary,
      inputStepMatrix,
      userObjectives,
    },
    mode: state.mode,
  }));

  // ── W6 INTEGRATION — STEP 3a Tool Intelligence wiring (CA-18 §6) ──────────
  //
  // Lazy-import the Tool Intelligence Service so the renewal pipeline
  // doesn't carry a hard dependency. Best-effort: any failure surfaces
  // as a `tool_intel_skipped` step event and the pipeline continues
  // (recommend_only invariant — tool selection never blocks execution).
  //
  // The service produces a `tool.selection` envelope per AutoRunner step
  // (research/design/build/qa_audit/deploy/monitor/govern/gtm) which we
  // write into product_ssot.governance_record alongside the run's
  // orchestration_complete entry. That gives ≥8 tool.selection envelopes
  // per governance_record write — far above the acceptance bar of ≥1.
  let toolIntelligenceService = null;
  let toolIntelligenceAttachReason = 'not_attached';
  const ssotOrchestraExecutionMode = toSsotOrchestraExecutionMode(state.mode) ?? 'AUTOMATIC';
  const toolIntelligenceServiceMode = ssotOrchestraExecutionMode === 'MANUAL-ORCHESTRA'
    ? 'MANUAL'
    : ssotOrchestraExecutionMode;
  try {
    if (supabase && typeof supabase.from === 'function') {
      const _toolIntelModule = await import('../../tools/ToolIntelligenceService.js');
      toolIntelligenceService = _toolIntelModule.createToolIntelligenceService({ client: supabase });
      toolIntelligenceAttachReason = 'attached';
      emit(makeStepLog({
        iteration: 0, step: 0, status: 'complete',
        tool: 'ToolIntelligenceService (lazy-imported)',
        why: 'CA-18 §6 — record per-step tool selection for governance trail',
        result: {
          kind: 'tool_intel_attached',
          mode: ssotOrchestraExecutionMode,
          internalMode: state.mode,
          ssotVocabulary,
        },
        mode: state.mode,
      }));
    } else {
      toolIntelligenceAttachReason = 'supabase_unavailable';
      emit(makeStepLog({
        iteration: 0, step: 0, status: 'skipped',
        tool: 'ToolIntelligenceService',
        why: 'CA-18 §6 — tool selection trail',
        result: { kind: 'tool_intel_skipped', reason: 'supabase_unavailable' },
        mode: state.mode,
      }));
    }
  } catch (e) {
    toolIntelligenceAttachReason = `import_failed:${(e?.message ?? String(e)).slice(0, 100)}`;
    emit(makeStepLog({
      iteration: 0, step: 0, status: 'skipped',
      tool: 'ToolIntelligenceService',
      why: 'CA-18 §6 — tool selection trail',
      result: { kind: 'tool_intel_skipped', reason: toolIntelligenceAttachReason },
      mode: state.mode,
    }));
  }

  // W6 INTEGRATION — emit a tool.selection envelope for each of the 8
  // canonical AutoRunner step keys (per ToolIntelligenceService.STEP_KEYS).
  // recommend_only: any failure is captured locally and never bubbled.
  const toolSelectionEnvelope = ({ stepKey, selection, candidates }) => {
    const list = Array.isArray(candidates)
      ? candidates
      : (Array.isArray(selection) ? selection : (selection ? [selection] : []));
    const selectedTool = Array.isArray(selection) ? selection[0] ?? null : selection ?? null;
    return Object.freeze({
      kind: 'tool_intelligence_selection',
      stepKey,
      mode: ssotOrchestraExecutionMode,
      internalMode: state.mode,
      selected: selectedTool
        ? Object.freeze({
            platform_name: selectedTool.platform_name ?? null,
            platform_type: selectedTool.platform_type ?? null,
            rank: selectedTool.rank ?? null,
            rank_score: selectedTool.rank_score ?? null,
          })
        : null,
      candidates: Object.freeze(list.map((candidate) => Object.freeze({
        platform_name: candidate?.platform_name ?? null,
        platform_type: candidate?.platform_type ?? null,
        rank: candidate?.rank ?? null,
        rank_score: candidate?.rank_score ?? null,
        performance_score: candidate?.performance_score ?? null,
        cost_score: candidate?.cost_score ?? null,
        speed_score: candidate?.speed_score ?? null,
        reliability_score: candidate?.reliability_score ?? null,
      }))),
    });
  };

  const _emitToolSelections = async ({ emitVisible = true, writeGovernance = true } = {}) => {
    if (!toolIntelligenceService) return { written: 0, visible: 0, skipped: 'service_unavailable' };
    const STEP_KEYS = ['research', 'design', 'build', 'qa_audit', 'deploy', 'monitor', 'govern', 'gtm'];
    let written = 0;
    let visible = 0;
    for (const stepKey of STEP_KEYS) {
      try {
        const selection = await toolIntelligenceService.getTopTool(stepKey, undefined, toolIntelligenceServiceMode);
        const candidates = typeof toolIntelligenceService.getRankings === 'function'
          ? await toolIntelligenceService.getRankings(stepKey, undefined)
          : (Array.isArray(selection) ? selection : (selection ? [selection] : []));
        const envelope = toolSelectionEnvelope({ stepKey, selection, candidates });
        if (emitVisible) {
          emit(makeStepLog({
            iteration: iterations.length, step: 0, status: 'complete',
            tool: 'ToolIntelligenceService',
            why: `CA-18 §6 — ranked tool candidates for ${stepKey}`,
            result: envelope,
            mode: state.mode,
          }));
          visible += 1;
        }
        if (writeGovernance) {
          const selected = toolIntelligenceServiceMode === 'GUIDED'
            ? (Array.isArray(selection) ? selection.map((p) => p.platform_name) : null)
            : (selection && typeof selection.platform_name === 'string' ? selection.platform_name : null);
          const result = await _appendGovernanceEntry({
            productId: product?.product_id, environment,
            entry: {
              kind: 'tool.selection.v1',
              runId,
              productId: product?.product_id,
              stepKey,
              mode: ssotOrchestraExecutionMode,
              internalMode: state.mode,
              ssotVocabulary,
              selected,
              at: new Date().toISOString(),
            },
            supabase,
          });
          if (result?.written) written += 1;
        }
      } catch { /* recommend_only — never throw */ }
    }
    return { written, visible };
  };
  // Emit visible ranked candidates before long-running step work so the
  // operator sees the selected tool and ranked pool while the run is active.
  // Governance writes still happen near STEP 14, adjacent to final run state.
  const visibleToolSelectionsResult = await withTimeout(
    _emitToolSelections({
      emitVisible: true,
      writeGovernance: false,
    }),
    {
      timeoutMs: step5ToStep6Timeouts.toolSelections,
      code: 'TOOL_SELECTION_VISIBLE_TIMEOUT',
      message: `visible tool selection emit exceeded ${step5ToStep6Timeouts.toolSelections}ms`,
    },
  ).catch((e) => {
    if (e?.code === 'TOOL_SELECTION_VISIBLE_TIMEOUT') {
      recordPipelineError(state, 'tool_selection_visible', `timeout:${step5ToStep6Timeouts.toolSelections}ms`);
    }
    return { visible: 0, written: 0, error: e?.message ?? String(e), code: e?.code ?? 'TOOL_SELECTION_VISIBLE_FAILED' };
  });
  emit(makeStepLog({
    iteration: iterations.length, step: 0, status: 'complete',
    tool: 'ToolIntelligenceService — per-step ranked candidates',
    why: 'CA-18 §6 — expose ranked tool candidates for operator visibility before live execution',
    result: {
      kind: 'tool_intel_selections_visible',
      visible: visibleToolSelectionsResult.visible ?? 0,
      attachReason: toolIntelligenceAttachReason,
      mode: ssotOrchestraExecutionMode,
      internalMode: state.mode,
      ssotVocabulary,
    },
    mode: state.mode,
  }));

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
    const registeredOperatorProduct = typeof args.url === 'string'
      ? findRegisteredProductConfigForUrl(args.url)
      : null;
    if (registeredOperatorProduct && (!product || product.__pathB === true)) {
      product = synthesizeOperatorConnectedProduct({
        url: args.url,
        config: registeredOperatorProduct,
      });
    } else if (registeredOperatorProduct && product) {
      product = mergeRegisteredOperatorConfig({
        product,
        url: args.url,
        config: registeredOperatorProduct,
      });
    }
    if (!product) {
      // DISPATCH U1 ITEM 3 — when discoverProduct returns null but the
      // caller supplied a URL, synthesize a minimal universal-mode
      // product instead of failing. Unknown URL = DEFAULT path, not an
      // error (per CA-18 §1 "Operator submits any URL"). Only when the
      // caller supplied NO URL do we surface the legacy failure.
      if (typeof args.url === 'string' && args.url.length > 0) {
        product = Object.freeze({
          product_id: `flowai-universal-${runId.slice(0, 8)}`,
          org_id: 'flowai-self-hosted',
          github_repo_url: null,
          self_renewal_enabled: true,
          environment: 'prd',
          __pathB: true,
          __sourceUrl: args.url,
          __detectedRepoUrl: null,
          self_renewal_max_per_day: 3,
          self_renewal_minimum_delta: 1,
          self_renewal_substantial_threshold: 5,
          self_renewal_negative_delta_policy: 'ALWAYS_OPEN',
        });
      } else {
        const failLog = makeStepLog({
          iteration: 0, step: 1, status: 'failed',
          tool: 'product_registry lookup',
          why: 'check if this URL is a known registered product',
          result: { error: 'no_url_supplied_and_no_enabled_product', url: args.url },
          durationMs: Date.now() - t0, mode: state.mode, canInterrupt: false,
        });
        emit(failLog);
        return failStep({
          product: null,
          failedStep: 'STEP_1', error: 'no_url_supplied_and_no_enabled_product',
          code: 'PRODUCT_NOT_FOUND',
        });
      }
    }
    pathB = product.__pathB === true;
    if (!pathB) {
      product = applyUpgradeTargetsToProduct(product);
    }
    // DISPATCH U1 ITEM 3 — universal mode = unknown URL with no
    // detected GitHub repo. This is THE primary use case per CA-18 §1
    // ("Operator submits any URL"). Universal mode runs the full
    // evaluation + scoring + governance trail but skips every step
    // that would mutate a third-party system (no commit, no PR, no
    // deploy). Skipped steps are still recorded — `autoFixSkippedReason`
    // explains why so the governance trail stays honest.
    state.universalMode = pathB && !product.__detectedRepoUrl;
    state.runMode = state.universalMode
      ? 'UNIVERSAL'
      : (pathB ? 'PATH_B_WITH_REPO' : 'PATH_A');
    state.skippedSteps = [];
    emit(makeStepLog({
      iteration: 0, step: 1, status: 'complete',
      tool: 'product_registry lookup',
      why: 'check if this URL is a known registered product',
      result: pathB
        ? {
            path: state.universalMode
              ? 'UNIVERSAL (unknown URL, evaluation-only mode)'
              : 'PATH B (unknown URL with auto-detected repo)',
            runMode: state.runMode,
            productId: product.product_id,
            sourceUrl: product.__sourceUrl,
            detectedRepoUrl: product.__detectedRepoUrl,        // null → universal
            note: state.universalMode
              ? 'evaluation + scoring only; no commit / no PR / no deploy'
              : 'GitHub repo auto-detected; deploy via remediationEngine',
          }
        : {
            path: 'PATH A (known)',
            runMode: state.runMode,
            operator_mode: state.operatorMode,
            productId: product.product_id,
            githubRepoUrl: product.github_repo_url,
            originalRepo: product.original_repo ?? null,
            upgradeRepo: product.upgrade_repo ?? product.github_repo_url,
            upgradeArchitecture: product.upgrade_architecture ?? null,
            operatorConnected: product.__operatorConnected === true,
          },
      durationMs: Date.now() - t0, mode: state.mode,
    }));
    if (!pathB) {
      const readinessEntry = buildOperatorCredentialReadinessGovernanceEntry({
        runId,
        productId: product.product_id,
        mode: state.mode,
        environment,
      });
      const readinessEntryWithSsotVocabulary = Object.freeze({
        ...readinessEntry,
        ssotVocabulary,
      });
      try {
        const readinessWrite = await _appendGovernanceEntry({
          productId: product.product_id,
          environment,
          entry: readinessEntryWithSsotVocabulary,
          supabase,
        });
        emit(makeStepLog({
          iteration: 0, step: 1, status: readinessWrite?.written ? 'complete' : 'degraded',
          tool: 'operator credential readiness',
          why: 'preflight governance record for registered-product operator credentials',
          result: { ...readinessEntryWithSsotVocabulary, write: readinessWrite },
          durationMs: 0, mode: state.mode,
        }));
      } catch (readinessError) {
        emit(makeStepLog({
          iteration: 0, step: 1, status: 'degraded',
          tool: 'operator credential readiness',
          why: 'preflight governance record for registered-product operator credentials',
          result: {
            ...readinessEntry,
            write: { written: false, reason: readinessError?.message ?? String(readinessError) },
          },
          durationMs: 0, mode: state.mode,
        }));
      }
    }
  } catch (e) {
    return failStep({ product: null, failedStep: 'STEP_1',
      error: e?.message ?? String(e), code: e?.code ?? 'UNKNOWN', diagnostics: e });
  }

  const productId = product.product_id;
  const upgradeTargets = resolveProductUpgradeTargets(product);
  const githubRepoUrl = upgradeTargets.upgradeRepo;
  // DISPATCH 34 T2 — per-product branch-of-record (product-agnostic).
  // product_registry.self_renewal_branch (migration 0019) carries the
  // branch the orchestrator should target for Trees API + Contents
  // API + commit operations. Defaults to 'main' for any product whose
  // row lacks the column (back-compat with environments where 0019
  // hasn't been applied yet). PATH B has no registry row → uses 'main'.
  const productBranch = upgradeTargets.upgradeBranch;
  // Prefer the explicit URL caller passed in; otherwise the LIVE deployed
  // URL (NOT the GitHub repo URL, which 404s on direct fetch). Falling
  // back to the repo URL is a last resort and almost certainly fails.
  // D40 — pass the discovered registry row to resolveLiveUrl so the
  // product_url column is used as the primary source, with the legacy
  // map only as fallback. Generic onboarding: add a registry row +
  // product_url → engine runs end-to-end; no code change required.
  const initialUrl = args.url || resolveLiveUrl(productId, product) || githubRepoUrl;

  if (!pathB) {
    emit(makeStepLog({
      iteration: 0, step: 1, status: 'complete',
      tool: 'upgradeTargetResolver.js',
      why: 'enforce fork-based upgrade architecture: original repo is read-only, writes target upgrade repo',
      result: upgradeTargets,
      durationMs: 0, mode: state.mode,
    }));
    const provisioning = await provisionUpgradeTarget({
      product,
      mode: state.mode,
      env: process.env,
      opts: {},
    });
    state.upgradeProvisioning = provisioning;
    emit(makeStepLog({
      iteration: 0, step: 5, status: provisioning.ok ? 'complete' : 'degraded',
      tool: 'upgradeTargetProvisioner.js',
      why: 'SSOT §9/§10 - determine whether upgrade repo and deployment can be auto-provisioned without touching the original',
      result: provisioning,
      durationMs: 0, mode: state.mode,
    }));
  }

  if (state.mode === 'migration') {
    const migrationConfig = args.migration || deps.migration || {};
    const missing = [];
    const sourceRepoPath = migrationConfig.sourceRepoPath || deps.sourceRepoPath;
    const targetRepoPath = migrationConfig.targetRepoPath || deps.targetRepoPath;
    const verifyBuild = migrationConfig.verifyBuild || deps.verifyBuild;
    const verifyLint = migrationConfig.verifyLint || deps.verifyLint;
    const runFocusedTests = migrationConfig.runFocusedTests || deps.runFocusedTests;
    const readFile = migrationConfig.readFile || deps.readFile;
    const writeFile = migrationConfig.writeFile || deps.writeFile;
    const restoreFile = migrationConfig.restoreFile || deps.restoreFile;
    const scanFiles = migrationConfig.scanFiles || deps.scanFiles;

    if (!sourceRepoPath) missing.push('sourceRepoPath');
    if (!targetRepoPath) missing.push('targetRepoPath');
    if (typeof verifyBuild !== 'function') missing.push('verifyBuild');
    if (typeof verifyLint !== 'function') missing.push('verifyLint');
    if (typeof runFocusedTests !== 'function') missing.push('runFocusedTests');
    if (typeof readFile !== 'function') missing.push('readFile');
    if (typeof writeFile !== 'function') missing.push('writeFile');
    if (typeof restoreFile !== 'function') missing.push('restoreFile');

    if (missing.length > 0) {
      const migration = {
        status: 'MIGRATION_CONFIGURATION_REQUIRED',
        filesMigrated: 0,
        dependenciesRemoved: [],
        blockers: missing.map((field) => ({ field, reason: 'missing_migration_hook' })),
      };
      emit(makeStepLog({
        iteration: 0, step: 7, status: 'blocked',
        tool: 'migrationOrchestrator.js',
        why: 'Migration Mode is enabled, but repo paths and verification hooks must be injected before writes are allowed',
        result: migration,
        durationMs: 0, mode: state.mode,
      }));
      try {
        await _appendGovernanceEntry({
          productId,
          environment,
          entry: {
            kind: 'self_renewal.migration_run.v1',
            runId,
            productId,
            mode: state.mode,
            ssotVocabulary,
            status: migration.status,
            missing,
            at: new Date().toISOString(),
          },
          supabase,
        });
      } catch { /* final audit path records governance write availability */ }
      return {
        runId,
        mode: state.mode,
        runMode: 'MIGRATION',
        universalMode: false,
        autoFixAvailable: false,
        registerCTA: false,
        gtmReady: false,
        exitReason: 'MIGRATION_CONFIGURATION_REQUIRED',
        originalScore: 0,
        finalScore: 0,
        totalDelta: 0,
        iterationsCompleted: 0,
        iterations,
        orchestrationLog,
        previewUrl: null,
        prUrl: null,
        skippedSteps: state.skippedSteps,
        migration,
      };
    }

    const t0 = Date.now();
    const migrationSummary = await _runMigration({
      sourceRepoPath,
      targetRepoPath,
      verifyBuild,
      verifyLint,
      runFocusedTests,
      readFile,
      writeFile,
      restoreFile,
      scanFiles,
    });
    const migrationVerification = Array.isArray(migrationSummary.verification) ? migrationSummary.verification : [];
    const degradedVerificationOnly = migrationSummary.migrated > 0
      && migrationSummary.blocked === 0
      && migrationVerification.some((item) => item?.reason === 'VERIFICATION_DEGRADED');
    const migrationStatus = degradedVerificationOnly
      ? 'MIGRATION_COMPLETED_VERIFICATION_DEGRADED'
      : migrationSummary.blocked > 0
        ? 'MIGRATION_BLOCKED'
        : migrationSummary.migrated > 0
          ? 'MIGRATION_COMPLETED'
          : 'MIGRATION_NO_WRITES_APPLIED';
    const migration = {
      status: migrationStatus,
      ...migrationSummary,
      filesMigrated: migrationSummary.migrated,
      upgradeUrl: upgradeTargets.deploymentUrl || upgradeTargets.upgradeUrl || null,
      upgradeUrlLabel: 'Current upgrade URL',
      previewCreated: false,
    };
    emit(makeStepLog({
      iteration: 0, step: 7, status: migrationSummary.blocked > 0 ? 'degraded' : 'complete',
      tool: 'migrationOrchestrator.js',
      why: 'Migration Mode converts platform-bound dependencies in the upgrade repo; original repo remains read-only rollback',
      result: migration,
      durationMs: Date.now() - t0, mode: state.mode,
    }));
    try {
      await _appendGovernanceEntry({
        productId,
        environment,
        entry: {
          kind: 'self_renewal.migration_run.v1',
          runId,
          productId,
          mode: state.mode,
          status: migration.status,
          summary: migrationSummary,
          upgradeUrl: migration.upgradeUrl,
          at: new Date().toISOString(),
        },
        supabase,
      });
    } catch { /* final audit path records governance write availability */ }
    return {
      runId,
      mode: state.mode,
      runMode: 'MIGRATION',
      universalMode: false,
      autoFixAvailable: false,
      registerCTA: false,
      gtmReady: false,
      exitReason: migrationStatus,
      originalScore: null,
      finalScore: null,
      totalDelta: 0,
      iterationsCompleted: migrationSummary.migrated > 0 ? 1 : 0,
      iterations,
      orchestrationLog,
      previewUrl: migration.upgradeUrl,
      prUrl: null,
      skippedSteps: state.skippedSteps,
      migration,
    };
  }

  if (githubOperatorToken && githubRepoUrl) {
    const parsed = parseGithubRepoUrl(githubRepoUrl);
    if (parsed) {
      try {
        const t0 = Date.now();
        const access = await _probeGithubOperatorRepoAccess({
          owner: parsed.owner,
          repo: parsed.repo,
          branch: productBranch,
          token: githubOperatorToken,
        });
        state.operatorRepoAccess = access;
        state.operatorContext = Object.freeze({
          ...state.operatorContext,
          repoAccess: access,
          owner: parsed.owner,
          repo: parsed.repo,
          branch: productBranch,
          validated: access?.canRead === true,
        });
        emit(makeStepLog({
          iteration: 0, step: 1,
          status: access?.ok ? 'complete' : 'degraded',
          tool: 'githubOperatorRepoProbe.js',
          why: 'verify GITHUB_OPERATOR_TOKEN can read/write the active upgrade repo without exposing secrets',
          result: access,
          durationMs: Date.now() - t0, mode: state.mode,
        }));
      } catch (e) {
        state.operatorRepoAccess = Object.freeze({
          kind: 'github_operator_repo_probe',
          ok: false,
          canRead: false,
          canWrite: false,
          tokenPresent: true,
          tokenRedacted: true,
          owner: parsed.owner,
          repo: parsed.repo,
          branch: productBranch,
          reason: (e?.message ?? String(e)).slice(0, 160),
        });
        state.operatorContext = Object.freeze({
          ...state.operatorContext,
          repoAccess: state.operatorRepoAccess,
          owner: parsed.owner,
          repo: parsed.repo,
          branch: productBranch,
          validated: false,
        });
        emit(makeStepLog({
          iteration: 0, step: 1, status: 'degraded',
          tool: 'githubOperatorRepoProbe.js',
          why: 'verify GITHUB_OPERATOR_TOKEN can read/write the active upgrade repo without exposing secrets',
          result: state.operatorRepoAccess,
          mode: state.mode,
        }));
      }
    }
  }

  // D40 generic-engine — auto-create the product_ssot row on first
  // Self-Renewal run if absent. Replaces the per-product migration
  // pattern (0018 flowai, 0020 mypreglife). New products onboard
  // with just a product_registry row + product_url; the engine
  // self-provisions the audit-trail substrate.
  if (pathB && githubRepoUrl && state.operatorContext?.validated === true) {
    product = applyUpgradeTargetsToProduct({
      ...product,
      __pathB: false,
      __operatorConnected: true,
      __operatorContext: state.operatorContext,
    });
    pathB = false;
    state.universalMode = false;
    state.runMode = 'PATH_A';
    emit(makeStepLog({
      iteration: 0, step: 1, status: 'complete',
      tool: 'operator context promotion',
      why: 'persist validated operator GitHub context across downstream build, branch, deploy, and PR steps',
      result: {
        operator_mode: state.operatorMode,
        runMode: state.runMode,
        githubRepoUrl,
        canRead: state.operatorRepoAccess?.canRead === true,
        canWrite: state.operatorRepoAccess?.canWrite === true,
      },
      durationMs: 0,
      mode: state.mode,
    }));
  }

  try {
    const ssotProvision = await _ensureProductSsotRow({
      productId, environment, supabase,
      identity: {
        productName: productId,
        productUrl: initialUrl,
        ownerProviderOrgId: product?.org_id ?? null,
      },
    });
    if (ssotProvision?.created) {
      emit(makeStepLog({
        iteration: 0, step: 1, status: 'complete',
        tool: 'ensureProductSsotRow (D40 generic onboarding)',
        why: 'auto-create product_ssot row on first run for this product+env (replaces per-product migrations)',
        result: { created: true, id: ssotProvision.id },
        durationMs: 0, mode: state.mode,
      }));
    }
  } catch { /* ensure is best-effort; atomic-audit will surface absence via reason */ }

  const policy = await _readProductPolicy({ productId, supabase }).catch(() => null);

  // ── STEP 2 — Rate cap (iteration 1 only) ──────────────────────────────────
  try {
    const t0 = Date.now();
    if (supabase && typeof supabase.from === 'function' && policy) {
      const maxPerDay = effectiveRateCapForRun({
        policy,
        product,
        operatorContext: state.operatorContext,
      });
      await _checkRateCap({ productId, maxPerDay, supabase });
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
    if (e?.code === 'SELF_RENEWAL_RATE_LIMIT') {
      state.rateCapDegraded = buildRateCapDegradedState(e);
      emit(makeStepLog({
        iteration: 0, step: 2, status: 'degraded',
        tool: 'rateCap.js',
        why: 'daily rate cap reached; continue read-only analysis but block renewal mutations',
        result: state.rateCapDegraded,
        mode: state.mode,
      }));
    } else {
      emit(makeStepLog({
        iteration: 0, step: 2, status: 'failed',
        tool: 'rateCap.js', why: 'verify daily rate cap',
        result: { error: e?.message }, mode: state.mode,
      }));
      return failStep({ product, failedStep: 'STEP_2',
        error: e?.message ?? String(e), code: e?.code ?? 'RATE_LIMIT', diagnostics: e });
    }
  }

  // D41 T4 — authenticated traversal preparation.
  // Two input shapes are supported on runOrchestration:
  //   (a) args.storageState  — Playwright storageState object/path
  //                             (logged-in cookies + origins).
  //   (b) args.credentials   — { email, password } — when paired with
  //                             deps.authPreparer (resolves to a function
  //                             returning storageState), mint storageState
  //                             once here so every Phase B page-context
  //                             starts already authenticated.
  // Either form is FORWARDED to probeAllPages via the per-page
  // newContext({ storageState }) call. If neither is supplied, Phase B
  // runs unauthenticated (back-compat with all D39/D40 callers).
  if (!state.storageState && args.credentials && typeof deps.authPreparer === 'function') {
    try {
      const minted = await deps.authPreparer({
        credentials: args.credentials,
        url: initialUrl,
        runId,
      });
      if (minted) state.storageState = minted;
    } catch (e) {
      // Auth-prep failure does NOT halt the pipeline — Phase B falls
      // back to unauthenticated. The error is surfaced via STEP 4's
      // degraded log so the operator can fix the creds.
      state.authPrepFailure = (e?.message ?? String(e)).slice(0, 160);
    }
  }

  // ── W6 INTEGRATION — STEP 3b: historical score context (CA-18 §1) ─────────
  //
  // Historical ProductSSOT scores are context only. They may predate
  // degraded-score evidence markers, so they must never hard-stop a new run.
  // The honest-gate refusal is evaluated below after current-run scoring.
  let historicalHonestGateContext = null;
  if (supabase && typeof supabase.from === 'function' && product?.product_id) {
    try {
      const { data: ssotRow } = await supabase
        .from('product_ssot')
        .select('governance_record')
        .eq('product_id', product.product_id)
        .eq('environment', environment)
        .maybeSingle();
      const records = Array.isArray(ssotRow?.governance_record) ? ssotRow.governance_record : [];
      const completes = records.filter((r) => r?.kind === 'self_renewal.orchestration_complete.v1');
      const last = completes.length > 0 ? completes[completes.length - 1] : null;
      const lastScore = typeof last?.finalScore === 'number' ? last.finalScore : null;
      const lastScoreIsDegraded = hasDegradedScoreEvidence(last);
      if (lastScore !== null) {
        historicalHonestGateContext = {
          priorRunId: last?.runId ?? null,
          score: lastScore,
          targetScore: gtmTarget,
          degraded: lastScoreIsDegraded,
          wouldHavePassed: lastScore >= gtmTarget,
        };
        emit(makeStepLog({
          iteration: 0, step: 0, status: 'complete',
          tool: 'honest_gate historical context (CA-18 §1)',
          why: 'historical ProductSSOT scores are context only; current-run evidence decides refusal',
          result: {
            kind: 'honest_gate_context',
            priorRunId: historicalHonestGateContext.priorRunId,
            historicalScore: lastScore,
            targetScore: gtmTarget,
            degraded: lastScoreIsDegraded,
            wouldHavePassed: lastScore >= gtmTarget,
          },
          mode: state.mode,
        }));
      }
    } catch { /* lookup failure is non-fatal — proceed with normal run */ }
  }

  // ── OUTER LOOP: repeat until GTM-ready / failsafe cap / convergence / stop ─
  let iterationNumber = 1;
  let currentUrl = initialUrl;
  let originalScore = null;
  let lastPostScore = null;
  // DISPATCH 28 — canonical §7.6 GTM Readiness score (gating signal).
  // Five-Layer (originalScore / lastPostScore) is retained as an
  // internal-only telemetry signal per the dispatch directive.
  let originalGtmScore = null;
  let lastPostGtm = null;
  let preScoreEvidenceDegraded = false;
  let postScoreEvidenceDegraded = false;
  // W5b TRACK B PART 2 — initialize to the URL we tested against, NOT null.
  // When the run exits early (e.g. NO_FIXES_GENERATED before STEP 10), this
  // anchors the governance_record entry to the artifact we actually evaluated.
  // STEP 10 overwrites this when a new preview is deployed.
  // W5b TRACK B initializes this to initialUrl so the audit anchors to
  // the evaluated artifact when no preview deploy happens. DISPATCH U1
  // (universal mode) keeps this null — the run is evaluation-only and
  // STEP 10 is skipped, so there is no preview to report. The
  // governance trail still captures the input URL via product.__sourceUrl.
  let finalPreviewUrl = state.universalMode ? null : (initialUrl ?? null);
  let pr = null;
  let exitReason = 'UNKNOWN';
  let noImprovementStreak = 0;
  let token = null;

  // ── W6 INTEGRATION — STEP 5: Multi-page BFS crawl (CA-18 §5) ───────────────
  //
  // Before the gate loop runs, walk the same-origin site with the new
  // multiPageCrawler. Emits one 'page_crawled' step event per page so the
  // SSE consumer can render the live page counter, then a 'crawl_complete'
  // iteration event once the frontier drains.
  //
  // Honest constraint: the existing renewal STEP 3 (conductStructuredCrawl)
  // ALSO does a multi-page walk, so this pre-walk is currently additive
  // for visibility — it doesn't yet REPLACE the iteration-local crawl.
  // The aggregated findings feed into state for downstream gates that
  // want a whole-site signal (Phase B prober already does per-page).
  let multiPageCrawlSummary = null;
  if (initialUrl && /^https?:\/\//i.test(initialUrl)) {
    try {
      const _multiPageCrawler = deps.crawlSite || (await import('../../crawl/multiPageCrawler.js')).crawlSite;
      const crawlSiteResult = await _multiPageCrawler(initialUrl, {
        maxPages: effortProfile.crawlMaxPages,
        maxDepth: effortProfile.crawlDepth,
        sameOriginOnly: true,
        respectRobotsTxt: args.respectRobotsTxt !== false,
        onPage: ({ pageIndex, totalDiscovered, url: pageUrl, status: pageStatus, findings: pageFindings }) => {
          emit(makeStepLog({
            iteration: 0, step: 0,
            status: pageStatus === 'fetched' ? 'complete' : 'degraded',
            tool: 'multiPageCrawler.crawlSite (W6 STEP 5)',
            why: 'whole-site BFS — per-page signal flows into gate inputs',
            result: {
              kind: 'page_crawled',
              pageIndex, totalDiscovered, url: pageUrl,
              status: pageStatus, findingsCount: pageFindings.length,
            },
            mode: state.mode,
          }));
        },
      });
      // DISPATCH (production runtime fixes) — the two crawl entry
      // points measure different things and a single-page run can
      // legitimately produce divergent counts:
      //   pagesActuallyCrawled (W6 STEP 5, multiPageCrawler.crawlSite)
      //     — BFS that honors robots.txt; if the root path is blocked
      //       this can be 0 even when the site has visible content.
      //   pagesCrawled (W6 STEP 3, conductStructuredCrawl / Agent #21)
      //     — single-fetch deep crawler that bypasses robots.txt; on a
      //       reachable root it always reports >=1.
      // We surface the metric definitions on the SSE envelope so the UI
      // can render them as distinct labeled measurements rather than
      // contradictory unlabeled counts.
      multiPageCrawlSummary = {
        pagesActuallyCrawled: crawlSiteResult.pagesActuallyCrawled,
        pagesDiscovered: crawlSiteResult.pagesDiscovered,
        maxPages: crawlSiteResult.maxPages,
        reasonStopped: crawlSiteResult.reasonStopped,
        durationMs: crawlSiteResult.durationMs,
        // Labels explain what each count measures (matches dispatch
        // guidance: "no contradictory unlabeled page counts").
        pagesActuallyCrawledLabel: 'BFS pages fetched (robots.txt honored)',
        pagesDiscoveredLabel: 'URLs seen in the link graph',
      };
      state.multiPageCrawl = crawlSiteResult;
      effortProfile = buildPipelineEffortProfile({ args, crawlSummary: crawlSiteResult });
      if (typeof deps.probeAllPages === 'function' && args.postFixReprobe !== false) {
        effortProfile = Object.freeze({ ...effortProfile, postFixReprobe: true });
      }
      state.effortProfile = effortProfile;
      try {
        onIteration({
          number: 0,
          kind: 'crawl_complete',
          ...multiPageCrawlSummary,
        });
      } catch { /* swallow per recommend_only */ }
      emit(makeStepLog({
        iteration: 0, step: 0, status: crawlSiteResult.ok ? 'complete' : 'degraded',
        tool: 'multiPageCrawler.crawlSite (W6 STEP 5)',
        why: 'whole-site BFS complete — honest pagesActuallyCrawled + reasonStopped',
        result: {
          kind: 'crawl_complete',
          ...multiPageCrawlSummary,
          aggregatedFindings: crawlSiteResult.findings.length,
          effortProfile,
        },
        mode: state.mode,
      }));
    } catch (e) {
      // Crawler failure NEVER blocks the pipeline — STEP 3 will still run.
      emit(makeStepLog({
        iteration: 0, step: 0, status: 'degraded',
        tool: 'multiPageCrawler.crawlSite (W6 STEP 5)',
        why: 'whole-site BFS pre-walk',
        result: { kind: 'crawl_failed', error: (e?.message ?? String(e)).slice(0, 200) },
        mode: state.mode,
      }));
    }
  }

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
      crawlOutput = await withTimeout(_conductStructuredCrawl({
        url: currentUrl,
        maxPages: effortProfile.structuredCrawlMaxPages,
        depth: effortProfile.structuredCrawlDepth,
        productId,
        runId,
        // D43 Lever a — authenticated traversal: forward storageState
        // to the crawler so auth-gated pages are reachable when the
        // ENTRY-007 stack is wired into richCapture/Browserless.
        storageState: args.storageState ?? state.storageState ?? undefined,
      }), {
        timeoutMs: step5ToStep6Timeouts.structuredCrawl,
        code: 'STRUCTURED_CRAWL_TIMEOUT',
        message: `structured crawl exceeded ${step5ToStep6Timeouts.structuredCrawl}ms`,
      });
      state.crawlOutput = crawlOutput;
      const log = makeStepLog({
        iteration: iterationNumber, step: 3, status: 'complete',
        tool: 'Agent #21 AggressiveCrawlConductor → crawlOutputAdapter',
        why: 'structured crawl output for downstream scoring + monitor producer',
        result: {
          pagesCrawled: crawlOutput.pagesCrawled,
          // DISPATCH (production runtime fixes) — explicit label so the
          // UI can render this side-by-side with W6 STEP 5's
          // pagesActuallyCrawled without surfacing contradictory
          // unlabeled numbers. See multiPageCrawlSummary above for the
          // companion label.
          pagesCrawledLabel: 'Deep-crawl pages fetched (robots.txt bypassed)',
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
      if (e?.code === 'STRUCTURED_CRAWL_TIMEOUT') {
        recordPipelineError(state, 'structured_crawl', `timeout:${step5ToStep6Timeouts.structuredCrawl}ms`);
        crawlOutput = {
          pagesCrawled: 0,
          depth: 0,
          pages: [],
          brokenLinks: [],
          forms: [],
          interactiveElements: [],
          errors: [{ phase: 'crawl', url: currentUrl, reason: 'structured_crawl_timeout' }],
          totalTextLength: 0,
        };
        state.crawlOutput = crawlOutput;
        emit(makeStepLog({
          iteration: iterationNumber, step: 3, status: 'degraded',
          tool: 'Agent #21 AggressiveCrawlConductor -> crawlOutputAdapter',
          why: 'structured crawl timed out; continuing with degraded empty crawl evidence',
          result: {
            degraded: true,
            reason: 'structured_crawl_timeout',
            timeoutMs: step5ToStep6Timeouts.structuredCrawl,
            code: e.code,
          },
          mode: state.mode,
        }));
      } else {
      emit(makeStepLog({ iteration: iterationNumber, step: 3, status: 'failed',
        tool: 'Agent #21 → crawlOutputAdapter', why: 'deep crawl', result: { error: e?.message }, mode: state.mode }));
      return failStep({ product, failedStep: 'STEP_3',
        error: e?.message ?? String(e), code: e?.code ?? 'CRAWL_FAILED', diagnostics: e });
      }
    }
    await state.checkpoint(onCheckpoint, { lastStep: 3, iteration: iterationNumber });

    // STEP 5 — Five-Layer Scoring (Early Baseline).
    //
    // Production D8: the live Vercel smoke showed the timeout guard
    // returning clean partial results, but with 0/100 because scoring sat
    // behind the expensive browser/evaluator stages. Score immediately
    // after the structured crawl so every run has a real baseline before
    // long-tail analysis can consume the function window. STEP 5 is
    // enriched with Phase B/B1 findings below when those stages finish.
    let preScoreEnvelope;
    try {
      const t0 = Date.now();
      let monitor;
      try {
        monitor = await withTimeout(
          _produceMonitorText({
            url: currentUrl, productId, runId,
            githubRepoUrl: githubRepoUrl || undefined,
            token: token || undefined,
            crawlReport: crawlOutput,
          }),
          {
            timeoutMs: step5ToStep6Timeouts.monitorText,
            code: 'PRE_SCORE_MONITOR_TEXT_TIMEOUT',
            message: `Pre-score monitor text exceeded ${step5ToStep6Timeouts.monitorText}ms`,
          },
        );
      } catch (monitorErr) {
        const monitorFetchFailed = monitorErr?.code === 'MONITOR_FETCH_FAILED';
        if (monitorErr?.code !== 'PRE_SCORE_MONITOR_TEXT_TIMEOUT' && !monitorFetchFailed) throw monitorErr;
        const reason = monitorFetchFailed ? 'monitor_fetch_failed' : 'pre_score_monitor_text_timeout';
        recordPipelineError(
          state,
          'pre_score_monitor_text',
          monitorFetchFailed
            ? `fetch_failed:${(monitorErr?.message ?? String(monitorErr)).slice(0, 160)}`
            : `timeout:${step5ToStep6Timeouts.monitorText}ms`,
        );
        monitor = {
          monitorText: `[degraded] ${reason}; using structured crawl evidence only for baseline scoring.`,
          degraded: true,
          reason,
        };
        emit(makeStepLog({
          iteration: iterationNumber, step: 5, status: 'degraded',
          tool: 'monitorTextProducer (early baseline)',
          why: 'monitor text unavailable before Five-Layer Scoring; continuing with crawl-only degraded baseline',
          result: {
            degraded: true,
            reason,
            targetUrl: currentUrl,
            timeoutMs: monitorErr?.code === 'PRE_SCORE_MONITOR_TEXT_TIMEOUT' ? step5ToStep6Timeouts.monitorText : null,
            code: monitorErr.code ?? 'MONITOR_TEXT_UNAVAILABLE',
            remediation: monitorFetchFailed
              ? 'Retry the monitor fetch or verify target network availability; forge continued with crawl evidence.'
              : 'Increase monitor-text budget only through a bounded dispatch; forge continued with crawl evidence.',
            error: (monitorErr?.message ?? String(monitorErr)).slice(0, 240),
          },
          durationMs: Date.now() - t0, mode: state.mode,
        }));
      }
      try {
        preScoreEnvelope = await withTimeout(
          _computeScore({
            productId, url: currentUrl, runId, monitorText: monitor.monitorText,
          }),
          {
            timeoutMs: step5ToStep6Timeouts.computeScore,
            code: 'PRE_SCORE_COMPUTE_SCORE_TIMEOUT',
            message: `Pre-score computeScore exceeded ${step5ToStep6Timeouts.computeScore}ms`,
          },
        );
      } catch (scoreErr) {
        if (scoreErr?.code !== 'PRE_SCORE_COMPUTE_SCORE_TIMEOUT') throw scoreErr;
        const fallbackGtm = _scoreCrawlOutput(crawlOutput, null);
        preScoreEnvelope = makeDegradedScoreEnvelope({
          productId,
          url: currentUrl,
          runId,
          fallbackScore: fallbackGtm?.score ?? 0,
        });
        recordPipelineError(state, 'pre_score_compute_score', `timeout:${step5ToStep6Timeouts.computeScore}ms`);
        emit(makeStepLog({
          iteration: iterationNumber, step: 5, status: 'degraded',
          tool: 'preScoreAdapter.computeScore (early baseline)',
          why: 'computeScore timed out before Five-Layer Scoring; using degraded crawl-derived baseline score',
          result: {
            degraded: true,
            reason: 'pre_score_compute_score_timeout',
            timeoutMs: step5ToStep6Timeouts.computeScore,
            fallbackScore: preScoreEnvelope.total,
            code: scoreErr.code,
          },
          durationMs: Date.now() - t0, mode: state.mode,
        }));
      }
      if (originalScore === null) originalScore = preScoreEnvelope.total;
      preScoreEvidenceDegraded = preScoreEvidenceDegraded || preScoreEnvelope?.degraded === true;

      const preGtm = _scoreCrawlOutput(crawlOutput, null);
      if (originalGtmScore === null) originalGtmScore = preGtm.score;
      iterLog.preGtm = preGtm;
      iterLog.preGtmSurfaceOnly = preGtm;
      const log = makeStepLog({
        iteration: iterationNumber, step: 5, status: 'complete',
        tool: 'gtmReadinessScorer (§7.6) + monitorTextProducer (early baseline)',
        why: 'establish canonical GTM Readiness score immediately after crawl before long browser/evaluator work',
        result: {
          gtmScore: preGtm.score,
          gtmBand: preGtm.band,
          gtmCounts: preGtm.counts,
          ceo95Criteria: preGtm.ceo95Criteria ?? null,
          surfaceOnlyGtmScore: preGtm.score,
          surfaceOnlyGtmCounts: preGtm.counts,
          phaseBContribution: 0,
          phaseBPagesProbed: 0,
          phaseBUrlsAttempted: 0,
          fiveLayerInternal: preScoreEnvelope.total,
          layers: {
            l1: preScoreEnvelope.l1, l2: preScoreEnvelope.l2, l3: preScoreEnvelope.l3,
            l4: preScoreEnvelope.l4, l5: preScoreEnvelope.l5,
          },
          label: preGtm.label,
          coverage: 'crawl_only_early_baseline',
        },
        durationMs: Date.now() - t0, mode: state.mode,
        scores: {
          original: originalGtmScore, current: preGtm.score,
          target: gtmTarget, progressPct: computeProgress({ originalScore: originalGtmScore, currentScore: preGtm.score, target: gtmTarget }),
        },
      });
      emit(log); iterLog.steps.push(log);
      const currentRunScore = typeof preGtm?.score === 'number' ? preGtm.score : null;
      const currentRunScoreIsDegraded = hasDegradedScoreEvidence(preScoreEnvelope) || preGtm?.degraded === true;
      if (
        iterationNumber === 1
        && supabase
        && typeof supabase.from === 'function'
        && product?.product_id
        && currentRunScore !== null
        && !currentRunScoreIsDegraded
        && currentRunScore >= gtmTarget
      ) {
        try {
          await _appendGovernanceEntry({
            productId: product.product_id, environment,
            entry: {
              kind: 'honest_gate_refusal.v1',
              runId,
              productId: product.product_id,
              reason: 'ALREADY_AT_TARGET',
              evidenceSource: 'current_run',
              currentScore: currentRunScore,
              targetScore: gtmTarget,
              historicalContext: historicalHonestGateContext,
              at: new Date().toISOString(),
            },
            supabase,
          });
        } catch { /* honest-gate envelope is best-effort */ }
        emit(makeStepLog({
          iteration: iterationNumber, step: 5, status: 'complete',
          tool: 'honest_gate (CA-18 §1 current-run assessment)',
          why: 'current run evidence shows product already at target; refuse further busywork',
          result: {
            kind: 'honest_gate_refusal',
            reason: 'ALREADY_AT_TARGET',
            evidenceSource: 'current_run',
            currentScore: currentRunScore,
            targetScore: gtmTarget,
            degraded: false,
          },
          mode: state.mode,
        }));
        return Object.freeze({
          ok: true,
          gtmReady: true,
          gtmBand: preGtm.band ?? 'showcase-ready',
          gtmCounts: preGtm.counts ?? null,
          exitReason: 'HONEST_GATE_REFUSAL_ALREADY_PASSING',
          originalScore: currentRunScore,
          finalScore: currentRunScore,
          totalDelta: 0,
          fiveLayerOriginalScore: preScoreEnvelope?.total ?? 0,
          fiveLayerFinalScore: preScoreEnvelope?.total ?? 0,
          iterationsCompleted: 0,
          previewUrl: null,
          inputSummary,
          inputStepMatrix,
          userObjectives,
          ...buildUpgradeDeliveryEnvelope({
            product,
            initialUrl,
            iterations: [],
            skippedSteps: state.skippedSteps,
          }),
          prUrl: null,
          prNumber: null,
          orchestrationLog,
          iterations: [],
          product,
          runId,
          mode: state.mode,
          auditWrite: { written: false, reason: 'honest_gate_refusal' },
          runIncomplete: null,
          honestGateRefusal: {
            reason: 'ALREADY_AT_TARGET',
            evidenceSource: 'current_run',
            currentScore: currentRunScore,
            targetScore: gtmTarget,
          },
        });
      }
    } catch (e) {
      emit(makeStepLog({ iteration: iterationNumber, step: 5, status: 'failed',
        tool: 'preScoreAdapter', why: 'early pre-score', result: { error: e?.message }, mode: state.mode }));
      return failStep({ product, failedStep: 'STEP_5',
        error: e?.message ?? String(e), code: e?.code ?? 'SCORING_FAILED', diagnostics: e });
    }

    // STEP 4 — Adversarial Surface Testing (Phase B — D39).
    // Composes over the Phase 1 crawl: walks each crawled page's
    // surface with a real headless browser (Browserless or local
    // Playwright), exercising interactive elements, modals, forms,
    // and detected AI agents. Findings join the canonical §7.6
    // pool so they get scored + prioritized like any other defect.
    //
    // The probe is OPT-IN via deps.probeAdversarialSurface (default
    // injection point is the bundled module). Test paths supply a
    // stub that returns deterministic findings without launching a
    // real browser.
    let phaseBFindings = [];
    let phaseBSummary = null;
    let phaseBPagesProbed = 0;
    let phaseBUrlsAttempted = 0;
    try {
      const t0 = Date.now();
      // D41 T1 — multi-page Phase B: probe EVERY crawled URL, not just
      // the iteration's currentUrl. Phase A's structured-crawl gave us
      // per-page presence signals — Phase B now exercises the interactive
      // layer on every page (no sampling). Single-page fallback if the
      // crawl produced nothing.
      const _probeAllPages = deps.probeAllPages || probeAllPages;
      const _probeAdversarialSurface = deps.probeAdversarialSurface || probeAdversarialSurface;
      const crawledUrls = Array.isArray(crawlOutput?.pages)
        ? crawlOutput.pages.map((p) => (typeof p?.url === 'string' ? p.url : null)).filter(Boolean)
        : [];
      const allUrls = (crawledUrls.length > 0) ? Array.from(new Set(crawledUrls)) : [currentUrl];
      const urls = allUrls.slice(0, effortProfile.phaseBMaxPages);
      phaseBUrlsAttempted = urls.length;

      // D43 Lever c — per-URL interactive seeds from the crawl. When
      // crawlOutput.pages carry `interactives` descriptors (text+role
      // pairs from crawlOutputAdapter), Phase B uses them as locator
      // seeds instead of relying solely on page-load enumeration —
      // covers off-screen / lazy-mounted clickables the cold page
      // doesn't surface. Map keyed by URL; falsy entries fall through
      // to the live-enumerate path inside probeOnePage.
      const seedsByUrl = {};
      for (const p of (Array.isArray(crawlOutput?.pages) ? crawlOutput.pages : [])) {
        if (typeof p?.url === 'string' && Array.isArray(p?.interactives) && p.interactives.length > 0) {
          seedsByUrl[p.url] = p.interactives;
        }
      }

      const probeOpts = {
        // D43 Lever b — defaults bumped ×1.5 in adversarialSurface.js
        // (DEFAULT_PROBE_BUDGET_MS 180_000 → 270_000); the orchestrator
        // override remains opt-in via state.phaseBProbeBudgetMs.
        probeBudgetMs: state.phaseBProbeBudgetMs ?? effortProfile.phaseBProbeBudgetMs ?? phaseBBudget.probeBudgetMs,
        overallBudgetMs: state.phaseBOverallBudgetMs ?? effortProfile.phaseBOverallBudgetMs ?? phaseBBudget.overallBudgetMs,
        perPageBudgetMs: state.phaseBPerPageBudgetMs ?? effortProfile.phaseBPerPageBudgetMs ?? phaseBBudget.perPageBudgetMs,
        maxInteractives: state.phaseBMaxInteractives ?? effortProfile.phaseBMaxInteractives ?? phaseBBudget.maxInteractives,
        // D41 T4 — authenticated traversal: storageState plumbed from
        // runOrchestration args (set by ENTRY-007 / external auth flow).
        storageState: args.storageState ?? state.storageState ?? undefined,
        // D43 Lever c — pass per-URL crawl-seeded interactive lists.
        seedsByUrl,
        maxModals: 10, maxForms: 10,
      };

      let probe;
      if (urls.length > 1 || _probeAllPages !== probeAllPages) {
        probe = await withTimeout(
          _probeAllPages({ urls, opts: probeOpts }),
          {
            timeoutMs: step5ToStep6Timeouts.probeAllPages,
            code: 'PHASE_B_PROBE_ALL_PAGES_TIMEOUT',
            message: `Phase B probeAllPages exceeded ${step5ToStep6Timeouts.probeAllPages}ms`,
          },
        );
        phaseBPagesProbed = probe?.pagesProbed ?? 0;
      } else {
        probe = await withTimeout(
          _probeAdversarialSurface({ url: urls[0], opts: probeOpts }),
          {
            timeoutMs: step5ToStep6Timeouts.probeAdversarialSurface,
            code: 'PHASE_B_PROBE_ADVERSARIAL_SURFACE_TIMEOUT',
            message: `Phase B probeAdversarialSurface exceeded ${step5ToStep6Timeouts.probeAdversarialSurface}ms`,
          },
        );
        phaseBPagesProbed = (probe?.ok ? 1 : 0);
      }
      if (probe && Array.isArray(probe.findings)) {
        phaseBFindings = probe.findings;
      }
      phaseBSummary = probe?.summary ?? null;
      const log = makeStepLog({
        iteration: iterationNumber, step: 4,
        status: probe?.ok === false ? 'degraded' : 'complete',
        tool: 'adversarialSurface.probeAllPages (Phase B — multi-page real browser, D41)',
        why: 'exercise interactive layer on EVERY crawled page; classify wired-vs-mock',
        result: {
          ok: !!probe?.ok,
          reason: probe?.reason ?? null,
          pagesProbed: phaseBPagesProbed,
          urlsAttempted: phaseBUrlsAttempted,
          urlsDiscovered: allUrls.length,
          effortProfile,
          findingsCount: phaseBFindings.length,
          summary: phaseBSummary,
        },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      // Phase B failures NEVER fail the pipeline — emit a degraded
      // log and continue. Phase A signal is still complete.
      const timedOut = e?.code === 'PHASE_B_PROBE_ALL_PAGES_TIMEOUT'
        || e?.code === 'PHASE_B_PROBE_ADVERSARIAL_SURFACE_TIMEOUT';
      recordPipelineError(
        state,
        'phase_b_probe',
        timedOut
          ? `timeout:${e?.code}:${e?.message ?? ''}`
          : (e?.message ?? String(e)).slice(0, 200),
      );
      emit(makeStepLog({
        iteration: iterationNumber, step: 4, status: 'degraded',
        tool: 'adversarialSurface (Phase B — D39)',
        why: timedOut
          ? 'Phase B probe timed out; preserving baseline score and continuing with Phase A signal only'
          : 'Phase B probe threw; continuing with Phase A signal only',
        result: {
          degraded: true,
          reason: timedOut ? 'phase_b_probe_timeout' : 'phase_b_probe_failed',
          timeoutMs: timedOut ? (e?.code === 'PHASE_B_PROBE_ALL_PAGES_TIMEOUT'
            ? step5ToStep6Timeouts.probeAllPages
            : step5ToStep6Timeouts.probeAdversarialSurface) : null,
          error: (e?.message ?? String(e)).slice(0, 200),
          code: e?.code ?? 'PHASE_B_PROBE_FAILED',
        },
        durationMs: 0, mode: state.mode,
      }));
    }
    // Make the Phase B findings reachable to STEP 5 scoring so the
    // canonical §7.6 score can incorporate them (gtmReadinessScorer
    // already accepts an issues array — we union the Phase A crawl
    // findings with the Phase B probe findings before scoring).
    state.phaseBFindings = phaseBFindings;
    state.phaseBSummary = phaseBSummary;
    state.phaseBPagesProbed = phaseBPagesProbed;
    state.phaseBUrlsAttempted = phaseBUrlsAttempted;

    // ── PHASE B1 — Multi-Engine Evaluation Pipeline (CA-18 §2 broader coverage) ─
    //
    // PROBLEM (D38/D41 residual): Phase B alone finds 0 interactives on
    // thin SPAs whose first paint contains no clickable surface; the
    // construction engine then starves for findings to wire up. The
    // pipeline fans out to 3 additional evaluators (Lighthouse, axe-core,
    // runtime diagnostics) in parallel, normalizes + deduplicates, and
    // produces findings on ANY page regardless of interactive density.
    //
    // Contract: graceful — any single evaluator failure (Chrome launch,
    // import miss, timeout) returns [] for that evaluator and the
    // pipeline continues. Errors land in `state.pipelineErrors` for the
    // S14 audit envelope.
    //
    // Pass-through: state.phaseBFindings is fed in as the 'phase-b'
    // evaluator output so the normalizer can dedupe Phase B findings
    // against findings the other engines surface for the same node/URL.
    let pipelineOutput = null;
    try {
      const t0 = Date.now();
      pipelineOutput = await withTimeout(_runEvaluationPipeline({
        url: currentUrl,
        options: {
          phaseBFindings,
          ...evaluationRuntimeOptions,
          onStep: (evt) => {
            // Forward each evaluator_complete to the SSE stream so the
            // UI can render per-evaluator progress.
            try {
              emit(makeStepLog({
                iteration: iterationNumber, step: 4,
                status: evt?.log?.ok === false ? 'degraded' : 'complete',
                tool: `evaluationPipeline:${evt?.log?.evaluator ?? 'unknown'}`,
                why: 'Phase B1 — per-evaluator complete signal',
                result: evt?.log ?? null,
                mode: state.mode,
              }));
            } catch { /* swallow */ }
          },
        },
      }), {
        timeoutMs: step5ToStep6Timeouts.runEvaluationPipeline,
        code: 'PHASE_B1_EVALUATION_PIPELINE_TIMEOUT',
        message: `Phase B1 evaluation pipeline exceeded ${step5ToStep6Timeouts.runEvaluationPipeline}ms`,
      });
      state.pipelineFindings = Array.isArray(pipelineOutput?.findings) ? pipelineOutput.findings : [];
      state.pipelineStats = pipelineOutput?.stats ?? null;
      state.pipelineErrors = pipelineOutput?.errors ?? {};
      state.deepBrowserAnalysis = pipelineOutput?.deepBrowserAnalysis ?? null;
      state.fixProposals = Array.isArray(pipelineOutput?.fixProposals) ? pipelineOutput.fixProposals : [];
      try {
        const baselineSnapshot = await _captureBaselineSnapshot({
          url: currentUrl,
          evaluationResult: pipelineOutput,
          runEvaluationPipeline: _runEvaluationPipeline,
        });
        state.transformationBaseline = baselineSnapshot;
        emit(makeStepLog({
          iteration: iterationNumber, step: 4, status: 'complete',
          tool: 'verification.captureBaselineSnapshot (PHASE C)',
          why: 'capture before snapshot before remediation patches are applied',
          result: {
            url: baselineSnapshot.url,
            lighthouseScores: baselineSnapshot.lighthouseScores,
            axeViolations: baselineSnapshot.axeViolations,
            runtimeErrors: baselineSnapshot.runtimeErrors,
            consoleErrors: baselineSnapshot.consoleErrors,
            totalFindings: baselineSnapshot.totalFindings,
          },
          mode: state.mode,
        }));
      } catch (snapshotErr) {
        state.transformationBaseline = null;
        emit(makeStepLog({
          iteration: iterationNumber, step: 4, status: 'degraded',
          tool: 'verification.captureBaselineSnapshot (PHASE C)',
          why: 'baseline delta snapshot failed; continuing without transformation delta',
          result: { error: (snapshotErr?.message ?? String(snapshotErr)).slice(0, 200) },
          mode: state.mode,
        }));
      }
      const log = makeStepLog({
        iteration: iterationNumber, step: 4,
        status: pipelineOutput?.ok ? 'complete' : 'degraded',
        tool: 'evaluationPipeline.runEvaluationPipeline (Phase B1)',
        why: 'fan-out to Lighthouse + axe-core + runtimeDiagnostics; normalize + dedupe',
        result: {
          combinedFindings: state.pipelineFindings.length,
          domFixProposals: state.fixProposals.length,
          perEvaluator: pipelineOutput?.perEvaluator ?? {},
          stats: pipelineOutput?.stats ?? null,
          errors: pipelineOutput?.errors ?? {},
        },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      state.pipelineFindings = [];
      state.pipelineStats = null;
      const timedOut = e?.code === 'PHASE_B1_EVALUATION_PIPELINE_TIMEOUT';
      state.pipelineErrors = {
        _: timedOut
          ? `timeout:${step5ToStep6Timeouts.runEvaluationPipeline}ms`
          : (e?.message ?? String(e)).slice(0, 200),
      };
      state.deepBrowserAnalysis = null;
      state.fixProposals = [];
      emit(makeStepLog({
        iteration: iterationNumber, step: 4, status: 'degraded',
        tool: 'evaluationPipeline (Phase B1)',
        why: timedOut
          ? 'pipeline timed out; preserving baseline score and continuing with Phase A + raw Phase B only'
          : 'pipeline threw; continuing with Phase A + raw Phase B only',
        result: {
          degraded: true,
          reason: timedOut ? 'phase_b1_evaluation_timeout' : 'phase_b1_evaluation_failed',
          timeoutMs: timedOut ? step5ToStep6Timeouts.runEvaluationPipeline : null,
          error: (e?.message ?? String(e)).slice(0, 200),
          code: e?.code ?? 'PHASE_B1_EVALUATION_FAILED',
        },
        mode: state.mode,
      }));
    }

    await state.checkpoint(onCheckpoint, { lastStep: 4, iteration: iterationNumber });

    // STEP 5 — Five-Layer Scoring (Phase B/B1 enrichment).
    //
    // The early baseline above is the timeout-safe score. When the slower
    // analyzers complete, recompute only the canonical GTM score with
    // their normalized findings and emit an enriched STEP 5 log. This
    // preserves the old comprehensive signal without making the user wait
    // for it before seeing a real score.
    try {
      const t0 = Date.now();
      const _multiEngineFindings = (Array.isArray(state.pipelineFindings) && state.pipelineFindings.length > 0)
        ? state.pipelineFindings
        : (state.phaseBFindings ?? null);
      if (Array.isArray(_multiEngineFindings) && _multiEngineFindings.length > 0) {
        const preGtm = _scoreCrawlOutput(crawlOutput, _multiEngineFindings);
        // D41 T5 — whole-product comparison: surface-only Phase A vs
        // comprehensive Phase A + multi-page Phase B.
        const preGtmSurfaceOnly = _scoreCrawlOutput(crawlOutput, null);
        // The early baseline is a timeout-safe provisional score. Once
        // the first enriched evaluator score exists, it becomes the
        // canonical run baseline so evaluation-only/no-fix runs do not
        // report a fake negative delta against the provisional score.
        if (iterationNumber === 1) originalGtmScore = preGtm.score;
        else if (originalGtmScore === null) originalGtmScore = preGtm.score;
        iterLog.preGtm = preGtm;
        iterLog.preGtmSurfaceOnly = preGtmSurfaceOnly;
        const log = makeStepLog({
          iteration: iterationNumber, step: 5, status: 'complete',
          tool: 'gtmReadinessScorer (§7.6) + Phase B/B1 enrichment',
          why: 'enrich canonical GTM Readiness score with completed browser/evaluator findings',
          result: {
            gtmScore: preGtm.score,
            gtmBand: preGtm.band,
            gtmCounts: preGtm.counts,
            ceo95Criteria: preGtm.ceo95Criteria ?? null,
            // D41 T5 — surface-only vs comprehensive-Phase-B breakdown.
            surfaceOnlyGtmScore: preGtmSurfaceOnly.score,
            surfaceOnlyGtmCounts: preGtmSurfaceOnly.counts,
            phaseBContribution: preGtmSurfaceOnly.score - preGtm.score,
            phaseBPagesProbed: state.phaseBPagesProbed ?? 0,
            phaseBUrlsAttempted: state.phaseBUrlsAttempted ?? 0,
            fiveLayerInternal: preScoreEnvelope.total,
            layers: {
              l1: preScoreEnvelope.l1, l2: preScoreEnvelope.l2, l3: preScoreEnvelope.l3,
              l4: preScoreEnvelope.l4, l5: preScoreEnvelope.l5,
            },
            label: preGtm.label,
            coverage: 'crawl_plus_phase_b_b1',
          },
          durationMs: Date.now() - t0, mode: state.mode,
          scores: {
            original: originalGtmScore, current: preGtm.score,
            target: gtmTarget, progressPct: computeProgress({ originalScore: originalGtmScore, currentScore: preGtm.score, target: gtmTarget }),
          },
        });
        emit(log); iterLog.steps.push(log);
      }
    } catch (e) {
      const degradedLog = makeStepLog({
        iteration: iterationNumber, step: 5, status: 'degraded',
        tool: 'gtmReadinessScorer (§7.6) + Phase B/B1 enrichment',
        why: 'Phase B/B1 enriched scoring failed; continuing with the timeout-safe pre-fix baseline',
        result: {
          degraded: true,
          reason: 'phase_b_enrichment_scoring_failed',
          error: (e?.message ?? String(e)).slice(0, 240),
          code: e?.code ?? 'SCORING_ENRICHMENT_FAILED',
          fallbackScore: originalGtmScore ?? null,
        },
        mode: state.mode,
      });
      emit(degradedLog); iterLog.steps.push(degradedLog);
      state.pipelineErrors = {
        ...(state.pipelineErrors && typeof state.pipelineErrors === 'object' ? state.pipelineErrors : {}),
        scoring_enrichment: (e?.message ?? String(e)).slice(0, 200),
      };
    }
    await state.checkpoint(onCheckpoint, { lastStep: 5, iteration: iterationNumber });
    const step5HandoffLog = makeStepLog({
      iteration: iterationNumber,
      step: 5.1,
      status: 'complete',
      tool: 'forge-step-handoff',
      why: 'Five-Layer scoring baseline is recorded; continue to Issue Prioritization without waiting for additional enrichment',
      result: {
        kind: 'forge_step_handoff.v1',
        fromInternalStep: 5,
        toInternalStep: 6,
        userFacingStepCompleted: 'design_scoring',
        nextUserFacingStep: 'build_planning_prioritization',
        baselineScore: originalGtmScore ?? null,
      },
      mode: state.mode,
    });
    emit(step5HandoffLog); iterLog.steps.push(step5HandoffLog);

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
    // D37: capture the Trees-API outcome explicitly so operators see it
    // in the orchestration log (D36 was unclear due to log truncation).
    let treesOutcome = { ok: false, reason: 'not_attempted', filesCount: 0, sha: null };
    if (!pathB && githubRepoUrl) {
      const parsed = parseGithubRepoUrl(githubRepoUrl);
      if (parsed) {
        try {
          let credentialSource = 'github_app_installation';
          if (githubOperatorToken && state.operatorRepoAccess?.ok !== false) {
            token = githubOperatorToken;
            credentialSource = 'GITHUB_OPERATOR_TOKEN';
          } else {
            const minted = await withTimeout(
              _getInstallationToken({
                pat: '',
                fetch: makeAbortableFetch({
                  timeoutMs: step5ToStep6Timeouts.getInstallationToken,
                  code: 'GITHUB_INSTALLATION_TOKEN_TIMEOUT',
                  message: `GitHub App token mint exceeded ${step5ToStep6Timeouts.getInstallationToken}ms`,
                }),
              }),
              {
                timeoutMs: step5ToStep6Timeouts.getInstallationToken,
                code: 'GITHUB_INSTALLATION_TOKEN_TIMEOUT',
                message: `GitHub App token mint exceeded ${step5ToStep6Timeouts.getInstallationToken}ms`,
              },
            );
            token = minted.token;
            credentialSource = minted.source === 'pat' ? 'GITHUB_PAT' : 'github_app_installation';
          }
          const treeResult = await withTimeout(
            _fetchRepoFileList({
              owner: parsed.owner, repo: parsed.repo, ref: productBranch, token,
              opts: {
                fetch: makeAbortableFetch({
                  timeoutMs: step5ToStep6Timeouts.fetchRepoFileList,
                  code: 'GITHUB_REPO_FILE_LIST_TIMEOUT',
                  message: `GitHub repo file list fetch exceeded ${step5ToStep6Timeouts.fetchRepoFileList}ms`,
                }),
              },
            }),
            {
              timeoutMs: step5ToStep6Timeouts.fetchRepoFileList,
              code: 'GITHUB_REPO_FILE_LIST_TIMEOUT',
              message: `GitHub repo file list fetch exceeded ${step5ToStep6Timeouts.fetchRepoFileList}ms`,
            },
          );
          if (treeResult && treeResult.error) {
            treesOutcome = { ok: false, reason: treeResult.error, filesCount: 0, sha: treeResult.sha ?? null };
          } else if (treeResult && Array.isArray(treeResult.files)) {
            treesOutcome = {
              ok: treeResult.files.length > 0,
              reason: treeResult.files.length > 0 ? 'fetched' : 'empty_tree',
              filesCount: treeResult.files.length,
              sha: treeResult.sha ?? null,
              truncated: !!treeResult.truncated,
              credentialSource,
              tokenRedacted: true,
            };
            if (treeResult.files.length > 0) repoFileList = treeResult.files;
          } else {
            treesOutcome = { ok: false, reason: 'malformed_envelope', filesCount: 0, sha: null };
          }
        } catch (e) {
          const timedOut = e?.code === 'GITHUB_INSTALLATION_TOKEN_TIMEOUT'
            || e?.code === 'GITHUB_REPO_FILE_LIST_TIMEOUT';
          if (timedOut) {
            recordPipelineError(state, e?.code === 'GITHUB_INSTALLATION_TOKEN_TIMEOUT'
              ? 'github_installation_token'
              : 'github_repo_file_list', `timeout:${e?.message ?? ''}`);
          }
          treesOutcome = {
            ok: false,
            reason: timedOut
              ? `timeout:${e?.code}`
              : `threw:${(e?.message ?? String(e)).slice(0, 80)}`,
            filesCount: 0,
            sha: null,
            timeoutMs: timedOut ? (e?.code === 'GITHUB_INSTALLATION_TOKEN_TIMEOUT'
              ? step5ToStep6Timeouts.getInstallationToken
              : step5ToStep6Timeouts.fetchRepoFileList) : null,
            code: e?.code ?? null,
          };
        }
        // Always emit a log entry so the outcome is visible.
        emit(makeStepLog({
          iteration: iterationNumber, step: 6, status: treesOutcome.ok ? 'complete' : 'degraded',
          tool: 'fetchRepoFileList (GitHub Trees API; D27 hoist + D37 visibility)',
          why: 'fetch real repo file inventory for prioritizer + added-import validation',
          result: { ...treesOutcome, ref: productBranch },
          durationMs: 0, mode: state.mode,
        }));
      }
    }

    // D37 T2 — package.json's dependencies + devDependencies = the
    // knownPackages set used by validateAddedImports for bare specifiers.
    // Best-effort: fetch via Contents API on the productBranch; on
    // failure the import validator falls through (back-compat).
    let knownPackages = null;
    if (!pathB && githubRepoUrl && token && repoFileList) {
      const parsed = parseGithubRepoUrl(githubRepoUrl);
      if (parsed && repoFileList.includes('package.json')) {
        try {
          const pkgRaw = await withTimeout(
            _fetchFileContent({
              owner: parsed.owner, repo: parsed.repo,
              filePath: 'package.json', ref: productBranch, token,
              opts: {
                fetch: makeAbortableFetch({
                  timeoutMs: step5ToStep6Timeouts.fetchFileContent,
                  code: 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT',
                  message: `GitHub file content fetch exceeded ${step5ToStep6Timeouts.fetchFileContent}ms`,
                }),
              },
            }),
            {
              timeoutMs: step5ToStep6Timeouts.fetchFileContent,
              code: 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT',
              message: `GitHub file content fetch exceeded ${step5ToStep6Timeouts.fetchFileContent}ms`,
            },
          );
          const pkg = JSON.parse(pkgRaw);
          const names = new Set();
          for (const k of Object.keys(pkg.dependencies ?? {})) names.add(k);
          for (const k of Object.keys(pkg.devDependencies ?? {})) names.add(k);
          for (const k of Object.keys(pkg.peerDependencies ?? {})) names.add(k);
          for (const k of Object.keys(pkg.optionalDependencies ?? {})) names.add(k);
          knownPackages = names;
        } catch (e) {
          if (e?.code === 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT') {
            recordPipelineError(state, 'github_fetch_file_content', `timeout:${e?.message ?? ''}`);
            emit(makeStepLog({
              iteration: iterationNumber, step: 6, status: 'degraded',
              tool: 'fetchFileContent (GitHub Contents API; package.json)',
              why: 'package.json dependency inventory timed out; continuing without knownPackages',
              result: {
                degraded: true,
                reason: 'github_fetch_file_content_timeout',
                timeoutMs: step5ToStep6Timeouts.fetchFileContent,
                code: e.code,
              },
              durationMs: 0, mode: state.mode,
            }));
          }
          knownPackages = null;
        }
      }
    }

    // U4 — registered repo source analysis. Use the real Trees API
    // inventory to map observed findings back to concrete repo files.
    // This is intentionally evidence-only: no path is invented, and
    // low-confidence mappings stay visible but are not used for patching.
    let sourceMapping = null;
    if (!pathB && Array.isArray(repoFileList) && repoFileList.length > 0) {
      const mappingFindings = Array.isArray(state.pipelineFindings) && state.pipelineFindings.length > 0
        ? state.pipelineFindings
        : (Array.isArray(iterLog.preGtm?.issues) ? iterLog.preGtm.issues : []);
      sourceMapping = _mapFindingsToSource({
        findings: mappingFindings,
        repoFileList,
      });
      state.sourceMapping = sourceMapping;
      state.sourceMappings = sourceMapping?.mappings ?? [];
      emit(makeStepLog({
        iteration: iterationNumber, step: 6,
        status: sourceMapping?.mapped > 0 ? 'complete' : 'degraded',
        tool: 'registeredRepoSourceMapper.mapFindingsToSource (U4)',
        why: 'map runtime/evaluator findings to real registered-repo source files before fix generation',
        result: {
          kind: 'source_mapping_complete',
          totalFindings: sourceMapping?.totalFindings ?? 0,
          mapped: sourceMapping?.mapped ?? 0,
          unmapped: sourceMapping?.unmapped ?? 0,
          highConfidence: sourceMapping?.highConfidence ?? 0,
          repoFilesConsidered: sourceMapping?.repoFilesConsidered ?? 0,
        },
        durationMs: 0, mode: state.mode,
      }));
    }

    try {
      const recommendationFindings = Array.isArray(state.pipelineFindings) && state.pipelineFindings.length > 0
        ? state.pipelineFindings
        : (Array.isArray(iterLog.preGtm?.issues) ? iterLog.preGtm.issues : []);
      const generatedProposals = await withTimeout(
        _generateSourceMappedFixProposals({
          findings: recommendationFindings,
          sourceMapping: state.sourceMapping,
          fileContentProvider: async (filePath) => {
            if (pathB || !token || !githubRepoUrl) return null;
            const parsed = parseGithubRepoUrl(githubRepoUrl);
            if (!parsed) return null;
            return withTimeout(
              _fetchFileContent({
                owner: parsed.owner,
                repo: parsed.repo,
                filePath,
                ref: productBranch,
                token,
                opts: {
                  fetch: makeAbortableFetch({
                    timeoutMs: step5ToStep6Timeouts.fetchFileContent,
                    code: 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT',
                    message: `GitHub file content fetch exceeded ${step5ToStep6Timeouts.fetchFileContent}ms`,
                  }),
                },
              }),
              {
                timeoutMs: step5ToStep6Timeouts.fetchFileContent,
                code: 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT',
                message: `GitHub file content fetch exceeded ${step5ToStep6Timeouts.fetchFileContent}ms`,
              },
            );
          },
        }),
        {
          timeoutMs: phaseBEnrichmentTimeoutMs,
          code: 'PHASE_B_ENRICHMENT_TIMEOUT',
          message: `Phase B/B1 source-mapped proposal enrichment exceeded ${phaseBEnrichmentTimeoutMs}ms`,
        },
      );
      const proposalBoundary = filterPlatformBoundaryFindings(generatedProposals, {
        pathSelector: (p) => p?.filePath ?? p?.targetFilePath ?? p?.selectedFilePath ?? p?.path,
      });
      state.sourceMappedFixProposals = proposalBoundary.allowed;
      if (proposalBoundary.blocked.length > 0) {
        state.platformBoundaryBlocked = [
          ...(Array.isArray(state.platformBoundaryBlocked) ? state.platformBoundaryBlocked : []),
          ...proposalBoundary.blocked.map((b) => ({
            ...b,
            stage: 'source_mapped_recommendation',
            classification: 'PLATFORM_BOUNDARY_BLOCKED',
          })),
        ];
      }
      emit(makeStepLog({
        iteration: iterationNumber, step: 6,
        status: state.sourceMappedFixProposals.length > 0 ? 'complete' : 'degraded',
        tool: 'sourceMappedFixGenerator.generateSourceMappedFixProposals (U5)',
        why: 'emit recommend-only source-mapped engineering recommendations without applying patches',
        result: {
          kind: 'source_mapped_recommendations',
          proposals: state.sourceMappedFixProposals.length,
          platformBoundaryBlocked: proposalBoundary.blocked.length,
          blocked: proposalBoundary.blocked,
          recommendOnly: true,
          lowConfidence: state.sourceMappedFixProposals.filter((p) => p.confidence === 'LOW').length,
        },
        durationMs: 0, mode: state.mode,
      }));
    } catch (e) {
      state.sourceMappedFixProposals = [];
      const timedOut = e?.code === 'PHASE_B_ENRICHMENT_TIMEOUT';
      state.pipelineErrors = {
        ...(state.pipelineErrors && typeof state.pipelineErrors === 'object' ? state.pipelineErrors : {}),
        source_mapped_proposals: timedOut
          ? `timeout:${phaseBEnrichmentTimeoutMs}ms`
          : (e?.message ?? String(e)).slice(0, 200),
      };
      emit(makeStepLog({
        iteration: iterationNumber, step: 6, status: 'degraded',
        tool: 'sourceMappedFixGenerator.generateSourceMappedFixProposals (U5)',
        why: timedOut
          ? 'Phase B/B1 proposal enrichment timed out; preserving baseline score and continuing to Issue Prioritization'
          : 'recommendation generation failed; continuing without blocking run',
        result: {
          kind: 'source_mapped_recommendations_degraded',
          degraded: true,
          reason: timedOut ? 'phase_b_enrichment_timeout' : 'source_mapped_recommendations_failed',
          timeoutMs: timedOut ? phaseBEnrichmentTimeoutMs : null,
          fallbackScore: originalGtmScore ?? iterLog.preGtm?.score ?? null,
          proposals: 0,
          recommendOnly: true,
          error: (e?.message ?? String(e)).slice(0, 200),
          code: e?.code ?? 'SOURCE_MAPPED_RECOMMENDATIONS_FAILED',
        },
        durationMs: 0, mode: state.mode,
      }));
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
      // D38 T1 — pass canonical §7.6 findings to the prioritizer so
      // Claude targets the actual measurable defects observed by the
      // Aggressive Crawl Engine (deriveIssuesFromCrawl output) rather
      // than imagining problems based on Five-Layer telemetry. The
      // iterLog.preGtm was captured during STEP 5 and carries the
      // .issues array (severity-tagged, location-tagged).
      let claudeIssues = null;
      try {
        claudeIssues = await withTimeout(
          prioritizeIssuesWithClaude({
            preScore: preScoreEnvelope, product, suppliedIssue: args.issue,
            fileList: repoFileList,
            canonicalFindings: iterLog.preGtm?.issues ?? null,
            opts: {
              fetch: makeAbortableFetch({
                timeoutMs: step5ToStep6Timeouts.prioritizeIssuesWithClaude,
                code: 'ISSUE_PRIORITIZATION_CLAUDE_TIMEOUT',
                message: `Issue prioritization Claude call exceeded ${step5ToStep6Timeouts.prioritizeIssuesWithClaude}ms`,
              }),
            },
          }),
          {
            timeoutMs: step5ToStep6Timeouts.prioritizeIssuesWithClaude,
            code: 'ISSUE_PRIORITIZATION_CLAUDE_TIMEOUT',
            message: `Issue prioritization Claude call exceeded ${step5ToStep6Timeouts.prioritizeIssuesWithClaude}ms`,
          },
        );
      } catch (e) {
        if (e?.code === 'ISSUE_PRIORITIZATION_CLAUDE_TIMEOUT') {
          recordPipelineError(state, 'issue_prioritization_claude', `timeout:${e?.message ?? ''}`);
          emit(makeStepLog({
            iteration: iterationNumber, step: 6, status: 'degraded',
            tool: 'prioritizeIssuesWithClaude',
            why: 'Claude prioritization timed out; falling back to score-derived heuristic issues',
            result: {
              degraded: true,
              reason: 'issue_prioritization_claude_timeout',
              timeoutMs: step5ToStep6Timeouts.prioritizeIssuesWithClaude,
              code: e.code,
            },
            durationMs: 0, mode: state.mode,
          }));
        }
      }
      if (claudeIssues && claudeIssues.length > 0) {
        prioritizedIssues = claudeIssues;
      } else {
        // Fallback: heuristic single-issue
        prioritizedIssues = derivePrioritizedIssuesFromScore(preScoreEnvelope, product, args.issue);
      }
      if (Array.isArray(state.sourceMappings) && state.sourceMappings.length > 0 && Array.isArray(prioritizedIssues)) {
        prioritizedIssues = prioritizedIssues.map((issue) => {
          const explicit = issue?.filePath;
          if (typeof explicit === 'string' && (!repoFileList || repoFileList.includes(explicit))) return issue;
          const mappedPath = sourcePathForFinding({
            finding: issue,
            sourceMappings: state.sourceMappings,
            minimumConfidence: 0.7,
          });
          return mappedPath
            ? { ...issue, filePath: mappedPath, sourceMapped: true }
            : issue;
        });
      }
      const issueBoundary = filterPlatformBoundaryFindings(prioritizedIssues);
      prioritizedIssues = issueBoundary.allowed;
      if (issueBoundary.blocked.length > 0) {
        state.platformBoundaryBlocked = [
          ...(Array.isArray(state.platformBoundaryBlocked) ? state.platformBoundaryBlocked : []),
          ...issueBoundary.blocked.map((b) => ({
            ...b,
            stage: 'prioritization',
            classification: 'PLATFORM_BOUNDARY_BLOCKED',
          })),
        ];
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
          platformBoundaryBlocked: issueBoundary.blocked.length,
          blockedPlatformFindings: issueBoundary.blocked,
          source: claudeIssues ? 'claude' : 'heuristic',
          repoFileListSize: repoFileList ? repoFileList.length : 0,
        },
        durationMs: Date.now() - t0, mode: state.mode,
      });
      emit(log); iterLog.steps.push(log);
    } catch (e) {
      emit(makeStepLog({ iteration: iterationNumber, step: 6, status: 'failed',
        tool: 'prioritization', why: 'rank issues', result: { error: e?.message }, mode: state.mode }));
      return failStep({ product, failedStep: 'STEP_6',
        error: e?.message ?? String(e), code: 'PRIORITIZATION_FAILED', diagnostics: e });
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
    const originalContentByPath = new Map(); // filePath -> fetched baseline content for safety gates
    const recordNoFixIteration = async ({ reason, detail, remediationOutput = null }) => {
      const preGtmForIter = iterLog.preGtm ?? {
        score: originalGtmScore ?? preScoreEnvelope?.total ?? 0,
        counts: { critical: 0, high: 0, medium: 0, low: 0 },
        band: 'unknown',
      };
      lastPostGtm = preGtmForIter;
      lastPostScore = preScoreEnvelope?.total ?? originalScore ?? null;
      iterLog.preScore = preGtmForIter.score;
      iterLog.postScore = preGtmForIter.score;
      iterLog.fiveLayerPre = preScoreEnvelope?.total ?? null;
      iterLog.fiveLayerPost = preScoreEnvelope?.total ?? null;
      iterLog.delta = 0;
      iterLog.totalImprovement = preGtmForIter.score - (originalGtmScore ?? preGtmForIter.score);
      iterLog.gtmReady = false;
      iterLog.branchName = null;
      iterLog.previewUrl = null;
      iterLog.decision = reason;
      iterLog.path = pathB ? 'B' : 'A';
      iterLog.noFixReason = reason;
      iterLog.remediationSummary = remediationOutput?.summary ?? state.remediationSummary ?? null;
      const log = makeStepLog({
        iteration: iterationNumber, step: 12, status: 'complete',
        tool: 'repair-loop transition guard',
        why: 'record attempted iteration even when no safe commit-ready fixes survived',
        result: {
          exitTrigger: reason,
          detail,
          prioritizedIssues: Array.isArray(prioritizedIssues) ? prioritizedIssues.length : 0,
          fixOutcomes: Array.isArray(iterLog.fixOutcomes) ? iterLog.fixOutcomes.length : 0,
          remediationSummary: iterLog.remediationSummary,
        },
        mode: state.mode,
        scores: {
          original: originalGtmScore,
          current: preGtmForIter.score,
          target: gtmTarget,
          progressPct: computeProgress({
            originalScore: originalGtmScore,
            currentScore: preGtmForIter.score,
            target: gtmTarget,
          }),
        },
      });
      emit(log); iterLog.steps.push(log);
      iterations.push(iterLog);
      try { onIteration({ ...iterLog }); } catch { /* swallow */ }
      await state.checkpoint(onCheckpoint, { lastStep: 12, iteration: iterationNumber, decision: reason });
    };
    if (pathB) {
      // DISPATCH U1 ITEM 3 — annotate each skipped step with
      // autoFixSkippedReason so the governance trail (and the UI's
      // collapse logic) can attribute the gap honestly. The UI hides
      // these entries from the active step list but governance keeps
      // a verbatim record.
      const skipReason = state.universalMode
        ? 'UNIVERSAL_NO_REPO_ACCESS'
        : 'PATH_B_REMEDIATION_ENGINE_OWNS_DEPLOY';
      const pathBSkips = [
        { step: 8, tool: 'githubApp.js',
          why: 'short-lived installation token (~9 min) for branch + PR writes',
          detail: state.universalMode
            ? 'universal mode — no operator GitHub repo to authorize against'
            : 'PATH B — remediationEngine handles fix+deploy' },
        { step: 7, tool: 'fixGenerator.js (Claude API)',
          why: 'generate concrete fixes for prioritized issues',
          detail: state.universalMode
            ? 'universal mode — no repo for AI-generated diffs to land in'
            : 'PATH B — remediationEngine produces patched file tree internally' },
        { step: 9, tool: 'githubBranchWriter.js',
          why: 'all fixes on isolated branch for review + rollback',
          detail: state.universalMode
            ? 'universal mode — no operator GitHub repo for branch + commits'
            : 'PATH B — no operator GitHub repo for branch + commits' },
      ];
      for (const s of pathBSkips) {
        const result = {
          skipped: s.detail,
          autoFixSkippedReason: skipReason,
        };
        emit(makeStepLog({
          iteration: iterationNumber, step: s.step, status: 'skipped',
          tool: s.tool, why: s.why, result, mode: state.mode,
        }));
        state.skippedSteps.push({
          iteration: iterationNumber, step: s.step, tool: s.tool,
          autoFixSkippedReason: skipReason, detail: s.detail,
        });
      }
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
        let credentialSource = token === githubOperatorToken && githubOperatorToken
          ? 'GITHUB_OPERATOR_TOKEN'
          : 'github_app_installation';
        if (!token) {
          if (githubOperatorToken && state.operatorRepoAccess?.ok !== false) {
            token = githubOperatorToken;
            credentialSource = 'GITHUB_OPERATOR_TOKEN';
          } else {
            const minted = await withTimeout(
              _getInstallationToken({
                pat: '',
                fetch: makeAbortableFetch({
                  timeoutMs: step5ToStep6Timeouts.getInstallationToken,
                  code: 'GITHUB_INSTALLATION_TOKEN_TIMEOUT',
                  message: `GitHub App token mint exceeded ${step5ToStep6Timeouts.getInstallationToken}ms`,
                }),
              }),
              {
                timeoutMs: step5ToStep6Timeouts.getInstallationToken,
                code: 'GITHUB_INSTALLATION_TOKEN_TIMEOUT',
                message: `GitHub App token mint exceeded ${step5ToStep6Timeouts.getInstallationToken}ms`,
              },
            );
            token = minted.token;
            expiresAt = minted.expiresAt;
            credentialSource = minted.source === 'pat' ? 'GITHUB_PAT' : 'github_app_installation';
            mintedNow = true;
          }
        }
        const log = makeStepLog({
          iteration: iterationNumber, step: 8, status: 'complete',
          tool: credentialSource === 'GITHUB_OPERATOR_TOKEN' ? 'GITHUB_OPERATOR_TOKEN' : 'githubApp.js',
          why: 'repo-write credential for branch + PR writes',
          result: {
            tokenAcquired: true,
            operator_mode: state.operatorMode,
            credentialSource,
            tokenRedacted: true,
            expiresAt,
            reusedFromHoist: !mintedNow,
          },
          durationMs: Date.now() - t0, mode: state.mode,
        });
        emit(log); iterLog.steps.push(log);
      } catch (e) {
        const tokenTimedOut = e?.code === 'GITHUB_INSTALLATION_TOKEN_TIMEOUT';
        emit(makeStepLog({ iteration: iterationNumber, step: 8, status: tokenTimedOut ? 'degraded' : 'failed',
          tool: 'githubApp', why: 'mint token', result: {
            error: e?.message,
            degraded: tokenTimedOut,
            reason: tokenTimedOut ? 'github_installation_token_timeout' : undefined,
            timeoutMs: tokenTimedOut ? step5ToStep6Timeouts.getInstallationToken : null,
            code: e?.code ?? 'GITHUB_AUTH_FAILED',
          }, mode: state.mode }));
        if (tokenTimedOut) {
          recordPipelineError(state, 'github_installation_token_step8', `timeout:${step5ToStep6Timeouts.getInstallationToken}ms`);
          token = null;
        } else {
        return failStep({ product, failedStep: 'STEP_8',
          error: e?.message ?? String(e), code: e?.code ?? 'GITHUB_AUTH_FAILED', diagnostics: e });
        }
      }

      const repoParsed = parseGithubRepoUrl(githubRepoUrl);
      if (!repoParsed) {
        const missingField = githubRepoUrl ? null : 'githubRepoUrl';
        const remediation = 'Configure product_registry.github_repo_url or upgrade_repo with a valid GitHub URL before repo mutation/deploy.';
        const error = githubRepoUrl
          ? `unparseable githubRepoUrl: ${githubRepoUrl}`
          : 'missing githubRepoUrl';
        await recordTerminalFailure({
          product,
          failedStep: 'STEP_7',
          error,
          code: 'BAD_REPO_URL',
          diagnostics: {
            githubRepoUrl: githubRepoUrl ?? null,
            missingField,
            unparseableField: missingField ? null : 'githubRepoUrl',
          },
          remediation,
        });
        const log = makeStepLog({
          iteration: iterationNumber, step: 7, status: 'degraded',
          tool: 'githubRepoUrl validation',
          why: 'validate operator repo target before fix generation',
          result: {
            kind: 'forge.terminal_failure.v1',
            failedStep: 'STEP_7',
            code: 'BAD_REPO_URL',
            error,
            githubRepoUrl: githubRepoUrl ?? null,
            missingField,
            degraded: true,
            remediation,
          },
          mode: state.mode,
        });
        emit(log); iterLog.steps.push(log);
        state.skippedSteps.push(
          {
            iteration: iterationNumber, step: 9, tool: 'githubBranchWriter.js',
            autoFixSkippedReason: 'BAD_REPO_URL',
            detail: 'no valid GitHub repo URL for branch + commits',
          },
          {
            iteration: iterationNumber, step: 10, tool: 'vercelBranchDeploy.js',
            autoFixSkippedReason: 'BAD_REPO_URL',
            detail: 'no valid GitHub repo URL for deployment source',
          },
        );
        exitReason = 'STEP_FAILED';
        await recordNoFixIteration({
          reason: 'BAD_REPO_URL',
          detail: 'Step 7 cannot generate or commit fixes because githubRepoUrl is missing or unparseable.',
        });
        break outerLoop;
      }
      owner = repoParsed.owner;
      repo = repoParsed.repo;

      // STEP 7 — Multi-File Fix Generation (PATH A only).
      // DISPATCH 33 T1 — visible rejections: every per-file generateFix
      // outcome is captured in `fixOutcomes` (success or rejection,
      // with reason verbatim). The aggregate is attached to iterLog +
      // surfaced in the STEP 7 log entry so operators see WHY a fix
      // didn't apply without log-diving.
      const fixOutcomes = [];
      try {
        const t0 = Date.now();
        const llmEnabled = deps.enableLlmFixes === true
          || (typeof deps.generateFix === 'function' && deps.enableLlmFixes !== false)
          || llmFixesEnabled();
        let llmCallsThisIteration = 0;
        const recordLlmAttempt = (attempt) => {
          const summary = summarizeLlmAttempt(attempt);
          state.llmFixAttempts.push({
            ...summary,
            runId,
            productId,
            iteration: iterationNumber,
            at: new Date().toISOString(),
          });
          return summary;
        };
        for (const issue of prioritizedIssues) {
          const filePath = issue.filePath || 'README.md';
          let current;
          try {
            current = await withTimeout(
              _fetchFileContent({
                owner, repo, filePath, ref: productBranch, token,
                opts: {
                  fetch: makeAbortableFetch({
                    timeoutMs: step5ToStep6Timeouts.fetchFileContent,
                    code: 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT',
                    message: `GitHub file content fetch exceeded ${step5ToStep6Timeouts.fetchFileContent}ms`,
                  }),
                },
              }),
              {
                timeoutMs: step5ToStep6Timeouts.fetchFileContent,
                code: 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT',
                message: `GitHub file content fetch exceeded ${step5ToStep6Timeouts.fetchFileContent}ms`,
              },
            );
            if (typeof current === 'string' && !originalContentByPath.has(filePath)) {
              originalContentByPath.set(filePath, current);
            }
          } catch (fetchErr) {
            if (fetchErr?.code === 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT') {
              recordPipelineError(state, `step7_fetch_${filePath}`, `timeout:${step5ToStep6Timeouts.fetchFileContent}ms`);
            }
            fixOutcomes.push({
              filePath, status: 'rejected',
              category: issue.category ?? null,
              severity: issue.severity ?? null,
              title: issue.title ?? issue.issue ?? null,
              reason: 'file_fetch_failed',
              detail: (fetchErr?.message ?? String(fetchErr)).slice(0, 160),
            });
            continue;
          }
          try {
            const findingsForFile = [
              issue,
              ...(Array.isArray(iterLog.preGtm?.issues)
                ? iterLog.preGtm.issues.filter((finding) => {
                    const mapped = sourcePathForFinding({
                      finding,
                      sourceMappings: state.sourceMappings,
                      minimumConfidence: 0.7,
                    });
                    return mapped === filePath;
                  })
                : []),
            ].slice(0, 10).map((finding) => enrichFindingUrlContext(finding, {
              fallbackUrl: initialUrl ?? currentUrl,
            }));
            const sourceChars = typeof current === 'string' ? current.length : 0;
            const baseAttempt = {
              model: 'claude-sonnet-4-20250514',
              findingsSentCount: findingsForFile.length,
              filesSentCount: 1,
              sourceCharsSent: sourceChars,
              filesChanged: [filePath],
              previewUrl: null,
              scoreDelta: null,
            };
            const rejectBeforeCall = (reason, extra = {}) => {
              const validationResult = { ok: false, reason, ...extra };
              recordLlmAttempt({
                ...baseAttempt,
                accepted: false,
                rejectionReason: reason,
                validationResult,
                filesChanged: [],
              });
              fixOutcomes.push({
                filePath, status: 'rejected',
                category: issue.category ?? null,
                severity: issue.severity ?? null,
                title: issue.title ?? issue.issue ?? null,
                code: reason,
                reason,
                ...extra,
              });
            };
            if (!llmEnabled) {
              rejectBeforeCall(LLM_FIX_FEATURE_DISABLED);
              continue;
            }
            if (state.universalMode || pathB) {
              rejectBeforeCall('UNIVERSAL_MODE_SOURCE_PATCH_BLOCKED');
              continue;
            }
            if (shouldUseDeterministicRepairFirst(issue)) {
              rejectBeforeCall('DETERMINISTIC_REPAIR_FIRST');
              continue;
            }
            if (isForbiddenLlmSourcePath(filePath)) {
              rejectBeforeCall('PLATFORM_BOUNDARY_BLOCKED', { classification: 'PLATFORM_BOUNDARY_BLOCKED' });
              state.platformBoundaryBlocked = [
                ...(Array.isArray(state.platformBoundaryBlocked) ? state.platformBoundaryBlocked : []),
                { filePath, classification: 'PLATFORM_BOUNDARY_BLOCKED', stage: 'llm_pre_call_guard' },
              ];
              continue;
            }
            // DISPATCH 33 T2 — scoped per-finding preserve relaxation.
            // If the finding's category directly implies modifying a
            // normally-preserved construct (broken-link, network-failure,
            // engine-error, slow-route, auth-gate-leak), pass the list of
            // categories the diff editor is allowed to modify on the
            // specific offending location ONLY.
            const scopedRelax = deriveScopedRelaxation(issue);
            // D37 T2 — pass fileInventory + knownPackages to the diff
            // editor (via generateFix opts) so it can reject diffs
            // that introduce imports pointing at non-existent files
            // or unknown packages. Symmetric to the existing
            // remove-import preserve rule.
            const sourceContext = [
              `Product: ${product?.product_id ?? productId}`,
              `Original URL: ${initialUrl ?? currentUrl}`,
              `Current score: ${preScoreEnvelope?.total ?? 'unknown'}/100`,
              `User objectives: ${userObjectives.map((objective) => objective.text).join('; ') || '(none)'}`,
              `Finding URLs: ${findingsForFile.map((finding) => finding?.failingUrl || finding?.pageUrl || finding?.url || finding?.location)
                .filter(Boolean)
                .join('; ') || '(none)'}`,
              `Source mapped proposals: ${(state.sourceMappedFixProposals ?? [])
                .filter((proposal) => proposal?.filePath === filePath)
                .map((proposal) => proposal.proposedFix)
                .filter(Boolean)
                .join('; ') || '(none)'}`,
            ].join('\n');
            const findingUrls = findingsForFile
              .map((finding) => finding?.failingUrl || finding?.pageUrl || finding?.url || finding?.location)
              .filter(Boolean);
            const runGenerateFixAttempt = async ({ mode = 'full', retry = false } = {}) => {
              const budget = enforceLlmFixBudget({
                files: [filePath],
                findings: findingsForFile,
                sourceChars,
                iterationCalls: llmCallsThisIteration + 1,
                runCalls: state.llmFixCallsThisRun + 1,
              });
              if (!budget.ok) {
                return {
                  ok: false,
                  beforeCall: true,
                  reason: LLM_FIX_BUDGET_EXCEEDED,
                  extra: { cap: budget.cap, actual: budget.actual, limit: budget.limit },
                };
              }
              llmCallsThisIteration += 1;
              state.llmFixCallsThisRun += 1;
              try {
                const fix = await withTimeout(
                  _generateFix({
                    filePath, fileContent: current,
                    issue: issue.issue || issue.description || issue.title,
                    fix: retry
                      ? [
                          issue.fix || null,
                          `Observed finding URLs: ${findingUrls.join('; ') || '(none)'}`,
                          'Retry scope: fix only the primary observed root-cause finding for this file.',
                          'Use the smallest safe app-layer change possible. Do not touch platform/auth/Base44 internals.',
                        ].filter(Boolean).join('\n')
                      : issue.fix || null,
                    findings: findingsForFile,
                    userDescription: inputContext.description,
                    scoringCriteria: fixGenInternals.DEFAULT_SCORING_CRITERIA,
                    sourceContext,
                    productId, runId,
                    opts: {
                      model: 'claude-sonnet-4-20250514',
                      mode,
                      requireStructured: mode !== 'diff',
                      userDescription: inputContext.description,
                      scoringCriteria: fixGenInternals.DEFAULT_SCORING_CRITERIA,
                      ...(scopedRelax ? { preserveExceptions: scopedRelax } : {}),
                      ...(repoFileList ? { fileInventory: repoFileList } : {}),
                      ...(knownPackages ? { knownPackages } : {}),
                      fetch: makeAbortableFetch({
                        timeoutMs: step5ToStep6Timeouts.generateFix,
                        code: 'GENERATE_FIX_TIMEOUT',
                        message: `generateFix exceeded ${step5ToStep6Timeouts.generateFix}ms`,
                      }),
                    },
                  }),
                  {
                    timeoutMs: step5ToStep6Timeouts.generateFix,
                    code: 'GENERATE_FIX_TIMEOUT',
                    message: `generateFix exceeded ${step5ToStep6Timeouts.generateFix}ms`,
                  },
                );
                return { ok: true, fix };
              } catch (error) {
                return { ok: false, error };
              }
            };
            let attempt = await runGenerateFixAttempt({ mode: 'full' });
            if (attempt.beforeCall) {
              rejectBeforeCall(attempt.reason, attempt.extra);
              continue;
            }
            if (!attempt.ok && isPrimaryRootCauseIssue(issue, prioritizedIssues) && isGenerateFixTimeoutError(attempt.error)) {
              recordLlmAttempt({
                ...baseAttempt,
                accepted: false,
                rejectionReason: attempt.error?.code ?? 'GENERATE_FIX_TIMEOUT',
                filesChanged: [],
                validationResult: {
                  ok: false,
                  reason: attempt.error?.code ?? 'GENERATE_FIX_TIMEOUT',
                  retryPlanned: true,
                  retryMode: 'diff',
                },
                previewUrl: null,
                scoreDelta: null,
              });
              attempt = await runGenerateFixAttempt({ mode: 'diff', retry: true });
              if (attempt.beforeCall) {
                rejectBeforeCall(attempt.reason, { ...attempt.extra, retry: true, retryMode: 'diff' });
                continue;
              }
            }
            if (!attempt.ok) {
              throw attempt.error;
            }
            const fix = attempt.fix;
            const candidateForValidation = typeof deps.generateFix === 'function'
              ? {
                  ...fix,
                  rationale: fix.rationale ?? 'Injected generateFix test double accepted by downstream gates.',
                  confidence: fix.confidence ?? 100,
                }
              : fix;
            const candidateValidation = validateLlmFixCandidate({
              candidate: candidateForValidation,
              filePath,
              allowedFiles: repoFileList,
              universalMode: state.universalMode || pathB,
              existingPackageNames: knownPackages,
              originalContent: current,
              replacementContent: fix.fixedContent,
            });
            if (!candidateValidation.ok) {
              if (candidateValidation.classification === 'PLATFORM_BOUNDARY_BLOCKED') {
                state.platformBoundaryBlocked = [
                  ...(Array.isArray(state.platformBoundaryBlocked) ? state.platformBoundaryBlocked : []),
                  { filePath, classification: 'PLATFORM_BOUNDARY_BLOCKED', stage: 'llm_response_guard' },
                ];
              }
              recordLlmAttempt({
                ...baseAttempt,
                accepted: false,
                rejectionReason: candidateValidation.reason,
                validationResult: candidateValidation,
                filesChanged: [],
              });
              fixOutcomes.push({
                filePath, status: 'rejected',
                category: issue.category ?? null,
                severity: issue.severity ?? null,
                title: issue.title ?? issue.issue ?? null,
                code: candidateValidation.reason,
                reason: candidateValidation.reason,
                validationReason: candidateValidation.reason,
                requiresHumanReview: candidateValidation.requiresHumanReview === true,
              });
              continue;
            }
            fileChanges.push({ filePath, fileContent: fix.fixedContent });
            recordLlmAttempt({
              ...baseAttempt,
              accepted: true,
              rejectionReason: null,
              validationResult: { ok: true, reason: null },
              filesChanged: [filePath],
            });
            fixOutcomes.push({
              filePath, status: 'accepted',
              category: issue.category ?? null,
              severity: issue.severity ?? null,
              title: issue.title ?? issue.issue ?? null,
              mode: fix.mode ?? 'full',
              attempts: fix.attempts ?? 1,
              scoringDimension: fix.scoringDimension ?? null,
              rationale: fix.rationale ?? null,
              structuredResponse: fix.structuredResponse ?? false,
              diffStats: fix.diffStats ?? null,
            });
          } catch (fixErr) {
            // Capture the structured rejection reason. generateFix uses
            // makeError(code, message) where the message contains the
            // validation reason (e.g. "diff_preserve_violation:import"
            // or "diff_hunk_does_not_apply:oldStart=14").
            const msg = (fixErr?.message ?? String(fixErr)).toString();
            // Extract the validation reason from the canonical message
            // shape: "...validation failed for <path> after N attempt(s) — <reason>"
            const reasonMatch = msg.match(/—\s+(.+)$/);
            const extracted = reasonMatch ? reasonMatch[1].trim() : null;
            recordLlmAttempt({
              model: 'claude-sonnet-4-20250514',
              findingsSentCount: 1,
              filesSentCount: 1,
              sourceCharsSent: typeof current === 'string' ? current.length : 0,
              accepted: false,
              rejectionReason: extracted ?? fixErr?.validationReason ?? fixErr?.code ?? 'UNKNOWN',
              filesChanged: [],
              validationResult: {
                ok: false,
                reason: extracted ?? fixErr?.validationReason ?? fixErr?.code ?? 'UNKNOWN',
              },
              previewUrl: null,
              scoreDelta: null,
            });
            fixOutcomes.push({
              filePath, status: 'rejected',
              category: issue.category ?? null,
              severity: issue.severity ?? null,
              title: issue.title ?? issue.issue ?? null,
              code: fixErr?.code ?? 'UNKNOWN',
              reason: extracted ?? msg.slice(0, 160),
              validationReason: fixErr?.validationReason ?? null,
            });
            continue;
          }
        }
        iterLog.fixOutcomes = fixOutcomes;
        if (state.llmFixAttempts.length > 0) {
          try {
            await withTimeout(_appendGovernanceEntry({
              productId, environment,
              entry: {
                kind: 'self_renewal.llm_fix_attempts.v1',
                runId,
                productId,
                iteration: iterationNumber,
                attempts: state.llmFixAttempts.filter((a) => a.iteration === iterationNumber),
                policy: 'LLM fix attempts store metadata only; prompts, full source, secrets, and token values are not persisted.',
                at: new Date().toISOString(),
              },
              supabase,
            }), {
              timeoutMs: step5ToStep6Timeouts.governanceWrite,
              code: 'LLM_FIX_ATTEMPTS_GOVERNANCE_TIMEOUT',
              message: `LLM fix attempts governance write exceeded ${step5ToStep6Timeouts.governanceWrite}ms`,
            });
          } catch (e) {
            if (e?.code === 'LLM_FIX_ATTEMPTS_GOVERNANCE_TIMEOUT') {
              recordPipelineError(state, 'llm_fix_attempts_governance', `timeout:${step5ToStep6Timeouts.governanceWrite}ms`);
            }
          }
        }
        const accepted = fixOutcomes.filter((o) => o.status === 'accepted');
        const rejected = fixOutcomes.filter((o) => o.status === 'rejected');
        const log = makeStepLog({
          iteration: iterationNumber, step: 7,
          status: fileChanges.length > 0 ? 'complete' : (rejected.length > 0 ? 'degraded' : 'skipped'),
          tool: 'fixGenerator.js (Claude Sonnet 4; full-file replacement)',
          why: 'generate scoring-aware complete file replacements from findings, user description, source, and 95/100 criteria',
          result: {
            filesFixed: fileChanges.length,
            files: accepted.map((o) => o.filePath),
            rejectedCount: rejected.length,
            llmEnabled,
            llmCallsThisIteration,
            llmAttemptsRecorded: state.llmFixAttempts.filter((a) => a.iteration === iterationNumber).length,
            rejected: rejected.map((o) => ({
              filePath: o.filePath, code: o.code, reason: o.reason,
            })),
            accepted: accepted.map((o) => ({
              filePath: o.filePath, mode: o.mode,
              scoringDimension: o.scoringDimension,
              rationale: o.rationale,
              hunks: o.diffStats?.hunks ?? null,
              changeRatio: o.diffStats?.changeRatio ?? null,
            })),
          },
          durationMs: Date.now() - t0, mode: state.mode,
        });
        emit(log); iterLog.steps.push(log);
      } catch (e) {
        return failStep({ product, failedStep: 'STEP_7',
          error: e?.message ?? String(e), code: e?.code ?? 'FIX_GENERATION_FAILED', diagnostics: e });
      }
      await state.checkpoint(onCheckpoint, { lastStep: 7, iteration: iterationNumber });

      // CA-17 Phase 1 — Build/Wire ConstructionEngine attempt (opt-in via
      // deps.runConstruction + product_registry.construction_eligible).
      // Runs ADDITIVELY on top of standard fix generation: any wire_up
      // candidate file set is merged into fileChanges and validated by the
      // existing parse-check + commit path. Failures NEVER halt the
      // pipeline — Phase 1 proof-of-concept logs the abort and continues.
      const _constructionEnvBypass = !!product?.product_id && !!process.env.CONSTRUCTION_FORCE_ELIGIBLE_PRODUCTS
        && process.env.CONSTRUCTION_FORCE_ELIGIBLE_PRODUCTS.split(',').map((s) => s.trim()).includes(product.product_id);
      if (_runConstruction && (product?.construction_eligible === true || _constructionEnvBypass)) {
        try {
          const t0 = Date.now();
          const constructionResult = await withTimeout(_runConstruction({
            product,
            environment,
            // PHASE B1: prefer the normalized multi-engine pipeline output
            // when present — it carries Phase B findings plus axe/runtime/
            // Lighthouse evidence with provenance. The construction engine's
            // wire_up classifier filters by category, so the wider input
            // surface only ADDS candidates; it never displaces Phase B's
            // dead-card / broken-modal / broken-form signal.
            phaseBFindings: (Array.isArray(state.pipelineFindings) && state.pipelineFindings.length > 0)
              ? state.pipelineFindings
              : (state.phaseBFindings ?? []),
            baselineArgs: {
              // S1Baseline.buildBaseline contract: { score:number, layers?:{ui_ux,api,logic,business_value,security_posture}, findings? }.
              // §7.6 GTM score is the canonical baseline anchor; Five-Layer
              // L1-L5 carry the per-dim signal (L1 Functionality → logic,
              // L2 Operational → api, L4 Business → business_value,
              // L5 GTM → ui_ux; L3 Financial and S6 Security Posture have
              // no direct counterpart in the §7.6 rubric — null per S1's
              // null-tolerant snapshot builder).
              preScore: {
                score: iterLog.preGtm?.score ?? preScoreEnvelope?.total ?? 0,
                layers: {
                  ui_ux: preScoreEnvelope?.l5 ?? null,
                  api: preScoreEnvelope?.l2 ?? null,
                  logic: preScoreEnvelope?.l1 ?? null,
                  business_value: preScoreEnvelope?.l4 ?? null,
                  security_posture: null,
                },
                findings: iterLog.preGtm?.issues ?? [],
              },
              findings: iterLog.preGtm?.issues ?? [],
              pages: state.crawlOutput?.pages ?? [],
              endpoints: [],
              schema: '',
              dependencyGraph: '',
              extendedEnabled: product?.construction_extended_baseline_enabled === true,
            },
            knownPackages: knownPackages
              ? Object.fromEntries(Array.from(knownPackages).map((n) => [n, true]))
              : {},
            // W5a — instantiate the originPageResolver inline with this
            // iteration's GitHub credentials. The runner supplies the
            // factory via deps.createOriginPageResolver; we bind
            // repoFileList + fetchFileContent to the orchestrator's
            // current owner/repo/branch/token so the resolver can look
            // up files without re-doing the auth handshake.
            originPageResolver: deps.constructionOriginPageResolver
              ?? (typeof deps.createOriginPageResolver === 'function' && owner && repo && token && Array.isArray(repoFileList)
                ? deps.createOriginPageResolver({
                    repoFileList: async () => repoFileList,
                    fetchFileContent: async (filePath) => withTimeout(
                      _fetchFileContent({ owner, repo, filePath, ref: productBranch, token }),
                      {
                        timeoutMs: step5ToStep6Timeouts.fetchFileContent,
                        code: 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT',
                        message: `GitHub file content fetch exceeded ${step5ToStep6Timeouts.fetchFileContent}ms`,
                      },
                    ),
                  })
                : null),
            registryConfig: {
              s6AutoApproveInTestMode: product?.construction_s6_auto_approve_in_test_mode === true || _constructionEnvBypass,
              snapshotRetentionDays: product?.construction_snapshot_retention_days ?? undefined,
              recentEntries: [],
            },
            appendGovernanceEntry: _appendGovernanceEntry,
            supabase,
            deps: { aiOpts: { apiKey: process.env.ANTHROPIC_API_KEY } },
            logger: console,
          }), {
            timeoutMs: step5ToStep6Timeouts.construction,
            code: 'CONSTRUCTION_ENGINE_TIMEOUT',
            message: `ConstructionEngine exceeded ${step5ToStep6Timeouts.construction}ms`,
          });
          const constructed = constructionResult?.result?.candidateFiles ?? [];
          for (const cf of constructed) {
            if (!cf || typeof cf.path !== 'string') continue;
            // Only the non-diff files (the new endpoint handler) merge
            // cleanly into the existing commit path. Diff files are
            // applied through the existing diff-editor in the regular
            // fix-generator path — out of scope for Phase 1 proof-of-
            // concept merge.
            if (cf.isDiff !== true && typeof cf.source === 'string' && cf.source.length > 0) {
              fileChanges.push({ filePath: cf.path, fileContent: cf.source });
            }
          }
          emit(makeStepLog({
            iteration: iterationNumber, step: 7,
            status: constructionResult?.ran ? 'complete' : 'skipped',
            tool: 'ConstructionEngine (CA-17 Phase 1 wire_up)',
            why: 'generate real endpoint + wire dead UI controls per Phase B findings',
            result: {
              ran: !!constructionResult?.ran,
              reason: constructionResult?.reason ?? null,
              candidatesGenerated: constructed.length,
              construction_class: constructionResult?.result?.construction_class ?? null,
            },
            durationMs: Date.now() - t0, mode: state.mode,
          }));
        } catch (e) {
          emit(makeStepLog({
            iteration: iterationNumber, step: 7, status: 'degraded',
            tool: 'ConstructionEngine (CA-17 Phase 1)',
            why: 'wire_up construction attempt',
            result: {
              error: (e?.message ?? String(e)).slice(0, 280),
              code: e?.code ?? 'CONSTRUCTION_ERROR',
              gate: e?.gate ?? null,
              degraded: e?.code === 'CONSTRUCTION_ENGINE_TIMEOUT',
              reason: e?.code === 'CONSTRUCTION_ENGINE_TIMEOUT' ? 'construction_engine_timeout' : undefined,
              timeoutMs: e?.code === 'CONSTRUCTION_ENGINE_TIMEOUT' ? step5ToStep6Timeouts.construction : null,
            },
            mode: state.mode,
          }));
          if (e?.code === 'CONSTRUCTION_ENGINE_TIMEOUT') {
            recordPipelineError(state, 'construction_engine', `timeout:${step5ToStep6Timeouts.construction}ms`);
          }
          // Phase 1 proof-of-concept: never halt the pipeline on
          // construction failure. The standard fix path stands as-is.
        }
      }

      // ── PHASE B2 — Rule-based remediation (classifier + budget + patches) ─
      //
      // Complements the ConstructionEngine: where the engine handles
      // wire_up (dead UI → real backend) via AI, the remediation engine
      // handles deterministic, low-risk fixes (alt attributes, CSS
      // contrast, metadata injection, aria labels, 404 asset paths)
      // via plain code transforms. NO AI in this path.
      //
      // Inputs:  state.pipelineFindings (Phase B1 normalized output)
      // Output:  patches pushed into fileChanges + remediationSummary
      //          on state for the S14 governance write.
      //
      // Graceful: any patch generator failure is captured in the summary;
      // the pipeline always returns. No throw escapes this block.
      let remediationOutput = null;
      try {
        const _findings = Array.isArray(state.pipelineFindings) && state.pipelineFindings.length > 0
          ? state.pipelineFindings
          : (Array.isArray(state.phaseBFindings) ? state.phaseBFindings : []);
        if (_findings.length > 0) {
          const t0 = Date.now();
          remediationOutput = await withTimeout(_runRemediation({
            findings: _findings,
            // File resolver: PATH A uses the GitHub Contents API; PATH B
            // skips remediation patches entirely (no operator repo to
            // commit against). Best-effort — null = no file, generator
            // declines cleanly.
            fetchFileForFinding: async ({ finding }) => {
              if (pathB || !token || !githubRepoUrl) return null;
              const parsed = parseGithubRepoUrl(githubRepoUrl);
              if (!parsed) return null;
              // Generator-specific path heuristics:
              //   inject-metadata / inject-viewport / inject-alt-attribute /
              //   inject-aria-label / repair-asset-path → index.html
              //   css-contrast-adjust → first .css file from repoFileList
              const strategy = finding?.remediationStrategy;
              let candidatePath = sourcePathForFinding({
                finding,
                sourceMappings: state.sourceMappings,
                minimumConfidence: 0.7,
              });
              if (strategy === 'css-contrast-adjust') {
                candidatePath = candidatePath ?? (repoFileList ?? []).find((p) => /\.css$/i.test(p)) ?? 'index.html';
              } else if (!candidatePath) {
                candidatePath = (repoFileList ?? []).find((p) => /(^|\/)index\.html?$/i.test(p)) ?? 'index.html';
              }
              try {
                const content = await withTimeout(
                  _fetchFileContent({
                    owner: parsed.owner, repo: parsed.repo,
                    filePath: candidatePath, ref: productBranch, token,
                  }),
                  {
                    timeoutMs: step5ToStep6Timeouts.fetchFileContent,
                    code: 'GITHUB_FETCH_FILE_CONTENT_TIMEOUT',
                    message: `GitHub file content fetch exceeded ${step5ToStep6Timeouts.fetchFileContent}ms`,
                  },
                );
                if (typeof content !== 'string') return null;
                return { filePath: candidatePath, fileContent: content };
              } catch { return null; }
            },
            budgets: undefined,  // use DEFAULT_BUDGETS
            onStep: (evt) => {
              try {
                emit(makeStepLog({
                  iteration: iterationNumber, step: 7,
                  status: 'complete',
                  tool: `remediation:${evt?.log?.kind ?? 'event'}`,
                  why: 'PHASE B2 — rule-based remediation pipeline event',
                  result: evt?.log ?? null,
                  mode: state.mode,
                }));
              } catch { /* swallow */ }
            },
          }), {
            timeoutMs: step5ToStep6Timeouts.remediation,
            code: 'REMEDIATION_ENGINE_TIMEOUT',
            message: `remediation engine exceeded ${step5ToStep6Timeouts.remediation}ms`,
          });
          // Merge approved patches into fileChanges using
          // last-write-wins on filePath (a later remediation patch
          // supersedes an earlier construction-engine entry for the
          // same path). Sequential, deterministic.
          const byPath = new Map(fileChanges.map((f) => [f.filePath, f]));
          for (const p of (remediationOutput?.patches ?? [])) {
            if (!p || typeof p.filePath !== 'string' || typeof p.patchedContent !== 'string') continue;
            // If the path is already in fileChanges, replace its content;
            // otherwise append. The replacement is intentional — a fresh
            // patch built on the just-fetched file is a strict superset.
            byPath.set(p.filePath, { filePath: p.filePath, fileContent: p.patchedContent });
          }
          fileChanges.length = 0;
          for (const v of byPath.values()) fileChanges.push(v);
          state.remediationSummary = remediationOutput?.summary ?? null;
          state.remediationPatches = remediationOutput?.patches ?? [];
          state.remediationConflicts = remediationOutput?.conflicts ?? [];
          state.remediationDeferred  = (remediationOutput?.deferred ?? []).map((d) => Object.freeze({
            category: d.category, severity: d.severity, reason: d.deferralReason,
          }));
          state.remediationEscalated = remediationOutput?.escalated ?? [];
          emit(makeStepLog({
            iteration: iterationNumber, step: 7,
            status: 'complete',
            tool: 'remediationEngine.runRemediation (PHASE B2)',
            why: 'classify findings → budget → generate patches → resolve conflicts',
            result: remediationOutput?.summary ?? null,
            durationMs: Date.now() - t0, mode: state.mode,
          }));
        }
      } catch (e) {
        emit(makeStepLog({
          iteration: iterationNumber, step: 7, status: 'degraded',
          tool: 'remediationEngine (PHASE B2)',
          why: 'rule-based remediation attempt',
          result: {
            error: (e?.message ?? String(e)).slice(0, 280),
            degraded: e?.code === 'REMEDIATION_ENGINE_TIMEOUT',
            reason: e?.code === 'REMEDIATION_ENGINE_TIMEOUT' ? 'remediation_engine_timeout' : undefined,
            timeoutMs: e?.code === 'REMEDIATION_ENGINE_TIMEOUT' ? step5ToStep6Timeouts.remediation : null,
            code: e?.code ?? 'REMEDIATION_ERROR',
          },
          mode: state.mode,
        }));
        if (e?.code === 'REMEDIATION_ENGINE_TIMEOUT') {
          recordPipelineError(state, 'remediation_engine', `timeout:${step5ToStep6Timeouts.remediation}ms`);
        }
      }

      if (fileChanges.length === 0) {
        exitReason = (Array.isArray(state.platformBoundaryBlocked) && state.platformBoundaryBlocked.length > 0)
          ? 'PLATFORM_BOUNDARY_BLOCKED'
          : 'NO_FIXES_GENERATED';
        await recordNoFixIteration({
          reason: exitReason,
          detail: 'Step 7 ran but no deterministic, construction, remediation, or LLM fix produced a safe commit-ready file.',
          remediationOutput,
        });
        break;
      }

      // W08 SAIGE-v2 integrity gate — reject hollow or regressive fix
      // bundles before branch creation. This catches "fixes" that merely
      // hide diagnostics (console.error -> console.warn), rewrite product
      // routes without direct verified route evidence, or proceed with
      // secondary UI edits after the primary high-risk root cause failed.
      {
        const t0 = Date.now();
        const integrity = evaluateRepairIntegrity({
          fileChanges,
          fixOutcomes: iterLog.fixOutcomes,
          prioritizedIssues,
          originalContentByPath,
        });
        fileChanges.length = 0;
        for (const f of integrity.accepted) fileChanges.push(f);
        if (Array.isArray(iterLog.fixOutcomes)) {
          iterLog.fixOutcomes.push(...integrity.rejected.map((r) => ({
            filePath: r.filePath,
            status: 'rejected',
            code: 'REPAIR_INTEGRITY_REJECTED',
            reason: r.reason,
          })));
        }
        emit(makeStepLog({
          iteration: iterationNumber, step: 7,
          status: integrity.rejected.length === 0 ? 'complete' : 'degraded',
          tool: 'repairIntegrityGate.js',
          why: 'reject hollow or regressive generated fixes before branch creation',
          result: {
            filesIn: integrity.filesIn,
            filesPassed: integrity.accepted.length,
            filesRejected: integrity.rejected.length,
            rejected: integrity.rejected,
          },
          durationMs: Date.now() - t0, mode: state.mode,
        }));
        const platformRejected = integrity.rejected
          .filter((r) => r.classification === 'PLATFORM_BOUNDARY_BLOCKED');
        if (platformRejected.length > 0) {
          state.platformBoundaryBlocked = [
            ...(Array.isArray(state.platformBoundaryBlocked) ? state.platformBoundaryBlocked : []),
            ...platformRejected.map((r) => ({ ...r, stage: 'repair_integrity_gate' })),
          ];
          try {
            await withTimeout(_appendGovernanceEntry({
              productId, environment,
              entry: {
                kind: 'self_renewal.platform_boundary_blocked.v1',
                runId,
                productId,
                iteration: iterationNumber,
                classification: 'PLATFORM_BOUNDARY_BLOCKED',
                blocked: platformRejected,
                policy: 'FlowAI must not patch Base44/platform/auth internals; app-layer fixes only.',
                at: new Date().toISOString(),
              },
              supabase,
            }), {
              timeoutMs: step5ToStep6Timeouts.governanceWrite,
              code: 'PLATFORM_BOUNDARY_GOVERNANCE_TIMEOUT',
              message: `platform boundary governance write exceeded ${step5ToStep6Timeouts.governanceWrite}ms`,
            });
          } catch (e) {
            if (e?.code === 'PLATFORM_BOUNDARY_GOVERNANCE_TIMEOUT') {
              recordPipelineError(state, 'platform_boundary_governance', `timeout:${step5ToStep6Timeouts.governanceWrite}ms`);
            }
          }
        }
      }

      if (fileChanges.length === 0) {
        exitReason = (Array.isArray(state.platformBoundaryBlocked) && state.platformBoundaryBlocked.length > 0)
          ? 'PLATFORM_BOUNDARY_BLOCKED'
          : 'NO_SAFE_FIXES_GENERATED';
        await recordNoFixIteration({
          reason: exitReason,
          detail: 'Repair integrity gate rejected every generated change before branch creation.',
          remediationOutput,
        });
        break;
      }

      // DISPATCH 29 — Pre-deploy gate: parse-check every generated file
      // before we commit it to the branch. Files that fail are filtered
      // out so we never push syntactically-invalid code to GitHub +
      // Vercel. This is the load-bearing safety net behind fixGenerator's
      // own validateFixedContent: even if a future code path bypasses
      // that check (or its regex tolerance lets a string-truncation
      // through), this gate is the unconditional pre-deploy barrier.
      {
        const t0 = Date.now();
        const _parseCheck = deps.parseCheckContent || fixGenInternals.parseCheckContent;
        const beforeCount = fileChanges.length;
        const passed = [];
        const rejected = [];
        for (const f of fileChanges) {
          try {
            const verdict = await _parseCheck(f.fileContent, f.filePath);
            if (verdict.ok) {
              passed.push(f);
            } else {
              rejected.push({ filePath: f.filePath, reason: verdict.reason, detail: (verdict.detail ?? '').slice(0, 120) });
            }
          } catch (e) {
            rejected.push({ filePath: f.filePath, reason: 'parse_check_threw', detail: (e?.message ?? String(e)).slice(0, 120) });
          }
        }
        // Replace fileChanges with the filtered list so STEP 9 only
        // commits passing files. Empty list → loop will hit
        // NO_FIXES_GENERATED below and continue / exit cleanly.
        fileChanges.length = 0;
        for (const f of passed) fileChanges.push(f);
        emit(makeStepLog({
          iteration: iterationNumber, step: 9, status: rejected.length === 0 ? 'complete' : 'degraded',
          tool: 'pre-deploy parse gate (esbuild)',
          why: 'reject syntactically-invalid fixes before commit + deploy (DISPATCH 29)',
          result: {
            filesIn: beforeCount,
            filesPassed: passed.length,
            filesRejected: rejected.length,
            rejected,
          },
          durationMs: Date.now() - t0, mode: state.mode,
        }));
      }
      // If parse-check rejected ALL files, treat this iteration like
      // NO_FIXES_GENERATED — exit the inner block (no commit, no deploy)
      // and let the outer loop decide whether to iterate again.
      if (fileChanges.length === 0) {
        exitReason = 'NO_FIXES_GENERATED';
        await recordNoFixIteration({
          reason: exitReason,
          detail: 'Pre-deploy parse gate rejected every generated change before branch creation.',
          remediationOutput,
        });
        break;
      }

      // STEP 9 — Branch + multi-file commits (PATH A only).
      if (state.rateCapDegraded?.limited === true) {
        const block = buildRateCapMutationBlock(state, 'branch/file write');
        emit(makeStepLog({
          iteration: iterationNumber, step: 9, status: 'failed',
          tool: 'rateCap.js (mutation guard)',
          why: 'rate-limited run reached branch/file write boundary',
          result: block,
          mode: state.mode,
        }));
        return failStep({
          product,
          failedStep: 'STEP_9',
          error: block.detail,
          code: block.code,
          diagnostics: block,
        });
      }
      try {
        const t0 = Date.now();
        const first = fileChanges[0];
        await withTimeout(
          _createRenewalBranch({
            owner, repo, baseBranch: productBranch, branchName,
            filePath: first.filePath, fileContent: first.fileContent,
            commitMessage: `FlowAI Self-Renewal iter${iterationNumber} fix: ${first.filePath}`,
            token,
            opts: {
              fetch: makeAbortableFetch({
                timeoutMs: step5ToStep6Timeouts.createRenewalBranch,
                code: 'GITHUB_BRANCH_CREATE_TIMEOUT',
                message: `GitHub branch creation exceeded ${step5ToStep6Timeouts.createRenewalBranch}ms`,
              }),
            },
          }),
          {
            timeoutMs: step5ToStep6Timeouts.createRenewalBranch,
            code: 'GITHUB_BRANCH_CREATE_TIMEOUT',
            message: `GitHub branch creation exceeded ${step5ToStep6Timeouts.createRenewalBranch}ms`,
          },
        );
        for (let i = 1; i < fileChanges.length; i += 1) {
          const f = fileChanges[i];
          await withTimeout(
            _commitFileToBranch({
              owner, repo, branchName, filePath: f.filePath, fileContent: f.fileContent,
              commitMessage: `FlowAI Self-Renewal iter${iterationNumber} fix: ${f.filePath}`,
              token,
              opts: {
                fetch: makeAbortableFetch({
                  timeoutMs: step5ToStep6Timeouts.commitFileToBranch,
                  code: 'GITHUB_BRANCH_COMMIT_TIMEOUT',
                  message: `GitHub branch commit exceeded ${step5ToStep6Timeouts.commitFileToBranch}ms`,
                }),
              },
            }),
            {
              timeoutMs: step5ToStep6Timeouts.commitFileToBranch,
              code: 'GITHUB_BRANCH_COMMIT_TIMEOUT',
              message: `GitHub branch commit exceeded ${step5ToStep6Timeouts.commitFileToBranch}ms`,
            },
          );
        }
        // DISPATCH 30 — record the per-file commit order on iterLog so
        // the per-fix attribution block (after STEP 11) can reference it.
        iterLog.fileFixes = fileChanges.map((f) => f.filePath);
        const log = makeStepLog({
          iteration: iterationNumber, step: 9, status: 'complete',
          tool: 'githubBranchWriter.js (createRenewalBranch + commitFileToBranch)',
          why: 'all fixes on isolated upgrade-repo branch for review; original repo remains read-only rollback',
          result: {
            branchName,
            filesCommitted: fileChanges.length,
            writeRepo: githubRepoUrl,
            originalRepo: upgradeTargets.originalRepo,
            originalReadOnly: true,
          },
          durationMs: Date.now() - t0, mode: state.mode,
        });
        emit(log); iterLog.steps.push(log);
      } catch (e) {
        if (e?.code === 'GITHUB_BRANCH_CREATE_TIMEOUT' || e?.code === 'GITHUB_BRANCH_COMMIT_TIMEOUT') {
          recordPipelineError(state, 'github_branch_write', `timeout:${e.code}`);
          emit(makeStepLog({
            iteration: iterationNumber, step: 9, status: 'degraded',
            tool: 'githubBranchWriter.js (bounded)',
            why: 'branch/file write timed out; continuing without deploy or PR rather than stalling the forge',
            result: {
              degraded: true,
              reason: 'github_branch_write_timeout',
              code: e.code,
              timeoutMs: e.code === 'GITHUB_BRANCH_CREATE_TIMEOUT'
                ? step5ToStep6Timeouts.createRenewalBranch
                : step5ToStep6Timeouts.commitFileToBranch,
            },
            mode: state.mode,
          }));
          fileChanges.length = 0;
          exitReason = 'GITHUB_BRANCH_WRITE_TIMEOUT';
          await recordNoFixIteration({
            reason: exitReason,
            detail: 'GitHub branch write timed out before a deployable artifact was available.',
            remediationOutput,
          });
          break;
        }
        return failStep({ product, failedStep: 'STEP_9',
          error: e?.message ?? String(e), code: e?.code ?? 'GITHUB_API_ERROR', diagnostics: e });
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
        if (state.universalMode) {
          // DISPATCH U1 ITEM 3 — universal mode never deploys. The
          // run is evaluation-only; preview URL stays null and we
          // record the skip in governance with explicit reason.
          previewUrl = null;
          deployDegraded = false;
          const skipDetail = 'universal mode — no operator GitHub repo and no FlowAI-owned destination to deploy into';
          emit(makeStepLog({
            iteration: iterationNumber, step: 10, status: 'skipped',
            tool: 'vercelBranchDeploy.js / remediationEngine.js',
            why: 'preview deploy step (skipped — universal mode is evaluation-only)',
            result: { skipped: skipDetail, autoFixSkippedReason: 'UNIVERSAL_NO_REPO_ACCESS' },
            durationMs: Date.now() - t0, mode: state.mode,
          }));
          state.skippedSteps.push({
            iteration: iterationNumber, step: 10, tool: 'vercelBranchDeploy/remediationEngine',
            autoFixSkippedReason: 'UNIVERSAL_NO_REPO_ACCESS', detail: skipDetail,
          });
        } else if (pathB) {
          if (state.rateCapDegraded?.limited === true) {
            const block = buildRateCapMutationBlock(state, 'PATH_B deploy/upload');
            emit(makeStepLog({
              iteration: iterationNumber, step: 10, status: 'failed',
              tool: 'rateCap.js (mutation guard)',
              why: 'rate-limited run reached deploy/upload boundary',
              result: block,
              mode: state.mode,
            }));
            return failStep({
              product,
              failedStep: 'STEP_10',
              error: block.detail,
              code: block.code,
              diagnostics: block,
            });
          }
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
        } else if (
          state.operatorMode === 'github_connected'
          && (!(process.env.VERCEL_OPERATOR_TOKEN || process.env.VERCEL_TOKEN)
            || !process.env.VERCEL_ORG_ID
            || !resolveVercelProjectId(productId, process.env, product))
        ) {
          previewUrl = null;
          deployDegraded = false;
          const skipDetail = 'GitHub operator token connected; Vercel preview deploy requires separate Vercel credentials/project mapping';
          emit(makeStepLog({
            iteration: iterationNumber, step: 10, status: 'skipped',
            tool: 'vercelBranchDeploy.js (PATH A operator branch deploy)',
            why: 'preview deploy step (skipped - Vercel credential/project not available)',
            result: {
              skipped: skipDetail,
              autoFixSkippedReason: 'VERCEL_PREVIEW_TOKEN_REQUIRED',
              operator_mode: state.operatorMode,
            },
            durationMs: Date.now() - t0, mode: state.mode,
          }));
          state.skippedSteps.push({
            iteration: iterationNumber, step: 10, tool: 'vercelBranchDeploy.js',
            autoFixSkippedReason: 'VERCEL_PREVIEW_TOKEN_REQUIRED', detail: skipDetail,
          });
        } else {
          // PATH A — operator branch deploy. No graceful-timeout wrapper here;
          // PATH A keeps the existing fail-fast semantic since operators expect
          // a clear failure when their branch build doesn't deploy.
          // D40 — pass registry row so vercel_project_id column is used
          // as primary source; env-var fallback only kicks in when the
          // column isn't populated.
          if (state.rateCapDegraded?.limited === true) {
            const block = buildRateCapMutationBlock(state, 'PATH_A preview deploy');
            emit(makeStepLog({
              iteration: iterationNumber, step: 10, status: 'failed',
              tool: 'rateCap.js (mutation guard)',
              why: 'rate-limited run reached preview deploy boundary',
              result: block,
              mode: state.mode,
            }));
            return failStep({
              product,
              failedStep: 'STEP_10',
              error: block.detail,
              code: block.code,
              diagnostics: block,
            });
          }
          const projectId = resolveVercelProjectId(productId, process.env, product);
          if (!projectId) {
            throw new Error(`no Vercel project ID for ${productId} (env VERCEL_PROJECT_ID_${productId.toUpperCase()})`);
          }
          const orgId = process.env.VERCEL_ORG_ID;
          const vercelToken = process.env.VERCEL_OPERATOR_TOKEN || process.env.VERCEL_TOKEN;
          if (!orgId || !vercelToken) {
            throw new Error('VERCEL_ORG_ID or VERCEL_OPERATOR_TOKEN/VERCEL_TOKEN missing from env');
          }
          const deployment = await withTimeout(
            _deployBranchPreview({
              projectId, orgId, owner, repo, branchName, token: vercelToken,
              opts: {
                fetch: makeAbortableFetch({
                  timeoutMs: step5ToStep6Timeouts.deployBranchPreview,
                  code: 'VERCEL_PREVIEW_DEPLOY_TIMEOUT',
                  message: `Vercel preview deploy exceeded ${step5ToStep6Timeouts.deployBranchPreview}ms`,
                }),
              },
            }),
            {
              timeoutMs: step5ToStep6Timeouts.deployBranchPreview,
              code: 'VERCEL_PREVIEW_DEPLOY_TIMEOUT',
              message: `Vercel preview deploy exceeded ${step5ToStep6Timeouts.deployBranchPreview}ms`,
            },
          );
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
        // DISPATCH 29: PATH A deploy failure (typically Vercel build
        // error on the freshly-committed fixes) is now NON-FATAL —
        // emit a degraded log, mark deploy as degraded, and let STEP 11
        // score against the original URL. The delta policy at STEP 12
        // will see a flat or negative score and trigger NO_IMPROVEMENT
        // exit (or continue to next iteration), instead of crashing the
        // entire run on a single bad-build iteration.
        deployDegraded = true;
        previewUrl = null;
        emit(makeStepLog({
          iteration: iterationNumber, step: 10, status: 'degraded',
          tool: 'vercelBranchDeploy.js (PATH A — degraded)',
          why: 'Vercel deploy failed; fall back to scoring original URL so loop can continue',
          result: {
            degraded: true,
            reason: e?.message ?? String(e),
            code: e?.code ?? 'DEPLOY_FAILED',
            timeoutMs: e?.code === 'VERCEL_PREVIEW_DEPLOY_TIMEOUT' ? step5ToStep6Timeouts.deployBranchPreview : null,
            // Common cause is build error in the fix branch — the pre-
            // deploy parse gate (STEP 9 sub-gate) should catch most of
            // these; this fallback covers the residual (e.g. runtime
            // import errors that don't show up at parse time).
          },
          durationMs: Date.now() - t0, mode: state.mode,
        }));
        if (e?.code === 'VERCEL_PREVIEW_DEPLOY_TIMEOUT') {
          recordPipelineError(state, 'vercel_preview_deploy', `timeout:${step5ToStep6Timeouts.deployBranchPreview}ms`);
        }
      }
    }
    await state.checkpoint(onCheckpoint, { lastStep: 10, iteration: iterationNumber });
    if (!previewUrl) {
      const deployUserStepLog = makeForgeUserStepLog({
        iteration: iterationNumber,
        internalStep: 10.5,
        userStep: 5,
        key: 'deploy',
        label: 'Deploy',
        status: 'degraded',
        why: '§9 Deploy did not produce a verified deployment artifact; downstream steps continue in degraded-honest mode',
        result: {
          deployDegraded: deployDegraded === true,
          githubAppReady: Boolean(process.env.GITHUB_APP_ID || process.env.GITHUB_APP_INSTALLATION_ID || process.env.GITHUB_INSTALLATION_ID),
          previewUrl: null,
          reason: state.universalMode
            ? 'UNIVERSAL_NO_REPO_ACCESS'
            : 'NO_DEPLOYED_ARTIFACT',
        },
        mode: state.mode,
      });
      emit(deployUserStepLog); iterLog.steps.push(deployUserStepLog);
    }

    // DISPATCH 26: when PATH B deploy degraded, score the ORIGINAL URL
    // instead of the (non-existent) preview URL. STEP 11 needs a URL to
    // score; substituting the original keeps the pipeline progressing.
    const postFixUrl = (deployDegraded || !previewUrl) ? currentUrl : previewUrl;
    let postFixEvaluationOutput = null;
    let postFixSnapshot = null;
    const shouldVerifyPostFixDelta = !!previewUrl && !deployDegraded;
    if (!shouldVerifyPostFixDelta) {
      state.transformationPostFix = null;
      emit(makeStepLog({
        iteration: iterationNumber, step: 11, status: 'skipped',
        tool: 'verification.capturePostFixSnapshot (PHASE C)',
        why: 'skip transformation delta when no patched preview deployment exists',
        result: {
          skipped: 'no_post_fix_preview',
          previewUrl: previewUrl ?? null,
          deployDegraded,
          universalMode: !!state.universalMode,
        },
        mode: state.mode,
      }));
    } else {
      try {
        const t0 = Date.now();
        postFixEvaluationOutput = await withTimeout(
          _runEvaluationPipeline({
            url: postFixUrl,
            options: {
              phaseBFindings: [],
              ...evaluationRuntimeOptions,
              onStep: (evt) => {
                try {
                  emit(makeStepLog({
                    iteration: iterationNumber, step: 11,
                    status: evt?.log?.ok === false ? 'degraded' : 'complete',
                    tool: `evaluationPipeline:${evt?.log?.evaluator ?? 'unknown'} (PHASE C post-fix)`,
                    why: 'Phase C post-fix evaluator complete signal',
                    result: evt?.log ?? null,
                    mode: state.mode,
                  }));
                } catch { /* swallow */ }
              },
            },
          }),
          {
            timeoutMs: step5ToStep6Timeouts.postFixEvaluationPipeline,
            code: 'POST_FIX_EVALUATION_PIPELINE_TIMEOUT',
            message: `post-fix evaluation pipeline exceeded ${step5ToStep6Timeouts.postFixEvaluationPipeline}ms`,
          },
        );
        postFixSnapshot = await _capturePostFixSnapshot({
          url: postFixUrl,
          evaluationResult: postFixEvaluationOutput,
          runEvaluationPipeline: _runEvaluationPipeline,
        });
        state.transformationPostFix = postFixSnapshot;
        emit(makeStepLog({
          iteration: iterationNumber, step: 11, status: postFixEvaluationOutput?.ok ? 'complete' : 'degraded',
          tool: 'verification.capturePostFixSnapshot (PHASE C)',
          why: 'capture after snapshot using the same evaluator pipeline against deployed preview',
          result: {
            url: postFixSnapshot.url,
            lighthouseScores: postFixSnapshot.lighthouseScores,
            axeViolations: postFixSnapshot.axeViolations,
            runtimeErrors: postFixSnapshot.runtimeErrors,
            consoleErrors: postFixSnapshot.consoleErrors,
            totalFindings: postFixSnapshot.totalFindings,
            errors: postFixEvaluationOutput?.errors ?? {},
          },
          durationMs: Date.now() - t0, mode: state.mode,
        }));
      } catch (snapshotErr) {
        if (snapshotErr?.code === 'POST_FIX_EVALUATION_PIPELINE_TIMEOUT') {
          recordPipelineError(state, 'post_fix_evaluation_pipeline', `timeout:${step5ToStep6Timeouts.postFixEvaluationPipeline}ms`);
        }
        postFixSnapshot = null;
        state.transformationPostFix = null;
        emit(makeStepLog({
          iteration: iterationNumber, step: 11, status: 'degraded',
          tool: 'verification.capturePostFixSnapshot (PHASE C)',
          why: 'post-fix delta snapshot failed; continuing with existing scoring path',
          result: {
            error: (snapshotErr?.message ?? String(snapshotErr)).slice(0, 200),
            reason: snapshotErr?.code === 'POST_FIX_EVALUATION_PIPELINE_TIMEOUT'
              ? 'post_fix_evaluation_pipeline_timeout'
              : 'post_fix_snapshot_failed',
            timeoutMs: snapshotErr?.code === 'POST_FIX_EVALUATION_PIPELINE_TIMEOUT'
              ? step5ToStep6Timeouts.postFixEvaluationPipeline
              : null,
            code: snapshotErr?.code ?? 'POST_FIX_SNAPSHOT_FAILED',
          },
          mode: state.mode,
        }));
      }
    }

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
    if (!previewUrl) {
      postScoreEnvelope = preScoreEnvelope;
      lastPostScore = postScoreEnvelope.total;
      postScoreEvidenceDegraded = postScoreEvidenceDegraded || postScoreEnvelope?.degraded === true;
      const postGtm = iterLog.preGtm ?? _scoreCrawlOutput(crawlOutput, state.phaseBFindings ?? null);
      const postGtmSurfaceOnly = iterLog.preGtmSurfaceOnly ?? postGtm;
      lastPostGtm = postGtm;
      iterLog.postGtm = postGtm;
      iterLog.postGtmSurfaceOnly = postGtmSurfaceOnly;
      const log = makeStepLog({
        iteration: iterationNumber, step: 11, status: 'complete',
        tool: 'gtmReadinessScorer (§7.6) + no-preview reuse',
        why: 'no patched preview exists; reuse pre-fix score and finalize without fabricated post-fix scoring',
        result: {
          gtmScore: postGtm.score,
          gtmBand: postGtm.band,
          gtmCounts: postGtm.counts,
          ceo95Criteria: postGtm.ceo95Criteria ?? null,
          surfaceOnlyGtmScore: postGtmSurfaceOnly.score,
          surfaceOnlyGtmCounts: postGtmSurfaceOnly.counts,
          phaseBContribution: (postGtmSurfaceOnly.score ?? postGtm.score) - postGtm.score,
          phaseBPagesProbed: state.phaseBPagesProbed ?? 0,
          phaseBUrlsAttempted: state.phaseBUrlsAttempted ?? 0,
          postFixPhaseBPagesProbed: 0,
          postFixPhaseBUrlsAttempted: 0,
          postFixPhaseBSummary: null,
          postFixPhaseBFindingsCount: Array.isArray(state.phaseBFindings) ? state.phaseBFindings.length : 0,
          fiveLayerInternal: postScoreEnvelope.total,
          universalMode: !!state.universalMode,
          operatorMode: state.operatorMode ?? null,
          layers: {
            l1: postScoreEnvelope.l1, l2: postScoreEnvelope.l2, l3: postScoreEnvelope.l3,
            l4: postScoreEnvelope.l4, l5: postScoreEnvelope.l5,
          },
          reusedPreFixScore: true,
        },
        durationMs: 0, mode: state.mode,
        scores: {
          original: originalGtmScore, current: postGtm.score,
          target: gtmTarget, progressPct: computeProgress({ originalScore: originalGtmScore, currentScore: postGtm.score, target: gtmTarget }),
        },
      });
      emit(log); iterLog.steps.push(log);
    } else {
      try {
        const t0 = Date.now();
      // DISPATCH 26: on deploy-degraded (PATH B timeout/error), `postFixUrl`
      // falls back to the original URL so STEP 11 still has something to
      // score. On the happy path postFixUrl === previewUrl.
      let postMonitor;
      try {
        postMonitor = await withTimeout(
          _produceMonitorText({
            url: postFixUrl, productId, runId,
            githubRepoUrl: githubRepoUrl || undefined,
            token: token || undefined,
            crawlReport: crawlOutput,
          }),
          {
            timeoutMs: step5ToStep6Timeouts.postFixMonitorText,
            code: 'POST_FIX_MONITOR_TEXT_TIMEOUT',
            message: `post-fix monitor text exceeded ${step5ToStep6Timeouts.postFixMonitorText}ms`,
          },
        );
      } catch (postMonitorErr) {
        if (postMonitorErr?.code !== 'POST_FIX_MONITOR_TEXT_TIMEOUT') throw postMonitorErr;
        recordPipelineError(state, 'post_fix_monitor_text', `timeout:${step5ToStep6Timeouts.postFixMonitorText}ms`);
        postMonitor = {
          monitorText: '[degraded] post-fix monitor text timed out; reusing available crawl evidence.',
          degraded: true,
        };
        emit(makeStepLog({
          iteration: iterationNumber, step: 11, status: 'degraded',
          tool: 'monitorTextProducer (post-fix)',
          why: 'post-fix monitor text timed out; continuing with degraded score input',
          result: {
            degraded: true,
            reason: 'post_fix_monitor_text_timeout',
            timeoutMs: step5ToStep6Timeouts.postFixMonitorText,
            code: postMonitorErr.code,
          },
          mode: state.mode,
        }));
      }
      try {
        postScoreEnvelope = await withTimeout(
          _computeScore({
            productId, url: postFixUrl, runId, monitorText: postMonitor.monitorText,
          }),
          {
            timeoutMs: step5ToStep6Timeouts.postFixComputeScore,
            code: 'POST_FIX_COMPUTE_SCORE_TIMEOUT',
            message: `post-fix computeScore exceeded ${step5ToStep6Timeouts.postFixComputeScore}ms`,
          },
        );
      } catch (postScoreErr) {
        if (postScoreErr?.code !== 'POST_FIX_COMPUTE_SCORE_TIMEOUT') throw postScoreErr;
        recordPipelineError(state, 'post_fix_compute_score', `timeout:${step5ToStep6Timeouts.postFixComputeScore}ms`);
        postScoreEnvelope = makeDegradedScoreEnvelope({
          productId,
          url: postFixUrl,
          runId,
          fallbackScore: preScoreEnvelope?.total ?? originalScore ?? 0,
          label: 'degraded-post-fix-timeout-baseline',
        });
        emit(makeStepLog({
          iteration: iterationNumber, step: 11, status: 'degraded',
          tool: 'preScoreAdapter.computeScore (post-fix)',
          why: 'post-fix computeScore timed out; reusing degraded baseline instead of fabricating improvement',
          result: {
            degraded: true,
            reason: 'post_fix_compute_score_timeout',
            timeoutMs: step5ToStep6Timeouts.postFixComputeScore,
            fallbackScore: postScoreEnvelope.total,
            code: postScoreErr.code,
          },
          mode: state.mode,
        }));
      }
      lastPostScore = postScoreEnvelope.total;
      postScoreEvidenceDegraded = postScoreEvidenceDegraded || postScoreEnvelope?.degraded === true;
      // DISPATCH 28 — focused post-fix re-crawl against the live
      // preview URL so the canonical §7.6 score reflects the actual
      // deployed state, not the pre-fix crawl. PATH B / deploy-degraded
      // paths fall back to scoring the existing crawlOutput so the gate
      // still emits a verdict.
      let postFixCrawlOutput = crawlOutput;
      if (!deployDegraded && previewUrl) {
        try {
          // D43 — match the pre-fix crawl's maxPages/depth so the
          // re-probe covers the same surface. W08 raises the default
          // surface budget so production verification is no longer
          // artificially capped at a handful of pages.
          postFixCrawlOutput = await withTimeout(
            _conductStructuredCrawl({
              url: postFixUrl,
              maxPages: effortProfile.structuredCrawlMaxPages,
              depth: effortProfile.structuredCrawlDepth,
              productId,
              runId,
              storageState: args.storageState ?? state.storageState ?? undefined,
            }),
            {
              timeoutMs: step5ToStep6Timeouts.postFixCrawl,
              code: 'POST_FIX_CRAWL_TIMEOUT',
              message: `post-fix crawl exceeded ${step5ToStep6Timeouts.postFixCrawl}ms`,
            },
          );
        } catch (crawlErr) {
          if (crawlErr?.code === 'POST_FIX_CRAWL_TIMEOUT') {
            recordPipelineError(state, 'post_fix_crawl', `timeout:${step5ToStep6Timeouts.postFixCrawl}ms`);
          }
          postFixCrawlOutput = crawlOutput;
        }
      }
      // D42 T1 — Phase B re-probe against the post-fix preview.
      // The pre-fix phaseBFindings (state.phaseBFindings from STEP 4)
      // are no longer valid after fixes deploy: an interactive that
      // was DEAD may now WORK (or vice versa). We re-run probeAllPages
      // on the post-fix crawl's pages so comprehensive §7.6 reflects
      // POST-fix interactive state. Fall back to pre-fix findings if
      // re-probe fails / deploy is degraded — never worse than D41.
      let postFixPhaseBFindings = state.phaseBFindings ?? null;
      let postFixPhaseBSummary = null;
      let postFixPagesProbed = 0;
      let postFixUrlsAttempted = 0;
      const _probeAllPagesPost = deps.probeAllPages || probeAllPages;
      if (effortProfile.postFixReprobe && !deployDegraded && previewUrl && Array.isArray(postFixCrawlOutput?.pages) && postFixCrawlOutput.pages.length > 0) {
        try {
          const postFixUrls = Array.from(new Set(
            postFixCrawlOutput.pages
              .map((p) => (typeof p?.url === 'string' ? p.url : null))
              .filter(Boolean),
          )).slice(0, effortProfile.phaseBMaxPages);
          if (postFixUrls.length > 0) {
            // D43 Lever c — seed re-probe from the post-fix crawl too.
            const postFixSeedsByUrl = {};
            for (const p of postFixCrawlOutput.pages) {
              if (typeof p?.url === 'string' && Array.isArray(p?.interactives) && p.interactives.length > 0) {
                postFixSeedsByUrl[p.url] = p.interactives;
              }
            }
            const reprobe = await withTimeout(
              _probeAllPagesPost({
                urls: postFixUrls,
                opts: {
                // D43 Lever b — defaults bumped in adversarialSurface.js.
                probeBudgetMs: state.phaseBProbeBudgetMs ?? effortProfile.phaseBProbeBudgetMs ?? phaseBBudget.probeBudgetMs,
                overallBudgetMs: state.phaseBOverallBudgetMs ?? effortProfile.phaseBOverallBudgetMs ?? phaseBBudget.overallBudgetMs,
                perPageBudgetMs: state.phaseBPerPageBudgetMs ?? effortProfile.phaseBPerPageBudgetMs ?? phaseBBudget.perPageBudgetMs,
                maxInteractives: state.phaseBMaxInteractives ?? effortProfile.phaseBMaxInteractives ?? phaseBBudget.maxInteractives,
                storageState: args.storageState ?? state.storageState ?? undefined,
                seedsByUrl: postFixSeedsByUrl,
                maxModals: 10, maxForms: 10,
                },
              }),
              {
                timeoutMs: step5ToStep6Timeouts.postFixProbeAllPages,
                code: 'POST_FIX_PROBE_ALL_PAGES_TIMEOUT',
                message: `post-fix probeAllPages exceeded ${step5ToStep6Timeouts.postFixProbeAllPages}ms`,
              },
            );
            if (reprobe && reprobe.ok !== false && Array.isArray(reprobe.findings)) {
              postFixPhaseBFindings = reprobe.findings;
              postFixPhaseBSummary = reprobe.summary ?? null;
              postFixPagesProbed = reprobe.pagesProbed ?? 0;
              postFixUrlsAttempted = reprobe.urlsAttempted ?? postFixUrls.length;
              state.phaseBPostFixFindings = postFixPhaseBFindings;
              state.phaseBPostFixSummary = postFixPhaseBSummary;
            }
          }
        } catch (reprobeErr) {
          if (reprobeErr?.code === 'POST_FIX_PROBE_ALL_PAGES_TIMEOUT') {
            recordPipelineError(state, 'post_fix_probe_all_pages', `timeout:${step5ToStep6Timeouts.postFixProbeAllPages}ms`);
          }
          // Re-probe failure ⇒ keep pre-fix findings as fallback.
          // No log emission here — the post-fix probe is best-effort;
          // STEP 11 still emits its score log below.
        }
      }
      const postGtm = _scoreCrawlOutput(postFixCrawlOutput, postFixPhaseBFindings);
      // D41 T5 — surface-only baseline alongside comprehensive score.
      // Skip the extra call when Phase B is empty (identical scores).
      const postGtmSurfaceOnly = (Array.isArray(postFixPhaseBFindings) && postFixPhaseBFindings.length > 0)
        ? _scoreCrawlOutput(postFixCrawlOutput, null)
        : postGtm;
      lastPostGtm = postGtm;
      iterLog.postGtm = postGtm;
      iterLog.postGtmSurfaceOnly = postGtmSurfaceOnly;
      const log = makeStepLog({
        iteration: iterationNumber, step: 11, status: 'complete',
        tool: 'gtmReadinessScorer (§7.6) + post-fix re-crawl',
        why: 'measure canonical GTM Readiness score from post-deploy crawl',
        result: {
          gtmScore: postGtm.score,
          gtmBand: postGtm.band,
          gtmCounts: postGtm.counts,
          ceo95Criteria: postGtm.ceo95Criteria ?? null,
          surfaceOnlyGtmScore: postGtmSurfaceOnly.score,
          surfaceOnlyGtmCounts: postGtmSurfaceOnly.counts,
          phaseBContribution: postGtmSurfaceOnly.score - postGtm.score,
          phaseBPagesProbed: state.phaseBPagesProbed ?? 0,
          phaseBUrlsAttempted: state.phaseBUrlsAttempted ?? 0,
          // D42 T1 — post-fix Phase B re-probe metrics. When the
          // re-probe ran successfully, these reflect the post-fix
          // interactive state; otherwise they're 0 and postGtm is
          // computed from pre-fix findings (fallback).
          postFixPhaseBPagesProbed: postFixPagesProbed,
          postFixPhaseBUrlsAttempted: postFixUrlsAttempted,
          postFixPhaseBSummary: postFixPhaseBSummary,
          postFixPhaseBFindingsCount: Array.isArray(postFixPhaseBFindings) ? postFixPhaseBFindings.length : 0,
          fiveLayerInternal: postScoreEnvelope.total,
          layers: {
            l1: postScoreEnvelope.l1, l2: postScoreEnvelope.l2, l3: postScoreEnvelope.l3,
            l4: postScoreEnvelope.l4, l5: postScoreEnvelope.l5,
          },
        },
        durationMs: Date.now() - t0, mode: state.mode,
        scores: {
          original: originalGtmScore, current: postGtm.score,
          target: gtmTarget, progressPct: computeProgress({ originalScore: originalGtmScore, currentScore: postGtm.score, target: gtmTarget }),
        },
      });
      emit(log); iterLog.steps.push(log);
      if (state.transformationBaseline && postFixSnapshot) {
        const deltaResult = _calculateTransformationDelta({
          baseline: state.transformationBaseline,
          postFix: postFixSnapshot,
        });
        const patchEffects = _classifyPatchEffects({
          patches: state.remediationPatches ?? [],
          deltas: deltaResult.deltas,
        });
        const regressionGate = _runRegressionGate({
          deltaResult,
          threshold: product?.regression_gate_threshold ?? undefined,
          onStep: (evt) => {
            emit(makeStepLog({
              iteration: iterationNumber, step: 11,
              status: evt?.log?.passed === false ? 'degraded' : 'complete',
              tool: 'verification.regressionGate (PHASE C)',
              why: 'halt iteration when post-fix evaluators detect unacceptable regression',
              result: evt?.log ?? null,
              mode: state.mode,
            }));
          },
        });
        const transformationDelta = Object.freeze({
          baseline: state.transformationBaseline,
          postFix: postFixSnapshot,
          deltas: deltaResult.deltas,
          aggregate: deltaResult.aggregate,
          regressions: deltaResult.regressions,
          patchEffects,
          regressionGate,
          regressionGatePassed: regressionGate.passed,
        });
        state.transformationDelta = transformationDelta;
        iterLog.transformationDelta = transformationDelta;
        emit(makeStepLog({
          iteration: iterationNumber, step: 11,
          status: regressionGate.passed ? 'complete' : 'degraded',
          tool: 'verification.deltaCalculator (PHASE C)',
          why: 'compare before vs after evaluator snapshots and classify patch effects',
          result: {
            kind: 'delta_verified',
            improved: deltaResult.aggregate.totalImproved,
            neutral: deltaResult.aggregate.totalNeutral,
            regressed: deltaResult.aggregate.totalRegressed,
            netDelta: deltaResult.aggregate.netDelta,
            patchEffects,
          },
          mode: state.mode,
        }));
      }
    } catch (e) {
      return failStep({ product, failedStep: 'STEP_11',
        error: e?.message ?? String(e), code: e?.code ?? 'SCORING_FAILED', diagnostics: e });
    }
    }
    await state.checkpoint(onCheckpoint, { lastStep: 11, iteration: iterationNumber });
    if (!previewUrl) {
      const selfRenewalUserStepLog = makeForgeUserStepLog({
        iteration: iterationNumber,
        internalStep: 11.6,
        userStep: 6,
        key: 'self_renewal',
        label: 'Self-Renewal',
        status: 'scaffold',
        why: 'No patched/deployed artifact exists, so Self-Renewal remains non-mutating and recommend_only',
        result: {
          nonMutating: true,
          recommendOnly: true,
          operatorApprovalRequired: true,
          autoApply: false,
          deployedArtifactAvailable: false,
          reason: 'NO_DEPLOYED_ARTIFACT',
        },
        mode: state.mode,
      });
      emit(selfRenewalUserStepLog); iterLog.steps.push(selfRenewalUserStepLog);
    }

    // DISPATCH 30 — Per-fix attribution.
    // The branch deploy's pre-fix score (preGtm) is the no-fixes
    // baseline for this iteration — produced from the same crawl that
    // STEP 5 scored against the source URL (which is `main` on iter 1
    // and the prior iteration's preview URL on subsequent iters). The
    // bundle of files committed in this iteration is the delta agent.
    // We attach a per-file attribution record so the operator can see
    // which files participated in the bundle delta in commit order.
    // Honest scope: this records the BUNDLE delta + the file list +
    // commit order. It does NOT claim per-file isolated deltas — that
    // would require N+1 deploys per iteration (a future enhancement).
    {
      const committedFiles = Array.isArray(iterLog.fileFixes)
        ? iterLog.fileFixes
        : []; // populated after STEP 9 below — fallback to [] if missing
      const _preGtm  = iterLog.preGtm  ?? { score: 0 };
      const _postGtm = iterLog.postGtm ?? { score: 0 };
      const bundleDelta = (_postGtm.score ?? 0) - (_preGtm.score ?? 0);
      iterLog.perFixAttribution = committedFiles.map((filePath, idx) => ({
        filePath,
        commitOrder: idx,
        bundleDelta,
        baselineScore: _preGtm.score ?? 0,
        postBundleScore: _postGtm.score ?? 0,
        isolatedDelta: null,  // honest: not measured per-file in Phase A
        attributionMethod: 'bundle',
      }));
      emit(makeStepLog({
        iteration: iterationNumber, step: 11, status: 'complete',
        tool: 'per-fix attribution (D30)',
        why: 'attach per-file commit-order trace to the iteration\'s bundle delta for regression isolation',
        result: {
          bundleDelta,
          baselineScore: _preGtm.score ?? 0,
          postBundleScore: _postGtm.score ?? 0,
          filesInBundle: committedFiles.length,
          attribution: iterLog.perFixAttribution,
        },
        durationMs: 0, mode: state.mode,
      }));
    }

    // DISPATCH 30 — Post-deploy regression guard.
    // Compare canonical §7.6 post-fix against pre-fix. A fix is REJECTED
    // (never accepted into a PR) when ANY of:
    //   - postScore < preScore (score regressed)
    //   - new critical findings opened (post.critical > pre.critical)
    //   - new high findings opened (post.high > pre.high)
    //
    // On regression: mark iterLog.regressed=true (STEP 13 PR creation
    // will skip), emit a regression-guard log entry with the verbatim
    // before/after counts, and let STEP 12's delta policy handle the
    // loop exit decision (typically NO_IMPROVEMENT on Δ≤0). The branch
    // is left in place as postmortem evidence; the operator's main
    // remains clean because no PR was opened.
    {
      const _preGtm  = iterLog.preGtm  ?? { score: 0, counts: { critical: 0, high: 0, medium: 0, low: 0 } };
      const _postGtm = iterLog.postGtm ?? { score: 0, counts: { critical: 0, high: 0, medium: 0, low: 0 } };
      const scoreRegressed   = _postGtm.score < _preGtm.score;
      const newCritical      = (_postGtm.counts?.critical ?? 0) - (_preGtm.counts?.critical ?? 0);
      const newHigh          = (_postGtm.counts?.high ?? 0)     - (_preGtm.counts?.high ?? 0);
      const criticalRegressed = newCritical > 0;
      const highRegressed     = newHigh > 0;
      const regressed = scoreRegressed || criticalRegressed || highRegressed;
      iterLog.regressed = regressed;
      iterLog.regressionDetail = regressed ? {
        scoreRegressed,
        preScore: _preGtm.score,
        postScore: _postGtm.score,
        scoreDelta: _postGtm.score - _preGtm.score,
        newCritical, newHigh,
        preCounts: _preGtm.counts,
        postCounts: _postGtm.counts,
      } : null;
      emit(makeStepLog({
        iteration: iterationNumber, step: 11, status: regressed ? 'degraded' : 'complete',
        tool: 'post-deploy regression guard (D30)',
        why: 'reject fixes that regress canonical §7.6 (lower score OR new critical/high findings); never accept into PR',
        result: {
          regressed,
          detail: iterLog.regressionDetail,
        },
        durationMs: 0, mode: state.mode,
      }));
    }

    // STEP 12 — GTM Readiness Decision.
    // DISPATCH 28: gate uses canonical §7.6 score, not Five-Layer total.
    const preGtmForIter = iterLog.preGtm ?? { score: 0, counts: { critical: 0 } };
    const postGtmForIter = iterLog.postGtm ?? { score: 0, counts: { critical: 0 } };
    const delta = postGtmForIter.score - preGtmForIter.score;
    const totalImprovement = postGtmForIter.score - (originalGtmScore ?? 0);
    // Five-Layer internal delta retained for telemetry only.
    const fiveLayerDelta = postScoreEnvelope.total - preScoreEnvelope.total;
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
    // DISPATCH 28: iterLog now records BOTH canonical (preScore/postScore =
    // §7.6 GTM Readiness) and internal Five-Layer signal separately.
    iterLog.preScore = preGtmForIter.score;          // canonical §7.6
    iterLog.postScore = postGtmForIter.score;        // canonical §7.6
    iterLog.fiveLayerPre = preScoreEnvelope.total;   // internal signal
    iterLog.fiveLayerPost = postScoreEnvelope.total; // internal signal
    iterLog.delta = delta;
    iterLog.totalImprovement = totalImprovement;

    // CAPABILITY-WEIGHTED GATE (CA-18 §2 honest disclosure enforcement).
    // The raw §7.6 score is deflated by coverage_confidence (scored
    // dimensions / total) so a "99.5/100 with 4/10 dimensions" outcome
    // cannot mask the missing evidence. Coverage <7 forces refusal
    // regardless of trust score (per spec — even maximum trust at low
    // coverage is not GTM-claimable).
    const scoredDimensionsForIter = _countCurrentScoredDimensions(
      state.pipelineStats, state.pipelineErrors,
    );
    const weighted = computeCapabilityWeightedScore({
      rawScore: postGtmForIter.score,
      scoredDimensions: scoredDimensionsForIter,
      totalDimensions: 10,
    });
    const gateVerdict = decideGtmGate({ weighted, gtmTarget });
    iterLog.rawScore = weighted.rawScore;
    iterLog.effectiveTrustScore = weighted.effectiveTrustScore;
    iterLog.coverageConfidence = weighted.coverageConfidence;
    iterLog.scoredDimensions = weighted.scoredDimensions;
    iterLog.totalDimensions = weighted.totalDimensions;
    iterLog.meetsMinimumCoverage = weighted.meetsMinimumCoverage;
    iterLog.coverageDisclosure = weighted.coverageDisclosure;
    // GTM ready per §7.6 + CA-13 + capability-weighted gate: both
    // gateVerdict (trust>=target AND scored>=7) AND zero criticals.
    iterLog.gtmReady = gateVerdict.gtmReady && postGtmForIter.counts.critical === 0;
    iterLog.branchName = pathB ? null : branchName;
    iterLog.previewUrl = previewUrl;
    iterLog.decision = decision.action;
    iterLog.path = pathB ? 'B' : 'A';
    iterations.push(iterLog);

    let iterExit = null;
    if (iterLog.transformationDelta && iterLog.transformationDelta.regressionGatePassed === false) {
      iterExit = 'REGRESSION_DETECTED';
    } else if (iterLog.gtmReady) {
      iterExit = 'GTM_READY';
    } else if (
      // Honest exit: raw score is at/above target AND zero criticals,
      // but coverage is insufficient to claim readiness. Further
      // iteration cannot fix this — it's an evidence-collection gap,
      // not a quality gap. Stop and surface the gap to the operator.
      postGtmForIter.score >= gtmTarget
      && postGtmForIter.counts.critical === 0
      && !weighted.meetsMinimumCoverage
    ) {
      iterExit = 'INSUFFICIENT_DIMENSION_COVERAGE';
    } else if (delta <= 0 && noImprovementStreak + 1 >= NO_IMPROVEMENT_STREAK_LIMIT) {
      iterExit = 'NO_IMPROVEMENT';
    } else if (iterationNumber >= maxIterations) {
      iterExit = 'MAX_ITERATIONS';
    }
    const decisionLog = makeStepLog({
      iteration: iterationNumber, step: 12,
      status: iterExit ? 'complete' : 'complete',
      tool: 'deltaPolicy.js + §7.6 GTM Readiness gate',
      why: 'decide whether to open PR now or run another iteration',
      result: {
        delta,
        postScore: postGtmForIter.score,              // canonical
        gtmBand: postGtmForIter.band,
        gtmCounts: postGtmForIter.counts,
        fiveLayerDelta,                                // internal telemetry
        fiveLayerPost: postScoreEnvelope.total,        // internal telemetry
        gtmReady: iterLog.gtmReady,
        exitTrigger: iterExit,
        noImprovementStreak: delta <= 0 ? noImprovementStreak + 1 : 0,
        noImprovementStreakLimit: NO_IMPROVEMENT_STREAK_LIMIT,
        action: decision.action,
      },
      mode: state.mode,
      scores: {
        original: originalGtmScore, current: postGtmForIter.score,
        target: gtmTarget, progressPct: computeProgress({ originalScore: originalGtmScore, currentScore: postGtmForIter.score, target: gtmTarget }),
      },
    });
    emit(decisionLog); iterLog.steps.push(decisionLog);
    if (!previewUrl) {
      const gtmUserStepLog = makeForgeUserStepLog({
        iteration: iterationNumber,
        internalStep: 12.7,
        userStep: 7,
        key: 'gtm',
        label: 'GTM',
        status: 'degraded',
        why: 'GTM readiness is reported against available evidence only; no deployed artifact exists',
        result: {
          gtmReady: false,
          deployedArtifactAvailable: false,
          rawGtmScore: postGtmForIter.score,
          effectiveTrustScore: weighted.effectiveTrustScore,
          coverageConfidence: weighted.coverageConfidence,
          reason: 'NO_DEPLOYED_ARTIFACT',
        },
        mode: state.mode,
      });
      emit(gtmUserStepLog); iterLog.steps.push(gtmUserStepLog);
    }
    try { onIteration({ ...iterLog }); } catch { /* swallow */ }
    await state.checkpoint(onCheckpoint, { lastStep: 12, iteration: iterationNumber, decision: iterExit ?? 'CONTINUE' });

    if (iterExit) {
      exitReason = iterExit;
      break outerLoop;
    }
    if (state._stopRequested) { exitReason = 'USER_STOPPED'; break outerLoop; }
    noImprovementStreak = delta <= 0 ? noImprovementStreak + 1 : 0;

    // Continue: next iteration scores against this iteration's preview URL.
    // Universal/evaluation-only runs do not always produce a preview; keep
    // the last valid URL instead of poisoning the next iteration with null.
    currentUrl = previewUrl || currentUrl;
    iterationNumber += 1;
  }

  if (state.terminalFailure) {
    exitReason = 'STEP_FAILED';
  }

  // STEP 13 — Final PR Creation. PATH A only (PATH B has no upstream
  // GitHub repo to PR against; preview URL is the deliverable).
  const lastIter = iterations[iterations.length - 1] || {};
  if (pathB) {
    const skipReason = state.universalMode
      ? 'UNIVERSAL_NO_REPO_ACCESS'
      : 'PATH_B_REMEDIATION_ENGINE_OWNS_DEPLOY';
    const skipDetail = state.universalMode
      ? 'universal mode — no operator GitHub repo to open PR against'
      : 'PATH B — preview URL is the deliverable';
    emit(makeStepLog({
      iteration: iterations.length, step: 13, status: 'skipped',
      tool: 'githubPrWriter.js',
      why: 'human review gate — NEVER auto-merge',
      result: { skipped: skipDetail, autoFixSkippedReason: skipReason },
      mode: state.mode, canInterrupt: false,
    }));
    state.skippedSteps.push({
      iteration: iterations.length, step: 13, tool: 'githubPrWriter.js',
      autoFixSkippedReason: skipReason, detail: skipDetail,
    });
  } else if (state.terminalFailure) {
    emit(makeStepLog({
      iteration: iterations.length, step: 13, status: 'skipped',
      tool: 'githubPrWriter.js',
      why: 'terminal failure before PR gate',
      result: {
        skipped: 'terminal_failure',
        failedStep: state.terminalFailure.failedStep,
        code: state.terminalFailure.code,
        remediation: state.terminalFailure.remediation ?? null,
      },
      mode: state.mode, canInterrupt: false,
    }));
    state.skippedSteps.push({
      iteration: iterations.length, step: 13, tool: 'githubPrWriter.js',
      autoFixSkippedReason: state.terminalFailure.code ?? 'TERMINAL_FAILURE',
      detail: state.terminalFailure.error ?? 'terminal failure before PR gate',
    });
  } else if (lastIter.regressed) {
    // DISPATCH 30: regression guard fired on the final iteration. Never
    // open a PR for regressing fixes. The branch is left on the remote
    // as postmortem evidence; the operator's main remains clean.
    emit(makeStepLog({
      iteration: iterations.length, step: 13, status: 'skipped',
      tool: 'githubPrWriter.js (regression guard)',
      why: 'final iteration regressed canonical §7.6 score / introduced new critical or high findings — refusing to open PR',
      result: {
        skipped: 'regression_guard',
        branchName: lastIter.branchName,
        detail: lastIter.regressionDetail ?? null,
      },
      mode: state.mode, canInterrupt: false,
    }));
  } else if (
    lastIter.branchName
    && token
    && state.operatorMode === 'github_connected'
    && args.operatorApproval?.approved !== true
  ) {
    emit(makeStepLog({
      iteration: iterations.length, step: 13, status: 'skipped',
      tool: 'githubPrWriter.js (operator approval gate)',
      why: 'human review gate - operator approval required before PR creation',
      result: {
        skipped: 'operator_approval_required',
        autoFixSkippedReason: 'OPERATOR_APPROVAL_REQUIRED',
        operator_mode: state.operatorMode,
        branchName: lastIter.branchName,
      },
      mode: state.mode, canInterrupt: false,
    }));
    state.skippedSteps.push({
      iteration: iterations.length, step: 13, tool: 'githubPrWriter.js',
      autoFixSkippedReason: 'OPERATOR_APPROVAL_REQUIRED', detail: 'operatorApproval.approved must be true before PR creation',
    });
  } else if (lastIter.branchName && token) {
    if (state.rateCapDegraded?.limited === true) {
      const block = buildRateCapMutationBlock(state, 'PR creation');
      emit(makeStepLog({
        iteration: iterations.length, step: 13, status: 'failed',
        tool: 'rateCap.js (mutation guard)',
        why: 'rate-limited run reached PR creation boundary',
        result: block,
        mode: state.mode,
        canInterrupt: false,
      }));
      return failStep({
        product,
        failedStep: 'STEP_13',
        error: block.detail,
        code: block.code,
        diagnostics: block,
      });
    }
    try {
      const t0 = Date.now();
      pr = await withTimeout(
        _createRenewalPr({
          owner: parseGithubRepoUrl(githubRepoUrl).owner,
          repo: parseGithubRepoUrl(githubRepoUrl).repo,
          branchName: lastIter.branchName,
          baseBranch: productBranch,
          title: `FlowAI Self-Renewal: ${runId.slice(0, 8)} (${exitReason})`,
          body: buildPrBody({
            runId, mode, exitReason,
            originalScore: originalGtmScore ?? 0,
            finalScore: lastPostGtm?.score ?? originalGtmScore ?? 0,
            totalDelta: (lastPostGtm?.score ?? originalGtmScore ?? 0) - (originalGtmScore ?? 0),
            iterations, finalPreviewUrl, gtmTarget,
          }),
          token,
          opts: {
            fetch: makeAbortableFetch({
              timeoutMs: step5ToStep6Timeouts.createRenewalPr,
              code: 'GITHUB_PR_CREATE_TIMEOUT',
              message: `GitHub PR creation exceeded ${step5ToStep6Timeouts.createRenewalPr}ms`,
            }),
          },
        }),
        {
          timeoutMs: step5ToStep6Timeouts.createRenewalPr,
          code: 'GITHUB_PR_CREATE_TIMEOUT',
          message: `GitHub PR creation exceeded ${step5ToStep6Timeouts.createRenewalPr}ms`,
        },
      );
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
        result: {
          error: e?.message,
          code: e?.code ?? 'PR_CREATE_FAILED',
          degraded: e?.code === 'GITHUB_PR_CREATE_TIMEOUT',
          reason: e?.code === 'GITHUB_PR_CREATE_TIMEOUT' ? 'github_pr_create_timeout' : undefined,
          timeoutMs: e?.code === 'GITHUB_PR_CREATE_TIMEOUT' ? step5ToStep6Timeouts.createRenewalPr : null,
        }, mode: state.mode,
      }));
      if (e?.code === 'GITHUB_PR_CREATE_TIMEOUT') {
        recordPipelineError(state, 'github_pr_create', `timeout:${step5ToStep6Timeouts.createRenewalPr}ms`);
      }
      // Continue to STEP 14 even if PR failed.
    }
  }

  // W6 INTEGRATION — STEP 3a: emit one tool.selection envelope per
  // AutoRunner step key into governance_record before the
  // orchestration_complete write. Best-effort (recommend_only).
  const toolSelectionsResult = await withTimeout(
    _emitToolSelections({
      emitVisible: false,
      writeGovernance: true,
    }),
    {
      timeoutMs: step5ToStep6Timeouts.toolSelections,
      code: 'TOOL_SELECTION_GOVERNANCE_TIMEOUT',
      message: `tool selection governance write exceeded ${step5ToStep6Timeouts.toolSelections}ms`,
    },
  ).catch((e) => {
    if (e?.code === 'TOOL_SELECTION_GOVERNANCE_TIMEOUT') {
      recordPipelineError(state, 'tool_selection_governance', `timeout:${step5ToStep6Timeouts.toolSelections}ms`);
    }
    return { written: 0, error: e?.message ?? String(e), code: e?.code ?? 'TOOL_SELECTION_GOVERNANCE_FAILED' };
  });
  emit(makeStepLog({
    iteration: iterations.length, step: 0, status: 'complete',
    tool: 'ToolIntelligenceService — per-step selection trail',
    why: 'CA-18 §6 — write tool.selection envelopes for the run',
    result: {
      kind: 'tool_intel_selections_written',
      written: toolSelectionsResult.written ?? 0,
      attachReason: toolIntelligenceAttachReason,
      mode: ssotOrchestraExecutionMode,
      internalMode: state.mode,
      ssotVocabulary,
    },
    mode: state.mode,
  }));

  // STEP 14 — Audit Record.
  // DISPATCH 28: audit emits the canonical §7.6 GTM Readiness score
  // alongside the Five-Layer telemetry. Per §7.6 + §14.1, every report
  // emission writes a governance_record entry of kind
  // 'gtm_readiness_score' so the score trajectory is auditable across
  // the product's lifetime.
  const finalGtmScore = lastPostGtm?.score ?? originalGtmScore ?? 0;
  const finalGtmBand = lastPostGtm?.band ?? 'not-demo-ready';
  const finalGtmCriticalCount = lastPostGtm?.counts?.critical ?? 0;

  // W6 INTEGRATION — STEP 4: CA-18 §2 dimensions_contributing[] honest disclosure.
  // The platform forbids silent omission of dimensions. We emit one entry per
  // CA-18 §2 dimension (10 total): 4 scored + 6 KNOWN_GAP_NOT_IMPLEMENTED.
  // The UI's KNOWN-GAP banner triggers whenever any entry has scored=false.
  const dimensionsContributing = buildDimensionsContributing({
    preScoreEnvelope: { total: originalScore, l1: null, l2: null, l4: null, l5: null },
    lastPostScore,
    originalGtmScore,
    finalGtmScore,
    finalGtmCounts: lastPostGtm?.counts ?? null,
    iterations,
    // PHASE B1 — pass the pipeline's per-evaluator stats so dimension
    // entries can disclose evidence_source (lighthouse / axe-core /
    // runtime-diagnostics) and partial-coverage state honestly.
    pipelineStats: state.pipelineStats ?? null,
    pipelineErrors: state.pipelineErrors ?? null,
  });

  // DISPATCH U1 ITEM 3 — universal-mode findings rollup. Counted from
  // the latest pipeline output so the SSE consumer can render the
  // severity breakdown alongside the trust score. Falls back to {} when
  // no pipeline output exists (e.g. STEP 4 failed gracefully).
  const _findingsForRollup = Array.isArray(state.pipelineFindings)
    ? state.pipelineFindings
    : (Array.isArray(state.phaseBFindings) ? state.phaseBFindings : []);
  const findingsSeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of _findingsForRollup) {
    const sev = f?.severity;
    if (sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low') {
      findingsSeverity[sev] += 1;
    }
  }
  const findingsCount = _findingsForRollup.length;

  // Capability-weighted final score (CA-18 §2 honest disclosure). Uses
  // the just-built dimensions_contributing[] as the source of truth for
  // how many dimensions actually have evidence behind them.
  const finalWeighted = computeCapabilityWeightedScore({
    rawScore: finalGtmScore,
    dimensionsContributing,
  });
  const finalGate = decideGtmGate({ weighted: finalWeighted, gtmTarget });
  const canonicalGtmReady = finalGate.gtmReady && finalGtmCriticalCount === 0;
  const upgradeDelivery = buildUpgradeDeliveryEnvelope({
    product,
    initialUrl,
    iterations,
    skippedSteps: state.skippedSteps,
  });
  // Promote INSUFFICIENT_DIMENSION_COVERAGE into exitReason when the
  // run ended without a clean GTM exit AND the only blocker was the
  // coverage floor. Keeps GTM_READY and other terminal reasons intact.
  if (
    exitReason !== 'GTM_READY'
    && exitReason !== 'USER_STOPPED'
    && exitReason !== 'STEP_FAILED'
    && exitReason !== 'REGRESSION_DETECTED'
    && exitReason !== 'INSUFFICIENT_DIMENSION_COVERAGE'
    && finalGtmScore >= gtmTarget
    && finalGtmCriticalCount === 0
    && !finalWeighted.meetsMinimumCoverage
  ) {
    exitReason = 'INSUFFICIENT_DIMENSION_COVERAGE';
  }

  let auditWrite = { written: false, reason: 'not_attempted' };
  if (state.rateCapDegraded?.limited === true) {
    const block = buildRateCapMutationBlock(state, 'ProductSSOT renewal-success write');
    auditWrite = { written: false, reason: 'rate_cap_mutation_blocked', block };
    emit(makeStepLog({
      iteration: iterations.length, step: 14, status: 'failed',
      tool: 'rateCap.js (mutation guard)',
      why: 'rate-limited run reached ProductSSOT success-write boundary',
      result: block,
      mode: state.mode,
      canInterrupt: false,
    }));
  } else {
  try {
    auditWrite = await withTimeout(_appendGovernanceEntry({
      productId, environment,
      entry: {
        kind: 'self_renewal.orchestration_complete.v1',
        runId, productId, mode, exitReason,
        ssotVocabulary,
        inputSummary,
        inputStepMatrix,
        userObjectives,
        originalScore: originalGtmScore,                  // canonical §7.6
        finalScore: finalGtmScore,                        // canonical §7.6
        finalGtmBand,
        finalGtmCounts: lastPostGtm?.counts ?? null,
        fiveLayerOriginal: originalScore,                 // internal telemetry
        fiveLayerFinal: lastPostScore,                    // internal telemetry
        scoreEvidenceDegraded: preScoreEvidenceDegraded || postScoreEvidenceDegraded,
        preScoreDegraded: preScoreEvidenceDegraded,
        postScoreDegraded: postScoreEvidenceDegraded,
        fiveLayerScoreDegraded: preScoreEvidenceDegraded || postScoreEvidenceDegraded,
        totalDelta: finalGtmScore - (originalGtmScore ?? 0),
        iterationsCompleted: iterations.length,
        gtmReady: state.terminalFailure ? false : canonicalGtmReady,
        failedStep: state.terminalFailure?.failedStep ?? null,
        errorCode: state.terminalFailure?.code ?? null,
        terminalFailure: state.terminalFailure ?? null,
        previewUrl: finalPreviewUrl,
        ...upgradeDelivery,
        prUrl: pr?.prHtmlUrl ?? null,
        ceo95Criteria: lastPostGtm?.ceo95Criteria ?? null,
        // W6 INTEGRATION — STEP 4: CA-18 §2 honest disclosure.
        dimensions_contributing: dimensionsContributing,
        // CAPABILITY-WEIGHTED SCORING — finalScore above is the raw
        // §7.6 score; trust score deflates it by coverage_confidence
        // and exposes the minimum-coverage floor (7/10) for honesty.
        rawScore: finalWeighted.rawScore,
        effectiveTrustScore: finalWeighted.effectiveTrustScore,
        coverageConfidence: finalWeighted.coverageConfidence,
        scoredDimensions: finalWeighted.scoredDimensions,
        totalDimensions: finalWeighted.totalDimensions,
        meetsMinimumCoverage: finalWeighted.meetsMinimumCoverage,
        minimumScoredDimensionsForGTM: MINIMUM_SCORED_DIMENSIONS_FOR_GTM,
        coverageDisclosure: finalWeighted.coverageDisclosure,
        // DISPATCH U1 ITEM 3 — universal-mode metadata. Governance
        // ALWAYS records the runMode + every skipped step (never
        // silently omitted from the audit trail, per dispatch
        // governance rule). The UI may collapse these — governance
        // does not.
        runMode: state.runMode ?? null,
        universalMode: !!state.universalMode,
        autoFixAvailable: !state.universalMode,
        operatorMode: state.operatorMode ?? null,
        operatorRepoAccess: state.operatorRepoAccess ?? null,
        findingsCount,
        findingsSeverity,
        deepBrowserAnalysis: state.deepBrowserAnalysis ?? null,
        fixProposals: Array.isArray(state.fixProposals) ? state.fixProposals : [],
        skippedSteps: Array.isArray(state.skippedSteps) ? state.skippedSteps : [],
        // PHASE B2 — rule-based remediation summary (classifier counts,
        // budget application, conflicts). Null when remediation didn't
        // run (e.g. PATH B with no findings).
        remediationSummary: state.remediationSummary ?? null,
        remediationConflicts: state.remediationConflicts ?? [],
        remediationEscalatedCount: Array.isArray(state.remediationEscalated)
          ? state.remediationEscalated.length : 0,
        remediationDeferredCount: Array.isArray(state.remediationDeferred)
          ? state.remediationDeferred.length : 0,
        sourceMapping: state.sourceMapping ?? null,
        sourceMappedFixProposals: Array.isArray(state.sourceMappedFixProposals)
          ? state.sourceMappedFixProposals : [],
        platformBoundaryBlocked: Array.isArray(state.platformBoundaryBlocked)
          ? state.platformBoundaryBlocked : [],
        upgradeTargets,
        upgradeProvisioning: state.upgradeProvisioning ?? null,
        transformationDelta: state.transformationDelta ?? null,
        at: new Date().toISOString(),
      },
      supabase,
    }), {
      timeoutMs: step5ToStep6Timeouts.governanceWrite,
      code: 'FINAL_GOVERNANCE_WRITE_TIMEOUT',
      message: `final governance write exceeded ${step5ToStep6Timeouts.governanceWrite}ms`,
    });
    emit(makeStepLog({
      iteration: iterations.length, step: 14, status: 'complete',
      tool: 'product_ssot.governance_record',
      why: 'permanent immutable record of all FlowAI actions',
      result: auditWrite, mode: state.mode, canInterrupt: false,
    }));
  } catch (e) {
    if (e?.code === 'FINAL_GOVERNANCE_WRITE_TIMEOUT') {
      auditWrite = { written: false, reason: 'final_governance_write_timeout', timeoutMs: step5ToStep6Timeouts.governanceWrite };
      recordPipelineError(state, 'final_governance_write', `timeout:${step5ToStep6Timeouts.governanceWrite}ms`);
    }
    emit(makeStepLog({
      iteration: iterations.length, step: 14, status: 'failed',
      tool: 'governance_record', why: 'audit write',
      result: { error: e?.message }, mode: state.mode,
    }));
  }
  }
  const monitorUserStepLog = makeForgeUserStepLog({
    iteration: iterations.length,
    internalStep: 14.8,
    userStep: 8,
    key: 'monitor',
    label: 'Monitor',
    status: auditWrite?.written ? 'complete' : 'degraded',
    why: auditWrite?.written
      ? 'Final run report and audit write completed'
      : 'Final run report completed with degraded audit persistence',
    result: {
      finalStatusReady: true,
      auditWritten: auditWrite?.written === true,
      auditReason: auditWrite?.reason ?? null,
      deployedArtifactAvailable: Boolean(finalPreviewUrl),
      monitoringHealthy: false,
      monitoringHealthClaimed: false,
      finalScore: finalGtmScore,
    },
    mode: state.mode,
  });
  emit(monitorUserStepLog);

  return Object.freeze({
    ok: !state.terminalFailure,
    // DISPATCH 28: gtmReady + scores are now driven by the canonical §7.6
    // formula. Five-Layer fields kept on the envelope as internal telemetry
    // (fiveLayer* prefix) so existing consumers can read them, but the
    // top-level originalScore / finalScore / totalDelta now refer to the
    // canonical /100 GTM Readiness score.
    gtmReady: state.terminalFailure ? false : canonicalGtmReady,
    gtmBand: finalGtmBand,
    gtmCounts: lastPostGtm?.counts ?? null,
    ceo95Criteria: lastPostGtm?.ceo95Criteria ?? null,
    inputSummary,
    inputStepMatrix,
    userObjectives,
    exitReason,
    failedStep: state.terminalFailure?.failedStep ?? undefined,
    error: state.terminalFailure?.error ?? undefined,
    code: state.terminalFailure?.code ?? undefined,
    failureArtifact: state.terminalFailure?.failureArtifact ?? null,
    originalScore: originalGtmScore ?? 0,
    finalScore: finalGtmScore,
    totalDelta: finalGtmScore - (originalGtmScore ?? 0),
    fiveLayerOriginalScore: originalScore ?? 0,
    fiveLayerFinalScore: lastPostScore ?? originalScore ?? 0,
    iterationsCompleted: iterations.length,
    previewUrl: finalPreviewUrl,
    ...upgradeDelivery,
    prUrl: pr?.prHtmlUrl ?? null,
    prNumber: pr?.prNumber ?? null,
    // W6 INTEGRATION — STEP 4: CA-18 §2 honest disclosure on result envelope.
    dimensions_contributing: dimensionsContributing,
    // CAPABILITY-WEIGHTED SCORING — surfaced on the result envelope so
    // the UI can display the deflated trust score as the headline and
    // the raw score + coverage ratio as the secondary line.
    rawScore: finalWeighted.rawScore,
    effectiveTrustScore: finalWeighted.effectiveTrustScore,
    coverageConfidence: finalWeighted.coverageConfidence,
    scoredDimensions: finalWeighted.scoredDimensions,
    totalDimensions: finalWeighted.totalDimensions,
    meetsMinimumCoverage: finalWeighted.meetsMinimumCoverage,
    minimumScoredDimensionsForGTM: MINIMUM_SCORED_DIMENSIONS_FOR_GTM,
    coverageDisclosure: finalWeighted.coverageDisclosure,
    // DISPATCH U1 ITEM 3 — universal-mode fields on the result envelope
    // so the SSE consumer (and the UI) can:
    //   - distinguish universal from PATH A / PATH B with repo,
    //   - render findings count + severity breakdown,
    //   - hide the "Open preview URL" button when there's no
    //     deployable artifact,
    //   - render the "Register this product" CTA.
    runMode: state.runMode ?? null,
    universalMode: !!state.universalMode,
    autoFixAvailable: !state.universalMode,
    registerCTA: !!state.universalMode,
    operatorMode: state.operatorMode ?? null,
    operatorRepoAccess: state.operatorRepoAccess ?? null,
    findingsCount,
    findingsSeverity,
    deepBrowserAnalysis: state.deepBrowserAnalysis ?? null,
    fixProposals: Array.isArray(state.fixProposals) ? state.fixProposals : [],
    skippedSteps: Array.isArray(state.skippedSteps) ? state.skippedSteps : [],
    // PHASE B2 — rule-based remediation summary on the result envelope.
    remediationSummary: state.remediationSummary ?? null,
    sourceMapping: state.sourceMapping ?? null,
    sourceMappedFixProposals: Array.isArray(state.sourceMappedFixProposals)
      ? state.sourceMappedFixProposals : [],
    platformBoundaryBlocked: Array.isArray(state.platformBoundaryBlocked)
      ? state.platformBoundaryBlocked : [],
    upgradeTargets,
    upgradeProvisioning: state.upgradeProvisioning ?? null,
    transformationDelta: state.transformationDelta ?? null,
    orchestrationLog,
    iterations,
    product,
    runId,
    mode: state.mode,
    auditWrite,
    // DISPATCH 28 P0-5: §7 Output Contract #5 incompleteness signal.
    // If the atomic governance write failed, the run is INCOMPLETE per
    // §7 line 146 — callers may invoke auditWrite.rollback() to restore
    // the snapshot state (best-effort structural restore).
    runIncomplete: !auditWrite?.written && auditWrite?.reason !== 'not_attempted'
      ? { reason: auditWrite?.reason ?? 'unknown', rollback: auditWrite?.rollback ?? null }
      : null,
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
export async function prioritizeIssuesWithClaude({ preScore, product, suppliedIssue, fileList = null, canonicalFindings = null, opts = {} }) {
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

  // D38 T1 — canonical §7.6 findings are the LITERAL measurable defects
  // the engine observed on the deployed product. The prioritizer must
  // target THESE — not Claude's imagination of what could be wrong
  // based on Five-Layer scores. Five-Layer is internal telemetry; the
  // findings list is the source of truth for "fix this specific thing."
  const hasCanonicalFindings = Array.isArray(canonicalFindings) && canonicalFindings.length > 0;
  const findingsSection = hasCanonicalFindings
    ? [
        'CANONICAL §7.6 FINDINGS (these are the ACTUAL measurable defects observed by the Aggressive Crawl Engine — TARGET THESE, not your imagination of what could be wrong):',
        ...canonicalFindings.slice(0, 30).map((f, i) =>
          `  ${i + 1}. [${f.severity}] ${f.category} @ ${f.location || 'n/a'}` +
          (f.evidence ? `\n     evidence: ${typeof f.evidence === 'string' ? f.evidence.slice(0, 200) : ''}` : ''),
        ),
        '',
        'EVERY issue you return MUST map directly to one of the findings above. Each fix MUST be the smallest possible change that removes the corresponding finding from the next crawl. Do NOT invent new improvement areas (no pricing pages, no monetization, no refactoring) unless they directly correspond to a listed finding.',
      ]
    : [
        'No canonical findings supplied — falling back to Five-Layer score signal (lower-quality input).',
      ];

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
    'You are a code quality analyst. Identify up to 5 SPECIFIC code-level fixes that will REMOVE the canonical §7.6 findings listed below from the next deploy crawl. Each fix maps 1:1 to a finding.',
    '',
    `Product: ${productId}`,
    `GitHub repo: ${githubRepoUrl}`,
    '',
    ...findingsSection,
    '',
    'Five-Layer scores (INTERNAL telemetry — informational only; do NOT prioritize based on these — use the canonical findings above):',
    `  L1 Functionality: ${preScore.l1}/20  L2 Operational: ${preScore.l2}/20  L3 Financial: ${preScore.l3}/20  L4 Business: ${preScore.l4}/20  L5 GTM: ${preScore.l5}/20  Total: ${preScore.total}/100`,
    '',
    ...fileListSection,
    '',
    'Return STRICTLY valid JSON with this shape (no markdown code fences, no prose, just JSON):',
    '{"issues": [',
    '  {',
    '    "filePath": "<exact path from the file list above>",',
    '    "category": "<the §7.6 finding category from the list above, e.g. console-error, network-failure, accessibility-headings>",',
    '    "location": "<the finding\'s location URL, copied verbatim from the canonical findings>",',
    '    "issue": "<specific problem description tied to the finding>",',
    '    "fix": "<exactly what minimal change to make — describe the line(s) and the new value>",',
    '    "estimatedImpact": { "layer": "L1|L2|L3|L4|L5", "delta": <integer> },',
    '    "severity": "critical|high|medium|low",',
    '    "title": "<short title>"',
    '  }',
    '  ... up to 5 entries, ranked by descending estimatedImpact.delta',
    ']}',
    '',
    'CRITICAL RULES:',
    '- Each issue MUST correspond to one of the canonical findings above. If no canonical finding maps to a file, do not propose a fix for that file.',
    '- The "category" + "location" fields MUST be copied verbatim from the canonical findings list so downstream scoped-relaxation rules can recognize the finding.',
    '- Do NOT invent improvement areas (pricing pages, monetization, refactoring) unless they directly correspond to a listed finding.',
    '- If the canonical findings list is empty, return an empty issues array.',
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

// ── DISPATCH 33 T2 — scoped per-finding preserve relaxation ──────────────
//
// The diff editor (D32 T2) refuses to remove or modify any line that
// contains a normally-preserved construct (import/export/fetch/route/
// url_literal). That's the right default — but for findings whose
// CATEGORY directly implies the fix MUST touch one of those constructs
// (e.g. a network-failure finding on `fetch('/api/bad')` requires
// editing that fetch line; a broken-link finding on `<a href="/x">`
// requires editing the URL literal), the rule is over-broad and blocks
// every possible fix.
//
// deriveScopedRelaxation(issue) returns either null (no relaxation
// needed) or a `preserveExceptions` map of the form
//   { <category>: [<allowed-substring>, ...] }
// telling the diff editor "you may remove a line matching this
// category IF the line ALSO contains one of these substrings". The
// allowed-substring set is derived from the issue's `location` and
// `evidence` fields — the exact URL or fetch path the finding names.
// Lines that don't carry the substring stay preserved.
//
// Category mapping is conservative: only the §6 detector categories
// where touching the construct is the literal intent of the fix get
// the relaxation. xss-in-form-echo (hard-classified critical per
// CA-10-Q3) never gets the relaxation — the fix is a different code
// path entirely.
function deriveScopedRelaxation(issue) {
  if (!issue || typeof issue !== 'object') return null;
  const cat = typeof issue.category === 'string' ? issue.category.toLowerCase() : '';
  const location = typeof issue.location === 'string' ? issue.location : '';
  const evidence = typeof issue.evidence === 'string' ? issue.evidence : '';
  // Build allowed-substring set from the URL path components present
  // in location/evidence. The diff editor uses these to check whether
  // a removed line actually corresponds to the offending construct.
  const substrings = new Set();
  function addUrlParts(s) {
    if (typeof s !== 'string' || !s) return;
    // Add the full URL if it looks like one.
    const urlMatch = s.match(/https?:\/\/\S+|\/[\w./%-]+/g);
    if (urlMatch) {
      for (const m of urlMatch) {
        if (m.length >= 4) substrings.add(m);
        // Also add the path portion for relative-URL matching.
        try {
          const u = new URL(m);
          if (u.pathname && u.pathname !== '/' && u.pathname.length >= 4) substrings.add(u.pathname);
        } catch { /* not a full URL — fine */ }
      }
    }
  }
  addUrlParts(location);
  addUrlParts(evidence);

  // Category → preserve-category that needs relaxation.
  // network-failure / auth-gate-leak: the fix touches a fetch / URL line.
  // broken-modal / dead-card / slow-route: typically a route/URL/fetch line.
  // engine-error / console-error: usually the offending line is a fetch
  // call or a URL — same relaxation.
  // accessibility-headings / accessibility-alt-text: NEVER relaxes
  // (touching imports/fetches/routes can't fix a missing h1).
  // ai-agent-* / no-form-validation / external-script-leak: no relaxation
  // here in Phase A (more nuanced; future dispatch).
  const RELAX_CATEGORIES = new Set([
    'network-failure', 'broken-link',
    'auth-gate-leak',
    'engine-error', 'console-error',
    'slow-route',
    'broken-modal', 'dead-card',
  ]);
  if (!RELAX_CATEGORIES.has(cat)) return null;
  if (substrings.size === 0) return null;
  const allowList = [...substrings];
  // Return the same allow-list for url_literal + fetch_call + route_decl —
  // any of those categories may be the underlying line in the file.
  return {
    url_literal: allowList,
    fetch_call: allowList,
    axios_call: allowList,
    route_decl: allowList,
  };
}

function severityRank(value) {
  const s = String(value ?? '').toLowerCase();
  if (s === 'critical') return 4;
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low') return 1;
  return 0;
}

function isRootCauseCategory(value) {
  const s = String(value ?? '').toLowerCase();
  return s.includes('401')
    || s.includes('network')
    || s.includes('console')
    || s.includes('runtime')
    || s.includes('auth')
    || s.includes('modal')
    || s.includes('dead-card')
    || s.includes('broken');
}

function extractRouteLiterals(text) {
  if (typeof text !== 'string') return new Set();
  const out = new Set();
  const re = /(?:navigate\(\s*|href=|to=|window\.location(?:\.href)?\s*=|['"`])(['"`])(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]{2,})\1/g;
  let m;
  while ((m = re.exec(text))) {
    const route = m[2];
    if (route && !route.startsWith('//')) out.add(route);
  }
  return out;
}

function routeChangeAllowed(issue) {
  const cat = String(issue?.category ?? '').toLowerCase();
  const blob = [
    issue?.title,
    issue?.issue,
    issue?.description,
    issue?.evidence,
    issue?.location,
    issue?.fix,
  ].filter(Boolean).join(' ').toLowerCase();
  return (cat.includes('broken-link') || cat.includes('404') || cat.includes('route'))
    && /(broken|404|not found|dead link|route)/.test(blob);
}

function detectsDiagnosticSuppression(before, after) {
  if (typeof before !== 'string' || typeof after !== 'string') return false;
  const beforeErrors = (before.match(/\bconsole\.error\s*\(/g) ?? []).length;
  const afterErrors = (after.match(/\bconsole\.error\s*\(/g) ?? []).length;
  const beforeWarns = (before.match(/\bconsole\.warn\s*\(/g) ?? []).length;
  const afterWarns = (after.match(/\bconsole\.warn\s*\(/g) ?? []).length;
  if (afterErrors < beforeErrors && afterWarns > beforeWarns) return true;
  if (/ErrorBoundary|error boundary|caught error/i.test(before + after)
      && afterErrors < beforeErrors) return true;
  return false;
}

function detectsAuthGateEscalation(before, after) {
  if (typeof before !== 'string' || typeof after !== 'string') return false;
  return /\brequiresAuth\s*:\s*false\b/.test(before)
    && /\brequiresAuth\s*:\s*true\b/.test(after);
}

const PLATFORM_BOUNDARY_PATTERNS = Object.freeze([
  {
    id: 'base44_client',
    reason: 'base44_client_internal',
    test: (path) => path === 'src/api/base44Client.js',
  },
  {
    id: 'base44_sdk_internal',
    reason: 'base44_sdk_internal',
    test: (path) => path.startsWith('node_modules/@base44/')
      || path.startsWith('@base44/')
      || path.includes('/@base44/')
      || path.startsWith('base44/')
      || path.includes('/base44/sdk/'),
  },
]);

export async function isMigrationModeExecutionEnabled(env = process.env) {
  return getMigrationModeFlag({ env });
}

function normalizeRepoPath(path) {
  if (typeof path !== 'string') return '';
  return path.replace(/\\/g, '/').replace(/^\.?\//, '').trim();
}

function classifyPlatformBoundaryChange({ filePath, before = null, after = null } = {}) {
  const normalized = normalizeRepoPath(filePath);
  for (const pattern of PLATFORM_BOUNDARY_PATTERNS) {
    if (pattern.test(normalized)) {
      return Object.freeze({
        blocked: true,
        classification: 'PLATFORM_BOUNDARY_BLOCKED',
        reason: pattern.reason,
        policy: pattern.id,
        filePath: normalized,
        detail: 'FlowAI must not patch Base44/platform internals; route this to platform governance instead of branch creation.',
      });
    }
  }
  if (
    typeof before === 'string'
    && typeof after === 'string'
    && before !== after
    && (/\brequiresAuth\s*:/.test(before) || /\brequiresAuth\s*:/.test(after))
  ) {
    return Object.freeze({
      blocked: true,
      classification: 'PLATFORM_BOUNDARY_BLOCKED',
      reason: 'requiresAuth_change',
      policy: 'requiresAuth',
      filePath: normalized,
      detail: 'requiresAuth changes alter platform auth boundaries and require explicit operator governance.',
    });
  }
  return Object.freeze({ blocked: false, filePath: normalized });
}

function filterPlatformBoundaryFindings(items = [], { pathSelector } = {}) {
  const allowed = [];
  const blocked = [];
  const getPath = typeof pathSelector === 'function'
    ? pathSelector
    : (item) => item?.filePath ?? item?.path;
  for (const item of Array.isArray(items) ? items : []) {
    const filePath = getPath(item);
    const verdict = classifyPlatformBoundaryChange({ filePath });
    if (verdict.blocked) {
      blocked.push({
        filePath: verdict.filePath,
        classification: verdict.classification,
        reason: verdict.reason,
        detail: verdict.detail,
        title: item?.title ?? item?.issue ?? item?.category ?? null,
        severity: item?.severity ?? null,
        category: item?.category ?? null,
      });
    } else {
      allowed.push(item);
    }
  }
  return { allowed, blocked };
}

function isPrimaryRootCauseIssue(issue, prioritizedIssues = []) {
  if (!issue || !Array.isArray(prioritizedIssues) || prioritizedIssues[0] !== issue) return false;
  return severityRank(issue?.severity) >= 3
    || isRootCauseCategory(issue?.category)
    || isRootCauseCategory(issue?.title)
    || isRootCauseCategory(issue?.issue);
}

function isGenerateFixTimeoutError(error) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? error ?? '');
  return code === 'GENERATE_FIX_TIMEOUT'
    || /generateFix exceeded \d+ms/i.test(message)
    || /GENERATE_FIX_TIMEOUT/i.test(message);
}

function enrichFindingUrlContext(finding = {}, { fallbackUrl = null } = {}) {
  if (!finding || typeof finding !== 'object') return finding;
  const existingUrl = finding.failingUrl
    || finding.pageUrl
    || finding.url
    || finding.locationUrl
    || (/^https?:\/\//i.test(String(finding.location ?? '')) ? finding.location : null)
    || fallbackUrl
    || null;
  if (!existingUrl) return finding;
  return {
    ...finding,
    failingUrl: finding.failingUrl ?? existingUrl,
    pageUrl: finding.pageUrl ?? existingUrl,
    url: finding.url ?? existingUrl,
  };
}

function evaluateRepairIntegrity({
  fileChanges = [],
  fixOutcomes = [],
  prioritizedIssues = [],
  originalContentByPath = new Map(),
} = {}) {
  const filesIn = fileChanges.length;
  const rejected = [];
  const rejectedPaths = new Set();
  const acceptedOutcomes = (Array.isArray(fixOutcomes) ? fixOutcomes : [])
    .filter((o) => o?.status === 'accepted');
  const outcomeByPath = new Map(acceptedOutcomes.map((o) => [o.filePath, o]));

  const topIssue = Array.isArray(prioritizedIssues) ? prioritizedIssues[0] : null;
  const topPath = topIssue?.filePath || null;
  const topOutcome = topPath
    ? (Array.isArray(fixOutcomes) ? fixOutcomes : []).find((o) => o?.filePath === topPath)
    : null;
  const topWasRejected = !!topPath && topOutcome?.status === 'rejected';
  const topIsRootCause = severityRank(topIssue?.severity) >= 3 || isRootCauseCategory(topIssue?.category)
    || isRootCauseCategory(topIssue?.title) || isRootCauseCategory(topIssue?.issue);

  if (topWasRejected && topIsRootCause && fileChanges.some((f) => f.filePath !== topPath)) {
    for (const f of fileChanges) {
      if (f.filePath !== topPath) {
        rejectedPaths.add(f.filePath);
        rejected.push({
          filePath: f.filePath,
          reason: 'primary_root_cause_unfixed',
          detail: `Primary issue file ${topPath} was rejected; refusing secondary-only repair bundle.`,
        });
      }
    }
  }

  for (const f of fileChanges) {
    if (!f?.filePath || typeof f.fileContent !== 'string' || rejectedPaths.has(f.filePath)) continue;
    const before = originalContentByPath.get(f.filePath);
    const platformBoundary = classifyPlatformBoundaryChange({
      filePath: f.filePath,
      before,
      after: f.fileContent,
    });
    if (platformBoundary.blocked) {
      rejectedPaths.add(f.filePath);
      rejected.push({
        filePath: f.filePath,
        classification: platformBoundary.classification,
        reason: platformBoundary.reason,
        detail: platformBoundary.detail,
      });
      continue;
    }
    if (detectsDiagnosticSuppression(before, f.fileContent)) {
      rejectedPaths.add(f.filePath);
      rejected.push({
        filePath: f.filePath,
        reason: 'diagnostic_suppression_not_fix',
        detail: 'Patch downgrades/removes error diagnostics without proving the underlying issue is resolved.',
      });
      continue;
    }
    if (detectsAuthGateEscalation(before, f.fileContent)) {
      rejectedPaths.add(f.filePath);
      rejected.push({
        filePath: f.filePath,
        classification: 'PLATFORM_BOUNDARY_BLOCKED',
        reason: 'requiresAuth_change',
        detail: 'Patch changes requiresAuth from false to true; public access/auth-gate changes require explicit operator approval.',
      });
      continue;
    }

    const outcome = outcomeByPath.get(f.filePath);
    const beforeRoutes = extractRouteLiterals(before);
    const afterRoutes = extractRouteLiterals(f.fileContent);
    const removed = [...beforeRoutes].filter((r) => !afterRoutes.has(r));
    const added = [...afterRoutes].filter((r) => !beforeRoutes.has(r));
    if ((removed.length > 0 || added.length > 0) && !routeChangeAllowed(outcome)) {
      rejectedPaths.add(f.filePath);
      rejected.push({
        filePath: f.filePath,
        reason: 'unverified_route_rewrite',
        detail: `Route literals changed without direct broken-route evidence: removed ${removed.join(',') || '-'}; added ${added.join(',') || '-'}.`,
      });
    }
  }

  return {
    filesIn,
    accepted: fileChanges.filter((f) => !rejectedPaths.has(f.filePath)),
    rejected,
  };
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

/**
 * W6 INTEGRATION — STEP 4: CA-18 §2 honest disclosure helper.
 *
 * Returns one entry per CA-18 §2 dimension (10 total). Four are scored
 * end-to-end today using real signal from the Five-Layer + §7.6 gates;
 * the remaining six are explicitly marked
 * `evidence: 'KNOWN_GAP_NOT_IMPLEMENTED'` so the UI banner can refuse
 * silent omission. The §2 rule is hard: no run may pass at 95-perfect
 * when only 4 of 10 dimensions were checked — operators must SEE that.
 *
 * Scored today:
 *   syntax                  — pre-deploy parse gate (DISPATCH 29) rejects
 *                              syntactically-invalid fixes pre-commit.
 *                              Signal: whether the iteration's fix set
 *                              survived parse-check.
 *   duplication             — fix-generator diff_preserve_violation gate
 *                              rejects diffs that introduce
 *                              duplicate-import / duplicate-export.
 *                              Signal: same as syntax (gate-survival).
 *   ui_ux                   — Five-Layer L5 + §7.6 ui/nav findings.
 *   functional_completeness — Five-Layer L1 + Phase B
 *                              dead-card/broken-modal/engine-error counts.
 *
 * Not yet implemented (KNOWN_GAP_NOT_IMPLEMENTED):
 *   bugs_errors_detector, performance, accessibility, security,
 *   privacy_jurisdiction, legal_jurisdiction.
 *
 * @param {object} args
 * @param {object} args.preScoreEnvelope   { total, l1, l2, l4, l5 } shape
 * @param {number|null} args.lastPostScore
 * @param {number|null} args.originalGtmScore
 * @param {number} args.finalGtmScore
 * @param {object|null} args.finalGtmCounts
 * @param {Array} args.iterations
 * @returns {Array<{dimension,scored,scoreBefore,scoreAfter,evidence}>}
 */
/**
 * Mirror of buildDimensionsContributing's scored/not-scored logic, but
 * returns just the count — used by STEP 12's capability-weighted gate
 * which runs BEFORE the full dimensions_contributing array is built.
 *
 * Stable through the run: the 4 always-scored dimensions (syntax,
 * duplication, ui_ux, functional_completeness) plus the 3 evaluator-
 * conditional dimensions (bugs_errors_detector, performance,
 * accessibility) — total floor 4, ceiling 7 for partial coverage,
 * remaining 3 (security, privacy_jurisdiction, legal_jurisdiction)
 * stay KNOWN_GAP_NOT_IMPLEMENTED in v1.
 */
function _countCurrentScoredDimensions(pipelineStats, pipelineErrors) {
  const perEvaluator = pipelineStats?.perEvaluator ?? pipelineStats?.perEvaluatorRaw ?? {};
  const errors = pipelineErrors ?? {};
  const ranLighthouse = Object.prototype.hasOwnProperty.call(perEvaluator, 'lighthouse') && !errors.lighthouse;
  const ranAxe        = Object.prototype.hasOwnProperty.call(perEvaluator, 'axe-core') && !errors['axe-core'];
  const ranRuntime    = Object.prototype.hasOwnProperty.call(perEvaluator, 'runtime-diagnostics') && !errors['runtime-diagnostics'];
  let scored = 4; // syntax, duplication, ui_ux, functional_completeness
  if (ranRuntime) scored += 1;                  // bugs_errors_detector
  if (ranLighthouse) scored += 1;               // performance
  if (ranAxe || ranLighthouse) scored += 1;     // accessibility
  return scored;
}

function buildDimensionsContributing({ preScoreEnvelope, lastPostScore, originalGtmScore, finalGtmScore, finalGtmCounts, iterations, pipelineStats = null, pipelineErrors = null }) {
  const lastIter = Array.isArray(iterations) && iterations.length > 0
    ? iterations[iterations.length - 1] : null;
  // Iteration-level survived-gate signal — if any fix landed in a
  // non-regression iteration, syntax + duplication both passed.
  const fixesSurvived = !!lastIter && !lastIter.regressed && (lastIter.branchName || (Array.isArray(lastIter.steps) && lastIter.steps.some((s) => s.step === 9 && s.status === 'complete')));
  const fiveLayerL1 = typeof preScoreEnvelope?.l1 === 'number' ? preScoreEnvelope.l1 : null;
  const fiveLayerL5 = typeof preScoreEnvelope?.l5 === 'number' ? preScoreEnvelope.l5 : null;
  const fiveLayerFinalTotal = typeof lastPostScore === 'number' ? lastPostScore : null;
  const _critical = finalGtmCounts?.critical ?? null;
  const _high = finalGtmCounts?.high ?? null;

  // PHASE B1 — per-evaluator availability flags from the multi-engine
  // pipeline. An evaluator counts as "ran" only when it returned a
  // numeric finding count for THIS product (no errors entry, present
  // in perEvaluator). The dimension is then upgraded from
  // KNOWN_GAP_NOT_IMPLEMENTED → scored:true with coverage:'partial'.
  const _perEvaluator = pipelineStats?.perEvaluator ?? pipelineStats?.perEvaluatorRaw ?? {};
  const _errors = pipelineErrors ?? {};
  const ranLighthouse = Object.prototype.hasOwnProperty.call(_perEvaluator, 'lighthouse') && !_errors.lighthouse;
  const ranAxe        = Object.prototype.hasOwnProperty.call(_perEvaluator, 'axe-core') && !_errors['axe-core'];
  const ranRuntime    = Object.prototype.hasOwnProperty.call(_perEvaluator, 'runtime-diagnostics') && !_errors['runtime-diagnostics'];
  const cnt = (k) => Number.isFinite(_perEvaluator?.[k]) ? _perEvaluator[k] : null;

  return [
    {
      dimension: 'syntax',
      scored: true,
      coverage: 'partial',
      scoreBefore: null,
      scoreAfter: fixesSurvived ? 1 : 0,
      evidence_source: 'parse-gate',
      evidence: fixesSurvived
        ? 'DISPATCH 29 pre-deploy parse gate passed for committed files'
        : 'No fixes reached commit — parse gate not exercised this run',
    },
    {
      dimension: 'duplication',
      scored: true,
      coverage: 'partial',
      scoreBefore: null,
      scoreAfter: fixesSurvived ? 1 : 0,
      evidence_source: 'diff-preserve-gate',
      evidence: fixesSurvived
        ? 'fixGenerator diff_preserve_violation gate passed for committed diffs'
        : 'No fixes reached commit — diff_preserve gate not exercised this run',
    },
    {
      dimension: 'ui_ux',
      scored: true,
      coverage: 'partial',
      scoreBefore: fiveLayerL5,
      scoreAfter: fiveLayerL5,
      // PHASE B1: Lighthouse SEO audits map to ui_ux per the dimension
      // mapping in lighthouseEvaluator.js. When Lighthouse ran, we add
      // it as an additional evidence source for ui_ux.
      evidence_source: ranLighthouse ? 'five-layer-L5+lighthouse-seo' : 'five-layer-L5',
      evidence: `Five-Layer L5 (UI/UX) signal + §7.6 GTM Readiness composite (final ${finalGtmScore?.toFixed?.(1) ?? finalGtmScore}/100, critical=${_critical ?? 'n/a'})`
        + (ranLighthouse ? ` + Lighthouse SEO audits (${cnt('lighthouse')} total findings across categories)` : ''),
    },
    {
      dimension: 'functional_completeness',
      scored: true,
      coverage: 'partial',
      scoreBefore: fiveLayerL1,
      scoreAfter: fiveLayerL1,
      evidence_source: ranRuntime ? 'five-layer-L1+phase-b+runtime-network' : 'five-layer-L1+phase-b',
      evidence: `Five-Layer L1 (Functionality) + Phase B dead-card/broken-modal/engine-error findings (high=${_high ?? 'n/a'})`
        + (ranRuntime ? ` + runtime network-failure capture (${cnt('runtime-diagnostics')} runtime findings)` : ''),
    },
    // ── PHASE B1 — newly partial-coverage dimensions ────────────────────────────
    ranRuntime
      ? {
          dimension: 'bugs_errors_detector',
          scored: true,
          coverage: 'partial',
          scoreBefore: null,
          scoreAfter: null,
          evidence_source: 'runtime-diagnostics',
          evidence: `runtimeDiagnostics console.error + pageerror capture (${cnt('runtime-diagnostics')} findings)`
            + (ranLighthouse ? '; Lighthouse best-practices audits supplement.' : ''),
        }
      : {
          dimension: 'bugs_errors_detector',
          scored: false,
          coverage: 'none',
          scoreBefore: null,
          scoreAfter: null,
          evidence_source: null,
          evidence: 'KNOWN_GAP_NOT_IMPLEMENTED',
        },
    ranLighthouse
      ? {
          dimension: 'performance',
          scored: true,
          coverage: 'partial',
          scoreBefore: null,
          scoreAfter: null,
          evidence_source: 'lighthouse',
          evidence: `Lighthouse performance audits (subset of ${cnt('lighthouse')} total Lighthouse findings)`,
        }
      : {
          dimension: 'performance',
          scored: false,
          coverage: 'none',
          scoreBefore: null,
          scoreAfter: null,
          evidence_source: null,
          evidence: 'KNOWN_GAP_NOT_IMPLEMENTED',
        },
    (ranAxe || ranLighthouse)
      ? {
          dimension: 'accessibility',
          scored: true,
          coverage: 'partial',
          scoreBefore: null,
          scoreAfter: null,
          evidence_source: ranAxe && ranLighthouse ? 'axe-core+lighthouse' : (ranAxe ? 'axe-core' : 'lighthouse'),
          evidence: (ranAxe ? `axe-core deterministic violations (${cnt('axe-core')} findings)` : '')
            + (ranAxe && ranLighthouse ? '; ' : '')
            + (ranLighthouse ? 'Lighthouse accessibility audits' : ''),
        }
      : {
          dimension: 'accessibility',
          scored: false,
          coverage: 'none',
          scoreBefore: null,
          scoreAfter: null,
          evidence_source: null,
          evidence: 'KNOWN_GAP_NOT_IMPLEMENTED',
        },
    // ── Remaining 3 dimensions stay KNOWN_GAP_NOT_IMPLEMENTED per CA-18 §2 ─
    {
      dimension: 'security',
      scored: false,
      coverage: 'none',
      scoreBefore: null,
      scoreAfter: null,
      evidence_source: null,
      evidence: 'KNOWN_GAP_NOT_IMPLEMENTED',
    },
    {
      dimension: 'privacy_jurisdiction',
      scored: false,
      coverage: 'none',
      scoreBefore: null,
      scoreAfter: null,
      evidence_source: null,
      evidence: 'KNOWN_GAP_NOT_IMPLEMENTED',
    },
    {
      dimension: 'legal_jurisdiction',
      scored: false,
      coverage: 'none',
      scoreBefore: null,
      scoreAfter: null,
      evidence_source: null,
      evidence: 'KNOWN_GAP_NOT_IMPLEMENTED',
    },
  ];
}

function latestMeasuredScore({ orchestrationLog = [], iterations = [] } = {}) {
  for (let i = iterations.length - 1; i >= 0; i -= 1) {
    const iter = iterations[i];
    const score = iter?.postScore ?? iter?.preScore;
    if (typeof score === 'number' && Number.isFinite(score)) return score;
  }
  for (let i = orchestrationLog.length - 1; i >= 0; i -= 1) {
    const result = orchestrationLog[i]?.result;
    const score = result?.gtmScore
      ?? result?.postScore
      ?? result?.preScore
      ?? result?.fiveLayerInternal
      ?? result?.bundleScore
      ?? result?.baselineScore;
    if (typeof score === 'number' && Number.isFinite(score)) return score;
  }
  return 0;
}

function buildFailureReturn({ runId, mode, product, orchestrationLog, iterations, failedStep, error, code, diagnostics, failureArtifact }) {
  const measuredScore = latestMeasuredScore({ orchestrationLog, iterations });
  const safeDiagnostics = pickSafeDiagnosticFields(diagnostics);
  return Object.freeze({
    ok: false,
    gtmReady: false,
    exitReason: 'STEP_FAILED',
    originalScore: measuredScore, finalScore: measuredScore, totalDelta: 0,
    rawScore: measuredScore,
    effectiveTrustScore: measuredScore,
    partial: measuredScore > 0,
    iterationsCompleted: iterations.length,
    previewUrl: null, prUrl: null, prNumber: null,
    orchestrationLog, iterations,
    product, runId, mode,
    failedStep, error, code,
    ...safeDiagnostics,
    failureArtifact: failureArtifact ?? null,
  });
}

export const __internals = Object.freeze({
  STEP_NAMES,
  makeStepLog,
  computeProgress,
  firstNonEmptyString,
  resolveDeliveredUpgradeUrl,
  resolveProductUpgradeFallback,
  buildUpgradeDeliveryEnvelope,
  siteSizeFromCrawl,
  buildPipelineEffortProfile,
  latestMeasuredScore,
  discoverProduct,
  productIdFromRegisteredConfig,
  synthesizeOperatorConnectedProduct,
  effectiveRateCapForRun,
  resolveGithubOperatorToken,
  derivePrioritizedIssuesFromScore,
  classifyPlatformBoundaryChange,
  filterPlatformBoundaryFindings,
  evaluateRepairIntegrity,
  prioritizeIssuesWithClaude,
  fetchRepoFileList,
  probeGithubOperatorRepoAccess,
  buildPrBody,
  OrchestrationState,
});
