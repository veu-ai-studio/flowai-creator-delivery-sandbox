/**
 * Safely converts any value to a renderable string.
 * Prevents "Objects are not valid as a React child" crashes.
 */
export function safeStr(v, fallback = '') {
  if (v == null) return fallback;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    // Try common text-like keys first
    const text = v.step || v.name || v.title || v.label || v.description || v.text || v.value || v.gap || v.subSteps;
    if (typeof text === 'string') return text;
    return JSON.stringify(v);
  }
  return String(v);
}

/**
 * Safely maps an array, converting each item to a string.
 */
export function safeStrArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(safeStr);
}