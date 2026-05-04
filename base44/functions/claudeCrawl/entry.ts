import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { url } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL required' }, { status: 400 });
    }

    const prompt = `You are a web QA analyst. Analyze this URL: ${url}

Task: Simulate crawling and extract comprehensive QA data.

Instructions:
1. Analyze the URL structure and expected content
2. Estimate page title and main heading
3. Count estimated interactive elements (links, buttons, forms)
4. Identify potential UI/UX issues
5. Detect likely structural problems
6. Summarize page structure and functionality
7. Note any accessibility concerns

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "url": "string",
  "title": "string or null",
  "links": [{"text": "string", "href": "string"}],
  "buttons": [{"text": "string", "type": "string"}],
  "forms": [{"id": "string", "fields": ["field1", "field2"]}],
  "headings": ["h1 text", "h2 text"],
  "images": 0,
  "errors": ["error description"],
  "ui_summary": "brief summary of page layout",
  "accessibility_concerns": ["concern1", "concern2"],
  "performance_notes": "estimated load characteristics",
  "forms_count": number,
  "links_count": number,
  "buttons_count": number
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          title: { type: ['string', 'null'] },
          links: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                href: { type: 'string' },
              },
            },
          },
          buttons: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                type: { type: 'string' },
              },
            },
          },
          forms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                fields: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          headings: { type: 'array', items: { type: 'string' } },
          images: { type: 'number' },
          errors: { type: 'array', items: { type: 'string' } },
          ui_summary: { type: 'string' },
          accessibility_concerns: { type: 'array', items: { type: 'string' } },
          performance_notes: { type: 'string' },
          forms_count: { type: 'number' },
          links_count: { type: 'number' },
          buttons_count: { type: 'number' },
        },
        required: ['url', 'title', 'links', 'buttons', 'forms', 'headings'],
      },
    });

    // Normalize counts
    const normalizedResult = {
      ...result,
      links_count: result.links?.length || result.links_count || 0,
      buttons_count: result.buttons?.length || result.buttons_count || 0,
      forms_count: result.forms?.length || result.forms_count || 0,
      screenshotBase64: null, // Claude can't capture screenshots
    };

    return Response.json(normalizedResult);
  } catch (error) {
    console.error('Claude crawl error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});