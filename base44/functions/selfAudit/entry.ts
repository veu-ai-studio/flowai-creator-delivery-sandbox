import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * selfAudit — Phase 6 Self-Upgrade Engine
 *
 * Analyzes ToolMetrics + pipeline data to:
 *   1. Compute pipeline success rate + latency trends
 *   2. Detect weaknesses (underperformers, recurring failures)
 *   3. Generate actionable improvement suggestions via LLM
 *   4. Return a structured report for UI display
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── 1. Fetch raw data ─────────────────────────────────────────────────
    const [metrics, deployments] = await Promise.all([
      base44.asServiceRole.entities.ToolMetrics.list('-created_date', 200),
      base44.asServiceRole.entities.Deployment.list('-created_date', 50),
    ]);

    if (metrics.length === 0) {
      return Response.json({ error: 'No ToolMetrics data found. Run pipelines first.' }, { status: 400 });
    }

    // ── 2. Aggregate stats per tool ───────────────────────────────────────
    // Filter out meta-records (improvement applications, dismissals) — they are audit events, not tool ops
    const pipelineMetrics = metrics.filter(m => !m.tool_id.startsWith('improvement_'));

    // Snapshot BEFORE any improvements were applied: metrics before the earliest applied improvement
    const appliedImprovementMetrics = metrics.filter(m => m.tool_id.startsWith('improvement_') && m.success);
    const firstImprovementDate = appliedImprovementMetrics.length > 0
      ? appliedImprovementMetrics.map(m => new Date(m.created_date)).sort((a, b) => a - b)[0]
      : null;

    const metricsBeforeImprovement = firstImprovementDate
      ? pipelineMetrics.filter(m => new Date(m.created_date) < firstImprovementDate)
      : pipelineMetrics;
    const metricsAfterImprovement = firstImprovementDate
      ? pipelineMetrics.filter(m => new Date(m.created_date) >= firstImprovementDate)
      : [];

    const toolStats = {};
    for (const m of pipelineMetrics) {
      const id = m.tool_id;
      if (!toolStats[id]) {
        toolStats[id] = {
          tool_id: id,
          tool_name: m.tool_name,
          capability: m.capability,
          total: 0,
          successes: 0,
          failures: 0,
          total_latency: 0,
          total_cost: 0,
          errors: [],
        };
      }
      toolStats[id].total++;
      if (m.success) toolStats[id].successes++;
      else {
        toolStats[id].failures++;
        if (m.error_message) toolStats[id].errors.push(m.error_message);
      }
      toolStats[id].total_latency += m.latency_ms || 0;
      toolStats[id].total_cost += m.cost_usd || 0;
    }

    // Compute derived stats
    const toolList = Object.values(toolStats).map(t => ({
      ...t,
      success_rate: t.total > 0 ? Math.round((t.successes / t.total) * 100) : 0,
      avg_latency_ms: t.total > 0 ? Math.round(t.total_latency / t.total) : 0,
      avg_cost_usd: t.total > 0 ? Math.round((t.total_cost / t.total) * 10000) / 10000 : 0,
      unique_errors: [...new Set(t.errors)].slice(0, 3),
    }));

    // ── 3. Pipeline-level stats ───────────────────────────────────────────
    const totalRuns = pipelineMetrics.length;
    const totalSuccesses = pipelineMetrics.filter(m => m.success).length;
    const overallSuccessRate = totalRuns > 0 ? Math.round((totalSuccesses / totalRuns) * 100) : 0;

    const deploySuccess = deployments.filter(d => d.status === 'live').length;
    const deployTotal = deployments.length;
    const deploySuccessRate = deployTotal > 0 ? Math.round((deploySuccess / deployTotal) * 100) : 0;

    // Latency trend: compare recent 20 vs older 20
    const recent = pipelineMetrics.slice(0, 20);
    const older = pipelineMetrics.slice(20, 40);
    const recentAvgLatency = recent.length > 0
      ? Math.round(recent.reduce((s, m) => s + (m.latency_ms || 0), 0) / recent.length)
      : 0;
    const olderAvgLatency = older.length > 0
      ? Math.round(older.reduce((s, m) => s + (m.latency_ms || 0), 0) / older.length)
      : 0;
    const latencyTrend = olderAvgLatency > 0
      ? Math.round(((recentAvgLatency - olderAvgLatency) / olderAvgLatency) * 100)
      : 0;

    // ── 4. Weakness Detection ─────────────────────────────────────────────
    const weaknesses = [];

    for (const tool of toolList) {
      if (tool.total < 2) continue; // need enough data

      if (tool.success_rate < 70) {
        weaknesses.push({
          type: 'high_failure_rate',
          severity: tool.success_rate < 50 ? 'critical' : 'warning',
          tool_id: tool.tool_id,
          tool_name: tool.tool_name,
          capability: tool.capability,
          detail: `${tool.tool_name} has ${tool.success_rate}% success rate (${tool.failures}/${tool.total} failures)`,
          errors: tool.unique_errors,
        });
      }

      if (tool.avg_latency_ms > 30000) {
        weaknesses.push({
          type: 'high_latency',
          severity: tool.avg_latency_ms > 60000 ? 'critical' : 'warning',
          tool_id: tool.tool_id,
          tool_name: tool.tool_name,
          capability: tool.capability,
          detail: `${tool.tool_name} avg latency is ${(tool.avg_latency_ms / 1000).toFixed(1)}s — exceeds 30s threshold`,
        });
      }
    }

    if (latencyTrend > 20) {
      weaknesses.push({
        type: 'latency_regression',
        severity: 'warning',
        tool_id: 'pipeline',
        tool_name: 'Pipeline',
        capability: 'system',
        detail: `Overall pipeline latency increased ${latencyTrend}% in recent runs vs older runs`,
      });
    }

    if (deploySuccessRate < 80 && deployTotal >= 3) {
      weaknesses.push({
        type: 'deployment_reliability',
        severity: 'critical',
        tool_id: 'vercel',
        tool_name: 'Vercel',
        capability: 'deployment',
        detail: `Deployment success rate is only ${deploySuccessRate}% (${deploySuccess}/${deployTotal} live)`,
      });
    }

    // ── 5. LLM-generated improvements ────────────────────────────────────
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    let improvements = [];
    let executiveSummary = '';

    if (OPENAI_API_KEY) {
      const systemPrompt = `You are a senior platform engineer analyzing a FlowAI orchestration system.
You will receive performance data and detected weaknesses, then generate concrete improvement suggestions.

Return a JSON object with this structure:
{
  "improvements": [
    {
      "id": "unique_id",
      "title": "Short improvement title",
      "category": "tool_selection | configuration | architecture | monitoring",
      "priority": "high | medium | low",
      "weakness_addressed": "which weakness this fixes",
      "suggestion": "Detailed actionable improvement description",
      "expected_impact": "What will improve and by how much",
      "implementation": "How to apply this improvement (safe, user-controlled steps)",
      "risk": "low | medium | high"
    }
  ],
  "executive_summary": "2-3 sentence summary of system health and top priority actions"
}`;

      const userPrompt = `FlowAI Performance Report:

Overall success rate: ${overallSuccessRate}%
Deployment success rate: ${deploySuccessRate}%
Total metric records: ${totalRuns}
Latency trend (recent vs older): ${latencyTrend > 0 ? '+' : ''}${latencyTrend}%
Recent avg latency: ${(recentAvgLatency / 1000).toFixed(1)}s

Tool-level stats:
${toolList.map(t => `- ${t.tool_name} (${t.capability}): ${t.success_rate}% success, avg ${(t.avg_latency_ms/1000).toFixed(1)}s, avg $${t.avg_cost_usd}/op, ${t.total} runs`).join('\n')}

Detected weaknesses:
${weaknesses.length === 0 ? 'None detected' : weaknesses.map(w => `- [${w.severity.toUpperCase()}] ${w.detail}`).join('\n')}

Generate 3-6 concrete, actionable improvements. Focus on the most impactful changes first.`;

      const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.3,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        }),
      });

      if (llmRes.ok) {
        const llmData = await llmRes.json();
        const raw = llmData.choices?.[0]?.message?.content || '{}';
        try {
          const parsed = JSON.parse(raw);
          improvements = parsed.improvements || [];
          executiveSummary = parsed.executive_summary || '';
        } catch {}
      }
    }

    // Fallback rule-based improvements if LLM unavailable
    if (improvements.length === 0) {
      for (const w of weaknesses) {
        if (w.type === 'high_failure_rate') {
          improvements.push({
            id: `fix_${w.tool_id}`,
            title: `Switch primary ${w.capability} tool away from ${w.tool_name}`,
            category: 'tool_selection',
            priority: w.severity === 'critical' ? 'high' : 'medium',
            weakness_addressed: w.detail,
            suggestion: `${w.tool_name} has a ${100 - (weaknesses.find(x => x.tool_id === w.tool_id)?.success_rate || 0)}% failure rate. Consider switching to a higher-performing alternative for ${w.capability} tasks.`,
            expected_impact: 'Reduce failure rate by 30-50%',
            implementation: 'Update decision engine priority weights in the Platform Intelligence page',
            risk: 'low',
          });
        }
        if (w.type === 'high_latency') {
          improvements.push({
            id: `latency_${w.tool_id}`,
            title: `Optimize ${w.tool_name} timeout and retry strategy`,
            category: 'configuration',
            priority: 'medium',
            weakness_addressed: w.detail,
            suggestion: `Add a 25s timeout + 2 retries before falling back to an alternative ${w.capability} provider.`,
            expected_impact: 'Reduce p95 latency by 40%',
            implementation: 'Add timeout configuration to the deployment function',
            risk: 'low',
          });
        }
      }
    }

    // ── 6. Before/After Comparison ────────────────────────────────────────
    let beforeAfter = null;
    if (firstImprovementDate && metricsBeforeImprovement.length > 0 && metricsAfterImprovement.length > 0) {
      const beforeSuccess = metricsBeforeImprovement.filter(m => m.success).length;
      const afterSuccess = metricsAfterImprovement.filter(m => m.success).length;
      const beforeRate = Math.round((beforeSuccess / metricsBeforeImprovement.length) * 100);
      const afterRate = Math.round((afterSuccess / metricsAfterImprovement.length) * 100);
      const beforeLatency = Math.round(metricsBeforeImprovement.reduce((s, m) => s + (m.latency_ms || 0), 0) / metricsBeforeImprovement.length);
      const afterLatency = Math.round(metricsAfterImprovement.reduce((s, m) => s + (m.latency_ms || 0), 0) / metricsAfterImprovement.length);

      beforeAfter = {
        improvement_applied_at: firstImprovementDate.toISOString(),
        applied_improvements: appliedImprovementMetrics.map(m => ({ title: m.tool_name, applied_at: m.created_date })),
        before: {
          total_ops: metricsBeforeImprovement.length,
          success_rate: beforeRate,
          avg_latency_ms: beforeLatency,
        },
        after: {
          total_ops: metricsAfterImprovement.length,
          success_rate: afterRate,
          avg_latency_ms: afterLatency,
        },
        delta: {
          success_rate_change: afterRate - beforeRate,
          latency_change_ms: afterLatency - beforeLatency,
          improved: afterRate >= beforeRate || afterLatency <= beforeLatency,
        },
      };
    }

    const report = {
      generated_at: new Date().toISOString(),
      pipeline_stats: {
        total_metric_records: totalRuns,
        overall_success_rate: overallSuccessRate,
        deployment_success_rate: deploySuccessRate,
        recent_avg_latency_ms: recentAvgLatency,
        latency_trend_pct: latencyTrend,
      },
      tool_stats: toolList,
      weaknesses,
      improvements,
      before_after: beforeAfter,
      applied_improvements_count: appliedImprovementMetrics.length,
      executive_summary: executiveSummary || `FlowAI has processed ${totalRuns} tool invocations with ${overallSuccessRate}% success rate. ${weaknesses.length} weaknesses detected. ${improvements.length} improvements available.${appliedImprovementMetrics.length > 0 ? ` ${appliedImprovementMetrics.length} improvement(s) applied.` : ''}`,
    };

    console.log(`[selfAudit] done — ${weaknesses.length} weaknesses, ${improvements.length} improvements`);
    return Response.json(report);

  } catch (error) {
    console.error('[selfAudit] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});