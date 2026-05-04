import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { analysis, historical_data } = await req.json();

    if (!analysis) {
      return Response.json({ error: 'Missing analysis' }, { status: 400 });
    }

    // Auto-prioritize based on score impact, frequency, and severity
    const prioritized = analysis.recommendations.map(rec => {
      let priority_score = 0;

      // Layer impact (higher layer scores = higher impact when low)
      const layer_score = analysis.scores[rec.layer] || 5;
      priority_score += (10 - layer_score) * 2;

      // Base priority
      const priority_weights = { critical: 10, high: 6, medium: 3, low: 1 };
      priority_score += priority_weights[rec.priority] || 3;

      // Historical frequency (if issue appears in past audits)
      if (historical_data && Array.isArray(historical_data)) {
        const recurrence = historical_data.filter(h =>
          h.recommendations?.some(r => r.action === rec.action)
        ).length;
        priority_score += recurrence * 1.5;
      }

      return {
        ...rec,
        auto_priority_score: Math.round(priority_score),
        urgent: priority_score > 15,
      };
    }).sort((a, b) => b.auto_priority_score - a.auto_priority_score);

    return Response.json({ prioritized_issues: prioritized });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});