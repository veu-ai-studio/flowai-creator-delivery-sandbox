import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { analysis, crawlData, recommendation } = await req.json();

    // Single-recommendation mode (per-item fix request from QA cards)
    if (recommendation) {
      const singlePrompt = `You are a code fixer. Generate a specific, copy-paste ready code fix for this single QA issue.

Issue: ${recommendation.action}
Layer: ${recommendation.layer || 'general'}
Priority: ${recommendation.priority || 'medium'}
Details: ${(recommendation.details || []).join('; ')}
Crawl context: ${crawlData?.title || 'unknown page'}, ${crawlData?.errors?.length || 0} console errors

Return JSON with ONE fix:
{ "fixes": [{ "issue": "...", "category": "...", "fix_code": "...", "explanation": "..." }] }`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: singlePrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            fixes: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, category: { type: 'string' }, fix_code: { type: 'string' }, explanation: { type: 'string' } } } }
          }
        }
      });
      return Response.json({ fixes: result.fixes || [] });
    }

    if (!analysis || !crawlData) {
      return Response.json({ error: 'Missing analysis or crawlData' }, { status: 400 });
    }

    const prompt = `You are a code fixer. Based on this QA analysis, generate specific, copy-paste ready code fixes.

Crawl Data:
- Title: ${crawlData.title}
- Links: ${crawlData.links?.length || 0}
- Buttons: ${crawlData.buttons?.length || 0}
- Forms: ${crawlData.forms || 0}
- Console Errors: ${crawlData.errors?.length || 0}

Issues Found:
${JSON.stringify(analysis.issues, null, 2)}

For EACH critical/high issue:
1. Identify the problem
2. Provide exact code fix (HTML/CSS/JS)
3. Show before/after

Format as JSON array: [{ issue, category, fix_code, explanation }]`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          fixes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                category: { type: 'string' },
                fix_code: { type: 'string' },
                explanation: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({ fixes: result.fixes || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});