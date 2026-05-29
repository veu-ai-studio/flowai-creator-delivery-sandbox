export const CONTROL_STRUCTURES = Object.freeze({
  AUTONOMOUS: 'autonomous',
  SUPERVISED: 'supervised',
  CONTROLLED: 'controlled',
});

export const CONTROL_MODES = Object.freeze({
  AUTO: 'auto',
  GUIDED: 'guided',
  MANUAL: 'manual',
});

export const CONTROL_DEPTHS = Object.freeze({
  QUICK: 'quick',
  NORMAL: 'normal',
  DEEP: 'deep',
});

export const DEFAULT_CONTROL_SCHEME = Object.freeze({
  structure: CONTROL_STRUCTURES.SUPERVISED,
  mode: CONTROL_MODES.GUIDED,
  depth: CONTROL_DEPTHS.NORMAL,
});

const STRUCTURE_VALUES = new Set(Object.values(CONTROL_STRUCTURES));
const MODE_VALUES = new Set(Object.values(CONTROL_MODES));
const DEPTH_VALUES = new Set(Object.values(CONTROL_DEPTHS));

function normalizeValue(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

export function normalizeControlScheme(scheme = {}) {
  return Object.freeze({
    structure: normalizeValue(scheme.structure, STRUCTURE_VALUES, DEFAULT_CONTROL_SCHEME.structure),
    mode: normalizeValue(scheme.mode, MODE_VALUES, DEFAULT_CONTROL_SCHEME.mode),
    depth: normalizeValue(scheme.depth, DEPTH_VALUES, DEFAULT_CONTROL_SCHEME.depth),
  });
}

export function createUserInitiationToken(context = {}) {
  return Object.freeze({
    type: 'FLOWAI_USER_INITIATION_TOKEN',
    userId: context.userId ?? null,
    source: context.source ?? 'explicit-user-action',
    createdAt: context.createdAt ?? new Date().toISOString(),
  });
}

export function validateRunStart({ controlScheme, userInitiationToken } = {}) {
  const normalized = normalizeControlScheme(controlScheme);
  if (normalized.structure === CONTROL_STRUCTURES.AUTONOMOUS && !userInitiationToken) {
    return Object.freeze({
      error: true,
      reason: 'Autonomous mode requires user initiation token; run rejected',
    });
  }

  return Object.freeze({
    ok: true,
    controlScheme: normalized,
  });
}
