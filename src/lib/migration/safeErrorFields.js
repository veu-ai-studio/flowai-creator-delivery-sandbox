const SAFE_ERROR_FIELDS = Object.freeze([
  'code',
  'status',
  'statusText',
  'githubMessage',
  'githubErrors',
]);

export function pickSafeErrorFields(error = {}) {
  const safe = {};
  for (const field of SAFE_ERROR_FIELDS) {
    const value = error?.[field];
    if (value !== undefined && value !== null) {
      safe[field] = value;
    }
  }
  return safe;
}

export const __safeErrorFieldInternals = Object.freeze({
  SAFE_ERROR_FIELDS,
});
