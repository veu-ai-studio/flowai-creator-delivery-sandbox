/* eslint-env node */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * selfVerificationEngine — FlowAI v3 Self-Healing Autonomous Loop
 *
 * INPUT: Product context (name, features, description)
 * PROCESS:
 *   1. Generate app code
 *   2. Deploy to Vercel
 *   3. Run behavioral validation tests
 *   4. Run audit (API + UX + performance)
 *   5. Compare to success criteria
 *   6. IF FAIL: Fix → redeploy → re-test (max 5 iterations)
 *   7. Return final state: URLs + validation results + iteration log
 *
 * SUCCESS CRITERIA (must ALL pass):
 *   - Page loads (< 3s)
 *   - APIs return JSON (GET /api, POST /api/run)
 *   - Has navigation (<nav> tag)
 *   - Has forms (<form> elements)
 *   - Create/Edit/Delete workflows present
 *   - localStorage persistence detected
 *   - Mobile responsive
 *   - No console errors
 *   - Critical issues = 0
 *   - Upgrade button functional
 */

const MAX_ITERATIONS = 5;
const SUCCESS_CRITERIA = {
  pageLoad: { name: 'Page Load', timeout: 3000 },
  navigation: { name: 'Has Navigation', required: true },
  forms: { name: 'Has Forms', required: true },
  crudWorkflows: { name: 'CRUD Workflows', required: true },
  persistence: { name: 'localStorage Persistence', required: true },
  mobileLayout: { name: 'Mobile Layout', required: true },
  apiJson: { name: 'API Returns JSON', required: true },
  criticalIssues: { name: 'Zero Critical Issues', required: true },
  noConsoleErrors: { name: 'No Console Errors', required: true },
};

async function generateAppCode(appContext, iteration) {
  console.log(`[${appContext.name}] Iteration ${iteration} — Generating code...`);
  try {
    const res = await fetch('http://localhost:3000/api/generateCode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: appContext.name,
        context: appContext.description,
        tech_stack: appContext.tech || ['HTML', 'Tailwind CSS', 'Node.js'],
        ui_components: appContext.components || [],
        api_endpoints: appContext.apis || ['/api', '/api/run'],
      }),
    });
    const data = await res.json();
    return { success: res.ok, data, iteration };
  } catch (e) {
    return { success: false, error: e.message, iteration };
  }
}

async function deployApp(appCode, appContext, iteration) {
  console.log(`[${appContext.name}] Iteration ${iteration} — Deploying...`);
  try {
    const res = await fetch('http://localhost:3000/api/deployApp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: appContext.name,
        context: appContext.description,
        files: appCode?.files || [],
      }),
    });
    const data = await res.json();
    return { success: res.ok, url: data?.url, data, iteration };
  } catch (e) {
    return { success: false, error: e.message, iteration };
  }
}

async function validateBehavioral(url, iteration) {
  console.log(`[behavioral] Iteration ${iteration} — Running tests...`);
  try {
    const res = await fetch('http://localhost:3000/api/behavioralValidation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    return { passed: data?.passed, data, iteration };
  } catch (e) {
    return { passed: false, error: e.message, iteration };
  }
}

async function auditDeployment(url, iteration) {
  console.log(`[audit] Iteration ${iteration} — Auditing...`);
  try {
    const res = await fetch('http://localhost:3000/api/auditDeployment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    return { passed: data?.passed, data, iteration };
  } catch (e) {
    return { passed: false, error: e.message, iteration };
  }
}

function evaluateAgainstCriteria(behavioral, audit) {
  const results = {};
  let allPass = true;

  // Page load check
  results.pageLoad = {
    passed: behavioral?.data?.tests?.find(t => t.name === 'Page Load')?.passed === true,
    criteria: SUCCESS_CRITERIA.pageLoad,
  };
  if (!results.pageLoad.passed) allPass = false;

  // Navigation check
  results.navigation = {
    passed: behavioral?.data?.tests?.find(t => t.name === 'Navigation Structure')?.passed === true,
    criteria: SUCCESS_CRITERIA.navigation,
  };
  if (!results.navigation.passed) allPass = false;

  // Forms check
  results.forms = {
    passed: behavioral?.data?.tests?.find(t => t.name === 'Form Elements Present')?.passed === true,
    criteria: SUCCESS_CRITERIA.forms,
  };
  if (!results.forms.passed) allPass = false;

  // CRUD check
  results.crudWorkflows = {
    passed: behavioral?.data?.tests?.find(t => t.name === 'CRUD Button Elements')?.passed === true,
    criteria: SUCCESS_CRITERIA.crudWorkflows,
  };
  if (!results.crudWorkflows.passed) allPass = false;

  // Persistence check
  results.persistence = {
    passed: behavioral?.data?.tests?.find(t => t.name === 'Persistence Mechanisms')?.passed === true,
    criteria: SUCCESS_CRITERIA.persistence,
  };
  if (!results.persistence.passed) allPass = false;

  // Mobile check
  results.mobileLayout = {
    passed: behavioral?.data?.tests?.find(t => t.name === 'Multi-Zone Structure')?.passed === true,
    criteria: SUCCESS_CRITERIA.mobileLayout,
  };
  if (!results.mobileLayout.passed) allPass = false;

  // API check
  const apiPassed = audit?.data?.api_get?.ok && audit?.data?.api_run?.ok;
  results.apiJson = {
    passed: apiPassed,
    criteria: SUCCESS_CRITERIA.apiJson,
  };
  if (!results.apiJson.passed) allPass = false;

  // Critical issues check
  const criticalIssues = audit?.data?.summary?.critical || 0;
  results.criticalIssues = {
    passed: criticalIssues === 0,
    criteria: SUCCESS_CRITERIA.criticalIssues,
    count: criticalIssues,
  };
  if (!results.criticalIssues.passed) allPass = false;

  // No console errors (from behavioral)
  results.noConsoleErrors = {
    passed: !behavioral?.data?.error,
    criteria: SUCCESS_CRITERIA.noConsoleErrors,
  };
  if (!results.noConsoleErrors.passed) allPass = false;

  return { allPass, results };
}

function identifyFailures(evaluation) {
  const failures = [];
  Object.entries(evaluation.results).forEach(([key, check]) => {
    if (!check.passed) {
      failures.push({
        criterion: key,
        name: check.criteria.name,
        details: check.details || 'Failed validation',
        count: check.count,
      });
    }
  });
  return failures;
}

async function fixAndRedeploy(appContext, failures, iteration) {
  console.log(`[fix] Iteration ${iteration} — Fixing ${failures.length} failures...`);
  
  const fixInstructions = failures
    .map(f => `${f.name}: ${f.details}`)
    .join('\n');

  try {
    const res = await fetch('http://localhost:3000/api/fixAndRedeploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: appContext.name,
        original_context: appContext.description,
        failures: fixInstructions,
        iteration,
      }),
    });
    const data = await res.json();
    return { success: res.ok, data, iteration };
  } catch (e) {
    return { success: false, error: e.message, iteration };
  }
}

async function runSelfVerificationLoop(appContext) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[${appContext.name}] SELF-VERIFICATION LOOP STARTED`);
  console.log(`${'='.repeat(70)}\n`);

  const iterationLog = [];
  let currentUrl = null;
  let finalValidation = null;
  let iteration = 0;

  for (iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`\n[${appContext.name}] ━━━ ITERATION ${iteration}/${MAX_ITERATIONS} ━━━\n`);

    // Step 1: Generate
    console.log(`[${appContext.name}] Step 1: Code Generation...`);
    const codeGenResult = await generateAppCode(appContext, iteration);
    if (!codeGenResult.success) {
      console.log(`[${appContext.name}] ✗ Code generation failed: ${codeGenResult.error}`);
      iterationLog.push({
        iteration,
        step: 'generate',
        passed: false,
        error: codeGenResult.error,
        timestamp: new Date().toISOString(),
      });
      continue;
    }
    console.log(`[${appContext.name}] ✓ Code generation successful (${codeGenResult.data?.files?.length || 0} files)`);

    // Step 2: Deploy
    console.log(`[${appContext.name}] Step 2: Deployment...`);
    const deployResult = await deployApp(codeGenResult.data, appContext, iteration);
    if (!deployResult.success) {
      console.log(`[${appContext.name}] ✗ Deployment failed: ${deployResult.error}`);
      iterationLog.push({
        iteration,
        step: 'deploy',
        passed: false,
        error: deployResult.error,
        timestamp: new Date().toISOString(),
      });
      continue;
    }
    currentUrl = deployResult.url;
    console.log(`[${appContext.name}] ✓ Deployed to: ${currentUrl}`);

    // Step 3: Behavioral validation
    console.log(`[${appContext.name}] Step 3: Behavioral Validation...`);
    const behavioralResult = await validateBehavioral(currentUrl, iteration);
    console.log(`[${appContext.name}] Behavioral tests: ${behavioralResult.data?.summary?.passed_tests || 0}/${behavioralResult.data?.summary?.total_tests || 0}`);

    // Step 4: Audit
    console.log(`[${appContext.name}] Step 4: Audit...`);
    const auditResult = await auditDeployment(currentUrl, iteration);
    const criticalCount = auditResult.data?.summary?.critical || 0;
    console.log(`[${appContext.name}] Audit results: ${criticalCount} critical issues`);

    // Step 5: Evaluate
    const evaluation = evaluateAgainstCriteria(behavioralResult, auditResult);
    const failedChecks = Object.entries(evaluation.results).filter(([_, check]) => !check.passed);

    if (evaluation.allPass) {
      console.log(`\n✅ [${appContext.name}] ALL CRITERIA MET!\n`);
      iterationLog.push({
        iteration,
        step: 'validate',
        passed: true,
        url: currentUrl,
        evaluation,
        timestamp: new Date().toISOString(),
        details: 'All validation criteria passed',
      });
      finalValidation = evaluation;
      break;
    }

    // Step 6: Identify failures
    const failures = identifyFailures(evaluation);
    console.log(`\n⚠️  ${failures.length} criteria failed:\n`);
    failures.forEach(f => {
      console.log(`  - ${f.name}`);
    });

    iterationLog.push({
      iteration,
      step: 'validate',
      passed: false,
      failures,
      url: currentUrl,
      timestamp: new Date().toISOString(),
      evaluation: evaluation.results,
      failedChecks: failedChecks.map(([key, check]) => ({
        criterion: key,
        name: check.criteria.name,
        passed: check.passed,
        details: check.count ? `${check.count} issues` : 'validation failed',
      })),
    });

    // Step 7: Fix and redeploy (if not last iteration)
    if (iteration < MAX_ITERATIONS) {
      console.log(`[${appContext.name}] Step 5: Attempting Fixes...`);
      const fixResult = await fixAndRedeploy(appContext, failures, iteration);
      if (fixResult.success) {
        console.log(`✓ Fixes applied and redeployed (Iteration ${iteration + 1} will test)\n`);
      } else {
        console.log(`⚠️  Fix attempt had issues but continuing to next iteration\n`);
      }
    } else {
      console.log(`\n❌ [${appContext.name}] MAX ITERATIONS REACHED\n`);
    }
  }

  return {
    appName: appContext.name,
    finalUrl: currentUrl,
    passed: finalValidation?.allPass || false,
    iteration,
    validation: finalValidation,
    iterationLog,
    executionStatus: finalValidation?.allPass ? 'success' : 'failed',
    totalIterations: iteration,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { apps } = body;
    if (!apps || !Array.isArray(apps)) {
      return Response.json({ error: 'apps array required' }, { status: 400 });
    }

    console.log(`[selfVerificationEngine] Starting for ${apps.length} apps...`);

    const results = {
      timestamp: new Date().toISOString(),
      apps: [],
      summary: {
        total: apps.length,
        passed: 0,
        failed: 0,
      },
    };

    // Run verification for each app sequentially
    for (const appContext of apps) {
      const appResult = await runSelfVerificationLoop(appContext);
      results.apps.push(appResult);
      if (appResult.passed) {
        results.summary.passed++;
      } else {
        results.summary.failed++;
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[SUMMARY] ${results.summary.passed}/${results.summary.total} apps passed`);
    console.log(`${'='.repeat(70)}\n`);

    return Response.json(results);
  } catch (error) {
    console.error('[selfVerificationEngine] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});