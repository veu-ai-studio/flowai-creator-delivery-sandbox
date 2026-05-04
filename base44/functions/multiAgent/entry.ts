/**
 * Multi-Agent Orchestration Engine
 * Runs specialized agents in parallel/sequence:
 * PlannerAgent → [ResearchAgent, DesignAgent] → BuildAgent → QAAgent → DeployAgent
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN');
const REPLIT_ENDPOINT = Deno.env.get('REPLIT_ENDPOINT');

const AGENTS = {
  planner:  { name: 'PlannerAgent',  role: 'You are a product planning AI. Break down user goals into actionable tasks for specialist agents.' },
  research: { name: 'ResearchAgent', role: 'You are a market research AI. Analyze markets, competitors, and user needs for SaaS products.' },
  design:   { name: 'DesignAgent',   role: 'You are a UX/UI design AI. Generate component architectures, user flows, and design decisions.' },
  build:    { name: 'BuildAgent',    role: 'You are a software build AI. Produce technical specifications, data schemas, and API contracts.' },
  qa:       { name: 'QAAgent',       role: 'You are a QA testing AI. Generate test cases, find bugs, and produce quality scores.' },
  deploy:   { name: 'DeployAgent',   role: 'You are a DevOps AI. Handle deployment configuration, environment setup, and release management.' },
};

async function runAgent(agentKey, task, context = '') {
  const agent = AGENTS[agentKey];
  const t0 = Date.now();

  if (!OPENAI_API_KEY) {
    // Fallback: use Claude via Base44
    return {
      agent: agent.name,
      agentKey,
      status: 'done',
      result: { summary: `[${agent.name}] Simulated — add OPENAI_API_KEY for real agent`, output: task, confidence: 0.7 },
      duration_ms: 0,
      ts: new Date().toISOString(),
      simulated: true,
    };
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: agent.role + ' Always respond with valid JSON.' },
        { role: 'user', content: `Task: ${task}\nContext: ${context}\n\nReturn JSON: { "summary": string, "output": string, "items": string[], "confidence": number, "next_steps": string[] }` }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error for ${agent.name}: ${res.status}`);
  const data = await res.json();
  const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');

  return {
    agent: agent.name,
    agentKey,
    status: 'done',
    result,
    duration_ms: Date.now() - t0,
    ts: new Date().toISOString(),
  };
}

async function runAgentWithBase44(agentKey, task, base44) {
  const agent = AGENTS[agentKey];
  const t0 = Date.now();
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `${agent.role}\n\nTask: ${task}\n\nReturn a structured analysis with: summary, key findings, recommendations, and confidence score (0-1).`,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        output: { type: 'string' },
        items: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number' },
        next_steps: { type: 'array', items: { type: 'string' } },
      },
    },
  });
  return {
    agent: agent.name,
    agentKey,
    status: 'done',
    result,
    duration_ms: Date.now() - t0,
    ts: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { input, agents: requestedAgents = ['planner', 'research', 'design', 'build', 'qa', 'deploy'], parallel = false } = body;
    if (!input) return Response.json({ error: 'Missing input' }, { status: 400 });

    const agentLog = [];

    // Always start with PlannerAgent
    const plannerResult = OPENAI_API_KEY
      ? await runAgent('planner', `Plan a full product build for: ${input}`)
      : await runAgentWithBase44('planner', `Plan a full product build for: ${input}`, base44);
    agentLog.push(plannerResult);

    const planContext = plannerResult.result?.output || input;

    // Filter to requested agents (minus planner which already ran)
    const remainingAgents = requestedAgents.filter(a => a !== 'planner');

    if (parallel) {
      // Run non-dependent agents in parallel
      const parallelGroups = [
        ['research', 'design'], // Phase 1 parallel
        ['build'],              // Phase 2
        ['qa'],                 // Phase 3
        ['deploy'],             // Phase 4
      ];

      for (const group of parallelGroups) {
        const groupAgents = group.filter(a => remainingAgents.includes(a));
        if (groupAgents.length === 0) continue;

        const results = await Promise.all(
          groupAgents.map(agentKey => {
            const task = `${agentKey} for: ${input}. Context: ${planContext}`;
            return OPENAI_API_KEY
              ? runAgent(agentKey, task, planContext)
              : runAgentWithBase44(agentKey, task, base44);
          })
        );
        agentLog.push(...results);
      }
    } else {
      // Sequential execution
      for (const agentKey of remainingAgents) {
        const prevOutput = agentLog[agentLog.length - 1]?.result?.output || planContext;
        const task = `${agentKey} task for: ${input}. Previous agent output: ${prevOutput}`;
        const result = OPENAI_API_KEY
          ? await runAgent(agentKey, task, prevOutput)
          : await runAgentWithBase44(agentKey, task, base44);
        agentLog.push(result);
      }
    }

    // Save as Run record
    await base44.asServiceRole.entities.Run.create({
      user_email: user.email,
      type: 'pipeline',
      status: 'success',
      input: input.slice(0, 500),
      output: { agentLog, parallel },
      duration_ms: agentLog.reduce((a, r) => a + (r.duration_ms || 0), 0),
    });

    return Response.json({ agentLog, status: 'complete', parallel, agent_count: agentLog.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});