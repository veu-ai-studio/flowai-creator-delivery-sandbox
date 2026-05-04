import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * applyImprovement — Phase 6 Controlled Application
 *
 * Safely records a user-approved improvement as applied.
 * Does NOT auto-rewrite core system — logs the action for audit trail.
 *
 * POST body: { improvement_id, improvement_title, category, action: "apply" | "dismiss" }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { improvement_id, improvement_title, category, action = 'apply', notes = '' } = body;

    if (!improvement_id || !action) {
      return Response.json({ error: 'improvement_id and action are required' }, { status: 400 });
    }

    // Log to ToolMetrics as an "improvement" event for audit trail
    await base44.entities.ToolMetrics.create({
      tool_id: `improvement_${improvement_id}`,
      tool_name: improvement_title || improvement_id,
      capability: category || 'configuration',
      success: action === 'apply',
      latency_ms: 0,
      cost_usd: 0,
      task_type: `improvement_${action}`,
      error_message: action === 'dismiss' ? 'Dismissed by user' : null,
      user_email: user.email,
    });

    return Response.json({
      status: 'success',
      action,
      improvement_id,
      message: action === 'apply'
        ? `Improvement "${improvement_title}" marked as applied. Monitor ToolMetrics for impact.`
        : `Improvement "${improvement_title}" dismissed.`,
      applied_by: user.email,
      applied_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[applyImprovement] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});