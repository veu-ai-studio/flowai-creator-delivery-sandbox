/**
 * Unified API Gateway
 * Handles: /api/research, /api/design, /api/build, /api/deploy
 * Routes to appropriate LLM or deploy logic and persists results.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function logError(base44, source, message, context = {}, userEmail = null) {
  try {
    await base44.asServiceRole.entities.ErrorLog.create({
      user_email: userEmail,
      source,
      message: String(message).slice(0, 1000),
      severity: 'high',
      context,
    });
  } catch (_) { /* silent */ }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user = null;

  try {
    user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { endpoint, input, project_id, extra } = body;

    if (!endpoint || !input) {
      return Response.json({ error: 'Missing endpoint or input' }, { status: 400 });
    }

    // Track usage
    const actionMap = { research: 'research', design: 'run', build: 'build', deploy: 'deploy' };
    await base44.asServiceRole.entities.UsageRecord.create({
      user_email: user.email,
      action: actionMap[endpoint] || 'run',
      plan: user.plan || 'free',
    });

    let result = null;

    if (endpoint === 'research') {
      result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Research this product/idea for a GTM strategy: ${input}. Return key findings, competitors, and opportunities.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            competitors: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            market_size: { type: 'string' },
          },
        },
      });
    } else if (endpoint === 'design') {
      result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Generate a product design spec for: ${input}. Return UX flows, features, and UI recommendations.`,
        response_json_schema: {
          type: 'object',
          properties: {
            product_name: { type: 'string' },
            ux_flows: { type: 'array', items: { type: 'string' } },
            features: { type: 'array', items: { type: 'string' } },
            ui_style: { type: 'string' },
          },
        },
      });
    } else if (endpoint === 'build') {
      result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Generate a complete build plan for: ${input}. Return components, tech stack, and data schema.`,
        response_json_schema: {
          type: 'object',
          properties: {
            ui_components: { type: 'array', items: { type: 'object', properties: { component: { type: 'string' }, description: { type: 'string' } } } },
            tech_stack: { type: 'array', items: { type: 'string' } },
            data_schema: { type: 'array', items: { type: 'object', properties: { table: { type: 'string' }, fields: { type: 'array', items: { type: 'string' } } } } },
            estimated_effort: { type: 'string' },
          },
        },
      });
    } else if (endpoint === 'deploy') {
      // Call the real deploy function internally
      const deployRes = await base44.asServiceRole.functions.invoke('deployApp', {
        app_name: String(input).slice(0, 60),
        context: input,
        ...(extra || {}),
      });
      result = deployRes;
    } else {
      return Response.json({ error: `Unknown endpoint: ${endpoint}` }, { status: 400 });
    }

    // Persist as a Run record
    const run = await base44.asServiceRole.entities.Run.create({
      user_email: user.email,
      project_id: project_id || null,
      type: endpoint === 'research' ? 'research' : endpoint === 'design' ? 'design' : endpoint === 'build' ? 'build' : 'deploy',
      status: 'success',
      input: String(input).slice(0, 500),
      output: result,
      duration_ms: 0,
    });

    return Response.json({ result, run_id: run.id });
  } catch (error) {
    await logError(base44, `apiGateway/${body?.endpoint || 'unknown'}`, error.message, {}, user?.email);
    return Response.json({ error: error.message }, { status: 500 });
  }
});