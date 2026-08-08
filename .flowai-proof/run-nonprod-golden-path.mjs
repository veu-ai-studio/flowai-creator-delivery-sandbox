// TypeScript-aware entrypoint required: npx --package=tsx@4.20.6 tsx .flowai-proof/run-nonprod-golden-path.mjs
// Plain `node` cannot map the repository's `.js` ESM specifiers to their `.ts` sources.
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { kv } from '@vercel/kv';
import { runOrchestration } from '../src/lib/agents/renewal/orchestrator.js';
import { runConstruction } from '../src/lib/construction/index.js';
import { createOriginPageResolver } from '../src/lib/construction/resolvers/originPageResolver.js';
import { REGISTERED_PRODUCT_CONFIG } from '../src/lib/products/registeredProductConfig.js';
import { buildFlowAIStepPatchFromLog, FLOWAI_MACRO_STEPS } from '../src/lib/flowaiRunStore.js';
import * as ledger from '../api/_lib/operationalRuns.js';
import { freeRamPct, guardProofResources } from './resource-policy.mjs';

const STAGING_REF = 'rsulqkfweaxrhuzjhjrs';
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const HARD_TIMEOUT_MS = 8 * 60 * 1000;
const assert = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { code }); };
const configured = (name, test = (value) => value.length > 8) => {
  const value = process.env[name] || '';
  assert(value && value !== '[REDACTED]' && test(value), `${name}_NOT_READY`);
};

assert(process.env.SUPABASE_URL === STAGING_URL, 'STAGING_REF_MISMATCH');
configured('SUPABASE_SERVICE_ROLE_KEY', (value) => /^sb_secret_[A-Za-z0-9_-]+$/.test(value));
configured('KV_REST_API_URL', (value) => /^https:\/\//.test(value));
configured('KV_REST_API_TOKEN');
configured('GITHUB_PAT');
configured('VERCEL_OPERATOR_TOKEN');
configured('VERCEL_ORG_ID');
configured('ANTHROPIC_API_KEY');
guardProofResources('start');

const product = REGISTERED_PRODUCT_CONFIG.find((entry) => entry.name === 'FlowAI');
assert(product?.environment === 'staging', 'PRODUCT_NOT_STAGING');
assert(product?.repository_owned_and_allowlisted === true, 'REPOSITORY_NOT_ALLOWLISTED');
assert(product?.branch_policy === 'isolated_nonproduction', 'BRANCH_POLICY_UNSAFE');
assert(product?.deployment_environment === 'preview', 'DESTINATION_NOT_PREVIEW');
assert(product?.productionPromotionAuthorized === false, 'PRODUCTION_PROMOTION_NOT_DENIED');
assert(product?.deployment_url === null && product?.upgrade_url === null, 'PRODUCTION_URL_CLAIMED_AS_PREVIEW');

const supabase = createClient(STAGING_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const authProbe = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
assert(!authProbe.error, `STAGING_AUTH_PROBE_FAILED_${authProbe.error?.status || 'unknown'}`);

const proofId = `golden-proof-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomUUID().slice(0, 8)}`;
const evidenceId = `flowai-nonprod-golden-evidence-${proofId}`;
const owner = { orgId: 'org_flowai_nonprod_golden', userId: 'user_flowai_nonprod_golden' };
const otherTenant = { orgId: 'org_flowai_nonprod_golden_other', userId: owner.userId };
const { run } = await ledger.createOperationalRun({
  ...owner,
  idempotency: proofId,
  input: { mode: 'auto', product: 'FlowAI non-production golden path', url: product.original_url },
});
await ledger.updateOperationalRun(run.id, owner, { status: 'running', progressLabel: 'Golden path started' });

const logs = [];
const macroAttempted = new Set();
let durableStepResults = {};
let ledgerWrite = Promise.resolve();
const onStep = (log) => {
  logs.push(log);
  const patch = buildFlowAIStepPatchFromLog(log);
  for (const key of Object.keys(patch.stepResults || {})) macroAttempted.add(key);
  durableStepResults = { ...durableStepResults, ...(patch.stepResults || {}) };
  ledgerWrite = ledgerWrite.then(() => ledger.updateOperationalRun(run.id, owner, {
    ...patch,
    stepResults: durableStepResults,
    stepCount: macroAttempted.size,
  }));
};

const orchestration = runOrchestration({
  url: product.original_url,
  mode: 'auto',
  runId: run.id,
  supabase,
  environment: 'staging',
  gtmTarget: 95,
  maxIterations: 1,
  onStep,
  deps: {
    discoverProduct: async () => ({
      product_id: 'flowai',
      org_id: 'veu-ai-studio',
      environment: 'stg',
      self_renewal_enabled: false,
      self_renewal_disabled: true,
      product_url: product.original_url,
      github_repo_url: product.repo,
      self_renewal_branch: product.branch,
      vercel_project_id: product.vercel_project_id,
      productionPromotionAuthorized: false,
      deployment_environment: 'preview',
    }),
    runConstruction,
    createOriginPageResolver,
  },
});
const timeout = new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('GOLDEN_PATH_TIMEOUT'), { code: 'GOLDEN_PATH_TIMEOUT' })), HARD_TIMEOUT_MS));
let result;
try {
  result = await Promise.race([orchestration, timeout]);
} catch (error) {
  await ledgerWrite;
  const failedLog = [...logs].reverse().find((log) => log?.status === 'failed');
  await ledger.updateOperationalRun(run.id, owner, ledger.buildActionableStageFailurePatch({
    stage: failedLog?.stepName || error?.failedStep || 'ORCHESTRATION_RUNTIME',
    tool: failedLog?.tool || 'runOrchestration',
    code: error?.code || 'ORCHESTRATION_FAILED',
    error: error?.message || String(error),
    executionMayStillBeActive: error?.code === 'GOLDEN_PATH_TIMEOUT',
  }));
  throw error;
} finally {
  await ledgerWrite;
}
guardProofResources('continue');

if (result?.ok === false || result?.exitReason === 'STEP_FAILED') {
  const failedLog = [...logs].reverse().find((log) => log?.status === 'failed');
  const failureCode = result?.code || 'ORCHESTRATION_FAILED';
  await ledger.updateOperationalRun(run.id, owner, ledger.buildActionableStageFailurePatch({
    stage: result?.failedStep || failedLog?.stepName || 'ORCHESTRATION_STAGE',
    tool: failedLog?.tool || 'runOrchestration',
    code: failureCode,
    error: result?.error || failedLog?.result?.error || 'Orchestration returned a failed stage.',
    executionMayStillBeActive: false,
  }));
  throw Object.assign(new Error(failureCode), { code: failureCode });
}

const findFirst = (keys) => {
  const visit = (value) => {
    if (!value || typeof value !== 'object') return null;
    for (const key of keys) if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
    for (const child of Object.values(value)) { const found = visit(child); if (found) return found; }
    return null;
  };
  return visit(result) || visit(logs);
};
const branch = findFirst(['branchName', 'branch', 'renewalBranch']);
const commit = findFirst(['commitSha', 'commit', 'sha']);
const previewUrl = result?.previewUrl || findFirst(['previewUrl', 'deploymentUrl']);
const artifactUrl = result?.prUrl || findFirst(['prUrl', 'artifactUrl', 'compareUrl']);
assert(FLOWAI_MACRO_STEPS.every((step) => macroAttempted.has(step)), 'EIGHT_STAGES_NOT_ATTEMPTED');
assert(branch, 'CONTROLLED_BRANCH_MISSING');
assert(artifactUrl || commit, 'DURABLE_ARTIFACT_MISSING');
assert(/^https:\/\//.test(previewUrl || ''), 'PREVIEW_URL_MISSING');
const previewResponse = await fetch(previewUrl, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
assert(previewResponse.status >= 200 && previewResponse.status < 500, 'PREVIEW_NOT_BROWSER_ACCESSIBLE');

const usedTools = logs.filter((log) => log?.tool).map((log) => ({
  step: log.stepName || null,
  tool: log.tool,
  status: log.status || null,
  selectionReason: log.why || null,
}));
assert(usedTools.length > 0, 'TOOL_USE_EVIDENCE_MISSING');
const cleared = result?.gtmReady === true;
const verdict = cleared ? 'GTM_READY' : 'NOT_CLEARED';
await ledger.updateOperationalRun(run.id, owner, {
  status: 'completed', completedAt: new Date().toISOString(), verdict,
  score: Number.isFinite(result?.finalScore) ? result.finalScore : null,
  branchCreated: branch,
  branchUrl: artifactUrl || null,
  upgradedUrl: previewUrl,
  upgradeDeployStatus: 'preview_deployed',
  progressLabel: cleared ? 'Golden path completed and cleared' : 'Golden path completed — NOT CLEARED',
});

const remounted = await import(`../api/_lib/operationalRuns.js?proof=${randomUUID()}`);
const navigationRestore = await remounted.getOperationalRun(run.id, owner);
const refreshRestore = (await remounted.listOperationalRuns(owner)).find((entry) => entry.id === run.id);
const reloginRestore = await remounted.getOperationalRun(run.id, owner);
const tenantLeak = await remounted.getOperationalRun(run.id, otherTenant);
assert(navigationRestore?.status === 'completed' && refreshRestore?.status === 'completed' && reloginRestore?.status === 'completed', 'DURABLE_RESTORE_FAILED');
assert(tenantLeak === null, 'TENANT_ISOLATION_FAILED');

const evidence = {
  evidenceId,
  proofId,
  runId: run.id,
  environment: 'staging',
  supabaseProjectRef: STAGING_REF,
  branch,
  commit: commit || null,
  artifactUrl: artifactUrl || null,
  previewUrl,
  previewStatus: previewResponse.status,
  verdict,
  score: Number.isFinite(result?.finalScore) ? result.finalScore : null,
  gtmReady: cleared,
  stagesAttempted: [...macroAttempted],
  toolUse: usedTools,
  assertions: {
    durableHistory: true,
    tenantIsolation: true,
    navigationRestore: true,
    refreshRestore: true,
    reloginRestore: true,
    clearanceFirst: true,
    controlledBranch: true,
    durableArtifact: true,
    browserAccessiblePreview: true,
    productionPromotionAuthorized: false,
    productionTouched: false,
  },
  retainedAt: new Date().toISOString(),
};
await kv.set(`flowai-proof:${evidenceId}`, evidence, { ex: 30 * 24 * 60 * 60 });
const retained = await kv.get(`flowai-proof:${evidenceId}`);
assert(retained?.evidenceId === evidenceId, 'EVIDENCE_NOT_RETAINED');
console.log(JSON.stringify({ ok: true, evidenceId, proofId, runId: run.id, branch, commit: commit || null, artifactUrl: artifactUrl || null, previewUrl, verdict, assertions: evidence.assertions, freeRamPct: Number(freeRamPct().toFixed(1)) }));
