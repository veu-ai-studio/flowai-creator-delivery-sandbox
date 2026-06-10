export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of ['data', 'items', 'records', 'results', 'rows', 'value']) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

export function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export async function resolveArray(promise, { timeoutMs = 8000 } = {}) {
  let timer = null;
  try {
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve([]), timeoutMs);
    });
    const value = await Promise.race([promise, timeout]);
    return asArray(value);
  } catch {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}
