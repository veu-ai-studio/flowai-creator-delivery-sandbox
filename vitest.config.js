// Vitest config — smoke tests only. Doesn't load the Vite plugin chain
// (which depends on Base44's plugin and React); these tests just hit the
// production /api endpoints over HTTP.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run smoke tests against prod by default. Override with FLOWAI_BASE_URL.
    environment: 'node',
    pool: 'forks',
    fileParallelism: false, // serialise to be gentle with cold starts
  },
});
