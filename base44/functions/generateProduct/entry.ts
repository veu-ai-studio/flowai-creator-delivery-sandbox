import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, description } = await req.json();
    if (!name || !description) return Response.json({ error: 'Missing name or description' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a senior software architect and full-stack engineer. 
A user wants to build a SaaS product called "${name}".
Description: "${description}"

Generate a complete initial product architecture including:
1. Entity schemas (database models) with their fields
2. UI component list with descriptions and props
3. API routes needed
4. Demo data summary
5. Next steps for implementation

Return ONLY valid JSON:
{
  "name": "${name}",
  "summary": "One sentence summary of what was generated",
  "entities": [
    {
      "name": "EntityName",
      "description": "What this stores",
      "fields": ["field1", "field2", "field3"],
      "schema": { "type": "object", "properties": {} }
    }
  ],
  "components": [
    {
      "name": "ComponentName",
      "description": "What it does",
      "props": ["prop1", "prop2"]
    }
  ],
  "api_routes": [
    { "method": "GET", "path": "/api/resource", "description": "List resources" },
    { "method": "POST", "path": "/api/resource", "description": "Create resource" }
  ],
  "demo_data": { "description": "Pre-populated sample data summary" },
  "next_steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          summary: { type: 'string' },
          entities: { type: 'array', items: { type: 'object' } },
          components: { type: 'array', items: { type: 'object' } },
          api_routes: { type: 'array', items: { type: 'object' } },
          demo_data: { type: 'object' },
          next_steps: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    // Record usage
    await base44.asServiceRole.entities.UsageRecord.create({
      user_email: user.email, action: 'build', plan: user.plan || 'free'
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});