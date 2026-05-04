import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * seedToolMetrics — Phase 5 Verification
 *
 * Seeds ToolMetrics with realistic pipeline run data across all tool categories.
 * Simulates 5 full pipeline runs: generateCode → deploy → verify → audit → fix
 *
 * Admin only.
 */

const PIPELINE_RUNS = [
  // Run 1 — ChatGPT succeeds fast, Vercel slow, Replit fine
  {
    run_id: 'run-001',
    metrics: [
      { tool_id: 'chatgpt', tool_name: 'ChatGPT (GPT-4o)', capability: 'reasoning', success: true,  latency_ms: 4200, cost_usd: 0.0082, task_type: 'code_generation' },
      { tool_id: 'vercel',  tool_name: 'Vercel',            capability: 'deployment', success: true,  latency_ms: 38000, cost_usd: 0.0010, task_type: 'deploy' },
      { tool_id: 'base44',  tool_name: 'Base44 Audit',      capability: 'auditing',   success: true,  latency_ms: 1100, cost_usd: 0.0020, task_type: 'audit' },
      { tool_id: 'playwright', tool_name: 'Playwright',     capability: 'crawling',   success: true,  latency_ms: 3200, cost_usd: 0.0010, task_type: 'crawl' },
      { tool_id: 'chatgpt', tool_name: 'ChatGPT (GPT-4o)', capability: 'reasoning',  success: true,  latency_ms: 5800, cost_usd: 0.0095, task_type: 'fix_generation' },
    ],
  },
  // Run 2 — ChatGPT times out, Claude fallback succeeds
  {
    run_id: 'run-002',
    metrics: [
      { tool_id: 'chatgpt', tool_name: 'ChatGPT (GPT-4o)', capability: 'reasoning', success: false, latency_ms: 30000, cost_usd: 0.0040, task_type: 'code_generation', error_message: 'Request timeout after 30s' },
      { tool_id: 'claude',  tool_name: 'Claude (Sonnet)',   capability: 'reasoning', success: true,  latency_ms: 3100, cost_usd: 0.0031, task_type: 'code_generation' },
      { tool_id: 'vercel',  tool_name: 'Vercel',            capability: 'deployment', success: true,  latency_ms: 42000, cost_usd: 0.0010, task_type: 'deploy' },
      { tool_id: 'base44',  tool_name: 'Base44 Audit',      capability: 'auditing',   success: true,  latency_ms: 980,  cost_usd: 0.0020, task_type: 'audit' },
      { tool_id: 'playwright', tool_name: 'Playwright',     capability: 'crawling',   success: false, latency_ms: 15000, cost_usd: 0.0005, task_type: 'crawl', error_message: 'Page load timeout' },
      { tool_id: 'puppeteer', tool_name: 'Puppeteer',       capability: 'crawling',   success: true,  latency_ms: 4100, cost_usd: 0.0008, task_type: 'crawl' },
    ],
  },
  // Run 3 — Clean run, all succeed, Vercel fast
  {
    run_id: 'run-003',
    metrics: [
      { tool_id: 'chatgpt', tool_name: 'ChatGPT (GPT-4o)', capability: 'reasoning', success: true,  latency_ms: 3800, cost_usd: 0.0078, task_type: 'code_generation' },
      { tool_id: 'vercel',  tool_name: 'Vercel',            capability: 'deployment', success: true,  latency_ms: 28000, cost_usd: 0.0010, task_type: 'deploy' },
      { tool_id: 'base44',  tool_name: 'Base44 Audit',      capability: 'auditing',   success: true,  latency_ms: 1240, cost_usd: 0.0020, task_type: 'audit' },
      { tool_id: 'playwright', tool_name: 'Playwright',     capability: 'crawling',   success: true,  latency_ms: 2900, cost_usd: 0.0010, task_type: 'crawl' },
      { tool_id: 'chatgpt', tool_name: 'ChatGPT (GPT-4o)', capability: 'reasoning',  success: true,  latency_ms: 6200, cost_usd: 0.0110, task_type: 'fix_generation' },
    ],
  },
  // Run 4 — Vercel fails, Netlify used as fallback
  {
    run_id: 'run-004',
    metrics: [
      { tool_id: 'claude',   tool_name: 'Claude (Sonnet)',  capability: 'reasoning',  success: true,  latency_ms: 2900, cost_usd: 0.0029, task_type: 'code_generation' },
      { tool_id: 'vercel',   tool_name: 'Vercel',           capability: 'deployment', success: false, latency_ms: 90000, cost_usd: 0.0005, task_type: 'deploy', error_message: 'Build timed out at 90s' },
      { tool_id: 'netlify',  tool_name: 'Netlify',          capability: 'deployment', success: true,  latency_ms: 22000, cost_usd: 0.0008, task_type: 'deploy' },
      { tool_id: 'base44',   tool_name: 'Base44 Audit',     capability: 'auditing',   success: true,  latency_ms: 1050, cost_usd: 0.0020, task_type: 'audit' },
      { tool_id: 'puppeteer', tool_name: 'Puppeteer',       capability: 'crawling',   success: true,  latency_ms: 3800, cost_usd: 0.0008, task_type: 'crawl' },
    ],
  },
  // Run 5 — Both ChatGPT and Claude used (A/B comparison), Vercel succeeds
  {
    run_id: 'run-005',
    metrics: [
      { tool_id: 'chatgpt',    tool_name: 'ChatGPT (GPT-4o)', capability: 'reasoning', success: true,  latency_ms: 4500, cost_usd: 0.0091, task_type: 'code_generation' },
      { tool_id: 'claude',     tool_name: 'Claude (Sonnet)',   capability: 'reasoning', success: true,  latency_ms: 2700, cost_usd: 0.0028, task_type: 'code_generation' },
      { tool_id: 'vercel',     tool_name: 'Vercel',            capability: 'deployment', success: true, latency_ms: 31000, cost_usd: 0.0010, task_type: 'deploy' },
      { tool_id: 'railway',    tool_name: 'Railway',           capability: 'deployment', success: true, latency_ms: 19000, cost_usd: 0.0015, task_type: 'deploy' },
      { tool_id: 'replit',     tool_name: 'Replit',            capability: 'execution', success: true,  latency_ms: 8000, cost_usd: 0.0020, task_type: 'execute' },
      { tool_id: 'codesandbox', tool_name: 'CodeSandbox',      capability: 'execution', success: false, latency_ms: 12000, cost_usd: 0.0010, task_type: 'execute', error_message: 'Sandbox boot failed' },
      { tool_id: 'base44',     tool_name: 'Base44 Audit',      capability: 'auditing',  success: true,  latency_ms: 1320, cost_usd: 0.0020, task_type: 'audit' },
      { tool_id: 'playwright', tool_name: 'Playwright',        capability: 'crawling',  success: true,  latency_ms: 3100, cost_usd: 0.0010, task_type: 'crawl' },
    ],
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const clearFirst = body.clear === true;

    // Optionally clear existing metrics
    if (clearFirst) {
      const existing = await base44.asServiceRole.entities.ToolMetrics.list('-created_date', 500);
      for (const m of existing) {
        await base44.asServiceRole.entities.ToolMetrics.delete(m.id);
      }
      console.log(`[seedToolMetrics] cleared ${existing.length} existing records`);
    }

    const created = [];
    for (const run of PIPELINE_RUNS) {
      for (const metric of run.metrics) {
        const record = await base44.asServiceRole.entities.ToolMetrics.create({
          ...metric,
          run_id: run.run_id,
          user_email: user.email,
        });
        created.push({ id: record.id, tool_id: metric.tool_id, run_id: run.run_id });
      }
    }

    // Summary stats
    const byTool = {};
    for (const m of created) {
      if (!byTool[m.tool_id]) byTool[m.tool_id] = 0;
      byTool[m.tool_id]++;
    }

    return Response.json({
      status: 'success',
      records_created: created.length,
      runs_simulated: PIPELINE_RUNS.length,
      by_tool: byTool,
      message: `Seeded ${created.length} ToolMetrics records across ${PIPELINE_RUNS.length} pipeline runs`,
    });

  } catch (error) {
    console.error('[seedToolMetrics] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});