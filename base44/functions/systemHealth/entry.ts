/**
 * Monitoring — System Health endpoint
 * Returns recent errors, job stats, run stats, usage counts.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      // Non-admins get only their own stats
    }

    const isAdmin = user.role === 'admin';

    const [recentErrors, recentRuns, recentJobs, deployments] = await Promise.all([
      base44.asServiceRole.entities.ErrorLog.list('-created_date', 20),
      isAdmin
        ? base44.asServiceRole.entities.Run.list('-created_date', 50)
        : base44.asServiceRole.entities.Run.filter({ user_email: user.email }, '-created_date', 20),
      base44.asServiceRole.entities.Job.list('-created_date', 20),
      base44.asServiceRole.entities.Deployment.list('-created_date', 10),
    ]);

    const runStats = {
      total: recentRuns.length,
      success: recentRuns.filter(r => r.status === 'success').length,
      failed: recentRuns.filter(r => r.status === 'failed').length,
      running: recentRuns.filter(r => r.status === 'running').length,
    };

    const jobStats = {
      total: recentJobs.length,
      queued: recentJobs.filter(j => j.status === 'queued').length,
      running: recentJobs.filter(j => j.status === 'running').length,
      done: recentJobs.filter(j => j.status === 'done').length,
      failed: recentJobs.filter(j => j.status === 'failed').length,
    };

    const errorsBySeverity = {
      critical: recentErrors.filter(e => e.severity === 'critical').length,
      high: recentErrors.filter(e => e.severity === 'high').length,
      medium: recentErrors.filter(e => e.severity === 'medium').length,
      low: recentErrors.filter(e => e.severity === 'low').length,
    };

    return Response.json({
      status: recentErrors.filter(e => e.severity === 'critical').length > 0 ? 'degraded' : 'healthy',
      run_stats: runStats,
      job_stats: jobStats,
      error_stats: errorsBySeverity,
      recent_errors: recentErrors.slice(0, 5).map(e => ({ source: e.source, message: e.message, severity: e.severity, time: e.created_date })),
      recent_deployments: deployments.slice(0, 5).map(d => ({ slug: d.slug, live_url: d.live_url, status: d.status, time: d.created_date })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});