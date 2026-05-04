import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { crawlData, isSpa = false, appContext = '' } = await req.json();

    if (!crawlData) {
      return Response.json(
        { error: "crawlData is required" },
        { status: 400 }
      );
    }

    const spaHeader = isSpa ? `
IMPORTANT — SPA CONTEXT:
This target is a Base44 React SPA. Raw crawl data will be minimal — do not penalize for 0 links or 0 buttons as these are rendered client-side. Analyze using: (1) any text or metadata visible in the crawl, (2) the user-supplied app context below, and (3) your knowledge of Base44 SPA architecture patterns. For each of the four scored dimensions — UI/UX, API, Logic, Business Value — explicitly note where your score is based on context inference versus direct crawl evidence. Be rigorous and honest; do not inflate scores due to limited data.
${appContext ? `\nUSER-SUPPLIED APP CONTEXT:\n${appContext}` : ''}
` : '';

    const analysisPrompt = `Analyze this website crawl data and provide structured QA feedback:
${spaHeader}
CRAWL DATA:
- URL: ${crawlData.url}
- Title: ${crawlData.title}
- Links found: ${crawlData.links?.length || 0}
- Buttons found: ${crawlData.buttons?.length || 0}
- Forms found: ${crawlData.forms || 0}
- Images found: ${crawlData.images || 0}
- Console errors: ${crawlData.errors?.length || 0}
- Errors: ${crawlData.errors?.slice(0, 3).join("; ") || "None"}

ANALYSIS FRAMEWORK:
1. UI/UX Quality (1-10): Assess navigation clarity, button usage, form presence
2. API Stability (1-10): Evaluate console errors, missing resources
3. Logic Integrity (1-10): Check for broken interactions, missing elements
4. Business Value (1-10): Assess content coverage, conversion potential

Provide JSON with:
{
  "ui_ux": { "score": X, "issues": [...], "details": {...} },
  "api": { "score": X, "issues": [...], "details": {...} },
  "logic": { "score": X, "issues": [...], "details": {...} },
  "business_value": { "score": X, "issues": [...], "details": {...} },
  "recommendations": [...]
}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          ui_ux: {
            type: "object",
            properties: {
              score: { type: "number" },
              issues: { type: "array", items: { type: "string" } },
              details: { type: "object" },
            },
          },
          api: {
            type: "object",
            properties: {
              score: { type: "number" },
              issues: { type: "array", items: { type: "string" } },
              details: { type: "object" },
            },
          },
          logic: {
            type: "object",
            properties: {
              score: { type: "number" },
              issues: { type: "array", items: { type: "string" } },
              details: { type: "object" },
            },
          },
          business_value: {
            type: "object",
            properties: {
              score: { type: "number" },
              issues: { type: "array", items: { type: "string" } },
              details: { type: "object" },
            },
          },
          recommendations: { type: "array", items: { type: "string" } },
        },
      },
    });

    const scores = {
      ui_ux: analysis.ui_ux.score,
      api: analysis.api.score,
      logic: analysis.logic.score,
      business_value: analysis.business_value.score,
    };
    const overall = Math.round(
      (scores.ui_ux + scores.api + scores.logic + scores.business_value) / 4
    );

    return Response.json({
      scores: { ...scores, overall },
      issues: {
        ui_ux: analysis.ui_ux.issues,
        api: analysis.api.issues,
        logic: analysis.logic.issues,
        business_value: analysis.business_value.issues,
      },
      details: {
        ui_ux: analysis.ui_ux.details,
        api: analysis.api.details,
        logic: analysis.logic.details,
        business_value: analysis.business_value.details,
      },
      recommendations: analysis.recommendations,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
});