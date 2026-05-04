import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

export const AGENTIC_MODES = {
  supervised:      'supervised',
  semi_autonomous: 'semi_autonomous',
  autonomous:      'autonomous',
};

export const ITERATION_MODES = {
  manual:    'manual',
  auto:      'auto',
};

export const FLOW_TYPES = {
  full_lifecycle:   'full_lifecycle',
  qa_audit_only:    'qa_audit_only',
  optimization_only:'optimization_only',
  research_only:    'research_only',
};

export const AGENTIC_MODE_LABELS = {
  supervised:      'Supervised',
  semi_autonomous: 'Semi-Auto',
  autonomous:      'Autonomous',
};

export const ITERATION_MODE_LABELS = {
  manual: 'Manual',
  auto:   'Auto (3x)',
};

export const FLOW_TYPE_LABELS = {
  full_lifecycle:    'Full Lifecycle',
  qa_audit_only:     'QA Audit Only',
  optimization_only: 'Optimize Only',
  research_only:     'Research Only',
};

// ─── Persistence helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'flowai_orchestration_config';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveToStorage(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  agenticMode:   AGENTIC_MODES.supervised,
  iterationMode: ITERATION_MODES.manual,
  flowType:      FLOW_TYPES.full_lifecycle,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const OrchestrationContext = createContext(null);

export function OrchestrationProvider({ children }) {
  const [config, setConfigState] = useState(() => {
    const saved = loadFromStorage();
    return saved ? { ...DEFAULT_CONFIG, ...saved } : DEFAULT_CONFIG;
  });

  // Persist to localStorage whenever config changes
  useEffect(() => {
    saveToStorage(config);
  }, [config]);

  const setConfig = useCallback((updates) => {
    setConfigState(prev => ({ ...prev, ...updates }));
  }, []);

  const setAgenticMode   = useCallback((v) => setConfig({ agenticMode: v }),   [setConfig]);
  const setIterationMode = useCallback((v) => setConfig({ iterationMode: v }), [setConfig]);
  const setFlowType      = useCallback((v) => setConfig({ flowType: v }),       [setConfig]);

  // Convenience: build the orchestration payload to pass to every pipeline run
  const getRunConfig = useCallback(() => ({
    agenticMode:   config.agenticMode,
    iterationMode: config.iterationMode,
    flowType:      config.flowType,
  }), [config]);

  return (
    <OrchestrationContext.Provider value={{
      // raw config
      config,
      setConfig,
      // individual setters (backwards-compat with useAgenticMode consumers)
      agenticMode:   config.agenticMode,
      setAgenticMode,
      iterationMode: config.iterationMode,
      setIterationMode,
      flowType:      config.flowType,
      setFlowType,
      // legacy aliases used by QAAudit
      mode:    config.agenticMode,
      setMode: setAgenticMode,
      // helpers
      getRunConfig,
    }}>
      {children}
    </OrchestrationContext.Provider>
  );
}

export function useOrchestration() {
  const ctx = useContext(OrchestrationContext);
  if (!ctx) throw new Error('useOrchestration must be used within OrchestrationProvider');
  return ctx;
}

// Backwards-compatible alias
export { useOrchestration as useAgenticMode };