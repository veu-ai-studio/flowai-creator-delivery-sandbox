import { MODES } from '../tools/ToolIntelligenceService.js';
import { runAudit } from './auditRunner.js';
import { runBuild } from './buildRunner.js';
import { runDeploy } from './deployRunner.js';
import { runDesign } from './designRunner.js';
import { runGtm } from './gtmRunner.js';
import { runMonitor } from './monitorRunner.js';
import { runRenewal } from './renewalRunner.js';
import { runResearch } from './researchRunner.js';

const STEP_ORDER = Object.freeze([
  'research',
  'design',
  'build',
  'qa_audit',
  'deploy',
  'self_renewal',
  'gtm',
  'monitor',
]);

function cleanString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function defaultManualInputs(fixture = {}) {
  const target = cleanString(fixture.targetCustomer, 'global digital product operators');
  const productName = cleanString(fixture.productName, fixture.productId);
  const objective = cleanString(fixture.objective, `Improve ${productName} through the FlowAI eight-step loop.`);
  return {
    research: {
      'target-customer': target,
      'market-gaps': { complete: true, verified: true, findings: [`${target} need clearer operational proof.`] },
      'regulatory-requirements': { complete: true, verified: true, frameworks: fixture.frameworks ?? ['general web compliance'] },
      'regulatory-jurisdiction': { complete: true, verified: true, jurisdictions: fixture.jurisdictions ?? ['global'] },
      'competitive-landscape': { complete: true, verified: true, summary: `${productName} differentiation grounded in observed product context.` },
      'next-priorities': { complete: true, verified: true, priorities: [objective] },
    },
    design: {
      'feature-priorities': [{ complete: true, verified: true, priority: objective }],
      'user-flows': [{ complete: true, verified: true, flow: 'operator submits URL, reviews evidence, approves gated actions' }],
      'technical-requirements': [{ complete: true, verified: true, requirement: 'preserve product-agnostic adapters and ProductSSOT evidence writes' }],
      'design-decision-log': ['MINIMUM BUILD DIRECTIVE: implement only product-agnostic contracts for this reference run.'],
    },
    build: {
      'build-decision-log': ['Authorized reference vertical-slice build proof without product-specific runtime code paths.'],
    },
    audit: {
      'audit-decision-log': ['Quality Audit accepts the generated reference-slice evidence for Tier B behavior only.'],
    },
    deploy: {
      operatorApproved: true,
      approvedBy: 'authorized-operator',
      browserProof: {
        status: 'PASS',
        evidence: 'Reference fixture delivery artifact resolves in test adapter.',
      },
    },
    renewal: {
      operatorApproved: true,
      approvedBy: 'authorized-operator',
      verificationEvidence: {
        status: 'GUIDANCE_ONLY',
        evidence: 'No mutation needed for reference slice.',
      },
    },
    gtm: {
      humanDecision: 'Authorized operator recorded GTM decision for reference vertical slice.',
      approvedBy: 'authorized-operator',
    },
  };
}

function makeToolService() {
  const rowsByStep = new Map(STEP_ORDER.map((stepKey) => [stepKey, [
    {
      step_name: stepKey,
      rank: 1,
      platform_name: `flowai-${stepKey}-adapter`,
      platform_type: stepKey === 'build' ? 'code-patch' : 'orchestra',
      performance_score: 9,
      cost_score: 8,
      speed_score: 8,
      reliability_score: 9,
      target_classes: ['generic_url', 'web', 'saas'],
      last_updated: '2026-06-04T00:00:00.000Z',
    },
    {
      step_name: stepKey,
      rank: 2,
      platform_name: `fallback-${stepKey}-adapter`,
      platform_type: 'orchestra',
      performance_score: 7,
      cost_score: 7,
      speed_score: 7,
      reliability_score: 7,
      target_classes: ['generic_url', 'web', 'saas'],
      last_updated: '2026-06-04T00:00:00.000Z',
    },
  ]]));

  return {
    async getTopTool(stepKey, _targetClass, mode) {
      const rows = rowsByStep.get(stepKey) ?? [];
      if (mode === MODES.MANUAL) return null;
      if (mode === MODES.GUIDED) return rows;
      return rows[0] ?? null;
    },
  };
}

async function dispatch(action, payload = {}) {
  if (action === 'code-patch') {
    return {
      ok: true,
      action,
      member: 'flowai-code-patch-adapter',
      data: {
        filePath: payload.filePath ?? 'src/App.jsx',
        patchedContent: 'export function referenceVerticalSlice(){ return "ready"; }',
        rationale: 'Reference vertical slice generated concrete patch evidence for build-step scoring.',
        usage: { input_tokens: 10, output_tokens: 10 },
      },
    };
  }
  return {
    ok: true,
    action,
    member: `flowai-${action}-adapter`,
    data: {
      summary: `${action} completed for reference vertical slice`,
      findings: ['reference evidence produced'],
      evidenceRef: `reference://${action}`,
      usage: { input_tokens: 10, output_tokens: 10 },
    },
  };
}

function targetClassFor(fixture = {}) {
  return cleanString(fixture.targetClass, 'generic_url');
}

function deliveryUrlFor(fixture = {}) {
  return cleanString(fixture.deliveryUrl, cleanString(fixture.url, 'https://example.com'));
}

function statusFor(outputs = {}) {
  return {
    research: outputs.research?.readyForDesign === true,
    design: outputs.design?.readyForBuild === true,
    build: outputs.build?.readyForQualityAudit === true,
    qa_audit: outputs.audit?.readyForDeploy === true,
    deploy: outputs.deploy?.readyForSelfRenewal === true,
    self_renewal: outputs.renewal?.readyForGtm === true,
    gtm: outputs.gtm?.readyForMonitor === true,
    monitor: outputs.monitor?.loopClosed === true,
  };
}

export async function runReferenceVerticalSlice(fixture = {}, opts = {}) {
  const productId = cleanString(fixture.productId, 'reference-product');
  const productName = cleanString(fixture.productName, productId);
  const url = cleanString(fixture.url, 'https://example.com');
  const runId = cleanString(opts.runId, `vertical-${productId}`);
  const toolService = opts.toolService ?? makeToolService();
  const manual = { ...defaultManualInputs(fixture), ...(opts.manualInputs ?? {}) };
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'flowai-reference-test-key';

  try {
    const common = {
      runId,
      toolService,
      dispatch: opts.dispatch ?? dispatch,
      productContext: {
        id: productId,
        name: productName,
        description: fixture.description ?? '',
        platform: targetClassFor(fixture),
        targetClass: targetClassFor(fixture),
        url,
      },
    };

    const research = await runResearch(productId, manual.research, {
      ...common,
      url,
      toolIntelligenceMode: MODES.GUIDED,
    });
    const design = await runDesign(productId, research, manual.design, {
      ...common,
      toolIntelligenceMode: MODES.GUIDED,
    });
    const build = await runBuild(productId, design, manual.build, {
      ...common,
      toolIntelligenceMode: MODES.AUTOMATIC,
      sourceContent: 'export function existingReferenceSurface(){ return "current"; }',
      targetFilePath: 'src/referenceVerticalSlice.js',
    });
    const audit = await runAudit(productId, build, manual.audit, {
      ...common,
      toolIntelligenceMode: MODES.GUIDED,
      researchOutput: research,
      designOutput: design,
      productGoals: [fixture.objective ?? 'complete reference vertical slice'],
    });
    const deploy = await runDeploy(productId, audit, manual.deploy, {
      targetClass: targetClassFor(fixture),
      productContext: common.productContext,
      existingDeployment: {
        outputUrl: deliveryUrlFor(fixture),
        deploymentId: `${productId}-reference-deployment`,
        commitSha: fixture.commitSha ?? 'reference-head',
        environment: 'preview',
      },
    });
    const renewal = await runRenewal(productId, deploy, manual.renewal, {
      runId,
      agent: opts.agent ?? {
        async recommend() {
          return {
            agent_id: 3,
            agent_name: 'Self-Renewal',
            authority: 'recommend_only',
            recommendation: 'No safe mutation required for reference vertical slice.',
            renewal_flags: [],
            confidence: 0.95,
            metadata: { ok: true },
          };
        },
      },
    });
    const gtm = await runGtm(productId, {
      productId,
      productName,
      productContext: common.productContext,
      targetClass: targetClassFor(fixture),
      deployOutput: deploy,
      renewalOutput: renewal,
      userObjectives: [fixture.objective ?? 'launch reference product safely'],
      issues: [],
    }, manual.gtm);
    const monitor = await runMonitor(productId, {
      outputUrl: deploy.outputUrl,
      deploymentId: deploy.deploymentId,
      targetClass: targetClassFor(fixture),
      deployOutput: deploy,
      gtmOutput: gtm,
      distribution: deploy.distribution,
    }, {}, {
      monitorAdapter: opts.monitorAdapter ?? (async ({ outputUrl }) => ({
        ok: true,
        status: 'healthy',
        statusCode: 200,
        latencyMs: 42,
        evidence: `Checked ${outputUrl}`,
      })),
    });

    const outputs = { research, design, build, audit, deploy, renewal, gtm, monitor };
    const stepStatus = statusFor(outputs);
    const completedSteps = STEP_ORDER.filter((stepKey) => stepStatus[stepKey]);
    return Object.freeze({
      productId,
      productName,
      targetClass: targetClassFor(fixture),
      runId,
      stepOrder: STEP_ORDER,
      completedSteps,
      allStepsComplete: completedSteps.length === STEP_ORDER.length,
      stepStatus,
      outputs: Object.freeze(outputs),
      proof: Object.freeze({
        label: 'UNIT',
        evidenceTier: 'B',
        verifiedMovement: false,
        productAgnosticContracts: true,
      }),
    });
  } finally {
    if (!originalAnthropicKey) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  }
}

export async function runReferenceVerticalSlices(fixtures = [], opts = {}) {
  const results = [];
  for (const fixture of fixtures) {
    results.push(await runReferenceVerticalSlice(fixture, opts));
  }
  return Object.freeze({
    fixtureCount: results.length,
    allComplete: results.length > 0 && results.every((result) => result.allStepsComplete === true),
    results: Object.freeze(results),
  });
}

export const __internals = Object.freeze({
  STEP_ORDER,
  defaultManualInputs,
  makeToolService,
  statusFor,
});
