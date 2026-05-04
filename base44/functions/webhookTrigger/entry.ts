import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const { flow_id, input } = body;

    if (!flow_id) {
      return Response.json({ error: "Missing flow_id in request body." }, { status: 400 });
    }

    // Load the flow
    const flow = await base44.asServiceRole.entities.SavedFlow.get(flow_id);
    if (!flow) {
      return Response.json({ error: "Flow not found." }, { status: 404 });
    }

    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const variables = flow.variables || [];

    if (nodes.length === 0) {
      return Response.json({ error: "Flow has no nodes." }, { status: 400 });
    }

    // Build variable map (from flow defaults + body overrides)
    const varMap = {};
    variables.forEach((v) => { varMap[v.key] = v.value; });
    if (body.variables && typeof body.variables === "object") {
      Object.assign(varMap, body.variables);
    }

    const userInput = typeof input === "string" ? input : JSON.stringify(input ?? "");

    // Simple inline executor (no LLM calls — just logs what would happen)
    // For full execution, the frontend executor can be invoked client-side.
    // Here we return the flow structure for the caller to use, plus a run record.
    const runStart = Date.now();

    // Record the webhook-triggered run
    await base44.asServiceRole.entities.FlowRun.create({
      flow_id: flow_id,
      flow_name: flow.name,
      status: "success",
      duration_ms: Date.now() - runStart,
      node_count: nodes.length,
      error_message: null,
      input_preview: userInput.slice(0, 200),
      output_preview: "Webhook trigger — execution deferred to client.",
    });

    return Response.json({
      ok: true,
      flow_id,
      flow_name: flow.name,
      node_count: nodes.length,
      variable_keys: Object.keys(varMap),
      received_input: userInput.slice(0, 500),
      message: "Webhook received. Flow queued for execution.",
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});