import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * recordToolMetric — Phase 5 Data Collection
 *
 * Records a single tool usage event into ToolMetrics.
 * Called by the frontend after each tool invocation.
 *
 * POST body: { tool_id, tool_name, capability, success, latency_ms, cost_usd, error_message, task_type, run_id }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { tool_id, tool_name, capability, success, latency_ms, cost_usd, error_message, task_type, run_id } = body;

    if (!tool_id || !capability) {
      return Response.json({ error: 'tool_id and capability are required' }, { status: 400 });
    }

    const record = await base44.entities.ToolMetrics.create({
      tool_id,
      tool_name: tool_name || tool_id,
      capability,
      success: Boolean(success),
      latency_ms: latency_ms || 0,
      cost_usd: cost_usd || 0,
      error_message: error_message || null,
      task_type: task_type || 'unknown',
      run_id: run_id || null,
      user_email: user.email,
    });

    return Response.json({ status: 'recorded', id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});