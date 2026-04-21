import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts'],
    },
    // Use forks pool for stability across different environments.
    // Threads pool may cause flaky failures in some CI environments.
    pool: 'forks',
    poolOptions: {
      forks: {
        // Limit concurrency to ensure stability
        singleFork: true,
      },
    },
  },
});
