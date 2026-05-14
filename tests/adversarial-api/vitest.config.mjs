// Adversarial API vitest config — §11.1 W4 execution contract.
// Isolated from the main vitest.config.js so the 446-test adversarial
// suite can be invoked independently from the wider repo test suite.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/adversarial-api/**/*.test.{js,mjs}'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    reporters: ['default', ['json', { outputFile: 'tests/adversarial-api/.run-results.json' }]],
  },
});
