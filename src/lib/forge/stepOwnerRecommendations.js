import {
  OrchestratorHub,
  createMemoryColdStore,
  createMemoryHotStore,
} from '../agents/orchestrator/OrchestratorHub.ts';

const FORGE_STEP_OWNERS = Object.freeze({
  research: Object.freeze({ agentId: 6, name: 'Research' }),
  design: Object.freeze({ agentId: 7, name: 'Design' }),
  qa_audit: Object.freeze({ agentId: 8, name: 'Quality Audit' }),
  gtm: Object.freeze({ agentId: 9, name: 'Go-To-Market' }),
  monitor: Object.freeze({ agentId: 10, name: 'Monitor' }),
});

function observedFields(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.keys(value).filter(key => value[key] !== undefined);
}

export function createForgeStepOwnerAgent(stepKey) {
  const owner = FORGE_STEP_OWNERS[stepKey];
  if (!owner) throw new Error(`unknown forge step-owner key: ${stepKey}`);
  return Object.freeze({
    async recommend(ctx = {}) {
      return Object.freeze({
        agent_id: owner.agentId,
        recommendation: `${owner.name} step-owner reviewed ${stepKey} output; recommend_only, no side effects.`,
        confidence: 0.8,
        metadata: Object.freeze({
          ok: true,
          authority: 'recommend_only',
          stepKey,
          productId: ctx.productId ?? null,
          runId: ctx.runId ?? null,
          observedFields: observedFields(ctx.stepInputs),
          runtimeActive: true,
        }),
      });
    },
  });
}

export function createForgeStepOwnerHub(opts = {}) {
  const hub = opts.hub ?? new OrchestratorHub({
    hot: opts.hot ?? createMemoryHotStore(),
    cold: opts.cold ?? createMemoryColdStore(),
  });
  for (const stepKey of Object.keys(FORGE_STEP_OWNERS)) {
    hub.registerStepOwnerAgent(stepKey, createForgeStepOwnerAgent(stepKey));
  }
  return hub;
}

export async function invokeForgeStepOwner(config = {}, stepKey, ctx = {}) {
  const hub = config.orchestratorHub ??
    (config.enableStepOwnerRecommendations === true ? createForgeStepOwnerHub() : null);
  if (!hub || typeof hub.invokeStepOwner !== 'function') return null;
  try {
    return await hub.invokeStepOwner(stepKey, {
      runId: config.runId ?? ctx.runId ?? `${stepKey}-run`,
      productId: ctx.productId,
      stepInputs: ctx.stepInputs,
    });
  } catch {
    return null;
  }
}

export const __test = Object.freeze({
  FORGE_STEP_OWNERS,
  observedFields,
});
