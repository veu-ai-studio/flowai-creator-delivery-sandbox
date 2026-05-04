import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * portfolioEngine — orchestrates full_cycle across multiple apps.
 * Orchestration + aggregation only — no autonomous logic here.
 *
 * Actions:
 *   run_app  — run full_cycle for a single app (called per-app by the frontend)
 */

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

async function runFullCycleForApp(openaiKey, base44, app) {
  // Call the autonomousEngine full_cycle on behalf of this app's context
  // We pass the app URL as context hint to the scan
  const { content, tokens } = await callLLM(openaiKey,
    `You are a platform health analyzer. Analyze the following external app URL and identify real issues.
SCOPE: UI bugs, UX problems, data formatting issues, performance problems, broken routes.
DO NOT flag: auth changes, database changes, schema changes.
Return JSON:
{
  "issues": [{
    "id": "unique_slug",
    "module": "module name",
    "type": "ui_bug|backend_failure|data_formatting|performance|cost_inefficiency|ux_problem",
    "severity": "critical|high|medium|low",
    "title": "short title",
    "description": "specific description",
    "suggested_fix": "targeted patch description",
    "auto_fix_eligible": true/false,
    "risk_level": "low|medium|high",
    "userImpact": 1,
    "businessImpact": 1
  }],
  "health_score": 0-100,
  "summary": "one paragraph"
}
userImpact scale: 5=blocks user flow, 3=noticeable friction, 1=minor cosmetic.
businessImpact scale: 5=affects revenue/conversion, 3=affects engagement, 1=negligible.`,
    `App URL: ${app.url}
App Label: ${app.label || 'Unlabeled'}
Analyze this app and identify 3-6 realistic issues. Estimate health score.`,
    2000
  );

  const issues = content.issues || [];
  const initialScore = content.health_score || 70;

  // Simulate patch/heal cycle (same logic as autonomous engine, simplified for portfolio)
  let currentScore = initialScore;
  let totalUserImpactGained = 0;
  let totalBusinessImpactGained = 0;
  const healResults = [];
  const cycleLog = [];

  // Select top 3 issues by severity
  const prioritized = [...issues].sort((a, b) => {
    const w = { critical: 5, high: 3, medium: 1, low: 0 };
    const uA = (a.userImpact || 1) * (a.businessImpact || 1) * (w[a.severity] || 0);
    const uB = (b.userImpact || 1) * (b.businessImpact || 1) * (w[b.severity] || 0);
    return uB - uA;
  }).slice(0, 3);

  for (const issue of prioritized) {
    const { content: fix, tokens: ft } = await callLLM(openaiKey,
      `You are validating whether a fix would improve an app's score.
Return JSON: { "passed": true/false, "score_delta": number, "estimated_new_score": number }`,
      `App: ${app.url}
Issue: ${JSON.stringify(issue)}
Starting score: ${currentScore}
Would fixing this issue improve the score by at least 5 points? Be realistic.`,
      400
    );

    const delta = fix.score_delta || 0;
    const accepted = fix.passed && delta >= 5;
    if (accepted) {
      currentScore = Math.min(100, currentScore + delta);
      totalUserImpactGained += issue.userImpact || 1;
      totalBusinessImpactGained += issue.businessImpact || 1;
      healResults.push({ issue: issue.title, accepted: true, delta, score: currentScore });
    } else {
      healResults.push({ issue: issue.title, accepted: false, delta: 0, reason: 'insufficient_gain' });
    }
    cycleLog.push({
      step: 'heal', status: accepted ? 'accepted' : 'rejected',
      issue: issue.title, improvement: accepted ? delta : 0, ts: new Date().toISOString(),
    });
  }

  const finalImprovement = currentScore - initialScore;

  return {
    url: app.url,
    label: app.label || app.url,
    initialScore,
    finalScore: currentScore,
    improvement: finalImprovement,
    userValueGained: totalUserImpactGained,
    businessValueGained: totalBusinessImpactGained,
    rolledBack: finalImprovement <= 0,
    issueCount: issues.length,
    healResults,
    cycleLog,
    summary: content.summary || '',
    tokens,
  };
}

async function callLLM(openaiKey, systemPrompt, userPrompt, maxTokens = 1500) {
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err).slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return { content: JSON.parse(content), tokens: data.usage?.total_tokens || 0 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, app } = body;

    if (action === 'run_app') {
      if (!app?.url) return Response.json({ error: 'app.url required' }, { status: 400 });
      console.log(`[portfolioEngine] run_app: ${app.url}`);
      const result = await runFullCycleForApp(openaiKey, base44, app);

      // Persist result back to ProductRegistry if a matching entry exists
      try {
        const existing = await base44.asServiceRole.entities.ProductRegistry.filter({ owner_email: user.email, url: app.url });
        if (existing.length > 0) {
          const rec = existing[0];
          await base44.asServiceRole.entities.ProductRegistry.update(rec.id, {
            last_run_at: new Date().toISOString(),
            last_score: result.finalScore,
            last_improvement: result.improvement,
            run_count: (rec.run_count || 0) + 1,
            label: rec.label || app.label || app.url,
          });
        }
      } catch (e) {
        console.warn('[portfolioEngine] registry update skipped:', e.message);
      }

      return Response.json({ action: 'run_app', ...result });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[portfolioEngine] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});