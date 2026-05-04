/**
 * jobRunners.js — Engine runners that execute independently of page lifecycle.
 * Each runner uses pushJobUpdate so the job panel stays live across navigation.
 */

import { base44 } from '@/api/base44Client';
import { pushJobUpdate } from './JobContext';

// ─── Autopilot Runner ────────────────────────────────────────────────────────

export async function runAutopilotJob(jobId, { apps, mode, maxCostPerRun, maxCostPerApp, onAppDone }) {
  pushJobUpdate(jobId, { status: 'running', progress: 0 });

  const total = apps.length;
  let done = 0;
  const appResults = [];
  let totalCost = 0;
  let totalTokens = 0;

  for (const app of apps) {
    pushJobUpdate(jobId, {
      progress: Math.round((done / total) * 90),
      meta: { currentApp: app.name, done, total },
    });

    try {
      const res = await base44.functions.invoke('runSingleApp', {
        app,
        mode: mode || 'standard',
        maxCostPerApp: maxCostPerApp ? parseFloat(maxCostPerApp) : null,
      });
      const data = res?.data;
      const appResult = data?.error
        ? { appName: app.name, passed: false, error: data.error, iteration: 0, iterationLog: [] }
        : data;

      appResults.push(appResult);
      totalCost += appResult?.appCost || 0;
      totalTokens += appResult?.appTokens || 0;

      if (onAppDone) onAppDone(app.name, appResult);
    } catch (err) {
      appResults.push({ appName: app.name, passed: false, error: err.message, iteration: 0, iterationLog: [] });
    }

    done++;
    pushJobUpdate(jobId, { progress: Math.round((done / total) * 90) });
  }

  const passed = appResults.filter(r => r.passed).length;
  const result = {
    apps: appResults,
    summary: { total, passed, failed: total - passed },
    costs: { totalCostUsd: parseFloat(totalCost.toFixed(6)), totalTokens },
  };

  pushJobUpdate(jobId, {
    status: 'completed',
    progress: 100,
    completedAt: new Date().toISOString(),
    result,
  });

  return result;
}

// ─── Autonomous Engine Runner ─────────────────────────────────────────────────
// NOTE: Full autonomous actions are now managed inline in AutonomousEngine page
// via pushJobUpdate directly. This runner is kept for legacy callers.

export async function runAutonomousJob(jobId) {
  pushJobUpdate(jobId, { status: 'running', progress: 10 });

  const res = await base44.functions.invoke('autonomousEngine', { action: 'scan' });
  const data = res?.data;

  if (data?.error) {
    pushJobUpdate(jobId, {
      status: 'failed',
      error: data.error,
      completedAt: new Date().toISOString(),
      progress: 100,
    });
    return;
  }

  pushJobUpdate(jobId, {
    status: 'completed',
    progress: 100,
    completedAt: new Date().toISOString(),
    result: {
      health_score: data.health_score,
      summary: data.summary,
      all_issues: data.all_issues,
      initialScore: data.initialScore,
      finalScore: data.finalScore,
      improvement: data.improvement,
    },
  });

  return data;
}

// ─── External Upgrade Runner ──────────────────────────────────────────────────

export async function runExternalUpgradeJob(jobId, { targetUrl, userGoal }) {
  pushJobUpdate(jobId, { status: 'running', progress: 5 });

  const steps = [
    { label: 'Detecting intent…',          fn: () => base44.functions.invoke('detectIntent', { url: targetUrl }),            progress: 15 },
    { label: 'Auditing original…',         fn: () => base44.functions.invoke('auditDeployment', { url: targetUrl }),         progress: 35 },
    { label: 'Building improvement plan…', fn: () => null,                                                                    progress: 45 },
    { label: 'Deploying improved version…',fn: () => null,                                                                    progress: 75 },
    { label: 'Verifying…',                 fn: () => null,                                                                    progress: 90 },
  ];

  let intent, auditRes, planRes, deployRes, verifyRes, auditRes2;

  try {
    pushJobUpdate(jobId, { progress: 15, meta: { step: 'Detecting intent…' } });
    intent = (await base44.functions.invoke('detectIntent', { url: targetUrl }))?.data;

    pushJobUpdate(jobId, { progress: 30, meta: { step: 'Auditing original…' } });
    auditRes = (await base44.functions.invoke('auditDeployment', { url: targetUrl }))?.data;

    pushJobUpdate(jobId, { progress: 45, meta: { step: 'Building improvement plan…' } });
    planRes = (await base44.functions.invoke('buildImprovementPlan', { audit: auditRes, intent }))?.data;

    const safeIssues = auditRes?.issues && typeof auditRes.issues === 'object'
      ? Object.entries(auditRes.issues).flatMap(([layer, items]) =>
          Array.isArray(items) ? items.map(i => `${layer}: ${i.description || i}`) : []
        )
      : [];
    const safePlan = Array.isArray(planRes?.plan) ? planRes.plan : [];

    const buildContext = `Product Type: ${intent?.productType}
Original URL: ${targetUrl}
Original Score: ${auditRes?.scores?.overall || 0}/100
Key Issues: ${safeIssues.slice(0, 10).join(', ') || 'None'}
Improvement Plan: ${safePlan.map(p => p.action).join(', ')}
User Goal: ${userGoal || 'Improve overall quality'}`;

    pushJobUpdate(jobId, { progress: 60, meta: { step: 'Generating improved version…' } });
    const codeRes = (await base44.functions.invoke('generateCode', {
      app_name: 'Improved Product',
      context: buildContext,
      tech_stack: ['HTML', 'Tailwind CSS', 'Node.js', 'Express'],
      ui_components: ['Hero', 'Features', 'Call-to-Action'],
      api_endpoints: ['GET /api', 'POST /api/run'],
      intent,
      plan: planRes?.plan,
    }))?.data;

    pushJobUpdate(jobId, { progress: 75, meta: { step: 'Deploying…' } });
    deployRes = (await base44.functions.invoke('deployApp', {
      app_name: 'Improved (Upgraded)',
      context: buildContext,
      files: codeRes?.files || [],
    }))?.data;

    if (!deployRes?.url) throw new Error('Deployment failed — no URL returned');

    pushJobUpdate(jobId, { progress: 85, meta: { step: 'Verifying…' } });
    verifyRes = (await base44.functions.invoke('verifyDeployment', { url: deployRes.url }))?.data;

    pushJobUpdate(jobId, { progress: 93, meta: { step: 'Auditing improved version…' } });
    auditRes2 = (await base44.functions.invoke('auditDeployment', { url: deployRes.url }))?.data;

    pushJobUpdate(jobId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      result: {
        originalAudit: { ...auditRes, url: targetUrl, overall_score: auditRes?.scores?.overall || 0 },
        improvedAudit: { ...auditRes2, url: deployRes.url, overall_score: auditRes2?.scores?.overall || 0 },
        improvedUrl: deployRes.url,
        intent,
        improvementPlan: planRes,
        verifyResult: verifyRes,
      },
    });
  } catch (err) {
    pushJobUpdate(jobId, {
      status: 'failed',
      error: err.message,
      completedAt: new Date().toISOString(),
      progress: 100,
    });
  }
}