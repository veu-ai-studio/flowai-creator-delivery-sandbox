export function asArray(value) {
  return Array.isArray(value) ? value : [];
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
