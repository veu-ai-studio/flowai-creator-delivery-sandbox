/**
 * Intelligent Monitoring — anomaly detection + AI-powered insights
 * Analyzes run/job/error trends and returns alerts + recommendations
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Gather data in parallel
    const [runs, jobs, errors, deployments] = await Promise.all([
      base44.asServiceRole.entities.Run.list('-created_date', 100),
      base44.asServiceRole.entities.Job.list('-created_date', 50),
      base44.asServiceRole.entities.ErrorLog.list('-created_date', 50),
      base44.asServiceRole.entities.Deployment.list('-created_date', 20),
    ]);

    // --- Anomaly Detection ---
    const alerts = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // 1. High failure rate
    const recentRuns = runs.filter(r => now - new Date(r.created_date).getTime() < oneHour * 6);
    const failRate = recentRuns.length > 0 ? recentRuns.filter(r => r.status === 'failed').length / recentRuns.length : 0;
    if (failRate > 0.3) alerts.push({ type: 'anomaly', severity: 'high', message: `High run failure rate: ${Math.round(failRate * 100)}% in last 6h`, metric: 'run_failure_rate', value: failRate });

    // 2. Job queue backlog
    const queuedJobs = jobs.filter(j => j.status === 'queued');
    if (queuedJobs.length > 5) alerts.push({ type: 'anomaly', severity: 'medium', message: `Job queue backlog: ${queuedJobs.length} jobs pending`, metric: 'queue_depth', value: queuedJobs.length });

    // 3. Critical errors spike
    const recentCritical = errors.filter(e => e.severity === 'critical' && now - new Date(e.created_date).getTime() < oneHour);
    if (recentCritical.length > 2) alerts.push({ type: 'anomaly', severity: 'critical', message: `${recentCritical.length} critical errors in last hour`, metric: 'critical_errors', value: recentCritical.length });

    // 4. No runs in 24h
    const recentAny = runs.filter(r => now - new Date(r.created_date).getTime() < oneHour * 24);
    if (recentAny.length === 0 && runs.length > 0) alerts.push({ type: 'info', severity: 'low', message: 'No pipeline runs in last 24 hours', metric: 'run_inactivity', value: 0 });

    // --- Trend Analysis ---
    const last7days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now - i * 24 * oneHour);
      const dayStr = day.toISOString().slice(0, 10);
      const dayRuns = runs.filter(r => r.created_date?.startsWith(dayStr));
      return {
        date: dayStr,
        runs: dayRuns.length,
        success: dayRuns.filter(r => r.status === 'success').length,
        failed: dayRuns.filter(r => r.status === 'failed').length,
        avg_duration: dayRuns.length > 0 ? Math.round(dayRuns.reduce((a, r) => a + (r.duration_ms || 0), 0) / dayRuns.length) : 0,
      };
    }).reverse();

    // --- AI Insights ---
    const insightPrompt = `Analyze these system metrics and give 3-5 actionable insights:
- Total runs: ${runs.length} (${runs.filter(r => r.status === 'success').length} success, ${runs.filter(r => r.status === 'failed').length} failed)
- Active jobs: ${jobs.filter(j => j.status === 'running').length} running, ${queuedJobs.length} queued
- Errors: ${errors.filter(e => e.severity === 'critical').length} critical, ${errors.filter(e => e.severity === 'high').length} high
- Deployments: ${deployments.filter(d => d.status === 'live').length} live
- Alerts: ${alerts.map(a => a.message).join('; ') || 'none'}
Return JSON: { "health_score": number (0-100), "insights": [{ "title": string, "description": string, "action": string, "priority": "critical"|"high"|"medium"|"low" }] }`;

    const aiInsights = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: insightPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          health_score: { type: 'number' },
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                action: { type: 'string' },
                priority: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      health_score: aiInsights.health_score || 75,
      alerts,
      insights: aiInsights.insights || [],
      trends: last7days,
      summary: {
        total_runs: runs.length,
        success_rate: runs.length > 0 ? Math.round((runs.filter(r => r.status === 'success').length / runs.length) * 100) : 0,
        active_jobs: jobs.filter(j => j.status === 'running').length,
        queued_jobs: queuedJobs.length,
        live_deployments: deployments.filter(d => d.status === 'live').length,
        critical_errors: errors.filter(e => e.severity === 'critical').length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});