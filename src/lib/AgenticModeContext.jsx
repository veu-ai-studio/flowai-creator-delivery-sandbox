// Legacy compatibility shim — re-exports from OrchestrationContext
export {
  OrchestrationProvider as AgenticModeProvider,
  useOrchestration as useAgenticMode,
  AGENTIC_MODES,
  FLOW_TYPES,
} from './OrchestrationContext';