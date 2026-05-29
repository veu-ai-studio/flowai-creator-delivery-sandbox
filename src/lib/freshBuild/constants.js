export const FRESH_BUILD_VERSION = '0.1.0';
export const FRESH_BUILD_STATUS = 'EXPERIMENTAL';

export function isFreshBuildEnabled(env = globalThis.process?.env) {
  return env?.FLOWAI_ENABLE_FRESH_BUILD === 'true';
}
