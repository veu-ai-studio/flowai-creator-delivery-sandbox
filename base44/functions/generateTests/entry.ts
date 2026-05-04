import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { crawlData, reportId, framework = 'playwright' } = await req.json();

    if (!crawlData || !reportId) {
      return Response.json({ error: 'Missing crawlData or reportId' }, { status: 400 });
    }

    const prompt = `Generate ${framework} E2E test code for this website:
URL: ${crawlData.url}
Title: ${crawlData.title}
Links: ${JSON.stringify(crawlData.links?.slice(0, 5) || [])}
Buttons: ${JSON.stringify(crawlData.buttons?.slice(0, 5) || [])}
Forms: ${crawlData.forms || 0}
Headings: ${JSON.stringify(crawlData.headings || [])}

Generate production-ready ${framework} test code that:
1. Tests navigation and link functionality
2. Validates form submissions
3. Checks button interactions
4. Verifies page load performance
5. Tests responsive behavior

Return JSON with: test_code (complete runnable code), coverage_areas (array of test coverage descriptions).`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          test_code: { type: 'string' },
          coverage_areas: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    // Save automated test
    const test = await base44.entities.AutomatedTest.create({
      report_id: reportId,
      url: crawlData.url || 'unknown',
      test_type: 'e2e',
      framework,
      test_code: result.test_code || '',
      coverage_areas: result.coverage_areas || [],
      ready_to_run: false,
      status: 'generated',
    });

    return Response.json({ success: true, test });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});