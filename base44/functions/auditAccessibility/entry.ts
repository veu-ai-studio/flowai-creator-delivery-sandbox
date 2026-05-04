import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { crawlData, reportId } = await req.json();

    if (!crawlData || !reportId) {
      return Response.json({ error: 'Missing crawlData or reportId' }, { status: 400 });
    }

    // Simulate accessibility audit using LLM
    const prompt = `Perform a detailed WCAG 2.1 AA accessibility audit on this website structure:
Title: ${crawlData.title}
Links: ${crawlData.links?.length || 0}
Buttons: ${crawlData.buttons?.length || 0}
Forms: ${crawlData.forms || 0}
Images: ${crawlData.images || 0}
Headings: ${JSON.stringify(crawlData.headings || [])}

Identify:
1. Missing alt text on images
2. Form label issues
3. Color contrast problems
4. Keyboard navigation barriers
5. Heading hierarchy issues
6. ARIA attribute gaps

Return JSON with: score (0-100), violations (count), passes (count), incomplete (count), issues (array with type, severity, description, element, fix).`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          violations: { type: 'number' },
          passes: { type: 'number' },
          incomplete: { type: 'number' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                severity: { type: 'string' },
                description: { type: 'string' },
                element: { type: 'string' },
                fix: { type: 'string' },
              },
            },
          },
        },
      },
    });

    // Save accessibility audit
    const audit = await base44.entities.AccessibilityAudit.create({
      report_id: reportId,
      url: crawlData.url || 'unknown',
      score: result.score || 0,
      violations: result.violations || 0,
      passes: result.passes || 0,
      incomplete: result.incomplete || 0,
      issues: result.issues || [],
      wcag_level: result.score >= 80 ? 'AA' : 'A',
    });

    return Response.json({ success: true, audit });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});