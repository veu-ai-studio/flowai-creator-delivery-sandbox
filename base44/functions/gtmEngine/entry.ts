import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, description, target_audience, modes = ['landing', 'copy', 'demo'] } = await req.json();
    if (!name || !description) return Response.json({ error: 'Missing name or description' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a world-class GTM (Go-To-Market) strategist and conversion copywriter.

Product: "${name}"
Description: "${description}"
Target Audience: "${target_audience || 'general business users'}"
Requested GTM Assets: ${modes.join(', ')}

Generate comprehensive GTM assets for this product.

Return ONLY valid JSON:
{
  "landing_page": {
    "headline": "Compelling main headline",
    "subheadline": "Supporting subheadline explaining the value",
    "cta": "Primary call-to-action button text",
    "sections": ["Hero", "Features", "Social Proof", "Pricing", "FAQ", "Footer"],
    "deployed_url": null
  },
  "marketing_copy": {
    "tagline": "Short punchy tagline",
    "elevator_pitch": "2-3 sentence pitch",
    "email_subject_lines": ["Subject 1", "Subject 2", "Subject 3"],
    "ad_headlines": ["Ad 1", "Ad 2", "Ad 3"],
    "social_proof_statements": ["Proof 1", "Proof 2"],
    "feature_bullets": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4", "Benefit 5"]
  },
  "demo": {
    "url": null,
    "tour_steps": [
      "Step 1: Welcome - Show the main dashboard",
      "Step 2: Core Feature - Demonstrate primary workflow",
      "Step 3: Results - Show output and value delivered",
      "Step 4: Call to Action - Prompt to sign up"
    ],
    "sample_data_summary": "Description of pre-populated demo data to showcase key features"
  }
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          landing_page: { type: 'object' },
          marketing_copy: { type: 'object' },
          demo: { type: 'object' }
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