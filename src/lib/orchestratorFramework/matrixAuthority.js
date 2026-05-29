export const MATRIX_ENTRY_STATES = Object.freeze({
  CANONICAL: 'CANONICAL',
  PENDING_RATIFICATION: 'PENDING-RATIFICATION',
  PROPOSED_DEFERRED: 'PROPOSED-DEFERRED',
});

export function validateEntryState(entry = {}) {
  const state = String(entry.ratificationState ?? MATRIX_ENTRY_STATES.CANONICAL).toUpperCase();
  if (state === MATRIX_ENTRY_STATES.PENDING_RATIFICATION) return MATRIX_ENTRY_STATES.PENDING_RATIFICATION;
  if (state === MATRIX_ENTRY_STATES.PROPOSED_DEFERRED) return MATRIX_ENTRY_STATES.PROPOSED_DEFERRED;
  return MATRIX_ENTRY_STATES.CANONICAL;
}

export function isScorableEntry(entry = {}) {
  return validateEntryState(entry) !== MATRIX_ENTRY_STATES.PENDING_RATIFICATION;
}
