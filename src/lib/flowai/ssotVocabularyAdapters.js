export const SSOT_ORCHESTRA_EXECUTION_MODES = Object.freeze({
  AUTOMATIC: 'AUTOMATIC',
  GUIDED: 'GUIDED',
  MANUAL_ORCHESTRA: 'MANUAL-ORCHESTRA',
});

export const INTERNAL_ORCHESTRA_EXECUTION_MODES = Object.freeze({
  AUTO: 'auto',
  GUIDED: 'guided',
  MANUAL: 'manual',
});

export const SSOT_SYSTEM_OPERATION_LEVELS = Object.freeze({
  SUPERVISED_OP: 'SUPERVISED-OP',
  MANUAL_OP: 'MANUAL-OP',
  END_TO_END_OP: 'END-TO-END-OP',
});

export const INTERNAL_SYSTEM_OPERATION_LEVELS = Object.freeze({
  SUPERVISED: 'supervised',
  MANUAL: 'manual',
  AUTONOMOUS: 'autonomous',
});

const ORCHESTRA_TO_SSOT = Object.freeze({
  [INTERNAL_ORCHESTRA_EXECUTION_MODES.AUTO]: SSOT_ORCHESTRA_EXECUTION_MODES.AUTOMATIC,
  [INTERNAL_ORCHESTRA_EXECUTION_MODES.GUIDED]: SSOT_ORCHESTRA_EXECUTION_MODES.GUIDED,
  [INTERNAL_ORCHESTRA_EXECUTION_MODES.MANUAL]: SSOT_ORCHESTRA_EXECUTION_MODES.MANUAL_ORCHESTRA,
});

const ORCHESTRA_TO_INTERNAL = Object.freeze({
  [SSOT_ORCHESTRA_EXECUTION_MODES.AUTOMATIC]: INTERNAL_ORCHESTRA_EXECUTION_MODES.AUTO,
  [SSOT_ORCHESTRA_EXECUTION_MODES.GUIDED]: INTERNAL_ORCHESTRA_EXECUTION_MODES.GUIDED,
  [SSOT_ORCHESTRA_EXECUTION_MODES.MANUAL_ORCHESTRA]: INTERNAL_ORCHESTRA_EXECUTION_MODES.MANUAL,
});

const SYSTEM_TO_SSOT = Object.freeze({
  [INTERNAL_SYSTEM_OPERATION_LEVELS.SUPERVISED]: SSOT_SYSTEM_OPERATION_LEVELS.SUPERVISED_OP,
  [INTERNAL_SYSTEM_OPERATION_LEVELS.MANUAL]: SSOT_SYSTEM_OPERATION_LEVELS.MANUAL_OP,
  [INTERNAL_SYSTEM_OPERATION_LEVELS.AUTONOMOUS]: SSOT_SYSTEM_OPERATION_LEVELS.END_TO_END_OP,
});

const SYSTEM_TO_INTERNAL = Object.freeze({
  [SSOT_SYSTEM_OPERATION_LEVELS.SUPERVISED_OP]: INTERNAL_SYSTEM_OPERATION_LEVELS.SUPERVISED,
  [SSOT_SYSTEM_OPERATION_LEVELS.MANUAL_OP]: INTERNAL_SYSTEM_OPERATION_LEVELS.MANUAL,
  [SSOT_SYSTEM_OPERATION_LEVELS.END_TO_END_OP]: INTERNAL_SYSTEM_OPERATION_LEVELS.AUTONOMOUS,
});

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function toSsotOrchestraExecutionMode(internalMode) {
  const value = normalize(internalMode);
  return ORCHESTRA_TO_SSOT[value] ?? ORCHESTRA_TO_SSOT[value.toLowerCase()] ?? null;
}

export function toInternalOrchestraExecutionMode(ssotMode) {
  const value = normalize(ssotMode);
  return ORCHESTRA_TO_INTERNAL[value] ?? ORCHESTRA_TO_INTERNAL[value.toUpperCase()] ?? null;
}

export function toSsotSystemOperationLevel(internalLevel) {
  const value = normalize(internalLevel);
  return SYSTEM_TO_SSOT[value] ?? SYSTEM_TO_SSOT[value.toLowerCase()] ?? null;
}

export function toInternalSystemOperationLevel(ssotLevel) {
  const value = normalize(ssotLevel);
  return SYSTEM_TO_INTERNAL[value] ?? SYSTEM_TO_INTERNAL[value.toUpperCase()] ?? null;
}

export function buildSsotVocabularyContext({
  orchestraMode,
  systemOperationLevel,
} = {}) {
  const ssotOrchestraExecutionMode = toSsotOrchestraExecutionMode(orchestraMode);
  const ssotSystemOperationLevel = toSsotSystemOperationLevel(systemOperationLevel);

  return Object.freeze({
    axisA: Object.freeze({
      ssot: ssotSystemOperationLevel,
      internal: ssotSystemOperationLevel ? normalize(systemOperationLevel).toLowerCase() : null,
    }),
    axisB: Object.freeze({
      ssot: ssotOrchestraExecutionMode,
      internal: ssotOrchestraExecutionMode ? normalize(orchestraMode).toLowerCase() : null,
    }),
  });
}

export const __internals = Object.freeze({
  ORCHESTRA_TO_SSOT,
  ORCHESTRA_TO_INTERNAL,
  SYSTEM_TO_SSOT,
  SYSTEM_TO_INTERNAL,
});
