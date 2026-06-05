/**
 * Product scope validation for FlowAI runtime metadata.
 *
 * A productScope is a registry/runtime key, not a hardcoded product allowlist.
 * `flowai` and `_test` are reserved built-in scopes; every other product is
 * accepted when its scope is slug-safe.
 */

'use strict';

export const RESERVED_PRODUCT_SCOPES = Object.freeze({
  FLOWAI: 'flowai',
  TEST: '_test',
});

export const PRODUCT_SCOPE_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/;

export function isValidProductScope(productScope) {
  if (productScope === RESERVED_PRODUCT_SCOPES.TEST) return true;
  if (typeof productScope !== 'string') return false;
  return PRODUCT_SCOPE_PATTERN.test(productScope);
}

export function assertValidProductScope(productScope, label = 'productScope') {
  if (!isValidProductScope(productScope)) {
    throw new Error(`${label} invalid: ${productScope}`);
  }
  return productScope;
}
