import { createClient } from '@supabase/supabase-js';
import { kv } from '@vercel/kv';
import { FLOWAI_MACRO_STEPS } from '../src/lib/flowaiRunStore.js';
import * as ledger from '../api/_lib/operationalRuns.js';

const runId = process.env.FLOWAI_GOLDEN_RUN_ID || '';
const assert = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { code }); };
assert(/^run_[a-z0-9]+$/.test(runId), 'GOLDEN_RUN_ID_REQUIRED');
assert(process.env.SUPABASE_URL === 'https://rsulqkfweaxrhuzjhjrs.supabase.co', 'STAGING_REF_MISMATCH');

const owner = { orgId: 'org_flowai_nonprod_golden', userId: 'user_flowai_nonprod_golden' };
const otherTenant = { orgId: 'org_flowai_nonprod_golden_other', userId: owner.userId };
const run = await ledger.getOperationalRun(runId, owner);
assert(run?.status === 'completed', 'RUN_NOT_COMPLETED');
assert(run?.verdict === 'NOT_CLEARED', 'CLEARANCE_TRUTH_MISMATCH');
assert(await ledger.getOperationalRun(runId, otherTenant) === null, 'TENANT_ISOLATION_FAILED');

const stepResults = run.stepResults || {};
assert(FLOWAI_MACRO_STEPS.every((step) => stepResults[step]?.artifacts?.some((artifact) => artifact?.id && artifact?.fingerprint)), 'EIGHT_STAGE_ARTIFACTS_NOT_RETAINED');
const allArtifacts = Object.values(stepResults).flatMap((step) => step?.artifacts || []);
const branch = allArtifacts.find((artifact) => typeof artifact?.path === 'string' && artifact.path.startsWith('flowai/renewal-run_'))?.path;
const deployment = allArtifacts.find((artifact) => artifact?.kind === 'flowai.deploy.stage_evidence.v1' && /^https:\/\//.test(artifact?.url || ''));
assert(branch, 'CONTROLLED_BRANCH_MISSING');
assert(deployment?.id && deployment?.url, 'DEPLOY_ARTIFACT_MISSING');
const response = await fetch(deployment.url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
const html = await response.text();
assert(response.status >= 200 && response.status < 400, 'PREVIEW_NOT_BROWSER_ACCESSIBLE');
assert(html.includes(branch), 'PREVIEW_BRANCH_PROVENANCE_MISSING');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: registry, error } = await supabase.from('product_registry')
  .select('self_renewal_enabled,self_renewal_disabled')
  .eq('product_id', 'flowai').eq('org_id', 'veu-ai-studio').eq('environment', 'stg').maybeSingle();
assert(!error && registry?.self_renewal_enabled === false && registry?.self_renewal_disabled === true, 'STAGING_FLAGS_NOT_RESTORED');

await ledger.updateOperationalRun(runId, owner, {
  branchCreated: branch,
  upgradedUrl: deployment.url,
  upgradeDeployStatus: 'preview_deployed',
});
const evidenceId = `flowai-nonprod-golden-evidence-${runId}`;
const evidence = {
  evidenceId,
  runId,
  environment: 'staging',
  supabaseProjectRef: 'rsulqkfweaxrhuzjhjrs',
  branch,
  deploymentId: deployment.id,
  previewUrl: deployment.url,
  previewStatus: response.status,
  verdict: run.verdict,
  stageArtifacts: Object.fromEntries(FLOWAI_MACRO_STEPS.map((step) => [step, stepResults[step].artifacts])),
  assertions: {
    eightStageArtifacts: true,
    durableHistory: true,
    tenantIsolation: true,
    clearanceFirst: true,
    controlledBranch: true,
    browserAccessiblePreview: true,
    stagingFlagsRestored: true,
    productionPromotionAuthorized: false,
    productionTouched: false,
  },
  retainedAt: new Date().toISOString(),
};
await kv.set(`flowai-proof:${evidenceId}`, evidence, { ex: 30 * 24 * 60 * 60 });
const retained = await kv.get(`flowai-proof:${evidenceId}`);
assert(retained?.evidenceId === evidenceId, 'EVIDENCE_NOT_RETAINED');
console.log(JSON.stringify({ ok: true, evidenceId, runId, branch, deploymentId: deployment.id, previewUrl: deployment.url, verdict: run.verdict, assertions: evidence.assertions }));
