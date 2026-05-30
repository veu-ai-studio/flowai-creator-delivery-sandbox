export function defaultEvidencePath(productId, step) {
  const id = productId || 'unknown';
  return `docs/forge/${id}-${step}-evidence.md`;
}
