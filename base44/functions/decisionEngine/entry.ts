import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * decisionEngine — Phase 5 Platform Intelligence
 *
 * Aggregates historical ToolMetrics to compute per-tool scores,
 * then selects the best tool for a given capability + priority.
 *
 * POST body:
 *   { capability: "reasoning"|"deployment"|"execution"|"auditing"|"crawling",
 *     priority: "performance"|"cost"|"balanced",
 *     task_description: string }
 *
 * Returns: selected_tool, alternatives, reason, confidence, recommended_stack
 */

// Static tool registry — capability groups + cost estimates
const TOOL_REGISTRY = {
  chatgpt: {
    name: 'ChatGPT (GPT-4o)',
    capability: 'reasoning',
    base_cost_usd: 0.005,
    competitors: ['claude'],
    provider: 'OpenAI',
  },
  claude: {
    name: 'Claude (Sonnet)',
    capability: 'reasoning',
    base_cost_usd: 0.003,
    competitors: ['chatgpt'],
    provider: 'Anthropic',
  },
  vercel: {
    name: 'Vercel',
    capability: 'deployment',
    base_cost_usd: 0.001,
    competitors: ['netlify', 'railway'],
    provider: 'Vercel Inc.',
  },
  netlify: {
    name: 'Netlify',
    capability: 'deployment',
    base_cost_usd: 0.001,
    competitors: ['vercel', 'railway'],
    provider: 'Netlify Inc.',
  },
  railway: {
    name: 'Railway',
    capability: 'deployment',
    base_cost_usd: 0.002,
    competitors: ['vercel', 'netlify'],
    provider: 'Railway Corp.',
  },
  replit: {
    name: 'Replit',
    capability: 'execution',
    base_cost_usd: 0.002,
    competitors: ['codesandbox', 'stackblitz'],
    provider: 'Replit Inc.',
  },
  codesandbox: {
    name: 'CodeSandbox',
    capability: 'execution',
    base_cost_usd: 0.001,
    competitors: ['replit', 'stackblitz'],
    provider: 'CodeSandbox BV',
  },
  stackblitz: {
    name: 'StackBlitz',
    capability: 'execution',
    base_cost_usd: 0.001,
    competitors: ['replit', 'codesandbox'],
    provider: 'StackBlitz Inc.',
  },
  base44: {
    name: 'Base44 Audit',
    capability: 'auditing',
    base_cost_usd: 0.002,
    competitors: [],
    provider: 'Base44',
  },
  playwright: {
    name: 'Playwright Crawler',
    capability: 'crawling',
    base_cost_usd: 0.001,
    competitors: ['puppeteer'],
    provider: 'Microsoft',
  },
  puppeteer: {
    name: 'Puppeteer Crawler',
    capability: 'crawling',
    base_cost_usd: 0.001,
    competitors: ['playwright'],
    provider: 'Google',
  },
};

function computeScore(metrics, priority) {
  if (!metrics || metrics.length === 0) return null;

  const total = metrics.length;
  const successes = metrics.filter(m => m.success).length;
  const successRate = successes / total;
  const failureRate = 1 - successRate;
  const avgLatency = metrics.reduce((s, m) => s + (m.latency_ms || 500), 0) / total;
  const avgCost = metrics.reduce((s, m) => s + (m.cost_usd || 0.003), 0) / total;
  const errorFreq = metrics.filter(m => m.error_message).length / total;

  // Normalize latency (lower = better, cap at 30s)
  const latencyScore = Math.max(0, 1 - avgLatency / 30000);
  // Normalize cost (lower = better, cap at $0.05)
  const costScore = Math.max(0, 1 - avgCost / 0.05);

  let score;
  if (priority === 'performance') {
    score = successRate * 0.5 + latencyScore * 0.35 + costScore * 0.15;
  } else if (priority === 'cost') {
    score = costScore * 0.5 + successRate * 0.35 + latencyScore * 0.15;
  } else {
    // balanced
    score = successRate * 0.4 + latencyScore * 0.3 + costScore * 0.3;
  }

  return {
    score: Math.round(score * 100) / 100,
    successRate: Math.round(successRate * 100),
    failureRate: Math.round(failureRate * 100),
    avgLatency: Math.round(avgLatency),
    avgCost: Math.round(avgCost * 10000) / 10000,
    errorFreq: Math.round(errorFreq * 100),
    sampleSize: total,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { capability, priority = 'balanced', task_description = '' } = body;

    if (!capability) return Response.json({ error: 'capability is required' }, { status: 400 });

    // Fetch last 200 metrics records
    const allMetrics = await base44.asServiceRole.entities.ToolMetrics.list('-created_date', 200);

    // Group by tool_id
    const byTool = {};
    for (const m of allMetrics) {
      if (!byTool[m.tool_id]) byTool[m.tool_id] = [];
      byTool[m.tool_id].push(m);
    }

    // Filter to tools matching requested capability
    const capabilityTools = Object.entries(TOOL_REGISTRY)
      .filter(([, info]) => info.capability === capability)
      .map(([id, info]) => {
        const metrics = byTool[id] || [];
        const stats = computeScore(metrics, priority);
        // If no data, use defaults weighted by base cost
        const score = stats ? stats.score : (priority === 'cost' ? Math.max(0, 1 - info.base_cost_usd / 0.05) * 0.7 : 0.65);
        return {
          id,
          ...info,
          stats: stats || { score, successRate: 80, failureRate: 20, avgLatency: 1500, avgCost: info.base_cost_usd, errorFreq: 5, sampleSize: 0 },
          score: stats ? stats.score : score,
          hasRealData: metrics.length > 0,
        };
      })
      .sort((a, b) => b.score - a.score);

    if (capabilityTools.length === 0) {
      return Response.json({ error: `No tools found for capability: ${capability}` }, { status: 404 });
    }

    const selected = capabilityTools[0];
    const alternatives = capabilityTools.slice(1);

    // Build reason string
    const reasons = [];
    if (selected.stats.successRate >= 90) reasons.push(`high success rate (${selected.stats.successRate}%)`);
    if (selected.stats.avgLatency < 1000) reasons.push(`fast response (${selected.stats.avgLatency}ms avg)`);
    if (selected.stats.avgCost < 0.002) reasons.push(`low cost ($${selected.stats.avgCost}/op)`);
    if (!selected.hasRealData) reasons.push('selected as default (no usage data yet)');
    const reason = reasons.length > 0
      ? `${selected.name} selected due to: ${reasons.join(', ')}`
      : `${selected.name} ranked highest for ${priority} priority`;

    const confidence = Math.round(
      (selected.hasRealData ? 0.85 : 0.55) *
      (selected.score / Math.max(0.01, capabilityTools[capabilityTools.length - 1]?.score || 0.5)) *
      Math.min(1, selected.stats.sampleSize / 10 + 0.5) * 100
    );

    // Build full recommended stack across all capabilities
    const recommendedStack = {};
    for (const cap of ['reasoning', 'deployment', 'execution']) {
      const capTools = Object.entries(TOOL_REGISTRY)
        .filter(([, info]) => info.capability === cap)
        .map(([id, info]) => {
          const metrics = byTool[id] || [];
          const stats = computeScore(metrics, priority);
          return { id, name: info.name, score: stats ? stats.score : 0.65, hasRealData: metrics.length > 0 };
        })
        .sort((a, b) => b.score - a.score);
      recommendedStack[cap] = capTools[0]?.name || 'N/A';
    }

    // Build competition map
    const competitionMap = {};
    for (const cap of ['reasoning', 'deployment', 'execution', 'auditing', 'crawling']) {
      competitionMap[cap] = Object.entries(TOOL_REGISTRY)
        .filter(([, info]) => info.capability === cap)
        .map(([id, info]) => {
          const metrics = byTool[id] || [];
          const stats = computeScore(metrics, priority);
          return {
            id,
            name: info.name,
            provider: info.provider,
            base_cost_usd: info.base_cost_usd,
            score: stats ? stats.score : 0.65,
            sampleSize: metrics.length,
          };
        })
        .sort((a, b) => b.score - a.score);
    }

    // All tool stats for the dashboard
    const allToolStats = Object.entries(TOOL_REGISTRY).map(([id, info]) => {
      const metrics = byTool[id] || [];
      const stats = computeScore(metrics, priority) || {
        score: 0.65, successRate: 80, failureRate: 20,
        avgLatency: 1500, avgCost: info.base_cost_usd, errorFreq: 5, sampleSize: 0,
      };
      return { id, ...info, stats, hasRealData: metrics.length > 0 };
    });

    return Response.json({
      selected_tool: selected.id,
      selected_name: selected.name,
      alternatives: alternatives.map(a => ({ id: a.id, name: a.name, score: a.score, reason: `${a.stats.successRate}% success, $${a.stats.avgCost}/op` })),
      reason,
      confidence: Math.min(95, Math.max(30, confidence)),
      priority,
      capability,
      task_description,
      recommended_stack: {
        reasoning: recommendedStack.reasoning,
        execution: recommendedStack.execution,
        deployment: recommendedStack.deployment,
        confidence: selected.hasRealData ? 82 : 55,
      },
      competition_map: competitionMap,
      all_tool_stats: allToolStats,
    });

  } catch (error) {
    console.error('[decisionEngine] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});